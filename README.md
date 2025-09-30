# Close 
# Privacy‑First Proximity Chat

This project demonstrates a mobile system that discovers nearby users with Bluetooth Low Energy (BLE), computes an on‑device compatibility signal, and establishes an end‑to‑end encrypted (E2EE) chat over the network using a lightweight relay. The design emphasizes privacy by broadcasting only ephemeral identifiers and keeping personal data and matching logic on device.

Contents
- Architecture overview
- Repository layout
- Detailed system design
  - BLE payload, advertising, discovery
  - Ephemeral identity and storage
  - Session key agreement and message security
  - Matching and compatibility scoring
  - Network relay and message flow
- Build, run, and configuration
- Testing and field validation
- Security, privacy, and performance
- Enhancing matching with LLM/AI (benefits and trade‑offs)
- Roadmap

## Architecture overview

- React Native app (TypeScript) with a native iOS Swift BLE module. Android can run using the simulated BLE loop in development; native parity belongs on the roadmap.
- BLE advertises a small, non‑identifying payload which encodes an ephemeral identifier and an obfuscated interests fingerprint. Devices scan for the app’s Service UUID and surface candidates.
- After users choose to connect, peers establish an E2EE chat by exchanging ephemeral public keys and deriving a session key. Messages are encrypted on device and relayed via a minimal FastAPI WebSocket server that cannot read plaintext.
- Privacy principles:
  - No PII over BLE; identifiers rotate periodically.
  - Matching happens on device; the server is a dumb relay for ciphertext.
  - Profiles are stored locally using platform‑encrypted storage.

## Repository layout

Top‑level
- `README.md`: This document.
- `docs/`: Supporting guides (`ios_field_test.md`, `privacy_checklist.md`, `code_map.md`, `xcode_testing_guide.md`).
- `mobile/CloseApp/`: React Native application.
- `server/`: Minimal FastAPI WebSocket relay (Dockerized).

Mobile app, notable files
- `App.tsx`: App bootstrap and navigation.
- `src/navigation/index.tsx`: Stack navigator (`Onboarding`, `Home`, `Chat`).
- `src/screens/Onboarding.tsx`: Collects a minimal profile and saves it securely.
- `src/screens/Home.tsx`: BLE visibility toggle; shows nearby candidates; launches chat.
- `src/screens/Chat.tsx`: E2EE chat UI and message loop.
- `src/ble/index.ts`: JS bridge to native iOS BLE; simulated BLE in development.
- `src/ble/orchestrator.ts`: Builds and rotates BLE payload; starts advertising/scanning.
- `src/utils/blePayload.ts`: Pack/unpack the compact payload.
- `src/utils/ephemeralId.ts`, `src/utils/fingerprint.ts`: Ephemeral IDs and interest fingerprint.
- `src/crypto/ephemeral.ts`: Ephemeral keypair and secretbox helpers.
- `src/scoring/compatibility.ts`: Legacy scoring (kept for reference).
- `src/scoring/fast.ts`: Production scorer (bitmask Jaccard for interests with smoothing, age closeness, soft gender gating, proximity).
- `src/storage/profile.ts`: Encrypted profile persistence.
- `src/network/ws.ts`: WebSocket relay client.
- iOS native: `ios/CloseApp/BLEModule.swift` implements CoreBluetooth advertising/scanning and event emission to JS.

Server
- `server/main.py`: FastAPI app with `/ws/{session_id}` broadcast and `/link-requests/{ephemeral_id}` signaling.
- `server/Dockerfile`, `server/requirements.txt`, `server/README.md`.

## Detailed system design

### BLE payload, advertising, discovery
- Payload format (18 bytes total):
  - `version` (1 byte)
  - `ephemeral_id` (8 bytes): Derived from device secret and time bucket; rotates periodically.
  - `fingerprint` (8 bytes): 64‑bit interest bloom filter, obfuscated with a keyed hash.
  - `flags` (1 byte)
- Advertising:
  - iOS advertises a Service UUID (for discoverability) and encodes the compact payload into the local name/manufacturer data budget.
  - Rotation default: ~10 minutes to reduce linkability.
- Discovery:
  - Central scans for the Service UUID, parses candidate payloads, and surfaces entries in `Home` with live RSSI.

### Ephemeral identity and storage
- A device holds a platform‑secured secret material (not transmitted) used to derive ephemeral IDs.
- Profile (age, interests, preferences) is stored locally with encrypted storage. No PII is broadcast in BLE adverts.

### Session key agreement and message security
- Each peer generates an ephemeral keypair (X25519). Public keys are exchanged over the WebSocket session bootstrap.
- A shared secret is computed, then a 32‑byte session key is derived (e.g., HKDF/SHA‑256 over the shared secret).
- Messages are encrypted with a symmetric cipher (`nacl.secretbox` semantics: key + random nonce + authenticated encryption).
- The relay server only handles ciphertext blobs and cannot decrypt. No message history is stored.

### Matching and compatibility scoring
- Matching is computed on device with a speed‑optimized path:
  - Interests: 64‑bit bitmask Jaccard of normalized tokens; if exact Jaccard is 0, a tiny raw‑token overlap fallback provides a dampened score to avoid rare hash corner cases.
  - Gender: soft preference gate (not a hard zero); contributes when allowed.
  - Age: closeness curve (equal age scores highest; linearly decreases to 0 at ~10‑year gap).
  - Proximity: RSSI normalized to a 0–1 score with a far‑distance early exit.
