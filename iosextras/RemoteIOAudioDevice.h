#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioToolbox.h>
#import <WebRTC/RTCAudioDevice.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Full-duplex WebRTC audio device using Apple's RemoteIO Audio Unit.
 *
 * This avoids VoiceProcessingIO while supporting:
 * - Remote WebRTC playout
 * - Local microphone recording
 * - 48 kHz, mono, signed 16-bit PCM
 */
@interface RemoteIOAudioDevice : NSObject <RTCAudioDevice> {
@private
  AudioUnit _audioUnit;

  __strong id<RTCAudioDeviceDelegate> _rtcDelegate;
  RTCAudioDeviceRenderRecordedDataBlock _recordRenderBlock;
  volatile BOOL _initialized;
  volatile BOOL _playoutInitialized;
  volatile BOOL _playing;

  volatile BOOL _recordingInitialized;
  volatile BOOL _recording;
  volatile BOOL _audioUnitInputEnabled;

  NSTimeInterval _ioBufferDuration;
}

@end

NS_ASSUME_NONNULL_END
