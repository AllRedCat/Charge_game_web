import express from 'express';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { Server } from 'socket.io';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = Number(process.env.PORT || 3000);

const db = new DatabaseSync(path.join(__dirname, 'data.db'));
db.exec(`CREATE TABLE IF NOT EXISTS participantes
         (
           id              INTEGER PRIMARY KEY AUTOINCREMENT,
           nome            TEXT    NOT NULL,
           telefone        TEXT    NOT NULL,
           email           TEXT    NOT NULL DEFAULT '',
           pontuacao       INTEGER NOT NULL,
           percentual      INTEGER NOT NULL,
           consumo_energia INTEGER NOT NULL,
           brinde_id       INTEGER,
           premio          TEXT    NOT NULL,
           criado_em       TEXT    NOT NULL
         )`);

const columns = new Set(db.prepare('PRAGMA table_info(participantes)').all().map((column) => column.name));
if (!columns.has('telefone')) db.exec("ALTER TABLE participantes ADD COLUMN telefone TEXT NOT NULL DEFAULT ''");
if (!columns.has('consumo_energia')) db.exec('ALTER TABLE participantes ADD COLUMN consumo_energia INTEGER NOT NULL DEFAULT 0');
if (!columns.has('brinde_id')) db.exec('ALTER TABLE participantes ADD COLUMN brinde_id INTEGER');

db.exec(`CREATE TABLE IF NOT EXISTS brindes
         (
           id                INTEGER PRIMARY KEY AUTOINCREMENT,
           nome              TEXT    NOT NULL,
           quantidade        INTEGER NOT NULL CHECK (quantidade >= 0),
           percentual_minimo INTEGER NOT NULL CHECK (percentual_minimo BETWEEN 0 AND 100),
           probabilidade     REAL    NOT NULL CHECK (probabilidade > 0),
           ativo             INTEGER NOT NULL DEFAULT 1,
           criado_em         TEXT    NOT NULL
         )`);

const insertParticipant = db.prepare(
  'INSERT INTO participantes (nome, telefone, email, pontuacao, percentual, consumo_energia, brinde_id, premio, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
);
const eligiblePrizes = db.prepare('SELECT id, nome, probabilidade FROM brindes WHERE ativo = 1 AND quantidade > 0 AND percentual_minimo <= ?');
const decrementPrize = db.prepare('UPDATE brindes SET quantidade = quantidade - 1 WHERE id = ? AND quantidade > 0');
const phoneExists = db.prepare('SELECT 1 FROM participantes WHERE telefone = ? LIMIT 1');
const topRanking = db.prepare('SELECT nome, pontuacao FROM participantes ORDER BY pontuacao DESC, id DESC LIMIT 5');

const game = { active: false, player: null, score: 0, startedAt: null, endsAt: null, timer: null };

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.get('/', (_req, res) => res.redirect('/screen'));
app.get('/screen', (_req, res) => res.sendFile(path.join(__dirname, 'public/screen/index.html')));
app.get('/mobile', (_req, res) => res.sendFile(path.join(__dirname, 'public/mobile/index.html')));
app.get('/telao', (_req, res) => res.redirect('/screen'));
app.get('/celular', (_req, res) => res.redirect('/mobile'));

app.get('/api/check-phone', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  if (phone.length < 8) return res.json({ played: false });
  const row = phoneExists.get(phone);
  res.json({ played: !!row });
});

app.get('/admin/exportar-csv', (_req, res) => {
  const rows = db.prepare('SELECT nome, telefone, email, consumo_energia, pontuacao, percentual, premio, criado_em FROM participantes ORDER BY id DESC').all();
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = ['Nome,Telefone,E-mail,Consumo de energia (%),Pontuação,Bateria (%),Brinde,Data', ...rows.map((row) => [row.nome, row.telefone, row.email, row.consumo_energia, row.pontuacao, row.percentual, row.premio, row.criado_em].map(quote).join(','))].join('\n');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="relatorio-bateria.csv"' }).send(`\uFEFF${csv}`);
});

app.get('/admin/download-db', (_req, res) => {
  // Faz checkpoint do WAL para garantir que todos os dados estejam no arquivo principal
  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* ignora se WAL não estiver ativo */ }
  res.download(path.join(__dirname, 'data.db'), 'data.db');
});

