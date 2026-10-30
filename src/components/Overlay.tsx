import type { ReactNode } from 'react';

type OverlayProps = {
  children: ReactNode;
};

export function Overlay({ children }: OverlayProps) {
  return <section className="overlay">{children}</section>;
}
