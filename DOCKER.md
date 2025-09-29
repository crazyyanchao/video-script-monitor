# Docker 部署指南

本文档介绍如何使用 Docker 部署视频脚本监控系统。

## 快速开始

### 1. 构建镜像

```bash
# 方式1：使用国内镜像源构建（推荐，解决网络问题）
./docker-build.sh build-cn

# 方式2：使用标准 Docker Hub（需要配置镜像加速器）
./docker-build.sh build

# 方式3：直接使用 docker 命令
docker build -f Dockerfile.cn -t video-script-monitor:latest .
```

**网络问题解决方案**：

如果遇到 Docker 拉取镜像失败的问题，有两种解决方案：

1. **使用国内镜像源（最快）**：
   ```bash
   ./docker-build.sh build-cn
   ```

2. **配置 Docker 镜像加速器**：
   ```powershell
   # Windows PowerShell
   .\setup-docker-mirror.ps1
   # 然后重启 Docker Desktop
   ```

### 2. 启动容器

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或使用 docker run
docker run -d \
  --name video-script-monitor \
  -p 8080:8080 \
  -v $(pwd)/data:/app/watch \
  -e NPM_CONFIG_PACKAGE_MANAGER=pnpm \
  video-script-monitor:latest
```

### 3. 访问应用

打开浏览器访问：http://localhost:8080

## 详细说明

### 文件结构

```
├── Dockerfile              # Docker 镜像构建文件
├── docker-compose.yml      # Docker Compose 配置
├── .dockerignore           # Docker 忽略文件
├── docker-build.sh         # 构建和部署脚本
├── env.example             # 环境变量示例
└── DOCKER.md              # 本文档
```

### 环境变量配置

复制 `env.example` 为 `.env` 并修改相应配置：

```bash
cp env.example .env
```

主要配置项：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | production | 运行环境 |
| PORT | 8080 | 服务端口 |
| WATCH_DIRECTORY | /app/watch | 监控目录 |
| LOG_LEVEL | info | 日志级别 |

### 构建脚本使用

`docker-build.sh` 脚本提供了便捷的构建和部署命令：

```bash
# 构建镜像（使用标准 Docker Hub）
./docker-build.sh build

# 构建镜像（使用国内镜像源，推荐）
./docker-build.sh build-cn

# 构建镜像（使用本地镜像源）
./docker-build.sh build-local

# 推送镜像到 Docker Hub
./docker-build.sh push

# 部署容器
./docker-build.sh deploy

# 使用 docker-compose 部署
./docker-build.sh compose

# 清理资源
./docker-build.sh clean

# 显示帮助
./docker-build.sh help
```

**注意**：使用推送功能前，请先修改脚本中的 `DOCKER_USERNAME` 变量。

### Docker Compose 配置

`docker-compose.yml` 提供了完整的服务配置：

- 自动重启策略
- 健康检查
- 卷挂载
- 环境变量配置
- 网络配置

### 监控目录挂载

系统需要监控的目录应该挂载到容器的 `/app/watch` 路径：

```yaml
volumes:
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
   
   **解决方案 1：使用国内镜像源（推荐）**
   ```bash
   # 使用 Dockerfile.cn 构建，它使用阿里云镜像
   ./docker-build.sh build-cn
   ```
   
   **解决方案 2：配置 Docker 镜像加速器**
   ```powershell
   # Windows PowerShell
   .\setup-docker-mirror.ps1
   ```
   然后：
   - 右键点击系统托盘的 Docker 图标
   - 选择 "Restart Docker Desktop"
   - 等待重启完成后重新构建
   
   **解决方案 3：手动配置 Docker Desktop**
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

2. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep 8080
   
   # 修改端口映射
   docker run -p 8081:8080 video-script-monitor:latest
   ```

2. **权限问题**
   ```bash
   # 检查目录权限
   ls -la /path/to/watch/directory
   
   # 修改权限
   chmod 755 /path/to/watch/directory
   ```

3. **容器无法启动**
   ```bash
   # 查看容器日志
   docker logs video-script-monitor
   
   # 检查镜像是否存在
   docker images | grep video-script-monitor
   ```

4. **文件监控不工作**
   ```bash
   # 检查挂载目录
   docker exec video-script-monitor ls -la /app/watch
   
   # 检查环境变量
   docker exec video-script-monitor env | grep WATCH
   ```

### 调试模式

启用调试模式查看详细日志：

```bash
docker run -d \
  --name video-script-monitor \
  -p 8080:8080 \
  -v $(pwd)/data:/app/watch \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  -e NPM_CONFIG_PACKAGE_MANAGER=pnpm \
  video-script-monitor:latest
```

## 更新和维护

### 更新应用

```bash
# 拉取最新镜像
docker pull yourusername/video-script-monitor:latest

# 停止旧容器
docker stop video-script-monitor

# 删除旧容器
docker rm video-script-monitor

# 启动新容器
docker run -d \
  --name video-script-monitor \
  -p 8080:8080 \
  -v $(pwd)/data:/app/watch \
  -e NPM_CONFIG_PACKAGE_MANAGER=pnpm \
  yourusername/video-script-monitor:latest
```

### 备份数据

```bash
# 备份监控目录
tar -czf video-tasks-backup-$(date +%Y%m%d).tar.gz /path/to/watch/directory

# 备份容器配置
docker inspect video-script-monitor > container-config.json
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
