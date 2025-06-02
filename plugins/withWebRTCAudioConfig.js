const { withAppDelegate } = require('@expo/config-plugins');

const WEBRTC_AUDIO_CONFIG = `
  RTCAudioSessionConfiguration *audioConfiguration = [RTCAudioSessionConfiguration webRTCConfiguration];
  
  // Set category and mode for WebRTC
  audioConfiguration.category = AVAudioSessionCategoryPlayAndRecord;
  audioConfiguration.mode = AVAudioSessionModeVoiceChat;
  audioConfiguration.categoryOptions = AVAudioSessionCategoryOptionMixWithOthers | AVAudioSessionCategoryOptionDuckOthers;
`;

module.exports = function withWebRTCAudioConfig(config) {
  return withAppDelegate(config, (config) => {
    const appDelegate = config.modResults;

    // Ensure WebRTC header is imported
    if (!appDelegate.contents.includes('#import <WebRTC/WebRTC.h>')) {
      appDelegate.contents = appDelegate.contents.replace(
        /#import\s+"AppDelegate\.h"/,
        `#import "AppDelegate.h"\n#import <WebRTC/WebRTC.h>`
      );
    }

    // Find the didFinishLaunchingWithOptions method and insert the WebRTC config
    const methodSignature = '- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions';
    const methodIndex = appDelegate.contents.indexOf(methodSignature);

    if (methodIndex === -1) {
      throw new Error('Could not find didFinishLaunchingWithOptions method in AppDelegate.m');
    }

    // Locate the start of the method body (after the opening brace)
    const methodStart = appDelegate.contents.indexOf('{', methodIndex) + 1;

    // Check if the config is already present to avoid duplicates
    if (!appDelegate.contents.includes('RTCAudioSessionConfiguration *audioConfiguration')) {
      appDelegate.contents =
        appDelegate.contents.slice(0, methodStart) +
        '\n' +
        WEBRTC_AUDIO_CONFIG +
        appDelegate.contents.slice(methodStart);
    }

    return config;
  });
};