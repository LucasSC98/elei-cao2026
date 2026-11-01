import type { FightCharacter, GameModule, GameResult } from '../types';
import animacaoFlavieteUrl from '../assets/animacao-flaviete.png';
import campoMouraoBackgroundUrl from '../assets/campomourao-luta.jpg';
import luleteSheetUrl from '../assets/lulete_sheet.png';
import luleteUrl from '../assets/lulete.png';
import poderFlavieteUrl from '../assets/poder-flaviete.png';

type EndGame = (result: GameResult) => void;
type Fighter = {
  name: string;
  displayName: string;
  image: HTMLImageElement;
  spriteBounds: { x: number; y: number; width: number; height: number };
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  health: number;
  ghostHealth: number;
  facing: 1 | -1;
  attackCooldown: number;
  attackTimer: number;
  specialTimer: number;
  hitTimer: number;
  moveTimer: number;
  combo: number;
  comboTimer: number;
  blocking: boolean;
  wasGrounded: boolean;
  squash: number;
  hasHit: boolean;
  controls: { left: string; right: string; jump: string; attack: string; special: string; block: string };
  animState: 'idle' | 'walk' | 'jump' | 'punch' | 'special' | 'block';
  animFrame: number;
  animTimer: number;
  ai: { decisionTimer: number; intent: 'approach' | 'retreat' | 'wait' | 'attack' | 'block'; reaction: number };
};

type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  type: 'passaporte' | 'laranja';
  ownerName: string;
  life: number;
};

type Particle = {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
  color: string; size: number; gravity?: number; stopsAtGround?: boolean;
};
type FloatText = { x: number; y: number; text: string; life: number; color: string };

// ===== Constantes de Balanceamento =====
const MOVE_SPEED = 4.6;
const BLOCK_MOVE_SPEED = 1.8;
const ATTACK_DURATION = 18;
const ATTACK_STARTUP = 6;
const ATTACK_ACTIVE = 4;
const ATTACK_COOLDOWN = 30;
const SPECIAL_DURATION = 25;
const BASE_DAMAGE = 7;
const COMBO_FINISHER_DAMAGE = 13;
const BLOCK_MULTIPLIER = 0.2;
const COMBO_WINDOW = 45;
const HITSTOP = 5;
const COUNTDOWN = 120;
const GROUND_RATIO = 0.79;

// Os quadros não ocupam células uniformes; os limites acompanham o conteúdo de cada pose.
type SpriteFrame = { x: number; y: number; w: number; h: number };
type AnimConfig = { frames: SpriteFrame[]; speed: number };
const FLAVIETE_ANIMS: Record<Fighter['animState'], AnimConfig> = {
  idle: {
    frames: [
      { x: 74, y: 16, w: 82, h: 185 },
      { x: 220, y: 16, w: 81, h: 185 },
      { x: 374, y: 16, w: 81, h: 185 },
      { x: 528, y: 16, w: 80, h: 185 },
      { x: 680, y: 16, w: 82, h: 185 },
      { x: 845, y: 17, w: 75, h: 187 },
    ],
    speed: 10,
  },
  walk: {
    frames: [
      { x: 57, y: 217, w: 96, h: 179 },
      { x: 211, y: 216, w: 84, h: 178 },
      { x: 356, y: 216, w: 97, h: 180 },
      { x: 515, y: 216, w: 86, h: 181 },
      { x: 658, y: 216, w: 103, h: 176 },
      { x: 806, y: 219, w: 93, h: 175 },
      { x: 932, y: 216, w: 95, h: 176 },
      { x: 1084, y: 216, w: 106, h: 176 },
    ],
    speed: 7,
  },
  punch: {
    frames: [
      { x: 50, y: 415, w: 109, h: 173 },
      { x: 193, y: 416, w: 111, h: 172 },
      { x: 336, y: 417, w: 146, h: 171 },
      { x: 503, y: 418, w: 127, h: 169 },
    ],
    speed: 5,
  },
  jump: {
    frames: [
      { x: 63, y: 639, w: 97, h: 124 },
      { x: 210, y: 601, w: 110, h: 156 },
      { x: 361, y: 632, w: 100, h: 130 },
    ],
    speed: 8,
  },
  block: {
    frames: [
      { x: 52, y: 790, w: 107, h: 181 },
      { x: 201, y: 787, w: 98, h: 184 },
    ],
    speed: 12,
  },
  special: {
    frames: [
      { x: 464, y: 837, w: 157, h: 172 },
      { x: 724, y: 834, w: 186, h: 175 },
      { x: 998, y: 838, w: 198, h: 171 },
    ],
    speed: 6,
  },
};

