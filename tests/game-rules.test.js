import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_MODES,
  calculateCoinsEarned,
  getMedal,
  normalizeSave
} from '../src/game-rules.js';

test('calcula medalhas nos limites documentados', () => {
  assert.equal(getMedal(9), null);
  assert.equal(getMedal(10).name, 'BRONZE');
  assert.equal(getMedal(20).name, 'PRATA');
  assert.equal(getMedal(35).name, 'OURO');
  assert.equal(getMedal(50).name, 'PLATINA');
});

test('calcula moedas no modo normal e aplica bônus de recorde', () => {
  assert.equal(calculateCoinsEarned({
    score: 10,
    mode: GAME_MODES.NORMAL,
    isNewRecord: true
  }), 20);
});

test('dobra os pontos no modo turbo e aplica bônus da medalha', () => {
  assert.equal(calculateCoinsEarned({
    score: 20,
    mode: GAME_MODES.TURBO
  }), 50);
});

test('normaliza save inválido sem perder a skin padrão', () => {
  assert.deepEqual(normalizeSave({
    coins: -4,
    unlockedSkins: ['cyber', 'cyber', 10],
    currentSkin: 42,
    gameMode: 'invalid',
    bestScores: { normal: -1, turbo: 12.8 }
  }), {
    version: 1,
    coins: 0,
    unlockedSkins: ['classic_hd', 'cyber'],
    currentSkin: 'classic_hd',
    muted: false,
    graphicsMode: 'hd',
    gameMode: GAME_MODES.NORMAL,
    bestScores: { normal: 0, turbo: 12 }
  });
});
