'use strict';
/* =====================================================================
   My Moving Vistorias — núcleo
   Desenvolvido por Foster Tech Soluções — Wilson Foster · (24) 99209-6103 · comercial@fosterconstrucoes.com.br
   ===================================================================== */

// >>> Preencha com os dados do projeto Supabase da My Moving (ou configure
//     pela tela Configurações > Conexão). Vazio = modo demonstração local.
const CONEXAO_PADRAO = { url: '', key: '' };

const VERSAO = '1.0.0';
const DEV = {
  marca: 'Foster Tech Soluções',
  slogan: '',
  nome: 'Wilson Foster',
  fone: '(24) 99209-6103',
  email: 'comercial@fosterconstrucoes.com.br',
  wa: 'https://wa.me/5524992096103'
};

const TABELAS = ['perfis','configuracoes','clientes','caminhoes','materiais','mudancas',
  'orcamento_itens','volumes','fotos','vistorias_imovel','ocorrencias','assinaturas',
  'consumo_materiais','guarda_contratos','guarda_movimentos','eventos'];

const STATUS = [
  ['orcamento','Orçamento'],['aprovada','Aprovada'],['embalagem','Embalagem'],
  ['carregamento','Carregamento'],['transito','Em trânsito'],['entrega','Entrega'],
  ['concluida','Concluída']
];
const STATUS_NOME = Object.fromEntries([...STATUS, ['cancelada','Cancelada']]);
const STATUS_COR = {orcamento:'oliva',aprovada:'azul',embalagem:'amb',carregamento:'amb',transito:'azul',entrega:'amb',concluida:'verde',cancelada:'verm'};
const TIPO_NOME = {residencial:'Residencial',comercial:'Comercial',internacional:'Internacional',guarda:'Guarda-móveis'};
const VOL_TIPO = {caixa:'Caixa',movel:'Móvel',eletro:'Eletro/eletrônico',fragil:'Frágil',especial:'Especial'};
const VOL_STATUS = {etiquetado:'Etiquetado',carregado:'Carregado',entregue:'Entregue',armazenado:'Armazenado',extraviado:'Extraviado'};
const AVARIA_TIPOS = ['Risco','Amassado','Lascado','Quebrado','Trincado','Mancha','Rasgado','Descascado','Falta peça','Desgaste'];
const AVARIA_LOCAIS = ['Frente','Lateral','Tampo','Verso','Pé/base','Porta/gaveta','Quina','Vidro','Tela'];
const COMODOS = ['Sala','Cozinha','Quarto 1','Quarto 2','Quarto 3','Suíte','Banheiro','Escritório','Área de serviço','Varanda','Garagem','Depósito'];
const AREAS_VISTORIA = ['Portaria','Hall de entrada','Elevador — piso','Elevador — paredes/espelho','Elevador — porta/painel','Corredor','Escada','Garagem/doca','Porta do imóvel','Piso do imóvel','Paredes do imóvel','Batentes e rodapés'];
const OCOR_TIPO = {avaria:'Avaria em item',extravio:'Extravio',atraso:'Atraso',imovel:'Dano ao imóvel',outro:'Outro'};
const OCOR_STATUS = {aberta:'Aberta',em_analise:'Em análise',resolvida:'Resolvida'};
const PAPEL_NOME = {admin:'Administrador',coordenador:'Coordenador',equipe:'Equipe de campo',parceiro:'Parceiro (frete)'};

