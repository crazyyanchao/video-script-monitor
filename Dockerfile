# 多阶段构建 Dockerfile
ARG APP_VERSION=latest
FROM node:20.18-alpine3.21 AS builder
ARG APP_VERSION=latest

# 添加镜像元数据标签
LABEL maintainer="grapher01110"
LABEL description="Video Script Monitor - 视频脚本监控和管理平台"
LABEL version="${APP_VERSION}"
LABEL org.opencontainers.image.title="video-script-monitor"
LABEL org.opencontainers.image.description="Real-time monitoring and management platform for video script production"
LABEL org.opencontainers.image.vendor="grapher01110"
LABEL org.opencontainers.image.version="${APP_VERSION}"

# 更新系统包并安装 pnpm
RUN apk update && apk upgrade && \
    npm install -g pnpm@latest

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括开发依赖）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建前端
RUN pnpm run build

# 生产环境镜像
FROM node:20.18-alpine3.21 AS production

# 更新系统包并安装必要依赖
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    npm install -g pnpm@latest

WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 复制后端源代码
COPY src/backend ./src/backend
COPY src/shared ./src/shared

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 创建监控目录
RUN mkdir -p /app/watch

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# 启动命令
CMD ["pnpm", "start"]
