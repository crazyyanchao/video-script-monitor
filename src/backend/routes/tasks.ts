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
  res.json(tasks);
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
  
  videoTasks.delete(videoId);
  res.json({ message: '停止监控视频任务', videoId });
});

export default router;