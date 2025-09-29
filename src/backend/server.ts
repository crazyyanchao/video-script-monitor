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
    // 静态文件服务 - 指向项目根目录
    this.app.use(express.static(path.join(__dirname, '../..')));
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
    this.app.set('wsService', this.wsService);

    // 使用路由模块
    this.app.use('/api/tasks', tasksRouter);
    this.app.use('/files', filesRouter);

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
  }

  private startMonitoringTask(videoId: string, taskPath: string): void {
    // 检查路径是否存在
    if (!this.isValidPath(taskPath)) {
      throw new Error('无效的任务路径');
    }

    // 创建或更新视频任务
    const existingTask = this.videoTasks.get(videoId);
    const task: VideoTask = existingTask || {
      videoId,
      title: `视频任务 ${videoId}`,
      status: 'processing',
      scriptPath: path.join(taskPath, 'script.json'),
      assets: [],
      shots: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 解析脚本文件
    const scriptData = this.scriptParser.parseScriptFile(task.scriptPath);
    if (scriptData) {
      task.title = scriptData.title;
      task.shots = this.scriptParser.findAssetsForShots(scriptData, taskPath);
    }

    this.videoTasks.set(videoId, task);
    this.fileWatcher.startWatching(taskPath);

    console.log(`开始监控视频任务: ${videoId}，路径: ${taskPath}`);
  }

  private handleFileAdded(assetFile: AssetFile): void {
    const task = this.videoTasks.get(assetFile.videoId);
    if (!task) return;

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
    if (!task) return;

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
    if (!task) return;

    const existingIndex = task.assets.findIndex(
      asset => asset.filePath === assetFile.filePath
    );

    if (existingIndex !== -1) {
      task.assets.splice(existingIndex, 1);
      task.updatedAt = new Date();
      
      // 从分镜中移除资产
      this.removeAssetFromShots(task, assetFile.filePath);
      
      this.wsService.broadcastFileUpdate(assetFile, 'fileDeleted');
      console.log(`文件删除: ${assetFile.fileName}`);
    }
  }

  private updateShotAssets(task: VideoTask, assetFile: AssetFile): void {
    task.shots.forEach(shot => {
      // 简单的文件名匹配逻辑
      if (assetFile.fileName.includes(shot.shotId) || 
          assetFile.fileName.includes(`shot_${shot.shotNumber}`)) {
        
        const existingAssetIndex = shot.assets.findIndex(
          asset => asset.filePath === assetFile.filePath
        );

        if (existingAssetIndex === -1) {
          shot.assets.push(assetFile);
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

  private isValidPath(taskPath: string): boolean {
    try {
      return fs.existsSync(taskPath);
    } catch {
      return false;
    }
  }

  public start(port: number = 8080): void {
    const server = this.app.listen(port, () => {
      console.log(`服务器运行在 http://localhost:${port}`);
    });

    this.wsService.initialize(server);
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