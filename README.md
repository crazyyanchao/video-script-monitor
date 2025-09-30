# Video Script Monitor

[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![中文文档](https://img.shields.io/badge/中文文档-点击查看-orange)](README-zh.md)

Real-time Video Script and Asset Monitoring Tool | AI Video Generation Project Visualization Monitoring System

## Features

- 📊 Real-time file monitoring and change detection
- 🎬 Timeline visualization display
- 🔔 WebSocket real-time communication
- 📁 Multi-type file support (images, audio, video, prompts)
- 👁️ Real-time preview and detail display

## Tech Stack

- **Backend**: Node.js + TypeScript + Express + WebSocket
- **Frontend**: React + TypeScript + Vite + D3.js
- **File Monitoring**: chokidar
- **State Management**: Zustand
- **Package Manager**: pnpm

## Quick Start

### Prerequisites

- Node.js >= 16.0.0
- pnpm >= 8.0.0

### Install Dependencies

```bash
pnpm install
```

### Configuration

#### Watch Directory Configuration

The system monitors a configurable directory for video tasks. You can set the watch directory using environment variables:

**Option 1: Environment Variable**
```bash
# Set watch directory via environment variable
export WATCH_DIRECTORY="/path/to/your/watch/directory"
```

**Option 2: .env File**
```bash
# Copy the example environment file
cp env.example .env

# Edit .env file and set your watch directory
WATCH_DIRECTORY=./data
```

**Default Behavior**: If no `WATCH_DIRECTORY` is set, the system will monitor the `./data` directory.

#### Directory Structure

The watch directory should contain subdirectories for each video task:
```
watch-directory/
├── video-task-1/          # Video task directory
│   ├── script.json        # Required: Script configuration file
│   ├── shot_001.prompt    # Asset files
│   └── shot_002.prompt    # Asset files
└── video-task-2/          # Another video task
    ├── script.json
    └── assets/
```

### Start Development Server

```bash
# Start both frontend and backend
pnpm run dev

# Or start separately
pnpm run dev:backend  # Backend service (port 8080)
pnpm run dev:frontend # Frontend service (port 3000)
```

### Access Application

Open browser and visit: http://localhost:3000

## Project Structure

```
video-script-monitor/
├── src/
│   ├── backend/          # Backend service
│   │   ├── fileWatcher.ts    # File monitoring
│   │   ├── scriptParser.ts   # Script parsing
│   │   ├── websocket.ts      # WebSocket service
│   │   └── server.ts         # Express server
│   ├── frontend/         # Frontend application
│   │   ├── components/       # React components
│   │   ├── services/        # API services
│   │   └── store/           # State management
│   └── shared/           # Shared code
│       └── types/         # TypeScript type definitions
├── tests/                # Test files
│   └── test-watch-config.js  # Watch directory configuration test
├── data/                 # Default watch directory (configurable)
└── public/              # Static assets
```

## Usage Instructions

1. **Start Monitoring**: Click "Start Monitoring" button to begin monitoring AI Agent Generate
2. **View Tasks**: Select video tasks from the left task list
3. **Timeline Browse**: View shots and assets on the main timeline
4. **Detail View**: Click on shots to view detailed information
5. **Asset Preview**: Click on asset files for preview

## Development Guide

### Backend Documentation

#### API Documentation

**API Docs**: http://localhost:8080/api-docs

#### API Endpoints

**Base URL**: `http://localhost:8080`

**Task Management**
- `GET /api/tasks` - Get all video tasks
- `GET /api/tasks/:videoId` - Get specific task details
- `POST /api/tasks/:videoId/start` - Start monitoring task
- `POST /api/tasks/:videoId/stop` - Stop monitoring task

**File Monitoring**
- `GET /api/files/:videoId` - Get all files for a task
- `GET /api/files/:videoId/:fileId` - Get specific file details

#### WebSocket Connection

**Connection URL**: `ws://localhost:8080`

**Message Types**
- `fileAdded` - File added
- `fileModified` - File modified  
- `fileDeleted` - File deleted
- `scriptUpdated` - Script updated
- `taskUpdated` - Task updated

#### Backend Source Code Structure

```
src/backend/
├── fileWatcher.ts    # File system monitoring service
├── scriptParser.ts   # Script.json parsing utilities
├── websocket.ts      # WebSocket server implementation
├── server.ts         # Express server setup
└── routes/           # API route handlers
    ├── tasks.ts      # Task management routes
    └── files.ts      # File management routes
```

### Data Format

Refer to type definitions in `src/shared/types/index.ts`

### Backend Development

Start backend server separately:
```bash
pnpm run dev:backend
```

Backend will run on port 8080 with hot-reload enabled.

### Testing

Run the watch directory configuration test:
```bash
node tests/test-watch-config.js
```

This test verifies that the watch directory configuration works correctly with different path formats.
