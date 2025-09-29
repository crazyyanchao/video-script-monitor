import fs from 'fs';
import path from 'path';
import { ScriptData, ShotDetail, AssetFile } from '../shared/types/index';

export class ScriptParser {
  parseScriptFile(scriptPath: string): ScriptData | null {
    try {
      if (!fs.existsSync(scriptPath)) {
        console.error(`脚本文件不存在: ${scriptPath}`);
        return null;
      }

      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      const scriptData = JSON.parse(scriptContent);

      // 验证基础结构
      if (!(scriptData.videoId || scriptData.video_id) || !scriptData.title) {
        console.error('脚本文件格式错误: 缺少必要的字段');
        return null;
      }

      // 解析分镜信息
      const shots: ScriptData['shots'] = [];
      if (Array.isArray(scriptData.shots)) {
        scriptData.shots.forEach((shot: any, index: number) => {
          shots.push({
            shotId: shot.shot_id || shot.shotId || `shot_${index + 1}`,
            shotNumber: index + 1,
            startTime: shot.start_sec || shot.startTime || 0,
            endTime: shot.end_sec || shot.endTime || 0,
            description: shot.description || '',
            dialogue: shot.dialogue || '',
            roleId: shot.role_id || shot.roleId || '',
          });
        });
      }

      return {
        videoId: scriptData.video_id || scriptData.videoId,
        title: scriptData.title,
        shots,
        audioConfig: scriptData.audioConfig || {
          sampleRate: 44100,
          channels: 2,
        },
      };
    } catch (error) {
      console.error(`解析脚本文件失败: ${scriptPath}`, error);
      return null;
    }
  }

  findAssetsForShots(scriptData: ScriptData, videoTaskPath: string): ShotDetail[] {
    const shotDetails: ShotDetail[] = [];
    
    if (!fs.existsSync(videoTaskPath)) {
      return shotDetails;
    }

    const files = this.getAllFiles(videoTaskPath);
    // 从路径中提取完整的目录名作为videoId
    const actualVideoId = this.extractVideoIdFromPath(videoTaskPath);

    scriptData.shots.forEach(shot => {
      const shotAssets: AssetFile[] = [];
      
      // 查找与分镜相关的文件
      files.forEach(filePath => {
        const fileName = path.basename(filePath);
        
        // 更精确的文件名匹配逻辑 - 使用严格模式避免重复匹配
        const shotNumberStr = shot.shotNumber.toString().padStart(2, '0');
        const shotNumberSimple = shot.shotNumber.toString();
        
        // 图片/视频文件：精确匹配 shot_01、shot_02 等
        const isImageOrVideo = fileName.startsWith('shot_') && 
                              (fileName === `shot_${shotNumberStr}.jpg` ||
                               fileName === `shot_${shotNumberStr}.mp4` ||
                               fileName === `shot_${shotNumberSimple}.jpg` ||
                               fileName === `shot_${shotNumberSimple}.mp4`);
        
        // 音频文件：精确匹配 audio_01、audio_02 等  
        const isAudio = fileName.startsWith('audio_') &&
                       (fileName === `audio_${shotNumberStr}.mp3` ||
                        fileName === `audio_${shotNumberSimple}.mp3`);
        
        // 角色参考图片：只匹配固定文件
        const isRoleImage = fileName === 'host.jpg' || fileName === 'guest.jpg' || fileName === 'cover.jpg';
        
        // 排除cache目录和角色参考图片
        if (filePath.includes('cache') || isRoleImage) {
          return;
        }
        
        // 只有当文件名精确匹配当前分镜时才添加
        if (isImageOrVideo || isAudio) {
          const stats = fs.statSync(filePath);
          const fileType = this.detectFileType(fileName);
          
          if (fileType) {
            // 将绝对路径转换为相对路径，用于前端访问
            const relativePath = this.getRelativePath(filePath, videoTaskPath);
            
            console.log(`分镜 ${shot.shotId} 匹配文件: ${fileName}, 类型: ${fileType}, 相对路径: ${relativePath}`);
            
            shotAssets.push({
              fileId: `${actualVideoId}_${fileName}_${Date.now()}`,
              videoId: actualVideoId,
              fileType,
              filePath: relativePath,
              fileName,
              createdAt: stats.birthtime,
              fileSize: stats.size,
            });
          }
        }
      });

      shotDetails.push({
        shotId: shot.shotId,
        videoId: actualVideoId,
        shotNumber: shot.shotNumber,
        startTime: shot.startTime,
        endTime: shot.endTime,
        description: shot.description,
        dialogue: shot.dialogue,
        roleId: shot.roleId,
        assets: shotAssets,
      });
    });

    return shotDetails;
  }

  private extractVideoIdFromPath(videoTaskPath: string): string {
    const parts = videoTaskPath.split(path.sep);
    
    // 查找data目录的索引
    const dataIndex = parts.findIndex(part => part === 'data');
    
    if (dataIndex !== -1 && dataIndex + 1 < parts.length) {
      // 总是返回data目录下的第一级完整子目录名作为videoId
      return parts[dataIndex + 1];
    }
    
    // 如果没找到data目录，返回最后一个目录名
    return path.basename(videoTaskPath);
  }

  private getRelativePath(filePath: string, basePath: string): string {
    // 返回相对于data目录的路径，保持与fileWatcher一致
    const dataDir = path.join(process.cwd(), 'data');
    if (filePath.startsWith(dataDir)) {
      return path.relative(dataDir, filePath);
    }
    // 如果文件路径以basePath开头，先转换为绝对路径再计算相对路径
    if (filePath.startsWith(basePath)) {
      return path.relative(dataDir, filePath);
    }
    // 否则返回相对于basePath的路径
    return path.relative(basePath, filePath);
  }

  private getAllFiles(dirPath: string, fileList: string[] = []): string[] {
    try {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // 完全忽略cache文件夹及其子目录
          if (file.toLowerCase() === 'cache') {
            return;
          }
          this.getAllFiles(filePath, fileList);
        } else {
          // 检查文件路径是否包含cache目录
          if (!filePath.includes('cache')) {
            fileList.push(filePath);
          }
        }
      });
      
      return fileList;
    } catch (error) {
      console.error(`读取目录失败: ${dirPath}`, error);
      return fileList;
    }
  }

  private detectFileType(fileName: string): AssetFile['fileType'] | null {
    const ext = path.extname(fileName).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
      return 'image';
    } else if (['.mp3', '.wav', '.ogg', '.aac'].includes(ext)) {
      return 'audio';
    } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
      return 'video';
    } else if (ext === '.prompt') {
      return 'prompt';
    }
    
    return null;
  }
}