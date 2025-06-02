import { TemplateInfo, InputInfo, IntercomInfo } from "../types"; // Adjust the import path if necessary
import { Link, router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { VolumeManager } from 'react-native-volume-manager';
import InCallManager from 'react-native-incall-manager';
import { PermissionsAndroid, Platform } from 'react-native';

import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    MediaStream,
    MediaStreamTrack as RNMediaStreamTrack
  } from 'react-native-webrtc';  
import RTCIceCandidateEvent from "react-native-webrtc/lib/typescript/RTCIceCandidateEvent";
import SystemSetting from 'react-native-system-setting';


export class DatabaseHandler {
    private static instance: DatabaseHandler;
    private socket: WebSocket | null = null;
    private onDisconnect: (() => void) | null = null;
    private reconnectAttempts = 0;  // To track the number of reconnection attempts
    private maxReconnectAttempts = 3;  // Maximum number of attempts to reconnect
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
    public timecodeSetter: ((newTimecode: string) => void) | null
    public remoteAudioTrack: RNMediaStreamTrack | null = null;
    private volumeListener: any = null;
    private volumeListenerId: string | null = null;
    public isMuted: boolean = true
  
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

        this.requestMicrophonePermission()
        // Start the call and route audio to speaker
        InCallManager.start({ media: 'audio' });
        InCallManager.setSpeakerphoneOn(false);

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


public async uuidOrNo(uuid: string | null): Promise<void> {
    try{
        if (uuid){
            const [expired, templateInfo] = await this.getTemplateFromUuid(uuid);

            if (expired){
                router.push("/selector_choice")
            }
            else{
                const templateData = JSON.stringify(templateInfo); // Serialize the object to pass as a string
                router.push(`/selektor?template=${encodeURIComponent(templateData)}`)
            }
        }
        else{
            router.push("/selector_choice")
        }
    } catch (error) {
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
        console.log(this.isMuted)
      InCallManager.setSpeakerphoneOn(!this.isMuted);
      this.remoteAudioTrack.enabled = !this.isMuted;
      
    }

    // … your existing WebRTC setup …

    // 1) Log and apply the *initial* volume
    // try {
    //  const { volume: initialVol } = await VolumeManager.getVolume();
    //  console.log('Initial volume:', initialVol);
    //  this.handleVolumeChange(initialVol);
    // } catch (err) {
    // }

    // 2) Subscribe to *future* volume changes
    // if (!this.volumeListener) {
    //  this.volumeListener = VolumeManager.addVolumeListener(result => {
    //    this.handleVolumeChange(result.volume);
    //  });
    //}
  }

