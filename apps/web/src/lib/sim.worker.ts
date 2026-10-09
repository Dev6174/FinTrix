/// <reference lib="webworker" />
import { simulate, type SimInput, type SimOutput } from './sim';

export type WorkerIn = { id: number; input: SimInput };
export type WorkerOut =
  | { id: number; type: 'progress'; done: number; total: number }
  | { id: number; type: 'done'; result: SimOutput }
  | { id: number; type: 'error'; message: string };

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const { id, input } = e.data;
  const post = (m: WorkerOut, transfer: Transferable[] = []) => self.postMessage(m, transfer);
  try {
    const result = simulate(input, (done) =>
      post({ id, type: 'progress', done, total: input.scenarios }),
    );
    const { bars, band } = result;
    // Zero-copy hand-off of every typed array to the main thread.
    post({ id, type: 'done', result }, [
      ...[
        bars.open,
        bars.high,
        bars.low,
        bars.close,
        bars.volume,
        bars.halted,
        band.p5,
        band.p50,
        band.p95,
      ].map((a) => a.buffer),
    ]);
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
