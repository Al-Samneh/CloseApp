import DeviceInfo from 'react-native-device-info';
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

  constructor(deviceSecret: Uint8Array) {
    this.deviceSecret = deviceSecret;
  }

  start(profile: Profile, onCandidate: (disc: Discovered) => void) {
    this.onCandidate = onCandidate;
    this.buildAndAdvertise(profile);
    this.timer = setInterval(() => this.buildAndAdvertise(profile), this.rotationMinutes * 60 * 1000);
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
    const fp = buildInterestFingerprint(profile.interests, this.deviceSecret);
    const payload = packPayload({ version: 1, ephemeralId: eph, fingerprint: fp.obfuscated, flags: 0 });
    this.currentPayload = payload;
    bleManager.startAdvertising(payload);
  }
}

