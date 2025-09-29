export interface AssetFile {
  fileId: string;
  videoId: string;
  fileType: 'image' | 'audio' | 'video' | 'prompt';
  filePath: string;
  fileName: string;
  createdAt: Date;
  fileSize: number;
}

export interface ShotDetail {
  shotId: string;
  videoId: string;
  shotNumber: number;
  startTime: number;
  endTime: number;
  description: string;
  dialogue: string;
  roleId: string;
  assets: AssetFile[];
}

export interface VideoTask {
  videoId: string;
  title: string;
  status: 'processing' | 'completed';
  scriptPath: string;
  assets: AssetFile[];
  shots: ShotDetail[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptData {
  videoId: string;
  title: string;
  shots: Array<{
    shotId: string;
    shotNumber: number;
    startTime: number;
    endTime: number;
    description: string;
    dialogue: string;
    roleId: string;
  }>;
  audioConfig: {
    sampleRate: number;
    channels: number;
  };
}

export interface WebSocketMessage {
  type: 'fileAdded' | 'fileModified' | 'fileDeleted' | 'scriptUpdated' | 'taskUpdated' | 'connected' | 'disconnected' | 'subscribed' | 'unsubscribed' | 'pong';
  data: AssetFile | ScriptData | VideoTask | any;
  timestamp: number;
}