# 🤖 JARVIS - Your Autonomous Desktop Agent

<div align="center">

![JARVIS Logo](https://img.shields.io/badge/JARVIS-Desktop%20Agent-blue?style=for-the-badge&logo=robot)

**The future of desktop automation is here. Meet JARVIS - your fully autonomous desktop assistant inspired by Tony Stark's AI companion.**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/electron-30+-purple.svg)](https://electronjs.org)

</div>

---

## 🌟 What is JARVIS?

JARVIS is a revolutionary desktop agent that brings the power of AI directly to your computer. Just like Tony Stark's AI assistant, JARVIS sits quietly in the background, waiting for your voice command to spring into action and execute complex desktop tasks with unprecedented intelligence and speed.

### ✨ Key Features

🎤 **Wake Word Detection** - Simply say "Jarvis" to activate your assistant  
🗣️ **Advanced Speech Recognition** - Powered by Fish Audio's cutting-edge transcription  
🧠 **Smart Model Switching** - Intelligent routing between fast custom controller and Agent-S for optimal performance  
🔄 **Seamless Handoff** - Automatic escalation to Agent-S for complex multi-step reasoning  
🎯 **Floating UI** - Unobtrusive floating icon with beautiful Siri-like animations  

---

## 🏗️ Architecture

JARVIS employs a sophisticated multi-layered architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Wake Word     │───▶│  Fish Audio      │───▶│  Smart Router   │
│   Detection     │    │  Transcription   │    │                 │
│  (Porcupine)    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Decision Engine │
                                               └─────────────────┘
                                                    │         │
                                              Simple│         │Complex
                                                    ▼         ▼
                                         ┌─────────────┐ ┌─────────────┐
                                         │   Custom    │ │   Agent-S   │
                                         │ Controller  │ │  (Advanced) │
                                         │   (Fast)    │ │             │
                                         └─────────────┘ └─────────────┘
```

### 🔧 Tech Stack

- **Frontend**: React + TypeScript + Electron
- **Backend**: Python + Node.js
- **Wake Word**: Picovoice Porcupine
- **Speech-to-Text**: Fish Audio API
- **AI Agents**: Custom Step Agent + Agent-S3
- **Desktop Control**: PyAutoGUI + Custom Controllers
- **Voice Feedback**: Fish Audio TTS

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Python 3.8+** - [Download here](https://python.org/)
- **Miniconda/Anaconda** - For Agent-S environment
- **API Keys**:
  - Fish Audio API Key - [Get yours](https://fish.audio/)
  - Anthropic API Key - For Claude integration
  - Picovoice Access Key - For wake word detection

### 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/jarvis-desktop-agent.git
   cd jarvis-desktop-agent
   ```

2. **Set up Python environment**
   ```bash
   # Create conda environment for Agent-S
   conda create -n agent_s python=3.8
   conda activate agent_s
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies**
   ```bash
   cd floating-icon-app
   npm install
   ```

4. **Configure environment variables**
   ```bash
   # Create .env file in root directory
   FISH_AUDIO_API_KEY=your_fish_audio_key
   ANTHROPIC_API_KEY=your_anthropic_key
   VITE_PICOVOICE_ACCESS_KEY=your_picovoice_key
   ```

5. **Build and run**
   ```bash
   # Build the Electron app
   npm run build
   
   # Or run in development mode
   npm run dev
   ```

---

## 🎯 Usage

1. **Launch JARVIS** - Run the application and you'll see a floating icon
2. **Say the wake word** - Simply say "Jarvis" to activate
3. **Give your command** - Speak naturally: "Open Chrome and search for AI news"
4. **Watch the magic** - JARVIS intelligently chooses the best approach and executes your task

### Example Commands

- 🌐 "Open Google and search for machine learning tutorials"
- 📝 "Create a new document and write a meeting summary"
- 📧 "Check my email and reply to the latest message"
- 🎵 "Play my favorite playlist on Spotify"
- 📊 "Open Excel and create a budget spreadsheet"

---

## 🧠 Smart Model Switching

JARVIS's intelligence lies in its ability to choose the right tool for the job:

### Custom Controller (Fast Lane) ⚡
- **Speed**: 2x faster than traditional agents
- **Use Cases**: Simple clicks, typing, basic navigation
- **Examples**: Opening apps, clicking buttons, form filling

### Agent-S (Power Lane) 🚀  
- **Capability**: Complex multi-step reasoning
- **Use Cases**: Advanced workflows, problem-solving, context-aware tasks
- **Examples**: Research tasks, complex document creation, troubleshooting

The decision engine automatically routes tasks based on complexity analysis, ensuring optimal performance for every command.

---

## 🎨 Features in Detail

### 🎤 Wake Word Detection
- Uses Picovoice Porcupine for accurate "Jarvis" detection
- Low latency, privacy-focused (runs locally)
- Customizable sensitivity settings

### 🗣️ Speech Recognition  
- Fish Audio's state-of-the-art transcription
- Multi-language support
- Noise-robust processing

### 🎭 Voice Feedback
- Natural TTS responses using Fish Audio
- Customizable voice personalities
- Emotional expressions and confirmations

### 🖥️ Desktop Control
- Cross-platform screen capture and control
- Intelligent element detection and interaction
- Safe execution with error handling

---

## 🔧 Configuration

Customize JARVIS to your preferences:

```javascript
// Voice Configuration
const voiceConfig = {
  referenceId: "your_preferred_voice_id",
  emotion: "excited", // happy, calm, fluent, etc.
  model: "v3-turbo"
};

// Agent Configuration  
const agentConfig = {
  maxSteps: 20,
  stepDelay: 0.5,
  useGrounding: true
};
```

## 🙏 Acknowledgments

- **Picovoice** - For excellent wake word detection
- **Fish Audio** - For cutting-edge speech technology  
- **Agent-S Team** - For the powerful desktop automation framework
- **Tony Stark** - For the inspiration 😉

---

<div align="center">

**Built with ❤️ for the future of human-computer interaction**

[⭐ Star this repo](https://github.com/yourusername/jarvis-desktop-agent) | [🐛 Report Bug](https://github.com/yourusername/jarvis-desktop-agent/issues) | [💡 Request Feature](https://github.com/yourusername/jarvis-desktop-agent/issues)

</div>
