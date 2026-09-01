#import "RemoteIOAudioDevice.h"

#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>

#import <string.h>

static const Float64 kRemoteIOSampleRate = 48000.0;
static const UInt32 kRemoteIOChannelCount = 1;
static const UInt32 kRemoteIOBytesPerSample = sizeof(SInt16);
static const NSTimeInterval kRequestedIOBufferDuration = 0.01;

// Forward declaration of the Core Audio render callback.
static OSStatus RemoteIORenderCallback(
    void *inRefCon,
    AudioUnitRenderActionFlags *ioActionFlags,
    const AudioTimeStamp *inTimeStamp,
    UInt32 inBusNumber,
    UInt32 inNumberFrames,
    AudioBufferList *ioData
);

static OSStatus RemoteIORecordingCallback(
    void *inRefCon,
    AudioUnitRenderActionFlags *ioActionFlags,
    const AudioTimeStamp *inTimeStamp,
    UInt32 inBusNumber,
    UInt32 inNumberFrames,
    AudioBufferList *ioData
);

static BOOL CheckOSStatus(OSStatus status, NSString *operation) {
  if (status == noErr) {
    return YES;
  }

  NSLog(
    @"[REMOTE_IO] %@ failed with OSStatus=%d",
    operation,
    (int)status
  );

  return NO;
}

static void FillAudioBufferListWithSilence(
    AudioBufferList *audioBufferList
) {
  if (audioBufferList == NULL) {
    return;
  }

  for (UInt32 index = 0;
       index < audioBufferList->mNumberBuffers;
       index++) {
    AudioBuffer *buffer = &audioBufferList->mBuffers[index];

    if (buffer->mData != NULL && buffer->mDataByteSize > 0) {
      memset(buffer->mData, 0, buffer->mDataByteSize);
    }
  }
}

@interface RemoteIOAudioDevice ()

@property(nonatomic, strong, nullable) id routeChangeObserver;

- (BOOL)configureAudioSession;
- (BOOL)ensureAudioSessionForPlayout;
- (BOOL)ensureAudioSessionForRecording;
- (BOOL)createRemoteIOAudioUnit;
- (BOOL)rebuildRemoteIOAudioUnit;
- (void)destroyRemoteIOAudioUnit;
- (void)subscribeToAudioRouteChanges;
- (void)handleAudioRouteChange:(NSNotification *)notification;

- (OSStatus)renderWithActionFlags:
                  (AudioUnitRenderActionFlags *)actionFlags
                            timeStamp:
                  (const AudioTimeStamp *)timeStamp
                            busNumber:
                  (UInt32)busNumber
                           frameCount:
                  (UInt32)frameCount
                           outputData:
                  (AudioBufferList *)outputData;

- (OSStatus)deliverRecordedDataWithActionFlags:
                  (AudioUnitRenderActionFlags *)actionFlags
                                      timeStamp:
                  (const AudioTimeStamp *)timeStamp
                                      busNumber:
                  (UInt32)busNumber
                                     frameCount:
                  (UInt32)frameCount;

@end

@implementation RemoteIOAudioDevice

#pragma mark - Lifecycle

- (instancetype)init {
  self = [super init];

  if (self) {
    _audioUnit = NULL;
    _rtcDelegate = nil;
    _recordRenderBlock = nil;

    _initialized = NO;
    _playoutInitialized = NO;
    _playing = NO;

    _recordingInitialized = NO;
    _recording = NO;
    _audioUnitInputEnabled = NO;

    _ioBufferDuration = kRequestedIOBufferDuration;

    [self subscribeToAudioRouteChanges];

    NSLog(@"[REMOTE_IO] RemoteIOAudioDevice created");
  }

  return self;
}

- (void)dealloc {
  if (_routeChangeObserver != nil) {
    [[NSNotificationCenter defaultCenter]
      removeObserver:_routeChangeObserver];
    _routeChangeObserver = nil;
  }

  [self destroyRemoteIOAudioUnit];
  _rtcDelegate = nil;
}

#pragma mark - RTCAudioDevice parameters

- (double)deviceInputSampleRate {
  return kRemoteIOSampleRate;
}

- (NSTimeInterval)inputIOBufferDuration {
  return _ioBufferDuration;
}

- (NSInteger)inputNumberOfChannels {
  return kRemoteIOChannelCount;
}

