/* =====================================================================
   Inventário, vistoria do imóvel, carga/entrega, ocorrências e laudos
   ===================================================================== */

/* ----- inventário ----- */
let FILTRO_INV = '';
async function abaInventario(el, m){
  const r = resumoVolumes(m.id);
  const ass = lista('assinaturas', a => a.mudanca_id === m.id && a.etapa === 'inventario')[0];
  const q = FILTRO_INV.toLowerCase();
  const vis = r.lista.filter(v => !q || [v.numero, v.descricao, v.comodo_origem, v.comodo_destino, VOL_TIPO[v.tipo]].join(' ').toLowerCase().includes(q));
  el.innerHTML = `
  <div class="acoes" style="margin-bottom:12px">
    <button class="btn prim" id="bnv">${ic('mais2')}Novo volume</button>
    <button class="btn" id="betq" ${r.total?'':'disabled'}>${ic('impressora')}Etiquetas QR</button>
    ${m.tipo === 'internacional' ? `<button class="btn" id="bpack" ${r.total?'':'disabled'}>${ic('doc')}Packing list (PT/EN)</button>` : ''}
    ${!ass && r.total ? `<button class="btn esc" id="bassinv">${ic('caneta')}Cliente confere e assina</button>` : ''}
  </div>
  ${ass ? `<div class="alerta-box verde small">${ic('check','style="width:18px;flex:none"')}<div>Inventário conferido e assinado por <b>${esc(ass.nome)}</b> em ${fmtDH(ass.assinado_em)}.</div></div>` : ''}
  <div class="grade g2 g4" style="margin-bottom:12px">
    <div class="kpi"><div class="v">${r.total}</div><div class="l">Volumes</div></div>
    <div class="kpi"><div class="v">${r.comAvaria}</div><div class="l">Com avaria prévia</div></div>
    <div class="kpi"><div class="v">${lista('fotos', f => f.mudanca_id === m.id && f.ref_tipo === 'volume').length}</div><div class="l">Fotos</div></div>
    <div class="kpi"><div class="v" style="font-size:20px">${ehGestor() ? moeda(soma(r.lista, v => v.valor_declarado)) : '—'}</div><div class="l">Valor declarado</div></div>
  </div>
  <div class="card" style="padding:10px 14px">
    <input type="search" id="binv" placeholder="Filtrar por número, descrição ou cômodo" value="${esc(FILTRO_INV)}" style="margin:4px 0 6px">
    <div class="lista">${vis.map(v => { const nf = fotosDe('volume', v.id).length; const av = v.avarias_previas||[];
      return `<div class="item" data-vol="${v.id}" style="cursor:pointer"><div class="num-vol ${v.status}">${v.numero}</div>
      <div class="cresce"><div class="t">${esc(v.descricao || VOL_TIPO[v.tipo])}</div>
      <div class="s">${VOL_TIPO[v.tipo]} · ${esc(v.comodo_origem||'?')} → ${esc(v.comodo_destino||'?')} · ${nf} foto${nf===1?'':'s'}</div>
      ${av.length ? `<div class="s" style="color:var(--ambar)">Avaria prévia: ${av.map(a => esc(a.tipo+(a.local?' ('+a.local+')':''))).join(', ')}</div>` : ''}</div>
      <span class="tag ${v.status==='entregue'?'verde':v.status==='extraviado'?'verm':v.status==='carregado'?'azul':''}">${VOL_STATUS[v.status]}</span></div>`; }).join('') || `<div class="vazio"><b>${r.total ? 'Nada encontrado' : 'Nenhum volume ainda'}</b>${r.total ? '' : 'Cadastre cada caixa ou móvel, fotografe e registre avarias que já existem.'}</div>`}</div>
  </div>`;
  $('#bnv').onclick = () => modalVolume(m);
  $('#binv').oninput = debounce(e => { FILTRO_INV = e.target.value; render(); setTimeout(() => { const b = $('#binv'); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 0); }, 350);
  $$('[data-vol]', el).forEach(x => x.onclick = () => modalVolume(m, pega('volumes', x.dataset.vol)));
  $('#betq') && ($('#betq').onclick = () => escolherEtiquetas(m));
  $('#bpack') && ($('#bpack').onclick = () => imprimir(docPackingList(m)));
  $('#bassinv') && ($('#bassinv').onclick = async () => { if (await coletarAssinatura(m, 'inventario', 'Conferência do inventário', config().termo_inventario)) { toast('Inventário assinado', 'ok'); render(); } });
}
function modalVolume(m, v){
  const novo = !v;
  const ultimo = novo ? lista('volumes', x => x.mudanca_id === m.id).sort((a,b) => b.numero - a.numero)[0] : null;
  v = v || { id: uuid(), mudanca_id: m.id, numero: proximoNumero(m.id), tipo: 'caixa', comodo_origem: ultimo?.comodo_origem || 'Sala', comodo_destino: ultimo?.comodo_destino || ultimo?.comodo_origem || 'Sala', avarias_previas: [], status: 'etiquetado' };
  let avarias = [...(v.avarias_previas||[])];
  const opCom = sel => COMODOS.map(x => `<option ${x===sel?'selected':''}>${x}</option>`).join('') + (sel && !COMODOS.includes(sel) ? `<option selected>${esc(sel)}</option>` : '');
  const fm = modal(novo ? `Volume nº ${v.numero}` : `Volume nº ${v.numero}`, `<form>
    <div class="chips" style="margin-bottom:12px" id="vtipo">${Object.entries(VOL_TIPO).map(([k,n]) => `<span class="chip ${v.tipo===k?'on':''}" data-k="${k}">${n}</span>`).join('')}</div>
    <div class="grade g2"><label class="campo"><span>Cômodo de origem</span><select name="comodo_origem">${opCom(v.comodo_origem)}</select></label>
    <label class="campo"><span>Cômodo de destino</span><select name="comodo_destino">${opCom(v.comodo_destino)}</select></label></div>
    <span class="small" style="font-weight:600;color:var(--tinta-2)">Escolha o móvel da lista do ambiente</span>
    <div id="vsug" style="margin:6px 0 10px;max-height:170px;overflow:auto"></div>
    <label class="campo"><span>Descrição / conteúdo — ou digite se não estiver na lista</span><input name="descricao" value="${esc(v.descricao||'')}" placeholder="Ex.: Sofá 3 lugares cinza / Louças da cozinha"></label>
    ${ehGestor() || novo ? `<label class="campo"><span>Valor declarado (R$, opcional)</span><input type="number" step="0.01" name="valor_declarado" value="${esc(v.valor_declarado??'')}"></label>` : ''}
    <span class="small" style="font-weight:600;color:var(--tinta-2)">Avarias que JÁ existem (antes da mudança)</span>
    <div id="vav" style="margin:6px 0 8px"></div>
    <div class="grade g2" style="margin-bottom:12px"><select id="avt"><option value="">Tipo de avaria…</option>${AVARIA_TIPOS.map(x => `<option>${x}</option>`).join('')}</select>
      <select id="avl"><option value="">Local…</option>${AVARIA_LOCAIS.map(x => `<option>${x}</option>`).join('')}</select></div>
    <span class="small" style="font-weight:600;color:var(--tinta-2)">Fotos ${novo ? '(salve para fotografar com carimbo do número)' : ''}</span>
    <div id="vfotos" style="margin:6px 0 14px"></div>
    ${!novo ? `<label class="campo"><span>Situação</span><select name="status">${Object.entries(VOL_STATUS).map(([k,n]) => `<option value="${k}" ${v.status===k?'selected':''}>${n}</option>`).join('')}</select></label>` : ''}
    <div class="acoes" style="justify-content:space-between">${!novo ? `<button type="button" class="btn perigo" data-del>${ic('lixo')}Excluir</button>` : '<span></span>'}
    <div class="acoes">${novo ? `<button class="btn" data-mais="1">Salvar e próximo</button>` : `<button type="button" class="btn" data-etq>${ic('impressora')}Etiqueta</button>`}<button class="btn prim">${ic('check')}${novo?'Salvar e fotografar':'Salvar'}</button></div></div>
  </form>`, (c, fechar) => {
    let tipo = v.tipo, proximo = false;
    $('#vtipo', c).onclick = e => { const k = e.target.dataset.k; if (!k) return; tipo = k; $$('#vtipo .chip', c).forEach(x => x.classList.toggle('on', x.dataset.k === k)); };
    const marcaTipo = k => { tipo = k; $$('#vtipo .chip', c).forEach(x => x.classList.toggle('on', x.dataset.k === k)); };
    const desSug = () => {
      const com = $('[name=comodo_origem]', c).value; const amb = ambienteDe(com);
      const orc = lista('orcamento_itens', i => i.mudanca_id === m.id && i.comodo === com);
      const feitos = lista('volumes', x => x.mudanca_id === m.id && x.comodo_origem === com && x.id !== v.id).map(x => (x.descricao||'').toLowerCase());
      const nomes = [];
      orc.forEach(i => { const ja = feitos.filter(f => f.startsWith(i.item.toLowerCase())).length; nomes.push([i.item, i.quantidade - ja, 'orc']); });
      (amb ? CATALOGO[amb] : []).concat(itensExtras(amb || com), CATALOGO.Caixas).forEach(([n]) => { if (!nomes.some(x => x[0].toLowerCase() === n.toLowerCase())) nomes.push([n, null, '']); });
      $('#vsug', c).innerHTML = `<div class="chips">${nomes.map(([n, falta, o]) => `<span class="chip ${o ? (falta > 0 ? 'on' : '') : ''}" data-sug="${esc(n)}" title="${o ? 'Do orçamento' : 'Lista do ambiente'}">${esc(n)}${o ? ` <b>${falta > 0 ? falta : '✓'}</b>` : ''}</span>`).join('')}</div>
        ${orc.length ? '<div class="tiny muted" style="margin-top:4px">Em destaque: itens do orçamento que ainda faltam etiquetar neste cômodo.</div>' : ''}`;
      $$('[data-sug]', c).forEach(ch => ch.onclick = () => { const n = ch.dataset.sug; const inp = $('[name=descricao]', c);
        inp.value = n; inp.focus(); const grupo = Object.keys(CATALOGO).find(g => CATALOGO[g].some(x => x[0] === n));
        marcaTipo(tipoSugerido(n, grupo)); });
    };
    $('[name=comodo_origem]', c).addEventListener('change', e => { const d = $('[name=comodo_destino]', c); if (d && !pega('volumes', v.id)) d.value = e.target.value; desSug(); });
    desSug();
    const desAv = () => { $('#vav', c).innerHTML = avarias.length ? `<div class="chips">${avarias.map((a,i) => `<span class="chip on" data-rav="${i}">${esc(a.tipo)}${a.local?' · '+esc(a.local):''} ✕</span>`).join('')}</div>` : '<span class="small muted">Nenhuma — item em bom estado</span>';
      $$('[data-rav]', c).forEach(x => x.onclick = () => { avarias.splice(Number(x.dataset.rav), 1); desAv(); }); };
    desAv();
    const addAv = () => { const t = $('#avt', c).value, l = $('#avl', c).value; if (!t) return; avarias.push({ tipo: t, local: l || null }); $('#avt', c).value = ''; $('#avl', c).value = ''; desAv(); };
    $('#avt', c).onchange = addAv; $('#avl', c).onchange = () => { if ($('#avt', c).value) addAv(); };
    const desFotos = () => {
      if (novo && !pega('volumes', v.id)) { $('#vfotos', c).innerHTML = '<div class="small muted">—</div>'; return; }
      $('#vfotos', c).innerHTML = htmlFotos(fotosDe('volume', v.id), { editar: true });
      $('#vfotos input', c).onchange = async e => {
        for (const f of e.target.files) await adicionarFoto(f, { mudanca_id: m.id, ref_tipo: 'volume', ref_id: v.id, legenda: `Volume ${v.numero}`, carimbo: `${m.codigo} · Vol. ${v.numero}` });
        desFotos(); };
      $$('[data-del-foto]', c).forEach(b => b.addEventListener('click', () => setTimeout(desFotos, 400)));
    };
    desFotos();
    $$('[data-mais]', c).forEach(b => b.onclick = () => { proximo = true; });
    $$('button.prim', c).forEach(b => b.addEventListener('click', () => { proximo = false; }));
    const salvarVol = async (form) => { const d = form2obj(form);
      const ehNovo = !pega('volumes', v.id);
      await salvar('volumes', { id: v.id, mudanca_id: m.id, numero: v.numero, tipo, descricao: nulo(d.descricao), comodo_origem: d.comodo_origem, comodo_destino: d.comodo_destino,
        valor_declarado: d.valor_declarado !== undefined ? numOuNulo(d.valor_declarado) : v.valor_declarado ?? null, avarias_previas: avarias, status: d.status || v.status });
      if (ehNovo && v.numero === 1) await evento(m.id, 'inventario', 'Início do inventário e etiquetagem dos volumes');
      return ehNovo; };
    $('form', c).onsubmit = async e => { e.preventDefault();
      const ehNovo = await salvarVol(e.target);
      if (ehNovo && !proximo) { c.closest('.modal').querySelector('h2').textContent = `Volume nº ${v.numero} — salvo`; $('button.prim', c).innerHTML = `${ic('check')}Concluir`; $('[data-mais]', c).textContent = 'Concluir e próximo'; desFotos(); setTimeout(() => $('#vfotos input', c)?.click(), 100); toast('Volume salvo — agora fotografe', 'ok'); return; }
      fechar(); render();
      if (proximo) setTimeout(() => modalVolume(pega('mudancas', m.id)), 120);
    };
    $('[data-del]', c) && ($('[data-del]', c).onclick = async () => { if (await confirmar(`Excluir o volume ${v.numero}?`, 'Excluir')) { await remover('volumes', v.id); fechar(); render(); } });
    $('[data-etq]', c) && ($('[data-etq]', c).onclick = () => imprimir(docEtiquetas(m, [pega('volumes', v.id)])));
  });
  fm.addEventListener('fechou', () => { if (ROTA_ATUAL.includes('/inventario')) render(); });
}
function escolherEtiquetas(m){
  const r = resumoVolumes(m.id);
  modal('Imprimir etiquetas', `<p class="small muted">Etiquetas em A4 (10 por folha) com QR code. Use papel adesivo ou cole com fita.</p>
    <form><div class="grade g2"><label class="campo"><span>Do volume</span><input type="number" name="de" value="1" min="1"></label><label class="campo"><span>Até</span><input type="number" name="ate" value="${r.lista.at(-1)?.numero||1}"></label></div>
    <button class="btn prim bloco">${ic('impressora')}Imprimir</button></form>`, (c, fechar) => {
    $('form', c).onsubmit = e => { e.preventDefault(); const d = form2obj(e.target);
      const vs = r.lista.filter(v => v.numero >= Number(d.de) && v.numero <= Number(d.ate)); fechar(); imprimir(docEtiquetas(m, vs)); };
  });
}

/* ----- vistoria do imóvel ----- */
let VIST_SEL = { local: 'origem', momento: 'antes' };
async function abaVistoria(el, m){
  const regs = lista('vistorias_imovel', v => v.mudanca_id === m.id);
  const atuais = regs.filter(v => v.local === VIST_SEL.local && v.momento === VIST_SEL.momento);
  const etapaAss = VIST_SEL.local === 'origem' ? 'vistoria_origem' : 'vistoria_destino';
  const ass = lista('assinaturas', a => a.mudanca_id === m.id && a.etapa === etapaAss)[0];
  const cont = (l, mo) => regs.filter(v => v.local === l && v.momento === mo).length;
  el.innerHTML = `
  <div class="alerta-box azul small">${ic('alerta','style="width:18px;flex:none"')}<div>Fotografe as áreas comuns e o imóvel <b>antes</b> de começar e <b>depois</b> de terminar, na origem e no destino. É a prova em caso de reclamação do condomínio.</div></div>
  <div class="grade g2 g4" style="margin-bottom:12px">${[['origem','antes'],['origem','depois'],['destino','antes'],['destino','depois']].map(([l,mo]) =>
    `<button class="btn ${VIST_SEL.local===l&&VIST_SEL.momento===mo?'esc':''}" data-l="${l}" data-m="${mo}" style="flex-direction:column;gap:0;min-height:58px"><span style="text-transform:capitalize">${l} · ${mo}</span><span class="tiny" style="opacity:.75">${cont(l,mo)} área(s)</span></button>`).join('')}</div>
  <div class="card"><h3 style="text-transform:capitalize">${VIST_SEL.local} — ${VIST_SEL.momento}</h3>
    <div class="lista">${AREAS_VISTORIA.concat(atuais.map(a => a.area).filter(a => !AREAS_VISTORIA.includes(a))).map(area => { const reg = atuais.find(a => a.area === area); const nf = reg ? fotosDe('vistoria', reg.id).length : 0;
      return `<div class="item" data-area="${esc(area)}" style="cursor:pointer"><div class="cresce"><div class="t">${esc(area)}</div><div class="s">${reg ? `${nf} foto(s)${reg.observacao?' · '+esc(reg.observacao):''}` : 'Não vistoriado'}</div></div>
      ${reg ? `<span class="tag ${reg.condicao==='ok'?'verde':reg.condicao==='dano_previo'?'amb':'verm'}">${reg.condicao==='ok'?'OK':reg.condicao==='dano_previo'?'Dano prévio':'Dano novo'}</span>` : '<span class="tag">pendente</span>'}</div>`; }).join('')}</div>
    <div class="acoes" style="margin-top:10px"><button class="btn peq" id="bnarea">${ic('mais2')}Outra área</button></div>
  </div>
  <div class="card"><h3>Assinatura da vistoria (${VIST_SEL.local})</h3>
    ${ass ? `<div class="alerta-box verde small">${ic('check','style="width:18px;flex:none"')}<div>Assinada por <b>${esc(ass.nome)}</b> em ${fmtDH(ass.assinado_em)}</div></div>` : `<button class="btn prim" id="bassv">${ic('caneta')}Cliente/síndico assina a vistoria</button>`}
  </div>`;
  $$('[data-l]', el).forEach(b => b.onclick = () => { VIST_SEL = { local: b.dataset.l, momento: b.dataset.m }; render(); });
  $$('[data-area]', el).forEach(x => x.onclick = () => modalArea(m, x.dataset.area, atuais.find(a => a.area === x.dataset.area)));
  $('#bnarea').onclick = () => { const a = prompt('Nome da área (ex.: Portão da garagem)'); if (a) modalArea(m, a.trim(), null); };
  $('#bassv') && ($('#bassv').onclick = async () => { if (await coletarAssinatura(m, etapaAss, `Vistoria do imóvel — ${VIST_SEL.local}`, `Declaro que as condições das áreas registradas em fotos neste ${VIST_SEL.local === 'origem' ? 'imóvel de origem' : 'imóvel de destino'} correspondem à realidade.`)) render(); });
}
function modalArea(m, area, reg){
  const id = reg?.id || uuid();
  const fm = modal(area, `<form>
    <span class="small" style="font-weight:600;color:var(--tinta-2)">Condição</span>
    <div class="chips" id="acond" style="margin:6px 0 12px">${[['ok','Sem danos'],['dano_previo','Dano já existente'],['dano_novo','Dano causado na mudança']].map(([k,n]) => `<span class="chip ${(reg?.condicao||'ok')===k?'on':''}" data-k="${k}">${n}</span>`).join('')}</div>
    <label class="campo"><span>Observação</span><textarea name="observacao" placeholder="Ex.: risco antigo na porta do elevador, lado esquerdo">${esc(reg?.observacao||'')}</textarea></label>
    <span class="small" style="font-weight:600;color:var(--tinta-2)">Fotos</span><div id="afotos" style="margin:6px 0 14px"></div>
    <div class="acoes" style="justify-content:space-between">${reg ? `<button type="button" class="btn perigo" data-del>${ic('lixo')}Remover</button>` : '<span></span>'}<button class="btn prim">${ic('check')}Salvar</button></div></form>`, (c, fechar) => {
    let cond = reg?.condicao || 'ok';
    $('#acond', c).onclick = e => { if (!e.target.dataset.k) return; cond = e.target.dataset.k; $$('#acond .chip', c).forEach(x => x.classList.toggle('on', x.dataset.k === cond)); };
    const garantir = async () => { if (!pega('vistorias_imovel', id)) await salvar('vistorias_imovel', { id, mudanca_id: m.id, local: VIST_SEL.local, momento: VIST_SEL.momento, area, condicao: cond, observacao: nulo($('[name=observacao]', c).value) }); };
    const des = () => { $('#afotos', c).innerHTML = htmlFotos(fotosDe('vistoria', id), { editar: true });
      $('#afotos input', c).onchange = async e => { await garantir();
        for (const f of e.target.files) await adicionarFoto(f, { mudanca_id: m.id, ref_tipo: 'vistoria', ref_id: id, legenda: `${area} — ${VIST_SEL.local}/${VIST_SEL.momento}`, carimbo: `${m.codigo} · ${area}` });
        des(); };
      $$('[data-del-foto]', c).forEach(b => b.addEventListener('click', () => setTimeout(des, 400))); };
    des();
    $('form', c).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target);
      const primeira = !lista('vistorias_imovel', v => v.mudanca_id === m.id && v.local === VIST_SEL.local && v.momento === VIST_SEL.momento).length;
      await salvar('vistorias_imovel', { id, mudanca_id: m.id, local: VIST_SEL.local, momento: VIST_SEL.momento, area, condicao: cond, observacao: nulo(d.observacao) });
      if (primeira) await evento(m.id, 'vistoria', `Vistoria do imóvel de ${VIST_SEL.local} (${VIST_SEL.momento}) iniciada`);
      if (cond === 'dano_novo') { await salvar('ocorrencias', { mudanca_id: m.id, tipo: 'imovel', descricao: `${area} (${VIST_SEL.local}): ${d.observacao || 'dano registrado na vistoria'}`, status: 'aberta' }); toast('Ocorrência aberta automaticamente', 'erro'); }
      fechar(); render(); };
    $('[data-del]', c) && ($('[data-del]', c).onclick = async () => { if (await confirmar('Remover o registro desta área?', 'Remover')) { await remover('vistorias_imovel', id); fechar(); render(); } });
  });
  fm.addEventListener('fechou', () => { if (ROTA_ATUAL.includes('/vistoria')) render(); });
}

