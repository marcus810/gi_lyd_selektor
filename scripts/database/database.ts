import { TemplateInfo, InputInfo, IntercomInfo, TemplateProfilePayload, FloorPlanInfo, FloorPlanMarker } from "../types"; // Adjust the import path if necessary
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { PermissionsAndroid, Platform, NativeModules, AppState } from 'react-native';
import { startAudioStatsMonitor } from "./statsaudiomonitor";

const { AudioModeModule, CallKitModule } = NativeModules as {
  AudioModeModule: AudioModeModuleType;
  CallKitModule: CallKitModuleType;
};

// --- Type-safe NativeModule interface ---
type AudioModeModuleType = {
  setPlayback?: () => Promise<void>;
  setPlayAndRecordVoiceChat?: () => Promise<void>;
  deactivate?: () => Promise<void>;
  debugAudioSession?: () => Promise<any>;
};
type CallKitModuleType = {
  startCall?: (handle: string) => Promise<string | null>; // returns UUID string (or null)
  endCall?: () => Promise<void>;
};
type PlayerState = {
  id: number
  active_ports: number[]
  isSlave?: boolean
  slaveColor?: string | null
}

import {
    mediaDevices,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    MediaStream,
    MediaStreamTrack as RNMediaStreamTrack
  } from 'react-native-webrtc';  
import RTCIceCandidateEvent from "react-native-webrtc/lib/typescript/RTCIceCandidateEvent";
import { template } from "@babel/core";


type Role = 'selector' | 'listener' | 'unknown';

const toBackendBoolean = (value: any): boolean =>
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true";

const normalizeFloorPlanMarker = (marker: any): FloorPlanMarker | null => {
  const type = marker?.type === "output" ? "output" : marker?.type === "input" ? "input" : null;
  const id = Number(marker?.id);
  const port = Number(marker?.port);
  const x = Number(marker?.x);
  const y = Number(marker?.y);

  if (!type || !Number.isFinite(id) || id <= 0 || !Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    id: Math.round(id),
    type,
    port: Math.round(port),
    x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5,
    y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : 0.5,
    label: String(marker?.label ?? ""),
  };
};

const normalizeFloorPlan = (floorPlan: any): FloorPlanInfo => ({
  image: String(floorPlan?.image ?? ""),
  imageName: String(floorPlan?.imageName ?? ""),
  imageWidth: Math.max(0, Math.round(Number(floorPlan?.imageWidth) || 0)),
  imageHeight: Math.max(0, Math.round(Number(floorPlan?.imageHeight) || 0)),
  markers: Array.isArray(floorPlan?.markers)
    ? floorPlan.markers
        .map(normalizeFloorPlanMarker)
        .filter((marker: FloorPlanMarker | null): marker is FloorPlanMarker => marker !== null)
    : [],
});

const SOCKET_HEARTBEAT_INTERVAL_MS = 5_000;
const SOCKET_WATCHDOG_INTERVAL_MS = 2_500;
const SOCKET_STALE_AFTER_MS = 15_000;
const SOCKET_CONNECT_TIMEOUT_MS = 10_000;
const SOCKET_RECONNECT_DELAYS_MS = [300, 900, 1_800] as const;

const monotonicNow = (): number => {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }

  return Date.now();
};

export class DatabaseHandler {
    private static instance: DatabaseHandler;
    private socket: WebSocket | null = null;
    private onDisconnect: (() => void) | null = null;
    private _isHardDisconnecting = false;
    // add these as class members:
    private pc: RTCPeerConnection | null = null;

    public remoteStream: MediaStream | null = null;
    public api_url: string;
    public uuid: string | null
    public templateInfo: TemplateInfo | null
    public inputInfoListSetter: React.Dispatch<React.SetStateAction<InputInfo[]>> | null
    public intercomInfoListSetter: React.Dispatch<React.SetStateAction<IntercomInfo[]>> | null
    public chosenTemplateSetter: React.Dispatch<React.SetStateAction<TemplateInfo | undefined>> | null
    public intercomOmniListSetter: React.Dispatch<React.SetStateAction<IntercomInfo[]>> | null
    public intercomGroupListSetter: React.Dispatch<React.SetStateAction<IntercomInfo[]>> | null
    public floorPlanSetter: React.Dispatch<React.SetStateAction<FloorPlanInfo>> | null
    public toggleIntercoms: ((activatedIntercoms: IntercomInfo[]) => void | null) | undefined
    public toggleInputs: ((activatedInputs: InputInfo[]) => void | undefined) | undefined
    public timecodeSetter: ((newTimecode: string) => void) | null
    private _callKitActive = false;
    public remoteAudioTrack: RNMediaStreamTrack | null = null;
    public isMuted: boolean = true
    private _isDisconnected: boolean = false;
    private readonly _skipLocalMicForAudioTest = false;

    
    private _lastOutputLevels: Map<number, number> = new Map();               // port -> 0..1
    private _audioListeners: Map<number, Set<(lvl:number)=>void>> = new Map();
    private _globalAudioListeners: Set<(lvl:number)=>void> = new Set();
    private _outputPortOrder: number[] | null = null;                        // optional map for index->port when server sends plain arrays
    private _metersSubscribed = false;                                       // whether we asked server to send meters


    private localStream: any | null = null;          // MediaStream for local mic
    private localAudioSender: any | null = null;     // RTCRtpSender returned by addTrack/remove later

    // role management
    private currentRole: 'selector' | 'listener' | 'unknown' = 'unknown';
    private roleListeners: Array<(role: 'selector' | 'listener' | 'unknown') => void> = [];

    private _playersMap: Map<number, PlayerState> = new Map();

    private _playersListeners: Set<(players: PlayerState[]) => void> = new Set();
    private _latestTimecode = "No timecode";
    private _latestTimecodeSequence: number | null = null;
    private _lastLtcReceivedAt = 0;
    private _lastLtcRenderedSequence: number | null = null;
    private _lastLtcRenderedAt = 0;
    private _timecodeListeners: Set<(
      newTimecode: string,
      sequence: number | null
    ) => void> = new Set();
    private _heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private _watchdogInterval: ReturnType<typeof setInterval> | null = null;
    private _connectTimeout: ReturnType<typeof setTimeout> | null = null;
    private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private _socketAppStateSubscription: ReturnType<
      typeof AppState.addEventListener
    > | null = null;
    private _lastSocketMessageAt = 0;
    private _lastPongAt = 0;
    private _lastLtcLagWarningAt = 0;
    private _healthWasSuspended = false;
    private _automaticReconnectAttempts = 0;
    private _lastJoinedTemplate: TemplateInfo | null = null;
    private _lastListenerTemplate: TemplateInfo | null = null;
    private _metersCount = 0;
    private _metersLogAt = 0;




    // Private constructor to prevent direct instantiation
    private constructor() {
      this.api_url = ""; // Set a default URL
      this.uuid = null
      this.templateInfo = null
      this.intercomInfoListSetter = null
      this.inputInfoListSetter = null
      this.chosenTemplateSetter = null
      this.intercomOmniListSetter = null
      this.intercomGroupListSetter = null
      this.floorPlanSetter = null
      this.remoteStream = null
      this.timecodeSetter = null
      this.localStream = null
      this.localAudioSender = null;
      this.requestMicrophonePermission()
      //this.checkDeviceAndMaybeStartAudio()
    }


    
    public isDisconnected(): boolean {
      const wasDisconnected = this._isDisconnected;
      this._isDisconnected = false;
      return wasDisconnected;
    }
  
    // Public static method to get the instance of the class
    public static getInstance(): DatabaseHandler {
      if (!DatabaseHandler.instance) {
        DatabaseHandler.instance = new DatabaseHandler();
      }
      return DatabaseHandler.instance;
    }
    // Register the disconnection handler
    public onSocketDisconnect(callback: () => void): () => void {
      this.onDisconnect = callback;

      return () => {
        if (this.onDisconnect === callback) {
          this.onDisconnect = null;
        }
      };
    }


