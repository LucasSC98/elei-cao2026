import { useState, useEffect, useRef } from 'react';
import alienadoImg from '../assets/alienado-lulete.png';
import alienadaImg from '../assets/alienada-lulete.png';
import fazOLAudioUrl from '../assets/faz-o-l-de-lula.mp3';

type AlienadoSide = 'left' | 'right' | 'bottom-left' | 'bottom-right';

interface ActiveAlienado {
  id: number;
  type: 'alienado' | 'alienada';
  side: AlienadoSide;
  quote: string;
  leaving: boolean;
  clicked: boolean;
}

const ALIENADO_QUOTES = [
  "FAZ O L QUE PASSA! ⭐",
  "NÃO HÁ PROVAS! TUDO ARMAÇÃO DA CIA! 🚩",
  "E O BOLSONARO HEIN?! E O QUEIROZ?! 🗣️",
  "A PICANHA VAI CHEGAR, EU CONFIO! 🥩",
  "CULPA DA HERANÇA MALDITA! ✊",
  "MEU PRESIDENTE É A ALMA MAIS HONESTA! ❤️",
  "METE O L QUE A PF SOME! ✨",
  "ISSO FOI SÓ REFORMA DO PEDALINHO! 🦆",
  "VIVA O SUS E O LULETE! 🚩",
  "TOMA MEU FGTS, MEU LÍDER! 💵",
  "FOI SÓ UMA CONSULTORIA DE PALESTRA! 📜",
  "GOLPISTAS NÃO PASSARÃO! NUNCA! 🚫",
  "SE PRENDER O LULA O BRASIL PARA! 🇧🇷",
  "TUDO PERSEGUIÇÃO DA MÍDIA GOLPISTA! 📺",
  "EU NÃO COMO DÓLAR, EU COMO PICANHA! 🍽️",
];

function playFazOLAudio() {
  try {
    const audio = new Audio(fazOLAudioUrl);
    audio.volume = 0.85;
    audio.play().catch(() => {
      // Ignora silenciosamente se o navegador restringir áudio automático
    });
  } catch {}
}

type AlienadosOverlayProps = {
  onDonation: (side: AlienadoSide) => void;
};

export function AlienadosOverlay({ onDonation }: AlienadosOverlayProps) {
  const [alienado, setAlienado] = useState<ActiveAlienado | null>(null);
  const nextId = useRef(1);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const SIDES: AlienadoSide[] = ['left', 'right', 'bottom-left', 'bottom-right'];

    const spawn = () => {
      if (!isMounted) return;

      const side = SIDES[Math.floor(Math.random() * SIDES.length)];
      const type: 'alienado' | 'alienada' = Math.random() < 0.5 ? 'alienado' : 'alienada';
      const quote = ALIENADO_QUOTES[Math.floor(Math.random() * ALIENADO_QUOTES.length)];

      const currentId = nextId.current++;

      setAlienado({
        id: currentId,
        type,
        side,
        quote,
        leaving: false,
        clicked: false,
      });

      // Toca o áudio apenas às vezes (cerca de 35% de chance) para não ficar chato
      if (Math.random() < 0.96) {
        playFazOLAudio();
      }

      // Notifica o jogo para arremessar um malote bônus e atordoar policiais daquele lado
      onDonation(side);

      // Inicia saída após 4.2 segundos
      timeoutRef.current = window.setTimeout(() => {
        if (!isMounted) return;
        setAlienado((prev) => (prev && prev.id === currentId ? { ...prev, leaving: true } : prev));

        // Remove após transição de saída e agenda próximo
        timeoutRef.current = window.setTimeout(() => {
          if (!isMounted) return;
          setAlienado(null);
          scheduleNext(10000 + Math.random() * 6000);
        }, 500);
      }, 4200);
    };

    const scheduleNext = (delayMs: number) => {
      timeoutRef.current = window.setTimeout(spawn, delayMs);
    };

    // Primeiro alienado surge após 3.5 segundos para mostrar logo a novidade
    scheduleNext(3500);

    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onDonation]);

  const handleClick = () => {
    if (!alienado || alienado.clicked) return;
    setAlienado((prev) =>
      prev
        ? {
            ...prev,
            clicked: true,
            quote: "⭐ FAZ O L COM FORÇA! +R$ 50 mi! ⭐",
          }
        : null,
    );
    // Toca o áudio de satisfação ao clicar no alienado
    playFazOLAudio();
    // Bônus adicional ao clicar
    onDonation(alienado.side);
  };

  if (!alienado) return null;

  const imgSrc = alienado.type === 'alienado' ? alienadoImg : alienadaImg;
  const sideClass = `alienado-${alienado.side}`;
  const animClass = alienado.leaving ? 'is-leaving' : 'is-entering';

  return (
    <div
      className={`alienado-container ${sideClass} ${animClass} ${alienado.clicked ? 'is-clicked' : ''}`}
      onClick={handleClick}
      title="Clique no alienado para receber mais doações!"
    >
      {/* Balão de Fala Cômico / Meme */}
      <div className="alienado-speech-bubble">
        <div className="alienado-bubble-tag">
          {alienado.type === 'alienado' ? '🚩 ALIENADO DO PARTIDO' : '⭐ ALIENADA EM TRANSE'}
        </div>
        <div className="alienado-bubble-text">{alienado.quote}</div>
        <div className="alienado-bubble-arrow" />
      </div>

      {/* Avatar do Alienado com Animação de Balanço */}
      <div className="alienado-avatar-wrap">
        <img
          src={imgSrc}
          alt={alienado.type}
          className="alienado-avatar-img"
          draggable={false}
        />
        <div className="alienado-flag-badge">L</div>
        {alienado.clicked && <div className="alienado-bonus-floater">+R$ 50 mi!</div>}
      </div>
    </div>
  );
}
