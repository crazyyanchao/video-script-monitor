import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { ShotDetail } from '../../shared/types/index.js';
import './Timeline.css';

interface TimelineProps {
  shots: ShotDetail[];
  onShotSelect?: (shot: ShotDetail) => void;
  selectedShot?: ShotDetail | null;
  width?: number;
  height?: number;
  searchTerm?: string;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

const Timeline: React.FC<TimelineProps> = React.memo(({ 
  shots, 
  onShotSelect, 
  selectedShot,
  width = 1200, 
  height = 200,
  searchTerm = '',
  zoomLevel = 1,
  onZoomChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredShot, setHoveredShot] = useState<ShotDetail | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [assetTooltip, setAssetTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // 过滤分镜数据
  const filteredShots = useMemo(() => {
    if (!searchTerm) return shots;
    return shots.filter(shot => 
      shot.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shot.shotId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shots, searchTerm]);

  // 计算总时长和比例尺
  const { totalDuration, xScale, yScale } = useMemo(() => {
    const duration = Math.max(...filteredShots.map(shot => shot.endTime), 60);
    const effectiveWidth = width * zoomLevel;
    
    const xScale = d3.scaleLinear()
      .domain([0, duration])
      .range([60, effectiveWidth - 60]);

    const yScale = d3.scaleBand()
      .domain(filteredShots.map(shot => shot.shotId))
      .range([30, height - 50])
      .padding(0.15);

    return { totalDuration: duration, xScale, yScale };
  }, [filteredShots, width, height, zoomLevel]);

  // 防抖的tooltip更新
  const debouncedSetTooltip = useCallback(
    debounce((tooltipData: { x: number; y: number; content: string } | null) => {
      setTooltip(tooltipData);
    }, 100),
    []
  );

  // 防抖函数
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  useEffect(() => {
    if (!svgRef.current || filteredShots.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 创建时间轴
    const timeline = svg.append('g')
      .attr('class', 'timeline');

    // 添加背景网格 - 根据缩放级别调整密度
    const gridInterval = Math.max(1, Math.ceil(totalDuration / (20 * zoomLevel)));
    const gridLines = d3.range(0, totalDuration + 1, gridInterval);
    timeline.selectAll('.grid-line')
      .data(gridLines)
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 30)
      .attr('y2', height - 50)
      .attr('stroke', 'rgba(255, 255, 255, 0.05)')
      .attr('stroke-width', 1);

    // 添加时间刻度 - 根据缩放级别调整密度
    const tickInterval = Math.max(1, Math.ceil(totalDuration / (10 * zoomLevel)));
    const timeTicks = d3.range(0, totalDuration + 1, tickInterval);
    
    timeline.selectAll('.time-tick')
      .data(timeTicks)
      .enter()
      .append('line')
      .attr('class', 'time-tick')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', height - 35)
      .attr('y2', height - 30)
      .attr('stroke', '#666')
      .attr('stroke-width', 2);

    timeline.selectAll('.time-label')
      .data(timeTicks)
      .enter()
      .append('text')
      .attr('class', 'time-label')
      .attr('x', d => xScale(d))
      .attr('y', height - 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#999')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text(d => `${d}s`);

    // 添加分镜条
    const shotBars = timeline.selectAll('.shot-bar')
      .data(filteredShots)
      .enter()
      .append('g')
      .attr('class', 'shot-bar')
      .attr('transform', d => `translate(0, ${yScale(d.shotId)})`);

    // 分镜矩形 - 添加渐变和阴影效果
    shotBars.each(function(d, i) {
      const defs = d3.select(this).append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('x1', '0%')
        .attr('x2', '100%');
      
      const getColor = (shot: ShotDetail, isEnd: boolean) => {
        const shotType = shot.description.toLowerCase();
        if (shotType.includes('cu')) return isEnd ? '#ff5252' : '#ff6b6b';
        if (shotType.includes('ms')) return isEnd ? '#26a69a' : '#4ecdc4';
        if (shotType.includes('ls')) return isEnd ? '#2196f3' : '#45b7d1';
        return isEnd ? '#66bb6a' : '#96ceb4';
      };
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', getColor(d, false));
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', getColor(d, true));
    });

    // 为分镜组添加选中状态类并设置正确的变换
    shotBars
      .attr('class', d => `shot-bar ${selectedShot?.shotId === d.shotId ? 'selected' : ''}`)
      .attr('transform', d => {
        const isSelected = selectedShot?.shotId === d.shotId;
        const scaleValue = isSelected ? 1.05 : 1;
        return `translate(0, ${yScale(d.shotId)}) scale(${scaleValue})`;
      });

    // 分镜矩形
    shotBars.append('rect')
      .attr('class', 'shot-rect')
      .attr('x', d => xScale(d.startTime))
      .attr('width', d => xScale(d.endTime) - xScale(d.startTime))
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d, i) => `url(#gradient-${i})`)
      .attr('stroke', d => selectedShot?.shotId === d.shotId ? '#fff' : 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', d => selectedShot?.shotId === d.shotId ? 3 : 1)
      .attr('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))')
      .on('click', (_, d) => {
        onShotSelect?.(d);
      });

    // 为整个分镜组添加悬停效果
    shotBars
      .on('mouseenter', function(event, d) {
        setHoveredShot(d);
        const isSelected = selectedShot?.shotId === d.shotId;
        const scaleValue = isSelected ? 1.05 : 1.02;
        
        // 对整个分镜组应用变换，保持位置不变
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', `translate(0, ${yScale(d.shotId)}) scale(${scaleValue})`)
          .select('.shot-rect')
          .attr('filter', isSelected 
            ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))' 
            : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))');
        
        // 显示详细tooltip - 使用防抖
        const rect = this.getBoundingClientRect();
        debouncedSetTooltip({
          x: event.pageX,
          y: event.pageY - 10,
          content: `${d.description}\n时长: ${d.endTime - d.startTime}s\n素材: ${d.assets.length}个`
        });
      })
      .on('mouseleave', function(event, d) {
        setHoveredShot(null);
        debouncedSetTooltip(null);
        const isSelected = selectedShot?.shotId === d.shotId;
        const scaleValue = isSelected ? 1.05 : 1;
        
        // 恢复整个分镜组的变换，保持位置不变
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', `translate(0, ${yScale(d.shotId)}) scale(${scaleValue})`)
          .select('.shot-rect')
          .attr('filter', isSelected 
            ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))' 
            : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))');
      });