- (NSTimeInterval)inputLatency {
  return [AVAudioSession sharedInstance].inputLatency;
}

- (double)deviceOutputSampleRate {
  return kRemoteIOSampleRate;
}

- (NSTimeInterval)outputIOBufferDuration {
  return _ioBufferDuration;
}

- (NSInteger)outputNumberOfChannels {
  return kRemoteIOChannelCount;
}

- (NSTimeInterval)outputLatency {
  return [AVAudioSession sharedInstance].outputLatency;
}

#pragma mark - RTCAudioDevice state

- (BOOL)isInitialized {
  return _initialized;
}

- (BOOL)isPlayoutInitialized {
  return _playoutInitialized;
}

- (BOOL)isPlaying {
  return _playing;
}

- (BOOL)isRecordingInitialized {
  return _recordingInitialized;
}

- (BOOL)isRecording {
  return _recording;
}

#pragma mark - RTCAudioDevice initialization

- (BOOL)initializeWithDelegate:
    (id<RTCAudioDeviceDelegate>)delegate {
  if (_initialized) {
    NSLog(@"[REMOTE_IO] already initialized");
    return YES;
  }

  if (delegate == nil) {
    NSLog(@"[REMOTE_IO] initializeWithDelegate received nil delegate");
    return NO;
  }

  NSLog(@"[REMOTE_IO] initializeWithDelegate");

  _rtcDelegate = delegate;

  NSLog(
    @"[REMOTE_IO] WebRTC preferred output sample rate: %.2f",
    delegate.preferredOutputSampleRate
  );

  NSLog(
    @"[REMOTE_IO] WebRTC preferred output buffer duration: %.6f",
    delegate.preferredOutputIOBufferDuration
  );

  NSLog(
    @"[REMOTE_IO] WebRTC preferred input sample rate: %.2f",
    delegate.preferredInputSampleRate
  );

  NSLog(
    @"[REMOTE_IO] WebRTC preferred input buffer duration: %.6f",
    delegate.preferredInputIOBufferDuration
  );

  _initialized = YES;

  NSLog(@"[REMOTE_IO] initialized; hardware creation deferred");

  return YES;
}

- (BOOL)terminateDevice {
  NSLog(@"[REMOTE_IO] terminateDevice");

  _playing = NO;
  _recording = NO;

  [self destroyRemoteIOAudioUnit];

  _playoutInitialized = NO;
  _recordingInitialized = NO;
  _initialized = NO;

  _rtcDelegate = nil;

  NSError *error = nil;

  BOOL deactivated = [
    [AVAudioSession sharedInstance]
    setActive:NO
    withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation
    error:&error
  ];

  if (!deactivated) {
    NSLog(
      @"[REMOTE_IO] AVAudioSession deactivation failed: %@",
      error
    );
  }

  return YES;
}

#pragma mark - Playout

- (BOOL)initializePlayout {
  NSLog(@"[REMOTE_IO] initializePlayout");

  if (!_initialized) {
    NSLog(
      @"[REMOTE_IO] initializePlayout called before "
       "initializeWithDelegate"
    );

    return NO;
  }

  if (![self ensureAudioSessionForPlayout]) {
    return NO;
  }

  _playoutInitialized = YES;

  if (_audioUnit == NULL && ![self createRemoteIOAudioUnit]) {
    _playoutInitialized = NO;
    return NO;
  }

  return YES;
}

- (BOOL)startPlayout {
  NSLog(@"[REMOTE_IO] startPlayout");

  if (!_initialized) {
    NSLog(@"[REMOTE_IO] cannot start playout: device is not initialized");
    return NO;
  }

  if (!_playoutInitialized) {
    if (![self initializePlayout]) {
      return NO;
    }
  }

  if (_audioUnit == NULL) {
    NSLog(@"[REMOTE_IO] cannot start playout: Audio Unit is nil");
    return NO;
  }

  if (_playing) {
    return YES;
  }

  /*
   * If recording is already active, the shared RemoteIO Audio Unit is
   * already running. Do not start it a second time.
   */
  BOOL recordingWasAlreadyRunning = _recording;

  _playing = YES;

  if (recordingWasAlreadyRunning) {
    NSLog(
      @"[REMOTE_IO] playout enabled while recording Audio Unit "
       "is already running"
    );

    return YES;
  }

  OSStatus status = AudioOutputUnitStart(_audioUnit);

  if (!CheckOSStatus(status, @"AudioOutputUnitStart for playout")) {
    _playing = NO;
    return NO;
  }

  NSLog(@"[REMOTE_IO] playout started using RemoteIO");

  return YES;
}

