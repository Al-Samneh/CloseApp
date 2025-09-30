# Privacy & App Store Checklist

- Background modes: bluetooth-central, bluetooth-peripheral
- Usage keys: NSBluetoothAlwaysUsageDescription, NSBluetoothPeripheralUsageDescription, NSLocationWhenInUseUsageDescription
- Submission note: “This app requires background Bluetooth to enable ephemeral proximity-based discovery to facilitate fleeting social connections nearby. We do not collect or store personal information on servers; all broadcasts are ephemeral hashed tokens, and personal data is revealed only after mutual consent. User-facing toggles allow turning off background discovery.”
- No PII in BLE payload; ephemeral rotating IDs only
- Local encryption for stored PII
- E2E encryption for chat; server (if used) relays ciphertext only
- Data deletion/export flow documented

