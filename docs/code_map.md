# Close code map

- README.md: Top-level quick start and run instructions.
- docs/ios_field_test.md: Field test steps for iOS background BLE verification.
- docs/privacy_checklist.md: Privacy and App Store requirement checklist.
- docs/code_map.md: This file; outlines files and their purposes.

Mobile (React Native):
- mobile/CloseApp/package.json: App dependencies, scripts, engines.
- mobile/CloseApp/tsconfig.json: TS compiler options and path aliases.
- mobile/CloseApp/jest.config.js: Jest config for RN + TS, transform ignores.
- mobile/CloseApp/index.js: RN entry; installs random values polyfill and Buffer.
- mobile/CloseApp/app.json: App name and metadata.
- mobile/CloseApp/App.tsx: Minimal UI to start/stop scanning and list candidates.
- mobile/CloseApp/__tests__/App.test.tsx: Sample RN test scaffold from template.

iOS native:
- mobile/CloseApp/ios/CloseApp/Info.plist: Usage descriptions and background modes for BLE.
- mobile/CloseApp/ios/CloseApp/BLEModule.swift: CoreBluetooth advertiser/scanner and RN event emitter.
- mobile/CloseApp/ios/CloseApp/BLEModule.m: Objective-C bridge declarations for Swift module.
- mobile/CloseApp/ios/CloseApp/AppDelegate.h/mm: Standard RN app delegate (unchanged logic).
- mobile/CloseApp/ios/CloseApp.xcodeproj/*: Xcode project settings and scheme.
- mobile/CloseApp/ios/Podfile: CocoaPods config for iOS build.

Android (template):
- mobile/CloseApp/android/*: Default RN Android project; no custom BLE module yet.

Source modules (TypeScript):
- mobile/CloseApp/src/ble/index.ts: Cross-platform BLE manager; uses native module on devices and simulated BLE on desktop.
- mobile/CloseApp/src/ble/simulated.ts: Timer-based simulated candidate emitter for CI/desktop.
- mobile/CloseApp/src/utils/blePayload.ts: 18-byte payload pack/unpack helpers.
- mobile/CloseApp/src/utils/ephemeralId.ts: Ephemeral ID derivation using sha256 and truncation.
- mobile/CloseApp/src/utils/fingerprint.ts: Interest bloom, obfuscation with HMAC(sha256), and approximate Jaccard.
- mobile/CloseApp/src/crypto/ephemeral.ts: Ephemeral keypair, shared secret, and secretbox encrypt/decrypt using tweetnacl.
- mobile/CloseApp/src/scoring/compatibility.ts: Compatibility scoring functions and defaults.
- mobile/CloseApp/src/scoring/compatibility.test.ts: Unit test for scoring behavior.
- mobile/CloseApp/src/__mocks__/bleCandidates.ts: Mock candidates for tests/examples.
