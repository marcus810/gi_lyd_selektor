// plugins/set-av-audio-session.js
const { withAppDelegate } = require('@expo/config-plugins');

function injectObjC(contents) {
  // simple guard to avoid double-inserting
  if (contents.includes('AVAudioSession') && contents.includes('DefaultToSpeaker')) {
    return contents;
  }

  // add import for AVFoundation if missing (try after AppDelegate.h import)
  if (!/AVFoundation\/AVFoundation/.test(contents)) {
    if (/#import\s+"AppDelegate.h"/.test(contents)) {
      contents = contents.replace(
        /(#import\s+"AppDelegate.h"\s*)/,
        `$1\n#import <AVFoundation/AVFoundation.h>\n`
      );
    } else {
      contents = `#import <AVFoundation/AVFoundation.h>\n` + contents;
    }
  }

const objcSnippet = `
  // --- injected by expo config plugin: AVAudioSession setup ---
  NSError *avError = nil;
  AVAudioSession *session = [AVAudioSession sharedInstance];
  [session setCategory:AVAudioSessionCategoryPlayback error:&avError];
  [session setActive:YES error:&avError];
  if (avError) {
    NSLog(@"AVAudioSession setup error: %@", avError);
  }
  // --- end injected snippet ---
`;

  // Try to insert right before common didFinishLaunching return points.
  // Prioritize the [super application:... didFinishLaunchingWithOptions:...] return
  if (contents.includes('return [super application:application didFinishLaunchingWithOptions:launchOptions];')) {
    contents = contents.replace(
      'return [super application:application didFinishLaunchingWithOptions:launchOptions];',
      objcSnippet + '\n  return [super application:application didFinishLaunchingWithOptions:launchOptions];'
    );
    return contents;
  }

  // Other possible forms: return YES;
  if (contents.includes('return YES;')) {
    contents = contents.replace(/return YES;/, objcSnippet + '\n  return YES;');
    return contents;
  }

  // Fallback: insert the snippet inside the didFinishLaunchingWithOptions implementation body
  // Try to find the function start and insert after opening brace
  const didLaunchMatch = contents.match(/- \(BOOL\)application:\(UIApplication \*\)application didFinishLaunchingWithOptions:\(NSDictionary \*\)launchOptions\s*\{?/m);
  if (didLaunchMatch) {
    // find the location of the opening brace for the method
    const idx = contents.indexOf(didLaunchMatch[0]);
    const afterIdx = contents.indexOf('{', idx);
    if (afterIdx !== -1) {
      // insert right after the opening brace (preserve indentation)
      const insertPos = afterIdx + 1;
      contents = contents.slice(0, insertPos) + '\n  ' + objcSnippet + contents.slice(insertPos);
      return contents;
    }
  }

  // If none matched, return contents unchanged (so we avoid corrupting file)
  return contents;
}

function injectSwift(contents) {
  // don't double-insert (simple guard)
  if (contents.includes('AVAudioSession') && contents.includes('defaultToSpeaker')) {
    return contents;
  }

  // add import AVFoundation near top if missing
  if (!/import AVFoundation/.test(contents)) {
    if (/import UIKit/.test(contents)) {
      contents = contents.replace(/(import UIKit\n)/, `$1import AVFoundation\n`);
    } else {
      contents = `import AVFoundation\n` + contents;
    }
  }

  // Swift snippet to insert before 'return true' in didFinishLaunchingWithOptions
  const swiftSnippet = `
        // --- injected by expo config plugin: AVAudioSession setup ---
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback)
            try session.setActive(true)
        } catch {
            print("AVAudioSession setup error: \(error)")
        }
        // --- end injected snippet ---
`;

  // Prefer the typical 'return true' that appears in Swift didFinishLaunching
  if (contents.includes('return true')) {
    contents = contents.replace(/return true/, swiftSnippet + '\n        return true');
    return contents;
  }

  // Fallback: find the didFinishLaunching function and inject after opening brace
  const swiftMatch = contents.match(/func application\(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?\) -> Bool\s*\{?/m);
  if (swiftMatch) {
    const idx = contents.indexOf(swiftMatch[0]);
    const afterIdx = contents.indexOf('{', idx);
    if (afterIdx !== -1) {
      const insertPos = afterIdx + 1;
      contents = contents.slice(0, insertPos) + '\n        ' + swiftSnippet + contents.slice(insertPos);
      return contents;
    }
  }

  return contents;
}

module.exports = function setAVAudioSession(config) {
  return withAppDelegate(config, async (config) => {
    let contents = config.modResults.contents || '';

    // Detect ObjC vs Swift heuristics
    if (/^#import|UIApplicationMain|didFinishLaunchingWithOptions/m.test(contents)) {
      contents = injectObjC(contents);
    } else if (/import UIKit|@UIApplicationMain|func application\(/m.test(contents)) {
      contents = injectSwift(contents);
    } else {
      // Best-effort: try both injections
      contents = injectObjC(contents);
      contents = injectSwift(contents);
    }

    config.modResults.contents = contents;
    return config;
  });
};
