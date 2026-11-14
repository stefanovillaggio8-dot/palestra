/*
 * RPG cinematic VFX preview V4.
 * Realtime optical effects are separate from the original character WebPs.
 * Two depth passes make light travel BEHIND and IN FRONT of the original art.
 * This module also exports its deterministic renderer for visual regression tests.
 */
(function (global) {
  'use strict';
  const TAU = Math.PI * 2;
  const cache = new Map();
  const fract = (n) => n - Math.floor(n);

  function rand(seed) {
    let s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function motes(kind, seed) {
    const key = `${kind}:${seed}`;
    if (cache.has(key)) return cache.get(key);
    const r = rand((seed + 1) * 91731 + (kind === 'astrale' ? 78 : 119));
    const arr = Array.from({ length: kind === 'astrale' ? 68 : 58 }, () => ({
      x: r(), y: r(), speed: .015 + r() * .042,
      sway: r() * 13 + 4, phase: r() * TAU,
      radius: .45 + Math.pow(r(), 2) * 2.1,
      front: r() > .63, tint: r()
    }));
    cache.set(key, arr);
    return arr;
  }

  function glow(ctx, x, y, rx, ry, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function ground(ctx, kind, front, w, h, t) {
    const astral = kind === 'astrale';
    const x = w * .5, y = h * .953;
    const rx = w * (astral ? .264 : .229), ry = h * .034;
    const color = astral ? 'rgba(242,176,255,' : 'rgba(146,245,238,';
    const gold = astral ? 'rgba(255,204,119,' : 'rgba(192,255,249,';
    if (!front) {
      glow(ctx, x, y + 4, rx * 1.5, h * .085, astral ? 'rgba(143,63,255,.23)' : 'rgba(45,201,203,.21)');
    }
    ctx.save();
    const a = front ? 0 : Math.PI, b = front ? Math.PI : TAU;
    ctx.shadowColor = astral ? '#b76aff' : '#65ffe6';
    ctx.shadowBlur = astral ? 18 : 15;
    ctx.lineWidth = astral ? 3 : 2.3;
    ctx.strokeStyle = color + (astral ? '.82)' : '.66)');
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, a, b); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = gold + (astral ? '.89)' : '.76)');
    ctx.beginPath(); ctx.ellipse(x, y, rx * .89, ry * .68, 0, a, b); ctx.stroke();
    if (astral) {
      for (let i = 0; i < 20; i++) {
        const angle = TAU * i / 20 + t * .17;
        if ((Math.sin(angle) >= 0) !== front) continue;
        const cs = Math.cos(angle), sn = Math.sin(angle);
        const px = x + cs * rx, py = y + sn * ry;
        ctx.save(); ctx.translate(px, py); ctx.rotate(angle);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,223,165,.64)';
        ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(2, 2); ctx.moveTo(-1, -3); ctx.lineTo(3, -1); ctx.stroke(); ctx.restore();
      }
    }
    ctx.restore();
  }

  function helix(ctx, front, w, h, t, strand) {
    const offset = strand * 2.09;
    const draw = (bloom) => {
      ctx.beginPath();
      let open = false;
      for (let i = 0; i <= 135; i++) {
        const u = i / 135;
        const theta = u * 5.3 * Math.PI + t * .73 + offset;
        const depth = Math.sin(theta);
        const visible = (depth >= 0) === front;
        const radius = w * (.174 - u * .052 + Math.sin(u * Math.PI) * .027);
        const xx = w * .5 + Math.cos(theta) * radius;
        const yy = h * (.905 - .69 * u) + Math.sin(theta * .6) * h * .009;
        if (visible) {
          if (!open) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          open = true;
        } else open = false;
      }
      ctx.strokeStyle = bloom ? (strand === 1 ? 'rgba(255,190,105,.21)' : 'rgba(179,95,255,.29)') :
        (strand === 1 ? 'rgba(255,217,145,.77)' : 'rgba(214,158,255,.66)');
      ctx.lineWidth = bloom ? (front ? 15 : 20) : (front ? 2.3 : 2.8);
      ctx.shadowColor = strand === 1 ? '#ffcf8d' : '#b06cff';
      ctx.shadowBlur = bloom ? 23 : 10;
      ctx.stroke();
    };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    draw(true); draw(false); ctx.restore();
  }

  function astralLightning(ctx, front, w, h, t) {
    ctx.save(); ctx.lineCap = 'round';
    for (let side = 0; side < 2; side++) {
      const s = side ? 1 : -1;
      const phase = t * 1.6 + side * 2.2;
      const alpha = .56 + .30 * Math.sin(phase * 1.7);
      const x0 = w * .5 + s * w * .205;
      const steps = 13;
      const path = [];
      for (let i = 0; i < steps; i++) {
        const u = i / (steps - 1);
        const xx = x0 + s * w * (.024 * Math.sin(u * 12 + phase) + .06 * (1 - u));
        const yy = h * (.79 - .62 * u);
        path.push([xx, yy]);
      }
      // Far-side arcs and near-side arcs alternate as the energy rotates.
      if ((Math.sin(phase + side) > 0) !== front) continue;
      ctx.beginPath(); path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.strokeStyle = `rgba(${side ? '255,197,118' : '196,131,255'},${alpha * .21})`;
      ctx.shadowColor = side ? '#ffd28f' : '#b85fff';
      ctx.shadowBlur = 23; ctx.lineWidth = 13; ctx.stroke();
      ctx.strokeStyle = `rgba(${side ? '255,230,173' : '237,187,255'},${alpha})`;
      ctx.shadowBlur = 9; ctx.lineWidth = 1.35; ctx.stroke();
    }
    ctx.restore();
  }

  function frostWisps(ctx, front, w, h, t) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 4; k++) {
      const side = (k % 2 === 0 ? -1 : 1);
      const phase = k * 1.71 + t * .44;
      ctx.beginPath();
      let drawing = false;
      for (let i = 0; i <= 88; i++) {
        const u = i / 88;
        const theta = u * 8.3 + phase;
        const depth = Math.sin(theta);
        const visible = (depth >= 0) === front;
        const radius = w * (.115 + .05 * Math.sin(u * 4.2 + phase));
        const xx = w * .5 + side * radius + Math.sin(theta) * w * .053;
        const yy = h * (.94 - u * .68) + Math.cos(theta * 1.6) * h * .009;
        if (visible) {
          if (!drawing) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          drawing = true;
        } else drawing = false;
      }
      ctx.shadowColor = '#6efef1'; ctx.shadowBlur = 17; ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(47,203,227,.17)'; ctx.stroke();
      ctx.shadowBlur = 8; ctx.lineWidth = 1.65;
      ctx.strokeStyle = 'rgba(160,255,251,.48)'; ctx.stroke();
    }
    ctx.restore();
  }

  function crystals(ctx, kind, front, w, h, t) {
    const astral = kind === 'astrale';
    ctx.save();
    for (let i = 0; i < (astral ? 12 : 9); i++) {
      const phase = i * 2.399 + t * (astral ? .23 : .11);
      const depth = Math.sin(phase);
      if ((depth >= 0) !== front) continue;
      const level = (i % 7) / 6;
      const xx = w * .5 + Math.cos(phase) * w * (.205 + .028 * Math.sin(i));
      const yy = h * (.23 + level * .61) + Math.cos(t * .8 + i) * 8;
      const size = (astral ? 4.7 : 3.5) + (depth + 1) * 2.2;
      ctx.translate(xx, yy); ctx.rotate(phase * .8);
      ctx.shadowColor = astral ? '#b680ff' : '#8cfbef'; ctx.shadowBlur = 12;
      ctx.fillStyle = astral ? 'rgba(196,134,255,.64)' : 'rgba(154,249,241,.51)';
      ctx.strokeStyle = astral ? 'rgba(255,221,160,.74)' : 'rgba(220,255,253,.75)';
      ctx.lineWidth = .85;
      ctx.beginPath(); ctx.moveTo(0,-size*1.8);ctx.lineTo(size*.65,0);ctx.lineTo(0,size*1.7);ctx.lineTo(-size*.65,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.rotate(-phase * .8);ctx.translate(-xx,-yy);
    }
    ctx.restore();
  }

  function particles(ctx, kind, front, w, h, t, seed) {
    const astral = kind === 'astrale';
    const arr = motes(kind, seed);
    ctx.save();
    for (const p of arr) {
      if (p.front !== front) continue;
      const u = astral ? fract(p.y + t * p.speed) : fract(p.y - t * p.speed);
      const x = w * (.15 + p.x * .70) + Math.sin(t * .68 + p.phase) * p.sway;
      const y = (astral ? 1-u : u) * h * .88 + h * .035;
      const r = p.radius * (front ? 1.13 : .83);
      const tone = astral ? (p.tint > .47 ? '255,218,164' : '214,148,255') : (p.tint > .5 ? '202,255,251' : '113,235,252');
      const a = astral ? .42 + p.tint * .45 : .38 + p.tint * .35;
      ctx.shadowColor = astral ? '#d69bff' : '#6af5ee'; ctx.shadowBlur = 7 + r * 3;
      ctx.fillStyle = `rgba(${tone},${a})`;
      ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
      if (astral && p.radius > 1.6) {
        ctx.strokeStyle = `rgba(255,230,195,${a * .65})`;ctx.lineWidth = .7;
        ctx.beginPath();ctx.moveTo(x,y-r*3);ctx.lineTo(x,y+r*3);ctx.stroke();
      }
    }
    ctx.restore();
  }

  function renderEffect(ctx, kind, front, w, h, t, seed = 1) {
    ctx.clearRect(0, 0, w, h);
    if (!w || !h) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    if (!front) {
      const astral = kind === 'astrale';
      glow(ctx,w*.5,h*.49,w*(astral ? .35 : .29),h*.46,
        astral ? 'rgba(127,51,252,.19)' : 'rgba(39,219,212,.12)');
      glow(ctx,w*.25,h*.67,w*.13,h*.30,
        astral ? 'rgba(245,135,200,.16)' : 'rgba(70,219,229,.09)');
      glow(ctx,w*.75,h*.60,w*.15,h*.32,
        astral ? 'rgba(129,95,255,.18)' : 'rgba(48,208,221,.10)');
    }
    ground(ctx,kind,front,w,h,t);
    if (kind === 'astrale') {
      for(let k=0;k<3;k++) helix(ctx,front,w,h,t,k);
      astralLightning(ctx,front,w,h,t);
    } else frostWisps(ctx,front,w,h,t);
    crystals(ctx,kind,front,w,h,t);
    particles(ctx,kind,front,w,h,t,seed);
    ctx.restore();
  }

  function install() {
    const elements = [...document.querySelectorAll('.stage')];
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const states = elements.map((stage, i) => {
      const kind = stage.closest('.card').classList.contains('astrale') ? 'astrale' : 'boreale';
      const image = stage.querySelector('.character');
      const back = document.createElement('canvas'), front = document.createElement('canvas');
      back.className = 'vfx-canvas vfx-back';front.className = 'vfx-canvas vfx-front';
      back.setAttribute('aria-hidden','true');front.setAttribute('aria-hidden','true');
      stage.insertBefore(back,image);image.after(front);
      return { stage,kind,seed:i+1,back,front,visible:true,width:0,height:0,dpr:1 };
    });
    function size(s) {
      const box = s.stage.getBoundingClientRect();
      const w = Math.round(box.width), h = Math.round(box.height);
      const dpr = Math.min(window.devicePixelRatio || 1,1.5);
      if (s.width === w && s.height === h && s.dpr === dpr) return;
      s.width = w;s.height = h;s.dpr = dpr;
      for (const c of [s.back,s.front]) {
        c.width = Math.round(w*dpr);c.height = Math.round(h*dpr);
        c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
      }
    }
    states.forEach(size);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => states.forEach(size));
      states.forEach(s=>ro.observe(s.stage));
    } else window.addEventListener('resize',()=>states.forEach(size),{passive:true});
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries=>entries.forEach(e=>{
        const s = states.find(x=>x.stage===e.target);if(s)s.visible=e.isIntersecting;
      }),{rootMargin:'120px'});
      states.forEach(s=>io.observe(s.stage));
    }
    const paint = (time) => states.forEach(s=>{
      if (!s.visible || !s.width || !s.height) return;
      renderEffect(s.back.getContext('2d'),s.kind,false,s.width,s.height,time,s.seed);
      renderEffect(s.front.getContext('2d'),s.kind,true,s.width,s.height,time,s.seed);
    });
    if (reduced) { paint(2.8);return; }
    let last = -1;
    function tick(ms) {
      requestAnimationFrame(tick);
      if (document.hidden || ms-last < 34) return; // ~29 FPS and only visible cards.
      last = ms;paint(ms/1000);
    }
    requestAnimationFrame(tick);
  }

  const api = {renderEffect,install};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
