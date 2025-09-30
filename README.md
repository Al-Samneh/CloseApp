# Close — Privacy-first Proximity Chat (MVP)

Close is a minimal social app that discovers nearby users via Bluetooth Low Energy (BLE) using ephemeral identifiers, computes on-device compatibility, and establishes an end‑to‑end encrypted chat that continues over the network (Wi‑Fi/cellular) via a lightweight relay. No PII is broadcast; personal links are revealed only after mutual consent.

Contents
- Architecture overview
- Repository layout and file-by-file walkthrough
- BLE protocol and crypto
- How it works (end-to-end flows)
- Build, run, and test instructions (mobile + server)
- iOS field testing and App Store notes
- Security, privacy, and battery considerations

## 1. Architecture overview

- React Native app (TypeScript) with native iOS Swift BLE module; Android parity via permissions and simulated BLE for now.
- BLE payload: 18 bytes (version, 8‑byte ephemeral_id, 8‑byte fingerprint, flags), advertised with a custom Service UUID and manufacturer data.
- On device: compatibility scoring (age, gender, interest Jaccard approximation, proximity from RSSI).
- Ephemeral E2E chat: X25519 ECDH to derive a symmetric key; messages encrypted with NaCl secretbox; messages relayed over WebSocket (server cannot decrypt).
- Privacy: rotating ephemeral IDs, no PII over BLE, local encrypted storage for profile.

## 2. Repository layout

Top-level
- `README.md`: This document.
- `docs/ios_field_test.md`: Background iOS field test script.
- `docs/privacy_checklist.md`: Privacy & App Store checklist.
- `docs/code_map.md`: File-by-file purpose index.
- `mobile/CloseApp`: React Native app.
- `server/`: Minimal FastAPI WebSocket relay.

Mobile app key files (major ones only)
- `App.tsx`: Entry; renders navigation.
- `index.js`: Entry point registering app; installs random values and Buffer polyfills.
- `package.json`: Dependencies and scripts.
- `jest.config.js`, `jest.setup.js`: Test config and mocks for RN modules.
- `src/navigation/index.tsx`: Stack navigator with Onboarding, Home, Chat.
- `src/screens/Onboarding.tsx`: Minimal profile creation UI and secure save.
- `src/screens/Home.tsx`: Visibility toggle; shows nearby candidates via BLE; navigates to Chat.
- `src/screens/Chat.tsx`: E2E chat UI. Performs ephemeral pubkey exchange and encrypts messages; transport via WebSocket relay.
- `src/ble/index.ts`: Native bridge to iOS BLE event emitter; simulated BLE on desktop.
- `src/ble/orchestrator.ts`: Builds/rotates BLE payloads and starts advertising + scanning.
- `src/ble/simulated.ts`: Fake discovery loop for desktop/CI.
- `src/utils/blePayload.ts`: Pack/unpack 18‑byte BLE payload.
- `src/utils/ephemeralId.ts`: Ephemeral ID derivation.
- `src/utils/fingerprint.ts`: 64‑bit interest bloom and obfuscation.
- `src/crypto/ephemeral.ts`: Ephemeral keys + secretbox helpers.
- `src/scoring/compatibility.ts`: Scoring functions and weights.
- `src/storage/profile.ts`: Encrypted profile load/save and device secret hash util.
- `src/network/ws.ts`: WebSocket relay client.
- iOS native: `ios/CloseApp/BLEModule.swift` and `BLEModule.m` implement CoreBluetooth advertising/scanning and event bridge; `ios/CloseApp/Info.plist` contains usage keys and background modes.

Server key files
- `server/main.py`: FastAPI app with `/ws/{session_id}` broadcast relay.
- `server/Dockerfile`, `server/requirements.txt`, `server/README.md`.

## 3. BLE protocol and crypto

BLE advertisement payload (18 bytes)
- `version` (1 byte)
- `ephemeral_id` (8 bytes): HMAC‑like SHA‑256(secret || deviceUUID || rotationEpoch) truncated.
- `fingerprint` (8 bytes): 64‑bit bloom of interests, obfuscated via HMAC‑SHA256 with device secret, truncated.
- `flags` (1 byte)

