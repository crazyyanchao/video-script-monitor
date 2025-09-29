# AI视频生成项目 - 可视化监控系统开发说明

## 项目概述

本项目是一个AI视频生成项目的可视化监控系统，专门用于视频内容的制作过程监控。系统通过实时监控本地文件目录，将视频制作过程中的各种素材（图片、音频、视频、脚本等）以**时间轴的形式**可视化展示，让用户能够直观地了解视频制作的进度和内容。

## 核心功能需求

### 1. 文件监控系统
- **实时监控**：监控指定视频任务目录（如 `vid_3213129sadjjasdi8`）下的文件变化
- **文件类型识别**：自动识别图片（.jpg）、音频（.mp3/.wav）、视频（.mp4）、提示词（.prompt）等文件
- **自动更新**：检测到新文件时自动更新页面内容，无需手动刷新

### 2. 时间轴可视化
- **水平时间轴**：从左到右展示视频制作的完整时间线
- **双任务展示**：同时展示两个视频任务的制作进度对比
- **素材预览**：每个时间点显示对应的图片、视频封面
- **分镜信息**：展示分镜类型（CU/MS/LS等）、时长、描述
- **实时更新**：新素材添加时自动在时间轴上插入对应位置

### 3. 动态详情展示
- **图片提示词**：从上至下展示每张图片的生成提示词
- **分镜详情**：首帧图片 + 提示词 + 音频波形 + 台词内容
- **脚本解析**：实时解析script.json中的制作脚本信息
- **交互操作**：点击分镜查看详情，支持拖拽调整顺序

## 技术架构

### 后端技术栈
- **运行环境**：Node.js + TypeScript
- **Web框架**：Express.js
- **文件监控**：chokidar（实时监控文件变化）
- **数据存储**：内存存储 + 文件系统（无需数据库）
- **实时通信**：WebSocket（推送时间轴更新）

### 前端技术栈
- **开发语言**：TypeScript
- **UI框架**：React
- **时间轴可视化**：D3.js（核心时间轴组件）
- **状态管理**：Zustand
- **构建工具**：Vite

## 项目结构设计

```
video-script-monitor/
├── src/
│   ├── backend/                 # 后端代码
│   │   ├── fileWatcher.ts      # 文件监控服务
│   │   ├── scriptParser.ts     # script.json解析器
│   │   ├── websocket.ts        # WebSocket服务
│   │   └── server.ts           # Express服务器
│   ├── frontend/               # 前端代码
│   │   ├── components/         # React组件
│   │   │   ├── Timeline.tsx    # 时间轴组件
│   │   │   ├── AssetCard.tsx   # 素材卡片组件
│   │   │   └── DetailPanel.tsx # 详情面板组件
│   │   ├── hooks/              # 自定义Hooks
│   │   ├── services/           # API服务
│   │   └── store/              # 状态管理
│   └── shared/                 # 共享代码
│       └── types/              # TypeScript类型定义
├── public/                     # 静态资源
└── package.json
```

## 核心功能模块

### 1. 文件监控模块
- **功能**：监控指定目录下的文件变化
- **实现**：使用chokidar库实现文件系统监控
- **触发条件**：文件创建、修改、删除
- **处理逻辑**：解析文件类型，更新内存数据，通过WebSocket通知前端

### 2. 脚本解析模块
- **功能**：解析script.json文件内容
- **数据结构**：按照提供的JSON Schema解析
- **关键信息**：视频ID、标题、分镜信息、音频配置等
- **实时更新**：脚本文件变化时重新解析并推送更新

### 3. 时间轴可视化模块
- **布局设计**：水平时间轴 + 垂直详情展示
- **交互功能**：点击分镜查看详情，拖拽调整顺序
- **实时更新**：新素材添加时自动更新时间轴
- **双任务展示**：同时展示两个视频任务的制作进度

### 4. 动态详情展示模块
- **图片信息**：展示图片提示词，从上至下布局
- **分镜详情**：首帧图片 + 提示词 + 音频波形 + 台词内容
- **脚本解析**：实时解析并展示script.json中的制作脚本信息

## 数据流设计

### 1. 文件监控流程
```
文件变化 → chokidar监听 → 文件类型识别 → 数据解析 → 内存更新 → WebSocket推送 → 前端更新
```

### 2. 页面渲染流程
```
URL解析 → 视频ID提取 → 内存数据查询 → 脚本解析 → 素材加载 → 时间轴渲染 → 详情展示
```

### 3. 实时更新流程
```
新文件创建 → 监控触发 → 内存数据更新 → WebSocket推送 → 前端组件重新渲染 → 用户界面更新
```

## 数据结构设计

