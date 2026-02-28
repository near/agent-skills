import type { TelemetryEvent } from '../types.js';

type Listener = (event: TelemetryEvent) => void;

export class TelemetryBus {
  private readonly listeners = new Set<Listener>();
  private readonly counters = new Map<string, number>();
  private readonly recent: TelemetryEvent[] = [];

  emit(event: TelemetryEvent): void {
    this.recent.push(event);
    if (this.recent.length > 1_000) {
      this.recent.shift();
    }

    this.counters.set(event.type, (this.counters.get(event.type) ?? 0) + 1);

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  events(): TelemetryEvent[] {
    return [...this.recent];
  }

  toPrometheus(): string {
    const lines = ['# HELP autopilot_event_total Total autopilot events emitted.', '# TYPE autopilot_event_total counter'];
    for (const [type, count] of [...this.counters.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`autopilot_event_total{type="${type}"} ${count}`);
    }
    return `${lines.join('\n')}\n`;
  }
}

export function createTelemetryBus(): TelemetryBus {
  return new TelemetryBus();
}
