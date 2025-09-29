import React, { useRef, useState, useEffect } from 'react';
import './AudioPlayer.css';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  fileSize: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, fileName, fileSize }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player">
      <audio ref={audioRef} preload="metadata">
        <source src={src} type="audio/mp3" />
        <source src={src} type="audio/mpeg" />
        <source src={src} type="audio/wav" />
      </audio>

      <div className="audio-header">
        <div className="audio-icon">🎵</div>
        <div className="audio-info">
          <div className="audio-title">{fileName}</div>
          <div className="audio-meta">
            {Math.round(fileSize / 1024)} KB • {formatTime(duration)}
          </div>
        </div>
      </div>

      <div className="audio-controls">
        <button 
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : isPlaying ? (
            <div className="pause-icon">⏸</div>
          ) : (
            <div className="play-icon">▶</div>
          )}
        </button>

        <div className="progress-container">
          <div className="time-display">{formatTime(currentTime)}</div>
          <div 
            className="progress-bar"
            onClick={handleProgressClick}
          >
            <div 
              className="progress-fill"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
            <div 
              className="progress-thumb"
              style={{ left: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="time-display">{formatTime(duration)}</div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
