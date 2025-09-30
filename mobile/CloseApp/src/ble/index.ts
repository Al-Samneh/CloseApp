import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { simulatedBle } from './simulated';

type CandidateEvent = { payloadBase64: string; rssi: number };

type Listener = (ev: CandidateEvent) => void;

const BLEModule = NativeModules.BLEModule;

class BleManager {
  private emitter?: NativeEventEmitter;
  private sub?: any;

  startScanning(cb: Listener) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      this.emitter = new NativeEventEmitter(BLEModule);
      this.sub = this.emitter.addListener('BLEOnCandidate', cb);
      BLEModule.startScanning();
    } else {
      simulatedBle.on('candidate', (c: any) => {
        const b64 = Buffer.from(c.payload).toString('base64');
        cb({ payloadBase64: b64, rssi: c.rssi });
      });
      simulatedBle.startScanning();
    }
  }

  stopScanning() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      BLEModule.stopScanning();
      this.sub?.remove?.();
    } else {
      simulatedBle.stopScanning();
    }
  }

  startAdvertising(payload: Uint8Array) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const base64 = Buffer.from(payload).toString('base64');
      BLEModule.startAdvertising(base64);
    }
  }

  stopAdvertising() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      BLEModule.stopAdvertising();
    }
  }
}

export const bleManager = new BleManager();

