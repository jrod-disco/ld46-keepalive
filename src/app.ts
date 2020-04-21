import * as PIXI from 'pixi.js';
import { PixiPlugin } from 'gsap/PixiPlugin';

import initPIXI, { PixiConfig } from './pixi';
import {
  APP_HEIGHT,
  APP_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
  HERO_HEIGHT,
} from './constants';
import './index.scss';

import * as comp from './components';

const hostDiv = document.getElementById('canvas');
const hostWidth = APP_WIDTH;
const hostHeight = APP_WIDTH * (APP_HEIGHT / APP_WIDTH);
const pixiConfig: PixiConfig = {
  width: hostWidth,
  height: hostHeight,
  backgroundColor: 0x282c34,
  antialias: false,
  resolution: 3, // window.devicePixelRatio || 1,
};
// No anti-alias
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

console.log('pixiconfig', hostDiv, pixiConfig);
(function app(): void {
  PixiPlugin.registerPIXI(PIXI);

  const { app, mainContainer } = initPIXI(pixiConfig, hostDiv);
  app.renderer.autoDensity = true;

  // Background
  const bg = comp.background({});
  mainContainer.addChild(bg.container);

  // Ground
  const ground = comp.ground({
    pos: {
      x: TILE_WIDTH * -1,
      y: APP_HEIGHT - TILE_HEIGHT * 0.5,
    },
  });
  mainContainer.addChild(ground.container);

  // Hearts
  const hearts = comp.hearts({ pos: { x: 30, y: 30 } });
  mainContainer.addChild(hearts.container);

  // Coin
  const coin = comp.coin({ pos: { x: 30, y: APP_HEIGHT - 30 } });
  mainContainer.addChild(coin.container);

  // Hero

  const heroNubmers = comp.heroNumbers({
    pos: {
      x: APP_WIDTH * 0.25,
      y: APP_HEIGHT - TILE_HEIGHT - HERO_HEIGHT * 0.5 + 8,
    },
  });
  const hero = comp.hero({
    pos: {
      x: APP_WIDTH * 0.25,
      y: APP_HEIGHT - TILE_HEIGHT - HERO_HEIGHT * 0.5 + 8,
    },
    heroNubmers: heroNubmers,
    hpDisplay: hearts.updateDisplay,
    coinDisplay: coin,
  });
  mainContainer.addChild(hero.container);
  mainContainer.addChild(heroNubmers.container);

  // Shoppe
  const shop = comp.shop({ pos: { x: APP_WIDTH - 234, y: 10 }, hero });
  mainContainer.addChild(shop.container);

  // Enemy Manager
  const enemyManager = comp.enemyManager({
    pos: {
      x: APP_WIDTH - TILE_WIDTH,
      y: APP_HEIGHT - TILE_HEIGHT - HERO_HEIGHT * 0.5 + 8,
    },
  });
  mainContainer.addChild(enemyManager.container);

  // Add music as a component
  const audioLayer = comp.audio();
  audioLayer.init();

  // Collision Detection

  // Register component UPDATE routines
  // ------------------------------------
  app.ticker.add((delta) => {
    // Update it
    ground.update(delta);
    bg.update(delta);
    enemyManager.update(delta);
    enemyManager.checkCollisions(hero);
    hero.update(delta);
  });
})();