import { useState } from 'react';
import type { FightCharacter, GameId } from '../types';

type GameMenuProps = {
  onSelect: (game: GameId) => void;
  onSelectFightCharacter: (character: FightCharacter) => void;
};

export function GameMenu({ onSelect, onSelectFightCharacter }: GameMenuProps) {
  const [choosingCharacter, setChoosingCharacter] = useState(false);

  return (
    <>
      <h1>ELEIÇÕES 2026<br />ESCOLHA O JOGO</h1>
      <button onClick={() => onSelect('runner')}>Flavio<br /><br />A Grande Fuga<br />(corrida)</button>
      <button onClick={() => onSelect('larapio')}> Lula<br /><br />Roubando o Brasil<br />(sobrevivência)</button>
      {!choosingCharacter ? (
        <button onClick={() => setChoosingCharacter(true)}>Flavio Bolsonaro x Lula<br /><br />Batalha Eleitoral<br />(contra a máquina)</button>
      ) : (
        <>
          <p>ESCOLHA SEU PERSONAGEM</p>
          <button onClick={() => onSelectFightCharacter('flaviete')}>JOGAR DE FLAVIO BOLSONARO<br /><br />A/D move · W pula · F ataca</button>
          <button onClick={() => onSelectFightCharacter('lulete')}>JOGAR DE LULA<br /><br />A/D move · W pula · F ataca</button>
        </>
      )}
      <p><br />Fuga: ESPAÇO/TOQUE pula · Roubo: WASD/setas ou arraste</p>
    </>
  );
}