  // role management
  public setRole(role: 'selector' | 'listener' | 'unknown') {
    if (this.currentRole === role) return;
    this.currentRole = role;
    try {
      this.roleListeners.forEach(cb => { try { cb(role); } catch (_) {} });
    } catch (e) {
      console.warn('role listener invocation error', e);
    }
  }

private stopSocketHealthMonitoring(): void {
  if (this._heartbeatInterval !== null) {
    clearInterval(this._heartbeatInterval);
    this._heartbeatInterval = null;
  }
  if (this._watchdogInterval !== null) {
    clearInterval(this._watchdogInterval);
    this._watchdogInterval = null;
  }
  if (this._connectTimeout !== null) {
    clearTimeout(this._connectTimeout);
    this._connectTimeout = null;
  }
  if (this._socketAppStateSubscription !== null) {
    this._socketAppStateSubscription.remove();
    this._socketAppStateSubscription = null;
  }
}

private hasAutomaticReconnectTarget(): boolean {
  if (this.currentRole === "selector") {
    return this._lastJoinedTemplate !== null;
  }
  if (this.currentRole === "listener") {
    return this._lastListenerTemplate !== null;
  }
  return false;
}

private sendHeartbeat(socket: WebSocket): void {
  if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) return;
  if (AppState.currentState !== "active") return;

  try {
    socket.send(JSON.stringify({
      action: "ping",
      pingId: monotonicNow(),
      client: "mobile",
      lastLtcReceivedSequence: this._latestTimecodeSequence,
      lastLtcRenderedSequence: this._lastLtcRenderedSequence,
    }));
  } catch (error) {
    console.warn("[WS_HEALTH] heartbeat send failed", error);
    this.handleSocketFailure("Heartbeat send failed", socket);
  }
}

private startSocketHealthMonitoring(socket: WebSocket): void {
  this.stopSocketHealthMonitoring();

  const now = monotonicNow();
  this._lastSocketMessageAt = now;
  this._lastPongAt = now;
  this._healthWasSuspended = AppState.currentState !== "active";

  this._socketAppStateSubscription = AppState.addEventListener(
    "change",
    (nextState) => {
      if (this.socket !== socket) return;

      if (nextState !== "active") {
        this._healthWasSuspended = true;
        return;
      }

      const resumedAt = monotonicNow();
      this._healthWasSuspended = false;
      this._lastSocketMessageAt = resumedAt;
      this._lastPongAt = resumedAt;
      this.sendHeartbeat(socket);
    }
  );

  this.sendHeartbeat(socket);

  this._heartbeatInterval = setInterval(() => {
    this.sendHeartbeat(socket);
  }, SOCKET_HEARTBEAT_INTERVAL_MS);

  this._watchdogInterval = setInterval(() => {
    if (this.socket !== socket) return;

    if (
      socket.readyState === WebSocket.CLOSING ||
      socket.readyState === WebSocket.CLOSED
    ) {
      this.handleSocketFailure("Socket stopped before close event", socket);
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) return;

    if (AppState.currentState !== "active") {
      this._healthWasSuspended = true;
      return;
    }

    const checkedAt = monotonicNow();
    if (this._healthWasSuspended) {
      this._healthWasSuspended = false;
      this._lastSocketMessageAt = checkedAt;
      this._lastPongAt = checkedAt;
      this.sendHeartbeat(socket);
      return;
    }

    const lastHealthyAt = Math.max(
      this._lastSocketMessageAt,
      this._lastPongAt
    );
    if (checkedAt - lastHealthyAt <= SOCKET_STALE_AFTER_MS) return;

    console.warn("[WS_HEALTH] socket stopped delivering messages", {
      staleForMs: Math.round(checkedAt - lastHealthyAt),
      lastLtcReceivedSequence: this._latestTimecodeSequence,
      lastLtcRenderedSequence: this._lastLtcRenderedSequence,
    });
    this.handleSocketFailure("Socket heartbeat timed out", socket);
  }, SOCKET_WATCHDOG_INTERVAL_MS);
}

private notifyDisconnectFailure(): void {
  this.stopSocketHealthMonitoring();
  if (this._reconnectTimer !== null) {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
  }

  this._automaticReconnectAttempts = 0;
  this._isDisconnected = true;
  const callback = this.onDisconnect;
  this.onDisconnect = null;
  if (callback) callback();
}

private scheduleAutomaticReconnect(reason: string): void {
  if (this._reconnectTimer !== null) return;
  if (!this.hasAutomaticReconnectTarget()) {
    this.notifyDisconnectFailure();
    return;
  }

  const attemptIndex = this._automaticReconnectAttempts;
  if (attemptIndex >= SOCKET_RECONNECT_DELAYS_MS.length) {
    console.warn("[WS_HEALTH] automatic reconnect exhausted", { reason });
    this.notifyDisconnectFailure();
    return;
  }

  const delayMs = SOCKET_RECONNECT_DELAYS_MS[attemptIndex];
  this._automaticReconnectAttempts += 1;
  console.warn("[WS_HEALTH] scheduling automatic reconnect", {
    attempt: this._automaticReconnectAttempts,
    delayMs,
    reason,
  });

  this._reconnectTimer = setTimeout(() => {
    this._reconnectTimer = null;
    void this.connectSelectorSocket(this.uuid, true).catch(error => {
      console.warn("[WS_HEALTH] reconnect attempt failed", error);
      this.scheduleAutomaticReconnect("Reconnect attempt failed");
    });
  }, delayMs);
}

private handleSocketFailure(reason: string, socket: WebSocket): void {
  if (this.socket !== socket) return;

  const shouldReconnect = this.hasAutomaticReconnectTarget();
  this.hardDisconnect(reason, false, true, false);

  if (shouldReconnect) {
    this.scheduleAutomaticReconnect(reason);
  } else {
    this.notifyDisconnectFailure();
  }
}

private hardDisconnect(
  reason: string = "Socket lost",
  notifyDisconnect: boolean = true,
  preserveDisconnectHandler: boolean = false,
  markDisconnected: boolean = true
): void {
  if (this._isHardDisconnecting) return;
  this._isHardDisconnecting = true;

  try {
    console.log("[WS] hardDisconnect:", reason);
    this._isDisconnected = markDisconnected;

    this.stopSocketHealthMonitoring();
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    this._metersSubscribed = false;
    this._lastOutputLevels.clear();

    for (const [port] of this._audioListeners) {
      this._notifyPortListeners(port, 0);
    }

    try { this.disableMicAndStop(); } catch (e) { console.warn("disableMicAndStop failed", e); }

    this.remoteAudioTrack = null;
    this.remoteStream = null;

    try { this.closePeerConnection(); } catch (e) { console.warn("closePeerConnection failed", e); }

    this.safeCall("deactivate").catch(() => {});

    if (this.socket) {
      try { this.socket.onopen = null; } catch {}
      try { this.socket.onmessage = null; } catch {}
      try { this.socket.onerror = null; } catch {}
      try { this.socket.onclose = null; } catch {}

      try {
        if (
          this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          this.socket.close(1000, reason);
        }
      } catch (e) {
        console.warn("socket.close failed", e);
      }

      this.socket = null;
    }

    this.templateInfo = null;
    this.localAudioSender = null;
    this.localStream = null;
    this._callKitActive = false;
  } catch (e) {
    console.warn("hardDisconnect error", e);
  } finally {
    const callback = this.onDisconnect;

    if (!preserveDisconnectHandler) {
      this.onDisconnect = null;
    }
    this._isHardDisconnecting = false;

    if (notifyDisconnect && callback) {
      callback();
    }
  }
}

  public getRole(): 'selector' | 'listener' | 'unknown' {
    return this.currentRole;
  }

  /**
   * Subscribe to role changes. Returns unsubscribe() function.
   */
  public onRoleChange(cb: (role: 'selector' | 'listener' | 'unknown') => void): () => void {
    this.roleListeners.push(cb);
    return () => { this.roleListeners = this.roleListeners.filter(x => x !== cb); };
  }


// === helper: convert dB (negative or 0) to linear 0..1 ===
private _dbToLinear(db: number): number {
  if (!isFinite(db)) return 0;
  // clamp extremely low values
  if (db <= -120) return 0;
  const lin = Math.pow(10, db / 20.0);
  return Math.max(0, Math.min(1, lin));
}