/* ----- carga e entrega ----- */
let MODO_CARGA = 'carregar';
async function abaCarga(el, m){
  const r = resumoVolumes(m.id);
  const pctC = r.total ? Math.round((r.total - r.etiquetado) / r.total * 100) : 0;
  const pctE = r.total ? Math.round((r.entregue + r.armazenado) / r.total * 100) : 0;
  const alvo = { carregar: 'carregado', entregar: 'entregue', armazenar: 'armazenado' }[MODO_CARGA];
  const pend = r.lista.filter(v => MODO_CARGA === 'carregar' ? v.status === 'etiquetado' : ['etiquetado','carregado'].includes(v.status));
  const assEnt = lista('assinaturas', a => a.mudanca_id === m.id && a.etapa === 'entrega')[0];
  el.innerHTML = `
  <div class="grade md-g2">
    <div class="card"><h3>Carregamento</h3><div class="barra azul"><i style="width:${pctC}%"></i></div><div class="small muted" style="margin-top:6px">${r.total - r.etiquetado} de ${r.total} volumes no caminhão ou além (${pctC}%)</div></div>
    <div class="card" style="margin-top:0"><h3>Entrega</h3><div class="barra"><i style="width:${pctE}%"></i></div><div class="small muted" style="margin-top:6px">${r.entregue} entregues${r.armazenado?` · ${r.armazenado} no guarda-móveis`:''} de ${r.total} (${pctE}%)</div></div>
  </div>
  <div class="card" style="margin-top:12px">
    <div class="chips" id="mcarga" style="margin-bottom:12px">${[['carregar','Carregar no caminhão'],['entregar','Entregar no destino'],['armazenar','Armazenar (guarda-móveis)']].map(([k,n]) => `<span class="chip ${MODO_CARGA===k?'on':''}" data-k="${k}">${n}</span>`).join('')}</div>
    <div id="leitor" class="hide"></div>
    <div id="scanres" class="small muted" style="text-align:center;margin:8px 0"></div>
    <div class="acoes"><button class="btn prim" id="bcam">${ic('scan')}Ler QR com a câmera</button>
      <form id="fnum" style="display:flex;gap:6px;flex:1;min-width:200px"><input type="number" inputmode="numeric" name="n" placeholder="ou digite o nº do volume"><button class="btn">OK</button></form></div>
  </div>
  <div class="card"><h3>Pendentes para ${MODO_CARGA === 'carregar' ? 'carregar' : MODO_CARGA === 'entregar' ? 'entregar' : 'armazenar'} (${pend.length})</h3>
    <div class="lista">${pend.map(v => `<div class="item"><div class="num-vol ${v.status}">${v.numero}</div><div class="cresce"><div class="t">${esc(v.descricao || VOL_TIPO[v.tipo])}</div><div class="s">${esc(v.comodo_origem||'')} → ${esc(v.comodo_destino||'')}</div></div><button class="btn peq" data-mk="${v.id}">${ic('check')}Marcar</button></div>`).join('') || '<div class="vazio">Tudo certo — nenhum pendente.</div>'}</div>
    ${MODO_CARGA !== 'carregar' && pend.length ? `<div class="acoes" style="margin-top:10px"><button class="btn perigo peq" id="bextr">Marcar volume como extraviado…</button></div>` : ''}
  </div>
  ${MODO_CARGA === 'entregar' ? `<div class="card"><h3>Conferência final</h3>
    ${assEnt ? `<div class="alerta-box verde small">${ic('check','style="width:18px;flex:none"')}<div>Recebimento assinado por <b>${esc(assEnt.nome)}</b> em ${fmtDH(assEnt.assinado_em)} — ${r.entregue + r.armazenado} de ${r.total} volumes.</div></div>`
      : `<p class="small muted" style="margin-top:0">Quando todos os volumes forem entregues, colete a assinatura do cliente. Ocorrências abertas aparecem no laudo como ressalva.</p><button class="btn prim" id="bassent" ${r.total?'':'disabled'}>${ic('caneta')}Cliente confere e assina o recebimento</button>`}</div>` : ''}`;
  $('#mcarga').onclick = async e => { if (!e.target.dataset.k) return; MODO_CARGA = e.target.dataset.k; await pararScanner(); render(); };
  const marcar = async (v, origem) => {
    const res = $('#scanres');
    if (!v || v.mudanca_id !== m.id) { if (res) { res.innerHTML = `<b style="color:var(--vermelho)">Volume não pertence a esta mudança</b>`; res.parentElement.classList.remove('flash-erro'); void res.offsetWidth; res.parentElement.classList.add('flash-erro'); } if (navigator.vibrate) navigator.vibrate([80,60,80]); return; }
    if (v.status === alvo) { if (res) res.innerHTML = `<div class="scan-res">${v.numero}</div>já estava ${VOL_STATUS[alvo].toLowerCase()}`; return; }
    const extra = alvo === 'carregado' ? { carregado_em: agora() } : alvo === 'entregue' ? { entregue_em: agora() } : {};
    await salvar('volumes', { id: v.id, status: alvo, ...extra });
    const r2 = resumoVolumes(m.id);
    if (alvo === 'carregado' && r2.carregado === 1 && !r2.entregue) await evento(m.id, 'carga', 'Carregamento iniciado');
    if (alvo === 'carregado' && !r2.etiquetado) await evento(m.id, 'carga', `Todos os ${r2.total} volumes carregados`);
    if (alvo === 'entregue' && r2.entregue === 1) await evento(m.id, 'entrega', 'Descarga no destino iniciada');
    if (alvo !== 'carregado' && !r2.etiquetado && !r2.carregado) await evento(m.id, 'entrega', `Todos os ${r2.total} volumes entregues/armazenados`);
    if (alvo === 'armazenado') await vincularGuarda(m, v);
    if (res) { res.innerHTML = `<div class="scan-res" style="color:var(--verde)">${v.numero} ✓</div>${esc(v.descricao||VOL_TIPO[v.tipo])} — ${VOL_STATUS[alvo]}`; res.parentElement.classList.remove('flash-ok'); void res.offsetWidth; res.parentElement.classList.add('flash-ok'); }
    if (!SCANNER.ativo || origem === 'lista') render();
    else { // atualiza só os números sem fechar a câmera
      const pc = r2.total ? Math.round((r2.total - r2.etiquetado) / r2.total * 100) : 0, pe = r2.total ? Math.round((r2.entregue + r2.armazenado) / r2.total * 100) : 0;
      $$('.barra i', el)[0].style.width = pc+'%'; $$('.barra i', el)[1].style.width = pe+'%';
      const it = el.querySelector(`[data-mk="${v.id}"]`)?.closest('.item'); if (it) it.remove();
    }
  };
  $('#bcam').onclick = async () => {
    if (SCANNER.ativo) { await pararScanner(); $('#leitor').classList.add('hide'); $('#bcam').innerHTML = `${ic('scan')}Ler QR com a câmera`; return; }
    $('#leitor').classList.remove('hide');
    if (await iniciarScanner('leitor', txt => marcar(lerConteudoQR(txt), 'scan'))) $('#bcam').innerHTML = 'Fechar câmera';
    else $('#leitor').classList.add('hide');
  };
  $('#fnum').onsubmit = e => { e.preventDefault(); const n = Number(form2obj(e.target).n); const v = r.lista.find(x => x.numero === n); e.target.reset(); marcar(v || null, 'num'); };
  $$('[data-mk]', el).forEach(b => b.onclick = () => marcar(pega('volumes', b.dataset.mk), 'lista'));
  $('#bextr') && ($('#bextr').onclick = () => modal('Volume extraviado', `<form><label class="campo"><span>Volume</span><select name="v">${pend.map(v => `<option value="${v.id}">${v.numero} — ${esc(v.descricao||VOL_TIPO[v.tipo])}</option>`).join('')}</select></label><button class="btn perigo bloco">Marcar como extraviado e abrir ocorrência</button></form>`, (c, fechar) => {
    $('form', c).onsubmit = async e => { e.preventDefault(); const v = pega('volumes', form2obj(e.target).v);
      await salvar('volumes', { id: v.id, status: 'extraviado' });
      await salvar('ocorrencias', { mudanca_id: m.id, volume_id: v.id, tipo: 'extravio', descricao: `Volume ${v.numero} (${v.descricao||VOL_TIPO[v.tipo]}) não localizado na entrega`, status: 'aberta' });
      await evento(m.id, 'ocorrencia', `Ocorrência: volume ${v.numero} não localizado`); fechar(); render(); };
  }));
  $('#bassent') && ($('#bassent').onclick = async () => {
    const r3 = resumoVolumes(m.id); const oc = lista('ocorrencias', o => o.mudanca_id === m.id && o.status !== 'resolvida').length;
    const termo = `${config().termo_entrega} Volumes: ${r3.entregue} entregues${r3.armazenado?`, ${r3.armazenado} armazenados`:''}${r3.extraviado?`, ${r3.extraviado} extraviados`:''} de ${r3.total}.${oc?` Ocorrências em aberto: ${oc}.`:''}`;
    if (await coletarAssinatura(m, 'entrega', 'Recebimento da mudança', termo)) {
      const mm = pega('mudancas', m.id);
      if (STATUS.findIndex(s => s[0] === mm.status) < STATUS.findIndex(s => s[0] === 'entrega')) await salvar('mudancas', { id: m.id, status: 'entrega' });
      if (await confirmar('Assinatura registrada. Concluir a mudança agora? O cliente poderá avaliar o serviço pelo portal.', 'Concluir')) {
        await salvar('mudancas', { id: m.id, status: 'concluida' }); await evento(m.id, 'status', 'Etapa: Concluída');
      }
      render(); }
  });
}
async function vincularGuarda(m, v){
  let ct = lista('guarda_contratos', g => g.status === 'ativo' && (g.mudanca_id === m.id || g.cliente_id === m.cliente_id))[0];
  if (!ct) { ct = await salvar('guarda_contratos', { mudanca_id: m.id, cliente_id: m.cliente_id, inicio: hojeISO(), valor_mensal: 0, dia_vencimento: 10, status: 'ativo' });
    await evento(m.id, 'guarda', 'Contrato de guarda-móveis aberto'); toast('Contrato de guarda-móveis criado — ajuste o valor em Guarda-móveis'); }
  await salvar('guarda_movimentos', { contrato_id: ct.id, volume_id: v.id, tipo: 'entrada', data: agora() });
}