- (BOOL)stopPlayout {
  NSLog(@"[REMOTE_IO] stopPlayout");

  if (!_playing) {
    return YES;
  }

  _playing = NO;

  /*
   * Recording and playout share the same RemoteIO Audio Unit.
   * Keep it running while the microphone is still active.
   */
  if (_recording) {
    NSLog(
      @"[REMOTE_IO] playout stopped; Audio Unit remains running "
       "for recording"
    );

    return YES;
  }

  if (_audioUnit == NULL) {
    return YES;
  }

  OSStatus status = AudioOutputUnitStop(_audioUnit);

  return CheckOSStatus(
    status,
    @"AudioOutputUnitStop after playout"
  );
}

#pragma mark - Recording

- (BOOL)initializeRecording {
  NSLog(@"[REMOTE_IO] initializeRecording");

  if (!_initialized) {
    NSLog(
      @"[REMOTE_IO] initializeRecording called before "
       "initializeWithDelegate"
    );

    return NO;
  }

  if (![self ensureAudioSessionForRecording]) {
    return NO;
  }

  BOOL wasRecordingInitialized = _recordingInitialized;
  _recordingInitialized = YES;

  BOOL audioUnitReady =
      _audioUnit == NULL
        ? [self createRemoteIOAudioUnit]
        : (_audioUnitInputEnabled || [self rebuildRemoteIOAudioUnit]);

  if (!audioUnitReady) {
    _recordingInitialized = wasRecordingInitialized;
    return NO;
  }

  NSLog(@"[REMOTE_IO] recording initialized");

  return YES;
}

- (BOOL)startRecording {
  NSLog(@"[REMOTE_IO] startRecording");

  if (!_initialized) {
    NSLog(@"[REMOTE_IO] cannot record: device is not initialized");
    return NO;
  }

  if (!_recordingInitialized) {
    if (![self initializeRecording]) {
      return NO;
    }
  }

  if (_audioUnit == NULL) {
    NSLog(@"[REMOTE_IO] cannot record: Audio Unit is nil");
    return NO;
  }

  if (_recording) {
    return YES;
  }

  /*
   * If playout is already active, the shared RemoteIO Audio Unit is
   * already running.
   */
  BOOL playoutWasAlreadyRunning = _playing;

  _recording = YES;

  if (playoutWasAlreadyRunning) {
    NSLog(
      @"[REMOTE_IO] recording enabled while playout Audio Unit "
       "is already running"
    );

    return YES;
  }

  OSStatus status = AudioOutputUnitStart(_audioUnit);

  if (!CheckOSStatus(status, @"AudioOutputUnitStart for recording")) {
    _recording = NO;
    return NO;
  }

  NSLog(@"[REMOTE_IO] recording started using RemoteIO");

  return YES;
}

- (BOOL)stopRecording {
  NSLog(@"[REMOTE_IO] stopRecording");

  if (!_recording) {
    return YES;
  }

  _recording = NO;

  /*
   * Do not stop the shared Audio Unit while remote playout is active.
   */
  if (_playing) {
    NSLog(
      @"[REMOTE_IO] recording stopped; Audio Unit remains running "
       "for playout"
    );

    return YES;
  }

  if (_audioUnit == NULL) {
    return YES;
  }

  OSStatus status = AudioOutputUnitStop(_audioUnit);

  return CheckOSStatus(
    status,
    @"AudioOutputUnitStop after recording"
  );
}

#pragma mark - Audio route changes

- (void)subscribeToAudioRouteChanges {
  __weak RemoteIOAudioDevice *weakSelf = self;

  _routeChangeObserver = [
    [NSNotificationCenter defaultCenter]
    addObserverForName:AVAudioSessionRouteChangeNotification
    object:nil
    queue:[NSOperationQueue mainQueue]
    usingBlock:^(NSNotification *notification) {
      [weakSelf handleAudioRouteChange:notification];
    }
  ];
}

