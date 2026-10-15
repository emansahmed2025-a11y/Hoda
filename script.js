/* ============================================================
   Hoda's Birthday Invitation — script.js
   Sections: config → helpers → music → FX canvas → scenes →
   envelope → 3D cake (Three.js + fallback) → letter →
   signature → photo → finale → parallax
   ============================================================ */
'use strict';

/* ---------------- [EDIT] CONFIG ---------------- */
const CONFIG = {
  cakeName: 'هدى',                       // name written on the 3D cake
  threeUrl: 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js',
  musicStartVolume: 0.22,               // soft start when the envelope opens
  musicRevealVolume: 0.42,              // slightly fuller during the reveal
  musicLetterVolume: 0.36,              // gentle during the letter
};

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------------- MUSIC ---------------- */
const music = {
  el: $('#bgMusic'), started: false, ok: false, pending: 0,
  start() {
    if (this.started) return; this.started = true;
    this.el.addEventListener('error', () => this.fail(), { once: true });
    this.el.volume = 0;
    const p = this.el.play();
    if (p && p.then) p.then(() => this.ready()).catch(() => this.fail());
    else this.ready();
  },
  ready() {
    this.ok = true;
    $('#musicToggle').hidden = false;
    this.ramp(this.pending || CONFIG.musicStartVolume, 2);
  },
  fail() { this.ok = false; $('#musicToggle').hidden = true; },
  ramp(v, d = 2) {
    this.pending = v;
    if (!this.ok) return;
    if (RM || !window.gsap) { this.el.volume = v; return; }
    gsap.to(this.el, { volume: v, duration: d, ease: 'sine.inOut', overwrite: true });
  },
};
 $('#musicToggle').addEventListener('click', () => {
  const b = $('#musicToggle');
  if (music.el.paused) {
    music.el.play().catch(() => {});
    b.classList.remove('is-paused'); b.setAttribute('aria-pressed', 'true');
  } else {
    music.el.pause();
    b.classList.add('is-paused'); b.setAttribute('aria-pressed', 'false');
  }
});

