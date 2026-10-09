'use strict';
/* ============================================================
   ANALOG//LAB — core: utilitários, estado, camadas e composição
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in props) {
    const v = props[k];
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e[k] = v;
  }
  for (const c of kids) e.append(c);
  return e;
}
/* gerador pseudo-aleatório com semente (ruído estável em imagens paradas) */
function rngSeed(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
/* pool de canvases reutilizáveis (evita alocar a cada frame) */
const pool = {};
function pc(key, w, h) {
  let p = pool[key];
  if (!p) { const c = document.createElement('canvas'); p = pool[key] = { c, x: c.getContext('2d', { willReadFrequently: true }) }; }
  if (p.c.width !== w || p.c.height !== h) { p.c.width = w; p.c.height = h; }
  return p;
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function cloneCanvas(c) { const n = mk(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; }

/* ---------------- estado global ---------------- */
const doc = { w: 1280, h: 720 };
const S = {
  layers: [], sel: null, fx: null, tool: 'move',
  anim: false, t: 0, frame: 0, seed: 20240607,
  zoom: 1, px: 0, py: 0, showOrig: false, bg: '#000000',
  hist: [], hi: -1,
  opt: { brush: 28, soft: 0.35, bop: 1, color: '#b00010', btype: 'normal', cShape: 'rect', cMode: 'black', cStr: 18 }
};
let _id = 1;

const view = $('#view'), vctx = view.getContext('2d', { willReadFrequently: true });
const ov = $('#ov'), octx = ov.getContext('2d');
const comp = mk(doc.w, doc.h), cctx = comp.getContext('2d', { willReadFrequently: true });
const work = mk(doc.w, doc.h), wctx = work.getContext('2d', { willReadFrequently: true });

function setDocSize(w, h) {
  const ow = doc.w, oh = doc.h;
  doc.w = w; doc.h = h;
  for (const c of [view, ov, comp, work]) { c.width = w; c.height = h; }
  $('#wrap').style.width = w + 'px'; $('#wrap').style.height = h + 'px';
  const dx = (w - ow) / 2, dy = (h - oh) / 2;
  for (const L of S.layers) {
    if (L.type === 'paint') {
      const n = mk(w, h); n.getContext('2d').drawImage(L.canvas, dx, dy); L.canvas = n; L.rev++;
    } else { L.x += dx; L.y += dy; }
  }
}

/* ---------------- camadas ---------------- */
const DEFFILT = { bright: 100, contrast: 100, sat: 100, hue: 0, blur: 0, gray: 0, sepia: 0, invert: 0 };
const BLENDS = [['source-over', 'Normal'], ['multiply', 'Multiplicar'], ['screen', 'Tela'], ['overlay', 'Sobrepor'],
  ['darken', 'Escurecer'], ['lighten', 'Clarear'], ['color-dodge', 'Subexpor cor'], ['color-burn', 'Superexpor cor'],
  ['hard-light', 'Luz direta'], ['soft-light', 'Luz suave'], ['difference', 'Diferença'], ['exclusion', 'Exclusão'],
  ['hue', 'Matiz'], ['saturation', 'Saturação'], ['color', 'Cor'], ['luminosity', 'Luminosidade'], ['lighter', 'Somar']];
const FONTS = [
  ['"Courier New",Courier,monospace', 'Courier New (máquina de escrever)'],
  ['Consolas,"Lucida Console",monospace', 'Consolas (terminal)'],
  ['"Lucida Console",monospace', 'Lucida Console (OSD de câmera)'],
  ['Impact,"Arial Black",sans-serif', 'Impact'],
  ['"Arial Black",Arial,sans-serif', 'Arial Black'],
  ['Arial,Helvetica,sans-serif', 'Arial'],
  ['Georgia,serif', 'Georgia'],
  ['"Times New Roman",serif', 'Times New Roman'],
  ['"Segoe Script","Brush Script MT",cursive', 'Manuscrito'],
  ['"Comic Sans MS",cursive', 'Comic Sans (sim)'],
  ['Papyrus,fantasy', 'Papyrus / fantasy']
];
const CMODES = [['black', 'Tarja preta'], ['redacted', 'Tarja com texto'], ['pixel', 'Pixelar'], ['blur', 'Borrar'],
  ['static', 'Estática de TV'], ['glitch', 'Glitch'], ['scribble', 'Rabisco de marcador'], ['invert', 'Inverter cores'], ['red', 'Vermelho sangue']];

function newLayer(type, o = {}) {
  return Object.assign({
    id: _id++, type, name: '', visible: true, locked: false, opacity: 1, blend: 'source-over', post: false,
    x: doc.w / 2, y: doc.h / 2, sx: 1, rot: 0, flip: false, filt: { ...DEFFILT },
    seed: (Math.random() * 1e9) | 0, rev: 0
  }, o);
}
const TYPE_NAME = { image: 'Imagem', text: 'Texto', censor: 'Censura', paint: 'Pintura', adjust: 'Ajuste' };
function addLayer(L, select = true) {
  if (!L.name) L.name = `${TYPE_NAME[L.type]} ${S.layers.filter(l => l.type === L.type).length + 1}`;
  // insere acima da selecionada
  const i = S.layers.findIndex(l => l.id === S.sel);
  if (i >= 0) S.layers.splice(i + 1, 0, L); else S.layers.push(L);
  if (select) S.sel = L.id;
  return L;
}
const cur = () => S.layers.find(l => l.id === S.sel) || null;

function filterStr(f) {
  const a = [];
  if (f.bright !== 100) a.push(`brightness(${f.bright}%)`);
  if (f.contrast !== 100) a.push(`contrast(${f.contrast}%)`);
  if (f.sat !== 100) a.push(`saturate(${f.sat}%)`);
  if (f.hue) a.push(`hue-rotate(${f.hue}deg)`);
  if (f.blur) a.push(`blur(${f.blur}px)`);
  if (f.gray) a.push(`grayscale(${f.gray}%)`);
  if (f.sepia) a.push(`sepia(${f.sepia}%)`);
  if (f.invert) a.push(`invert(${f.invert}%)`);
  return a.length ? a.join(' ') : 'none';
}
const xf = (ctx, L) => { ctx.translate(L.x, L.y); ctx.rotate(L.rot); ctx.scale(L.flip ? -L.sx : L.sx, L.sx); };

/* ---------- texto ---------- */
const mctx = mk(4, 4).getContext('2d');
const textFont = L => `${L.italic ? 'italic ' : ''}${L.bold ? 'bold ' : ''}${L.size}px ${L.font}`;
function textMeasure(L) {
  mctx.font = textFont(L);
  if ('letterSpacing' in mctx) mctx.letterSpacing = L.spacing + 'px';
  const lines = L.text.split('\n'); let w = 0;
  for (const l of lines) w = Math.max(w, mctx.measureText(l).width);
  const lh = L.size * 1.2;
  return { lines, w: w + L.size * 0.5, h: lh * lines.length + L.size * 0.2, lh };
}
function drawText(ctx, L) {
  const m = textMeasure(L);
  ctx.font = textFont(L);
  if ('letterSpacing' in ctx) ctx.letterSpacing = L.spacing + 'px';
  ctx.textBaseline = 'top'; ctx.textAlign = L.align; ctx.lineJoin = 'round';
  if (L.bgA > 0) { ctx.fillStyle = rgba(L.bg, L.bgA); ctx.fillRect(-m.w / 2, -m.h / 2, m.w, m.h); }
  const ax = L.align === 'left' ? -m.w / 2 + L.size * 0.25 : L.align === 'right' ? m.w / 2 - L.size * 0.25 : 0;
  m.lines.forEach((ln, i) => {
    const y = -m.h / 2 + L.size * 0.1 + i * m.lh;
    if (L.glow > 0) { ctx.shadowColor = L.glowC; ctx.shadowBlur = L.glow; }
    if (L.strokeW > 0) { ctx.strokeStyle = L.stroke; ctx.lineWidth = L.strokeW * 2; ctx.strokeText(ln, ax, y); }
    ctx.fillStyle = L.color; ctx.fillText(ln, ax, y);
    ctx.shadowBlur = 0;
  });
}
function textLayer(text, o = {}) {
  return newLayer('text', Object.assign({
    text, font: FONTS[1][0], size: Math.round(doc.h * 0.08), color: '#ffffff', bold: true, italic: false, align: 'center',
    stroke: '#000000', strokeW: 0, glow: 0, glowC: '#ff0000', bg: '#000000', bgA: 0, spacing: 0
  }, o));
}

/* ---------- caixa de seleção / hit-test ---------- */
function boxOf(L) {
  if (L.type === 'image') return { hw: L.w * L.sx / 2, hh: L.h * L.sx / 2 };
  if (L.type === 'text') { const m = textMeasure(L); return { hw: m.w * L.sx / 2, hh: m.h * L.sx / 2 }; }
  if (L.type === 'censor') return { hw: L.w / 2, hh: L.h / 2 };
  return null;
}
function toLocal(L, px, py) {
  const dx = px - L.x, dy = py - L.y, c = Math.cos(-L.rot), s = Math.sin(-L.rot);
  return [dx * c - dy * s, dx * s + dy * c];
}
function toWorld(L, lx, ly) {
  const c = Math.cos(L.rot), s = Math.sin(L.rot);
  return [L.x + lx * c - ly * s, L.y + lx * s + ly * c];
}
function hitLayer(px, py) {
  for (let i = S.layers.length - 1; i >= 0; i--) {
    const L = S.layers[i];
    if (!L.visible || L.locked) continue;
    const b = boxOf(L); if (!b) continue;
    const [lx, ly] = toLocal(L, px, py);
    if (Math.abs(lx) <= b.hw && Math.abs(ly) <= b.hh) return L;
  }
  return null;
}

/* ---------- censura ---------- */
function fillNoise(q, rnd, w, h) {
  q = pc(q, w, h);
  const id = q.x.createImageData(w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = (rnd() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  q.x.putImageData(id, 0, 0);
  return q;
}
function drawCensor(ctx, L) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const rnd = rngSeed(L.seed + (S.anim ? S.frame * 31 : S.seed));
  // caminho (rotacionado) -> recorte
  ctx.save();
  ctx.translate(L.x, L.y); ctx.rotate(L.rot);
  ctx.beginPath();
  if (L.shape === 'ellipse') ctx.ellipse(0, 0, L.w / 2, L.h / 2, 0, 0, Math.PI * 2); else ctx.rect(-L.w / 2, -L.h / 2, L.w, L.h);
  ctx.restore();
  ctx.clip();
  // bounding box em coordenadas do quadro
  const xs = [], ys = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [wx, wy] = toWorld(L, sx * L.w / 2, sy * L.h / 2); xs.push(wx); ys.push(wy); }
  const bx = clamp(Math.floor(Math.min(...xs)), 0, W), by = clamp(Math.floor(Math.min(...ys)), 0, H);
  const bw = clamp(Math.ceil(Math.max(...xs)), 0, W) - bx, bh = clamp(Math.ceil(Math.max(...ys)), 0, H) - by;
  if (bw < 1 || bh < 1) return;
  const str = Math.max(1, L.strength);
  switch (L.mode) {
    case 'black': ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bh); break;
    case 'red': ctx.fillStyle = 'rgba(110,0,6,.92)'; ctx.fillRect(bx, by, bw, bh); break;
    case 'redacted': {
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bh);
      const t = L.text || '[CENSURADO]';
      ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot);
      const fs = Math.max(8, Math.min(L.h * 0.55, L.w / (t.length * 0.62)));
      ctx.font = `bold ${fs}px "Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e6e6e6'; ctx.fillText(t, 0, 0); ctx.restore();
      break;
    }
    case 'pixel': {
      const sw = Math.max(1, Math.round(bw / str)), sh = Math.max(1, Math.round(bh / str));
      const q = pc('cz_p', sw, sh); q.x.imageSmoothingEnabled = true;
      q.x.drawImage(ctx.canvas, bx, by, bw, bh, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(q.c, 0, 0, sw, sh, bx, by, bw, bh); ctx.imageSmoothingEnabled = true;
      break;
    }
    case 'blur': {
      const pad = Math.ceil(str * 2), ex = Math.max(0, bx - pad), ey = Math.max(0, by - pad);
      const ew = Math.min(W, bx + bw + pad) - ex, eh = Math.min(H, by + bh + pad) - ey;
      const q = pc('cz_b', ew, eh); q.x.drawImage(ctx.canvas, ex, ey, ew, eh, 0, 0, ew, eh);
      ctx.filter = `blur(${str}px)`; ctx.drawImage(q.c, ex, ey); ctx.filter = 'none';
      break;
    }
    case 'static': {
      const q = fillNoise('cz_n', rnd, Math.ceil(bw / 3) + 1, Math.ceil(bh / 3) + 1);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(q.c, 0, 0, q.c.width, q.c.height, bx, by, bw, bh); ctx.imageSmoothingEnabled = true;
      break;
    }
    case 'glitch': {
      const q = pc('cz_g', bw, bh); q.x.drawImage(ctx.canvas, bx, by, bw, bh, 0, 0, bw, bh);
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bh);
      for (let y = 0; y < bh;) {
        const sh = Math.max(2, 3 + rnd() * bh * 0.18) | 0, dx = (rnd() - 0.5) * str * 4;
        ctx.drawImage(q.c, 0, y, bw, sh, bx + dx, by + y, bw, sh);
        if (rnd() < 0.25) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,0,60,.35)' : 'rgba(0,255,255,.3)'; ctx.fillRect(bx, by + y, bw, sh); }
        y += sh;
      }
      break;
    }
    case 'invert': {
      const q = pc('cz_i', bw, bh); q.x.drawImage(ctx.canvas, bx, by, bw, bh, 0, 0, bw, bh);
      ctx.filter = 'invert(1)'; ctx.drawImage(q.c, bx, by); ctx.filter = 'none';
      break;
    }
    case 'scribble': {
      ctx.strokeStyle = '#050505'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const lw = Math.max(5, Math.min(bw, bh) / 7); ctx.lineWidth = lw;
      const passes = Math.ceil(bh / lw * 1.6) + 2;
      ctx.beginPath();
      for (let i = 0; i < passes; i++) {
        const y = by + (i / passes) * bh + (rnd() - 0.5) * lw;
        ctx.moveTo(bx - lw * 0.3, y + (rnd() - 0.5) * lw);
        ctx.lineTo(bx + bw + lw * 0.3, y + (rnd() - 0.5) * lw);
      }
      ctx.stroke();
      ctx.lineWidth = lw * 0.7; ctx.beginPath();
      for (let i = 0; i < passes; i++) { const x = bx + (i / passes) * bw; ctx.moveTo(x, by - lw * .3); ctx.lineTo(x + (rnd() - 0.5) * lw * 3, by + bh + lw * .3); }
      ctx.stroke();
      break;
    }
  }
}

/* ---------- desenha uma camada ---------- */
function drawLayer(ctx, L) {
  ctx.save();
  ctx.globalAlpha = L.opacity;
  ctx.globalCompositeOperation = L.blend;
  const f = filterStr(L.filt);
  switch (L.type) {
    case 'image': ctx.filter = f; xf(ctx, L); ctx.drawImage(L.src, -L.w / 2, -L.h / 2); break;
    case 'text': ctx.filter = f; xf(ctx, L); drawText(ctx, L); break;
    case 'paint': ctx.filter = f; ctx.drawImage(L.canvas, 0, 0); break;
    case 'censor': ctx.filter = f; drawCensor(ctx, L); break;
    case 'adjust': {
      const W = ctx.canvas.width, H = ctx.canvas.height;
      const q = pc('adj', W, H); q.x.globalCompositeOperation = 'copy'; q.x.drawImage(ctx.canvas, 0, 0); q.x.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'source-over'; ctx.filter = f; ctx.drawImage(q.c, 0, 0);
      break;
    }
  }
  ctx.restore();
}
function renderComposite(ctx, which) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  if (which !== 'post') { ctx.fillStyle = S.bg; ctx.fillRect(0, 0, doc.w, doc.h); }
  ctx.restore();
  for (const L of S.layers) {
    if (!L.visible) continue;
    if (which === 'pre' && L.post) continue;
    if (which === 'post' && !L.post) continue;
    drawLayer(ctx, L);
  }
}

/* ---------- imagens ---------- */
const MAXSRC = 2800;
function toSrcCanvas(img) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = Math.min(1, MAXSRC / Math.max(iw, ih));
  const c = mk(Math.round(iw * k), Math.round(ih * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
function imageLayerFrom(src, name) {
  return newLayer('image', { src, w: src.width, h: src.height, name });
}
function fitLayer(L, mode) {
  if (L.type !== 'image') return;
  L.rot = 0;
  const k = mode === 'cover' ? Math.max(doc.w / L.w, doc.h / L.h) : mode === 'contain' ? Math.min(doc.w / L.w, doc.h / L.h) : 1;
  L.sx = k; L.x = doc.w / 2; L.y = doc.h / 2;
}
