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
  const graphicsBtn = document.getElementById('graphics-btn');
  const graphicsIcon = document.getElementById('graphics-icon');
  const shopBtn = document.getElementById('shop-btn');
  const shopIcon = document.getElementById('shop-icon');
  const pauseBtn = document.getElementById('pause-btn');
  const pauseIcon = document.getElementById('pause-icon');

  // Dimensões lógicas nativas do jogo (todas as coordenadas usam 360x640)
  const config = window.FlyingBirdConfig;
  const GAME_WIDTH = config.GAME_WIDTH;
  const GAME_HEIGHT = config.GAME_HEIGHT;
  const GROUND_HEIGHT = config.GROUND_HEIGHT;
  const GROUND_Y = config.GROUND_Y;

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
    },
    getJSON(key, fallback = null) {
      const value = this.get(key);
      if (value === null) return fallback;
      try {
        return JSON.parse(value);
      } catch (e) {
        return fallback;
      }
    },
    setJSON(key, value) {
      try {
        this.set(key, JSON.stringify(value));
      } catch (e) {}
    }
  };

  const SAVE_KEY = 'flying_bird_save';
  const SAVE_VERSION = 1;

  function normalizeSaveData(save = {}) {
    const bestScores = save.bestScores && typeof save.bestScores === 'object'
      ? save.bestScores
      : {};
    const unlockedSkins = Array.isArray(save.unlockedSkins)
      ? [...new Set(save.unlockedSkins.filter((skin) => typeof skin === 'string'))]
      : [];

    return {
      version: SAVE_VERSION,
      coins: Number.isFinite(save.coins) && save.coins >= 0 ? Math.floor(save.coins) : 0,
      unlockedSkins: unlockedSkins.includes('classic_hd')
        ? unlockedSkins
        : ['classic_hd', ...unlockedSkins],
      currentSkin: typeof save.currentSkin === 'string' ? save.currentSkin : 'classic_hd',
      muted: save.muted === true,
      graphicsMode: save.graphicsMode === 'retro' ? 'retro' : 'hd',
      gameMode: save.gameMode === 'turbo' ? 'turbo' : 'normal',
      bestScores: {
        normal: Number.isFinite(bestScores.normal) && bestScores.normal >= 0
          ? Math.floor(bestScores.normal)
          : 0,
        turbo: Number.isFinite(bestScores.turbo) && bestScores.turbo >= 0
          ? Math.floor(bestScores.turbo)
          : 0
      }
    };
  }

  function loadGameSave() {
    const storedSave = safeStorage.getJSON(SAVE_KEY);
    if (storedSave && storedSave.version === SAVE_VERSION) {
      return normalizeSaveData(storedSave);
    }

    const legacyUnlockedSkins = safeStorage.getJSON('flying_unlocked_skins', []);
    const legacySkins = Array.isArray(legacyUnlockedSkins) ? legacyUnlockedSkins : [];
    const migratedSave = normalizeSaveData({
      coins: parseInt(safeStorage.get('flying_coins') || '0', 10),
      unlockedSkins: legacySkins,
      currentSkin: '',
      muted: (safeStorage.get('flying_muted') ?? safeStorage.get('flappy_muted')) === 'true',
      graphicsMode: safeStorage.get('flying_graphics_mode', 'hd'),
      gameMode: safeStorage.get('flying_game_mode', 'normal'),
      bestScores: {
        normal: parseInt(safeStorage.get('flying_best_score_normal') || safeStorage.get('flying_best_score') || '0', 10),
        turbo: parseInt(safeStorage.get('flying_best_score_turbo') || '0', 10)
      }
    });

    safeStorage.setJSON(SAVE_KEY, migratedSave);
    return migratedSave;
  }

  const gameSave = loadGameSave();
  const state = window.FlyingBirdState.createGameState({ config, save: gameSave });

  function persistGameSave() {
    safeStorage.setJSON(SAVE_KEY, normalizeSaveData(gameSave));
  }

  // Modos Gráficos (Retrô Clássico vs HD Alta Resolução)
  const GRAPHICS_MODE = config.GRAPHICS_MODE;

  if (state.graphicsMode !== GRAPHICS_MODE.RETRO && state.graphicsMode !== GRAPHICS_MODE.HD) {
    state.graphicsMode = GRAPHICS_MODE.HD;
  }

  function applyGraphicsModeResolution() {
    if (state.graphicsMode === GRAPHICS_MODE.HD) {
      // Buffer 2x de alta densidade (Retina/AMOLED) para zero serrilhado
      canvas.width = 720;
      canvas.height = 1280;
      ctx.imageSmoothingEnabled = true;
      if (graphicsIcon) graphicsIcon.textContent = '✨';
      if (graphicsBtn) graphicsBtn.title = 'Gráficos: HD (Alta Resolução)';
    } else {
      // Resolução nativa 1x com pixel smoothing desligado para look arcade autêntico
      canvas.width = 360;
      canvas.height = 640;
      ctx.imageSmoothingEnabled = false;
      if (graphicsIcon) graphicsIcon.textContent = '📺';
      if (graphicsBtn) graphicsBtn.title = 'Gráficos: Retrô Clássico';
    }
  }

  function setGraphicsMode(mode) {
    state.graphicsMode = mode;
    gameSave.graphicsMode = mode;
    safeStorage.set('flying_graphics_mode', mode);
    persistGameSave();
    applyGraphicsModeResolution();
    showToastNotification(mode === GRAPHICS_MODE.HD ? 'Gráficos: ✨ HD (Alta Resolução)' : 'Gráficos: 📺 Retrô Clássico', '#38bdf8');
    playSound('swoosh');
  }

  function toggleGraphicsMode() {
    setGraphicsMode(state.graphicsMode === GRAPHICS_MODE.HD ? GRAPHICS_MODE.RETRO : GRAPHICS_MODE.HD);
  }

  // Aplica a resolução inicial configurada (HD 720x1280 ou Retrô 360x640)
  applyGraphicsModeResolution();

  // Notificações Toast Unificadas
  let toastMessage = '';
  let toastTimer = 0;
  let toastColor = '#facc15';

  function showToastNotification(msg, color = '#facc15') {
    toastMessage = msg;
    toastColor = color;
    toastTimer = 90;
  }

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

  // Sistema de Economia e Inventário de Skins
  if (!Array.isArray(state.unlockedSkins) || state.unlockedSkins.length === 0) {
    state.unlockedSkins = ['classic_hd'];
  }
  if (!state.unlockedSkins.includes('classic_hd')) {
    state.unlockedSkins.push('classic_hd');
  }

  function isSkinUnlocked(skinId) {
    return state.unlockedSkins.includes(skinId);
  }

  function saveInventory() {
    gameSave.coins = state.coins;
    gameSave.unlockedSkins = [...state.unlockedSkins];
    gameSave.currentSkin = SKINS[state.currentSkinIndex].id;
    safeStorage.set('flying_coins', state.coins.toString());
    safeStorage.set('flying_unlocked_skins', JSON.stringify(state.unlockedSkins));
    safeStorage.set('flying_skin_index', state.currentSkinIndex.toString());
    persistGameSave();
  }

  state.currentSkinIndex = SKINS.findIndex((skin) => skin.id === gameSave.currentSkin);
  if (state.currentSkinIndex < 0) {
    state.currentSkinIndex = parseInt(safeStorage.get('flying_skin_index') || '0', 10);
  }
  if (isNaN(state.currentSkinIndex) || state.currentSkinIndex < 0 || state.currentSkinIndex >= SKINS.length || !isSkinUnlocked(SKINS[state.currentSkinIndex].id)) {
    state.currentSkinIndex = 0;
  }

  // Estados e Navegação da Loja
  const SKINS_PER_PAGE = 4;

  function openShop() {
    if (state.currentState === STATE.PLAYING) return;
    state.confirmingSkinPurchase = null;
    state.previousState = state.currentState;
    state.currentState = STATE.SHOP;
    updateUIState();
    playSound('swoosh');
  }

  function closeShop() {
    if (state.currentState !== STATE.SHOP) return;
    state.confirmingSkinPurchase = null;
    state.currentState = (state.previousState === STATE.GAMEOVER) ? STATE.GAMEOVER : STATE.READY;
    updateUIState();
    playSound('swoosh');
  }

  function buyOrEquipSkin(skinIndex, forceConfirm = false) {
    if (skinIndex < 0 || skinIndex >= SKINS.length) return;
    const skin = SKINS[skinIndex];
    const result = window.FlyingBirdShop
      ? window.FlyingBirdShop.purchaseSkin({
        skin,
        coins: state.coins,
        unlockedSkins: state.unlockedSkins,
        confirm: forceConfirm
      })
      : null;

    if (result && result.status === 'equipped') {
      state.currentSkinIndex = skinIndex;
      saveInventory();
      if (skinIcon) skinIcon.textContent = skin.icon;
      showToastNotification(`Equipado: ${skin.icon} ${skin.name}`, '#34d399');
      playSound('swoosh');
    } else if (result && result.status === 'insufficient-funds') {
        showToastNotification(`Faltam 🪙 ${result.missing} moedas!`, '#ef4444');
      playSound('error');
      state.screenShake = 6;
    } else if (result && result.status === 'confirmation-required') {
      state.confirmingSkinPurchase = skinIndex;
      playSound('swoosh');
    } else if (result && result.status === 'purchased') {
      state.coins = result.coins;
      state.unlockedSkins = result.unlockedSkins;
      state.currentSkinIndex = skinIndex;
      saveInventory();
      state.confirmingSkinPurchase = null;
      if (skinIcon) skinIcon.textContent = skin.icon;
      showToastNotification(`Comprado: ${skin.icon} ${skin.name}!`, '#38bdf8');
      playSound('buy');
    }
  }

  // Estados do jogo
  const STATE = config.STATE;

  // Modos de Jogo
  const GAME_MODE = config.GAME_MODE;

  if (state.currentMode !== GAME_MODE.NORMAL && state.currentMode !== GAME_MODE.TURBO) {
    state.currentMode = GAME_MODE.NORMAL;
  }

  // Recordes separados por modo
  function getBestScore() {
    return state.currentMode === GAME_MODE.TURBO
      ? state.bestScoreTurbo
      : state.bestScoreNormal;
  }

  function setMode(newMode) {
    if (state.currentState !== STATE.READY) return;
    state.currentMode = newMode;
    gameSave.gameMode = state.currentMode;
    safeStorage.set('flying_game_mode', state.currentMode);
    persistGameSave();
    playSound('swoosh');
  }

  function toggleMode() {
    setMode(state.currentMode === GAME_MODE.NORMAL ? GAME_MODE.TURBO : GAME_MODE.NORMAL);
  }

  // Efeitos  visuais (Screen Shake e Flash)

  // Atualizar ícones iniciais
  soundIcon.textContent = state.isMuted ? '🔇' : '🔊';
  soundBtn.setAttribute('aria-pressed', String(state.isMuted));
  if (skinIcon) skinIcon.textContent = SKINS[state.currentSkinIndex].icon;

  // ----------------------------------------------------
  // SINTETIZADOR DE ÁUDIO (Web Audio API - Sem arquivos externos)
  // ----------------------------------------------------
  let audioCtx = null;

  function initAudio() {
    if (window.FlyingBirdAudio) {
      window.FlyingBirdAudio.initAudio();
      return;
    }
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
    if (window.FlyingBirdAudio) {
      window.FlyingBirdAudio.playSound(type, state.isMuted);
      return;
    }
    if (state.isMuted) return;
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

      } else if (type === 'state.score') {
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
    state.isMuted = !state.isMuted;
    gameSave.muted = state.isMuted;
    safeStorage.set('flying_muted', state.isMuted ? 'true' : 'false');
    persistGameSave();
    soundIcon.textContent = state.isMuted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-pressed', String(state.isMuted));
  });

  // Alternar skin do pássaro (cicla apenas entre skins que o jogador já desbloqueou)
  function cycleSkin() {
    if (state.currentState !== STATE.READY) return;

    initAudio();
    const nextIndex = window.FlyingBirdShop
      ? window.FlyingBirdShop.getNextUnlockedIndex(state.currentSkinIndex, SKINS, state.unlockedSkins)
      : state.currentSkinIndex;

    state.currentSkinIndex = nextIndex;
    saveInventory();
    if (skinIcon) skinIcon.textContent = SKINS[state.currentSkinIndex].icon;
    showToastNotification(`Skin: ${SKINS[state.currentSkinIndex].icon} ${SKINS[state.currentSkinIndex].name}`, '#facc15');
    playSound('swoosh');
  }

  // Atualiza visibilidade dos botões da interface conforme o estado
  function updateUIState() {
    if (graphicsBtn) {
      graphicsBtn.setAttribute('aria-pressed', String(state.graphicsMode === GRAPHICS_MODE.HD));
    }
    if (shopBtn) {
      shopBtn.setAttribute('aria-expanded', String(state.currentState === STATE.SHOP));
    }
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-pressed', String(state.currentState === STATE.PAUSED));
    }

    if (skinBtn) {
      if (state.currentState === STATE.READY) {
        skinBtn.classList.remove('hidden');
      } else {
        skinBtn.classList.add('hidden');
      }
    }

    if (graphicsBtn) {
      if (state.currentState !== STATE.PLAYING) {
        graphicsBtn.classList.remove('hidden');
      } else {
        graphicsBtn.classList.add('hidden');
      }
    }

    if (shopBtn) {
      if (state.currentState === STATE.READY || state.currentState === STATE.GAMEOVER || state.currentState === STATE.SHOP) {
        shopBtn.classList.remove('hidden');
      } else {
        shopBtn.classList.add('hidden');
      }
    }

    if (pauseBtn) {
      if (state.currentState === STATE.PLAYING || state.currentState === STATE.PAUSED) {
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

  if (graphicsBtn) {
    graphicsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleGraphicsMode();
    });
  }

  if (shopBtn) {
    shopBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.currentState === STATE.SHOP) {
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
    if (state.currentState === STATE.PLAYING) {
      state.previousState = state.currentState;
      state.currentState = STATE.PAUSED;
      pauseIcon.textContent = '▶️';
      pauseBtn.setAttribute('aria-pressed', 'true');
    } else if (state.currentState === STATE.PAUSED) {
      state.currentState = state.previousState;
      pauseIcon.textContent = '⏸️';
      pauseBtn.setAttribute('aria-pressed', 'false');
    }
    updateUIState();
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
    if (state.currentState === STATE.GAMEOVER || state.currentState === STATE.PAUSED) return;

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
    if (state.graphicsMode === GRAPHICS_MODE.HD) {
      // Céu HD: Gradiente vibrante suave com atmosfera
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, '#2563eb');
      skyGrad.addColorStop(0.35, '#38bdf8');
      skyGrad.addColorStop(0.7, '#7dd3fc');
      skyGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

      // Sol e Raios de Luz (God Rays)
      ctx.save();
      const sunGrad = ctx.createRadialGradient(290, 65, 5, 290, 65, 75);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.2, '#fef08a');
      sunGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.35)');
      sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(290, 65, 75, 0, Math.PI * 2);
      ctx.fill();

      // Raios de sol translúcidos
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      [[-0.4, 0.25], [-0.1, 0.55], [0.2, 0.85]].forEach(([a1, a2]) => {
        ctx.beginPath();
        ctx.moveTo(290, 65);
        ctx.lineTo(290 + Math.cos(a1) * 600, 65 + Math.sin(a1) * 600);
        ctx.lineTo(290 + Math.cos(a2) * 600, 65 + Math.sin(a2) * 600);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      // Nuvens HD com sombreado suave volumétrico
      clouds.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(c.scale, c.scale);

        // Sombra suave da nuvem
        ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.beginPath();
        ctx.arc(0, 4, 20, 0, Math.PI * 2);
        ctx.arc(18, -4, 22, 0, Math.PI * 2);
        ctx.arc(36, 4, 18, 0, Math.PI * 2);
        ctx.arc(18, 14, 16, 0, Math.PI * 2);
        ctx.fill();

        // Corpo da nuvem
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.arc(18, -8, 22, 0, Math.PI * 2);
        ctx.arc(36, 0, 18, 0, Math.PI * 2);
        ctx.arc(18, 10, 16, 0, Math.PI * 2);
        ctx.fill();

        // Brilho no topo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(18, -10, 15, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.fill();
        ctx.restore();
      });

      // Silhueta dos Prédios com profundidade HD
      ctx.save();
      for (let loop = 0; loop < 2; loop++) {
        const offsetX = loop * 360 - cityScrollOffset;
        citySilhouettes.forEach(b => {
          const bx = offsetX + b.x;
          if (bx + b.w > -10 && bx < GAME_WIDTH + 10) {
            const bGrad = ctx.createLinearGradient(bx, GROUND_Y - b.h, bx, GROUND_Y);
            bGrad.addColorStop(0, '#6ee7b7');
            bGrad.addColorStop(1, '#059669');
            ctx.fillStyle = bGrad;
            ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);

            // Janelas brilhantes
            ctx.fillStyle = '#fef08a';
            for (let wy = GROUND_Y - b.h + 8; wy < GROUND_Y - 12; wy += 14) {
              for (let wx = bx + 6; wx < bx + b.w - 8; wx += 10) {
                ctx.fillRect(wx, wy, 4, 6);
              }
            }
          }
        });
      }

      // Arbustos suaves
      for (let x = -30; x < GAME_WIDTH + 40; x += 36) {
        const bushGrad = ctx.createRadialGradient(x, GROUND_Y + 5, 2, x, GROUND_Y + 5, 26);
        bushGrad.addColorStop(0, '#86efac');
        bushGrad.addColorStop(1, '#16a34a');
        ctx.fillStyle = bushGrad;
        ctx.beginPath();
        ctx.arc(x, GROUND_Y + 5, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

    } else {
      // Céu Retrô Clássico (Flappy Original Arcade)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, '#4ec0ca');
      skyGrad.addColorStop(0.75, '#85d9e3');
      skyGrad.addColorStop(1, '#bcf2f7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

      // Nuvens Retrô Planas
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

      // Silhueta dos Prédios Retrô Verde Menta
      ctx.save();
      ctx.fillStyle = '#9fe3ba';
      for (let loop = 0; loop < 2; loop++) {
        const offsetX = loop * 360 - cityScrollOffset;
        citySilhouettes.forEach(b => {
          const bx = offsetX + b.x;
          if (bx + b.w > -10 && bx < GAME_WIDTH + 10) {
            ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);
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

      ctx.fillStyle = '#79d19a';
      for (let x = -30; x < GAME_WIDTH + 40; x += 36) {
        ctx.beginPath();
        ctx.arc(x, GROUND_Y + 5, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawGround() {
    if (state.graphicsMode === GRAPHICS_MODE.HD) {
      // Faixa de grama HD com folhagens orgânicas
      const grassGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 16);
      grassGrad.addColorStop(0, '#86efac');
      grassGrad.addColorStop(0.3, '#4ade80');
      grassGrad.addColorStop(1, '#16a34a');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 16);

      // Folhinhas de grama no topo
      ctx.fillStyle = '#86efac';
      for (let gx = 0; gx < GAME_WIDTH; gx += 8) {
        const bladeHeight = (gx % 16 === 0) ? 4 : 2.5;
        ctx.beginPath();
        ctx.moveTo(gx, GROUND_Y);
        ctx.lineTo(gx + 3, GROUND_Y - bladeHeight);
        ctx.lineTo(gx + 6, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }

      // Sombra suave sob a grama
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, GROUND_Y + 16, GAME_WIDTH, 4);

      // Terra HD
      const dirtGrad = ctx.createLinearGradient(0, GROUND_Y + 20, 0, GAME_HEIGHT);
      dirtGrad.addColorStop(0, '#eab308');
      dirtGrad.addColorStop(0.4, '#ca8a04');
      dirtGrad.addColorStop(1, '#854d0e');
      ctx.fillStyle = dirtGrad;
      ctx.fillRect(0, GROUND_Y + 20, GAME_WIDTH, GROUND_HEIGHT - 20);

      // Textura estilizada em movimento
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, GROUND_Y + 20, GAME_WIDTH, GROUND_HEIGHT - 20);
      ctx.clip();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let x = -24; x < GAME_WIDTH + 48; x += 18) {
        const currentX = x - groundScrollOffset;
        ctx.beginPath();
        ctx.moveTo(currentX, GROUND_Y + 20);
        ctx.lineTo(currentX + 8, GROUND_Y + 20);
        ctx.lineTo(currentX - 6, GAME_HEIGHT);
        ctx.lineTo(currentX - 14, GAME_HEIGHT);
        ctx.fill();
      }
      ctx.restore();

    } else {
      // Grama e Chão Retrô Clássico
      ctx.fillStyle = '#73bf2e';
      ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 14);

      ctx.fillStyle = '#8ce036';
      ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 4);

      ctx.fillStyle = '#558022';
      ctx.fillRect(0, GROUND_Y + 14, GAME_WIDTH, 3);

      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, GROUND_Y + 17, GAME_WIDTH, GROUND_HEIGHT - 17);

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
  }
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
      const skin = SKINS[state.currentSkinIndex];
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
      if (state.currentState === STATE.READY) {
        // Animação de flutuação suave antes de começar
        this.hoverOffset = Math.sin(state.frames * 0.1) * 6;
        this.flapIndex = Math.floor((state.frames / 7) % 3);
        this.rotation = 0;
        return;
      }

      if (state.currentState === STATE.PLAYING) {
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
          this.flapIndex = Math.floor((state.frames / 5) % 3);
        } else {
          this.flapIndex = 1;
        }

        // Rastro de vento aerodinâmico em velocidade alta
        if (state.frames % 4 === 0 && Math.abs(this.velocity) > 1.6) {
          particles.push({
            x: this.x - 14,
            y: this.y + (Math.random() - 0.5) * 5,
            vx: -2.2,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 1.8 + 1,
            color: SKINS[state.currentSkinIndex].particleColor,
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
      } else if (state.currentState === STATE.GAMEOVER) {
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
      const drawY = state.currentState === STATE.READY ? (this.y + this.hoverOffset) : this.y;
      ctx.translate(this.x, drawY);
      ctx.rotate(this.rotation);

      // Sombra sutil projetada
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      this.drawSkin(SKINS[state.currentSkinIndex].id);

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
      const orbitAngle = state.frames * 0.1;
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
      const flameFlicker = Math.sin(state.frames * 0.2) * 2;
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
      if (window.FlyingBirdPhysics) {
        return window.FlyingBirdPhysics.getPipeSpeed({
          mode: state.currentMode,
          baseSpeed: this.baseSpeed,
          state.score
        });
      }
      if (state.currentMode === GAME_MODE.TURBO) {
        // Modo Turbo: acelera suavemente (+0.05 por ponto) até o limite jogável de 3.6 px/frame
        return Math.min(3.6, this.baseSpeed + state.score * 0.05);
      }
      return this.baseSpeed;
    },

    getSpawnInterval() {
      if (window.FlyingBirdPhysics) {
        return window.FlyingBirdPhysics.getSpawnInterval(this.currentSpeed);
      }
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
      if (state.currentState !== STATE.PLAYING) return;

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
          state.score++;
          state.scoreScale = 1.25;
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

    if (state.graphicsMode === GRAPHICS_MODE.HD) {
      // Canos HD Metálicos com Iluminação Cilíndrica e Especular
      const pipeGrad = ctx.createLinearGradient(x, 0, x + width, 0);
      pipeGrad.addColorStop(0, '#166534');
      pipeGrad.addColorStop(0.18, '#86efac');
      pipeGrad.addColorStop(0.42, '#22c55e');
      pipeGrad.addColorStop(0.85, '#15803d');
      pipeGrad.addColorStop(1, '#14532d');

      ctx.fillStyle = pipeGrad;
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2.2;

      // Corpo
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      // Tampa / Borda do cano
      const capX = x - overhang;
      const capW = width + overhang * 2;
      const capY = isTop ? (y + height - capH) : y;

      const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
      capGrad.addColorStop(0, '#166534');
      capGrad.addColorStop(0.18, '#bbf7d0');
      capGrad.addColorStop(0.42, '#22c55e');
      capGrad.addColorStop(0.85, '#15803d');
      capGrad.addColorStop(1, '#14532d');

      ctx.fillStyle = capGrad;
      ctx.fillRect(capX, capY, capW, capH);
      ctx.strokeRect(capX, capY, capW, capH);

      // Sombra projetada pelo anel/tampa sobre a haste do cano
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      if (isTop) {
        ctx.fillRect(x, capY - 6, width, 6);
      } else {
        ctx.fillRect(x, capY + capH, width, 6);
      }

      // Brilho especular sutil na borda da tampa
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(capX + 4, capY + 3, 5, capH - 6);

    } else {
      // Canos Retrô Clássicos (Flappy Original Arcade)
      const pipeGrad = ctx.createLinearGradient(x, 0, x + width, 0);
      pipeGrad.addColorStop(0, '#558022');
      pipeGrad.addColorStop(0.18, '#8ce036');
      pipeGrad.addColorStop(0.4, '#73bf2e');
      pipeGrad.addColorStop(0.85, '#558022');
      pipeGrad.addColorStop(1, '#2e4314');

      ctx.fillStyle = pipeGrad;
      ctx.strokeStyle = '#1e290b';
      ctx.lineWidth = 2.5;

      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

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

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(capX + 4, capY + 3, 5, capH - 6);
    }

    ctx.restore();
  }
  function checkCollision(b, p) {
    if (window.FlyingBirdPhysics) {
      return window.FlyingBirdPhysics.checkCollision({
        bird: b,
        pipe: p,
        pipeWidth: pipes.width,
        pipeGap: pipes.gap
      });
    }
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
    if (state.currentState === STATE.GAMEOVER) return;

    state.currentState = STATE.GAMEOVER;
    updateUIState();
    state.gameOverTime = Date.now();
    state.screenShake = 12;
    state.flashAlpha = 0.8;

    playSound('hit');
    if (!hitGround) {
      setTimeout(() => playSound('die'), 120);
    }

    // Explodir penas do pássaro
    addExplosion(bird.x, bird.y, '#facc15', 16);
    addExplosion(bird.x, bird.y, '#ffffff', 8);

    const currentBestScore = state.currentMode === GAME_MODE.TURBO
      ? state.bestScoreTurbo
      : state.bestScoreNormal;
    const roundResult = window.FlyingBirdScore
      ? window.FlyingBirdScore.evaluateRound({
        score: state.score,
        mode: state.currentMode,
        bestScore: currentBestScore
      })
      : {
        score: state.score,
        bestScore: currentBestScore,
        isNewRecord: state.score > currentBestScore,
        reward: {
          total: state.score * (state.currentMode === GAME_MODE.TURBO ? 2 : 1)
        }
      };

    state.isNewRecord = roundResult.isNewRecord;
    if (state.currentMode === GAME_MODE.TURBO) {
      state.bestScoreTurbo = roundResult.bestScore;
      gameSave.bestScores.turbo = state.bestScoreTurbo;
      safeStorage.set('flying_best_score_turbo', state.bestScoreTurbo.toString());
    } else {
      state.bestScoreNormal = roundResult.bestScore;
      gameSave.bestScores.normal = state.bestScoreNormal;
      safeStorage.set('flying_best_score_normal', state.bestScoreNormal.toString());
      safeStorage.set('flying_best_score', state.bestScoreNormal.toString());
    }
    persistGameSave();

    state.lastCoinsEarned = roundResult.reward.total;
    state.coins += state.lastCoinsEarned;
    saveInventory();

    if (state.lastCoinsEarned > 0) {
      setTimeout(() => playSound('coin'), 350);
    }

    state.scoreCounterAnimation = 0;
  }
  function resetGame() {
    state.currentState = STATE.READY;
    updateUIState();
    state.score = 0;
    state.scoreScale = 1.0;
    bird.reset();
    pipes.reset();
    particles.length = 0;
    state.screenShake = 0;
    state.flashAlpha = 0;
    playSound('swoosh');
  }

  // ----------------------------------------------------
  // INTERFACE E MENUS
  // ----------------------------------------------------
  function drawScoreInGame() {
    if (state.currentState !== STATE.PLAYING) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = state.score.toString();
    const scoreY = 55;

    ctx.translate(GAME_WIDTH / 2, scoreY);
    ctx.scale(state.scoreScale, state.scoreScale);

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
    if (state.currentMode === GAME_MODE.TURBO) {
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
    if (state.currentState !== STATE.READY) return;

    ctx.save();
    ctx.textAlign = 'center';

    // Título FLYING BIRD
    const pulse = Math.sin(state.frames * 0.08) * 3;
    const titleY = 142 + pulse;

    ctx.font = '24px "Press Start 2P", monospace';
    // Sombra do título
    ctx.fillStyle = '#1e293b';
    ctx.fillText('FLYING BIRD', GAME_WIDTH / 2 + 3, titleY + 3);
    // Letras com gradiente dourado
    ctx.fillStyle = '#facc15';
    ctx.fillText('FLYING BIRD', GAME_WIDTH / 2, titleY);

    // Seletor / Badge da Skin Selecionada
    const skin = SKINS[state.currentSkinIndex];
    const skinCardY = 285;
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
    const modeCardY = 328;
    const cardW = 105;
    const cardH = 46;
    const leftX = GAME_WIDTH / 2 - cardW - 5;
    const rightX = GAME_WIDTH / 2 + 5;

    // Card Modo Normal
    const isNormal = state.currentMode === GAME_MODE.NORMAL;
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
    ctx.fillText(`Top: ${state.bestScoreNormal}`, leftX + cardW / 2, modeCardY + 39);
    ctx.restore();

    // Card Modo Turbo
    const isTurbo = state.currentMode === GAME_MODE.TURBO;
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
    ctx.fillText(`Top: ${state.bestScoreTurbo}`, rightX + cardW / 2, modeCardY + 39);
    ctx.restore();

    // Dica de troca de modo
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('[M] ou Toque para escolher modo', GAME_WIDTH / 2, modeCardY + cardH + 10);

    // Subtítulo / Instrução de Voo
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLIQUE OU ESPAÇO PARA JOGAR', GAME_WIDTH / 2, 418);

    // Botão visual "JOGAR"
    const playBtnY = 438;
    const playBtnW = 140;
    const playBtnH = 34;
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(GAME_WIDTH / 2 - playBtnW / 2, playBtnY, playBtnW, playBtnH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(GAME_WIDTH / 2 - playBtnW / 2, playBtnY, playBtnW, playBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('JOGAR', GAME_WIDTH / 2, playBtnY + 22);

    // Recorde Atual do modo selecionado
    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`🏆 RECORDE ${isTurbo ? 'TURBO' : 'NORMAL'}: ${getBestScore()}`, GAME_WIDTH / 2, 495);

    ctx.restore();
  }
  function drawGameOverModal() {
    if (state.currentState !== STATE.GAMEOVER) return;

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

    drawMedal(cardX + 60, cardY + 85, state.score);

    // Textos de Pontuação (à direita)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b45309';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('PONTOS', cardX + cardW - 20, cardY + 35);

    const currentScoreText = Math.floor(state.scoreCounterAnimation).toString();
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
    ctx.fillStyle = state.currentMode === GAME_MODE.TURBO ? '#ea580c' : '#15803d';
    ctx.textAlign = 'center';
    ctx.fillText(state.currentMode === GAME_MODE.TURBO ? '⚡ MODO TURBO' : '🟢 MODO NORMAL', cardX + cardW / 2, cardY + cardH - 24);

    // Moedas ganhas na partida e total
    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#b45309';
    ctx.fillText(`+${state.lastCoinsEarned} MOEDAS  (TOTAL: 🪙 ${state.coins})`, cardX + cardW / 2, cardY + cardH - 9);

    // Emblema "NOVO" se bateu o recorde
    if (state.isNewRecord) {
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
    const canRestart = Date.now() - state.gameOverTime > 450;
    if (canRestart) {
      const pulse = Math.floor((state.frames / 20) % 2) === 0;
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
    const sparkleAngle = state.frames * 0.05;
    const sparkleDist = 14;
    const sx = x + Math.cos(sparkleAngle) * sparkleDist;
    const sy = y + Math.sin(sparkleAngle) * sparkleDist;
    drawSparkle(sx, sy, (state.frames % 30 < 15 ? 4 : 2.5));

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
  // ----------------------------------------------------
  // TELA DA LOJA DE SKINS (STATE.SHOP) COM CONFIRMAÇÃO
  // ----------------------------------------------------
  function drawShopModal() {
    if (state.currentState !== STATE.SHOP) return;

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
    ctx.fillText(`SALDO: 🪙 ${state.coins}`, GAME_WIDTH / 2, coinsBadgeY + 15);

    // Grid 2x2 de Skins (4 por página)
    const startIdx = state.shopPage * SKINS_PER_PAGE;
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
      const isEquipped = state.currentSkinIndex === skinIndex;
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
      const previewY = cardY + 76 + Math.sin((state.frames + i * 15) * 0.1) * 3;
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
        const canAfford = state.coins >= skin.price;
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
    ctx.fillStyle = state.shopPage > 0 ? '#1e293b' : 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = state.shopPage > 0 ? '#38bdf8' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(30, navY, 76, 26, 5);
    else ctx.rect(30, navY, 76, 26);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = state.shopPage > 0 ? '#ffffff' : '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('◀ ANT', 68, navY + 16);

    // Indicador Central de Página
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText(`PÁG ${state.shopPage + 1}/2`, GAME_WIDTH / 2, navY + 16);

    // Botão Próxima Página
    ctx.fillStyle = state.shopPage < 1 ? '#1e293b' : 'rgba(30, 41, 59, 0.4)';
    ctx.strokeStyle = state.shopPage < 1 ? '#38bdf8' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(GAME_WIDTH - 106, navY, 76, 26, 5);
    else ctx.rect(GAME_WIDTH - 106, navY, 76, 26);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = state.shopPage < 1 ? '#ffffff' : '#64748b';
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

    // Modal de Confirmação de Compra (se o jogador clicou para comprar)
    if (state.confirmingSkinPurchase !== null) {
      drawPurchaseConfirmModal(state.confirmingSkinPurchase);
    }

    ctx.restore();
  }

  function drawPurchaseConfirmModal(skinIndex) {
    const skin = SKINS[skinIndex];
    if (!skin) return;

    ctx.save();

    // Scrim escuro focado
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Diálogo central estilizado
    const boxW = 280;
    const boxH = 232;
    const boxX = GAME_WIDTH / 2 - boxW / 2;
    const boxY = 175;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    // Título
    ctx.textAlign = 'center';
    ctx.font = '9.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText('CONFIRMAR COMPRA', GAME_WIDTH / 2, boxY + 28);

    // Divisória sutil
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX + 16, boxY + 38);
    ctx.lineTo(boxX + boxW - 16, boxY + 38);
    ctx.stroke();

    // Pássaro preview animado
    ctx.save();
    ctx.translate(GAME_WIDTH / 2, boxY + 75);
    bird.drawSkin(skin.id);
    ctx.restore();

    // Nome da Skin & Raridade
    ctx.font = '8.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(skin.name, GAME_WIDTH / 2, boxY + 115);

    ctx.fillStyle = skin.rarityColor;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(GAME_WIDTH / 2 - 35, boxY + 124, 70, 15, 4);
    else ctx.rect(GAME_WIDTH / 2 - 35, boxY + 124, 70, 15);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '6.5px "Press Start 2P", monospace';
    ctx.fillText(skin.rarity.toUpperCase(), GAME_WIDTH / 2, boxY + 135);

    // Resumo de Moedas
    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText(`Preço: 🪙 ${skin.price}`, GAME_WIDTH / 2, boxY + 158);

    const remaining = state.coins - skin.price;
    ctx.font = '6.5px "Press Start 2P", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Saldo: 🪙 ${state.coins}  ➔  🪙 ${remaining}`, GAME_WIDTH / 2, boxY + 174);

    // Botões de Ação
    const btnY = boxY + boxH - 42;
    const btnH = 28;
    const btnW = 112;

    // Botão Confirmar (Esquerda)
    const btnConfirmX = boxX + 18;
    ctx.fillStyle = '#059669';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(btnConfirmX, btnY, btnW, btnH, 6);
    else ctx.rect(btnConfirmX, btnY, btnW, btnH);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('✔ COMPRAR', btnConfirmX + btnW / 2, btnY + 17);

    // Botão Cancelar (Direita)
    const btnCancelX = boxX + boxW - 18 - btnW;
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(btnCancelX, btnY, btnW, btnH, 6);
    else ctx.rect(btnCancelX, btnY, btnW, btnH);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('✕ CANCELAR', btnCancelX + btnW / 2, btnY + 17);

    ctx.restore();
  }
  function drawPauseScreen() {
    if (state.currentState !== STATE.PAUSED) return;

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
  // ----------------------------------------------------
  // TRATAMENTO DE ENTRADAS (TOUCH / TECLADO / MOUSE)
  // ----------------------------------------------------
  function handleAction(e, isClickOnCanvas = false) {
    initAudio();

    if (state.currentState === STATE.SHOP) {
      if (isClickOnCanvas && e) {
        const rect = canvas.getBoundingClientRect();
        // Usar GAME_WIDTH / GAME_HEIGHT para que a escala seja independente do buffer interno (360 vs 720)
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;
        const clientX = (e.clientX !== undefined && e.clientX !== null) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = (e.clientY !== undefined && e.clientY !== null) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        // Se o modal de confirmação estiver aberto, trata somente os botões de confirmação
        if (state.confirmingSkinPurchase !== null) {
          // Botões no diálogo: btnY: 365..393
          if (canvasY >= 360 && canvasY <= 395) {
            // Confirmar (x: 58..170)
            if (canvasX >= 54 && canvasX <= 174) {
              buyOrEquipSkin(state.confirmingSkinPurchase, true);
              return;
            }
            // Cancelar (x: 186..298)
            if (canvasX >= 184 && canvasX <= 304) {
              state.confirmingSkinPurchase = null;
              playSound('swoosh');
              return;
            }
          }
          // Clique fora da caixa de diálogo cancela a confirmação
          if (canvasX < 40 || canvasX > 320 || canvasY < 175 || canvasY > 410) {
            state.confirmingSkinPurchase = null;
            playSound('swoosh');
            return;
          }
          return;
        }

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
          if (state.shopPage > 0) {
            state.shopPage--;
            playSound('swoosh');
          }
          return;
        }

        // Botão Navegação Próximo (x: GAME_WIDTH - 106..-30, y: 430..460)
        if (canvasX >= GAME_WIDTH - 110 && canvasX <= GAME_WIDTH - 25 && canvasY >= 428 && canvasY <= 462) {
          if (state.shopPage < 1) {
            state.shopPage++;
            playSound('swoosh');
          }
          return;
        }

        // Clique nos Cards de Skins (2x2)
        const startIdx = state.shopPage * SKINS_PER_PAGE;
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

    if (state.currentState === STATE.READY) {
      if (isClickOnCanvas && e) {
        // Obter coordenadas no canvas nativo
        const rect = canvas.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;
        const clientX = (e.clientX !== undefined && e.clientX !== null) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = (e.clientY !== undefined && e.clientY !== null) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        // Se clicou no botão/badge da skin (y: 280-322, x centralizado)
        if (canvasY >= 280 && canvasY <= 322 && canvasX >= GAME_WIDTH / 2 - 115 && canvasX <= GAME_WIDTH / 2 + 115) {
          cycleSkin();
          return;
        }

        // Se clicou no Card Modo Normal (x: leftX a leftX+cardW, y: 325 a 380)
        if (canvasY >= 325 && canvasY <= 380 && canvasX >= GAME_WIDTH / 2 - 115 && canvasX <= GAME_WIDTH / 2 - 4) {
          setMode(GAME_MODE.NORMAL);
          return;
        }

        // Se clicou no Card Modo Turbo (x: rightX a rightX+cardW, y: 325 a 380)
        if (canvasY >= 325 && canvasY <= 380 && canvasX >= GAME_WIDTH / 2 + 4 && canvasX <= GAME_WIDTH / 2 + 115) {
          setMode(GAME_MODE.TURBO);
          return;
        }
      }

      state.currentState = STATE.PLAYING;
      updateUIState();
      bird.flap();
    } else if (state.currentState === STATE.PLAYING) {
      bird.flap();
    } else if (state.currentState === STATE.GAMEOVER) {
      // Só reinicia após pequeno atraso de 400ms para evitar cliques acidentais
      if (Date.now() - state.gameOverTime > 400) {
        if (isClickOnCanvas && e) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = GAME_WIDTH / rect.width;
          const scaleY = GAME_HEIGHT / rect.height;
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
  function handleKeyDown(e) {
    // Teclas no modal de confirmação de compra na loja
    if (state.currentState === STATE.SHOP && state.confirmingSkinPurchase !== null) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        buyOrEquipSkin(state.confirmingSkinPurchase, true);
        return;
      } else if (e.code === 'Escape') {
        e.preventDefault();
        state.confirmingSkinPurchase = null;
        playSound('swoosh');
        return;
      }
    }

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      handleAction();
    } else if (e.code === 'KeyS') {
      if (state.currentState === STATE.READY) {
        e.preventDefault();
        cycleSkin();
      }
    } else if (e.code === 'KeyM') {
      if (state.currentState === STATE.READY) {
        e.preventDefault();
        toggleMode();
      }
    } else if (e.code === 'KeyG') {
      e.preventDefault();
      toggleGraphicsMode();
    } else if (e.code === 'KeyL') {
      e.preventDefault();
      if (state.currentState === STATE.SHOP) {
        closeShop();
      } else if (state.currentState === STATE.READY || state.currentState === STATE.GAMEOVER) {
        openShop();
      }
    } else if (e.code === 'Escape') {
      if (state.currentState === STATE.SHOP) {
        e.preventDefault();
        closeShop();
      } else if (state.currentState === STATE.PLAYING || state.currentState === STATE.PAUSED) {
        e.preventDefault();
        togglePause();
      }
    } else if (e.code === 'ArrowLeft') {
      if (state.currentState === STATE.SHOP && state.shopPage > 0) {
        e.preventDefault();
        state.shopPage--;
        playSound('swoosh');
      }
    } else if (e.code === 'ArrowRight') {
      if (state.currentState === STATE.SHOP && state.shopPage < 1) {
        e.preventDefault();
        state.shopPage++;
        playSound('swoosh');
      }
    } else if (e.code === 'KeyP') {
      e.preventDefault();
      togglePause();
    }
  }
  // Toast flutuante unificado para trocas de skin, modo e gráficos
  function drawNotificationToast() {
    if (toastTimer <= 0) return;

    ctx.save();
    const alpha = Math.min(1, toastTimer / 18);
    ctx.globalAlpha = alpha;

    const toastW = 240;
    const toastH = 32;
    const toastX = GAME_WIDTH / 2 - toastW / 2;
    const toastY = 82;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = toastColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(toastX, toastY, toastW, toastH, 6);
    else ctx.rect(toastX, toastY, toastW, toastH);
    ctx.fill();
    ctx.stroke();

    ctx.font = '7.5px "Press Start 2P", monospace';
    ctx.fillStyle = toastColor;
    ctx.textAlign = 'center';
    ctx.fillText(toastMessage, GAME_WIDTH / 2, toastY + 19);

    ctx.restore();
  }
  window.FlyingBirdInput.bindInput({
    canvas,
    onCanvasAction: handleAction,
    onKeyDown: handleKeyDown
  });

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
    state.frames++;

    // Se estiver na loja, apenas anima o pássaro e decrementa o toast
    if (state.currentState === STATE.SHOP) {
      bird.hoverOffset = Math.sin(state.frames * 0.1) * 6;
      bird.flapIndex = Math.floor((state.frames / 7) % 3);
      if (toastTimer > 0) toastTimer--;
      return;
    }

    // Atualização de física e lógica
    if (state.currentState !== STATE.PAUSED) {
      updateBackground();
      bird.update();
      pipes.update();
      updateParticles();

      // Atualizar efeitos de tela
      if (state.screenShake > 0) state.screenShake *= 0.88;
      if (state.screenShake < 0.2) state.screenShake = 0;

      if (state.flashAlpha > 0) state.flashAlpha -= 0.08;
      if (state.flashAlpha < 0) state.flashAlpha = 0;

      // Suavizar animação de pop ao marcar ponto
      if (state.scoreScale > 1.005) {
        state.scoreScale += (1.0 - state.scoreScale) * 0.18;
      } else {
        state.scoreScale = 1.0;
      }

      // Animar contagem do score no game over
      if (state.currentState === STATE.GAMEOVER) {
        if (state.scoreCounterAnimation < state.score) {
          state.scoreCounterAnimation += 0.5;
        } else {
          state.scoreCounterAnimation = state.score;
        }
      }
    }

    // Timer do toast unificado
    if (toastTimer > 0) {
      toastTimer--;
    }
  }

  function render() {
    ctx.save();

    // No modo HD, aplica escala 2x para renderização Retina em 720x1280
    if (state.graphicsMode === GRAPHICS_MODE.HD) {
      ctx.scale(2, 2);
    }

    // Aplicar Screen Shake em colisões
    if (state.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.screenShake * 2;
      const shakeY = (Math.random() - 0.5) * state.screenShake * 2;
      ctx.translate(shakeX, shakeY);
    }

    drawSkyAndCity();
    pipes.draw();
    drawGround();
    bird.draw();
    drawParticles();

    // Flash branco na tela
    if (state.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flashAlpha})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Camadas de Interface (não sofrem tremor da tela)
    drawScoreInGame();
    drawReadyScreen();
    drawGameOverModal();
    drawPauseScreen();
    drawShopModal();
    drawNotificationToast();

    ctx.restore();
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
