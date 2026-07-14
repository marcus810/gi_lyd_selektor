import Foundation
import CallKit
import AVFoundation
import React

@objc(CallKitModule)
class CallKitModule: NSObject, CXProviderDelegate {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  private var provider: CXProvider?
  private let callController = CXCallController()
  private var currentCallUUID: UUID?

  override init() {
    super.init()

    let config = CXProviderConfiguration(localizedName: "Proselector")
    config.supportsVideo = false
    config.maximumCallsPerCallGroup = 1
    config.supportedHandleTypes = [.generic]
    config.includesCallsInRecents = false

    let provider = CXProvider(configuration: config)
    provider.setDelegate(self, queue: nil)
    self.provider = provider
  }

  @objc
  func startCall(_ handle: String,
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

        self.provider?.reportOutgoingCall(with: uuid, startedConnectingAt: Date())
        self.provider?.reportOutgoingCall(with: uuid, connectedAt: Date())

        resolve(uuid.uuidString)
      }
    }
  }

  @objc
  func endCall(_ resolve: @escaping RCTPromiseResolveBlock,
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

  func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
    provider.reportOutgoingCall(with: action.callUUID, startedConnectingAt: Date())
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    self.currentCallUUID = nil
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
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
    print("[CallKit] didDeactivate audioSession")
  }

  func providerDidReset(_ provider: CXProvider) {
    print("[CallKit] providerDidReset")
    self.currentCallUUID = nil
  }
}
