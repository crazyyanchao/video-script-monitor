import { VideoTask } from '../../shared/types/index.js';

class ApiService {
  private baseUrl = 'http://localhost:8080/api';

  async fetchTasks(sortBy: string = 'folderCreatedAt', sortOrder: string = 'desc'): Promise<VideoTask[]> {
    const params = new URLSearchParams({
      sortBy,
      sortOrder
    });
    
    const response = await fetch(`${this.baseUrl}/tasks?${params}`);
    if (!response.ok) {
      throw new Error(`获取任务列表失败: ${response.statusText}`);
    }
    return response.json();
  }

  async fetchTask(videoId: string): Promise<VideoTask> {
    const response = await fetch(`${this.baseUrl}/tasks/${videoId}`);
    if (!response.ok) {
      throw new Error(`获取任务详情失败: ${response.statusText}`);
    }
    return response.json();
  }

  async startMonitoring(videoId: string, taskPath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks/${videoId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskPath }),
    });
    
    if (!response.ok) {
      throw new Error(`启动监控失败: ${response.statusText}`);
    }
  }

  async stopMonitoring(videoId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks/${videoId}/stop`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`停止监控失败: ${response.statusText}`);
    }
  }

  async resumeMonitoring(videoId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks/${videoId}/resume`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`恢复监控失败: ${response.statusText}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    // 对文件路径进行URL编码，特别是处理中文路径
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');
    return `/api/files/${encodedPath}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();