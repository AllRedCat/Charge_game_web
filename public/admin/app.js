const list = document.querySelector('#prize-list');
const notice = document.querySelector('#notice');
const query = new URLSearchParams(location.search);
notice.textContent = query.get('sucesso') || query.get('erro') || '';
notice.classList.toggle('error', query.has('erro'));
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const prizes = await fetch('/admin/api/brindes').then((response) => response.json());
list.innerHTML = prizes.length ? prizes.map((prize) => `<article class="prize"><strong>${escape(prize.nome)}</strong><span>Estoque: ${prize.quantidade}</span><span>Mínimo: ${prize.percentual_minimo}%</span><span>Peso: ${prize.probabilidade}</span><form action="/admin/brindes/${prize.id}/atualizar" method="post"><input name="quantidade" type="number" min="0" value="${prize.quantidade}" aria-label="Estoque de ${escape(prize.nome)}" /><input type="hidden" name="ativo" value="${prize.ativo ? 1 : 0}" /><button>${prize.ativo ? 'Salvar' : 'Inativo'}</button></form></article>`).join('') : '<p>Nenhum brinde cadastrado.</p>';
