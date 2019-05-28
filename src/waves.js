
import {
  def_vec2f,
  mathf_min,
  mathf_max,
  mathi_max,
  mathi_min,
  mathi_round
} from '__futilsjs';

import { createWaveImage } from './image';

export const DAMPING_PASSIVE = 0.985; // double
export const DAMPING_ACTIVE = 0.935; // double

export const RENDER_SHADING = 0.005; // 3819660113; // double
export const RENDER_REFRACTION = 1.6180339887; // double

function copyPixel8(src8, spx, dst8, dpx, shade) {
}

export function createWaveEngine(imageElement, width, height, padding=20) {
  
  const waveImage = createWaveImage(
    imageElement,
    width + padding,
    height + padding);

  const maxWidth = (width || 3)|0;
  const maxHeight = (height || 3)|0;
  const maxSize = (maxWidth * maxHeight)|0

  const waveBuffer1 = new Float64Array(maxSize);
  const waveBuffer2 = new Float64Array(maxSize);
  let isBuffer1 = true;

  class WaveEngine {
    // #region Main
    constructor() {
      this.maxDepth = +0.0; // readonly max wave depth
      this.minDepth = +0.0; // readonly min wave depth
      this.clearWave();
    }
    get currentWave() {
      return isBuffer1 ? waveBuffer1 : waveBuffer2;
    }
    clearWave(waveDefault = +0.0) {
      waveDefault = +waveDefault;
      let idx = 0;
      for (; (idx|0) < (maxSize|0); idx = (idx+1)|0) {
        waveBuffer1[idx] = +waveDefault;
        waveBuffer2[idx] = +waveDefault;
      }
    }
    renderWave8(dst8, width, height, options = {}) {
      width = int_clamp(width|0, 3|0, maxWidth|0)|0;
      height = int_clamp(height|0, 3|0, maxHeight|0)|0;

      const src8 = waveImage.getBuff8();

      // center the canvas on the source image
      const srcWidth = waveImage.width|0;
      const srcHeight = waveImage.height|0;
      const srcLeft = mathi_max(0, ((srcWidth - width)|0 >> 1))|0;
      const srcTop = mathi_max(0, ((srcHeight - height)|0 >> 1))|0;

      // get wave buffers
      const wbuf1 = isBuffer1 ? waveBuffer1 : waveBuffer2;
      const wbuf2 = isBuffer1 ? waveBuffer2 : waveBuffer1;

      // variables to calculate the next wave
      const dampingPassive = +(+options.dampingPassive || +DAMPING_PASSIVE);
      const dampingActive = +(+options.dampingActive || +DAMPING_ACTIVE);

      let idx = 0|0;    // current array index
      let ix = 0|0;     // current x coordinate
      let iy = 0|0;     // current y coordinate
      let lx = 0|0;     // current x length
      let ly = 0|0;     // current y length
      let depth = +0.0;  // current altitude
      let depthMax = +0.0; // altitude maximum
      let depthMin = +0.0; // altitude minumum

      // variables used in the render process
      const shading = +(+options.shading || +RENDER_SHADING);
      const refraction = +(+options.refraction || +RENDER_REFRACTION);

      let xos = +0.0;
      let yos = +0.0;
      let fshade = +0.0;
      let ishade = 0|0;
      
      let spx = 0|0; // source image index (bgImageData)
      let dpx = 0|0; // destination index (dstImageData/Canvas)

      // #region Top Line
      // Top Left Pixel
      depth = +wbuf1[1];
      depth += +wbuf1[width];
      depth -= +wbuf2[0];
      depth *= +dampingPassive;
      wbuf2[0] = +depth;
      // Top Center
      lx = (width - 1)|0;
      for (ix = 1; ix < lx; ++ix) {
        idx = ix|0;
        depth = +wbuf1[idx - 1];
        depth += +wbuf1[idx + 1];
        depth /= +2.0;
        depth += +wbuf1[(idx + width)|0];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;  
      }
      // Top Right Pixel
      idx = (width - 1)|0;
      depth = +wbuf1[idx - 1];
      depth += +wbuf1[(idx + width)|0];
      depth -= +wbuf2[idx];
      depth *= +dampingPassive;
      wbuf2[idx] = +depth;
      // #endregion

      // #region Mid Area
      idx = width|0; // set wave index to beginning of second line
      dpx = idx << 2; // set index of destination pixel
      ly = (height - 1)|0;
      for (iy = 1; iy < ly; ++iy) {
        // Mid Left Pixel
        depth = +wbuf1[(idx - width)|0];
        depth += +wbuf1[(idx + width)|0];
        depth /= +2.0;
        depth += +wbuf1[idx + 1];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;
        ++idx;
        dpx += 4;
        lx = (width - 1)|0;
        for (ix = 1; ix < lx; ++ix) {
          // #### Calculate Mid Center Wave
          depth = +wbuf1[idx - 1];
          depth += +wbuf1[idx + 1];
          depth += +wbuf1[(idx - width)|0];
          depth += +wbuf1[(idx + width)|0];
          depth /= +2.0;
          depth -= +wbuf2[idx];
          depth *= +dampingPassive;
          wbuf2[idx] = +depth;
          depthMax = mathf_max(+depthMax, +depth); // register maximum altitude
          depthMin = mathf_min(+depthMin, +depth); // register minumum altitude
        
          // #### Render Destination Image
          xos = +wbuf1[idx - 1];
          xos -= +wbuf1[idx + 1];
          xos *= +refraction;

          yos = +wbuf1[idx - width];
          yos -= +wbuf1[idx + width];
          yos *= +refraction;
          
          // shade = (xos - yos) * shading;
          fshade = +xos;
          fshade -= +yos;
          fshade *= +shading;
          ishade = mathi_round(fshade)|0;

          // calculate source texture bitmap index
          // spx = dpx + (xos  + (yos *  src.width)) * 4;
          spx = srcTop|0;
          spx += iy|0;
          spx += mathi_round(yos)|0;
          spx *= srcWidth|0;

          spx += srcLeft|0;
          spx += ix|0; //
          spx += mathi_round(xos)|0;

          spx *= 4;
          // spx += dpx|0;

          // copy refracted pixel from background to canvas.
          dst8[dpx|0] = (src8[spx|0] + ishade|0)|0;
          dst8[(dpx + 1)|0] = (src8[(spx + 1)|0] + ishade|0)|0;
          dst8[(dpx + 2)|0] = (src8[(spx + 2)|0] + ishade|0)|0;
          dst8[(dpx + 3)|0] = src8[(spx + 3)|0]|0;
        
          ++idx; // next wave pixel
          dpx += 4; // next destination pixel
        }
        // Mid Right Pixel
        depth = +wbuf1[(idx - width)|0];
        depth += +wbuf1[(idx + width)|0];
        depth /= +2.0;
        depth += +wbuf1[idx - 1];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;
        idx++;
        dpx += 4;
      }
      // #endregion

      // #region Bottom Line
      // Bottom Left Pixel
      idx = (width * (height -1))|0;
      depth = +wbuf1[idx + 1];
      depth += +wbuf1[(idx - width)|0];
      depth -= +wbuf2[idx];
      depth *= +dampingPassive;
      wbuf2[idx] = +depth;
      // Bottom Center
      lx = (width - 1)|0;
      for (ix = 1; ix < lx; ++ix) {
        idx = (ix + (width * (height -1)))|0;
        depth = +wbuf1[idx - 1];
        depth += +wbuf1[idx + 1];
        depth /= +2.0;
        depth += +wbuf1[(idx - width) | 0];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;       
      }
      // Bottom Right Pixel
      idx = ((width * height) - 1)|0;
      depth = +wbuf1[idx -1];
      depth += +wbuf1[(idx - width)|0];
      depth -= +wbuf2[idx];
      depth *= +dampingPassive;
      wbuf2[idx] = +depth;
      // #endregion

      // store wave extremes
      this.maxDepth = +depthMax;
      this.minDepth = +depthMin;

      // swap buffers
      isBuffer1 = !isBuffer1;
    }
    renderWave32(dst32, width, height, options = {}) {
      width = int_clamp(width|0, 3|0, maxWidth|0)|0;
      height = int_clamp(height|0, 3|0, maxHeight|0)|0;

      const toInt = mathi_round;

      const src32 = waveImage.getBuff32();

      // center the canvas on the source image
      const srcWidth = waveImage.width|0;
      const srcHeight = waveImage.height|0;
      const srcLeft = mathi_max(0, ((srcWidth - width)|0 >> 1))|0;
      const srcTop = mathi_max(0, ((srcHeight - height)|0 >> 1))|0;

      // get wave buffers
      const wbuf1 = isBuffer1 ? waveBuffer1 : waveBuffer2;
      const wbuf2 = isBuffer1 ? waveBuffer2 : waveBuffer1;

      // variables to calculate the next wave
      const dampingPassive = +(+options.dampingPassive || +DAMPING_PASSIVE);
      const dampingActive = +(+options.dampingActive || +DAMPING_ACTIVE);

      let spx = 0|0; // source image index (buff32[spx])

      let idx = 0|0;    // current array index
      let ix = 0|0;     // current x coordinate
      let iy = 0|0;     // current y coordinate
      let lx = 0|0;     // current x length
      let ly = 0|0;     // current y length
      let depth = +0.0;  // current altitude
      let depthMax = +0.0; // altitude maximum
      let depthMin = +0.0; // altitude minumum

      // variables used in the render process
      const shading = +(+options.shading || +RENDER_SHADING);
      const refraction = +(+options.refraction || +RENDER_REFRACTION);

      let xos = +0.0;
      let yos = +0.0;
      let fshade = +0.0;
      let ishade = 0|0;
      let pixel = 0|0;
      let a=0, r=0, g=0, b=0;

      // #region Top Line
      // Top Left Pixel
      depth = +wbuf1[1];
      depth += +wbuf1[width];
      depth -= +wbuf2[0];
      depth *= +dampingPassive;
      wbuf2[0] = +depth;
      // Top Center
      lx = (width - 1)|0;
      for (ix = 1; ix < lx; ++ix) {
        idx = ix|0;
        depth = +wbuf1[idx - 1];
        depth += +wbuf1[idx + 1];
        depth /= +2.0;
        depth += +wbuf1[(idx + width)|0];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;  
      }
      // Top Right Pixel
      idx = (width - 1)|0;
      depth = +wbuf1[idx - 1];
      depth += +wbuf1[(idx + width)|0];
      depth -= +wbuf2[idx];
      depth *= +dampingPassive;
      wbuf2[idx] = +depth;
      // #endregion

      // #region Mid Area
      idx = width|0; // set wave index to beginning of second line
      ly = (height - 1)|0;
      for (iy = 1; iy < ly; ++iy) {
        // Mid Left Pixel
        depth = +wbuf1[(idx - width)|0];
        depth += +wbuf1[(idx + width)|0];
        depth /= +2.0;
        depth += +wbuf1[idx + 1];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;
        ++idx;
        lx = (width - 1)|0;
        for (ix = 1; ix < lx; ++ix) {
          // #### Calculate Mid Center Wave
          depth = +wbuf1[(idx - 1)|0];
          depth += +wbuf1[(idx + 1)|0];
          depth += +wbuf1[(idx - width)|0];
          depth += +wbuf1[(idx + width)|0];
          depth /= +2.0;
          depth -= +wbuf2[idx|0];
          depth *= +dampingPassive;
          wbuf2[idx|0] = +depth;
          //depthMax = mathf_max(+depthMax, +depth); // register maximum altitude
          //depthMin = mathf_min(+depthMin, +depth); // register minumum altitude
        
          // #### Render Destination Image
          xos = +wbuf1[idx - 1];
          xos -= +wbuf1[idx + 1];
          xos *= +refraction;

          yos = +wbuf1[idx - width];
          yos -= +wbuf1[idx + width];
          yos *= +refraction;
          
          // shade = (xos - yos) * shading;
          fshade = +xos;
          fshade -= +yos;
          fshade *= +shading;
          ishade = toInt(fshade)|0; // int_clamp(~~floor(fshade)|0, 0, 255);

          // calculate source texture bitmap index
          // spx = idx + (xos  + (yos *  src.width)) * 4;
          spx = srcTop|0;
          spx += iy|0;
          spx += toInt(yos)|0;
          spx *= srcWidth|0;

          spx += srcLeft|0;
          spx += ix|0;
          spx += toInt(xos)|0;

          // copy refracted pixel from background to canvas.
          pixel = src32[spx]|0;
          r = ((pixel >> 24 & 0xFF) + ishade);
          g = ((pixel >> 16 & 0xFF) + ishade); 
          b = ((pixel >> 8 & 0xFF) + ishade);
          a = pixel & 0xFF;
          pixel = (a | (b << 8) | (g << 16) | (r << 24))|0;

          dst32[idx|0] = pixel|0;
        
          ++idx; // next wave pixel
        }
        // Mid Right Pixel
        depth = +wbuf1[(idx - width)|0];
        depth += +wbuf1[(idx + width)|0];
        depth /= +2.0;
        depth += +wbuf1[idx - 1];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;
        ++idx;
      }
      // #endregion

      // #region Bottom Line
      // Bottom Left Pixel
      idx = (width * (height -1))|0;
      depth = +wbuf1[idx + 1];
      depth += +wbuf1[(idx - width)|0];
      depth -= +wbuf2[idx];
      depth *= +dampingPassive;
      wbuf2[idx] = +depth;
      // Bottom Center
      lx = (width - 1)|0;
      for (ix = 1; ix < lx; ++ix) {
        idx = (ix + (width * (height -1)))|0;
        depth = +wbuf1[idx - 1];
        depth += +wbuf1[idx + 1];
        depth /= +2.0;
        depth += +wbuf1[(idx - width) | 0];
        depth -= +wbuf2[idx];
        depth *= +dampingPassive;
        wbuf2[idx] = +depth;       
      }
      // Bottom Right Pixel
      idx = ((width * height) - 1)|0;
      depth = +wbuf1[idx -1];
      depth += +wbuf1[(idx - width)|0];
      depth -= +wbuf2[idx];
      depth *= +dampingPassive;
      wbuf2[idx] = +depth;
      // #endregion

      // store wave extremes
      this.maxDepth = +depthMax;
      this.minDepth = +depthMin;

      // swap buffers
      isBuffer1 = !isBuffer1;
    }

    // #endregion

    // #region Shapes
    circleAt(point=def_vec2f, altitude=0.0, radius=0, waveDamping = +DAMPING_ACTIVE) {
      // precast parameters
      altitude = +altitude;
      radius = radius|0;
      waveDamping = +waveDamping;

      // select buffers
      const wbuf1 = isBuffer1 ? waveBuffer1 : waveBuffer2;
      const wbuf2 = isBuffer1 ? waveBuffer2 : waveBuffer1;

      // get dampingPassive for shape
      const dampingActive = +(+waveDamping || +DAMPING_ACTIVE);

      // retrieve coordinates
      const bx = point.x|0;
      const by = point.y|0;
      const bw = maxWidth|0;

      // setup variables
      let y = 0;
      let x = 0;
      let idx = 0;
      for(y=-radius|0; y <= radius; ++y) {
        for(x=-radius|0; x <= radius; ++x) {
          if((x * x + y * y) <= radius * radius) {
            // calculate index in buffer
            idx = ((bx + x) + (by + y) * bw)|0;
            // dampen ripple in both buffers
            wbuf1[idx] *= +dampingActive;
            wbuf2[idx] *= +dampingActive;
            // add new altitude to buffer2
            wbuf1[idx] += +altitude;
          }
        }
      }
    }
    // #endregion
  }

  return new WaveEngine();
}