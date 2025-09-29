import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { AssetFile } from '../shared/types/index';
import path from 'path';
import fs from 'fs';

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();

  startWatching(videoTaskPath: string): void {
    if (this.watchedPaths.has(videoTaskPath)) {
      return;
    }

    this.watchedPaths.add(videoTaskPath);

    if (!this.watcher) {
      this.watcher = chokidar.watch(videoTaskPath, {
        ignored: /(^|[\/\\])\../, // 忽略隐藏文件
        persistent: true,
        depth: 2,
      });

      this.setupWatcherEvents();
    } else {
      this.watcher.add(videoTaskPath);
    }

    console.log(`开始监控目录: ${videoTaskPath}`);
  }

  private setupWatcherEvents(): void {
    if (!this.watcher) return;

    this.watcher
      .on('add', (filePath) => {
        const assetFile = this.createAssetFile(filePath);
        if (assetFile) {
          this.emit('fileAdded', assetFile);
        }
      })
      .on('change', (filePath) => {
        const assetFile = this.createAssetFile(filePath);
        if (assetFile) {
          this.emit('fileModified', assetFile);
        }
      })
      .on('unlink', (filePath) => {
        const assetFile = this.createAssetFile(filePath);
        if (assetFile) {
          this.emit('fileDeleted', assetFile);
        }
      })
      .on('error', (error) => {
        console.error('文件监控错误:', error);
      });
  }

  private createAssetFile(filePath: string): AssetFile | null {
    try {
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const videoId = this.extractVideoId(filePath);
      const fileType = this.detectFileType(fileName);

      if (!fileType || !videoId) return null;

      return {
        fileId: `${videoId}_${fileName}_${Date.now()}`,
        videoId,
        fileType,
        filePath,
        fileName,
        createdAt: stats.birthtime,
        fileSize: stats.size,
      };
    } catch (error) {
      console.error('创建AssetFile失败:', error);
      return null;
    }
  }

  private extractVideoId(filePath: string): string | null {
    const parts = filePath.split(path.sep);
    const videoDirIndex = parts.findIndex(part => part.startsWith('vid_'));
    
    if (videoDirIndex !== -1) {
      return parts[videoDirIndex];
    }
    
    return null;
  }

  private detectFileType(fileName: string): AssetFile['fileType'] | null {
    const ext = path.extname(fileName).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
      return 'image';
    } else if (['.mp3', '.wav', '.ogg', '.aac'].includes(ext)) {
      return 'audio';
    } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
      return 'video';
    } else if (ext === '.prompt') {
      return 'prompt';
    }
    
    return null;
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.watchedPaths.clear();
    }
  }
}