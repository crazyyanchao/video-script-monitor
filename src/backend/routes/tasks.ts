import { Router } from 'express';
import { VideoTask, AssetFile } from '../../shared/types/index';

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: 视频任务管理API
 */
const router = Router();

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: 获取所有视频任务
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, folderCreatedAt, title]
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: 排序顺序
 *     responses:
 *       200:
 *         description: 成功获取任务列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VideoTask'
 */
router.get('/', (req, res) => {
  // 从全局存储获取任务列表
  const tasks = Array.from((req.app.get('videoTasks') || new Map()).values());
  
  // 获取排序参数
  const sortBy = req.query.sortBy as string || 'folderCreatedAt';
  const sortOrder = req.query.sortOrder as string || 'desc';
  
  // 排序任务列表
  const sortedTasks = (tasks as VideoTask[]).sort((a: VideoTask, b: VideoTask) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'folderCreatedAt':
        aValue = new Date(a.folderCreatedAt).getTime();
        bValue = new Date(b.folderCreatedAt).getTime();
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      default:
        aValue = new Date(a.folderCreatedAt).getTime();
        bValue = new Date(b.folderCreatedAt).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });
  
  res.json(sortedTasks);
});

/**
 * @swagger
 * /api/tasks/{videoId}:
 *   get:
 *     summary: 获取特定视频任务详情
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: 视频任务ID
 *     responses:
 *       200:
 *         description: 成功获取任务详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoTask'
 *       404:
 *         description: 任务不存在
 */
router.get('/:videoId', (req, res) => {
  const { videoId } = req.params;
  const videoTasks = req.app.get('videoTasks') || new Map();
  const task = videoTasks.get(videoId);
  
  if (!task) {
    return res.status(404).json({ error: '视频任务不存在' });
  }
  
  res.json(task);
});

/**
 * @swagger
 * /api/tasks/{videoId}/start:
 *   post:
 *     summary: 开始监控视频任务
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: 视频任务ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskPath
 *             properties:
 *               taskPath:
 *                 type: string
 *                 description: 任务文件路径
 *     responses:
 *       200:
 *         description: 成功开始监控
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 启动监控失败
 */
router.post('/:videoId/start', (req, res) => {
  const { videoId } = req.params;
  const { taskPath } = req.body;
  
  if (!taskPath) {
    return res.status(400).json({ error: '请提供任务路径' });
  }

  try {
    // 这里调用任务监控逻辑
    const startMonitoringTask = req.app.get('startMonitoringTask');
    if (startMonitoringTask) {
      startMonitoringTask(videoId, taskPath);
    }
    res.json({ message: '开始监控视频任务', videoId, taskPath });
  } catch (error) {
    res.status(500).json({ error: '启动监控失败' });
  }
});

/**
 * @swagger
 * /api/tasks/{videoId}/stop:
 *   post:
 *     summary: 停止监控视频任务
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: 视频任务ID
 *     responses:
 *       200:
 *         description: 成功停止监控
 *       404:
 *         description: 任务不存在
 */
router.post('/:videoId/stop', (req, res) => {
  const { videoId } = req.params;
  const videoTasks = req.app.get('videoTasks') || new Map();
  
  if (!videoTasks.has(videoId)) {
    return res.status(404).json({ error: '视频任务不存在' });
  }
  
  // 标记任务为已停止监控，而不是删除
  const task = videoTasks.get(videoId);
  if (task) {
    task.monitoring = false;
    task.updatedAt = new Date();
  }
  
  res.json({ message: '停止监控视频任务', videoId });
});

/**
 * @swagger
 * /api/tasks/{videoId}/resume:
 *   post:
 *     summary: 恢复监控视频任务
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: 视频任务ID
 *     responses:
 *       200:
 *         description: 成功恢复监控
 *       404:
 *         description: 任务不存在
 *       400:
 *         description: 任务路径无效
 */
router.post('/:videoId/resume', (req, res) => {
  const { videoId } = req.params;
  
  try {
    // 这里调用恢复监控逻辑
    const resumeMonitoringTask = req.app.get('resumeMonitoringTask');
    if (resumeMonitoringTask) {
      resumeMonitoringTask(videoId);
    }
    res.json({ message: '恢复监控视频任务', videoId });
  } catch (error: any) {
    res.status(400).json({ error: error.message || '恢复监控失败' });
  }
});

/**
 * @swagger
 * /api/tasks/available:
 *   get:
 *     summary: 获取可用的任务列表
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: 成功获取可用任务列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: 任务ID
 *                   path:
 *                     type: string
 *                     description: 任务路径
 *                   title:
 *                     type: string
 *                     description: 任务标题
 */
router.get('/available', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const dataPath = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(dataPath)) {
      return res.json([]);
    }
    
    const directories = fs.readdirSync(dataPath, { withFileTypes: true })
      .filter((dirent: any) => dirent.isDirectory())
      .map((dirent: any) => {
        const dirPath = path.join(dataPath, dirent.name);
        const scriptPath = path.join(dirPath, 'script.json');
        
        // 尝试读取script.json获取标题
        let title = dirent.name;
        if (fs.existsSync(scriptPath)) {
          try {
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            const scriptData = JSON.parse(scriptContent);
            if (scriptData.title) {
              title = scriptData.title;
            }
          } catch (error) {
            console.warn(`解析script.json失败 ${scriptPath}:`, error);
          }
        }
        
        return {
          id: dirent.name,
          path: `./data/${dirent.name}`,
          title: title
        };
      });
    
    res.json(directories);
  } catch (error) {
    console.error('获取可用任务失败:', error);
    res.status(500).json({ error: '获取可用任务失败' });
  }
});

export default router;