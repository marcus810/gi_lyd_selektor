#import "AppDelegate.h"


#import <AVFoundation/AVFoundation.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>


#import <WebRTC/RTCAudioSession.h>
#import <WebRTC/RTCAudioSessionConfiguration.h>

// Import WebRTCModuleOptions (from react-native-webrtc)
#import "WebRTCModuleOptions.h"

// <-- ADD THESE LINES BEFORE your Project-Swift header
#if __has_include("ExpoModulesCore-Swift.h")
#import "ExpoModulesCore-Swift.h"
#elif __has_include(<ExpoModulesCore/ExpoModulesCore-Swift.h>)
#import <ExpoModulesCore/ExpoModulesCore-Swift.h>
#endif

#import "ProSelector-Swift.h"
// <-- end added lines

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  [[NSNotificationCenter defaultCenter] addObserverForName:AVAudioSessionInterruptionNotification
                                                  object:[AVAudioSession sharedInstance]
                                                   queue:[NSOperationQueue mainQueue]
                                              usingBlock:^(NSNotification *note) {
    NSLog(@"AVAudioSession interruption: %@", note);
  }];

  // Poll and detect category changes with stacktrace
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSString *last = [AVAudioSession sharedInstance].category;
    for (;;) {
      @autoreleasepool {
        NSString *now = [AVAudioSession sharedInstance].category;
        if (![now isEqualToString:last]) {
          NSLog(@"AVAudioSession category changed from %@ -> %@", last, now);
          NSLog(@"Callstack at change: %@", [NSThread callStackSymbols]);
          last = now;
        }
        [NSThread sleepForTimeInterval:0.25]; // cheap poll
      }
    }
  });
    // --- Inject custom RTCAudioDevice BEFORE WebRTC module initializes ---
    // (Make sure this runs before any react-native-webrtc native init, i.e. before super)
    @try {
      WebRTCModuleOptions *options = [WebRTCModuleOptions sharedInstance];
      options.loggingSeverity = RTCLoggingSeverityInfo;

      // If AUAudioUnitRTCAudioDevice is a Swift class exposed to ObjC via the -Swift.h header:
      AUAudioUnitRTCAudioDevice *device = [[AUAudioUnitRTCAudioDevice alloc] init];

      // If the class name or header differs in your copy of RTCAudioDevice, adjust accordingly.
      options.audioDevice = (id<RTCAudioDevice>)device;
    } @catch (NSException *ex) {
      NSLog(@"Could not set custom audio device: %@", ex);
    }
    // --- end custom audio device injection ---

    // --- Force WebRTC to use Playback category before it initializes ---
    RTCAudioSessionConfiguration *webrtcConfig = [RTCAudioSessionConfiguration webRTCConfiguration];
    webrtcConfig.category = AVAudioSessionCategoryPlayback;
    webrtcConfig.mode = AVAudioSessionModeDefault;
    webrtcConfig.categoryOptions = AVAudioSessionCategoryOptionMixWithOthers;

    // Apply to WebRTC
    [RTCAudioSessionConfiguration setWebRTCConfiguration:webrtcConfig];
    // --- end WebRTC config ---

    // --- injected by expo config plugin: AVAudioSession setup ---
    NSError *avError = nil;
    AVAudioSession *session = [AVAudioSession sharedInstance];
    [session setCategory:AVAudioSessionCategoryPlayback error:&avError];
    [session setActive:YES error:&avError];
    if (avError) {
      NSLog(@"AVAudioSession setup error: %@", avError);
    }
    // --- end injected snippet ---



  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

@end
