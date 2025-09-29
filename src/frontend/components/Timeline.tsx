import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ShotDetail } from '../../shared/types/index.js';
import './Timeline.css';

interface TimelineProps {
  shots: ShotDetail[];
  onShotSelect?: (shot: ShotDetail) => void;
  selectedShot?: ShotDetail | null;
  width?: number;
  height?: number;
}

const Timeline: React.FC<TimelineProps> = ({ 
  shots, 
  onShotSelect, 
  selectedShot,
  width = 1200, 
  height = 200 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || shots.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 计算总时长
    const totalDuration = Math.max(...shots.map(shot => shot.endTime), 60);
    
    // 创建比例尺
    const xScale = d3.scaleLinear()
      .domain([0, totalDuration])
      .range([50, width - 50]);

    const yScale = d3.scaleBand()
      .domain(shots.map(shot => shot.shotId))
      .range([20, height - 40])
      .padding(0.2);

    // 创建时间轴
    const timeline = svg.append('g')
      .attr('class', 'timeline');

    // 添加时间刻度
    const timeTicks = d3.range(0, totalDuration + 1, Math.ceil(totalDuration / 10));
    
    timeline.selectAll('.time-tick')
      .data(timeTicks)
      .enter()
      .append('line')
      .attr('class', 'time-tick')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', height - 30)
      .attr('y2', height - 25)
      .attr('stroke', '#666')
      .attr('stroke-width', 1);

    timeline.selectAll('.time-label')
      .data(timeTicks)
      .enter()
      .append('text')
      .attr('class', 'time-label')
      .attr('x', d => xScale(d))
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#999')
      .attr('font-size', '12px')
      .text(d => `${d}s`);

    // 添加分镜条
    const shotBars = timeline.selectAll('.shot-bar')
      .data(shots)
      .enter()
      .append('g')
      .attr('class', 'shot-bar')
      .attr('transform', d => `translate(0, ${yScale(d.shotId)})`);

    // 分镜矩形
    shotBars.append('rect')
      .attr('class', d => `shot-rect ${selectedShot?.shotId === d.shotId ? 'selected' : ''}`)
      .attr('x', d => xScale(d.startTime))
      .attr('width', d => xScale(d.endTime) - xScale(d.startTime))
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', d => {
        const shotType = d.description.toLowerCase();
        if (shotType.includes('cu')) return '#ff6b6b';
        if (shotType.includes('ms')) return '#4ecdc4';
        if (shotType.includes('ls')) return '#45b7d1';
        return '#96ceb4';
      })
      .attr('stroke', d => selectedShot?.shotId === d.shotId ? '#fff' : 'transparent')
      .attr('stroke-width', 2)
      .on('click', (_, d) => {
        onShotSelect?.(d);
      })
      .append('title')
      .text(d => `${d.description}\n时长: ${d.endTime - d.startTime}s`);

    // 分镜标签
    shotBars.append('text')
      .attr('class', 'shot-label')
      .attr('x', d => xScale(d.startTime) + 5)
      .attr('y', yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => `Shot ${d.shotNumber}`);

    // 分镜时长
    shotBars.append('text')
      .attr('class', 'shot-duration')
      .attr('x', d => xScale(d.endTime) - 5)
      .attr('y', yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(d => `${d.endTime - d.startTime}s`);

    // 添加素材标记
    shots.forEach(shot => {
      shot.assets.forEach((asset, index) => {
        const assetX = xScale(shot.startTime) + (xScale(shot.endTime) - xScale(shot.startTime)) * 0.3;
        const assetY = yScale(shot.shotId)! + yScale.bandwidth() * (index + 1) / (shot.assets.length + 1);
        
        timeline.append('circle')
          .attr('class', 'asset-marker')
          .attr('cx', assetX)
          .attr('cy', assetY)
          .attr('r', 3)
          .attr('fill', () => {
            switch (asset.fileType) {
              case 'image': return '#ffd93d';
              case 'audio': return '#6bcf7f';
              case 'video': return '#ff6b6b';
              case 'prompt': return '#a367dc';
              default: return '#999';
            }
          })
          .append('title')
          .text(`${asset.fileType}: ${asset.fileName}`);
      });
    });

    // 添加当前时间指示器（如果有播放功能）
    const currentTime = 0; // 可以添加播放控制
    timeline.append('line')
      .attr('class', 'current-time')
      .attr('x1', xScale(currentTime))
      .attr('x2', xScale(currentTime))
      .attr('y1', 0)
      .attr('y2', height - 30)
      .attr('stroke', '#ff6b6b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

  }, [shots, selectedShot, width, height]);

  return (
    <div className="timeline-container">
      <svg 
        ref={svgRef} 
        width={width} 
        height={height}
        className="timeline-svg"
      />
    </div>
  );
};

export default Timeline;