import React, { useRef, useState } from "react";
import ReactPlayer from "react-player";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  MonitorSmartphone,
} from "lucide-react";
import "../components/CustomVideoPlayer.css";

const CustomVideoPlayer = ({ url, thumbnail }) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleToggleMute = () => {
    setMuted(!muted);
  };

  const handleProgress = (state) => {
    setPlayed(state.played);
  };

  const handleSeekChange = (e) => {
    const time = parseFloat(e.target.value);
    setPlayed(time);
    playerRef.current.seekTo(time);
  };

  const handlePlaybackRateChange = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = "video";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleVideoClick = (e) => {
    // Ignore clicks on controls
    if (e.target.closest(".controls-wrapper")) {
      return;
    }

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        // Single click - toggle play/pause
        handlePlayPause();
        clickCountRef.current = 0;
      }, 300);
    } else if (clickCountRef.current === 2) {
      // Double click - toggle fullscreen
      clearTimeout(clickTimeoutRef.current);
      handleFullscreen();
      clickCountRef.current = 0;
    }
  };

  return (
    <div
      className="video-player-wrapper"
      ref={containerRef}
      onClick={handleVideoClick}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        width="100%"
        height="100%"
        onProgress={handleProgress}
        light={
          <img src={thumbnail} alt="Thumbnail" className="video-thumbnail" />
        }
        className="react-player"
      />

      <div className="controls-wrapper">
        <input
          type="range"
          min={0}
          max={1}
          step="any"
          value={played}
          onChange={handleSeekChange}
          className="progress-bar"
        />

        <div className="controls-bar">
          <div className="left-controls">
            <button
              className="control-button"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
          </div>

          <div className="right-controls">
            <div className="volume-control">
              <button
                className="control-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMute();
                }}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step="any"
                value={volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="volume-slider"
              />
            </div>

            <button
              className="control-button speed-button"
              onClick={(e) => {
                e.stopPropagation();
                handlePlaybackRateChange();
              }}
            >
              {playbackRate}x
            </button>

            <button
              className="control-button"
              onClick={(e) => {
                e.stopPropagation();
                document.pictureInPictureElement
                  ? document.exitPictureInPicture()
                  : playerRef.current
                      .getInternalPlayer()
                      .requestPictureInPicture();
              }}
            >
              <MonitorSmartphone size={20} />
            </button>

            <button
              className="control-button"
              onClick={(e) => {
                e.stopPropagation();
                handleFullscreen();
              }}
            >
              <Maximize2 size={20} />
            </button>

            <button
              className="control-button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
