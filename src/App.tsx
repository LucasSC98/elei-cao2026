import { useEffect, useRef, useState, useCallback } from 'react';
import { GameMenu } from './components/GameMenu';
import { GameOver } from './components/GameOver';
import { Overlay } from './components/Overlay';
import { AlienadosOverlay } from './components/AlienadosOverlay';
import { AlienadosFlavieteOverlay } from './components/AlienadosFlavieteOverlay';
import { IntroVideo } from './components/IntroVideo';
import flavieteIntroUrl from './assets/flaviete-intro.mp4';
import { createLarapioGame } from './games/larapioGame';
import { createRunnerGame } from './games/runnerGame';
import { useKeyboard } from './hooks/useKeyboard';
import { saveScore } from './services/scoreService';
import type { GameId, GameModule, GameResult } from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameModule | null>(null);
  const keys = useKeyboard();
  const [game, setGame] = useState<GameId | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [showingIntro, setShowingIntro] = useState<GameId | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [runnerAlienadoQuote, setRunnerAlienadoQuote] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

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
    setShowingIntro(null);
    setGame(null);
    setResult(null);
  };

  const startGame = (selectedGame: GameId) => {
    gameRef.current?.destroy();
    setGame(selectedGame);
    setResult(null);
    setRunnerAlienadoQuote(null);
  };

  const handleSelectGame = (selectedGame: GameId) => {
    setShowingIntro(selectedGame);
  };

  const finishIntro = () => {
    const selectedGame = showingIntro;
    setShowingIntro(null);
    if (selectedGame) startGame(selectedGame);
  };

  const retryGame = () => {
    setResult(null);
    gameRef.current?.start();
  };

  const confirmPlayerName = () => {
    const normalizedName = nameInput.trim();
    if (!normalizedName) return;
    setPlayerName(normalizedName);
    localStorage.setItem('jogador', normalizedName);
  };

  const handleAlienadoDonation = useCallback(
    (side: 'left' | 'right' | 'bottom-left' | 'bottom-right') => {
      gameRef.current?.spawnAlienadoDonation?.(side);
    },
    [],
  );

  const handleRunnerAlienadoQuote = useCallback((quote: string, x: number, y: number) => {
    setRunnerAlienadoQuote({ text: quote, x, y });
  }, []);

  useEffect(() => {
    if (!game || !canvasRef.current) return;
    const onEnd = (gameResult: GameResult) => {
      setResult(gameResult);
      const score = gameResult.stats?.score;
      if (score !== undefined) {
        void saveScore(playerName, game, score).catch((error: unknown) => {
          console.error('Não foi possível salvar a pontuação no Supabase.', error);
        });
      }
    };
    gameRef.current = game === 'runner'
      ? createRunnerGame(canvasRef.current, keys.current, onEnd, handleRunnerAlienadoQuote)
      : createLarapioGame(canvasRef.current, keys.current, onEnd);
    gameRef.current.start();
    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [game, keys, handleRunnerAlienadoQuote]);

  return (
    <>
      {/* Intro de vídeo do Lulete em tela cheia (ocupa 100% da janela) */}
      {showingIntro && (
        <IntroVideo
          onFinish={finishIntro}
          videoSrc={showingIntro === 'runner' ? flavieteIntroUrl : undefined}
        />
      )}

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

      {playerName && !showingIntro && (
        <div className="player-name-display">USUÁRIO: {playerName}</div>
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

        {(!game || result) && !showingIntro && playerName && (
          <Overlay>
            {result ? (
              <GameOver
                result={result}
                onRetry={retryGame}
                onMenu={openMenu}
              />
            ) : (
              <GameMenu onSelect={handleSelectGame} />
            )}
          </Overlay>
        )}

        {!playerName && !showingIntro && (
          <Overlay>
            <div className="player-name-form">
              <h1>IDENTIFIQUE-SE</h1>
              <p>Digite seu nome para começar a jogar.</p>
              <input
                autoFocus
                aria-label="Seu nome"
                maxLength={40}
                onChange={(event) => setNameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') confirmPlayerName();
                }}
                placeholder="SEU NOME"
                value={nameInput}
              />
              <button onClick={confirmPlayerName}>ENTRAR</button>
            </div>
          </Overlay>
        )}
      </main>

      <footer className="site-footer">Criado por LucasSC98</footer>

      {/* Os Alienados surgindo fora da tela do jogo */}
      {game === 'larapio' && !result && !showingIntro && (
        <AlienadosOverlay onDonation={handleAlienadoDonation} />
      )}
      {game === 'runner' && !result && !showingIntro && (
        <AlienadosFlavieteOverlay
          quote={runnerAlienadoQuote}
          onExpire={() => setRunnerAlienadoQuote(null)}
        />
      )}
    </>
  );
}
