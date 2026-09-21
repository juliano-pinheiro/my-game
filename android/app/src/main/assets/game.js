/**
 * Flying Bird - Retro Edition
 * Código completo do jogo em Vanilla JavaScript & Canvas 2D
 */

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Botões da interface
  const soundBtn = document.getElementById('sound-btn');
  const soundIcon = document.getElementById('sound-icon');
  const skinBtn = document.getElementById('skin-btn');
  const skinIcon = document.getElementById('skin-icon');
  const shopBtn = document.getElementById('shop-btn');
  const shopIcon = document.getElementById('shop-icon');
  const pauseBtn = document.getElementById('pause-btn');
  const pauseIcon = document.getElementById('pause-icon');
  // Skins do Pássaro (8 Skins: de Comuns a Lendárias com Preços e Raridades)
  const SKINS = [
    {
      id: 'classic_hd',
      name: 'Clássico HD',
      icon: '🐥',
      rarity: 'Comum',
      rarityColor: '#10b981',
      price: 0,
      particleColor: '#facc15'
    },
    {
      id: 'aviator',
      name: 'Aviador',
      icon: '🕶️',
      rarity: 'Comum',
      rarityColor: '#10b981',
      price: 35,
      particleColor: '#f97316'
    },
    {
      id: 'gentleman',
      name: 'Lorde Cartola',
      icon: '🎩',
      rarity: 'Rara',
      rarityColor: '#38bdf8',
      price: 80,
      particleColor: '#60a5fa'
    },
    {
      id: 'bat',
      name: 'Pássaro Morcego',
      icon: '🦇',
      rarity: 'Rara',
      rarityColor: '#38bdf8',
      price: 150,
      particleColor: '#a855f7'
    },
    {
      id: 'cyber',
      name: 'Cyber Neon',
      icon: '⚡',
      rarity: 'Épica',
      rarityColor: '#ec4899',
      price: 260,
      particleColor: '#00f2fe'
    },
    {
      id: 'king',
      name: 'Rei Dourado',
      icon: '👑',
      rarity: 'Épica',
      rarityColor: '#ec4899',
      price: 420,
      particleColor: '#fbbf24'
    },
    {
      id: 'phoenix',
      name: 'Fênix Mística',
      icon: '🔥',
      rarity: 'Lendária',
      rarityColor: '#f59e0b',
      price: 650,
      particleColor: '#ef4444'
    },
    {
      id: 'cosmic',
      name: 'Galáctico',
      icon: '🌌',
      rarity: 'Lendária',
      rarityColor: '#f59e0b',
      price: 950,
      particleColor: '#c084fc'
    }
  ];

  // Acesso seguro ao localStorage (evita SecurityError ao rodar por file:/// ou janelas anônimas)
  const safeStorage = {
    get(key, fallback = null) {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, val);
      } catch (e) {}
    }
  };

  // Sistema de Economia e Inventário de Skins
  let coins = parseInt(safeStorage.get('flying_coins') || '0', 10);
  if (isNaN(coins) || coins < 0) coins = 0;
  let lastCoinsEarned = 0;

  let unlockedSkins = [];
  try {
    const storedUnlocked = safeStorage.get('flying_unlocked_skins');
    if (storedUnlocked) {
      unlockedSkins = JSON.parse(storedUnlocked);
    }
  } catch (e) {
    unlockedSkins = [];
  }
  if (!Array.isArray(unlockedSkins) || unlockedSkins.length === 0) {
    unlockedSkins = ['classic_hd'];
  }
  if (!unlockedSkins.includes('classic_hd')) {
    unlockedSkins.push('classic_hd');
  }

  function isSkinUnlocked(skinId) {
    return unlockedSkins.includes(skinId);
  }

  function saveInventory() {
    safeStorage.set('flying_coins', coins.toString());
    safeStorage.set('flying_unlocked_skins', JSON.stringify(unlockedSkins));
    safeStorage.set('flying_skin_index', currentSkinIndex.toString());
  }

  let currentSkinIndex = parseInt(safeStorage.get('flying_skin_index') || '0', 10);
  if (isNaN(currentSkinIndex) || currentSkinIndex < 0 || currentSkinIndex >= SKINS.length || !isSkinUnlocked(SKINS[currentSkinIndex].id)) {
    currentSkinIndex = 0;
  }
  let skinToastTimer = 0;

  // Estados e Navegação da Loja
  let shopPage = 0; // 0 = Pág 1 (skins 0..3), 1 = Pág 2 (skins 4..7)
  const SKINS_PER_PAGE = 4;
  let shopToastMessage = '';
  let shopToastTimer = 0;
  let shopToastColor = '#facc15';

  function showShopToast(msg, color = '#facc15') {
    shopToastMessage = msg;
    shopToastColor = color;
    shopToastTimer = 90;
  }

  function openShop() {
    if (currentState === STATE.PLAYING) return;
    previousState = currentState;
    currentState = STATE.SHOP;
    updateUIState();
    playSound('swoosh');
  }

  function closeShop() {
    if (currentState !== STATE.SHOP) return;
    currentState = (previousState === STATE.GAMEOVER) ? STATE.GAMEOVER : STATE.READY;
    updateUIState();
    playSound('swoosh');
  }

  function buyOrEquipSkin(skinIndex) {
    if (skinIndex < 0 || skinIndex >= SKINS.length) return;
    const skin = SKINS[skinIndex];

    if (isSkinUnlocked(skin.id)) {
      currentSkinIndex = skinIndex;
      saveInventory();
      if (skinIcon) skinIcon.textContent = skin.icon;
      showShopToast(`Equipado: ${skin.icon} ${skin.name}`, '#34d399');
      playSound('swoosh');
    } else {
      if (coins >= skin.price) {
        coins -= skin.price;
        unlockedSkins.push(skin.id);
        currentSkinIndex = skinIndex;
        saveInventory();
        if (skinIcon) skinIcon.textContent = skin.icon;
        showShopToast(`Comprado: ${skin.icon} ${skin.name}!`, '#38bdf8');
        playSound('buy');
      } else {
        const missing = skin.price - coins;
        showShopToast(`Faltam 🪙 ${missing} moedas!`, '#ef4444');
        playSound('error');
        screenShake = 6;
      }
    }
  }

  // Dimensões nativas
  const GAME_WIDTH = 360;
  const GAME_HEIGHT = 640;
  const GROUND_HEIGHT = 112;
  const GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT;

  // Estados do jogo
  const STATE = {
    READY: 0,
    PLAYING: 1,
    GAMEOVER: 2,
    PAUSED: 3,
    SHOP: 4
  };

  let currentState = STATE.READY;
  let previousState = STATE.READY;
  let frames = 0;
  let score = 0;

  // Modos de Jogo
  const GAME_MODE = {
    NORMAL: 'normal',
    TURBO: 'turbo'
  };

  let currentMode = safeStorage.get('flying_game_mode', GAME_MODE.NORMAL);
  if (currentMode !== GAME_MODE.NORMAL && currentMode !== GAME_MODE.TURBO) {
    currentMode = GAME_MODE.NORMAL;
  }

  // Recordes separados por modo
  let bestScoreNormal = parseInt(safeStorage.get('flying_best_score_normal') || safeStorage.get('flying_best_score') || '0', 10);
  let bestScoreTurbo = parseInt(safeStorage.get('flying_best_score_turbo') || '0', 10);

  function getBestScore() {
    return currentMode === GAME_MODE.TURBO ? bestScoreTurbo : bestScoreNormal;
  }

  function setMode(newMode) {
    if (currentState !== STATE.READY) return;
    currentMode = newMode;
    safeStorage.set('flying_game_mode', currentMode);
    playSound('swoosh');
  }

  function toggleMode() {
    setMode(currentMode === GAME_MODE.NORMAL ? GAME_MODE.TURBO : GAME_MODE.NORMAL);
  }

  let isNewRecord = false;
  let isMuted = (safeStorage.get('flying_muted') ?? safeStorage.get('flappy_muted')) === 'true';
  let gameOverTime = 0;
  let scoreCounterAnimation = 0;
  let scoreScale = 1.0;

  // Efeitos visuais (Screen Shake e Flash)
  let screenShake = 0;
  let flashAlpha = 0;

  // Atualizar ícones iniciais
  soundIcon.textContent = isMuted ? '🔇' : '🔊';
  if (skinIcon) skinIcon.textContent = SKINS[currentSkinIndex].icon;

  // ----------------------------------------------------
  // SINTETIZADOR DE ÁUDIO (Web Audio API - Sem arquivos externos)
  // ----------------------------------------------------
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    try {
      if (type === 'flap') {
        // Pulo / Bater asas: frequência subindo suavemente
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

      } else if (type === 'score') {
        // Ponto: Dois tons harmoniosos agudos brilhantes
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc2.frequency.setValueAtTime(880, now + 0.08); // A5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0.2, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc1.stop(now + 0.08);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.28);

      } else if (type === 'hit') {
        // Batida / Impacto: ruído e onda grave rápida
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);

      } else if (type === 'die') {
        // Queda final
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.38);

      } else if (type === 'swoosh') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        osc.stop(now + 0.1);
      } else if (type === 'coin') {
        // Moeda: som metálico brilhante duplo
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain1.gain.setValueAtTime(0.22, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.28);

      } else if (type === 'buy') {
        // Compra na loja: acorde triunfante de 4 notas ascendentes
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0.18, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.25);
        });

      } else if (type === 'error') {
        // Erro / moedas insuficientes: tom descendente grave
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.setValueAtTime(80, now + 0.09);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      // Ignora pequenos erros de contexto de áudio
    }
  }

  // Alternar mudo
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    safeStorage.set('flying_muted', isMuted ? 'true' : 'false');
    soundIcon.textContent = isMuted ? '🔇' : '🔊';
  });

  // Alternar skin do pássaro (cicla apenas entre skins que o jogador já desbloqueou)
  function cycleSkin() {
    if (currentState !== STATE.READY) return;

    initAudio();
    let nextIndex = currentSkinIndex;
    for (let i = 1; i <= SKINS.length; i++) {
      const candidate = (currentSkinIndex + i) % SKINS.length;
      if (isSkinUnlocked(SKINS[candidate].id)) {
        nextIndex = candidate;
        break;
      }
    }

    currentSkinIndex = nextIndex;
    saveInventory();
    if (skinIcon) skinIcon.textContent = SKINS[currentSkinIndex].icon;
    skinToastTimer = 90; // Exibe aviso por 1.5s
    playSound('swoosh');
  }

  // Atualiza visibilidade dos botões da interface conforme o estado
  function updateUIState() {
    if (skinBtn) {
      if (currentState === STATE.READY) {
        skinBtn.classList.remove('hidden');
      } else {
        skinBtn.classList.add('hidden');
      }
    }

    if (shopBtn) {
      if (currentState === STATE.READY || currentState === STATE.GAMEOVER || currentState === STATE.SHOP) {
        shopBtn.classList.remove('hidden');
      } else {
        shopBtn.classList.add('hidden');
      }
    }

    if (pauseBtn) {
      if (currentState === STATE.PLAYING || currentState === STATE.PAUSED) {
        pauseBtn.classList.remove('hidden');
      } else {
        pauseBtn.classList.add('hidden');
      }
    }
  }

  if (skinBtn) {
    skinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleSkin();
    });
  }

  if (shopBtn) {
    shopBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentState === STATE.SHOP) {
        closeShop();
      } else {
        openShop();
      }
    });
  }
  // Alternar pausa
  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });

  function togglePause() {
    if (currentState === STATE.PLAYING) {
      previousState = currentState;
      currentState = STATE.PAUSED;
      pauseIcon.textContent = '▶️';
    } else if (currentState === STATE.PAUSED) {
      currentState = previousState;
      pauseIcon.textContent = '⏸️';
    }
  }

  // ----------------------------------------------------
  // SISTEMA DE PARTÍCULAS
  // ----------------------------------------------------
  const particles = [];

  function addExplosion(x, y, color = '#facc15', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: Math.random() * 3.5 + 1.5,
        color: color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravidade na partícula
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ----------------------------------------------------
  // NUVENS E CENÁRIO EM PARALLAX
  // ----------------------------------------------------
  const clouds = [
    { x: 40, y: 80, scale: 1.1, speed: 0.35 },
    { x: 190, y: 140, scale: 0.8, speed: 0.25 },
    { x: 310, y: 60, scale: 1.0, speed: 0.4 }
  ];

  const citySilhouettes = [
    { x: 0, w: 50, h: 70 },
    { x: 45, w: 40, h: 90 },
    { x: 80, w: 55, h: 60 },
    { x: 130, w: 45, h: 100 },
    { x: 170, w: 60, h: 75 },
    { x: 225, w: 50, h: 85 },
    { x: 270, w: 45, h: 65 },
    { x: 310, w: 55, h: 95 }
  ];

  let groundScrollOffset = 0;
  let cityScrollOffset = 0;

  function updateBackground() {
    if (currentState === STATE.GAMEOVER || currentState === STATE.PAUSED) return;

    const currentSpeed = (typeof pipes !== 'undefined' && pipes.currentSpeed) ? pipes.currentSpeed : 2.4;
    const speedRatio = currentSpeed / 2.4;

    // Movimentação das nuvens
    clouds.forEach(c => {
      c.x -= c.speed * speedRatio;
      if (c.x < -80 * c.scale) {
        c.x = GAME_WIDTH + 40;
        c.y = 50 + Math.random() * 120;
      }
    });

    // Movimento do cenário e do chão
    cityScrollOffset = (cityScrollOffset + 0.6 * speedRatio) % 360;
    groundScrollOffset = (groundScrollOffset + currentSpeed) % 24;
  }

  function drawSkyAndCity() {
    // Gradiente do Céu Flappy
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, '#4ec0ca');
    skyGrad.addColorStop(0.75, '#85d9e3');
    skyGrad.addColorStop(1, '#bcf2f7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

    // Desenhar Nuvens
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    clouds.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.arc(18, -8, 22, 0, Math.PI * 2);
      ctx.arc(36, 0, 18, 0, Math.PI * 2);
      ctx.arc(18, 10, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Silhueta dos Prédios/Cidade ao fundo
    ctx.save();
    ctx.fillStyle = '#9fe3ba';
    for (let loop = 0; loop < 2; loop++) {
      const offsetX = loop * 360 - cityScrollOffset;
      citySilhouettes.forEach(b => {
        const bx = offsetX + b.x;
        if (bx + b.w > -10 && bx < GAME_WIDTH + 10) {
          ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);
          // Janelas retro simples
          ctx.fillStyle = '#b7edd0';
          for (let wy = GROUND_Y - b.h + 8; wy < GROUND_Y - 12; wy += 14) {
            for (let wx = bx + 6; wx < bx + b.w - 8; wx += 10) {
              ctx.fillRect(wx, wy, 4, 6);
            }
          }
          ctx.fillStyle = '#9fe3ba';
        }
      });
    }

    // Arbustos e colinas verdes suaves à frente da cidade
    ctx.fillStyle = '#79d19a';
    for (let x = -30; x < GAME_WIDTH + 40; x += 36) {
      ctx.beginPath();
      ctx.arc(x, GROUND_Y + 5, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGround() {
    // Faixa de grama superior
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 14);

    // Borda superior da grama em relevo
    ctx.fillStyle = '#8ce036';
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 4);

    // Linha escura de divisão
    ctx.fillStyle = '#558022';
    ctx.fillRect(0, GROUND_Y + 14, GAME_WIDTH, 3);

    // Terra / Chão com listras diagonais clássicas
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, GROUND_Y + 17, GAME_WIDTH, GROUND_HEIGHT - 17);

    // Listras decorativas diagonais em movimento
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, GROUND_Y + 17, GAME_WIDTH, GROUND_HEIGHT - 17);
    ctx.clip();

    ctx.fillStyle = '#cbb870';
    for (let x = -24; x < GAME_WIDTH + 48; x += 18) {
      const currentX = x - groundScrollOffset;
      ctx.beginPath();
      ctx.moveTo(currentX, GROUND_Y + 17);
      ctx.lineTo(currentX + 10, GROUND_Y + 17);
      ctx.lineTo(currentX - 6, GAME_HEIGHT);
      ctx.lineTo(currentX - 16, GAME_HEIGHT);
      ctx.fill();
    }
    ctx.restore();
  }

  // ----------------------------------------------------
  // PÁSSARO (BIRD)
  // ----------------------------------------------------
  const bird = {
    x: 80,
    y: 260,
    radius: 13,
    width: 34,
    height: 24,
    gravity: 0.28,
    jumpImpulse: -6.0,
    velocity: 0,
    rotation: 0,
    flapIndex: 0,
    hoverOffset: 0,

    reset() {
      this.x = 80;
      this.y = 260;
      this.velocity = 0;
      this.rotation = 0;
      this.flapIndex = 0;
      this.hoverOffset = 0;
    },

    flap() {
      initAudio();
      this.velocity = this.jumpImpulse;
      playSound('flap');

      // Partículas de penas/rastro ao bater asas
      const skin = SKINS[currentSkinIndex];
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: this.x - 12,
          y: this.y + (Math.random() - 0.5) * 8,
          vx: -2.5 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: Math.random() * 2.5 + 1.5,
          color: skin.particleColor,
          alpha: 0.85,
          decay: 0.05
        });
      }
    },

    update() {
      if (currentState === STATE.READY) {
        // Animação de flutuação suave antes de começar
        this.hoverOffset = Math.sin(frames * 0.1) * 6;
        this.flapIndex = Math.floor((frames / 7) % 3);
        this.rotation = 0;
        return;
      }

      if (currentState === STATE.PLAYING) {
        this.velocity += this.gravity;
        if (this.velocity > 9) this.velocity = 9;

        this.y += this.velocity;

        // Rotação suave baseada na velocidade
        if (this.velocity < 0) {
          this.rotation = Math.max(-0.45, this.rotation - 0.12);
        } else {
          this.rotation = Math.min(1.4, this.rotation + 0.05);
        }

        // Bater asas
        if (this.velocity < 2) {
          this.flapIndex = Math.floor((frames / 5) % 3);
        } else {
          this.flapIndex = 1;
        }

        // Rastro de vento aerodinâmico em velocidade alta
        if (frames % 4 === 0 && Math.abs(this.velocity) > 1.6) {
          particles.push({
            x: this.x - 14,
            y: this.y + (Math.random() - 0.5) * 5,
            vx: -2.2,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 1.8 + 1,
            color: SKINS[currentSkinIndex].particleColor,
            alpha: 0.5,
            decay: 0.04
          });
        }

        // Colisão com o teto
        if (this.y - this.radius < 0) {
          this.y = this.radius;
          this.velocity = 0;
        }

        // Colisão com o chão
        if (this.y + this.radius >= GROUND_Y) {
          this.y = GROUND_Y - this.radius;
          triggerGameOver(true);
        }
      } else if (currentState === STATE.GAMEOVER) {
        if (this.y + this.radius < GROUND_Y) {
          this.velocity += this.gravity * 1.5;
          this.y += this.velocity;
          this.rotation = Math.min(1.5, this.rotation + 0.1);
        } else {
          this.y = GROUND_Y - this.radius;
        }
      }
    },

    drawSkin(skinId) {
      if (skinId === 'aviator') {
        this.drawAviatorSkin();
      } else if (skinId === 'gentleman') {
        this.drawGentlemanSkin();
      } else if (skinId === 'bat') {
        this.drawBatSkin();
      } else if (skinId === 'cyber') {
        this.drawCyberSkin();
      } else if (skinId === 'king') {
        this.drawKingSkin();
      } else if (skinId === 'phoenix') {
        this.drawPhoenixSkin();
      } else if (skinId === 'cosmic') {
        this.drawCosmicSkin();
      } else {
        this.drawClassicHDSkin();
      }
    },

    draw() {
      ctx.save();
      const drawY = currentState === STATE.READY ? (this.y + this.hoverOffset) : this.y;
      ctx.translate(this.x, drawY);
      ctx.rotate(this.rotation);

      // Sombra sutil projetada
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      this.drawSkin(SKINS[currentSkinIndex].id);

      ctx.restore();
    },
    // --- SKIN: LORDE CARTOLA (Penas safira, cartola de feltro, monóculo e gravata borboleta) ---
    drawGentlemanSkin() {
      // Penas da cauda nobre
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(-24, -6);
      ctx.lineTo(-20, 2);
      ctx.lineTo(-24, 8);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Corpo azul safira com iluminação aristocrática
      const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
      bodyGrad.addColorStop(0, '#93c5fd');
      bodyGrad.addColorStop(0.35, '#3b82f6');
      bodyGrad.addColorStop(0.8, '#1d4ed8');
      bodyGrad.addColorStop(1, '#1e3a8a');

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Peitoral elegante / Camisa branca de smoking
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(-1, 4, 10, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gravata borboleta vermelha escarlate
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(3, 4);
      ctx.lineTo(8, 2);
      ctx.lineTo(8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3, 4);
      ctx.lineTo(-2, 2);
      ctx.lineTo(-2, 7);
      ctx.closePath();
      ctx.fill();
      // Nó da gravata
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(3, 4.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Olho com Monóculo de Ouro
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(7, -4, 6.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila expressiva
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(8.5, -4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Brilho do olho
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.5, -5.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Aro do Monóculo Dourado com reflexo de vidro
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(7, -4, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Correntinha do monóculo
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(13, -1);
      ctx.quadraticCurveTo(15, 6, 9, 8);
      ctx.stroke();

      // Cartola estilosa sobre a cabeça
      // Aba da cartola
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-4, -12, 12, 3.5, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Copa da cartola
      const hatGrad = ctx.createLinearGradient(-10, -25, 2, -12);
      hatGrad.addColorStop(0, '#334155');
      hatGrad.addColorStop(0.5, '#1e293b');
      hatGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = hatGrad;
      ctx.beginPath();
      ctx.rect(-10, -25, 12, 13);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-10, -25, 12, 13);

      // Fita vermelha de cetim na cartola
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-10, -16, 12, 3.5);

      // Fivela dourada
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-6, -16, 4, 3.5);

      // Bico clássico
      ctx.fillStyle = '#f97316';
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, -1);
      ctx.lineTo(20, 3.5);
      ctx.lineTo(9, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Asa real
      this.drawModernWing('#2563eb', '#1e3a8a', '#0f172a');
    },

    // --- SKIN: PÁSSARO MORCEGO (Vampírico, orelhas pontudas, presas sutis e asas de couro) ---
    drawBatSkin() {
      // Penas da cauda sombria
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(-24, -6);
      ctx.lineTo(-19, 2);
      ctx.lineTo(-24, 8);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Orelhas de morcego pontiagudas
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#09071b';
      ctx.lineWidth = 1.5;
      // Orelha esquerda
      ctx.beginPath();
      ctx.moveTo(-12, -9);
      ctx.lineTo(-15, -21);
      ctx.lineTo(-7, -13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Orelha direita
      ctx.beginPath();
      ctx.moveTo(-4, -11);
      ctx.lineTo(-2, -22);
      ctx.lineTo(3, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Interior rosado/roxo da orelha
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(-12, -11);
      ctx.lineTo(-14, -18);
      ctx.lineTo(-8, -13);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-3, -12);
      ctx.lineTo(-2, -19);
      ctx.lineTo(1, -12);
      ctx.closePath();
      ctx.fill();

      // Corpo com gradiente de meia-noite
      const batGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
      batGrad.addColorStop(0, '#64748b');
      batGrad.addColorStop(0.35, '#334155');
      batGrad.addColorStop(0.75, '#1e1b4b');
      batGrad.addColorStop(1, '#09071b');

      ctx.fillStyle = batGrad;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Barriga cinza fumaça
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(-2, 3.5, 10, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Olhos Carmesim Brilhantes (Olhos de vampiro)
      ctx.fillStyle = '#fee2e2';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(7, -4, 6.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila vermelha luminosa
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(8.5, -4, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(8.8, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Brilho agudo
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.5, -5.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Bico escuro afiado
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, -1);
      ctx.lineTo(21, 3.5);
      ctx.lineTo(9, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Presinhas vampíricas brancas
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(11, 4.5);
      ctx.lineTo(13, 8);
      ctx.lineTo(14, 4.5);
      ctx.closePath();
      ctx.fill();

      // Asa de couro recortada com membrana roxa
      this.drawModernWing('#6b21a8', '#2e1065', '#a855f7');
    },

    // --- SKIN: REI DOURADO (Plumagem branca nobre, manto real carmim e coroa de ouro maciço com rubi) ---
    drawKingSkin() {
      // Penas da cauda imperial
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(-24, -6);
      ctx.lineTo(-20, 2);
      ctx.lineTo(-24, 8);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Manto real carmim por trás do pescoço
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.quadraticCurveTo(-18, 5, -12, 14);
      ctx.lineTo(-6, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Corpo branco perolado imperial
      const kingGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
      kingGrad.addColorStop(0, '#ffffff');
      kingGrad.addColorStop(0.4, '#f8fafc');
      kingGrad.addColorStop(0.8, '#e2e8f0');
      kingGrad.addColorStop(1, '#94a3b8');

      ctx.fillStyle = kingGrad;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Barriga de arminho com pontinhos nobres
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(-2, 3.5, 11, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Olho confiante régio
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(7, -4, 6.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila safira régia
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(8.5, -4, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.5, -5.5, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Bico Dourado Polido
      const beakGrad = ctx.createLinearGradient(9, -1, 21, 7);
      beakGrad.addColorStop(0, '#fef08a');
      beakGrad.addColorStop(0.5, '#f59e0b');
      beakGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = beakGrad;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(9, -1);
      ctx.lineTo(21, 3.5);
      ctx.lineTo(9, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Coroa de Ouro com 3 pontas e rubi central
      const crownGrad = ctx.createLinearGradient(-8, -24, 6, -11);
      crownGrad.addColorStop(0, '#fef08a');
      crownGrad.addColorStop(0.5, '#f59e0b');
      crownGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = crownGrad;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(-8, -20);
      ctx.lineTo(-4, -15);
      ctx.lineTo(0, -23); // Ponta central mais alta
      ctx.lineTo(4, -15);
      ctx.lineTo(8, -20);
      ctx.lineTo(8, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bolinhas de pérola nas pontas da coroa
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8, -20, 1.8, 0, Math.PI * 2);
      ctx.arc(0, -23, 2.2, 0, Math.PI * 2);
      ctx.arc(8, -20, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Rubi reluzente incrustado no centro da coroa
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -15.5, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-0.6, -16.2, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Asa Dourada
      this.drawModernWing('#fbbf24', '#d97706', '#78350f');
    },

    // --- SKIN: GALÁCTICO (Nebulosa cósmica, auréola orbital e poeira estelar) ---
    drawCosmicSkin() {
      // Penas da cauda de poeira estelar
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(-24, -6);
      ctx.lineTo(-19, 2);
      ctx.lineTo(-24, 8);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Auréola orbital estelar inclinada ao redor do corpo
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 8, -0.35, 0, Math.PI * 2);
      ctx.stroke();

      // Ponto de luz cintilante na órbita
      const orbitAngle = frames * 0.1;
      const ox = Math.cos(orbitAngle) * 23;
      const oy = Math.sin(orbitAngle) * 7.5;
      const rotOx = ox * Math.cos(-0.35) - oy * Math.sin(-0.35);
      const rotOy = ox * Math.sin(-0.35) + oy * Math.cos(-0.35);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rotOx, rotOy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Corpo Nebulosa Cósmica
      const cosmicGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
      cosmicGrad.addColorStop(0, '#e879f9');
      cosmicGrad.addColorStop(0.3, '#818cf8');
      cosmicGrad.addColorStop(0.7, '#4f46e5');
      cosmicGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = cosmicGrad;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Estrelinhas cintilantes no corpo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -4, 2, 2);
      ctx.fillRect(-2, 4, 1.5, 1.5);
      ctx.fillRect(4, 5, 2, 2);

      // Olho Cósmico Brilhante
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(7, -4, 6.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila com brilho estelar
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(8.5, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(8.5, -4, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Bico Cristalino Cósmico
      const beakGrad = ctx.createLinearGradient(9, -1, 21, 7);
      beakGrad.addColorStop(0, '#38bdf8');
      beakGrad.addColorStop(0.6, '#a855f7');
      beakGrad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = beakGrad;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, -1);
      ctx.lineTo(21, 3.5);
      ctx.lineTo(9, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Asa Galáctica
      this.drawModernWing('#c084fc', '#4f46e5', '#38bdf8');
    },

    // --- SKIN 1: AVIADOR MODERNO (Óculos de aviador retrô-futurista, topete e iluminação 3D) ---
    drawAviatorSkin() {
      // Penas do topete estiloso
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(-9, -12, 3.5, 7, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-7, -13, 3, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Penas da cauda aerodinâmica
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(-24, -5);
      ctx.lineTo(-20, 2);
      ctx.lineTo(-24, 8);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Corpo com gradiente radial volumétrico moderno
      const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
      bodyGrad.addColorStop(0, '#fde047');
      bodyGrad.addColorStop(0.35, '#f59e0b');
      bodyGrad.addColorStop(0.8, '#ea580c');
      bodyGrad.addColorStop(1, '#9a3412');

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Brilho especular curvo no topo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 14.5, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();

      // Barriga macia em tom creme
      const bellyGrad = ctx.createLinearGradient(-4, 0, 0, 12);
      bellyGrad.addColorStop(0, '#fef9c3');
      bellyGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = bellyGrad;
      ctx.beginPath();
      ctx.ellipse(-2, 3.5, 11, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bochecha rosada (blush suave)
      ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.beginPath();
      ctx.ellipse(4, 5, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Olho expressivo de desenho moderno
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(7, -4, 6.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila profunda
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(8.5, -4, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Brilho duplo nos olhos (efeito anime/moderno)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.5, -5.8, 1.4, 0, Math.PI * 2);
      ctx.arc(9.6, -2.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Bico aerodinâmico curvado com gradiente e luz
      const beakGrad = ctx.createLinearGradient(9, -2, 21, 8);
      beakGrad.addColorStop(0, '#fb923c');
      beakGrad.addColorStop(0.5, '#ea580c');
      beakGrad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = beakGrad;
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(9, -2);
      ctx.quadraticCurveTo(17, -1, 21, 3);
      ctx.quadraticCurveTo(16, 7, 9, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Linha do meio da boca
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(10, 3);
      ctx.lineTo(19, 3);
      ctx.stroke();

      // Óculos de Aviador na testa
      // Faixa de couro marrom
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-16, -5);
      ctx.lineTo(0, -9);
      ctx.stroke();

      // Aro dourado metálico dos óculos
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-4, -15, 12, 9, 3);
      } else {
        ctx.rect(-4, -15, 12, 9);
      }
      ctx.fill();
      ctx.stroke();

      // Lente turquesa/ciano com reflexo
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2, -13, 8, 5);

      // Reflexo de luz na lente
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(3, -13);
      ctx.lineTo(1, -8);
      ctx.lineTo(-2, -8);
      ctx.closePath();
      ctx.fill();

      // Asa moderna desenhada em camadas
      this.drawModernWing('#f59e0b', '#d97706', '#78350f');
    },

    // --- SKIN 2: CYBERPUNK NEON (Chassi furtivo escuro com visores e leds ciano) ---
    drawCyberSkin() {
      // Antena/crista cyber
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-12, -14, 4, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-10, -16, 2, 4);

      // Propulsores traseiros
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-22, -3, 8, 7);
      ctx.fillRect(-22, -3, 8, 7);

      // Chama do propulsor
      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.moveTo(-22, -1);
      ctx.lineTo(-28 - Math.random() * 4, 0.5);
      ctx.lineTo(-22, 2);
      ctx.closePath();
      ctx.fill();

      // Corpo metálico grafite escuro com contorno neon
      const cyberGrad = ctx.createLinearGradient(-10, -10, 16, 12);
      cyberGrad.addColorStop(0, '#334155');
      cyberGrad.addColorStop(0.5, '#1e293b');
      cyberGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = cyberGrad;
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Linhas de circuito neon
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(-2, 2);
      ctx.lineTo(2, 6);
      ctx.stroke();

      // Visor Holográfico Neon (em vez de olho comum)
      const visorGrad = ctx.createLinearGradient(4, -8, 14, 2);
      visorGrad.addColorStop(0, '#ec4899');
      visorGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = visorGrad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(4, -7, 10, 8, 3);
      } else {
        ctx.rect(4, -7, 10, 8);
      }
      ctx.fill();
      ctx.stroke();

      // Linha de scanline/brilho no visor
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(5, -5, 8, 1.8);

      // Bico Cyber cromado
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(9, -2);
      ctx.lineTo(21, 3);
      ctx.lineTo(9, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Asa robótica com neon
      this.drawModernWing('#0284c7', '#0f172a', '#00f2fe');
    },

    // --- SKIN 3: FÊNIX MÍSTICA (Plumagem de fogo radiante) ---
    drawPhoenixSkin() {
      // 3 Penas de chama na crista
      const flameFlicker = Math.sin(frames * 0.2) * 2;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(-10, -13 + flameFlicker, 4, 9, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(-7, -15 - flameFlicker, 3.5, 8, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(-4, -13, 2.5, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Cauda flamejante
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(-13, -3);
      ctx.lineTo(-26, -7);
      ctx.lineTo(-22, 2);
      ctx.lineTo(-27, 9);
      ctx.lineTo(-12, 5);
      ctx.closePath();
      ctx.fill();

      // Corpo com gradiente de magma/fogo
      const fireGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, 18);
      fireGrad.addColorStop(0, '#fef08a');
      fireGrad.addColorStop(0.3, '#f97316');
      fireGrad.addColorStop(0.75, '#dc2626');
      fireGrad.addColorStop(1, '#7f1d1d');

      ctx.fillStyle = fireGrad;
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Olho místico de fênix
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(7, -4, 6.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila afiada rubi
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(8.5, -4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.5, -5.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Bico dourado flamejante
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(9, -2);
      ctx.quadraticCurveTo(17, -1, 21, 3);
      ctx.quadraticCurveTo(16, 7, 9, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Asa de fogo
      this.drawModernWing('#f97316', '#b91c1c', '#450a0a');
    },

    // --- SKIN 4: CLÁSSICO HD (Remasterização suave do design icônico) ---
    drawClassicHDSkin() {
      // Corpo Amarelo com iluminação 3D refinada
      const classicGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
      classicGrad.addColorStop(0, '#fef08a');
      classicGrad.addColorStop(0.4, '#facc15');
      classicGrad.addColorStop(0.85, '#eab308');
      classicGrad.addColorStop(1, '#ca8a04');

      ctx.fillStyle = classicGrad;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 12.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Barriga
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.ellipse(-2, 3.5, 11, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Olho
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(7, -5, 6.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila e reflexos
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(8.5, -5, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7.5, -6.5, 1.3, 0, Math.PI * 2);
      ctx.arc(9.5, -3.8, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Bico Laranja
      ctx.fillStyle = '#f97316';
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(20, 3.5);
      ctx.lineTo(9, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Asa HD
      this.drawModernWing('#fbbf24', '#d97706', '#1e293b');
    },

    // Renderizador compartilhado da asa dinâmica com penas esculpidas
    drawModernWing(primaryColor, darkColor, strokeColor) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;

      const wingGrad = ctx.createLinearGradient(-12, -4, -4, 8);
      wingGrad.addColorStop(0, primaryColor);
      wingGrad.addColorStop(1, darkColor);
      ctx.fillStyle = wingGrad;

      ctx.beginPath();
      if (this.flapIndex === 0) {
        // Asa batendo para cima
        ctx.moveTo(-4, 0);
        ctx.quadraticCurveTo(-15, -14, -6, -14);
        ctx.quadraticCurveTo(-1, -11, 2, -2);
        ctx.closePath();
      } else if (this.flapIndex === 1) {
        // Asa neutra / deslizando
        ctx.moveTo(-2, 0);
        ctx.quadraticCurveTo(-17, -2, -14, 5);
        ctx.quadraticCurveTo(-8, 9, 2, 2);
        ctx.closePath();
      } else {
        // Asa para baixo
        ctx.moveTo(-3, -1);
        ctx.quadraticCurveTo(-16, 12, -8, 14);
        ctx.quadraticCurveTo(0, 10, 3, 3);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      // Linha de detalhe nas penas
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (this.flapIndex === 0) {
        ctx.moveTo(-5, -2);
        ctx.lineTo(-8, -10);
      } else if (this.flapIndex === 1) {
        ctx.moveTo(-3, 1);
        ctx.lineTo(-11, 2);
      } else {
        ctx.moveTo(-3, 1);
        ctx.lineTo(-9, 9);
      }
      ctx.stroke();

      ctx.restore();
    }
  };

  // ----------------------------------------------------
  // CANOS (PIPES)
  // ----------------------------------------------------
  const pipes = {
    items: [],
    width: 56,
    gap: 135, // Abertura vertical entre os canos
    capHeight: 26,
    capOverhang: 3,
    baseSpeed: 2.4,
    currentSpeed: 2.4,
    spawnTimer: 0,
    spawnInterval: 95,

    getSpeed() {
      if (currentMode === GAME_MODE.TURBO) {
        // Modo Turbo: acelera suavemente (+0.05 por ponto) até o limite jogável de 3.6 px/frame
        return Math.min(3.6, this.baseSpeed + score * 0.05);
      }
      return this.baseSpeed;
    },

    getSpawnInterval() {
      // Mantém a distância entre canos uniforme em aprox 228 pixels
      return Math.round(228 / this.currentSpeed);
    },

    reset() {
      this.items = [];
      this.spawnTimer = 0;
      this.currentSpeed = this.baseSpeed;
      this.spawnInterval = 95;
    },

    update() {
      if (currentState !== STATE.PLAYING) return;

      this.currentSpeed = this.getSpeed();
      this.spawnInterval = this.getSpawnInterval();

      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;

        // Variação de altura dinâmica e segura
        const minTop = 60;
        const maxTop = GROUND_Y - this.gap - 60;
        const topPipeHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

        this.items.push({
          x: GAME_WIDTH + 10,
          top: topPipeHeight,
          passed: false
        });
      }

      // Mover canos e verificar pontuação/colisão
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.x -= this.currentSpeed;

        // Ponto marcado quando ultrapassa o centro do pássaro
        if (!p.passed && p.x + this.width < bird.x) {
          p.passed = true;
          score++;
          scoreScale = 1.25;
          playSound('score');
          addExplosion(p.x + this.width, p.top + this.gap / 2, '#38bdf8', 6);
        }

        // Detecção de Colisão
        if (checkCollision(bird, p)) {
          triggerGameOver(false);
          return;
        }

        // Remove canos que saíram da tela
        if (p.x < -this.width - 20) {
          this.items.splice(i, 1);
        }
      }
    },

    draw() {
      for (const p of this.items) {
        const bottomY = p.top + this.gap;
        const bottomHeight = GROUND_Y - bottomY;

        // --- CANO SUPERIOR ---
        drawSinglePipe(p.x, 0, this.width, p.top, true, this.capHeight, this.capOverhang);

        // --- CANO INFERIOR ---
        drawSinglePipe(p.x, bottomY, this.width, bottomHeight, false, this.capHeight, this.capOverhang);
      }
    }
  };

  /**
   * Desenha um cano estilizado com iluminação 3D retrô
   */
  function drawSinglePipe(x, y, width, height, isTop, capH, overhang) {
    if (height <= 0) return;

    ctx.save();

    // Gradiente do corpo do cano
    const pipeGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    pipeGrad.addColorStop(0, '#558022');
    pipeGrad.addColorStop(0.18, '#8ce036');
    pipeGrad.addColorStop(0.4, '#73bf2e');
    pipeGrad.addColorStop(0.85, '#558022');
    pipeGrad.addColorStop(1, '#2e4314');

    ctx.fillStyle = pipeGrad;
    ctx.strokeStyle = '#1e290b';
    ctx.lineWidth = 2.5;

    // Corpo
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Tampa / Borda do cano
    const capX = x - overhang;
    const capW = width + overhang * 2;
    const capY = isTop ? (y + height - capH) : y;

    const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, '#558022');
    capGrad.addColorStop(0.18, '#a6f74a');
    capGrad.addColorStop(0.4, '#73bf2e');
    capGrad.addColorStop(0.85, '#558022');
    capGrad.addColorStop(1, '#2e4314');

    ctx.fillStyle = capGrad;
    ctx.fillRect(capX, capY, capW, capH);
    ctx.strokeRect(capX, capY, capW, capH);

    // Linha de brilho branco especular retro no topo/borda
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(capX + 4, capY + 3, 5, capH - 6);

    ctx.restore();
  }

  // Detecção de colisão justa e precisa (hitbox circular do pássaro contra caixas)
  function checkCollision(b, p) {
    const margin = 2; // Margem de tolerância para jogabilidade justa
    const bx = b.x;
    const by = b.y;
    const r = b.radius - margin;

    const pipeLeft = p.x;
    const pipeRight = p.x + pipes.width;
    const topPipeBottom = p.top;
    const bottomPipeTop = p.top + pipes.gap;

    // Se o pássaro está horizontalmente no alcance do cano
    if (bx + r > pipeLeft && bx - r < pipeRight) {
      // Bateu no cano superior
      if (by - r < topPipeBottom) return true;
      // Bateu no cano inferior
      if (by + r > bottomPipeTop) return true;
    }

    return false;
  }

  // ----------------------------------------------------
  // GAME OVER & TRANSIÇÕES
  // ----------------------------------------------------
  function triggerGameOver(hitGround) {
    if (currentState === STATE.GAMEOVER) return;

    currentState = STATE.GAMEOVER;
    updateUIState();
    gameOverTime = Date.now();
    screenShake = 12;
    flashAlpha = 0.8;

    playSound('hit');
    if (!hitGround) {
      setTimeout(() => playSound('die'), 120);
    }

    // Explodir penas do pássaro
    addExplosion(bird.x, bird.y, '#facc15', 16);
    addExplosion(bird.x, bird.y, '#ffffff', 8);

    // Atualizar recorde conforme o modo atual
    if (currentMode === GAME_MODE.TURBO) {
      if (score > bestScoreTurbo) {
        bestScoreTurbo = score;
        isNewRecord = true;
        safeStorage.set('flying_best_score_turbo', bestScoreTurbo.toString());
      } else {
        isNewRecord = false;
      }
    } else {
      if (score > bestScoreNormal) {
        bestScoreNormal = score;
        isNewRecord = true;
        safeStorage.set('flying_best_score_normal', bestScoreNormal.toString());
        safeStorage.set('flying_best_score', bestScoreNormal.toString());
      } else {
        isNewRecord = false;
      }
    }

    // Cálculo de Moedas ganhas no desempenho da rodada:
    // Modo normal: 1 por ponto | Modo turbo: 2 por ponto
    const pointMult = (currentMode === GAME_MODE.TURBO) ? 2 : 1;
    let earned = score * pointMult;

    // Bônus por novo recorde
    let bonusRecord = 0;
    if (isNewRecord && score > 0) {
      bonusRecord = 5;
    }

    // Bônus por medalha conquistada
    let bonusMedal = 0;
    if (score >= 50) {
      bonusMedal = 35; // Platina
    } else if (score >= 35) {
      bonusMedal = 20; // Ouro
    } else if (score >= 20) {
      bonusMedal = 10; // Prata
    } else if (score >= 10) {
      bonusMedal = 5;  // Bronze
    }

    lastCoinsEarned = earned + bonusRecord + bonusMedal;
    coins += lastCoinsEarned;
    saveInventory();

    if (lastCoinsEarned > 0) {
      setTimeout(() => playSound('coin'), 350);
    }

    scoreCounterAnimation = 0;
  }
  function resetGame() {
    currentState = STATE.READY;
    updateUIState();
    score = 0;
    scoreScale = 1.0;
    bird.reset();
    pipes.reset();
    particles.length = 0;
    screenShake = 0;
    flashAlpha = 0;
    playSound('swoosh');
  }

  // ----------------------------------------------------
  // INTERFACE E MENUS
  // ----------------------------------------------------
  function drawScoreInGame() {
    if (currentState !== STATE.PLAYING) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = score.toString();
    const scoreY = 55;

    ctx.translate(GAME_WIDTH / 2, scoreY);
    ctx.scale(scoreScale, scoreScale);

    ctx.font = 'bold 42px "Lilita One", "Fredoka", "Impact", "Arial Black", sans-serif';

    // Sombra 3D projetada suave para contraste em qualquer fundo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillText(text, 0, 3.5);

    // Contorno preto espesso perfeitamente arredondado
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, 0, 0);

    // Preenchimento branco sólido de alta nitidez
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);

    ctx.restore();

    // Emblema de Velocidade no Modo Turbo
    if (currentMode === GAME_MODE.TURBO) {
      ctx.save();
      const mult = (pipes.currentSpeed / 2.4).toFixed(1);
      const isMax = pipes.currentSpeed >= 3.6;
      const badgeText = isMax ? `⚡ TURBO MAX (${mult}x)` : `⚡ TURBO ${mult}x`;
      ctx.font = '7.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';

      const badgeW = isMax ? 138 : 118;
      const badgeH = 18;
      const badgeX = GAME_WIDTH / 2 - badgeW / 2;
      const badgeY = 92;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isMax ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
      else ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isMax ? '#f87171' : '#fde047';
      ctx.fillText(badgeText, GAME_WIDTH / 2, badgeY + 12);
      ctx.restore();
    }
  }

  function drawReadyScreen() {
    if (currentState !== STATE.READY) return;

    ctx.save();
    ctx.textAlign = 'center';

    // Título FLYING BIRD
    const pulse = Math.sin(frames * 0.08) * 3;
    const titleY = 135 + pulse;

    ctx.font = '24px "Press Start 2P", monospace';
    // Sombra do título
    ctx.fillStyle = '#1e293b';
    ctx.fillText('FLYING BIRD', GAME_WIDTH / 2 + 3, titleY + 3);
    // Letras com gradiente dourado
    ctx.fillStyle = '#facc15';
    ctx.fillText('FLYING BIRD', GAME_WIDTH / 2, titleY);

    // Seletor / Badge da Skin Selecionada
    const skin = SKINS[currentSkinIndex];
    const skinCardY = 280;
    const skinCardW = 220;
    const skinCardH = 32;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(GAME_WIDTH / 2 - skinCardW / 2, skinCardY, skinCardW, skinCardH, 7);
    } else {
      ctx.rect(GAME_WIDTH / 2 - skinCardW / 2, skinCardY, skinCardW, skinCardH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = '8.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText(skin.icon + ' ' + skin.name, GAME_WIDTH / 2, skinCardY + 14);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('[S] ou Toque p/ Trocar Skin', GAME_WIDTH / 2, skinCardY + 25);

    // --- SELETOR DE MODOS DE JOGO (Cards lado a lado) ---
    const modeCardY = 322;
    const cardW = 105;
    const cardH = 46;
    const leftX = GAME_WIDTH / 2 - cardW - 5;
    const rightX = GAME_WIDTH / 2 + 5;

    // Card Modo Normal
    const isNormal = currentMode === GAME_MODE.NORMAL;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(leftX, modeCardY, cardW, cardH, 7);
    else ctx.rect(leftX, modeCardY, cardW, cardH);

    ctx.fillStyle = isNormal ? 'rgba(6, 78, 59, 0.9)' : 'rgba(15, 23, 42, 0.55)';
    ctx.fill();
    ctx.lineWidth = isNormal ? 2.5 : 1.2;
    ctx.strokeStyle = isNormal ? '#34d399' : '#475569';
    ctx.stroke();

    ctx.font = isNormal ? 'bold 8.5px "Press Start 2P", monospace' : '8px "Press Start 2P", monospace';
    ctx.fillStyle = isNormal ? '#a7f3d0' : '#94a3b8';
    ctx.fillText('🟢 NORMAL', leftX + cardW / 2, modeCardY + 16);

    ctx.font = '6.5px "Press Start 2P", monospace';
    ctx.fillStyle = isNormal ? '#6ee7b7' : '#64748b';
    ctx.fillText('Clássico', leftX + cardW / 2, modeCardY + 28);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = isNormal ? '#fde047' : '#64748b';
    ctx.fillText(`Top: ${bestScoreNormal}`, leftX + cardW / 2, modeCardY + 39);
    ctx.restore();

    // Card Modo Turbo
    const isTurbo = currentMode === GAME_MODE.TURBO;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rightX, modeCardY, cardW, cardH, 7);
    else ctx.rect(rightX, modeCardY, cardW, cardH);

    ctx.fillStyle = isTurbo ? 'rgba(120, 53, 15, 0.92)' : 'rgba(15, 23, 42, 0.55)';
    ctx.fill();
    ctx.lineWidth = isTurbo ? 2.5 : 1.2;
    ctx.strokeStyle = isTurbo ? '#f59e0b' : '#475569';
    ctx.stroke();

    ctx.font = isTurbo ? 'bold 8.5px "Press Start 2P", monospace' : '8px "Press Start 2P", monospace';
    ctx.fillStyle = isTurbo ? '#fde047' : '#94a3b8';
    ctx.fillText('⚡ TURBO', rightX + cardW / 2, modeCardY + 16);

    ctx.font = '6.5px "Press Start 2P", monospace';
    ctx.fillStyle = isTurbo ? '#fbbf24' : '#64748b';
    ctx.fillText('Progressivo', rightX + cardW / 2, modeCardY + 28);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = isTurbo ? '#fde047' : '#64748b';
    ctx.fillText(`Top: ${bestScoreTurbo}`, rightX + cardW / 2, modeCardY + 39);
    ctx.restore();

    // Dica de troca de modo
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('[M] ou Toque para escolher modo', GAME_WIDTH / 2, modeCardY + cardH + 10);

    // --- BOTÃO DA LOJA DE SKINS & SALDO DE MOEDAS ---
    const shopBannerY = 388;
    const shopBannerW = 216;
    const shopBannerH = 30;
    ctx.save();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.88)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(GAME_WIDTH / 2 - shopBannerW / 2, shopBannerY, shopBannerW, shopBannerH, 7);
    else ctx.rect(GAME_WIDTH / 2 - shopBannerW / 2, shopBannerY, shopBannerW, shopBannerH);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`🪙 ${coins}  |  🛒 [L] LOJA DE SKINS`, GAME_WIDTH / 2, shopBannerY + 19);
    ctx.restore();

    // Subtítulo / Instrução de Voo
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLIQUE OU ESPAÇO PARA VOAR', GAME_WIDTH / 2, 436);

    // Botão visual "JOGAR"
    const playBtnY = 450;
    const playBtnW = 136;
    const playBtnH = 32;
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(GAME_WIDTH / 2 - playBtnW / 2, playBtnY, playBtnW, playBtnH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(GAME_WIDTH / 2 - playBtnW / 2, playBtnY, playBtnW, playBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '9.5px "Press Start 2P", monospace';
    ctx.fillText('JOGAR', GAME_WIDTH / 2, playBtnY + 20);

    // Recorde Atual do modo selecionado
    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`🏆 RECORDE ${isTurbo ? 'TURBO' : 'NORMAL'}: ${getBestScore()}`, GAME_WIDTH / 2, 502);

    ctx.restore();
  }
  function drawGameOverModal() {
    if (currentState !== STATE.GAMEOVER) return;

    ctx.save();
    ctx.textAlign = 'center';

    // Banner "GAME OVER"
    const bannerY = 145;
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText('FIM DE JOGO', GAME_WIDTH / 2 + 3, bannerY + 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('FIM DE JOGO', GAME_WIDTH / 2, bannerY);

    // Placa de Pontuação (Scoreboard Card)
    const cardX = 35;
    const cardY = 190;
    const cardW = GAME_WIDTH - 70;
    const cardH = 175;

    // Fundo da placa estilo retrô
    ctx.fillStyle = '#ded895';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = '#55421c';
    ctx.lineWidth = 4;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Moldura interna
    ctx.fillStyle = '#f8f4cc';
    ctx.fillRect(cardX + 8, cardY + 8, cardW - 16, cardH - 16);

    // Medalha (à esquerda)
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#78350f';
    ctx.fillText('MEDALHA', cardX + 60, cardY + 35);

    drawMedal(cardX + 60, cardY + 85, score);

    // Textos de Pontuação (à direita)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b45309';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('PONTOS', cardX + cardW - 20, cardY + 35);

    const currentScoreText = Math.floor(scoreCounterAnimation).toString();
    ctx.font = 'bold 24px "Lilita One", "Fredoka", "Impact", "Arial Black", sans-serif';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.strokeText(currentScoreText, cardX + cardW - 20, cardY + 62);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(currentScoreText, cardX + cardW - 20, cardY + 62);

    ctx.fillStyle = '#b45309';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('MELHOR', cardX + cardW - 20, cardY + 95);

    const bestScoreText = getBestScore().toString();
    ctx.font = 'bold 24px "Lilita One", "Fredoka", "Impact", "Arial Black", sans-serif';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.strokeText(bestScoreText, cardX + cardW - 20, cardY + 122);
    ctx.fillStyle = '#fde047';
    ctx.fillText(bestScoreText, cardX + cardW - 20, cardY + 122);

    // Identificador do Modo jogado no Game Over
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = currentMode === GAME_MODE.TURBO ? '#ea580c' : '#15803d';
    ctx.textAlign = 'center';
    ctx.fillText(currentMode === GAME_MODE.TURBO ? '⚡ MODO TURBO' : '🟢 MODO NORMAL', cardX + cardW / 2, cardY + cardH - 24);

    // Moedas ganhas na partida e total
    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#b45309';
    ctx.fillText(`+${lastCoinsEarned} MOEDAS  (TOTAL: 🪙 ${coins})`, cardX + cardW / 2, cardY + cardH - 9);

    // Emblema "NOVO" se bateu o recorde
    if (isNewRecord) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cardX + cardW - 105, cardY + 84, 40, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NOVO!', cardX + cardW - 85, cardY + 94);
    }

    // Botão "IR PARA A LOJA"
    const goShopBtnY = 380;
    const goShopBtnW = 180;
    const goShopBtnH = 30;
    ctx.save();
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(GAME_WIDTH / 2 - goShopBtnW / 2, goShopBtnY, goShopBtnW, goShopBtnH, 6);
    else ctx.rect(GAME_WIDTH / 2 - goShopBtnW / 2, goShopBtnY, goShopBtnW, goShopBtnH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🛒 LOJA DE SKINS [L]', GAME_WIDTH / 2, goShopBtnY + 19);
    ctx.restore();

    // Botão / Instrução de Jogar Novamente
    const canRestart = Date.now() - gameOverTime > 450;
    if (canRestart) {
      const pulse = Math.floor((frames / 20) % 2) === 0;
      if (pulse) {
        ctx.textAlign = 'center';
        ctx.font = '8.5px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('CLIQUE OU ESPAÇO PARA REINICIAR', GAME_WIDTH / 2, 436);
      }
    }

    ctx.restore();
  }
  function drawMedal(x, y, pts) {
    ctx.save();

    // Se o jogador fez menos de 3 pontos: mostrar slot rebaixado da medalha com cadeado de incentivo
    if (pts < 3) {
      // Sombra do pedestal
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.ellipse(x, y + 22, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Círculo rebaixado (slot vazio da medalha)
      const emptyGrad = ctx.createLinearGradient(x - 22, y - 22, x + 22, y + 22);
      emptyGrad.addColorStop(0, '#cfc394');
      emptyGrad.addColorStop(1, '#e5dcad');
      ctx.fillStyle = emptyGrad;
      ctx.strokeStyle = '#b8aa75';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Borda interna tracejada
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#a69865';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cadeado Retrô centralizado
      ctx.fillStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(x, y - 4, 5, Math.PI, 0, false);
      ctx.stroke();

      // Corpo do cadeado
      ctx.fillRect(x - 6, y - 3, 12, 10);
      // Furo da chave
      ctx.fillStyle = '#f8f4cc';
      ctx.beginPath();
      ctx.arc(x, y + 1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Instrução clara abaixo do slot
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#92400e';
      ctx.textAlign = 'center';
      ctx.fillText('3+ PTS', x, y + 36);

      ctx.restore();
      return;
    }

    // Definir paleta e nível da medalha
    let tierName = 'BRONZE';
    let outerColor = '#78350f';
    let midColor = '#cd7f32';
    let innerLightColor = '#fde68a';
    let rimHighlight = '#fed7aa';
    let ribbonColor = '#dc2626';
    let ribbonStripe = '#fbbf24';

    if (pts >= 30) {
      // Platina / Diamante (30+ pontos)
      tierName = 'PLATINA';
      outerColor = '#1e293b';
      midColor = '#38bdf8';
      innerLightColor = '#e0f2fe';
      rimHighlight = '#ffffff';
      ribbonColor = '#7c3aed';
      ribbonStripe = '#38bdf8';
    } else if (pts >= 20) {
      // Ouro (20+ pontos)
      tierName = 'OURO';
      outerColor = '#854d0e';
      midColor = '#facc15';
      innerLightColor = '#fef08a';
      rimHighlight = '#ffffff';
      ribbonColor = '#dc2626';
      ribbonStripe = '#fde047';
    } else if (pts >= 10) {
      // Prata (10+ pontos)
      tierName = 'PRATA';
      outerColor = '#334155';
      midColor = '#94a3b8';
      innerLightColor = '#f8fafc';
      rimHighlight = '#ffffff';
      ribbonColor = '#0284c7';
      ribbonStripe = '#ffffff';
    }

    // 1. Sombra da medalha
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + 24, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Fita superior em 'V' com listras
    ctx.fillStyle = ribbonColor;
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 1.5;

    // Fita esquerda
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 28);
    ctx.lineTo(x - 3, y - 6);
    ctx.lineTo(x - 9, y - 6);
    ctx.lineTo(x - 20, y - 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fita direita
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 28);
    ctx.lineTo(x + 3, y - 6);
    ctx.lineTo(x + 9, y - 6);
    ctx.lineTo(x + 20, y - 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Listras decorativas da fita
    ctx.fillStyle = ribbonStripe;
    ctx.beginPath();
    ctx.moveTo(x - 17, y - 28);
    ctx.lineTo(x - 6, y - 6);
    ctx.lineTo(x - 8, y - 6);
    ctx.lineTo(x - 19, y - 28);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 17, y - 28);
    ctx.lineTo(x + 6, y - 6);
    ctx.lineTo(x + 8, y - 6);
    ctx.lineTo(x + 19, y - 28);
    ctx.closePath();
    ctx.fill();

    // 3. Aro exterior da medalha com gradiente chanfrado
    const medalRadius = 22;
    const rimGrad = ctx.createLinearGradient(x - medalRadius, y - medalRadius, x + medalRadius, y + medalRadius);
    rimGrad.addColorStop(0, rimHighlight);
    rimGrad.addColorStop(0.45, midColor);
    rimGrad.addColorStop(1, outerColor);

    ctx.fillStyle = rimGrad;
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, medalRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Disco central com relevo interior
    const innerGrad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 16);
    innerGrad.addColorStop(0, innerLightColor);
    innerGrad.addColorStop(0.7, midColor);
    innerGrad.addColorStop(1, outerColor);

    ctx.fillStyle = innerGrad;
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Estrela em relevo no centro da medalha
    drawMedalStar(x, y, 5, 8, 4, rimHighlight, outerColor);

    // 6. Brilho especular curvado no topo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 18, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();

    // 7. Brilho cintilante giratório (Sparkle)
    const sparkleAngle = frames * 0.05;
    const sparkleDist = 14;
    const sx = x + Math.cos(sparkleAngle) * sparkleDist;
    const sy = y + Math.sin(sparkleAngle) * sparkleDist;
    drawSparkle(sx, sy, (frames % 30 < 15 ? 4 : 2.5));

    // 8. Nome do nível da medalha abaixo dela
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = outerColor;
    ctx.textAlign = 'center';
    ctx.fillText(tierName, x, y + 36);

    ctx.restore();
  }

  // Desenha uma estrela entalhada de n pontas
  function drawMedalStar(cx, cy, spikes, outerRadius, innerRadius, fillStyle, strokeStyle) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Desenha brilho em formato de estrela cintilante de 4 pontas
  function drawSparkle(cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 1.5);
    ctx.quadraticCurveTo(cx, cy, cx + size * 1.5, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + size * 1.5);
    ctx.quadraticCurveTo(cx, cy, cx - size * 1.5, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - size * 1.5);
    ctx.fill();
    ctx.restore();
  }

  // ----------------------------------------------------
  // TELA DA LOJA DE SKINS (STATE.SHOP)
  // ----------------------------------------------------
  function drawShopModal() {
    if (currentState !== STATE.SHOP) return;

    ctx.save();

    // Fundo escuro semi-transparente cobrindo a tela
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Título Superior
    ctx.textAlign = 'center';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText('LOJA DE SKINS', GAME_WIDTH / 2 - 18, 38);

    // Botão [ ✕ ] Fechar no topo direito
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(288, 20, 52, 26, 6);
    else ctx.rect(288, 20, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('✕ SAIR', 314, 37);

    // Saldo Atual de Moedas
    const coinsBadgeY = 56;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(GAME_WIDTH / 2 - 80, coinsBadgeY, 160, 22, 5);
    else ctx.rect(GAME_WIDTH / 2 - 80, coinsBadgeY, 160, 22);
    ctx.fill();
    ctx.stroke();

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`SALDO: 🪙 ${coins}`, GAME_WIDTH / 2, coinsBadgeY + 15);

    // Grid 2x2 de Skins (4 por página)
    const startIdx = shopPage * SKINS_PER_PAGE;
    const visibleSkins = SKINS.slice(startIdx, startIdx + SKINS_PER_PAGE);

    const cardW = 148;
    const cardH = 162;
    const colXs = [24, 188];
    const rowYs = [88, 260];

    visibleSkins.forEach((skin, i) => {
      const skinIndex = startIdx + i;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cardX = colXs[col];
      const cardY = rowYs[row];
      const isEquipped = currentSkinIndex === skinIndex;
      const isUnlocked = isSkinUnlocked(skin.id);

      // Fundo do Card
      ctx.save();
      ctx.fillStyle = isEquipped ? 'rgba(6, 78, 59, 0.82)' : 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = isEquipped ? '#10b981' : skin.rarityColor;
      ctx.lineWidth = isEquipped ? 2.5 : 1.8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      else ctx.rect(cardX, cardY, cardW, cardH);
      ctx.fill();
      ctx.stroke();

      // Tag de Raridade no topo do card
      ctx.fillStyle = skin.rarityColor;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX + 8, cardY + 8, 62, 14, 4);
      else ctx.rect(cardX + 8, cardY + 8, 62, 14);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(skin.rarity.toUpperCase(), cardX + 39, cardY + 18);

      // Nome da Skin
      ctx.font = '7.5px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(skin.name, cardX + cardW / 2, cardY + 36);

      // Pré-visualização Animada do Pássaro no centro do Card
      ctx.save();
      const previewX = cardX + cardW / 2;
      const previewY = cardY + 76 + Math.sin((frames + i * 15) * 0.1) * 3;
      ctx.translate(previewX, previewY);

      // Sombra do pássaro na vitrine
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Renderiza a skin usando o próprio renderer do bird
      bird.drawSkin(skin.id);
      ctx.restore();

      // Botão de Ação (Equipado / Equipar / Comprar)
      const btnX = cardX + 10;
      const btnY = cardY + cardH - 32;
      const btnW = cardW - 20;
      const btnH = 24;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnW, btnH, 5);
      else ctx.rect(btnX, btnY, btnW, btnH);

      if (isEquipped) {
        ctx.fillStyle = '#059669';
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('✔ EM USO', btnX + btnW / 2, btnY + 15);
      } else if (isUnlocked) {
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('EQUIPAR', btnX + btnW / 2, btnY + 15);
      } else {
        const canAfford = coins >= skin.price;
        ctx.fillStyle = canAfford ? '#d97706' : '#475569';
        ctx.fill();
        ctx.strokeStyle = canAfford ? '#facc15' : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = canAfford ? '#fde047' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(`🪙 ${skin.price}`, btnX + btnW / 2, btnY + 15);
      }

      ctx.restore();
    });

    // Barra de Navegação de Páginas
    const navY = 432;
    // Botão Página Anterior
    ctx.save();
    ctx.fillStyle = shopPage > 0 ? '#1e293b' : 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = shopPage > 0 ? '#38bdf8' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(30, navY, 76, 26, 5);
    else ctx.rect(30, navY, 76, 26);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = shopPage > 0 ? '#ffffff' : '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('◀ ANT', 68, navY + 16);

    // Indicador Central de Página
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText(`PÁG ${shopPage + 1}/2`, GAME_WIDTH / 2, navY + 16);

    // Botão Próxima Página
    ctx.fillStyle = shopPage < 1 ? '#1e293b' : 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = shopPage < 1 ? '#38bdf8' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(GAME_WIDTH - 106, navY, 76, 26, 5);
    else ctx.rect(GAME_WIDTH - 106, navY, 76, 26);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = shopPage < 1 ? '#ffffff' : '#64748b';
    ctx.fillText('PRÓX ▶', GAME_WIDTH - 68, navY + 16);
    ctx.restore();

    // Botão Inferior "VOLTAR AO JOGO"
    const backBtnY = 470;
    const backBtnW = 180;
    const backBtnH = 32;
    ctx.save();
    ctx.fillStyle = '#e11d48';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(GAME_WIDTH / 2 - backBtnW / 2, backBtnY, backBtnW, backBtnH, 6);
    else ctx.rect(GAME_WIDTH / 2 - backBtnW / 2, backBtnY, backBtnW, backBtnH);
    ctx.fill();
    ctx.stroke();

    ctx.font = '8.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('✕ VOLTAR AO JOGO', GAME_WIDTH / 2, backBtnY + 20);
    ctx.restore();

    // Notificação Toast dentro da loja (mensagens de compra/erro)
    if (shopToastTimer > 0) {
      ctx.save();
      const alpha = Math.min(1, shopToastTimer / 18);
      ctx.globalAlpha = alpha;

      const toastY = 512;
      const toastW = 240;
      const toastH = 30;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
      ctx.strokeStyle = shopToastColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(GAME_WIDTH / 2 - toastW / 2, toastY, toastW, toastH, 6);
      else ctx.rect(GAME_WIDTH / 2 - toastW / 2, toastY, toastW, toastH);
      ctx.fill();
      ctx.stroke();

      ctx.font = '7.5px "Press Start 2P", monospace';
      ctx.fillStyle = shopToastColor;
      ctx.textAlign = 'center';
      ctx.fillText(shopToastMessage, GAME_WIDTH / 2, toastY + 18);
      ctx.restore();
    }

    ctx.restore();
  }
  function drawPauseScreen() {
    if (currentState !== STATE.PAUSED) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText('PAUSADO', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Pressione P ou Despause', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25);
    ctx.restore();
  }

  // ----------------------------------------------------
  // TRATAMENTO DE ENTRADAS (TOUCH / TECLADO / MOUSE)
  // ----------------------------------------------------
  // ----------------------------------------------------
  // TRATAMENTO DE ENTRADAS (TOUCH / TECLADO / MOUSE)
  // ----------------------------------------------------
  function handleAction(e, isClickOnCanvas = false) {
    initAudio();

    if (currentState === STATE.SHOP) {
      if (isClickOnCanvas && e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = (e.clientX !== undefined && e.clientX !== null) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = (e.clientY !== undefined && e.clientY !== null) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        // Botão [ ✕ SAIR ] no topo direito (x: 288..340, y: 20..46)
        if (canvasX >= 280 && canvasX <= 345 && canvasY >= 18 && canvasY <= 50) {
          closeShop();
          return;
        }

        // Botão Inferior [ ✕ VOLTAR AO JOGO ] (x: GAME_WIDTH/2 - 90..+90, y: 468..504)
        if (canvasX >= GAME_WIDTH / 2 - 95 && canvasX <= GAME_WIDTH / 2 + 95 && canvasY >= 465 && canvasY <= 506) {
          closeShop();
          return;
        }

        // Botão Navegação Anterior (x: 30..106, y: 430..460)
        if (canvasX >= 25 && canvasX <= 110 && canvasY >= 428 && canvasY <= 462) {
          if (shopPage > 0) {
            shopPage--;
            playSound('swoosh');
          }
          return;
        }

        // Botão Navegação Próximo (x: GAME_WIDTH - 106..-30, y: 430..460)
        if (canvasX >= GAME_WIDTH - 110 && canvasX <= GAME_WIDTH - 25 && canvasY >= 428 && canvasY <= 462) {
          if (shopPage < 1) {
            shopPage++;
            playSound('swoosh');
          }
          return;
        }

        // Clique nos Cards de Skins (2x2)
        const startIdx = shopPage * SKINS_PER_PAGE;
        const colXs = [24, 188];
        const rowYs = [88, 260];
        const cardW = 148;
        const cardH = 162;

        for (let i = 0; i < 4; i++) {
          const skinIndex = startIdx + i;
          if (skinIndex >= SKINS.length) break;
          const col = i % 2;
          const row = Math.floor(i / 2);
          const cX = colXs[col];
          const cY = rowYs[row];

          if (canvasX >= cX && canvasX <= cX + cardW && canvasY >= cY && canvasY <= cY + cardH) {
            buyOrEquipSkin(skinIndex);
            return;
          }
        }
      }
      return;
    }

    if (currentState === STATE.READY) {
      if (isClickOnCanvas && e) {
        // Obter coordenadas no canvas nativo
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = (e.clientX !== undefined && e.clientX !== null) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = (e.clientY !== undefined && e.clientY !== null) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        // Se clicou no botão/badge da skin (y: 278-315, x centralizado)
        if (canvasY >= 275 && canvasY <= 318 && canvasX >= GAME_WIDTH / 2 - 115 && canvasX <= GAME_WIDTH / 2 + 115) {
          cycleSkin();
          return;
        }

        // Se clicou no Card Modo Normal (x: leftX a leftX+cardW, y: 320 a 375)
        if (canvasY >= 320 && canvasY <= 375 && canvasX >= GAME_WIDTH / 2 - 115 && canvasX <= GAME_WIDTH / 2 - 4) {
          setMode(GAME_MODE.NORMAL);
          return;
        }

        // Se clicou no Card Modo Turbo (x: rightX a rightX+cardW, y: 320 a 375)
        if (canvasY >= 320 && canvasY <= 375 && canvasX >= GAME_WIDTH / 2 + 4 && canvasX <= GAME_WIDTH / 2 + 115) {
          setMode(GAME_MODE.TURBO);
          return;
        }

        // Se clicou no Banner da Loja de Skins (y: 385-422, x centralizado)
        if (canvasY >= 385 && canvasY <= 422 && canvasX >= GAME_WIDTH / 2 - 115 && canvasX <= GAME_WIDTH / 2 + 115) {
          openShop();
          return;
        }
      }

      currentState = STATE.PLAYING;
      updateUIState();
      bird.flap();
    } else if (currentState === STATE.PLAYING) {
      bird.flap();
    } else if (currentState === STATE.GAMEOVER) {
      // Só reinicia após pequeno atraso de 400ms para evitar cliques acidentais
      if (Date.now() - gameOverTime > 400) {
        if (isClickOnCanvas && e) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const clientX = (e.clientX !== undefined && e.clientX !== null) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
          const clientY = (e.clientY !== undefined && e.clientY !== null) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
          const canvasX = (clientX - rect.left) * scaleX;
          const canvasY = (clientY - rect.top) * scaleY;

          // Se clicou no Botão [ 🛒 LOJA DE SKINS ] (y: 378..414, x centralizado)
          if (canvasY >= 378 && canvasY <= 414 && canvasX >= GAME_WIDTH / 2 - 95 && canvasX <= GAME_WIDTH / 2 + 95) {
            openShop();
            return;
          }
        }
        resetGame();
      }
    }
  }

  // Eventos de teclado
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      handleAction();
    } else if (e.code === 'KeyS') {
      if (currentState === STATE.READY) {
        e.preventDefault();
        cycleSkin();
      }
    } else if (e.code === 'KeyM') {
      if (currentState === STATE.READY) {
        e.preventDefault();
        toggleMode();
      }
    } else if (e.code === 'KeyL') {
      e.preventDefault();
      if (currentState === STATE.SHOP) {
        closeShop();
      } else if (currentState === STATE.READY || currentState === STATE.GAMEOVER) {
        openShop();
      }
    } else if (e.code === 'Escape') {
      if (currentState === STATE.SHOP) {
        e.preventDefault();
        closeShop();
      } else if (currentState === STATE.PLAYING || currentState === STATE.PAUSED) {
        e.preventDefault();
        togglePause();
      }
    } else if (e.code === 'ArrowLeft') {
      if (currentState === STATE.SHOP && shopPage > 0) {
        e.preventDefault();
        shopPage--;
        playSound('swoosh');
      }
    } else if (e.code === 'ArrowRight') {
      if (currentState === STATE.SHOP && shopPage < 1) {
        e.preventDefault();
        shopPage++;
        playSound('swoosh');
      }
    } else if (e.code === 'KeyP') {
      e.preventDefault();
      togglePause();
    }
  });

  // Suporte unificado para Toque e Clique (Mobile e Desktop)
  if (window.PointerEvent) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.isPrimary) {
        e.preventDefault();
        handleAction(e, true);
      }
    }, { passive: false });
  } else {
    // Eventos de toque no Canvas (Mobile legado)
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleAction(e, true);
    }, { passive: false });

    // Eventos de clique do Mouse no Canvas (Desktop legado)
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        handleAction(e, true);
      }
    });
  }

  // Toast flutuante de confirmação da troca de skin
  function drawSkinToast() {
    if (skinToastTimer <= 0) return;

    ctx.save();
    const alpha = Math.min(1, skinToastTimer / 18);
    ctx.globalAlpha = alpha;

    const skin = SKINS[currentSkinIndex];
    const toastW = 220;
    const toastH = 34;
    const toastX = GAME_WIDTH / 2 - toastW / 2;
    const toastY = 85;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(toastX, toastY, toastW, toastH, 6);
    } else {
      ctx.rect(toastX, toastY, toastW, toastH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = '8.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.fillText('Skin: ' + skin.icon + ' ' + skin.name, GAME_WIDTH / 2, toastY + 22);

    ctx.restore();
  }

  // ----------------------------------------------------
  // LOOP PRINCIPAL COM TIMESTEP FIXO (60 FPS DETERMINÍSTICO)
  // Garante velocidade idêntica em qualquer taxa de atualização (60Hz, 90Hz, 120Hz, 144Hz)
  // ----------------------------------------------------
  const TARGET_FPS = 60;
  const STEP = 1000 / TARGET_FPS; // 16.6667ms por passo de física
  const MAX_ACCUMULATOR = 100;    // Previne saltos bruscos se o app for minimizado/bloqueado
  let lastTime = 0;
  let accumulator = 0;

  function updateGameLogic() {
    frames++;

    // Se estiver na loja, apenas anima o pássaro e decrementa o toast
    if (currentState === STATE.SHOP) {
      bird.hoverOffset = Math.sin(frames * 0.1) * 6;
      bird.flapIndex = Math.floor((frames / 7) % 3);
      if (shopToastTimer > 0) shopToastTimer--;
      return;
    }

    // Atualização de física e lógica
    if (currentState !== STATE.PAUSED) {
      updateBackground();
      bird.update();
      pipes.update();
      updateParticles();

      // Atualizar efeitos de tela
      if (screenShake > 0) screenShake *= 0.88;
      if (screenShake < 0.2) screenShake = 0;

      if (flashAlpha > 0) flashAlpha -= 0.08;
      if (flashAlpha < 0) flashAlpha = 0;

      // Suavizar animação de pop ao marcar ponto
      if (scoreScale > 1.005) {
        scoreScale += (1.0 - scoreScale) * 0.18;
      } else {
        scoreScale = 1.0;
      }

      // Animar contagem do score no game over
      if (currentState === STATE.GAMEOVER) {
        if (scoreCounterAnimation < score) {
          scoreCounterAnimation += 0.5;
        } else {
          scoreCounterAnimation = score;
        }
      }
    }

    // Timer do aviso de skin
    if (skinToastTimer > 0) {
      skinToastTimer--;
    }
  }

  function render() {
    ctx.save();
    // Aplicar Screen Shake em colisões
    if (screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * screenShake * 2;
      const shakeY = (Math.random() - 0.5) * screenShake * 2;
      ctx.translate(shakeX, shakeY);
    }

    drawSkyAndCity();
    pipes.draw();
    drawGround();
    bird.draw();
    drawParticles();

    // Flash branco na tela
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    ctx.restore();

    // Camadas de Interface (não sofrem tremor da tela)
    drawScoreInGame();
    drawReadyScreen();
    drawGameOverModal();
    drawPauseScreen();
    drawSkinToast();
    drawShopModal();
  }

  function loop(timestamp) {
    const currentTime = typeof timestamp === 'number' ? timestamp : performance.now();
    if (!lastTime) {
      lastTime = currentTime;
    }

    let deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Se o usuário trocou de app ou o celular travou brevemente, limita o delta acumulado
    if (deltaTime > MAX_ACCUMULATOR) {
      deltaTime = MAX_ACCUMULATOR;
    }
    if (deltaTime < 0) {
      deltaTime = 0;
    }

    accumulator += deltaTime;

    // Executa os passos de física exatamente à taxa fixa de 60Hz
    while (accumulator >= STEP) {
      updateGameLogic();
      accumulator -= STEP;
    }

    // Renderiza na taxa nativa da tela (60Hz, 90Hz, 120Hz)
    render();

    requestAnimationFrame(loop);
  }

  // Prevenir acelerações abruptas ao minimizar ou alternar o app no celular
  window.addEventListener('blur', () => {
    lastTime = 0;
    accumulator = 0;
  });

  window.addEventListener('focus', () => {
    lastTime = 0;
    accumulator = 0;
  });

  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    accumulator = 0;
  });

  // Iniciar loop do jogo
  requestAnimationFrame(loop);
})();