- (void)handleAudioRouteChange:(NSNotification *)notification {
  NSNumber *reasonValue =
      notification.userInfo[AVAudioSessionRouteChangeReasonKey];

  AVAudioSessionRouteChangeReason reason =
      (AVAudioSessionRouteChangeReason)reasonValue.unsignedIntegerValue;

  BOOL affectsHardware =
      reason == AVAudioSessionRouteChangeReasonNewDeviceAvailable ||
      reason == AVAudioSessionRouteChangeReasonOldDeviceUnavailable ||
      reason == AVAudioSessionRouteChangeReasonRouteConfigurationChange ||
      reason == AVAudioSessionRouteChangeReasonNoSuitableRouteForCategory;

  if (!affectsHardware) {
    return;
  }

  AVAudioSessionRouteDescription *previousRoute =
      notification.userInfo[AVAudioSessionRouteChangePreviousRouteKey];

  NSLog(
    @"[REMOTE_IO] route change reason=%lu previous=%@ current=%@",
    (unsigned long)reason,
    previousRoute,
    [AVAudioSession sharedInstance].currentRoute
  );

  id<RTCAudioDeviceDelegate> delegate = _rtcDelegate;

  if (delegate == nil) {
    return;
  }

  [delegate dispatchAsync:^{
    if (!self->_initialized || self->_rtcDelegate == nil) {
      return;
    }

    AVAudioSession *session = [AVAudioSession sharedInstance];

    self->_ioBufferDuration =
        session.IOBufferDuration > 0
          ? session.IOBufferDuration
          : kRequestedIOBufferDuration;

    [self->_rtcDelegate notifyAudioInputParametersChange];
    [self->_rtcDelegate notifyAudioOutputParametersChange];

    NSLog(
      @"[REMOTE_IO] synchronized route parameters: "
       "sampleRate=%.2f bufferDuration=%.6f inputLatency=%.6f "
       "outputLatency=%.6f",
      session.sampleRate,
      self->_ioBufferDuration,
      session.inputLatency,
      session.outputLatency
    );
  }];
}


#pragma mark - AVAudioSession

- (BOOL)ensureAudioSessionForPlayout {
  AVAudioSession *session = [AVAudioSession sharedInstance];
  BOOL hasSupportedCategory =
      [session.category isEqualToString:AVAudioSessionCategoryPlayback] ||
      [session.category
        isEqualToString:AVAudioSessionCategoryPlayAndRecord];

  if (!hasSupportedCategory) {
    return [self configureAudioSession];
  }

  NSError *error = nil;

  if (![session setActive:YES error:&error]) {
    NSLog(
      @"[REMOTE_IO] activating playout session failed: %@",
      error
    );
    return NO;
  }

  _ioBufferDuration =
      session.IOBufferDuration > 0
        ? session.IOBufferDuration
        : kRequestedIOBufferDuration;

  return YES;
}

- (BOOL)ensureAudioSessionForRecording {
  AVAudioSession *session = [AVAudioSession sharedInstance];
  AVAudioSessionCategoryOptions requiredOptions =
      AVAudioSessionCategoryOptionDefaultToSpeaker |
      AVAudioSessionCategoryOptionAllowBluetoothHFP |
      AVAudioSessionCategoryOptionAllowBluetoothA2DP;

  BOOL hasRecordingConfiguration =
      [session.category
        isEqualToString:AVAudioSessionCategoryPlayAndRecord] &&
      (session.categoryOptions & requiredOptions) == requiredOptions;

  if (!hasRecordingConfiguration) {
    return [self configureAudioSession];
  }

  NSError *error = nil;

  if (![session setActive:YES error:&error]) {
    NSLog(
      @"[REMOTE_IO] activating recording session failed: %@",
      error
    );
    return NO;
  }

  _ioBufferDuration =
      session.IOBufferDuration > 0
        ? session.IOBufferDuration
        : kRequestedIOBufferDuration;

  return YES;
}


