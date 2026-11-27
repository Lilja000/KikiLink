export type SwipeDirection = 'pass' | 'like';

export function attachSwipeGesture(stage: HTMLElement, commit: (direction: SwipeDirection) => void, busy: () => boolean, signal: AbortSignal, settled: () => void) {
  const face = stage.querySelector<HTMLElement>('.swipe-face')!;
  const under = stage.querySelector<HTMLElement>('.swipe-under');
  const flag = stage.querySelector<HTMLElement>('.flag')!;
  let drag: {id:number; x:number; y:number; dx:number; dy:number; width:number; threshold:number; active:boolean; samples: {x:number; t:number}[]} | undefined;
  let frame = 0;
  function paint() {
    frame = 0;
    if (!drag || !drag.active || busy()) return;
    const {dx, dy, width} = drag;
    const x = Math.sign(dx) * width * -Math.expm1(-Math.abs(dx) / width);
    const turn = Math.max(-11, Math.min(11, 15 * x / width));
    face.style.transform = `translate3d(${x}px,${Math.max(-16,Math.min(16,dy*.18))}px,0) rotate(${turn}deg)`;
    if (under) {
      const fraction = Math.min(1, Math.abs(x) / (width * .5));
      under.style.transform = `scale(${.96 + .04 * fraction})`;
      under.style.opacity = String(.78 + .22 * fraction);
    }
    stage.dataset.intent = dx >= 0 ? 'like' : 'pass';
    flag.style.opacity = String(Math.min(1, Math.abs(dx) / drag.threshold));
  }
  function reset() {
    const wasDragging = !!drag;
    drag = undefined;
    cancelAnimationFrame(frame);
    frame = 0;
    stage.classList.remove('dragging', 'swipe-leaving');
    face.style.transform = '';
    if (under) { under.style.opacity = ''; under.style.transform = ''; }
    flag.style.opacity = '0';
    delete stage.dataset.intent;
    if (wasDragging && !signal.aborted) queueMicrotask(settled);
  }
  stage.addEventListener('pointerdown', event => {
    if (busy() || event.button !== 0) return;
    if (!event.isPrimary) { reset(); return; }
    const width = Math.max(1, stage.clientWidth);
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, dx:0, dy:0, width,
      threshold:Math.min(95,Math.max(52,width*.20)), active:false, samples:[{x:event.clientX,t:event.timeStamp}]};
    stage.setPointerCapture(event.pointerId);
  }, {signal});
  stage.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || busy()) return;
    drag.dx = event.clientX - drag.x;
    drag.dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.max(Math.abs(drag.dx),Math.abs(drag.dy)) < 7) return;
      if (Math.abs(drag.dy) > Math.abs(drag.dx)) { reset(); return; }
      drag.active = true;
      stage.classList.add('dragging');
    }
    drag.samples = drag.samples.filter(sample => event.timeStamp - sample.t <= 100);
    drag.samples.push({x:event.clientX,t:event.timeStamp});
    if (!frame) frame = requestAnimationFrame(paint);
  }, {signal});
  stage.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId || busy()) return;
    drag.dx = event.clientX - drag.x;
    drag.dy = event.clientY - drag.y;
    const sample = drag.samples[0]!;
    const elapsed = event.timeStamp - sample.t;
    const speed = elapsed > 0 && elapsed <= 125 ? (event.clientX - sample.x) / elapsed : 0;
    const distance = Math.abs(drag.dx);
    const flick = distance >= Math.max(40, drag.width * .095) && Math.sign(drag.dx) * speed > .65;
    if (!drag.active || distance <= Math.abs(drag.dy) * 1.15 || (distance < drag.threshold && !flick)) { reset(); return; }
    cancelAnimationFrame(frame);
    paint();
    const direction = drag.dx > 0 ? 'like' : 'pass';
    drag = undefined;
    commit(direction);
  }, {signal});
  const interrupted = (event: PointerEvent) => { if (event.pointerId === drag?.id) reset(); };
  stage.addEventListener('pointercancel', interrupted, {signal});
  stage.addEventListener('lostpointercapture', interrupted, {signal});
  window.addEventListener('blur', () => { if (drag) reset(); }, {signal});
  signal.addEventListener('abort', reset, {once:true});
  return {
    reset,
    dragging: () => !!drag,
    leave(direction: SwipeDirection) {
      // Continue the exit from the release point; clearing the transform here
      // can flash the card back to its origin in a throttled animation frame.
      drag = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
      stage.classList.remove('dragging');
      stage.dataset.intent = direction;
      stage.classList.add('swipe-leaving');
      face.style.transform = `translate3d(${direction === 'like' ? 112 : -112}%,6px,0) rotate(${direction === 'like' ? 12 : -12}deg)`;
      if (under) { under.style.transform = 'scale(1)'; under.style.opacity = '1'; }
      flag.style.opacity = '1';
    },
  };
}

export class SwipeRain {
  private layer: HTMLDivElement | undefined;
  private started = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  clear() {
    clearTimeout(this.timer);
    this.layer?.remove();
    this.layer = undefined;
  }
  place(host?: HTMLElement | null) {
    const layer = this.layer;
    if (!layer || !host || layer.parentNode === host) return;
    layer.style.setProperty('--fall', (host.clientHeight + 58) + 'px');
    const elapsed = performance.now() - this.started;
    for (const piece of layer.children) {
      const sprite = piece as HTMLElement;
      sprite.style.animationDelay = (Number(sprite.dataset.delay) - elapsed) + 'ms';
    }
    host.append(layer);
  }
  start(direction: SwipeDirection, stage: HTMLElement) {
    this.clear();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden','true');
    layer.className = 'swipe-rain';
    layer.dataset.type = direction;
    const total = stage.clientWidth < 400 ? 26 : 34;
    const sign = direction === 'like' ? 1 : -1;
    let end = 0;
    for (let i = 0; i < total; i++) {
      const p = document.createElement('span');
      p.className = 'rain-piece';
      p.textContent = direction === 'pass' ? '❌' : i % 3 ? '❤️' : '💗';
      const delay = i < 6 ? -180 + i * 24 : Math.random() * 820;
      const flight = 980 + Math.random() * 440;
      const tilt = Math.random() * 46 - 23;
      p.dataset.delay = String(delay);
      p.style.left = (((i * 7 % total) + Math.random()) * 100 / total) + '%';
      p.style.fontSize = (14 + Math.random() * 13) + 'px';
      p.style.setProperty('--flight', flight + 'ms');
      p.style.setProperty('--tilt', tilt + 'deg');
      p.style.setProperty('--turn', (tilt + sign * (24 + Math.random()*64)) + 'deg');
      p.style.setProperty('--drift', (sign * (6+Math.random()*22) + Math.random()*14-7) + 'px');
      layer.append(p);
      end = Math.max(end, delay+flight);
    }
    this.started = performance.now();
    this.layer = layer;
    this.place(stage);
    this.timer = setTimeout(() => this.clear(), end + 55);
  }
}
