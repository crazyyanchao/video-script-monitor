import { Router } from 'express';
import path from 'path';

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: 文件管理API
 */
const router = Router();

/**
 * 获取数据目录
 * 优先使用WATCH_DIRECTORY环境变量，否则使用data目录
 */
function getDataDirectory(): string {
  const watchDir = process.env.WATCH_DIRECTORY;
  if (watchDir) {
    return path.resolve(watchDir);
  }
  return path.join(process.cwd(), 'data');
}

/**
 * @swagger
 * /files/{path}:
 *   get:
 *     summary: 获取静态文件
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件路径
 *     responses:
 *       200:
 *         description: 成功获取文件
 *       404:
 *         description: 文件不存在
 */
router.get('/*', (req, res) => {
  try {
    let filePath = (req.params as any)['0'];
    
    // 解码URL编码的中文路径
    filePath = decodeURIComponent(filePath);
    
    // 获取数据目录
    const dataDir = getDataDirectory();
    
    // 处理路径，支持相对路径和绝对路径
    let fullPath: string;
    
    // 检查是否为绝对路径（包含盘符或以/开头）
    const isAbsolutePath = /^[a-zA-Z]:\\.*/.test(filePath) || path.isAbsolute(filePath);
    
    if (isAbsolutePath) {
      // 如果是绝对路径，直接使用
      fullPath = filePath;
    } else if (filePath.startsWith('data/') || filePath.startsWith('data\\')) {
      // 如果路径以'data'开头，移除重复的data前缀
      const normalizedPath = filePath.replace(/^data[\/\\]?/i, '');
      fullPath = path.join(dataDir, normalizedPath);
    } else {
      // 否则直接使用数据目录（这是主要的处理逻辑，因为filePath是相对路径）
      fullPath = path.join(dataDir, filePath);
    }
    
    // 规范化路径分隔符
    fullPath = path.normalize(fullPath);
    
    // 安全检查：确保路径在数据目录内
    if (!fullPath.startsWith(dataDir)) {
      console.error(`安全错误：路径 ${fullPath} 不在数据目录 ${dataDir} 内`);
      res.status(403).json({ error: '访问被拒绝' });
      return;
    }
    
    console.log(`文件服务请求: ${filePath} -> ${fullPath}`);
    
    res.sendFile(fullPath, (err) => {
      if (err) {
        console.error(`文件服务错误: ${fullPath}`, err.message);
        // 检查响应是否已经发送，避免重复发送响应头
        if (!res.headersSent) {
          res.status(404).json({ error: '文件不存在' });
        }
      }
    });
  } catch (error) {
    console.error('文件路径处理错误:', error);
    // 检查响应是否已经发送，避免重复发送响应头
    if (!res.headersSent) {
      res.status(400).json({ error: '文件路径格式错误' });
    }
  }
});

export default router;