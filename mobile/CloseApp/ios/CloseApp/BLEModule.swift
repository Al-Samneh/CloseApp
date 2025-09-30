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
    centralManager = CBCentralManager(delegate: self, queue: DispatchQueue.global(qos: .background))
    peripheralManager = CBPeripheralManager(delegate: self, queue: DispatchQueue.global(qos: .background))
  }

  override func supportedEvents() -> [String]! {
    return ["BLEOnCandidate"]
  }

  @objc(startAdvertising:)
  func startAdvertising(_ payloadBase64: NSString) {
    guard let data = Data(base64Encoded: payloadBase64 as String) else { return }
    advertisePayload = data
    if peripheralManager.state == .poweredOn {
      let adv: [String: Any] = [
        CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
        CBAdvertisementDataManufacturerDataKey: data
      ]
      peripheralManager.startAdvertising(adv)
    }
  }

  @objc(stopAdvertising)
  func stopAdvertising() {
    peripheralManager.stopAdvertising()
  }

  @objc(startScanning)
  func startScanning() {
    if centralManager.state == .poweredOn, !isScanning {
      isScanning = true
      centralManager.scanForPeripherals(withServices: [serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
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
    if central.state != .poweredOn {
      if isScanning { central.stopScan() }
      isScanning = false
    }
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    if peripheral.state != .poweredOn {
      peripheral.stopAdvertising()
    } else if let data = advertisePayload {
      let adv: [String: Any] = [
        CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
        CBAdvertisementDataManufacturerDataKey: data
      ]
      peripheral.startAdvertising(adv)
    }
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
    if let mData = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data {
      let base64 = mData.base64EncodedString()
      sendEvent(withName: "BLEOnCandidate", body: ["payloadBase64": base64, "rssi": RSSI.intValue])
    }
  }
}


