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

  @objc
  func setPlayback(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        let session = AVAudioSession.sharedInstance()
        let alreadyConfigured =
          session.category == .playback &&
          session.mode == .default &&
          session.categoryOptions.isEmpty

        if !alreadyConfigured {
          if session.category == .playAndRecord {
            try session.overrideOutputAudioPort(.none)
          }

          try session.setActive(
            false,
            options: .notifyOthersOnDeactivation
          )
          try session.setCategory(
            .playback,
            mode: .default,
            options: []
          )
        }

        try session.setActive(true)

        print("[AudioModeModule] playback route:", session.currentRoute)
        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func setPlayAndRecordVoiceChat(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      do {
        let session = AVAudioSession.sharedInstance()
        let options: AVAudioSession.CategoryOptions = [
          .allowBluetoothHFP,
          .allowBluetoothA2DP,
          .defaultToSpeaker
        ]
        let alreadyConfigured =
          session.category == .playAndRecord &&
          session.mode == .default &&
          session.categoryOptions == options

        if !alreadyConfigured {
          if session.category == .playAndRecord {
            try session.overrideOutputAudioPort(.none)
          }

          try session.setCategory(
            .playAndRecord,
            mode: .default,
            options: options
          )
        }

        // Remove any temporary speaker override. defaultToSpeaker still
        // provides the desired fallback when no accessory is connected.
        try session.overrideOutputAudioPort(.none)

        try session.setActive(true)

        print(
          "[AudioModeModule] playAndRecord route:",
          session.currentRoute
        )
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
        if session.category == .playAndRecord {
          try session.overrideOutputAudioPort(.none)
        }
        try session.setActive(
          false,
          options: .notifyOthersOnDeactivation
        )

        print("[AudioModeModule] deactivate")
        resolve(nil)
      } catch {
        reject("audio_session_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func debugAudioSession(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let session = AVAudioSession.sharedInstance()
      let outputs = session.currentRoute.outputs.map {
        [
          "portType": $0.portType.rawValue,
          "portName": $0.portName
        ]
      }
      let inputs = session.currentRoute.inputs.map {
        [
          "portType": $0.portType.rawValue,
          "portName": $0.portName
        ]
      }

      resolve([
        "category": session.category.rawValue,
        "mode": session.mode.rawValue,
        "categoryOptions": session.categoryOptions.rawValue,
        "sampleRate": session.sampleRate,
        "ioBufferDuration": session.ioBufferDuration,
        "inputLatency": session.inputLatency,
        "outputLatency": session.outputLatency,
        "secondaryAudioShouldBeSilencedHint":
          session.secondaryAudioShouldBeSilencedHint,
        "outputs": outputs,
        "inputs": inputs
      ])
    }
  }
}
