import React, { useState, useRef, useEffect } from 'react';
import { AssetFile } from '../../shared/types';
import './ShotVideoCard.css';

interface ShotVideoCardProps {
  video: AssetFile;
  onPreview: (asset: AssetFile) => void;
}

const ShotVideoCard: React.FC<ShotVideoCardProps> = ({ video, onPreview }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<string>('--:--');
  const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleClick = () => {
    onPreview(video);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAspectRatio = () => {
    if (!videoDimensions) return '16:9';
    const { width, height } = videoDimensions;
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  };

  const isVerticalVideo = () => {
    if (!videoDimensions) return false;
    return videoDimensions.height > videoDimensions.width;
  };

  // 处理视频元数据加载
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      const durationSeconds = videoElement.duration;
      if (!isNaN(durationSeconds)) {
        setDuration(formatDuration(durationSeconds));
      }
      
      setVideoDimensions({
        width: videoElement.videoWidth,
        height: videoElement.videoHeight
      });
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [video.filePath]);

  // 处理鼠标悬停播放/暂停
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isHovered && !isPlaying) {
      // 鼠标悬停时开始播放
      videoElement.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.warn('视频自动播放失败:', error);
        // 如果自动播放失败，可能是因为浏览器策略限制，这是正常的
      });
    } else if (!isHovered && isPlaying) {
      // 鼠标离开时暂停播放
      videoElement.pause();
      setIsPlaying(false);
    }
  }, [isHovered, isPlaying]);

  // 处理视频播放状态变化
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      // 视频播放结束后重置到开始位置
      videoElement.currentTime = 0;
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    
    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div 
      className={`shot-video-card ${isVerticalVideo() ? 'vertical-video' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="video-thumbnail">
        <video 
          ref={videoRef}
          className="video-preview"
          preload="metadata"
          muted
          onError={(e) => {
            console.error('视频加载失败:', video.filePath);
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src={`/api/files/${encodeURIComponent(video.filePath).replace(/%2F/g, '/')}`} type="video/mp4" />
        </video>
        
        {/* 播放按钮覆盖层 */}
        <div className={`play-overlay ${isHovered && !isPlaying ? 'visible' : ''}`}>
          <div className="play-button">
            <div className="play-icon">▶</div>
          </div>
        </div>

        {/* 视频时长显示 */}
        <div className="video-duration">
          <span className="duration-text">{duration}</span>
        </div>

        {/* 视频比例标识 */}
        {videoDimensions && (
          <div className="aspect-ratio-badge">
            {getAspectRatio()}
          </div>
        )}

        {/* 播放状态指示器 */}
        {isPlaying && (
          <div className="playing-indicator">
            <div className="playing-icon">▶</div>
            <div className="playing-text">播放中</div>
          </div>
        )}
      </div>

      <div className="video-info">
        <div className="video-title" title={video.fileName}>
          {video.fileName}
        </div>
        
        {/* 增强的元数据信息 */}
        <div className="video-meta">
          <div className="meta-row">
            <span className="file-size">{formatFileSize(video.fileSize)}</span>
            <span className="created-time">{formatDate(video.createdAt)}</span>
          </div>
          
          {videoDimensions && (
            <div className="meta-row dimensions">
              <span className="resolution">
                {videoDimensions.width}×{videoDimensions.height}
              </span>
              <span className="aspect-ratio">
                {getAspectRatio()}
              </span>
            </div>
          )}
          
          <div className="meta-row">
            <span className="duration-info">
              ⏱️ {duration}
            </span>
            {isVerticalVideo() && (
              <span className="vertical-indicator">
                📱 竖屏
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShotVideoCard;
