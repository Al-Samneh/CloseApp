import Foundation
import CoreBluetooth
import React

@objc(BLEModule)
class BLEModule: RCTEventEmitter, CBCentralManagerDelegate, CBPeripheralManagerDelegate {
  private var centralManager: CBCentralManager!
  private var peripheralManager: CBPeripheralManager!
  private var serviceUUID = CBUUID(string: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
  private var advertisePayload: Data?
  private var isScanning = false

  override init() {
    super.init()
    // Use main queue for CoreBluetooth to ensure any system UI (e.g., permission prompts) behaves correctly
    centralManager = CBCentralManager(delegate: self, queue: DispatchQueue.main)
    peripheralManager = CBPeripheralManager(delegate: self, queue: DispatchQueue.main)
  }

  override func supportedEvents() -> [String]! {
    return ["BLEOnCandidate", "BLEState"]
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc(startAdvertising:)
  func startAdvertising(_ payloadBase64: NSString) {
    guard let data = Data(base64Encoded: payloadBase64 as String) else { 
      print("❌ BLE: Failed to decode base64 payload")
      return 
    }
    advertisePayload = data
    if peripheralManager.state == .poweredOn {
      // Simple approach: encode payload as hex string in local name
      // iOS allows up to ~20-30 chars in local name
      let hexString = data.map { String(format: "%02x", $0) }.joined()
      let localName = "CL-\(hexString.prefix(24))"
      let adv: [String: Any] = [
        CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
        CBAdvertisementDataLocalNameKey: localName
      ]
      print("✅ BLE: Starting advertising with name: \(localName)")
      peripheralManager.startAdvertising(adv)
    } else {
      print("⚠️ BLE: Cannot advertise, peripheral state: \(peripheralManager.state.rawValue)")
    }
  }

  @objc(stopAdvertising)
  func stopAdvertising() {
    peripheralManager.stopAdvertising()
  }

  @objc(startScanning)
  func startScanning() {
    if centralManager.state == .poweredOn {
      if !isScanning {
        isScanning = true
        print("✅ BLE: Starting scan for service: \(serviceUUID)")
        centralManager.scanForPeripherals(withServices: [serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
      }
    } else {
      print("⚠️ BLE: Cannot scan, central state: \(centralManager.state.rawValue)")
      // Set flag; scanning will begin once state becomes poweredOn
      isScanning = true
    }
  }

  @objc(stopScanning)
  func stopScanning() {
    if isScanning {
      isScanning = false
      centralManager.stopScan()
    }
  }

  // MARK: - CoreBluetooth delegates
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    print("🔵 BLE: Central state changed to: \(central.state.rawValue)")
    // Don't send events during initialization - wait for JS to be ready
    if central.state == .poweredOn {
      print("✅ BLE: Central is powered on")
      if isScanning {
        print("✅ BLE: Auto-starting scan after power on")
        central.scanForPeripherals(withServices: [serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
      }
    } else {
      if isScanning { 
        print("⚠️ BLE: Stopping scan, central not powered on")
        central.stopScan() 
      }
    }
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    print("🟣 BLE: Peripheral state changed to: \(peripheral.state.rawValue)")
    // Don't send events during initialization - wait for JS to be ready
    if peripheral.state != .poweredOn {
      print("⚠️ BLE: Stopping advertising, peripheral not powered on")
      peripheral.stopAdvertising()
    } else if let data = advertisePayload {
      // Simple approach: encode payload as hex string in local name
      let hexString = data.map { String(format: "%02x", $0) }.joined()
      let localName = "CL-\(hexString.prefix(24))"
      let adv: [String: Any] = [
        CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
        CBAdvertisementDataLocalNameKey: localName
      ]
      print("✅ BLE: Auto-starting advertising after power on: \(localName)")
      peripheral.startAdvertising(adv)
    }
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
    print("🔍 BLE: Discovered device! RSSI: \(RSSI), Data: \(advertisementData)")
    
    // Read from local name (contains hex-encoded payload)
    if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String,
       localName.hasPrefix("CL-") {
      print("✅ BLE: Found Close device: \(localName)")
      // Extract hex string after "CL-" prefix
      let hexString = String(localName.dropFirst(3))
      // Convert hex string back to data
      var data = Data()
      var index = hexString.startIndex
      while index < hexString.endIndex {
        let nextIndex = hexString.index(index, offsetBy: 2, limitedBy: hexString.endIndex) ?? hexString.endIndex
        let byteString = hexString[index..<nextIndex]
        if let byte = UInt8(byteString, radix: 16) {
          data.append(byte)
        }
        index = nextIndex
      }
      let base64 = data.base64EncodedString()
      print("📡 BLE: Sending candidate to JS: \(base64)")
      sendEvent(withName: "BLEOnCandidate", body: ["payloadBase64": base64, "rssi": RSSI.intValue])
    } else {
      print("⚠️ BLE: Device found but not a Close device (no CL- prefix)")
    }
  }
}