/* ---------------- FX CANVAS (dust / petals / gold sparkles) ---------------- */
const fx = (() => {
  const canvas = $('#fxCanvas');
  if (!canvas) return { setAmbient(){}, burst(){}, fountain(){} };
  const ctx = canvas.getContext('2d');
  const PETALS = ['#ecc9c3', '#e4b0aa', '#d9979f', '#f2d8d2', '#e8beb4'];
  let W = 0, H = 0, parts = [], ambient = null, raf = 0, last = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize, { passive: true }); resize();

  const makeDust = () => ({
    t: 'dust', x: rnd(0, W), y: rnd(0, H), r: rnd(.6, 2),
    vx: rnd(-4, 4), vy: rnd(-6, -2), ph: rnd(0, 6.28), tw: rnd(.4, 1.1),
  });
  const makePetal = (x, y, vx, vy, burst) => ({
    t: 'petal', x, y, vx: vx ?? rnd(-8, 8), vy: vy ?? rnd(10, 22),
    s: rnd(5, 12), rot: rnd(0, 6.28), vr: rnd(-1.4, 1.4),
    ph: rnd(0, 6.28), flip: rnd(.9, 2),
    c: PETALS[(Math.random() * PETALS.length) | 0],
    life: 0, max: rnd(9, 15), burst: !!burst,
  });
  const makeSpark = (x, y, vx, vy, burst) => ({
    t: 'spark', x, y, vx: vx || 0, vy: vy || 0, s: rnd(1, 2.6),
    g: burst ? 90 : 0, ph: rnd(0, 6.28), tw: rnd(2, 4.5),
    life: 0, max: burst ? rnd(1.1, 2.2) : rnd(2.5, 5), star: Math.random() < .3,
  });
  const count = t => parts.reduce((n, p) => n + (p.t === t ? 1 : 0), 0);

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((ts - last) / 1000 || .016, .05); last = ts;
    ctx.clearRect(0, 0, W, H);

    if (ambient === 'dust' && count('dust') < 30) parts.push(makeDust());
    if (ambient === 'petals') {
      if (count('petal') < (W < 640 ? 7 : 12) && Math.random() < .04)
        parts.push(makePetal(rnd(0, W), -16));
      if (count('spark') < 12) parts.push(makeSpark(rnd(0, W), rnd(0, H)));
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt; let dead = false;

      if (p.t === 'dust') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.ph += dt * p.tw;
        dead = p.y < -12 || p.x < -12 || p.x > W + 12;
        ctx.globalAlpha = .16 + .16 * Math.sin(p.ph);
        ctx.fillStyle = 'rgb(196,158,102)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();

      } else if (p.t === 'petal') {
        if (p.burst) p.vy += 80 * dt;
        p.x += p.vx * dt + Math.sin(p.ph) * 22 * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt; p.ph += dt * p.flip;
        dead = p.y > H + 24 || p.life > p.max;
        const k = Math.max(0, Math.min(p.life * 3, 1) * Math.min((p.max - p.life) * 1.2, 1));
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.scale(1, .35 + .65 * Math.abs(Math.sin(p.ph)));   // tumbling flip
        ctx.globalAlpha = .92 * k;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.moveTo(0, -p.s);
        ctx.bezierCurveTo(p.s * .95, -p.s * .45, p.s * .75, p.s * .7, 0, p.s);
        ctx.bezierCurveTo(-p.s * .75, p.s * .7, -p.s * .95, -p.s * .45, 0, -p.s);
        ctx.fill(); ctx.restore();

      } else { // sparkle
        if (p.g) { p.vy += p.g * dt; p.vx *= 1 - 1.4 * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        dead = p.life > p.max || p.y > H + 20;
        ctx.globalAlpha = Math.max(0, (1 - p.life / p.max)) *
                          (.55 + .45 * Math.sin(p.life * p.tw * 4 + p.ph));
        ctx.fillStyle = '#dcb268'; ctx.strokeStyle = '#e7c88a'; ctx.lineWidth = 1;
        if (p.star) {
          const l = p.s * 3.2;
          ctx.beginPath();
          ctx.moveTo(p.x - l, p.y); ctx.lineTo(p.x + l, p.y);
          ctx.moveTo(p.x, p.y - l); ctx.lineTo(p.x, p.y + l); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.fill();
      }
      if (dead) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  return {
    setAmbient(mode) {
      if (RM) return;
      ambient = mode;
      if (mode && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      if (!mode && raf) { cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, W, H); }
    },
    burst(x, y, { sparkles = 18, petals = 6, power = 1 } = {}) {
      if (RM) return;
      for (let i = 0; i < sparkles; i++) {
        const a = rnd(0, 6.283), v = rnd(50, 170) * power;
        parts.push(makeSpark(x, y, Math.cos(a) * v, Math.sin(a) * v - 60 * power, true));
      }
      for (let i = 0; i < petals; i++)
        parts.push(makePetal(x + rnd(-30, 30), y, rnd(-90, 90), -rnd(60, 170) * power, true));
    },
    fountain(x, y) {
      if (RM) return;
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI / 2 + rnd(-.7, .7), v = rnd(140, 340);
        parts.push(makeSpark(x + rnd(-46, 46), y, Math.cos(a) * v, Math.sin(a) * v, true));
      }
      for (let i = 0; i < 16; i++)
        parts.push(makePetal(x + rnd(-50, 50), y, rnd(-140, 140), -rnd(200, 340), true));
    },
  };
})();

/* ---------------- SCENES ---------------- */
function showScene(id) {
  ['scene1', 'scene2', 'scene3'].forEach(s =>
    $('#' + s).classList.toggle('is-hidden', s !== id));
  scrollTo(0, 0);
  if (cakeAPI) cakeAPI.setActive(id === 'scene2');
}

