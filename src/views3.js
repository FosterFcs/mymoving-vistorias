/* =====================================================================
   Escanear, guarda-móveis, relatórios, cadastros, configurações,
   portal do cliente, dados de demonstração e inicialização
   ===================================================================== */

/* ---------------- escanear (global) ---------------- */
async function vEscanear(c){
  c.innerHTML = `<div class="cab"><div><h1>Escanear volume</h1><div class="sub">Aponte para a etiqueta QR de qualquer volume</div></div></div>
  <div class="card"><div id="leitor"></div><div id="gres" style="margin-top:12px"></div>
  <form id="gnum" class="acoes" style="margin-top:10px"><input name="cod" placeholder="Ou digite: código da mudança + nº (ex.: MM2610-AB12 7)" style="flex:1;min-width:200px"><button class="btn">Buscar</button></form></div>`;
  const mostrar = v => {
    const g = $('#gres');
    if (!v) { g.innerHTML = `<div class="alerta-box verm">Etiqueta não reconhecida ou volume não sincronizado neste aparelho.</div>`; return; }
    const m = pega('mudancas', v.mudanca_id);
    const acoes = [['carregado','Carregar'],['entregue','Entregar'],['armazenado','Armazenar']].filter(([s]) => s !== v.status);
    g.innerHTML = `<div class="item" style="border:0"><div class="num-vol ${v.status}">${v.numero}</div><div class="cresce"><div class="t">${esc(v.descricao||VOL_TIPO[v.tipo])}</div><div class="s">${esc(m?.codigo||'')} · ${esc(nomeCliente(m?.cliente_id))}</div><div class="s">${esc(v.comodo_origem||'')} → ${esc(v.comodo_destino||'')}</div></div><span class="tag">${VOL_STATUS[v.status]}</span></div>
    <div class="acoes">${acoes.map(([s,n]) => `<button class="btn ${s==='carregado'&&v.status==='etiquetado'||s==='entregue'&&v.status==='carregado'?'prim':''}" data-s="${s}">${n}</button>`).join('')}<a class="btn" href="#/mudanca/${v.mudanca_id}/inventario">Abrir mudança</a></div>`;
    $$('[data-s]', g).forEach(b => b.onclick = async () => { const s = b.dataset.s;
      await salvar('volumes', { id: v.id, status: s, ...(s==='carregado'?{carregado_em:agora()}:s==='entregue'?{entregue_em:agora()}:{}) });
      if (s === 'armazenado' && m) await vincularGuarda(m, v);
      toast(`Volume ${v.numero}: ${VOL_STATUS[s]}`, 'ok'); mostrar(pega('volumes', v.id)); });
  };
  $('#gnum').onsubmit = e => { e.preventDefault(); const t = form2obj(e.target).cod.toUpperCase().split(/\s+/);
    const m = lista('mudancas', x => x.codigo.toUpperCase() === t[0])[0]; const n = Number(t[1]);
    mostrar(m ? lista('volumes', v => v.mudanca_id === m.id && v.numero === n)[0] : null); };
  await iniciarScanner('leitor', txt => mostrar(lerConteudoQR(txt)));
}