// === notify helpers ===
  private _notifyPortListeners(port: number, level: number) {
    const set = this._audioListeners.get(port);
    if (set) set.forEach(cb => { try { cb(level); } catch (_) { } });
    this._globalAudioListeners.forEach(cb => { try { cb(level); } catch (_) { } });
  }

private _hasMeterDemand(): boolean {
  return this._audioListeners.size > 0 || this._globalAudioListeners.size > 0;
}

private _refreshMeterSubscription(): void {
  if (this._hasMeterDemand()) {
    this.subscribeMeters();
  } else {
    this.unsubscribeMeters();
  }
}


private async _ensureCallKitStarted() {
  if (this._callKitActive) return;
  if (Platform.OS !== "ios" || !CallKitModule?.startCall) return;

  try {
    await CallKitModule.startCall("Pro Selector");
    this._callKitActive = true;
  } catch (e) {
    console.warn("CallKit startCall failed", e);
  }
}


// === public API: addAudioListener(port, cb) -> unsubscribe ===
public addAudioListener(port: number, cb: (level: number) => void) {
  let set = this._audioListeners.get(port);
  if (!set) {
    set = new Set();
    this._audioListeners.set(port, set);
  }
  set.add(cb);

  this._refreshMeterSubscription();

  // return unsubscribe
  return () => {
    const s = this._audioListeners.get(port);
    if (s) {
      s.delete(cb);
      if (s.size === 0) this._audioListeners.delete(port);
    }
    this._refreshMeterSubscription();
  };
}

public getAudioLevel(port: number): number {
  return this._lastOutputLevels.get(port) ?? 0;
}

  // Calls the platform-specific native audio helper when the current build provides one.
public safeCall = async (fnName: keyof AudioModeModuleType) => {
    const module = AudioModeModule;
    if (!module || typeof module[fnName] !== 'function') {
      console.warn(`AudioModeModule.${String(fnName)} not available`);
      return;
    }
    try {
      // @ts-ignore - guaranteed by typeof check above
      await module[fnName]();
    } catch (err) {
      console.warn(`AudioModeModule.${String(fnName)} failed`, err);
    }
  };

// === meters subscribe/unsubscribe helpers (server expects meters_subscribe / meters_unsubscribe) ===
public subscribeMeters() {
  if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
    this._metersSubscribed = false;
    return;
  }
  if (this._metersSubscribed) return;
  try {
    this.socket.send(JSON.stringify({ action: "meters_subscribe" }));
    this._metersSubscribed = true;
  } catch (err) {
    console.warn("subscribeMeters send failed", err);
  }
}
public unsubscribeMeters() {
  if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
    this._metersSubscribed = false;
    return;
  }
  try {
    this.socket.send(JSON.stringify({ action: "meters_unsubscribe" }));
    this._metersSubscribed = false;
  } catch (err) {
    console.warn("unsubscribeMeters send failed", err);
  }
}


public async uuidOrNo(uuid: string | null): Promise<void> {
    try{

        if (uuid){

            const [expired, templateInfo] = await this.getTemplateFromUuid(uuid);

            if (expired){

                router.push("/selector_choice")
            }
            else{

                const templateData = JSON.stringify(templateInfo); // Serialize the object to pass as a string

                this.setRole('selector');                  // <- set role first
                await this.safeCall('setPlayAndRecordVoiceChat'); // optional: native audio hint
                router.push(`/selektor?template=${encodeURIComponent(templateData)}`)
            }
        }
        else{
            router.push("/selector_choice")
        }
    } catch (error) {
        console.log(error)
    }
}

public async requestMicrophonePermission() {
  if (Platform.OS !== 'android') {
    // On iOS, the system will automatically prompt based on Info.plist entries.
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'This app requires access to your microphone.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    } else {
      console.warn('Microphone permission denied on Android');
      return false;
    }
  } catch (err) {
    console.warn('Failed to request microphone permission:', err);
    return false;
  }
}

  // Override playRemoteStream to start volume monitoring:

  // Called when the remote stream arrives
public async playRemoteStream() {
    if (this.remoteAudioTrack) { 
      this.remoteAudioTrack.enabled = !this.isMuted;
    }
  }


public addGroupToList(intercomList: IntercomInfo[]): IntercomInfo[] {
  return intercomList.filter(intercom => intercom.groupState);
}

public addOmniToList(intercomList: IntercomInfo[]): IntercomInfo[] {
  return intercomList.filter(intercom => intercom.omniState);
}
/**
 * Route the given remote MediaStream’s audio to the speaker and start playback.
 * 
 * @param stream - The remote MediaStream you received in your 'track' handler.
 */


        
public closeSocket(): void {
  this._lastJoinedTemplate = null;
  this._lastListenerTemplate = null;
  this._automaticReconnectAttempts = 0;
  this.hardDisconnect("Client closing", false);
}


// Enable mic and add track to this.pc, then renegotiate
public async enableMicAndSend(): Promise<void> {
  if (!this.pc) {
    console.warn('enableMicAndSend: this.pc is not initialized yet');
    return;
  }



if (AudioModeModule?.setPlayAndRecordVoiceChat) {
  try {
    await AudioModeModule.setPlayAndRecordVoiceChat();
    console.log("before getUserMedia", await AudioModeModule.debugAudioSession?.());
  } catch (e) {
    console.warn('AudioModeModule.setPlayAndRecordVoiceChat failed before getUserMedia', e);
  }
}

    // 3) Now call getUserMedia
    if (this.localStream) {
      console.log('enableMicAndSend: local stream already present, skipping');
      return;
    }


  try {
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });

    const tracks = stream.getAudioTracks();
    const track = tracks && tracks.length > 0 ? tracks[0] : null;
    if (!track) {
      console.warn('enableMicAndSend: no audio track from getUserMedia');
      return;
    }

    this.localStream = stream;

    // addTrack returns a sender in most rn-webrtc versions
    try {
      this.localAudioSender = this.pc.addTrack(track, stream);
    } catch (err) {
      console.warn('addTrack failed, attempting addStream fallback', err);
      try {
        // fallback for older libs that expect addStream
        (this.pc as any).addStream?.(stream);
      } catch (err2) {
        console.warn('addStream fallback also failed', err2);
      }
    }
  } catch (err) {
    console.warn('getUserMedia failed (enableMicAndSend):', err);
  }
}



// Remove sender / stop tracks and renegotiate
public disableMicAndStop(): void {
  try {
    // remove track using stored sender if possible
    if (this.localAudioSender) {
      try {
        this.pc?.removeTrack(this.localAudioSender);
      } catch (e) {
        console.warn('removeTrack failed, attempting fallback removal', e);
        // fallback: find sender by track
        try {
          const senders = this.pc?.getSenders?.() || [];
          const localTracks = this.localStream?.getAudioTracks() || [];
          for (const s of senders) {
            if (s.track && localTracks.includes(s.track)) {
              try { this.pc?.removeTrack(s); } catch (_) {}
            }
          }
        } catch (err) { console.warn('removeTrack fallback failed', err); }
      }
      this.localAudioSender = null;
    }

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((t: any) => {
          try { t.stop(); } catch (_) {}
        });
      } catch (_) {}
      this.localStream = null;
    }

    // best-effort renegotiate (fire & forget)
    //this.renegotiate().catch((e: any) => console.warn('renegotiate after disableMic failed', e));
  } catch (e) {
    console.warn('disableMicAndStop error', e);
  }
}

public async closePeerConnection() {


  // disable local mic and stop local stream
  try { this.disableMicAndStop(); } catch (e) { console.warn('disableMicAndStop failed', e); }

  if (!this.pc) {
    this.remoteAudioTrack = null;
    this.remoteStream = null;
    return;
  }

  try {
    // stop transceivers and senders/tracks (double safety)
    try { this.pc.getTransceivers?.().forEach(t => { try { t.stop(); } catch (_) {} }); } catch (_) {}
    try { this.pc.getSenders().forEach(s => { if (s.track) try { s.track.stop(); } catch (_) {} }); } catch (_) {}

    // remove event listeners if you stored references (recommended)
    // e.g. this.pc.removeEventListener('track', this._onTrackHandler) etc.

    // close the pc
    try { this.pc.close(); } catch (e) { console.warn('pc.close failed', e); }
  } catch (e) {
    console.warn('closePeerConnection error', e);
  } finally {
    // clear references so nothing touches the old pc
    this.remoteAudioTrack = null;
    this.remoteStream = null;
    this.pc = null;
  }
}


