# iOS Field Test Script

Devices: two iPhones on iOS 16/17.

Steps:
- Install the app on both devices (Debug/Release).
- Grant Bluetooth permissions when prompted.
- Ensure Background App Refresh is enabled.
- On both devices, open the app and toggle scanning.
- Lock screens and move devices 5–10 meters apart, then closer.
- Expect discovery notifications and candidate list updates within ~1–3 minutes in background.
- Unlock and observe ephemeral IDs; start/stop scanning to reset.

Notes:
- iOS background BLE delivers only adverts including the app Service UUID.
- Discovery may be slower in background; keep devices awake initially to seed.