const LULETE_ANIMS: Record<Fighter['animState'], AnimConfig> = {
  idle: { frames: [
    { x: 98, y: 17, w: 83, h: 184 }, { x: 228, y: 16, w: 85, h: 184 },
    { x: 356, y: 17, w: 86, h: 184 }, { x: 484, y: 14, w: 85, h: 187 },
    { x: 614, y: 16, w: 86, h: 184 }, { x: 751, y: 16, w: 81, h: 184 },
    { x: 878, y: 16, w: 84, h: 184 }, { x: 1004, y: 42, w: 75, h: 159 },
  ], speed: 10 },
  walk: { frames: [
    { x: 79, y: 223, w: 103, h: 171 }, { x: 213, y: 223, w: 96, h: 173 },
    { x: 354, y: 223, w: 83, h: 173 }, { x: 469, y: 223, w: 96, h: 175 },
    { x: 596, y: 222, w: 103, h: 176 }, { x: 713, y: 224, w: 107, h: 174 },
    { x: 862, y: 224, w: 94, h: 177 }, { x: 986, y: 222, w: 104, h: 176 },
  ], speed: 7 },
  punch: { frames: [
    { x: 74, y: 410, w: 112, h: 164 }, { x: 212, y: 410, w: 121, h: 164 },
    { x: 354, y: 415, w: 141, h: 159 }, { x: 515, y: 415, w: 125, h: 160 },
  ], speed: 5 },
  jump: { frames: [
    { x: 78, y: 606, w: 104, h: 129 }, { x: 231, y: 582, w: 112, h: 159 },
    { x: 377, y: 599, w: 94, h: 149 },
  ], speed: 8 },
  block: { frames: [
    { x: 79, y: 747, w: 108, h: 135 }, { x: 220, y: 750, w: 116, h: 135 },
  ], speed: 12 },
  special: { frames: [
    { x: 54, y: 881, w: 109, h: 130 }, { x: 220, y: 870, w: 117, h: 141 },
    { x: 415, y: 870, w: 124, h: 141 }, { x: 575, y: 873, w: 182, h: 138 },
    { x: 1297, y: 869, w: 130, h: 146 },
  ], speed: 6 },
};

const loadImage = (src: string) => {
  const image = new Image();
  image.src = src;
  return image;
};

