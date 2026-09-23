(() => {
  function getNextUnlockedIndex(currentIndex, skins, unlockedSkins) {
    for (let offset = 1; offset <= skins.length; offset += 1) {
      const candidate = (currentIndex + offset) % skins.length;
      if (unlockedSkins.includes(skins[candidate].id)) return candidate;
    }
    return currentIndex;
  }

  function purchaseSkin({ skin, coins, unlockedSkins, confirm = false }) {
    if (unlockedSkins.includes(skin.id)) {
      return {
        status: 'equipped',
        coins,
        unlockedSkins: [...unlockedSkins]
      };
    }

    if (coins < skin.price) {
      return {
        status: 'insufficient-funds',
        coins,
        unlockedSkins: [...unlockedSkins],
        missing: skin.price - coins
      };
    }

    if (!confirm) {
      return {
        status: 'confirmation-required',
        coins,
        unlockedSkins: [...unlockedSkins]
      };
    }

    return {
      status: 'purchased',
      coins: coins - skin.price,
      unlockedSkins: [...unlockedSkins, skin.id]
    };
  }

  window.FlyingBirdShop = Object.freeze({
    getNextUnlockedIndex,
    purchaseSkin
  });
})();
