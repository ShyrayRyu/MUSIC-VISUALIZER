'use strict';
const $ = (id) => document.getElementById(id);
const body = document.body;

/* =================== RÉGLAGES =================== */
const DEFAULTS = {
  mode: 'visualizer',
  // affichage
  halo: true, clock: true, queue: true, controls: true, autoHide: true,
  // fond
  bgMode: 'clip', bgFile: '', bgBlur: 40, bgDim: 55,
  // couleurs
  accentAuto: true, accent1: '#ff5ea8', accent2: '#ffb347', glow: 100,
  // visualiseur
  cover: true, spin: true, vizCaption: false, barStyle: 'bars', bars: 96, sens: 120, vizSize: 60,
  // paroles
  lyricsSize: 56, font: 'Outfit', align: 'left', offset: 0, wordFill: true,
  // divers
  lang: (navigator.language || 'fr').startsWith('fr') ? 'fr' : 'en', askAtStart: true, clock24: true, clockSize: 48, queueCount: 6, onTop: false, fps: 60
};
const SCHEMA = [
  ['Mode', [
    ['lang', 'select', 'Langue / Language', { fr: 'Français', en: 'English' }],
    ['mode', 'select', 'Mode d\'affichage', { visualizer: 'Visualiseur circulaire', lyrics: 'Paroles + clip', vinyl: 'Vinyle & file d\'attente' }]]],
  ['Interface', [
    ['halo', 'toggle', 'Halo lumineux des bords'], ['clock', 'toggle', 'Horloge'], ['clockSize', 'range', 'Taille horloge', [24, 120, 2]],
    ['clock24', 'toggle', 'Format 24 h'], ['queue', 'toggle', 'Pochettes sur le côté (historique)'], ['queueCount', 'range', 'Nombre de pochettes', [2, 10, 1]],
    ['askAtStart', 'toggle', 'Assistant au démarrage'], ['wizard', 'action', 'Ouvrir l\'assistant de configuration'],
    ['controls', 'toggle', 'Barre de contrôle'], ['autoHide', 'toggle', 'Masquer l\'interface au repos'], ['onTop', 'toggle', 'Toujours au premier plan']]],
  ['Fond / clip', [
    ['bgMode', 'select', 'Type de fond', { clip: 'Clip officiel / photo artiste (auto)', cover: 'Pochette floutée', aurora: 'Aurore animée', custom: 'Mon fichier (vidéo / image)', black: 'Noir' }],
    ['bgFile', 'file', 'Fichier (vidéo, gif, image)'], ['bgBlur', 'range', 'Flou', [0, 100, 1]], ['bgDim', 'range', 'Assombrissement', [0, 95, 1]]]],
  ['Couleurs', [
    ['accentAuto', 'toggle', 'Couleurs auto (pochette)'], ['accent1', 'color', 'Couleur 1'], ['accent2', 'color', 'Couleur 2'], ['glow', 'range', 'Intensité lumineuse', [0, 200, 5]]]],
  ['Visualiseur', [
    ['cover', 'toggle', 'Pochette ronde'], ['spin', 'toggle', 'Pochette qui tourne'], ['vizCaption', 'toggle', 'Afficher la ligne de paroles'],
    ['barStyle', 'select', 'Style', { bars: 'Barres', line: 'Courbe', dots: 'Points' }],
    ['bars', 'range', 'Nombre de barres', [32, 200, 4]], ['sens', 'range', 'Sensibilité', [40, 300, 5]], ['vizSize', 'range', 'Taille', [30, 100, 2]]]],
  ['Paroles', [
    ['lyricsSize', 'range', 'Taille du texte', [24, 120, 2]], ['wordFill', 'toggle', 'Remplissage mot par mot'],
    ['align', 'select', 'Alignement', { left: 'Gauche', center: 'Centre', right: 'Droite' }],
    ['font', 'select', 'Police', { 'Outfit': 'Outfit', 'system-ui': 'Système', 'Impact': 'Impact', 'Georgia': 'Georgia', 'monospace': 'Mono' }],
    ['offset', 'range', 'Décalage synchro (ms)', [-3000, 3000, 50]]]],
  ['Performance', [['fps', 'select', 'Images / seconde', { 30: '30', 60: '60', 144: '144' }]]]
];
let S = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('mv-settings') || '{}') };
if (S.bgMode === 'youtube') S.bgMode = 'clip';                          // migration : YouTube supprimé
if (!['Outfit', 'system-ui', 'Impact', 'Georgia', 'monospace'].includes(S.font)) S.font = 'Outfit';
const save = () => localStorage.setItem('mv-settings', JSON.stringify(S));

