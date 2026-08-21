const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const today = new Date();
const iso = (date) => new Date(date).toISOString();
const sampleClients = [
  { id: 1, name: 'Cliente de teste', phone: '(16) 99999-0000', product: 'Portabilidade', status: 'Em atendimento', notes: '' },
  { id: 2, name: 'Novo atendimento', phone: '(16) 99999-0001', product: 'Refinanciamento', status: 'Proposta enviada', notes: '' }
];
const sampleReturns = [
  { id: 1, name: 'Cliente de teste', datetime: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30)), reason: 'Enviar proposta no WhatsApp' },
  { id: 2, name: 'Novo atendimento', datetime: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0)), reason: 'Confirmar documentação' },
  { id: 3, name: 'Retorno pendente', datetime: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14, 0)), reason: 'Tentar ligação novamente' }
];
let clients = storage.get('acert_clients', sampleClients);
let returns = storage.get('acert_returns', sampleReturns);
let activeAgenda = 'all';

function money(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatDate(dateValue) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(dateValue)).replace('.', ''); }
function formatTime(dateValue) { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateValue)); }
function startOfDay(date = new Date()) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
function returnBucket(item) { const date = new Date(item.datetime); const day = startOfDay(); if (date < day) return 'atrasado'; if (date < new Date(day.getTime() + 86400000)) return 'hoje'; return 'futuro'; }
function save() { storage.set('acert_clients', clients); storage.set('acert_returns', returns); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }

function renderDashboard() {
  const late = returns.filter(r => returnBucket(r) === 'atrasado').length;
  const todayCount = returns.filter(r => returnBucket(r) === 'hoje').length;
  const proposals = clients.filter(c => c.status === 'Proposta enviada').length;
  $('#metrics').innerHTML = [
    ['CLIENTES ATIVOS', clients.length, 'em acompanhamento'],
    ['RETORNOS HOJE', todayCount, 'prioridade da agenda'],
    ['PROPOSTAS ENVIADAS', proposals, 'aguardando resposta'],
    ['ATRASADOS', late, late ? 'precisam de atenção' : 'nenhuma pendência', late ? 'accent' : '']
  ].map(([label, value, sub, className]) => `<article class="metric"><p class="eyebrow">${label}</p><strong class="${className}">${value}</strong><small>${sub}</small></article>`).join('');
  const next = [...returns].sort((a,b) => new Date(a.datetime) - new Date(b.datetime)).slice(0, 4);
  $('#next-returns').innerHTML = next.length ? next.map(item => `<div class="return-item"><span class="bar"></span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.reason)}</small></div><span class="return-time">${returnBucket(item) === 'atrasado' ? 'Atrasado' : `${formatDate(item.datetime)} · ${formatTime(item.datetime)}`}</span></div>`).join('') : '<p class="muted">Nenhum retorno agendado.</p>';
}

