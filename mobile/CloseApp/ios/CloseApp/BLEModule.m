#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(BLEModule, RCTEventEmitter)
RCT_EXTERN_METHOD(startAdvertising:(NSString *)payloadBase64)
RCT_EXTERN_METHOD(stopAdvertising)
RCT_EXTERN_METHOD(startScanning)
RCT_EXTERN_METHOD(stopScanning)
@end

