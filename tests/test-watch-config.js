// 测试监控目录配置
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模拟环境变量
process.env.WATCH_DIRECTORY = './custom-watch';

// 模拟getWatchDirectory函数
function getWatchDirectory() {
  const envWatchDir = process.env.WATCH_DIRECTORY;
  if (envWatchDir) {
    return path.resolve(envWatchDir);
  }
  return path.join(process.cwd(), 'data');
}

// 模拟extractVideoIdFromPath函数
function extractVideoIdFromPath(taskPath) {
  const parts = taskPath.split(path.sep);
  const watchDir = getWatchDirectory();
  const watchDirParts = watchDir.split(path.sep);
  
  // 查找监控目录的索引
  const watchDirIndex = parts.findIndex((part, index) => {
    // 检查从当前索引开始的路径是否匹配监控目录
    return watchDirParts.every((watchPart, i) => 
      parts[index + i] === watchPart
    );
  });
  
  if (watchDirIndex !== -1 && watchDirIndex + watchDirParts.length < parts.length) {
    // 返回监控目录下的第一级完整子目录名作为videoId
    return parts[watchDirIndex + watchDirParts.length];
  }
  
  // 如果没找到监控目录，返回最后一个目录名
  return path.basename(taskPath);
}

// 测试用例
console.log('=== 监控目录配置测试 ===');
console.log('配置的监控目录:', getWatchDirectory());

// 测试路径提取
const testPaths = [
  path.join('D:', 'workspace', 'crazyyanchao', 'video-script-monitor', 'custom-watch', 'video1', 'script.json'),
  path.join('D:', 'workspace', 'crazyyanchao', 'video-script-monitor', 'custom-watch', 'video2', 'shot_001.prompt'),
  path.join(process.cwd(), 'custom-watch', 'video3', 'script.json'),
  path.join('C:', 'path', 'to', 'custom-watch', 'video4', 'script.json')
];

testPaths.forEach((testPath, index) => {
  const videoId = extractVideoIdFromPath(testPath);
  console.log(`测试 ${index + 1}:`);
  console.log(`  路径: ${testPath}`);
  console.log(`  提取的videoId: ${videoId}`);
  console.log('');
});

// 测试默认配置
delete process.env.WATCH_DIRECTORY;
console.log('默认监控目录:', getWatchDirectory());
