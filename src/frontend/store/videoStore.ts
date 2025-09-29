import { create } from 'zustand';
import { VideoTask, AssetFile, ShotDetail } from '../../shared/types/index.js';

interface VideoState {
  // 视频任务列表
  tasks: VideoTask[];
  
  // 当前选中的视频任务
  currentTask: VideoTask | null;
  
  // WebSocket 连接状态
  wsConnected: boolean;
  
  // 错误信息
  error: string | null;
  
  // 操作函数
  setTasks: (tasks: VideoTask[]) => void;
  setCurrentTask: (task: VideoTask | null) => void;
  addTask: (task: VideoTask) => void;
  updateTask: (taskId: string, updates: Partial<VideoTask>) => void;
  addAssetToTask: (taskId: string, asset: AssetFile) => void;
  updateAssetInTask: (taskId: string, assetPath: string, asset: AssetFile) => void;
  removeAssetFromTask: (taskId: string, assetPath: string) => void;
  updateShotInTask: (taskId: string, shotId: string, updates: Partial<ShotDetail>) => void;
  setWsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  tasks: [],
  currentTask: null,
  wsConnected: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),

  setCurrentTask: (task) => set({ currentTask: task }),

  addTask: (task) => 
    set((state) => ({
      tasks: [...state.tasks, task],
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

  setWsConnected: (connected) => set({ wsConnected: connected }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));