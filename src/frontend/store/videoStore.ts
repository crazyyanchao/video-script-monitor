import { create } from 'zustand';
import { VideoTask, AssetFile, ShotDetail } from '../../shared/types/index.js';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
}

interface VideoState {
  // 视频任务列表
  tasks: VideoTask[];
  
  // 当前选中的视频任务
  currentTask: VideoTask | null;
  
  // WebSocket 连接状态
  wsConnected: boolean;
  
  // 错误信息
  error: string | null;
  
  // 通知列表
  notifications: Notification[];
  
  // 操作函数
  setTasks: (tasks: VideoTask[]) => void;
  setCurrentTask: (task: VideoTask | null) => void;
  addTask: (task: VideoTask) => void;
  removeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<VideoTask>) => void;
  addAssetToTask: (taskId: string, asset: AssetFile) => void;
  updateAssetInTask: (taskId: string, assetPath: string, asset: AssetFile) => void;
  removeAssetFromTask: (taskId: string, assetPath: string) => void;
  updateShotInTask: (taskId: string, shotId: string, updates: Partial<ShotDetail>) => void;
  updateTaskMonitoringStatus: (taskId: string, monitoring: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  tasks: [],
  currentTask: null,
  wsConnected: false,
  error: null,
  notifications: [],

  setTasks: (tasks) => set({ tasks }),

  setCurrentTask: (task) => set({ currentTask: task }),

  addTask: (task) => 
    set((state) => ({
      tasks: [...state.tasks, task],
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.videoId !== taskId),
      currentTask: state.currentTask?.videoId === taskId ? null : state.currentTask,
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.videoId === taskId ? { ...task, ...updates } : task
      ),
      currentTask:
        state.currentTask?.videoId === taskId
          ? { ...state.currentTask, ...updates }
          : state.currentTask,
    })),

  addAssetToTask: (taskId, asset) =>
    set((state) => {
      // 检查是否已存在相同文件路径的资产
      const taskExists = state.tasks.some(task => 
        task.videoId === taskId && 
        task.assets.some(existingAsset => existingAsset.filePath === asset.filePath)
      );
      
      if (taskExists) {
        console.log('资产已存在，跳过添加:', asset.filePath);
        return state; // 如果已存在，不进行任何操作
      }

      const updatedTasks = state.tasks.map((task) =>
        task.videoId === taskId
          ? {
              ...task,
              assets: [...task.assets, asset],
              updatedAt: new Date(),
            }
          : task
      );

      return {
        tasks: updatedTasks,
        currentTask:
          state.currentTask?.videoId === taskId
            ? {
                ...state.currentTask,
                assets: [...state.currentTask.assets, asset],
                updatedAt: new Date(),
              }
            : state.currentTask,
      };
    }),

  updateAssetInTask: (taskId, assetPath, asset) =>
    set((state) => {
      const updatedTasks = state.tasks.map((task) =>
        task.videoId === taskId
          ? {
              ...task,
              assets: task.assets.map((a) =>
                a.filePath === assetPath ? asset : a
              ),
              updatedAt: new Date(),
            }
          : task
      );

      return {
        tasks: updatedTasks,
        currentTask:
          state.currentTask?.videoId === taskId
            ? {
                ...state.currentTask,
                assets: state.currentTask.assets.map((a) =>
                  a.filePath === assetPath ? asset : a
                ),
                updatedAt: new Date(),
              }
            : state.currentTask,
      };
    }),

  removeAssetFromTask: (taskId, assetPath) =>
    set((state) => {
      const updatedTasks = state.tasks.map((task) =>
        task.videoId === taskId
          ? {
              ...task,
              assets: task.assets.filter((a) => a.filePath !== assetPath),
              updatedAt: new Date(),
            }
          : task
      );

      return {
        tasks: updatedTasks,
        currentTask:
          state.currentTask?.videoId === taskId
            ? {
                ...state.currentTask,
                assets: state.currentTask.assets.filter(
                  (a) => a.filePath !== assetPath
                ),
                updatedAt: new Date(),
              }
            : state.currentTask,
      };
    }),

  updateShotInTask: (taskId, shotId, updates) =>
    set((state) => {
      const updatedTasks = state.tasks.map((task) =>
        task.videoId === taskId
          ? {
              ...task,
              shots: task.shots.map((shot) =>
                shot.shotId === shotId ? { ...shot, ...updates } : shot
              ),
              updatedAt: new Date(),
            }
          : task
      );

      return {
        tasks: updatedTasks,
        currentTask:
          state.currentTask?.videoId === taskId
            ? {
                ...state.currentTask,
                shots: state.currentTask.shots.map((shot) =>
                  shot.shotId === shotId ? { ...shot, ...updates } : shot
                ),
                updatedAt: new Date(),
              }
            : state.currentTask,
      };
    }),

  updateTaskMonitoringStatus: (taskId, monitoring) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.videoId === taskId ? { ...task, monitoring } : task
      ),
      currentTask:
        state.currentTask?.videoId === taskId
          ? { ...state.currentTask, monitoring }
          : state.currentTask,
    })),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  addNotification: (notification) =>
    set((state) => {
      // 检查是否已存在相同的通知（相同标题和消息）
      const isDuplicate = state.notifications.some(
        n => n.title === notification.title && n.message === notification.message
      );
      
      if (isDuplicate) {
        console.log('重复通知，跳过添加:', notification.title);
        return state;
      }
      
      return {
        notifications: [
          ...state.notifications,
          {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            duration: notification.duration || 5000,
          },
        ],
      };
    }),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));