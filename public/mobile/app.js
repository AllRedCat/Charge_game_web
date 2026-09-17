const socket = io();
const views = Object.fromEntries([...document.querySelectorAll('.view')].map((view) => [view.id, view]));
const form = document.querySelector('#player-form');
const message = document.querySelector('#message');
let player = JSON.parse(localStorage.getItem('bateria-player') || 'null');
let playing = false;

function show(id) { Object.entries(views).forEach(([key, element]) => element.classList.toggle('active', key === id)); }
function alert(text) { message.textContent = text; setTimeout(() => { if (message.textContent === text) message.textContent = ''; }, 3500); }
function goReady() { document.querySelector('#ready-name').textContent = player.name.split(' ')[0].toUpperCase(); show('ready-view'); }
function showBlocked() { show('blocked-view'); }

// Se o localStorage indica que este telefone já jogou, bloqueia imediatamente
const playedPhone = localStorage.getItem('bateria-played-phone');
if (playedPhone && player?.phone && playedPhone === player.phone.replace(/\D/g, '')) {
  showBlocked();
} else if (player?.name && player?.phone && player?.consumption !== undefined) {
  document.querySelector('#name').value = player.name;
  document.querySelector('#phone').value = player.phone;
  document.querySelector('#consumption').value = player.consumption;
  document.querySelector('#email').value = player.email || '';
  goReady();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const consumption = Number(form.consumption.value);
  const email = form.email.value.trim();

  // Verificar no servidor se o telefone já jogou antes de avançar
  try {
    const res = await fetch(`/api/check-phone?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (data.played) {
      // Salva localmente para bloquear em visitas futuras sem precisar de rede
      localStorage.setItem('bateria-played-phone', phone.replace(/\D/g, ''));
      showBlocked();
      return;
    }
  } catch {
    // Se a verificação falhar, deixa prosseguir — o servidor bloqueará no game:start
  }

  player = { name, phone, consumption, email };
  localStorage.setItem('bateria-player', JSON.stringify(player));
  goReady();
});

document.querySelector('#start-button').addEventListener('click', () => socket.emit('game:start', player));
document.querySelector('#tap-button').addEventListener('pointerdown', (event) => { event.preventDefault(); if (playing) socket.emit('game:tap'); });

socket.on('game:state', (state) => { if (state.active && !playing) show('wait-view'); });
socket.on('game:busy', () => { playing = false; show('wait-view'); });
socket.on('game:error', alert);
socket.on('game:already-played', () => {
  playing = false;
  // Persiste o bloqueio localmente
  if (player?.phone) localStorage.setItem('bateria-played-phone', player.phone.replace(/\D/g, ''));
  showBlocked();
});
socket.on('game:started', (state) => {
  if (state.player.name !== player?.name) return show('wait-view');
  playing = true; show('game-view');
  const interval = setInterval(() => { const seconds = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)); document.querySelector('#time-left').textContent = seconds; if (!seconds) clearInterval(interval); }, 100);
});
socket.on('game:ended', (result) => {
  if (!playing) { if (views['wait-view'].classList.contains('active')) goReady(); return; }
  playing = false;
  // Persiste o bloqueio localmente para impedir nova tentativa
  if (player?.phone) localStorage.setItem('bateria-played-phone', player.phone.replace(/\D/g, ''));
  document.querySelector('#mobile-percent').textContent = `${result.percent}%`;
  document.querySelector('#mobile-prize').textContent = result.prize;
  show('result-view');
});
