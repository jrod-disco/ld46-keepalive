import * as PIXI from 'pixi.js';

export interface Coin {
  container: PIXI.Container;
  update: (delta: number) => void;
  addCoin: (num?: number) => number;
  subtractCoin: (num?: number) => { newTotal: number; goodPurchase: boolean };
}

interface Props {
  app?: PIXI.Application;
  pos?: { x: number; y: number };
}

export const coin = (props: Props): Coin => {
  const pos = props.pos ?? { x: 0, y: 0 };
  const container = new PIXI.Container();
  container.x = pos.x;
  container.y = pos.y;

  let coinState = {
    total: 0,
  };

  const coinString = (): string => `= ${coinState.total}`;

  const texture = PIXI.Texture.from('../../assets/ld46/coin.png');
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5);
  container.addChild(sprite);

  // Text
  const textStyle = new PIXI.TextStyle({
    fontFamily: 'Impact, Charcoal, sans-serif',
    fontSize: 18,
    fontWeight: 'bold',
    fill: ['#ccc'],
    fillGradientType: 1,
    fillGradientStops: [0.35],
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 10,
    dropShadowDistance: 5,
  });

  const coinText = new PIXI.Text(coinString(), textStyle);
  coinText.anchor.set(0, 0.5);
  coinText.x = 20;
  coinText.y = 2;

  container.addChild(coinText);

  const updateCoinText = () => {
    coinText.text = coinString();
  };

  const addCoin = (num = 1): number => {
    const newTotal = coinState.total + num;
    coinState = { ...coinState, total: newTotal };
    updateCoinText();
    return newTotal;
  };
  const subtractCoin = (
    num = -1
  ): { newTotal: number; goodPurchase: boolean } => {
    const goodPurchase = coinState.total === 0 ? false : true;
    const newTotal = goodPurchase ? coinState.total + num : 0;
    coinState = { ...coinState, total: newTotal };
    updateCoinText();
    return { newTotal, goodPurchase };
  };

  const update = (delta): void => {
    // Update called by main
  };

  return { container, update, addCoin, subtractCoin };
};