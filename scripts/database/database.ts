import axios from "axios";
import { TemplateInfo, InputInfo } from "../types"; // Adjust the import path if necessary
import { Link, router } from 'expo-router'


export class DatabaseHandler {
    private static instance: DatabaseHandler;
    private socket: WebSocket | null = null;
    private onDisconnect: (() => void) | null = null;
    private reconnectAttempts = 0;  // To track the number of reconnection attempts
    private maxReconnectAttempts = 3;  // Maximum number of attempts to reconnect
    public api_url: string;
  
    // Private constructor to prevent direct instantiation
    private constructor() {
      this.api_url = ""; // Set a default URL
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
    

public async connectSocket(): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.socket = new WebSocket(`${this.api_url}/ws/player`); // adjust!

        this.socket.onopen = () => {
            console.log("WebSocket connection established");
            this.reconnectAttempts = 0; // Reset the reconnect attempts on successful connection
            router.push("/template_selector")
        };

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message from server:", message);
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                setTimeout(() => this.connectSocket(), 2000);  // Retry after 2 seconds
            } else {
                console.log('Max reconnection attempts reached. Could not reconnect.');
                if (this.onDisconnect) {
                    this.onDisconnect();  // Notify when all attempts fail
                }
            }
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }
}

// Send generic message through WS
private sendMessage(msg: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(msg));
    } else {
        console.error("WebSocket is not open.");
    }
}

// Player Join
public async playerJoin(templateInfo: TemplateInfo): Promise<void> {
    
    const joinMessage = {
        action: "player_join",
        template: templateInfo,
    };
    this.sendMessage(joinMessage);
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
                            omniState: template.omniState
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




