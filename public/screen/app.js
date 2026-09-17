const socket = io();
const screens = { idle: document.querySelector('#idle'), playing: document.querySelector('#playing'), result: document.querySelector('#result') };
let countdown;
function show(name) { Object.entries(screens).forEach(([key, element]) => element.classList.toggle('hidden', key !== name)); }
function setProgress(percent) { document.querySelector('#charge').style.width = `${percent}%`; document.querySelector('#percentage').textContent = `${percent}%`; }
function beginCountdown(endsAt) { clearInterval(countdown); const tick = () => { const seconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)); document.querySelector('#seconds').textContent = seconds; }; tick(); countdown = setInterval(tick, 100); }
socket.on('game:state', (state) => { if (state.active) { show('playing'); document.querySelector('#player-name').textContent = state.player.name; setProgress(state.percent); beginCountdown(state.endsAt); } });
socket.on('game:started', (state) => { show('playing'); document.querySelector('#player-name').textContent = state.player.name; setProgress(0); beginCountdown(state.endsAt); });
socket.on('game:progress', ({ percent }) => setProgress(percent));
socket.on('game:ended', ({ percent, prize }) => { clearInterval(countdown); document.querySelector('#result-percent').textContent = `${percent}%`; document.querySelector('#result-prize').textContent = prize; show('result'); setTimeout(() => show('idle'), 7000); });