/* =================== LANGUE (FR / EN) =================== */
const EN = {
  "Mode": "Mode", "Interface": "Interface", "Fond / clip": "Background / clip", "Couleurs": "Colors", "Visualiseur": "Visualizer", "Paroles": "Lyrics", "Performance": "Performance",
  "Mode d'affichage": "Display mode", "Visualiseur circulaire": "Circular visualizer", "Paroles + clip": "Lyrics + clip",
  "Halo lumineux des bords": "Glowing edge halo", "Horloge": "Clock", "Taille horloge": "Clock size", "Format 24 h": "24-hour format",
  "Pochettes sur le côté (historique)": "Side covers (history)", "Nombre de pochettes": "Number of covers", "Assistant au démarrage": "Setup wizard at startup",
  "Ouvrir l'assistant de configuration": "Open the setup wizard", "Barre de contrôle": "Control bar", "Masquer l'interface au repos": "Hide interface when idle", "Toujours au premier plan": "Always on top",
  "Type de fond": "Background type", "Pochette floutée": "Blurred cover", "Aurore animée": "Animated aurora", "Mon clip / image": "My clip / image", "Noir": "Black",
  "Fichier (vidéo, gif, image)": "File (video, gif, image)", "Flou": "Blur", "Assombrissement": "Dimming",
  "Couleurs auto (pochette)": "Auto colors (from cover)", "Couleur 1": "Color 1", "Couleur 2": "Color 2", "Intensité lumineuse": "Glow intensity",
  "Pochette ronde": "Round cover", "Pochette qui tourne": "Spinning cover", "Afficher la ligne de paroles": "Show current lyric line", "Style": "Style", "Barres": "Bars", "Courbe": "Curve", "Points": "Dots",
  "Nombre de barres": "Number of bars", "Sensibilité": "Sensitivity", "Taille": "Size",
  "Taille du texte": "Text size", "Remplissage mot par mot": "Word-by-word fill", "Alignement": "Alignment", "Gauche": "Left", "Centre": "Center", "Droite": "Right", "Police": "Font", "Décalage synchro (ms)": "Sync offset (ms)",
  "Images / seconde": "Frames per second",
  "Choisir…": "Choose…", "Ouvrir": "Open", "Réinitialiser": "Reset",
  "Recherche des paroles…": "Searching for lyrics…", "Paroles non synchronisées": "Unsynchronized lyrics", "Paroles introuvables pour ce titre": "No lyrics found for this track",
  "Que veux-tu afficher ?": "What do you want to display?", "Choisis ton mode. Tu pourras en changer à tout moment avec la touche M.": "Pick your mode. You can switch anytime with the M key.",
  "Pochette ronde qui tourne, barres audio réactives au son, halo lumineux.": "Spinning round cover, sound-reactive audio bars, glowing halo.",
  "Paroles synchronisées en grand, mot par mot, avec un clip ou une image en fond.": "Large synced lyrics, word by word, with a clip or image behind.",
  "Passer (garder mes réglages)": "Skip (keep my settings)", "Personnalise les fonctions": "Customize features",
  "Active ou désactive ce que tu veux. Tout reste modifiable dans les réglages (touche S).": "Turn on or off whatever you like. Everything stays editable in settings (S key).",
  "Pochettes sur le côté": "Side covers", "Ligne de paroles sous le titre": "Lyric line under the title", "Fond": "Background", "Mon clip / image…": "My clip / image…",
  "← Retour": "← Back", "Commencer": "Start", "Ne plus me demander au démarrage": "Don't ask me again at startup",
  "Lance une musique": "Play some music", "YouTube Music, Deezer, Spotify… dans ton navigateur ou ton app.<br>Elle apparaîtra ici automatiquement.": "YouTube Music, Deezer, Spotify… in your browser or app.<br>It will show up here automatically.",
  "Raccourcis : <b>M</b> mode · <b>S</b> réglages · <b>F11</b> plein écran · <b>Espace</b> pause · <b>←/→</b> piste préc./suiv.": "Shortcuts: <b>M</b> mode · <b>S</b> settings · <b>F11</b> fullscreen · <b>Space</b> pause · <b>←/→</b> prev/next track",
  "Linux : installe playerctl →  sudo apt install playerctl": "Linux: install playerctl →  sudo apt install playerctl", "Système non supporté": "Unsupported system", "Clip officiel / photo artiste (auto)": "Official clip / artist photo (auto)", "Paroles approximatives (non synchronisées)": "Approximate lyrics (not synced)", "Clip officiel · Apple Music": "Official clip · Apple Music", "Vinyle & file d'attente": "Vinyl & Queue", "PRÉCÉDENTS": "PREVIOUS", "FILE D'ATTENTE": "QUEUE", "Dernier joué": "Last played", "Aucun morceau précédent": "No previous track", "Disque vinyle 33 tours réaliste, platine animée et pochettes de la file d'attente sur les côtés.": "Realistic 33 RPM vinyl record, animated turntable and queue covers on the sides.", "Mon fichier (vidéo / image)": "My file (video / image)", "Mon fichier (vidéo / image)…": "My file (video / image)…", "Décalage du clip (s)": "Clip offset (s)", "Précédent": "Previous", "Lecture / Pause": "Play / Pause", "Suivant": "Next", "Changer de mode (M)": "Switch mode (M)", "Plein écran (F11)": "Fullscreen (F11)", "Réglages (S)": "Settings (S)"
};
const tr = (s) => (S.lang === 'en' && EN[s]) || s;
function applyStatic() {
  document.documentElement.lang = S.lang;
  $('empty').innerHTML = `<div class="pulse"></div><h1>${tr('Lance une musique')}</h1><p>${tr('YouTube Music, Deezer, Spotify… dans ton navigateur ou ton app.<br>Elle apparaîtra ici automatiquement.')}</p>`;
  [['b-prev', 'Précédent'], ['b-play', 'Lecture / Pause'], ['b-next', 'Suivant'], ['b-mode', 'Changer de mode (M)'], ['b-fs', 'Plein écran (F11)'], ['b-set', 'Réglages (S)']].forEach(([i, s]) => { $(i).title = tr(s); });
}

function applySettings() {
  body.className = body.className.split(' ').filter((c) => /^(no-media|paused|idle|settings-open|plain|wizard-open|has-clip|has-artist|approx)$/.test(c)).join(' ');
  body.classList.add('mode-' + S.mode);
  const flag = (c, on) => body.classList.toggle(c, on);
  flag('no-halo', !S.halo); flag('no-clock', !S.clock); flag('no-queue', !S.queue); flag('no-controls', !S.controls);
  flag('no-cover', !S.cover); flag('spin', S.spin); flag('viz-caption', S.vizCaption); flag('word-fill', S.wordFill);
  body.dataset.align = S.align;
  const r = document.documentElement.style;
  r.setProperty('--lyrics-size', S.lyricsSize + 'px');
  r.setProperty('--font', `'${S.font}', 'Outfit', system-ui, sans-serif`);
  r.setProperty('--bg-blur', S.bgBlur + 'px');
  r.setProperty('--bg-dim', S.bgDim / 100);
  $('clock').style.fontSize = S.clockSize + 'px';
  $('halo').style.filter = `blur(${14 * S.glow / 100}px)`;
  // fond
  let bg = S.bgMode;
  if (bg === 'custom') {
    if (!S.bgFile) bg = 'cover';
    else {
      const url = 'file:///' + encodeURI(S.bgFile.replace(/\\/g, '/'));
      if (/\.(mp4|webm|mov|m4v)$/i.test(S.bgFile)) { bg = 'custom-video'; if ($('bg-video').dataset.src !== url) { $('bg-video').src = url; $('bg-video').dataset.src = url; $('bg-video').play().catch(() => {}); } }
      else { bg = 'custom-image'; $('bg-image').src = url; }
    }
  }
  body.dataset.bg = bg;
  if (S.bgMode === 'clip') ensureClip(); else if (clipKey) stopClip();
  if (typeof applyColors === 'function') applyColors();
  layout();
  api.onTop(S.onTop);
  tickClock();
  renderQueue();
  renderVinylRails();
  save();
}

