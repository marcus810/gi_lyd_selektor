import Foundation
import CallKit
import AVFoundation
import React

@objc(CallKitModule)
class CallKitModule: NSObject, RCTBridgeModule, CXProviderDelegate {
  static func moduleName() -> String! { "CallKitModule" }
  static func requiresMainQueueSetup() -> Bool { true }

  private var provider: CXProvider?
  private let callController = CXCallController()
  private var currentCallUUID: UUID?

  override init() {
    super.init()

    let config = CXProviderConfiguration(localizedName: "Pro Selector")
    config.supportsVideo = false
    config.maximumCallsPerCallGroup = 1
    config.supportedHandleTypes = [.generic]
    config.includesCallsInRecents = false

    // Optional: set icon (must be in app bundle) if you want
    // config.iconTemplateImageData = UIImage(named: "CallKitIcon")?.pngData()

    let provider = CXProvider(configuration: config)
    provider.setDelegate(self, queue: nil)
    self.provider = provider
  }

  // JS -> start a CallKit call (so iOS treats this as an active call)
  @objc func startCall(_ handle: String,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let uuid = UUID()
      self.currentCallUUID = uuid

      let cxHandle = CXHandle(type: .generic, value: handle)
      let start = CXStartCallAction(call: uuid, handle: cxHandle)
      start.isVideo = false

      let transaction = CXTransaction(action: start)
      self.callController.request(transaction) { err in
        if let err = err {
          reject("callkit_start_failed", err.localizedDescription, err)
          return
        }

        // Tell the system the call is connecting/connected
        self.provider?.reportOutgoingCall(with: uuid, startedConnectingAt: Date())
        self.provider?.reportOutgoingCall(with: uuid, connectedAt: Date())

        resolve(uuid.uuidString)
      }
    }
  }

  // JS -> end the active call
  @objc func endCall(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let uuid = self.currentCallUUID else {
        resolve(nil)
        return
      }
      let end = CXEndCallAction(call: uuid)
      let transaction = CXTransaction(action: end)
      self.callController.request(transaction) { err in
        if let err = err {
          reject("callkit_end_failed", err.localizedDescription, err)
          return
        }
        self.currentCallUUID = nil
        resolve(nil)
      }
    }
  }

  // MARK: CXProviderDelegate

  func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
    // CallKit accepted start request
    provider.reportOutgoingCall(with: action.callUUID, startedConnectingAt: Date())
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    // CallKit wants you to end. You should stop WebRTC + socket from JS too.
    self.currentCallUUID = nil
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    // 🔥 THIS IS CRITICAL
    // iOS activated your audio session for a call; assert your desired category/options NOW.
    DispatchQueue.main.async {
      do {
        try audioSession.setCategory(.playAndRecord,
                                     mode: .voiceChat,
                                     options: [.allowBluetooth, .defaultToSpeaker])
        try audioSession.setActive(true)
        print("[CallKit] didActivate audioSession; asserted playAndRecord voiceChat")
      } catch {
        print("[CallKit] failed to assert AVAudioSession:", error)
      }
    }
  }

  func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    // Call ended / system deactivated. You can optionally setActive(false).
    print("[CallKit] didDeactivate audioSession")
  }

  func providerDidReset(_ provider: CXProvider) {
    print("[CallKit] providerDidReset")
    self.currentCallUUID = nil
  }
}
