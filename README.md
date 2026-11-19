# 🎵 Music Visualizer

🇫🇷 [Français](#-français) · 🇬🇧 [English](#-english)

---

## 🇫🇷 Français

Application **Windows 10/11 et Linux (Ubuntu)** qui affiche la musique en cours (YouTube Music, Deezer, Spotify… dans le navigateur ou une app) avec :

- **Paroles synchronisées** (via [LRCLIB](https://lrclib.net)), mot par mot, en grand
- **Visualiseur circulaire** réactif au son autour de la pochette ronde
- Couleurs automatiques tirées de la pochette, halo lumineux, horloge, fond flouté / aurore / clip perso
- Pochettes des derniers morceaux sur le côté, barre de contrôle (précédent / pause / suivant / seek)
- **Deux modes** : visualiseur circulaire **ou** paroles + clip en fond
- **Français / Anglais** au choix, assistant de démarrage et réglages complets (tout s'active / se désactive)

### Prérequis
- **Windows 10 / 11** : [Node.js](https://nodejs.org) LTS — `winget install OpenJS.NodeJS.LTS`
- **Ubuntu / Linux** (PulseAudio ou PipeWire) :
  ```bash
  sudo apt install nodejs npm playerctl git
  ```
  `playerctl` lit le lecteur en cours (MPRIS) : YouTube Music / Deezer dans Chrome, Firefox, Spotify, etc. Pour le visualiseur, l'app écoute automatiquement la source « Monitor of … » du son système. Utilise un Node récent (≥ 18, idéalement LTS via [NodeSource](https://github.com/nodesource/distributions) ou `nvm`).

### Installation et lancement
```powershell
git clone https://github.com/ShyrayRyu/MUSIC-VISUALIZER.git
cd MUSIC-VISUALIZER
npm install
npm start
```
Ou double-clique sur `Lancer.bat` (Windows) / lance `./Lancer.sh` (Linux) : les dépendances s'installent au premier lancement.

### Utilisation
1. Lance une musique sur YouTube Music, Deezer ou Spotify.
2. Ouvre l'application : un **assistant** te demande le mode et les fonctions voulues.
3. Tout est modifiable ensuite dans les **réglages** (⚙ ou touche `S`), y compris la **langue**.

| Touche | Action |
|---|---|
| `M` | Changer de mode (visualiseur / paroles) |
| `S` | Ouvrir / fermer les réglages |
| `F11` | Plein écran (mode « fond d'écran ») |
| `Espace` | Lecture / pause |
| `←` / `→` | Piste précédente / suivante |

### Comment ça marche
- **Lecture en cours** : sous Windows, [`smtc.ps1`](smtc.ps1) lit le lecteur multimédia système (titre, artiste, pochette, position) ; sous Linux, [`media-linux.js`](media-linux.js) passe par `playerctl` (MPRIS). Les commandes de lecture sont envoyées de la même façon.
- **Visualiseur** : capture du son système (loopback Windows, source *Monitor* sous Linux) — aucun micro nécessaire.
- **Paroles** : récupérées sur LRCLIB ; la synchro est par ligne, le remplissage mot par mot est estimé.

### Limites connues
- La file d'attente à venir n'est pas exposée par Windows : les pochettes latérales montrent l'**historique** des morceaux écoutés.
- Si le visualiseur ne suit pas le son, la capture audio a échoué : il bascule sur une animation simulée.
- Si les paroles sont décalées, ajuste « Décalage synchro » dans les réglages.
- Sous Linux, le sandbox Chromium est désactivé (nécessaire sur Ubuntu 24.04+ ; l'app ne charge que des fichiers locaux).
- Pas de fond d'écran animé derrière les icônes du bureau (utilise F11).

### Dépannage
- *Rien ne s'affiche* : vérifie qu'une musique joue bien et que Windows affiche les contrôles multimédia (volume → carte média).
- *Paroles introuvables* : le titre n'existe peut-être pas sur LRCLIB.

---

## 🇬🇧 English

**Windows 10/11 and Linux (Ubuntu)** app that shows whatever is playing (YouTube Music, Deezer, Spotify… in a browser or app) with:

- **Synced lyrics** (via [LRCLIB](https://lrclib.net)), word by word, large
- **Sound-reactive circular visualizer** around a round album cover
- Auto colors from the cover, glowing halo, clock, blurred / aurora / custom clip background
- Side covers of recent tracks, control bar (previous / pause / next / seek)
- **Two modes**: circular visualizer **or** lyrics + clip background
- **French / English**, startup wizard and full settings (every feature can be toggled)

### Requirements
- **Windows 10 / 11**: [Node.js](https://nodejs.org) LTS — `winget install OpenJS.NodeJS.LTS`
- **Ubuntu / Linux** (PulseAudio or PipeWire):
  ```bash
  sudo apt install nodejs npm playerctl git
  ```
  `playerctl` reads the current player (MPRIS): YouTube Music / Deezer in Chrome, Firefox, Spotify, etc. For the visualizer, the app automatically listens to the "Monitor of …" system-audio source. Use a recent Node (≥ 18, ideally LTS via [NodeSource](https://github.com/nodesource/distributions) or `nvm`).

### Install & run
```powershell
git clone https://github.com/ShyrayRyu/MUSIC-VISUALIZER.git
cd MUSIC-VISUALIZER
npm install
npm start
```
Or double-click `Lancer.bat` (Windows) / run `./Lancer.sh` (Linux): dependencies are installed on first run.

### Usage
1. Play music on YouTube Music, Deezer or Spotify.
2. Open the app: a **wizard** asks for the mode and features you want.
3. Everything can be changed later in **settings** (⚙ or `S`), including the **language**.

| Key | Action |
|---|---|
| `M` | Switch mode (visualizer / lyrics) |
| `S` | Toggle settings |
| `F11` | Fullscreen ("wallpaper" mode) |
| `Space` | Play / pause |
| `←` / `→` | Previous / next track |

### How it works
- **Now playing**: on Windows, [`smtc.ps1`](smtc.ps1) reads the system media session (title, artist, cover, position); on Linux, [`media-linux.js`](media-linux.js) uses `playerctl` (MPRIS). Playback commands work the same way.
- **Visualizer**: system audio capture (Windows loopback, *Monitor* source on Linux) — no microphone needed.
- **Lyrics**: fetched from LRCLIB; sync is per line, word-by-word fill is estimated.

### Known limitations
- Windows doesn't expose the upcoming queue, so side covers show your listening **history**.
- If the visualizer doesn't follow the sound, audio capture failed and it falls back to a simulated animation.
- If lyrics are off, tweak "Sync offset" in settings.
- On Linux the Chromium sandbox is disabled (required on Ubuntu 24.04+; the app only loads local files).
- No live wallpaper behind desktop icons (use F11).

### Troubleshooting
- *Nothing shows up*: make sure music is playing and Windows shows media controls (volume flyout).
- *No lyrics found*: the track may not exist on LRCLIB.
