import {
  CSS_WAVE_BACKGROUND_IMAGE,
  CSS_WAVE_ANIMATION_TICK,
  CSSRegisterPaintWorklet,
  CSS_WAVE_X,
  CSS_WAVE_Y,
  CSS_WAVE_VIEWPORT_WIDTH,
  CSS_WAVE_VIEWPORT_HEIGHT,
} from './worklet';
import { copyAttributes, mathi_floor } from 'futils';


// window.addEventListener('unhandledrejection', function(event) {
  // the event object has two special properties:
  // alert('UndhandledRejection: ' + event.reason.toString()); // Error: Whoops! - the unhandled error object
// });

// redirect to https page.
if (location.protocol === 'http:' && location.hostname !== 'localhost')
  location.protocol = 'https:';

function getMousePosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
    //x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
    //y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
  };
};

const button = document.querySelector('#waveMe');
if (CSSRegisterPaintWorklet('./worklet.js')) {
  button.addEventListener('click', function button_onClick(evt) {
    button.classList.add('animating');
    const x = evt.clientX;
    const y = evt.clientY;
    const start = performance.now();
    requestAnimationFrame(function draw(now) {
      const count = mathi_floor(now - start);
      if(count > 1000) {
        button.classList.remove('animating');
        return;
      }
      requestAnimationFrame(draw);
    });
  });
}
else {
  import ('./worklet.js').then(function(module) {
    const worklet = new module.default();
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 576;
    copyAttributes(button, canvas);

    // create a copy of the button element as span without the attributes
    const inner = document.createElement('span');
    inner.innerHTML = button.innerHTML;

    // replace the button for the canvas and append the innerHTML.
    button.parentElement.replaceChild(canvas, button);
    const sibling = canvas.nextSibling;
    if (sibling)
      canvas.parentElement.insertBefore(inner, canvas.nextSibling);
    else
      canvas.parentElement.appendChild(inner);
    
    const style = window.getComputedStyle(canvas, false);
    const properties = new Map([
      [CSS_WAVE_BACKGROUND_IMAGE, style.getPropertyValue(CSS_WAVE_BACKGROUND_IMAGE)],
      [CSS_WAVE_VIEWPORT_WIDTH, style.getPropertyValue(CSS_WAVE_VIEWPORT_WIDTH)],
      [CSS_WAVE_VIEWPORT_HEIGHT, style.getPropertyValue(CSS_WAVE_VIEWPORT_HEIGHT)],
    ]);

    let mousedown = false;
    canvas.addEventListener('mousedown', function MouseDownEvent(event) {
      mousedown = true;
      properties.set(CSS_WAVE_X, event.clientX);
      properties.set(CSS_WAVE_Y, event.clientY);
    });
    canvas.addEventListener('mousemove', function MouseDownEvent(event) {
      if (mousedown === true) {
        properties.set(CSS_WAVE_X, event.clientX);
        properties.set(CSS_WAVE_Y, event.clientY);
      }
    });
    canvas.addEventListener('mouseup', function MouseUpEvent(evt) {
      mousedown = false;
      properties.delete(CSS_WAVE_X);
      properties.delete(CSS_WAVE_Y);
    });
    // start animation loop
    requestAnimationFrame(function draw(now) {
      properties.set(CSS_WAVE_ANIMATION_TICK, now);

      const style = window.getComputedStyle(canvas, false);
      const width = parseInt(style.getPropertyValue('width'));
      const height = parseInt(style.getPropertyValue('height'));
      const ctx = canvas.getContext('2d');
      worklet.paint(ctx, { width: width, height: height }, properties);
      requestAnimationFrame(draw);
    });

  })
}