function buildSettings() {
  const root = $('settings-body');
  root.innerHTML = '';
  for (const [title, items] of SCHEMA) {
    const h = document.createElement('h2'); h.textContent = tr(title); root.appendChild(h);
    for (const [key, type, label, opt] of items) {
      const row = document.createElement('div'); row.className = 'row';
      const lb = document.createElement('label'); lb.textContent = tr(label); row.appendChild(lb);
      let el;
      if (type === 'toggle') { el = document.createElement('input'); el.type = 'checkbox'; el.className = 'sw'; el.checked = !!S[key]; el.onchange = () => { S[key] = el.checked; applySettings(); }; }
      else if (type === 'range') {
        el = document.createElement('input'); el.type = 'range'; [el.min, el.max, el.step] = opt; el.value = S[key];
        const v = document.createElement('span'); v.className = 'val'; v.textContent = S[key];
        el.oninput = () => { S[key] = +el.value; v.textContent = el.value; applySettings(); };
        row.appendChild(v);
      } else if (type === 'select') {
        el = document.createElement('select');
        for (const [k, name] of Object.entries(opt)) { const o = document.createElement('option'); o.value = k; o.textContent = tr(name); el.appendChild(o); }
        el.value = S[key]; el.onchange = () => { S[key] = isNaN(el.value) ? el.value : +el.value; if (key === 'lang') applyStatic(); applySettings(); if (key === 'mode' || key === 'lang') buildSettings(); if (key === 'lang' && body.classList.contains('wizard-open')) wizStep(1); };
      } else if (type === 'color') { el = document.createElement('input'); el.type = 'color'; el.value = S[key]; el.oninput = () => { S[key] = el.value; S.accentAuto = false; applySettings(); }; }
      else if (type === 'action') { el = document.createElement('button'); el.textContent = tr('Ouvrir'); el.onclick = () => { body.classList.remove('settings-open'); openWizard(); }; }
      else if (type === 'file') { el = document.createElement('button'); el.textContent = tr('Choisir…'); el.onclick = async () => { const p = await api.pickFile(); if (p) { S.bgFile = p; S.bgMode = 'custom'; applySettings(); buildSettings(); } }; }
      row.appendChild(el); root.appendChild(row);
    }
  }
  const r = document.createElement('button'); r.textContent = tr('Réinitialiser'); r.style.cssText = 'margin-top:24px;padding:8px 14px;background:#ffffff14;color:#fff;border:1px solid #ffffff22;border-radius:8px;cursor:pointer';
  r.onclick = () => { S = { ...DEFAULTS }; applySettings(); buildSettings(); }; root.appendChild(r);
  const hint = document.createElement('div'); hint.className = 'hint';
  hint.innerHTML = tr('Raccourcis : <b>M</b> mode · <b>S</b> réglages · <b>F11</b> plein écran · <b>Espace</b> pause · <b>←/→</b> piste préc./suiv.');
  root.appendChild(hint);
}

/* =================== ÉTAT MUSIQUE =================== */
let track = null;          // {key,title,artist,album,dur}
let playing = false;
let base = { pos: 0, at: performance.now() };
let coverURL = '';
let history = [];          // [{key, cover}]
let lyrics = { lines: [], synced: false };
const pos = () => base.pos + (playing ? performance.now() - base.at : 0) + S.offset;

api.onMedia((m) => {
  if (m.type === 'error') {
    const msg = m.code === 'playerctl-missing' ? tr('Linux : installe playerctl →  sudo apt install playerctl') : tr('Système non supporté');
    $('empty').querySelector('p').innerHTML = msg; body.classList.add('no-media'); return;
  }
  if (m.type === 'cover') { if (track && m.key === track.key) setCover('data:image/png;base64,' + m.data); return; }
  if (!m.active || !m.title) { body.classList.add('no-media'); return; }
  body.classList.remove('no-media');
  playing = m.playing; body.classList.toggle('paused', !playing);
  if (!track || track.key !== m.key) newTrack(m);
  track.dur = m.dur;
  if (Math.abs(base.pos + (playing ? performance.now() - base.at : 0) - m.pos) > 250) base = { pos: m.pos, at: performance.now() };
});

function newTrack(m) {
  track = { key: m.key, title: m.title, artist: m.artist, album: m.album, dur: m.dur };
  base = { pos: m.pos, at: performance.now() };
  coverURL = ''; setCover(''); hasBgPhoto = false;
  $('m-title').textContent = $('c-title').textContent = $('np-title').textContent = m.title;
  $('m-artist').textContent = $('c-artist').textContent = $('np-artist').textContent = m.artist;
  if ($('v-title')) $('v-title').textContent = m.title;
  if ($('v-artist')) $('v-artist').textContent = m.artist;

  history = history.filter((h) => h.key !== m.key);
  history.push({ key: m.key, title: m.title, artist: m.artist, cover: '' });
  history = history.slice(-24);
  try { localStorage.setItem('mv-history', JSON.stringify(history)); } catch (e) {}

  renderQueue();
  renderVinylRails();
  loadLyrics(m);
  if (S.bgMode === 'clip') ensureClip();
}

/* ----- extraction couleurs néon (pochette + photo de fond) ----- */
let coverHue = 330, bgHue = 35;
let autoCover = 'hsl(330 100% 60%)', autoBg = 'hsl(35 100% 60%)';
let hasBgPhoto = false;

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l];
}

function hslToRgbStr(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  return `${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}`;
}

function getDominantHues(d) {
  const buckets = Array.from({ length: 24 }, () => ({ s: 0, n: 0 }));
  for (let i = 0; i < d.length; i += 4) {
    const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
    if (s < 0.16 || l < 0.12 || l > 0.94) continue;
    const b = Math.floor(h / 15) % 24;
    buckets[b].s += Math.pow(s, 2) * (1 - Math.abs(l - 0.52));
    buckets[b].n++;
  }
  return buckets.map((b, i) => ({ hue: i * 15 + 7.5, sc: b.s })).sort((a, b) => b.sc - a.sc);
}

function extractCoverColors(d) {
  const ranked = getDominantHues(d);
  if (ranked[0] && ranked[0].sc > 0) {
    coverHue = Math.round(ranked[0].hue);
    autoCover = `hsl(${coverHue} 100% 60%)`;
    if (!hasBgPhoto) {
      const second = ranked.find((r) => r.sc > 0 && Math.min(Math.abs(r.hue - coverHue), 360 - Math.abs(r.hue - coverHue)) > 45);
      bgHue = second ? Math.round(second.hue) : (coverHue + 45) % 360;
      autoBg = `hsl(${bgHue} 100% 60%)`;
    }
    applyColors();
  }
}

function extractBgColors(img) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 36;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, 36, 36);
    const d = x.getImageData(0, 0, 36, 36).data;
    const ranked = getDominantHues(d);
    if (ranked[0] && ranked[0].sc > 0) {
      hasBgPhoto = true;
      let h = Math.round(ranked[0].hue);
      const diff = Math.min(Math.abs(h - coverHue), 360 - Math.abs(h - coverHue));
      if (diff < 30) {
        const alt = ranked.find((r) => r.sc > 0 && Math.min(Math.abs(r.hue - coverHue), 360 - Math.abs(r.hue - coverHue)) >= 30);
        if (alt) h = Math.round(alt.hue);
        else h = (coverHue + 45) % 360;
      }
      bgHue = h;
      autoBg = `hsl(${bgHue} 100% 60%)`;
      applyColors();
    }
  } catch (e) {
    console.warn('extractBgColors error', e);
  }
}

function applyColors() {
  const r = document.documentElement.style;
  const c1 = S.accentAuto ? autoCover : S.accent1;
  const c2 = S.accentAuto ? autoBg : S.accent2;
  r.setProperty('--c1', c1);
  r.setProperty('--c2', c2);
  r.setProperty('--c1-rgb', hslToRgbStr(coverHue, 1, 0.6));
  r.setProperty('--c2-rgb', hslToRgbStr(bgHue, 1, 0.6));
  r.setProperty('--neon-glow', `color-mix(in srgb, ${c1} 50%, ${c2})`);
  if (typeof pal !== 'undefined') pal.key = '';
}

function setCover(url) {
  coverURL = url;
  const h = history.find((x) => track && x.key === track.key);
  $('cover').src = url || ''; $('c-cover').src = url || ''; $('np-cover').src = url || '';
  if ($('v-sleeve-img')) $('v-sleeve-img').src = url || '';
  if ($('v-label-img')) $('v-label-img').src = url || '';
  $('bg-cover').style.backgroundImage = url ? `url(${url})` : '';
  if (!url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 36;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, 36, 36);
    extractCoverColors(x.getImageData(0, 0, 36, 36).data);
    const t = document.createElement('canvas'); t.width = t.height = 120;
    t.getContext('2d').drawImage(img, 0, 0, 120, 120);
    if (h) {
      h.cover = t.toDataURL('image/jpeg', .8);
      renderQueue();
      renderVinylRails();
      try { localStorage.setItem('mv-history', JSON.stringify(history)); } catch (e) {}
    }
  };
  img.src = url;
}

/* ----- file latérale classique ----- */
function renderQueue() {
  const q = $('queue'); q.innerHTML = '';
  const items = history.slice(-S.queueCount).reverse();
  items.forEach((h) => {
    const d = document.createElement('div'); d.className = 'q' + (track && h.key === track.key ? ' now' : '');
    if (h.cover) d.style.backgroundImage = `url(${h.cover})`; else d.style.background = 'linear-gradient(135deg,#333,#111)';
    d.title = h.title ? `${h.title} — ${h.artist}` : h.key.replace('|', ' — ');
    q.appendChild(d);
  });
}

/* ----- rails latéraux du Mode Vinyle (file d'attente à gauche et à droite) ----- */
function renderVinylRails() {
  const left = $('rail-left-list'), right = $('rail-right-list');
  if (!left || !right) return;
  left.innerHTML = ''; right.innerHTML = '';

  const curKey = track ? track.key : '';
  const curIdxInHist = history.findIndex((h) => h.key === curKey);
  const prevItems = curIdxInHist > 0 ? history.slice(0, curIdxInHist).reverse() : history.filter((h) => h.key !== curKey).reverse();
  const nextItems = curIdxInHist >= 0 ? history.slice(curIdxInHist + 1) : [];

  // Rail gauche : Précédents
  if (!prevItems.length) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'rail-empty';
    emptyMsg.textContent = tr('Aucun morceau précédent');
    left.appendChild(emptyMsg);
  } else {
    prevItems.slice(0, 5).forEach((h, idx) => {
      const card = createRailCard(h, idx === 0 ? tr('Dernier joué') : `#${idx + 1}`, false);
      card.onclick = () => api.cmd('prev');
      left.appendChild(card);
    });
  }

  // Rail droit : En cours et File d'attente / Récents
  const queueItems = nextItems.length ? nextItems : history.slice(0, 6);
  queueItems.forEach((h, idx) => {
    const isNow = h.key === curKey;
    const badgeText = isNow ? '● EN COURS' : `#${idx + 1}`;
    const card = createRailCard(h, badgeText, isNow);
    right.appendChild(card);
  });
}

function createRailCard(h, badge, isNow) {
  const card = document.createElement('div');
  card.className = 'rail-card' + (isNow ? ' active-track' : '');
  const coverDiv = document.createElement('div');
  coverDiv.className = 'rail-cover';
  if (h.cover) coverDiv.style.backgroundImage = `url(${h.cover})`;
  else coverDiv.style.background = 'linear-gradient(135deg,#222,#111)';

  const info = document.createElement('div');
  info.className = 'rail-info';
  const t = document.createElement('div');
  t.className = 'rail-title-text';
  t.textContent = h.title || h.key.split('|')[1] || h.key;
  const a = document.createElement('div');
  a.className = 'rail-artist-text';
  a.textContent = h.artist || h.key.split('|')[0] || '';
  const b = document.createElement('span');
  b.className = 'rail-badge' + (isNow ? ' now' : '');
  b.textContent = badge;

  info.append(t, a, b);
  card.append(coverDiv, info);
  return card;
}

