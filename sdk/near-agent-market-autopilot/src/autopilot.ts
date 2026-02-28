import { randomUUID } from 'node:crypto';

import { createMarketClient, MarketClient } from './client/market-client.js';
import { rankJobsForBidding } from './engine/bidding.js';
import {
  applySubmissionFailure,
  markSubmissionSucceeded,
  nextSubmissionAttempt,
  planStaleBidWithdrawals,
  toExecutionDecision,
} from './engine/lifecycle.js';
import { buildSettlementReport } from './engine/settlement.js';
import { deterministicDeliverableHash, signDeliverableManifest } from './manifest/manifest.js';
import { resolvePolicyConfig } from './policy/defaults.js';
import {
  clearBidMarker,
  getBidMarker,
  getSettlementCursor,
  getSubmitState,
  markBidWithdrawn,
  setBidMarker,
  setSettlementCursor,
  setSubmitState,
} from './state/markers.js';
import { createStateStore } from './state/factory.js';
import { createTelemetryBus, type TelemetryBus } from './telemetry/telemetry.js';
import type {
  AutopilotConfig,
  BidDecision,
  LoopOptions,
  MarketAssignment,
  MarketJob,
  ReconcileOptions,
  SettlementReport,
  TickResult,
  TrackedBid,
} from './types.js';

function toNearAmount(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, '');
}

function nowIso(): string {
  return new Date().toISOString();
}

function isExecutableBid(bid: TrackedBid): boolean {
  return bid.status === 'accepted' || bid.status === 'in_progress' || bid.status === 'submitted';
}

function pickAssignment(assignments: MarketAssignment[]): MarketAssignment | null {
  const preferred = assignments.find(row => {
    const status = (row.status ?? '').toLowerCase();
    return status === 'in_progress' || status === 'submitted';
  });
  return preferred ?? assignments[0] ?? null;
}

async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const output = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      output[index] = await mapper(items[index] as T, index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return output;
}

export class Autopilot {
  private readonly config: AutopilotConfig;
  private readonly client: MarketClient;
  private readonly telemetryBus: TelemetryBus;
  private readonly policy;
  private readonly state;

  constructor(config: AutopilotConfig) {
    this.config = config;
    this.client = createMarketClient(config.market);
    this.telemetryBus = createTelemetryBus();
    this.policy = resolvePolicyConfig(config.policy);
    this.state = createStateStore(config.state);
  }

  telemetry(): TelemetryBus {
    return this.telemetryBus;
  }