- (BOOL)configureAudioSession {
  AVAudioSession *session = [AVAudioSession sharedInstance];
  NSError *error = nil;

  AVAudioSessionCategoryOptions options =
      AVAudioSessionCategoryOptionDefaultToSpeaker |
      AVAudioSessionCategoryOptionAllowBluetoothHFP |
      AVAudioSessionCategoryOptionAllowBluetoothA2DP;

  BOOL categorySet = [
    session
    setCategory:AVAudioSessionCategoryPlayAndRecord
    mode:AVAudioSessionModeDefault
    options:options
    error:&error
  ];

  if (!categorySet) {
    NSLog(
      @"[REMOTE_IO] setCategory failed: %@",
      error
    );

    return NO;
  }

  error = nil;

  BOOL routeOverrideCleared = [
    session
    overrideOutputAudioPort:AVAudioSessionPortOverrideNone
    error:&error
  ];

  if (!routeOverrideCleared) {
    NSLog(
      @"[REMOTE_IO] clearing output override failed: %@",
      error
    );

    return NO;
  }

  error = nil;

  BOOL sampleRateSet = [
    session
    setPreferredSampleRate:kRemoteIOSampleRate
    error:&error
  ];

  if (!sampleRateSet) {
    NSLog(
      @"[REMOTE_IO] setPreferredSampleRate failed: %@",
      error
    );

    return NO;
  }

  error = nil;

  BOOL bufferDurationSet = [
    session
    setPreferredIOBufferDuration:kRequestedIOBufferDuration
    error:&error
  ];

  if (!bufferDurationSet) {
    NSLog(
      @"[REMOTE_IO] setPreferredIOBufferDuration failed: %@",
      error
    );

    return NO;
  }

  error = nil;

  BOOL active = [
    session
    setActive:YES
    error:&error
  ];

  if (!active) {
    NSLog(
      @"[REMOTE_IO] setActive failed: %@",
      error
    );

    return NO;
  }

  if (session.IOBufferDuration > 0) {
    _ioBufferDuration = session.IOBufferDuration;
  } else {
    _ioBufferDuration = kRequestedIOBufferDuration;
  }

  NSLog(@"[REMOTE_IO] AVAudioSession configured");
  NSLog(@"[REMOTE_IO] category: %@", session.category);
  NSLog(@"[REMOTE_IO] mode: %@", session.mode);
  NSLog(@"[REMOTE_IO] actual sample rate: %.2f", session.sampleRate);

  NSLog(
    @"[REMOTE_IO] actual IO buffer duration: %.6f",
    session.IOBufferDuration
  );

  NSLog(
    @"[REMOTE_IO] output channels: %ld",
    (long)session.outputNumberOfChannels
  );

  NSLog(
    @"[REMOTE_IO] maximum output channels: %ld",
    (long)session.maximumOutputNumberOfChannels
  );

  NSLog(
    @"[REMOTE_IO] output latency: %.6f",
    session.outputLatency
  );

  NSLog(
    @"[REMOTE_IO] current route: %@",
    session.currentRoute
  );

  return YES;
}

#pragma mark - RemoteIO Audio Unit

