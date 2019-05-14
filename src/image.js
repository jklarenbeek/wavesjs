import { mathi_round, mathi_min, mathi_max } from 'futilsjs';

export default class WaveImage {
  constructor() {
    this.top = 0;
    this.left = 0;
  }
  getImageElement() { throw 'not implemented'; }
  getWidth() { throw 'not implemented'; }
  getHeight() { throw 'not implemented'; }
  getContext() { throw 'not implemented'; }
  getCanvas() { throw 'not implemented'; }
  getImageData() { throw 'not implemented'; }
}

export function generateGreyWaveMap(imageData, threshold=0) {
  const data = imageData.data;
  const size = (imageData.width * imageData.height)|0;
  const wave = new Uint8Array(size);
  
  let maxDepth = 0;
  let minDepth = 255;

  let idx = 0;
  let r = +0.0;
  let g = +0.0;
  let b = +0.0;
  let grey = 0;

  // convert to grayscale
  for (let i = 0; i|0 < size|0; i = (i + 1)|0) {
    idx = (i << 2)|0;
    r = +(+data[idx] * 0.2126);
    g = +(+data[idx + 1] * 0.7152);
    b = +(+data[idx + 2] * 0.0722);
    grey = mathi_round(r + g + b)|0;
    if (grey !== 0) {
      maxDepth = mathi_max(maxDepth|0, grey|0)|0;
      minDepth = mathi_min(minDepth|0, grey|0)|0;              
    }
    wave[i] = grey > threshold ? grey|0 : 0;
  }

  return {
    wave: wave,
    width: width,
    height: height,
    maxDepth: maxDepth,
    minDepth: minDepth
  };
}

export function createWaveImage(imageElement, width, height) {
  if (!(imageElement instanceof HTMLImageElement)) {
    throw "createWaveImage ERROR: HTMLImageElement required";
  }

  const naturalWidth = imageElement.naturalWidth|0;
  const naturalHeight = imageElement.naturalHeight|0;
  if (naturalWidth < 3 || naturalHeight < 3) {
    throw "createWaveImage ERROR: HTMLImageElement too small";
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, naturalWidth, naturalHeight, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width|0, height|0);
  const buff8 = new Uint8ClampedArray(imageData.data.buffer);
  const buff32 = new Uint32Array(imageData.data.buffer);

  class WaveImageImpl extends WaveImage {
    constructor() {
      super();
    }
    getImageElement() { return imageElement; }
    getWidth() { return width|0; }
    getHeight() { return height|0; }
    getCanvas() { return canvas; }
    getContext() { imageData = null; return ctx; }
    getImageData() {
      return imageData;
    }
    getBuff8() {
      return buff8;
    }
    getBuff32() {
      return buff32;
    }
  }

  return new WaveImageImpl();
}