// Create an offer from the current this.pc and send it via your websocket signaling
public async renegotiate(): Promise<void> {
  try {
    if (!this.pc) {
      console.warn('renegotiate: no pc to negotiate on');
      return;
    }
    const offer = await this.pc.createOffer({
      // follow the same options you already use for offers
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await this.pc.setLocalDescription(offer);

    const msg = {
      action: 'webrtc_offer',
      offer: { type: offer.type, sdp: offer.sdp }
    };

    // prefer helper sendMessage if available (ensures socket open)
    if (typeof (this as any).sendMessage === 'function') {
      (this as any).sendMessage(msg);
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn('renegotiate: socket not open to send offer');
    }
  } catch (e) {
    console.warn('renegotiate failed', e);
  }
}


async onRoleSelector() {
  //Start CallKit call right before enabling mic


  // enable mic and renegotiate
  await this.enableMicAndSend();
}

async onRoleListener() {
  // 1. stop local mic / sender first
  this.disableMicAndStop();

  // 2. switch the native audio coordinator to playback-only mode
  if (AudioModeModule?.setPlayback) {
    try {
      await AudioModeModule.setPlayback();
      if (AudioModeModule.debugAudioSession) {
        console.log("after setPlayback", await AudioModeModule.debugAudioSession());
      }
    } catch (e) {
      console.warn('AudioModeModule.setPlayback failed', e);
    }
  }
}


_emitPlayersSnapshot() {
  try {
    const snapshot = Array.from(this._playersMap.values())
      .sort((a, b) => a.id - b.id)
      .map(p => ({
          id: p.id,
          active_ports: p.active_ports || [],
          isSlave: !!p.isSlave,
          slaveColor: p.slaveColor || null   // <-- NEW: include color
      }));
    this._playersListeners.forEach(cb => {
      try { cb(snapshot.slice()); } catch (_) { /* ignore listener errors */ }
    });
  } catch (e) {
    console.warn("Failed to emit players snapshot", e);
  }
}

/**
 * Subscribe to player state changes (active_port).  Caller receives an
 * array of players sorted by ID (or slot if you later change sorting).
 * Returns unsubscribe function.
 */
public subscribeToPlayers(cb: (players: PlayerState[]) => void): () => void {

  this._playersListeners.add(cb);
  // immediately call back with current snapshot
  try { this._emitPlayersSnapshot(); } catch (e) {}
  return () => { this._playersListeners.delete(cb); };
}

public getLatestTimecode(): string {
  return this._latestTimecode;
}

public getLatestTimecodeSequence(): number | null {
  return this._latestTimecodeSequence;
}

public markTimecodeRendered(sequence: number | null): void {
  if (sequence === null) return;
  this._lastLtcRenderedSequence = sequence;
  this._lastLtcRenderedAt = monotonicNow();
}

public addTimecodeListener(cb: (
  newTimecode: string,
  sequence: number | null
) => void): () => void {
  this._timecodeListeners.add(cb);
  try { cb(this._latestTimecode, this._latestTimecodeSequence); } catch (_) {}
  return () => {
    this._timecodeListeners.delete(cb);
  };
}

private _notifyTimecodeListeners(
  newTimecode: string,
  sequenceValue: unknown
): void {
  const parsedSequence = Number(sequenceValue);
  const sequence = Number.isFinite(parsedSequence)
    ? parsedSequence
    : null;

  this._latestTimecode = newTimecode;
  this._latestTimecodeSequence = sequence;
  this._lastLtcReceivedAt = monotonicNow();

  if (this.timecodeSetter) {
    try { this.timecodeSetter(newTimecode); } catch (_) {}
  }

  this._timecodeListeners.forEach(cb => {
    try { cb(newTimecode, sequence); } catch (_) {}
  });
}

public async saveTemplateHiddenInputs(
  templateInfo: TemplateInfo,
  hiddenPorts: number[]
): Promise<void> {
  const normalizedPorts = Array.from(
    new Set(
      hiddenPorts
        .map(Number)
        .filter(port => Number.isFinite(port))
    )
  );

  const message = {
    action: "save_template_hidden_inputs",
    template: templateInfo,
    hiddenPorts: normalizedPorts,
  };

  this.sendMessage(message);
}


public async fetchTemplateHiddenInputs(
  templateInfo: TemplateInfo
): Promise<number[]> {
  const message = await this.requestMessage<any>(
    {
      action: "get_template_hidden_inputs",
      template: templateInfo,
    },
    "get_template_hidden_inputs"
  );

  return Array.isArray(message.hiddenPorts)
    ? message.hiddenPorts
        .map(Number)
        .filter((port: number) =>
          Number.isFinite(port)
        )
    : [];
}


public async connectSelectorSocket(uuid: string | null = null, isReconnect: boolean): Promise<void> {
    
    if (uuid){
        this.uuid = uuid
    }
    if (
      !this.socket ||
      (
        this.socket.readyState !== WebSocket.OPEN &&
        this.socket.readyState !== WebSocket.CONNECTING
      )
    ) {
        this._metersSubscribed = false;
        this._isDisconnected = false;
        const socketUrl = `${this.api_url}/ws/player`;

        console.log("[WS_DIAG] connectSelectorSocket called", {
          time: new Date().toISOString(),
          isReconnect,
          incomingUuid: uuid,
          storedUuid: this.uuid,
          appState: AppState.currentState,
          api_url: this.api_url,
          socketUrl,
          existingSocket: this.socket
            ? {
                readyState: this.socket.readyState,
                CONNECTING: WebSocket.CONNECTING,
                OPEN: WebSocket.OPEN,
                CLOSING: WebSocket.CLOSING,
                CLOSED: WebSocket.CLOSED,
              }
            : null,
        });

        let activeSocket: WebSocket;
        try {
          const parsed = new URL(socketUrl);
          console.log("[WS_DIAG] parsed socket URL", {
            href: parsed.href,
            protocol: parsed.protocol,
            host: parsed.host,
            hostname: parsed.hostname,
            port: parsed.port,
            pathname: parsed.pathname,
          });
        } catch (e) {
          console.warn("[WS_DIAG] socket URL parse failed", e);
        }

        try {
          console.log("[WS_DIAG] creating WebSocket now", {
            socketUrl,
            time: Date.now(),
          });

          activeSocket = new WebSocket(socketUrl);
          this.socket = activeSocket;

          console.log("[WS_DIAG] WebSocket object created", {
            readyState: activeSocket.readyState,
            CONNECTING: WebSocket.CONNECTING,
            OPEN: WebSocket.OPEN,
            CLOSING: WebSocket.CLOSING,
            CLOSED: WebSocket.CLOSED,
          });
        } catch (e) {
          console.error("[WS_DIAG] new WebSocket threw synchronously", e);
          this.hardDisconnect(
            "WebSocket constructor threw",
            false,
            true,
            !isReconnect
          );
          if (isReconnect) {
            this.scheduleAutomaticReconnect("WebSocket constructor threw");
          } else {
            this.notifyDisconnectFailure();
          }
          return;
        }
        const configuration = {
            iceServers: []
          };

        this._connectTimeout = setTimeout(() => {
          this.handleSocketFailure("WebSocket open timed out", activeSocket);
        }, SOCKET_CONNECT_TIMEOUT_MS);

        activeSocket.onopen = async () => {
          if (this.socket !== activeSocket) return;

          this._isDisconnected = false;
          this.startSocketHealthMonitoring(activeSocket);

          try {
            if (!isReconnect) {
              await this.uuidOrNo(this.uuid);
            } else if (
              this.currentRole === "selector" &&
              this._lastJoinedTemplate
            ) {
              await this.safeCall("setPlayAndRecordVoiceChat");
              await this.playerJoin(this._lastJoinedTemplate);
            } else if (
              this.currentRole === "listener" &&
              this._lastListenerTemplate
            ) {
              await this.safeCall("setPlayback");
              await this.listenerJoin(this._lastListenerTemplate);
            }

            if (this.socket !== activeSocket) return;
            this._automaticReconnectAttempts = 0;
            this._isDisconnected = false;
            try {
              this._refreshMeterSubscription();
            } catch (error) {
              console.warn("refresh meters on open failed", error);
            }
          } catch (error) {
            console.warn("[WS_HEALTH] socket join failed", error);
            this.handleSocketFailure("Socket rejoin failed", activeSocket);
          }
        };

        activeSocket.onerror = (event) => {
          console.warn("[WS] socket error", event);
          this.handleSocketFailure("WebSocket error", activeSocket);
        };

        activeSocket.onclose = (event) => {
          console.warn("[WS] socket closed", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          this.handleSocketFailure(
            `WebSocket closed: ${event.code} ${event.reason}`,
            activeSocket
          );
        };

        // Handle incoming messages
        activeSocket.onmessage = async (event) => {




            if (this.socket !== activeSocket) return;
            this._lastSocketMessageAt = monotonicNow();

            let msg: any;
            try {
              msg = JSON.parse(event.data);
            } catch (error) {
              console.warn("[WS] failed to parse message", error);
              return;
            }

            if (msg.action === "pong") {
              this._lastPongAt = monotonicNow();

              const serverSentSequence = Number(msg.lastLtcSentSequence);
              const receivedSequence = this._latestTimecodeSequence;
              if (
                Number.isFinite(serverSentSequence) &&
                receivedSequence !== null &&
                serverSentSequence - receivedSequence > 50 &&
                this._lastPongAt - this._lastLtcLagWarningAt > 30_000
              ) {
                this._lastLtcLagWarningAt = this._lastPongAt;
                console.warn("[WS_HEALTH] LTC receive sequence is behind", {
                  serverEnqueuedSequence: msg.lastLtcEnqueuedSequence,
                  serverSentSequence,
                  clientReceivedSequence: receivedSequence,
                  clientRenderedSequence: this._lastLtcRenderedSequence,
                });
              }
              return;
            }
      

            if (msg.action === 'webrtc_offer') {
            // --- Received offer from server (from Go via Python) ---
            console.log("[RTC] creating RTCPeerConnection", {
              time: Date.now(),
              state: AppState.currentState,
            });
            const peerConnection = new RTCPeerConnection(configuration);
            this.pc = peerConnection;
            //startAudioStatsMonitor(this.pc)

            //Capture mic
            // new block
            const role = this.getRole ? this.getRole() : "listener";
            if (role === "selector") {


              
              await this.enableMicAndSend();
            } else {
              console.log("Listener role; skipping getUserMedia in connectSelectorSocket");
            }

            


            const peerConnectionEvents = peerConnection as unknown as {
              addEventListener: (type: string, listener: (event: any) => void) => void;
            };

            // Handle local ICE candidates
            peerConnectionEvents.addEventListener('icecandidate', (e: RTCIceCandidateEvent<'icecandidate'>) => {
              console.log("[RTC] local ICE", { has: !!e.candidate, state: AppState.currentState });

              if (
                e.candidate &&
                this.socket === activeSocket &&
                activeSocket.readyState === WebSocket.OPEN
              ) {
                activeSocket.send(JSON.stringify({
                  action: 'webrtc_ice',
                  candidate: {
                    candidate: e.candidate.candidate,
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex
                  }
                }));
              }
            });
            
            // Handle remote audio
            peerConnectionEvents.addEventListener('track', async (e: any) => {
              if (e.track && this.pc === peerConnection) {
                this.remoteAudioTrack = e.track;
                console.log("Remote track kind", e.track.kind);

                this.playRemoteStream();

              }
            });

            // Apply server's SDP offer
            const offerDesc = new RTCSessionDescription(msg.offer);
            await peerConnection.setRemoteDescription(offerDesc);

            // Create answer
            const answerDesc = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answerDesc);

            // Send answer back to server (Python → Go)
            if (
              this.socket === activeSocket &&
              activeSocket.readyState === WebSocket.OPEN
            ) {
              activeSocket.send(JSON.stringify({
                action: 'webrtc_answer',
                answer: { type: answerDesc.type, sdp: answerDesc.sdp }
              }));
            }

          } else if (msg.action === 'webrtc_ice') {
            // --- Received ICE candidate from server (relayed from Go) ---
            
            if (this.pc) {
              try {

                const candidate = new RTCIceCandidate(msg.candidate);
                await this.pc.addIceCandidate(candidate);
              } catch (err) {
                console.warn('Error adding ICE candidate', err);
              }
            }
          }
            
            if (msg.action === "ltc"){
                
                if (
                  this.socket === activeSocket &&
                  activeSocket.readyState === WebSocket.OPEN
                ) {
                    this._notifyTimecodeListeners(msg.timecode, msg.sequence)
                }
            }

          if (msg.action === "meters") {

            try {
              // ---------- existing parsing logic (unchanged) ----------
              const outputs = msg.outputs_payload;
              if (Array.isArray(outputs)) {
                for (let i = 0; i < outputs.length; ++i) {
                  const item = outputs[i];
                  if (item == null) continue;
                  if (typeof item === "object") {
                    // object shape
                    const maybePort = Number(item.port_index);
                    const dbVal = Number(item.db ?? 0);
                    const level = this._dbToLinear(dbVal);
                    const prev = this._lastOutputLevels.get(maybePort) ?? 0;
                    const sm = Math.max(prev * 0.8, level);
                    this._lastOutputLevels.set(maybePort, sm);
                    this._notifyPortListeners(maybePort, sm);
                  } else if (typeof item === "number") {
                    // plain list of floats -> need index->port mapping
                    const dbVal = Number(item);
                    let port = i;
                    if (this._outputPortOrder && i < this._outputPortOrder.length) {
                      port = this._outputPortOrder[i];
                    }
                    const level = this._dbToLinear(dbVal);
                    const prev = this._lastOutputLevels.get(port) ?? 0;
                    const sm = Math.max(prev * 0.8, level);
                    this._lastOutputLevels.set(port, sm);
                    this._notifyPortListeners(port, sm);
                  } else {
                    // unknown type: skip
                    continue;
                  }
                }
              } else {
                console.warn("[METER] msg.outputs_payload is not an array:", msg.outputs_payload);
              }
            } catch (err) {
              console.warn("meters message parsing failed", err);
            }

          }

            if (msg.action === "player_input") {
              try {
                const p = msg.player;
                if (p && (p.id !== undefined)) {
                  const id = Number(p.id);
                  let ports: number[] = [];
                  if (Array.isArray(p.active_ports)) {
                    ports = p.active_ports
                      .map((x: any) => Number(x))
                      .filter((x: number) => !Number.isNaN(x))
                      .map((n: number) => n + 1); // convert 0-based -> 1-based
                  } else if (p.active_port !== undefined && p.active_port !== null) {
                    const ap = Number(p.active_port);
                    if (!Number.isNaN(ap)) ports = [ap + 1];
                  }

                  const isSlave = !!(p.isSlave || p.is_slave || p.role === 'slave');

                  const existing = this._playersMap.get(id);

                  if (existing) {
                    existing.active_ports = ports;
                    existing.isSlave = existing.isSlave || isSlave;
                    existing.slaveColor =
                      p.slaveColor ??
                      p.slave_color ??
                      existing.slaveColor ??
                      null;
                  } else {
                    this._playersMap.set(id, {
                      id,
                      active_ports: ports,
                      isSlave: !!(p.isSlave || p.is_slave || p.role === "slave"),
                      slaveColor: p.slaveColor ?? p.slave_color ?? null
                    });
                  }


                  this._emitPlayersSnapshot();
                }
              } catch (err) {
                console.warn('Failed to process player_input', err);
              }
            }


            if (msg.action === "players_snapshot" && Array.isArray(msg.players)) {
              try {
                const seenIds = new Set<number>();

                msg.players.forEach((p: any) => {
                  const id = Number(p.id);
                  if (Number.isNaN(id)) return;

                  seenIds.add(id);

                  const ports = Array.isArray(p.active_ports)
                    ? p.active_ports
                        .map((x: any) => Number(x))
                        .filter((x: number) => !Number.isNaN(x))
                        .map((n: number) => n + 1) // server sends 0-based here
                    : (p.active_port != null
                        ? [Number(p.active_port) + 1]
                        : undefined);

                  const existing = this._playersMap.get(id);

                  this._playersMap.set(id, {
                    id,
                    active_ports: ports ?? existing?.active_ports ?? [],
                    isSlave: existing?.isSlave || !!(p.isSlave || p.is_slave || p.role === "slave"),
                    slaveColor:
                      p.slaveColor ??
                      p.slave_color ??
                      existing?.slaveColor ??
                      null
                  });
                });

                // only remove players that truly disappeared from this authoritative snapshot
                for (const existingId of Array.from(this._playersMap.keys())) {
                  if (!seenIds.has(existingId)) {
                    this._playersMap.delete(existingId);
                  }
                }

                this._emitPlayersSnapshot();
              } catch (err) {
                console.warn("Failed to process players_snapshot", err);
              }
            }

            if (msg.action === "slave_states" && Array.isArray(msg.slaves)) {
              try {
                // IMPORTANT:
                // Merge into existing state instead of clearing everything.
                // If a slave snapshot arrives without active_ports, preserve the old ports.
                msg.slaves.forEach((s: any) => {
                  const id = Number(s.id);
                  if (Number.isNaN(id)) return;

                  const existing = this._playersMap.get(id);

                  const parsedPorts = Array.isArray(s.active_ports)
                    ? s.active_ports
                        .map((x: any) => Number(x))
                        .filter((x: number) => !Number.isNaN(x))
                    : undefined; // undefined means "not supplied", so preserve existing

                  this._playersMap.set(id, {
                    id,
                    active_ports: parsedPorts ?? existing?.active_ports ?? [],
                    isSlave: true,
                    slaveColor:
                      s.color ??
                      s.slaveColor ??
                      s.slave_color ??
                      existing?.slaveColor ??
                      null
                  });
                });

                this._emitPlayersSnapshot();
              } catch (err) {
                console.warn("Failed to process slave_states", err);
              }
            }

            if (msg.action === "template_released") {
              this._lastJoinedTemplate = null;
              this._lastListenerTemplate = null;
              this._automaticReconnectAttempts = 0;
              this.hardDisconnect("Template released", false);
              router.dismissTo("/");
            }
            if (msg.action === "live_update") {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    if (msg.floorPlan && this.floorPlanSetter) {
                        this.floorPlanSetter(normalizeFloorPlan(msg.floorPlan));
                    }

                    if (
                        this.chosenTemplateSetter &&
                        this.inputInfoListSetter &&
                        this.intercomInfoListSetter &&
                        this.intercomOmniListSetter &&
                        this.intercomGroupListSetter
                    ) {
                    if (msg.inputs){
                        const inputInfoList: InputInfo[] = msg.inputs.map((input: any) => ({
                            port: input.port,
                            name: input.name,
                            picturePath: input.picturePath
                        }))
                        this.inputInfoListSetter(inputInfoList)

                                       
                    }
                    if (msg.template){
                        this.chosenTemplateSetter(msg.template)
                        this.intercomInfoListSetter(msg.template.intercomInfo)
                        this.intercomOmniListSetter(this.addOmniToList(msg.template.intercomInfo))
                        this.intercomGroupListSetter(this.addGroupToList(msg.template.intercomInfo))
                    }


                    }
                }
            }
        };
    }
}

// Send generic message through WS
private sendMessage(msg: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(msg));
    }
}

