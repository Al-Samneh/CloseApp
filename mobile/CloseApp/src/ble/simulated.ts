import EventEmitter from 'eventemitter3';

export type SimulatedCandidate = {
  payload: Uint8Array;
  rssi: number;
  ts: number;
};

class SimulatedBle extends EventEmitter {
  private scanning = false;
  private interval?: NodeJS.Timeout;

  startScanning() {
    if (this.scanning) return;
    this.scanning = true;
    this.interval = setInterval(() => {
      const payload = new Uint8Array(18);
      payload[0] = 1;
      crypto.getRandomValues(payload.subarray(1, 17));
      payload[17] = 0;
      const rssi = -50 - Math.floor(Math.random() * 30);
      this.emit('candidate', { payload, rssi, ts: Date.now() } satisfies SimulatedCandidate);
    }, 2000);
  }

  stopScanning() {
    this.scanning = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }
}

export const simulatedBle = new SimulatedBle();