/* ---------------- guarda-móveis ---------------- */
async function vGuarda(c){
  const cts = lista('guarda_contratos').sort((a,b) => (a.status === b.status ? (a.inicio < b.inicio ? 1 : -1) : a.status === 'ativo' ? -1 : 1));
  const ativos = cts.filter(x => x.status === 'ativo');
  const volsArm = lista('volumes', v => v.status === 'armazenado');
  c.innerHTML = `<div class="cab"><div><h1>Guarda-móveis</h1><div class="sub">Contratos, volumes armazenados e posições no depósito</div></div><button class="btn prim" id="bnct">${ic('mais2')}Novo contrato</button></div>
  <div class="grade g2 g4" style="margin-bottom:12px">
    <div class="kpi"><div class="v">${ativos.length}</div><div class="l">Contratos ativos</div></div>
    <div class="kpi"><div class="v">${volsArm.length}</div><div class="l">Volumes no depósito</div></div>
    <div class="kpi"><div class="v">${num(soma(ativos, x => x.m3_ocupado),1)}</div><div class="l">m³ ocupados</div></div>
    ${ehGestor() ? `<div class="kpi"><div class="v" style="font-size:22px">${moeda(soma(ativos, x => x.valor_mensal))}</div><div class="l">Receita mensal</div></div>` : ''}
  </div>
  <div class="card" style="padding:4px 14px"><div class="lista">${cts.map(ct => { const n = volsContrato(ct).length; const prox = proxVenc(ct);
    return `<a class="item" href="#/guarda/${ct.id}"><div class="cresce"><div class="t">${esc(nomeCliente(ct.cliente_id))}</div><div class="s">Desde ${fmtData(ct.inicio)} · ${n} volume(s)${ct.m3_ocupado?' · '+num(ct.m3_ocupado,1)+' m³':''}${ct.status==='ativo'&&prox?' · vence '+fmtData(prox):''}</div></div>
    <div style="text-align:right"><span class="tag ${ct.status==='ativo'?'verde':''}">${ct.status}</span>${ehGestor()?`<div class="small mono" style="margin-top:4px">${moeda(ct.valor_mensal)}/mês</div>`:''}</div></a>`; }).join('') || '<div class="vazio"><b>Nenhum contrato</b>Contratos são criados aqui ou automaticamente ao armazenar volumes de uma mudança.</div>'}</div></div>`;
  $('#bnct').onclick = () => modalContrato();
}
function volsContrato(ct){
  const movs = lista('guarda_movimentos', g => g.contrato_id === ct.id).sort((a,b) => a.data < b.data ? -1 : 1);
  const est = new Map(); movs.forEach(mv => mv.volume_id && est.set(mv.volume_id, mv.tipo));
  return [...est.entries()].filter(([,t]) => t === 'entrada').map(([id]) => pega('volumes', id)).filter(Boolean).sort((a,b) => a.numero - b.numero);
}
function proxVenc(ct){
  const d = new Date(hojeISO()+'T12:00:00'); const dia = Number(ct.dia_vencimento||10);
  const v = new Date(d.getFullYear(), d.getMonth(), dia, 12); if (v < d) v.setMonth(v.getMonth()+1);
  return v.toISOString().slice(0,10);
}
function modalContrato(ct){
  const clis = lista('clientes').sort((a,b) => a.nome.localeCompare(b.nome));
  const ms = lista('mudancas', m => !ct || m.cliente_id === ct.cliente_id);
  modal(ct ? 'Editar contrato' : 'Novo contrato de guarda', `<form>
    <label class="campo"><span>Cliente</span><select name="cliente_id" required>${clis.map(x => `<option value="${x.id}" ${x.id===ct?.cliente_id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>
    <label class="campo"><span>Mudança vinculada (opcional)</span><select name="mudanca_id"><option value="">—</option>${ms.map(m => `<option value="${m.id}" ${m.id===ct?.mudanca_id?'selected':''}>${esc(m.codigo)} · ${esc(nomeCliente(m.cliente_id))}</option>`).join('')}</select></label>
    <div class="grade g2"><label class="campo"><span>Início</span><input type="date" name="inicio" value="${esc(ct?.inicio||hojeISO())}" required></label><label class="campo"><span>Término previsto</span><input type="date" name="fim" value="${esc(ct?.fim||'')}"></label>
    <label class="campo"><span>Valor mensal (R$)</span><input type="number" step="0.01" name="valor_mensal" value="${esc(ct?.valor_mensal??'')}"></label><label class="campo"><span>Dia do vencimento</span><input type="number" min="1" max="28" name="dia_vencimento" value="${esc(ct?.dia_vencimento??10)}"></label>
    <label class="campo"><span>m³ ocupados</span><input type="number" step="0.1" name="m3_ocupado" value="${esc(ct?.m3_ocupado??'')}"></label>
    ${ct ? `<label class="campo"><span>Situação</span><select name="status"><option value="ativo" ${ct.status==='ativo'?'selected':''}>Ativo</option><option value="encerrado" ${ct.status==='encerrado'?'selected':''}>Encerrado</option></select></label>` : ''}</div>
    <label class="campo"><span>Observações</span><textarea name="observacoes">${esc(ct?.observacoes||'')}</textarea></label>
    <button class="btn prim bloco">Salvar</button></form>`, (c, fechar) => {
    $('form', c).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target);
      if (!d.cliente_id) return toast('Cadastre o cliente primeiro', 'erro');
      const n = await salvar('guarda_contratos', { id: ct?.id, cliente_id: d.cliente_id, mudanca_id: nulo(d.mudanca_id), inicio: d.inicio, fim: nulo(d.fim), valor_mensal: numOuNulo(d.valor_mensal) || 0, dia_vencimento: numOuNulo(d.dia_vencimento) || 10, m3_ocupado: numOuNulo(d.m3_ocupado), status: d.status || 'ativo', observacoes: nulo(d.observacoes) });
      fechar(); if (!ct) location.hash = '#/guarda/'+n.id; else render(); };
  });
}
async function vGuardaDet(c, id){
  const ct = pega('guarda_contratos', id); if (!ct) { c.innerHTML = '<div class="vazio">Contrato não encontrado.</div>'; return; }
  const vols = volsContrato(ct);
  const movs = lista('guarda_movimentos', g => g.contrato_id === id).sort((a,b) => a.data < b.data ? 1 : -1);
  const porComodo = {}; vols.forEach(v => (porComodo[v.comodo_destino||'Sem cômodo'] ||= []).push(v));
  const cli = pega('clientes', ct.cliente_id) || {};
  c.innerHTML = `<div class="cab"><div><a href="#/guarda" class="small" style="text-decoration:none">${ic('voltar','style="width:14px;vertical-align:-2px"')} Guarda-móveis</a><h1 style="margin-top:4px">${esc(cli.nome||'')}</h1>
    <div class="sub">Desde ${fmtData(ct.inicio)}${ct.fim?' até '+fmtData(ct.fim):''} · ${ehGestor()?moeda(ct.valor_mensal)+'/mês · ':''}vencimento dia ${ct.dia_vencimento||10}</div></div><span class="tag ${ct.status==='ativo'?'verde':''}">${ct.status}</span></div>
  <div class="acoes" style="margin-bottom:12px"><button class="btn prim" id="bent">${ic('mais2')}Dar entrada em volumes</button><button class="btn" id="bsai" ${vols.length?'':'disabled'}>Retirada parcial / total</button><button class="btn" id="bedc">${ic('caneta')}Editar contrato</button></div>
  <div class="card"><h3>No depósito agora (${vols.length})</h3>
    ${Object.entries(porComodo).map(([cm, vs]) => `<div class="small" style="font-weight:700;color:var(--oliva-esc);text-transform:uppercase;letter-spacing:.6px;margin-top:8px">${esc(cm)}</div>
      <div class="lista">${vs.map(v => `<div class="item"><div class="num-vol armazenado">${v.numero}</div><div class="cresce"><div class="t">${esc(v.descricao||VOL_TIPO[v.tipo])}</div><div class="s">${esc(pega('mudancas', v.mudanca_id)?.codigo||'')}</div></div>
      <input value="${esc(v.posicao_deposito||'')}" placeholder="Posição (ex.: B-03)" data-pos="${v.id}" style="width:130px;min-height:36px;padding:6px 9px"></div>`).join('')}</div>`).join('') || '<div class="vazio">Nenhum volume armazenado neste contrato.</div>'}
  </div>
  <div class="card"><h3>Movimentações</h3>${movs.length ? `<table class="tabela"><tbody>${movs.map(mv => { const v = pega('volumes', mv.volume_id); return `<tr><td>${fmtDH(mv.data)}</td><td><span class="tag ${mv.tipo==='entrada'?'azul':'oliva'}">${mv.tipo}</span></td><td>${v?`Vol. ${v.numero} — ${esc(v.descricao||VOL_TIPO[v.tipo])}`:'—'}</td></tr>`; }).join('')}</tbody></table>` : '<div class="small muted">Sem movimentações.</div>'}</div>`;
  $$('[data-pos]', c).forEach(i => i.onchange = async () => { await salvar('volumes', { id: i.dataset.pos, posicao_deposito: nulo(i.value.trim()) }); toast('Posição salva', 'ok'); });
  $('#bedc').onclick = () => modalContrato(ct);
  $('#bent').onclick = () => {
    const cands = lista('volumes', v => { const m = pega('mudancas', v.mudanca_id); return m && m.cliente_id === ct.cliente_id && v.status !== 'armazenado' && v.status !== 'extraviado'; }).sort((a,b) => a.numero - b.numero);
    if (!cands.length) return toast('Nenhum volume disponível deste cliente. Faça o inventário pela mudança.', 'erro');
    modalSelVolumes('Entrada no depósito', cands, async sel => { for (const v of sel) { await salvar('volumes', { id: v.id, status: 'armazenado' }); await salvar('guarda_movimentos', { contrato_id: ct.id, volume_id: v.id, tipo: 'entrada', data: agora() }); }
      if (ct.mudanca_id) await evento(ct.mudanca_id, 'guarda', `${sel.length} volume(s) armazenados no guarda-móveis`); render(); });
  };
  $('#bsai').onclick = () => modalSelVolumes('Retirada do depósito', vols, async sel => {
    for (const v of sel) { await salvar('volumes', { id: v.id, status: 'entregue', entregue_em: agora(), posicao_deposito: null }); await salvar('guarda_movimentos', { contrato_id: ct.id, volume_id: v.id, tipo: 'saida', data: agora() }); }
    if (ct.mudanca_id) await evento(ct.mudanca_id, 'guarda', `${sel.length} volume(s) retirados do guarda-móveis e entregues`);
    if (sel.length === vols.length && await confirmar('Todos os volumes saíram. Encerrar o contrato?', 'Encerrar')) await salvar('guarda_contratos', { id: ct.id, status: 'encerrado', fim: hojeISO() });
    render(); }, true);
}
function modalSelVolumes(titulo, vols, aoConfirmar, porComodo){
  const comodos = [...new Set(vols.map(v => v.comodo_destino||'Sem cômodo'))];
  modal(titulo, `${porComodo ? `<div class="chips" style="margin-bottom:10px">${comodos.map(cm => `<span class="chip" data-cm="${esc(cm)}">Tudo de ${esc(cm)}</span>`).join('')}</div>` : ''}
    <div class="acoes" style="margin-bottom:8px"><button type="button" class="btn peq" data-todos>Selecionar todos</button></div>
    <div class="lista" style="max-height:46vh;overflow:auto">${vols.map(v => `<label class="item" style="cursor:pointer"><input type="checkbox" value="${v.id}" data-c="${esc(v.comodo_destino||'Sem cômodo')}" style="width:22px;height:22px"><div class="num-vol ${v.status}">${v.numero}</div><div class="cresce"><div class="t">${esc(v.descricao||VOL_TIPO[v.tipo])}</div><div class="s">${esc(v.comodo_destino||'')}${v.posicao_deposito?' · posição '+esc(v.posicao_deposito):''}</div></div></label>`).join('')}</div>
    <button class="btn prim bloco" style="margin-top:12px" data-ok>Confirmar</button>`, (c, fechar) => {
    $$('[data-cm]', c).forEach(ch => ch.onclick = () => { ch.classList.toggle('on'); $$(`input[data-c="${CSS.escape(ch.dataset.cm)}"]`, c).forEach(i => i.checked = ch.classList.contains('on')); });
    $('[data-todos]', c).onclick = () => $$('input[type=checkbox]', c).forEach(i => i.checked = true);
    $('[data-ok]', c).onclick = async () => { const sel = $$('input:checked', c).map(i => pega('volumes', i.value)); if (!sel.length) return toast('Selecione ao menos um volume', 'erro'); fechar(); await aoConfirmar(sel); toast(`${sel.length} volume(s) atualizados`, 'ok'); };
  });
}

/* ---------------- relatórios ---------------- */
async function vRelatorios(c){
  if (!ehGestor()) { c.innerHTML = '<div class="vazio">Acesso restrito à gestão.</div>'; return; }
  const ms = lista('mudancas'); const conc = ms.filter(m => m.status === 'concluida');
  const meses = []; const d0 = new Date(); for (let i = 5; i >= 0; i--) { const d = new Date(d0.getFullYear(), d0.getMonth()-i, 1); meses.push(d.toISOString().slice(0,7)); }
  const porMes = meses.map(mm => ({ mm, n: ms.filter(m => (m.data_prevista||'').startsWith(mm) && m.status !== 'cancelada').length, v: soma(ms.filter(m => (m.data_prevista||'').startsWith(mm) && !['orcamento','cancelada'].includes(m.status)), m => m.valor_aprovado ?? m.valor_orcado) }));
  const maxN = Math.max(1, ...porMes.map(x => x.n)); const maxV = Math.max(1, ...porMes.map(x => x.v));
  const ocs = lista('ocorrencias'); const comOc = new Set(ocs.map(o => o.mudanca_id));
  const taxaOc = conc.length ? conc.filter(m => comOc.has(m.id)).length / conc.length * 100 : 0;
  const porTipoOc = Object.keys(OCOR_TIPO).map(k => [OCOR_TIPO[k], ocs.filter(o => o.tipo === k).length]);
  const maxOc = Math.max(1, ...porTipoOc.map(x => x[1]));
  const porStatus = [...STATUS, ['cancelada','Cancelada']].map(([k,n]) => [n, ms.filter(m => m.status === k).length]); const maxS = Math.max(1, ...porStatus.map(x => x[1]));
  const indeniz = soma(ocs, o => o.valor_indenizacao);
  const notas = ms.filter(m => m.avaliacao_nota);
  const consumo = lista('materiais').map(mt => [mt.nome, soma(lista('consumo_materiais', x => x.material_id === mt.id), x => x.quantidade), mt]);
  const nMes = d => new Date(d+'-15').toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
  const orcs = ms.filter(m => m.status !== 'cancelada'); const aprov = orcs.filter(m => m.status !== 'orcamento');
  c.innerHTML = `<div class="cab"><div><h1>Relatórios</h1><div class="sub">Visão da operação</div></div><button class="btn" id="bexp">${ic('doc')}Exportar CSV de mudanças</button></div>
  <div class="grade g2 g4" style="margin-bottom:12px">
    <div class="kpi"><div class="v">${conc.length}</div><div class="l">Mudanças concluídas</div></div>
    <div class="kpi ${taxaOc>10?'alerta':''}"><div class="v">${num(taxaOc,0)}%</div><div class="l">Concluídas com ocorrência</div></div>
    <div class="kpi"><div class="v" style="font-size:22px">${moeda(indeniz)}</div><div class="l">Indenizações pagas/previstas</div></div>
    <div class="kpi"><div class="v">${notas.length ? num(soma(notas, m => m.avaliacao_nota)/notas.length,1)+' ★' : '—'}</div><div class="l">Satisfação (${notas.length})</div></div>
    <div class="kpi"><div class="v">${orcs.length ? num(aprov.length/orcs.length*100,0)+'%' : '—'}</div><div class="l">Conversão de orçamentos</div></div>
    <div class="kpi"><div class="v">${num(soma(conc, m => m.cubagem_m3),0)}</div><div class="l">m³ transportados</div></div>
    <div class="kpi"><div class="v">${lista('volumes').length}</div><div class="l">Volumes rastreados</div></div>
    <div class="kpi"><div class="v">${lista('fotos').length}</div><div class="l">Fotos de evidência</div></div>
  </div>
  <div class="grade md-g2">
    <div class="card"><h3>Mudanças por mês</h3><div class="colunas">${porMes.map(x => `<div class="c"><b>${x.n}</b><i style="height:${x.n/maxN*100}%"></i><span>${nMes(x.mm)}</span></div>`).join('')}</div></div>
    <div class="card" style="margin-top:0"><h3>Faturamento por mês</h3><div class="colunas">${porMes.map(x => `<div class="c"><b class="tiny">${x.v>=1000?num(x.v/1000,0)+'k':num(x.v,0)}</b><i style="height:${x.v/maxV*100}%;background:var(--oliva)"></i><span>${nMes(x.mm)}</span></div>`).join('')}</div></div>
    <div class="card"><h3>Mudanças por etapa</h3><div class="barras-h">${porStatus.map(([n,v]) => `<div class="b"><span>${n}</span><div class="barra"><i style="width:${v/maxS*100}%"></i></div><span>${v}</span></div>`).join('')}</div></div>
    <div class="card"><h3>Ocorrências por tipo</h3><div class="barras-h">${porTipoOc.map(([n,v]) => `<div class="b"><span>${n}</span><div class="barra"><i style="width:${v/maxOc*100}%;background:var(--vermelho)"></i></div><span>${v}</span></div>`).join('')}</div></div>
    <div class="card"><h3>Materiais consumidos</h3>${consumo.length ? `<table class="tabela"><thead><tr><th>Material</th><th style="text-align:right">Usado</th><th style="text-align:right">Estoque</th></tr></thead><tbody>${consumo.map(([n,q,mt]) => `<tr><td>${esc(n)}</td><td class="mono" style="text-align:right">${num(q,0)}</td><td class="mono" style="text-align:right;${mt.estoque<20?'color:var(--vermelho);font-weight:700':''}">${num(mt.estoque,0)} ${esc(mt.unidade)}</td></tr>`).join('')}</tbody></table>` : '<div class="small muted">Sem materiais.</div>'}</div>
    <div class="card"><h3>Últimas avaliações</h3><div class="lista">${notas.sort((a,b) => a.updated_at < b.updated_at ? 1 : -1).slice(0,6).map(m => `<div class="item"><div class="cresce"><div class="t">${'★'.repeat(m.avaliacao_nota)}<span class="muted">${'★'.repeat(5-m.avaliacao_nota)}</span> ${esc(nomeCliente(m.cliente_id))}</div><div class="s">${esc(m.avaliacao_comentario||'')}</div></div></div>`).join('') || '<div class="small muted">Nenhuma avaliação ainda.</div>'}</div></div>
  </div>`;
  $('#bexp').onclick = () => {
    const cab = ['codigo','cliente','tipo','status','data_prevista','origem','destino','km','m3','volumes','valor','ocorrencias','nota'];
    const linhas = ms.map(m => [m.codigo, nomeCliente(m.cliente_id), m.tipo, m.status, m.data_prevista||'', m.origem_endereco||'', m.destino_endereco||'', m.distancia_km||'', m.cubagem_m3||'', resumoVolumes(m.id).total, m.valor_aprovado ?? m.valor_orcado ?? '', ocs.filter(o => o.mudanca_id === m.id).length, m.avaliacao_nota||'']);
    const csv = [cab, ...linhas].map(l => l.map(x => `"${String(x).replace(/"/g,'""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+csv], {type:'text/csv'})); a.download = `mudancas-${hojeISO()}.csv`; a.click();
  };
}

/* ---------------- cadastros ---------------- */
async function vCadastros(c, aba='clientes'){
  const abas = [['clientes','Clientes'],['caminhoes','Caminhões'],['materiais','Materiais'],['equipe','Equipe e parceiros']];
  c.innerHTML = `<div class="cab"><div><h1>Cadastros</h1></div><button class="btn prim" id="bnovo">${ic('mais2')}Novo</button></div>
  <nav class="abas">${abas.map(([k,n]) => `<a href="#/cadastros/${k}" class="${aba===k?'ativo':''}">${n}</a>`).join('')}</nav><div class="card" style="padding:4px 14px"><div class="lista" id="lcad"></div></div>`;
  const L = $('#lcad');
  if (aba === 'clientes') {
    const xs = lista('clientes').sort((a,b) => a.nome.localeCompare(b.nome));
    L.innerHTML = xs.map(x => `<div class="item" data-id="${x.id}" style="cursor:pointer"><div class="cresce"><div class="t">${esc(x.nome)}</div><div class="s">${esc([x.telefone, x.email, x.documento].filter(Boolean).join(' · '))}</div></div><span class="small muted">${lista('mudancas', m => m.cliente_id === x.id).length} mudança(s)</span></div>`).join('') || '<div class="vazio">Nenhum cliente.</div>';
    const f = x => modal(x ? 'Editar cliente' : 'Novo cliente', `<form><label class="campo"><span>Nome</span><input name="nome" required value="${esc(x?.nome||'')}"></label><div class="grade g2"><label class="campo"><span>CPF/CNPJ</span><input name="documento" value="${esc(x?.documento||'')}"></label><label class="campo"><span>Telefone</span><input name="telefone" type="tel" value="${esc(x?.telefone||'')}"></label></div><label class="campo"><span>E-mail</span><input type="email" name="email" value="${esc(x?.email||'')}"></label><label class="campo"><span>Observações</span><textarea name="observacoes">${esc(x?.observacoes||'')}</textarea></label><button class="btn prim bloco">Salvar</button></form>`, (cc, fechar) => {
      $('form', cc).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target); await salvar('clientes', { id: x?.id, nome: d.nome, documento: nulo(d.documento), telefone: nulo(d.telefone), email: nulo(d.email), observacoes: nulo(d.observacoes) }); fechar(); render(); }; });
    $('#bnovo').onclick = () => f(); $$('[data-id]', L).forEach(i => i.onclick = () => f(pega('clientes', i.dataset.id)));
  }
  if (aba === 'caminhoes') {
    const xs = lista('caminhoes');
    L.innerHTML = xs.map(x => `<div class="item" data-id="${x.id}" style="cursor:pointer">${ic('caminhao','style="width:26px;color:var(--oliva-esc)"')}<div class="cresce"><div class="t">${esc(x.placa)} · ${esc(x.modelo||'')}</div><div class="s">${num(x.capacidade_m3||0,0)} m³</div></div><span class="tag ${x.ativo!==false?'verde':''}">${x.ativo!==false?'ativo':'inativo'}</span></div>`).join('') || '<div class="vazio">Nenhum caminhão.</div>';
    const f = x => modal(x ? 'Editar caminhão' : 'Novo caminhão', `<form><div class="grade g2"><label class="campo"><span>Placa</span><input name="placa" required value="${esc(x?.placa||'')}"></label><label class="campo"><span>Capacidade (m³)</span><input type="number" step="0.1" name="capacidade_m3" value="${esc(x?.capacidade_m3??'')}"></label></div><label class="campo"><span>Modelo</span><input name="modelo" value="${esc(x?.modelo||'')}"></label><label class="small" style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input type="checkbox" name="ativo" ${x?.ativo!==false?'checked':''}> Ativo</label><button class="btn prim bloco">Salvar</button></form>`, (cc, fechar) => {
      $('form', cc).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target); await salvar('caminhoes', { id: x?.id, placa: d.placa.toUpperCase(), modelo: nulo(d.modelo), capacidade_m3: numOuNulo(d.capacidade_m3), ativo: !!d.ativo }); fechar(); render(); }; });
    $('#bnovo').onclick = () => f(); $$('[data-id]', L).forEach(i => i.onclick = () => f(pega('caminhoes', i.dataset.id)));
  }
  if (aba === 'materiais') {
    const xs = lista('materiais').sort((a,b) => a.nome.localeCompare(b.nome));
    L.innerHTML = xs.map(x => `<div class="item" data-id="${x.id}" style="cursor:pointer"><div class="cresce"><div class="t">${esc(x.nome)}</div><div class="s">${ehGestor()?moeda(x.custo_unit)+' / '+esc(x.unidade):esc(x.unidade)}</div></div><b class="mono" style="${x.estoque<20?'color:var(--vermelho)':''}">${num(x.estoque,0)}</b></div>`).join('') || '<div class="vazio">Nenhum material.</div>';
    const f = x => modal(x ? 'Editar material' : 'Novo material', `<form><label class="campo"><span>Nome</span><input name="nome" required value="${esc(x?.nome||'')}"></label><div class="grade g2"><label class="campo"><span>Unidade</span><input name="unidade" value="${esc(x?.unidade||'un')}"></label><label class="campo"><span>Estoque</span><input type="number" step="1" name="estoque" value="${esc(x?.estoque??0)}"></label></div><label class="campo"><span>Custo unitário (R$)</span><input type="number" step="0.01" name="custo_unit" value="${esc(x?.custo_unit??0)}"></label><button class="btn prim bloco">Salvar</button></form>`, (cc, fechar) => {
      $('form', cc).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target); await salvar('materiais', { id: x?.id, nome: d.nome, unidade: d.unidade || 'un', estoque: numOuNulo(d.estoque) || 0, custo_unit: numOuNulo(d.custo_unit) || 0 }); fechar(); render(); }; });
    $('#bnovo').onclick = () => f(); $$('[data-id]', L).forEach(i => i.onclick = () => f(pega('materiais', i.dataset.id)));
  }
  if (aba === 'equipe') {
    const xs = lista('perfis').sort((a,b) => (a.ativo === b.ativo ? a.nome.localeCompare(b.nome) : a.ativo ? 1 : -1));
    L.innerHTML = `<div class="alerta-box azul small" style="margin-top:10px">${MODO_DEMO ? 'No modo demonstração as pessoas são fictícias.' : 'Cada pessoa cria a própria conta em “Primeiro acesso” na tela de login. Depois, o administrador libera e define o papel aqui.'}</div>`
      + xs.map(x => `<div class="item" data-id="${x.id}" style="cursor:${ehAdmin()?'pointer':'default'}"><div class="cresce"><div class="t">${esc(x.nome)}${x.empresa_parceira?' · '+esc(x.empresa_parceira):''}</div><div class="s">${PAPEL_NOME[x.papel]}${x.telefone?' · '+esc(x.telefone):''}</div></div><span class="tag ${x.ativo?'verde':'amb'}">${x.ativo?'ativo':'aguardando'}</span></div>`).join('');
    $('#bnovo').onclick = () => MODO_DEMO
      ? modalPessoa(null)
      : modal('Adicionar pessoa', `<p>Peça para a pessoa abrir o sistema e tocar em <b>Primeiro acesso / criar conta</b>. Ela vai aparecer aqui como “aguardando” para você liberar.</p><div class="acoes"><button class="btn prim" data-c>${ic('link')}Copiar link do sistema</button></div>`, c2 => { $('[data-c]', c2).onclick = () => { navigator.clipboard?.writeText(location.origin + location.pathname); toast('Link copiado', 'ok'); }; });
    if (ehAdmin()) $$('[data-id]', L).forEach(i => i.onclick = () => modalPessoa(pega('perfis', i.dataset.id)));
  }
}
function modalPessoa(x){
  modal(x ? 'Editar pessoa' : 'Nova pessoa', `<form><label class="campo"><span>Nome</span><input name="nome" required value="${esc(x?.nome||'')}"></label>
    <div class="grade g2"><label class="campo"><span>Papel</span><select name="papel">${Object.entries(PAPEL_NOME).map(([k,n]) => `<option value="${k}" ${x?.papel===k?'selected':''}>${n}</option>`).join('')}</select></label><label class="campo"><span>Telefone</span><input name="telefone" value="${esc(x?.telefone||'')}"></label></div>
    <label class="campo"><span>Empresa parceira (para frete terceirizado)</span><input name="empresa_parceira" value="${esc(x?.empresa_parceira||'')}"></label>
    <label class="small" style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input type="checkbox" name="ativo" ${x?.ativo!==false?'checked':''}> Acesso liberado</label>
    <p class="tiny muted">Administrador: tudo. Coordenador: tudo menos usuários. Equipe de campo: operação sem valores. Parceiro: só as mudanças atribuídas a ele.</p>
    <button class="btn prim bloco">Salvar</button></form>`, (c, fechar) => {
    $('form', c).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target);
      if (x?.id === PERFIL.id && d.papel !== 'admin' && !(await confirmar('Você vai perder o acesso de administrador. Continuar?'))) return;
      await salvar('perfis', { id: x?.id, nome: d.nome, papel: d.papel, telefone: nulo(d.telefone), empresa_parceira: nulo(d.empresa_parceira), ativo: !!d.ativo }); fechar(); render(); };
  });
}