function introIn() {
  if (RM || !window.gsap) return;
  gsap.fromTo('.envelope-stage > *',
    { y: 26, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 1, stagger: .12, ease: 'power2.out', delay: .2 });
}

/* ---------------- ENVELOPE OPENING ---------------- */
let opened = false;
function openEnvelope() {
  if (opened) return; opened = true;
  const btn = $('#openInviteBtn'); btn.disabled = true;
  music.start();

  const flap = $('#envFlap'), seal = $('#envSeal'), letter = $('#envLetter');

  /* graceful path without GSAP */
  if (!window.gsap) {
    document.body.classList.add('no-anim');
    seal.style.opacity = 0;
    flap.classList.add('open');
    $('#envGlow').classList.add('on');
    letter.classList.add('risen');
    setTimeout(enterScene2, 900);
    return;
  }

  /* reduced-motion path: quick, gentle crossfade */
  if (RM) {
    gsap.timeline()
      .to(btn, { autoAlpha: 0, duration: .2 })
      .set(flap, { rotationX: -168, zIndex: 1, transformOrigin: '50% 0%' })
      .set(seal, { autoAlpha: 0 })
      .set('#envGlow', { autoAlpha: .9, scale: 1.1 })
      .set(letter, { yPercent: -74 })
      .to('#bloom', { autoAlpha: 1, duration: .4, delay: .3 })
      .add(enterScene2)
      .to('#bloom', { autoAlpha: 0, duration: .6 });
    return;
  }

  /* full cinematic timeline */
  const r = $('#envelope').getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * .4;
  gsap.set(flap, { transformOrigin: '50% 0%' });
  gsap.timeline({ defaults: { ease: 'power2.inOut' } })
    .to(btn, { autoAlpha: 0, y: 16, duration: .4 })
    .to(seal, { scale: 1.3, rotation: 15, autoAlpha: 0, duration: .55, ease: 'back.in(1.7)' }, '-=.1')
    .add(() => fx.burst(cx, cy, { sparkles: 14, petals: 0, power: .7 }), '-=.2')
    .to(flap, { rotationX: -90, duration: .6, ease: 'power2.in' })   // seal breaks, flap lifts
    .set(flap, { zIndex: 1 })                                        // passes behind the body
    .to(flap, { rotationX: -168, duration: .7, ease: 'power2.out' }) // stands open, lining shows
    .to('#envGlow', { autoAlpha: .95, scale: 1.15, duration: .9, ease: 'power1.out' }, '-=.55')
    .to(letter, { yPercent: -74, rotation: -2, scale: 1.06, duration: 1.5, ease: 'power2.out' }, '-=.4')
    .to('.envelope-scene', { scale: 1.17, duration: 1.7, ease: 'power1.inOut' }, '-=1.6') // camera closer
    .add(() => {
      const rr = $('#envelope').getBoundingClientRect();
      fx.burst(rr.left + rr.width / 2, rr.top + rr.height * .25,
        { sparkles: 26, petals: 10, power: 1 });
    }, '-=.7')
    .to('#bloom', { autoAlpha: 1, duration: .8, ease: 'power1.in' }, '+=.25')
    .add(enterScene2)
    .to('#bloom', { autoAlpha: 0, duration: 1.2, ease: 'power1.out' });
}

/* ---------------- SCENE 2 ---------------- */
function enterScene2() {
  showScene('scene2');
  fx.setAmbient('petals');
  music.ramp(CONFIG.musicRevealVolume, 2.5);
  if (window.gsap && !RM) {
    gsap.fromTo('.reveal-card',
      { y: 40, autoAlpha: 0, rotationX: 9, transformPerspective: 1000 },
      { y: 0, autoAlpha: 1, rotationX: 0, duration: 1.1, ease: 'power2.out', delay: .15 });
    gsap.fromTo('#scene2 [data-reveal]',
      { y: 22, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: .8, stagger: .12, delay: .5, ease: 'power2.out' });
  }
  initCake();
}

