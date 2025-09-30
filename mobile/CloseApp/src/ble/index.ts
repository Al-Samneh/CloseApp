import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { simulatedBle } from './simulated';

type CandidateEvent = { payloadBase64: string; rssi: number };

type Listener = (ev: CandidateEvent) => void;

const BLEModule: any | undefined = (NativeModules as any)?.BLEModule;
const isNativeBleAvailable = (Platform.OS === 'ios' || Platform.OS === 'android') && !!BLEModule;

class BleManager {
  private emitter?: NativeEventEmitter;
  private sub?: any;
  private stateSub?: any;

  startScanning(cb: Listener) {
    if (isNativeBleAvailable) {
      try {
        this.emitter = new NativeEventEmitter(BLEModule);
        this.sub = this.emitter.addListener('BLEOnCandidate', cb);
        this.stateSub = this.emitter.addListener('BLEState', (s: any) => {
          console.log('BLE state update', s);
        });
        BLEModule.startScanning();
      } catch (err) {
        console.warn('BLE startScanning error', err);
        throw err;
      }
    } else {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        console.warn('BLE native module not available; scanning disabled on device build');
        return;
      }
      // Non-native platforms (e.g., web/desktop dev): use simulated scanning
      simulatedBle.on('candidate', (c: any) => {
        const b64 = Buffer.from(c.payload).toString('base64');
        cb({ payloadBase64: b64, rssi: c.rssi });
      });
      simulatedBle.startScanning();
    }
  }

  stopScanning() {
    if (isNativeBleAvailable) {
      try {
        BLEModule.stopScanning();
      } catch (err) {
        console.warn('BLE stopScanning error', err);
      }
      this.sub?.remove?.();
      this.stateSub?.remove?.();
    } else {
      simulatedBle.stopScanning();
    }
  }

  startAdvertising(payload: Uint8Array) {
    if (isNativeBleAvailable) {
      const base64 = Buffer.from(payload).toString('base64');
      try {
        BLEModule.startAdvertising(base64);
      } catch (err) {
        console.warn('BLE startAdvertising error', err);
        throw err;
      }
    } else {
      // No-op on non-native; we only simulate scanning events
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        console.warn('BLE native module not available; advertising disabled in this build');
      }
    }
  }

  stopAdvertising() {
    if (isNativeBleAvailable) {
      try {
        BLEModule.stopAdvertising();
      } catch (err) {
        console.warn('BLE stopAdvertising error', err);
      }
    }
  }
}

export const bleManager = new BleManager();

