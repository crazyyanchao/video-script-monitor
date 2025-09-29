#!/bin/bash

# Docker 构建和部署脚本
# 使用方法: ./docker-build.sh [build|push|deploy|clean]

set -e

# 配置变量
IMAGE_NAME="video-script-monitor"
TAG_LATEST="latest"
TAG_VERSION="v1.0.0"
DOCKER_USERNAME="yourusername"  # 请修改为您的Docker Hub用户名
REGISTRY_URL=""  # 可选：私有仓库地址

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 构建镜像
build_image() {
    log_info "开始构建 Docker 镜像..."
    
    # 构建最新版本
    docker build -t ${IMAGE_NAME}:${TAG_LATEST} .
    log_info "构建完成: ${IMAGE_NAME}:${TAG_LATEST}"
    
    # 构建指定版本
    docker build -t ${IMAGE_NAME}:${TAG_VERSION} .
    log_info "构建完成: ${IMAGE_NAME}:${TAG_VERSION}"
    
    # 显示镜像信息
    docker images | grep ${IMAGE_NAME}
}

# 推送镜像
push_image() {
    if [ -z "$DOCKER_USERNAME" ] || [ "$DOCKER_USERNAME" = "yourusername" ]; then
        log_error "请先设置 DOCKER_USERNAME 变量"
        exit 1
    fi
    
    log_info "开始推送镜像到 Docker Hub..."
    
    # 标记镜像
    docker tag ${IMAGE_NAME}:${TAG_LATEST} ${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG_LATEST}
    docker tag ${IMAGE_NAME}:${TAG_VERSION} ${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG_VERSION}
    
    # 推送镜像
    docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG_LATEST}
    docker push ${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG_VERSION}
    
    log_info "镜像推送完成"
}

# 部署容器
deploy_container() {
    log_info "开始部署容器..."
    
    # 停止并删除现有容器
    docker stop video-script-monitor 2>/dev/null || true
    docker rm video-script-monitor 2>/dev/null || true
    
    # 启动新容器
    docker run -d \
        --name video-script-monitor \
        --restart unless-stopped \
        -p 8080:8080 \
        -v $(pwd)/data:/app/watch \
        -e NODE_ENV=production \
        -e WATCH_DIRECTORY=/app/watch \
        ${IMAGE_NAME}:${TAG_LATEST}
    
    log_info "容器部署完成"
    log_info "访问地址: http://localhost:8080"
}

# 使用 docker-compose 部署
deploy_compose() {
    log_info "使用 docker-compose 部署..."
    
    # 停止现有服务
    docker-compose down 2>/dev/null || true
    
    # 启动服务
    docker-compose up -d
    
    log_info "docker-compose 部署完成"
    log_info "访问地址: http://localhost:8080"
}

# 清理资源
clean_resources() {
    log_info "开始清理 Docker 资源..."
    
    # 停止并删除容器
    docker stop video-script-monitor 2>/dev/null || true
    docker rm video-script-monitor 2>/dev/null || true
    
    # 删除镜像
    docker rmi ${IMAGE_NAME}:${TAG_LATEST} 2>/dev/null || true
    docker rmi ${IMAGE_NAME}:${TAG_VERSION} 2>/dev/null || true
    
    # 清理悬空镜像
    docker image prune -f
    
    log_info "清理完成"
}

# 显示帮助信息
show_help() {
    echo "Docker 构建和部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 build     - 构建 Docker 镜像"
    echo "  $0 push      - 推送镜像到 Docker Hub"
    echo "  $0 deploy    - 部署容器"
    echo "  $0 compose   - 使用 docker-compose 部署"
    echo "  $0 clean     - 清理 Docker 资源"
    echo "  $0 help      - 显示帮助信息"
    echo ""
    echo "配置变量:"
    echo "  IMAGE_NAME: ${IMAGE_NAME}"
    echo "  TAG_LATEST: ${TAG_LATEST}"
    echo "  TAG_VERSION: ${TAG_VERSION}"
    echo "  DOCKER_USERNAME: ${DOCKER_USERNAME}"
}

# 主函数
main() {
    case "${1:-help}" in
        build)
            build_image
            ;;
        push)
            push_image
            ;;
        deploy)
            deploy_container
            ;;
        compose)
            deploy_compose
            ;;
        clean)
            clean_resources
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