app.get('/admin/brindes', (_req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/admin/api/brindes', (_req, res) => {
  res.json(db.prepare('SELECT id, nome, quantidade, percentual_minimo, probabilidade, ativo FROM brindes ORDER BY percentual_minimo DESC, id DESC').all());
});
app.post('/admin/brindes', (req, res) => {
  const nome = String(req.body.nome || '').trim().slice(0, 100);
  const quantidade = Number.parseInt(req.body.quantidade, 10);
  const percentualMinimo = Number.parseInt(req.body.percentual_minimo, 10);
  const probabilidade = Number(req.body.probabilidade);
  if (!nome || !Number.isInteger(quantidade) || quantidade < 0 || !Number.isInteger(percentualMinimo) || percentualMinimo < 0 || percentualMinimo > 100 || !Number.isFinite(probabilidade) || probabilidade <= 0) {
    return res.redirect('/admin/brindes?erro=Dados+do+brinde+invalidos');
  }
  db.prepare('INSERT INTO brindes (nome, quantidade, percentual_minimo, probabilidade, criado_em) VALUES (?, ?, ?, ?, ?)').run(nome, quantidade, percentualMinimo, probabilidade, new Date().toISOString());
  res.redirect('/admin/brindes?sucesso=Brinde+adicionado');
});
app.post('/admin/brindes/:id/atualizar', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const quantidade = Number.parseInt(req.body.quantidade, 10);
  const ativo = req.body.ativo === '1' ? 1 : 0;
  if (!Number.isInteger(id) || !Number.isInteger(quantidade) || quantidade < 0) return res.redirect('/admin/brindes?erro=Atualizacao+invalida');
  db.prepare('UPDATE brindes SET quantidade = ?, ativo = ? WHERE id = ?').run(quantidade, ativo, id);
  res.redirect('/admin/brindes?sucesso=Estoque+atualizado');
});

function getLocalAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return 'localhost';
}

function awardPrize(percent) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const prizes = eligiblePrizes.all(percent);
    if (!prizes.length) { db.exec('COMMIT'); return null; }
    const totalWeight = prizes.reduce((total, prize) => total + prize.probabilidade, 0);
    let draw = Math.random() * totalWeight;
    const selected = prizes.find((prize) => (draw -= prize.probabilidade) <= 0) || prizes.at(-1);
    if (decrementPrize.run(selected.id).changes !== 1) { db.exec('ROLLBACK'); return null; }
    db.exec('COMMIT');
    return selected;
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* transaction already closed */ }
    throw error;
  }
}

function snapshot() {
  return { active: game.active, player: game.player ? { name: game.player.name } : null, score: game.score, percent: Math.min(100, game.score), endsAt: game.endsAt };
}

function ranking() {
  return topRanking.all().map((player, index) => ({ position: index + 1, name: player.nome, score: player.pontuacao }));
}

function endGame() {
  if (!game.active) return;
  clearTimeout(game.timer);
  const result = { score: game.score, percent: Math.min(100, game.score) };
  const prize = awardPrize(result.percent);
  result.prize = prize?.nome || 'Sem brinde disponível';
  insertParticipant.run(game.player.name, game.player.phoneDigits, game.player.email, result.score, result.percent, game.player.consumption, prize?.id || null, result.prize, new Date().toISOString());
  const player = { name: game.player.name };
  game.active = false;
  game.player = null;
  game.score = 0;
  game.startedAt = null;
  game.endsAt = null;
  game.timer = null;
  io.emit('game:state', snapshot());
  io.emit('game:ended', { ...result, player });
  io.emit('ranking:update', ranking());
}

io.on('connection', (socket) => {
  socket.emit('game:state', snapshot());
  socket.emit('ranking:update', ranking());

  socket.on('game:start', (player) => {
    const name = String(player?.name || '').trim().slice(0, 80);
    const phone = String(player?.phone || '').trim().slice(0, 30);
    const email = String(player?.email || '').trim().slice(0, 160);
    const consumption = Number(player?.consumption);
    const phoneDigits = phone.replace(/\D/g, '');
    if (!name || phoneDigits.length < 8 || !Number.isFinite(consumption) || consumption < 0 || consumption > 100000 || (email && !/^\S+@\S+\.\S+$/.test(email))) return socket.emit('game:error', 'Preencha nome, telefone e consumo válidos. O e-mail é opcional.');
    if (game.active) return socket.emit('game:busy');
    if (phoneExists.get(phoneDigits)) return socket.emit('game:already-played');

    game.active = true;
    game.player = { name, phone, phoneDigits, email, consumption, socketId: socket.id };
    game.score = 0;
    game.startedAt = Date.now();
    game.endsAt = game.startedAt + 15_000;
    game.timer = setTimeout(endGame, 15_000);
    io.emit('game:started', snapshot());
  });

  socket.on('game:tap', () => {
    if (!game.active || game.player?.socketId !== socket.id || Date.now() >= game.endsAt) return;
    game.score += 1;
    io.emit('game:progress', { score: game.score, percent: Math.min(100, game.score), endsAt: game.endsAt });
  });
});

const isDev = process.env.NODE_ENV !== 'production';
const mobileUrl = isDev
  ? `http://${getLocalAddress()}:${port}/mobile`
  : `${(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`).replace(/\/$/, '')}/mobile`;

app.get('/api/qrcode', async (_req, res, next) => {
  try {
    res.type('png').send(await QRCode.toBuffer(mobileUrl, { width: 440, margin: 2, color: { dark: '#092d2f', light: '#ffffff' } }));
  } catch (error) { next(error); }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Ambiente : ${isDev ? 'desenvolvimento' : 'produção'}`);
  console.log(`Telão    : http://localhost:${port}/screen`);
  console.log(`Celular  : ${mobileUrl}`);
});
