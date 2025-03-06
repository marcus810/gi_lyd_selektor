import axios from "axios";
import { TemplateInfo, InputInfo } from "../selector_scripts/types"; // Adjust the import path if necessary

const API_URL = "http://192.168.0.13:8080";


export const sendInputAndOutputInfo = async (templateInfoList: TemplateInfo[], inputInfoList: InputInfo[]) => {
    sendTemplateInfo(templateInfoList)
    sendInputInfo(inputInfoList)
}
const sendTemplateInfo = async (templateInfoList: TemplateInfo[]): Promise<void> => {
    try {
        const response = await axios.post(`${API_URL}/post_templates`, {
            templates: templateInfoList
        });
        console.log("Data successfully sent:", response.data);
    } catch (error) {
        console.error("Error sending data:", error);
    }
};

const sendInputInfo = async (inputInfoList: InputInfo[]): Promise<void> => {
    try {
        const response = await axios.post(`${API_URL}/post_inputs`, {
            inputs: inputInfoList
        });
        console.log("Data successfully sent:", response.data);
    } catch (error) {
        console.error("Error sending data:", error);
    }
};

export const fetchInputs = async (): Promise<InputInfo[]> => {
    try {

        // Fetch inputs from the backend
        const response = await axios.post(`${API_URL}/get_inputs`);
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

export const fetchTemplates = async (): Promise<TemplateInfo[]> => {
    try {
        // Fetch templates from the backend
        const response = await axios.post(`${API_URL}/get_templates`);
        const data = response.data;  // assuming the API returns the list of templates

        // Transform the data into TemplateInfo format
        const templateInfoList: TemplateInfo[] = data.map((template: any) => {
            

            return {
                id: template.id,
                noDelayPort: template.noDelayPort,
                delayPort: template.delayPort,
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