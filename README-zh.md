# Video Script Monitor

[![English](https://img.shields.io/badge/English-Click-yellow)](README.md)
[![中文文档](https://img.shields.io/badge/中文文档-点击查看-orange)](README-zh.md)

视频脚本与素材实时监控工具 | AI视频生成项目可视化监控系统

## 功能特性

- 📊 实时文件监控和变化检测
- 🎬 时间轴可视化展示
- 🔔 WebSocket实时通信
- 📁 多类型文件支持（图片、音频、视频、提示词）
- 👁️ 实时预览和详情展示

## 技术栈

- **后端**: Node.js + TypeScript + Express + WebSocket
- **前端**: React + TypeScript + Vite + D3.js
- **文件监控**: chokidar
- **状态管理**: Zustand
- **包管理**: pnpm

## 快速开始

### 前置要求

- Node.js >= 16.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 配置说明

#### 监控目录配置

系统监控一个可配置的目录来查找视频任务。您可以通过环境变量设置监控目录：

**方式一：环境变量**
```bash
# 通过环境变量设置监控目录
export WATCH_DIRECTORY="/path/to/your/watch/directory"
```

**方式二：.env 文件**
```bash
# 复制示例环境文件
cp env.example .env

# 编辑 .env 文件并设置您的监控目录
WATCH_DIRECTORY=./data
```

**默认行为**：如果未设置 `WATCH_DIRECTORY`，系统将监控 `./data` 目录（cache作为特殊目录会被忽略）。

#### 目录结构

监控目录应包含每个视频任务的子目录：
```
监控目录/
├── 视频任务1/          # 视频任务目录
│   ├── script.json        # 必需：脚本配置文件
│   ├── shot_001.prompt    # 素材文件
│   └── shot_002.prompt    # 素材文件
└── 视频任务2/          # 另一个视频任务
    ├── script.json
    └── assets/
```

### 启动开发服务器

```bash
# 同时启动前后端
pnpm run dev

# 或分别启动
pnpm run dev:backend  # 后端服务 (端口 8080)
pnpm run dev:frontend # 前端服务 (端口 3000)
```

### 访问应用

**本地开发模式**：
- 前端: http://localhost:3000
- 后端 API 文档: http://localhost:8080/api-docs

**Docker 生产模式**：
- 统一访问: http://localhost:8080
- API 文档: http://localhost:8080/api-docs

## 项目结构

```
video-script-monitor/
├── src/
│   ├── backend/          # 后端服务
│   │   ├── fileWatcher.ts    # 文件监控
│   │   ├── scriptParser.ts   # 脚本解析
│   │   ├── websocket.ts      # WebSocket服务
│   │   └── server.ts         # Express服务器
│   ├── frontend/         # 前端应用
│   │   ├── components/       # React组件
│   │   ├── services/        # API服务
│   │   └── store/           # 状态管理
│   └── shared/           # 共享代码
│       └── types/         # TypeScript类型定义
├── tests/                # 测试文件
│   └── test-watch-config.js  # 监控目录配置测试
├── data/                 # 默认监控目录（可配置）
└── public/              # 静态资源
```

## 使用说明

1. **启动监控**: 点击"启动监控"按钮开始监控AI Agent产出物
2. **查看任务**: 在左侧任务列表中选择视频任务
3. **时间轴浏览**: 在主时间轴上查看分镜和素材
4. **详情查看**: 点击分镜查看详细信息
5. **素材预览**: 点击素材文件进行预览

## 开发指南

### 后端文档

#### API 文档

**接口文档**: http://localhost:8080/api-docs

#### API 接口

**基础URL**: `http://localhost:8080`

**任务管理**
- `GET /api/tasks` - 获取所有视频任务
- `GET /api/tasks/:videoId` - 获取特定任务详情
- `POST /api/tasks/:videoId/start` - 开始监控任务
- `POST /api/tasks/:videoId/stop` - 停止监控任务

**文件监控**
- `GET /api/files/:videoId` - 获取任务的所有文件
- `GET /api/files/:videoId/:fileId` - 获取特定文件详情

#### WebSocket 连接

**连接URL**: `ws://localhost:8080`

**消息类型**
- `fileAdded` - 文件添加
- `fileModified` - 文件修改  
- `fileDeleted` - 文件删除
- `scriptUpdated` - 脚本更新
- `taskUpdated` - 任务更新

#### 后端源代码结构

```
src/backend/
├── fileWatcher.ts    # 文件系统监控服务
├── scriptParser.ts   # Script.json解析工具
├── websocket.ts      # WebSocket服务器实现
├── server.ts         # Express服务器设置
└── routes/           # API路由处理器
    ├── tasks.ts      # 任务管理路由
    └── files.ts      # 文件管理路由
```

### 数据格式

参考 `src/shared/types/index.ts` 中的类型定义

### 后端开发

单独启动后端服务器：
```bash
pnpm run dev:backend
```

后端将在端口8080上运行，并启用热重载。