private requestMessage<T>(
    request: any,
    responseAction: string,
    timeoutMs = 8000
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const socket = this.socket;

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            reject(new Error("WebSocket is not connected"));
            return;
        }
        const activeSocket = socket;

        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleMessage = (event: MessageEvent) => {
            let message: any;

            try {
                message = JSON.parse(event.data);
            } catch (error) {
                return;
            }

            if (message.action !== responseAction) {
                return;
            }

            cleanup();

            if (message.error) {
                finishReject(new Error(message.error));
                return;
            }

            finishResolve(message as T);
        };

        function cleanup() {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            activeSocket.removeEventListener("message", handleMessage);
        }

        function finishResolve(value: T) {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(value);
        }

        function finishReject(error: Error) {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error);
        }

        timeoutId = setTimeout(() => {
            finishReject(new Error(`Timed out waiting for ${responseAction}`));
        }, timeoutMs);

        activeSocket.addEventListener("message", handleMessage);

        try {
            activeSocket.send(JSON.stringify(request));
        } catch (error) {
            finishReject(
                error instanceof Error
                    ? error
                    : new Error(`Failed to send ${responseAction} request`)
            );
        }
    });
}

private normalizeTemplateProfilePayload(message: any): TemplateProfilePayload {
    const toActiveBoolean = (value: any) =>
        value === true ||
        value === 1 ||
        value === "1" ||
        String(value).toLowerCase() === "true";

    const profiles = Array.isArray(message.profiles)
        ? message.profiles.map((profile: any) => ({
            id: Number(profile.id),
            templateId: Number(profile.templateId),
            name: String(profile.name ?? "Default"),
            specialGroupName1: String(profile.specialGroupName1 ?? "Input Group 1"),
            specialGroupName2: String(profile.specialGroupName2 ?? "Input Group 2"),
            allInputsVolume: Number.isFinite(Number(profile.allInputsVolume))
                ? Number(profile.allInputsVolume)
                : 1,
            listenActive: toActiveBoolean(profile.listenActive),
            createdAt: String(profile.createdAt ?? ""),
            updatedAt: String(profile.updatedAt ?? ""),
            lastUsedAt: profile.lastUsedAt ?? null,
        }))
        : [];

    const currentProfile = message.currentProfile
        ? {
            id: Number(message.currentProfile.id),
            templateId: Number(message.currentProfile.templateId),
            name: String(message.currentProfile.name ?? "Default"),
            specialGroupName1: String(message.currentProfile.specialGroupName1 ?? "Input Group 1"),
            specialGroupName2: String(message.currentProfile.specialGroupName2 ?? "Input Group 2"),
            allInputsVolume: Number.isFinite(Number(message.currentProfile.allInputsVolume))
                ? Number(message.currentProfile.allInputsVolume)
                : 1,
            listenActive: toActiveBoolean(message.currentProfile.listenActive),
            createdAt: String(message.currentProfile.createdAt ?? ""),
            updatedAt: String(message.currentProfile.updatedAt ?? ""),
            lastUsedAt: message.currentProfile.lastUsedAt ?? null,
        }
        : null;

    const inputVolumes: { [port: number]: number } = {};
    const rawInputVolumes = message.inputVolumes ?? {};
    if (rawInputVolumes && typeof rawInputVolumes === "object") {
        Object.entries(rawInputVolumes).forEach(([port, volume]) => {
            const numericPort = Number(port);
            const numericVolume = Number(volume);
            if (Number.isFinite(numericPort) && Number.isFinite(numericVolume)) {
                inputVolumes[numericPort] = numericVolume;
            }
        });
    }

    const intercomVolumes: { [id: number]: number } = {};
    const rawIntercomVolumes = message.intercomVolumes ?? {};
    if (rawIntercomVolumes && typeof rawIntercomVolumes === "object") {
        Object.entries(rawIntercomVolumes).forEach(([id, volume]) => {
            const numericId = Number(id);
            const numericVolume = Number(volume);
            if (Number.isFinite(numericId) && Number.isFinite(numericVolume)) {
                intercomVolumes[numericId] = numericVolume;
            }
        });
    }

    const activeInputs = Array.isArray(message.activeInputs)
        ? message.activeInputs
            .map((input: any) => ({
                id: Number(input.id),
                port: Number(input.port),
                name: String(input.name ?? ""),
                isActive: toActiveBoolean(input.isActive),
            }))
            .filter((input: any) => Number.isFinite(input.id) && Number.isFinite(input.port))
        : undefined;

    const activeIntercoms = Array.isArray(message.activeIntercoms)
        ? message.activeIntercoms
            .map((intercom: any) => ({
                id: Number(intercom.id),
                port: Number(intercom.port),
                name: String(intercom.name ?? ""),
                type: String(intercom.type ?? ""),
                isActive: toActiveBoolean(intercom.isActive),
            }))
            .filter((intercom: any) =>
                Number.isFinite(intercom.id) &&
                Number.isFinite(intercom.port) &&
                intercom.type.length > 0
            )
        : undefined;

    const explicitAllInputsVolume = Number(message.allInputsVolume);

    return {
        profiles,
        currentProfile,
        inputVolumes,
        intercomVolumes,
        activeInputs,
        activeIntercoms,
        allInputsVolume: Number.isFinite(explicitAllInputsVolume)
            ? explicitAllInputsVolume
            : currentProfile?.allInputsVolume ?? 1,
        listenActive: message.listenActive !== undefined
            ? toActiveBoolean(message.listenActive)
            : currentProfile?.listenActive ?? false,
    };
}