/* ---------------- configurações ---------------- */
async function vConfig(c){
  if (!ehGestor()) { c.innerHTML = '<div class="vazio">Acesso restrito à gestão.</div>'; return; }
  const cfg = config(); const con = conexao();
  const campo = (k, n, t='text', extra='') => `<label class="campo"><span>${n}</span><input type="${t}" name="${k}" value="${esc(cfg[k]??'')}" ${extra}></label>`;
  c.innerHTML = `<div class="cab"><div><h1>Configurações</h1></div></div>
  <form id="fcfg">
  <div class="card"><h3>Empresa</h3><div class="grade md-g2">${campo('empresa_nome','Nome')}${campo('empresa_cnpj','CNPJ')}${campo('empresa_fone','Telefone')}${campo('empresa_email','E-mail','email')}${campo('empresa_site','Site')}${campo('empresa_endereco','Endereço')}</div>
    ${campo('google_review_url','Link para avaliação no Google (aparece no portal após a avaliação)','url','placeholder="https://g.page/r/..."')}</div>
  <div class="card"><h3>Tabela de preços do orçamento</h3><div class="grade g2 g3">${campo('valor_m3','R$ por m³','number','step="0.01"')}${campo('valor_km','R$ por km','number','step="0.01"')}${campo('valor_ajudante','R$ por ajudante','number','step="0.01"')}${campo('taxa_embalagem_m3','Embalagem R$/m³','number','step="0.01"')}${campo('taxa_item_especial','R$ por item especial','number','step="0.01"')}${campo('validade_orcamento_dias','Validade (dias)','number')}</div></div>
  <div class="card"><h3>Contrato de prestação de serviços</h3>
    <div class="grade md-g2"><label class="campo"><span>Condições de pagamento padrão</span><input name="contrato_pagamento_padrao" value="${esc(cfg.contrato_pagamento_padrao)}"></label>
    <label class="campo"><span>Multa por cancelamento com menos de 48 h (%)</span><input type="number" step="1" name="contrato_multa_cancelamento" value="${esc(cfg.contrato_multa_cancelamento)}"></label></div>
    <label class="campo"><span>Cláusulas (uma por linha; use {multa} para a multa)</span><textarea name="contrato_clausulas" style="min-height:260px;font-size:13px">${esc(cfg.contrato_clausulas)}</textarea></label>
    <div class="acoes" style="justify-content:space-between;align-items:center"><span class="tiny muted">Modelo de referência. Recomendamos revisão por advogado antes do uso.</span><button type="button" class="btn peq" id="brestc">Restaurar cláusulas padrão</button></div></div>
  <div class="card"><h3>Termos das assinaturas</h3><label class="campo"><span>Termo do inventário</span><textarea name="termo_inventario">${esc(cfg.termo_inventario)}</textarea></label><label class="campo"><span>Termo da entrega</span><textarea name="termo_entrega">${esc(cfg.termo_entrega)}</textarea></label></div>
  <div class="acoes" style="justify-content:flex-end;margin:12px 0"><button class="btn prim">${ic('check')}Salvar configurações</button></div></form>
  <div class="card"><h3>Servidor e sincronização</h3>
    <div class="dupla"><span>Modo</span><span>${MODO_DEMO ? 'Demonstração (local)' : 'Conectado ao Supabase'}</span></div>
    ${con ? `<div class="dupla"><span>Projeto</span><span class="small">${esc(con.url)}</span></div>` : ''}
    <div class="dupla"><span>Alterações pendentes</span><span>${OUT.size}</span></div>
    <div class="dupla"><span>Última sincronização</span><span>${SYNC.ultimo ? fmtDH(SYNC.ultimo) : '—'}</span></div>
    ${SYNC.erro ? `<div class="alerta-box verm small" style="margin-top:8px">${esc(SYNC.erro)}</div>` : ''}
    <div class="acoes" style="margin-top:12px">${!MODO_DEMO ? `<button class="btn" id="bsync">${ic('nuvem')}Sincronizar agora</button>` : ''}<button class="btn" id="bcon">${ic('link')}Conexão</button><button class="btn" id="bbak">${ic('doc')}Baixar backup (JSON)</button>
    ${MODO_DEMO ? `<button class="btn perigo" id="breset">Apagar dados de demonstração</button>` : ''}</div></div>`;
  $('#fcfg').onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target);
    ['valor_m3','valor_km','valor_ajudante','taxa_embalagem_m3','taxa_item_especial','validade_orcamento_dias','contrato_multa_cancelamento'].forEach(k => d[k] = numOuNulo(d[k]) ?? 0);
    await salvarConfig(d); toast('Configurações salvas', 'ok'); };
  $('#brestc').onclick = () => { $('[name=contrato_clausulas]').value = CLAUSULAS_PADRAO; toast('Cláusulas padrão restauradas — salve para aplicar'); };
  $('#bsync') && ($('#bsync').onclick = () => sincronizar(true));
  $('#bcon').onclick = modalConexao;
  $('#bbak').onclick = () => { const o = {}; TABELAS.forEach(t => o[t] = [...S[t].values()]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], {type:'application/json'})); a.download = `mymoving-backup-${hojeISO()}.json`; a.click(); };
  $('#breset') && ($('#breset').onclick = async () => { if (!(await confirmar('Apagar todos os dados de demonstração deste aparelho?', 'Apagar'))) return;
    for (const t of [...TABELAS, 'outbox', 'blobs', 'meta']) await IDB.limpa(t); localStorage.removeItem('mm_demo'); location.reload(); });
}
async function vMais(c){
  c.innerHTML = `<div class="cab"><div><h1>Mais</h1><div class="sub">${esc(PERFIL.nome)} · ${PAPEL_NOME[papel()]}</div></div></div>
  <div class="card" style="padding:4px 14px"><div class="lista">
    ${ehGestor() ? `<a class="item" href="#/relatorios">${ic('grafico','style="width:22px"')}<div class="cresce"><div class="t">Relatórios</div></div></a>` : ''}
    <a class="item" href="#/cadastros">${ic('pessoas','style="width:22px"')}<div class="cresce"><div class="t">Cadastros</div><div class="s">Clientes, caminhões, materiais e equipe</div></div></a>
    ${ehGestor() ? `<a class="item" href="#/config">${ic('engrenagem','style="width:22px"')}<div class="cresce"><div class="t">Configurações</div><div class="s">Empresa, preços, termos, servidor</div></div></a>` : ''}
    <a class="item" href="#/sair">${ic('sair','style="width:22px"')}<div class="cresce"><div class="t">Sair</div></div></a>
  </div></div>`;
}