Advertising
- iOS advertises manufacturer data plus the app Service UUID to ensure discovery in background.
- Rotation default: 10 minutes.

Discovery
- Central scans for the app Service UUID. On background iOS, only adverts with that Service UUID are reliably delivered; we include it.

Crypto for chat
- Handshake: each peer sends a short‑lived public key (X25519). Both compute shared secret, derive 32‑byte symmetric key using SHA‑256 of scalarMult output. Messages are encrypted via `nacl.secretbox` with random nonces.
- Transport: WebSocket relay; server receives ciphertext JSON blobs and broadcasts to session peers. No plaintext stored.

## 4. How it works (flows)

1) Onboarding and profile
- User inputs minimal profile (name, age, interests). Saved in platform‑encrypted storage.

2) Discovery & candidate list (BLE)
- When user enables visibility, the app builds the 18‑byte payload using the profile interests and a device secret, advertises it via the iOS native module, and scans for peers.
- When peers are discovered, items appear in the Home list with current RSSI.

3) Chat session (network)
- Tapping a candidate opens a Chat session. Over WebSocket, the app exchanges ephemeral public keys, derives a shared symmetric key, and encrypts/decrypts subsequent messages.
- Because transport is network‑based, users can walk away; proximity is only used to bootstrap interest‑aligned encounters.

4) Consent
- This MVP shows a basic chat. The production flow should prompt at session end for mutual consent to reveal saved social link(s) encrypted with the session key.

## 5. Build and run

Prerequisites
- Node 18+, npm
- iOS: macOS with Xcode and CocoaPods

Install mobile deps
```bash
cd mobile/CloseApp
npm install
cd ios && pod install && cd ..
```

Run iOS (simulator or device)
```bash
npx react-native run-ios
```

Notes
- On iOS simulator, BLE uses the simulated emitter. On physical devices, native BLE is active.
- Ensure Bluetooth permission prompts are accepted. Background modes are enabled in Info.plist.

Run server (relay)
```bash
docker build -t close-relay ./server
docker run -p 8080:8080 close-relay
```
The app connects to `ws://localhost:8080/ws/{session_id}` in development. For devices, expose a reachable URL (LAN IP or public host) and replace the URL in `src/screens/Chat.tsx`.

## 6. Testing

Automated tests
- Run unit tests:
```bash
cd mobile/CloseApp && npm test
```
- Tests include: scoring unit test and basic app test. Jest mocks native modules and assets.

Manual BLE simulation
- On simulator/desktop, the app emits random candidates every ~2s; use the Home screen toggle to see entries appear.

iOS field test (devices)
- See `docs/ios_field_test.md` for step‑by‑step instructions to validate background advertising/scanning with two iPhones.

## 7. Security, privacy, and battery

- No PII in BLE adverts; only ephemeral tokens/fingerprints.
- Ephemeral keys and session keys are short‑lived; wipe on session end.
- On-device scoring preserves privacy; server only relays ciphertext.
- Battery: conservative scan/advertising and 10‑minute rotation; users can turn visibility off anytime.

## 8. App Store notes (iOS)

Info.plist usage strings are included, and background modes `bluetooth-central` and `bluetooth-peripheral` are configured. Include the following submission note:

“This app requires background Bluetooth to enable ephemeral proximity-based discovery to facilitate fleeting social connections nearby. We do not collect or store personal information on servers; all broadcasts are ephemeral hashed tokens, and personal data is revealed only after mutual consent. User-facing toggles allow turning off background discovery.”

## 9. Roadmap to production-ready MVP

- Android native BLE module (foreground service) and permissions UX.
- Consent flow and encrypted social link exchange.
- Persist session history locally with secure wipe.
- Push notifications for new messages (APNs/FCM).
- CI: GitHub Actions for tests and builds (iOS requires macOS runner).
- Configurable relay URL via `.env` and secure TLS.

