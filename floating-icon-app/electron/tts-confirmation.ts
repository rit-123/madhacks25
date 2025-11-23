import { FishAudioClient } from "fish-audio";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { app } from "electron";

const execAsync = promisify(exec);

export interface VoiceConfig {
    /** Voice model ID from fish.audio - browse voices at https://fish.audio */
    referenceId?: string;
    /** TTS model version */
    model?: "speech-1.5" | "speech-1.6" | "v3-turbo" | "v3-hd";
    /** Emotion (v3 models only) */
    emotion?: "happy" | "sad" | "angry" | "fearful" | "disgusted" | "surprised" | "calm" | "fluent" | "auto";
    /** Audio format */
    format?: "mp3" | "wav" | "pcm" | "opus";
}

export class TTSConfirmation {
    private fishAudio: FishAudioClient;
    private affirmativePhrases: string[] = [
        "(excited) Got it!",
        "(excited) On it!",
        "(excited) Sure thing!",
        "(excited) Understood!",
        "(excited) Will do!",
        "(excited) Okay!",
        "(excited) Roger that!",
        "(excited) Absolutely!",
        "(excited) You got it!",
        "(excited) Right away!"
    ];

    // Voice configuration - customize these to change the voice!
    private voiceConfig: VoiceConfig = {
        referenceId: "536d3a5e000945adb7038665781a4aca", // Example: E-Girl Voice
        // model: "v3-turbo", // Use v3-turbo or v3-hd for emotion control
        // emotion: "happy", // Only works with v3 models
        format: "mp3"
    };

    constructor(apiKey: string, voiceConfig?: VoiceConfig) {
        this.fishAudio = new FishAudioClient({ apiKey });
        if (voiceConfig) {
            this.voiceConfig = { ...this.voiceConfig, ...voiceConfig };
        }
    }

    /**
     * Plays a random affirmative phrase using Fish Audio TTS
     */
    async playConfirmation(): Promise<void> {
        try {
            // Select a random phrase
            const phrase = this.affirmativePhrases[Math.floor(Math.random() * this.affirmativePhrases.length)];
            console.log(`Playing confirmation: "${phrase}"`);

            // Generate speech with voice configuration
            const audio = await this.fishAudio.textToSpeech.convert({
                text: phrase,
                ...(this.voiceConfig.referenceId && { reference_id: this.voiceConfig.referenceId }),
                ...(this.voiceConfig.model && { model: this.voiceConfig.model }),
                ...(this.voiceConfig.emotion && { emotion: this.voiceConfig.emotion }),
                ...(this.voiceConfig.format && { format: this.voiceConfig.format }),
            });

            // Convert to buffer and save temporarily
            const buffer = Buffer.from(await new Response(audio).arrayBuffer());
            const tempDir = app.getPath('temp');
            const audioPath = path.join(tempDir, `confirmation_${Date.now()}.mp3`);

            await writeFile(audioPath, buffer);
            console.log(`✓ Audio saved to ${audioPath}`);

            // Play the audio using afplay (macOS)
            await execAsync(`afplay "${audioPath}"`);

            // Clean up the temp file
            await unlink(audioPath);
            console.log('✓ Confirmation played successfully');
        } catch (error: any) {
            console.error('Error playing confirmation:', error.message);
            // Don't throw - we don't want confirmation failures to break the flow
        }
    }

    /**
     * Adds custom affirmative phrases to the list
     */
    addPhrases(phrases: string[]): void {
        this.affirmativePhrases.push(...phrases);
    }

    /**
     * Gets the current list of affirmative phrases
     */
    getPhrases(): string[] {
        return [...this.affirmativePhrases];
    }
}
