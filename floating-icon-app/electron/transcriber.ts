import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';

interface TranscriptionResult {
    text?: string;
    transcription?: string;
    [key: string]: any;
}

export class FishAudioTranscriber {
    private apiKey: string;
    private baseUrl: string = "https://api.fish.audio/v1/asr";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        if (!this.apiKey) {
            throw new Error("API Key is required.");
        }
    }

    async transcribe(audioFilePath: string, language: string = "en"): Promise<TranscriptionResult | null> {
        if (!fs.existsSync(audioFilePath)) {
            throw new Error(`Audio file not found: ${audioFilePath}`);
        }

        const formData = new FormData();
        formData.append('audio', fs.createReadStream(audioFilePath));
        formData.append('language', language);
        formData.append('ignore_timestamps', 'true');

        try {
            const response = await axios.post(this.baseUrl, formData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...formData.getHeaders()
                }
            });

            return response.data;
        } catch (error: any) {
            console.error("Error during transcription:", error.message);
            if (error.response) {
                console.error("Response data:", error.response.data);
            }
            return null;
        }
    }
}