const VEICULOS = [
  {nome:'Utilitário (Fiorino/Kangoo)',m3:3},{nome:'VUC / HR',m3:12},{nome:'Caminhão 3/4',m3:22},
  {nome:'Toco baú',m3:35},{nome:'Truck baú',m3:50},{nome:'Carreta baú',m3:90}
];
// Catálogo de móveis por ambiente: [nome, m³ por unidade, especial?]
const CATALOGO = {
  'Sala':[['Sofá 2 lugares',1.2],['Sofá 3 lugares',1.8],['Sofá retrátil/canto',2.5],['Poltrona',0.6],['Rack/painel TV',0.8],['TV até 50"',0.25],['TV acima de 50"',0.4],['Home theater/caixas de som',0.15],['Mesa de centro',0.3],['Mesa lateral',0.15],['Estante',1.0],['Mesa de jantar 4 lug.',0.8],['Mesa de jantar 6+ lug.',1.2],['Cadeira',0.2],['Buffet/aparador',0.9],['Cristaleira',0.9],['Tapete',0.2],['Luminária de chão',0.15],['Cortinas/persianas',0.1]],
  'Quarto':[['Cama solteiro',0.7],['Cama casal',1.2],['Cama queen/king',1.5],['Bicama/treliche',1.0],['Colchão solteiro',0.4],['Colchão casal',0.6],['Colchão queen/king',0.8],['Guarda-roupa 2-3 portas',1.2],['Guarda-roupa 4-6 portas',2.2],['Cômoda',0.6],['Criado-mudo',0.15],['Penteadeira',0.5],['Sapateira',0.4],['Berço',0.5],['Escrivaninha',0.5],['Cadeira',0.2],['TV até 50"',0.25],['Ar-condicionado',0.2],['Espelho de chão',0.15]],
  'Cozinha':[['Geladeira',1.0],['Geladeira duplex/side',1.5],['Freezer',0.8],['Fogão',0.5],['Cooktop',0.1],['Forno elétrico',0.15],['Micro-ondas',0.1],['Lava-louças',0.4],['Armário de cozinha (módulo)',0.5],['Paneleiro',0.6],['Mesa de cozinha',0.5],['Cadeira',0.2],['Banqueta',0.15],['Adega',0.3],['Purificador/filtro',0.05]],
  'Banheiro':[['Gabinete/armário',0.3],['Espelheira',0.1],['Cesto de roupa',0.1],['Balança',0.03],['Box/acessórios',0.1]],
  'Escritório':[['Mesa de escritório',0.7],['Mesa em L',1.0],['Cadeira de escritório',0.3],['Arquivo/gaveteiro',0.5],['Estante de livros',1.0],['Computador + monitor',0.1],['Impressora',0.1],['Cofre',0.3,1]],
  'Área de serviço':[['Máquina de lavar',0.6],['Secadora',0.5],['Tanquinho',0.4],['Armário de lavanderia',0.6],['Tábua de passar',0.1],['Varal de chão',0.1],['Aspirador',0.05]],
  'Varanda':[['Mesa externa',0.6],['Cadeira externa',0.2],['Espreguiçadeira',0.6],['Rede/suporte',0.15],['Churrasqueira',0.4],['Vaso/planta',0.15],['Floreira',0.1]],
  'Garagem':[['Bicicleta',0.4],['Prateleira de aço',0.6],['Caixa de ferramentas',0.1],['Pneus (jogo)',0.4],['Cortador de grama',0.3],['Escada',0.2],['Moto',2.0,1]],
  'Depósito':[['Prateleira',0.6],['Caixa organizadora',0.08],['Mala de viagem',0.15],['Árvore de Natal',0.2],['Carrinho de bebê',0.3]],
  'Caixas':[['Caixa P',0.05],['Caixa M',0.08],['Caixa G',0.12],['Caixa de livros',0.05],['Caixa de louças',0.08],['Caixa de roupas',0.12]],
  'Especiais':[['Piano armário',1.5,1],['Piano de cauda',3.0,1],['Obra de arte/quadro',0.2,1],['Espelho grande',0.2,1],['Lustre',0.2,1],['Aquário',0.4,1],['Mármore/tampo de pedra',0.3,1],['Esteira/ergométrica',0.8]]
};
// cômodo -> lista do catálogo ("Quarto 2", "Suíte" -> Quarto)
function ambienteDe(comodo){
  const c = String(comodo||'').toLowerCase();
  if (/quarto|su[ií]te|dormit/.test(c)) return 'Quarto';
  if (/sala|estar|jantar|living/.test(c)) return 'Sala';
  if (/cozinha|copa/.test(c)) return 'Cozinha';
  if (/banh|lavabo|wc/.test(c)) return 'Banheiro';
  if (/escrit|home office|office/.test(c)) return 'Escritório';
  if (/servi[cç]o|lavand/.test(c)) return 'Área de serviço';
  if (/varanda|sacada|quintal|jardim|[aá]rea externa|terra[cç]o/.test(c)) return 'Varanda';
  if (/garag/.test(c)) return 'Garagem';
  if (/dep[oó]sito|despensa|edícula|porão/.test(c)) return 'Depósito';
  return null;
}
const RE_ELETRO = /TV|Geladeira|Freezer|Fog[ãa]o|Cooktop|Forno|Micro|M[áa]quina|Secadora|Lava-lou|Computador|Impressora|Ar-cond|Home theater|Adega|Purificador|Aspirador|Tanquinho/i;
function tipoSugerido(nome, grupo){
  if (grupo === 'Caixas' || /^Caixa/i.test(nome)) return 'caixa';
  if (grupo === 'Especiais') return 'especial';
  if (RE_ELETRO.test(nome)) return 'eletro';
  if (/espelho|vidro|lustre|cristal|quadro|lou[cç]a/i.test(nome)) return 'fragil';
  return 'movel';
}
// itens fora do catálogo já usados antes neste ambiente (aprende com o uso)
function itensExtras(amb){
  const base = new Set(Object.values(CATALOGO).flat().map(x => x[0].toLowerCase()));
  const vistos = new Map();
  for (const i of lista('orcamento_itens')) {
    if ((ambienteDe(i.comodo) || i.comodo) !== amb) continue;
    const k = i.item.toLowerCase(); if (base.has(k) || vistos.has(k)) continue;
    vistos.set(k, [i.item, Number(i.m3_unit)||0, i.especial ? 1 : 0]);
  }
  return [...vistos.values()];
}
const CLAUSULAS_PADRAO = `1. OBJETO. A CONTRATADA prestará ao CONTRATANTE o serviço de mudança descrito neste contrato: embalagem, desmontagem, carregamento, transporte, descarga e montagem dos bens listados na vistoria de orçamento e no inventário de volumes.
2. PREÇO E PAGAMENTO. O CONTRATANTE pagará o valor e nas condições indicados no quadro de valores. O atraso no pagamento sujeita o valor devido a multa de 2% e juros de 1% ao mês.
3. INVENTÁRIO E VISTORIA. Antes da retirada, cada volume é numerado, etiquetado com QR code e fotografado. Avarias já existentes são registradas e conferidas pelo CONTRATANTE, que assina o inventário. As áreas comuns dos imóveis de origem e destino também são fotografadas antes e depois do serviço.
4. RESPONSABILIDADE DA CONTRATADA. A CONTRATADA responde por perdas e danos causados aos bens durante o serviço, apurados pela comparação entre o inventário fotográfico e o estado na entrega, limitada ao valor declarado de cada volume quando informado. Não são indenizáveis as avarias pré-existentes registradas no inventário.
5. BENS NÃO TRANSPORTADOS. Dinheiro, joias, documentos, medicamentos, armas, produtos inflamáveis, perecíveis, animais e plantas sensíveis não são transportados pela CONTRATADA. Objetos de valor elevado devem ser declarados no inventário.
6. OBRIGAÇÕES DO CONTRATANTE. Esvaziar gavetas e armários quando combinado, garantir acesso aos imóveis, reservar elevador e horários junto aos condomínios, estar presente ou indicar representante na retirada e na entrega, e conferir o inventário e a entrega.
7. RECEBIMENTO E RECLAMAÇÕES. Na entrega, o CONTRATANTE confere os volumes e assina o recebimento, podendo registrar ressalvas. Avarias identificadas depois devem ser comunicadas pelo canal da CONTRATADA, com fotos, o quanto antes, sem prejuízo dos prazos do Código de Defesa do Consumidor.
8. ADIAMENTO E CANCELAMENTO. Alterações de data devem ser pedidas com 48 horas de antecedência, sujeitas à disponibilidade. Cancelamento pelo CONTRATANTE com menos de 48 horas da data prevista gera multa de {multa}% do valor do contrato, para cobrir a reserva de equipe e veículo.
9. GUARDA-MÓVEIS. Se contratada a guarda, os volumes ficam no depósito da CONTRATADA mediante mensalidade, com controle de entrada e saída por volume.
10. CASO FORTUITO. Atrasos causados por chuva forte, bloqueio de vias, restrições do condomínio ou outros eventos fora do controle da CONTRATADA não geram penalidade, devendo o serviço ser reagendado.
11. ASSINATURA ELETRÔNICA. As partes reconhecem como válidas as assinaturas eletrônicas coletadas no sistema, com registro de nome, documento, data, hora e localização.
12. FORO. Fica eleito o foro do domicílio do CONTRATANTE para resolver questões deste contrato.`;
const CONFIG_PADRAO = {
  empresa_nome:'My Moving Transportes', empresa_cnpj:'', empresa_fone:'(11) 94023-5759',
  empresa_email:'contato@mymoving.com.br', empresa_site:'www.mymoving.com.br',
  empresa_endereco:'Santana de Parnaíba — SP', google_review_url:'',
  valor_m3:120, valor_km:6, valor_ajudante:180, taxa_embalagem_m3:35, taxa_item_especial:250,
  validade_orcamento_dias:15,
  contrato_pagamento_padrao:'50% na assinatura e 50% no dia da mudança, via PIX ou cartão',
  contrato_multa_cancelamento:20,
  contrato_clausulas:CLAUSULAS_PADRAO,
  termo_inventario:'O cliente declara que conferiu o inventário acima, incluindo as avarias pré-existentes registradas em fotos, e concorda com o estado descrito de cada volume no momento da retirada.',
  termo_entrega:'O cliente declara ter recebido os volumes listados no estado registrado neste laudo, ressalvadas as ocorrências descritas.'
};