  // Your existing mute logic
  private handleVolumeChange(volume: number) {
    const isMuted = volume <= 0.10;
    if (this.remoteAudioTrack) {
      this.remoteAudioTrack.enabled = !isMuted;
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
    if (this.socket) {
      // 1) Prevent further reconnect attempts
      this.reconnectAttempts = this.maxReconnectAttempts;

      // 2) Remove all event handlers so no callbacks fire after close
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;

      // 3) Close the socket (no-op if already closed) :contentReference[oaicite:0]{index=0}
      this.socket.close(1000, "Client closing");  

      // 4) Clear our reference
      this.socket = null;
    }
  }
public async connectSelectorSocket(uuid: string | null = null, isReconnect: boolean): Promise<void> {
    
    if (uuid){
        this.uuid = uuid
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        
        this.socket = new WebSocket(`${this.api_url}/ws/player`); // adjust!
        const configuration = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          };

        this.socket.onopen = async () => {

            

            this.reconnectAttempts = 0; // Reset the reconnect attempts on successful connection
            


            if (!isReconnect){
                this.uuidOrNo(this.uuid)
            }
            else{
                if (this.templateInfo){
                    await this.playerJoin(this.templateInfo)
                };
            }
       }
        

        this.socket.onclose = () => {
  

            if (this.reconnectAttempts < this.maxReconnectAttempts) {

                this.reconnectAttempts++;

                setTimeout(() => this.connectSelectorSocket(null, true), 2000);  // Retry after 2 seconds
            } else {

                if (this.onDisconnect) {
                    this.onDisconnect();  // Notify when all attempts fail
                }
            }
        };

        // Handle incoming messages
        this.socket.onmessage = async (event) => {

            
            
            const msg = JSON.parse(event.data);

            if (msg.action === 'webrtc_offer') {
                // --- Received offer from server ---

                this.pc = new RTCPeerConnection(configuration);
            
                // Handle local ICE candidates by sending them to the server
                this.pc.addEventListener(
                    'icecandidate',
                    (e: RTCIceCandidateEvent<'icecandidate'>) => {
                      if (e.candidate) {
                        if (this.socket && this.socket.readyState === WebSocket.OPEN){
                        this.socket.send(JSON.stringify({
                          action: 'webrtc_ice',
                          candidate: {
                            candidate:      e.candidate.candidate,
                            sdpMid:         e.candidate.sdpMid,
                            sdpMLineIndex:  e.candidate.sdpMLineIndex
                          }
                        }));}
                      }
                    }
                  );
                  
                this.pc.addEventListener<'track'>(
                    'track',
                    (e) => {
                      // e is inferred as RTCTrackEvent<'track'>
                      if (e.track) {
                        this.remoteAudioTrack = e.track;
                        this.playRemoteStream()
                      }
                    }
                  );
                // Apply the server's SDP offer as the remote description
                const offerDesc = new RTCSessionDescription(msg.offer);
                await this.pc.setRemoteDescription(offerDesc);
            
                // Create answer and set as local description
                const answerDesc = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answerDesc);
            
                // Send the answer back to server
                if (this.socket && this.socket.readyState === WebSocket.OPEN){
                this.socket.send(JSON.stringify({
                  action: 'webrtc_answer',
                  answer: { type: answerDesc.type, sdp: answerDesc.sdp }
                }));}

            
              } else if (msg.action === 'webrtc_ice') {
                // --- Received ICE candidate from server ---
                if (this.pc) {
                  try {
                    const candidate = new RTCIceCandidate(msg.candidate);
                    await this.pc.addIceCandidate(candidate);
                  } catch (err) {

                  }
                }
              }
            
            if (msg.action === "ltc"){
                
                if (this.socket && this.socket.readyState === WebSocket.OPEN && this.timecodeSetter){
                    this.timecodeSetter(msg.timecode)
                }
            }

            if (msg.action === "template_released") {


                // Close the WebSocket connection after handling the "template_released" message
                if (this.socket && this.socket.readyState === WebSocket.OPEN){
                    this.templateInfo = null
                    this.closeSocket()
                    router.push("/")
                }

            }
            if (msg.action === "live_update") {
                if (this.socket && this.socket.readyState === WebSocket.OPEN && 
                    this.chosenTemplateSetter && 
                    this.inputInfoListSetter && 
                    this.intercomInfoListSetter && 
                    this.intercomOmniListSetter &&
                    this.intercomGroupListSetter )
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
                            intercomInfo: template.intercomInfo || [],
                            delay: template.delay,
                            omniState: template.omniState,
                            omniName: template.omniName,
                            groupState: template.groupState,
                            groupName: template.groupName,
                            deviceUuid: template.device_uuid,
                            deviceExpiryDate: template.deviceExpiryDate
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
public async sendInputOn(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "input_on",
        template: templateInfo,
        port: port,
    };
    this.sendMessage(msg);
}

// Send Input Off
public async sendInputOff(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "input_off",
        template: templateInfo,
        port: port,
    };
    this.sendMessage(msg);
}

// Send Output On
public async sendOutputOn(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "output_on",
        template: templateInfo,
        port: port,
    };
    this.sendMessage(msg);
}

// Send Output Off
public async sendOutputOff(templateInfo: TemplateInfo, port: number): Promise<void> {
    const msg = {
        action: "output_off",
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
        this.closeSocket()
        this.sendMessage(msg);
    }

    public async playerExit(templateInfo: TemplateInfo | undefined): Promise<void> {
        const msg = {
            action: "player_exit",
            template: templateInfo,
            
        };
        this.sendMessage(msg);
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
                            intercomInfo: template.intercomInfo || [],
                            delay: template.delay,
                            omniState: template.omniState,
                            omniName: template.omniName,
                            groupState: template.groupState,
                            groupName: template.groupName,
                            deviceUuid: template.deviceUuid,
                            deviceExpiryDate: template.deviceExpiryDate
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




