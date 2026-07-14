import Foundation
import AVFoundation
import React

@objcMembers
@objc(AudioModeModule)
class AudioModeModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private var silenceObserver: Any?
  private var routeObserver: Any?

  override init() {
    super.init()

    silenceObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.silenceSecondaryAudioHintNotification,
      object: nil,
      queue: .main
    ) { note in
      let s = AVAudioSession.sharedInstance()
      print("=== silenceSecondaryAudioHint notification ===")
      print("userInfo:", note.userInfo ?? "nil")
      print("secondaryAudioShouldBeSilencedHint:", s.secondaryAudioShouldBeSilencedHint)
      print("currentRoute:", s.currentRoute)
    }

routeObserver = NotificationCenter.default.addObserver(
  forName: AVAudioSession.routeChangeNotification,
  object: nil,
  queue: .main
) { [weak self] note in
  let s = AVAudioSession.sharedInstance()

  print("=== routeChangeNotification ===")
  print("route:", s.currentRoute)
  print("category:", s.category.rawValue)
  print("mode:", s.mode.rawValue)

  var reasonRaw: UInt = 0
  if let value = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt {
    reasonRaw = value
    print("routeChange reason:", reasonRaw)
  }

  let output = s.currentRoute.outputs.first?.portType
  let isReceiver = output == .builtInReceiver
  let shouldBeCallMode =
    s.category == .playAndRecord &&
    s.mode == .voiceChat

  // If something flips us to receiver while we're in voiceChat mode,
  // force speaker back unless a wired/bluetooth route is active.
  if shouldBeCallMode && isReceiver {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
      do {
        let session = AVAudioSession.sharedInstance()

        let currentOutput = session.currentRoute.outputs.first?.portType
        let isBluetooth =
          currentOutput == .bluetoothHFP ||
          currentOutput == .bluetoothA2DP ||
          currentOutput == .bluetoothLE
        let isHeadphones =
          currentOutput == .headphones ||
          currentOutput == .airPlay

        if !isBluetooth && !isHeadphones {
          try session.overrideOutputAudioPort(.speaker)
          print("[AudioModeModule] route observer re-forced speaker")
          print("[AudioModeModule] route now:", session.currentRoute)
        }
      } catch {
        print("[AudioModeModule] failed to re-force speaker:", error)
      }
    }
  }
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

@objc
func forceSpeaker(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
  DispatchQueue.main.async {
    do {
      let session = AVAudioSession.sharedInstance()
      try session.overrideOutputAudioPort(.speaker)
      print("[AudioModeModule] forceSpeaker")
      print("[AudioModeModule] route:", session.currentRoute)
      resolve(nil)
    } catch {
      reject("audio_session_error", error.localizedDescription, error)
    }
  }
}

  @objc
  func setPlayback(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, options: [])
        try session.setActive(true)

        print("[AudioModeModule] setPlayback")
        print("[AudioModeModule] route:", session.currentRoute)
        print("[AudioModeModule] category:", session.category.rawValue)
        print("[AudioModeModule] mode:", session.mode.rawValue)

        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func setPlayAndRecordVoiceChat(_ resolve: @escaping RCTPromiseResolveBlock,
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        let session = AVAudioSession.sharedInstance()

        try session.setCategory(
          .playAndRecord,
          mode: .voiceChat,
          options: [.allowBluetooth, .defaultToSpeaker]
        )

        try session.setActive(true)

        if session.currentRoute.outputs.first?.portType != .bluetoothA2DP &&
           session.currentRoute.outputs.first?.portType != .bluetoothLE &&
           session.currentRoute.outputs.first?.portType != .bluetoothHFP {
          try session.overrideOutputAudioPort(.speaker)
        }

        print("[AudioModeModule] setPlayAndRecordVoiceChat")
        print("[AudioModeModule] route:", session.currentRoute)
        print("[AudioModeModule] category:", session.category.rawValue)
        print("[AudioModeModule] mode:", session.mode.rawValue)

        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func deactivate(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        let session = AVAudioSession.sharedInstance()
        try session.overrideOutputAudioPort(.none)
        try session.setActive(false)

        print("[AudioModeModule] deactivate")
        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func debugAudioSession(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let s = AVAudioSession.sharedInstance()

      let outputs = s.currentRoute.outputs.map {
        [
          "portType": $0.portType.rawValue,
          "portName": $0.portName
        ]
      }

      let inputs = s.currentRoute.inputs.map {
        [
          "portType": $0.portType.rawValue,
          "portName": $0.portName
        ]
      }

      resolve([
        "category": s.category.rawValue,
        "mode": s.mode.rawValue,
        "secondaryAudioShouldBeSilencedHint": s.secondaryAudioShouldBeSilencedHint,
        "outputs": outputs,
        "inputs": inputs
      ])
    }
  }
}