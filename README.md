
# Example.com - AI-Powered Streaming Platform

**Example.com** is a modern video streaming application that redefines the viewing experience by integrating a real-time **AI Companion**. 

Built with **React**, **Tailwind CSS**, and the **Google Gemini Live API**, this application allows users to watch videos while conversing with an AI that "sees" what they see and "hears" what they say.

## 🚀 Key Features

### 🎥 Premium Streaming Interface
- **Cinema Mode**: A dark, immersive UI designed for content consumption.
- **Responsive Layout**: Features a split-screen theater mode on desktop and a vertical scroll layout on mobile.
- **Recommendations Engine**: A content-based filtering system that suggests "Up Next" and "More Like This" videos based on the current film's metadata.

### ✨ Gemini Live Companion
The core innovation of Example.com is the **Live AI Companion**:
- **Visual Awareness**: The app captures frames from the active video element 1fps and streams them to the Gemini model. The AI knows exactly which scene you are watching.
- **Context Injection**: The system instruction automatically updates with the film's title and description, giving the AI deep narrative context.
- **Real-time Voice**: Users can talk naturally to the AI via microphone, and the AI responds with low-latency generated audio (using the `Zephyr` voice).
- **Interactive Visualizer**: A reactive audio visualizer indicates when the AI is listening and speaking.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (v4)
- **AI**: `@google/genai` SDK (Gemini Live API)
- **Audio**: Web Audio API (PCM 16-bit encoding/decoding)

## 📋 Usage

1. **Select a Video**: Choose from the curated list of AI-generated content.
2. **Start Watching**: The player supports standard controls (Play/Pause, Fullscreen).
3. **Activate Companion**: Click the **"Ask AI Companion"** button in the sidebar.
   - *Note: Microphone permission is required.*
4. **Chat**: Ask questions like "Who is that character?" or "What is happening in this scene?", and the AI will answer based on the visual feed.

## 🔒 Privacy & Permissions

- **Microphone**: Used only when the AI Companion session is active.
- **Video Data**: Frames are sent to the API only during an active session to provide visual context.

---

*Powered by Google Gemini*
