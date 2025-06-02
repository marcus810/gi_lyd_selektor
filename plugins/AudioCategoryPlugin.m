#import <React/RCTBridgeModule.h>
#import <RTCAudioSession/RTCAudioSession.h>
#import <RTCAudioSession/RTCAudioSessionConfiguration.h>

@interface AudioCategoryPlugin : NSObject <RCTBridgeModule>
@end

@implementation AudioCategoryPlugin

RCT_EXPORT_MODULE();

// Call this from JS before any WebRTC init:
RCT_EXPORT_METHOD(setupPlaybackCategory:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  @try {
    RTCAudioSessionConfiguration *config = [RTCAudioSessionConfiguration webRTCConfiguration];
    config.category = AVAudioSessionCategoryPlayback; // media only
    config.categoryOptions = AVAudioSessionCategoryOptionDefaultToSpeaker |
                             AVAudioSessionCategoryOptionAllowBluetooth;
    RTCAudioSession *session = [RTCAudioSession sharedInstance];
    [session lockForConfiguration];
    [session setConfiguration:config error:nil];
    [session unlockForConfiguration];
    resolve(@(YES));
  } @catch (NSError *error) {
    reject(@"setup_failed", @"Failed to set audio category", error);
  }
}

@end