    // 分镜标签 - 优化文字显示
    shotBars.append('text')
      .attr('class', 'shot-label')
      .attr('x', d => xScale(d.startTime) + 8)
      .attr('y', yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.5)')
      .text(d => `Shot ${d.shotNumber}`);

    // 分镜时长 - 优化位置和样式
    shotBars.append('text')
      .attr('class', 'shot-duration')
      .attr('x', d => xScale(d.endTime) - 8)
      .attr('y', yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', 'rgba(255, 255, 255, 0.8)')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.5)')
      .text(d => `${d.endTime - d.startTime}s`);

    // 添加素材标记 - 优化样式和交互
    filteredShots.forEach(shot => {
      shot.assets.forEach((asset, index) => {
        const assetX = xScale(shot.startTime) + (xScale(shot.endTime) - xScale(shot.startTime)) * 0.7;
        const assetY = yScale(shot.shotId)! + yScale.bandwidth() * (index + 1) / (shot.assets.length + 1);
        
        const marker = timeline.append('g')
          .attr('class', 'asset-marker-group');
        
        // 添加外圈
        marker.append('circle')
          .attr('class', 'asset-marker-outer')
          .attr('cx', assetX)
          .attr('cy', assetY)
          .attr('r', 6)
          .attr('fill', 'rgba(255, 255, 255, 0.2)')
          .attr('stroke', 'rgba(255, 255, 255, 0.3)')
          .attr('stroke-width', 1);
        
        // 添加内圈
        marker.append('circle')
          .attr('class', 'asset-marker')
          .attr('cx', assetX)
          .attr('cy', assetY)
          .attr('r', 4)
          .attr('fill', () => {
            switch (asset.fileType) {
              case 'image': return '#ffd93d';
              case 'audio': return '#6bcf7f';
              case 'video': return '#ff6b6b';
              case 'prompt': return '#a367dc';
              default: return '#999';
            }
          })
          .attr('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))')
          .on('mouseenter', function(event, d) {
            const parent = this.parentNode as Element;
            if (parent) {
              d3.select(parent)
                .transition()
                .duration(200)
                .attr('transform', 'scale(1.3)');
            }
            
            // 显示素材tooltip
            setAssetTooltip({
              x: event.pageX,
              y: event.pageY - 10,
              content: `${asset.fileType.toUpperCase()}\n${asset.fileName}\n大小: ${Math.round(asset.fileSize / 1024)} KB`
            });
          })
          .on('mouseleave', function() {
            const parent = this.parentNode as Element;
            if (parent) {
              d3.select(parent)
                .transition()
                .duration(200)
                .attr('transform', 'scale(1)');
            }
            
            setAssetTooltip(null);
          });
      });
    });

