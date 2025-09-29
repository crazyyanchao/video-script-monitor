import React from 'react';
import { ShotDetail, AssetFile } from '../../shared/types/index.js';
import AssetCard from './AssetCard';
import './DetailPanel.css';

interface DetailPanelProps {
  shot: ShotDetail | null;
  onClose: () => void;
  onAssetPreview?: (asset: AssetFile) => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ shot, onClose, onAssetPreview }) => {
  if (!shot) {
    return (
      <div className="detail-panel empty">
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <div className="empty-text">请选择一个分镜查看详情</div>
        </div>
      </div>
    );
  }

  const duration = shot.endTime - shot.startTime;

  return (
    <div className="detail-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="shot-number">分镜 {shot.shotNumber}</span>
          <span className="shot-id">({shot.shotId})</span>
        </div>
        <button className="close-btn" onClick={onClose} title="关闭">
          ✕
        </button>
      </div>

      <div className="panel-content">
        <div className="shot-info">
          <div className="info-section">
            <h4>📋 分镜信息</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>时间范围:</label>
                <span>{shot.startTime}s - {shot.endTime}s</span>
              </div>
              <div className="info-item">
                <label>时长:</label>
                <span>{duration}s</span>
              </div>
              <div className="info-item">
                <label>角色ID:</label>
                <span>{shot.roleId || '未指定'}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h4>🎭 描述</h4>
            <div className="description">
              {shot.description || '暂无描述'}
            </div>
          </div>

          <div className="info-section">
            <h4>💬 台词</h4>
            <div className="dialogue">
              {shot.dialogue || '暂无台词'}
            </div>
          </div>
        </div>

        <div className="assets-section">
          <h4>📁 相关素材 ({shot.assets.length})</h4>
          <div className="assets-list">
            {shot.assets.length > 0 ? (
              shot.assets.map((asset) => (
                <AssetCard
                  key={asset.fileId}
                  asset={asset}
                  onPreview={onAssetPreview}
                  showDetails={false}
                />
              ))
            ) : (
              <div className="no-assets">暂无相关素材</div>
            )}
          </div>
        </div>

        <div className="shot-preview">
          <h4>🖼️ 预览</h4>
          <div className="preview-content">
            {shot.assets.filter(asset => asset.fileType === 'image').length > 0 ? (
              <div className="image-preview">
                <div className="preview-text">点击左侧图片素材进行预览</div>
              </div>
            ) : (
              <div className="no-preview">
                <div className="no-preview-icon">📷</div>
                <div className="no-preview-text">暂无图片素材</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPanel;