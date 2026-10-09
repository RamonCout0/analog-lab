'use strict';
/* ============================================================
   ANALOG//LAB — interface: render, ferramentas, painéis, histórico, I/O
   ============================================================ */

/* ---------------- render loop ---------------- */
let dirty = true, raf = 0;
function invalidate() { dirty = true; if (!raf) raf = requestAnimationFrame(loop); }
function loop(ts) {
  raf = 0;
  if (S.anim) { S.t = ts / 1000; S.frame++; dirty = false; render(); raf = requestAnimationFrame(loop); }
  else if (dirty) { dirty = false; render(); }
}
function render() {
  renderComposite(cctx, 'pre');
  if (S.showOrig) vctx.drawImage(comp, 0, 0); else runFX();
  renderComposite(vctx, 'post');
  drawOverlay();
  $('#empty').classList.toggle('hide', S.layers.length > 0);
}
function drawOverlay() {
  octx.clearRect(0, 0, doc.w, doc.h);
  const L = cur(); if (!L || !L.visible) return;
  const b = boxOf(L); if (!b) return;
  const z = S.zoom, hs = 6 / z;
  octx.save(); octx.translate(L.x, L.y); octx.rotate(L.rot);
  octx.lineWidth = 1.5 / z; octx.strokeStyle = '#ff3b47'; octx.setLineDash([6 / z, 4 / z]);
  octx.strokeRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2); octx.setLineDash([]);
  octx.fillStyle = '#fff';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { octx.fillRect(sx * b.hw - hs, sy * b.hh - hs, hs * 2, hs * 2); octx.strokeRect(sx * b.hw - hs, sy * b.hh - hs, hs * 2, hs * 2); }
  const ry = -b.hh - 28 / z;
  octx.beginPath(); octx.moveTo(0, -b.hh); octx.lineTo(0, ry); octx.stroke();
  octx.beginPath(); octx.arc(0, ry, hs, 0, 7); octx.fill(); octx.stroke();
  octx.restore();
}

/* ---------------- zoom / pan ---------------- */
function applyView() {
  $('#wrap').style.transform = `translate(${S.px}px,${S.py}px) scale(${S.zoom})`;
  $('#wrap').classList.toggle('pix', S.zoom > 2.5);
  $('#zoomLbl').textContent = Math.round(S.zoom * 100) + '%';
  invalidate();
}
function fitView() {
  userView = false;
  const st = $('#stage'), r = st.getBoundingClientRect();
  if (r.width < 100 || r.height < 100) return;
  S.zoom = Math.min((r.width - 40) / doc.w, (r.height - 40) / doc.h, 4);
  S.px = (r.width - doc.w * S.zoom) / 2; S.py = (r.height - doc.h * S.zoom) / 2;
  applyView();
}
function pt(e) {
  const r = view.getBoundingClientRect();
  return [(e.clientX - r.left) * doc.w / r.width, (e.clientY - r.top) * doc.h / r.height];
}

/* ---------------- histórico ---------------- */
function cloneLayer(L) {
  const c = { ...L, filt: { ...L.filt } }; delete c._sc;
  if (L.type === 'paint') {
    if (!L._sc || L._sc.rev !== L.rev || L._sc.c.width !== L.canvas.width || L._sc.c.height !== L.canvas.height) L._sc = { rev: L.rev, c: cloneCanvas(L.canvas) };
    c.canvas = null; c._snap = L._sc;
  }
  return c;
}
function restoreLayer(c) {
  const L = { ...c, filt: { ...c.filt } };
  if (c.type === 'paint') { L.canvas = cloneCanvas(c._snap.c); L._sc = c._snap; delete L._snap; }
  return L;
}
const snapshot = () => ({ w: doc.w, h: doc.h, sel: S.sel, fx: JSON.parse(JSON.stringify(S.fx)), layers: S.layers.map(cloneLayer) });
function commit() {
  S.hist.length = S.hi + 1;
  S.hist.push(snapshot());
  if (S.hist.length > 40) S.hist.shift();
  S.hi = S.hist.length - 1;
  buildLayerList(); updateUndoBtns(); invalidate();
}
function restoreSnap(s) {
  if (s.w !== doc.w || s.h !== doc.h) {
    doc.w = s.w; doc.h = s.h;
    for (const c of [view, ov, comp, work]) { c.width = s.w; c.height = s.h; }
    $('#wrap').style.width = s.w + 'px'; $('#wrap').style.height = s.h + 'px';
    syncDocSelect();
  }
  S.layers = s.layers.map(restoreLayer); S.fx = mergeFx(s.fx); S.sel = s.sel;
  buildAll(); invalidate();
}
function undo() { if (S.hi > 0) { S.hi--; restoreSnap(S.hist[S.hi]); updateUndoBtns(); } }
function redo() { if (S.hi < S.hist.length - 1) { S.hi++; restoreSnap(S.hist[S.hi]); updateUndoBtns(); } }
function updateUndoBtns() { $('#bUndo').disabled = S.hi <= 0; $('#bRedo').disabled = S.hi >= S.hist.length - 1; }

/* ---------------- helpers de UI ---------------- */
function sld(label, min, max, step, val, onIn, onCh, def) {
  const r = el('input', { type: 'range', min, max, step, value: val });
  const n = el('input', { type: 'number', min, max, step, value: val, class: 'num' });
  r.addEventListener('input', () => { n.value = r.value; onIn(+r.value); });
  r.addEventListener('change', () => onCh && onCh());
  n.addEventListener('change', () => { const v = clamp(+n.value || 0, min, max); r.value = n.value = v; onIn(v); onCh && onCh(); });
  const lb = el('label', { title: def !== undefined ? 'Duplo clique = valor padrão' : '' }, label);
  if (def !== undefined) lb.addEventListener('dblclick', () => { r.value = n.value = def; onIn(def); onCh && onCh(); });
  return el('div', { class: 'row' }, lb, r, n);
}
function selEl(opts, val, onch) {
  const s = el('select'); opts.forEach(([v, l]) => s.append(new Option(l, v))); s.value = val; s.onchange = () => onch(s.value); return s;
}
const rowOf = (label, ctl) => el('div', { class: 'row' }, el('label', {}, label), ctl);
function btnRow(items) {
  return el('div', { class: 'row btns' }, ...items.map(([t, fn, title]) => el('button', { title: title || '', onclick: fn }, t)));
}

