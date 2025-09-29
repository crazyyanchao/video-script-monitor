import React, { useEffect, useState } from 'react';
import { useVideoStore } from '../store/videoStore';
import { websocketService } from '../services/websocketService';
import { apiService } from '../services/apiService';
import { VideoTask, ShotDetail, AssetFile } from '../../shared/types/index.js';
import Timeline from './Timeline';
import DetailPanel from './DetailPanel';
import AssetCard from './AssetCard';
import './VideoMonitor.css';

const VideoMonitor: React.FC = () => {
  const {
    tasks,
    currentTask,
    wsConnected,
    error,
    setTasks,
    setCurrentTask,
    addAssetToTask,
    updateAssetInTask,
    removeAssetFromTask,
    setWsConnected,
    setError,
    clearError,
  } = useVideoStore();

  const [selectedShot, setSelectedShot] = useState<ShotDetail | null>(null);
  const [previewAsset, setPreviewAsset] = useState<AssetFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化WebSocket连接
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        await websocketService.connect();
        setWsConnected(true);
        
        // 监听WebSocket消息
        websocketService.on('fileAdded', handleFileAdded);
        websocketService.on('fileModified', handleFileModified);
        websocketService.on('fileDeleted', handleFileDeleted);
        websocketService.on('scriptUpdated', handleScriptUpdated);
        websocketService.on('taskUpdated', handleTaskUpdated);
        websocketService.on('connected', () => setWsConnected(true));
        websocketService.on('disconnected', () => setWsConnected(false));
        
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        setError('WebSocket连接失败，请检查后端服务是否运行');
      }
    };

    initializeWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  // 加载任务列表
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const tasksData = await apiService.fetchTasks();
      setTasks(tasksData);
      clearError();
    } catch (error) {
      console.error('加载任务列表失败:', error);
      setError('加载任务列表失败，请检查后端服务是否运行');
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket消息处理函数
  const handleFileAdded = (assetFile: AssetFile) => {
    addAssetToTask(assetFile.videoId, assetFile);
  };

  const handleFileModified = (assetFile: AssetFile) => {
    updateAssetInTask(assetFile.videoId, assetFile.filePath, assetFile);
  };

  const handleFileDeleted = (assetFile: AssetFile) => {
    removeAssetFromTask(assetFile.videoId, assetFile.filePath);
  };

  const handleScriptUpdated = () => {
    // 更新脚本数据
  };

  const handleTaskUpdated = () => {
    // 更新任务数据
  };

  const handleTaskSelect = async (task: VideoTask) => {
    try {
      const taskDetail = await apiService.fetchTask(task.videoId);
      setCurrentTask(taskDetail);
      setSelectedShot(null);
      setPreviewAsset(null);
      
      // 订阅该任务的WebSocket消息
      websocketService.subscribe(task.videoId);
      
      clearError();
    } catch (error) {
      console.error('加载任务详情失败:', error);
      setError('加载任务详情失败');
    }
  };

  const handleShotSelect = (shot: ShotDetail) => {
    setSelectedShot(shot);
  };

  const handleAssetPreview = (asset: AssetFile) => {
    setPreviewAsset(asset);
  };

  const handleStartMonitoring = async (videoId: string, taskPath: string) => {
    try {
      await apiService.startMonitoring(videoId, taskPath);
      await loadTasks(); // 重新加载任务列表
      clearError();
    } catch (error) {
      console.error('启动监控失败:', error);
      setError('启动监控失败，请检查任务路径是否正确');
    }
  };

  const handleStopMonitoring = async (videoId: string) => {
    try {
      await apiService.stopMonitoring(videoId);
      await loadTasks(); // 重新加载任务列表
      clearError();
    } catch (error) {
      console.error('停止监控失败:', error);
      setError('停止监控失败');
    }
  };

  const demoTaskPath = './data/vid_demo123';

  return (
    <div className="video-monitor">
      {/* 头部状态栏 */}
      <div className="header">
        <div className="header-title">
          <h1>🎬 视频脚本监控系统</h1>
          <div className="status-indicators">
            <div className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
              WebSocket: {wsConnected ? '已连接' : '未连接'}
            </div>
            <div className="task-count">
              任务数: {tasks.length}
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="action-btn primary"
            onClick={() => handleStartMonitoring('demo123', demoTaskPath)}
          >
            🚀 启动演示监控
          </button>
          <button 
            className="action-btn"
            onClick={loadTasks}
            disabled={isLoading}
          >
            🔄 {isLoading ? '加载中...' : '刷新任务'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={clearError} className="close-error">✕</button>
        </div>
      )}

      <div className="main-content">
        {/* 左侧任务列表 */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>📋 视频任务</h3>
          </div>
          
          <div className="task-list">
            {tasks.length === 0 ? (
              <div className="empty-tasks">
                <div className="empty-icon">📁</div>
                <div className="empty-text">暂无监控任务</div>
                <div className="empty-hint">点击上方按钮启动演示监控</div>
              </div>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.videoId}
                  className={`task-item ${currentTask?.videoId === task.videoId ? 'active' : ''}`}
                  onClick={() => handleTaskSelect(task)}
                >
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-id">ID: {task.videoId}</div>
                    <div className="task-stats">
                      <span>分镜: {task.shots.length}</span>
                      <span>素材: {task.assets.length}</span>
                    </div>
                  </div>
                  <div className="task-status">
                    <span className={`status ${task.status}`}>
                      {task.status === 'processing' ? '进行中' : '已完成'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="content-area">
          {currentTask ? (
            <>
              {/* 时间轴区域 */}
              <div className="timeline-section">
                <div className="section-header">
                  <h3>📊 时间轴 - {currentTask.title}</h3>
                  <div className="section-actions">
                    <button 
                      className="action-btn danger"
                      onClick={() => handleStopMonitoring(currentTask.videoId)}
                    >
                      ⏹️ 停止监控
                    </button>
                  </div>
                </div>
                
                <Timeline 
                  shots={currentTask.shots}
                  onShotSelect={handleShotSelect}
                  selectedShot={selectedShot}
                  width={1000}
                  height={200}
                />
              </div>

              {/* 素材列表 */}
              <div className="assets-section">
                <div className="section-header">
                  <h3>📁 素材文件 ({currentTask.assets.length})</h3>
                </div>
                
                <div className="assets-grid">
                  {currentTask.assets.map((asset) => (
                    <AssetCard
                      key={asset.fileId}
                      asset={asset}
                      onPreview={handleAssetPreview}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <div className="welcome-icon">🎬</div>
                <h2>欢迎使用视频脚本监控系统</h2>
                <p>请从左侧选择一个视频任务开始监控</p>
                <div className="welcome-features">
                  <div className="feature">
                    <span className="feature-icon">👁️</span>
                    <span>实时文件监控</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">📊</span>
                    <span>时间轴可视化</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">🔔</span>
                    <span>实时更新通知</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧详情面板 */}
        <div className="detail-panel-section">
          <DetailPanel 
            shot={selectedShot}
            onClose={() => setSelectedShot(null)}
            onAssetPreview={handleAssetPreview}
          />
        </div>
      </div>

      {/* 预览模态框 */}
      {previewAsset && (
        <div className="preview-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>预览: {previewAsset.fileName}</h3>
              <button 
                className="close-btn"
                onClick={() => setPreviewAsset(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="preview-content">
                {previewAsset.fileType === 'image' ? (
                  <img 
                    src={`/files/${previewAsset.filePath}`} 
                    alt={previewAsset.fileName}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                ) : (
                  <div className="non-image-preview">
                    <div className="preview-icon">
                      {previewAsset.fileType === 'audio' ? '🔊' : 
                       previewAsset.fileType === 'video' ? '🎥' : '📄'}
                    </div>
                    <div className="preview-info">
                      <p>文件类型: {previewAsset.fileType}</p>
                      <p>文件路径: {previewAsset.filePath}</p>
                      <p>文件大小: {Math.round(previewAsset.fileSize / 1024)} KB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoMonitor;