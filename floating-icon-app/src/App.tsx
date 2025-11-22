import { useState, useEffect } from 'react'
import { usePorcupine } from '@picovoice/porcupine-react'
import electronLogo from '/electron-vite.svg'
import './App.css'

// Extend Window interface to include ipcRenderer
declare global {
  interface Window {
    ipcRenderer: {
      on: (...args: any[]) => void
      off: (...args: any[]) => void
      send: (...args: any[]) => void
      invoke: (...args: any[]) => Promise<any>
      startRecording: () => Promise<{ success: boolean; text?: string; error?: string }>
    }
  }
}

function App() {
  const [isListening, setIsListening] = useState(false)

  const {
    keywordDetection,
    isLoaded,
    isListening: isPorcupineListening,
    error,
    init,
    start,
    stop,
    release,
  } = usePorcupine()

  // Initialize Porcupine
  useEffect(() => {
    const porcupineKeyword = {
      publicPath: '/alexa_wasm.ppn',
      label: 'alexa',
    }

    const porcupineModel = {
      publicPath: '/porcupine_params.pv',
    }

    init(
      import.meta.env.VITE_PICOVOICE_ACCESS_KEY,
      porcupineKeyword,
      porcupineModel
    )
  }, [])

  // Start listening once loaded
  useEffect(() => {
    if (isLoaded) {
      start()
    }
  }, [isLoaded])

  // Handle wake word detection
  useEffect(() => {
    if (keywordDetection !== null) {
      console.log('Porcupine detected:', keywordDetection.label)
      handleWakeWordDetected()
    }
  }, [keywordDetection])

  // Handle recording and transcription when wake word is detected
  const handleWakeWordDetected = async () => {
    setIsListening(true)

    try {
      console.log('Starting recording...')
      const result = await window.ipcRenderer.startRecording()

      if (result.success) {
        console.log('Transcription result:', result.text)
        // You can do something with the transcribed text here
        // For example, send it to another service or display it
      } else {
        console.error('Recording/Transcription failed:', result.error)
      }
    } catch (error) {
      console.error('Error during recording:', error)
    } finally {
      // Return to normal icon state
      setIsListening(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      release()
    }
  }, [])

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Porcupine error:', error)
    }
  }, [error])

  return (
    <div className={`draggable-icon ${isListening ? 'listening' : ''}`}>
      {error && <div className="error">Error: {error.message}</div>}
      {isListening ? (
        <div className="listening-indicator">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      ) : (
        <img src={electronLogo} className="logo" alt="Electron logo" />
      )}
    </div>
  )
}

export default App