/* ---------------- 3D CAKE (Three.js) ---------------- */
let cakeAPI = null, blown = false, cakeStarted = false;

function initCake() {
  if (cakeStarted) return; cakeStarted = true;
  createCake().catch(err => {
    console.warn('3D cake unavailable — using the illustrated fallback.', err);
    showCakeFallback();
  });
}
function prefetchThree() { import(CONFIG.threeUrl).catch(() => {}); }

function showCakeFallback() {
  $('#cakeFallback').hidden = false;
  $('#cakeCanvasHost').classList.add('is-empty');
  enableBlow();
}
function enableBlow() {
  const b = $('#blowCandlesBtn');
  b.disabled = false; b.classList.add('is-ready');
}

async function createCake() {
  const host = $('#cakeCanvasHost');
  const THREE = await import(CONFIG.threeUrl);
  if (!window.WebGLRenderingContext) throw new Error('WebGL not supported');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  host.appendChild(renderer.domElement);
  host.classList.add('has-cake');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  camera.position.set(0, 3.6, 8.8);
  camera.lookAt(0, 1.35, 0);

  /* warm studio lighting */
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0xe7ccb6, 1.05));
  const key = new THREE.DirectionalLight(0xffe8cf, 1.5); key.position.set(4, 7, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xf6d7d2, .45); fill.position.set(-5, 3, 4); scene.add(fill);
  const candleLight = new THREE.PointLight(0xffb066, 2.4, 7, 1.7);
  candleLight.position.set(0, 3.2, 0); scene.add(candleLight);

  /* canvas-generated textures (no external assets needed) */
  const tex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const flameTex = tex(128, 128, g => {
    const gr = g.createRadialGradient(64, 76, 4, 64, 70, 60);
    gr.addColorStop(0, 'rgba(255,252,235,1)'); gr.addColorStop(.28, 'rgba(255,213,128,.95)');
    gr.addColorStop(.62, 'rgba(255,158,70,.32)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const dotTex = tex(64, 64, g => {
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.5, 'rgba(255,220,150,.45)');
    gr.addColorStop(1, 'rgba(255,210,130,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const shadowTex = tex(256, 256, g => {
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 124);
    gr.addColorStop(0, 'rgba(88,58,38,.4)'); gr.addColorStop(1, 'rgba(88,58,38,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  const stripeTex = tex(64, 64, g => {
    g.fillStyle = '#f7f0e1'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#d5ad63'; g.lineWidth = 9;
    for (let x = -64; x < 128; x += 32) {
      g.beginPath(); g.moveTo(x, 70); g.lineTo(x + 70, -6); g.stroke();
    }
  });
  stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping; stripeTex.repeat.set(3, 1.4);
  const nameTex = tex(2048, 512, g => {
    g.clearRect(0, 0, 2048, 512);
    g.fillStyle = 'rgba(170,122,54,.95)';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 190px Amiri, "Noto Naskh Arabic", serif';
    g.fillText(CONFIG.cakeName, 512, 230);
    g.fillText(CONFIG.cakeName, 1536, 230);
    g.strokeStyle = 'rgba(170,122,54,.55)'; g.lineWidth = 6; g.lineCap = 'round';
    [512, 1536].forEach(cx => {
      g.beginPath(); g.moveTo(cx - 250, 320); g.quadraticCurveTo(cx, 360, cx + 250, 320); g.stroke();
    });
  });

  /* the cake */
  const ivory = new THREE.MeshStandardMaterial({ color: 0xf7eedd, roughness: .55 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xefc7c3, roughness: .5 });
  const gold  = new THREE.MeshStandardMaterial({ color: 0xd4ab5e, roughness: .28, metalness: .85 });
  const cake = new THREE.Group(); cake.rotation.y = -Math.PI / 2; scene.add(cake);
  const add = (geo, mat, y, flat) => {
    const m = new THREE.Mesh(geo, mat); m.position.y = y;
    if (flat) m.rotation.x = Math.PI / 2; cake.add(m); return m;
  };

  add(new THREE.CylinderGeometry(2.35, 2.45, .09, 64), gold, .045);       // gold board
  add(new THREE.CylinderGeometry(1.9, 1.9, 1.15, 64), ivory, .655);       // tier 1
  add(new THREE.TorusGeometry(1.9, .022, 12, 72), gold, .45, true);       // gold line
  add(new THREE.CylinderGeometry(1.3, 1.3, .95, 64), blush, 1.705);       // tier 2
  add(new THREE.TorusGeometry(1.3, .022, 12, 72), gold, 2.17, true);      // gold line
  add(new THREE.CylinderGeometry(1.34, 1.34, .14, 64), ivory, 2.24);      // frosting cap
  add(new THREE.TorusGeometry(1.32, .06, 12, 72), ivory, 2.31, true);     // cap lip
  add(new THREE.TorusGeometry(1.88, .085, 12, 72), blush, 1.22, true);    // drip rim

  const dripGeo = new THREE.SphereGeometry(1, 12, 12);
  for (let i = 0; i < 26; i++) {                                          // icing drips
    const a = (i / 26) * Math.PI * 2 + Math.random() * .2, s = rnd(.07, .17);
    const d = new THREE.Mesh(dripGeo, blush);
    d.scale.set(s, s * rnd(1.2, 2.6), s);
    d.position.set(Math.cos(a) * 1.85, 1.2 - s * .4, Math.sin(a) * 1.85);
    cake.add(d);
  }
  const band = new THREE.Mesh(                                            // name band
    new THREE.CylinderGeometry(1.93, 1.93, .52, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: nameTex, transparent: true }));
  band.position.y = .9; cake.add(band);

  /* candles + flames */
  const candleGeo = new THREE.CylinderGeometry(.05, .056, .55, 16);
  const candles = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const h = new THREE.Group();
    h.position.set(Math.cos(a) * .72, 0, Math.sin(a) * .72);
    const body = new THREE.Mesh(candleGeo,
      new THREE.MeshStandardMaterial({ map: stripeTex, roughness: .5 }));
    body.position.y = 2.6; h.add(body);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .07, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3a30 }));
    wick.position.y = 2.91; h.add(wick);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flameTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.position.y = 3.02; fl.scale.set(.3, .44, 1); h.add(fl);
    cake.add(h);
    candles.push({ h, fl, lit: true, bx: .3, by: .44 });
  }

  /* soft contact shadow + drifting gold motes */
  const sh = new THREE.Mesh(new THREE.CircleGeometry(2.7, 48),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = .004; scene.add(sh);

  const N = 70, sPos = new Float32Array(N * 3), sSpd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = rnd(0, 6.283), r = rnd(1.5, 3);
    sPos[i * 3] = Math.cos(a) * r; sPos[i * 3 + 1] = rnd(.1, 3.7); sPos[i * 3 + 2] = Math.sin(a) * r;
    sSpd[i] = rnd(.12, .38);
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sMat = new THREE.PointsMaterial({
    map: dotTex, color: 0xe3bc72, size: .1, transparent: true,
    opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(sGeo, sMat));

  /* candle smoke */
  const smokeTex = tex(128, 128, g => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 60);
    gr.addColorStop(0, 'rgba(190,180,170,.5)'); gr.addColorStop(1, 'rgba(190,180,170,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const smokes = [];
  function puff(x, z) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: .32, depthWrite: false }));
    s.position.set(x, 3.0, z); s.scale.set(.16, .2, 1);
    scene.add(s); smokes.push({ s, life: 0 });
  }

  /* sizing */
  function fit() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(fit).observe(host); fit();

  /* render loop (pauses when the scene or tab is hidden) */
  const clock = new THREE.Clock();
  let active = true;
  function loop() {
    requestAnimationFrame(loop);
    if (!active || document.hidden) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;

    if (!RM) {
      cake.rotation.y += dt * .26;                       // gentle rotation
      cake.position.y = Math.sin(t * .9) * .05;          // soft float
      candles.forEach((c, i) => {
        if (!c.lit) return;
        const f = 1 + Math.sin(t * 11 + i * 1.7) * .09 + Math.sin(t * 23 + i) * .05;
        c.fl.scale.set(c.bx * f, c.by * (1 + Math.sin(t * 15 + i) * .05), 1);
        c.fl.position.y = 3.02 + Math.sin(t * 13 + i) * .012;
      });
    }
    candleLight.intensity = candles.some(c => c.lit) ? 2.2 + Math.sin(t * 9) * .45 : 0;

    const pos = sGeo.attributes.position;
    for (let i = 0; i < N; i++) {
      let y = pos.getY(i) + sSpd[i] * dt;
      if (y > 3.8) y = .05;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    sMat.opacity = .55 + Math.sin(t * 2.1) * .18;

    for (let i = smokes.length - 1; i >= 0; i--) {
      const o = smokes[i]; o.life += dt;
      o.s.position.y += dt * .55; o.s.position.x += dt * .12;
      o.s.material.opacity = Math.max(0, .32 * (1 - o.life / 1.5));
      o.s.scale.set(.16 + o.life * .5, .2 + o.life * .6, 1);
      if (o.life > 1.5) { scene.remove(o.s); o.s.material.dispose(); smokes.splice(i, 1); }
    }
    renderer.render(scene, camera);
  }
  loop();

  function blowOut() {
    if (blown) return;
    const rect = host.getBoundingClientRect();
    candles.forEach((c, i) => {
      c.lit = false;
      if (window.gsap && !RM) {
        gsap.to(c.fl.scale, { x: .001, y: .001, duration: .5, delay: i * .1, ease: 'power3.in' });
        gsap.to(c.fl.material, { opacity: 0, duration: .45, delay: i * .1 });
      } else { c.fl.scale.set(.001, .001, 1); c.fl.material.opacity = 0; }
      puff(c.h.position.x, c.h.position.z);
      const v = new THREE.Vector3(c.h.position.x, 3.02, c.h.position.z).project(camera);
      fx.burst(rect.left + (v.x * .5 + .5) * rect.width,
               rect.top + (-v.y * .5 + .5) * rect.height,
               { sparkles: 12, petals: 0, power: .8 });
    });
  }

  cakeAPI = { blowOut, setActive(v) { active = v; if (v) clock.getDelta(); } };
  enableBlow();
}

