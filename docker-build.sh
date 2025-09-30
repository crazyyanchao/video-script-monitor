#!/bin/bash

# 生产环境构建脚本 - 发布到 Docker Hub
# 使用方法: ./docker-build.sh [版本号]
# 例如: ./docker-build.sh 1.0.0
# 如果不提供版本号,将自动从 package.json 中读取

# 设置构建参数
IMAGE_NAME="video-script-monitor"
DOCKERFILE="Dockerfile"
BASE_IMAGE="node"

# 检查是否提供了版本号参数,如果没有则从 package.json 中读取
if [ $# -eq 0 ]; then
    echo "未提供版本号,从 package.json 中读取..."
    # 使用 node 读取 package.json 中的版本号
    VERSION=$(node -p "require('./package.json').version")
    
    if [ -z "$VERSION" ]; then
        echo "错误: 无法从 package.json 中读取版本号"
        exit 1
    fi
    
    echo "从 package.json 读取到版本号: $VERSION"
else
    VERSION=$1
fi
LATEST_TAG="latest"
VERSION_TAG="$VERSION"

# 设置 Docker Hub 用户名（请根据实际情况修改）
DOCKER_USERNAME="grapher01110"
FULL_IMAGE_NAME="$DOCKER_USERNAME/$IMAGE_NAME"

echo "=========================================="
echo "开始构建生产环境镜像"
echo "镜像名称: $FULL_IMAGE_NAME"
echo "版本: $VERSION_TAG"
echo "最新标签: $LATEST_TAG"
echo "基础镜像: $BASE_IMAGE:20-alpine"
echo "=========================================="

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker 未运行或无法连接"
    exit 1
fi

# 检查是否已登录 Docker Hub
if ! docker info | grep -q "Username"; then
    echo "警告: 未检测到 Docker Hub 登录信息"
    echo "请先运行: docker login"
    read -p "是否继续构建？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 删除现有镜像（如果存在）
echo "清理现有镜像..."
docker rmi $FULL_IMAGE_NAME:$VERSION_TAG 2>/dev/null || echo "版本镜像不存在，跳过删除"
docker rmi $FULL_IMAGE_NAME:$LATEST_TAG 2>/dev/null || echo "最新镜像不存在，跳过删除"

# 构建版本镜像
echo "构建版本镜像 $FULL_IMAGE_NAME:$VERSION_TAG..."
docker build \
    --file $DOCKERFILE \
    --build-arg APP_VERSION=$VERSION_TAG \
    --tag $FULL_IMAGE_NAME:$VERSION_TAG \
    --tag $FULL_IMAGE_NAME:$LATEST_TAG \
    --no-cache \
    .

# 检查构建是否成功
if [ $? -ne 0 ]; then
    echo "错误: 镜像构建失败"
    exit 1
fi

echo "镜像构建成功！"

# 显示镜像信息
echo "构建的镜像信息:"
docker images $FULL_IMAGE_NAME

# 推送镜像到 Docker Hub
echo "=========================================="
echo "推送镜像到 Docker Hub..."
echo "=========================================="

# 推送版本镜像
echo "推送版本镜像 $FULL_IMAGE_NAME:$VERSION_TAG..."
docker push $FULL_IMAGE_NAME:$VERSION_TAG

if [ $? -ne 0 ]; then
    echo "错误: 版本镜像推送失败"
    exit 1
fi

# 推送最新标签镜像
echo "推送最新标签镜像 $FULL_IMAGE_NAME:$LATEST_TAG..."
docker push $FULL_IMAGE_NAME:$LATEST_TAG

if [ $? -ne 0 ]; then
    echo "错误: 最新标签镜像推送失败"
    exit 1
fi

echo "=========================================="
echo "镜像发布成功！"
echo "=========================================="
echo "镜像地址: https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME"
echo "拉取命令:"
echo "  docker pull $FULL_IMAGE_NAME:$VERSION_TAG"
echo "  docker pull $FULL_IMAGE_NAME:$LATEST_TAG"
echo "=========================================="

# 清理本地镜像（可选）
read -p "是否清理本地镜像以节省空间？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "清理本地镜像..."
    docker rmi $FULL_IMAGE_NAME:$VERSION_TAG
    docker rmi $FULL_IMAGE_NAME:$LATEST_TAG
    echo "本地镜像已清理"
fi
