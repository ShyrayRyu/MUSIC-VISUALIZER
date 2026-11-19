// Linux (Ubuntu...) : MPRIS via `playerctl` (sudo apt install playerctl)
const { execFile } = require('child_process');
const fs = require('fs');

module.exports = function (onMsg) {
  const FMT = ['{{status}}', '{{title}}', '{{artist}}', '{{album}}', '{{mpris:length}}', '{{position}}', '{{mpris:artUrl}}', '{{playerName}}'].join('\t');
  let stopped = false, busy = false, lastKey = '', lastArt = '', wasActive = null, warned = false;

  const run = (args) => new Promise((res) =>
    execFile('playerctl', args, { timeout: 3000 }, (err, out) => {
      if (err && err.code === 'ENOENT' && !warned) { warned = true; console.error('playerctl introuvable : sudo apt install playerctl'); onMsg({ type: 'error', code: 'playerctl-missing' }); }
      res(err ? null : out.trim());
    }));

  async function loadArt(url) {
    try {
      if (!url) return null;
      if (url.startsWith('file://')) return fs.readFileSync(decodeURIComponent(new URL(url).pathname)).toString('base64');
      const r = await fetch(url);
      return Buffer.from(await r.arrayBuffer()).toString('base64');
    } catch { return null; }
  }

  async function poll() {
    if (busy || stopped) return;
    busy = true;
    try {
      const out = await run(['metadata', '--format', FMT]);
      const [status, title, artist, album, len, position, art, app] = (out || '').split('\t');
      if (!out || !title) {
        if (wasActive !== false) { onMsg({ type: 'state', active: false }); wasActive = false; }
      } else {
        wasActive = true;
        const key = `${title}|${artist}`;
        onMsg({ type: 'state', active: true, title, artist, album, playing: status === 'Playing',
          pos: Math.round((+position || 0) / 1000), dur: Math.round((+len || 0) / 1000), app, key });
        if (key !== lastKey || art !== lastArt) {
          const data = await loadArt(art);
          lastKey = key;
          if (data) { lastArt = art; onMsg({ type: 'cover', key, data }); } else lastArt = '';
        }
      }
    } finally { busy = false; }
  }
  const timer = setInterval(poll, 500);

  return {
    send: (c) => {
      let m;
      if (c === 'toggle') run(['play-pause']);
      else if (c === 'play') run(['play']);
      else if (c === 'pause') run(['pause']);
      else if (c === 'next') run(['next']);
      else if (c === 'prev') run(['previous']);
      else if ((m = /^seek:(\d+)$/.exec(c))) run(['position', String(+m[1] / 1000)]);
    },
    stop: () => { stopped = true; clearInterval(timer); }
  };
};
