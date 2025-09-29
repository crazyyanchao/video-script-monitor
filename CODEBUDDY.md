# Video Script Monitor - CodeBuddy Guide

## Project Overview

This is an AI video generation project visualization monitor system that provides real-time monitoring of video content creation processes. The system monitors local file directories and visualizes video production assets (images, audio, video, scripts) on a timeline interface.

## Architecture

### Technology Stack
- **Backend**: Node.js + TypeScript with Express.js
- **Frontend**: React + TypeScript with Vite
- **File Monitoring**: chokidar for real-time file system watching
- **Real-time Communication**: WebSocket for live updates
- **Visualization**: D3.js for timeline components
- **State Management**: Zustand
- **Storage**: In-memory (no database required)

### Project Structure (Planned)
```
video-script-monitor/
├── src/
│   ├── backend/                 # Backend services
│   │   ├── fileWatcher.ts      # File monitoring service
│   │   ├── scriptParser.ts     # script.json parsing
│   │   ├── websocket.ts        # WebSocket server
│   │   └── server.ts           # Express server
│   ├── frontend/               # Frontend React app
│   │   ├── components/         # React components
│   │   │   ├── Timeline.tsx    # Timeline visualization
│   │   │   ├── AssetCard.tsx   # Asset display cards
│   │   │   └── DetailPanel.tsx # Detail view panel
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API services
│   │   └── store/              # State management
│   └── shared/                 # Shared code
│       └── types/              # TypeScript type definitions
├── public/                     # Static assets
└── package.json
```

## Core Data Flow

### File Monitoring Pipeline
1. **File Changes** → chokidar watcher → **File Type Identification** → **Data Parsing** → **Memory Update** → **WebSocket Broadcast** → **Frontend Re-render**

### Key Data Structures

#### Video Task
```typescript
interface VideoTask {
  videoId: string;
  title: string;
  status: 'processing' | 'completed';
  scriptPath: string;
  assets: AssetFile[];
  shots: ShotDetail[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Asset File
```typescript
interface AssetFile {
  fileId: string;
  videoId: string;
  fileType: 'image' | 'audio' | 'video' | 'prompt';
  filePath: string;
  fileName: string;
  createdAt: Date;
  fileSize: number;
}
```

## Development Commands

Based on the project specification, these are the expected development commands:

### Installation
```bash
npm install
```

### Development Servers
```bash
# Start backend development server
npm run dev:backend

# Start frontend development server  
npm run dev:frontend
```

### Port Configuration
- **Backend**: Port 8080
- **Frontend**: Port 3000

## Key Implementation Details

### File Monitoring
- Uses chokidar to monitor specific video task directories (e.g., `vid_3213129sadjjasdi8`)
- Automatically detects file types: images (.jpg), audio (.mp3/.wav), video (.mp4), prompts (.prompt)
- Triggers real-time updates on file creation, modification, or deletion

### Script Parsing
- Parses `script.json` files for video production metadata
- Extracts shot information, audio configurations, and timeline data
- Provides real-time script updates when files change

### Timeline Visualization
- Horizontal timeline showing video production progress
- Supports dual-task display for comparing two video productions
- Shows asset previews, shot types (CU/MS/LS), durations, and descriptions

### Real-time Updates
- WebSocket-based communication between backend and frontend
- Automatic UI updates when new assets are detected
- No manual refresh required

## Development Notes

- The project uses memory storage (no database required)
- Real-time monitoring is a core feature - ensure WebSocket connections are stable
- File paths should be configurable to point to actual video production directories
- The timeline component (D3.js) is complex and will require careful implementation
- Error handling should account for file system access issues and malformed script.json files