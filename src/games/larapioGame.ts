import type { GameModule, GameResult } from '../types';

import alienadaUrl from '../assets/alienada-lulete.png';
import alienadoUrl from '../assets/alienado-lulete.png';
import dinheiroUrl from '../assets/dinheiro-lulete.png';
import discursoUrl from '../assets/discurso-lulete.png';
import escudoUrl from '../assets/escuto-lulete.png';
import justicaUrl from '../assets/justica-lulete.png';
import laranjaUrl from '../assets/laranja_-_lulete.png';
import luleteUrl from '../assets/lulete.png';
import maloteUrl from '../assets/malote-lulete.png';
import policiaUrl from '../assets/policia-lulete.png';

/* ============================================================
   LARÁPIO — FUGA DO lulete (com ícones oficiais e Alienados)
   ============================================================ */

type EndGame = (result: GameResult) => void;

function loadSprite(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

const sprites = {
  alienada: loadSprite(alienadaUrl),
  alienado: loadSprite(alienadoUrl),
  dinheiro: loadSprite(dinheiroUrl),
  discurso: loadSprite(discursoUrl),
  escudo: loadSprite(escudoUrl),
  justica: loadSprite(justicaUrl),
  laranja: loadSprite(laranjaUrl),
  lulete: loadSprite(luleteUrl),
  malote: loadSprite(maloteUrl),
  policia: loadSprite(policiaUrl),
};

/* ---- Enemy types ---- */
interface Enemy {
  x: number; y: number; r: number; speed: number;
  emoji: string; color: string; name: string;
  pushX: number; pushY: number; stunTimer: number;
  isPolice?: boolean;
}

const ENEMY_TYPES = [
  { emoji: '🚔', color: '#ff3333', r: 16, speed: 70,  name: 'a PF', isPolice: true },
  { emoji: '📋', color: '#ff6600', r: 15, speed: 60,  name: 'a CPI', isPolice: false },
  { emoji: '⚖️', color: '#cc33ff', r: 15, speed: 65,  name: 'o MP', isPolice: false },
  { emoji: '📰', color: '#33ccff', r: 13, speed: 90,  name: 'um jornalista', isPolice: false },
  { emoji: '🏛️', color: '#ff0066', r: 16, speed: 55,  name: 'o STF', isPolice: false },
  { emoji: '🔍', color: '#ffcc00', r: 14, speed: 75,  name: 'o TCU', isPolice: false },
  { emoji: '🕵️', color: '#00cc66', r: 15, speed: 80,  name: 'a CGU', isPolice: false },
];

/* ---- Power-up definitions ---- */
const POWER_DEFS = {
  foro:       { emoji: '🛡️', label: 'FORO PRIVILEGIADO',  color: '#00ffff', duration: 5 },
  discurso:   { emoji: '📢', label: 'DISCURSO EMOCIONADO', color: '#ff6600', duration: 0 },
  iman:       { emoji: '🧲', label: 'IMÃ DE GRANA',        color: '#00ff88', duration: 8 },
  ministerio: { emoji: '🏃', label: '+1 MINISTÉRIO',       color: '#ffff00', duration: 6 },
  laranja:    { emoji: '🍊', label: 'LARANJA NOVO',        color: '#ffa500', duration: 7 },
} as const;
type PowerKind = keyof typeof POWER_DEFS;
const POWER_KEYS = Object.keys(POWER_DEFS) as PowerKind[];

/* ---- Loot type ---- */
interface Loot {
  x: number; y: number; val: number; vy: number;
  landed: boolean; pulse: number;
  type: 'malote' | 'mala' | 'cofre';
  magnetized: boolean; age: number;
}

/* ---- Power on-screen ---- */
interface Power {
  x: number; y: number; kind: PowerKind;
  timer: number; pulse: number;
}

/* ---- Particle ---- */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string;
  size: number; text?: string;
}

/* ---- Shockwave ring ---- */
interface Ring { x: number; y: number; radius: number; hit: Set<Enemy>; }

/* ---- Malote tier helper ---- */
function getMaloteInfo(m: number) {
  if (m < 50) {
    return {
      tier: 'MALOTE DE FEIRA',
      fill: m / 50,
      color: '#00ff88',
      level: 1,
    };
  } else if (m < 150) {
    return {
      tier: 'PASTA RECHEADA',
      fill: (m - 50) / 100,
      color: '#4ecdc4',
      level: 2,
    };
  } else if (m < 400) {
    return {
      tier: 'MALA DE RODINHA',
      fill: (m - 150) / 250,
      color: '#ffd166',
      level: 3,
    };
  } else if (m < 1000) {
    return {
      tier: 'COFRE CLANDESTINO',
      fill: (m - 400) / 600,
      color: '#ff9f43',
      level: 4,
    };
  } else {
    return {
      tier: 'BÚNQUER SUÍÇO',
      fill: Math.min(1, (m - 1000) / 1000),
      color: '#ff6b6b',
      level: 5,
    };
  }
}

