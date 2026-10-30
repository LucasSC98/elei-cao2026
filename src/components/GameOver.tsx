import { useState, useEffect } from 'react';
import type { GameResult } from '../types';

type GameOverProps = {
  result: GameResult;
  onRetry: () => void;
  onMenu: () => void;
};

export function GameOver({ result, onRetry, onMenu }: GameOverProps) {
  const [skipped, setSkipped] = useState(false);

  // Allow clicking anywhere or pressing space/enter/escape to skip intro animations
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['Space', 'Enter', 'Escape'].includes(e.code)) {
        setSkipped(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Determine stamp label: if result has explicit stamp, use it; otherwise randomize or infer
  const stampText = result.stamp
    ? result.stamp
    : result.title.includes('PEGO') || Math.random() < 0.5
    ? 'CONDUÇÃO COERCITIVA'
    : 'FLAGRANTE';

  const isCoercitiva = stampText.includes('COERCITIVA');

  // Stats extraction
  const money = result.stats?.money;
  const time = result.stats?.time;
  const level = result.stats?.level;
  const score = result.stats?.score;
  const caughtBy = result.stats?.caughtBy;

  // Frase sacana: result.quote or fallback message
  const quote = result.quote || (result.message.includes('\n\n')
    ? result.message.split('\n\n').pop()
    : result.message);

  return (
    <div
      className={`game-over-container ${skipped ? 'is-skipped' : ''}`}
      onClick={() => setSkipped(true)}
    >
      {/* Selo Carimbado com Animação Dramática */}
      <div className="stamp-wrapper">
        <div className={`stamp-seal ${isCoercitiva ? 'stamp-coercitiva' : 'stamp-flagrante'}`}>
          <div className="stamp-sub-header">★ POLÍCIA FEDERAL · DELEGACIA DE CORRUPÇÃO ★</div>
          <div className="stamp-title">{stampText}</div>
          <div className="stamp-sub-footer">MANDADO DEFLAGRADO · OPERAÇÃO LAVA-JATO</div>
        </div>
      </div>

      {/* Relatório / Dossiê da Apreensão */}
      <div className="dossier-card">
        <div className="dossier-header">
          <span>📋 DOSSIÊ DE APREENSÃO</span>
          {caughtBy && <span className="dossier-agent">AGENTE: {caughtBy.toUpperCase()}</span>}
        </div>

        <div className="dossier-grid">
          {money !== undefined && (
            <div className="dossier-item">
              <span className="dossier-label">DESVIO TOTAL</span>
              <span className="dossier-value money">R$ {money} mi</span>
            </div>
          )}
          {time !== undefined && (
            <div className="dossier-item">
              <span className="dossier-label">TEMPO DE FUGA</span>
              <span className="dossier-value">{time}s</span>
            </div>
          )}
          {level !== undefined && (
            <div className="dossier-item">
              <span className="dossier-label">NÍVEL ALCANÇADO</span>
              <span className="dossier-value">LVL {level}</span>
            </div>
          )}
          {score !== undefined && (
            <div className="dossier-item">
              <span className="dossier-label">PONTUAÇÃO</span>
              <span className="dossier-value highlight">{score} pts</span>
            </div>
          )}
        </div>
      </div>

      {/* Frase Sacana Final em Destaque */}
      {quote && (
        <div className="verdict-banner">
          <div className="verdict-tag">⚖️ VEREDITO DO JUIZ / NOTA DO GABINETE:</div>
          <div className="verdict-text">"{quote}"</div>
        </div>
      )}

      {/* Ações */}
      <div className="game-over-actions">
        <button
          className="btn-retry"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
        >
          {result.actionLabel || '↻ TENTAR DE NOVO'}
        </button>
        <button
          className="btn-menu"
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
        >
          ☰ MENU
        </button>
      </div>

      {!skipped && <div className="skip-hint">[Clique para pular animação]</div>}
    </div>
  );
}
