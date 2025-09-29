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
      if (!scriptData.videoId || !scriptData.title) {
        console.error('脚本文件格式错误: 缺少必要的字段');
        return null;
      }

      // 解析分镜信息
      const shots: ScriptData['shots'] = [];
      if (Array.isArray(scriptData.shots)) {
        scriptData.shots.forEach((shot: any, index: number) => {
          shots.push({
            shotId: shot.shotId || `shot_${index + 1}`,
            shotNumber: shot.shotNumber || index + 1,
            startTime: shot.startTime || 0,
            endTime: shot.endTime || 0,
            description: shot.description || '',
            dialogue: shot.dialogue || '',
            roleId: shot.roleId || '',
          });
        });
      }

      return {
        videoId: scriptData.videoId,
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

    scriptData.shots.forEach(shot => {
      const shotAssets: AssetFile[] = [];
      
      // 查找与分镜相关的文件
      files.forEach(filePath => {
        const fileName = path.basename(filePath);
        
        // 简单的文件名匹配逻辑
        if (fileName.includes(shot.shotId) || fileName.includes(`shot_${shot.shotNumber}`)) {
          const stats = fs.statSync(filePath);
          const fileType = this.detectFileType(fileName);
          
          if (fileType) {
            shotAssets.push({
              fileId: `${scriptData.videoId}_${fileName}_${Date.now()}`,
              videoId: scriptData.videoId,
              fileType,
              filePath,
              fileName,
              createdAt: stats.birthtime,
              fileSize: stats.size,
            });
          }
        }
      });

      shotDetails.push({
        shotId: shot.shotId,
        videoId: scriptData.videoId,
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

  private getAllFiles(dirPath: string, fileList: string[] = []): string[] {
    try {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          this.getAllFiles(filePath, fileList);
        } else {
          fileList.push(filePath);
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