# FishAudio Speech-to-Text Demo

This project demonstrates how to record audio and transcribe it using the FishAudio API. It includes both Python and JavaScript (Node.js) implementations.

## Prerequisites

- **FishAudio API Key**: You need an API key from [FishAudio](https://fish.audio/).
- **Microphone**: A working microphone is required.

## JavaScript (Node.js) Setup

### 1. Install Node.js
If you don't have Node.js installed:
1.  Go to [nodejs.org](https://nodejs.org/).
2.  Download the **LTS** (Long Term Support) version for Windows.
3.  Run the installer and follow the prompts. Ensure "Add to PATH" is selected.
4.  Restart your terminal/VS Code to ensure the changes take effect.

### 2. Install Dependencies
Open a terminal in this directory and run:
```bash
npm install
```
This will install the required packages: `naudiodon`, `wav`, `axios`, `dotenv`, `form-data`.

### 3. Run the Application
```bash
node index.js
```

### 4. Configuration
You can set your API key in a `.env` file (create one if it doesn't exist):
```
FISH_AUDIO_API_KEY=your_api_key_here
```
Or enter it when prompted by the script.

## Python Setup

### 1. Install Python
Ensure Python is installed (type `python --version` or `py --version`).

### 2. Install Dependencies
```bash
pip install -r requirements.txt
# OR
py -m pip install -r requirements.txt
```

### 3. Run the Application
```bash
python main.py
# OR
py main.py
```