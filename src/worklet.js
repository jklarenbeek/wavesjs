import { 
  vec2f,
  fetchImage,
  workletState as waveState,
  myRegisterPaint
} from 'futilsjs';

import { createWaveImage } from './image';
import { createWaveEngine } from './waves';

// intialisation custom properties to setup the wave canvas
export const CSS_WAVE_BACKGROUND_IMAGE = '--wave-background-image';
export const CSS_WAVE_VIEWPORT_WIDTH = '--wave-viewport-width';
export const CSS_WAVE_VIEWPORT_HEIGHT = '--wave-viewport-height';

// custom properties to control the user interaction
export const CSS_WAVE_ANIMATION_TICK = '--wave-animation-tick';
export const CSS_WAVE_X = '--wave-x';
export const CSS_WAVE_Y = '--wave-y';
export const CSS_WAVE_P = '--wave-p';

// custom properties to control the render process
export const CSS_WAVE_DAMPING_ACTIVE = '--wave-damping-active';
export const CSS_WAVE_DAMPING_PASSIVE = '--wave-damping-passive';
export const CSS_WAVE_SHADING = '--wave-shading';
export const CSS_WAVE_REFRACTION = '--wave-refraction';


// an example of how not to make a self containt PaintWorklet component.
export function CSSRegisterPaintWorklet(urlsource) {
  if (false && 'paintWorklet' in CSS) {
    CSS.registerProperty({
      name: CSS_WAVE_BACKGROUND_IMAGE,
      syntax: '<image> | none',
      initialValue: 'none',
    });
    CSS.registerProperty({
      name: CSS_WAVE_VIEWPORT_WIDTH,
      syntax: '<integer> | none',
      initialValue: 'none',
    });
    CSS.registerProperty({
      name: CSS_WAVE_VIEWPORT_HEIGHT,
      syntax: '<integer> | none',
      initialValue: 'none',
    });
    // TODO: apparently, safari can't do this
    CSS.paintWorklet.addModule(urlsource);
    return true;
  }
  return false;
}

// the PaintWorklet WaveEngine implementation
export default class WaveWorklet {

  static get inputProperties() {
    // inputProperties is missing the registerProperty argument definition.
    // The definition now, is therefor separated in 2 parts. The first is in
    // CSSRegisterPaintWorklet where the property definitions are set, and
    // this function that repeats the names of these properties. This enables
    // the browser to bind the custom css properties of the CSSOM against this 
    // worklet. Note: you don't need the property definitions persé, but the
    // return value of properties.get(<propertyName>) must then be resolved by
    // the caller.
    return [
      CSS_WAVE_BACKGROUND_IMAGE,
      CSS_WAVE_VIEWPORT_WIDTH,
      CSS_WAVE_VIEWPORT_HEIGHT,

      CSS_WAVE_ANIMATION_TICK,
      CSS_WAVE_X,
      CSS_WAVE_Y,
      CSS_WAVE_P,

      CSS_WAVE_DAMPING_ACTIVE,
      CSS_WAVE_DAMPING_PASSIVE,
      CSS_WAVE_SHADING,
      CSS_WAVE_REFRACTION
    ];
  }
  static get inputArguments() {
    // although the name attribute is not possible in this definition,
    // inputArguments can not tell the browser what its default value is.
    // this might not be as problematic as the previous case, but more
    // thought is needed to finish the definition datastructure that is 
    // returned here.
    return ['<image> | none'];
  }

  constructor() {
    this.state = waveState.init;
    this.waveEngine = null;
    this.canvas = null;
    this.imageData = null;
    this.buff8 = null;
    this.buff32 = null;
  }
  
  // #region PaintWorklet rendering methods
  paintLoading(ctx, size, styleMap, args) {
    const tick = mathi_abs(styleMap.get(CSS_WAVE_ANIMATION_TICK) % 256);

    // ctx.beginPath();
    ctx.fillStyle = '#F36'; // `rgb(2, 3, ${tick})`;
    ctx.fillRect(0, 0, size.width, size.height);
  }

  prepare(ctx, size, styleMap, args) {
    if (this.state >= waveState.running) return false;

    if (this.state === waveState.preparing) return true;
    if (this.state === waveState.loading) return true;

    // get viewport dimensions
    const width = (ctx.canvas && ctx.canvas.width)
      || styleMap.get(CSS_WAVE_VIEWPORT_WIDTH)
      || size.width;
    const height = (ctx.canvas && ctx.canvas.height)
      || styleMap.get(CSS_WAVE_VIEWPORT_HEIGHT)
      || size.height;

    const self = this;
    const actions = [];
    if (this.waveEngine == null) {
      this.state = waveState.loading;
      const url = styleMap.get(CSS_WAVE_BACKGROUND_IMAGE).toString();
      actions.push(fetchImage(url)
        .then(function(imageElement) {
          self.state = waveState.preparing;
          return self.waveEngine = createWaveEngine(
            imageElement,
            width,
            height);
        })
      );
    }

    if (actions.length > 0) {
      console.log("prepare background")
      Promise.all(actions)
      .then(function(waveEngine) {
        self.width = width;
        self.height = height;
        self.imageData = ctx.createImageData(width, height);
        self.buff8 = new Uint8ClampedArray(self.imageData.data.buffer);
        self.buff32 = new Uint32Array(self.imageData.data.buffer);
      })
      .then(function() {
        self.state = waveState.running;
      })
      .catch(function(err) {
        self.state = waveState.init;
      });
    }

    return true;
  }

  paint(ctx, size, styleMap, args) {
    if (this.prepare(ctx, size, styleMap, args)) {
      this.paintLoading(ctx, size, styleMap, args);
      return;
    }
    

    ctx.fillStyle = '#3F2';
    ctx.fillRect(0, 0, size.width, size.height);

    const engine = this.waveEngine;

    const cx = styleMap.get(CSS_WAVE_X) || -1;
    const cy = styleMap.get(CSS_WAVE_Y) || -1;
    if (cx && cy) {
      const x = int_map(cx, 0, size.width, 0, this.width);
      const y = int_map(cy, 0, size.height, 0, this.height);
      engine.circleAt(new vec2f(x, y), -12, 3);
    }

    engine.renderWave32(this.buff32, this.width, this.height);

    ctx.putImageData(this.imageData, 0, 0);

  }
  // #endregion

};

myRegisterPaint('wave', WaveWorklet);
