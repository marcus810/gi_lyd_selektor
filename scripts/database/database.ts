import { TemplateInfo, InputInfo, IntercomInfo } from "../types"; // Adjust the import path if necessary
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import InCallManager from 'react-native-incall-manager';
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
  // add any extra methods here
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
    public toggleIntercoms: ((activatedIntercoms: IntercomInfo[]) => void | null) | undefined
    public toggleInputs: ((activatedInputs: InputInfo[]) => void | undefined) | undefined
    public timecodeSetter: ((newTimecode: string) => void) | null
    private _callKitActive = false;
    public remoteAudioTrack: RNMediaStreamTrack | null = null;
    public isMuted: boolean = true

    
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
      this.remoteStream = null
      this.timecodeSetter = null
      this.localStream = null
      this.localAudioSender = null;
      this.requestMicrophonePermission()
      //this.checkDeviceAndMaybeStartAudio()
    }


    
    
  
    // Public static method to get the instance of the class
    public static getInstance(): DatabaseHandler {
      if (!DatabaseHandler.instance) {
        DatabaseHandler.instance = new DatabaseHandler();
      }
      return DatabaseHandler.instance;
    }
    // Register the disconnection handler
    public onSocketDisconnect(callback: () => void) {
        this.onDisconnect = callback;
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
private hardDisconnect(reason: string = "Socket lost"): void {
  if (this._isHardDisconnecting) return;
  this._isHardDisconnecting = true;

  try {
    console.log("[WS] hardDisconnect:", reason);

    this._metersSubscribed = false;
    this._lastOutputLevels.clear();

    for (const [port] of this._audioListeners) {
      this._notifyPortListeners(port, 0);
    }

    try { this.disableMicAndStop(); } catch (e) { console.warn("disableMicAndStop failed", e); }

    this.remoteAudioTrack = null;
    this.remoteStream = null;

    try { this.closePeerConnection(); } catch (e) { console.warn("closePeerConnection failed", e); }

    try { InCallManager.stop(); } catch (e) { console.warn("InCallManager.stop failed", e); }

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
    this._isHardDisconnecting = false;
    if (callback) {
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



  // return unsubscribe
  return () => {
    const s = this._audioListeners.get(port);
    if (s) {
      s.delete(cb);
      if (s.size === 0) this._audioListeners.delete(port);
    }
  };
}

public getAudioLevel(port: number): number {
  return this._lastOutputLevels.get(port) ?? 0;
}

  // small helper that only calls native method on iOS and if it exists
public safeCall = async (fnName: keyof AudioModeModuleType) => {
    if (Platform.OS !== 'ios') {
      // no-op on Android (or handle Android if you add implementation)
      return;
    }
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


public addOmniToList (intercomList: IntercomInfo[]): IntercomInfo[] {
    const intercomOmnis: IntercomInfo[] = []
    intercomList.forEach(intercom => {
      if (intercom.omniState){
        intercomOmnis.push(intercom)
      }
    });
    return intercomOmnis
  }

public addGroupToList (intercomList: IntercomInfo[]): IntercomInfo[] {
    const intercomGroups: IntercomInfo[] = []
    intercomList.forEach(intercom => {
      if (intercom.groupState && !intercom.omniState){
        intercomGroups.push(intercom)
      }
    });
    return intercomGroups
  }

/**
 * Route the given remote MediaStream’s audio to the speaker and start playback.
 * 
 * @param stream - The remote MediaStream you received in your 'track' handler.
 */


        
public closeSocket(): void {
  this.hardDisconnect("Client closing");
}


// Enable mic and add track to this.pc, then renegotiate
public async enableMicAndSend(): Promise<void> {
  if (!this.pc) {
    console.warn('enableMicAndSend: this.pc is not initialized yet');
    return;
  }



    if (Platform.OS === 'ios' && AudioModeModule?.setPlayAndRecordVoiceChat) {
      try {
        await AudioModeModule.setPlayAndRecordVoiceChat();
      } catch (e) {
        console.warn('AudioModeModule.setPlayAndRecordVoiceChat failed', e);
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

onRoleListener() {
  // set playback-only
  if (Platform.OS === 'ios' && AudioModeModule?.setPlayback) {
    AudioModeModule.setPlayback().catch((e: any) => console.warn('AudioModeModule.setPlayback failed', e));
  }

  try { InCallManager.stop(); } catch (e) { /* ignore */ }

  // disable mic and renegotiate
  this.disableMicAndStop();
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




public async connectSelectorSocket(uuid: string | null = null, isReconnect: boolean): Promise<void> {
    
    if (uuid){
        this.uuid = uuid
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this._metersSubscribed = false;
        console.log("[WS] creating socket", {
          time: Date.now(),
          state: AppState.currentState,
          url: `${this.api_url}/ws/player`,
        });
        this.socket = new WebSocket(`${this.api_url}/ws/player`); // adjust!
        const configuration = {
            iceServers: []
          };

        this.socket.onopen = async () => {
            if (!isReconnect){
                this.uuidOrNo(this.uuid)
            }
            else{
                if (this.templateInfo){
                    await this.playerJoin(this.templateInfo)
                };
            }

            try { this.subscribeMeters(); } catch (e) { console.warn("subscribeMeters on open failed", e); }
       }
        

        this.socket.onclose = () => {
          this.hardDisconnect("WebSocket closed");
        };

        this.socket.onerror = (event) => {
          console.warn("[WS] socket error", event);
          this.hardDisconnect("WebSocket error");
        };

        // Handle incoming messages
        this.socket.onmessage = async (event) => {




            const msg = JSON.parse(event.data);
      

            if (msg.action === 'webrtc_offer') {
            // --- Received offer from server (from Go via Python) ---
            console.log("[RTC] creating RTCPeerConnection", {
              time: Date.now(),
              state: AppState.currentState,
            });
            this.pc = new RTCPeerConnection(configuration);
            //startAudioStatsMonitor(this.pc)

            //Capture mic
            // new block
            const role = this.getRole ? this.getRole() : "listener";
            if (role === "selector") {


              
              await this.enableMicAndSend();
            } else {
              console.log("Listener role; skipping getUserMedia in connectSelectorSocket");
            }

            


            // Handle local ICE candidates
            this.pc.addEventListener('icecandidate', (e: RTCIceCandidateEvent<'icecandidate'>) => {
              console.log("[RTC] local ICE", { has: !!e.candidate, state: AppState.currentState });

              if (e.candidate && this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
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
            this.pc.addEventListener('track', (e: any) => {
              if (e.track) {
                this.remoteAudioTrack = e.track;
                console.log("Remote track kind", e.track.kind);
                console.log(this.remoteAudioTrack)
  
                this.playRemoteStream(); // your existing playback logic
              }
            });

            // Apply server's SDP offer
            const offerDesc = new RTCSessionDescription(msg.offer);
            await this.pc.setRemoteDescription(offerDesc);

            // Create answer
            const answerDesc = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answerDesc);

            // Send answer back to server (Python → Go)
            if (this.socket?.readyState === WebSocket.OPEN) {
              this.socket.send(JSON.stringify({
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
                
                if (this.socket && this.socket.readyState === WebSocket.OPEN && this.timecodeSetter){
                    this.timecodeSetter(msg.timecode)
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
                  } else {
                    this._playersMap.set(id, {
                      id,
                      active_ports: ports,
                      isSlave: !!(p.isSlave || p.is_slave || p.role === 'slave'),
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
              this._playersMap.clear();
              msg.players.forEach((p: any) => {
                const id = Number(p.id);
                if (!Number.isNaN(id)) {
                  const ports = Array.isArray(p.active_ports)
                    ? p.active_ports
                        .map((x: any) => Number(x))
                        .filter((x: number) => !Number.isNaN(x))
                        .map((n: number) => n + 1)   // convert 0-based → 1-based
                    : (p.active_port != null ? [Number(p.active_port) + 1] : []);
                    this._playersMap.set(id, {
                      id,
                      active_ports: ports,
                      isSlave: !!(p.isSlave || p.is_slave || p.role === 'slave'),
                      slaveColor: p.slaveColor ?? p.slave_color ?? null
                    });
                }
              });
              this._emitPlayersSnapshot();
            }

            if (msg.action === "slave_states" && Array.isArray(msg.slaves)) {
              this._playersMap.clear();
              msg.slaves.forEach((s: any) => {
                const id = Number(s.id);
                if (!Number.isNaN(id)) {
                  const ports = Array.isArray(s.active_ports)
                    ? s.active_ports.map((x: any) => Number(x)).filter((x: number) => !Number.isNaN(x)).map((n: number) => n) // server already uses 1-based
                    : [];
                  // store as-is (client expects 1-based), mark isSlave true, include color
                  this._playersMap.set(id, { id, active_ports: ports, isSlave: true, slaveColor: s.color ?? s.slaveColor ?? s.slave_color ?? null });
                }
              });
              this._emitPlayersSnapshot();
            }

            if (msg.action === "template_released") {
              this.hardDisconnect("Template released");
              router.push("/");
            }
            if (msg.action === "live_update") {
                if (this.socket && this.socket.readyState === WebSocket.OPEN && 
                    this.chosenTemplateSetter && 
                    this.inputInfoListSetter && 
                    this.intercomInfoListSetter && 
                    this.intercomOmniListSetter &&
                    this.intercomGroupListSetter)
                    {
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
        };
    }
}

// Send generic message through WS
private sendMessage(msg: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(msg));
    }
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
    return new Promise<[boolean, TemplateInfo | null]>((resolve, reject) => {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket is not connected'));
            return;
        }

        const fetchTemplateRequest = {  
            action: "get_template_from_uuid",
            uuid: uuid
        };

        const handleMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);
            if (message.action === "get_template_from_uuid") {

                this.socket?.removeEventListener('message', handleMessage);

                if (message.error) {
                    reject(new Error(message.error));
                } else {
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
                            isMaster: template.isMaster,
                            isSlave: template.isSlave,
                            slaveColor: template.slaveColor
                        };
                    }
                    
                    resolve([message.isExpired, templateInfo]);
                }
            }
        };

        this.socket.addEventListener('message', handleMessage);
        
        this.socket.send(JSON.stringify(fetchTemplateRequest));
    });
}


public async listenerJoin(templateInfo: TemplateInfo) {
    return new Promise<void>((resolve, reject) => {
        // Define the join message
        const joinMessage = {
            action: "listener_join",
            template: templateInfo
        };

        // Check WebSocket state
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket is not connected'));
            return;
        }

        // Listen for a one-time response
        const handleMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);

            if (message.action === "listener_join") {
                // Remove event listener after receiving the response
                this.socket?.removeEventListener('message', handleMessage);

                if (message.error) {
                    reject(new Error(message.error));  // Reject if there’s an error in the response
                } else {
                    // Resolve when the response is successfully received
                    resolve();
                }
            }
        };

        // Add event listener to handle the response
        this.socket.addEventListener('message', handleMessage);

        // Send the player join message
        this.socket.send(JSON.stringify(joinMessage));
        
    });
}

public async listenerChange(templateInfo: TemplateInfo): Promise<void> {
    const msg = {
        action: "listener_change",
        template: templateInfo,
    };
    this.sendMessage(msg);
}




// Player Join
public async playerJoin(templateInfo: TemplateInfo): Promise<void> {
    this.templateInfo = templateInfo
    return new Promise<void>((resolve, reject) => {
        // Define the join message
        const joinMessage = {
            action: "player_join",
            template: templateInfo,
        };

        // Check WebSocket state
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket is not connected'));
            return;
        }

        // Listen for a one-time response
        const handleMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);

            if (message.action === "player_join") {
                // Remove event listener after receiving the response
                this.socket?.removeEventListener('message', handleMessage);

                if (message.error) {
                    reject(new Error(message.error));  // Reject if there’s an error in the response
                } else {
                    // Resolve when the response is successfully received
                    resolve();
                }
            }
        };

        // Add event listener to handle the response
        this.socket.addEventListener('message', handleMessage);

        // Send the player join message
        this.socket.send(JSON.stringify(joinMessage));
        
    });
}
// Send Input On
public async sendInputOn(templateInfo: TemplateInfo, port: number, isIntercom: boolean): Promise<void> {
    const msg = {
        action: "input_on",
        template: templateInfo,
        port: port,
        type: "output",
        isIntercom: isIntercom
    };
    this.sendMessage(msg);
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

// Send Input Off
public async sendInputOff(templateInfo: TemplateInfo, port: number, isIntercom: boolean, isCleanup: boolean): Promise<void> {
    const msg = {
        action: "input_off",
        template: templateInfo,
        port: port,
        type: "output",
        isIntercom: isIntercom,
        isCleanup: isCleanup
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
public async sendOutputOff(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "output_off",
        template: templateInfo,
        port: port,
        type: "input",
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
      this.hardDisconnect("Listener exit");
    }

    public async playerExit(templateInfo: TemplateInfo | undefined): Promise<void> {
      const msg = {
        action: "player_exit",
        template: templateInfo,
      };

      this.sendMessage(msg);
      this.hardDisconnect("Player exit");
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

    public async fetchInputs(): Promise<InputInfo[]> {
        return new Promise<InputInfo[]>((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket is not connected'));
                return;
            }
    
            const fetchInputsRequest = {
                action: "get_inputs",
                template: {} // no template needed for fetching inputs
            };
    
            // Listen for a one-time response
            const handleMessage = (event: MessageEvent) => {
                const message = JSON.parse(event.data);
    
                if (message.action === "get_inputs") {
                    this.socket?.removeEventListener('message', handleMessage);
    
                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        const inputInfoList: InputInfo[] = message.inputs.map((input: any) => ({
                            port: input.port,
                            name: input.name,
                            picturePath: input.picturePath
                        }));
                        resolve(inputInfoList);
                    }
                }
            };
    
            this.socket.addEventListener('message', handleMessage);
    
            this.socket.send(JSON.stringify(fetchInputsRequest));
        });
    }

    public async fetchActivatedIntercoms(): Promise<IntercomInfo[]> {
        return new Promise<IntercomInfo[]>((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket is not connected'));
                return;
            }
    
            const fetchIntercomsRequest = {
                action: "get_activated_intercoms",
            };
    
            // Listen for a one-time response
            const handleMessage = (event: MessageEvent) => {
                const message = JSON.parse(event.data);
                if (message.action === "get_activated_intercoms") {
                    this.socket?.removeEventListener('message', handleMessage);
    
                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        const activatedInputInfoList = message.intercoms.map((intercom: any) => ({
                            id: intercom.id,
                            port: intercom.port,
                            name: intercom.name,
                            type: intercom.type,
                            isActivated: intercom.isActivated
                        }));
                        resolve(activatedInputInfoList);
                    }
                }
            };
    
            this.socket.addEventListener('message', handleMessage);
    
            this.socket.send(JSON.stringify(fetchIntercomsRequest));
        });
    }

    public async fetchActivatedInputs(): Promise<InputInfo[]> {
        return new Promise<InputInfo[]>((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket is not connected'));
                return;
            }
    
            const fetchInputsRequest = {
                action: "get_activated_inputs",
            };
    
            // Listen for a one-time response
            const handleMessage = (event: MessageEvent) => {
                const message = JSON.parse(event.data);
                if (message.action === "get_activated_inputs") {
                    this.socket?.removeEventListener('message', handleMessage);
    
                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        const activatedInputInfoList = message.inputs.map((input: any) => ({
                            id: input.id,
                            port: input.port,
                            name: input.name,
                            isActivated: input.isActivated
                        }));
                        resolve(activatedInputInfoList);
                    }
                }
            };
    
            this.socket.addEventListener('message', handleMessage);
    
            this.socket.send(JSON.stringify(fetchInputsRequest));
        });
    }

    public async fetchTemplates(): Promise<TemplateInfo[]> {
        return new Promise<TemplateInfo[]>((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket is not connected'));
                return;
            }
    
            const fetchTemplatesRequest = {
                action: "get_templates",
                template: {} // optional, no data needed
            };
    
            const handleMessage = (event: MessageEvent) => {
                const message = JSON.parse(event.data);
    
                if (message.action === "get_templates") {
                    this.socket?.removeEventListener('message', handleMessage);
    
                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        const templateInfoList: TemplateInfo[] = message.templates.map((template: any) => ({
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
                            isSlave: template.isSlave
                        }));
                        resolve(templateInfoList);
                    }
                }
            };
    
            this.socket.addEventListener('message', handleMessage);
    
            this.socket.send(JSON.stringify(fetchTemplatesRequest));
        });
    }
  
    // Optional: Method to update the API URL
    public setApiUrl(url: string): void {
      this.api_url = url;
    }
  }





