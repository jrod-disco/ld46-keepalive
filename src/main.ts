import * as PIXI from 'pixi.js';
import gsap, { Bounce, Power0 } from 'gsap';
import PixiPlugin from 'gsap/PixiPlugin';
import { GodrayFilter, KawaseBlurFilter, TiltShiftFilter } from 'pixi-filters';

import jrvascii from './util/jrvascii';
import initPIXI, { PixiConfig } from './pixi';
import {
  APP_HEIGHT,
  APP_WIDTH,
  GROUND_TILE_HEIGHT,
  GROUND_TILE_WIDTH,
  HERO_HEIGHT,
} from './constants';
import './index.scss';

import * as COMP from './components';
import * as HERO from './components/hero';
import { Sounds } from './components/audio';

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

type SpriteSheets = {
  main: PIXI.Spritesheet | null;
};
interface BootstrapApp {
  app: PIXI.Application;
}

const onAssetsLoaded = (): void => {
  console.log('onAssetsLoaded');

  // Store preloade spritesheets
  const spriteSheets = {
    main: PIXI.Loader.shared.resources['mainSprites'].spritesheet,
  };
  const sounds: Sounds = {
    MainTheme: PIXI.Loader.shared.resources['MainTheme'],
    Somber: PIXI.Loader.shared.resources['Somber'],
    Fanfare: PIXI.Loader.shared.resources['Fanfare'],
  };

  // Boostrap the app once assets are loaded
  bootstrapApp({ spriteSheets, sounds });
};

const preloader = PIXI.Loader.shared;
preloader
  .add('mainSprites', './assets/ld46sprites.json')
  .add('MainTheme', './assets/KeepYeAlive_MainRiff.mp3')
  .add('Somber', './assets/KeepYeAlive_Somber.mp3')
  .add('Fanfare', './assets/KeepYeAlive_LevelFanfare.mp3');

preloader.load(onAssetsLoaded);
preloader.onProgress.add((e, f) =>
  console.log(`Progress ${Math.floor(e.progress)} (${f.name}.${f.extension})`)
);

/**
 * Kicks off the application proper by instantiating the various components and wiring up their update methods to the update loop of the main application.
 *
 * @param props - Preloaded assets ({@link Spritesheets)}, {@link Sounds}) are passed in via props
 *
 */