- (BOOL)createRemoteIOAudioUnit {
  if (_audioUnit != NULL) {
    return YES;
  }

  AudioComponentDescription description;
  memset(&description, 0, sizeof(description));

  description.componentType = kAudioUnitType_Output;
  description.componentSubType = kAudioUnitSubType_RemoteIO;
  description.componentManufacturer = kAudioUnitManufacturer_Apple;
  description.componentFlags = 0;
  description.componentFlagsMask = 0;

  AudioComponent component = AudioComponentFindNext(
    NULL,
    &description
  );

  if (component == NULL) {
    NSLog(@"[REMOTE_IO] AudioComponentFindNext returned NULL");
    return NO;
  }

  OSStatus status = AudioComponentInstanceNew(
    component,
    &_audioUnit
  );

  if (!CheckOSStatus(status, @"AudioComponentInstanceNew")) {
    _audioUnit = NULL;
    return NO;
  }

  NSLog(
    @"[REMOTE_IO] Audio Unit created with subtype "
     "kAudioUnitSubType_RemoteIO"
  );

  /*
   * Enable speaker/output I/O on output bus 0.
   */
  UInt32 enableOutput = 1;

  status = AudioUnitSetProperty(
    _audioUnit,
    kAudioOutputUnitProperty_EnableIO,
    kAudioUnitScope_Output,
    0,
    &enableOutput,
    sizeof(enableOutput)
  );

  if (!CheckOSStatus(status, @"enable RemoteIO output")) {
    [self destroyRemoteIOAudioUnit];
    return NO;
  }

  BOOL sessionSupportsInput = [
    [AVAudioSession sharedInstance].category
    isEqualToString:AVAudioSessionCategoryPlayAndRecord
  ];

  UInt32 enableInput =
      sessionSupportsInput && (_recordingInitialized || _recording)
        ? 1
        : 0;

  status = AudioUnitSetProperty(
    _audioUnit,
    kAudioOutputUnitProperty_EnableIO,
    kAudioUnitScope_Input,
    1,
    &enableInput,
    sizeof(enableInput)
  );

  if (!CheckOSStatus(status, @"enable RemoteIO input")) {
    [self destroyRemoteIOAudioUnit];
    return NO;
  }

  _audioUnitInputEnabled = enableInput != 0;

  NSLog(
    @"[REMOTE_IO] microphone input bus %@",
    _audioUnitInputEnabled ? @"enabled" : @"disabled"
  );

  /*
   * WebRTC's Objective-C audio-device adapter exchanges signed
   * 16-bit interleaved PCM.
   */
  AudioStreamBasicDescription format;
  memset(&format, 0, sizeof(format));

  format.mSampleRate = kRemoteIOSampleRate;
  format.mFormatID = kAudioFormatLinearPCM;

  format.mFormatFlags =
      kAudioFormatFlagIsSignedInteger |
      kAudioFormatFlagIsPacked |
      kAudioFormatFlagsNativeEndian;

  format.mFramesPerPacket = 1;
  format.mChannelsPerFrame = kRemoteIOChannelCount;
  format.mBitsPerChannel = 16;

  format.mBytesPerFrame =
      kRemoteIOBytesPerSample * kRemoteIOChannelCount;

  format.mBytesPerPacket =
      format.mBytesPerFrame * format.mFramesPerPacket;

  /*
   * For output bus 0, the application supplies audio to the input
   * scope of the output element.
   */
  status = AudioUnitSetProperty(
    _audioUnit,
    kAudioUnitProperty_StreamFormat,
    kAudioUnitScope_Input,
    0,
    &format,
    sizeof(format)
  );

  if (!CheckOSStatus(status, @"set RemoteIO output stream format")) {
    [self destroyRemoteIOAudioUnit];
    return NO;
  }
  if (_audioUnitInputEnabled) {
    /*
     * For input bus 1, the Audio Unit supplies microphone audio through
     * the output scope of the input element.
     */
    status = AudioUnitSetProperty(
      _audioUnit,
      kAudioUnitProperty_StreamFormat,
      kAudioUnitScope_Output,
      1,
      &format,
      sizeof(format)
    );

    if (!CheckOSStatus(status, @"set RemoteIO input stream format")) {
      [self destroyRemoteIOAudioUnit];
      return NO;
    }

    NSLog(
      @"[REMOTE_IO] microphone format set to %.2f Hz, %u channel(s)",
      format.mSampleRate,
      (unsigned int)format.mChannelsPerFrame
    );
  }

  /*
   * Allow Core Audio to request larger slices if the route needs them.
   */
  UInt32 maximumFramesPerSlice = 4096;

  status = AudioUnitSetProperty(
    _audioUnit,
    kAudioUnitProperty_MaximumFramesPerSlice,
    kAudioUnitScope_Global,
    0,
    &maximumFramesPerSlice,
    sizeof(maximumFramesPerSlice)
  );

  if (status != noErr) {
    /*
     * This property is useful but not essential on every route.
     */
    NSLog(
      @"[REMOTE_IO] setting MaximumFramesPerSlice returned "
       "OSStatus=%d; continuing",
      (int)status
    );
  }

  AURenderCallbackStruct callback;
  memset(&callback, 0, sizeof(callback));

  callback.inputProc = RemoteIORenderCallback;
  callback.inputProcRefCon = (__bridge void *)self;

  status = AudioUnitSetProperty(
    _audioUnit,
    kAudioUnitProperty_SetRenderCallback,
    kAudioUnitScope_Input,
    0,
    &callback,
    sizeof(callback)
  );

  if (!CheckOSStatus(status, @"install RemoteIO render callback")) {
    [self destroyRemoteIOAudioUnit];
    return NO;
  }

  if (_audioUnitInputEnabled) {
    /*
     * WebRTC supplies the AudioBufferList when it requests recorded data,
     * so RemoteIO itself does not need to allocate a microphone buffer.
     */
    UInt32 shouldAllocateInputBuffer = 0;

    status = AudioUnitSetProperty(
      _audioUnit,
      kAudioUnitProperty_ShouldAllocateBuffer,
      kAudioUnitScope_Output,
      1,
      &shouldAllocateInputBuffer,
      sizeof(shouldAllocateInputBuffer)
    );

    if (!CheckOSStatus(
          status,
          @"disable RemoteIO microphone buffer allocation"
        )) {
      [self destroyRemoteIOAudioUnit];
      return NO;
    }

    /*
     * WebRTC calls this block with an AudioBufferList. AudioUnitRender
     * fills that list with microphone PCM from RemoteIO bus 1.
     */
    AudioUnit recordingAudioUnit = _audioUnit;

    _recordRenderBlock = [
      ^OSStatus(
          AudioUnitRenderActionFlags *renderActionFlags,
          const AudioTimeStamp *renderTimeStamp,
          NSInteger renderBusNumber,
          UInt32 renderFrameCount,
          AudioBufferList *inputData,
          void *renderContext
      ) {
        return AudioUnitRender(
          recordingAudioUnit,
          renderActionFlags,
          renderTimeStamp,
          (UInt32)renderBusNumber,
          renderFrameCount,
          inputData
        );
      }
      copy
    ];

    AURenderCallbackStruct recordingCallback;
    memset(&recordingCallback, 0, sizeof(recordingCallback));

    recordingCallback.inputProc = RemoteIORecordingCallback;
    recordingCallback.inputProcRefCon = (__bridge void *)self;

    status = AudioUnitSetProperty(
      _audioUnit,
      kAudioOutputUnitProperty_SetInputCallback,
      kAudioUnitScope_Global,
      1,
      &recordingCallback,
      sizeof(recordingCallback)
    );

    if (!CheckOSStatus(status, @"install RemoteIO input callback")) {
      [self destroyRemoteIOAudioUnit];
      return NO;
    }

    NSLog(@"[REMOTE_IO] microphone input callback installed");
  }

  status = AudioUnitInitialize(_audioUnit);

  if (!CheckOSStatus(status, @"AudioUnitInitialize")) {
    [self destroyRemoteIOAudioUnit];
    return NO;
  }

  AudioStreamBasicDescription confirmedFormat;
  memset(&confirmedFormat, 0, sizeof(confirmedFormat));

  UInt32 confirmedFormatSize = sizeof(confirmedFormat);

  status = AudioUnitGetProperty(
    _audioUnit,
    kAudioUnitProperty_StreamFormat,
    kAudioUnitScope_Input,
    0,
    &confirmedFormat,
    &confirmedFormatSize
  );

  if (status == noErr) {
    NSLog(
      @"[REMOTE_IO] confirmed app-side format: "
       "%.2f Hz, %u channel(s), %u-bit",
      confirmedFormat.mSampleRate,
      (unsigned int)confirmedFormat.mChannelsPerFrame,
      (unsigned int)confirmedFormat.mBitsPerChannel
    );
  } else {
    NSLog(
      @"[REMOTE_IO] could not read confirmed format, "
       "OSStatus=%d",
      (int)status
    );
  }

  NSLog(@"[REMOTE_IO] RemoteIO Audio Unit initialized");

  return YES;
}

