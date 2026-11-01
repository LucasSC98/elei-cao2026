import type { GameId } from '../types';

type GameMenuProps = {
  onSelect: (game: GameId) => void;
};

export function GameMenu({ onSelect }: GameMenuProps) {
  return (
    <div className="game-menu">
      <div className="menu-kicker">ARCADE DE CAMPANHA · 2026</div>
      <h1>ESCOLHA<br /><span>SEU DESAFIO</span></h1>
      <p className="menu-intro">Duas missões. Uma tela. Quanto tempo você consegue sobreviver?</p>
      <div className="game-choice-grid">
        <button className="game-choice game-choice-runner" onClick={() => onSelect('runner')}>
          <span className="game-choice-number">01</span>
          <span className="game-choice-title">A GRANDE FUGA</span>
          <span className="game-choice-meta">RUNNER · FLAVIO</span>
          <span className="game-choice-action">TOQUE PARA JOGAR →</span>
        </button>
        <button className="game-choice game-choice-larapio" onClick={() => onSelect('larapio')}>
          <span className="game-choice-number">02</span>
          <span className="game-choice-title">ROUBANDO O BRASIL</span>
          <span className="game-choice-meta">SOBREVIVÊNCIA · LULA</span>
          <span className="game-choice-action">TOQUE PARA JOGAR →</span>
        </button>
      </div>
      <p className="menu-hint"><strong>CONTROLES</strong> · Fuga: espaço, seta ↑ ou toque · Roubo: WASD, setas ou arraste</p>
    </div>
  );
}