/* ---------------- portal do cliente ---------------- */
function montarPortalLocal(token){
  const m = lista('mudancas', x => x.token_portal === token)[0]; if (!m) return null;
  const cfg = config();
  return { empresa: cfg, mudanca: m, cliente: { nome: nomeCliente(m.cliente_id) },
    volumes: resumoVolumes(m.id).lista, vistorias: lista('vistorias_imovel', v => v.mudanca_id === m.id),
    ocorrencias: lista('ocorrencias', o => o.mudanca_id === m.id),
    fotos: lista('fotos', f => f.mudanca_id === m.id).map(f => ({ ...f, _url: urlFoto(f) })),
    assinaturas: lista('assinaturas', a => a.mudanca_id === m.id),
    eventos: lista('eventos', e => e.mudanca_id === m.id && e.publico).sort((a,b) => a.created_at < b.created_at ? -1 : 1) };
}
async function telaPortal(token){
  const raiz = $('#raiz');
  raiz.innerHTML = `<div class="tela-cheia"><div class="caixa" style="text-align:center">${LOGO.replace('<svg','<svg style="width:60px"')}<p>Carregando sua mudança…</p></div></div>`;
  let d = null;
  try {
    if (SB) { const { data, error } = await SB.rpc('portal_mudanca', { p_token: token }); if (error) throw error; d = data; }
    else d = montarPortalLocal(token);
  } catch (e) { console.error(e); }
  if (!d) { raiz.innerHTML = `<div class="tela-cheia"><div class="caixa"><div class="logo-grande">${LOGO}<div><b>My moving</b><span>Transportes</span></div></div><p>Link inválido ou expirado. Fale com a ${esc(CONFIG_PADRAO.empresa_nome)}: ${esc(CONFIG_PADRAO.empresa_fone)}.</p></div><footer class="rodape-dev">${rodapeDevHTML(false)}</footer></div>`; return; }
  const cfg = Object.assign({}, CONFIG_PADRAO, d.empresa || {});
  const m = d.mudanca; const vols = d.volumes || [];
  const furl = f => f._url || (conexao() ? `${conexao().url.replace(/\/$/,'')}/storage/v1/object/public/fotos/${f.caminho}` : '');
  const fts = (tipo, id) => (d.fotos||[]).filter(f => f.ref_tipo === tipo && f.ref_id === id);
  const idx = STATUS.findIndex(s => s[0] === m.status);
  const c = s => vols.filter(v => v.status === s).length;
  const mov = c('carregado') + c('entregue') + c('armazenado');
  const ent = c('entregue') + c('armazenado');
  const fone = (cfg.empresa_fone||'').replace(/\D/g,'');
  document.title = `Mudança ${m.codigo} — My Moving`;
  raiz.innerHTML = `
  <div class="portal-topo"><div class="in">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">${LOGO.replace('<svg','<svg style="width:40px;height:40px"')}<div><b style="font-family:var(--fonte-t);font-size:21px;color:#D9CD5A;display:block;line-height:1">My moving</b><span style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#BFD8CB">Transportes</span></div></div>
    <div style="color:#BFD8CB;font-size:13px">Olá, ${esc((d.cliente?.nome||'').split(' ')[0])}! Esta é a sua mudança</div>
    <h1 style="color:#fff;font-size:30px">${esc(m.codigo)}</h1>
    <div style="color:#D6E6DD">${fmtData(m.data_prevista)} · ${esc(TIPO_NOME[m.tipo]||'')}</div>
  </div></div>
  <div class="portal-corpo">
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">Situação</h3><span class="tag ${STATUS_COR[m.status]}" style="font-size:13px">${STATUS_NOME[m.status]}</span></div>
      ${m.status !== 'cancelada' ? `<div class="trilho">${STATUS.map((s,i) => `<div class="p ${i<idx?'feito':i===idx?'atual':''}">${s[1]}</div>`).join('')}</div>` : ''}
      ${vols.length ? `<div style="margin-top:14px"><div class="small" style="display:flex;justify-content:space-between"><span>Volumes movimentados</span><b>${mov} de ${vols.length}</b></div><div class="barra azul" style="margin:5px 0 10px"><i style="width:${vols.length?mov/vols.length*100:0}%"></i></div>
      <div class="small" style="display:flex;justify-content:space-between"><span>Volumes entregues</span><b>${ent} de ${vols.length}</b></div><div class="barra" style="margin-top:5px"><i style="width:${vols.length?ent/vols.length*100:0}%"></i></div></div>` : ''}
      <div class="grade g2" style="margin-top:14px"><div><div class="tiny muted">ORIGEM</div><div class="small">${esc(m.origem_endereco||'—')}</div></div><div><div class="tiny muted">DESTINO</div><div class="small">${esc(m.destino_endereco||'—')}</div></div></div>
    </div>
    ${m.status === 'concluida' ? `<div class="card" id="aval"><h3>Como foi a sua mudança?</h3>
      ${m.avaliacao_nota ? `<p style="margin:0">Obrigado pela avaliação! <span style="color:#E2B007;font-size:20px">${'★'.repeat(m.avaliacao_nota)}</span></p>${cfg.google_review_url ? `<p class="small">Se puder, deixe sua opinião também no Google — ajuda muito outras famílias a nos encontrar.</p><a class="btn prim" target="_blank" rel="noopener" href="${esc(cfg.google_review_url)}">Avaliar no Google</a>` : ''}`
      : `<div class="estrelas" id="est">${[1,2,3,4,5].map(n => `<button data-n="${n}" aria-label="${n} estrelas">★</button>`).join('')}</div><textarea id="acom" placeholder="Conte como foi (opcional)" style="margin-top:10px"></textarea><button class="btn prim" id="benv" style="margin-top:10px" disabled>Enviar avaliação</button>`}</div>` : ''}
    <div class="card"><h3>Inventário (${vols.length} volumes)</h3>
      <p class="small muted" style="margin-top:0">Cada volume foi etiquetado com QR code e fotografado antes da retirada. Avarias que já existiam ficam registradas aqui.</p>
      <div class="lista">${vols.map(v => { const f = fts('volume', v.id); return `<div class="item"><div class="num-vol ${v.status}">${v.numero}</div><div class="cresce"><div class="t">${esc(v.descricao||VOL_TIPO[v.tipo])}</div><div class="s">${esc(v.comodo_origem||'')} → ${esc(v.comodo_destino||'')} · ${VOL_STATUS[v.status]}</div>
        ${(v.avarias_previas||[]).length ? `<div class="s" style="color:var(--ambar)">Já tinha: ${v.avarias_previas.map(a => esc(a.tipo)).join(', ')}</div>` : ''}
        ${f.length ? `<div class="fotos" style="margin-top:6px">${f.map(x => `<a class="f" style="width:54px;height:54px;background-image:url('${furl(x)}')" href="${furl(x)}" target="_blank" rel="noopener"></a>`).join('')}</div>` : ''}</div></div>`; }).join('') || '<div class="vazio">O inventário ainda não foi feito.</div>'}</div></div>
    ${(d.vistorias||[]).length ? `<div class="card"><h3>Vistoria do imóvel</h3><div class="lista">${d.vistorias.map(v => { const f = fts('vistoria', v.id); return `<div class="item"><div class="cresce"><div class="t">${esc(v.area)}</div><div class="s">${v.local} · ${v.momento} · ${v.condicao==='ok'?'sem danos':v.condicao==='dano_previo'?'dano já existente':'dano registrado'}${v.observacao?' — '+esc(v.observacao):''}</div>${f.length ? `<div class="fotos" style="margin-top:6px">${f.map(x => `<a class="f" style="width:54px;height:54px;background-image:url('${furl(x)}')" href="${furl(x)}" target="_blank" rel="noopener"></a>`).join('')}</div>` : ''}</div></div>`; }).join('')}</div></div>` : ''}
    ${(d.ocorrencias||[]).length ? `<div class="card"><h3>Ocorrências</h3>${d.ocorrencias.map(o => `<div class="dupla"><span>${OCOR_TIPO[o.tipo]} — ${esc(o.descricao)}</span><span>${OCOR_STATUS[o.status]}</span></div>${o.resolucao?`<div class="small muted" style="margin-bottom:6px">${esc(o.resolucao)}</div>`:''}`).join('')}</div>` : ''}
    ${(d.assinaturas||[]).length ? `<div class="card"><h3>Assinaturas</h3><div style="display:flex;flex-wrap:wrap;gap:14px">${d.assinaturas.map(a => `<div style="text-align:center"><img src="${a.imagem}" style="height:54px;border-bottom:1px solid var(--linha)"><div class="small"><b>${esc(a.nome)}</b></div><div class="tiny muted">${esc(ETAPA_ASS[a.etapa])} · ${fmtDH(a.assinado_em)}</div></div>`).join('')}</div></div>` : ''}
    <div class="card"><h3>Histórico</h3>${(d.eventos||[]).length ? `<ul class="linha-tempo">${[...d.eventos].reverse().map(e => `<li><div>${esc(e.descricao)}</div><div class="q">${fmtDH(e.created_at)}</div></li>`).join('')}</ul>` : '<div class="small muted">—</div>'}</div>
    <div class="card" style="text-align:center"><div class="small muted">Dúvidas sobre sua mudança?</div><div style="font-weight:700;font-size:17px;margin:4px 0 10px">${esc(cfg.empresa_nome)}</div>
      <div class="acoes" style="justify-content:center">${fone ? `<a class="btn prim" target="_blank" rel="noopener" href="https://wa.me/55${fone}?text=${encodeURIComponent('Olá! Sobre a minha mudança '+m.codigo+':')}">${ic('whats')}WhatsApp</a>` : ''}${cfg.empresa_email ? `<a class="btn" href="mailto:${esc(cfg.empresa_email)}">E-mail</a>` : ''}</div></div>
    <footer class="rodape-dev" style="border:0">${rodapeDevHTML(false)}</footer>
  </div>`;
  let nota = 0;
  $$('#est button').forEach(b => b.onclick = () => { nota = Number(b.dataset.n); $$('#est button').forEach(x => x.classList.toggle('on', Number(x.dataset.n) <= nota)); $('#benv').disabled = false; });
  $('#benv') && ($('#benv').onclick = async () => {
    const com = $('#acom').value.trim();
    if (SB) { const { data, error } = await SB.rpc('portal_avaliar', { p_token: token, p_nota: nota, p_comentario: com }); if (error || !data) return toast('Não foi possível enviar agora. Tente de novo.', 'erro'); }
    else { await salvar('mudancas', { id: m.id, avaliacao_nota: nota, avaliacao_comentario: com || null }); await salvar('eventos', { mudanca_id: m.id, tipo: 'avaliacao', descricao: `Cliente avaliou o serviço com nota ${nota}`, publico: true, autor: 'Cliente', created_at: agora() }); }
    toast('Obrigado pela avaliação!', 'ok'); telaPortal(token);
  });
}