public async updateUuid(templateInfo: TemplateInfo): Promise<void> {
    
    const getOrCreateUUID = async () => {
        let storedUUID = await AsyncStorage.getItem('device_uuid');
    
        if (!storedUUID) {
        // If no UUID is found, generate one using the react-native-uuid v4 method
        storedUUID = uuid.v4();
        // Store the generated UUID for future use
        await AsyncStorage.setItem('device_uuid', storedUUID);
        }
        
        return storedUUID;
      };
    try{
    const uuid = await getOrCreateUUID()
    const msg = {
        action: "update_uuid",
        template: templateInfo,
        uuid: uuid,
    };
    this.sendMessage(msg);
    } catch (error) {
       
    }
    
}

public async getTemplateFromUuid(uuid: string): Promise<[boolean, TemplateInfo | null]> {
    const message = await this.requestMessage<any>(
        {
            action: "get_template_from_uuid",
            uuid: uuid
        },
        "get_template_from_uuid"
    );

    const template = message.template;
    let templateInfo: TemplateInfo | null = null
    if (template) {
        templateInfo = {
            id: template.id,
            name: template.name,
            noDelayPort: template.noDelayPort,
            delayPort: template.delayPort,
            micPort: template.micPort,
            intercomOutputPort: template.intercomOutputPort,
            intercomInfo: template.intercomInfo || [],
            delay: template.delay,
            omniState: template.omniState,
            omniName: template.omniName,
            groupState: template.groupState,
            groupName: template.groupName,
            deviceUuid: template.deviceUuid,
            deviceExpiryDate: template.deviceExpiryDate,
            lastActivationUtc: template.lastActivationUtc,
            autoDuck: template.autoDuck,
            autoDuckGain: template.autoDuckGain,
            autoDuckRelease: template.autoDuckRelease,
            autoDuckThreshold: template.autoDuckThreshold,
            isMaster: template.isMaster,
            isTabMaster: template.isTabMaster,
            isSlave: template.isSlave,
            slaveColor: template.slaveColor,
            listenDisabled: toBackendBoolean(template.listenDisabled),
            isFloorPlan: toBackendBoolean(template.isFloorPlan)
        };
    }

    return [message.isExpired, templateInfo];
}