/* controles ligados a uma camada */
const bindL = {
  sl: (label, L, key, min, max, step, def) => sld(label, min, max, step, L[key], v => { L[key] = v; invalidate(); }, commit, def),
  col: (label, L, key) => { const i = el('input', { type: 'color', value: L[key] }); i.oninput = () => { L[key] = i.value; invalidate(); }; i.onchange = commit; return rowOf(label, i); },
  chk: (label, L, key, after) => { const i = el('input', { type: 'checkbox', checked: !!L[key] }); i.onchange = () => { L[key] = i.checked; if (after) after(); commit(); }; return rowOf(label, i); },
  sel: (label, L, key, opts) => rowOf(label, selEl(opts, L[key], v => { L[key] = v; commit(); })),
  txt: (label, L, key, multi) => {
    const i = multi ? el('textarea', { value: L[key] }) : el('input', { type: 'text', value: L[key] });
    i.oninput = () => { L[key] = i.value; invalidate(); }; i.onchange = () => { buildLayerList(); commit(); };
    return multi ? el('div', {}, el('div', { class: 'muted' }, label), i) : rowOf(label, i);
  }
};

/* ---------------- painel de camadas ---------------- */
function thumbOf(L) {
  const c = mk(40, 30), x = c.getContext('2d');
  x.fillStyle = '#222'; x.fillRect(0, 0, 40, 30);
  const src = L.type === 'image' ? L.src : L.type === 'paint' ? L.canvas : null;
  if (src) { const k = Math.min(40 / src.width, 30 / src.height); x.drawImage(src, (40 - src.width * k) / 2, (30 - src.height * k) / 2, src.width * k, src.height * k); }
  else { x.fillStyle = '#aaa'; x.font = '16px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText({ text: 'T', censor: '▮', adjust: '◐' }[L.type] || '?', 20, 15); }
  return c;
}
function selectLayer(id) { S.sel = id; buildLayerList(); buildProps(); invalidate(); }
function buildLayerList() {
  const box = $('#layerList'); if (!box) return;
  box.innerHTML = '';
  if (!S.layers.length) box.append(el('div', { class: 'muted', style: 'padding:10px' }, 'Nenhuma camada ainda.'));
  [...S.layers].reverse().forEach(L => {
    const li = el('div', { class: 'layer' + (L.id === S.sel ? ' sel' : '') + (L.visible ? '' : ' hid'), draggable: true });
    li.append(
      el('button', { class: 'ic', title: 'Mostrar/ocultar', onclick: e => { e.stopPropagation(); L.visible = !L.visible; commit(); } }, L.visible ? '👁' : '·'),
      thumbOf(L),
      el('div', { class: 'nm' }, L.name, el('div', { class: 'tp' }, TYPE_NAME[L.type] + (L.post ? ' · acima dos efeitos' : ''))),
      el('button', { class: 'ic', title: 'Travar', onclick: e => { e.stopPropagation(); L.locked = !L.locked; commit(); } }, L.locked ? '🔒' : '🔓')
    );
    li.onclick = () => selectLayer(L.id);
    li.ondblclick = () => { const n = prompt('Nome da camada:', L.name); if (n) { L.name = n; commit(); } };
    li.ondragstart = e => { e.dataTransfer.setData('text/plain', String(L.id)); };
    li.ondragover = e => { e.preventDefault(); li.classList.add('over'); };
    li.ondragleave = () => li.classList.remove('over');
    li.ondrop = e => {
      e.preventDefault(); li.classList.remove('over');
      const id = +e.dataTransfer.getData('text/plain'); if (!id || id === L.id) return;
      const from = S.layers.findIndex(l => l.id === id), mv = S.layers.splice(from, 1)[0];
      S.layers.splice(S.layers.findIndex(l => l.id === L.id) + (from < S.layers.findIndex(l => l.id === L.id) + 1 ? 1 : 0), 0, mv);
      commit();
    };
    box.append(li);
  });
}
const STAMPS = [
  ['● REC', { text: '● REC', color: '#ff2a2a', font: FONTS[2][0] }],
  ['PLAY ▶', { text: 'PLAY ▶', font: FONTS[2][0], glow: 8, glowC: '#2a46ff' }],
  ['Timestamp', { text: 'OCT 08 1998\n11:42 PM', font: FONTS[2][0], align: 'left' }],
  ['CH 03', { text: 'CH 03', color: '#6bff9a', font: FONTS[2][0], glow: 6, glowC: '#00aa44' }],
  ['NO SIGNAL', { text: 'NO SIGNAL', font: FONTS[1][0], bg: '#0a2a8a', bgA: 1 }],
  ['AUTO TRACKING', { text: 'AUTO TRACKING', font: FONTS[2][0], glow: 6, glowC: '#2a46ff' }],
  ['[REDACTED]', { text: '[REDACTED]', font: FONTS[0][0], bg: '#000000', bgA: 1 }],
  ['NÃO OLHE', { text: 'NÃO OLHE', font: FONTS[3][0], color: '#b0000f', strokeW: 2, size: Math.round(doc.h * 0.14) }],
  ['ELE ESTÁ AQUI', { text: 'ELE ESTÁ AQUI', font: FONTS[8][0], color: '#a00010', size: Math.round(doc.h * 0.12), glow: 14, glowC: '#ff0000' }],
  ['Legenda', { text: 'Você não deveria estar aqui.', font: FONTS[5][0], bold: false, bg: '#000000', bgA: 0.55, size: Math.round(doc.h * 0.06) }]
];
function addNew(L) { addLayer(L); commit(); selectLayer(L.id); }
function newCensor() {
  const w = Math.round(doc.w * 0.25), h = Math.round(doc.h * 0.12);
  return newLayer('censor', { shape: S.opt.cShape, mode: S.opt.cMode, strength: S.opt.cStr, w, h, text: '[CENSURADO]', name: '' });
}
function newPaint() { return newLayer('paint', { canvas: mk(doc.w, doc.h), name: '' }); }

function buildLayersTab() {
  const t = $('#tab-layers'); t.innerHTML = '';
  t.append(
    el('div', { class: 'addbar' },
      el('button', { onclick: () => $('#fileImg').click() }, '＋ Imagem'),
      el('button', { onclick: () => addNew(textLayer('TEXTO')) }, '＋ Texto'),
      el('button', { onclick: () => addNew(newCensor()) }, '＋ Censura'),
      el('button', { onclick: () => addNew(newPaint()) }, '＋ Pintura'),
      el('button', { title: 'Aplica um filtro a tudo que está abaixo dela', onclick: () => addNew(newLayer('adjust', { name: '' })) }, '＋ Ajuste')),
    rowOf('Carimbo rápido', selEl([['', 'inserir texto pronto…'], ...STAMPS.map((s, i) => [i, s[0]])], '', v => {
      if (v === '') return; const s = STAMPS[+v]; addNew(textLayer(s[1].text, s[1])); buildLayersTab();
    })),
    el('div', { id: 'layerList' }),
    btnRow([['⧉ Duplicar', duplicateLayer], ['🗑 Excluir', deleteLayer], ['▲', () => moveLayer(1), 'Subir (])'], ['▼', () => moveLayer(-1), 'Descer ([)']]),
    btnRow([['Achatar tudo', flattenAll, 'Une todas as camadas visíveis numa só'], ['Fixar efeitos (bake)', bakeFx, 'Transforma o resultado com efeitos numa imagem e zera os efeitos — depois você pode empilhar mais coisas']]),
    el('div', { id: 'props' }));
  buildLayerList(); buildProps();
}
function duplicateLayer() {
  const L = cur(); if (!L) return;
  const c = { ...L, filt: { ...L.filt }, id: _id++, name: L.name + ' cópia', x: L.x + 20, y: L.y + 20, seed: (Math.random() * 1e9) | 0 };
  delete c._sc; if (L.type === 'paint') c.canvas = cloneCanvas(L.canvas);
  addLayer(c); commit(); buildProps();
}
function deleteLayer() { const L = cur(); if (!L) return; S.layers = S.layers.filter(l => l !== L); S.sel = S.layers.length ? S.layers[S.layers.length - 1].id : null; commit(); buildProps(); }
function moveLayer(d) {
  const i = S.layers.findIndex(l => l.id === S.sel), j = i + d; if (i < 0 || j < 0 || j >= S.layers.length) return;
  [S.layers[i], S.layers[j]] = [S.layers[j], S.layers[i]]; commit();
}
function flattenAll() {
  if (!S.layers.length) return;
  const c = mk(doc.w, doc.h); renderComposite(c.getContext('2d'), 'all');
  S.layers = []; S.sel = null; addLayer(imageLayerFrom(c, 'Achatada')); const L = cur(); L.sx = 1; commit(); buildProps();
}
function bakeFx() {
  if (!S.layers.length) return;
  const pre = S.showOrig; S.showOrig = false; render();
  const c = cloneCanvas(view); S.showOrig = pre;
  S.layers = []; S.sel = null; S.fx = defaultFx(); addLayer(imageLayerFrom(c, 'Com efeitos fixados'));
  commit(); buildAll();
}

function sec(title, open, ...kids) {
  const d = el('details', { class: 'sec', open }, el('summary', {}, title));
  d.append(...kids); return d;
}
function buildProps() {
  const box = $('#props'); if (!box) return; box.innerHTML = '';
  const L = cur(); if (!L) return;
  box.append(el('h4', {}, `${TYPE_NAME[L.type]} — ${L.name}`));
  const post = bindL.chk('Acima dos efeitos', L, 'post');
  post.title = 'Se marcada, os efeitos globais (VHS, grão…) não afetam esta camada';
  const look = sec('Aparência', true, bindL.sl('Opacidade', L, 'opacity', 0, 1, 0.01, 1), bindL.sel('Mistura', L, 'blend', BLENDS), post);

  if (L.type === 'image') {
    look.append(btnRow([['Preencher', () => { fitLayer(L, 'cover'); commit(); buildProps(); }, 'Cobre o quadro todo (pode cortar)'], ['Ajustar', () => { fitLayer(L, 'contain'); commit(); buildProps(); }, 'Cabe inteira no quadro'], ['100%', () => { fitLayer(L, 'one'); commit(); buildProps(); }, 'Tamanho original']]));
  }
  if (L.type === 'text') {
    box.append(sec('Texto', true, bindL.txt('Texto', L, 'text', true), bindL.sel('Fonte', L, 'font', FONTS),
      bindL.sl('Tamanho', L, 'size', 8, 600, 1, Math.round(doc.h * 0.08)), bindL.col('Cor', L, 'color'),
      bindL.chk('Negrito', L, 'bold'), bindL.chk('Itálico', L, 'italic'),
      bindL.sel('Alinhar', L, 'align', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']])));
    box.append(sec('Estilo do texto', false, bindL.sl('Espaçamento', L, 'spacing', -5, 40, 0.5, 0),
      bindL.sl('Contorno', L, 'strokeW', 0, 20, 0.5, 0), bindL.col('Cor contorno', L, 'stroke'),
      bindL.sl('Brilho/glow', L, 'glow', 0, 60, 1, 0), bindL.col('Cor do glow', L, 'glowC'),
      bindL.sl('Caixa de fundo', L, 'bgA', 0, 1, 0.01, 0), bindL.col('Cor da caixa', L, 'bg')));
  }
  if (L.type === 'censor') {
    const kids = [bindL.sel('Modo', L, 'mode', CMODES), bindL.sel('Forma', L, 'shape', [['rect', 'Retângulo'], ['ellipse', 'Elipse']]),
      bindL.sl('Intensidade', L, 'strength', 2, 80, 1, 18), bindL.sl('Largura', L, 'w', 8, 3000, 1), bindL.sl('Altura', L, 'h', 8, 3000, 1)];
    if (L.mode === 'redacted') kids.push(bindL.txt('Texto', L, 'text'));
    box.append(sec('Censura', true, ...kids));
    box.querySelector('select').addEventListener('change', () => setTimeout(buildProps, 0));
  }
  if (L.type === 'paint') box.append(sec('Pintura', true, btnRow([['Limpar pintura', () => { L.canvas.getContext('2d').clearRect(0, 0, L.canvas.width, L.canvas.height); L.rev++; commit(); }]]),
    el('div', { class: 'muted' }, 'Use o pincel (B) para pintar nesta camada.')));
  box.append(look);
  if (boxOf(L)) {
    const kids = [bindL.sl('X', L, 'x', -doc.w, doc.w * 2, 1), bindL.sl('Y', L, 'y', -doc.h, doc.h * 2, 1)];
    if (L.type !== 'censor') kids.push(bindL.sl('Escala', L, 'sx', 0.05, 8, 0.01, 1));
    kids.push(sld('Rotação °', -180, 180, 0.5, Math.round(L.rot * 573) / 10, v => { L.rot = v * Math.PI / 180; invalidate(); }, commit, 0), bindL.chk('Espelhar', L, 'flip'));
    box.append(sec('Posição e tamanho', false, ...kids));
  }
  box.append(sec(L.type === 'adjust' ? 'Filtros (o que esta camada faz)' : 'Filtros da camada', L.type === 'adjust',
    bindL.sl('Brilho %', L.filt, 'bright', 0, 300, 1, 100), bindL.sl('Contraste %', L.filt, 'contrast', 0, 300, 1, 100),
    bindL.sl('Saturação %', L.filt, 'sat', 0, 300, 1, 100), bindL.sl('Matiz °', L.filt, 'hue', -180, 180, 1, 0),
    bindL.sl('Desfoque px', L.filt, 'blur', 0, 40, 0.5, 0), bindL.sl('P&B %', L.filt, 'gray', 0, 100, 1, 0),
    bindL.sl('Sépia %', L.filt, 'sepia', 0, 100, 1, 0), bindL.sl('Inverter %', L.filt, 'invert', 0, 100, 1, 0)));
}
const h4 = t => el('h4', {}, t);

/* ---------------- painel de efeitos ---------------- */
let fxOpen = 'color', fxQuery = '', fxOnlyActive = false;
let fxAdvanced = false;
try { fxAdvanced = localStorage.getItem('analog.adv') === '1'; } catch { }
const isChanged = (p, st) => p.t === 't' ? false : st[p.k] !== p.d;
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function buildFxTab() {
  const t = $('#tab-fx'); t.innerHTML = '';
  const search = el('input', { type: 'text', placeholder: '🔎 Buscar efeito (ex.: grão, tracking, vinheta)…', value: fxQuery, class: 'fxsearch' });
  search.oninput = () => { fxQuery = search.value; buildFxList(); };
  const master = sld('Intensidade geral', 0, 200, 1, S.master, v => { S.master = v; invalidate(); }, null, 100);
  master.title = 'Multiplica TODOS os efeitos de uma vez. 100% = como você configurou; 0% = sem efeito; acima de 100% = exagera.';
  const adv = el('input', { type: 'checkbox', checked: fxAdvanced });
  adv.onchange = () => { fxAdvanced = adv.checked; try { localStorage.setItem('analog.adv', fxAdvanced ? '1' : '0'); } catch { } buildFxList(); };
  const act = el('input', { type: 'checkbox', checked: fxOnlyActive });
  act.onchange = () => { fxOnlyActive = act.checked; buildFxList(); };
  t.append(search, master,
    el('div', { class: 'row chks' }, el('label', { class: 'chk' }, adv, 'Mostrar avançados'), el('label', { class: 'chk' }, act, 'Só os que uso')),
    btnRow([['↺ Zerar tudo', () => { S.fx = defaultFx(); S.master = 100; commit(); buildFxTab(); }], ['🎲 Aleatório', () => { randomizeFx(); commit(); buildFxTab(); }, 'Mistura efeitos ao acaso']]),
    el('div', { id: 'fxList' }));
  buildFxList();
}
function buildFxList() {
  const box = $('#fxList'); if (!box) return; box.innerHTML = '';
  const q = norm(fxQuery.trim());
  let any = false;
  for (const g of FXSPEC) {
    const st = S.fx[g.id];
    const changed = g.p.filter(p => isChanged(p, st)).length + (g.id === 'hud' && st.style ? 1 : 0);
    const params = g.p.filter(p => {
      if (q) return norm(p.n + ' ' + p.h + ' ' + g.name).includes(q);
      if (fxOnlyActive) return isChanged(p, st) || (g.id === 'hud' && st.style && p.t === 't');
      return fxAdvanced || !p.adv || isChanged(p, st);
    });
    if (!params.length) continue;
    any = true;
    const open = q || fxOnlyActive ? true : fxOpen === g.id;
    const grp = el('div', { class: 'grp' + (open ? ' open' : '') + (changed ? ' act' : '') + (st.on ? '' : ' off') });
    const on = el('input', { type: 'checkbox', checked: st.on, title: 'Ligar/desligar este grupo sem perder os valores' });
    on.onclick = e => e.stopPropagation();
    on.onchange = () => { st.on = on.checked; commit(); buildFxList(); };
    const rs = el('button', { title: 'Zerar só este grupo', onclick: e => { e.stopPropagation(); Object.assign(st, defaultFx()[g.id], { on: st.on }); commit(); buildFxList(); } }, '↺');
    const gh = el('div', { class: 'gh' }, on, el('b', {}, g.name), changed ? el('span', { class: 'badge', title: changed + ' ajuste(s) alterado(s)' }, String(changed)) : '', rs);
    gh.onclick = () => { fxOpen = fxOpen === g.id ? null : g.id; buildFxList(); };
    const gb = el('div', { class: 'gb' }, el('div', { class: 'gdesc' }, g.desc));
    for (const p of params) {
      let r;
      if (p.t === 'n') {
        r = sld(p.n, p.min, p.max, p.step, st[p.k], v => { st[p.k] = v; r.firstChild.classList.toggle('chg', v !== p.d); invalidate(); }, () => { commit(); refreshFxMarks(); }, p.d);
        r.firstChild.classList.toggle('chg', st[p.k] !== p.d);
      } else if (p.t === 's') {
        r = rowOf(p.n, selEl(p.opts.map((o, i) => [i, o]), st[p.k], v => { st[p.k] = +v; commit(); buildFxList(); }));
      } else {
        const i = el('input', { type: 'text', value: st[p.k] }); i.oninput = () => { st[p.k] = i.value; invalidate(); }; i.onchange = commit; r = rowOf(p.n, i);
      }
      if (p.h) r.title = p.h;
      gb.append(r);
      if (p.h && p.t !== 'n') gb.append(el('div', { class: 'hint' }, p.h));
    }
    grp.append(gh, gb); box.append(grp);
  }
  if (!any) box.append(el('div', { class: 'muted', style: 'padding:10px' }, q ? 'Nenhum efeito encontrado.' : 'Nenhum efeito alterado ainda. Desmarque "Só os que uso" ou aplique um Look.'));
}
// mantém o estado do painel em dia depois de soltar um slider (badges, cores)
function refreshFxMarks() { buildFxList(); }
function buildLooksTab() {
  const t = $('#tab-looks'); t.innerHTML = '';
  t.append(el('div', { class: 'muted', style: 'margin-bottom:6px' }, 'Clique para aplicar. Depois refine na aba Efeitos.'));
  const g = el('div', { class: 'looks' });
  for (const l of LOOKS) g.append(el('button', { onclick: () => { applyLook(l); commit(); buildFxTab(); } }, l.n, el('small', {}, l.d)));
  t.append(g);
}
function buildAll() { buildLayersTab(); buildFxTab(); buildLooksTab(); buildTools(); updateUndoBtns(); syncDocSelect(); }

/* ---------------- ferramentas ---------------- */
const TOOLS = [['move', 'Mover', '✥', 'V'], ['brush', 'Pincel', '🖌', 'B'], ['erase', 'Borracha', '⌫', 'E'], ['censor', 'Censura', '▮', 'C'], ['text', 'Texto', 'T', 'T'], ['hand', 'Mão', '✋', 'H']];
function buildTools() {
  const n = $('#tools'); n.innerHTML = '';
  for (const [id, name, ic, key] of TOOLS) n.append(el('button', { class: S.tool === id ? 'on' : '', title: `${name} (${key})`, onclick: () => setTool(id) }, el('b', {}, ic), name));
  buildOptbar();
}
function setTool(t) { S.tool = t; buildTools(); $('#stage').style.cursor = t === 'hand' ? 'grab' : t === 'move' ? 'default' : 'crosshair'; }
function buildOptbar() {
  const b = $('#optbar'); b.innerHTML = ''; const o = S.opt;
  const lab = (t, c) => el('label', {}, t, c);
  const r = (min, max, step, key, w) => { const i = el('input', { type: 'range', min, max, step, value: o[key] }); i.oninput = () => { o[key] = +i.value; }; return i; };
  if (S.tool === 'brush' || S.tool === 'erase') {
    b.append(lab('Tamanho', r(1, 200, 1, 'brush')), lab('Suavidade', r(0, 1, 0.01, 'soft')), lab('Opacidade', r(0.05, 1, 0.01, 'bop')));
    if (S.tool === 'brush') {
      const c = el('input', { type: 'color', value: o.color }); c.oninput = () => o.color = c.value;
      b.append(lab('Cor', c), lab('Tipo', selEl([['normal', 'Normal'], ['giz', 'Giz / áspero'], ['spray', 'Spray']], o.btype, v => o.btype = v)));
      for (const col of ['#b00010', '#000000', '#ffffff', '#6b0008', '#ffd39a']) b.append(el('button', { style: `background:${col};width:20px;height:20px;padding:0`, onclick: () => { o.color = col; c.value = col; } }));
    }
    b.append(el('span', { class: 'muted' }, 'Pinta na camada de Pintura selecionada (cria uma se precisar).'));
  } else if (S.tool === 'censor') {
    b.append(lab('Modo', selEl(CMODES, o.cMode, v => o.cMode = v)), lab('Forma', selEl([['rect', 'Retângulo'], ['ellipse', 'Elipse']], o.cShape, v => o.cShape = v)),
      lab('Intensidade', r(2, 80, 1, 'cStr')), el('span', { class: 'muted' }, 'Arraste sobre a imagem para criar a censura.'));
  } else if (S.tool === 'text') b.append(el('span', { class: 'muted' }, 'Clique na imagem para inserir um texto.'));
  else if (S.tool === 'hand') b.append(el('span', { class: 'muted' }, 'Arraste para mover a vista. Roda do mouse = zoom. (Espaço também move)'));
  else b.append(el('span', { class: 'muted' }, 'Arraste para mover • cantos = escala • bolinha = girar (Shift = 15°) • setas = ajuste fino • Ctrl+D duplica'));
}

/* ---------------- interação no palco ---------------- */
let drag = null, spaceDown = false, userView = false;
const stage = $('#stage');
stage.addEventListener('wheel', e => {
  e.preventDefault();
  const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const nz = clamp(S.zoom * Math.exp(-e.deltaY * 0.0015), 0.05, 10);
  S.px = mx - (mx - S.px) * nz / S.zoom; S.py = my - (my - S.py) * nz / S.zoom; S.zoom = nz; userView = true; applyView();
}, { passive: false });

function handleAt(L, p) {
  const b = boxOf(L); if (!b) return null;
  const hr = 11 / S.zoom;
  const ry = -b.hh - 28 / S.zoom, [rx0, ry0] = toWorld(L, 0, ry);
  if (Math.hypot(p[0] - rx0, p[1] - ry0) < hr) return 'rot';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [wx, wy] = toWorld(L, sx * b.hw, sy * b.hh); if (Math.hypot(p[0] - wx, p[1] - wy) < hr) return 'scale'; }
  return null;
}
function stamp(ctx, x, y, o, erase) {
  const r = o.brush / 2;
  ctx.save(); ctx.globalAlpha = o.bop; ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  if (!erase && o.btype === 'giz') {
    ctx.fillStyle = o.color; const n = Math.ceil(o.brush * 0.7);
    for (let i = 0; i < n; i++) { const a = Math.random() * 7, d = Math.sqrt(Math.random()) * r; ctx.globalAlpha = o.bop * (0.3 + Math.random() * 0.7); ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  } else if (!erase && o.btype === 'spray') {
    ctx.fillStyle = o.color; const n = Math.ceil(o.brush * 1.2);
    for (let i = 0; i < n; i++) { const a = Math.random() * 7, d = Math.abs((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * r; ctx.globalAlpha = o.bop * 0.5; ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5, 1.5); }
  } else {
    const col = erase ? '#000' : o.color;
    if (o.soft > 0.02) {
      const g = ctx.createRadialGradient(x, y, r * (1 - o.soft), x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, rgba(erase ? '#000000' : col, 0)); ctx.fillStyle = g;
    } else ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function strokeTo(L, a, b, erase) {
  const ctx = L.canvas.getContext('2d'), o = S.opt, step = Math.max(1, o.brush * 0.12);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i <= n; i++) stamp(ctx, a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, o, erase);
}
stage.addEventListener('pointerdown', e => {
  if (e.target.closest('#empty') && S.layers.length === 0 && S.tool !== 'hand') { /* segue */ }
  stage.setPointerCapture(e.pointerId);
  if (e.button === 1 || S.tool === 'hand' || spaceDown) { drag = { k: 'pan', sx: e.clientX, sy: e.clientY, px: S.px, py: S.py }; stage.style.cursor = 'grabbing'; return; }
  if (e.button !== 0) return;
  const p = pt(e), L = cur();
  if (S.tool === 'move') {
    if (L && L.visible && !L.locked) {
      const h = handleAt(L, p);
      if (h === 'rot') { drag = { k: 'rot', L }; return; }
      if (h === 'scale') { drag = { k: 'scale', L, d0: Math.hypot(p[0] - L.x, p[1] - L.y) || 1, sx0: L.sx }; return; }
    }
    const hit = hitLayer(p[0], p[1]);
    if (hit) { if (hit.id !== S.sel) selectLayer(hit.id); drag = { k: 'move', L: hit, ox: p[0] - hit.x, oy: p[1] - hit.y, moved: false }; }
    else if (L && L.locked === false && boxOf(L) === null) { /* camadas sem caixa: nada */ }
  } else if (S.tool === 'brush' || S.tool === 'erase') {
    let T = L && L.type === 'paint' && !L.locked ? L : null;
    if (!T) {
      if (S.tool === 'erase') { $('#status').textContent = 'A borracha só funciona em camadas de Pintura.'; return; }
      T = addLayer(newPaint()); buildLayerList(); buildProps();
    }
    drag = { k: 'paint', L: T, last: p, erase: S.tool === 'erase' };
    strokeTo(T, p, p, drag.erase); invalidate();
  } else if (S.tool === 'censor') {
    drag = { k: 'censor', p0: p, L: null };
  } else if (S.tool === 'text') {
    const T = textLayer('TEXTO'); T.x = p[0]; T.y = p[1]; addNew(T);
  }
});
stage.addEventListener('pointermove', e => {
  const p = pt(e);
  $('#status').textContent = `${doc.w}×${doc.h}  •  x ${Math.round(p[0])}  y ${Math.round(p[1])}  •  camadas: ${S.layers.length}` + (S.anim ? '  •  ANIMANDO' : '');
  if (!drag) return;
  if (drag.k === 'pan') { userView = true; S.px = drag.px + e.clientX - drag.sx; S.py = drag.py + e.clientY - drag.sy; applyView(); return; }
  const L = drag.L;
  if (drag.k === 'move') { L.x = p[0] - drag.ox; L.y = p[1] - drag.oy; drag.moved = true; }
  else if (drag.k === 'rot') { let a = Math.atan2(p[1] - L.y, p[0] - L.x) + Math.PI / 2; if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * Math.PI / 12; L.rot = a; }
  else if (drag.k === 'scale') {
    if (L.type === 'censor') { const [lx, ly] = toLocal(L, p[0], p[1]); L.w = Math.max(8, Math.abs(lx) * 2); L.h = Math.max(8, Math.abs(ly) * 2); }
    else L.sx = clamp(drag.sx0 * Math.hypot(p[0] - L.x, p[1] - L.y) / drag.d0, 0.03, 12);
  } else if (drag.k === 'paint') { strokeTo(L, drag.last, p, drag.erase); drag.last = p; }
  else if (drag.k === 'censor') {
    const [x0, y0] = drag.p0;
    if (!drag.L && Math.hypot(p[0] - x0, p[1] - y0) > 5 / S.zoom) { drag.L = addLayer(newCensor()); }
    if (drag.L) { Object.assign(drag.L, { x: (x0 + p[0]) / 2, y: (y0 + p[1]) / 2, w: Math.max(8, Math.abs(p[0] - x0)), h: Math.max(8, Math.abs(p[1] - y0)) }); }
  }
  invalidate();
});
function endDrag() {
  if (!drag) return; const d = drag; drag = null;
  stage.style.cursor = S.tool === 'hand' ? 'grab' : S.tool === 'move' ? 'default' : 'crosshair';
  if (d.k === 'pan') return;
  if (d.k === 'move' && !d.moved) return;
  if (d.k === 'paint') d.L.rev++;
  if (d.k === 'censor' && !d.L) return;
  commit(); buildProps();
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

/* ---------------- teclado ---------------- */
addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (ctrl && k === 'y') { e.preventDefault(); redo(); return; }
  if (ctrl && k === 'd') { e.preventDefault(); duplicateLayer(); return; }
  if (ctrl && k === 's') { e.preventDefault(); saveProject(); return; }
  if (ctrl) return;
  if (k === ' ') { spaceDown = true; e.preventDefault(); stage.style.cursor = 'grab'; return; }
  if (k === '\\') { S.showOrig = true; invalidate(); return; }
  const map = { v: 'move', b: 'brush', e: 'erase', c: 'censor', t: 'text', h: 'hand' };
  if (map[k]) { setTool(map[k]); return; }
  if (k === 'f') { fitView(); return; }
  if (k === 'a') { toggleAnim(); return; }
  if (k === 'delete' || k === 'backspace') { deleteLayer(); return; }
  if (k === ']') { moveLayer(1); return; }
  if (k === '[') { moveLayer(-1); return; }
  const L = cur();
  if (L && boxOf(L) && k.startsWith('arrow')) {
    e.preventDefault(); const s = e.shiftKey ? 10 : 1;
    if (k === 'arrowleft') L.x -= s; if (k === 'arrowright') L.x += s; if (k === 'arrowup') L.y -= s; if (k === 'arrowdown') L.y += s;
    invalidate(); clearTimeout(nudgeT); nudgeT = setTimeout(() => { commit(); buildProps(); }, 400);
  }
});
let nudgeT = 0;
addEventListener('keyup', e => {
  if (e.key === ' ') { spaceDown = false; stage.style.cursor = S.tool === 'hand' ? 'grab' : S.tool === 'move' ? 'default' : 'crosshair'; }
  if (e.key === '\\') { S.showOrig = false; invalidate(); }
});

/* ---------------- importar ---------------- */
async function fileToCanvas(file) {
  try { return toSrcCanvas(await createImageBitmap(file)); }
  catch { return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(toSrcCanvas(i)); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
}
async function importFiles(files) {
  const imgs = [...files].filter(f => f.type.startsWith('image/'));
  if (!imgs.length) return;
  for (const f of imgs) {
    const src = await fileToCanvas(f);
    const first = S.layers.length === 0;
    if (first) { // quadro assume a proporção da primeira foto
      const k = Math.min(1, 1600 / Math.max(src.width, src.height));
      const w = Math.max(64, Math.round(src.width * k)), h = Math.max(64, Math.round(src.height * k));
      setDocSize(w, h); syncDocSelect(); fitView();
    }
    const L = imageLayerFrom(src, f.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Imagem');
    fitLayer(L, first ? 'cover' : 'contain'); addLayer(L);
  }
  commit(); buildProps();
}
$('#bOpen').onclick = () => $('#fileImg').click();
$('#fileImg').onchange = e => { importFiles(e.target.files); e.target.value = ''; };
$('#bPaste').onclick = async () => {
  try {
    for (const it of await navigator.clipboard.read()) for (const ty of it.types) if (ty.startsWith('image/')) { importFiles([new File([await it.getType(ty)], 'colada.png', { type: ty })]); return; }
    $('#status').textContent = 'Nenhuma imagem na área de transferência.';
  } catch { $('#status').textContent = 'O navegador bloqueou a leitura — use Ctrl+V.'; }
};
addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) importFiles(fs); });
['dragenter', 'dragover'].forEach(n => addEventListener(n, e => { e.preventDefault(); if (e.dataTransfer?.types?.includes('Files')) stage.classList.add('drag'); }));
['dragleave', 'drop'].forEach(n => addEventListener(n, e => { e.preventDefault(); stage.classList.remove('drag'); }));
addEventListener('drop', e => { if (e.dataTransfer?.files?.length) importFiles(e.dataTransfer.files); });

/* ---------------- cena de teste ---------------- */
function demoScene() {
  const w = 1280, h = 720, c = mk(w, h), x = c.getContext('2d');
  const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); };
  poly([[0, 0], [w, 0], [w, h], [0, h]], '#555d66');
  poly([[0, 0], [w, 0], [770, 255], [510, 255]], '#8a949e');
  poly([[0, h], [w, h], [770, 440], [510, 440]], '#6d727a');
  poly([[0, 0], [510, 255], [510, 440], [0, h]], '#a5b0bb');
  poly([[w, 0], [770, 255], [770, 440], [w, h]], '#929dab');
  poly([[510, 255], [770, 255], [770, 440], [510, 440]], '#4d555e');
  poly([[612, 310], [668, 310], [668, 440], [612, 440]], '#050505');
  poly([[420, 40], [860, 40], [790, 150], [490, 150]], 'rgba(255,248,215,.9)');
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
  for (let i = 1; i < 8; i++) { const t = i / 8; x.beginPath(); x.moveTo(510 + (0 - 510) * t * 2, 440 + (h - 440) * t * 2); x.lineTo(640, 440); x.stroke(); }
  x.fillStyle = '#020202'; x.beginPath(); x.arc(640, 335, 9, 0, 7); x.fill();
  x.beginPath(); x.moveTo(628, 345); x.lineTo(652, 345); x.lineTo(660, 410); x.lineTo(620, 410); x.closePath(); x.fill();
  const g = x.createRadialGradient(640, 340, 20, 640, 340, 700); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  return c;
}
$('#bDemo').onclick = () => {
  if (!S.layers.length) { setDocSize(1280, 720); syncDocSelect(); fitView(); }
  const L = imageLayerFrom(demoScene(), 'Cena de teste'); fitLayer(L, S.layers.length ? 'contain' : 'cover'); addLayer(L); commit(); buildProps();
};

/* ---------------- quadro, zoom, animação ---------------- */
function syncDocSelect() {
  const s = $('#docSize'), v = `${doc.w}x${doc.h}`;
  if (![...s.options].some(o => o.value === v)) { const o = new Option(`Atual · ${v}`, v); s.add(o, 0); }
  s.value = v;
}
$('#docSize').onchange = e => {
  let v = e.target.value;
  if (v === 'custom') {
    const r = prompt('Largura x Altura (ex.: 800x600):', `${doc.w}x${doc.h}`); if (!r) return syncDocSelect(); v = r.toLowerCase().replace(/\s/g, '');
  }
  const m = /^(\d{2,4})x(\d{2,4})$/.exec(v); if (!m) return syncDocSelect();
  setDocSize(clamp(+m[1], 64, 4096), clamp(+m[2], 64, 4096)); syncDocSelect(); commit(); fitView();
};
$('#bFit').onclick = fitView;
function toggleAnim(force) {
  S.anim = force === undefined ? !S.anim : force;
  $('#bAnim').classList.toggle('on', S.anim); $('#bAnim').textContent = S.anim ? '■ Parar' : '▶ Animar';
  invalidate();
}
$('#bAnim').onclick = () => toggleAnim();
$('#bReroll').onclick = () => { S.seed = (Math.random() * 1e9) | 0; invalidate(); };
const orig = $('#bOrig');
orig.onpointerdown = () => { S.showOrig = true; invalidate(); };
['pointerup', 'pointerleave'].forEach(n => orig.addEventListener(n, () => { S.showOrig = false; invalidate(); }));
$('#bUndo').onclick = undo; $('#bRedo').onclick = redo;

/* ---------------- exportar / projeto ---------------- */
function download(blob, name) { const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const stamp2 = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
function freshFrame() { const o = S.showOrig; S.showOrig = false; render(); S.showOrig = o; }
function exportImg(type, q) {
  const wasSel = S.sel; S.sel = null; freshFrame();
  view.toBlob(b => { download(b, `analog-${stamp2()}.${type === 'image/png' ? 'png' : 'jpg'}`); S.sel = wasSel; invalidate(); }, type, q);
}
$('#bPNG').onclick = () => exportImg('image/png');
$('#bJPG').onclick = () => exportImg('image/jpeg', 0.92);
$('#bCopy').onclick = () => {
  freshFrame();
  view.toBlob(async b => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); $('#status').textContent = 'Imagem copiada!'; } catch { $('#status').textContent = 'Não foi possível copiar — use Exportar PNG.'; } });
};
let recording = false;
$('#bRec').onclick = () => {
  if (recording) return;
  if (!window.MediaRecorder) { $('#status').textContent = 'Este navegador não suporta gravação.'; return; }
  const secs = +$('#recSecs').value, mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  const chunks = [], was = S.anim, rec = new MediaRecorder(view.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8e6 });
  recording = true; toggleAnim(true); S.sel = null;
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => { download(new Blob(chunks, { type: 'video/webm' }), `analog-${stamp2()}.webm`); recording = false; toggleAnim(was); $('#bRec').textContent = '⏺ Gravar vídeo'; };
  rec.start(); let left = secs; $('#bRec').textContent = `⏺ ${left}s…`;
  const iv = setInterval(() => { left--; $('#bRec').textContent = `⏺ ${left}s…`; if (left <= 0) { clearInterval(iv); rec.stop(); } }, 1000);
};
function urlToCanvas(u) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => { const c = mk(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); res(c); }; i.onerror = rej; i.src = u; }); }
function saveProject() {
  const layers = S.layers.map(L => {
    const o = { ...L }; delete o._sc;
    if (L.type === 'image') o.src = L.src.toDataURL('image/png');
    if (L.type === 'paint') o.canvas = L.canvas.toDataURL('image/png');
    return o;
  });
  download(new Blob([JSON.stringify({ app: 'analog-lab', v: 1, doc: { w: doc.w, h: doc.h }, fx: S.fx, layers })], { type: 'application/json' }), `projeto-${stamp2()}.analog.json`);
}
$('#bSaveP').onclick = saveProject;
$('#bLoadP').onclick = () => $('#fileProj').click();
$('#fileProj').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text()); if (d.app !== 'analog-lab') throw 0;
    setDocSize(d.doc.w, d.doc.h); S.layers = [];
    for (const o of d.layers) {
      if (o.type === 'image') o.src = await urlToCanvas(o.src);
      if (o.type === 'paint') o.canvas = await urlToCanvas(o.canvas);
      o.id = _id++; S.layers.push(o);
    }
    S.sel = S.layers.length ? S.layers[S.layers.length - 1].id : null; S.fx = mergeFx(d.fx);
    S.hist = []; S.hi = -1; commit(); buildAll(); fitView();
  } catch { alert('Arquivo de projeto inválido.'); }
};

/* ---------------- abas & init ---------------- */
$$('#tabs button').forEach(b => b.onclick = () => {
  $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
});
new ResizeObserver(() => { if (!userView) fitView(); }).observe($('#stage'));
setDocSize(1280, 720);
buildAll();
fitView();
commit();
