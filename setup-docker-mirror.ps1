# Docker 镜像加速器配置脚本
# 适用于 Windows Docker Desktop

Write-Host "=== Docker 镜像加速器配置脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "错误: Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
    exit 1
}

# Docker Desktop 配置文件路径
$dockerConfigPath = "$env:USERPROFILE\.docker"
$daemonJsonPath = "$dockerConfigPath\daemon.json"

Write-Host "Docker 配置目录: $dockerConfigPath" -ForegroundColor Yellow
Write-Host ""

# 创建配置目录（如果不存在）
if (-not (Test-Path $dockerConfigPath)) {
    Write-Host "创建 Docker 配置目录..." -ForegroundColor Green
    New-Item -ItemType Directory -Path $dockerConfigPath -Force | Out-Null
}

# 备份现有配置（如果存在）
if (Test-Path $daemonJsonPath) {
    $backupPath = "$daemonJsonPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "备份现有配置到: $backupPath" -ForegroundColor Yellow
    Copy-Item $daemonJsonPath $backupPath
}

# 复制新配置
Write-Host "配置镜像加速器..." -ForegroundColor Green
Copy-Item "daemon.json" $daemonJsonPath -Force

Write-Host ""
Write-Host "配置文件已更新!" -ForegroundColor Green
Write-Host ""
Write-Host "请按照以下步骤完成配置:" -ForegroundColor Yellow
Write-Host "1. 右键点击系统托盘中的 Docker 图标" -ForegroundColor White
Write-Host "2. 选择 'Restart Docker Desktop' 重启 Docker" -ForegroundColor White
Write-Host "3. 等待 Docker 重启完成后，再次运行构建命令" -ForegroundColor White
Write-Host ""
Write-Host "或者，您也可以使用国内镜像源构建:" -ForegroundColor Cyan
Write-Host "  ./docker-build.sh build-cn" -ForegroundColor Green
Write-Host ""

# 显示当前配置
Write-Host "当前镜像加速器配置:" -ForegroundColor Cyan
Get-Content daemon.json | Write-Host -ForegroundColor Gray
