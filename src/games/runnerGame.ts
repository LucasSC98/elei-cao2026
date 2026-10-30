import type { GameModule, GameResult } from '../types';

const sprite = (name: string) => {
  const image = new Image();
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  image.src = `${base}assets/${name}.png`;
  return image;
};

const FW = 50;
const FH = 104;
const STAGE_DISTANCE = 4000;

type RunnerEnd = (result: GameResult) => void;

export function createRunnerGame(canvas: HTMLCanvasElement, keys: Set<string>, onEnd: RunnerEnd): GameModule {
  const context = canvas.getContext('2d')!;
  const playerSprite = sprite('sp');
  const carSprite = sprite('cf');
  const heroSprite = sprite('cs');
  const wizardSprite = sprite('wz');
  const helicopterSprite = sprite('fl');
  const background = sprite('background-flaviete');
  let animation = 0;
  let running = false;
  let frame = 0;
  let distance = 0;
  let pressure = .2;
  let score = 0;
  let stage = 1;
  let speed = 6;
  let best = 0;
  let invulnerable = 0;
  let shake = 0;
  let helicopter = { active: false, x: 0, y: 0, direction: 1, next: 400 };
  let wizard = { active: false, x: 0, time: 0, next: 1800 };
  let orbs: Array<{ x: number; y: number }> = [];
  let pursuerX = 0;
  let player = { x: 0, y: 0, width: 0, height: 0, velocity: 0, grounded: true };
  let obstacles: Array<{ x: number; y: number; width: number; height: number; car?: boolean }> = [];
  let pickups: Array<{ x: number; y: number }> = [];
  let effects: Array<{ x: number; y: number; text: string; color: string; time: number }> = [];

  const ground = () => canvas.height - Math.max(65, Math.floor(canvas.height * 0.12));

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const height = Math.round(Math.min(canvas.height * 0.22, 130));
    player.height = height;
    player.width = Math.round(height * FW / FH);
    player.x = Math.max(80, Math.floor(canvas.width * 0.22));
    if (player.grounded) {
      player.y = ground() - player.height;
    }
  };

  const jump = () => {
    if (running && player.grounded) {
      player.velocity = -Math.max(13, canvas.height * .026);
      player.grounded = false;
    }
  };

  const hitbox = () => ({
    x: player.x + player.width * .28,
    y: player.y + player.height * .06,
    width: player.width * .44,
    height: player.height * .92,
  });

  const collide = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
    a.x < b.x + b.width * .8 && a.x + a.width > b.x + b.width * .2 && a.y < b.y + b.height && a.y + a.height > b.y + b.height * .2;

  const hurt = () => {
    pressure += .3;
    invulnerable = 70;
    shake = 14;
    effects.push({ x: player.x, y: player.y - 10, text: 'BATEU!', color: '#ff6b6b', time: 40 });
  };

  const finish = () => {
    running = false;
    best = Math.max(best, score);
    onEnd({
      title: '🚔 FOI PEGO!',
      message: `A viatura emparelhou. Fim da fuga.\n\nETAPA: ${stage}\nPONTOS: ${score}\nRECORDE: ${best}`,
      actionLabel: '↻ TENTAR DE NOVO',
    });
  };

  const update = () => {
    frame++;
    if (invulnerable > 0) invulnerable--;
    if (!helicopter.active && frame >= helicopter.next) {
      helicopter = { active: true, x: Math.random() < .5 ? -180 : canvas.width + 180, y: canvas.height * (.08 + Math.random() * .15), direction: Math.random() < .5 ? 1 : -1, next: helicopter.next };
    }
    if (helicopter.active) {
      helicopter.x += helicopter.direction * (2 + Math.random() * 1.6);
      if (helicopter.x > canvas.width + 300 || helicopter.x < -300) {
        helicopter.active = false;
        helicopter.next = frame + 900 + Math.random() * 900;
      }
    }
    player.velocity += .8 * Math.max(0.8, canvas.height / 560);
    player.y += player.velocity;
    if (player.y + player.height >= ground()) {
      player.y = ground() - player.height;
      player.velocity = 0;
      player.grounded = true;
    }
    if (keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')) jump();
    if (frame % 240 === 0 && speed < 12) speed += .35;
    distance += speed;
    score = Math.floor(distance / 10);
    pressure += .0002 + stage * .00002;
    const nextStage = 1 + Math.floor(distance / STAGE_DISTANCE);
    if (nextStage > stage) {
      stage = nextStage;
      effects.push({ x: canvas.width * .35, y: canvas.height * .4, text: `ETAPA ${stage}`, color: '#4ecdc4', time: 90 });
    }
    if (!wizard.active && distance >= wizard.next) {
      wizard.active = true;
      wizard.time = 0;
      wizard.x = canvas.width + 100;
      effects.push({ x: canvas.width * .25, y: canvas.height * .25, text: 'O BRUXO CHEGOU!', color: '#7CFC9A', time: 70 });
    }
    if (wizard.active) {
      wizard.time++;
      const target = wizard.time < 480 ? canvas.width - 90 : canvas.width + 150;
      wizard.x += (target - wizard.x) * .05;
      if (wizard.time % 75 === 40 && wizard.time < 440) {
        orbs.push({ x: wizard.x, y: Math.random() < .5 ? ground() - player.height * 1.5 : ground() - 30 });
      }
      if (wizard.time >= 540) {
        wizard.active = false;
        wizard.next = distance + 2600 + Math.random() * 1600;
        pressure = Math.max(0, pressure - .12);
        effects.push({ x: canvas.width * .25, y: canvas.height * .25, text: 'SOBREVIVEU!', color: '#ffe66d', time: 60 });
      }
    }

    const obsHeight = Math.round(Math.min(canvas.height * .16, 90));
    const obsWidth = Math.round(obsHeight * (carSprite.naturalWidth || 1) / Math.max(1, carSprite.naturalHeight || 1));
    const gap = Math.max(55, 95 - speed * 3.5);
    if (frame % Math.floor(gap) === 0) {
      const car = Math.random() < .55;
      obstacles.push({
        x: canvas.width + 30,
        y: ground() - (car ? obsHeight : 40),
        width: car ? obsWidth : 40,
        height: car ? obsHeight : 40,
        car,
      });
    }

    if (frame % 130 === 0) {
      pickups.push({ x: canvas.width + 30, y: ground() - player.height * (.9 + Math.random() * .7) });
    }

    const box = hitbox();
    orbs.forEach((orb) => {
      orb.x -= speed + 2.5;
      if (invulnerable <= 0 && orb.x + 14 > box.x && orb.x - 14 < box.x + box.width && orb.y + 14 > box.y && orb.y - 14 < box.y + box.height) {
        orb.x = -999;
        hurt();
      }
    });
    orbs = orbs.filter((orb) => orb.x > -40);

    obstacles.forEach((obstacle) => {
      obstacle.x -= speed;
      if (invulnerable <= 0 && collide(box, obstacle)) hurt();
    });
    obstacles = obstacles.filter((obstacle) => obstacle.x > -80);

    pickups = pickups.filter((pickup) => {
      pickup.x -= speed;
      const collected = box.x < pickup.x + 34 && box.x + box.width > pickup.x && box.y < pickup.y + 34 && box.y + box.height > pickup.y;
      if (collected) {
        distance += 500;
        pressure = Math.max(0, pressure - .18);
        effects.push({ x: pickup.x, y: pickup.y, text: '+50', color: '#ffe66d', time: 40 });
      }
      return !collected && pickup.x > -50;
    });

    effects.forEach((effect) => { effect.y--; effect.time--; });
    effects = effects.filter((effect) => effect.time > 0);

    const targetPursuer = -14 + Math.min(pressure, 1) * (player.x + player.width * .35 + 14);
    pursuerX += (targetPursuer - pursuerX) * .07;
    if (pressure >= 1 && pursuerX > player.x) finish();
  };

  const draw = () => {
    const width = canvas.width;
    const height = canvas.height;
    const shaking = shake > 0;
    if (shaking) {
      context.save();
      context.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      shake--;
    }

    if (background.complete) {
      const scale = Math.max(width / background.naturalWidth, height / background.naturalHeight);
      const renderedWidth = background.naturalWidth * scale;
      const renderedHeight = background.naturalHeight * scale;
      const offset = -(frame * speed * .45 % renderedWidth);
      for (let x = offset - renderedWidth; x < width + renderedWidth; x += renderedWidth) {
        context.drawImage(background, x, height - renderedHeight, renderedWidth, renderedHeight);
      }
    } else {
      context.fillStyle = '#0a0a12';
      context.fillRect(0, 0, width, height);
    }

    // Base de asfalto abaixo do nível do chão para cobrir 100% da tela
    context.fillStyle = '#22232a';
    context.fillRect(0, ground(), width, height - ground());

    context.imageSmoothingEnabled = false;

    if (helicopter.active && helicopterSprite.complete) {
      context.globalAlpha = .12;
      for (let i = 1; i < 4; i++) context.fillRect(helicopter.direction > 0 ? helicopter.x - i * 28 : helicopter.x + 100 + (i - 1) * 28, helicopter.y + 20 + i * 8, 18, 2);
      context.globalAlpha = 1;
      if (helicopter.direction < 0) {
        context.save();
        context.translate(helicopter.x + 160, helicopter.y);
        context.scale(-1, 1);
        context.drawImage(helicopterSprite, 0, 0, 160, 48);
        context.restore();
      } else {
        context.drawImage(helicopterSprite, helicopter.x, helicopter.y, 160, 48);
      }
    }

    if (wizard.x < width + 160 && wizardSprite.complete) {
      const wizardHeight = Math.round(player.height * 1.3);
      context.drawImage(wizardSprite, wizard.x, ground() - wizardHeight + 4, wizardHeight * wizardSprite.naturalWidth / wizardSprite.naturalHeight, wizardHeight);
    }

    orbs.forEach((orb) => {
      context.globalAlpha = .4; context.fillStyle = '#3dff7a'; context.beginPath(); context.arc(orb.x, orb.y, 22, 0, 7); context.fill();
      context.globalAlpha = 1; context.fillStyle = '#0b3d1c'; context.beginPath(); context.arc(orb.x, orb.y, 14, 0, 7); context.fill();
      context.fillStyle = '#7CFC9A'; context.font = 'bold 16px sans-serif'; context.textAlign = 'center'; context.fillText('S', orb.x, orb.y + 1);
    });

    context.textAlign = 'left';
    obstacles.forEach((obstacle) => {
      if (obstacle.car) context.drawImage(carSprite, obstacle.x, ground() - obstacle.height + 4, obstacle.width, obstacle.height);
      else {
        context.fillStyle = '#e63946';
        context.fillRect(obstacle.x, ground() - obstacle.height + 4, obstacle.width, obstacle.height);
        context.fillStyle = '#fff';
        context.fillRect(obstacle.x, ground() - obstacle.height + 4 + obstacle.height * .3, obstacle.width, obstacle.height * .18);
      }
    });

    pickups.forEach((pickup) => {
      context.fillStyle = '#1b3a8a';
      context.fillRect(pickup.x + 4, pickup.y, 26, 34);
      context.fillStyle = '#ffd23f';
      context.beginPath();
      context.arc(pickup.x + 17, pickup.y + 14, 7, 0, 7);
      context.fill();
    });

    if (pursuerX < width + player.width * 2 && heroSprite.complete) {
      const pursuerHeight = Math.round(player.height * 1.05);
      const pursuerWidth = pursuerHeight * heroSprite.naturalWidth / heroSprite.naturalHeight;
      context.drawImage(heroSprite, pursuerX - pursuerWidth, ground() - pursuerHeight + 4, pursuerWidth, pursuerHeight);
    }

    if (!(invulnerable > 0 && (frame >> 2) % 2) && playerSprite.complete) {
      context.drawImage(playerSprite, (player.grounded ? (frame >> 2) % 8 : 2) * FW, 0, FW, FH, player.x, player.y, player.width, player.height);
    }

    // HUD do Runner
    context.font = '9px "Press Start 2P", monospace';
    context.fillStyle = '#fff';
    context.fillText(`ETAPA ${stage}`, 20, 32);
    context.fillText(`PONTOS ${score}`, 20, 64);
    context.fillText('PF', 16, 92);
    context.fillStyle = '#334';
    context.fillRect(44, 82, 130, 10);
    context.fillStyle = pressure > .7 ? '#ff3b3b' : pressure > .45 ? '#ffb020' : '#6bd36b';
    context.fillRect(44, 82, 130 * Math.min(1, pressure), 10);

    effects.forEach((effect) => { context.fillStyle = effect.color; context.fillText(effect.text, effect.x, effect.y); });
    if (pressure > .45) { context.fillStyle = frame % 16 < 8 ? 'rgba(255,0,0,.1)' : 'rgba(0,80,255,.1)'; context.fillRect(0, 0, width * .4, height); }
    if (pressure > .7 && frame % 16 < 8) { context.textAlign = 'center'; context.fillStyle = '#ff6b6b'; context.fillText('CUIDADO! A PF ESTA NA SUA COLA!', width / 2, height * .3); context.textAlign = 'left'; }
    if (shaking) context.restore();
  };

  const loop = () => {
    if (!running) return;
    update();
    draw();
    if (running) animation = requestAnimationFrame(loop);
  };

  const start = () => {
    resize();
    frame = 0; distance = 0; score = 0; pressure = .2; speed = 6; stage = 1; obstacles = []; pickups = []; effects = []; orbs = []; invulnerable = 0; shake = 0; pursuerX = -player.width;
    helicopter = { active: false, x: 0, y: 0, direction: 1, next: 400 + Math.random() * 500 };
    wizard = { active: false, x: canvas.width + 100, time: 0, next: 1800 };
    running = true;
    cancelAnimationFrame(animation);
    animation = requestAnimationFrame(loop);
  };

  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', jump);

  return {
    start,
    stop: () => { running = false; cancelAnimationFrame(animation); },
    destroy: () => {
      running = false;
      cancelAnimationFrame(animation);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', jump);
    },
  };
}
