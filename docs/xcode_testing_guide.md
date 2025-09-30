# Xcode Testing Guide for Close App

## 🎯 What We Fixed

### 1. **BLE Error Handling**
- Added better error messages when Bluetooth fails
- Shows helpful alerts with troubleshooting steps
- Error banner appears on the Home screen if scanning fails

### 2. **UI Improvements**
- **Onboarding Screen**: Large "Close" logo with tagline
- **Home Screen**: Small "Close" header, modern scan button (blue when starting, red when stopping)
- **Chat Screen**: Small "Close" header with session ID
- Better colors, spacing, and modern iOS-style buttons
- Improved message bubbles (blue for you, gray for others)

---

## 📱 Xcode Basics

### Key Buttons in Xcode
1. **⌘B (Build)**: Compiles your code but doesn't run it. Check for errors.
2. **⌘R (Run/Play button)**: Builds AND launches the app on your selected device.
3. **⌘. (Stop)**: Stops the running app.

### Device Selector
- Click the device name next to the Play button (top-left)
- You'll see your connected iPhone(s) and simulators
- Select which iPhone to install to

### Scheme
- Make sure "CloseApp" scheme is selected (not "Pods" or anything else)

---

## 🔌 Testing on Two iPhones

### Option 1: **One Cable, Install Twice** (Easiest)
1. Connect **iPhone A** via cable
2. Select it in Xcode device selector
3. Press **⌘R** to install and run
4. **Disconnect iPhone A**, connect **iPhone B**
5. Select iPhone B in Xcode
6. Press **⌘R** again
7. Now both phones have the app installed!
8. **Disconnect** iPhone B - both phones can now run independently

**Important**: The app will run for 7 days. After that, you'll need to re-install from Xcode (Apple's free developer certificate limitation).

### Option 2: **Wireless Debugging** (After first cable install)
1. Connect iPhone via cable first time
2. In Xcode: **Window > Devices and Simulators**
3. Select your iPhone
4. Check **"Connect via network"**
5. Disconnect cable - Xcode can now install wirelessly!

### Option 3: **TestFlight** (Best for long-term testing)
- Requires Apple Developer account ($99/year)
- Upload to App Store Connect
- Invite testers via TestFlight
- No cable needed, builds last 90 days

---

## 🐛 Troubleshooting BLE Issues

### If you get "BLE Error" when scanning:

1. **Check Bluetooth**
   - Settings > Bluetooth > Make sure it's ON

2. **Check Permissions**
   - Settings > Close > Enable Bluetooth permission

3. **Trust Developer Certificate**
   - Settings > General > VPN & Device Management
   - Tap your Apple ID under "Developer App"
   - Tap "Trust"

4. **Restart the App**
   - Force quit and reopen
   - Or rebuild from Xcode (⌘R)

5. **Check Console Logs**
   - In Xcode, open **View > Debug Area > Show Debug Area** (⇧⌘Y)
   - Look for "BLE" messages - they'll tell you what's wrong

### Common Issues:
- **"BLE state not poweredOn"**: Bluetooth is off or restricted
- **Permission denied**: You denied Bluetooth permission - go to Settings
- **No devices found**: Make sure both phones are running the app and scanning

---

## 📍 How the App Works

1. **Onboarding**: First time users create a profile
2. **Home Screen**: 
   - Press **Start** to begin Bluetooth scanning
   - Your phone broadcasts an ephemeral ID
   - It also scans for other nearby phones running Close
   - Devices appear in the list with signal strength
3. **Chat**: Tap "Chat" on a discovered device to start secure messaging
   - End-to-end encrypted using your session key
   - Messages relay through your WebSocket server

---

## 💡 Pro Tips

1. **Keep Xcode open** while testing - you can see console logs in real-time
2. **Shake to reload** doesn't work with native builds - use ⌘R in Xcode
3. **Background mode**: iOS heavily restricts background BLE. The app works best when in the foreground.
4. **Distance**: BLE range is ~10-30 meters depending on environment
5. **Battery**: BLE scanning can drain battery - the app rotates ephemeral IDs every 10 minutes to balance privacy and battery

---

## 🚀 Next Steps

### To improve the app:
- Add profile pictures
- Show compatibility scores on the Home screen
- Add push notifications for new messages
- Improve BLE background scanning (requires additional Apple entitlements)
- Add a "matching" algorithm based on interests

### To deploy:
1. Join Apple Developer Program ($99/year)
2. Create App ID and provisioning profiles
3. Upload to App Store Connect
4. Submit for TestFlight beta testing
5. Eventually submit for App Store review

---

## 📞 If Something Breaks

1. Clean build folder: **Product > Clean Build Folder** (⇧⌘K)
2. Delete derived data: **Xcode > Preferences > Locations > Derived Data** (click arrow, delete folder)
3. Reinstall Pods: `cd ios && pod install && cd ..`
4. Restart Xcode
5. Check if the issue is in TypeScript/JavaScript or native Swift code

---

Good luck with your testing! 🎉
