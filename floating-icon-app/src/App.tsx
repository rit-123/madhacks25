import { useState, useEffect } from 'react'
import { usePorcupine } from '@picovoice/porcupine-react'
import electronLogo from '/electron-vite.svg'
import './App.css'

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
      setIsListening(true)
      setTimeout(() => setIsListening(false), 3000)
    }
  }, [keywordDetection])

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