- Output is a single score with a short explanation.

### Network relay and message flow
1. User selects a nearby candidate in `Home`.
2. `Chat` screen opens, establishes a WebSocket connection using `src/network/ws.ts`.
3. Ephemeral public keys are exchanged, the shared key is derived, and a handshake completes.
4. Each message typed by the user is encrypted and sent to the relay endpoint for the current `session_id`.
5. The relay broadcasts ciphertext to the other peer; each client decrypts locally and renders.

## Build, run, and configuration

Prerequisites
- Node 18+ and npm
- macOS with Xcode and CocoaPods (for iOS build)
- Docker (for running the server container), or Python 3.9+ if running locally

Install mobile dependencies
```bash
cd mobile/CloseApp
npm install
cd ios && pod install && cd ..
```

Configure runtime environment
- Provide `mobile/CloseApp/env.json` (gitignored) with your relay URL:
```json
{ "WS_BASE": "ws://YOUR_HOST_OR_IP:8080" }
```
- The app reads it via `src/config.ts`.

Run iOS
```bash
cd mobile/CloseApp
npx react-native run-ios
```
Notes
- On simulator, a simulated BLE loop is used. On a physical device, the native Swift module advertises/scans.
- Ensure Bluetooth permissions are granted.

Run the relay server
- With Docker:
```bash
cd server
docker build -t close-relay .
docker run -p 8080:8080 close-relay
```
- Or locally (Python):
```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

Point the app to the server
- For a simulator, `ws://localhost:8080` works.
- For devices, use your machine’s LAN IP (e.g., `ws://192.168.1.50:8080`) or a public hostname.

## Testing and field validation

Automated tests
```bash
cd mobile/CloseApp
npm test
```
- Unit tests cover scoring and app boot.

Manual BLE validation
- Use two iPhones to verify background advertising/scanning and candidate discovery. The `docs/ios_field_test.md` contains a step‑by‑step script.

## Security, privacy, and performance

- Privacy by design:
  - No PII in BLE advert payloads; only ephemeral tokens/fingerprints.
  - Server is transport‑only for ciphertext; no plaintext leaves the device.
  - Local encrypted storage for profiles; opt‑in visibility and easy toggles.
- Security:
  - Short‑lived ephemeral keys; derive per‑session symmetric keys.
  - Authenticated encryption for all messages; reject malformed frames.
- Performance:
  - BLE intervals tuned to reduce battery impact.
  - Matching and crypto are lightweight and computed on device to preserve responsiveness.

## Enhancing matching with LLM/AI

There are clear qualitative gains from using richer semantic models to compare user interests and bios:

- What improves with LLM/AI:
  - Better interest alignment: embedding‑based similarity (e.g., sentence transformers) captures synonyms and related concepts beyond keyword overlap.
  - Contextual signals: models can infer themes (e.g., “outdoor activities”) even when phrasing differs.
  - Robustness to noisy input: typos and short bios degrade less with vector semantics.

- What it costs (trade‑offs):
  - Latency: on‑device embedding models add tens to hundreds of milliseconds per profile; server‑side LLMs add network round‑trips and queuing delays.
  - Energy: on‑device inference increases CPU usage, impacting battery life during scanning and matching.
  - Privacy: sending bios/interests to a server‑side model may leak sensitive data unless you deploy your own model and apply strong safeguards.
  - Complexity: model management, versioning, and drift increase system complexity; caching and quantization are required to remain responsive.

- Practical integration options:
  1) On‑device small embedding model (preferred for privacy):
     - Quantized MiniLM‑class sentence embeddings (e.g., 6–22M params) via a mobile inference runtime.
     - Compute embeddings once at profile save time and cache locally; compare with dot‑product during discovery.
     - Pros: private, fast after initial embedding; Cons: app size and initial compute cost.
  2) Edge/server‑side embedding service you control:
     - POST sanitized interests/bio to an internal embedding endpoint; store only vectors, not raw text.
     - Pros: higher model quality, centralized updates; Cons: adds latency and careful privacy engineering.
  3) Full LLM scoring (few‑shot prompts or small finetunes):
     - Best qualitative results, but with the largest latency and cost. Consider for post‑match refinement rather than the primary, real‑time gate.

Recommendation for this app’s real‑time flow
- Keep the current lightweight on‑device matching for immediacy and battery life.
- Optionally augment with an embedding similarity score computed either on device (cached) or via an edge endpoint, used as an additional signal when the user opens a candidate detail view rather than in the tight BLE scan loop.
- Defer any full LLM scoring to post‑chat or background processing, where latency is acceptable and user consent can be obtained.

## Roadmap

- Android native BLE module and permissions UX.
- Mutual consent flow and encrypted social link exchange.
- Local session history with secure wipe and export controls.
- Push notifications (APNs/FCM) for message delivery.
- CI for tests and builds; secure configuration and TLS for the relay.
- Optional embedding‑based similarity with privacy‑preserving deployment (on‑device or self‑hosted).

