import axios from "axios";
import { TemplateInfo, InputInfo } from "../types"; // Adjust the import path if necessary



export class DatabaseHandler {
    private static instance: DatabaseHandler;
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

    public async sendInputAndOutputInfo(templateInfoList: TemplateInfo[], inputInfoList: InputInfo[]){
        this.sendTemplateInfoList(templateInfoList)
        this.sendInputInfo(inputInfoList)
    }
    
    public async sendInputOn(templateInfo: TemplateInfo, port: number): Promise<void>{
        try {
            const response = await axios.post(`${this.api_url}/post_input_on`, {
                template: templateInfo,
                port: port
            });
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    };
    
    public async sendInputOff(templateInfo: TemplateInfo, port: number): Promise<void>{
        try {
            const response = await axios.post(`${this.api_url}/post_input_off`, {
                template: templateInfo,
                port: port
            });
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    };
    
    public async sendOutputOn(templateInfo: TemplateInfo, port: number): Promise<void> {
        try {
            const response = await axios.post(`${this.api_url}/post_output_on`, {
                template: templateInfo,
                port: port
            });
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    };
    
    public async sendOutputOff(templateInfo: TemplateInfo, port: number): Promise<void>{
        try {
            const response = await axios.post(`${this.api_url}/post_output_off`, {
                template: templateInfo,
                port: port
            });
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    };

    public async playerJoin(templateInfo: TemplateInfo): Promise<void>{
        try {
            const response = await axios.post(`${this.api_url}/player_join`, {
                template: templateInfo,
            })
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.log("Error sending data:", error);
        }
    }

    public async playerExit(templateInfo: TemplateInfo): Promise<void>{
        try {
            const response = await axios.post(`${this.api_url}/player_exit`, {
                template: templateInfo,
            })
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.log("Error sending data:", error);
        }
    }
    
    public async sendTemplateInfoList(templateInfoList: TemplateInfo[]): Promise<void> {
        try {
            const response = await axios.post(`${this.api_url}/post_templates`, {
                templates: templateInfoList
            });
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    };
    
    public async sendInputInfo(inputInfoList: InputInfo[]): Promise<void> {
        try {
            const response = await axios.post(`${this.api_url}/post_inputs`, {
                inputs: inputInfoList
            });
            console.log("Data successfully sent:", response.data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    };
    
    public async fetchInputs(): Promise<InputInfo[]> {
        try {
    
            // Fetch inputs from the backend
            const response = await axios.post(`${this.api_url}/get_inputs`);
            const data = response.data;  // assuming the API returns the list of inputs
    
            // Transform the data into InputInfo format
            const inputInfoList: InputInfo[] = data.map((input: any) => {
                return {
                    port: input.port,
                    name: input.name,
                    picturePath: input.picturePath,
                };
            });
    
            return inputInfoList;
        } catch (error) {
            console.error('Error fetching inputs:', error);
            console.log('Full error details:', JSON.stringify(error, null, 2)); // Logs full error object in readable format
            throw new Error('Failed to fetch inputs');
        }
    };

    public async fetchTemplates(): Promise<TemplateInfo[]> {
        try {
            // Fetch templates from the backend
            const response = await axios.post(`${this.api_url}/get_templates`);
            const data = response.data;  // assuming the API returns the list of templates
    
            // Transform the data into TemplateInfo format
            const templateInfoList: TemplateInfo[] = data.map((template: any) => {
                return {
                    id: template.id,
                    noDelayPort: template.noDelayPort,
                    delayPort: template.delayPort,
                    micPort: template.micPort,
                    intercomInfo: template.intercomInfo || [],  // ensure intercomInfo is an empty array if not present
                };
            });
    
            return templateInfoList;
        } catch (error) {
            console.error('Error fetching templates:', error);
            console.log('Full error details:', JSON.stringify(error, null, 2)); // Logs full error object in readable format
            throw new Error('Failed to fetch templates');
        }
    };
  
    // Optional: Method to update the API URL
    public setApiUrl(url: string): void {
      this.api_url = url;
    }
  }