function renderClients() {
  const search = $('#client-search').value.trim().toLowerCase();
  const filter = $('#status-filter').value;
  const view = clients.filter(client => !filter || client.status === filter).filter(client => !search || `${client.name} ${client.phone}`.toLowerCase().includes(search));
  $('#clients-table').innerHTML = view.length ? view.map(client => {
    const clientReturns = returns.filter(ret => ret.name === client.name).sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
    const nextReturn = clientReturns.find(ret => new Date(ret.datetime) >= new Date());
    return `<tr><td><strong>${escapeHtml(client.name)}</strong><small>${escapeHtml(client.notes || 'Sem observações')}</small></td><td>${escapeHtml(client.phone)}</td><td>${escapeHtml(client.product)}</td><td><span class="status ${client.status.toLowerCase().replaceAll(' ', '-')}">${escapeHtml(client.status)}</span></td><td>${nextReturn ? `${formatDate(nextReturn.datetime)} · ${formatTime(nextReturn.datetime)}` : '—'}</td><td class="actions-cell"><button data-return-client="${client.id}">Agendar</button></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="muted">Nenhum cliente encontrado.</td></tr>';
}

function renderAgenda() {
  const list = [...returns].sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
  const filtered = activeAgenda === 'all' ? list : list.filter(item => returnBucket(item) === activeAgenda);
  $('#late-count').textContent = returns.filter(item => returnBucket(item) === 'atrasado').length || '';
  $('#agenda-list').innerHTML = filtered.length ? filtered.map(item => {
    const bucket = returnBucket(item); const date = new Date(item.datetime);
    return `<article class="agenda-item ${bucket}"><div class="agenda-date"><strong>${String(date.getDate()).padStart(2,'0')}</strong><small>${date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</small></div><div class="agenda-info"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.reason)} · ${formatTime(item.datetime)}${bucket === 'atrasado' ? ' · Atrasado' : ''}</small></div><button data-done="${item.id}">Concluído</button></article>`;
  }).join('') : '<p class="muted">Nenhum retorno nesta lista.</p>';
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2900); }
function openModal(name) { $('#modal-backdrop').hidden = false; $(`#${name}-modal`).hidden = false; }
function closeModal() { $('#modal-backdrop').hidden = true; $$('.modal').forEach(el => el.hidden = true); }
function goTo(view) { $$('.view').forEach(el => el.classList.toggle('active', el.id === view)); $$('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view)); const titles = { dashboard:['PAINEL COMERCIAL','Olá, Douglas'], clientes:['CARTEIRA DE CLIENTES','Clientes'], agenda:['ATENDIMENTOS E RETORNOS','Agenda'], simulador:['PORTABILIDADE E REFINANCIAMENTO','Simulador'] }; $('#section-kicker').textContent = titles[view][0]; $('#page-title').textContent = titles[view][1]; window.scrollTo({ top: 0, behavior: 'smooth' }); }

function handleSimulation(event) {
  event.preventDefault(); const data = new FormData(event.target);
  const installment = Number(data.get('installment')); const debt = Number(data.get('debt')); const coefficient = Number(data.get('coefficient')); const safety = Number(data.get('safety'));
  const financed = installment / coefficient; const gross = financed - debt; const released = gross - safety;
  let marginHtml = ''; const income = Number(data.get('income'));
  if (income) { const loans = Number(data.get('loans')); const rmc = data.get('rmc') ? income * .05 : 0; const rcc = data.get('rcc') ? income * .05 : 0; const margin = income * .4 - loans - rmc - rcc; marginHtml = `<div class="result-line"><span>Margem calculada (40%)</span><strong class="${margin >= 0 ? 'margin-ok' : 'margin-no'}">${money(margin)}</strong></div>`; }
  const safeReleased = Math.max(0, released);
  $('#sim-result').innerHTML = `<p class="eyebrow">ESTIMATIVA DE LIBERAÇÃO</p><h3>${escapeHtml(data.get('name') || 'Nova operação')}</h3><p class="result-number">${money(safeReleased)}</p><p class="muted">${released < 0 ? 'Com estes dados, não há valor estimado a liberar.' : 'Valor já considera a margem de segurança informada.'}</p><div class="result-lines"><div class="result-line"><span>Valor financiado estimado</span><strong>${money(financed)}</strong></div><div class="result-line"><span>Saldo devedor</span><strong>− ${money(debt)}</strong></div><div class="result-line"><span>Margem de segurança</span><strong>− ${money(safety)}</strong></div>${marginHtml}</div>`;
}

function init() {
  $('#today').textContent = new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'long' }).format(today);
  renderDashboard(); renderClients(); renderAgenda();
  $$('.nav-link').forEach(btn => btn.addEventListener('click', () => goTo(btn.dataset.view)));
  $$('[data-go]').forEach(btn => btn.addEventListener('click', () => goTo(btn.dataset.go)));
  $('#open-client-modal').addEventListener('click', () => openModal('client'));
  $('#open-return-modal').addEventListener('click', () => openModal('return'));
  $$('.close-modal').forEach(btn => btn.addEventListener('click', closeModal));
  $('#modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') closeModal(); });
  $('#client-search').addEventListener('input', renderClients); $('#status-filter').addEventListener('change', renderClients);
  $('#client-form').addEventListener('submit', event => { event.preventDefault(); const d = new FormData(event.target); clients.unshift({id:Date.now(),name:d.get('name'),phone:d.get('phone'),product:d.get('product'),status:d.get('status'),notes:d.get('notes')}); save(); renderClients(); renderDashboard(); event.target.reset(); closeModal(); showToast('Cliente cadastrado com sucesso.'); });
  $('#return-form').addEventListener('submit', event => { event.preventDefault(); const d = new FormData(event.target); returns.push({id:Date.now(),name:d.get('name'),datetime:new Date(d.get('datetime')).toISOString(),reason:d.get('reason')}); save(); renderAgenda(); renderDashboard(); event.target.reset(); closeModal(); showToast('Retorno agendado.'); });
  $('#clients-table').addEventListener('click', event => { const id = event.target.dataset.returnClient; if (!id) return; const client = clients.find(item => item.id === Number(id)); $('#return-form [name=name]').value = client.name; openModal('return'); });
  $('#agenda-list').addEventListener('click', event => { const id = event.target.dataset.done; if (!id) return; returns = returns.filter(item => item.id !== Number(id)); save(); renderAgenda(); renderDashboard(); showToast('Retorno concluído.'); });
  $$('#agenda-tabs .tab').forEach(tab => tab.addEventListener('click', () => { activeAgenda = tab.dataset.filter; $$('#agenda-tabs .tab').forEach(item => item.classList.toggle('active', item === tab)); renderAgenda(); }));
  $('#simulator-form').addEventListener('submit', handleSimulation);
}
init();
