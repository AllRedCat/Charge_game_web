const socket = io();
const views = Object.fromEntries([...document.querySelectorAll('.view')].map((view) => [view.id, view]));
const form = document.querySelector('#player-form');
const message = document.querySelector('#message');
let player = JSON.parse(localStorage.getItem('bateria-player') || 'null');
let playing = false;
function show(id) { Object.entries(views).forEach(([key, element]) => element.classList.toggle('active', key === id)); }
function alert(text) { message.textContent = text; setTimeout(() => { if (message.textContent === text) message.textContent = ''; }, 3500); }
function goReady() { document.querySelector('#ready-name').textContent = player.name.split(' ')[0].toUpperCase(); show('ready-view'); }
if (player?.name && player?.phone && player?.consumption !== undefined) { document.querySelector('#name').value = player.name; document.querySelector('#phone').value = player.phone; document.querySelector('#consumption').value = player.consumption; document.querySelector('#email').value = player.email || ''; goReady(); }

form.addEventListener('submit', (event) => {
  event.preventDefault();
  player = { name: form.name.value.trim(), phone: form.phone.value.trim(), consumption: Number(form.consumption.value), email: form.email.value.trim() };
  localStorage.setItem('bateria-player', JSON.stringify(player));
  goReady();
});
document.querySelector('#start-button').addEventListener('click', () => socket.emit('game:start', player));
document.querySelector('#tap-button').addEventListener('pointerdown', (event) => { event.preventDefault(); if (playing) socket.emit('game:tap'); });
document.querySelector('#play-again').addEventListener('click', () => show('ready-view'));
socket.on('game:state', (state) => { if (state.active && !playing) show('wait-view'); });
socket.on('game:busy', () => { playing = false; show('wait-view'); });
socket.on('game:error', alert);
socket.on('game:started', (state) => {
  if (state.player.name !== player?.name) return show('wait-view');
  playing = true; show('game-view');
  const interval = setInterval(() => { const seconds = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)); document.querySelector('#time-left').textContent = seconds; if (!seconds) clearInterval(interval); }, 100);
});
socket.on('game:ended', (result) => {
  if (!playing) { if (views['wait-view'].classList.contains('active')) goReady(); return; }
  playing = false; document.querySelector('#mobile-percent').textContent = `${result.percent}%`; document.querySelector('#mobile-prize').textContent = result.prize; show('result-view');
});