const bootstrapApp = (props: {
  spriteSheets: SpriteSheets;
  sounds: Sounds;
}): BootstrapApp => {
  jrvascii();

  // Instantiate PIXI
  PixiPlugin.registerPIXI(PIXI);
  gsap.registerPlugin(PixiPlugin);
  const { pixiApp, mainContainer } = initPIXI(pixiConfig, hostDiv);
  pixiApp.renderer.autoDensity = true;

  const gameContainer = mainContainer.addChild(new PIXI.Container());
  const uiContainer = mainContainer.addChild(new PIXI.Container());

  const { spriteSheets, sounds } = props;

  // Declare component variables in advance when needed
  let hero: HERO.Hero = null;
  let runtime = null;
  let enemyManager = null;

  // Add music as a component
  const audioLayer = COMP.audio(sounds);
  audioLayer.music.mainTheme();

  // Background
  const bg = COMP.background({});
  gameContainer.addChild(bg.container);

  // Ground
  const ground = COMP.ground({
    pos: {
      x: GROUND_TILE_WIDTH * -1,
      y: APP_HEIGHT - GROUND_TILE_HEIGHT * 0.5,
    },
    groundTiles: spriteSheets.main.animations['ground'],
  });
  gameContainer.addChild(ground.container);

  // Hearts
  const hearts = COMP.hearts({ pos: { x: 32, y: 32 } });
  uiContainer.addChild(hearts.container);

  // Coin
  const uiCoin = COMP.uiCoin({ pos: { x: 30, y: APP_HEIGHT - 30 } });
  uiContainer.addChild(uiCoin.container);

  // Play Again Button
  let btnAgain = null;

  const onPlayAgain = (): void => {
    if (hero.getStatus() === HERO.STATUS.OFF_SCREEN) {
      hero.reset();
      uiCoin.reset();
      runtime.reset();
      enemyManager.reset();
      shop.reset();
      btnAgain.setEnabled(false);
      audioLayer.music.mainTheme();
      filtersOut();
    }
  };
  btnAgain = COMP.btnAgain({
    onPress: onPlayAgain,
    pos: { x: APP_WIDTH / 2, y: APP_HEIGHT / 2 },
  });
  btnAgain.setEnabled(false);

  // Events
  const onHeroDied = (): void => {
    console.log('enabling button');
    audioLayer.music.somber();
    btnAgain.setEnabled(true);
    shop.animatePanel(false);
    filtersIn();
  };

  // Hero and related components
  // Healing and damage numbers
  const heroNubmers = COMP.heroNumbers({
    pos: {
      x: APP_WIDTH * 0.25,
      y: APP_HEIGHT - GROUND_TILE_HEIGHT - HERO_HEIGHT * 0.5 + 5,
    },
  });

  // The Hero itself
  hero = COMP.hero({
    pos: {
      x: APP_WIDTH * 0.25,
      y: APP_HEIGHT - GROUND_TILE_HEIGHT - HERO_HEIGHT * 0.5 + 5,
    },
    anims: {
      heroRun: spriteSheets.main.animations['hero'],
      effectSwirl: spriteSheets.main.animations['effect_swirl'],
      effectSwirlBlur: spriteSheets.main.animations['effect_swirl_blur'],
      effectPixidust: spriteSheets.main.animations['effect_pixi'],
    },
    heroNubmers: heroNubmers,
    hpDisplay: hearts.updateDisplay,
    coinDisplay: uiCoin,
    onHeroDied,
  });

  // Hero status/particle effects
  const shieldParticles = COMP.heroParticles({
    colors: {
      start: '89b3ff',
      end: '717fbc',
    },
  });
  const healthParticles = COMP.heroParticles({
    colors: {
      start: 'c00f0f',
      end: 'cc0000',
    },
  });
  hero.setParticles({ shieldParticles, healthParticles });

  // Add the hero items to the game container
  gameContainer.addChild(hero.container);
  gameContainer.addChild(heroNubmers.container);
  gameContainer.addChild(shieldParticles.container);
  gameContainer.addChild(healthParticles.container);

  // Run Time
  runtime = COMP.runtime({ hero, pos: { x: 55, y: 30 } });
  uiContainer.addChild(runtime.container);

  // Wave Display
  const waveDisplay = COMP.waveDisplay({
    pos: { x: APP_WIDTH - 10, y: APP_HEIGHT - 30 },
  });
  uiContainer.addChild(waveDisplay.container);

  // Shoppe -----------------------------
  const shop = COMP.shop({
    pos: { x: APP_WIDTH - 217, y: -8 },
    hero,
    anims: {
      hourglass: spriteSheets.main.animations['hourglass'],
    },
    potionTextures: {
      healthSmall: spriteSheets.main.textures['potion_health_small.png'],
      healthLarge: spriteSheets.main.textures['potion_health_large.png'],
      hasteLarge: spriteSheets.main.textures['potion_haste_large.png'],
      shieldSmall: spriteSheets.main.textures['potion_shield_small.png'],
    },
  });
  uiContainer.addChild(shop.container);
  shop.animatePanel(true);

  const dropCoin = COMP.dropCoin({
    pos: { x: 0, y: 0 },
    hero,
    uiCoin,
    anims: { coinSpin: spriteSheets.main.animations['dropCoin'] },
  });
  gameContainer.addChild(dropCoin.container);

  // Enemy Manager -----------------------------
  enemyManager = COMP.enemyManager({
    pos: {
      x: APP_WIDTH - GROUND_TILE_WIDTH,
      y: APP_HEIGHT - GROUND_TILE_HEIGHT - HERO_HEIGHT * 0.5 + 8,
    },
    anims: {
      enemyCubeGreenWalk: spriteSheets.main.animations['enemy_cubeGreen_walk'],
      enemyCubeOrangeWalk:
        spriteSheets.main.animations['enemy_cubeOrange_walk'],
      enemyCubeBlackWalk: spriteSheets.main.animations['enemy_cubeBlack_walk'],
      enemyCubeGreenDie: spriteSheets.main.animations['enemy_cubeGreen_die'],
      enemyCubeOrangeDie: spriteSheets.main.animations['enemy_cubeOrange_die'],
      enemyCubeBlackDie: spriteSheets.main.animations['enemy_cubeBlack_die'],
    },
    updateWaveDisplay: waveDisplay.updateDisplay,
    audioLayer,
    dropCoin,
  });

  gameContainer.addChild(enemyManager.container);

  uiContainer.addChild(btnAgain.container);

  // Post Effects ---------------------------
  const desturationFilter = new PIXI.filters.ColorMatrixFilter();
  desturationFilter.reset();

  const godRaysFilter = new GodrayFilter();
  godRaysFilter.enabled = false;
  godRaysFilter.alpha = 0.0;
  godRaysFilter.angle = -15;
  godRaysFilter.gain = 0.1;
  godRaysFilter.lacunarity = 2.0;
  godRaysFilter.parallel = false;
  godRaysFilter.center = new PIXI.Point(-25, -125);
  gameContainer.filters = [godRaysFilter, desturationFilter];

  const filtersOut = (): void => {
    gsap.to(godRaysFilter, 1.5, {
      gain: 0.1,
      alpha: 0.0,
      ease: Power0.easeIn,
      onComplete: () => {
        godRaysFilter.enabled = false;
      },
    });
    desturationFilter.alpha = 1;
    gsap.to(desturationFilter, 1, {
      alpha: 0,
      ease: Power0.easeOut,
      onComplete: () => {
        desturationFilter.reset();
      },
    });
  };

  const filtersIn = (): void => {
    godRaysFilter.enabled = true;
    gsap.to(godRaysFilter, 3, {
      delay: 0.5,
      gain: 0.75,
      alpha: 0.75,
      ease: Power0.easeOut,
    });
    desturationFilter.desaturate();
    //blurFilter.saturate(0.05, true);
    desturationFilter.alpha = 0;
    gsap.to(desturationFilter, 3, {
      delay: 0.5,
      alpha: 0.9,
      ease: Power0.easeOut,
    });
  };

  // Register component UPDATE routines
  // ------------------------------------
  pixiApp.ticker.add((delta) => {
    // Update All The Things
    godRaysFilter.time += 0.01;
    ground.update(delta);
    bg.update(delta);
    enemyManager.update(delta);
    enemyManager.checkCollisions(hero);
    hero.update(delta);
    dropCoin.update(delta);
    runtime.update(delta);
  });

  return { app: pixiApp };
};