/* ---------------- utilidades ---------------- */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); }));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const agora = () => new Date().toISOString();
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const num = (v, c=0) => Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:c,maximumFractionDigits:c});
const moeda = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function fmtData(d){ if(!d) return '—'; const s = String(d); const dt = s.length===10 ? new Date(s+'T12:00:00') : new Date(s); return dt.toLocaleDateString('pt-BR'); }
function fmtDH(d){ if(!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function diasAte(d){ if(!d) return null; const a = new Date(hojeISO()+'T12:00:00'), b = new Date(d+'T12:00:00'); return Math.round((b-a)/864e5); }
const soma = (arr, f) => arr.reduce((s,x) => s + Number(f(x)||0), 0);
function debounce(fn, ms){ let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function form2obj(f){ const o = {}; new FormData(f).forEach((v,k) => { o[k] = typeof v === 'string' ? v.trim() : v; }); return o; }
function nulo(v){ return v === '' || v === undefined ? null : v; }
function numOuNulo(v){ if (v===''||v===null||v===undefined) return null; const n = Number(String(v).replace(',','.')); return isNaN(n) ? null : n; }

/* ---------------- ícones ---------------- */
const IC = {
  casa:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  caixa:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/>',
  deposito:'<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
  mais:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  grafico:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pessoas:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  engrenagem:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  mais2:'<path d="M12 5v14M5 12h14"/>',
  camera:'<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>',
  impressora:'<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><path d="M6 14h12v7H6z"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  whats:'<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8A4 4 0 0 1 10.5 11l.8-1-1-2z"/>',
  caneta:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  alerta:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  check:'<path d="M4 12l5 5L20 6"/>',
  seta:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  voltar:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  lixo:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  caminhao:'<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  sair:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
  nuvem:'<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
  doc:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>'
};
const ic = (n, extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${IC[n]||''}</svg>`;

// Cubo da marca My Moving (recriação vetorial do logotipo)
const LOGO = `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,4 92,27 92,73 50,96 8,73 8,27" fill="#A39630"/><polygon points="8,27 50,50 50,96 8,73" fill="#B4A73A"/><polygon points="50,50 92,27 92,73 50,96" fill="#968A28"/><polygon points="50,4 92,27 50,50 8,27" fill="#1F8A4C"/><polygon points="24,30 50,16 78,31 78,62 57,74 57,44" fill="#0D2A1F"/></svg>`;

/* ---------------- toast / modal ---------------- */
function toast(msg, tipo=''){
  const t = document.createElement('div'); t.className = 'toast '+tipo; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), tipo==='erro' ? 4200 : 2600);
}
let MODAL_ABERTO = 0;
function modal(titulo, html, aoAbrir){
  const f = document.createElement('div'); f.className = 'modal-fundo';
  f.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="mcab"><h2>${esc(titulo)}</h2><button class="fechar" aria-label="Fechar">×</button></div><div class="mcorpo">${html}</div></div>`;
  MODAL_ABERTO++;
  const fechar = () => { if (!f.isConnected) return; f.remove(); MODAL_ABERTO--; f.dispatchEvent(new Event('fechou')); };
  f.addEventListener('click', e => { if (e.target === f) fechar(); });
  $('.fechar', f).onclick = fechar;
  document.body.appendChild(f);
  f.fechar = fechar;
  if (aoAbrir) aoAbrir($('.mcorpo', f), fechar);
  return f;
}
function confirmar(msg, ok='Confirmar'){
  return new Promise(res => {
    let r = false;
    const m = modal('Confirmar', `<p style="margin:0 0 18px">${msg}</p><div class="acoes" style="justify-content:flex-end"><button class="btn" data-n>Cancelar</button><button class="btn prim" data-s>${esc(ok)}</button></div>`, (c, fechar) => {
      $('[data-n]', c).onclick = fechar; $('[data-s]', c).onclick = () => { r = true; fechar(); };
    });
    m.addEventListener('fechou', () => res(r));
  });
}

/* ---------------- IndexedDB ---------------- */
const IDB = {
  db: null,
  abrir(){ return new Promise((res, rej) => {
    const r = indexedDB.open('mymoving-vistorias', 1);
    r.onupgradeneeded = () => { const d = r.result;
      TABELAS.forEach(t => d.objectStoreNames.contains(t) || d.createObjectStore(t, {keyPath:'id'}));
      ['outbox'].forEach(t => d.objectStoreNames.contains(t) || d.createObjectStore(t, {keyPath:'k'}));
      ['blobs','meta'].forEach(t => d.objectStoreNames.contains(t) || d.createObjectStore(t));
    };
    r.onsuccess = () => { IDB.db = r.result; res(); }; r.onerror = () => rej(r.error);
  }); },
  req(store, mode, fn){ return new Promise((res, rej) => {
    const tx = IDB.db.transaction(store, mode); const q = fn(tx.objectStore(store));
    tx.oncomplete = () => res(q ? q.result : undefined); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  }); },
  todos: s => IDB.req(s, 'readonly', st => st.getAll()),
  pega: (s, k) => IDB.req(s, 'readonly', st => st.get(k)),
  poe: (s, v, k) => IDB.req(s, 'readwrite', st => k === undefined ? st.put(v) : st.put(v, k)),
  apaga: (s, k) => IDB.req(s, 'readwrite', st => st.delete(k)),
  limpa: s => IDB.req(s, 'readwrite', st => st.clear())
};

/* ---------------- store local (local-first) ---------------- */
const S = {}; TABELAS.forEach(t => S[t] = new Map());
const OUT = new Map();
const URLS = new Map(); // foto.id -> objectURL

async function carregarLocal(){
  for (const t of TABELAS) (await IDB.todos(t)).forEach(r => S[t].set(r.id, r));
  (await IDB.todos('outbox')).forEach(o => OUT.set(o.k, o));
}
function lista(t, f){ const out = []; for (const r of S[t].values()) if (!r.deleted && (!f || f(r))) out.push(r); return out; }
function pega(t, id){ const r = id && S[t].get(id); return r && !r.deleted ? r : null; }
async function salvar(t, obj){
  const ant = S[t].get(obj.id);
  const r = Object.assign({}, ant || {}, obj);
  if (!r.id) r.id = uuid();
  if (!ant && TEM_CREATED[t] && !r.created_at) r.created_at = agora();
  if (!ant && r.deleted === undefined) r.deleted = false;
  r.updated_at = agora();
  S[t].set(r.id, r);
  await IDB.poe(t, r);
  if (!MODO_DEMO) { const o = { k: t+':'+r.id, t, id: r.id, tent: 0 }; OUT.set(o.k, o); await IDB.poe('outbox', o); }
  agendarSync(); atualizaSyncUI();
  return r;
}
const TEM_CREATED = { mudancas: 1, ocorrencias: 1, eventos: 1 };
async function remover(t, id){ return salvar(t, { id, deleted: true }); }
async function evento(mudanca_id, tipo, descricao, publico=true){
  return salvar('eventos', { mudanca_id, tipo, descricao, publico, autor: PERFIL?.nome || '', created_at: agora() });
}
function config(){ const c = lista('configuracoes')[0]; return Object.assign({}, CONFIG_PADRAO, c?.dados || {}); }
async function salvarConfig(dados){
  const c = lista('configuracoes')[0];
  return salvar('configuracoes', { id: c?.id, dados: Object.assign({}, c?.dados || {}, dados) });
}

/* ---------------- Supabase / sessão ---------------- */
let SB = null, SESSAO = null, PERFIL = null, MODO_DEMO = false;
function conexao(){
  try { const c = JSON.parse(localStorage.getItem('mm_conexao') || 'null'); if (c && c.url && c.key) return c; } catch(e){}
  return CONEXAO_PADRAO.url && CONEXAO_PADRAO.key ? CONEXAO_PADRAO : null;
}
function urlFoto(f){
  if (!f) return '';
  if (URLS.has(f.id)) return URLS.get(f.id);
  const c = conexao();
  return c ? `${c.url.replace(/\/$/,'')}/storage/v1/object/public/fotos/${f.caminho}` : '';
}
async function prepararURLsLocais(){
  for (const f of lista('fotos')) {
    if (URLS.has(f.id)) continue;
    const b = await IDB.pega('blobs', f.id);
    if (b) URLS.set(f.id, URL.createObjectURL(b));
  }
}

/* ---------------- sincronização ---------------- */
let SYNC = { rodando:false, ultimo:null, erro:null, timer:null };
function agendarSync(ms=1200){ clearTimeout(SYNC.timer); SYNC.timer = setTimeout(sincronizar, ms); }
const limpaReg = r => { const o = {}; for (const k in r) if (k[0] !== '_') o[k] = r[k]; return o; };

async function sincronizar(manual){
  if (MODO_DEMO || !SB || !SESSAO) { atualizaSyncUI(); return; }
  if (!navigator.onLine) { atualizaSyncUI(); if (manual) toast('Sem internet — os dados ficam salvos no aparelho', 'erro'); return; }
  if (SYNC.rodando) return;
  SYNC.rodando = true; SYNC.erro = null; atualizaSyncUI();
  let mudou = false;
  try {
    // 1) envia fotos pendentes para o Storage
    for (const f of lista('fotos', f => f._pend)) {
      const b = await IDB.pega('blobs', f.id);
      if (b) {
        const { error } = await SB.storage.from('fotos').upload(f.caminho, b, { upsert: true, contentType: 'image/jpeg' });
        if (error && !/exists/i.test(error.message)) throw error;
      }
      const atual = S.fotos.get(f.id); atual._pend = false; await IDB.poe('fotos', atual);
    }
    // 2) envia alterações (ordem respeita chaves estrangeiras)
    for (const t of TABELAS) {
      const pend = [...OUT.values()].filter(o => o.t === t);
      if (!pend.length) continue;
      const snap = pend.map(o => S[t].get(o.id)).filter(r => r && !(t === 'fotos' && r._pend));
      if (!snap.length) continue;
      const marcas = new Map(snap.map(r => [r.id, r.updated_at]));
      const linhas = snap.map(limpaReg);
      const { error } = await SB.from(t).upsert(linhas, { onConflict: 'id', defaultToNull: false });
      const concluir = async id => { const k = t+':'+id; if (S[t].get(id)?.updated_at === marcas.get(id)) { OUT.delete(k); await IDB.apaga('outbox', k); } };
      if (!error) { for (const r of linhas) await concluir(r.id); }
      else {
        for (const r of linhas) {
          const { error: e } = await SB.from(t).upsert([r], { onConflict: 'id', defaultToNull: false });
          const k = t+':'+r.id;
          if (!e) await concluir(r.id);
          else { const o = OUT.get(k); if (!o) continue; o.tent = (o.tent||0)+1; o.erro = e.message;
            if (o.tent >= 5) { OUT.delete(k); await IDB.apaga('outbox', k); console.warn('Descartado após 5 tentativas', t, r.id, e.message); }
            else await IDB.poe('outbox', o);
            SYNC.erro = `${t}: ${e.message}`; }
        }
      }
    }
    // 3) recebe alterações do servidor
    for (const t of TABELAS) {
      const desde = (await IDB.pega('meta', 'pull:'+t)) || '1970-01-01T00:00:00Z';
      let maior = desde, de = 0;
      for (;;) {
        const { data, error } = await SB.from(t).select('*').gt('updated_at', desde).order('updated_at').range(de, de+999);
        if (error) throw error;
        for (const r of data) {
          if (r.updated_at > maior) maior = r.updated_at;
          if (OUT.has(t+':'+r.id)) continue;
          const loc = S[t].get(r.id);
          if (loc && loc._pend) r._pend = loc._pend;
          S[t].set(r.id, r); await IDB.poe(t, r); mudou = true;
        }
        if (data.length < 1000) break; de += 1000;
      }
      await IDB.poe('meta', maior, 'pull:'+t);
    }
    if (SESSAO) { const p = pega('perfis', SESSAO.user.id); if (p) PERFIL = p; }
    SYNC.ultimo = new Date();
    if (manual) toast('Sincronizado', 'ok');
  } catch (e) {
    console.error(e); SYNC.erro = e.message || String(e);
    if (manual) toast('Falha ao sincronizar: '+SYNC.erro, 'erro');
  } finally {
    SYNC.rodando = false; atualizaSyncUI();
    if (mudou && !MODAL_ABERTO && !SCANNER.ativo && !document.activeElement?.matches('input,textarea,select')) render();
  }
}
function atualizaSyncUI(){
  const el = $('#sync'); if (!el) return;
  const n = OUT.size;
  el.className = 'sync' + (SYNC.rodando ? ' rodando' : '') + (MODO_DEMO ? ' pend' : !navigator.onLine || SYNC.erro ? ' off' : n ? ' pend' : '');
  el.innerHTML = `<i></i>${MODO_DEMO ? 'Demonstração' : !navigator.onLine ? `Offline${n?' · '+n:''}` : SYNC.rodando ? 'Sincronizando' : n ? `${n} pendente${n>1?'s':''}` : 'Sincronizado'}`;
}
window.addEventListener('online', () => { atualizaSyncUI(); agendarSync(300); });
window.addEventListener('offline', atualizaSyncUI);
setInterval(() => { if (!MODO_DEMO && SESSAO) sincronizar(); }, 60000);

/* ---------------- fotos ---------------- */
async function comprimirFoto(arquivo, carimbo){
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(arquivo); });
  const max = 1600; let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > max) { const k = max / Math.max(w, h); w = Math.round(w*k); h = Math.round(h*k); }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  // carimbo de data/hora — prova de quando a foto foi tirada
  const fs = Math.max(14, Math.round(w/45)); const faixa = fs*1.9;
  cx.fillStyle = 'rgba(14,59,44,.78)'; cx.fillRect(0, h-faixa, w, faixa);
  cx.fillStyle = '#fff'; cx.font = `600 ${fs}px Archivo, sans-serif`; cx.textBaseline = 'middle';
  cx.fillText(`${carimbo} · ${new Date().toLocaleString('pt-BR')}`, fs*.7, h-faixa/2);
  cx.fillStyle = '#D9CD5A'; cx.textAlign = 'right'; cx.fillText('My Moving', w-fs*.7, h-faixa/2);
  return await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.78));
}
function geo(){
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({lat:p.coords.latitude,lng:p.coords.longitude}), () => res(null), {timeout:4000,maximumAge:120000});
  });
}
async function adicionarFoto(arquivo, { mudanca_id, ref_tipo, ref_id, legenda, carimbo }){
  const blob = await comprimirFoto(arquivo, carimbo || '');
  const id = uuid();
  const caminho = `${mudanca_id}/${ref_tipo}/${id}.jpg`;
  await IDB.poe('blobs', blob, id);
  URLS.set(id, URL.createObjectURL(blob));
  const g = await geo();
  return salvar('fotos', { id, mudanca_id, ref_tipo, ref_id, caminho, legenda: legenda || null, tirada_em: agora(), lat: g?.lat ?? null, lng: g?.lng ?? null, _pend: !MODO_DEMO });
}
function fotosDe(ref_tipo, ref_id){ return lista('fotos', f => f.ref_tipo === ref_tipo && f.ref_id === ref_id).sort((a,b) => a.tirada_em < b.tirada_em ? -1 : 1); }
function htmlFotos(fotos, { editar=false, addAttr='' } = {}){
  return `<div class="fotos">${fotos.map(f => `<div class="f" style="background-image:url('${urlFoto(f)}')" data-ver-foto="${f.id}">${editar ? `<button type="button" data-del-foto="${f.id}" aria-label="Remover foto">×</button>` : ''}</div>`).join('')}
  ${editar ? `<label class="add">${ic('camera')}Foto<input type="file" accept="image/*" capture="environment" multiple ${addAttr}></label>` : ''}</div>`;
}
document.addEventListener('click', async e => {
  const v = e.target.closest('[data-ver-foto]');
  const d = e.target.closest('[data-del-foto]');
  if (d) { e.stopPropagation(); if (await confirmar('Remover esta foto?','Remover')) { await remover('fotos', d.dataset.delFoto); render(); } return; }
  if (v) { const f = pega('fotos', v.dataset.verFoto); if (!f) return;
    modal(f.legenda || 'Foto', `<img src="${urlFoto(f)}" style="width:100%;border-radius:10px"><p class="small muted">Tirada em ${fmtDH(f.tirada_em)}${f.lat ? ` · GPS ${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}` : ''}</p>`); }
});

/* ---------------- assinatura ---------------- */
function padAssinatura(canvas){
  const r = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
  canvas.width = r.width*dpr; canvas.height = r.height*dpr;
  const cx = canvas.getContext('2d'); cx.scale(dpr, dpr); cx.lineWidth = 2.4; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#10231B';
  let des = false, usado = false, ult = null;
  const pos = e => { const b = canvas.getBoundingClientRect(); return [e.clientX-b.left, e.clientY-b.top]; };
  canvas.onpointerdown = e => { des = true; usado = true; ult = pos(e); canvas.setPointerCapture(e.pointerId); };
  canvas.onpointermove = e => { if (!des) return; const p = pos(e); cx.beginPath(); cx.moveTo(...ult); cx.lineTo(...p); cx.stroke(); ult = p; };
  canvas.onpointerup = canvas.onpointercancel = () => { des = false; };
  return { limpar(){ cx.clearRect(0,0,canvas.width,canvas.height); usado = false; }, usado: () => usado, png: () => canvas.toDataURL('image/png') };
}
function coletarAssinatura(mudanca, etapa, titulo, termo, verDoc){
  return new Promise(res => {
    const cli = pega('clientes', mudanca.cliente_id);
    let ok = false;
    const m = modal(titulo, `
      ${termo ? `<div class="alerta-box azul small" style="display:block">${esc(termo)}${verDoc ? `<div style="margin-top:8px"><button type="button" class="btn peq" data-verdoc>${ic('doc')}Ler o contrato completo</button></div>` : ''}</div>` : ''}
      <form>
        <div class="grade g2"><label class="campo"><span>Nome de quem assina</span><input name="nome" required value="${esc(cli?.nome||'')}"></label>
        <label class="campo"><span>CPF/RG (opcional)</span><input name="documento" value="${esc(cli?.documento||'')}"></label></div>
        <span class="small muted">Assine no quadro abaixo</span>
        <canvas class="ass-pad"></canvas>
        <div class="acoes" style="margin-top:12px;justify-content:space-between"><button type="button" class="btn" data-limpar>Limpar</button><button class="btn prim">${ic('check')}Confirmar assinatura</button></div>
      </form>`, (c, fechar) => {
        const pad = padAssinatura($('canvas', c));
        $('[data-limpar]', c).onclick = () => pad.limpar();
        if (verDoc) $('[data-verdoc]', c).onclick = verDoc;
        $('form', c).onsubmit = async e => {
          e.preventDefault();
          if (!pad.usado()) return toast('Faça a assinatura no quadro', 'erro');
          const d = form2obj(e.target); const g = await geo();
          await salvar('assinaturas', { mudanca_id: mudanca.id, etapa, nome: d.nome, documento: nulo(d.documento), imagem: pad.png(), lat: g?.lat ?? null, lng: g?.lng ?? null, assinado_em: agora() });
          await evento(mudanca.id, 'assinatura', `${d.nome} assinou: ${ETAPA_ASS[etapa]}`);
          ok = true; fechar();
        };
      });
    m.addEventListener('fechou', () => res(ok));
  });
}
const ETAPA_ASS = { orcamento:'contrato de prestação de serviços', inventario:'inventário de retirada', vistoria_origem:'vistoria do imóvel de origem', entrega:'recebimento da entrega', vistoria_destino:'vistoria do imóvel de destino' };

/* ---------------- QR ---------------- */
function qrSVG(texto, cel=4){
  if (typeof qrcode === 'undefined') return `<div style="font:700 12px monospace;padding:8px;border:1px solid #999">${esc(texto)}</div>`;
  const q = qrcode(0, 'M'); q.addData(texto); q.make(); return q.createSvgTag({ cellSize: cel, margin: 1, scalable: true });
}
const conteudoQR = v => `MYMV|${v.mudanca_id}|${v.id}|${v.numero}`;
function lerConteudoQR(txt){
  const p = String(txt).trim().split('|');
  if (p[0] === 'MYMV' && p.length >= 3) return pega('volumes', p[2]);
  return null;
}
const SCANNER = { ativo: false, inst: null };
async function iniciarScanner(elId, aoLer){
  await pararScanner();
  if (typeof Html5Qrcode === 'undefined') { toast('Leitor de QR indisponível — use o número do volume', 'erro'); return false; }
  try {
    const h = new Html5Qrcode(elId, { verbose: false });
    let ultimo = '', quando = 0;
    await h.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } }, txt => {
      const t = Date.now(); if (txt === ultimo && t - quando < 2500) return; ultimo = txt; quando = t;
      if (navigator.vibrate) navigator.vibrate(60);
      aoLer(txt);
    });
    SCANNER.ativo = true; SCANNER.inst = h; return true;
  } catch (e) { toast('Não foi possível abrir a câmera: '+(e.message||e), 'erro'); return false; }
}
async function pararScanner(){
  if (SCANNER.inst) { try { await SCANNER.inst.stop(); SCANNER.inst.clear(); } catch(e){} }
  SCANNER.ativo = false; SCANNER.inst = null;
}

/* ---------------- impressão ---------------- */
function imprimir(html){
  const p = $('#print'); p.innerHTML = html;
  document.body.classList.add('imprimindo');
  const fim = () => { document.body.classList.remove('imprimindo'); p.innerHTML = ''; window.removeEventListener('afterprint', fim); };
  window.addEventListener('afterprint', fim);
  const imgs = $$('img', p).filter(i => !i.complete);
  Promise.all(imgs.map(i => new Promise(r => { i.onload = i.onerror = r; }))).then(() => setTimeout(() => window.print(), 150));
}
const rodapeDevHTML = (curto) => curto
  ? `Sistema desenvolvido por <b>${DEV.marca}</b> · ${DEV.nome} · ${DEV.fone} · ${DEV.email}`
  : `Desenvolvido por <a href="${DEV.wa}" target="_blank" rel="noopener"><b>${DEV.marca}</b></a>${DEV.slogan ? ` <span class="tiny">${DEV.slogan}</span>` : ""}<br>${DEV.nome} · <a href="${DEV.wa}" target="_blank" rel="noopener">${DEV.fone}</a> · <a href="mailto:${DEV.email}">${DEV.email}</a><br><span class="tiny">My Moving Vistorias v${VERSAO}</span>`;

/* ---------------- regras de negócio ---------------- */
function calcOrcamento(m){
  const cfg = config();
  const itens = lista('orcamento_itens', i => i.mudanca_id === m.id);
  const m3 = soma(itens, i => i.quantidade * i.m3_unit);
  const especiais = soma(itens.filter(i => i.especial), i => i.quantidade);
  const caixas = soma(itens.filter(i => /^Caixa/i.test(i.item)), i => i.quantidade);
  const veic = VEICULOS.find(v => v.m3 >= m3 * 1.15) || { nome: `${Math.ceil(m3*1.15/90)}× Carreta baú`, m3: 90 };
  const ajud = m3 <= 10 ? 2 : m3 <= 25 ? 3 : m3 <= 40 ? 4 : 4 + Math.ceil((m3-40)/15);
  const km = Number(m.distancia_km || 0);
  const emb = m._embalagem !== false;
  const linhas = [
    ['Volume transportado', `${num(m3,2)} m³ × ${moeda(cfg.valor_m3)}`, m3 * cfg.valor_m3],
    ['Deslocamento', `${num(km,0)} km × ${moeda(cfg.valor_km)}`, km * cfg.valor_km],
    ['Equipe', `${ajud} ajudantes × ${moeda(cfg.valor_ajudante)}`, ajud * cfg.valor_ajudante],
    ['Embalagem e proteção', `${num(m3,2)} m³ × ${moeda(cfg.taxa_embalagem_m3)}`, m3 * cfg.taxa_embalagem_m3],
    ['Itens especiais', `${especiais} × ${moeda(cfg.taxa_item_especial)}`, especiais * cfg.taxa_item_especial]
  ];
  return { itens, m3, especiais, caixas, veic, ajud, linhas, total: soma(linhas, l => l[2]) };
}
function resumoVolumes(mid){
  const v = lista('volumes', x => x.mudanca_id === mid);
  const c = s => v.filter(x => x.status === s).length;
  return { total: v.length, etiquetado: c('etiquetado'), carregado: c('carregado'), entregue: c('entregue'), armazenado: c('armazenado'), extraviado: c('extraviado'),
    comAvaria: v.filter(x => (x.avarias_previas||[]).length).length, lista: v.sort((a,b) => a.numero - b.numero) };
}
function proximoNumero(mid){ const v = [...S.volumes.values()].filter(x => x.mudanca_id === mid); return v.reduce((m, x) => Math.max(m, x.numero||0), 0) + 1; }
function gerarCodigo(){
  const d = new Date(); const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const r = Math.random().toString(36).slice(2,6).toUpperCase();
  return `MM${yy}${mm}-${r}`;
}
const nomeCliente = id => pega('clientes', id)?.nome || 'Cliente não informado';
const papel = () => PERFIL?.papel || 'equipe';
const ehGestor = () => ['admin','coordenador'].includes(papel());
const ehAdmin = () => papel() === 'admin';
function linkPortal(m){ const u = new URL(location.href); u.hash = ''; u.search = '?portal='+m.token_portal; return u.toString(); }
