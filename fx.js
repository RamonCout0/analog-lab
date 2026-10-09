'use strict';
/* ============================================================
   ANALOG//LAB — efeitos globais (pipeline VHS / CRT / grão / glitch…)
   ============================================================ */
const N = (k, n, min, max, d, step = 1) => ({ k, n, t: 'n', min, max, d, step });
const SE = (k, n, opts, d = 0) => ({ k, n, t: 's', opts, d });
const TX = (k, n, d = '') => ({ k, n, t: 't', d });

const FXSPEC = [
  { id: 'color', name: 'Cor & Tom', p: [
    N('bright', 'Brilho', -100, 100, 0), N('contrast', 'Contraste', -100, 100, 0), N('sat', 'Saturação', -100, 100, 0),
    N('hue', 'Matiz', -180, 180, 0), N('temp', 'Temperatura', -100, 100, 0), N('tint', 'Tinta (verde↔magenta)', -100, 100, 0),
    N('fade', 'Desbotado', 0, 100, 0), N('gamma', 'Gama', 0.4, 2.5, 1, 0.01), N('gray', 'Preto e branco', 0, 100, 0),
    N('sepia', 'Sépia', 0, 100, 0), N('invert', 'Inverter', 0, 100, 0), N('poster', 'Posterizar (0=off)', 0, 16, 0),
    SE('mono', 'Monocromo', ['nenhum', 'verde (visão noturna)', 'âmbar (monitor)', 'azul (CCTV)', 'vermelho', 'ciano frio']),
    N('monoAmt', 'Força do mono', 0, 100, 100)] },
  { id: 'soft', name: 'Foco & Resolução', p: [
    N('blur', 'Desfoque (px)', 0, 12, 0, 0.1), N('resX', 'Perda res. horizontal', 0, 95, 0), N('resY', 'Perda res. vertical', 0, 95, 0),
    SE('pix', 'Ampliação', ['suave', 'pixelada'], 0)] },
  { id: 'vhs', name: 'VHS / Fita', p: [
    N('chroma', 'Cor desalinhada (px)', 0, 30, 0, 0.5), N('smear', 'Borrão lateral (bleed)', 0, 100, 0),
    N('jitter', 'Tremor de linha', 0, 20, 0, 0.5), N('wave', 'Ondulação', 0, 30, 0, 0.5),
    N('tracking', 'Tracking (faixas)', 0, 100, 0), N('headsw', 'Distorção de rodapé', 0, 100, 0),
    N('drop', 'Dropouts (riscos brancos)', 0, 100, 0)] },
  { id: 'glitch', name: 'Glitch & Corrupção', p: [
    N('slices', 'Fatias deslocadas', 0, 100, 0), N('sliceMax', 'Alcance das fatias', 0, 200, 60),
    N('blocks', 'Blocos corrompidos', 0, 100, 0), N('rgb', 'Divisão RGB (px)', 0, 40, 0, 0.5)] },
  { id: 'noise', name: 'Ruído & Grão', p: [
    N('grain', 'Grão', 0, 100, 0), N('cnoise', 'Ruído colorido', 0, 100, 0), N('stat', 'Estática de TV', 0, 100, 0),
    N('dust', 'Poeira / sujeira', 0, 100, 0), N('scratch', 'Riscos verticais', 0, 100, 0)] },
  { id: 'crt', name: 'CRT / TV antiga', p: [
    N('scan', 'Scanlines', 0, 100, 0), N('gap', 'Espaço scanlines', 2, 8, 3), N('mask', 'Máscara RGB', 0, 100, 0),
    N('curve', 'Curvatura da tela', 0, 100, 0), N('ghost', 'Imagem fantasma', 0, 100, 0),
    N('roll', 'Rolagem vertical', 0, 100, 0), N('flick', 'Flicker (só animado)', 0, 100, 0)] },
  { id: 'light', name: 'Luz & Vinheta', p: [
    N('vig', 'Vinheta', 0, 100, 0), N('vsize', 'Tamanho da vinheta', 0, 100, 50),
    N('bloom', 'Brilho (bloom)', 0, 100, 0), N('brad', 'Raio do bloom', 1, 40, 12), N('pulse', 'Pulsar (respira)', 0, 100, 0)] },
  { id: 'horror', name: 'Horror & Atmosfera', p: [
    N('crush', 'Pretos esmagados', 0, 100, 0), N('blood', 'Sombras avermelhadas', 0, 100, 0), N('fog', 'Névoa', 0, 100, 0),
    N('torch', 'Lanterna (escuridão)', 0, 100, 0), N('tsize', 'Tamanho do foco', 10, 100, 40),
    N('tx', 'Foco X %', 0, 100, 50), N('ty', 'Foco Y %', 0, 100, 50)] },
  { id: 'hud', name: 'Carimbo de câmera (HUD)', p: [
    SE('style', 'Estilo', ['nenhum', 'camcorder', 'VHS PLAY', 'CCTV']),
    TX('t1', 'Data', 'OCT 08 1998'), TX('t2', 'Hora / câmera', '11:42 PM'), N('hsize', 'Tamanho %', 50, 200, 100)] }
];
function defaultFx() {
  const o = {};
  for (const g of FXSPEC) { o[g.id] = { on: true }; for (const p of g.p) o[g.id][p.k] = p.d; }
  return o;
}
const ND = defaultFx();
S.fx = defaultFx();
/* ---- metadados da interface: descrição de grupos, dicas e controles avançados ---- */
const GDESC = {
  color: 'Cor e exposição, como num editor comum. Comece por Brilho, Contraste e Saturação.',
  soft: 'Deixa a imagem borrada e com menos pixels — o "visual de câmera barata".',
  vhs: 'Defeitos típicos de fita VHS: cor escorrendo, linhas tremendo, faixas de tracking.',
  glitch: 'Corrupção digital: pedaços da imagem deslocados e canais de cor separados.',
  noise: 'Granulação, chuvisco de TV, poeira e riscos de filme.',
  crt: 'Aparência de TV de tubo: linhas, tela curva, fantasma e rolagem.',
  light: 'Escurece as bordas e faz as luzes brilharem.',
  horror: 'Clima de tensão: sombras fechadas, névoa e lanterna no escuro.',
  hud: 'Texto de câmera sobreposto (REC, data, hora). Escolha um estilo para ligar.'
};
const HINTS = {
  'color.bright': 'Mais claro (+) ou mais escuro (−)', 'color.contrast': 'Diferença entre claros e escuros',
  'color.sat': 'Intensidade das cores. Negativo = cores apagadas', 'color.hue': 'Gira todas as cores (muda o tom geral)',
  'color.temp': 'Azulado/frio (−) ou amarelado/quente (+)', 'color.tint': 'Esverdeado (−) ou magenta (+)',
  'color.fade': 'Levanta os pretos, deixando a foto "lavada" como fita antiga', 'color.gamma': 'Ilumina ou escurece só os tons médios',
  'color.gray': 'Transforma em preto e branco', 'color.sepia': 'Tom marrom de foto antiga', 'color.invert': 'Inverte as cores (negativo)',
  'color.poster': 'Reduz o número de tons por canal. 0 = desligado', 'color.mono': 'Pinta a imagem toda com uma cor só (verde = visão noturna)',
  'color.monoAmt': 'Quanto da cor única é aplicada (só vale com Monocromo)',
  'soft.blur': 'Desfoque suave sobre a imagem toda', 'soft.resX': 'Perde detalhe na horizontal — como fita VHS',
  'soft.resY': 'Perde detalhe na vertical — linhas mais grossas', 'soft.pix': 'Suave = borrado; Pixelada = quadradinhos nítidos',
  'vhs.chroma': 'Separa vermelho e azul para os lados (cor "fora do lugar")', 'vhs.smear': 'Faz a imagem escorrer para a direita',
  'vhs.jitter': 'Cada linha treme um pouquinho de forma aleatória', 'vhs.wave': 'Ondulação lenta na imagem toda',
  'vhs.tracking': 'Faixas horizontais de ruído e deslocamento', 'vhs.headsw': 'Distorção feia na borda de baixo, típica de VHS',
  'vhs.drop': 'Riscos brancos curtos e horizontais (falhas da fita)',
  'glitch.slices': 'Quantidade de faixas deslocadas para os lados', 'glitch.sliceMax': 'Distância máxima do deslocamento das faixas',
  'glitch.blocks': 'Quadrados da imagem copiados para o lugar errado', 'glitch.rgb': 'Separa os canais vermelho/azul na diagonal',
  'noise.grain': 'Granulação em preto e branco', 'noise.cnoise': 'Granulação colorida (câmera digital ruim)',
  'noise.stat': 'Chuvisco de TV sem sinal por cima da imagem', 'noise.dust': 'Pontinhos e fiapos de sujeira',
  'noise.scratch': 'Riscos verticais, como em filme rodado',
  'crt.scan': 'Linhas escuras horizontais da TV', 'crt.gap': 'Distância entre as linhas', 'crt.mask': 'Listras vermelhas/verdes/azuis da tela',
  'crt.curve': 'Entorta as bordas como tela de tubo', 'crt.ghost': 'Imagem duplicada e fraquinha ao lado',
  'crt.roll': 'Desloca a imagem na vertical, com barra escura (em Animar, rola sozinha)', 'crt.flick': 'Brilho piscando — só aparece em Animar',
  'light.vig': 'Escurece os cantos', 'light.vsize': 'Quão grande é a área central clara', 'light.bloom': 'Brilho que vaza das partes claras',
  'light.brad': 'Alcance desse brilho', 'light.pulse': 'Os cantos escurecem e clareiam como se respirassem (veja em Animar)',
  'horror.crush': 'Pretos ficam totalmente pretos — esconde detalhes', 'horror.blood': 'Sombras puxam para o vermelho',
  'horror.fog': 'Névoa clara subindo de baixo', 'horror.torch': 'Escuridão fora do foco de luz (0 = sem lanterna)',
  'horror.tsize': 'Tamanho do foco da lanterna', 'horror.tx': 'Posição horizontal do foco', 'horror.ty': 'Posição vertical do foco',
  'hud.style': 'camcorder = ● REC; VHS PLAY = ▶; CCTV = câmera de segurança', 'hud.t1': 'Texto da data (ex.: OCT 08 1998)',
  'hud.t2': 'Hora (camcorder/VHS) ou nome da câmera (CCTV)', 'hud.hsize': 'Tamanho do texto'
};
const ADV = new Set(['color.hue', 'color.tint', 'color.fade', 'color.gamma', 'color.sepia', 'color.invert', 'color.poster', 'color.monoAmt',
  'soft.pix', 'vhs.jitter', 'vhs.wave', 'vhs.headsw', 'glitch.sliceMax', 'glitch.blocks', 'noise.cnoise', 'noise.scratch',
  'crt.gap', 'crt.mask', 'crt.ghost', 'crt.roll', 'light.vsize', 'light.brad', 'light.pulse',
  'horror.crush', 'horror.tsize', 'horror.tx', 'horror.ty', 'hud.hsize']);