/* candle-blowing button */
 $('#blowCandlesBtn').addEventListener('click', () => {
  if (blown) return; blown = true;
  const b = $('#blowCandlesBtn'); b.disabled = true; b.classList.remove('is-ready');
  if (cakeAPI) cakeAPI.blowOut();
  else {
    const f = $('#cakeFallback');
    f.classList.add('blown');
    $$('.ffb-flame', f).forEach((el, i) => setTimeout(() => {
      const r = el.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, { sparkles: 10, petals: 0, power: .6 });
    }, 250 + i * 140));
  }
  const note = $('#wishNote'), lb = $('#toLetterBtn');
  note.hidden = false; lb.hidden = false;
  if (window.gsap && !RM) {
    gsap.fromTo(note, { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: .9, delay: 1, ease: 'power2.out' });
    gsap.fromTo(lb, { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: .8, delay: 1.7, ease: 'power2.out' });
  }
});

/* ---------------- SCENE 3 — LETTER ---------------- */
 $('#toLetterBtn').addEventListener('click', () => {
  showScene('scene3');
  music.ramp(CONFIG.musicLetterVolume, 2);
  if (window.gsap && !RM) {
    gsap.fromTo('#letterPaper',
      { y: 46, autoAlpha: 0, rotationX: 10, transformPerspective: 900 },
      { y: 0, autoAlpha: 1, rotationX: 0, duration: 1.1, ease: 'power2.out' });
    setTimeout(() => $('#signature').classList.add('show-hint'), 2600);
    setTimeout(() => $('#signature').classList.remove('show-hint'), 7500);
  }
  setupLetter();
});

