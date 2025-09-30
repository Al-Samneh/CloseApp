import DeviceInfo from 'react-native-device-info';
import { Buffer } from 'buffer';
import { bleManager } from './index';
import { buildInterestFingerprint } from '../utils/fingerprint';
import { deriveEphemeralId } from '../utils/ephemeralId';
import { packPayload, unpackPayload } from '../utils/blePayload';
import { Profile } from '../scoring/compatibility';

export type Discovered = { payload: Uint8Array; rssi: number; ts: number };

export class BleOrchestrator {
  private rotationMinutes = 10;
  private deviceSecret: Uint8Array;
  private currentPayload?: Uint8Array;
  private timer?: NodeJS.Timeout;
  private onCandidate?: (disc: Discovered) => void;
  public myEphemeralId: string = '';

  constructor(deviceSecret: Uint8Array) {
    this.deviceSecret = deviceSecret;
  }

  start(profile: Profile, onCandidate: (disc: Discovered) => void) {
    this.onCandidate = onCandidate;
    // fire-and-forget with error handling to avoid unhandled promise rejections
    void this.buildAndAdvertise(profile).catch(err => console.warn('BLE build/advertise error', err));
    this.timer = setInterval(() => {
      void this.buildAndAdvertise(profile).catch(err => console.warn('BLE build/advertise error (timer)', err));
    }, this.rotationMinutes * 60 * 1000);
    bleManager.startScanning(ev => {
      const data = Buffer.from(ev.payloadBase64, 'base64');
      const payload = unpackPayload(new Uint8Array(data));
      if (!payload) return;
      this.onCandidate?.({ payload: new Uint8Array(data), rssi: ev.rssi, ts: Date.now() });
    });
  }

  stop() {
    bleManager.stopScanning();
    bleManager.stopAdvertising();
    if (this.timer) clearInterval(this.timer);
  }

  private async buildAndAdvertise(profile: Profile) {
    const deviceUuid = await DeviceInfo.getUniqueId();
    const epoch = Math.floor(Date.now() / (this.rotationMinutes * 60 * 1000));
    const eph = deriveEphemeralId(deviceUuid, epoch, this.deviceSecret);
    
    // Store our ephemeral ID as hex string
    this.myEphemeralId = Buffer.from(eph).toString('hex').slice(0, 12);
    console.log('📱 My Ephemeral ID:', this.myEphemeralId);
    
    const fp = buildInterestFingerprint(profile.interests, this.deviceSecret);
    const payload = packPayload({ version: 1, ephemeralId: eph, fingerprint: fp.obfuscated, flags: 0 });
    this.currentPayload = payload;
    try {
      bleManager.startAdvertising(payload);
    } catch (err) {
      console.warn('BLE startAdvertising error', err);
      throw err;
    }
  }
}