  async runTick(): Promise<TickResult> {
    const startedAt = nowIso();
    const tickId = randomUUID();
    const bidDecisions: BidDecision[] = [];
    const executionDecisions: TickResult['executionDecisions'] = [];
    const errors: string[] = [];
    let halted = false;

    try {
      const jobs = await this.client.listJobs({
        status: 'open',
        order: 'desc',
        sort: 'budget_amount',
        limit: 100,
      });

      const bidsByJobId = Object.fromEntries(
        await mapLimit(jobs, 10, async job => [job.job_id, await this.client.listJobBids(job.job_id, { limit: 100 })] as const)
      );

      const ranked = rankJobsForBidding({
        jobs,
        bidsByJobId,
        policy: this.policy,
      });

      for (const decision of ranked) {
        bidDecisions.push(decision);
        this.telemetryBus.emit({
          at: nowIso(),
          type: 'bid_decision',
          payload: { tickId, ...decision },
        });

        if (decision.action === 'skip' || decision.bidAmountNear == null) continue;

        const marker = await getBidMarker(this.state, decision.jobId);
        if (marker) continue;

        try {
          const targetJob = jobs.find(job => job.job_id === decision.jobId);
          if (decision.action === 'entry') {
            if (!targetJob || !this.config.artifactProvider) {
              continue;
            }

            const artifact = await this.config.artifactProvider({
              job: targetJob,
              bid: {
                bidId: `entry:${decision.jobId}`,
                jobId: decision.jobId,
                status: 'in_progress',
                amountNear: decision.bidAmountNear ?? null,
              },
              assignment: {
                assignment_id: `entry:${decision.jobId}`,
                status: 'in_progress',
              },
            });

            if (!artifact) {
              continue;
            }

            const manifest = {
              jobId: decision.jobId,
              assignmentId: `entry:${decision.jobId}`,
              bidId: `entry:${decision.jobId}`,
              agentId: this.config.agentId,
              deliverableUrl: artifact.deliverableUrl,
              artifactHash: artifact.artifactHash,
              createdAt: startedAt,
              metadata: artifact.metadata ?? {},
            };

            const deliverableHash = this.config.submitSigningKey
              ? deterministicDeliverableHash({
                  manifest,
                  signingKey: this.config.submitSigningKey,
                  signerId: this.config.submitSignerId,
                })
              : artifact.artifactHash;

            await this.client.submitEntry(decision.jobId, {
              deliverable: artifact.deliverableUrl,
              deliverable_hash: deliverableHash,
            });

            if (this.config.submitSigningKey) {
              const signed = signDeliverableManifest({
                manifest,
                signingKey: this.config.submitSigningKey,
                signerId: this.config.submitSignerId,
              });

              this.telemetryBus.emit({
                at: nowIso(),
                type: 'submit_attempt',
                payload: {
                  tickId,
                  bidId: manifest.bidId,
                  jobId: manifest.jobId,
                  assignmentId: manifest.assignmentId,
                  manifestHash: signed.manifestHash,
                },
              });
            }

            this.telemetryBus.emit({
              at: nowIso(),
              type: 'submit_success',
              payload: {
                tickId,
                bidId: manifest.bidId,
                jobId: manifest.jobId,
                assignmentId: manifest.assignmentId,
                mode: 'competition_entry',
              },
            });
          } else {
            const proposal =
              targetJob?.title != null
                ? `Autonomous execution for ${targetJob.title}. Deterministic artifacts and deadline compliance.`
                : 'Autonomous execution with deterministic artifacts.';

            await this.client.placeBid(decision.jobId, {
              amount: toNearAmount(decision.bidAmountNear),
              eta_seconds: 3600,
              proposal,
            });
          }

          await setBidMarker(this.state, decision.jobId, startedAt);
          this.telemetryBus.emit({
            at: nowIso(),
            type: 'bid_submitted',
            payload: { tickId, jobId: decision.jobId, action: decision.action, amountNear: decision.bidAmountNear },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`bid:${decision.jobId}:${message}`);
          if (this.policy.failClosed) {
            halted = true;
            throw error;
          }
        }
      }

      const tracked = await this.client.listMyBids({
        limit: 300,
        statuses: ['pending', 'accepted', 'submitted', 'in_progress', 'withdrawn', 'rejected', 'completed'],
      });

      const markers: Record<string, string | undefined> = {};
      for (const bid of tracked) {
        markers[bid.jobId] = await getBidMarker(this.state, bid.jobId);
      }

      const stalePlan = planStaleBidWithdrawals({
        trackedBids: tracked,
        nowIso: startedAt,
        bidMarkerByJobId: markers,
        policy: this.policy,
      });

      for (const update of stalePlan.markerUpdates) {
        await setBidMarker(this.state, update.jobId, update.atIso);
      }

      for (const row of stalePlan.toWithdraw) {
        try {
          await this.client.withdrawBid(row.bidId);
          await markBidWithdrawn(this.state, row.bidId, startedAt);
          await clearBidMarker(this.state, row.jobId);

          this.telemetryBus.emit({
            at: nowIso(),
            type: 'bid_withdrawn',
            payload: { tickId, jobId: row.jobId, bidId: row.bidId },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`withdraw:${row.bidId}:${message}`);
          if (this.policy.failClosed) {
            halted = true;
            throw error;
          }
        }
      }

      const jobCache = new Map<string, MarketJob>();
      for (const bid of tracked.filter(isExecutableBid)) {
        const baseState = await getSubmitState(this.state, bid.jobId, bid.bidId);
        const attempt = nextSubmissionAttempt({
          bid,
          nowIso: startedAt,
          policy: this.policy,
          state: baseState,
        });

        if (!attempt.shouldAttempt) {
          executionDecisions.push(
            toExecutionDecision({
              bid,
              assignmentId: 'unknown',
              action: 'skip',
              reason: attempt.reason,
              nextAttemptAt: attempt.nextState.nextAttemptAt,
            })
          );
          if (baseState) {
            await setSubmitState(this.state, bid.jobId, bid.bidId, attempt.nextState);
          }
          continue;
        }

        let job = jobCache.get(bid.jobId);
        if (!job) {
          job = await this.client.getJob(bid.jobId);
          jobCache.set(bid.jobId, job);
        }

        const assignment = pickAssignment(Array.isArray(job.my_assignments) ? job.my_assignments : []);
        if (!assignment) {
          executionDecisions.push(
            toExecutionDecision({
              bid,
              assignmentId: 'unknown',
              action: 'skip',
              reason: 'missing_assignment',
            })
          );
          continue;
        }

        if (!this.config.artifactProvider) {
          executionDecisions.push(
            toExecutionDecision({
              bid,
              assignmentId: assignment.assignment_id,
              action: 'skip',
              reason: 'artifact_provider_missing',
            })
          );
          continue;
        }

        const artifact = await this.config.artifactProvider({
          job,
          bid,
          assignment,
        });

        if (!artifact) {
          executionDecisions.push(
            toExecutionDecision({
              bid,
              assignmentId: assignment.assignment_id,
              action: 'skip',
              reason: 'artifact_provider_returned_null',
            })
          );
          continue;
        }

        const manifest = {
          jobId: bid.jobId,
          assignmentId: assignment.assignment_id,
          bidId: bid.bidId,
          agentId: this.config.agentId,
          deliverableUrl: artifact.deliverableUrl,
          artifactHash: artifact.artifactHash,
          createdAt: startedAt,
          metadata: artifact.metadata ?? {},
        };

        const deliverableHash = this.config.submitSigningKey
          ? deterministicDeliverableHash({
              manifest,
              signingKey: this.config.submitSigningKey,
              signerId: this.config.submitSignerId,
            })
          : artifact.artifactHash;

        try {
          const payload = {
            deliverable: artifact.deliverableUrl,
            deliverable_hash: deliverableHash,
          };

          if ((job.job_type ?? 'standard') === 'competition') {
            await this.client.submitEntry(bid.jobId, payload);
          } else {
            await this.client.submitWork(bid.jobId, payload);
          }

          if (this.config.submitSigningKey) {
            const signed = signDeliverableManifest({
              manifest,
              signingKey: this.config.submitSigningKey,
              signerId: this.config.submitSignerId,
            });

            this.telemetryBus.emit({
              at: nowIso(),
              type: 'submit_attempt',
              payload: {
                tickId,
                bidId: bid.bidId,
                jobId: bid.jobId,
                assignmentId: assignment.assignment_id,
                manifestHash: signed.manifestHash,
              },
            });
          }

          const successState = markSubmissionSucceeded(attempt.nextState, startedAt);
          await setSubmitState(this.state, bid.jobId, bid.bidId, successState);

          executionDecisions.push(
            toExecutionDecision({
              bid,
              assignmentId: assignment.assignment_id,
              action: 'submit',
            })
          );

          this.telemetryBus.emit({
            at: nowIso(),
            type: 'submit_success',
            payload: { tickId, bidId: bid.bidId, jobId: bid.jobId, assignmentId: assignment.assignment_id },
          });
        } catch (error) {
          const nextState = applySubmissionFailure({
            state: attempt.nextState,
            nowIso: startedAt,
            policy: this.policy,
          });
          await setSubmitState(this.state, bid.jobId, bid.bidId, nextState);

          const message = error instanceof Error ? error.message : String(error);
          errors.push(`submit:${bid.bidId}:${message}`);
          executionDecisions.push(
            toExecutionDecision({
              bid,
              assignmentId: assignment.assignment_id,
              action: 'skip',
              reason: message,
              nextAttemptAt: nextState.nextAttemptAt,
            })
          );

          this.telemetryBus.emit({
            at: nowIso(),
            type: 'submit_failure',
            payload: {
              tickId,
              bidId: bid.bidId,
              jobId: bid.jobId,
              assignmentId: assignment.assignment_id,
              error: message,
              nextAttemptAt: nextState.nextAttemptAt,
            },
          });

          if (this.policy.failClosed) {
            halted = true;
            throw error;
          }
        }
      }
    } catch (error) {
      this.telemetryBus.emit({
        at: nowIso(),
        type: 'tick_error',
        payload: {
          tickId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      if (this.policy.failClosed) {
        halted = true;
      }
    }

    let settlements: SettlementReport = {
      records: [],
      totalNear: 0,
      totalUsd: 0,
      scannedJobs: 0,
    };

    try {
      settlements = await this.reconcileSettlements({ nearPriceUsd: this.config.nearPriceUsd });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`settlement:${message}`);
      this.telemetryBus.emit({
        at: nowIso(),
        type: 'tick_error',
        payload: {
          tickId,
          error: message,
          stage: 'settlement',
        },
      });
      if (this.policy.failClosed) {
        halted = true;
      }
    }

    const completedAt = nowIso();
    const result: TickResult = {
      tickId,
      startedAt,
      completedAt,
      bidDecisions,
      executionDecisions,
      settlements,
      errors,
      halted,
    };

    this.telemetryBus.emit({
      at: completedAt,
      type: 'tick_completed',
      payload: {
        tickId,
        halted,
        errors: errors.length,
        bids: bidDecisions.length,
        executions: executionDecisions.length,
      },
    });

    return result;
  }

  async runLoop(opts: LoopOptions = {}): Promise<void> {
    const intervalMs = opts.intervalMs ?? 120_000;
    let ticks = 0;

    while (true) {
      const result = await this.runTick();
      if (opts.onTick) {
        await opts.onTick(result);
      }

      ticks += 1;
      if (opts.maxTicks && ticks >= opts.maxTicks) {
        return;
      }

      if (result.halted && this.policy.failClosed) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  async reconcileSettlements(opts: ReconcileOptions = {}): Promise<SettlementReport> {
    const nearPriceUsd = opts.nearPriceUsd ?? this.config.nearPriceUsd ?? 4;
    const limit = opts.limit ?? 100;

    const jobs = await this.client.listCompletedJobsForWorker(this.config.agentId, limit);
    const bidsByJobId = Object.fromEntries(
      await mapLimit(jobs, 10, async job => [job.job_id, await this.client.listJobBids(job.job_id, { limit: 100 })] as const)
    );

    const report = buildSettlementReport({
      jobs,
      bidsByJobId,
      agentId: this.config.agentId,
      nearPriceUsd,
    });

    const newest = jobs
      .map(job => (typeof job.updated_at === 'string' ? job.updated_at : null))
      .filter((row): row is string => row != null)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

    if (newest) {
      await setSettlementCursor(this.state, newest);
    }

    this.telemetryBus.emit({
      at: nowIso(),
      type: 'settlement_reconciled',
      payload: {
        records: report.records.length,
        totalNear: report.totalNear,
        totalUsd: report.totalUsd,
      },
    });

    return report;
  }

  async getSettlementCursor(): Promise<string | undefined> {
    return getSettlementCursor(this.state);
  }
}

export function createAutopilot(config: AutopilotConfig): Autopilot {
  return new Autopilot(config);
}