let letterReady = false;
function setupLetter() {
  if (letterReady) return; letterReady = true;
  /* split into words (word-level keeps Arabic letter joining intact) */
  $$('#letterBody [data-line]').forEach(p => {
    const words = p.textContent.trim().split(/\s+/);
    p.setAttribute('aria-label', words.join(' '));
    p.innerHTML = words.map((w, i) =>
      `<span class="w" style="transition-delay:${Math.min(i * 45, 1500)}ms" aria-hidden="true">${w}</span>`
    ).join(' ');
  });
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('#scene3 [data-io], #letterBody [data-line]').forEach(el => io.observe(el));
}

/* editable signature (persists in this browser) */
try {
  const signEl = $('#signature');
  const saved = localStorage.getItem('hoda-signature');
  if (saved) signEl.textContent = saved;
  signEl.addEventListener('input', () => {
    try { localStorage.setItem('hoda-signature', signEl.textContent.trim()); } catch (e) {}
  });
} catch (e) { /* storage unavailable — signature simply won't persist */ }

/* photo: elegant placeholder if the file is missing */
const photo = $('#memoryPhoto');
photo.addEventListener('error', () => $('#photoFrame').classList.add('no-photo'), { once: true });
if (photo.complete && photo.naturalWidth === 0) $('#photoFrame').classList.add('no-photo');

