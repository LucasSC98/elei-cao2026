import type { GameId } from '../types';

type GameMenuProps = {
  onSelect: (game: GameId) => void;
};

export function GameMenu({ onSelect }: GameMenuProps) {
  return (
    <>
      <h1>ELEIÇÕES 2026<br />ESCOLHA O JOGO</h1>
      <button onClick={() => onSelect('runner')}>Flavio<br /><br />A Grande Fuga<br />(corrida)</button>
      <button onClick={() => onSelect('larapio')}> Lula<br /><br />Roubando o Brasil<br />(sobrevivência)</button>
      <p><br />Fuga: ESPAÇO/TOQUE pula · Roubo: WASD/setas ou arraste</p>
    </>
  );
}
