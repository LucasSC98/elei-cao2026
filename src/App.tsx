import { useEffect, useRef, useState, useCallback } from 'react';
import { GameMenu } from './components/GameMenu';
import { GameOver } from './components/GameOver';
import { Overlay } from './components/Overlay';
import { AlienadosOverlay } from './components/AlienadosOverlay';
import { IntroVideo } from './components/IntroVideo';
import { createLarapioGame } from './games/larapioGame';
import { createRunnerGame } from './games/runnerGame';
import { useKeyboard } from './hooks/useKeyboard';
import type { GameId, GameModule, GameResult } from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameModule | null>(null);
  const keys = useKeyboard();
  const [game, setGame] = useState<GameId | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [showingIntro, setShowingIntro] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const openMenu = () => {
    gameRef.current?.stop();
    setShowingIntro(false);
    setGame(null);
    setResult(null);
  };

  const startGame = (selectedGame: GameId) => {
    gameRef.current?.destroy();
    setGame(selectedGame);
    setResult(null);
  };

  const handleSelectGame = (selectedGame: GameId) => {
    if (selectedGame === 'larapio') {
      // Abre o vídeo de introdução em tela cheia ao iniciar Lulete pelo menu
      setShowingIntro(true);
    } else {
      startGame('runner');
    }
  };

  const finishIntro = () => {
    setShowingIntro(false);
    startGame('larapio');
  };

  const retryGame = () => {
    setResult(null);
    gameRef.current?.start();
  };

  const handleAlienadoDonation = useCallback(
    (side: 'left' | 'right' | 'bottom-left' | 'bottom-right') => {
      gameRef.current?.spawnAlienadoDonation?.(side);
    },
    [],
  );

  useEffect(() => {
    if (!game || !canvasRef.current) return;
    const onEnd = (gameResult: GameResult) => setResult(gameResult);
    gameRef.current = game === 'runner'
      ? createRunnerGame(canvasRef.current, keys.current, onEnd)
      : createLarapioGame(canvasRef.current, keys.current, onEnd);
    gameRef.current.start();
    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [game, keys]);

  return (
    <>
      {/* Intro de vídeo do Lulete em tela cheia (ocupa 100% da janela) */}
      {showingIntro && <IntroVideo onFinish={finishIntro} />}

      {/* Botão de Alternar Tela Cheia (F11 / Nativa) */}
      {!showingIntro && (
        <button
          className="fullscreen-toggle-btn"
          onClick={toggleFullscreen}
          title="Alternar Tela Cheia (F11)"
        >
          {isFullscreen ? '🗗 SAIR' : '⛶ TELA CHEIA'}
        </button>
      )}

      {/* Botão para voltar ao Menu durante a jogatina */}
      {game && !result && !showingIntro && (
        <button className="back-to-menu-btn" onClick={openMenu}>
          ☰ MENU
        </button>
      )}

      {/* Shell do Jogo que preenche 100% da tela no PC e celular */}
      <main className="game-shell">
        <canvas ref={canvasRef} className="game-canvas" />

        {(!game || result) && !showingIntro && (
          <Overlay>
            {result ? (
              <GameOver result={result} onRetry={retryGame} onMenu={openMenu} />
            ) : (
              <GameMenu onSelect={handleSelectGame} />
            )}
          </Overlay>
        )}
      </main>

      {/* Os Alienados surgindo fora da tela do jogo */}
      {game === 'larapio' && !result && !showingIntro && (
        <AlienadosOverlay onDonation={handleAlienadoDonation} />
      )}
    </>
  );
}
