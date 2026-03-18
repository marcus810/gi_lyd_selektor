import Foundation
import AVFoundation
import React

@objcMembers
@objc(AudioModeModule)
class AudioModeModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! {
    return "AudioModeModule"
  }

  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // keep references so we can remove the observers
  private var silenceObserver: Any?
  private var routeObserver: Any?

  override init() {
    super.init()

    // Silence hint observer - logs userInfo and reasserts session when needed
    silenceObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.silenceSecondaryAudioHintNotification,
      object: nil,
      queue: .main) { [weak self] note in
        print("=== silenceSecondaryAudioHint notification ===")
        print("userInfo:", note.userInfo ?? "nil")
        if let n = note.userInfo?[AVAudioSessionSilenceSecondaryAudioHintTypeKey] as? NSNumber {
          print("raw SilenceSecondaryAudioHintType:", n.intValue) // 0 or 1 expected (Begin/End)
        } else {
          print("no numeric key found")
        }
        print("secondaryAudioShouldBeSilencedHint:", AVAudioSession.sharedInstance().secondaryAudioShouldBeSilencedHint)
        print("currentRoute:", AVAudioSession.sharedInstance().currentRoute)

        // reassert session when system says secondary should be silenced
        let shouldSilence = AVAudioSession.sharedInstance().secondaryAudioShouldBeSilencedHint
        if shouldSilence {
          // run on main (AVAudioSession is safer to touch from main)
          DispatchQueue.main.async {
            do {
              let s = AVAudioSession.sharedInstance()
              try s.setActive(false)
              try s.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .defaultToSpeaker])
              try s.setActive(true)
              print("reasserted playAndRecord")
            } catch {
              print("reassert failed:", error)
            }
          }
        }
    }

    // Route change observer - logs current route
    routeObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: .main) { note in
        print("=== routeChangeNotification:", AVAudioSession.sharedInstance().currentRoute)
    }
  }

  deinit {
    if let t = silenceObserver {
      NotificationCenter.default.removeObserver(t)
      silenceObserver = nil
    }
    if let t = routeObserver {
      NotificationCenter.default.removeObserver(t)
      routeObserver = nil
    }
  }

  // Your existing exported methods (adjust name signatures if needed)
  @objc func setPlayback(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try session.setActive(true)
        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }

  @objc func setPlayAndRecordVoiceChat(_ resolve: @escaping RCTPromiseResolveBlock,
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let session = AVAudioSession.sharedInstance()
        // prefer being primary for capture; remove .mixWithOthers if you need guaranteed capture
        try session.setCategory(.playAndRecord, mode: .voiceChat,
                                options: [.allowBluetooth, .defaultToSpeaker])
        try session.setActive(true)
        print("AVSession active, route:", session.currentRoute, "shouldBeSilenced:", session.secondaryAudioShouldBeSilencedHint)
        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }

  @objc func deactivate(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try AVAudioSession.sharedInstance().setActive(false)
        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }
}