/* ----- ocorrências ----- */
async function abaOcorrencias(el, m){
  const ocs = lista('ocorrencias', o => o.mudanca_id === m.id).sort((a,b) => a.created_at < b.created_at ? 1 : -1);
  el.innerHTML = `<div class="acoes" style="margin-bottom:12px"><button class="btn prim" id="bnoc">${ic('mais2')}Registrar ocorrência</button></div>
  ${ocs.map(o => { const v = pega('volumes', o.volume_id); const antes = v ? fotosDe('volume', v.id) : []; const depois = fotosDe('ocorrencia', o.id);
    return `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h3 style="margin:0">${OCOR_TIPO[o.tipo]}${v?` — volume ${v.numero}`:''}</h3><div class="small muted">${fmtDH(o.created_at)}</div></div><span class="tag ${o.status==='resolvida'?'verde':o.status==='aberta'?'verm':'amb'}">${OCOR_STATUS[o.status]}</span></div>
    <p style="margin:10px 0">${esc(o.descricao)}</p>
    ${v ? `<div class="grade g2"><div><div class="small" style="font-weight:700;margin-bottom:4px">ANTES (inventário)</div>${antes.length ? htmlFotos(antes) : '<span class="small muted">Sem fotos</span>'}${(v.avarias_previas||[]).length ? `<div class="tiny" style="color:var(--ambar);margin-top:4px">Avaria prévia: ${v.avarias_previas.map(a => esc(a.tipo)).join(', ')}</div>` : '<div class="tiny muted" style="margin-top:4px">Sem avaria prévia registrada</div>'}</div>
      <div><div class="small" style="font-weight:700;margin-bottom:4px">DEPOIS</div>${depois.length ? htmlFotos(depois) : '<span class="small muted">Sem fotos</span>'}</div></div>` : (depois.length ? htmlFotos(depois) : '')}
    ${o.resolucao || o.responsavel ? `<div class="alerta-box ${o.status==='resolvida'?'verde':'amb'} small" style="margin-top:10px;display:block">${o.responsavel?`<b>Responsabilidade:</b> ${esc(o.responsavel)}<br>`:''}${o.valor_indenizacao?`<b>Indenização:</b> ${moeda(o.valor_indenizacao)}<br>`:''}${o.resolucao?esc(o.resolucao):''}</div>` : ''}
    <div class="acoes" style="margin-top:10px"><button class="btn peq" data-oc="${o.id}">${ic('caneta')}Atualizar</button></div></div>`; }).join('') || '<div class="card"><div class="vazio"><b>Nenhuma ocorrência</b>Avarias, extravios, atrasos ou danos ao imóvel ficam registrados aqui com fotos de antes e depois.</div></div>'}`;
  $('#bnoc').onclick = () => modalOcorrencia(m);
  $$('[data-oc]', el).forEach(b => b.onclick = () => modalOcorrencia(m, pega('ocorrencias', b.dataset.oc)));
}
function modalOcorrencia(m, o){
  const id = o?.id || uuid();
  const vols = resumoVolumes(m.id).lista;
  const fm = modal(o ? 'Atualizar ocorrência' : 'Nova ocorrência', `<form>
    <div class="grade g2"><label class="campo"><span>Tipo</span><select name="tipo">${Object.entries(OCOR_TIPO).map(([k,n]) => `<option value="${k}" ${o?.tipo===k?'selected':''}>${n}</option>`).join('')}</select></label>
    <label class="campo"><span>Volume (se houver)</span><select name="volume_id"><option value="">—</option>${vols.map(v => `<option value="${v.id}" ${o?.volume_id===v.id?'selected':''}>${v.numero} — ${esc(v.descricao||VOL_TIPO[v.tipo])}</option>`).join('')}</select></label></div>
    <label class="campo"><span>Descrição</span><textarea name="descricao" required>${esc(o?.descricao||'')}</textarea></label>
    <span class="small" style="font-weight:600;color:var(--tinta-2)">Fotos do dano</span><div id="ofotos" style="margin:6px 0 14px"></div>
    ${o && ehGestor() ? `<div class="grade g2"><label class="campo"><span>Situação</span><select name="status">${Object.entries(OCOR_STATUS).map(([k,n]) => `<option value="${k}" ${o.status===k?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="campo"><span>Responsabilidade</span><select name="responsavel"><option value="">A definir</option>${['empresa','cliente','terceiro','preexistente'].map(k => `<option ${o.responsavel===k?'selected':''}>${k}</option>`).join('')}</select></label></div>
      <label class="campo"><span>Indenização (R$)</span><input type="number" step="0.01" name="valor_indenizacao" value="${esc(o.valor_indenizacao??'')}"></label>
      <label class="campo"><span>Resolução</span><textarea name="resolucao">${esc(o.resolucao||'')}</textarea></label>` : ''}
    <button class="btn prim bloco">${ic('check')}Salvar</button></form>`, (c, fechar) => {
    const garantir = async () => { if (!pega('ocorrencias', id)) await salvar('ocorrencias', { id, mudanca_id: m.id, tipo: $('[name=tipo]', c).value, volume_id: nulo($('[name=volume_id]', c).value), descricao: $('[name=descricao]', c).value || 'Ocorrência', status: 'aberta' }); };
    const des = () => { $('#ofotos', c).innerHTML = htmlFotos(fotosDe('ocorrencia', id), { editar: true });
      $('#ofotos input', c).onchange = async e => { await garantir(); for (const f of e.target.files) await adicionarFoto(f, { mudanca_id: m.id, ref_tipo: 'ocorrencia', ref_id: id, legenda: 'Ocorrência', carimbo: `${m.codigo} · Ocorrência` }); des(); };
      $$('[data-del-foto]', c).forEach(b => b.addEventListener('click', () => setTimeout(des, 400))); };
    des();
    $('form', c).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target); const novo = !pega('ocorrencias', id) || !o;
      const dados = { id, mudanca_id: m.id, tipo: d.tipo, volume_id: nulo(d.volume_id), descricao: d.descricao };
      if (d.status) Object.assign(dados, { status: d.status, responsavel: nulo(d.responsavel), valor_indenizacao: numOuNulo(d.valor_indenizacao), resolucao: nulo(d.resolucao) });
      else if (novo) dados.status = 'aberta';
      await salvar('ocorrencias', dados);
      if (novo) await evento(m.id, 'ocorrencia', `Ocorrência registrada: ${OCOR_TIPO[d.tipo]}`);
      else if (d.status === 'resolvida' && o.status !== 'resolvida') await evento(m.id, 'ocorrencia', `Ocorrência resolvida: ${OCOR_TIPO[d.tipo]}`);
      fechar(); render(); };
  });
  fm.addEventListener('fechou', () => { if (ROTA_ATUAL.includes('/ocorrencias')) render(); });
}

/* ----- laudo ----- */
async function abaLaudo(el, m){
  const ass = lista('assinaturas', a => a.mudanca_id === m.id);
  const r = resumoVolumes(m.id);
  const chk = [
    ['Contrato assinado', ass.some(a => a.etapa === 'orcamento')],
    ['Inventário com fotos', r.total > 0 && lista('fotos', f => f.mudanca_id === m.id && f.ref_tipo === 'volume').length > 0],
    ['Inventário assinado pelo cliente', ass.some(a => a.etapa === 'inventario')],
    ['Vistoria do imóvel de origem', lista('vistorias_imovel', v => v.mudanca_id === m.id && v.local === 'origem').length > 0],
    ['Todos os volumes carregados', r.total > 0 && r.etiquetado === 0],
    ['Vistoria do imóvel de destino', lista('vistorias_imovel', v => v.mudanca_id === m.id && v.local === 'destino').length > 0],
    ['Recebimento assinado', ass.some(a => a.etapa === 'entrega')],
    ['Ocorrências resolvidas', !lista('ocorrencias', o => o.mudanca_id === m.id && o.status !== 'resolvida').length]
  ];
  el.innerHTML = `<div class="grade md-g2">
    <div class="card"><h3>Checklist do laudo</h3>${chk.map(([n, ok]) => `<div class="dupla"><span>${n}</span><span style="color:${ok?'var(--verde)':'var(--ambar)'}">${ok?'✓ Feito':'Pendente'}</span></div>`).join('')}</div>
    <div class="card" style="margin-top:0"><h3>Documentos</h3>
      <div class="lista">
        <a class="item" href="#" data-doc="laudo"><div class="cresce"><div class="t">Laudo completo de vistoria da mudança</div><div class="s">Inventário, fotos, vistorias, ocorrências, assinaturas e linha do tempo</div></div>${ic('impressora','style="width:20px"')}</a>
        <a class="item" href="#" data-doc="contrato"><div class="cresce"><div class="t">Contrato de prestação de serviços</div><div class="s">Partes, serviço, valores, cláusulas e assinatura</div></div>${ic('impressora','style="width:20px"')}</a>
        <a class="item" href="#" data-doc="proposta"><div class="cresce"><div class="t">Proposta comercial</div><div class="s">Cubagem, itens e valores</div></div>${ic('impressora','style="width:20px"')}</a>
        <a class="item" href="#" data-doc="etq"><div class="cresce"><div class="t">Etiquetas QR</div><div class="s">${r.total} volumes</div></div>${ic('impressora','style="width:20px"')}</a>
        ${m.tipo === 'internacional' ? `<a class="item" href="#" data-doc="pack"><div class="cresce"><div class="t">Packing list valorado (PT/EN)</div><div class="s">Para alfândega e seguradora</div></div>${ic('impressora','style="width:20px"')}</a>` : ''}
        <a class="item" href="${linkPortal(m)}" target="_blank" rel="noopener"><div class="cresce"><div class="t">Abrir portal do cliente</div><div class="s">Como o cliente vê a mudança</div></div>${ic('link','style="width:20px"')}</a>
      </div>
      <p class="tiny muted" style="margin-bottom:0">Na janela de impressão, escolha “Salvar como PDF” para enviar por WhatsApp ou e-mail.</p></div>
  </div>`;
  $$('[data-doc]', el).forEach(a => a.onclick = e => { e.preventDefault(); const mm = pega('mudancas', m.id);
    ({ laudo: () => imprimir(docLaudo(mm)), contrato: () => imprimir(docContrato(mm)), proposta: () => imprimir(docProposta(mm)), etq: () => imprimir(docEtiquetas(mm, resumoVolumes(mm.id).lista)), pack: () => imprimir(docPackingList(mm)) })[a.dataset.doc](); });
}

/* ---------------- documentos para impressão ---------------- */
function docCab(titulo, m){
  const cfg = config();
  return `<div class="dcab"><div class="lg">${LOGO}<div><b>My moving</b><span style="font-family:var(--fonte-t);font-weight:700;color:var(--escuro)">Transportes</span></div></div>
  <div style="text-align:right"><div style="font-family:var(--fonte-t);font-size:16px;font-weight:700">${esc(titulo)}</div><div>${m ? esc(m.codigo)+' · ' : ''}emitido em ${fmtDH(agora())}</div>
  <div style="font-size:10px;color:#555">${esc(cfg.empresa_nome)}${cfg.empresa_cnpj?' · CNPJ '+esc(cfg.empresa_cnpj):''} · ${esc(cfg.empresa_fone)} · ${esc(cfg.empresa_email)}</div></div></div>`;
}
const docRod = () => `<div class="drod">${esc(config().empresa_nome)} · ${esc(config().empresa_site)}<br>${rodapeDevHTML(true)}</div>`;
function docDadosMudanca(m){
  const cli = pega('clientes', m.cliente_id) || {};
  return `<div class="g2"><div><b>Cliente:</b> ${esc(cli.nome||'—')}${cli.documento?' · '+esc(cli.documento):''}</div><div><b>Tipo:</b> ${TIPO_NOME[m.tipo]} · <b>Data:</b> ${fmtData(m.data_prevista)}</div>
  <div><b>Origem:</b> ${esc(m.origem_endereco||'—')}${m.origem_detalhes?' ('+esc(m.origem_detalhes)+')':''}</div><div><b>Destino:</b> ${esc(m.destino_endereco||'—')}${m.destino_detalhes?' ('+esc(m.destino_detalhes)+')':''}</div></div>`;
}
const docAss = lst => lst.length ? lst.map(a => `<div class="ass"><img src="${a.imagem}"><div><b>${esc(a.nome)}</b>${a.documento?' · '+esc(a.documento):''}</div><div style="font-size:9.5px">${esc(ETAPA_ASS[a.etapa])} · ${fmtDH(a.assinado_em)}${a.lat?` · GPS ${a.lat.toFixed(4)},${a.lng.toFixed(4)}`:''}</div></div>`).join('') : '<p style="color:#888">Sem assinatura.</p>';
const docImgs = fs => fs.length ? `<div class="fts">${fs.map(f => `<img src="${urlFoto(f)}">`).join('')}</div>` : '';

function docProposta(m){
  const o = calcOrcamento(m); const cfg = config();
  const val = new Date(); val.setDate(val.getDate() + Number(cfg.validade_orcamento_dias||15));
  return `<div class="doc">${docCab('Proposta de mudança', m)}${docDadosMudanca(m)}
  <h2>Itens levantados na vistoria</h2><table><thead><tr><th>Cômodo</th><th>Item</th><th>Qtd</th><th>m³</th></tr></thead><tbody>${o.itens.map(i => `<tr><td>${esc(i.comodo||'')}</td><td>${esc(i.item)}${i.especial?' (especial)':''}</td><td>${i.quantidade}</td><td>${num(i.quantidade*i.m3_unit,2)}</td></tr>`).join('')}</tbody></table>
  <h2>Dimensionamento</h2><div class="g2"><div><b>Cubagem total:</b> ${num(o.m3,2)} m³</div><div><b>Veículo:</b> ${esc(o.veic.nome)}</div><div><b>Equipe:</b> ${o.ajud} ajudantes</div><div><b>Itens especiais:</b> ${o.especiais}</div></div>
  <h2>Investimento</h2><table><tbody><tr><td style="font-size:14px"><b>Valor total da mudança</b></td><td style="font-size:16px;text-align:right"><b>${moeda(m.valor_orcado || o.total)}</b></td></tr></tbody></table>
  <p>Inclui: embalagem e proteção dos móveis, desmontagem e montagem, etiquetagem com QR code, inventário fotográfico de cada volume, vistoria do imóvel de origem e destino, acompanhamento online pelo portal do cliente e laudo final assinado.</p>
  <p><b>Validade da proposta:</b> ${val.toLocaleDateString('pt-BR')}.</p>
  <h2>Aprovação</h2>${docAss(lista('assinaturas', a => a.mudanca_id === m.id && a.etapa === 'orcamento'))}
  ${docRod()}</div>`;
}
function docContrato(m){
  const cfg = config(); const cli = pega('clientes', m.cliente_id) || {}; const o = calcOrcamento(m);
  const valor = m.valor_aprovado ?? m.valor_orcado ?? o.total;
  const porComodo = {}; o.itens.forEach(i => (porComodo[i.comodo||'Geral'] ||= []).push(`${i.quantidade}× ${i.item}`));
  const clausulas = String(cfg.contrato_clausulas || CLAUSULAS_PADRAO).replace(/\{multa\}/g, cfg.contrato_multa_cancelamento ?? 20)
    .split(/\n+/).filter(x => x.trim()).map(p => { const mm = p.match(/^(\d+\.\s*[A-ZÇÃÕÁÉÍÓÚÂÊÔ \-]+\.)(.*)$/); return `<p style="margin:0 0 6px;text-align:justify">${mm ? `<b>${esc(mm[1])}</b>${esc(mm[2])}` : esc(p)}</p>`; }).join('');
  const ass = lista('assinaturas', a => a.mudanca_id === m.id && a.etapa === 'orcamento');
  return `<div class="doc">${docCab('Contrato de prestação de serviços de mudança', m)}
  <h2>Partes</h2>
  <p style="margin:0 0 4px"><b>CONTRATADA:</b> ${esc(cfg.empresa_nome)}${cfg.empresa_cnpj?', CNPJ '+esc(cfg.empresa_cnpj):''}${cfg.empresa_endereco?', '+esc(cfg.empresa_endereco):''} · ${esc(cfg.empresa_fone)} · ${esc(cfg.empresa_email)}</p>
  <p style="margin:0"><b>CONTRATANTE:</b> ${esc(cli.nome||'')}${cli.documento?', CPF/CNPJ '+esc(cli.documento):''}${cli.telefone?' · '+esc(cli.telefone):''}${cli.email?' · '+esc(cli.email):''}</p>
  <h2>Serviço</h2>${docDadosMudanca(m)}
  <div class="g2" style="margin-top:4px"><div><b>Cubagem estimada:</b> ${num(o.m3,2)} m³ · <b>Veículo:</b> ${esc(o.veic.nome)}</div><div><b>Equipe prevista:</b> ${o.ajud} ajudantes${m.seguro_valor_declarado?` · <b>Valor declarado:</b> ${moeda(m.seguro_valor_declarado)}`:''}</div></div>
  ${o.itens.length ? `<p style="margin:6px 0 0;font-size:10.5px"><b>Bens (vistoria de orçamento):</b> ${Object.entries(porComodo).map(([c, its]) => `<b>${esc(c)}:</b> ${esc(its.join(', '))}`).join(' · ')}</p>` : ''}
  <h2>Valores</h2><table><tbody><tr><td style="width:40%"><b>Valor total</b></td><td style="font-size:14px"><b>${moeda(valor)}</b></td></tr><tr><td><b>Condições de pagamento</b></td><td>${esc(m.condicoes_pagamento || cfg.contrato_pagamento_padrao)}</td></tr></tbody></table>
  <h2>Cláusulas</h2>${clausulas}
  <p style="margin-top:10px">E, por estarem de acordo, as partes assinam eletronicamente este contrato.</p>
  <h2>Assinaturas</h2>
  ${ass.length ? docAss(ass) : `<div style="display:flex;gap:40px;margin-top:34px"><div style="flex:1;border-top:1px solid #333;padding-top:4px;text-align:center">CONTRATANTE — ${esc(cli.nome||'')}</div><div style="flex:1;border-top:1px solid #333;padding-top:4px;text-align:center">CONTRATADA — ${esc(cfg.empresa_nome)}</div></div>`}
  ${ass.length ? `<div style="margin-top:22px;width:46%;border-top:1px solid #333;padding-top:4px;text-align:center">CONTRATADA — ${esc(cfg.empresa_nome)}</div>` : ''}
  ${docRod()}</div>`;
}
function docEtiquetas(m, vs){
  const cli = pega('clientes', m.cliente_id);
  const etq = v => `<div class="etq"><div class="qr">${qrSVG(conteudoQR(v))}</div><div style="display:flex;flex-direction:column;min-width:0;flex:1">
    <div class="cod">${esc(m.codigo)} · ${esc((cli?.nome||'').split(' ')[0])}</div><div class="n">${v.numero}<span style="font-size:16px;color:#666">/${resumoVolumes(m.id).total}</span></div>
    <div class="dest">→ ${esc(v.comodo_destino||'')}</div><div style="font-size:10.5px;color:#333;overflow:hidden;max-height:28px">${esc(v.descricao||VOL_TIPO[v.tipo])}</div>
    ${['fragil','eletro','especial'].includes(v.tipo) ? `<div><span class="fr">${v.tipo==='fragil'?'FRÁGIL':v.tipo==='eletro'?'ELETRÔNICO':'ESPECIAL'}</span></div>` : ''}
    <div class="mm">My moving Transportes</div></div></div>`;
  let html = '';
  for (let i = 0; i < vs.length; i += 10) html += `<div class="etiquetas ${i?'quebra':''}" style="${i?'page-break-before:always':''}">${vs.slice(i, i+10).map(etq).join('')}</div>`;
  return html || '<p>Nenhum volume.</p>';
}
function docPackingList(m){
  const r = resumoVolumes(m.id); const cli = pega('clientes', m.cliente_id) || {};
  return `<div class="doc">${docCab('Packing List / Lista de Embalagem', m)}
  <div class="g2"><div><b>Shipper / Remetente:</b> ${esc(cli.nome||'')}</div><div><b>Document:</b> ${esc(cli.documento||'')}</div><div><b>From / Origem:</b> ${esc(m.origem_endereco||'')}</div><div><b>To / Destino:</b> ${esc(m.destino_endereco||'')}</div></div>
  <table style="margin-top:8px"><thead><tr><th>Nº</th><th>Tipo / Type</th><th>Descrição / Description</th><th>Cômodo / Room</th><th>Condição / Condition</th><th>Valor / Value (BRL)</th></tr></thead><tbody>
  ${r.lista.map(v => `<tr><td>${v.numero}</td><td>${VOL_TIPO[v.tipo]}</td><td>${esc(v.descricao||'')}</td><td>${esc(v.comodo_origem||'')}</td><td>${(v.avarias_previas||[]).length ? esc(v.avarias_previas.map(a => a.tipo).join(', ')) : 'Bom / Good'}</td><td style="text-align:right">${v.valor_declarado ? num(v.valor_declarado,2) : '—'}</td></tr>`).join('')}
  <tr><td colspan="5"><b>Total: ${r.total} volumes / packages</b></td><td style="text-align:right"><b>${num(soma(r.lista, v => v.valor_declarado),2)}</b></td></tr></tbody></table>
  <p style="margin-top:14px">Declaro que os bens acima são de uso pessoal e doméstico, usados, sem finalidade comercial. / I declare that the goods listed above are used personal and household effects, not intended for sale.</p>
  <div style="margin-top:30px;border-top:1px solid #333;width:280px;padding-top:4px">Assinatura / Signature</div>${docRod()}</div>`;
}
function docLaudo(m){
  const r = resumoVolumes(m.id);
  const ass = lista('assinaturas', a => a.mudanca_id === m.id).sort((a,b) => a.assinado_em < b.assinado_em ? -1 : 1);
  const vist = lista('vistorias_imovel', v => v.mudanca_id === m.id);
  const ocs = lista('ocorrencias', o => o.mudanca_id === m.id);
  const evs = lista('eventos', e => e.mudanca_id === m.id && e.publico).sort((a,b) => a.created_at < b.created_at ? -1 : 1);
  const cam = pega('caminhoes', m.caminhao_id);
  const secVist = (l) => { const vs = vist.filter(v => v.local === l); if (!vs.length) return `<p style="color:#888">Vistoria do imóvel de ${l} não realizada.</p>`;
    return `<table><thead><tr><th style="width:24%">Área</th><th style="width:9%">Momento</th><th style="width:12%">Condição</th><th>Observação e fotos</th></tr></thead><tbody>${vs.sort((a,b) => (a.area+a.momento).localeCompare(b.area+b.momento)).map(v => `<tr><td>${esc(v.area)}</td><td>${v.momento}</td><td>${v.condicao==='ok'?'Sem danos':v.condicao==='dano_previo'?'Dano prévio':'Dano novo'}</td><td>${esc(v.observacao||'')}${docImgs(fotosDe('vistoria', v.id))}</td></tr>`).join('')}</tbody></table>`; };
  return `<div class="doc">${docCab('Laudo de vistoria da mudança', m)}${docDadosMudanca(m)}
  <div class="g2" style="margin-top:4px"><div><b>Situação:</b> ${STATUS_NOME[m.status]}</div><div><b>Veículo:</b> ${cam ? esc(cam.placa+' '+(cam.modelo||'')) : '—'} · <b>Equipe:</b> ${(m.equipe||[]).map(p => esc(p.nome)).join(', ')||'—'}</div>
  <div><b>Volumes:</b> ${r.total} · entregues ${r.entregue} · armazenados ${r.armazenado} · extraviados ${r.extraviado}</div><div><b>Cubagem:</b> ${num(m.cubagem_m3||0,2)} m³${m.seguro_valor_declarado?` · <b>Valor declarado:</b> ${moeda(m.seguro_valor_declarado)}`:''}</div></div>
  <h2>1. Inventário dos volumes</h2>
  <table><thead><tr><th>Nº</th><th>Tipo</th><th>Descrição</th><th>Origem → Destino</th><th>Avarias prévias</th><th>Carregado</th><th>Entregue</th><th>Situação</th></tr></thead><tbody>
  ${r.lista.map(v => `<tr><td><b>${v.numero}</b></td><td>${VOL_TIPO[v.tipo]}</td><td>${esc(v.descricao||'')}</td><td>${esc(v.comodo_origem||'')} → ${esc(v.comodo_destino||'')}</td><td>${(v.avarias_previas||[]).map(a => esc(a.tipo+(a.local?' ('+a.local+')':''))).join(', ')||'—'}</td><td>${v.carregado_em?fmtDH(v.carregado_em):'—'}</td><td>${v.entregue_em?fmtDH(v.entregue_em):'—'}</td><td>${VOL_STATUS[v.status]}</td></tr>`).join('')}</tbody></table>
  <h2>2. Registro fotográfico dos volumes</h2>
  ${r.lista.filter(v => fotosDe('volume', v.id).length).map(v => `<div style="margin-bottom:6px;page-break-inside:avoid"><b>Volume ${v.numero}</b> — ${esc(v.descricao||VOL_TIPO[v.tipo])}${docImgs(fotosDe('volume', v.id))}</div>`).join('') || '<p style="color:#888">Sem fotos.</p>'}
  <h2>3. Vistoria do imóvel de origem</h2>${secVist('origem')}
  <h2>4. Vistoria do imóvel de destino</h2>${secVist('destino')}
  <h2>5. Ocorrências</h2>${ocs.length ? `<table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Situação / resolução</th></tr></thead><tbody>${ocs.map(o => `<tr><td>${fmtDH(o.created_at)}</td><td>${OCOR_TIPO[o.tipo]}${o.volume_id?' — vol. '+(pega('volumes', o.volume_id)?.numero||''):''}</td><td>${esc(o.descricao)}${docImgs(fotosDe('ocorrencia', o.id))}</td><td>${OCOR_STATUS[o.status]}${o.responsavel?' · resp.: '+esc(o.responsavel):''}${o.valor_indenizacao?' · '+moeda(o.valor_indenizacao):''}${o.resolucao?'<br>'+esc(o.resolucao):''}</td></tr>`).join('')}</tbody></table>` : '<p>Nenhuma ocorrência registrada.</p>'}
  <h2>6. Linha do tempo</h2><table><tbody>${evs.map(e => `<tr><td style="width:120px">${fmtDH(e.created_at)}</td><td>${esc(e.descricao)}</td></tr>`).join('')}</tbody></table>
  <h2>7. Assinaturas</h2><p style="font-size:10.5px">${esc(config().termo_entrega)}</p>${docAss(ass)}
  ${docRod()}</div>`;
}
