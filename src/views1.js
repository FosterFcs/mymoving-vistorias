/* =====================================================================
   Estrutura, rotas, login, painel, mudanças, resumo e orçamento
   ===================================================================== */
const NAV = [
  ['#/inicio','Início','casa'],['#/mudancas','Mudanças','caixa'],['#/escanear','Escanear','scan'],
  ['#/guarda','Guarda-móveis','deposito'],['#/relatorios','Relatórios','grafico'],
  ['#/cadastros','Cadastros','pessoas'],['#/config','Configurações','engrenagem']
];
function moldura(){
  const r = $('#raiz');
  r.innerHTML = `
  <header class="topo">
    <a class="marca" href="#/inicio">${LOGO}<div><b>My moving</b><span>Vistorias</span></div></a>
    <div class="esp"></div>
    <button class="sync" id="sync" title="Sincronizar agora"></button>
  </header>
  <div class="app">
    <nav class="lateral" id="lateral"></nav>
    <main id="conteudo"></main>
  </div>
  <nav class="nav-baixo" id="navbaixo"></nav>`;
  $('#sync').onclick = () => MODO_DEMO ? toast('Modo demonstração: dados ficam só neste aparelho') : sincronizar(true);
  atualizaSyncUI();
}
function desenharNav(hash){
  const at = h => hash.startsWith(h) || (h==='#/mudancas' && hash.startsWith('#/mudanca'));
  const itens = NAV.filter(n => ehGestor() || !['#/relatorios','#/config'].includes(n[0]));
  $('#lateral').innerHTML = itens.map((n,i) => `${i===3?'<div class="grupo">Gestão</div>':''}<a href="${n[0]}" class="${at(n[0])?'ativo':''}">${ic(n[2])}${n[1]}</a>`).join('')
    + `<div class="grupo">${esc(PERFIL?.nome||'')}</div><a href="#/sair">${ic('sair')}Sair</a>`;
  const baixo = [NAV[0],NAV[1],NAV[2],NAV[3],['#/mais','Mais','mais']];
  $('#navbaixo').innerHTML = baixo.map(n => n[0]==='#/escanear'
    ? `<a href="${n[0]}" class="scan"><span class="bola">${ic('scan')}</span></a>`
    : `<a href="${n[0]}" class="${at(n[0]) || (n[0]==='#/mais' && /#\/(relatorios|cadastros|config|mais)/.test(hash))?'ativo':''}">${ic(n[2])}<span>${n[0]==='#/guarda'?'Guarda':n[1]}</span></a>`).join('');
}
function rodapeDev(){ return `<footer class="rodape-dev">${rodapeDevHTML(false)}</footer>`; }

