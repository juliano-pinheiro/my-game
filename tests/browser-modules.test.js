import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');

async function loadModule(file, extraContext = {}) {
  const source = await readFile(join(projectRoot, file), 'utf8');
  const context = vm.createContext({
    window: {},
    ...extraContext
  });
  vm.runInContext(source, context, { filename: file });
  return context.window;
}

test('aplica compra, confirmação e equipamento de skin', async () => {
  const { FlyingBirdShop } = await loadModule('shop.js');
  const skin = { id: 'cyber', price: 100 };

  assert.equal(FlyingBirdShop.purchaseSkin({
    skin,
    coins: 40,
    unlockedSkins: ['classic_hd']
  }).status, 'insufficient-funds');
  assert.equal(FlyingBirdShop.purchaseSkin({
    skin,
    coins: 120,
    unlockedSkins: ['classic_hd']
  }).status, 'confirmation-required');
  assert.deepEqual(FlyingBirdShop.purchaseSkin({
    skin,
    coins: 120,
    unlockedSkins: ['classic_hd'],
    confirm: true
  }), {
    status: 'purchased',
    coins: 20,
    unlockedSkins: ['classic_hd', 'cyber']
  });
});

test('mantém limites de velocidade, spawn e colisão', async () => {
  const { FlyingBirdPhysics } = await loadModule('physics.js');

  assert.equal(FlyingBirdPhysics.getPipeSpeed({
    mode: 'turbo',
    baseSpeed: 2.4,
    score: 100
  }), 3.6);
  assert.equal(FlyingBirdPhysics.getSpawnInterval(3), 76);
  assert.equal(FlyingBirdPhysics.checkCollision({
    bird: { x: 100, y: 100, radius: 13 },
    pipe: { x: 90, top: 160 },
    pipeWidth: 50,
    pipeGap: 140
  }), true);
  assert.equal(FlyingBirdPhysics.checkCollision({
    bird: { x: 100, y: 220, radius: 13 },
    pipe: { x: 90, top: 160 },
    pipeWidth: 50,
    pipeGap: 140
  }), false);
});

test('calcula recorde e recompensa por modo', async () => {
  const { FlyingBirdScore } = await loadModule('score.js');
  const result = FlyingBirdScore.evaluateRound({
    score: 20,
    mode: 'turbo',
    bestScore: 12
  });

  assert.equal(result.isNewRecord, true);
  assert.equal(result.bestScore, 20);
  assert.deepEqual(result.reward, {
    earned: 40,
    bonusRecord: 5,
    bonusMedal: 10,
    total: 55
  });
});

test('cria estado inicial sem compartilhar listas do save', async () => {
  const { FlyingBirdState } = await loadModule('state.js');
  const save = {
    gameMode: 'normal',
    bestScores: { normal: 3, turbo: 8 },
    graphicsMode: 'hd',
    coins: 20,
    unlockedSkins: ['classic_hd'],
    muted: false
  };
  const state = FlyingBirdState.createGameState({
    config: {
      STATE: { READY: 0 },
    },
    save
  });

  state.unlockedSkins.push('cyber');
  assert.deepEqual(save.unlockedSkins, ['classic_hd']);
  assert.equal(state.currentState, 0);
  assert.equal(state.bestScoreTurbo, 8);
});

test('registra teclado e Pointer Events sem duplicar callbacks', async () => {
  const listeners = {};
  const canvasListeners = {};
  const canvas = {
    addEventListener(type, handler) {
      canvasListeners[type] = handler;
    }
  };
  const windowObject = {
    PointerEvent: class PointerEvent {},
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };
  const window = await loadModule('input.js', { window: windowObject });
  const actions = [];
  const onCanvasAction = (_, isCanvas) => actions.push(isCanvas);

  window.FlyingBirdInput.bindInput({
    canvas,
    onCanvasAction,
    onKeyDown: () => actions.push('key')
  });

  assert.equal(typeof listeners.keydown, 'function');
  assert.equal(typeof canvasListeners.pointerdown, 'function');
  canvasListeners.pointerdown({
    isPrimary: true,
    preventDefault() {}
  });
  assert.deepEqual(actions, [true]);
});
