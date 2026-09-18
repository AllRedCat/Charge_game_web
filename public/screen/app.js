const socket = io();
const screens = { idle: document.querySelector('#idle'), playing: document.querySelector('#playing'), result: document.querySelector('#result') };
let countdown;
let resultTimeout;

function show(name) { Object.entries(screens).forEach(([key, element]) => element.classList.toggle('hidden', key !== name)); }

/**
 * Interpola entre vermelho (#e53e3e) → amarelo (#ecc94b) → verde (#38a169)
 * conforme o percentual (0–100).
 */
function batteryColor(percent) {
  if (percent <= 50) {
    // vermelho → amarelo
    const t = percent / 50;
    const r = Math.round(229 + (236 - 229) * t);
    const g = Math.round(62  + (201 - 62)  * t);
    const b = Math.round(62  + (75  - 62)  * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // amarelo → verde
    const t = (percent - 50) / 50;
    const r = Math.round(236 + (56  - 236) * t);
    const g = Math.round(201 + (161 - 201) * t);
    const b = Math.round(75  + (105 - 75)  * t);
    return `rgb(${r},${g},${b})`;
  }
}

function setProgress(score) {
  const percent = Math.min(100, score);
  const color = batteryColor(percent);
  const fill = document.querySelector('#battery-fill');
  fill.style.height = `${percent}%`;
  fill.style.backgroundColor = color;
  document.querySelector('#percentage').textContent = `${score}%`;
  const overage = document.querySelector('#overage');
  overage.classList.toggle('hidden', score <= 100);
  overage.textContent = `+${score - 100} ACIMA DE 100`;
}

function setResultBattery(percent) {
  const color = batteryColor(percent);
  const fill = document.querySelector('#result-battery-fill');
  fill.style.height = `${percent}%`;
  fill.style.backgroundColor = color;
  document.querySelector('#result-percent').textContent = `${percent}%`;
}

function setRanking(players) {
  const list = document.querySelector('#ranking-list');
  list.replaceChildren();
  if (!players.length) {
    const empty = document.createElement('li');
    empty.className = 'ranking-empty';
    empty.textContent = 'AGUARDANDO JOGADORES';
    list.append(empty);
    return;
  }
  players.forEach(({ position, name, score }) => {
    const item = document.createElement('li');
    item.className = 'ranking-item';
    item.innerHTML = `<span class="ranking-position">${position}</span><span class="ranking-name"></span><strong>${score}</strong>`;
    item.querySelector('.ranking-name').textContent = name;
    list.append(item);
  });
}

function beginCountdown(endsAt) {
  clearInterval(countdown);
  const tick = () => { const seconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)); document.querySelector('#seconds').textContent = seconds; };
  tick();
  countdown = setInterval(tick, 100);
}

socket.on('game:state', (state) => {
  if (state.active) {
    clearTimeout(resultTimeout);
    show('playing');
    document.querySelector('#player-name').textContent = state.player.name;
    setProgress(state.score);
    beginCountdown(state.endsAt);
  }
});
socket.on('game:started', (state) => { show('playing'); document.querySelector('#player-name').textContent = state.player.name; setProgress(0); beginCountdown(state.endsAt); });
socket.on('game:progress', ({ score }) => setProgress(score));
socket.on('ranking:update', setRanking);
socket.on('game:ended', ({ percent, prize, player }) => {
  clearInterval(countdown);
  setResultBattery(percent);
  document.querySelector('#result-player').textContent = player?.name || 'Jogador';
  document.querySelector('#result-prize').textContent = prize;
  show('result');
  clearTimeout(resultTimeout);
  resultTimeout = setTimeout(() => show('idle'), 7000);
});