public async listenerJoin(templateInfo: TemplateInfo) {
    this._lastListenerTemplate = templateInfo;
    this._lastJoinedTemplate = null;
    await this.requestMessage<any>(
        {
            action: "listener_join",
            template: templateInfo
        },
        "listener_join"
    );
}

public async listenerChange(templateInfo: TemplateInfo): Promise<void> {
    this._lastListenerTemplate = templateInfo;
    const msg = {
        action: "listener_change",
        template: templateInfo,
    };
    this.sendMessage(msg);
}




// Player Join
public async playerJoin(templateInfo: TemplateInfo): Promise<void> {
    this._lastJoinedTemplate = templateInfo;
    this._lastListenerTemplate = null;
    this.templateInfo = templateInfo
    await this.requestMessage<any>(
        {
            action: "player_join",
            template: templateInfo,
        },
        "player_join"
    );
}
// Send Input On
public async sendInputOn(templateInfo: TemplateInfo, port: number, isIntercom: boolean, tabId?: number): Promise<void> {
    const msg = {
        action: "input_on",
        template: templateInfo,
        port: port,
        type: "output",
        isIntercom: isIntercom,
        tabId: tabId
    };
    this.sendMessage(msg);
}

public async saveTemplateInputOrder(
  templateInfo: TemplateInfo,
  inputInfoList: InputInfo[]
): Promise<void> {
  const msg = {
    action: "save_template_input_order",
    template: templateInfo,
    orderedPorts: inputInfoList.map(input => input.port),
  };

  this.sendMessage(msg);
}

public async saveTemplateInputGroups(
  templateInfo: TemplateInfo,
  groups: { group1: number[]; group2: number[] }
): Promise<void> {
  const msg = {
    action: "save_template_input_groups",
    template: templateInfo,
    groups,
  };

  this.sendMessage(msg);
}

public async fetchTemplateInputGroups(
  templateInfo: TemplateInfo
): Promise<{ group1: number[]; group2: number[] }> {
  const message = await this.requestMessage<any>(
    {
      action: "get_template_input_groups",
      template: templateInfo,
    },
    "get_template_input_groups"
  );

  return {
    group1: message.groups?.group1 ?? [],
    group2: message.groups?.group2 ?? [],
  };
}

public async saveTemplateInputGroupNames(
  templateInfo: TemplateInfo,
  names: { group1: string; group2: string }
): Promise<void> {
  const msg = {
    action: "save_template_input_group_names",
    template: templateInfo,
    names,
  };

  this.sendMessage(msg);
}

public async fetchTemplateInputGroupNames(
  templateInfo: TemplateInfo
): Promise<{ group1: string; group2: string }> {
  const message = await this.requestMessage<any>(
    {
      action: "get_template_input_group_names",
      template: templateInfo,
    },
    "get_template_input_group_names"
  );

  return {
    group1: message.names?.group1 ?? "Input Group 1",
    group2: message.names?.group2 ?? "Input Group 2",
  };
}

public async fetchTemplateProfiles(
  templateInfo: TemplateInfo
): Promise<TemplateProfilePayload> {
  const message = await this.requestMessage<any>(
    {
      action: "get_template_profiles",
      template: templateInfo,
    },
    "get_template_profiles"
  );

  return this.normalizeTemplateProfilePayload(message);
}

public async createTemplateProfile(
  templateInfo: TemplateInfo,
  name: string
): Promise<TemplateProfilePayload> {
  const message = await this.requestMessage<any>(
    {
      action: "create_template_profile",
      template: templateInfo,
      name,
    },
    "create_template_profile"
  );

  return this.normalizeTemplateProfilePayload(message);
}

public async selectTemplateProfile(
  templateInfo: TemplateInfo,
  profileId: number
): Promise<TemplateProfilePayload> {
  const message = await this.requestMessage<any>(
    {
      action: "select_template_profile",
      template: templateInfo,
      profileId,
    },
    "select_template_profile"
  );

  return this.normalizeTemplateProfilePayload(message);
}

public async renameTemplateProfile(
  templateInfo: TemplateInfo,
  profileId: number,
  name: string
): Promise<TemplateProfilePayload> {
  const message = await this.requestMessage<any>(
    {
      action: "rename_template_profile",
      template: templateInfo,
      profileId,
      name,
    },
    "rename_template_profile"
  );

  return this.normalizeTemplateProfilePayload(message);
}

public async deleteTemplateProfile(
  templateInfo: TemplateInfo,
  profileId: number
): Promise<TemplateProfilePayload> {
  const message = await this.requestMessage<any>(
    {
      action: "delete_template_profile",
      template: templateInfo,
      profileId,
    },
    "delete_template_profile"
  );

  return this.normalizeTemplateProfilePayload(message);
}

public async fetchTemplateProfileState(
  templateInfo: TemplateInfo
): Promise<TemplateProfilePayload> {
  const message = await this.requestMessage<any>(
    {
      action: "get_template_profile_state",
      template: templateInfo,
    },
    "get_template_profile_state"
  );

  return this.normalizeTemplateProfilePayload(message);
}

public async saveTemplateAllInputsVolume(
  templateInfo: TemplateInfo,
  volume: number
): Promise<void> {
  this.sendMessage({
    action: "save_template_all_inputs_volume",
    template: templateInfo,
    volume,
  });
}

public async saveTemplateListenActive(
  templateInfo: TemplateInfo,
  active: boolean,
  profileId?: number
): Promise<void> {
  await this.requestMessage<any>(
    {
      action: "save_template_listen_active",
      template: templateInfo,
      active,
      profileId,
    },
    "save_template_listen_active"
  );
}

