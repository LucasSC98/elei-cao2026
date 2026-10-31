import { useEffect } from 'react';

type AlienadosFlavieteOverlayProps = {
  quote: { text: string; x: number; y: number } | null;
  onExpire: () => void;
};

export function AlienadosFlavieteOverlay({
  quote,
  onExpire,
}: AlienadosFlavieteOverlayProps) {
  useEffect(() => {
    if (!quote) return;
    const timeout = window.setTimeout(onExpire, 4200);
    return () => window.clearTimeout(timeout);
  }, [quote, onExpire]);

  if (!quote) return null;

  return (
    <div
      className="alienado-quote-overlay"
      style={{ left: `${quote.x}px`, top: `${Math.max(12, quote.y - 12)}px` }}
    >
      <div className="alienado-speech-bubble">
        <div className="alienado-bubble-tag">⭐ ALIENADOS DO MITO</div>
        <div className="alienado-bubble-text">{quote.text}</div>
      </div>
    </div>
  );
}
