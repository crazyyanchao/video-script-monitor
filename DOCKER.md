# Docker 部署指南

本文档介绍如何使用 Docker 部署视频脚本监控系统。

## 目录

- [快速开始](#快速开始)
  - [方式一：使用 Docker Hub 镜像（推荐）](#方式一使用-docker-hub-镜像推荐)
  - [方式二：本地构建镜像](#方式二本地构建镜像)
  - [访问应用](#3-访问应用)
- [Docker 镜像信息](#docker-镜像信息)
- [详细说明](#详细说明)
  - [文件结构](#文件结构)
  - [环境变量配置](#环境变量配置)
  - [构建脚本使用](#构建脚本使用)
  - [Docker Compose 配置](#docker-compose-配置)
  - [监控目录挂载](#监控目录挂载)
  - [健康检查](#健康检查)
  - [日志查看](#日志查看)
  - [容器管理](#容器管理)
  - [镜像管理](#镜像管理)
- [生产环境部署](#生产环境部署)
- [故障排除](#故障排除)
  - [常见问题](#常见问题)
  - [调试模式](#调试模式)
- [更新和维护](#更新和维护)
  - [更新应用](#更新应用)
  - [备份数据](#备份数据)
  - [管理 Docker 卷数据](#管理-docker-卷数据)
- [性能优化](#性能优化)
- [常用命令快速参考](#常用命令快速参考)
- [相关链接](#相关链接)
- [常见问题（FAQ）](#常见问题faq)

---

## 快速开始

### 方式一：使用 Docker Hub 镜像（推荐）

直接从 Docker Hub 拉取预构建的镜像：

```bash
# 拉取最新镜像
docker pull grapher01110/video-script-monitor:latest

# 创建外部卷（首次使用时）
docker volume create n8n_workspace

# 使用 docker-compose 启动
docker-compose up -d
```

### 方式二：本地构建镜像

如果需要本地构建镜像：

```bash
# 构建并推送镜像（需要 Docker Hub 登录）
./docker-build.sh [版本号]

# 例如：
./docker-build.sh 1.0.0

# 或者自动从 package.json 读取版本号
./docker-build.sh

# docker build -t grapher01110/video-script-monitor:latest .
```

**网络问题解决方案**：

如果遇到 Docker 拉取镜像失败的问题，可以配置 Docker 镜像加速器：

1. 打开 Docker Desktop
2. 点击设置（齿轮图标） → Docker Engine
3. 添加以下配置：
   ```json
   {
     "registry-mirrors": [
       "https://registry.cn-hangzhou.aliyuncs.com",
       "https://docker.mirrors.ustc.edu.cn",
       "https://hub-mirror.c.163.com",
       "https://mirror.baidubce.com"
     ]
   }
   ```
4. 点击 "Apply & Restart"

### 3. 访问应用

启动成功后，打开浏览器访问：http://localhost:8080

## Docker 镜像信息

- **镜像名称**：`grapher01110/video-script-monitor`
- **Docker Hub**：https://hub.docker.com/r/grapher01110/video-script-monitor
- **标签**：
  - `latest` - 最新版本
  - `1.0.3` - 当前版本
  - `x.x.x` - 特定版本号

拉取特定版本：
```bash
# 拉取最新版本
docker pull grapher01110/video-script-monitor:latest

# 拉取特定版本
docker pull grapher01110/video-script-monitor:1.0.3
```

## 详细说明

### 文件结构

```
├── Dockerfile              # Docker 镜像构建文件（多阶段构建）
├── docker-compose.yml      # Docker Compose 配置文件
├── .dockerignore           # Docker 忽略文件
├── docker-build.sh         # 生产环境构建和发布脚本
└── DOCKER.md               # 本文档
```

**核心文件说明**：
- `Dockerfile`：使用多阶段构建，分离构建环境和生产环境，优化镜像大小
- `docker-compose.yml`：配置了外部卷挂载、健康检查、环境变量等
- `docker-build.sh`：自动化构建和推送脚本，支持版本管理

### 环境变量配置

环境变量已在 `docker-compose.yml` 中配置，主要配置项：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | production | 运行环境（production/development） |
| PORT | 8080 | 服务端口 |
| WATCH_DIRECTORY | /app/watch/ai-video | 监控目录路径 |
| LOG_LEVEL | info | 日志级别（debug/info/warn/error） |
| NPM_CONFIG_PACKAGE_MANAGER | pnpm | 包管理器配置 |

如需修改环境变量，可以直接编辑 `docker-compose.yml` 文件中的 `environment` 部分：

```yaml
environment:
  - NODE_ENV=production
  - PORT=8080
  - WATCH_DIRECTORY=/app/watch/ai-video
  - LOG_LEVEL=info
  - NPM_CONFIG_PACKAGE_MANAGER=pnpm
```

### 构建脚本使用

`docker-build.sh` 脚本是一个生产环境构建和发布脚本，用于构建镜像并推送到 Docker Hub：

```bash
# 基本用法
./docker-build.sh [版本号]

# 示例：构建指定版本
./docker-build.sh 1.0.0

# 自动从 package.json 读取版本号
./docker-build.sh
```

脚本会执行以下操作：
1. 检查 Docker 运行状态
2. 检查 Docker Hub 登录状态
3. 清理现有镜像
4. 构建新镜像（包含版本标签和 latest 标签）
5. 推送镜像到 Docker Hub
6. 可选：清理本地镜像以节省空间

**注意**：
- 使用前需要先登录 Docker Hub：`docker login`
- 默认推送到 `grapher01110/video-script-monitor`
- 如需修改用户名，请编辑脚本中的 `DOCKER_USERNAME` 变量

### Docker Compose 配置

`docker-compose.yml` 提供了完整的服务配置：

- 自动重启策略（unless-stopped）
- 健康检查（每 30 秒检查一次）
- 外部卷挂载（n8n_workspace）
- 环境变量配置
- 端口映射（8080:8080）

### 监控目录挂载

系统使用外部 Docker 卷来持久化数据。首次使用前需要创建这些卷：

```bash
# 创建监控目录卷
docker volume create n8n_workspace

# 查看卷信息
docker volume inspect n8n_workspace
```

如果需要使用本地目录而非 Docker 卷，可以修改 `docker-compose.yml`：

```yaml
volumes:
  # 使用本地目录
  - /path/to/your/video/tasks:/app/watch
```

### 健康检查

容器包含健康检查功能，检查服务是否正常运行：

```bash
# 查看健康状态
docker ps

# 查看健康检查日志
docker inspect video-script-monitor | grep -A 10 Health
```

### 日志查看

```bash
# 查看容器日志
docker logs video-script-monitor

# 实时查看日志
docker logs -f video-script-monitor

# 查看最近的日志
docker logs --tail 100 video-script-monitor
```

### 容器管理

```bash
# 查看运行中的容器
docker ps

# 停止容器
docker stop video-script-monitor

# 启动容器
docker start video-script-monitor

# 重启容器
docker restart video-script-monitor

# 删除容器
docker rm video-script-monitor

# 进入容器
docker exec -it video-script-monitor sh
```

### 镜像管理

```bash
# 查看镜像
docker images

# 删除镜像
docker rmi video-script-monitor:latest

# 清理悬空镜像
docker image prune -f
```

## 生产环境部署

### 1. 使用 Docker Compose（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2. 使用 Docker Swarm

```bash
# 初始化 Swarm
docker swarm init

# 部署服务
docker stack deploy -c docker-compose.yml video-monitor

# 查看服务
docker service ls

# 删除服务
docker stack rm video-monitor
```

### 3. 使用 Kubernetes

可以基于 `docker-compose.yml` 创建 Kubernetes 配置文件：

```bash
# 生成 Kubernetes 配置
kompose convert -f docker-compose.yml

# 部署到 Kubernetes
kubectl apply -f .
```

## 故障排除

### 常见问题

1. **Docker 镜像拉取失败**
   
   **错误信息**：
   ```
   failed to resolve source metadata for docker.io/library/node:20-alpine
   failed to fetch oauth token: Post "https://auth.docker.io/token"
   connectex: A connection attempt failed...
   ```
   
   **解决方案 1：直接使用 Docker Hub 镜像（推荐）**
   ```bash
   # 使用预构建的镜像，无需本地构建
   docker pull grapher01110/video-script-monitor:latest
   docker-compose up -d
   ```
   
   **解决方案 2：配置 Docker 镜像加速器**
   - 打开 Docker Desktop
   - 点击设置（齿轮图标）→ Docker Engine
   - 添加以下配置：
   ```json
   {
     "registry-mirrors": [
       "https://registry.cn-hangzhou.aliyuncs.com",
       "https://docker.mirrors.ustc.edu.cn",
       "https://hub-mirror.c.163.com",
       "https://mirror.baidubce.com"
     ]
   }
   ```
   - 点击 "Apply & Restart"
   - 等待 Docker Desktop 重启完成后重新拉取镜像

2. **端口冲突**
   
   **Windows PowerShell**：
   ```powershell
   # 检查端口占用
   netstat -ano | findstr :8080
   
   # 查看占用该端口的进程
   Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess
   ```
   
   **解决方案**：修改 docker-compose.yml 中的端口映射
   ```yaml
   ports:
     - "8081:8080"  # 将主机端口改为 8081
   ```

3. **权限问题（使用本地目录挂载时）**
   
   如果使用本地目录而非 Docker 卷，可能遇到权限问题：
   
   **Linux/Mac**：
   ```bash
   # 检查目录权限
   ls -la /path/to/watch/directory
   
   # 修改权限
   chmod 755 /path/to/watch/directory
   ```
   
   **Windows**：
   - Docker Desktop 通常会自动处理权限
   - 确保 Docker Desktop 有访问相应目录的权限
   - 在 Docker Desktop 设置中检查 "Resources" → "File Sharing"

4. **容器无法启动**
   ```bash
   # 查看容器日志
   docker logs video-script-monitor
   
   # 查看详细的容器信息
   docker inspect video-script-monitor
   
   # 检查镜像是否存在
   docker images grapher01110/video-script-monitor
   
   # 检查 Docker Compose 配置是否正确
   docker-compose config
   ```

5. **文件监控不工作**
   ```bash
   # 检查卷挂载
   docker volume inspect n8n_workspace
   
   # 检查容器内的目录
   docker exec video-script-monitor ls -la /app/watch
   
   # 检查环境变量
   docker exec video-script-monitor env | grep WATCH
   
   # 查看容器日志中的监控信息
   docker logs video-script-monitor | grep -i watch
   ```
   
   **常见原因**：
   - Docker 卷未创建：运行 `docker volume create n8n_workspace`
   - 监控目录为空：检查卷中是否有视频任务目录
   - 文件结构不符合要求：确保每个任务目录下有 `script.json` 文件

6. **健康检查失败**
   ```bash
   # 查看健康检查状态
   docker ps
   
   # 查看健康检查日志
   docker inspect --format='{{json .State.Health}}' video-script-monitor | jq
   
   # 手动测试健康检查端点
   docker exec video-script-monitor curl -f http://localhost:8080/health
   ```

### 调试模式

启用调试模式查看详细日志：

**方法 1：修改 docker-compose.yml**

临时修改环境变量：
```yaml
environment:
  - NODE_ENV=development  # 改为 development
  - LOG_LEVEL=debug       # 改为 debug
```

然后重启容器：
```bash
docker-compose down
docker-compose up -d
```

**方法 2：使用环境变量覆盖**

```bash
# 停止现有容器
docker-compose down

# 使用环境变量启动
NODE_ENV=development LOG_LEVEL=debug docker-compose up -d

# 查看详细日志
docker-compose logs -f
```

**方法 3：直接查看实时日志**

```bash
# 查看所有日志
docker logs -f video-script-monitor

# 只查看最近100行
docker logs --tail 100 -f video-script-monitor
```

## 更新和维护

### 更新应用

使用 Docker Compose 更新应用：

```bash
# 拉取最新镜像
docker pull grapher01110/video-script-monitor:latest

# 重新启动容器（会自动使用新镜像）
docker-compose up -d

# 或者使用完整的更新流程
docker-compose down
docker-compose pull
docker-compose up -d
```

手动更新方式：

```bash
# 停止并删除旧容器
docker stop video-script-monitor
docker rm video-script-monitor

# 拉取最新镜像
docker pull grapher01110/video-script-monitor:latest

# 使用 docker-compose 启动新容器
docker-compose up -d
```

### 备份数据

备份 Docker 卷数据：

```bash
# 备份监控目录卷
docker run --rm \
  -v n8n_workspace:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/n8n-workspace-backup-$(date +%Y%m%d).tar.gz -C /data .

# 备份容器配置
docker inspect video-script-monitor > container-config.json
```

恢复备份数据：

```bash
# 恢复监控目录卷
docker run --rm \
  -v n8n_workspace:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/n8n-workspace-backup-20250101.tar.gz"
```

### 管理 Docker 卷数据

向监控卷添加视频任务数据：

```bash
# 方法 1：使用临时容器复制文件
docker run --rm \
  -v n8n_workspace:/data \
  -v /path/to/your/local/tasks:/source \
  alpine cp -r /source/* /data/

# 方法 2：直接访问卷的挂载点（需要容器运行）
# 首先找到卷的实际位置
docker volume inspect n8n_workspace

# 在 Windows 上，Docker Desktop 使用 WSL2
# 可以通过以下方式访问：
# \\wsl$\docker-desktop-data\data\docker\volumes\n8n_workspace\_data

# 方法 3：通过运行中的容器复制文件
docker cp /path/to/local/task video-script-monitor:/app/watch/
```

查看卷中的数据：

```bash
# 列出卷中的文件
docker run --rm \
  -v n8n_workspace:/data \
  alpine ls -la /data

# 查看特定任务目录
docker run --rm \
  -v n8n_workspace:/data \
  alpine ls -la /data/your-task-name
```

清理卷数据：

```bash
# 警告：这将删除所有数据！
docker volume rm n8n_workspace

# 如果卷正在使用中，先停止容器
docker-compose down
docker volume rm n8n_workspace

# 重新创建卷
docker volume create n8n_workspace
```

## 性能优化

### 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  video-script-monitor:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 日志轮转

配置日志轮转避免日志文件过大：

```yaml
services:
  video-script-monitor:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 常用命令快速参考

### 基本操作

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 卷管理

```bash
# 创建卷
docker volume create n8n_workspace

# 查看卷列表
docker volume ls

# 查看卷详情
docker volume inspect n8n_workspace

# 删除卷
docker volume rm n8n_workspace
```

### 镜像管理

```bash
# 拉取镜像
docker pull grapher01110/video-script-monitor:latest

# 查看镜像
docker images grapher01110/video-script-monitor

# 删除镜像
docker rmi grapher01110/video-script-monitor:latest

# 清理悬空镜像
docker image prune -f
```

### 容器管理

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 进入容器
docker exec -it video-script-monitor sh

# 查看容器日志
docker logs video-script-monitor

# 查看容器资源使用
docker stats video-script-monitor
```

## 相关链接

- **项目主页**: [GitHub Repository](https://github.com/grapher01110/video-script-monitor)
- **Docker Hub**: [grapher01110/video-script-monitor](https://hub.docker.com/r/grapher01110/video-script-monitor)
- **问题反馈**: [GitHub Issues](https://github.com/grapher01110/video-script-monitor/issues)
- **文档**: 
  - [README.md](README.md) - 项目说明
  - [README-zh.md](README-zh.md) - 中文文档

## 常见问题（FAQ）

### Q: 如何查看监控目录中有哪些文件？
```bash
docker exec video-script-monitor ls -la /app/watch/ai-video
```

### Q: 如何向监控目录添加新的视频任务？
```bash
docker cp /path/to/your/task-folder video-script-monitor:/app/watch/ai-video/
```

### Q: 容器启动后无法访问 Web 界面？
1. 检查容器是否正常运行：`docker ps`
2. 检查端口映射：`docker port video-script-monitor`
3. 检查健康状态：`docker inspect video-script-monitor | grep Health`
4. 查看日志排查错误：`docker logs video-script-monitor`

### Q: 如何更新到最新版本？
```bash
docker-compose down
docker pull grapher01110/video-script-monitor:latest
docker-compose up -d
```

### Q: 数据会丢失吗？
不会。数据存储在 Docker 卷中，即使容器被删除，数据仍然保留。只有手动删除卷时数据才会丢失。

### Q: 如何在 Windows PowerShell 中使用这些命令？
大部分命令在 PowerShell 中都可以直接使用。对于包含 `$(pwd)` 的命令，可以替换为 `${PWD}` 或使用完整路径。

---

**提示**：如有任何问题或建议，欢迎在 GitHub 上提交 Issue 或 Pull Request。