/* =================== CLIP OFFICIEL (Apple Music) + PHOTO ARTISTE (Deezer) =================== */
// Aucun appel YouTube : le process principal interroge l'API iTunes (aperçu vidéo officiel du clip) et Deezer (photo de l'artiste).
// Ordre de repli : clip officiel → photo artiste (travelling lent) → pochette floutée.
let clipKey = '';
const clipEl = $('bg-clip'), artistEl = $('bg-artist');
clipEl.addEventListener('playing', () => { if (clipEl.getAttribute('src')) { body.classList.add('has-clip'); $('np-badge').textContent = tr('Clip officiel · Apple Music'); } });
clipEl.addEventListener('error', () => { body.classList.remove('has-clip'); $('np-badge').textContent = ''; });
function stopClip() {
  clipKey = ''; clipEl.pause(); clipEl.removeAttribute('src'); clipEl.load();
  artistEl.style.backgroundImage = ''; body.classList.remove('has-clip', 'has-artist'); $('np-badge').textContent = '';
}
async function ensureClip() {
  if (!track || clipKey === track.key) return;
  stopClip();
  const key = clipKey = track.key;
  const v = await api.visuals({ key, title: track.title, artist: track.artist, duration: track.dur });
  if (clipKey !== key || S.bgMode !== 'clip' || !v) return;
  if (v.artist) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      if (clipKey === key) {
        artistEl.style.backgroundImage = `url(${v.artist})`;
        body.classList.add('has-artist');
        extractBgColors(im);
      }
    };
    im.src = v.artist;
  }
  if (v.clip) { clipEl.src = v.clip; clipEl.play().catch(() => {}); }
}
setInterval(() => {
  if (!clipEl.getAttribute('src')) return;
  if (playing && clipEl.paused) clipEl.play().catch(() => {});
  else if (!playing && !clipEl.paused) clipEl.pause();
}, 1000);

/* =================== PAROLES =================== */
let lineEls = [], words = [], curIdx = -2;
function parseLRC(txt) {
  const out = [];
  for (const raw of txt.split(/\r?\n/)) {
    const tags = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!tags.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const t of tags) out.push({ t: (+t[1] * 60 + +t[2]) * 1000, text });
  }
  return out.sort((a, b) => a.t - b.t);
}
async function loadLyrics(m) {
  const key = m.key;
  setLyrics([], false, tr('Recherche des paroles…'));
  const r = await api.lyrics({ title: m.title, artist: m.artist, album: m.album, duration: m.dur });
  if (!track || track.key !== key) return;
  if (r && r.synced) setLyrics(parseLRC(r.synced), true, '');
  else if (r && r.plain) { // pas de synchro : on répartit les lignes sur la durée (pondérée par la longueur) pour un défilement approximatif
    const txt = r.plain.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
    const total = m.dur || 180000, w = txt.map((t) => t.length + 14), sum = w.reduce((a, b) => a + b, 0);
    let acc = total * .05;
    setLyrics(txt.map((text, i) => { const o = { t: acc, text }; acc += (total * .88) * w[i] / sum; return o; }), true, tr('Paroles approximatives (non synchronisées)'), true);
  }
  else setLyrics([], false, tr('Paroles introuvables pour ce titre'));
}
function setLyrics(lines, synced, status, approx = false) {
  lyrics = { lines, synced, approx };
  body.classList.toggle('plain', !synced); body.classList.toggle('approx', approx);
  $('lyrics-status').textContent = status;
  $('m-caption').textContent = '';
  const box = $('lyrics'); box.innerHTML = ''; lineEls = []; words = []; curIdx = -2;
  lines.forEach((l, i) => {
    const d = document.createElement('div'); d.className = 'ln' + (l.text ? '' : ' mute');
    const ws = (l.text || '♪').split(/\s+/).map((w) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; d.appendChild(s); return s; });
    box.appendChild(d); lineEls.push(d); words.push(ws);
  });
  box.style.transform = 'translateY(0)';
  if (!synced) lineEls.forEach((e) => { e.style.opacity = .9; e.style.transform = 'scale(1)'; });
}
function updateLyrics() {
  if (!lyrics.synced || !lyrics.lines.length) return;
  const p = pos(), L = lyrics.lines;
  let lo = 0, hi = L.length - 1, idx = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (L[mid].t <= p) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
  if (idx !== curIdx) {
    curIdx = idx;
    lineEls.forEach((e, i) => {
      const d = Math.abs(i - idx);
      e.classList.toggle('active', i === idx);
      e.style.opacity = i === idx ? 1 : Math.max(.08, .5 - d * .12);
      e.style.filter = d > 1 && i !== idx ? `blur(${Math.min(d - 1, 4)}px)` : 'none';
      if (i < idx) words[i].forEach((w) => w.classList.add('on'));
      else if (i !== idx) words[i].forEach((w) => w.classList.remove('on'));
    });
    const el = lineEls[Math.max(idx, 0)];
    if (el) $('lyrics').style.transform = `translateY(${$('lyrics-mask').clientHeight / 2 - (el.offsetTop + el.offsetHeight / 2)}px)`;
    $('m-caption').textContent = idx >= 0 ? L[idx].text : '';
  }
  if (idx >= 0 && !lyrics.approx) {
    const next = L[idx + 1] ? L[idx + 1].t : L[idx].t + 4000;
    const text = L[idx].text || '♪';
    const span = Math.min(next - L[idx].t, text.length * 110 + 700);
    const prog = Math.min(1, Math.max(0, (p - L[idx].t) / span));
    const n = words[idx].length;
    words[idx].forEach((w, i) => {
      const wp = Math.min(1, Math.max(0, prog * n - i));
      w.style.setProperty('--p', wp.toFixed(3));
      w.classList.toggle('on', wp >= 1);
    });
  }
}

/* =================== AUDIO (son système) =================== */
let analyser = null, freq = null, audioOK = false, sampleRate = 48000;
async function initAudio() {
  try {
    let tracks = null;
    if (/Linux/.test(navigator.userAgent)) { // Linux : on écoute la source "Monitor of ..." de PulseAudio / PipeWire
      try {
        await (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop()); // débloque les libellés
        const dev = (await navigator.mediaDevices.enumerateDevices()).find((d) => d.kind === 'audioinput' && /monitor/i.test(d.label));
        if (dev) tracks = (await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: dev.deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } })).getAudioTracks();
      } catch (e) { console.warn('monitor Linux indisponible', e); }
    }
    if (!tracks) {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks().forEach((t) => t.stop());
      tracks = stream.getAudioTracks();
    }
    if (!tracks.length) throw new Error('no audio');
    const ctx = new AudioContext(); sampleRate = ctx.sampleRate;
    const src = ctx.createMediaStreamSource(new MediaStream(tracks));
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .72;
    src.connect(analyser); freq = new Uint8Array(analyser.frequencyBinCount); audioOK = true;
  } catch (e) { audioOK = false; console.warn('Capture audio indisponible, animation simulée', e); }
}