const NOSCALE = new Set(['tx', 'ty', 'tsize', 'gap', 'sliceMax', 'vsize', 'brad', 'hsize', 'monoAmt']);
for (const g of FXSPEC) {
  g.desc = GDESC[g.id] || '';
  for (const p of g.p) { p.h = HINTS[g.id + '.' + p.k] || ''; p.adv = ADV.has(g.id + '.' + p.k); p.sc = p.t === 'n' && !NOSCALE.has(p.k); }
}
S.master = 100; // intensidade geral (%) — multiplica todos os efeitos
function scaledFx() {
  const f = {}, k = S.master / 100;
  for (const g of FXSPEC) {
    const st = S.fx[g.id].on ? S.fx[g.id] : ND[g.id];
    if (k === 1 || st === ND[g.id]) { f[g.id] = st; continue; }
    const o = { ...st };
    for (const p of g.p) if (p.sc) o[p.k] = clamp(p.d + (st[p.k] - p.d) * k, p.min, p.max);
    f[g.id] = o;
  }
  return f;
}

function mergeFx(src) {
  const o = defaultFx();
  if (src) for (const g in o) if (src[g]) for (const k in o[g]) if (k in src[g]) o[g][k] = src[g][k];
  return o;
}

/* ------------------- LOOKS ------------------- */
const LOOKS = [
  { n: 'VHS 1985', d: 'tracking, bleed, fita gasta', fx: {
    color: { sat: -15, contrast: 15, temp: 15, fade: 20, bright: 5 }, soft: { resX: 55, resY: 20, blur: 0.5 },
    vhs: { chroma: 6, smear: 45, jitter: 3, wave: 3, tracking: 40, headsw: 60, drop: 30 }, noise: { grain: 25, stat: 8 },
    crt: { scan: 35, gap: 3, flick: 20, ghost: 15 }, light: { vig: 40, bloom: 25 }, hud: { style: 2, t1: 'OCT 08 1987', t2: '' } } },
  { n: 'Camcorder 1998', d: 'câmera caseira com REC', fx: {
    color: { sat: -10, temp: 12, contrast: 10, fade: 10 }, soft: { resX: 35, resY: 15 },
    vhs: { chroma: 3, smear: 25, jitter: 1.5, headsw: 20, drop: 10 }, noise: { grain: 35, cnoise: 15, dust: 20 },
    light: { vig: 45, bloom: 20 }, hud: { style: 1, t1: 'OCT 08 1998', t2: '11:42 PM' } } },
  { n: 'Câmera de segurança', d: 'CCTV azulado, câmera 03', fx: {
    color: { mono: 3, monoAmt: 70, contrast: 20, sat: -50 }, soft: { resX: 60, resY: 40, pix: 1 },
    vhs: { jitter: 2, tracking: 20, headsw: 30, chroma: 2 }, noise: { grain: 40, stat: 15 }, crt: { scan: 25 },
    light: { vig: 50 }, hud: { style: 3, t1: '10/08/1999 02:17:44', t2: 'CAM 03 - CORREDOR' } } },
  { n: 'Visão noturna', d: 'verde granulado, bloom forte', fx: {
    color: { mono: 1, monoAmt: 100, contrast: 30, bright: 15, gamma: 0.9 }, soft: { resX: 30, resY: 10 },
    noise: { grain: 55, stat: 15 }, light: { vig: 55, bloom: 45, brad: 14 }, vhs: { jitter: 1 },
    hud: { style: 1, t1: 'OCT 08 2003', t2: '03:12 AM' } } },
  { n: 'Found footage', d: 'dessaturado, sujo, glitchzinho', fx: {
    color: { sat: -35, contrast: 25, fade: 15, temp: -5 }, soft: { resX: 25, resY: 10 },
    glitch: { slices: 10, sliceMax: 30, rgb: 3 }, vhs: { jitter: 2, tracking: 30, chroma: 4, smear: 20, drop: 15 },
    noise: { grain: 45, dust: 40, scratch: 20 }, light: { vig: 60 }, horror: { crush: 15 },
    hud: { style: 1, t1: 'NOV 02 1996', t2: '09:58 PM' } } },
  { n: 'Liminal / Backrooms', d: 'amarelado, vazio, zumbido', fx: {
    color: { sat: -10, temp: 35, tint: -10, contrast: -5, fade: 25, bright: 5 }, soft: { resX: 20, resY: 5, blur: 0.6 },
    light: { vig: 35, bloom: 50, brad: 20 }, noise: { grain: 25, dust: 10 }, vhs: { chroma: 2, smear: 15 }, horror: { fog: 15 } } },
  { n: 'TV de tubo velha', d: 'curvatura, scanlines, máscara', fx: {
    crt: { scan: 55, gap: 3, mask: 40, curve: 45, ghost: 25, flick: 25 }, color: { contrast: 20, sat: -20, gray: 30 },
    soft: { blur: 0.7, resX: 35, resY: 25 }, noise: { grain: 30, stat: 25 }, light: { vig: 55, bloom: 35 },
    vhs: { jitter: 2, wave: 2, chroma: 3 } } },
  { n: 'Fita corrompida', d: 'tracking quebrado + glitch', fx: {
    glitch: { slices: 60, sliceMax: 120, blocks: 40, rgb: 14 },
    vhs: { chroma: 12, smear: 60, jitter: 8, wave: 10, tracking: 80, headsw: 90, drop: 60 },
    noise: { grain: 45, stat: 35, scratch: 30 }, color: { sat: -30, contrast: 30 }, crt: { scan: 30 }, light: { vig: 50 } } },
  { n: 'Analog horror clássico', d: 'frio, vermelho, amador', fx: {
    color: { sat: -60, contrast: 25, temp: -15, tint: 10, fade: 20 }, soft: { resX: 50, resY: 25 },
    horror: { blood: 35, crush: 25, fog: 10 }, vhs: { chroma: 5, smear: 35, tracking: 35, headsw: 50, drop: 25 },
    noise: { grain: 40, dust: 30, scratch: 25 }, light: { vig: 65, bloom: 20 }, crt: { scan: 30, flick: 30 },
    hud: { style: 2, t1: 'MAR 14 1991', t2: '' } } },
  { n: 'Sinal perdido', d: 'estática e rolagem', fx: {
    noise: { stat: 85, grain: 60 }, vhs: { tracking: 100, jitter: 12, headsw: 100, chroma: 14, drop: 80 },
    glitch: { slices: 80, rgb: 20 }, color: { gray: 60 }, crt: { scan: 40, roll: 30, flick: 40 }, light: { vig: 60 } } },
  { n: 'Filme 35mm vencido', d: 'granulado quente, poeira', fx: {
    color: { sat: -15, temp: 18, tint: -5, contrast: 15, fade: 30, gamma: 1.1 }, noise: { grain: 45, dust: 50, scratch: 35 },
    light: { vig: 40, bloom: 15 }, soft: { blur: 0.4 } } },
  { n: 'Lanterna no escuro', d: 'só um foco de luz', fx: {
    horror: { torch: 92, tsize: 35, tx: 50, ty: 55, fog: 20, crush: 20 }, color: { sat: -30, contrast: 20 },
    noise: { grain: 35 }, light: { vig: 30, bloom: 25 }, vhs: { chroma: 3 } } },
  { n: 'Pavor vermelho', d: 'tudo vermelho, respirando', fx: {
    color: { mono: 4, monoAmt: 55, contrast: 30, sat: -20 }, horror: { blood: 70, crush: 40 },
    light: { vig: 70, bloom: 30, pulse: 40 }, noise: { grain: 40, stat: 10 }, vhs: { chroma: 4, smear: 30, tracking: 20 } } },
  { n: 'Limpar tudo', d: 'zera todos os efeitos', fx: {} }
];
function applyLook(look) {
  S.fx = defaultFx();
  for (const g in look.fx) Object.assign(S.fx[g], look.fx[g]);
}
function randomizeFx() {
  S.fx = defaultFx();
  const ids = FXSPEC.map(g => g.id).filter(i => i !== 'hud').sort(() => Math.random() - 0.5).slice(0, 4 + (Math.random() * 3 | 0));
  for (const g of FXSPEC) {
    if (!ids.includes(g.id)) continue;
    for (const p of g.p) {
      if (p.t !== 'n' || Math.random() < 0.35) continue;
      const hi = p.max * 0.6, lo = p.min < 0 ? p.min * 0.4 : p.d;
      let v = lo + Math.random() * (hi - lo);
      if (p.k === 'tx' || p.k === 'ty' || p.k === 'tsize' || p.k === 'gap' || p.k === 'sliceMax' || p.k === 'vsize' || p.k === 'brad' || p.k === 'monoAmt') continue;
      if (p.k === 'gamma') v = 0.8 + Math.random() * 0.5;
      if (p.k === 'torch') v *= 0.8;
      S.fx[g.id][p.k] = Math.round(v / p.step) * p.step;
    }
  }
  if (Math.random() < 0.5) { S.fx.hud.style = 1 + (Math.random() * 3 | 0); }
  if (Math.random() < 0.3) { S.fx.color.mono = 1 + (Math.random() * 5 | 0); S.fx.color.monoAmt = 60; }
}

