const { app, BrowserWindow, ipcMain, desktopCapturer, session, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let win, ps;

function startMedia() {
  ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'smtc.ps1')], { windowsHide: true });
  let buf = '';
  ps.stdout.setEncoding('utf8');
  ps.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line && win && !win.isDestroyed()) {
        try { win.webContents.send('media', JSON.parse(line)); } catch {}
      }
    }
  });
  ps.on('exit', () => { ps = null; });
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

ipcMain.on('cmd', (_e, c) => { if (ps && ps.stdin.writable) ps.stdin.write(c + '\n'); });
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
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  // Capture du son système (loopback) pour le visualiseur, sans fenêtre de sélection
  session.defaultSession.setDisplayMediaRequestHandler((_req, cb) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb({ video: s[0], audio: 'loopback' }));
  });
  createWindow();
  startMedia();
});

app.on('window-all-closed', () => { if (ps) ps.kill(); app.quit(); });