    // 添加当前时间指示器 - 优化样式
    const currentTime = 0;
    timeline.append('line')
      .attr('class', 'current-time')
      .attr('x1', xScale(currentTime))
      .attr('x2', xScale(currentTime))
      .attr('y1', 30)
      .attr('y2', height - 50)
      .attr('stroke', '#ff6b6b')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,4')
      .attr('filter', 'drop-shadow(0 0 4px rgba(255, 107, 107, 0.5))');

    // 添加时间轴标题
    timeline.append('text')
      .attr('class', 'timeline-title')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('时间轴');

  }, [filteredShots, selectedShot, width, height, zoomLevel, totalDuration, xScale, yScale, debouncedSetTooltip]);

  // 键盘导航
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!selectedShot || filteredShots.length === 0) return;

    const currentIndex = filteredShots.findIndex(shot => shot.shotId === selectedShot.shotId);
    if (currentIndex === -1) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          onShotSelect?.(filteredShots[currentIndex - 1]);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < filteredShots.length - 1) {
          onShotSelect?.(filteredShots[currentIndex + 1]);
        }
        break;
      case 'Home':
        event.preventDefault();
        onShotSelect?.(filteredShots[0]);
        break;
      case 'End':
        event.preventDefault();
        onShotSelect?.(filteredShots[filteredShots.length - 1]);
        break;
    }
  }, [selectedShot, filteredShots, onShotSelect]);

  // 缩放控制
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
      onZoomChange?.(newZoom);
    }
  }, [zoomLevel, onZoomChange]);

  // 鼠标拖拽缩放
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 1) { // 中键
      event.preventDefault();
      setIsDragging(true);
      setDragStart({ x: event.clientX, y: event.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging && dragStart) {
      const deltaX = event.clientX - dragStart.x;
      const zoomDelta = deltaX * 0.01;
      const newZoom = Math.max(0.5, Math.min(3, zoomLevel + zoomDelta));
      onZoomChange?.(newZoom);
    }
  }, [isDragging, dragStart, zoomLevel, onZoomChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  return (
    <div className="timeline-container">
      {/* 控制面板 */}
      <div className="timeline-controls">
        <div className="zoom-controls">
          <button 
            onClick={() => onZoomChange?.(Math.max(0.5, zoomLevel - 0.2))}
            className="zoom-btn"
            title="缩小"
          >
            −
          </button>
          <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
          <button 
            onClick={() => onZoomChange?.(Math.min(3, zoomLevel + 0.2))}
            className="zoom-btn"
            title="放大"
          >
            +
          </button>
        </div>
        <div className="timeline-info">
          <span>分镜: {filteredShots.length}</span>
          <span>总时长: {Math.round(totalDuration)}s</span>
        </div>
      </div>
      
      <div 
        className="timeline-svg-container"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg 
          ref={svgRef} 
          width={width * zoomLevel} 
          height={height}
          className="timeline-svg"
          style={{ transform: `scale(${1/zoomLevel})`, transformOrigin: 'top left' }}
        />
      </div>
      
      {/* 自定义Tooltip */}
      {tooltip && (
        <div 
          className="timeline-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <pre>{tooltip.content}</pre>
        </div>
      )}
      
      {/* 素材Tooltip */}
      {assetTooltip && (
        <div 
          className="timeline-tooltip asset-tooltip"
          style={{
            position: 'fixed',
            left: assetTooltip.x,
            top: assetTooltip.y,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <pre>{assetTooltip.content}</pre>
        </div>
      )}
    </div>
  );
});

Timeline.displayName = 'Timeline';

export default Timeline;