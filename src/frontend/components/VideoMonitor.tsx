import React, { useEffect, useState, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { websocketService } from '../services/websocketService';
import { apiService } from '../services/apiService';
import { VideoTask, ShotDetail, AssetFile } from '../../shared/types/index.js';
import Timeline from './Timeline';
import DetailPanel from './DetailPanel';
import AssetCard from './AssetCard';
import ShotVideoCard from './ShotVideoCard';
import ImagePreviewCard from './ImagePreviewCard';
import './VideoMonitor.css';
import AudioPlayer from './AudioPlayer';

const VideoMonitor: React.FC = () => {
  const {
    tasks,
    currentTask,
    wsConnected,
    error,
    setTasks,
    setCurrentTask,
    addTask,
    removeTask,
    addAssetToTask,
    updateAssetInTask,
    removeAssetFromTask,
    updateTaskMonitoringStatus,
    setWsConnected,
    setError,
    clearError,
    addNotification,
  } = useVideoStore();

  const [selectedShot, setSelectedShot] = useState<ShotDetail | null>(null);
  const [previewAsset, setPreviewAsset] = useState<AssetFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [promptContent, setPromptContent] = useState<string>('');
  const [promptLoading, setPromptLoading] = useState<boolean>(false);
  const [videoMetadata, setVideoMetadata] = useState<{
    duration: string;
    dimensions: {width: number, height: number} | null;
    aspectRatio: string;
  } | null>(null);
  const [sortBy, setSortBy] = useState<string>('folderCreatedAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [taskListRef, setTaskListRef] = useState<HTMLDivElement | null>(null);
  const [monitoringActionLoading, setMonitoringActionLoading] = useState<string | null>(null);
  const [bulkActionMode, setBulkActionMode] = useState<boolean>(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  const [timelineSearchTerm, setTimelineSearchTerm] = useState<string>('');
  const [timelineZoom, setTimelineZoom] = useState<number>(1);

  // 初始化WebSocket连接
  useEffect(() => {
    let isMounted = true;
    
    const initializeWebSocket = async () => {
      try {
        await websocketService.connect();
        if (!isMounted) return;
        
        setWsConnected(true);
        
        // 监听WebSocket消息
        websocketService.on('fileAdded', handleFileAdded);
        websocketService.on('fileModified', handleFileModified);
        websocketService.on('fileDeleted', handleFileDeleted);
        websocketService.on('scriptUpdated', handleScriptUpdated);
        websocketService.on('taskUpdated', handleTaskUpdated);
        websocketService.on('taskRemoved', handleTaskRemoved);
        websocketService.on('connected', () => isMounted && setWsConnected(true));
        websocketService.on('disconnected', () => isMounted && setWsConnected(false));
        
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        if (isMounted) {
          setError('WebSocket连接失败，请检查后端服务是否运行');
        }
      }
    };

    initializeWebSocket();

    return () => {
      isMounted = false;
      // 清理所有监听器
      websocketService.off('fileAdded', handleFileAdded);
      websocketService.off('fileModified', handleFileModified);
      websocketService.off('fileDeleted', handleFileDeleted);
      websocketService.off('scriptUpdated', handleScriptUpdated);
      websocketService.off('taskUpdated', handleTaskUpdated);
      websocketService.off('taskRemoved', handleTaskRemoved);
      websocketService.disconnect();
    };
  }, []);

  // 加载任务列表
  useEffect(() => {
    loadTasks(false);
  }, []);

  // 当排序参数变化时重新加载任务列表
  useEffect(() => {
    loadTasks(false);
  }, [sortBy, sortOrder]);

  // 检测任务列表是否需要滚动
  useEffect(() => {
    if (taskListRef) {
      const checkScrollable = () => {
        if (taskListRef.scrollHeight > taskListRef.clientHeight) {
          taskListRef.classList.add('scrollable');
        } else {
          taskListRef.classList.remove('scrollable');
        }
      };
      
      checkScrollable();
      
      // 监听任务列表变化
      const observer = new ResizeObserver(checkScrollable);
      observer.observe(taskListRef);
      
      return () => observer.disconnect();
    }
  }, [taskListRef, tasks]);

  const loadTasks = async (showNotification: boolean = false) => {
    setIsLoading(true);
    
    // 只有在主动刷新时才显示通知
    if (showNotification) {
      addNotification({
        type: 'info',
        title: '🔄 刷新任务',
        message: '正在刷新任务列表...',
        duration: 2000,
      });
    }
    
    try {
      const tasksData = await apiService.fetchTasks(sortBy, sortOrder);
      setTasks(tasksData);
      clearError();
      
      // 只有在主动刷新时才显示成功通知
      if (showNotification) {
        addNotification({
          type: 'success',
          title: '✅ 刷新完成',
          message: `成功加载 ${tasksData.length} 个任务`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
      setError('加载任务列表失败，请检查后端服务是否运行');
      
      // 只有在主动刷新时才显示失败通知
      if (showNotification) {
        addNotification({
          type: 'error',
          title: '❌ 刷新失败',
          message: '无法加载任务列表，请检查后端服务',
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };


  // WebSocket消息处理函数
  const handleFileAdded = useCallback((assetFile: AssetFile) => {
    // 检查是否已存在相同的资产
    const task = tasks.find(t => t.videoId === assetFile.videoId);
    const assetExists = task?.assets.some(asset => asset.filePath === assetFile.filePath);
    
    if (assetExists) {
      console.log('资产已存在，跳过处理:', assetFile.filePath);
      return;
    }

    addAssetToTask(assetFile.videoId, assetFile);
    
    // 显示新素材添加通知 - 使用更准确的任务查找方式
    const updatedTask = tasks.find(t => t.videoId === assetFile.videoId) || task;
    const taskTitle = updatedTask ? updatedTask.title : `任务ID: ${assetFile.videoId}`;
    
    addNotification({
      type: 'success',
      title: '新素材已添加',
      message: `${assetFile.fileName} (${assetFile.fileType}) 已添加到 ${taskTitle}`,
      duration: 5000,
    });
  }, [tasks, addAssetToTask, addNotification]);

  const handleFileModified = useCallback((assetFile: AssetFile) => {
    updateAssetInTask(assetFile.videoId, assetFile.filePath, assetFile);
    
    // 显示文件修改通知
    addNotification({
      type: 'info',
      title: '素材已更新',
      message: `${assetFile.fileName} 已被修改`,
      duration: 3000,
    });
  }, [updateAssetInTask, addNotification]);

  const handleFileDeleted = useCallback((assetFile: AssetFile) => {
    removeAssetFromTask(assetFile.videoId, assetFile.filePath);
    
    // 显示文件删除通知
    addNotification({
      type: 'warning',
      title: '素材已删除',
      message: `${assetFile.fileName} [任务ID: ${assetFile.videoId}] 已被删除`,
      duration: 4000,
    });
  }, [removeAssetFromTask, addNotification]);

  const handleScriptUpdated = useCallback(() => {
    // 更新脚本数据
  }, []);

  const handleTaskUpdated = useCallback(() => {
    // 任务列表已更新，重新加载任务列表
    console.log('收到任务更新通知，重新加载任务列表');
    loadTasks(false);
  }, []);

  const handleTaskRemoved = useCallback((data: { videoId: string }) => {
    // 从任务列表中移除指定的任务
    console.log('收到任务删除通知，移除任务:', data.videoId);
    removeTask(data.videoId);
    setSelectedShot(null);
  }, [removeTask]);

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

  const handleAssetPreview = async (asset: AssetFile) => {
    setPreviewAsset(asset);
    setVideoMetadata(null);
    
    // 如果是prompt文件，获取文本内容
    if (asset.fileType === 'prompt') {
      setPromptLoading(true);
      try {
        const fileUrl = await apiService.getFileUrl(asset.filePath);
        const response = await fetch(fileUrl);
        if (response.ok) {
          const text = await response.text();
          setPromptContent(text);
        } else {
          setPromptContent('无法加载文件内容');
        }
      } catch (error) {
        console.error('获取prompt文件内容失败:', error);
        setPromptContent('加载文件内容时出错');
      } finally {
        setPromptLoading(false);
      }
    } else {
      setPromptContent('');
      setPromptLoading(false);
    }
  };

  // 处理视频元数据加载
  const handleVideoMetadataLoad = (videoElement: HTMLVideoElement) => {
    const duration = videoElement.duration;
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    
    if (!isNaN(duration) && width && height) {
      const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };
      
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(width, height);
      const aspectRatio = `${width / divisor}:${height / divisor}`;
      
      setVideoMetadata({
        duration: formatDuration(duration),
        dimensions: { width, height },
        aspectRatio
      });
    }
  };

  const isVerticalVideo = () => {
    return videoMetadata?.dimensions && videoMetadata.dimensions.height > videoMetadata.dimensions.width;
  };


  // 批量启动监控
  const handleBulkStartMonitoring = async () => {
    if (selectedTasks.size === 0) return;
    
    const selectedTasksArray = Array.from(selectedTasks);
    
    // 立即更新本地状态，显示为启动中
    selectedTasksArray.forEach(taskId => {
      updateTaskMonitoringStatus(taskId, true);
    });
    
    const results = await Promise.allSettled(
      selectedTasksArray.map(async (taskId) => {
        // 从当前任务列表中找到任务
        const currentTask = tasks.find(t => t.videoId === taskId);
        if (currentTask) {
          // 如果任务已存在，直接启动监控
          await apiService.startMonitoring(taskId, currentTask.scriptPath ? currentTask.scriptPath.replace('script.json', '') : `./data/${taskId}`);
        } else {
          // 如果任务不存在，使用默认路径启动
          await apiService.startMonitoring(taskId, `./data/${taskId}`);
        }
      })
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;
    
    // 如果有失败的，恢复失败任务的状态
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        updateTaskMonitoringStatus(selectedTasksArray[index], false);
      }
    });
    
    addNotification({
      type: successCount > 0 ? 'success' : 'error',
      title: '批量启动完成',
      message: `成功启动 ${successCount} 个任务，失败 ${failCount} 个`,
      duration: 5000,
    });
    
    setBulkActionMode(false);
    setSelectedTasks(new Set());
    await loadTasks(false);
  };

  // 批量停止监控
  const handleBulkStopMonitoring = async () => {
    if (selectedTasks.size === 0) return;
    
    const selectedTasksArray = Array.from(selectedTasks);
    const results = await Promise.allSettled(
      selectedTasksArray.map(async (taskId) => {
        await apiService.stopMonitoring(taskId);
      })
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;
    
    addNotification({
      type: successCount > 0 ? 'success' : 'error',
      title: '批量停止完成',
      message: `成功停止 ${successCount} 个任务，失败 ${failCount} 个`,
      duration: 5000,
    });
    
    setBulkActionMode(false);
    setSelectedTasks(new Set());
    await loadTasks(false);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (isAllSelected) {
      // 取消全选
      setSelectedTasks(new Set());
      setIsAllSelected(false);
    } else {
      // 全选
      const allTaskIds = new Set(tasks.map(task => task.videoId));
      setSelectedTasks(allTaskIds);
      setIsAllSelected(true);
    }
  };

  // 当任务列表变化时更新全选状态
  useEffect(() => {
    if (tasks.length === 0) {
      setIsAllSelected(false);
      return;
    }
    
    const allTaskIds = tasks.map(task => task.videoId);
    const isAllSelectedNow = allTaskIds.every(id => selectedTasks.has(id));
    setIsAllSelected(isAllSelectedNow);
  }, [selectedTasks, tasks]);

  const handleStopMonitoring = async (videoId: string) => {
    if (monitoringActionLoading === videoId) return; // 防止重复点击
    
    setMonitoringActionLoading(videoId);
    
    // 立即更新UI状态
    updateTaskMonitoringStatus(videoId, false);
    
    try {
      await apiService.stopMonitoring(videoId);
      clearError();
      
      // 显示成功通知
      addNotification({
        type: 'success',
        title: '监控已停止',
        message: `任务 ${videoId} 的监控已停止`,
        duration: 3000,
      });
    } catch (error) {
      console.error('停止监控失败:', error);
      // 如果失败，恢复监控状态
      updateTaskMonitoringStatus(videoId, true);
      setError('停止监控失败');
    } finally {
      setMonitoringActionLoading(null);
    }
  };

  const handleResumeMonitoring = async (videoId: string) => {
    if (monitoringActionLoading === videoId) return; // 防止重复点击
    
    setMonitoringActionLoading(videoId);
    
    // 立即更新UI状态
    updateTaskMonitoringStatus(videoId, true);
    
    try {
      await apiService.resumeMonitoring(videoId);
      clearError();
      
      // 显示成功通知
      addNotification({
        type: 'success',
        title: '监控已恢复',
        message: `任务 ${videoId} 的监控已恢复`,
        duration: 3000,
      });
    } catch (error) {
      console.error('恢复监控失败:', error);
      // 如果失败，恢复停止状态
      updateTaskMonitoringStatus(videoId, false);
      setError('恢复监控失败');
    } finally {
      setMonitoringActionLoading(null);
    }
  };

  const demoTaskPath = './data/vid_demo123';

  // 排序处理函数
  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      // 如果点击的是当前排序字段，切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新排序字段，设置为降序
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // 格式化时间显示
  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期显示（用于预览框）
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="video-monitor">
      {/* 头部状态栏 */}
      <div className="header">
        <div className="header-title">
          <h1>🎬 视频脚本监控系统</h1>
        </div>
        
        <div className="header-actions">

          {/* 批量操作模式切换 */}
          <button 
            className={`action-btn ${bulkActionMode ? 'active' : ''}`}
            onClick={() => {
              setBulkActionMode(!bulkActionMode);
              setSelectedTasks(new Set());
            }}
          >
            {bulkActionMode ? '✅ 退出批量' : '🚀 批量操作'}
          </button>

          {/* 主要操作按钮 */}
          {!bulkActionMode ? (
            <>
              <button 
                className="action-btn"
                onClick={() => loadTasks(true)}
                disabled={isLoading}
              >
                🔄 {isLoading ? '加载中...' : '刷新任务'}
              </button>
            </>
          ) : (
            <>
              <button 
                className="action-btn"
                onClick={handleSelectAll}
                disabled={tasks.length === 0}
              >
                {isAllSelected ? '☑️ 取消全选' : '☐ 全选'} ({selectedTasks.size}/{tasks.length})
              </button>
              <button 
                className="action-btn success"
                onClick={handleBulkStartMonitoring}
                disabled={selectedTasks.size === 0}
              >
                🚀 批量启动 ({selectedTasks.size})
              </button>
              <button 
                className="action-btn danger"
                onClick={handleBulkStopMonitoring}
                disabled={selectedTasks.size === 0}
              >
                ⏹️ 批量停止 ({selectedTasks.size})
              </button>
            </>
          )}

          {/* 状态指示器 */}
          <div className="status-indicator">
            <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`}></div>
            <span className="status-text">
              {wsConnected ? '已连接' : '未连接'}
            </span>
          </div>
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
            <div className="sidebar-title-with-tags">
              <h3>📋 视频任务</h3>
              <div className="title-tags">
                <div className={`status-tag ${wsConnected ? 'connected' : 'disconnected'}`}>
                  {wsConnected ? '已连接' : '未连接'}
                </div>
                <div className="task-count-tag">
                  {tasks.filter(task => task.monitoring).length}
                </div>
                {bulkActionMode && (
                  <div className="bulk-select-all">
                    <button 
                      className="select-all-btn"
                      onClick={handleSelectAll}
                      disabled={tasks.length === 0}
                      title={isAllSelected ? '取消全选' : '全选所有任务'}
                    >
                      {isAllSelected ? '☑️' : '☐'} 全选
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="sort-controls">
              <div className="sort-buttons">
                <button 
                  className={`sort-btn ${sortBy === 'folderCreatedAt' ? 'active' : ''}`}
                  onClick={() => handleSortChange('folderCreatedAt')}
                  title="按文件夹创建时间排序"
                >
                  创建时间 {sortBy === 'folderCreatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${sortBy === 'title' ? 'active' : ''}`}
                  onClick={() => handleSortChange('title')}
                  title="按标题排序"
                >
                  标题 {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${sortBy === 'createdAt' ? 'active' : ''}`}
                  onClick={() => handleSortChange('createdAt')}
                  title="按任务创建时间排序"
                >
                  任务时间 {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
          
          <div 
            className="task-list"
            ref={setTaskListRef}
          >
            {tasks.length === 0 ? (
              <div className="empty-tasks">
                <div className="empty-icon">📁</div>
                <div className="empty-text">暂无监控任务</div>
                <div className="empty-hint">点击上方按钮启动监控</div>
              </div>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.videoId}
                  className={`task-item ${currentTask?.videoId === task.videoId ? 'active' : ''} ${bulkActionMode ? 'bulk-mode' : ''}`}
                  onClick={() => {
                    if (bulkActionMode) {
                      const newSelected = new Set(selectedTasks);
                      if (newSelected.has(task.videoId)) {
                        newSelected.delete(task.videoId);
                      } else {
                        newSelected.add(task.videoId);
                      }
                      setSelectedTasks(newSelected);
                    } else {
                      handleTaskSelect(task);
                    }
                  }}
                >
                  {bulkActionMode && (
                    <div className="task-checkbox">
                      <input 
                        type="checkbox"
                        checked={selectedTasks.has(task.videoId)}
                        onChange={() => {}} // 由父元素处理点击
                        className="checkbox-input"
                      />
                    </div>
                  )}
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-id">ID: {task.videoId}</div>
                    <div className="task-time">
                      <div className="folder-created-time">
                        📁 创建: {formatDateTime(task.folderCreatedAt)}
                      </div>
                    </div>
                    <div className="task-stats">
                      <span>分镜: {task.shots.length}</span>
                      <span>素材: {task.assets.length}</span>
                    </div>
                  </div>
                  <div className="task-status">
                    <span className={`monitoring-status ${task.monitoring ? 'monitoring' : 'stopped'}`}>
                      {monitoringActionLoading === task.videoId ? '处理中...' : (task.monitoring ? '监控中' : '已停止')}
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
                  <div className="timeline-controls-header">
                    <div className="timeline-search-container">
                      <input
                        type="text"
                        placeholder="搜索分镜..."
                        value={timelineSearchTerm}
                        onChange={(e) => setTimelineSearchTerm(e.target.value)}
                        className="timeline-search-input"
                      />
                      {timelineSearchTerm && (
                        <button 
                          className="clear-search-btn"
                          onClick={() => setTimelineSearchTerm('')}
                          title="清除搜索"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="section-actions">
                      {currentTask.monitoring ? (
                        <button 
                          className="action-btn danger"
                          onClick={() => handleStopMonitoring(currentTask.videoId)}
                          disabled={monitoringActionLoading === currentTask.videoId}
                        >
                          {monitoringActionLoading === currentTask.videoId ? '⏳ 停止中...' : '⏹️ 停止监控'}
                        </button>
                      ) : (
                        <button 
                          className="action-btn success"
                          onClick={() => handleResumeMonitoring(currentTask.videoId)}
                          disabled={monitoringActionLoading === currentTask.videoId}
                        >
                          {monitoringActionLoading === currentTask.videoId ? '⏳ 恢复中...' : '▶️ 恢复监控'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <Timeline 
                  shots={currentTask.shots}
                  onShotSelect={handleShotSelect}
                  selectedShot={selectedShot}
                  width={1000}
                  height={200}
                  searchTerm={timelineSearchTerm}
                  zoomLevel={timelineZoom}
                  onZoomChange={setTimelineZoom}
                />
              </div>

              {/* 分镜视频区域 */}
              <div className="shot-videos-section">
                <div className="section-header">
                  <h3>🎬 分镜视频 ({currentTask.assets.filter(asset => asset.fileType === 'video').length})</h3>
                </div>
                
                <div className="shot-videos-grid">
                  {currentTask.assets
                    .filter(asset => asset.fileType === 'video')
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((video) => (
                      <ShotVideoCard
                        key={video.fileId}
                        video={video}
                        onPreview={handleAssetPreview}
                      />
                    ))}
                </div>
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
      {previewAsset && previewAsset.fileType === 'image' ? (
        <ImagePreviewCard 
          image={previewAsset}
          onClose={() => {
            setPreviewAsset(null);
            setVideoMetadata(null);
          }}
        />
      ) : previewAsset && (
        <div className="preview-modal">
          <div className={`modal-content ${isVerticalVideo() ? 'vertical-video' : ''}`}>
            <div className="modal-header">
              <h3>预览: {previewAsset.fileName}</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setPreviewAsset(null);
                  setVideoMetadata(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="preview-content">
                {previewAsset.fileType === 'audio' ? (
                  <AudioPlayer
                    src={`/api/files/${encodeURIComponent(previewAsset.filePath).replace(/%2F/g, '/')}`}
                    fileName={previewAsset.fileName}
                    fileSize={previewAsset.fileSize}
                  />
                ) : previewAsset.fileType === 'video' ? (
                  <div className="video-preview">
                    <video 
                      controls 
                      style={{ maxWidth: '100%', maxHeight: '500px' }}
                      onError={(e) => {
                        console.error('视频加载失败:', previewAsset.filePath);
                      }}
                      onLoadedMetadata={(e) => {
                        handleVideoMetadataLoad(e.currentTarget);
                      }}
                    >
                      <source src={`/api/files/${encodeURIComponent(previewAsset.filePath).replace(/%2F/g, '/')}`} type="video/mp4" />
                      您的浏览器不支持视频播放
                    </video>
                    <div className="preview-info">
                      {videoMetadata && (
                        <div className="video-metadata-grid">
                          {/* 第一行：三个元数据项 */}
                          <div className="metadata-row">
                            <div className="metadata-item">
                              <div className="label">创建时间</div>
                              <div className="value">🕒 {formatDate(previewAsset.createdAt)}</div>
                            </div>
                            <div className="metadata-item">
                              <div className="label">文件大小</div>
                              <div className="value">💾 {formatFileSize(previewAsset.fileSize)}</div>
                            </div>
                            <div className="metadata-item">
                              <div className="label">时长</div>
                              <div className="value">⏱️ {videoMetadata.duration}</div>
                            </div>
                          </div>
                          
                          {/* 第二行：三个元数据项 */}
                          <div className="metadata-row">
                            {videoMetadata.dimensions && (
                              <>
                                <div className="metadata-item">
                                  <div className="label">分辨率</div>
                                  <div className="value">📐 {videoMetadata.dimensions.width}×{videoMetadata.dimensions.height}</div>
                                </div>
                                <div className="metadata-item">
                                  <div className="label">宽高比</div>
                                  <div className="value">📏 {videoMetadata.aspectRatio}</div>
                                </div>
                                <div className="metadata-item">
                                  <div className="label">类型</div>
                                  <div className="value">
                                    {isVerticalVideo() ? '📱 竖屏视频' : '📺 横屏视频'}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-preview">
                    <div className="preview-icon">📝</div>
                    <div className="text-title">Prompt文件预览</div>
                    <div className="text-subtitle">
                      {previewAsset.fileName}
                    </div>
                    <div className="preview-info">
                      <div className="file-info-container">
                        <span className="file-name">文件类型: {previewAsset.fileType.toUpperCase()}</span>
                        <span className="file-size">文件大小: {Math.round(previewAsset.fileSize / 1024)} KB</span>
                      </div>
                    </div>
                    {previewAsset.fileType === 'prompt' && (
                      <div className="text-content">
                        <div className="prompt-text-viewer">
                          {promptLoading ? (
                            <div className="loading-text">正在加载文本内容...</div>
                          ) : (
                            <pre className="prompt-text">{promptContent}</pre>
                          )}
                        </div>
                      </div>
                    )}
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