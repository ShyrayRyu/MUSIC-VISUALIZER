// Windows : lecteur multimédia système (SMTC) via PowerShell
const { spawn } = require('child_process');
const path = require('path');

module.exports = function (onMsg) {
  let ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'smtc.ps1')], { windowsHide: true });
  let buf = '';
  ps.stdout.setEncoding('utf8');
  ps.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) { try { onMsg(JSON.parse(line)); } catch {} }
    }
  });
  ps.on('exit', () => { ps = null; });
  return {
    send: (c) => { if (ps && ps.stdin.writable) ps.stdin.write(c + '\n'); },
    stop: () => { if (ps) ps.kill(); }
  };
};
