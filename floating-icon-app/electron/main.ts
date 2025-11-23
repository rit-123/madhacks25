import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { config } from 'dotenv'
import { AudioRecorder } from './recorder'
import { FishAudioTranscriber } from './transcriber'

// Load environment variables
config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let recorder: AudioRecorder | null = null
let transcriber: FishAudioTranscriber | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 100,
    height: 100,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers for recording and transcription
ipcMain.handle('start-recording', async () => {
  try {
    // Initialize recorder and transcriber if not already done
    if (!recorder) {
      recorder = new AudioRecorder();
    }

    if (!transcriber) {
      const apiKey = process.env.FISH_AUDIO_API_KEY;
      if (!apiKey) {
        throw new Error('FISH_AUDIO_API_KEY not found in environment variables');
      }
      transcriber = new FishAudioTranscriber(apiKey);
    }

    // Create temp file path
    const tempDir = app.getPath('temp');
    const outputFile = path.join(tempDir, `recording_${Date.now()}.wav`);

    console.log('Starting recording...');

    // Start recording (will stop on silence)
    await recorder.startRecording(outputFile);

    console.log('Recording complete, starting transcription...');

    // Transcribe the audio
    const result = await transcriber.transcribe(outputFile);

    // Clean up the temp file
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }

    if (result && (result.text || result.transcription)) {
      const transcribedText = (result.text || result.transcription) as string;
      console.log('Transcription:', transcribedText);

      // Execute agent_s3.py with the transcribed text
      console.log('Executing Agent S3...');
      const appRoot = process.env.APP_ROOT || path.join(__dirname, '..');
      const agentScriptPath = path.join(appRoot, 'agent-s2-example', 'agent_s3.py');

      // Use the specific conda environment python
      const pythonPath = '/opt/miniconda3/envs/agent_s/bin/python';

      await new Promise<void>((resolve, reject) => {
        const pythonProcess = spawn(pythonPath, [agentScriptPath, transcribedText], {
          env: process.env as NodeJS.ProcessEnv, // Pass environment variables
          stdio: 'inherit' // Pipe stdout/stderr to parent
        }) as any;

        pythonProcess.on('close', (code: number | null) => {
          if (code === 0) {
            console.log('Agent S3 completed successfully');
            resolve();
          } else {
            console.error(`Agent S3 exited with code ${code}`);
            reject(new Error(`Agent S3 exited with code ${code}`));
          }
        });

        pythonProcess.on('error', (err: Error) => {
          console.error('Failed to start Agent S3:', err);
          reject(err);
        });
      });

      return { success: true, text: transcribedText, fullResult: result };
    } else {
      return { success: false, error: 'No transcription result' };
    }
  } catch (error: any) {
    console.error('Recording/Transcription/Agent error:', error);
    return { success: false, error: error.message };
  }
})

app.whenReady().then(createWindow)
