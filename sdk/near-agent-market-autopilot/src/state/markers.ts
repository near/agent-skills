import type { StateStore, SubmitAttemptState } from '../types.js';
import {
  bidMarkerKey,
  KEY_SETTLEMENT_CURSOR,
  submitStateKey,
  withdrawnBidKey,
} from './keys.js';

export async function getBidMarker(store: StateStore, jobId: string): Promise<string | undefined> {
  return store.get<string>(bidMarkerKey(jobId));
}

export async function setBidMarker(store: StateStore, jobId: string, atIso: string): Promise<void> {
  await store.set(bidMarkerKey(jobId), atIso);
}

export async function clearBidMarker(store: StateStore, jobId: string): Promise<void> {
  await store.del(bidMarkerKey(jobId));
}

export async function getSubmitState(
  store: StateStore,
  jobId: string,
  bidId: string
): Promise<SubmitAttemptState | undefined> {
  return store.get<SubmitAttemptState>(submitStateKey(jobId, bidId));
}

export async function setSubmitState(
  store: StateStore,
  jobId: string,
  bidId: string,
  state: SubmitAttemptState
): Promise<void> {
  await store.set(submitStateKey(jobId, bidId), state);
}

export async function markBidWithdrawn(store: StateStore, bidId: string, atIso: string): Promise<void> {
  await store.set(withdrawnBidKey(bidId), atIso);
}

export async function getSettlementCursor(store: StateStore): Promise<string | undefined> {
  return store.get<string>(KEY_SETTLEMENT_CURSOR);
}

export async function setSettlementCursor(store: StateStore, updatedAtIso: string): Promise<void> {
  await store.set(KEY_SETTLEMENT_CURSOR, updatedAtIso);
}
