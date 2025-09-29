import React from 'react';
import { AssetFile } from '../../shared/types/index.js';
import './AssetCard.css';

interface AssetCardProps {
  asset: AssetFile;
  onPreview?: (asset: AssetFile) => void;
  showDetails?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onPreview, showDetails = true }) => {
  const getAssetIcon = (fileType: AssetFile['fileType']) => {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'audio': return '🔊';
      case 'video': return '🎥';
      case 'prompt': return '📝';
      default: return '📄';
    }
  };

  const getAssetColor = (fileType: AssetFile['fileType']) => {
    switch (fileType) {
      case 'image': return '#ffd93d';
      case 'audio': return '#6bcf7f';
      case 'video': return '#ff6b6b';
      case 'prompt': return '#a367dc';
      default: return '#999';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePreview = () => {
    onPreview?.(asset);
  };

  return (
    <div 
      className="asset-card" 
      style={{ borderLeft: `4px solid ${getAssetColor(asset.fileType)}` }}
      onClick={handlePreview}
    >
      <div className="asset-header">
        <div className="asset-icon">
          {getAssetIcon(asset.fileType)}
        </div>
        <div className="asset-info">
          <div className="asset-name" title={asset.fileName}>
            {asset.fileName}
          </div>
          <div className="asset-type" style={{ color: getAssetColor(asset.fileType) }}>
            {asset.fileType.toUpperCase()}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="asset-details">
          <div className="asset-meta">
            <div className="asset-size">
              📏 {formatFileSize(asset.fileSize)}
            </div>
            <div className="asset-date">
              📅 {formatDate(asset.createdAt)}
            </div>
          </div>
          
          <div className="asset-path" title={asset.filePath}>
            📁 {asset.filePath.split(/[\\/]/).slice(-3).join('/')}
          </div>
        </div>
      )}

      <div className="asset-actions">
        <button 
          className="preview-btn"
          onClick={handlePreview}
          title="预览文件"
        >
          👁️ 预览
        </button>
      </div>
    </div>
  );
};

export default AssetCard;