const ROTAS = [
  [/^#\/inicio$/, vInicio], [/^#\/mudancas$/, vMudancas], [/^#\/mudanca\/nova$/, vMudancaNova],
  [/^#\/mudanca\/([\w-]+)(?:\/(\w+))?$/, vMudanca], [/^#\/escanear$/, vEscanear],
  [/^#\/guarda$/, vGuarda], [/^#\/guarda\/([\w-]+)$/, vGuardaDet], [/^#\/relatorios$/, vRelatorios],
  [/^#\/cadastros(?:\/(\w+))?$/, vCadastros], [/^#\/config$/, vConfig], [/^#\/mais$/, vMais], [/^#\/sair$/, vSair]
];
let ROTA_ATUAL = '';
async function render(){
  if (!PERFIL) return;
  if (!$('#conteudo')) moldura();
  const hash = location.hash || '#/inicio';
  if (ROTA_ATUAL !== hash && SCANNER.ativo) await pararScanner();
  const trocou = ROTA_ATUAL !== hash; ROTA_ATUAL = hash;
  desenharNav(hash);
  const c = $('#conteudo');
  for (const [re, fn] of ROTAS) { const m = hash.match(re); if (m) {
    try { await fn(c, ...m.slice(1)); } catch (e) { console.error(e); c.innerHTML = `<div class="alerta-box verm">Erro ao abrir a tela: ${esc(e.message)}</div>`; }
    c.insertAdjacentHTML('beforeend', rodapeDev());
    if (trocou) window.scrollTo(0, 0);
    return; } }
  location.hash = '#/inicio';
}
window.addEventListener('hashchange', render);

/* ---------------- login ---------------- */
function telaLogin(msg){
  const tem = !!conexao();
  $('#raiz').innerHTML = `<div class="tela-cheia"><div class="caixa">
    <div class="logo-grande">${LOGO}<div><b>My moving</b><span>Transportes · Vistorias</span></div></div>
    ${msg ? `<div class="alerta-box amb small">${esc(msg)}</div>` : ''}
    ${tem ? `<form id="flogin">
      <label class="campo"><span>E-mail</span><input type="email" name="email" required autocomplete="username"></label>
      <label class="campo"><span>Senha</span><input type="password" name="senha" required autocomplete="current-password" minlength="6"></label>
      <button class="btn prim bloco">Entrar</button>
      <div class="acoes" style="justify-content:space-between;margin-top:12px"><a href="#" id="lcad" class="small">Primeiro acesso / criar conta</a><a href="#" id="lrec" class="small">Esqueci a senha</a></div>
    </form>` : `<p class="small muted">Nenhum servidor configurado. Você pode explorar o sistema em modo demonstração (dados ficam só neste aparelho) ou conectar ao Supabase da empresa.</p>
      <button class="btn prim bloco" id="bdemo">Entrar em modo demonstração</button>`}
    <div style="margin-top:14px;text-align:center"><a href="#" id="lcon" class="small muted">${tem?'Alterar conexão do servidor':'Conectar ao servidor'}</a></div>
  </div><footer class="rodape-dev">${rodapeDevHTML(false)}</footer></div>`;
  $('#lcon').onclick = e => { e.preventDefault(); modalConexao(); };
  if (!tem) { $('#bdemo').onclick = entrarDemo; return; }
  $('#flogin').onsubmit = async e => {
    e.preventDefault(); const d = form2obj(e.target);
    const { error } = await SB.auth.signInWithPassword({ email: d.email, password: d.senha });
    if (error) toast(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message, 'erro');
  };
  $('#lcad').onclick = e => { e.preventDefault();
    modal('Criar conta', `<form><label class="campo"><span>Nome</span><input name="nome" required></label><label class="campo"><span>E-mail</span><input type="email" name="email" required></label><label class="campo"><span>Senha (mín. 6)</span><input type="password" name="senha" minlength="6" required></label><p class="small muted">O primeiro usuário vira administrador. Os demais aguardam liberação do administrador.</p><button class="btn prim bloco">Criar conta</button></form>`, (c, fechar) => {
      $('form', c).onsubmit = async ev => { ev.preventDefault(); const d = form2obj(ev.target);
        const { error } = await SB.auth.signUp({ email: d.email, password: d.senha, options: { data: { nome: d.nome } } });
        if (error) return toast(error.message, 'erro'); fechar(); toast('Conta criada. Se pedido, confirme pelo e-mail.', 'ok'); };
    }); };
  $('#lrec').onclick = async e => { e.preventDefault(); const em = $('[name=email]').value; if (!em) return toast('Digite seu e-mail primeiro', 'erro');
    const { error } = await SB.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
    toast(error ? error.message : 'Enviamos um link para seu e-mail', error ? 'erro' : 'ok'); };
}
function modalConexao(){
  const c0 = conexao() || { url:'', key:'' };
  modal('Conexão com o servidor', `<form>
    <label class="campo"><span>URL do projeto Supabase</span><input name="url" type="url" placeholder="https://xxxx.supabase.co" value="${esc(c0.url)}"></label>
    <label class="campo"><span>Chave pública (anon / publishable)</span><input name="key" value="${esc(c0.key)}"></label>
    <div class="acoes" style="justify-content:space-between"><button type="button" class="btn perigo" data-rm>Remover conexão</button><button class="btn prim">Salvar e recarregar</button></div></form>`, (c) => {
    $('form', c).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target); if (!d.url || !d.key) return toast('Preencha os dois campos', 'erro');
      if (localStorage.getItem('mm_demo') || MODO_DEMO) { for (const t of [...TABELAS, 'outbox', 'blobs', 'meta']) await IDB.limpa(t); localStorage.removeItem('mm_demo'); }
      localStorage.setItem('mm_conexao', JSON.stringify({ url: d.url.trim(), key: d.key.trim() })); location.href = location.pathname; };
    $('[data-rm]', c).onclick = async () => { if (OUT.size && !(await confirmar(`Há ${OUT.size} alteração(ões) não enviadas que serão perdidas. Remover a conexão?`, 'Remover'))) return;
      for (const t of [...TABELAS, 'outbox', 'blobs', 'meta']) await IDB.limpa(t); localStorage.removeItem('mm_conexao'); location.href = location.pathname; };
  });
}
async function vSair(){
  if (!(await confirmar(MODO_DEMO ? 'Sair do modo demonstração? Os dados de demonstração continuam no aparelho.' : (OUT.size ? `Há ${OUT.size} alteração(ões) ainda não enviadas. Elas continuam salvas neste aparelho. Sair mesmo assim?` : 'Sair da conta?'), 'Sair'))) { history.back(); return; }
  if (SB && !MODO_DEMO) await SB.auth.signOut();
  localStorage.removeItem('mm_demo'); PERFIL = null; MODO_DEMO = false; location.hash = ''; location.reload();
}

/* ---------------- início / painel ---------------- */
function cardMudanca(m){
  const r = resumoVolumes(m.id); const d = diasAte(m.data_prevista);
  const quando = d === null ? '' : d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : d < 0 ? `${fmtData(m.data_prevista)}` : `Em ${d} dias`;
  return `<a class="item" href="#/mudanca/${m.id}">
    <div class="num-vol" style="min-width:58px;font-size:14px;flex-direction:column;line-height:1.05">${m.data_prevista ? `<span>${fmtData(m.data_prevista).slice(0,5)}</span>` : '—'}</div>
    <div class="cresce"><div class="t">${esc(nomeCliente(m.cliente_id))}</div>
    <div class="s">${esc(m.codigo)} · ${TIPO_NOME[m.tipo]} · ${esc((m.destino_endereco||'').split(',')[0] || 'destino a definir')}</div>
    ${r.total ? `<div class="s">${r.total} volumes · ${r.carregado + r.entregue + r.armazenado} movimentados</div>` : ''}</div>
    <div style="text-align:right"><span class="tag ${STATUS_COR[m.status]}">${STATUS_NOME[m.status]}</span><div class="tiny muted" style="margin-top:4px">${quando}</div></div></a>`;
}
async function vInicio(c){
  const ms = lista('mudancas');
  const ativas = ms.filter(m => !['concluida','cancelada','orcamento'].includes(m.status));
  const hoje = ms.filter(m => m.data_prevista === hojeISO() && m.status !== 'cancelada');
  const semana = ms.filter(m => { const d = diasAte(m.data_prevista); return d !== null && d >= 0 && d <= 7 && m.status !== 'cancelada'; }).sort((a,b) => a.data_prevista < b.data_prevista ? -1 : 1);
  const ocAb = lista('ocorrencias', o => o.status !== 'resolvida');
  const orc = ms.filter(m => m.status === 'orcamento');
  const guarda = lista('guarda_contratos', g => g.status === 'ativo');
  const notas = ms.filter(m => m.avaliacao_nota); const media = notas.length ? soma(notas, m => m.avaliacao_nota)/notas.length : 0;
  const mesAtual = hojeISO().slice(0,7);
  const fatMes = soma(ms.filter(m => (m.data_prevista||'').startsWith(mesAtual) && !['orcamento','cancelada'].includes(m.status)), m => m.valor_aprovado ?? m.valor_orcado);
  const semVist = ativas.filter(m => !lista('vistorias_imovel', v => v.mudanca_id === m.id).length && ['embalagem','carregamento'].includes(m.status));
  const extrav = lista('volumes', v => v.status === 'extraviado');
  const saud = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  c.innerHTML = `
  <div class="cab"><div><h1>${saud}, ${esc((PERFIL.nome||'').split(' ')[0])}</h1><div class="sub">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div></div>
  <a class="btn prim" href="#/mudanca/nova">${ic('mais2')}Nova mudança</a></div>
  ${MODO_DEMO ? `<div class="alerta-box azul small">${ic('nuvem','style="width:18px;flex:none"')}<div>Você está no <b>modo demonstração</b>. Os dados são fictícios e ficam só neste aparelho. Conecte o Supabase em Configurações para usar de verdade.</div></div>` : ''}
  ${extrav.length ? `<div class="alerta-box verm small">${ic('alerta','style="width:18px;flex:none"')}<div><b>${extrav.length} volume(s) marcados como extraviados.</b> Verifique as ocorrências.</div></div>` : ''}
  ${semVist.length ? `<div class="alerta-box amb small">${ic('alerta','style="width:18px;flex:none"')}<div>${semVist.length} mudança(s) em andamento <b>sem vistoria do imóvel</b>: ${semVist.map(m => `<a href="#/mudanca/${m.id}/vistoria">${esc(m.codigo)}</a>`).join(', ')}</div></div>` : ''}
  <div class="grade g2 g4" style="margin-bottom:14px">
    <div class="kpi"><div class="v">${hoje.length}</div><div class="l">Mudanças hoje</div></div>
    <div class="kpi"><div class="v">${ativas.length}</div><div class="l">Em andamento</div></div>
    <div class="kpi ${ocAb.length?'alerta':''}"><div class="v">${ocAb.length}</div><div class="l">Ocorrências abertas</div></div>
    <div class="kpi"><div class="v">${guarda.length}</div><div class="l">Contratos de guarda ativos</div></div>
    ${ehGestor() ? `<div class="kpi"><div class="v" style="font-size:22px">${moeda(fatMes)}</div><div class="l">Faturamento previsto no mês</div></div>
    <div class="kpi"><div class="v">${orc.length}</div><div class="l">Orçamentos em aberto</div></div>
    <div class="kpi"><div class="v">${media ? num(media,1)+' ★' : '—'}</div><div class="l">Nota média (${notas.length} avaliações)</div></div>
    <div class="kpi"><div class="v">${lista('volumes').length}</div><div class="l">Volumes registrados</div></div>` : ''}
  </div>
  <div class="grade md-g2">
    <div class="card"><h3>Agenda — próximos 7 dias</h3><div class="lista">${semana.map(cardMudanca).join('') || '<div class="vazio">Nenhuma mudança agendada.</div>'}</div></div>
    <div class="card"><h3>Ocorrências abertas</h3><div class="lista">${ocAb.slice(0,8).map(o => { const m = pega('mudancas', o.mudanca_id); return `<a class="item" href="#/mudanca/${o.mudanca_id}/ocorrencias"><div class="cresce"><div class="t">${OCOR_TIPO[o.tipo]} · ${esc(m?.codigo||'')}</div><div class="s">${esc(o.descricao)}</div></div><span class="tag ${o.status==='aberta'?'verm':'amb'}">${OCOR_STATUS[o.status]}</span></a>`; }).join('') || '<div class="vazio">Nenhuma ocorrência aberta. 👍</div>'}</div></div>
  </div>`;
}

/* ---------------- lista de mudanças ---------------- */
let FILTRO_MUD = { st: 'ativas', q: '' };
async function vMudancas(c){
  c.innerHTML = `<div class="cab"><div><h1>Mudanças</h1><div class="sub">Ordens de serviço, do orçamento à entrega</div></div><a class="btn prim" href="#/mudanca/nova">${ic('mais2')}Nova</a></div>
  <input type="search" id="bq" placeholder="Buscar por cliente, código ou endereço" value="${esc(FILTRO_MUD.q)}" style="margin-bottom:10px">
  <div class="chips rolar" id="fst" style="margin-bottom:12px">${[['ativas','Ativas'],['todas','Todas'],...STATUS,['cancelada','Canceladas']].map(([k,n]) => `<span class="chip ${FILTRO_MUD.st===k?'on':''}" data-k="${k}">${n}</span>`).join('')}</div>
  <div class="card" style="padding:4px 14px"><div class="lista" id="lmud"></div></div>`;
  const desenhar = () => {
    const q = FILTRO_MUD.q.toLowerCase();
    const ms = lista('mudancas', m => (FILTRO_MUD.st === 'todas' || (FILTRO_MUD.st === 'ativas' ? !['concluida','cancelada'].includes(m.status) : m.status === FILTRO_MUD.st))
      && (!q || [m.codigo, nomeCliente(m.cliente_id), m.origem_endereco, m.destino_endereco].join(' ').toLowerCase().includes(q)))
      .sort((a,b) => (b.data_prevista||'9') < (a.data_prevista||'9') ? -1 : 1);
    $('#lmud').innerHTML = ms.map(cardMudanca).join('') || '<div class="vazio"><b>Nenhuma mudança encontrada</b>Ajuste o filtro ou cadastre uma nova.</div>';
  };
  $('#bq').oninput = debounce(e => { FILTRO_MUD.q = e.target.value; desenhar(); }, 200);
  $('#fst').onclick = e => { const k = e.target.dataset.k; if (!k) return; FILTRO_MUD.st = k; $$('#fst .chip').forEach(x => x.classList.toggle('on', x.dataset.k === k)); desenhar(); };
  desenhar();
}

/* ---------------- nova / editar mudança ---------------- */
function formMudancaHTML(m = {}){
  const clis = lista('clientes').sort((a,b) => a.nome.localeCompare(b.nome));
  return `<form id="fmud">
    <div class="card"><h3>Cliente</h3>
      <label class="campo"><span>Cliente</span><select name="cliente_id" id="selcli"><option value="">— Novo cliente —</option>${clis.map(x => `<option value="${x.id}" ${x.id===m.cliente_id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>
      <div id="novocli" class="${m.cliente_id?'hide':''}"><div class="grade md-g2">
        <label class="campo"><span>Nome do cliente</span><input name="cli_nome"></label>
        <label class="campo"><span>CPF/CNPJ</span><input name="cli_doc"></label>
        <label class="campo"><span>Telefone/WhatsApp</span><input name="cli_fone" type="tel"></label>
        <label class="campo"><span>E-mail</span><input name="cli_email" type="email"></label></div></div>
    </div>
    <div class="card"><h3>Serviço</h3>
      <div class="grade md-g2">
        <label class="campo"><span>Tipo</span><select name="tipo">${Object.entries(TIPO_NOME).map(([k,n]) => `<option value="${k}" ${m.tipo===k?'selected':''}>${n}</option>`).join('')}</select></label>
        <label class="campo"><span>Data prevista</span><input type="date" name="data_prevista" value="${esc(m.data_prevista||'')}"></label>
      </div>
      <label class="campo"><span>Endereço de origem</span><input name="origem_endereco" value="${esc(m.origem_endereco||'')}" placeholder="Rua, número, bairro, cidade"></label>
      <label class="campo"><span>Detalhes da origem</span><input name="origem_detalhes" value="${esc(m.origem_detalhes||'')}" placeholder="Andar, elevador, horário do condomínio, vaga para caminhão"></label>
      <label class="campo"><span>Endereço de destino</span><input name="destino_endereco" value="${esc(m.destino_endereco||'')}"></label>
      <label class="campo"><span>Detalhes do destino</span><input name="destino_detalhes" value="${esc(m.destino_detalhes||'')}"></label>
      <div class="grade md-g2">
        <label class="campo"><span>Distância (km)</span><input type="number" step="0.1" name="distancia_km" value="${esc(m.distancia_km??'')}"></label>
        <label class="campo"><span>Valor declarado p/ seguro (R$)</span><input type="number" step="0.01" name="seguro_valor_declarado" value="${esc(m.seguro_valor_declarado??'')}"></label>
      </div>
      <label class="campo"><span>Observações</span><textarea name="observacoes">${esc(m.observacoes||'')}</textarea></label>
    </div>
    <div class="acoes" style="margin-top:14px;justify-content:flex-end"><a class="btn" href="${m.id?'#/mudanca/'+m.id:'#/mudancas'}">Cancelar</a><button class="btn prim">${ic('check')}Salvar</button></div>
  </form>`;
}
async function salvarFormMudanca(form, base = {}){
  const d = form2obj(form);
  let cliente_id = d.cliente_id;
  if (!cliente_id) {
    if (!d.cli_nome) { toast('Informe o nome do cliente', 'erro'); return null; }
    const cli = await salvar('clientes', { nome: d.cli_nome, documento: nulo(d.cli_doc), telefone: nulo(d.cli_fone), email: nulo(d.cli_email) });
    cliente_id = cli.id;
  }
  const novo = !base.id;
  const m = await salvar('mudancas', Object.assign({}, novo ? { codigo: gerarCodigo(), status: 'orcamento', token_portal: uuid(), equipe: [], criado_por: SESSAO?.user?.id || null } : { id: base.id }, {
    cliente_id, tipo: d.tipo, data_prevista: nulo(d.data_prevista),
    origem_endereco: nulo(d.origem_endereco), origem_detalhes: nulo(d.origem_detalhes),
    destino_endereco: nulo(d.destino_endereco), destino_detalhes: nulo(d.destino_detalhes),
    distancia_km: numOuNulo(d.distancia_km), seguro_valor_declarado: numOuNulo(d.seguro_valor_declarado), observacoes: nulo(d.observacoes)
  }));
  if (novo) await evento(m.id, 'criada', 'Ordem de serviço aberta — vistoria de orçamento');
  return m;
}
async function vMudancaNova(c){
  c.innerHTML = `<div class="cab"><div><h1>Nova mudança</h1><div class="sub">Depois de salvar, faça a vistoria de orçamento (cubagem)</div></div></div>` + formMudancaHTML();
  $('#selcli').onchange = e => $('#novocli').classList.toggle('hide', !!e.target.value);
  $('#fmud').onsubmit = async e => { e.preventDefault(); const m = await salvarFormMudanca(e.target); if (m) { toast('Mudança criada', 'ok'); location.hash = `#/mudanca/${m.id}/orcamento`; } };
}

/* ---------------- detalhe da mudança ---------------- */
const ABAS = [['resumo','Resumo'],['orcamento','Orçamento'],['inventario','Inventário'],['vistoria','Vistoria do imóvel'],['carga','Carga e entrega'],['ocorrencias','Ocorrências'],['laudo','Laudo']];
async function vMudanca(c, id, aba='resumo'){
  const m = pega('mudancas', id);
  if (!m) { c.innerHTML = `<div class="vazio"><b>Mudança não encontrada</b><a href="#/mudancas">Voltar</a></div>`; return; }
  const idx = STATUS.findIndex(s => s[0] === m.status);
  const nOc = lista('ocorrencias', o => o.mudanca_id === id && o.status !== 'resolvida').length;
  c.innerHTML = `
  <div class="cab" style="margin-bottom:8px"><div><a href="#/mudancas" class="small" style="text-decoration:none">${ic('voltar','style="width:14px;vertical-align:-2px"')} Mudanças</a>
    <h1 style="margin-top:4px">${esc(nomeCliente(m.cliente_id))}</h1>
    <div class="sub">${esc(m.codigo)} · ${TIPO_NOME[m.tipo]} · ${fmtData(m.data_prevista)}</div></div>
    <span class="tag ${STATUS_COR[m.status]}" style="font-size:13px;padding:5px 12px">${STATUS_NOME[m.status]}</span></div>
  ${m.status !== 'cancelada' ? `<div class="trilho">${STATUS.map((s,i) => `<div class="p ${i<idx?'feito':i===idx?'atual':''}">${s[1]}</div>`).join('')}</div>` : ''}
  <nav class="abas" style="margin-top:10px">${ABAS.map(([k,n]) => `<a href="#/mudanca/${id}/${k}" class="${aba===k?'ativo':''}">${n}${k==='ocorrencias'&&nOc?` <span class="tag verm" style="padding:1px 6px">${nOc}</span>`:''}</a>`).join('')}</nav>
  <div id="aba"></div>`;
  const alvo = $('#aba');
  const centra = (sel) => { const e = $(sel); if (e) { const p = e.parentElement; p.scrollLeft = e.offsetLeft - p.offsetLeft - p.clientWidth/2 + e.clientWidth/2; } };
  centra('.trilho .atual'); centra('.abas a.ativo');
  const fn = { resumo: abaResumo, orcamento: abaOrcamento, inventario: abaInventario, vistoria: abaVistoria, carga: abaCarga, ocorrencias: abaOcorrencias, laudo: abaLaudo }[aba] || abaResumo;
  await fn(alvo, m);
}

/* ----- avanço de etapa ----- */
async function avancarStatus(m){
  const idx = STATUS.findIndex(s => s[0] === m.status); const prox = STATUS[idx+1]; if (!prox) return;
  const r = resumoVolumes(m.id);
  const ass = e => lista('assinaturas', a => a.mudanca_id === m.id && a.etapa === e).length;
  const avisos = [];
  if (prox[0] === 'aprovada' && !ass('orcamento')) avisos.push('O cliente ainda não assinou a aprovação do orçamento.');
  if (prox[0] === 'carregamento') { if (!r.total) avisos.push('Nenhum volume foi etiquetado no inventário.'); if (!ass('inventario')) avisos.push('O inventário ainda não foi assinado pelo cliente.');
    if (!lista('vistorias_imovel', v => v.mudanca_id === m.id && v.local === 'origem').length) avisos.push('A vistoria do imóvel de origem não foi feita.'); }
  if (prox[0] === 'transito' && r.etiquetado) avisos.push(`${r.etiquetado} volume(s) ainda não foram carregados.`);
  if (prox[0] === 'concluida') { if (r.etiquetado + r.carregado) avisos.push(`${r.etiquetado + r.carregado} volume(s) ainda não foram entregues ou armazenados.`); if (!ass('entrega')) avisos.push('O cliente ainda não assinou o recebimento.'); }
  const msg = `Avançar para <b>${prox[1]}</b>?` + (avisos.length ? `<div class="alerta-box amb small" style="margin-top:10px;display:block">${avisos.map(a => '• '+esc(a)).join('<br>')}</div>` : '');
  if (!(await confirmar(msg, avisos.length ? 'Avançar mesmo assim' : 'Avançar'))) return;
  const extra = {};
  if (prox[0] === 'aprovada' && m.valor_aprovado == null) extra.valor_aprovado = m.valor_orcado;
  await salvar('mudancas', { id: m.id, status: prox[0], ...extra });
  await evento(m.id, 'status', `Etapa: ${prox[1]}`);
  toast(`Mudança em ${prox[1]}`, 'ok'); render();
}

async function abaResumo(el, m){
  const cli = pega('clientes', m.cliente_id) || {};
  const cam = pega('caminhoes', m.caminhao_id);
  const r = resumoVolumes(m.id);
  const evs = lista('eventos', e => e.mudanca_id === m.id).sort((a,b) => a.created_at < b.created_at ? 1 : -1);
  const idx = STATUS.findIndex(s => s[0] === m.status); const prox = STATUS[idx+1];
  const parc = pega('perfis', m.parceiro_id);
  const consumo = lista('consumo_materiais', x => x.mudanca_id === m.id);
  const fone = (cli.telefone||'').replace(/\D/g,'');
  const msgWA = encodeURIComponent(`Olá${cli.nome?', '+cli.nome.split(' ')[0]:''}! Aqui é da ${config().empresa_nome}. Acompanhe sua mudança ${m.codigo} (inventário, fotos e status) por este link: ${linkPortal(m)}`);
  el.innerHTML = `
  ${m.status !== 'cancelada' && prox ? `<div class="card" style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;background:var(--escuro);color:#fff;border:0">
    <div><div class="small" style="color:#BFD8CB">Próxima etapa</div><div style="font-family:var(--fonte-t);font-size:20px">${prox[1]}</div></div>
    <button class="btn prim" id="bav">${ic('seta')}Avançar</button></div>` : ''}
  <div class="grade md-g2" style="margin-top:12px">
    <div class="card"><h3>Cliente</h3>
      <div class="dupla"><span>Nome</span><span>${esc(cli.nome||'—')}</span></div>
      <div class="dupla"><span>Documento</span><span>${esc(cli.documento||'—')}</span></div>
      <div class="dupla"><span>Telefone</span><span>${esc(cli.telefone||'—')}</span></div>
      <div class="dupla"><span>E-mail</span><span>${esc(cli.email||'—')}</span></div>
      <div class="acoes" style="margin-top:12px">
        ${fone ? `<a class="btn peq" target="_blank" rel="noopener" href="https://wa.me/55${fone}?text=${msgWA}">${ic('whats')}Enviar link do portal</a>` : ''}
        <button class="btn peq" id="bcopy">${ic('link')}Copiar link do portal</button>
      </div>
    </div>
    <div class="card"><h3>Trajeto</h3>
      <div class="small muted">Origem</div><div style="font-weight:600">${esc(m.origem_endereco||'—')}</div><div class="small muted" style="margin-bottom:8px">${esc(m.origem_detalhes||'')}</div>
      <div class="small muted">Destino</div><div style="font-weight:600">${esc(m.destino_endereco||'—')}</div><div class="small muted">${esc(m.destino_detalhes||'')}</div>
      <div class="dupla" style="margin-top:8px"><span>Distância</span><span>${m.distancia_km ? num(m.distancia_km,0)+' km' : '—'}</span></div>
    </div>
    <div class="card"><h3>Operação</h3>
      <div class="dupla"><span>Caminhão</span><span>${cam ? esc(cam.placa+' · '+(cam.modelo||'')) : '—'}</span></div>
      <div class="dupla"><span>Equipe</span><span>${(m.equipe||[]).map(p => esc(p.nome)).join(', ') || '—'}</span></div>
      <div class="dupla"><span>Frete terceirizado</span><span>${parc ? esc(parc.empresa_parceira || parc.nome) : 'Não'}</span></div>
      <div class="dupla"><span>Cubagem</span><span>${num(m.cubagem_m3||0,2)} m³</span></div>
      <div class="dupla"><span>Volumes</span><span>${r.total} (${r.comAvaria} com avaria prévia)</span></div>
      ${ehGestor() ? `<div class="dupla"><span>Valor</span><span>${moeda(m.valor_aprovado ?? m.valor_orcado)}</span></div>
      <div class="dupla"><span>Seguro (valor declarado)</span><span>${m.seguro_valor_declarado ? moeda(m.seguro_valor_declarado) : '—'}</span></div>` : ''}
      ${m.avaliacao_nota ? `<div class="dupla"><span>Avaliação do cliente</span><span>${'★'.repeat(m.avaliacao_nota)}${'☆'.repeat(5-m.avaliacao_nota)}</span></div>${m.avaliacao_comentario?`<p class="small" style="margin:6px 0 0">“${esc(m.avaliacao_comentario)}”</p>`:''}` : ''}
      <div class="acoes" style="margin-top:12px"><button class="btn peq" id="bop">${ic('caminhao')}Definir equipe e caminhão</button></div>
    </div>
    <div class="card"><h3>Materiais usados</h3>
      ${consumo.length ? `<table class="tabela"><tbody>${consumo.map(x => { const mt = pega('materiais', x.material_id); return `<tr><td>${esc(mt?.nome||'?')}</td><td class="mono" style="text-align:right">${num(x.quantidade, 0)} ${esc(mt?.unidade||'')}</td><td style="width:30px"><button class="btn peq perigo" data-delc="${x.id}" aria-label="Remover">${ic('lixo')}</button></td></tr>`; }).join('')}</tbody></table>` : '<div class="small muted">Nenhum material lançado.</div>'}
      <div class="acoes" style="margin-top:10px"><button class="btn peq" id="bmat">${ic('mais2')}Lançar material</button></div>
    </div>
  </div>
  <div class="card" style="margin-top:12px"><h3>Linha do tempo</h3>
    ${evs.length ? `<ul class="linha-tempo">${evs.map(e => `<li><div>${esc(e.descricao)} ${e.publico?'':'<span class="tag">interno</span>'}</div><div class="q">${fmtDH(e.created_at)}${e.autor?' · '+esc(e.autor):''}</div></li>`).join('')}</ul>` : '<div class="small muted">Sem eventos.</div>'}
  </div>
  <div class="acoes" style="margin-top:14px">
    <button class="btn" id="bed">${ic('caneta')}Editar dados</button>
    ${m.status !== 'cancelada' && m.status !== 'concluida' ? `<button class="btn perigo" id="bcanc">Cancelar mudança</button>` : ''}
    ${m.status === 'cancelada' && ehGestor() ? `<button class="btn" id="breab">Reabrir</button>` : ''}
  </div>`;
  $('#bav') && ($('#bav').onclick = () => avancarStatus(m));
  $('#bcopy').onclick = async () => { try { await navigator.clipboard.writeText(linkPortal(m)); toast('Link copiado', 'ok'); } catch(e){ prompt('Copie o link:', linkPortal(m)); } };
  $('#bed').onclick = () => modal('Editar mudança', formMudancaHTML(m), (cc, fechar) => {
    $('#selcli', cc).onchange = e => $('#novocli', cc).classList.toggle('hide', !!e.target.value);
    $('a.btn', cc).onclick = e => { e.preventDefault(); fechar(); };
    $('form', cc).onsubmit = async e => { e.preventDefault(); if (await salvarFormMudanca(e.target, m)) { fechar(); toast('Salvo', 'ok'); render(); } };
  });
  $('#bcanc') && ($('#bcanc').onclick = async () => { if (await confirmar('Cancelar esta mudança?', 'Cancelar mudança')) { await salvar('mudancas', { id: m.id, status: 'cancelada' }); await evento(m.id, 'status', 'Mudança cancelada'); render(); } });
  $('#breab') && ($('#breab').onclick = async () => { await salvar('mudancas', { id: m.id, status: 'orcamento' }); await evento(m.id, 'status', 'Mudança reaberta', false); render(); });
  $('#bop').onclick = () => modalOperacao(m);
  $('#bmat').onclick = () => {
    const mats = lista('materiais');
    if (!mats.length) return toast('Cadastre materiais em Cadastros', 'erro');
    modal('Lançar material', `<form><label class="campo"><span>Material</span><select name="material_id">${mats.map(x => `<option value="${x.id}">${esc(x.nome)} (${num(x.estoque,0)} ${esc(x.unidade)} em estoque)</option>`).join('')}</select></label>
      <label class="campo"><span>Quantidade</span><input type="number" step="1" min="1" name="q" required></label><button class="btn prim bloco">Lançar</button></form>`, (cc, fechar) => {
      $('form', cc).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target); const q = Number(d.q); const mt = pega('materiais', d.material_id);
        await salvar('consumo_materiais', { mudanca_id: m.id, material_id: d.material_id, quantidade: q });
        await salvar('materiais', { id: mt.id, estoque: Number(mt.estoque||0) - q });
        fechar(); render(); };
    });
  };
  $$('[data-delc]', el).forEach(b => b.onclick = async () => { const x = pega('consumo_materiais', b.dataset.delc); const mt = pega('materiais', x.material_id);
    if (mt) await salvar('materiais', { id: mt.id, estoque: Number(mt.estoque||0) + Number(x.quantidade) }); await remover('consumo_materiais', x.id); render(); });
}
function modalOperacao(m){
  const cams = lista('caminhoes', x => x.ativo !== false);
  const pessoas = lista('perfis', p => p.ativo && p.papel !== 'parceiro');
  const parcs = lista('perfis', p => p.ativo && p.papel === 'parceiro');
  const sel = new Set((m.equipe||[]).map(p => p.id));
  modal('Equipe e caminhão', `<form>
    <label class="campo"><span>Caminhão</span><select name="caminhao_id"><option value="">—</option>${cams.map(x => `<option value="${x.id}" ${x.id===m.caminhao_id?'selected':''}>${esc(x.placa)} · ${esc(x.modelo||'')} (${num(x.capacidade_m3||0,0)} m³)</option>`).join('')}</select></label>
    <span class="small" style="font-weight:600;color:var(--tinta-2)">Equipe</span>
    <div class="chips" style="margin:6px 0 14px">${pessoas.map(p => `<span class="chip ${sel.has(p.id)?'on':''}" data-p="${p.id}">${esc(p.nome)}</span>`).join('') || '<span class="small muted">Cadastre pessoas em Cadastros &gt; Equipe</span>'}</div>
    <label class="campo"><span>Nomes avulsos (ajudantes sem acesso ao sistema, separados por vírgula)</span><input name="avulsos" value="${esc((m.equipe||[]).filter(p => !p.id).map(p => p.nome).join(', '))}"></label>
    <label class="campo"><span>Frete terceirizado (parceiro)</span><select name="parceiro_id"><option value="">Não — frota própria</option>${parcs.map(p => `<option value="${p.id}" ${p.id===m.parceiro_id?'selected':''}>${esc(p.empresa_parceira||p.nome)}</option>`).join('')}</select></label>
    <button class="btn prim bloco">Salvar</button></form>`, (c, fechar) => {
    $$('[data-p]', c).forEach(ch => ch.onclick = () => ch.classList.toggle('on'));
    $('form', c).onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target);
      const equipe = $$('[data-p].on', c).map(ch => ({ id: ch.dataset.p, nome: pega('perfis', ch.dataset.p)?.nome }))
        .concat(d.avulsos.split(',').map(s => s.trim()).filter(Boolean).map(nome => ({ id: null, nome })));
      await salvar('mudancas', { id: m.id, caminhao_id: nulo(d.caminhao_id), parceiro_id: nulo(d.parceiro_id), equipe });
      await evento(m.id, 'operacao', `Equipe definida: ${equipe.map(p => p.nome).join(', ') || '—'}`, false);
      fechar(); render(); };
  });
}