/* ------------------- HUD ------------------- */
function drawHUD(w, h, t) {
  if (!h.style) return;
  const W = doc.w, H = doc.h, fs = Math.round(H * 0.055 * h.hsize / 100), m = Math.round(W * 0.04);
  const blink = !t || Math.floor(t * 1.6) % 2 === 0;
  w.save();
  w.font = `bold ${fs}px "Lucida Console","Courier New",monospace`; w.textBaseline = 'top';
  w.shadowColor = 'rgba(0,0,0,.85)'; w.shadowBlur = Math.max(2, fs * 0.12); w.shadowOffsetX = w.shadowOffsetY = Math.max(1, fs * 0.05);
  const txt = (s, x, y, col = '#f4f4f4', al = 'left') => { w.textAlign = al; w.fillStyle = col; w.fillText(s, x, y); };
  if (h.style === 1) { // camcorder
    if (blink) { w.fillStyle = '#e8141c'; w.beginPath(); w.arc(m + fs * 0.4, m + fs * 0.55, fs * 0.28, 0, 7); w.fill(); }
    txt('REC', m + fs * 1.0, m);
    const bx = W - m - fs * 2.3, by = m + fs * 0.15;
    w.strokeStyle = '#f4f4f4'; w.lineWidth = Math.max(2, fs * 0.08); w.strokeRect(bx, by, fs * 1.7, fs * 0.7);
    w.fillStyle = '#f4f4f4'; w.fillRect(bx + fs * 1.7, by + fs * 0.2, fs * 0.15, fs * 0.3);
    for (let i = 0; i < 3; i++) w.fillRect(bx + fs * 0.1 + i * fs * 0.52, by + fs * 0.1, fs * 0.42, fs * 0.5);
    txt('SP', W - m, m + fs * 1.2, '#f4f4f4', 'right');
    txt(h.t2, m, H - m - fs); txt(h.t1, W - m, H - m - fs, '#f4f4f4', 'right');
  } else if (h.style === 2) { // VHS
    w.shadowColor = 'rgba(40,70,255,.9)'; w.shadowBlur = fs * 0.25;
    txt('PLAY ▶', m, m, '#ffffff'); txt('SP', W - m, m, '#ffffff', 'right');
    txt(h.t1, m, H - m - fs * (h.t2 ? 2.2 : 1)); if (h.t2) txt(h.t2, m, H - m - fs);
  } else if (h.style === 3) { // CCTV
    w.font = `${fs}px "Lucida Console","Courier New",monospace`;
    txt(h.t2, m, m);
    if (blink) { w.fillStyle = '#e8141c'; w.beginPath(); w.arc(W - m - fs * 2.5, m + fs * 0.5, fs * 0.25, 0, 7); w.fill(); }
    txt('REC', W - m, m, '#f4f4f4', 'right');
    txt(h.t1, m, H - m - fs);
  }
  w.restore();
}