/* =================== VISUALISEUR =================== */
const cv = $('canvas'), g = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, R = 100, CX = 0, CY = 0;
let vals = new Float32Array(256), bass = 0, rot = 0;
function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  const D = Math.min(W, H) * 0.34 * (S.vizSize / 60);
  R = D / 2; CX = W / 2; CY = H * 0.46;
  const cw = $('cover-wrap'); cw.style.width = cw.style.height = D + 'px'; cw.style.top = CY + 'px';
  $('meta').style.top = (CY + R + Math.min(W, H) * 0.2 * (S.vizSize / 60) + 10) + 'px';
}
addEventListener('resize', layout);

function spectrum(n, t) {
  const half = Math.ceil(n / 2);
  if (audioOK) {
    analyser.getByteFrequencyData(freq);
    const binHz = sampleRate / analyser.fftSize;
    for (let i = 0; i < half; i++) {
      const f = 45 * Math.pow(13000 / 45, i / half), b = Math.min(freq.length - 1, Math.round(f / binHz));
      const b2 = Math.min(freq.length - 1, Math.round(45 * Math.pow(13000 / 45, (i + 1) / half) / binHz));
      let m = 0; for (let k = b; k <= Math.max(b, b2); k++) m = Math.max(m, freq[k]);
      let v = Math.pow(m / 255, 1.6) * (1 + i / half * .9) * (S.sens / 100);
      vals[i] = v > vals[i] ? v : vals[i] * .88 + v * .12;
    }
    let bs = 0; for (let k = 1; k < 8; k++) bs += freq[k]; bass = bass * .6 + (bs / 7 / 255) * .4;
  } else { // animation simulée si pas de capture
    for (let i = 0; i < half; i++) vals[i] = playing ? (.25 + .2 * Math.sin(t * 2 + i * .35) + .15 * Math.sin(t * 3.3 + i * .9)) * (S.sens / 100) : 0;
    bass = playing ? .3 + .2 * Math.sin(t * 4) : 0;
  }
}
/* ----- palette (calculée une seule fois par changement de couleur : pas de color-mix par barre et par image) ----- */
const TAU = Math.PI * 2, px = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
let pal = { key: '', a: [255, 94, 168], b: [255, 179, 71], cols: [] };
const toRGB = (c) => { px.clearRect(0, 0, 1, 1); px.fillStyle = '#000'; px.fillStyle = c; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function palette(n) {
  const cs = getComputedStyle(document.documentElement), c1 = cs.getPropertyValue('--c1').trim(), c2 = cs.getPropertyValue('--c2').trim();
  const key = c1 + '|' + c2 + '|' + n;
  if (pal.key === key) return;
  pal.key = key; pal.a = toRGB(c1); pal.b = toRGB(c2); pal.cols = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, k = t < .5 ? t * 2 : (1 - t) * 2;
    pal.cols.push([pal.a[0] + (pal.b[0] - pal.a[0]) * k, pal.a[1] + (pal.b[1] - pal.a[1]) * k, pal.a[2] + (pal.b[2] - pal.a[2]) * k]);
  }
}
const parts = Array.from({ length: 80 }, () => ({ life: 0, a: 0, r: 0, v: 0, s: 1 }));
let partIdx = 0;

