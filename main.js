const { app, BrowserWindow, ipcMain, desktopCapturer, session, dialog } = require('electron');
const path = require('path');
const http = require('http');

let win, media;

// Linux : l'AppArmor d'Ubuntu 24.04+ bloque le sandbox Chromium d'Electron installé via npm.
// L'appli ne charge que des fichiers locaux, on le désactive donc sur Linux.
if (process.platform === 'linux') app.commandLine.appendSwitch('no-sandbox');

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


// ---------- Clip YouTube (recherche + lecteur embarqué) ----------
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const secs = (s = '') => s.split(':').reduce((a, v) => a * 60 + (+v || 0), 0);

ipcMain.handle('ytsearch', async (_e, { title, artist, duration }) => {
  try {
    const a = cleanArtist(artist), t = clean(title);
    const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(`${a} ${t} clip officiel`) + '&sp=EgIQAQ%253D%253D',
      { headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' } });
    const m = (await r.text()).match(/var ytInitialData = (\{.*?\});<\/script>/s);
    if (!m) return [];
    const vids = [];
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (o.videoRenderer && o.videoRenderer.videoId) {
        const v = o.videoRenderer;
        vids.push({ id: v.videoId, title: (v.title.runs || []).map((x) => x.text).join(''), len: secs(v.lengthText && v.lengthText.simpleText), owner: (v.ownerText && v.ownerText.runs || []).map((x) => x.text).join('') });
      }
      for (const k in o) walk(o[k]);
    })(JSON.parse(m[1]));
    const dur = (duration || 0) / 1000, norm = (s) => s.toLowerCase();
    const score = (v) => {
      const T = norm(v.title); let s = 0;
      if (T.includes(norm(t))) s += 4;
      if (norm(v.owner).includes(norm(firstArtist(a))) || T.includes(norm(firstArtist(a)))) s += 3;
      if (/official|officiel|clip|video|vidéo|mv/.test(T)) s += 2;
      if (/lyric|paroles|audio|live|reaction|réaction|cover|remix|instrumental|karaoke|slowed|sped|nightcore|8d/.test(T)) s -= 5;
      if (dur && v.len) { const d = Math.abs(v.len - dur) / dur; s += d < .1 ? 3 : d < .3 ? 0 : -4; }
      return s;
    };
    return vids.slice(0, 12).map((v, i) => ({ id: v.id, s: score(v) - i * .1 })).sort((x, y) => y.s - x.s).slice(0, 5).map((x) => x.id);
  } catch { return []; }
});

// Petit serveur local : sert la page du lecteur YouTube (le lecteur exige une vraie origine http)
const PLAYER_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;overflow:hidden;background:#000}
#p{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100vw,177.78vh);height:max(56.25vw,100vh);pointer-events:none}
</style></head><body><div id="p"></div><script>
const q=new URLSearchParams(location.search);let pl,ready=false,want={t:0,playing:true};
const up=(m)=>parent.postMessage(m,'*');
function onYouTubeIframeAPIReady(){pl=new YT.Player('p',{videoId:q.get('v'),playerVars:{autoplay:1,controls:0,mute:1,rel:0,disablekb:1,fs:0,playsinline:1,modestbranding:1,iv_load_policy:3,start:+q.get('start')||0,origin:location.origin},
 events:{onReady:e=>{e.target.mute();e.target.playVideo();ready=true;up({type:'yt-ready'})},
  onStateChange:e=>{if(e.data===1)up({type:'yt-playing'})},
  onError:e=>up({type:'yt-error',code:e.data})}})}
addEventListener('message',e=>{if(!ready||!e.data||e.data.type!=='sync')return;want=e.data;
 const cur=pl.getCurrentTime();if(Math.abs(cur-want.t)>2.5&&want.t>=0)pl.seekTo(want.t,true);
 const st=pl.getPlayerState();if(want.playing&&st!==1&&st!==3)pl.playVideo();else if(!want.playing&&st===1)pl.pauseVideo()});
const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);
</script></body></html>`;
let ytPort = 0;
const ytServer = http.createServer((req, res) => {
  if (req.url.startsWith('/player.html')) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PLAYER_HTML); }
  else { res.writeHead(404); res.end(); }
});
const ytReady = new Promise((ok) => ytServer.listen(0, '127.0.0.1', () => { ytPort = ytServer.address().port; ok(ytPort); }));
ipcMain.handle('ytport', () => ytReady);
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
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb({ video: s[0], audio: 'loopback' })).catch(() => cb({}));
  });
  createWindow();
  startMedia();
});

app.on('window-all-closed', () => { ytServer.close(); if (media) media.stop(); app.quit(); });
