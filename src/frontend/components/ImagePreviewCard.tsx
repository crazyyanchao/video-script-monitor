import React, { useState, useRef, useEffect } from 'react';
import { AssetFile } from '../../shared/types/index.js';
import './ImagePreviewCard.css';

interface ImagePreviewCardProps {
  image: AssetFile;
  onClose: () => void;
}

const ImagePreviewCard: React.FC<ImagePreviewCardProps> = ({ image, onClose }) => {
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAspectRatio = () => {
    if (!imageDimensions) return '--:--';
    const { width, height } = imageDimensions;
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  };

  const isVerticalImage = () => {
    if (!imageDimensions) return false;
    return imageDimensions.height > imageDimensions.width;
  };

  const isPortrait9_16 = () => {
    if (!imageDimensions) return false;
    const { width, height } = imageDimensions;
    const ratio = height / width;
    return ratio >= 1.7 && ratio <= 1.8; // 9:16 比例范围
  };

  // 处理图片元数据加载
  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    const handleLoad = () => {
      setImageLoaded(true);
      setImageDimensions({
        width: imgElement.naturalWidth,
        height: imgElement.naturalHeight
      });
    };

    const handleError = () => {
      setImageError(true);
      setImageLoaded(false);
    };

    imgElement.addEventListener('load', handleLoad);
    imgElement.addEventListener('error', handleError);
    
    return () => {
      imgElement.removeEventListener('load', handleLoad);
      imgElement.removeEventListener('error', handleError);
    };
  }, [image.filePath]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-preview-modal" onClick={handleBackdropClick}>
      <div className={`image-modal-content ${isVerticalImage() ? 'vertical-image' : ''} ${isPortrait9_16() ? 'portrait-9-16' : ''}`}>
        <div className="image-modal-header">
          <div className="header-info">
            <h3>图片预览: {image.fileName}</h3>
            <div className="image-type-badge">
              🖼️ 图片
            </div>
          </div>
          <button 
            className="close-btn"
            onClick={onClose}
            title="关闭预览"
          >
            ✕
          </button>
        </div>

        <div className="image-modal-body">
          <div className="image-preview-container">
            {!imageLoaded && !imageError && (
              <div className="image-loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">正在加载图片...</div>
              </div>
            )}

            {imageError && (
              <div className="image-error">
                <div className="error-icon">⚠️</div>
                <div className="error-text">图片加载失败</div>
                <div className="error-details">{image.fileName}</div>
              </div>
            )}

            <img 
              ref={imgRef}
              className={`image-preview ${imageLoaded ? 'loaded' : ''}`}
              src={`/api/files/${encodeURIComponent(image.filePath).replace(/%2F/g, '/')}`}
              alt={image.fileName}
              style={{ 
                display: imageLoaded ? 'block' : 'none',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto'
              }}
            />

          </div>
        </div>

        {/* 图片信息面板 - 移到下方 */}
        <div className="image-info-panel">
          <div className="image-meta-grid">
            <div className="meta-item">
              <div className="meta-label">📁 文件名</div>
              <div className="meta-value" title={image.fileName}>
                {image.fileName}
              </div>
            </div>

            <div className="meta-item">
              <div className="meta-label">💾 文件大小</div>
              <div className="meta-value">
                {formatFileSize(image.fileSize)}
              </div>
            </div>

            <div className="meta-item">
              <div className="meta-label">📅 创建时间</div>
              <div className="meta-value">
                {formatDate(image.createdAt)}
              </div>
            </div>

            {imageDimensions && (
              <>
                <div className="meta-item">
                  <div className="meta-label">📐 分辨率</div>
                  <div className="meta-value">
                    {imageDimensions.width} × {imageDimensions.height}
                  </div>
                </div>

                <div className="meta-item">
                  <div className="meta-label">📏 宽高比</div>
                  <div className="meta-value">
                    {getAspectRatio()}
                  </div>
                </div>

                <div className="meta-item">
                  <div className="meta-label">📱 方向</div>
                  <div className="meta-value">
                    {isVerticalImage() ? '竖屏' : '横屏'}
                    {isPortrait9_16() && ' (9:16)'}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewCard;
