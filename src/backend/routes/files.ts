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
  const filePath = (req.params as any)['0'];
  const fullPath = path.join(process.cwd(), 'data', filePath);
  
  res.sendFile(fullPath, (err) => {
    if (err) {
      res.status(404).json({ error: '文件不存在' });
    }
  });
});

export default router;