/* ----- mode visualiseur : « Aura » ----- */
function draw(t) {
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  const n = S.bars, half = Math.ceil(n / 2); palette(n);
  spectrum(n, t / 1000);
  const glow = S.glow / 100, gap = 22 + bass * 14, maxLen = R * 0.85, A = pal.a, B = pal.b;
  g.save(); g.translate(CX, CY);
  g.globalCompositeOperation = 'lighter';
  // aura diffuse qui pulse avec les basses
  const ar = R * (2.2 + bass * 1);
  const grd = g.createRadialGradient(0, 0, R * .7, 0, 0, ar);
  grd.addColorStop(0, rgba(A, Math.min(.5, .26 * glow * (.6 + bass)))); grd.addColorStop(.55, rgba(B, .09 * glow)); grd.addColorStop(1, rgba(B, 0));
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, ar, 0, TAU); g.fill();
  // anneau fin + anneau pointillé en contre-rotation
  g.lineWidth = 1.5; g.strokeStyle = rgba(A, .4); g.beginPath(); g.arc(0, 0, R + 10, 0, TAU); g.stroke();
  g.save(); g.rotate(-rot * 1.6); g.setLineDash([1.5, 13]); g.lineCap = 'round'; g.lineWidth = 3; g.strokeStyle = rgba(B, .55);
  g.beginPath(); g.arc(0, 0, R + gap + maxLen + 30, 0, TAU); g.stroke(); g.restore();
  // blob de forme d'onde, lisse, collé à la pochette
  g.save(); g.rotate(-rot * .5);
  const bp = [];
  for (let i = 0; i < 64; i++) { const idx = Math.min(half - 1, Math.floor((i < 32 ? i : 63 - i) / 32 * half)); const a = i / 64 * TAU; const rr = R + 10 + Math.min(1.2, vals[idx]) * 16; bp.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  g.beginPath(); g.moveTo((bp[63][0] + bp[0][0]) / 2, (bp[63][1] + bp[0][1]) / 2);
  for (let i = 0; i < 64; i++) { const p = bp[i], q = bp[(i + 1) % 64]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  g.closePath(); g.fillStyle = rgba(A, .07 * glow + .02); g.fill(); g.lineWidth = 2; g.strokeStyle = rgba(B, .7); g.stroke(); g.restore();
  // barres / courbe / points
  g.save(); g.rotate(rot); rot += 0.0008 + bass * 0.004; g.lineCap = 'round';
  const bw = Math.max(2, (TAU * (R + gap)) / n * .5), pts = [];
  for (let i = 0; i < n; i++) {
    const idx = i < half ? i : n - 1 - i;                 // miroir gauche / droite
    const a = (i / n) * TAU - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    const v = Math.min(1.3, vals[idx]), len = 4 + v * maxLen, c = pal.cols[i];
    const x0 = ca * (R + gap), y0 = sa * (R + gap), x1 = ca * (R + gap + len), y1 = sa * (R + gap + len);
    if (S.barStyle === 'bars') {
      if (glow > .05) { g.strokeStyle = rgba(c, .13 * glow); g.lineWidth = bw * 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      g.strokeStyle = rgba(c, .55 + v * .45); g.lineWidth = bw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    } else if (S.barStyle === 'dots') {
      if (glow > .05) { g.fillStyle = rgba(c, .15 * glow); g.beginPath(); g.arc(x1, y1, 7 + v * 10, 0, TAU); g.fill(); }
      g.fillStyle = rgba(c, .95); g.beginPath(); g.arc(x1, y1, 2 + v * 5, 0, TAU); g.fill();
    } else pts.push([x1, y1]);
    if (v > .55 && bass > .3 && Math.random() < .06) { const p = parts[partIdx++ % parts.length]; p.life = 1; p.a = a + rot; p.r = R + gap + len; p.v = .6 + Math.random() * 1.6; p.s = 1 + Math.random() * 2.2; p.c = c; }
  }
  if (S.barStyle === 'line' && pts.length) {
    g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    if (glow > .05) { g.strokeStyle = rgba(A, .2 * glow); g.lineWidth = 10; g.stroke(); }
    const gr = g.createLinearGradient(-R, 0, R, 0); gr.addColorStop(0, rgba(A, 1)); gr.addColorStop(.5, rgba(B, 1)); gr.addColorStop(1, rgba(A, 1));
    g.strokeStyle = gr; g.lineWidth = 3; g.stroke();
  }
  g.restore();
  // particules qui s'échappent sur les pics
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= .014; p.r += p.v * (1 + bass * 3);
    g.fillStyle = rgba(p.c, Math.max(0, p.life) * .8);
    g.beginPath(); g.arc(Math.cos(p.a) * p.r, Math.sin(p.a) * p.r, p.s, 0, TAU); g.fill();
  }
  g.restore();
  // pulsation de la pochette et du halo
  const sc = 1 + bass * 0.06 * (S.sens / 100);
  $('cover-wrap').style.transform = `translate(-50%,-50%) scale(${sc})`;
  $('halo').style.opacity = Math.min(1, (.25 + bass * .8) * glow);
}

/* ----- mode paroles : spectre discret en bas d'écran ----- */
/* ----- mode vinyle : pulsation néon sous la platine et bras vibrant ----- */
function drawVinylFx(t) {
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  if (audioOK) {
    analyser.getByteFrequencyData(freq);
    let bs = 0; for (let k = 1; k < 8; k++) bs += freq[k];
    bass = bass * .6 + (bs / 7 / 255) * .4;
  } else {
    bass = playing ? .3 + .2 * Math.sin(t * 4 / 1000) : 0;
  }
  const glow = S.glow / 100;
  const vGlow = $('vinyl-platter-glow');
  if (vGlow) {
    const sc = 1 + bass * 0.16 * (S.sens / 100);
    const op = Math.min(1, (.55 + bass * .7) * glow);
    vGlow.style.transform = `translate(-50%, -50%) scale(${sc})`;
    vGlow.style.opacity = op;
  }
  $('halo').style.opacity = Math.min(1, (.35 + bass * .85) * glow);
  const vArm = $('vinyl-arm');
  if (vArm && playing) {
    const jitter = (Math.sin(t * 0.05) * bass * 1.5).toFixed(2);
    vArm.style.transform = `rotate(calc(var(--arm-deg, 26deg) + ${jitter}deg))`;
  }
}

function drawLyricsFx(t) {
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  if (!audioOK && !playing) return;
  const n = 72, half = Math.ceil(n / 2), glow = S.glow / 100; palette(n);
  spectrum(n, t / 1000);
  g.globalCompositeOperation = 'lighter';
  const bw = W / n;
  for (let i = 0; i < n; i++) {
    const idx = Math.min(half - 1, Math.floor(Math.abs(i - (n - 1) / 2)));   // graves au centre
    const h = 3 + Math.min(1.3, vals[idx]) * H * .13, c = pal.cols[i];
    g.fillStyle = rgba(c, .16 + .3 * glow); g.fillRect(i * bw + bw * .2, H - h, bw * .6, h);
    g.fillStyle = rgba(c, .5 * glow + .1); g.fillRect(i * bw + bw * .2, H - h, bw * .6, 2);
  }
  $('np-cover-wrap').style.transform = `scale(${1 + bass * .035})`;
  $('halo').style.opacity = Math.min(1, (.25 + bass * .8) * glow);
}

/* =================== BOUCLE PRINCIPALE =================== */
let last = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (document.hidden || body.classList.contains('no-media')) return;
  if (t - last < 1000 / S.fps - 1) return; last = t;
  if (S.mode === 'visualizer') draw(t); else if (S.mode === 'lyrics') drawLyricsFx(t); else if (S.mode === 'vinyl') drawVinylFx(t);
  updateLyrics();
  if (track && track.dur) {
    const p = Math.min(track.dur, Math.max(0, pos() - S.offset));
    $('bar-fill').style.width = (p / track.dur * 100) + '%';
    $('c-time').textContent = fmt(p); $('c-dur').textContent = fmt(track.dur);
  }
}
const fmt = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

function tickClock() {
  const d = new Date();
  $('clock').textContent = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: !S.clock24 });
}
setInterval(tickClock, 1000);

/* =================== INTERACTIONS =================== */
const toggleSettings = () => body.classList.toggle('settings-open');
const toggleMode = () => {
  const modes = ['visualizer', 'lyrics', 'vinyl'];
  const nextIdx = (modes.indexOf(S.mode) + 1) % modes.length;
  S.mode = modes[nextIdx];
  applySettings();
  buildSettings();
  curIdx = -2;
};
$('b-prev').onclick = () => api.cmd('prev');
$('b-next').onclick = () => api.cmd('next');
$('b-play').onclick = () => api.cmd('toggle');
$('b-mode').onclick = toggleMode;
$('b-fs').onclick = () => api.fullscreen();
$('b-set').onclick = toggleSettings;
$('bar').onclick = (e) => { if (!track) return; const r = $('bar').getBoundingClientRect(); api.cmd('seek:' + Math.round((e.clientX - r.left) / r.width * track.dur)); };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  if (e.key === 'F11') { e.preventDefault(); api.fullscreen(); }
  else if (e.key.toLowerCase() === 'm') toggleMode();
  else if (e.key.toLowerCase() === 's') toggleSettings();
  else if (e.key === ' ') { e.preventDefault(); api.cmd('toggle'); }
  else if (e.key === 'ArrowRight') api.cmd('next');
  else if (e.key === 'ArrowLeft') api.cmd('prev');
});
let idleT;
function wake() { body.classList.remove('idle'); clearTimeout(idleT); if (S.autoHide) idleT = setTimeout(() => { if (!body.classList.contains('settings-open')) body.classList.add('idle'); }, 3000); }
addEventListener('mousemove', wake); addEventListener('mousedown', wake);