/* ------------------- passes de pixel ------------------- */
const MONO = [null, [0.22, 1, 0.3], [1, 0.68, 0.1], [0.55, 0.76, 1], [1, 0.16, 0.1], [0.72, 0.96, 1]];
const colorOn = c => c.bright || c.contrast || c.sat || c.temp || c.tint || c.fade || c.gamma !== 1 || c.gray || c.sepia || c.invert || c.poster >= 2 || (c.mono && c.monoAmt);

function shiftPass(img, W, H, a) {
  const d = img.data, s = new Uint8ClampedArray(d), ox = Math.round(a), oy = Math.round(a * 0.4);
  for (let y = 0; y < H; y++) {
    const yr = clamp(y - oy, 0, H - 1) * W, yb = clamp(y + oy, 0, H - 1) * W, yg = y * W;
    for (let x = 0; x < W; x++) {
      const i = (yg + x) * 4;
      d[i] = s[(yr + clamp(x - ox, 0, W - 1)) * 4];
      d[i + 2] = s[(yb + clamp(x + ox, 0, W - 1)) * 4 + 2];
    }
  }
}
function vhsPass(img, W, H, p, rnd, t) {
  const d = img.data, s = new Uint8ClampedArray(d), hs = W / 640;
  const off = new Float32Array(H), noisy = new Uint8Array(H), ph = t * 1.7;
  for (let y = 0; y < H; y++) {
    let o = 0;
    if (p.jitter) o += (rnd() - 0.5) * p.jitter * hs * (rnd() < 0.15 ? 3 : 1);
    if (p.wave) o += Math.sin(y / H * 9 + ph) * p.wave * hs * 0.5 * Math.sin(y / H * 2.3 + ph * 0.6);
    off[y] = o;
  }
  if (p.tracking) {
    const bands = 1 + Math.floor(p.tracking / 35);
    for (let b = 0; b < bands; b++) {
      const c = (rnd() * H + (t ? t * H * 0.18 * (1 + b * 0.3) : 0)) % H;
      const bh = (0.02 + rnd() * 0.05) * H * (0.5 + p.tracking / 100), amp = p.tracking * hs * 0.9;
      for (let y = Math.floor(c - bh / 2); y < c + bh / 2; y++) {
        const yy = ((y % H) + H) % H, edge = 1 - Math.abs((y - c) / (bh / 2));
        off[yy] += ((rnd() - 0.3) * amp * 1.4 + amp * 0.3) * edge; noisy[yy] = 1;
      }
    }
  }
  if (p.headsw) {
    const hh = Math.floor(H * (0.03 + p.headsw / 100 * 0.03));
    for (let y = H - hh; y < H; y++) { const k = (y - (H - hh)) / hh; off[y] += k * k * p.headsw * hs * 0.9 + (rnd() - 0.5) * p.headsw * 0.2 * hs; noisy[y] = 2; }
  }
  const ch = Math.round(p.chroma * hs), k = p.smear / 100 * 0.88, kl = k * 0.55;
  for (let y = 0; y < H; y++) {
    const o = Math.round(off[y]), row = y * W * 4, nz = noisy[y];
    let pr = 0, pg = 0, pb = 0;
    for (let x = 0; x < W; x++) {
      const xr = clamp(x - o + ch, 0, W - 1), xg = clamp(x - o, 0, W - 1), xb = clamp(x - o - ch, 0, W - 1);
      let r = s[row + xr * 4], g = s[row + xg * 4 + 1], b = s[row + xb * 4 + 2];
      if (nz) { const n = (rnd() - 0.5) * (nz === 2 ? 130 : 90); r += n; g += n; b += n; }
      if (k) {
        if (x === 0) { pr = r; pg = g; pb = b; }
        pr = pr * k + r * (1 - k); pg = pg * kl + g * (1 - kl); pb = pb * k + b * (1 - k);
        r = pr; g = pg; b = pb;
      }
      const i = row + x * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
}
function gradePass(img, c, h, n, rnd) {
  const d = img.data, len = d.length;
  const br = c.bright * 2.55, ct = c.contrast * 2.55, cf = (259 * (ct + 255)) / (255 * (259 - ct));
  const sat = 1 + c.sat / 100, tmp = c.temp * 0.55, tint = c.tint * 0.5, fade = c.fade / 100;
  const gray = c.gray / 100, sep = c.sepia / 100, inv = c.invert / 100;
  const lut = new Uint8ClampedArray(256), gm = 1 / c.gamma;
  for (let i = 0; i < 256; i++) lut[i] = 255 * Math.pow(i / 255, gm);
  const pl = c.poster >= 2 ? c.poster - 1 : 0, mc = MONO[c.mono], ma = mc ? c.monoAmt / 100 : 0;
  const crush = h.crush * 0.7, cs = crush ? 255 / (255 - crush) : 1, blood = h.blood / 100;
  const gr = n.grain * 0.6, cn = n.cnoise * 0.5;
  const NT = new Float32Array(65536); for (let i = 0; i < 65536; i++) NT[i] = rnd() - 0.5;
  let np = (rnd() * 65536) | 0;
  const W = img.width;
  for (let i = 0; i < len; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (c.bright || c.contrast) { r = (r - 128) * cf + 128 + br; g = (g - 128) * cf + 128 + br; b = (b - 128) * cf + 128 + br; }
    if (tmp || tint) { r += tmp + tint * 0.3; g -= tint; b -= tmp - tint * 0.3; }
    let l = 0.299 * r + 0.587 * g + 0.114 * b;
    if (c.sat) { r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
    if (gray) { r += (l - r) * gray; g += (l - g) * gray; b += (l - b) * gray; }
    if (sep) {
      const sr = l * 1.07 + 20, sg = l * 0.92 + 8, sb = l * 0.7;
      r += (sr - r) * sep; g += (sg - g) * sep; b += (sb - b) * sep;
    }
    if (fade) { const k = 1 - 0.3 * fade; r = r * k + 46 * fade; g = g * k + 46 * fade; b = b * k + 50 * fade; }
    if (crush) { r = (r - crush) * cs; g = (g - crush) * cs; b = (b - crush) * cs; }
    if (blood) {
      l = 0.299 * r + 0.587 * g + 0.114 * b;
      const sh = Math.max(0, 1 - l / 170) * blood;
      r += sh * 70; g -= sh * 25; b -= sh * 35;
    }
    if (ma) {
      l = 0.299 * r + 0.587 * g + 0.114 * b;
      r += (l * mc[0] - r) * ma; g += (l * mc[1] - g) * ma; b += (l * mc[2] - b) * ma;
    }
    if (inv) { r += (255 - r - r) * inv; g += (255 - g - g) * inv; b += (255 - b - b) * inv; }
    r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
    if (pl) { r = Math.round(r / 255 * pl) / pl * 255; g = Math.round(g / 255 * pl) / pl * 255; b = Math.round(b / 255 * pl) / pl * 255; }
    if (c.gamma !== 1) { r = lut[r | 0]; g = lut[g | 0]; b = lut[b | 0]; }
    if (gr || cn) {
      if ((i / 4) % W === 0) np = (rnd() * 65536) | 0;
      const nn = NT[np = (np + 1) & 65535] * gr * 2;
      r += nn; g += nn; b += nn;
      if (cn) { r += NT[np = (np + 7) & 65535] * cn * 2; g += NT[np = (np + 13) & 65535] * cn * 2; b += NT[np = (np + 5) & 65535] * cn * 2; }
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}
function curvePass(w, W, H, k) {
  const img = w.getImageData(0, 0, W, H), s = new Uint8ClampedArray(img.data), d = img.data;
  const kk = k / 100 * 0.3, sc = 1 / (1 + kk * 0.8);
  for (let y = 0; y < H; y++) {
    const ny = (y / (H - 1)) * 2 - 1;
    for (let x = 0; x < W; x++) {
      const nx = (x / (W - 1)) * 2 - 1, f = (1 + kk * (nx * nx + ny * ny)) * sc;
      const sx = ((nx * f) + 1) / 2 * (W - 1), sy = ((ny * f) + 1) / 2 * (H - 1), i = (y * W + x) * 4;
      if (sx < 0 || sy < 0 || sx > W - 1 || sy > H - 1) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; continue; }
      const j = ((sy | 0) * W + (sx | 0)) * 4; d[i] = s[j]; d[i + 1] = s[j + 1]; d[i + 2] = s[j + 2]; d[i + 3] = 255;
    }
  }
  w.putImageData(img, 0, 0);
}

/* ------------------- pipeline ------------------- */
function runFX() {
  const W = doc.w, H = doc.h, f = scaledFx();
  const rnd = rngSeed(S.anim ? S.frame * 7919 + 13 : S.seed), t = S.anim ? S.t : 0, w = wctx;
  const sc = W / 1280;
  w.setTransform(1, 0, 0, 1, 0, 0); w.globalAlpha = 1; w.globalCompositeOperation = 'source-over'; w.filter = 'none'; w.shadowBlur = 0;
  w.drawImage(comp, 0, 0);
  const T = pc('fx_t', W, H);
  const copyW = () => { T.x.drawImage(work, 0, 0); return T.c; };

  // --- foco / matiz / resolução
  if (f.color.hue || f.soft.blur) {
    copyW(); w.fillStyle = '#000'; w.fillRect(0, 0, W, H);
    w.filter = `${f.color.hue ? `hue-rotate(${f.color.hue}deg) ` : ''}${f.soft.blur ? `blur(${f.soft.blur * sc}px)` : ''}`.trim() || 'none';
    w.drawImage(T.c, 0, 0); w.filter = 'none';
  }
  if (f.soft.resX || f.soft.resY) {
    const sw = Math.max(16, Math.round(W * (1 - f.soft.resX * 0.0095))), sh = Math.max(16, Math.round(H * (1 - f.soft.resY * 0.0095)));
    const q = pc('fx_low', sw, sh); q.x.imageSmoothingEnabled = true; q.x.imageSmoothingQuality = 'high';
    q.x.drawImage(work, 0, 0, sw, sh);
    w.imageSmoothingEnabled = f.soft.pix === 0; w.drawImage(q.c, 0, 0, sw, sh, 0, 0, W, H); w.imageSmoothingEnabled = true;
  }
  // --- glitch (fatias / blocos)
  const gl = f.glitch;
  if (gl.slices) {
    copyW(); const n = Math.round(gl.slices / 4) + 1;
    for (let i = 0; i < n; i++) {
      const y = (rnd() * H) | 0, hh = (4 + rnd() * H * 0.06) | 0, dx = Math.round((rnd() - 0.5) * 2 * gl.sliceMax * W / 640);
      w.drawImage(T.c, 0, y, W, hh, dx, y, W, hh);
    }
  }
  if (gl.blocks) {
    copyW(); const n = Math.round(gl.blocks * 1.2);
    for (let i = 0; i < n; i++) {
      const size = ((16 + rnd() * 48) * W / 640) | 0, sx = (rnd() * (W - size)) | 0, sy = (rnd() * (H - size)) | 0;
      const hh = Math.max(4, (size * (0.3 + rnd() * 0.7)) | 0);
      w.drawImage(T.c, sx, sy, size, hh, sx + (rnd() - 0.5) * size * 3, sy + (rnd() - 0.5) * size, size, hh);
    }
  }
  drawHUD(w, f.hud, t);

  // --- passes de pixel
  const v = f.vhs, hasVhs = v.chroma || v.smear || v.jitter || v.wave || v.tracking || v.headsw;
  const hasGrade = colorOn(f.color) || f.horror.crush || f.horror.blood || f.noise.grain || f.noise.cnoise;
  if (hasVhs || hasGrade || gl.rgb) {
    const img = w.getImageData(0, 0, W, H);
    if (gl.rgb) shiftPass(img, W, H, gl.rgb * W / 640);
    if (hasVhs) vhsPass(img, W, H, v, rnd, t);
    if (hasGrade) gradePass(img, f.color, f.horror, f.noise, rnd);
    w.putImageData(img, 0, 0);
  }

  // --- luz
  const li = f.light;
  if (li.bloom) {
    copyW(); w.save(); w.globalCompositeOperation = 'screen'; w.globalAlpha = li.bloom / 100;
    w.filter = `blur(${li.brad * sc}px) brightness(1.15) contrast(1.25)`; w.drawImage(T.c, 0, 0); w.restore();
  }
  const ho = f.horror;
  if (ho.fog) {
    const g = w.createLinearGradient(0, H * 0.35, 0, H);
    g.addColorStop(0, 'rgba(185,192,198,0)'); g.addColorStop(1, `rgba(185,192,198,${ho.fog / 100 * 0.7})`);
    w.fillStyle = g; w.fillRect(0, 0, W, H);
  }
  if (ho.torch) {
    const cx = ho.tx / 100 * W, cy = ho.ty / 100 * H, r = ho.tsize / 100 * Math.min(W, H);
    const g = w.createRadialGradient(cx, cy, r * 0.15, cx, cy, r * 1.25);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${ho.torch / 100})`);
    w.fillStyle = g; w.fillRect(0, 0, W, H);
  }

  // --- ruído
  const nz = f.noise;
  if (nz.stat) {
    const q = fillNoise('fx_snow', rnd, W >> 1, H >> 1);
    w.save(); w.globalAlpha = nz.stat / 100 * 0.7; w.drawImage(q.c, 0, 0, W, H); w.restore();
  }
  if (nz.dust) {
    const n = Math.round(nz.dust / 100 * 70 * (W / 1280) ** 2 + nz.dust / 8);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, a = 0.2 + rnd() * 0.6, r = (0.6 + rnd() * 1.8) * sc;
      w.fillStyle = rnd() < 0.55 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      if (rnd() < 0.2) { w.strokeStyle = w.fillStyle; w.lineWidth = Math.max(1, sc * 0.8); w.beginPath(); w.moveTo(x, y); w.quadraticCurveTo(x + (rnd() - 0.5) * 30 * sc, y + (rnd() - 0.5) * 30 * sc, x + (rnd() - 0.5) * 40 * sc, y + (rnd() - 0.5) * 40 * sc); w.stroke(); }
      else { w.beginPath(); w.arc(x, y, r, 0, 7); w.fill(); }
    }
  }
  if (nz.scratch) {
    const n = Math.round(nz.scratch / 8) + 1; w.lineWidth = Math.max(1, sc);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H * 0.8, len = (0.1 + rnd() * 0.9) * H;
      w.strokeStyle = `rgba(255,255,255,${0.12 + rnd() * 0.3})`; w.beginPath(); w.moveTo(x, y); w.lineTo(x + (rnd() - 0.5) * 6, y + len); w.stroke();
    }
  }
  if (v.drop) {
    const n = Math.round(v.drop / 100 * 16);
    for (let i = 0; i < n; i++) {
      const y = rnd() * H, x = rnd() * W, len = (30 + rnd() * 220) * W / 640, th = Math.max(1, Math.round((1 + (rnd() * 2 | 0)) * H / 480));
      w.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.5})`; w.fillRect(x, y, len, th);
      w.fillStyle = 'rgba(0,0,0,.35)'; w.fillRect(x - len * 0.3, y + th, len * 0.3, th);
    }
  }

  // --- CRT
  const c = f.crt;
  if (c.ghost) { copyW(); w.globalAlpha = c.ghost / 100 * 0.35; w.drawImage(T.c, W * 0.012, 0); w.globalAlpha = 1; }
  if (c.roll) {
    const off = (c.roll / 100 * H + (S.anim ? t * H * 0.25 : 0)) % H;
    copyW(); w.drawImage(T.c, 0, off); w.drawImage(T.c, 0, off - H);
    const g = w.createLinearGradient(0, off - H * 0.07, 0, off + H * 0.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    w.fillStyle = g; w.fillRect(0, off - H * 0.07, W, H * 0.09);
  }
  if (c.scan) {
    const gap = Math.max(2, Math.round(c.gap * H / 720)), dark = Math.max(1, Math.round(gap / 2)), o0 = S.anim ? (S.frame & 1) : 0;
    w.fillStyle = `rgba(0,0,0,${c.scan / 100 * 0.85})`;
    for (let y = o0; y < H; y += gap) w.fillRect(0, y, W, dark);
  }
  if (c.mask) {
    const st = Math.max(1, Math.round(W / 960)), k = Math.round(c.mask * 2.2);
    w.save(); w.globalCompositeOperation = 'multiply';
    for (let x = 0, i = 0; x < W; x += st, i++) {
      const m = i % 3; w.fillStyle = m === 0 ? `rgb(255,${255 - k},${255 - k})` : m === 1 ? `rgb(${255 - k},255,${255 - k})` : `rgb(${255 - k},${255 - k},255)`;
      w.fillRect(x, 0, st, H);
    }
    w.restore();
  }
  if (c.curve) curvePass(w, W, H, c.curve);
  if (li.vig || li.pulse) {
    const a = clamp((li.vig + li.pulse * 0.4 * (0.5 + 0.5 * Math.sin(t * 2.2))) / 100, 0, 1);
    const g = w.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.12 + li.vsize / 100 * 0.45), W / 2, H / 2, Math.hypot(W, H) / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    w.fillStyle = g; w.fillRect(0, 0, W, H);
  }
  if (c.flick && S.anim) {
    w.fillStyle = `rgba(0,0,0,${rnd() * c.flick / 100 * 0.35})`; w.fillRect(0, 0, W, H);
    if (rnd() < c.flick / 100 * 0.08) { w.fillStyle = 'rgba(255,255,255,.12)'; w.fillRect(0, 0, W, H); }
  }
  vctx.drawImage(work, 0, 0);
}
