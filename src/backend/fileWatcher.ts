import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { AssetFile } from '../shared/types/index';
import path from 'path';
import fs from 'fs';

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private dataWatcher: chokidar.FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();

  startWatching(videoTaskPath: string): void {
    if (this.watchedPaths.has(videoTaskPath)) {
      return;
    }

    this.watchedPaths.add(videoTaskPath);

    if (!this.watcher) {
      this.watcher = chokidar.watch(videoTaskPath, {
        ignored: [
          /(^|[\/\\])\../, // 忽略隐藏文件
          /(^|[\/\\])cache([\/\\]|$)/, // 忽略cache文件夹及其内容
        ],
        persistent: true,
        depth: 2,
      });

      this.setupWatcherEvents();
    } else {
      this.watcher.add(videoTaskPath);
    }

    console.log(`开始监控目录: ${videoTaskPath}`);
  }

  startWatchingDataDirectory(dataPath: string): void {
    if (this.dataWatcher) {
      return;
    }

    this.dataWatcher = chokidar.watch(dataPath, {
      ignored: [
        /(^|[\/\\])\../, // 忽略隐藏文件
        /(^|[\/\\])cache([\/\\]|$)/, // 忽略cache文件夹及其内容
      ],
      persistent: true,
      depth: 1, // 只监控第一级目录
    });

    this.setupDataWatcherEvents();
    console.log(`开始监控data目录: ${dataPath}`);
  }

  private setupWatcherEvents(): void {
    if (!this.watcher) return;

    // 防抖处理，避免重复事件
    const debounceTimers = new Map();

    this.watcher
      .on('add', async (filePath) => {
        // 防抖处理：相同文件路径在500ms内只处理一次
        if (debounceTimers.has(filePath)) {
          clearTimeout(debounceTimers.get(filePath));
        }
        
        const timer = setTimeout(async () => {
          debounceTimers.delete(filePath);
          try {
            // 等待文件完全写入
            await this.waitForFileReady(filePath);
            const assetFile = await this.createAssetFile(filePath);
            if (assetFile) {
              console.log(`文件添加事件: ${filePath}`);
              this.emit('fileAdded', assetFile);
            }
          } catch (error) {
            console.error('处理文件添加事件失败:', error);
          }
        }, 300);
        
        debounceTimers.set(filePath, timer);
      })
      .on('change', async (filePath) => {
        // 防抖处理
        if (debounceTimers.has(filePath)) {
          clearTimeout(debounceTimers.get(filePath));
        }
        
        const timer = setTimeout(async () => {
          debounceTimers.delete(filePath);
          try {
            // 等待文件完全写入
            await this.waitForFileReady(filePath);
            const assetFile = await this.createAssetFile(filePath);
            if (assetFile) {
              console.log(`文件修改事件: ${filePath}`);
              this.emit('fileModified', assetFile);
            }
          } catch (error) {
            console.error('处理文件修改事件失败:', error);
          }
        }, 300);
        
        debounceTimers.set(filePath, timer);
      })
      .on('unlink', (filePath) => {
        // 防抖处理
        if (debounceTimers.has(filePath)) {
          clearTimeout(debounceTimers.get(filePath));
        }
        
        const timer = setTimeout(() => {
          debounceTimers.delete(filePath);
          // 文件删除时不需要检查文件状态
          const assetFile = this.createAssetFileFromPath(filePath);
          if (assetFile) {
            console.log(`文件删除事件: ${filePath}`);
            this.emit('fileDeleted', assetFile);
          }
        }, 300);
        
        debounceTimers.set(filePath, timer);
      })
      .on('error', (error) => {
        console.error('文件监控错误:', error);
      });
  }

  private setupDataWatcherEvents(): void {
    if (!this.dataWatcher) return;

    // 防抖处理，避免重复事件
    const debounceTimers = new Map();

    this.dataWatcher
      .on('addDir', async (dirPath) => {
        // 防抖处理：相同目录路径在1秒内只处理一次
        if (debounceTimers.has(dirPath)) {
          clearTimeout(debounceTimers.get(dirPath));
        }
        
        const timer = setTimeout(async () => {
          debounceTimers.delete(dirPath);
          try {
            // 等待目录完全创建
            await this.waitForDirectoryReady(dirPath);
            console.log(`新目录创建事件: ${dirPath}`);
            this.emit('directoryAdded', dirPath);
          } catch (error) {
            console.error('处理目录添加事件失败:', error);
          }
        }, 500);
        
        debounceTimers.set(dirPath, timer);
      })
      .on('unlinkDir', (dirPath) => {
        // 防抖处理
        if (debounceTimers.has(dirPath)) {
          clearTimeout(debounceTimers.get(dirPath));
        }
        
        const timer = setTimeout(() => {
          debounceTimers.delete(dirPath);
          console.log(`目录删除事件: ${dirPath}`);
          this.emit('directoryRemoved', dirPath);
        }, 500);
        
        debounceTimers.set(dirPath, timer);
      })
      .on('error', (error) => {
        console.error('data目录监控错误:', error);
      });
  }

  private async waitForFileReady(filePath: string, maxRetries = 5, delay = 100): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.size > 0) {
          return; // 文件已准备好
        }
      } catch (error) {
        // 文件可能还不存在或不可访问
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`文件未准备好: ${filePath}`);
  }

  private async waitForDirectoryReady(dirPath: string, maxRetries = 10, delay = 200): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const stats = await fs.promises.stat(dirPath);
        if (stats.isDirectory()) {
          return; // 目录已准备好
        }
      } catch (error) {
        // 目录可能还不存在或不可访问
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`目录未准备好: ${dirPath}`);
  }

  private async createAssetFile(filePath: string): Promise<AssetFile | null> {
    try {
      // 忽略cache文件夹中的文件 - 使用更健壮的方法
      const normalizedPath = filePath.replace(/\\/g, '/'); // 统一使用正斜杠
      if (normalizedPath.includes('/cache/')) {
        return null;
      }

      const stats = await fs.promises.stat(filePath);
      const fileName = path.basename(filePath);
      const videoId = this.extractVideoId(filePath);
      const fileType = this.detectFileType(fileName);

      if (!fileType || !videoId) return null;

      // 将绝对路径转换为相对于data目录的相对路径
      const relativePath = this.getRelativePath(filePath);

      return {
        fileId: `${videoId}_${fileName}_${Date.now()}`,
        videoId,
        fileType,
        filePath: relativePath,
        fileName,
        createdAt: stats.birthtime,
        fileSize: stats.size,
      };
    } catch (error) {
      console.error('创建AssetFile失败:', error);
      return null;
    }
  }

  private createAssetFileFromPath(filePath: string): AssetFile | null {
    try {
      // 忽略cache文件夹中的文件 - 使用更健壮的方法
      const normalizedPath = filePath.replace(/\\/g, '/'); // 统一使用正斜杠
      if (normalizedPath.includes('/cache/')) {
        return null;
      }

      const fileName = path.basename(filePath);
      const videoId = this.extractVideoId(filePath);
      const fileType = this.detectFileType(fileName);

      if (!fileType || !videoId) return null;

      // 将绝对路径转换为相对于data目录的相对路径
      const relativePath = this.getRelativePath(filePath);

      return {
        fileId: `${videoId}_${fileName}_${Date.now()}`,
        videoId,
        fileType,
        filePath: relativePath,
        fileName,
        createdAt: new Date(),
        fileSize: 0,
      };
    } catch (error) {
      console.error('创建AssetFile失败:', error);
      return null;
    }
  }

  private getWatchDirectory(): string {
    // 优先使用环境变量，否则使用默认的data目录
    const envWatchDir = process.env.WATCH_DIRECTORY;
    if (envWatchDir) {
      return path.resolve(envWatchDir);
    }
    return path.join(process.cwd(), 'data');
  }

  private extractVideoId(filePath: string): string | null {
    const parts = filePath.split(path.sep);
    const watchDir = this.getWatchDirectory();
    const watchDirParts = watchDir.split(path.sep);
    
    // 查找监控目录的索引
    const watchDirIndex = parts.findIndex((part, index) => {
      // 检查从当前索引开始的路径是否匹配监控目录
      return watchDirParts.every((watchPart, i) => 
        parts[index + i] === watchPart
      );
    });
    
    if (watchDirIndex !== -1 && watchDirIndex + watchDirParts.length < parts.length) {
      // 返回监控目录下的第一级完整子目录名作为videoId
      return parts[watchDirIndex + watchDirParts.length];
    }
    
    return null;
  }

  private getRelativePath(filePath: string): string {
    const watchDir = this.getWatchDirectory();
    
    // 如果文件路径以监控目录开头，提取相对路径
    if (filePath.startsWith(watchDir)) {
      return path.relative(watchDir, filePath);
    }
    
    // 否则返回原路径（可能是相对路径）
    return filePath;
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
    
    if (this.dataWatcher) {
      this.dataWatcher.close();
      this.dataWatcher = null;
    }
  }
}