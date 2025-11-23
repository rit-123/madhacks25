import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { config } from 'dotenv'
import { AudioRecorder } from './recorder'
import { FishAudioTranscriber } from './transcriber'
import { TTSConfirmation } from './tts-confirmation'

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
let ttsConfirmation: TTSConfirmation | null = null

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
      // Fix GPU and network crashes
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // Disable GPU acceleration to prevent crashes
      offscreen: false,
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

    if (!ttsConfirmation) {
      const apiKey = process.env.FISH_AUDIO_API_KEY;
      if (!apiKey) {
        throw new Error('FISH_AUDIO_API_KEY not found in environment variables');
      }
      ttsConfirmation = new TTSConfirmation(apiKey);
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

      // Play confirmation sound
      if (ttsConfirmation) {
        await ttsConfirmation.playConfirmation();
      }

      // First try step_agent run_agent function with the transcribed text
      console.log('Executing Step Agent...');
      const appRoot = process.env.APP_ROOT || path.join(__dirname, '..');
      const pythonPath = '/opt/miniconda3/envs/agent_s/bin/python';

      let stepAgentResult: any = null;
      let shouldFallbackToAgentS = false;

      try {
        // Call run_agent function and capture its output
        stepAgentResult = await new Promise<any>((resolve) => {
          let outputData = '';
          
          const pythonProcess = spawn(pythonPath, ['-c', `
import sys
import json
import os
sys.path.append('${path.join(appRoot, '..')}')
sys.path.append('${path.join(appRoot, '..', 'actions')}')
os.chdir('${path.join(appRoot, '..', 'actions')}')
from step_agent import run_agent

# Set up environment
os.environ['ANTHROPIC_API_KEY'] = os.environ.get('ANTHROPIC_API_KEY', '')

try:
    result = run_agent("${transcribedText.replace(/"/g, '\\"')}")
    # Output result as JSON for parsing
    print("STEP_AGENT_RESULT_START")
    print(json.dumps(result))
    print("STEP_AGENT_RESULT_END")
except Exception as e:
    print(f"Error running step agent: {e}")
    sys.exit(1)
          `], {
            env: process.env as NodeJS.ProcessEnv,
            stdio: ['pipe', 'pipe', 'pipe']
          }) as any;

          pythonProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString();
            console.log('Step Agent Output:', output);
            outputData += output;
          });

          pythonProcess.stderr.on('data', (data: Buffer) => {
            console.error('Step Agent Error:', data.toString());
          });

          pythonProcess.on('close', (code: number | null) => {
            if (code === 0) {
              // Parse the result from output
              const startMarker = 'STEP_AGENT_RESULT_START';
              const endMarker = 'STEP_AGENT_RESULT_END';
              const startIndex = outputData.indexOf(startMarker);
              const endIndex = outputData.indexOf(endMarker);
              
              if (startIndex !== -1 && endIndex !== -1) {
                const jsonStr = outputData.substring(startIndex + startMarker.length, endIndex).trim();
                try {
                  const result = JSON.parse(jsonStr);
                  resolve(result);
                } catch (parseError) {
                  console.error('Failed to parse step agent result:', parseError);
                  resolve(null);
                }
              } else {
                console.error('Could not find result markers in output');
                resolve(null);
              }
            } else {
              console.error(`Step Agent exited with code ${code}`);
              resolve(null);
            }
          });

          pythonProcess.on('error', (err: Error) => {
            console.error('Failed to start Step Agent:', err);
            resolve(null);
          });
        });

        // Inspect the step agent result
        console.log('Step Agent Result:', stepAgentResult);
        
        if (!stepAgentResult || 
            !stepAgentResult.status || 
            stepAgentResult.status === 'handoff' ||
            stepAgentResult.status === 'incomplete') {
          console.log('Step Agent needs fallback - proceeding with Agent S3');
          shouldFallbackToAgentS = true;
        } else if (stepAgentResult.status === 'complete') {
          console.log('Step Agent completed successfully - skipping Agent S3');
          shouldFallbackToAgentS = false;
        } else {
          console.log('Step Agent returned unexpected status - proceeding with Agent S3');
          shouldFallbackToAgentS = true;
        }

      } catch (error) {
        console.error('Step Agent execution failed:', error);
        shouldFallbackToAgentS = true;
      }

      // Fallback to Agent S3 if needed
      if (shouldFallbackToAgentS) {
        console.log('Executing Agent S3 as fallback...');
        const agentScriptPath = path.join(appRoot, 'agent-s2-example', 'agent_s3.py');

        // Use remaining steps prompt if available, otherwise use original transcribed text
        const taskForAgentS3 = stepAgentResult?.handoff?.remaining_steps_prompt || transcribedText;
        console.log('Task for Agent S3:', taskForAgentS3);

        await new Promise<void>((resolve, reject) => {
          const pythonProcess = spawn(pythonPath, [agentScriptPath, taskForAgentS3], {
            env: process.env as NodeJS.ProcessEnv,
            stdio: 'inherit'
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
      }

      return { success: true, text: transcribedText, fullResult: result };
    } else {
      return { success: false, error: 'No transcription result' };
    }
  } catch (error: any) {
    console.error('Recording/Transcription/Agent error:', error);
    return { success: false, error: error.message };
  }
})

// Disable GPU acceleration to prevent crashes
app.disableHardwareAcceleration()

// Add command line switches to prevent GPU and network crashes
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

app.whenReady().then(createWindow)