### 1. 视频任务数据结构
```typescript
interface VideoTask {
  videoId: string;
  title: string;
  status: 'processing' | 'completed';
  scriptPath: string;
  assets: AssetFile[];
  shots: ShotDetail[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 素材文件数据结构
```typescript
interface AssetFile {
  fileId: string;
  videoId: string;
  fileType: 'image' | 'audio' | 'video' | 'prompt';
  filePath: string;
  fileName: string;
  createdAt: Date;
  fileSize: number;
}
```

### 3. 分镜信息数据结构
```typescript
interface ShotDetail {
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
```

## 开发环境配置

### 1. 开发环境
- **后端**：nodemon + ts-node
- **前端**：Vite Dev Server
- **数据存储**：内存存储（无需数据库）
- **端口配置**：后端8080，前端3000

### 2. 启动命令
```bash
# 安装依赖
npm install

# 启动后端服务
npm run dev:backend

# 启动前端服务
npm run dev:frontend
```

## Docker 部署

### 1. Docker 镜像构建

#### 构建镜像
```bash
# 构建生产环境镜像
docker build -t video-script-monitor:latest .

# 构建指定版本镜像
docker build -t video-script-monitor:v1.0.0 .
```

#### Dockerfile 配置
```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建前端
RUN npm run build:frontend

# 生产环境镜像
FROM node:18-alpine AS production

WORKDIR /app

# 复制构建产物和依赖
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["npm", "start"]
```

### 2. Docker 镜像发布

#### 推送到 Docker Hub
```bash
# 登录 Docker Hub
docker login

# 标记镜像
docker tag video-script-monitor:latest yourusername/video-script-monitor:latest
docker tag video-script-monitor:v1.0.0 yourusername/video-script-monitor:v1.0.0

# 推送镜像
docker push yourusername/video-script-monitor:latest
docker push yourusername/video-script-monitor:v1.0.0
```

#### 推送到私有仓库
```bash
# 标记镜像（以阿里云为例）
docker tag video-script-monitor:latest registry.cn-hangzhou.aliyuncs.com/yournamespace/video-script-monitor:latest

# 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/yournamespace/video-script-monitor:latest
```

### 3. Docker 镜像拉取

#### 从 Docker Hub 拉取
```bash
# 拉取最新版本
docker pull yourusername/video-script-monitor:latest

# 拉取指定版本
docker pull yourusername/video-script-monitor:v1.0.0
```

#### 从私有仓库拉取
```bash
# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/yournamespace/video-script-monitor:latest
```

### 4. Docker 容器启动

#### 基础启动
```bash
# 启动容器
docker run -d \
  --name video-script-monitor \
  -p 8080:8080 \
  -v /path/to/watch/directory:/app/watch \
  yourusername/video-script-monitor:latest
```

#### 生产环境启动
```bash
# 使用 docker-compose 启动
docker-compose up -d

# 或者直接使用 docker run
docker run -d \
  --name video-script-monitor \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /data/video-tasks:/app/watch \
  -e NODE_ENV=production \
  -e WATCH_DIRECTORY=/app/watch \
  yourusername/video-script-monitor:latest
```

#### Docker Compose 配置
```yaml
version: '3.8'

services:
  video-script-monitor:
    image: yourusername/video-script-monitor:latest
    container_name: video-script-monitor
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /data/video-tasks:/app/watch
    environment:
      - NODE_ENV=production
      - WATCH_DIRECTORY=/app/watch
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5. 容器管理

#### 常用命令
```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs video-script-monitor

# 进入容器
docker exec -it video-script-monitor sh

# 停止容器
docker stop video-script-monitor

# 启动容器
docker start video-script-monitor

# 重启容器
docker restart video-script-monitor

# 删除容器
docker rm video-script-monitor

# 删除镜像
docker rmi yourusername/video-script-monitor:latest
```

#### 监控和维护
```bash
# 查看容器资源使用情况
docker stats video-script-monitor

# 查看容器详细信息
docker inspect video-script-monitor

# 更新镜像
docker pull yourusername/video-script-monitor:latest
docker stop video-script-monitor
docker rm video-script-monitor
docker run -d --name video-script-monitor -p 8080:8080 -v /data/video-tasks:/app/watch yourusername/video-script-monitor:latest
```

### 6. 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | development | 运行环境 |
| PORT | 8080 | 服务端口 |
| WATCH_DIRECTORY | /app/watch | 监控目录 |
| LOG_LEVEL | info | 日志级别 |

## 开发计划

### 第一阶段（核心功能）
- [ ] 项目初始化和环境搭建
- [ ] 文件监控功能实现
- [ ] script.json解析功能
- [ ] 基础WebSocket通信

### 第二阶段（可视化功能）
- [ ] 时间轴组件开发
- [ ] 素材展示组件开发
- [ ] 实时更新功能实现
- [ ] 双任务展示功能

### 第三阶段（交互优化）
- [ ] 详情面板开发
- [ ] 交互功能完善
- [ ] 错误处理优化
- [ ] 界面美化

## 核心实现要点

1. **文件监控**：使用chokidar监控指定目录，实时检测文件变化
2. **时间轴展示**：使用D3.js实现水平时间轴，支持双任务并行展示
3. **实时更新**：通过WebSocket实现前后端实时通信
4. **内存存储**：使用内存存储数据，无需数据库，简化部署
5. **脚本解析**：实时解析script.json，提取分镜和素材信息

## 总结

本项目专注于核心功能实现：**文件监控 + 时间轴可视化 + 动态展示**，通过简洁的技术架构和内存存储方案，快速实现AI视频制作过程的可视化监控，让用户能够直观地了解视频制作的进度和内容。