- (BOOL)rebuildRemoteIOAudioUnit {
  BOOL shouldRestart = _playing || _recording;

  if (_rtcDelegate != nil) {
    if (_playing) {
      [_rtcDelegate notifyAudioOutputInterrupted];
    }
    if (_recording) {
      [_rtcDelegate notifyAudioInputInterrupted];
    }
  }

  [self destroyRemoteIOAudioUnit];

  if (![self createRemoteIOAudioUnit]) {
    _playing = NO;
    _recording = NO;
    return NO;
  }

  if (!shouldRestart) {
    return YES;
  }

  OSStatus status = AudioOutputUnitStart(_audioUnit);

  if (!CheckOSStatus(status, @"restart RemoteIO after configuration change")) {
    _playing = NO;
    _recording = NO;
    return NO;
  }

  return YES;
}


- (void)destroyRemoteIOAudioUnit {
  _recordRenderBlock = nil;
  _audioUnitInputEnabled = NO;

  if (_audioUnit == NULL) {
    return;
  }

  AudioOutputUnitStop(_audioUnit);
  AudioUnitUninitialize(_audioUnit);
  AudioComponentInstanceDispose(_audioUnit);

  _audioUnit = NULL;

  NSLog(@"[REMOTE_IO] RemoteIO Audio Unit destroyed");
}