/* ---------------- dados de demonstração ---------------- */
async function semearDemo(){
  if (lista('mudancas').length) return;
  const dt = n => { const d = new Date(); d.setDate(d.getDate()+n); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  const dh = (n, h=10) => { const d = new Date(); d.setDate(d.getDate()+n); d.setHours(h, Math.floor(Math.random()*50)); return d.toISOString(); };
  const add = (t, o) => salvar(t, o);
  await salvarConfig({ ...CONFIG_PADRAO, empresa_cnpj: '00.000.000/0001-00 (exemplo)' });
  const p = { adm: 'demo', c1: uuid(), e1: uuid(), e2: uuid(), pa: uuid() };
  await add('perfis', { id: p.adm, nome: 'Gestor My Moving', papel: 'admin', ativo: true });
  await add('perfis', { id: p.c1, nome: 'Carla Coordenadora', papel: 'coordenador', ativo: true });
  await add('perfis', { id: p.e1, nome: 'Marcos (líder de equipe)', papel: 'equipe', ativo: true });
  await add('perfis', { id: p.e2, nome: 'Rafael', papel: 'equipe', ativo: true });
  await add('perfis', { id: p.pa, nome: 'João Transportes', papel: 'parceiro', empresa_parceira: 'Transportadora Parceira (exemplo)', ativo: true });
  const k1 = await add('caminhoes', { placa: 'ABC1D23', modelo: 'VW Delivery baú', capacidade_m3: 22, ativo: true });
  const k2 = await add('caminhoes', { placa: 'EFG4H56', modelo: 'Mercedes Atego baú', capacidade_m3: 45, ativo: true });
  const mt = [];
  for (const [n,u,e,cu] of [['Caixa de papelão M','un',180,6.5],['Caixa de papelão G','un',120,8.9],['Plástico bolha','m',400,1.2],['Filme stretch','rolo',36,32],['Manta de proteção','un',60,0],['Fita adesiva','rolo',90,4.5]]) mt.push(await add('materiais', { nome: n, unidade: u, estoque: e, custo_unit: cu }));
  const cl = [];
  for (const [n,d,f,e] of [['Ana Paula Ribeiro','123.456.789-00','(11) 98888-1111','ana@exemplo.com'],['Escritório Contábil Alfa','12.345.678/0001-90','(11) 4444-2222','contato@alfa.exemplo'],['Ricardo Menezes','987.654.321-00','(11) 97777-3333','ricardo@exemplo.com'],['Juliana e Pedro Costa','111.222.333-44','(11) 96666-4444','ju@exemplo.com']]) cl.push(await add('clientes', { nome: n, documento: d, telefone: f, email: e }));
  const novaM = (o) => add('mudancas', Object.assign({ codigo: gerarCodigo(), token_portal: uuid(), equipe: [], created_at: dh(-10) }, o));
  const itensOrc = async (mid, lst) => { for (const [cm, it, q] of lst) { let f = null; for (const g of Object.values(CATALOGO)) { f = g.find(x => x[0] === it) || f; } await add('orcamento_itens', { mudanca_id: mid, comodo: cm, item: it, quantidade: q, m3_unit: f ? f[1] : 0.1, especial: !!(f && f[2]) }); } };
  const ev = (mid, d, desc, h) => add('eventos', { mudanca_id: mid, tipo: 'status', descricao: desc, publico: true, autor: 'Carla Coordenadora', created_at: dh(d, h) });
  const assin = (mid, etapa, nome, d) => add('assinaturas', { mudanca_id: mid, etapa, nome, imagem: assinaturaFake(nome), assinado_em: dh(d, 16) });

  // 1) Concluída
  const m1 = await novaM({ cliente_id: cl[0].id, tipo: 'residencial', status: 'concluida', origem_endereco: 'Rua das Palmeiras, 120, ap. 52 — Alphaville, Barueri', origem_detalhes: '5º andar, elevador de serviço, mudança permitida 8h–17h', destino_endereco: 'Av. Tenente Marques, 900, casa 14 — Santana de Parnaíba', destino_detalhes: 'Casa térrea, rua estreita', distancia_km: 14, data_prevista: dt(-6), caminhao_id: k1.id, equipe: [{id:p.e1,nome:'Marcos (líder de equipe)'},{id:p.e2,nome:'Rafael'},{id:null,nome:'Diego'}], cubagem_m3: 18.4, valor_orcado: 4890, valor_aprovado: 4890, condicoes_pagamento: '50% na assinatura e 50% no dia da mudança, via PIX', seguro_valor_declarado: 60000, avaliacao_nota: 5, avaliacao_comentario: 'Equipe super cuidadosa, recebi o laudo com todas as fotos. Recomendo!' });
  await itensOrc(m1.id, [['Sala','Sofá 3 lugares',1],['Sala','Rack/painel TV',1],['Sala','TV acima de 50"',1],['Sala','Mesa de jantar 6+ lug.',1],['Sala','Cadeira',6],['Quarto 1','Cama casal',1],['Quarto 1','Guarda-roupa 4-6 portas',1],['Quarto 1','Colchão casal',1],['Quarto 2','Cama solteiro',1],['Cozinha','Geladeira',1],['Cozinha','Fogão',1],['Cozinha','Máquina de lavar',1],['Caixas','Caixa M',40],['Caixas','Caixa G',15],['Especiais','Espelho grande',1]]);
  const vols1 = [['movel','Sofá 3 lugares cinza','Sala','Sala',[{tipo:'Desgaste',local:'Lateral'}]],['eletro','TV 55" Samsung','Sala','Sala',[]],['movel','Rack com painel','Sala','Sala',[{tipo:'Risco',local:'Tampo'}]],['fragil','Louças e taças','Cozinha','Cozinha',[]],['caixa','Panelas e utensílios','Cozinha','Cozinha',[]],['eletro','Geladeira Brastemp','Cozinha','Cozinha',[{tipo:'Amassado',local:'Lateral'}]],['movel','Guarda-roupa 6 portas (desmontado)','Quarto 1','Suíte',[]],['caixa','Roupas de cama','Quarto 1','Suíte',[]],['caixa','Livros','Quarto 2','Escritório',[]],['especial','Espelho bisotado 1,2 m','Sala','Sala',[]]];
  for (let i = 0; i < vols1.length; i++) { const [t,d,o,de,av] = vols1[i]; await add('volumes', { mudanca_id: m1.id, numero: i+1, tipo: t, descricao: d, comodo_origem: o, comodo_destino: de, avarias_previas: av, status: 'entregue', carregado_em: dh(-6, 9), entregue_em: dh(-6, 15), valor_declarado: t==='eletro'?3500:null }); }
  for (const [l,mo,a,cd,obs] of [['origem','antes','Elevador — paredes/espelho','dano_previo','Risco antigo no espelho, canto inferior direito'],['origem','antes','Hall de entrada','ok',''],['origem','depois','Elevador — paredes/espelho','dano_previo','Sem alteração em relação ao início'],['destino','antes','Porta do imóvel','ok',''],['destino','depois','Piso do imóvel','ok','Piso protegido com papelão durante a descarga']]) await add('vistorias_imovel', { mudanca_id: m1.id, local: l, momento: mo, area: a, condicao: cd, observacao: obs || null });
  const vRack = lista('volumes', v => v.mudanca_id === m1.id && v.numero === 3)[0];
  await add('ocorrencias', { mudanca_id: m1.id, volume_id: vRack.id, tipo: 'avaria', descricao: 'Cliente apontou risco no tampo do rack.', status: 'resolvida', responsavel: 'preexistente', resolucao: 'Conferido com a foto do inventário: o risco já existia antes da retirada (avaria prévia registrada e assinada pela cliente). Sem indenização.', created_at: dh(-6, 16) });
  for (const [d,desc,h] of [[-10,'Ordem de serviço aberta — vistoria de orçamento',10],[-9,'Etapa: Aprovada',14],[-6,'Etapa: Embalagem',8],[-6,'Vistoria do imóvel de origem (antes) iniciada',8],[-6,'Etapa: Carregamento',10],[-6,'Todos os 10 volumes carregados',12],[-6,'Etapa: Em trânsito',12],[-6,'Etapa: Entrega',14],[-6,'Todos os 10 volumes entregues/armazenados',15],[-6,'Etapa: Concluída',17],[-5,'Cliente avaliou o serviço com nota 5',9]]) await ev(m1.id, d, desc, h);
  await assin(m1.id, 'orcamento', 'Ana Paula Ribeiro', -9); await assin(m1.id, 'inventario', 'Ana Paula Ribeiro', -6); await assin(m1.id, 'entrega', 'Ana Paula Ribeiro', -6);
  await add('consumo_materiais', { mudanca_id: m1.id, material_id: mt[0].id, quantidade: 40 }); await add('consumo_materiais', { mudanca_id: m1.id, material_id: mt[2].id, quantidade: 60 });

  // 2) Em carregamento hoje
  const m2 = await novaM({ cliente_id: cl[1].id, tipo: 'comercial', status: 'carregamento', origem_endereco: 'Al. Rio Negro, 500, sala 1203 — Alphaville', origem_detalhes: '12º andar, doca com horário agendado 7h–12h', destino_endereco: 'Av. Copacabana, 112, 3º andar — Barueri', destino_detalhes: 'Elevador de carga liberado após 13h', distancia_km: 9, data_prevista: dt(0), caminhao_id: k2.id, equipe: [{id:p.e1,nome:'Marcos (líder de equipe)'},{id:p.e2,nome:'Rafael'}], cubagem_m3: 26, valor_orcado: 7200, valor_aprovado: 7200 });
  await itensOrc(m2.id, [['Escritório','Mesa de escritório',8],['Escritório','Cadeira de escritório',12],['Escritório','Arquivo/gaveteiro',6],['Escritório','Computador + monitor',8],['Caixas','Caixa G',30]]);
  for (let i = 1; i <= 14; i++) { const t = i<=8 ? 'movel' : i<=12 ? 'eletro' : 'caixa'; await add('volumes', { mudanca_id: m2.id, numero: i, tipo: t, descricao: t==='movel'?`Mesa estação ${i}`:t==='eletro'?`Computador estação ${i-8}`:`Arquivo morto ${i-12}`, comodo_origem: 'Escritório', comodo_destino: 'Escritório', avarias_previas: i===2?[{tipo:'Lascado',local:'Quina'}]:[], status: i<=9?'carregado':'etiquetado', carregado_em: i<=9?dh(0,9):null }); }
  await add('vistorias_imovel', { mudanca_id: m2.id, local: 'origem', momento: 'antes', area: 'Elevador — piso', condicao: 'ok', observacao: 'Protegido com manta' });
  await ev(m2.id, -4, 'Ordem de serviço aberta — vistoria de orçamento', 10); await ev(m2.id, -2, 'Etapa: Aprovada', 15); await ev(m2.id, 0, 'Etapa: Carregamento', 8);
  await assin(m2.id, 'orcamento', 'Roberto (sócio)', -2); await assin(m2.id, 'inventario', 'Roberto (sócio)', 0);

  // 3) Orçamento
  const m3 = await novaM({ cliente_id: cl[2].id, tipo: 'residencial', status: 'orcamento', origem_endereco: 'Rua Itu, 45 — Cotia', destino_endereco: 'Rua Bahia, 230 — Santana de Parnaíba', distancia_km: 22, data_prevista: dt(5) });
  await itensOrc(m3.id, [['Sala','Sofá 2 lugares',1],['Quarto 1','Cama casal',1],['Quarto 1','Guarda-roupa 2-3 portas',1],['Cozinha','Geladeira',1],['Caixas','Caixa M',20]]);
  await add('mudancas', { id: m3.id, cubagem_m3: calcOrcamento(m3).m3 });
  await ev(m3.id, -1, 'Ordem de serviço aberta — vistoria de orçamento', 11);

  // 4) Internacional aprovada
  const m4 = await novaM({ cliente_id: cl[3].id, tipo: 'internacional', status: 'aprovada', origem_endereco: 'Rua Holanda, 77 — Tamboré, Santana de Parnaíba', destino_endereco: 'Lisboa, Portugal (porta a porta)', destino_detalhes: 'Contêiner 20 pés compartilhado', distancia_km: 0, data_prevista: dt(12), valor_orcado: 28500, valor_aprovado: 28500, seguro_valor_declarado: 120000, parceiro_id: p.pa });
  await ev(m4.id, -3, 'Ordem de serviço aberta — vistoria de orçamento', 10); await ev(m4.id, -1, 'Etapa: Aprovada', 17); await assin(m4.id, 'orcamento', 'Juliana Costa', -1);

  // Guarda-móveis
  const ct = await add('guarda_contratos', { cliente_id: cl[3].id, mudanca_id: m4.id, inicio: dt(-30), valor_mensal: 450, dia_vencimento: 10, m3_ocupado: 6, status: 'ativo', observacoes: 'Itens que ficam no Brasil até a família voltar.' });
  for (let i = 1; i <= 5; i++) { const v = await add('volumes', { mudanca_id: m4.id, numero: i, tipo: i===5?'movel':'caixa', descricao: i===5?'Bicicleta infantil':`Caixa de recordações ${i}`, comodo_origem: 'Depósito', comodo_destino: i<=3?'Quarto 2':'Garagem', status: 'armazenado', posicao_deposito: `B-0${i}` }); await add('guarda_movimentos', { contrato_id: ct.id, volume_id: v.id, tipo: 'entrada', data: dh(-30) }); }
}
function assinaturaFake(nome){
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 90; const cx = cv.getContext('2d');
  cx.strokeStyle = '#10231B'; cx.lineWidth = 2.2; cx.beginPath(); let x = 18, y = 55; cx.moveTo(x, y);
  for (let i = 0; i < nome.length * 2; i++) { x += 6 + Math.random()*4; y = 30 + Math.random()*40; cx.quadraticCurveTo(x - 4, y - 18, x, y); }
  cx.stroke(); return cv.toDataURL('image/png');
}

/* ---------------- inicialização ---------------- */
async function entrarDemo(){
  MODO_DEMO = true; localStorage.setItem('mm_demo', '1');
  await semearDemo();
  PERFIL = pega('perfis', 'demo') || { id: 'demo', nome: 'Gestor My Moving', papel: 'admin', ativo: true };
  if (!location.hash || location.hash === '#') location.hash = '#/inicio';
  moldura(); render();
}
let LOGANDO = false;
async function aposLogin(){
  const uid = SESSAO.user.id;
  if (LOGANDO || (PERFIL && PERFIL.id === uid)) return; LOGANDO = true;
  try { await aposLogin2(uid); } finally { LOGANDO = false; }
}
async function aposLogin2(uid){
  let p = pega('perfis', uid);
  if (!p && navigator.onLine) { const { data } = await SB.from('perfis').select('*').eq('id', uid).maybeSingle(); if (data) { p = data; S.perfis.set(p.id, p); await IDB.poe('perfis', p); } }
  if (!p) return telaLogin('Seu perfil ainda não foi criado. Tente novamente em instantes.');
  if (!p.ativo) return telaLogin('Sua conta foi criada e aguarda liberação do administrador da My Moving.');
  PERFIL = p;
  if (!location.hash || location.hash === '#') location.hash = '#/inicio';
  moldura(); render();
  sincronizar();
}
async function iniciar(){
  await IDB.abrir();
  await carregarLocal();
  await prepararURLsLocais();
  const con = conexao();
  if (con && window.supabase) {
    SB = window.supabase.createClient(con.url, con.key, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  const token = new URLSearchParams(location.search).get('portal');
  if (token) return telaPortal(token);
  if (!SB) {
    if (con && !window.supabase) return telaLogin('Sem internet para carregar o servidor. Abra novamente com conexão.');
    if (localStorage.getItem('mm_demo')) return entrarDemo();
    return telaLogin();
  }
  SB.auth.onAuthStateChange((ev, s) => {
    const antes = SESSAO; SESSAO = s;
    if (ev === 'SIGNED_IN' && s) aposLogin();
    if (ev === 'SIGNED_OUT') { PERFIL = null; telaLogin(); }
    if (ev === 'PASSWORD_RECOVERY') { const nova = prompt('Digite a nova senha (mín. 6 caracteres):'); if (nova) SB.auth.updateUser({ password: nova }).then(({error}) => toast(error ? error.message : 'Senha alterada', error ? 'erro' : 'ok')); }
  });
  const { data } = await SB.auth.getSession();
  SESSAO = data.session;
  if (SESSAO) aposLogin(); else telaLogin();
}
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.addEventListener('load', () => iniciar().catch(e => { console.error(e); document.body.insertAdjacentHTML('afterbegin', `<div class="alerta-box verm" style="margin:16px">Erro ao iniciar: ${esc(e.message)}</div>`); }));
