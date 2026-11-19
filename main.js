const { app, BrowserWindow, ipcMain, desktopCapturer, session, dialog } = require('electron');
const path = require('path');

let win, media;

// Linux : l'AppArmor d'Ubuntu 24.04+ bloque le sandbox Chromium d'Electron installé via npm.
// L'appli ne charge que des fichiers locaux, on le désactive donc sur Linux.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
}

function startMedia() {
  const send = (m) => { if (process.env.MV_DEBUG) console.log('[media]', JSON.stringify(m).slice(0, 160)); if (win && !win.isDestroyed()) win.webContents.send('media', m); };
  if (process.platform === 'win32') media = require('./media-win')(send);
  else if (process.platform === 'linux') media = require('./media-linux')(send);
  else send({ type: 'error', code: 'unsupported' });
}

// ---------- Paroles (LRCLIB, synchronisées) ----------
const UA = { 'User-Agent': 'MusicVisualizer/1.0 (local app)' };
const clean = (s = '') =>
  s.replace(/\s*[\(\[][^\)\]]*(feat|ft\.|official|video|audio|lyric|remaster|live|clip|visuali[sz]er|version)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*-\s*(remaster(ed)?.*|single version|radio edit|.*version)$/i, '')
    .trim();
const cleanArtist = (s = '') => s.replace(/\s*-\s*topic$/i, '').replace(/vevo$/i, '').trim();
const firstArtist = (s = '') => s.split(/,|&| feat\.?| ft\.?| x /i)[0].trim();

async function j(url) {
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

ipcMain.handle('lyrics', async (_e, { title, artist, album, duration }) => {
  const a = cleanArtist(artist), t = clean(title);
  const dur = Math.round((duration || 0) / 1000);
  const q = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v))).toString();
  const pick = (r) => (r && (r.syncedLyrics || r.plainLyrics)) ? { synced: r.syncedLyrics || '', plain: r.plainLyrics || '' } : null;

  let r = pick(await j('https://lrclib.net/api/get?' + q({ artist_name: a, track_name: title, album_name: album, duration: dur })));
  if (r && r.synced) return r;
  r = pick(await j('https://lrclib.net/api/get?' + q({ artist_name: a, track_name: t, duration: dur }))) || r;
  if (r && r.synced) return r;

  for (const qs of [{ track_name: t, artist_name: firstArtist(a) }, { q: `${t} ${firstArtist(a)}` }]) {
    const list = await j('https://lrclib.net/api/search?' + q(qs));
    if (Array.isArray(list) && list.length) {
      const sorted = list
        .filter((x) => x.syncedLyrics || x.plainLyrics)
        .sort((x, y) => (!!y.syncedLyrics - !!x.syncedLyrics) || (Math.abs(x.duration - dur) - Math.abs(y.duration - dur)));
      if (sorted[0]) return pick(sorted[0]);
    }
  }
  return r;
});


// ---------- Visuels : clip officiel (Apple Music / iTunes) + photo artiste (Deezer) ----------
// Pas de YouTube : l'API iTunes fournit les aperçus vidéo OFFICIELS des clips (H.264 1080p, ~30 s, sans pub,
// sans restriction d'intégration). Mise en correspondance stricte artiste + titre pour éviter les faux clips.
const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const BAD_VIDEO = /interview|making of|behind the scenes|trailer|documentary|documentaire|freestyle|reaction|lyrics?\b|visuali[sz]er|teaser/;
const visualsCache = new Map();

async function findAppleClip(title, artist, durMs) {
  const A = firstArtist(cleanArtist(artist)), T = clean(title), nt = norm(T), na = norm(A);
  if (!nt || !na) return null;
  let best = null;
  for (const country of ['fr', 'us']) {
    const res = await j('https://itunes.apple.com/search?' + new URLSearchParams({ term: `${A} ${T}`, media: 'musicVideo', entity: 'musicVideo', limit: '25', country }));
    for (const r of (res && res.results) || []) {
      if (!r.previewUrl) continue;
      const rt = norm(clean(r.trackName)), ra = norm(r.artistName);
      if (!(ra.includes(na) || na.includes(ra.split(' and ')[0]))) continue;          // bon artiste
      if (rt !== nt && !rt.startsWith(nt + ' ') && !nt.startsWith(rt + ' ')) continue; // bon titre
      if (BAD_VIDEO.test(norm(r.trackName)) && !BAD_VIDEO.test(nt)) continue;
      let sc = rt === nt ? 5 : 2;
      if (durMs && r.trackTimeMillis) { const d = Math.abs(r.trackTimeMillis - durMs) / durMs; sc += d < .06 ? 4 : d < .2 ? 1 : -6; }
      if (!best || sc > best.sc) best = { sc, url: r.previewUrl };
    }
    if (best && best.sc >= 5) break;
  }
  return best && best.sc > 0 ? best.url : null;
}

async function findDeezerArt(title, artist) {
  const A = firstArtist(cleanArtist(artist)), T = clean(title);
  const res = await j('https://api.deezer.com/search?limit=10&q=' + encodeURIComponent(`${A} ${T}`));
  const na = norm(A), nt = norm(T);
  const list = ((res && res.data) || []).filter((x) => x.artist && norm(x.artist.name).includes(na));
  const hit = list.find((x) => norm(x.title) === nt) || list[0];
  if (!hit) return null;
  return { artist: hit.artist.picture_xl || hit.artist.picture_big || '', cover: (hit.album && (hit.album.cover_xl || hit.album.cover_big)) || '' };
}

ipcMain.handle('visuals', async (_e, { key, title, artist, duration }) => {
  if (visualsCache.has(key)) return visualsCache.get(key);
  const [clip, art] = await Promise.all([findAppleClip(title, artist, duration).catch(() => null), findDeezerArt(title, artist).catch(() => null)]);
  const out = { clip, artist: art && art.artist, cover: art && art.cover };
  visualsCache.set(key, out);
  if (visualsCache.size > 200) visualsCache.delete(visualsCache.keys().next().value);
  return out;
});
ipcMain.on('cmd', (_e, c) => { if (media) media.send(c); });
ipcMain.on('fullscreen', () => win.setFullScreen(!win.isFullScreen()));
ipcMain.on('ontop', (_e, v) => win.setAlwaysOnTop(!!v));
ipcMain.handle('pickFile', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Image / Vidéo', extensions: ['mp4', 'webm', 'mov', 'm4v', 'gif', 'png', 'jpg', 'jpeg', 'webp'] }]
  });
  return r.canceled ? null : r.filePaths[0];
});

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 800, backgroundColor: '#000', autoHideMenuBar: true, title: 'Music Visualizer',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  win.setMenuBarVisibility(false);
  if (process.env.MV_DEBUG) win.webContents.on('console-message', (_e, lvl, msg, line, src) => console.log('[renderer]', msg, src + ':' + line));
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  // Capture du son système (loopback) pour le visualiseur, sans fenêtre de sélection
  session.defaultSession.setDisplayMediaRequestHandler((_req, cb) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then((s) => {
        if (s && s[0]) cb({ video: s[0], audio: 'loopback' });
        else cb({});
      })
      .catch(() => cb({}));
  });
  createWindow();
  startMedia();
});

app.on('window-all-closed', () => { if (media) media.stop(); app.quit(); });
