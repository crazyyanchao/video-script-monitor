# Docker 网络问题修复说明

## 问题描述

在中国大陆地区，由于网络限制，直接从 Docker Hub 拉取镜像可能会失败，错误信息如下：

```
ERROR: failed to solve: node:20-alpine: failed to resolve source metadata 
for docker.io/library/node:20-alpine: failed to authorize: failed to fetch 
oauth token: Post "https://auth.docker.io/token": dial tcp xxx.xxx.xxx.xxx:443: 
connectex: A connection attempt failed...
```

## 解决方案

### 方案 1：使用国内镜像源（推荐，最快）⭐

直接使用预配置好的 Dockerfile.cn：

```bash
./docker-build.sh build-cn
```

**优点**：
- ✅ 无需配置，开箱即用
- ✅ 使用阿里云镜像源，速度快
- ✅ 同时配置了 npm/pnpm 国内镜像

**Dockerfile.cn 特性**：
- 基础镜像：`registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine`
- npm registry：`https://registry.npmmirror.com`
- pnpm registry：`https://registry.npmmirror.com`

### 方案 2：配置 Docker 镜像加速器（一劳永逸）

运行配置脚本：

```powershell
# Windows PowerShell
.\setup-docker-mirror.ps1
```

然后：
1. 右键点击系统托盘的 Docker Desktop 图标
2. 选择 "Restart Docker Desktop"
3. 等待 Docker 重启完成
4. 运行标准构建命令：
   ```bash
   ./docker-build.sh build
   ```

**优点**：
- ✅ 一次配置，永久生效
- ✅ 所有项目都能受益
- ✅ 支持多个镜像源自动切换

**配置的镜像源**：
- 阿里云：`https://registry.cn-hangzhou.aliyuncs.com`
- 中科大：`https://docker.mirrors.ustc.edu.cn`
- 网易：`https://hub-mirror.c.163.com`
- 百度：`https://mirror.baidubce.com`

### 方案 3：手动配置 Docker Desktop

1. 打开 Docker Desktop
2. 点击右上角设置图标（齿轮）
3. 选择左侧菜单的 "Docker Engine"
4. 在配置文件中添加或修改 `registry-mirrors` 部分：

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

5. 点击 "Apply & Restart"
6. 等待 Docker 重启完成

## 新增文件说明

### 📄 Dockerfile.cn
使用国内镜像源的 Dockerfile，包含：
- 阿里云 Node.js 镜像
- npm/pnpm 国内镜像配置

### 📄 setup-docker-mirror.ps1
Windows PowerShell 自动配置脚本，功能：
- 检查 Docker 运行状态
- 备份现有配置
- 复制镜像加速器配置
- 提供后续操作指引

### 📄 daemon.json
Docker 镜像加速器配置文件，包含：
- 多个国内镜像源
- 基础 Docker 配置

## 构建选项对比

| 命令 | 使用场景 | 网络要求 | 速度 |
|------|---------|---------|------|
| `./docker-build.sh build-cn` | 国内用户（推荐） | 低 | ⚡⚡⚡ 快 |
| `./docker-build.sh build` | 配置加速器后 | 中 | ⚡⚡ 较快 |
| `./docker-build.sh build` | 海外用户 | 高 | ⚡ 正常 |

## 验证配置

### 验证镜像加速器配置

```bash
# 查看 Docker 配置
docker info

# 查找 Registry Mirrors 部分
docker info | grep -A 5 "Registry Mirrors"
```

### 测试构建

```bash
# 使用国内镜像源测试
./docker-build.sh build-cn

# 查看构建日志，确认使用了正确的镜像源
```

## 常见问题

### Q1：为什么推荐使用 build-cn？
**A**：`build-cn` 直接使用阿里云镜像，无需配置，构建速度最快，且不受 Docker Desktop 配置影响。

### Q2：配置镜像加速器后，原有 Dockerfile 还能用吗？
**A**：可以。配置镜像加速器后，`./docker-build.sh build` 会自动使用加速器拉取镜像。

### Q3：两种方案可以同时使用吗？
**A**：可以。配置镜像加速器是全局配置，不影响使用 `Dockerfile.cn`。

### Q4：镜像加速器配置会影响其他项目吗？
**A**：会（好的影响）。配置后，所有 Docker 项目都会使用镜像加速器。

### Q5：setup-docker-mirror.ps1 做了什么？
**A**：它会将 `daemon.json` 复制到 `$env:USERPROFILE\.docker\daemon.json`，并提示重启 Docker Desktop。

## 进一步阅读

- [Docker 官方文档 - Registry mirrors](https://docs.docker.com/registry/recipes/mirror/)
- [阿里云容器镜像服务](https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors)
- 完整部署文档：[DOCKER.md](./DOCKER.md)

## 贡献

如果您发现更好的镜像源或有改进建议，欢迎提交 PR！