export function createFightGame(
  canvas: HTMLCanvasElement,
  keys: Set<string>,
  onEnd: EndGame,
  playerCharacter: FightCharacter,
): GameModule {
  const context = canvas.getContext('2d')!;
  const touchDevice = window.matchMedia('(pointer: coarse)').matches;
  const flavieteSheet = loadImage(animacaoFlavieteUrl);
  const campoMouraoBackground = loadImage(campoMouraoBackgroundUrl);
  const luleteSheet = loadImage(luleteSheetUrl);
  const lulete = loadImage(luleteUrl);
  const poderFlaviete = loadImage(poderFlavieteUrl);

  let animation = 0;
  let running = false;
  let frame = 0;
  let winner: Fighter | null = null;
  let koTimer = 0;
  let hitstop = 0;
  let shake = 0;
  let particles: Particle[] = [];
  let floatTexts: FloatText[] = [];
  let projectiles: Projectile[] = [];
  const heldJumpKeys = new Set<string>();
  const roundWins: [number, number] = [0, 0];
  let roundNumber = 1;
  let matchWinner: Fighter | null = null;

  const makeFighter = (
    name: string, displayName: string, image: HTMLImageElement, spriteBounds: Fighter['spriteBounds'], color: string,
    facing: 1 | -1, controls: Fighter['controls'],
  ): Fighter => ({
    name, displayName, image, spriteBounds, color, x: 0, y: 0, width: 0, height: 0,
    velocityX: 0, velocityY: 0, health: 100, ghostHealth: 100, facing,
    attackCooldown: 0, attackTimer: 0, specialTimer: 0, hitTimer: 0, moveTimer: 0, combo: 0, comboTimer: 0,
    blocking: false, wasGrounded: true, squash: 0, hasHit: false, controls,
    animState: 'idle', animFrame: 0, animTimer: 0,
    ai: { decisionTimer: 0, intent: 'wait', reaction: 0 },
  });

  const fighters: [Fighter, Fighter] = [
    makeFighter('FLAVIETE', 'FLAVIO BOLSONARO', flavieteSheet, { x: 0, y: 0, width: 90, height: 100 }, '#4ecdc4', 1,
      { left: 'KeyA', right: 'KeyD', jump: 'KeyW', attack: 'KeyF', special: 'KeyE', block: 'KeyS' }),
    makeFighter('LULETE', 'LULA', lulete, { x: 125, y: 51, width: 182, height: 488 }, '#ff6b6b', -1,
      { left: 'KeyA', right: 'KeyD', jump: 'KeyW', attack: 'KeyF', special: 'KeyE', block: 'KeyS' }),
  ];

  const backgroundLayout = () => {
    if (campoMouraoBackground.complete && campoMouraoBackground.naturalWidth > 0) {
      const scale = Math.max(
        canvas.width / campoMouraoBackground.naturalWidth,
        canvas.height / campoMouraoBackground.naturalHeight,
      );
      return {
        scale,
        offsetX: (canvas.width - campoMouraoBackground.naturalWidth * scale) / 2,
        offsetY: (canvas.height - campoMouraoBackground.naturalHeight * scale) / 2,
      };
    }
    // Sem a imagem carregada, usa o tamanho real do fundo (1920x1072) para não errar o chão.
    const scale = Math.max(canvas.width / 1920, canvas.height / 1072);
    return { scale, offsetX: (canvas.width - 1920 * scale) / 2, offsetY: (canvas.height - 1072 * scale) / 2 };
  };

  const ground = () => {
    const { scale, offsetY } = backgroundLayout();
    // The playable plane follows the middle of the broad sidewalk in the source image.
    // Chão = calçada da frente (≈79% da altura da imagem), proporcional ao tamanho real do fundo.
    const imgH = campoMouraoBackground.naturalHeight || 1072;
    const y = offsetY + imgH * GROUND_RATIO * scale;
    // Nunca deixa o chão sair da tela (telas muito altas/estreitas no celular).
    return Math.min(y, canvas.height - 12);
  };
  const isGrounded = (f: Fighter) => f.y + f.height >= ground() - 1;
  const resize = () => {
    // Usa o tamanho REAL em que o canvas aparece (Safari/Chrome mobile mudam a barra de endereço).
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width || window.innerWidth);
    canvas.height = Math.round(rect.height || window.innerHeight);
    const height = Math.min(canvas.height * .36, 270);
    fighters.forEach((fighter, index) => {
      fighter.height = height;
      fighter.width = height * .63;
      fighter.x = index === 0 ? canvas.width * .2 : canvas.width * .8 - fighter.width;
      fighter.y = ground() - height;
    });
  };

  const body = (fighter: Fighter) => ({
    x: fighter.x + fighter.width * .2,
    y: fighter.y + fighter.height * .08,
    width: fighter.width * .6,
    height: fighter.height * .88,
  });

  const attackBox = (fighter: Fighter) => ({
    x: fighter.facing === 1 ? fighter.x + fighter.width * .62 : fighter.x - fighter.width * .32,
    y: fighter.y + fighter.height * .2,
    width: fighter.width * .7,
    height: fighter.height * .35,
  });

  const overlaps = (a: ReturnType<typeof body>, b: ReturnType<typeof body>) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  const burst = (x: number, y: number, color: string, count: number, power: number, size = 5) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * power;
      const life = 18 + Math.random() * 18;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life, maxLife: life, color, size: size * (.5 + Math.random()) });
    }
  };

  const hitParticles = (attacker: Fighter, defender: Fighter) => {
    const defenderBody = body(defender);
    const contactX = attacker.facing === 1 ? defenderBody.x : defenderBody.x + defenderBody.width;
    const contactY = defenderBody.y + defenderBody.height * .18;
    const colors = ['#dc2626', '#8b0000', '#3a0000'];

    for (let i = 0; i < 20; i++) {
      const life = 18 + Math.random() * 14;
      particles.push({
        x: contactX + (Math.random() - .5) * 3,
        y: contactY + (Math.random() - .5) * 3,
        vx: attacker.facing * (4 + Math.random() * 7),
        vy: -(0.6 + Math.random() * 3.8),
        life,
        maxLife: life,
        color: colors[i % colors.length],
        size: 2 + Math.random() * 2,
        gravity: .32,
        stopsAtGround: true,
      });
    }
  };

  const dust = (fighter: Fighter) => {
    for (let i = 0; i < 10; i++) {
      const life = 20 + Math.random() * 10;
      particles.push({
        x: fighter.x + fighter.width / 2 + (Math.random() - .5) * fighter.width * .6, y: ground() - 2,
        vx: (Math.random() - .5) * 4, vy: -Math.random() * 2, life, maxLife: life, color: 'rgba(200,200,220,.7)', size: 6,
      });
    }
  };

  const finish = (loser: Fighter) => {
    if (winner || loser.health > 0) return;
    winner = fighters.find((fighter) => fighter !== loser) ?? fighters[0];
    const winnerIndex = fighters.indexOf(winner);
    roundWins[winnerIndex]++;
    if (roundWins[winnerIndex] >= 2) matchWinner = winner;
    koTimer = 1;
  };

  const sendResult = () => {
    const finalWinner = matchWinner ?? winner;
    if (!finalWinner) return;
    const winnerIndex = fighters.indexOf(finalWinner);
    const loserIndex = 1 - winnerIndex;
    running = false;
    onEnd({
      title: `🏆 ${finalWinner.displayName} VENCEU A PARTIDA!`,
      message: `${finalWinner.displayName} venceu a melhor de três por ${roundWins[winnerIndex]} a ${roundWins[loserIndex]}.\n\nVIDA RESTANTE: ${Math.max(0, Math.round(finalWinner.health))}%`,
      stats: { score: Math.max(0, Math.round(finalWinner.health)), level: roundNumber },
      actionLabel: '↻ NOVA LUTA',
    });
  };

  const resetRound = () => {
    fighters.forEach((fighter, index) => {
      fighter.health = 100;
      fighter.ghostHealth = 100;
      fighter.velocityX = 0;
      fighter.velocityY = 0;
      fighter.moveTimer = 0;
      fighter.attackTimer = 0;
      fighter.specialTimer = 0;
      fighter.attackCooldown = 0;
      fighter.hitTimer = 0;
      fighter.combo = 0;
      fighter.comboTimer = 0;
      fighter.blocking = false;
      fighter.squash = 0;
      fighter.facing = index === 0 ? 1 : -1;
      fighter.animState = 'idle';
      fighter.animFrame = 0;
      fighter.animTimer = 0;
    });
    winner = null;
    koTimer = 0;
    hitstop = 0;
    shake = 0;
    particles = [];
    floatTexts = [];
    projectiles = [];
    heldJumpKeys.clear();
    frame = 0;
    resize();
  };

  const castSpecial = (caster: Fighter, type: 'passaporte' | 'laranja') => {
    const spawnX = caster.facing === 1 ? caster.x + caster.width : caster.x - 45;
    const spawnY = caster.y + caster.height * 0.4;
    projectiles.push({
      x: spawnX,
      y: spawnY,
      vx: caster.facing * (type === 'passaporte' ? 11 : 5),
      vy: type === 'laranja' ? 2 : 0,
      width: 50,
      height: 45,
      type,
      ownerName: caster.name,
      life: 100,
    });
  };

  const applyHit = (attacker: Fighter, defender: Fighter) => {
    attacker.hasHit = true;
    const blocked = defender.blocking && defender.facing === -attacker.facing;
    attacker.combo = attacker.comboTimer > 0 ? attacker.combo + 1 : 1;
    attacker.comboTimer = COMBO_WINDOW;
    const finisher = attacker.combo >= 3;
    let damage = (finisher ? COMBO_FINISHER_DAMAGE : BASE_DAMAGE) + Math.round(Math.random() * 2);
    if (blocked) damage = Math.max(1, Math.round(damage * BLOCK_MULTIPLIER));
    defender.health = Math.max(0, defender.health - damage);
    defender.hitTimer = blocked ? 6 : 14;
    defender.velocityX = attacker.facing * (blocked ? 4 : finisher ? 13 : 7);
    if (finisher && !blocked) defender.velocityY = -7;
    if (!blocked) { defender.attackTimer = 0; defender.combo = 0; }
    hitstop = finisher ? HITSTOP * 2 : HITSTOP;
    shake = blocked ? 3 : finisher ? 14 : 7;
    const hx = defender.x + defender.width / 2;
    const hy = defender.y + defender.height * .35;
    if (blocked) {
      burst(hx, hy, '#9fd8ff', 8, 4, 4);
      floatTexts.push({ x: hx, y: hy - 30, text: 'DEFESA!', life: 40, color: '#9fd8ff' });
    } else {
      hitParticles(attacker, defender);
      burst(hx, hy, defender.color, finisher ? 26 : 14, finisher ? 10 : 7);
      burst(hx, hy, '#fff3a3', 6, 5, 3);
      floatTexts.push({ x: hx, y: hy - 30, text: finisher ? `COMBO! -${damage}` : `-${damage}`, life: 45, color: finisher ? '#ffd166' : '#fff' });
      if (finisher) attacker.combo = 0;
    }
    if (defender.health === 0) { shake = 20; finish(defender); }
  };

  const updateFighter = (fighter: Fighter, opponent: Fighter, isPlayer: boolean) => {
    const wasX = fighter.x;
    const grounded = isGrounded(fighter);
    const stunned = fighter.hitTimer > 0;
    const distance = opponent.x - fighter.x;
    let moveLeft = false, moveRight = false, jump = false, attack = false, special = false, block = false;

    if (fighter.health > 0 && !winner) {
      if (isPlayer) {
        moveLeft = keys.has(fighter.controls.left);
        moveRight = keys.has(fighter.controls.right);
        const jumpHeld = keys.has(fighter.controls.jump);
        jump = jumpHeld && !heldJumpKeys.has(fighter.controls.jump);
        if (jumpHeld) heldJumpKeys.add(fighter.controls.jump);
        else heldJumpKeys.delete(fighter.controls.jump);
        attack = keys.has(fighter.controls.attack);
        special = keys.has(fighter.controls.special);
        block = keys.has(fighter.controls.block) && grounded;
      } else {
        const absDist = Math.abs(distance);
        if (absDist < fighter.width * 1.2 && Math.random() < 0.05) attack = true;
        else if (distance > 0) moveRight = true;
        else moveLeft = true;
      }
    }

    fighter.blocking = block && !stunned && fighter.attackTimer === 0 && fighter.specialTimer === 0;
    const speed = fighter.blocking ? BLOCK_MOVE_SPEED : MOVE_SPEED;
    if (!stunned && fighter.attackTimer === 0 && fighter.specialTimer === 0) {
      if (moveLeft) { fighter.x -= speed; if (!fighter.blocking) fighter.facing = -1; }
      if (moveRight) { fighter.x += speed; if (!fighter.blocking) fighter.facing = 1; }
      if (jump && grounded && !fighter.blocking) {
        fighter.velocityY = -Math.max(13, canvas.height * .027);
        fighter.squash = -1;
        dust(fighter);
      }
      if (attack && fighter.attackCooldown <= 0 && !fighter.blocking) {
        fighter.attackCooldown = ATTACK_COOLDOWN;
        fighter.attackTimer = ATTACK_DURATION;
        fighter.hasHit = false;
      }
      if (special && fighter.attackCooldown <= 0 && !fighter.blocking) {
        fighter.attackCooldown = ATTACK_COOLDOWN * 1.8;
        fighter.specialTimer = SPECIAL_DURATION;
        castSpecial(fighter, fighter.name === 'FLAVIETE' ? 'passaporte' : 'laranja');
      }
    }

    const elapsed = ATTACK_DURATION - fighter.attackTimer;
    if (fighter.attackTimer > 0 && elapsed >= ATTACK_STARTUP && elapsed < ATTACK_STARTUP + ATTACK_ACTIVE) {
      fighter.x += fighter.facing * 4;
      if (!fighter.hasHit && overlaps(attackBox(fighter), body(opponent)) && opponent.health > 0) applyHit(fighter, opponent);
    }

    fighter.x += fighter.velocityX;
    fighter.velocityX *= grounded ? .78 : .93;
    if (Math.abs(fighter.velocityX) < .1) fighter.velocityX = 0;
    fighter.velocityY += .8;
    fighter.y += fighter.velocityY;
    if (fighter.y + fighter.height >= ground()) {
      fighter.y = ground() - fighter.height;
      if (!fighter.wasGrounded && fighter.velocityY > 4) { fighter.squash = 1; dust(fighter); }
      fighter.velocityY = 0;
    }
    fighter.wasGrounded = isGrounded(fighter);
    fighter.x = Math.max(8, Math.min(canvas.width - fighter.width - 8, fighter.x));

    const minGap = fighter.width * .45;
    const gap = opponent.x - fighter.x;
    if (Math.abs(gap) < minGap && Math.abs(fighter.y - opponent.y) < fighter.height * .5) {
      fighter.x -= Math.sign(gap || fighter.facing) * (minGap - Math.abs(gap)) / 2;
    }
    fighter.moveTimer = Math.abs(fighter.x - wasX) < .5 ? 0 : fighter.moveTimer + 1;
    fighter.squash *= .82;
    if (fighter.attackCooldown > 0) fighter.attackCooldown--;
    if (fighter.attackTimer > 0) fighter.attackTimer--;
    if (fighter.specialTimer > 0) fighter.specialTimer--;
    if (fighter.hitTimer > 0) fighter.hitTimer--;
    if (fighter.comboTimer > 0) fighter.comboTimer--; else fighter.combo = 0;
    if (fighter.ghostHealth > fighter.health) fighter.ghostHealth = Math.max(fighter.health, fighter.ghostHealth - .6);
  };

  const drawFighter = (fighter: Fighter) => {
    const grounded = isGrounded(fighter);
    const walking = grounded && fighter.moveTimer > 0;
    const walkBob = walking ? Math.abs(Math.sin(fighter.moveTimer * .35)) * 7 : 0;

    // Seleção de Estado de Animação
    let nextState: Fighter['animState'] = 'idle';
    if (!grounded) nextState = 'jump';
    else if (fighter.attackTimer > 0) nextState = 'punch';
    else if (fighter.specialTimer > 0) nextState = 'special';
    else if (fighter.blocking) nextState = 'block';
    else if (walking) nextState = 'walk';

    if (fighter.animState !== nextState) {
      fighter.animState = nextState;
      fighter.animFrame = 0;
      fighter.animTimer = 0;
    }

    const config = fighter.name === 'FLAVIETE' ? FLAVIETE_ANIMS[fighter.animState] : LULETE_ANIMS[fighter.animState];
    const sheet = fighter.name === 'FLAVIETE' ? flavieteSheet : luleteSheet;
    fighter.animTimer++;
    if (fighter.animTimer >= config.speed) {
      fighter.animTimer = 0;
      fighter.animFrame = (fighter.animFrame + 1) % config.frames.length;
    }

    const spriteFrame = config.frames[fighter.animFrame];
    const rHeight = fighter.height * 1.2;
    const rWidth = rHeight * spriteFrame.w / spriteFrame.h;
    const footX = fighter.x + fighter.width / 2;
    const footY = fighter.y + fighter.height - walkBob;

    context.save();
    context.translate(footX, footY);
    context.scale(fighter.facing, 1);
    context.drawImage(
      sheet,
      spriteFrame.x, spriteFrame.y, spriteFrame.w, spriteFrame.h,
      -rWidth / 2, -rHeight, rWidth, rHeight,
    );

    context.restore();

    // Arco de Corte do Soco
    const elapsed = ATTACK_DURATION - fighter.attackTimer;
    if (fighter.attackTimer > 0 && elapsed >= ATTACK_STARTUP - 1) {
      const box = attackBox(fighter);
      const progress = Math.min(1, (elapsed - ATTACK_STARTUP + 1) / ATTACK_ACTIVE);
      const start = fighter.facing === 1 ? -1.2 : Math.PI + 1.2;
      const end = start + fighter.facing * 2.4 * progress;
      context.save();
      context.globalAlpha = Math.max(0, fighter.attackTimer / ATTACK_DURATION) * 1.4;
      context.strokeStyle = fighter.combo >= 2 ? '#ffd166' : '#fff3a3';
      context.shadowColor = fighter.color;
      context.shadowBlur = 20;
      context.lineWidth = 8;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(box.x + box.width / 2 - fighter.facing * 20, box.y + box.height / 2, box.height * .75, fighter.facing === 1 ? start : end, fighter.facing === 1 ? end : start);
      context.stroke();
      context.restore();
    }
  };

  const drawShadow = (fighter: Fighter) => {
    const heightFromGround = ground() - (fighter.y + fighter.height);
    const width = Math.max(24, fighter.width * (.5 - Math.min(heightFromGround / 600, .25)));
    context.fillStyle = 'rgba(0, 0, 0, .45)';
    context.beginPath();
    context.ellipse(fighter.x + fighter.width / 2, ground() + 5, width, 8, 0, 0, Math.PI * 2);
    context.fill();
  };

  const drawHealth = (fighter: Fighter, x: number, alignRight = false) => {
    const barWidth = Math.min(canvas.width * (touchDevice ? .29 : .34), touchDevice ? 260 : 390);
    const barHeight = 24;
    const low = fighter.health <= 25;
    context.fillStyle = '#151827';
    context.fillRect(x, 32, barWidth, barHeight);
    const ghost = barWidth * fighter.ghostHealth / 100;
    context.fillStyle = '#ffffff';
    context.globalAlpha = .7;
    context.fillRect(alignRight ? x + barWidth - ghost : x, 32, ghost, barHeight);
    context.globalAlpha = 1;
    const fill = barWidth * fighter.health / 100;
    context.fillStyle = low && frame % 20 < 10 ? '#ff3b3b' : fighter.color;
    context.fillRect(alignRight ? x + barWidth - fill : x, 32, fill, barHeight);
    context.strokeStyle = '#fff';
    context.lineWidth = 2;
    context.strokeRect(x, 32, barWidth, barHeight);
    context.fillStyle = '#fff';
    context.font = `${touchDevice ? 9 : 14}px "Press Start 2P", monospace`;
    context.textAlign = alignRight ? 'right' : 'left';
    context.fillText(fighter.displayName, alignRight ? x + barWidth : x, 24);
    if (fighter.combo >= 2) {
      context.fillStyle = '#ffd166';
      context.font = '12px "Press Start 2P", monospace';
      context.fillText(`${fighter.combo} HITS`, alignRight ? x + barWidth : x, 76);
    }
  };

  const popText = (text: string, size: number, color: string, scale: number) => {
    context.save();
    context.translate(canvas.width / 2, canvas.height * .27);
    context.scale(scale, scale);
    context.font = `bold ${size}px "Press Start 2P", monospace`;
    context.textAlign = 'center';
    context.lineWidth = 6;
    context.strokeStyle = '#000';
    context.strokeText(text, 0, 0);
    context.fillStyle = color;
    context.fillText(text, 0, 0);
    context.restore();
  };

  const draw = () => {
    context.save();
    if (shake > 0) context.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    if (campoMouraoBackground.complete && campoMouraoBackground.naturalWidth > 0) {
      const { scale, offsetX, offsetY } = backgroundLayout();
      const backgroundWidth = campoMouraoBackground.naturalWidth * scale;
      const backgroundHeight = campoMouraoBackground.naturalHeight * scale;
      context.drawImage(
        campoMouraoBackground,
        offsetX,
        offsetY,
        backgroundWidth,
        backgroundHeight,
      );
    } else {
      context.fillStyle = '#111936';
      context.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);
    }
    if (touchDevice) {
      context.fillStyle = 'rgba(5, 9, 24, .28)';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    fighters.forEach(drawShadow);
    fighters.forEach(drawFighter);

    projectiles.forEach((p) => {
      context.save();
      if (p.type === 'passaporte' && poderFlaviete.complete) {
        const totalFrames = 4;
        const sw = poderFlaviete.naturalWidth / totalFrames;
        const sh = poderFlaviete.naturalHeight;
        const currentFrame = Math.floor(frame / 6) % totalFrames;
        context.drawImage(
          poderFlaviete,
          currentFrame * sw, 0, sw, sh,
          p.x, p.y, p.width, p.height
        );
      } else {
        context.fillStyle = '#f97316';
        context.beginPath();
        context.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });

    particles.forEach((p) => {
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      const s = p.size * (p.life / p.maxLife);
      context.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    });
    context.globalAlpha = 1;

    floatTexts.forEach((t) => {
      context.globalAlpha = Math.min(1, t.life / 20);
      context.font = '14px "Press Start 2P", monospace';
      context.textAlign = 'center';
      context.lineWidth = 4;
      context.strokeStyle = '#000';
      context.strokeText(t.text, t.x, t.y);
      context.fillStyle = t.color;
      context.fillText(t.text, t.x, t.y);
    });
    context.globalAlpha = 1;
    context.restore();

    drawHealth(fighters[0], 24);
    drawHealth(fighters[1], canvas.width - 24 - Math.min(canvas.width * .34, 390), true);
    
    context.fillStyle = '#fff';
    context.font = `${touchDevice ? 9 : 12}px "Press Start 2P", monospace`;
    context.textAlign = 'center';
    if (!touchDevice) {
      context.fillText(`VOCÊ: ${playerCharacter === 'flaviete' ? 'FLAVIO BOLSONARO' : 'LULA'} · CPU`, canvas.width / 2, 48);
    }
    const roundLabel = `ROUND ${roundNumber} · ${roundWins[0]} x ${roundWins[1]}`;
    context.font = '10px "Press Start 2P", monospace';
    const roundLabelWidth = context.measureText(roundLabel).width + 20;
    context.fillStyle = 'rgba(10, 15, 26, .86)';
    context.fillRect(canvas.width / 2 - roundLabelWidth / 2, 54, roundLabelWidth, 22);
    context.strokeStyle = '#ffd166';
    context.lineWidth = 1;
    context.strokeRect(canvas.width / 2 - roundLabelWidth / 2, 54, roundLabelWidth, 22);
    context.fillStyle = '#ffd166';
    context.fillText(roundLabel, canvas.width / 2, 69);

    if (!touchDevice) {
      const me = fighters[playerCharacter === 'flaviete' ? 0 : 1].controls;
      const label = (k: string) => k.replace('Key', '').replace('Arrow', '');
      context.font = '9px "Press Start 2P", monospace';
      context.globalAlpha = .6;
      context.fillText(`MOVER ${label(me.left)}/${label(me.right)} · PULAR ${label(me.jump)} · ATACAR ${label(me.attack)} · ESPECIAL ${label(me.special)} · DEFENDER ${label(me.block)}`, canvas.width / 2, canvas.height - 20);
      context.globalAlpha = 1;
    }

    if (frame < COUNTDOWN && running) {
      const step = Math.floor(frame / 40);
      const t = (frame % 40) / 40;
      popText(String(3 - step), 48, '#fff', 1.6 - t * .6);
      context.fillStyle = '#fff';
      context.font = '12px "Press Start 2P", monospace';
      context.textAlign = 'center';
      context.fillText('PREPARE-SE!', canvas.width / 2, canvas.height * .33);
    } else if (frame < COUNTDOWN + 40) {
      const t = (frame - COUNTDOWN) / 40;
      context.globalAlpha = 1 - t;
      popText('LUTA!', 40, '#ffd166', 1 + t * .8);
      context.globalAlpha = 1;
    }
    if (winner) {
      const t = Math.min(1, koTimer / 25);
      popText('K.O.!', 56, '#ff3b3b', 2 - t);
      if (koTimer > 40) {
        context.fillStyle = '#fff';
        context.font = '18px "Press Start 2P", monospace';
        context.textAlign = 'center';
        context.fillText(`${winner.displayName} VENCE`, canvas.width / 2, canvas.height * .35);
      }
    }
  };

  const loop = () => {
    frame++;
    if (shake > 0) shake *= .85; if (shake < .5) shake = 0;
    const slowMo = winner && frame % 3 !== 0;
    if (running && frame >= COUNTDOWN && hitstop <= 0 && !slowMo) {
      const playerIndex = playerCharacter === 'flaviete' ? 0 : 1;
      updateFighter(fighters[playerIndex], fighters[1 - playerIndex], true);
      updateFighter(fighters[1 - playerIndex], fighters[playerIndex], false);

      projectiles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.type === 'laranja') {
          if (p.y + p.height >= ground()) { p.y = ground() - p.height; p.vy = 0; }
          else { p.vy += 0.4; }
        }
        const target = p.ownerName === 'FLAVIETE' ? fighters[1] : fighters[0];
        const tBox = body(target);
        if (target.health > 0 && p.x < tBox.x + tBox.width && p.x + p.width > tBox.x && p.y < tBox.y + tBox.height && p.y + p.height > tBox.y) {
          target.health = Math.max(0, target.health - 12);
          target.hitTimer = 12;
          burst(p.x, p.y, p.type === 'laranja' ? '#f97316' : '#9fd8ff', 15, 6);
          p.life = 0;
          if (target.health === 0) finish(target);
        }
      });
      projectiles = projectiles.filter((p) => p.life > 0);
    }

    if (hitstop > 0) hitstop--;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity ?? .25;
      p.vx *= .97;
      p.life--;
      if (p.stopsAtGround && p.y >= ground()) {
        p.y = ground();
        p.life = 0;
      }
    });
    particles = particles.filter((p) => p.life > 0);
    floatTexts.forEach((t) => { t.y -= 1; t.life--; });
    floatTexts = floatTexts.filter((t) => t.life > 0);

    if (winner) {
      koTimer++;
      if (koTimer > 130) {
        if (matchWinner) { draw(); sendResult(); return; }
        roundNumber++;
        resetRound();
      }
    }
    draw();
    if (running) animation = requestAnimationFrame(loop);
  };

  const start = () => {
    fighters.forEach((f, i) => {
      f.health = 100; f.ghostHealth = 100; f.velocityX = 0; f.velocityY = 0; f.moveTimer = 0;
      f.attackTimer = 0; f.specialTimer = 0; f.attackCooldown = 0; f.hitTimer = 0; f.combo = 0; f.comboTimer = 0;
      f.blocking = false; f.squash = 0; f.facing = i === 0 ? 1 : -1;
      f.animState = 'idle'; f.animFrame = 0; f.animTimer = 0;
      f.ai = { decisionTimer: 0, intent: 'wait', reaction: 0 };
    });
    winner = null; koTimer = 0; hitstop = 0; shake = 0;
    roundWins[0] = 0; roundWins[1] = 0; roundNumber = 1; matchWinner = null;
    particles = []; floatTexts = []; projectiles = [];
    heldJumpKeys.clear();
    frame = 0;
    resize();
    running = true;
    cancelAnimationFrame(animation);
    animation = requestAnimationFrame(loop);
  };

  resize();
  campoMouraoBackground.addEventListener('load', resize);
  if (campoMouraoBackground.decode) campoMouraoBackground.decode().then(resize).catch(() => {});
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  window.visualViewport?.addEventListener('resize', resize);
  return {
    start,
    stop: () => { running = false; cancelAnimationFrame(animation); },
    destroy: () => {
      running = false;
      cancelAnimationFrame(animation);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
    },
  };
}