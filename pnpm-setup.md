# pnpm 使用指南

本文档说明如何在 video-script-monitor 项目中使用 pnpm 进行包管理。

## 安装 pnpm

如果你还没有安装 pnpm，可以通过以下方式安装：

### Windows
```bash
# 使用 npm 安装
npm install -g pnpm

# 或使用 PowerShell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### macOS/Linux
```bash
# 使用 curl
curl -fsSL https://get.pnpm.io/install.sh | sh -

# 或使用 npm
npm install -g pnpm
```

## 验证安装

安装完成后，验证 pnpm 是否正确安装：

```bash
pnpm --version
```

## 项目设置

### 1. 安装依赖

```bash
# 进入项目目录
cd video-script-monitor

# 安装所有依赖
pnpm install
```

### 2. 开发模式启动

```bash
# 同时启动前后端开发服务器
pnpm run dev

# 或分别启动
pnpm run dev:backend  # 后端服务 (端口 8080)
pnpm run dev:frontend # 前端服务 (端口 3000)
```

## 常用命令

### 依赖管理

```bash
# 添加生产依赖
pnpm add <package>

# 添加开发依赖
pnpm add -D <package>

# 添加全局依赖
pnpm add -g <package>

# 移除依赖
pnpm remove <package>

# 更新依赖
pnpm update

# 更新指定依赖
pnpm update <package>
```

### 项目命令

```bash
# 构建项目
pnpm run build

# 预览构建结果
pnpm run preview

# 类型检查
pnpm run typecheck

# 清理依赖缓存
pnpm run clean

# 生产环境启动
pnpm run start:prod
```

### 存储管理

```bash
# 清理存储
pnpm store prune

# 查看存储状态
pnpm store status
```

## pnpm 优势

相比 npm/yarn，pnpm 具有以下优势：

1. **更快的安装速度** - 使用硬链接和符号链接，避免重复下载
2. **更小的磁盘空间占用** - 所有依赖存储在全局存储中
3. **更好的依赖隔离** - 每个项目都有独立的依赖树
4. **更高的安全性** - 默认情况下不允许幽灵依赖

## 故障排除

### 如果遇到依赖问题

```bash
# 删除 node_modules 和 pnpm-lock.yaml
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### 如果遇到权限问题

```bash
# Windows
pnpm setup

# macOS/Linux
sudo pnpm setup
```

### 如果遇到缓存问题

```bash
# 清理 pnpm 缓存
pnpm store prune

# 重新安装
pnpm install
```

## 配置说明

项目中的 `.npmrc` 文件包含了 pnpm 的配置：

```ini
# pnpm 配置
shamefully-hoist=true        # 允许提升依赖
hoist-pattern[]=*            # 提升所有依赖
strict-peer-dependencies=false # 宽松处理 peer 依赖
prefer-frozen-lockfile=true  # 优先使用锁定文件
```

这些配置确保了项目在各种环境下的兼容性。

## 最佳实践

1. **始终提交 pnpm-lock.yaml** - 确保团队成员使用相同的依赖版本
2. **定期更新依赖** - 使用 `pnpm update` 保持依赖最新
3. **使用 pnpm 脚本** - 在 package.json 中定义所有构建和运行脚本
4. **利用工作空间** - 如果项目有多个包，考虑使用 pnpm 工作空间

## 更多信息

- [pnpm 官方文档](https://pnpm.io/)
- [pnpm CLI 命令参考](https://pnpm.io/cli/add)
- [pnpm 配置文件](https://pnpm.io/npmrc)