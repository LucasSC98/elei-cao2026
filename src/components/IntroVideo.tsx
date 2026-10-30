import { useEffect, useRef } from 'react';
import videoSrc from '../assets/lulete-video.mp4';

type IntroVideoProps = {
  onFinish: () => void;
};

export function IntroVideo({ onFinish }: IntroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['Space', 'Enter', 'Escape'].includes(e.code)) {
        onFinish();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onFinish]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Caso o navegador bloqueie áudio automático, inicia mudo
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
    }
  }, []);

  return (
    <div className="intro-container">
      <video
        ref={videoRef}
        src={videoSrc}
        className="intro-video"
        playsInline
        onEnded={onFinish}
      />
      <div className="intro-controls">
        <button className="skip-intro-btn" onClick={onFinish}>
          PULAR INTRO ❯❯
        </button>
        <span className="skip-intro-hint">[Espaço / Enter para pular]</span>
      </div>
    </div>
  );
}