#pragma mark - Audio render callback

- (OSStatus)renderWithActionFlags:
                  (AudioUnitRenderActionFlags *)actionFlags
                            timeStamp:
                  (const AudioTimeStamp *)timeStamp
                            busNumber:
                  (UInt32)busNumber
                           frameCount:
                  (UInt32)frameCount
                           outputData:
                  (AudioBufferList *)outputData {
  /*
   * Do not NSLog from here. This method runs on Core Audio's
   * real-time render thread.
   */
  if (!_playing || _rtcDelegate == nil) {
    FillAudioBufferListWithSilence(outputData);

    if (actionFlags != NULL) {
      *actionFlags |= kAudioUnitRenderAction_OutputIsSilence;
    }

    return noErr;
  }

  RTCAudioDeviceGetPlayoutDataBlock getPlayoutData =
      _rtcDelegate.getPlayoutData;

  if (getPlayoutData == nil) {
    FillAudioBufferListWithSilence(outputData);

    if (actionFlags != NULL) {
      *actionFlags |= kAudioUnitRenderAction_OutputIsSilence;
    }

    return noErr;
  }

  /*
   * Ask WebRTC's native audio-device adapter to fill the supplied
   * AudioBufferList with decoded signed 16-bit PCM.
   */
  return getPlayoutData(
    actionFlags,
    timeStamp,
    busNumber,
    frameCount,
    outputData
  );
}

#pragma mark - Audio recording callback

- (OSStatus)deliverRecordedDataWithActionFlags:
                  (AudioUnitRenderActionFlags *)actionFlags
                                      timeStamp:
                  (const AudioTimeStamp *)timeStamp
                                      busNumber:
                  (UInt32)busNumber
                                     frameCount:
                  (UInt32)frameCount {
  /*
   * Never NSLog here. This runs on Core Audio's real-time I/O thread.
   */
  if (!_recording ||
      _rtcDelegate == nil ||
      _audioUnit == NULL ||
      _recordRenderBlock == nil) {
    return noErr;
  }

  RTCAudioDeviceDeliverRecordedDataBlock deliverRecordedData =
      _rtcDelegate.deliverRecordedData;

  if (deliverRecordedData == nil) {
    return noErr;
  }

  /*
   * Pass nil inputData so WebRTC supplies the destination
   * AudioBufferList and invokes _recordRenderBlock.
   */
  return deliverRecordedData(
    actionFlags,
    timeStamp,
    (NSInteger)busNumber,
    frameCount,
    NULL,
    NULL,
    _recordRenderBlock
  );
}

@end

static OSStatus RemoteIORenderCallback(
    void *inRefCon,
    AudioUnitRenderActionFlags *ioActionFlags,
    const AudioTimeStamp *inTimeStamp,
    UInt32 inBusNumber,
    UInt32 inNumberFrames,
    AudioBufferList *ioData
) {
  RemoteIOAudioDevice *device =
      (__bridge RemoteIOAudioDevice *)inRefCon;

  if (device == nil) {
    FillAudioBufferListWithSilence(ioData);

    if (ioActionFlags != NULL) {
      *ioActionFlags |= kAudioUnitRenderAction_OutputIsSilence;
    }

    return noErr;
  }

  return [
    device
    renderWithActionFlags:ioActionFlags
    timeStamp:inTimeStamp
    busNumber:inBusNumber
    frameCount:inNumberFrames
    outputData:ioData
  ];
}

static OSStatus RemoteIORecordingCallback(
    void *inRefCon,
    AudioUnitRenderActionFlags *ioActionFlags,
    const AudioTimeStamp *inTimeStamp,
    UInt32 inBusNumber,
    UInt32 inNumberFrames,
    AudioBufferList *ioData
) {
  RemoteIOAudioDevice *device =
      (__bridge RemoteIOAudioDevice *)inRefCon;

  if (device == nil) {
    return noErr;
  }

  return [
    device
    deliverRecordedDataWithActionFlags:ioActionFlags
    timeStamp:inTimeStamp
    busNumber:inBusNumber
    frameCount:inNumberFrames
  ];
}