/* ----- orçamento / vistoria por ambiente ----- */
let COMODO_ORC = 'Sala', GRUPO_EXTRA = '';
async function abaOrcamento(el, m){
  const o = calcOrcamento(m);
  const comodosUsados = [...new Set(o.itens.map(i => i.comodo).filter(Boolean))];
  const comodos = [...COMODOS, ...comodosUsados.filter(c => !COMODOS.includes(c))];
  if (!comodos.includes(COMODO_ORC)) comodos.push(COMODO_ORC);
  const amb = ambienteDe(COMODO_ORC);
  const doComodo = o.itens.filter(i => i.comodo === COMODO_ORC);
  const qtd = nome => doComodo.find(i => i.item.toLowerCase() === nome.toLowerCase());
  const lista1 = amb ? CATALOGO[amb] : [];
  const extras = itensExtras(amb || COMODO_ORC).filter(x => !lista1.some(y => y[0] === x[0]));
  const foraLista = doComodo.filter(i => !lista1.some(y => y[0].toLowerCase() === i.item.toLowerCase()) && !extras.some(y => y[0].toLowerCase() === i.item.toLowerCase())
    && !(GRUPO_EXTRA && CATALOGO[GRUPO_EXTRA].some(y => y[0].toLowerCase() === i.item.toLowerCase())));
  const linha = ([n, v, e], grupo) => { const it = qtd(n); const q = it ? it.quantidade : 0;
    return `<div class="item" style="padding:8px 2px"><div class="cresce"><div class="t" style="font-weight:${q?700:500}">${esc(n)} ${e?'<span class="tag amb">especial</span>':''}</div><div class="s">${num(v,2)} m³ por unidade</div></div>
    <div style="display:flex;align-items:center;gap:4px"><button class="btn peq" data-cat="${esc(n)}" data-v="${v}" data-e="${e?1:''}" data-d="-1" ${q?'':'disabled'} aria-label="Menos">−</button>
    <b class="mono" style="min-width:26px;text-align:center;${q?'color:var(--verde)':'color:var(--tinta-3)'}">${q}</b>
    <button class="btn peq ${q?'':'prim'}" data-cat="${esc(n)}" data-v="${v}" data-e="${e?1:''}" data-d="1" aria-label="Mais">+</button></div></div>`; };
  const resumoComodos = comodos.filter(c => o.itens.some(i => i.comodo === c)).map(c => [c, soma(o.itens.filter(i => i.comodo === c), i => i.quantidade), soma(o.itens.filter(i => i.comodo === c), i => i.quantidade * i.m3_unit)]);
  const assOrc = lista('assinaturas', a => a.mudanca_id === m.id && a.etapa === 'orcamento')[0];
  el.innerHTML = `
  <div class="card" style="position:sticky;top:56px;z-index:5;padding:10px 14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b>Ambiente</b><span class="small mono">${num(o.m3,2)} m³ · ${esc(o.veic.nome)}</span></div>
    <div class="chips rolar" id="ocom">${comodos.map(c => { const n = soma(o.itens.filter(i => i.comodo === c), i => i.quantidade); return `<span class="chip ${c===COMODO_ORC?'on':''}" data-c="${esc(c)}">${esc(c)}${n?` · ${n}`:''}</span>`; }).join('')}<span class="chip" data-novo="1">+ Outro ambiente</span></div>
  </div>
  <div class="grade md-g2" style="margin-top:12px">
    <div class="card" style="margin-top:0"><h3>Móveis — ${esc(COMODO_ORC)}</h3>
      ${lista1.length ? `<div class="lista">${lista1.map(x => linha(x, amb)).join('')}</div>` : '<div class="small muted">Ambiente sem lista padrão — use os grupos abaixo ou inclua os itens no campo.</div>'}
      ${extras.length ? `<div class="small" style="font-weight:700;color:var(--oliva-esc);margin-top:10px">JÁ USADOS EM OUTRAS VISTORIAS</div><div class="lista">${extras.map(x => linha(x)).join('')}</div>` : ''}
      ${foraLista.length ? `<div class="small" style="font-weight:700;color:var(--oliva-esc);margin-top:10px">INCLUÍDOS NESTA VISTORIA</div><div class="lista">${foraLista.map(i => linha([i.item, i.m3_unit, i.especial])).join('')}</div>` : ''}
      <div class="chips" style="margin-top:12px">${['Caixas','Especiais'].map(g => `<span class="chip ${GRUPO_EXTRA===g?'on':''}" data-g="${g}">${g==='Caixas'?'Caixas':'Itens especiais'}</span>`).join('')}</div>
      ${GRUPO_EXTRA ? `<div class="lista" style="margin-top:6px">${CATALOGO[GRUPO_EXTRA].map(x => linha(x, GRUPO_EXTRA)).join('')}</div>` : ''}
      <form id="olivre" style="margin-top:14px;border-top:1px dashed var(--linha);padding-top:12px">
        <div class="small" style="font-weight:700;margin-bottom:6px">Não está na lista? Inclua aqui</div>
        <div class="grade" style="grid-template-columns:1fr 90px 70px;gap:6px"><input name="item" placeholder="Ex.: Baú antigo de madeira" required><input name="m3" type="number" step="0.01" min="0" placeholder="m³"><input name="q" type="number" min="1" value="1" aria-label="Quantidade"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="esp"> Item especial (frágil/valioso)</label><button class="btn prim peq">${ic('mais2')}Incluir</button></div>
        <div class="tiny muted" style="margin-top:4px">Sem m³? Deixe vazio que entra 0,30 m³ como estimativa. O item passa a aparecer nas próximas vistorias deste ambiente.</div>
      </form>
    </div>
    <div>
      <div class="card" style="margin-top:0"><h3>Dimensionamento</h3>
        <div class="dupla"><span>Cubagem total</span><span class="mono">${num(o.m3,2)} m³</span></div>
        <div class="dupla"><span>Veículo sugerido</span><span>${esc(o.veic.nome)}</span></div>
        <div class="dupla"><span>Ajudantes</span><span>${o.ajud}</span></div>
        <div class="dupla"><span>Itens especiais</span><span>${o.especiais}</span></div>
        <div class="dupla"><span>Caixas previstas</span><span>${o.caixas}</span></div>
        ${resumoComodos.length ? `<table class="tabela" style="margin-top:10px"><thead><tr><th>Ambiente</th><th style="text-align:right">Itens</th><th style="text-align:right">m³</th></tr></thead><tbody>${resumoComodos.map(([c,n,v]) => `<tr data-c="${esc(c)}" style="cursor:pointer"><td>${esc(c)}</td><td class="mono" style="text-align:right">${n}</td><td class="mono" style="text-align:right">${num(v,2)}</td></tr>`).join('')}</tbody></table>` : ''}
        ${ehGestor() ? `<table class="tabela" style="margin-top:12px"><tbody>${o.linhas.map(l => `<tr><td>${l[0]}<div class="tiny muted">${l[1]}</div></td><td class="mono" style="text-align:right">${moeda(l[2])}</td></tr>`).join('')}
          <tr><td><b>Total calculado</b></td><td class="mono" style="text-align:right"><b>${moeda(o.total)}</b></td></tr></tbody></table>
        <form id="ovalor" style="margin-top:10px"><div class="grade g2"><label class="campo" style="margin:0"><span>Valor proposto (R$)</span><input type="number" step="0.01" name="v" value="${esc(m.valor_orcado || Math.round(o.total))}"></label>
          <label class="campo" style="margin:0"><span>Condições de pagamento</span><input name="cp" value="${esc(m.condicoes_pagamento || config().contrato_pagamento_padrao)}"></label></div><button class="btn" style="margin-top:8px">Salvar valor e condições</button></form>` : ''}
      </div>
      <div class="card"><h3>Contrato e aprovação</h3>
        ${assOrc ? `<div class="alerta-box verde small">${ic('check','style="width:18px;flex:none"')}<div>Contrato assinado por <b>${esc(assOrc.nome)}</b> em ${fmtDH(assOrc.assinado_em)}</div></div>` : '<p class="small muted" style="margin-top:0">Ao assinar o contrato o cliente aprova o orçamento e a mudança passa para Aprovada.</p>'}
        <div class="acoes"><button class="btn" id="bprop">${ic('impressora')}Proposta</button><button class="btn" id="bcont">${ic('doc')}Contrato</button>
        ${!assOrc ? `<button class="btn prim" id="bassorc">${ic('caneta')}Cliente assina o contrato</button>` : ''}</div>
      </div>
    </div>
  </div>`;
  const recalc = async () => { const n = calcOrcamento(pega('mudancas', m.id)); await salvar('mudancas', { id: m.id, cubagem_m3: Math.round(n.m3*100)/100 }); };
  const alterar = async (nome, v, e, d) => {
    const it = lista('orcamento_itens', i => i.mudanca_id === m.id && i.comodo === COMODO_ORC && i.item.toLowerCase() === nome.toLowerCase())[0];
    if (it) { const q = it.quantidade + d; if (q <= 0) await remover('orcamento_itens', it.id); else await salvar('orcamento_itens', { id: it.id, quantidade: q }); }
    else if (d > 0) await salvar('orcamento_itens', { mudanca_id: m.id, comodo: COMODO_ORC, item: nome, quantidade: d, m3_unit: v, especial: !!e });
    await recalc(); const y = window.scrollY; await render(); window.scrollTo(0, y);
  };
  $$('[data-cat]', el).forEach(b => b.onclick = () => alterar(b.dataset.cat, Number(b.dataset.v), b.dataset.e, Number(b.dataset.d)));
  $$('#ocom [data-c], tr[data-c]', el).forEach(c => c.onclick = () => { COMODO_ORC = c.dataset.c; GRUPO_EXTRA = ''; render(); });
  $('#ocom [data-novo]').onclick = () => { const n = prompt('Nome do ambiente (ex.: Quarto 4, Edícula, Sala de TV)'); if (n && n.trim()) { COMODO_ORC = n.trim(); GRUPO_EXTRA = ''; render(); } };
  $$('[data-g]', el).forEach(c => c.onclick = () => { GRUPO_EXTRA = GRUPO_EXTRA === c.dataset.g ? '' : c.dataset.g; render(); });
  $('#olivre').onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target);
    const v = numOuNulo(d.m3); await alterar(d.item, v === null ? 0.3 : v, !!d.esp, Math.max(1, Number(d.q)||1)); toast(`${d.item} incluído em ${COMODO_ORC}`, 'ok'); };
  $('#ovalor') && ($('#ovalor').onsubmit = async e => { e.preventDefault(); const d = form2obj(e.target); await salvar('mudancas', { id: m.id, valor_orcado: numOuNulo(d.v), condicoes_pagamento: nulo(d.cp) }); toast('Salvo', 'ok'); render(); });
  $('#bprop').onclick = () => imprimir(docProposta(pega('mudancas', m.id)));
  $('#bcont').onclick = () => imprimir(docContrato(pega('mudancas', m.id)));
  $('#bassorc') && ($('#bassorc').onclick = async () => {
    let mm = pega('mudancas', m.id); const cfg = config();
    if (!mm.valor_orcado) { const t = Math.round(calcOrcamento(mm).total); if (!t) return toast('Inclua os itens da vistoria antes do contrato', 'erro'); mm = await salvar('mudancas', { id: mm.id, valor_orcado: t }); }
    const termo = `Li e aceito o Contrato de Prestação de Serviços de Mudança ${mm.codigo} com ${cfg.empresa_nome}, no valor de ${moeda(mm.valor_orcado)} (${mm.condicoes_pagamento || cfg.contrato_pagamento_padrao}), para ${fmtData(mm.data_prevista)}, incluindo as cláusulas de responsabilidade e o inventário fotográfico.`;
    if (await coletarAssinatura(mm, 'orcamento', 'Assinatura do contrato', termo, () => imprimir(docContrato(pega('mudancas', m.id))))) {
      if (mm.status === 'orcamento') { await salvar('mudancas', { id: mm.id, status: 'aprovada', valor_aprovado: mm.valor_orcado }); await evento(mm.id, 'status', 'Contrato assinado — etapa: Aprovada'); }
      toast('Contrato assinado', 'ok'); render(); }
  });
}