/* ---------------- FINALE — GIFT BOX ---------------- */
let giftOpened = false;
 $('#finalGiftBtn').addEventListener('click', () => {
  if (giftOpened) return; giftOpened = true;
  const btn = $('#finalGiftBtn'), gb = $('#giftbox');
  btn.disabled = true;
  if (window.gsap && !RM) gsap.to(btn, { autoAlpha: 0, y: 12, duration: .4, onComplete: () => btn.hidden = true });
  else btn.hidden = true;

  /* freeze the idle sway, then smoothly transition to the open pose */
  const pose = getComputedStyle(gb).transform;
  gb.style.animation = 'none';
  if (pose && pose !== 'none') gb.style.transform = pose;
  gb.classList.add('open');
  if (!RM) {
    gb.style.transition = 'transform 1.2s cubic-bezier(.5,.05,.2,1)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      gb.style.transform = 'rotateX(-6deg) rotateY(-22deg)';
    }));
  }

  const r = gb.getBoundingClientRect();
  setTimeout(() => fx.fountain(r.left + r.width / 2, r.top + r.height * .25), 350);

  const msg = $('#finalMessage');
  msg.hidden = false;
  if (window.gsap && !RM) {
    gsap.fromTo(msg, { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: 1.1, delay: 1.2, ease: 'power2.out' });
  }
});

/* ---------------- PARALLAX (fine pointers only) ---------------- */
if (!RM && window.gsap && matchMedia('(pointer: fine)').matches) {
  const rx = gsap.quickTo('.env-parallax', 'rotationY', { duration: .9, ease: 'power2.out' });
  const ry = gsap.quickTo('.env-parallax', 'rotationX', { duration: .9, ease: 'power2.out' });
  const lx = gsap.quickTo('.scene1-light', 'x', { duration: 1.2, ease: 'power2.out' });
  const ly = gsap.quickTo('.scene1-light', 'y', { duration: 1.2, ease: 'power2.out' });
  addEventListener('mousemove', e => {
    rx((e.clientX / innerWidth - .5) * 12);
    ry((e.clientY / innerHeight - .5) * -8);
    lx((e.clientX / innerWidth - .5) * 26);
    ly((e.clientY / innerHeight - .5) * 18);
  }, { passive: true });
}

/* ---------------- BOOT ---------------- */
 $('#openInviteBtn').addEventListener('click', openEnvelope);
introIn();
fx.setAmbient('dust');
if ('requestIdleCallback' in window) requestIdleCallback(prefetchThree, { timeout: 4000 });
else setTimeout(prefetchThree, 2500);