public async sendOnChangeVolume(port: number, volume: number): Promise<void> {
    const msg = {
        action: "change_volume",
        template: this.templateInfo,
        port: port,
        volume: volume
    };
    this.sendMessage(msg);
}

public async sendOnChangeIntercomVolume(
    intercomId: number,
    port: number,
    type: string,
    volume: number
): Promise<void> {
    const msg = {
        action: "change_intercom_volume",
        template: this.templateInfo,
        intercomId,
        port,
        type,
        volume,
    };
    this.sendMessage(msg);
}

// Send Input Off
public async sendInputOff(
    templateInfo: TemplateInfo,
    port: number,
    isIntercom: boolean,
    isCleanup: boolean,
    tabId?: number,
    skipProfileSave?: boolean
): Promise<void> {
    const msg = {
        action: "input_off",
        template: templateInfo,
        port: port,
        type: "output",
        isIntercom: isIntercom,
        isCleanup: isCleanup,
        tabId: tabId,
        skipProfileSave: !!skipProfileSave,
    };
    this.sendMessage(msg);
}

// Send Output On
public async sendOutputOn(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "output_on",
        template: templateInfo,
        port: port,
        type: "input",
    };
    this.sendMessage(msg);
}

// Send Output Off
public async sendOutputOff(
    templateInfo: TemplateInfo,
    port: number,
    skipProfileSave?: boolean
): Promise<void> {
    const msg = {
        action: "output_off",
        template: templateInfo,
        port: port,
        type: "input",
        skipProfileSave: !!skipProfileSave,
    };
    this.sendMessage(msg);
}

public async sendFloorPlanOutputOn(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "floor_plan_output_on",
        template: templateInfo,
        port: port,
    };
    this.sendMessage(msg);
}

public async sendFloorPlanOutputOff(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "floor_plan_output_off",
        template: templateInfo,
        port: port,
    };
    this.sendMessage(msg);
}

// Send Output On Omni
public async sendOutputOnOmni(templateInfo: TemplateInfo | undefined, ports: number[] | undefined): Promise<void> {
    const msg = {
        action: "output_on_omni",
        template: templateInfo,
        ports: ports,
    };
    this.sendMessage(msg);
}

// Send Output Off Omni
public async sendOutputOffOmni(templateInfo: TemplateInfo | undefined, ports: number[] | undefined): Promise<void> {
    const msg = {
        action: "output_off_omni",
        template: templateInfo,
        ports: ports,
    };
    this.sendMessage(msg);
}


    // public async sendInputAndOutputInfo(templateInfoList: TemplateInfo[], inputInfoList: InputInfo[]){
    //     this.sendTemplateInfoList(templateInfoList)
    //     this.sendInputInfo(inputInfoList)
    // }
    
    // public async sendInputOn(templateInfo: TemplateInfo, port: number): Promise<void>{
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_input_on`, {
    //             template: templateInfo,
    //             port: port
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };
    
    // public async sendInputOff(templateInfo: TemplateInfo, port: number): Promise<void>{
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_input_off`, {
    //             template: templateInfo,
    //             port: port
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };
    
    // public async sendOutputOn(templateInfo: TemplateInfo, port: number): Promise<void> {
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_output_on`, {
    //             template: templateInfo,
    //             port: port
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };

    // public async sendOutputOnOmni(templateInfo: TemplateInfo | undefined, ports: number[] | undefined): Promise<void> {
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_output_on_omni`, {
    //             template: templateInfo,
    //             ports: ports
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };

    // public async sendOutputOffOmni(templateInfo: TemplateInfo | undefined, ports: number[] | undefined): Promise<void> {
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_output_off_omni`, {
    //             template: templateInfo,
    //             ports: ports
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };
    
    // public async sendOutputOff(templateInfo: TemplateInfo, port: number): Promise<void>{
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_output_off`, {
    //             template: templateInfo,
    //             port: port
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };

    // public async playerJoin(templateInfo: TemplateInfo): Promise<void>{
    //     try {
    //         const response = await axios.post(`${this.api_url}/player_join`, {
    //             template: templateInfo,
    //         })
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.log("Error sending data:", error);
    //     }
    // }
    public async listenerExit(templateInfo: TemplateInfo | undefined): Promise<void> {
      const msg = {
        action: "listener_exit",
        template: templateInfo,
      };

      this.sendMessage(msg);
      this._lastListenerTemplate = null;
      this._lastJoinedTemplate = null;
      this._automaticReconnectAttempts = 0;
      this.hardDisconnect("Listener exit", false);
    }

    public async playerExit(templateInfo: TemplateInfo | undefined): Promise<void> {
      const msg = {
        action: "player_exit",
        template: templateInfo,
      };

      this.sendMessage(msg);
      this._lastJoinedTemplate = null;
      this._lastListenerTemplate = null;
      this._automaticReconnectAttempts = 0;
      this.hardDisconnect("Player exit", false);
    }
    
    // public async sendTemplateInfoList(templateInfoList: TemplateInfo[]): Promise<void> {
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_templates`, {
    //             templates: templateInfoList
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };
    
    // public async sendInputInfo(inputInfoList: InputInfo[]): Promise<void> {
    //     try {
    //         const response = await axios.post(`${this.api_url}/post_inputs`, {
    //             inputs: inputInfoList
    //         });
    //         console.log("Data successfully sent:", response.data);
    //     } catch (error) {
    //         console.error("Error sending data:", error);
    //     }
    // };

    public async fetchInputs(templateInfo?: TemplateInfo): Promise<InputInfo[]> {
        const message = await this.requestMessage<any>(
            {
                action: "get_inputs",
                template: templateInfo ?? this.templateInfo ?? {}
            },
            "get_inputs"
        );

        return message.inputs.map((input: any) => ({
            port: input.port,
            name: input.name,
            picturePath: input.picturePath
        }));
    }

    public async fetchFloorPlan(): Promise<FloorPlanInfo> {
        const message = await this.requestMessage<any>(
            {
                action: "get_floor_plan",
                template: this.templateInfo ?? {}
            },
            "get_floor_plan"
        );

        return normalizeFloorPlan(message.floorPlan);
    }

    public async fetchActivatedIntercoms(): Promise<IntercomInfo[]> {
        const message = await this.requestMessage<any>(
            {
                action: "get_activated_intercoms",
            },
            "get_activated_intercoms"
        );

        return message.intercoms.map((intercom: any) => ({
            id: intercom.id,
            port: intercom.port,
            name: intercom.name,
            type: intercom.type,
            isActivated: intercom.isActivated
        }));
    }

    public async fetchActivatedInputs(): Promise<InputInfo[]> {
        const message = await this.requestMessage<any>(
            {
                action: "get_activated_inputs",
            },
            "get_activated_inputs"
        );

        return message.inputs.map((input: any) => ({
            id: input.id,
            port: input.port,
            name: input.name,
            isActivated: input.isActivated
        }));
    }

    public async fetchTemplates(): Promise<TemplateInfo[]> {
        const message = await this.requestMessage<any>(
            {
                action: "get_templates",
                template: {} // optional, no data needed
            },
            "get_templates"
        );

        return message.templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            noDelayPort: template.noDelayPort,
            delayPort: template.delayPort,
            micPort: template.micPort,
            intercomOutputPort: template.intercomOutputPort,
            intercomInfo: template.intercomInfo || [],
            delay: template.delay,
            omniState: template.omniState,
            omniName: template.omniName,
            groupState: template.groupState,
            groupName: template.groupName,
            deviceUuid: template.deviceUuid,
            deviceExpiryDate: template.deviceExpiryDate,
            lastActivationUtc: template.lastActivationUtc,
            autoDuck: template.autoDuck,
            autoDuckGain: template.autoDuckGain,
            isMaster: template.isMaster,
            isTabMaster: template.isTabMaster,
            isSlave: template.isSlave,
            slaveColor: template.slaveColor,
            listenDisabled: toBackendBoolean(template.listenDisabled),
            isFloorPlan: toBackendBoolean(template.isFloorPlan)
        }));
    }
  
    // Optional: Method to update the API URL
    public setApiUrl(url: string): void {
      this.api_url = url;
    }
  }