/* =================== ASSISTANT DE DÉMARRAGE =================== */
function openWizard() { body.classList.add('wizard-open'); wizStep(1); }
function closeWizard() { body.classList.remove('wizard-open'); applySettings(); buildSettings(); wake(); }
function wizStep(n) {
  const box = $('wz-box'); box.innerHTML = '';
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; box.appendChild(e); return e; };
  if (n === 1) {
    const lg = h('div', 'wz-actions'); lg.style.marginBottom = '18px';
    [['fr', 'Français'], ['en', 'English']].forEach(([k, name]) => { const b = document.createElement('button'); b.className = 'wz-btn' + (S.lang === k ? '' : ' ghost'); b.style.padding = '6px 20px'; b.textContent = name; b.onclick = () => { S.lang = k; applyStatic(); applySettings(); buildSettings(); wizStep(1); }; lg.appendChild(b); });
    h('h1', '', tr('Que veux-tu afficher ?'));
    h('div', 'sub', tr('Choisis ton mode. Tu pourras en changer à tout moment avec la touche M.'));
    const cards = h('div', 'wz-cards');
    [['visualizer', '🎵', 'Visualiseur circulaire', 'Pochette ronde qui tourne, barres audio réactives au son, halo lumineux.'],
     ['lyrics', '🎤', 'Paroles + clip', 'Paroles synchronisées en grand, mot par mot, avec un clip ou une image en fond.'],
     ['vinyl', '💿', 'Vinyle & file d\'attente', 'Disque vinyle 33 tours réaliste, platine animée et pochettes de la file d\'attente sur les côtés.']].forEach(([k, ic, t, d]) => {
      const c = document.createElement('div'); c.className = 'wz-card' + (S.mode === k ? ' sel' : '');
      c.innerHTML = `<div class="ic">${ic}</div><h3>${tr(t)}</h3><p>${tr(d)}</p>`;
      c.onclick = () => { S.mode = k; if (k === 'lyrics' && S.bgMode === 'cover') S.bgMode = 'clip'; wizStep(2); };
      cards.appendChild(c);
    });
    const a = h('div', 'wz-actions'); const sk = document.createElement('button'); sk.className = 'wz-btn ghost'; sk.textContent = tr('Passer (garder mes réglages)'); sk.onclick = closeWizard; a.appendChild(sk);
  } else {
    h('h1', '', tr('Personnalise les fonctions'));
    h('div', 'sub', tr('Active ou désactive ce que tu veux. Tout reste modifiable dans les réglages (touche S).'));
    const grid = h('div', 'wz-grid');
    const items = [['halo', 'Halo lumineux des bords'], ['clock', 'Horloge'], ['queue', 'Pochettes sur le côté'], ['controls', 'Barre de contrôle'], ['autoHide', 'Masquer l\'interface au repos'], ['accentAuto', 'Couleurs auto (pochette)']]
      .concat(S.mode === 'visualizer' ? [['cover', 'Pochette ronde'], ['spin', 'Pochette qui tourne'], ['vizCaption', 'Ligne de paroles sous le titre']] : [['wordFill', 'Remplissage mot par mot']]);
    items.forEach(([k, label]) => {
      const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<label>${tr(label)}</label>`;
      const i = document.createElement('input'); i.type = 'checkbox'; i.className = 'sw'; i.checked = !!S[k]; i.onchange = () => { S[k] = i.checked; };
      r.appendChild(i); grid.appendChild(r);
    });
    const r = document.createElement('div'); r.className = 'row'; r.innerHTML = '<label>' + tr('Fond') + '</label>';
    const sel = document.createElement('select');
    for (const [k, t] of Object.entries({ clip: 'Clip officiel / photo artiste (auto)', cover: 'Pochette floutée', aurora: 'Aurore animée', custom: 'Mon fichier (vidéo / image)…', black: 'Noir' })) { const o = document.createElement('option'); o.value = k; o.textContent = tr(t); sel.appendChild(o); }
    sel.value = S.bgMode;
    sel.onchange = async () => { S.bgMode = sel.value; if (sel.value === 'custom') { const p = await api.pickFile(); if (p) S.bgFile = p; else { S.bgMode = 'cover'; sel.value = 'cover'; } } };
    r.appendChild(sel); grid.appendChild(r);
    const a = h('div', 'wz-actions');
    const back = document.createElement('button'); back.className = 'wz-btn ghost'; back.textContent = tr('← Retour'); back.onclick = () => wizStep(1);
    const go = document.createElement('button'); go.className = 'wz-btn'; go.textContent = tr('Commencer'); go.onclick = closeWizard;
    a.append(back, go);
    const ask = h('label', 'wz-ask'); const c = document.createElement('input'); c.type = 'checkbox'; c.className = 'sw'; c.checked = !S.askAtStart; c.onchange = () => { S.askAtStart = !c.checked; };
    ask.append(c, document.createTextNode(tr('Ne plus me demander au démarrage')));
  }
}
/* =================== TEXTURE (grain de film, statique = gratuit pour le GPU) =================== */
(() => {
  const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), d = x.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); $('bg-grain').style.backgroundImage = `url(${c.toDataURL()})`;
})();
/* =================== DÉMARRAGE =================== */
try {
  const savedHist = JSON.parse(localStorage.getItem('mv-history') || '[]');
  if (Array.isArray(savedHist) && savedHist.length) history = savedHist;
} catch (e) {}
body.classList.add('no-media');
applyStatic(); buildSettings(); applySettings(); wake();
if (S.askAtStart) openWizard();
initAudio();
requestAnimationFrame(frame);