export function createLarapioGame(
  canvas: HTMLCanvasElement,
  keys: Set<string>,
  onEnd: EndGame,
): GameModule {
  const ctx = canvas.getContext('2d')!;

  /* -- state -- */
  let animation = 0;
  let running = false;
  let last = 0;
  let elapsed = 0;
  let money = 0;
  let displayedMoney = 0;
  let maloteJiggle = 1.0;
  let combo = 0;
  let comboTimer = 0;
  let difficultyLevel = 1;
  let screenShake = 0;
  let flashColor = '';
  let flashTimer = 0;

  let player = { x: 0, y: 0, bobTimer: 0, angle: 0 };
  const P_RADIUS = 22;
  const P_BASE_SPEED = 230;

  let enemies: Enemy[] = [];
  let loots: Loot[] = [];
  let powers: Power[] = [];
  let particles: Particle[] = [];
  let rings: Ring[] = [];
  let trail: { x: number; y: number; alpha: number }[] = [];

  let activeEffects: Record<'foro' | 'iman' | 'ministerio' | 'laranja', number> = {
    foro: 0, iman: 0, ministerio: 0, laranja: 0,
  };
  let effectLabel = '';
  let decoy = { x: 0, y: 0, alive: false };

  /* -- touch joystick -- */
  let joystickOrigin: { x: number; y: number } | null = null;
  let joystickPoint: { x: number; y: number } | null = null;

  /* -- background decorations -- */
  let stars: { x: number; y: number; s: number; b: number }[] = [];
  let buildings: { x: number; w: number; h: number; color: string }[] = [];

  const score = () => Math.floor(money + elapsed * 2);

  /* ---- helpers ---- */
  function emitParticles(x: number, y: number, color: string, count: number, speed = 3, size = 4) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed + 1;
      particles.push({
        x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 30 + Math.random() * 30, maxLife: 60, color,
        size: Math.random() * size + 2,
      });
    }
  }

  function emitText(x: number, y: number, text: string, color: string) {
    particles.push({
      x, y, vx: 0, vy: -1.5, life: 55, maxLife: 55,
      color, size: 0, text,
    });
  }

  function spawnLoot() {
    const roll = Math.random();
    const type: Loot['type'] = roll < 0.08 ? 'cofre' : roll < 0.30 ? 'mala' : 'malote';
    const val = type === 'cofre' ? 100 + Math.floor(Math.random() * 100)
              : type === 'mala'  ? 30  + Math.floor(Math.random() * 50)
              : 5 + Math.floor(Math.random() * 15);
    loots.push({
      x: 40 + Math.random() * (canvas.width - 80),
      y: -20, val, vy: 180 + Math.random() * 120,
      landed: false, pulse: Math.random() * 6, type,
      magnetized: false, age: 0,
    });
  }

  function spawnEnemy() {
    const W = canvas.width, H = canvas.height;
    const available = elapsed > 40 ? ENEMY_TYPES
                    : elapsed > 20 ? ENEMY_TYPES.slice(0, 5)
                    : ENEMY_TYPES.slice(0, 3);
    const t = available[Math.floor(Math.random() * available.length)];
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if      (side === 0) { x = Math.random() * W; y = -30; }
    else if (side === 1) { x = W + 30; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = H + 30; }
    else                 { x = -30; y = Math.random() * H; }

    enemies.push({
      ...t,
      x, y,
      speed: t.speed * Math.min(2.2, 1 + elapsed / 80),
      pushX: 0, pushY: 0, stunTimer: 0,
    });
  }

  function spawnPower() {
    const kind = POWER_KEYS[Math.floor(Math.random() * POWER_KEYS.length)];
    powers.push({
      x: 60 + Math.random() * (canvas.width - 120),
      y: 60 + Math.random() * (canvas.height - 120),
      kind, timer: 10, pulse: 0,
    });
  }

  function activatePower(kind: PowerKind) {
    const def = POWER_DEFS[kind];
    effectLabel = def.label;
    flashTimer = 18;
    flashColor = kind === 'foro' ? 'rgba(0,255,255,0.12)' :
                 kind === 'discurso' ? 'rgba(255,100,0,0.18)' :
                 kind === 'iman' ? 'rgba(0,255,100,0.12)' :
                 kind === 'ministerio' ? 'rgba(255,255,0,0.12)' :
                 'rgba(255,165,0,0.15)';

    if (kind === 'discurso') {
      screenShake = 12;
      rings.push({ x: player.x, y: player.y, radius: 0, hit: new Set() });
      emitParticles(player.x, player.y, '#ff6600', 30, 8, 6);
      emitText(player.x, player.y - 40, '💥 FORA TODOS!!!', '#ff6600');
    } else {
      activeEffects[kind as Exclude<PowerKind, 'discurso'>] = def.duration;
    }

    if (kind === 'laranja') {
      decoy.x = player.x + (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 180);
      decoy.y = player.y + (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 180);
      decoy.x = Math.max(30, Math.min(canvas.width - 30, decoy.x));
      decoy.y = Math.max(30, Math.min(canvas.height - 30, decoy.y));
      decoy.alive = true;
      emitParticles(decoy.x, decoy.y, '#ffa500', 15, 4);
    }

    if (kind === 'foro') emitParticles(player.x, player.y, '#00ffff', 20, 4);
    if (kind === 'ministerio') emitParticles(player.x, player.y, '#ffff00', 15, 5);
    if (kind === 'iman') emitParticles(player.x, player.y, '#00ff88', 18, 5);
  }

  function initBackground() {
    const W = canvas.width, H = canvas.height;
    stars = [];
    buildings = [];
    for (let i = 0; i < 80; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.55, s: Math.random() * 2 + 0.5, b: Math.random() * 10 });
    }
    for (let x = 0; x < W; x += 35 + Math.random() * 55) {
      buildings.push({
        x, w: 28 + Math.random() * 48,
        h: 50 + Math.random() * 130,
        color: `hsl(220, ${10 + Math.random() * 20}%, ${8 + Math.random() * 12}%)`,
      });
    }
  }

  /* ---- update ---- */
  function update(dt: number) {
    elapsed += dt;
    const W = canvas.width, H = canvas.height;
    const scale = Math.max(0.75, Math.min(W, H) / 560);
    difficultyLevel = 1 + Math.floor(elapsed / 10);

    displayedMoney += (money - displayedMoney) * Math.min(1, dt * 10);
    if (maloteJiggle > 1) maloteJiggle = Math.max(1, maloteJiggle - dt * 2.2);

    // Player movement
    let dx = 0, dy = 0;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    if (keys.has('ArrowLeft')  || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowDown')  || keys.has('KeyS')) dy += 1;
    if (keys.has('ArrowUp')    || keys.has('KeyW')) dy -= 1;

    // Touch joystick
    if (joystickOrigin && joystickPoint) {
      const jx = joystickPoint.x - joystickOrigin.x;
      const jy = joystickPoint.y - joystickOrigin.y;
      const jd = Math.hypot(jx, jy);
      if (jd > 8) {
        dx = (jx / jd) * Math.min(jd, 60) / 60;
        dy = (jy / jd) * Math.min(jd, 60) / 60;
      }
    }

    const mag = Math.hypot(dx, dy) || 1;
    const spd = P_BASE_SPEED * scale * (activeEffects.ministerio > 0 ? 1.8 : 1);
    player.x = Math.max(P_RADIUS, Math.min(W - P_RADIUS, player.x + (dx / mag) * spd * dt));
    player.y = Math.max(P_RADIUS, Math.min(H - P_RADIUS, player.y + (dy / mag) * spd * dt));

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      player.bobTimer += dt * 12;
      player.angle = Math.sin(player.bobTimer) * 0.08;
      trail.push({ x: player.x, y: player.y, alpha: 0.45 });
      if (trail.length > 12) trail.shift();
    }
    trail.forEach(t => { t.alpha -= dt * 3; });
    trail = trail.filter(t => t.alpha > 0);

    for (const k of Object.keys(activeEffects) as Array<keyof typeof activeEffects>) {
      if (activeEffects[k] > 0) activeEffects[k] = Math.max(0, activeEffects[k] - dt);
    }
    if (activeEffects.laranja <= 0) decoy.alive = false;

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
    }

    // Spawning
    if (Math.random() < dt * Math.min(3, 1.2 + elapsed / 60)) spawnLoot();
    if (Math.random() < dt * Math.min(3, 0.5 + elapsed / 20)) {
      spawnEnemy();
      if (difficultyLevel >= 5 && Math.random() < 0.35) spawnEnemy();
      if (difficultyLevel >= 8 && Math.random() < 0.25) spawnEnemy();
    }
    if (Math.random() < dt / 9) spawnPower();

    // Loot update
    loots = loots.filter(l => {
      l.age += dt;
      if (!l.landed) {
        l.y += l.vy * dt;
        if (l.y >= H - 30) { l.y = H - 30; l.landed = true; }
      }
      if (l.magnetized || activeEffects.iman > 0) {
        const ldx = player.x - l.x, ldy = player.y - l.y;
        const ld = Math.hypot(ldx, ldy) || 1;
        l.x += (ldx / ld) * 440 * dt;
        l.y += (ldy / ld) * 440 * dt;
      }
      l.pulse += dt * 3;

      if (Math.hypot(l.x - player.x, l.y - player.y) < P_RADIUS + 18) {
        combo++;
        comboTimer = 1.5;
        const multiplier = Math.min(combo, 10);
        const earned = l.val * multiplier;
        money += earned;
        maloteJiggle = 1.35;
        emitParticles(l.x, l.y, '#00ff88', 8, 3, 3);
        const comboText = multiplier > 1 ? ` x${multiplier}` : '';
        emitText(l.x, l.y - 20, `+R\$${earned}${comboText}`, '#00ff88');
        return false;
      }
      return l.age < 14;
    });

    // Power-up update
    powers = powers.filter(p => {
      p.timer -= dt;
      p.pulse += dt * 5;
      if (p.timer <= 0) return false;
      if (Math.hypot(p.x - player.x, p.y - player.y) < P_RADIUS + 22) {
        const def = POWER_DEFS[p.kind];
        activatePower(p.kind);
        emitText(p.x, p.y - 30, def.emoji + ' ' + def.label, '#ffff00');
        return false;
      }
      return true;
    });

    // Shockwave rings
    rings = rings.filter(ring => {
      ring.radius += 650 * dt;
      for (const e of enemies) {
        const dist = Math.hypot(e.x - ring.x, e.y - ring.y) || 1;
        if (!ring.hit.has(e) && Math.abs(dist - ring.radius) < 50) {
          ring.hit.add(e);
          e.pushX += (e.x - ring.x) / dist * 900;
          e.pushY += (e.y - ring.y) / dist * 900;
          e.stunTimer = 1;
        }
      }
      return ring.radius < 450;
    });

    // Enemies update
    for (const e of enemies) {
      if (e.stunTimer > 0) { e.stunTimer -= dt; continue; }

      let tx = player.x, ty = player.y;
      if (activeEffects.laranja > 0 && decoy.alive) {
        tx = decoy.x; ty = decoy.y;
      }
      const edx = tx - e.x, edy = ty - e.y;
      const ed = Math.hypot(edx, edy) || 1;
      e.x += (edx / ed * e.speed * scale + e.pushX) * dt;
      e.y += (edy / ed * e.speed * scale + e.pushY) * dt;
      const decay = Math.pow(0.03, dt);
      e.pushX *= decay;
      e.pushY *= decay;

      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < P_RADIUS + e.r) {
        if (activeEffects.foro > 0) {
          e.pushX -= edx / ed * 500;
          e.pushY -= edy / ed * 500;
          emitParticles(e.x, e.y, '#00ffff', 4, 2, 2);
        } else {
          running = false;
          screenShake = 18;
          emitParticles(player.x, player.y, '#ff0000', 40, 6, 5);

          const s = score();
          const phrases = s < 100
            ? [
                'Nem o cafezinho do gabinete deu pra pagar.',
                'Rendeu uma pizza... de calabresa, sem borda recheada.',
                'Nem triplex nem sítio: foi direto pro camburão!',
              ]
            : s < 300
            ? [
                'Dá pra comprar um pedalinho em nome de um parente distante.',
                'Começo modesto: uma consultoria de fachada que faliu.',
                'O doleiro jurou de pés juntos que nunca te viu na vida.',
              ]
            : s < 600
            ? [
                'Já dá pra abrir uma fundação cultural com plateia imaginária!',
                'Até o auditor da Receita pediu seu cartão de visita.',
                'Seus advogados já entraram com 47 pedidos de habeas corpus.',
              ]
            : s < 1200
            ? [
                'Um iate já estava no carrinho de compras!',
                'Patrimônio oficialmente incompatível com a renda declarada.',
                'A coletiva de imprensa começou e você é o assunto principal.',
              ]
            : s < 2500
            ? [
                'Nível senador! Desviou mais que emenda secreta de relator.',
                'O cofre do BNDES sentiu falta dessa remessa.',
                'A contabilidade criativa impressionou até o Ministério Público.',
              ]
            : [
                '🏆 LENDA DO PLANALTO! Até a CPI pediu autógrafo.',
                'Isso sim é um ministério de um homem só!',
                'Conseguiu desviar mais que o orçamento da União inteira!',
              ];

          const chosenPhrase = phrases[Math.floor(Math.random() * phrases.length)];
          const stampText = Math.random() < 0.5 ? 'CONDUÇÃO COERCITIVA' : 'FLAGRANTE';

          onEnd({
            title: '🚨 PEGO NO FLAGRA!',
            stamp: stampText,
            stats: {
              money,
              time: Math.floor(elapsed),
              level: difficultyLevel,
              score: s,
              caughtBy: e.name,
            },
            quote: chosenPhrase,
            message: `Você foi alcançado por ${e.name}.\n\nR$ ${money} mi · ${Math.floor(elapsed)}s · Nível ${difficultyLevel}\nPONTOS: ${s}\n\n${chosenPhrase}`,
            actionLabel: '↻ TENTAR DE NOVO',
          });
          return;
        }
      }
    }

    enemies = enemies.filter(e =>
      e.x > -100 && e.x < W + 100 && e.y > -100 && e.y < H + 100
    );

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i], b = enemies[j];
        const cdx = b.x - a.x, cdy = b.y - a.y;
        const cd = Math.hypot(cdx, cdy) || 1;
        const minDist = (a.r + b.r) * 0.8;
        if (cd < minDist) {
          const push = (minDist - cd) / 2 / cd;
          a.x -= cdx * push; a.y -= cdy * push;
          b.x += cdx * push; b.y += cdy * push;
        }
      }
    }

    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      return p.life > 0;
    });

    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 20);
    if (flashTimer > 0) flashTimer = Math.max(0, flashTimer - dt * 30);
  }

  /* ---- draw ---- */
  function draw() {
    const W = canvas.width, H = canvas.height;

    ctx.save();

    if (screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * screenShake * 1.5,
        (Math.random() - 0.5) * screenShake * 1.5,
      );
    }

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#080818');
    bgGrad.addColorStop(0.5, '#0c0f22');
    bgGrad.addColorStop(1, '#15102a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      const twinkle = 0.4 + Math.sin(elapsed * 2 + s.b) * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
      ctx.fill();
    });

    buildings.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, H - b.h, b.w, b.h);
      ctx.fillStyle = `rgba(255,200,50,${0.2 + Math.sin(elapsed * 0.5 + b.x * 0.01) * 0.15})`;
      for (let wy = H - b.h + 8; wy < H - 8; wy += 14) {
        for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 10) {
          ctx.fillRect(wx, wy, 4, 6);
        }
      }
    });

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, H - 16, W, 16);
    ctx.fillStyle = '#2a2a4e';
    ctx.fillRect(0, H - 16, W, 2);

    // ---- Loot (com ícones dinheiro e malote) ----
    loots.forEach(l => {
      const pScale = 1 + Math.sin(l.pulse) * 0.08;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.scale(pScale, pScale);

      if (l.type === 'malote') {
        // Maço de dinheiro
        if (sprites.dinheiro.complete && sprites.dinheiro.naturalWidth > 0) {
          const w = 24;
          const h = 32;
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 12;
          ctx.drawImage(sprites.dinheiro, -w / 2, -h / 2, w, h);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#00ee66';
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Malote / Mala / Cofre de dinheiro
        if (sprites.malote.complete && sprites.malote.naturalWidth > 0) {
          const isCofre = l.type === 'cofre';
          const w = isCofre ? 34 : 26;
          const h = isCofre ? 44 : 34;
          ctx.shadowColor = isCofre ? '#ffd166' : '#00ff88';
          ctx.shadowBlur = isCofre ? 18 : 12;
          ctx.drawImage(sprites.malote, -w / 2, -h / 2, w, h);
          ctx.shadowBlur = 0;

          if (isCofre) {
            ctx.font = 'bold 8px "Press Start 2P", monospace';
            ctx.fillStyle = '#ffd166';
            ctx.textAlign = 'center';
            ctx.fillText('$$$', 0, -h / 2 - 4);
          }
        } else {
          ctx.fillStyle = l.type === 'cofre' ? '#ffcc00' : '#33cc66';
          ctx.fillRect(-12, -10, 24, 20);
        }
      }

      ctx.restore();
    });

    // ---- Power-ups (com ícones escudo, discurso, laranja, malote) ----
    powers.forEach(p => {
      const glow = 0.4 + Math.sin(p.pulse) * 0.3;
      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.strokeStyle = `rgba(255,255,0,${glow})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(p.pulse) * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(255,255,0,0.15)`;
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.fill();

      // Desenho do ícone correspondente
      const iconSize = 30;
      if (p.kind === 'foro' && sprites.escudo.complete && sprites.escudo.naturalWidth > 0) {
        ctx.drawImage(sprites.escudo, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      } else if (p.kind === 'discurso' && sprites.discurso.complete && sprites.discurso.naturalWidth > 0) {
        ctx.drawImage(sprites.discurso, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      } else if (p.kind === 'laranja' && sprites.laranja.complete && sprites.laranja.naturalWidth > 0) {
        ctx.drawImage(sprites.laranja, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      } else if (p.kind === 'iman' && sprites.malote.complete && sprites.malote.naturalWidth > 0) {
        ctx.drawImage(sprites.malote, -iconSize / 2, -iconSize / 2, iconSize, iconSize * 1.25);
      } else {
        ctx.font = '22px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWER_DEFS[p.kind].emoji, 0, 1);
      }

      const barW = 30;
      const fill = (p.timer / 10) * barW;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-barW / 2, 26, barW, 4);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(-barW / 2, 26, fill, 4);

      ctx.restore();
    });

    // ---- Decoy (Laranja Novo com sprite oficial) ----
    if (decoy.alive) {
      ctx.save();
      ctx.translate(decoy.x, decoy.y);
      ctx.shadowColor = '#ffa500';
      ctx.shadowBlur = 18;

      if (sprites.laranja.complete && sprites.laranja.naturalWidth > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(sprites.laranja, -22, -22, 44, 44);
      } else {
        ctx.fillStyle = '#ffa500';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍊', 0, 0);
      }

      ctx.shadowBlur = 0;
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffa500';
      ctx.textAlign = 'center';
      ctx.fillText('LARANJA', 0, -28);
      ctx.restore();
    }

    // ---- Shockwave rings ----
    rings.forEach(ring => {
      ctx.globalAlpha = Math.max(0, 1 - ring.radius / 450);
      ctx.strokeStyle = '#ff9966';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // ---- Enemies (com sprites oficiais de Polícia e Justiça) ----
    enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.stunTimer > 0) ctx.globalAlpha = 0.4 + Math.sin(elapsed * 15) * 0.3;

      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;

      // Círculo com borda colorida e sprite
      ctx.fillStyle = '#0f121d';
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const spriteToUse = e.isPolice ? sprites.policia : sprites.justica;

      if (spriteToUse.complete && spriteToUse.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(spriteToUse, -e.r, -e.r, e.r * 2, e.r * 2);
        ctx.restore();
      } else {
        ctx.font = `${e.r + 2}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.emoji, 0, 0);
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(e.name.replace(/^(um |a |o )/, '').toUpperCase(), 0, -e.r - 4);

      ctx.globalAlpha = 1;
      ctx.restore();
    });

    // ---- Player trail ----
    trail.forEach(t => {
      const c = activeEffects.foro > 0 ? `rgba(0,255,255,${t.alpha * 0.3})`
              : activeEffects.ministerio > 0 ? `rgba(255,255,0,${t.alpha * 0.3})`
              : `rgba(255,200,50,${t.alpha * 0.2})`;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(t.x, t.y, P_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // ---- Player (lulete com sprite oficial) ----
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    if (activeEffects.foro > 0) {
      ctx.strokeStyle = `rgba(0,255,255,${0.35 + Math.sin(elapsed * 6) * 0.25})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, P_RADIUS + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(0,255,255,${0.15 + Math.sin(elapsed * 8) * 0.15})`;
      ctx.beginPath(); ctx.arc(0, 0, P_RADIUS + 14, 0, Math.PI * 2); ctx.stroke();
    }
    if (activeEffects.ministerio > 0) {
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(255,255,0,${0.2 + Math.random() * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-P_RADIUS - 10 - Math.random() * 15, -P_RADIUS + Math.random() * P_RADIUS * 2);
        ctx.lineTo(-P_RADIUS - 25 - Math.random() * 15, -P_RADIUS + Math.random() * P_RADIUS * 2);
        ctx.stroke();
      }
    }

    if (sprites.lulete.complete && sprites.lulete.naturalWidth > 0) {
      ctx.shadowColor = activeEffects.foro > 0 ? '#00ffff' : '#ffcc00';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, P_RADIUS, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sprites.lulete, -P_RADIUS, -P_RADIUS, P_RADIUS * 2, P_RADIUS * 2);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = activeEffects.foro > 0 ? '#0ff' : '#ffd166';
      ctx.beginPath(); ctx.arc(0, 0, P_RADIUS, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // ---- Particles ----
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      if (p.text) {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    // Flash overlay
    if (flashTimer > 0) {
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
    }

    // ---- HUD DE PONTUAÇÃO (BANCO + MALOTE OFICIAL) ----
    drawBankAndMaloteHUD(W, H);

    // ---- HUD SUPERIOR DIREITO ----
    drawTopRightHUD(W);

    // Power-up duration indicators
    let effectY = 96;
    if (combo > 1) effectY += 28;
    for (const k of Object.keys(activeEffects) as Array<keyof typeof activeEffects>) {
      if (activeEffects[k] <= 0) continue;
      const def = POWER_DEFS[k];
      const barW = 140;
      const fill = (activeEffects[k] / def.duration) * barW;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, 10, effectY, barW + 16, 22, 6);
      ctx.fill();

      ctx.fillStyle = '#222';
      ctx.fillRect(18, effectY + 13, barW, 6);
      ctx.fillStyle = def.color;
      ctx.fillRect(18, effectY + 13, fill, 6);

      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(def.label, 18, effectY + 3);

      effectY += 26;
    }

    // Controls hint (first 4s)
    if (elapsed < 4) {
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 4);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      roundRect(ctx, W / 2 - 130, H - 60, 260, 44, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WASD ou SETAS pra mover', W / 2, H - 46);
      ctx.fillText('Pegue grana, fuja da justiça!', W / 2, H - 30);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Minimap
    drawMinimap(W, H);

    // Touch joystick
    if (joystickOrigin && joystickPoint) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(joystickOrigin.x, joystickOrigin.y, 55, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(joystickPoint.x, joystickPoint.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /* ---- HUD: Painel de Banco + Malote com ícone oficial ---- */
  function drawBankAndMaloteHUD(W: number, H: number) {
    const info = getMaloteInfo(money);
    const panelX = 10;
    const panelY = 8;
    const panelW = Math.min(270, Math.max(220, W * 0.58));
    const panelH = 78;

    ctx.save();

    // Chassis Metálico
    const metalGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    metalGrad.addColorStop(0, '#15202b');
    metalGrad.addColorStop(0.5, '#0e1620');
    metalGrad.addColorStop(1, '#080d14');
    ctx.fillStyle = metalGrad;
    ctx.strokeStyle = '#273b4f';
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    // Rebites
    ctx.fillStyle = '#486581';
    ctx.fillRect(panelX + 4, panelY + 4, 3, 3);
    ctx.fillRect(panelX + panelW - 7, panelY + 4, 3, 3);
    ctx.fillRect(panelX + 4, panelY + panelH - 7, 3, 3);
    ctx.fillRect(panelX + panelW - 7, panelY + panelH - 7, 3, 3);

    // Faixa Superior
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    roundRect(ctx, panelX + 3, panelY + 3, panelW - 6, 14, 4);
    ctx.fill();

    const ledColor = combo > 1 ? '#ffd166' : '#00ff88';
    ctx.fillStyle = ledColor;
    ctx.shadowColor = ledColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(panelX + 12, panelY + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = '6.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#81e6d9';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('AGÊNCIA 171 · COFRE SUÍÇO', panelX + 20, panelY + 10);

    // Display Digital ATM
    const screenX = panelX + 7;
    const screenY = panelY + 19;
    const screenW = panelW - 14;
    const screenH = 24;

    ctx.fillStyle = '#030f07';
    ctx.strokeStyle = '#0d2b15';
    ctx.lineWidth = 1;
    roundRect(ctx, screenX, screenY, screenW, screenH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
    for (let sl = screenY + 2; sl < screenY + screenH; sl += 3) {
      ctx.fillRect(screenX, sl, screenW, 1);
    }

    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00ff66';
    const numFontSize = screenW < 220 ? 9.5 : 11;
    ctx.font = `bold ${numFontSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const moneyFormatted = Math.floor(displayedMoney).toLocaleString('pt-BR');
    ctx.fillText(`R$ ${moneyFormatted} mi`, screenX + 6, screenY + screenH / 2 + 1);
    ctx.shadowBlur = 0;

    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(0, 255, 100, 0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('DESVIADO', screenX + screenW - 4, screenY + 8);
    ctx.textAlign = 'left';

    // Malote Oficial + Barra de Capacidade
    const maloteAreaX = panelX + 8;
    const maloteAreaY = panelY + 46;
    const maloteCenterX = maloteAreaX + 14;
    const maloteCenterY = maloteAreaY + 13;

    ctx.save();
    ctx.translate(maloteCenterX, maloteCenterY);
    if (maloteJiggle > 1) {
      const wobble = Math.sin(elapsed * 25) * 0.12 * (maloteJiggle - 1);
      ctx.rotate(wobble);
      ctx.scale(maloteJiggle, maloteJiggle);
    }

    if (sprites.malote.complete && sprites.malote.naturalWidth > 0) {
      ctx.drawImage(sprites.malote, -12, -14, 24, 28);
    } else {
      ctx.fillStyle = '#8b5a2b';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Barra de LED
    const barX = maloteAreaX + 32;
    const barY = maloteAreaY + 12;
    const barW = panelW - 50;
    const barH = 10;
    const totalSegments = 8;
    const filledSegments = Math.round(info.fill * totalSegments);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#cbd5e0';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.tier, barX, maloteAreaY + 4);

    ctx.textAlign = 'right';
    ctx.fillStyle = info.color;
    ctx.fillText(`${Math.round(info.fill * 100)}%`, barX + barW, maloteAreaY + 4);
    ctx.textAlign = 'left';

    const gap = 2;
    const segW = (barW - (totalSegments - 1) * gap) / totalSegments;

    for (let s = 0; s < totalSegments; s++) {
      const sx = barX + s * (segW + gap);
      if (s < filledSegments) {
        ctx.fillStyle = info.color;
        ctx.shadowColor = info.color;
        ctx.shadowBlur = s === filledSegments - 1 ? 5 : 0;
        ctx.fillRect(sx, barY, segW, barH);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#0a160d';
        ctx.fillRect(sx, barY, segW, barH);
      }
    }

    ctx.restore();

    // Faixa de Combo
    if (combo > 1) {
      ctx.save();
      const comboX = panelX;
      const comboY = panelY + panelH + 5;

      ctx.fillStyle = 'rgba(255, 209, 102, 0.18)';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.5;
      roundRect(ctx, comboX, comboY, 175, 20, 5);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 7px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚡ COMBO x${combo}! (TURBO)`, comboX + 8, comboY + 10);
      ctx.restore();
    }
  }

  /* ---- HUD Superior Direito ---- */
  function drawTopRightHUD(W: number) {
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

    const trW = 135;
    const trH = 52;
    const trX = W - trW - 10;
    const trY = 8;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 26, 0.8)';
    ctx.strokeStyle = '#273b4f';
    ctx.lineWidth = 1.5;
    roundRect(ctx, trX, trY, trW, trH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⏱ ${timeStr}`, trX + trW - 8, trY + 14);

    ctx.fillStyle = '#ffd166';
    ctx.fillText(`PTS ${score()}`, trX + trW - 8, trY + 28);

    ctx.fillStyle = '#81e6d9';
    ctx.fillText(`NÍVEL ${difficultyLevel}`, trX + trW - 8, trY + 41);

    if (enemies.length >= 8) {
      const blink = Math.sin(elapsed * 12) > 0;
      if (blink) {
        ctx.fillStyle = 'rgba(230, 57, 70, 0.95)';
        roundRect(ctx, trX - 116, trY, 108, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 6.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🚨 CERCO! (${enemies.length})`, trX - 62, trY + 12);
      }
    }

    ctx.restore();
  }

  function drawMinimap(W: number, H: number) {
    const mmW = 100, mmH = 75;
    const mmX = W - mmW - 12, mmY = H - mmH - 12;
    const sx = mmW / W, sy = mmH / H;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, mmX - 2, mmY - 2, mmW + 4, mmH + 4, 5);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ff3333';
    enemies.forEach(e => ctx.fillRect(mmX + e.x * sx - 1, mmY + e.y * sy - 1, 3, 3));

    ctx.fillStyle = '#00ff88';
    loots.forEach(l => ctx.fillRect(mmX + l.x * sx, mmY + l.y * sy, 2, 2));

    ctx.fillStyle = '#ffff00';
    powers.forEach(p => ctx.fillRect(mmX + p.x * sx - 1, mmY + p.y * sy - 1, 4, 4));

    ctx.fillStyle = '#00ffff';
    ctx.fillRect(mmX + player.x * sx - 2, mmY + player.y * sy - 2, 5, 5);

    if (decoy.alive) {
      ctx.fillStyle = '#ffa500';
      ctx.fillRect(mmX + decoy.x * sx - 1, mmY + decoy.y * sy - 1, 4, 4);
    }
  }

  function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  /* ---- game loop ---- */
  function loop(now: number) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw();
    if (running) animation = requestAnimationFrame(loop);
  }

  /* ---- touch ---- */
  function position(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * canvas.width / rect.width,
      y: (e.clientY - rect.top) * canvas.height / rect.height,
    };
  }
  const pointerDown = (e: PointerEvent) => {
    if (!running) return;
    joystickOrigin = position(e);
    joystickPoint = joystickOrigin;
    canvas.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: PointerEvent) => {
    if (running && joystickOrigin) joystickPoint = position(e);
  };
  const pointerUp = () => { joystickOrigin = null; joystickPoint = null; };

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);

  /* ---- Nova função: Aporte / Doação dos Alienados ---- */
  const spawnAlienadoDonation = (side: 'left' | 'right' | 'bottom-left' | 'bottom-right') => {
    if (!running) return;
    const W = canvas.width, H = canvas.height;
    let x = 40;
    let y = H / 2;

    if (side === 'left') {
      x = 45;
      y = Math.random() * (H * 0.5) + H * 0.25;
    } else if (side === 'right') {
      x = W - 45;
      y = Math.random() * (H * 0.5) + H * 0.25;
    } else if (side === 'bottom-left') {
      x = 80;
      y = H - 45;
    } else {
      x = W - 80;
      y = H - 45;
    }

    // Arremessa malotes com alta recompensa voando em arco
    for (let i = 0; i < 2; i++) {
      loots.push({
        x: x + (Math.random() - 0.5) * 50,
        y: y,
        val: 35 + difficultyLevel * 10,
        vy: -150 - Math.random() * 80,
        landed: false,
        pulse: 0,
        type: 'cofre',
        magnetized: true,
        age: 0,
      });
    }

    // Atordoa e afasta inimigos próximos à militância
    enemies.forEach(e => {
      const dist = Math.hypot(e.x - x, e.y - y);
      if (dist < 240) {
        e.stunTimer = 2.5;
        const edx = e.x - x, edy = e.y - y;
        const d = Math.hypot(edx, edy) || 1;
        e.pushX += (edx / d) * 550;
        e.pushY += (edy / d) * 550;
      }
    });

    emitParticles(x, y, '#ff2a42', 20, 6, 5);
    emitText(x, y - 25, '⭐ MILITÂNCIA CHEGOU!', '#ffd166');
    emitText(x, y - 45, '🚩 "FAZ O L QUE PASSA!"', '#ff6b6b');
  };

  /* ---- public API ---- */
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initBackground();
    player.x = Math.max(P_RADIUS, Math.min(canvas.width - P_RADIUS, player.x));
    player.y = Math.max(P_RADIUS, Math.min(canvas.height - P_RADIUS, player.y));
  };

  window.addEventListener('resize', resize);

  const start = () => {
    resize();
    elapsed = 0;
    money = 0;
    displayedMoney = 0;
    maloteJiggle = 1.0;
    combo = 0;
    comboTimer = 0;
    difficultyLevel = 1;
    screenShake = 0;
    flashTimer = 0;
    enemies = [];
    loots = [];
    powers = [];
    particles = [];
    rings = [];
    trail = [];
    activeEffects = { foro: 0, iman: 0, ministerio: 0, laranja: 0 };
    decoy = { x: 0, y: 0, alive: false };
    player = { x: canvas.width / 2, y: canvas.height / 2, bobTimer: 0, angle: 0 };
    running = true;
    last = performance.now();
    animation = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(animation);
  };

  const destroy = () => {
    running = false;
    cancelAnimationFrame(animation);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerUp);
  };

  return { start, stop, destroy, spawnAlienadoDonation };
}
