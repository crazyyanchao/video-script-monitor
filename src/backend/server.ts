import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
import { FileWatcher } from './fileWatcher';
import { ScriptParser } from './scriptParser';
import { WebSocketService } from './websocket';
import { VideoTask, AssetFile } from '../shared/types/index';
import tasksRouter from './routes/tasks';
import filesRouter from './routes/files';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoMonitorServer {
  private app: express.Application;
  private fileWatcher: FileWatcher;
  private scriptParser: ScriptParser;
  private wsService: WebSocketService;
  private videoTasks: Map<string, VideoTask> = new Map();
  private monitoredPaths: Map<string, string> = new Map(); // videoId -> taskPath 映射

  constructor() {
    try {
      this.app = express();
      this.fileWatcher = new FileWatcher();
      this.scriptParser = new ScriptParser();
      this.wsService = new WebSocketService();
      
      this.setupMiddleware();
      this.setupSwagger();
      this.setupRoutes();
      this.setupFileWatcherEvents();
    } catch (error) {
      console.error('VideoMonitorServer 构造函数错误:', error);
      throw error;
    }
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupSwagger(): void {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Video Script Monitor API',
          version: '1.0.0',
          description: '实时视频脚本监控系统API文档',
          contact: {
            name: 'API Support',
            email: 'support@example.com'
          }
        },
        servers: [
          {
            url: 'http://localhost:8080',
            description: '开发服务器'
          }
        ],
        components: {
          schemas: {
            VideoTask: {
              type: 'object',
              properties: {
                videoId: { type: 'string', description: '视频任务ID' },
                title: { type: 'string', description: '任务标题' },
                status: { type: 'string', enum: ['processing', 'completed'], description: '任务状态' },
                scriptPath: { type: 'string', description: '脚本文件路径' },
                assets: { type: 'array', items: { $ref: '#/components/schemas/AssetFile' } },
                shots: { type: 'array', items: { $ref: '#/components/schemas/ShotDetail' } },
                createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
                updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
              }
            },
            AssetFile: {
              type: 'object',
              properties: {
                fileId: { type: 'string', description: '文件ID' },
                videoId: { type: 'string', description: '所属视频任务ID' },
                fileType: { type: 'string', enum: ['image', 'audio', 'video', 'prompt'], description: '文件类型' },
                filePath: { type: 'string', description: '文件路径' },
                fileName: { type: 'string', description: '文件名' },
                createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
                fileSize: { type: 'number', description: '文件大小(字节)' }
              }
            },
            ShotDetail: {
              type: 'object',
              properties: {
                shotId: { type: 'string', description: '分镜ID' },
                shotNumber: { type: 'number', description: '分镜序号' },
                shotType: { type: 'string', enum: ['CU', 'MS', 'LS'], description: '分镜类型' },
                duration: { type: 'number', description: '时长(秒)' },
                description: { type: 'string', description: '描述' },
                assets: { type: 'array', items: { $ref: '#/components/schemas/AssetFile' } }
              }
            }
          }
        }
      },
      apis: [
        path.join(__dirname, 'routes', '*.{ts,js}')
      ]
    };

    const specs = swaggerJsdoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  private setupRoutes(): void {
    // 设置共享数据和方法
    this.app.set('videoTasks', this.videoTasks);
    this.app.set('startMonitoringTask', this.startMonitoringTask.bind(this));
    this.app.set('resumeMonitoringTask', this.resumeMonitoringTask.bind(this));
    this.app.set('wsService', this.wsService);

    // 使用路由模块
    this.app.use('/api/tasks', tasksRouter);
    this.app.use('/api/files', filesRouter);

    // 静态文件服务 - 在API路由之后，用于生产环境
    const distPath = path.join(__dirname, '../../dist');
    if (fs.existsSync(distPath)) {
      // 提供静态文件
      this.app.use(express.static(distPath));
      // SPA fallback - 所有未匹配的路由都返回index.html
      this.app.get('*', (req: express.Request, res: express.Response) => {
        // 排除 API 路由和健康检查
        if (!req.path.startsWith('/api') && req.path !== '/health' && req.path !== '/api-docs') {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
    } else {
      console.log(`警告: 前端构建目录不存在: ${distPath}`);
    }

    // 健康检查
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: 服务健康检查
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: 服务正常运行
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: ok
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *                 connectedClients:
     *                   type: number
     *                   description: 当前连接的WebSocket客户端数量
     */
    this.app.get('/health', (_: express.Request, res: express.Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        connectedClients: this.wsService.getClientCount() 
      });
    });
  }

  private setupFileWatcherEvents(): void {
    this.fileWatcher.on('fileAdded', (assetFile: AssetFile) => {
      this.handleFileAdded(assetFile);
    });

    this.fileWatcher.on('fileModified', (assetFile: AssetFile) => {
      this.handleFileModified(assetFile);
    });

    this.fileWatcher.on('fileDeleted', (assetFile: AssetFile) => {
      this.handleFileDeleted(assetFile);
    });

    this.fileWatcher.on('directoryAdded', (dirPath: string) => {
      this.handleDirectoryAdded(dirPath);
    });

    this.fileWatcher.on('directoryRemoved', (dirPath: string) => {
      this.handleDirectoryRemoved(dirPath);
    });
  }

  private startMonitoringTask(videoId: string, taskPath: string): void {
    // 检查路径是否存在
    if (!this.isValidPath(taskPath)) {
      throw new Error('无效的任务路径');
    }

    // 从taskPath中提取完整的目录名作为实际的videoId
    const actualVideoId = this.extractVideoIdFromPath(taskPath);
    
    // 获取文件夹创建时间
    const folderStats = fs.statSync(taskPath);
    const folderCreatedAt = folderStats.birthtime;
    
    // 创建或更新视频任务
    const existingTask = this.videoTasks.get(actualVideoId);
    let task: VideoTask;
    
    if (existingTask) {
      // 如果是现有任务，更新监控状态
      task = {
        ...existingTask,
        monitoring: true,
        updatedAt: new Date(),
      };
    } else {
      // 创建新任务
      task = {
        videoId: actualVideoId,
        title: `视频任务 ${actualVideoId}`,
        status: 'processing',
        monitoring: true,
        scriptPath: path.join(taskPath, 'script.json'),
        assets: [],
        shots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        folderCreatedAt: folderCreatedAt,
      };
    }

    // 解析脚本文件
    const scriptData = this.scriptParser.parseScriptFile(task.scriptPath);
    if (scriptData) {
      task.title = scriptData.title;
      task.shots = this.scriptParser.findAssetsForShots(scriptData, taskPath);
    }

    this.videoTasks.set(actualVideoId, task);
    this.monitoredPaths.set(actualVideoId, taskPath);
    this.fileWatcher.startWatching(taskPath);

    // 通知前端任务状态已更新
    this.wsService.broadcastTaskUpdate(task);

    console.log(`开始监控视频任务: ${actualVideoId}，路径: ${taskPath}`);
  }

  private resumeMonitoringTask(videoId: string): void {
    const task = this.videoTasks.get(videoId);
    if (!task) {
      throw new Error('视频任务不存在');
    }

    const taskPath = this.monitoredPaths.get(videoId);
    if (!taskPath) {
      throw new Error('任务路径不存在');
    }

    // 检查路径是否仍然有效
    if (!this.isValidPath(taskPath)) {
      throw new Error('任务路径无效');
    }

    // 更新监控状态
    task.monitoring = true;
    task.updatedAt = new Date();

    // 重新开始监控
    this.fileWatcher.startWatching(taskPath);

    console.log(`恢复监控视频任务: ${videoId}，路径: ${taskPath}`);
  }

  private getWatchDirectory(): string {
    // 优先使用环境变量，否则使用默认的data目录
    const envWatchDir = process.env.WATCH_DIRECTORY;
    if (envWatchDir) {
      return path.resolve(envWatchDir);
    }
    return path.join(process.cwd(), 'data');
  }

  private extractVideoIdFromPath(taskPath: string): string {
    const parts = taskPath.split(path.sep);
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
    
    // 如果没找到监控目录，返回最后一个目录名
    return path.basename(taskPath);
  }

  private handleFileAdded(assetFile: AssetFile): void {
    const task = this.videoTasks.get(assetFile.videoId);
    if (!task || !task.monitoring) return;

    // 检查是否已存在相同文件
    const existingIndex = task.assets.findIndex(
      asset => asset.filePath === assetFile.filePath
    );

    if (existingIndex === -1) {
      task.assets.push(assetFile);
      task.updatedAt = new Date();
      
      // 更新相关分镜的资产
      this.updateShotAssets(task, assetFile);
      
      this.wsService.broadcastFileUpdate(assetFile, 'fileAdded');
      console.log(`文件添加: ${assetFile.fileName}`);
    }
  }

  private handleFileModified(assetFile: AssetFile): void {
    const task = this.videoTasks.get(assetFile.videoId);
    if (!task || !task.monitoring) return;

    const existingIndex = task.assets.findIndex(
      asset => asset.filePath === assetFile.filePath
    );

    if (existingIndex !== -1) {
      task.assets[existingIndex] = assetFile;
      task.updatedAt = new Date();
      
      this.wsService.broadcastFileUpdate(assetFile, 'fileModified');
      console.log(`文件修改: ${assetFile.fileName}`);
    }
  }

  private handleFileDeleted(assetFile: AssetFile): void {
    const task = this.videoTasks.get(assetFile.videoId);
    if (!task || !task.monitoring) return;

    const existingIndex = task.assets.findIndex(
      asset => asset.filePath === assetFile.filePath
    );

    if (existingIndex !== -1) {
      task.assets.splice(existingIndex, 1);
      task.updatedAt = new Date();
      
      // 从分镜中移除资产
      this.removeAssetFromShots(task, assetFile.filePath);
      
      this.wsService.broadcastFileUpdate(assetFile, 'fileDeleted');
      console.log(`文件删除 [任务ID: ${task.videoId}]: ${assetFile.fileName}`);
    }
  }

  private updateShotAssets(task: VideoTask, assetFile: AssetFile): void {
    task.shots.forEach(shot => {
      // 简单的文件名匹配逻辑
      if (assetFile.fileName.includes(shot.shotId) || 
          assetFile.fileName.includes(`shot_${shot.shotNumber}`)) {
        
        const existingAssetIndex = shot.assets.findIndex(
          asset => asset.filePath === assetFile.filePath || asset.fileId === assetFile.fileId
        );

        if (existingAssetIndex === -1) {
          shot.assets.push(assetFile);
          console.log(`分镜 ${shot.shotId} 添加素材: ${assetFile.fileName}`);
        } else {
          // 更新现有素材
          shot.assets[existingAssetIndex] = assetFile;
          console.log(`分镜 ${shot.shotId} 更新素材: ${assetFile.fileName}`);
        }
      }
    });
  }

  private removeAssetFromShots(task: VideoTask, filePath: string): void {
    task.shots.forEach(shot => {
      const assetIndex = shot.assets.findIndex(asset => asset.filePath === filePath);
      if (assetIndex !== -1) {
        shot.assets.splice(assetIndex, 1);
      }
    });
  }

  private handleDirectoryAdded(dirPath: string): void {
    try {
      // 检查是否是监控目录下的子目录
      const watchDir = this.getWatchDirectory();
      if (!dirPath.startsWith(watchDir)) {
        return;
      }

      // 检查是否是监控目录本身，如果是则跳过
      const normalizedDirPath = path.resolve(dirPath);
      const normalizedWatchDir = path.resolve(watchDir);
      if (normalizedDirPath === normalizedWatchDir) {
        console.log(`跳过监控目录本身: ${dirPath}`);
        return;
      }

      const videoId = this.extractVideoIdFromPath(dirPath);
      const scriptPath = path.join(dirPath, 'script.json');
      
      // 检查是否存在script.json文件
      if (fs.existsSync(scriptPath)) {
        // 检查任务是否已存在
        if (!this.videoTasks.has(videoId)) {
          console.log(`自动发现新视频任务: ${videoId} (${dirPath})`);
          this.startMonitoringTask(videoId, dirPath);
          
          // 通知前端任务列表已更新
          const task = this.videoTasks.get(videoId);
          if (task) {
            this.wsService.broadcastTaskUpdate(task);
            console.log(`已通知前端新任务: ${videoId}`);
          }
        }
      } else {
        console.log(`新目录 ${videoId} 缺少script.json文件，等待文件创建...`);
        // 可以在这里添加一个定时器来定期检查script.json是否被创建
        this.scheduleScriptCheck(videoId, dirPath);
      }
    } catch (error) {
      console.error('处理目录添加事件失败:', error);
    }
  }

  private handleDirectoryRemoved(dirPath: string): void {
    try {
      // 检查是否是监控目录下的子目录
      const watchDir = this.getWatchDirectory();
      if (!dirPath.startsWith(watchDir)) {
        return;
      }

      // 检查是否是监控目录本身，如果是则跳过
      const normalizedDirPath = path.resolve(dirPath);
      const normalizedWatchDir = path.resolve(watchDir);
      if (normalizedDirPath === normalizedWatchDir) {
        console.log(`跳过监控目录本身删除事件: ${dirPath}`);
        return;
      }

      const videoId = this.extractVideoIdFromPath(dirPath);
      
      if (this.videoTasks.has(videoId)) {
        // 从任务列表中完全删除该任务
        const task = this.videoTasks.get(videoId);
        this.videoTasks.delete(videoId);
        
        // 从监控路径中移除
        this.monitoredPaths.delete(videoId);
        
        console.log(`目录删除，移除任务: ${videoId}`);
        
        // 通知前端任务已删除
        this.wsService.broadcastTaskRemoved(videoId);
      }
    } catch (error) {
      console.error('处理目录删除事件失败:', error);
    }
  }

  private scheduleScriptCheck(videoId: string, dirPath: string): void {
    // 每5秒检查一次script.json是否存在，最多检查50次
    let checkCount = 0;
    const maxChecks = 50;
    
    const checkInterval = setInterval(() => {
      checkCount++;
      const scriptPath = path.join(dirPath, 'script.json');
      
      if (fs.existsSync(scriptPath)) {
        clearInterval(checkInterval);
        console.log(`发现script.json文件，自动启动监控: ${videoId}`);
        this.startMonitoringTask(videoId, dirPath);
        
        // 通知前端任务列表已更新
        const task = this.videoTasks.get(videoId);
        if (task) {
          this.wsService.broadcastTaskUpdate(task);
          console.log(`已通知前端新任务: ${videoId}`);
        }
      } else if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        console.log(`目录 ${videoId} 在${maxChecks * 5}秒内未创建script.json文件，停止检查`);
      }
    }, 5000);
  }

  private isValidPath(taskPath: string): boolean {
    try {
      return fs.existsSync(taskPath);
    } catch {
      return false;
    }
  }

  public start(port: number = 8080): void {
    try {
      const server = this.app.listen(port, () => {
        console.log(`服务器运行在 http://localhost:${port}`);
        this.wsService.initialize(server);
        
        // 启动时自动扫描data目录下的所有视频任务
        this.autoDiscoverVideoTasks();
        
        // 开始监控配置的目录，以便自动发现新创建的文件夹
        const watchDir = this.getWatchDirectory();
        if (fs.existsSync(watchDir)) {
          this.fileWatcher.startWatchingDataDirectory(watchDir);
        } else {
          console.log(`监控目录不存在: ${watchDir}`);
        }
      }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`端口 ${port} 已被占用，尝试使用端口 ${port + 1}`);
          this.start(port + 1);
        } else {
          console.error('服务器启动失败:', err);
          process.exit(1);
        }
      });
    } catch (error) {
      console.error('服务器启动异常:', error);
      process.exit(1);
    }
  }

  private autoDiscoverVideoTasks(): void {
    const watchDir = this.getWatchDirectory();
    
    if (!fs.existsSync(watchDir)) {
      console.log(`监控目录不存在: ${watchDir}，跳过自动发现`);
      return;
    }

    try {
      const directories = fs.readdirSync(watchDir, { withFileTypes: true })
        .filter(dirent => {
          // 过滤掉非目录、cache目录和隐藏目录
          return dirent.isDirectory() && 
                 dirent.name.toLowerCase() !== 'cache' && 
                 !dirent.name.startsWith('.');
        })
        .map(dirent => dirent.name);

      console.log(`在监控目录 ${watchDir} 中发现 ${directories.length} 个视频任务目录:`, directories);

      directories.forEach(dirName => {
        const taskPath = path.join(watchDir, dirName);
        const scriptPath = path.join(taskPath, 'script.json');
        
        // 检查是否存在script.json文件
        if (fs.existsSync(scriptPath)) {
          try {
            // 从目录名提取videoId
            const videoId = this.extractVideoIdFromPath(taskPath);
            console.log(`自动启动监控: ${videoId} (${dirName})`);
            this.startMonitoringTask(videoId, taskPath);
          } catch (error) {
            console.error(`启动监控失败 ${dirName}:`, error);
          }
        } else {
          console.log(`跳过目录 ${dirName}: 缺少script.json文件`);
        }
      });
    } catch (error) {
      console.error('自动发现视频任务失败:', error);
    }
  }
}

// 启动服务器
try {
  const server = new VideoMonitorServer();
  server.start();
} catch (error) {
  console.error('服务器启动失败:', error);
  process.exit(1);
}