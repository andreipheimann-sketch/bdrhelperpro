import { useState, useEffect, useRef } from "react";

// ── STORAGE — localStorage (persists across reloads) ─────────────────────────
var STORAGE_PREFIX = "bdrhelper_";
async function storageGet(key) {
  try {
    var raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}
async function storageSet(key, val) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    return true;
  } catch(e) { return false; }
}
async function storageList(prefix) {
  try {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX + prefix)) {
        keys.push(k.slice(STORAGE_PREFIX.length));
      }
    }
    return keys;
  } catch(e) { return []; }
}
async function storageDel(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return true;
  } catch(e) { return false; }
}

// ── CONSTANTS ────────────────────────────────────────────────────────────────
var STATUS_CONFIG = {
  "prospecting": { label:"Em prospecção", color:"#64748b", bg:"#f8fafc", border:"#e2e8f0" },
  "contacted":   { label:"Contatado",     color:"#0369a1", bg:"#eff6ff", border:"#bfdbfe" },
  "meeting":     { label:"Reunião",       color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe" },
  "won":         { label:"Convertido",    color:"#065f46", bg:"#f0fdf4", border:"#bbf7d0" },
  "lost":        { label:"Perdido",       color:"#991b1b", bg:"#fff1f2", border:"#fecdd3" },
};
var STATUS_ORDER = ["prospecting","contacted","meeting","won","lost"];
var FIT_CONFIG = {
  "ALTO":  { bg:"#dcfce7", border:"#10b981", text:"#065f46" },
  "MEDIO": { bg:"#fef3c7", border:"#f59e0b", text:"#92400e" },
  "BAIXO": { bg:"#fee2e2", border:"#ef4444", text:"#991b1b" },
};
var TIER_COLOR = { "Tier 1":"#065f46", "Tier 2":"#92400e", "Tier 3":"#475569" };

// Sequence touch types
var TOUCH_TYPES = {
  email:    { label:"E-mail",       icon:"E", color:"#0ea5e9", bg:"#eff6ff" },
  linkedin: { label:"InMail",       icon:"in", color:"#0a66c2", bg:"#eff6ff" },
  whatsapp: { label:"WhatsApp",     icon:"W", color:"#16a34a", bg:"#f0fdf4" },
  call:     { label:"Cold Call",    icon:"C", color:"#92400e", bg:"#fffbeb" },
  follow:   { label:"Follow-up",    icon:"F", color:"#7c3aed", bg:"#f5f3ff" },
  breakup:  { label:"Breakup",      icon:"B", color:"#64748b", bg:"#f8fafc" },
};

var STAKEHOLDER_PROFILES = [
  { id:"ciso",  label:"CISO / Head de Seguranca",   angle:"risco e compliance",          pain:"exposicao regulatoria e incidentes de seguranca" },
  { id:"cto",   label:"CTO / VP de Engenharia",     angle:"velocidade e qualidade",       pain:"vulnerabilidades travando o roadmap e deploys" },
  { id:"eng",   label:"Engineering Manager",         angle:"produtividade do time",        pain:"falsos positivos e friccao no pipeline" },
  { id:"cpo",   label:"CPO / Head de Produto",       angle:"competitividade e contratos",  pain:"clientes bloqueando deals por falta de AppSec" },
  { id:"cfo",   label:"CFO / Diretor Financeiro",    angle:"ROI e redução de custo",       pain:"custo de remediação em producao vs prevencao" },
  { id:"legal", label:"Head de Compliance",          angle:"certificações e regulações",   pain:"ISO 27001 e PCI-DSS sem processo automatizado" },
];

var SEQUENCE_TEMPLATES = {
  ciso: [
    { day:1,  type:"linkedin", subject:"Seguranca de aplicações na {empresa}", body:"Ola, tudo bem?\n\nVi que {empresa} tem uma operacao digital expressiva no setor de {setor}. Como CISO, sei que voce equilibra diariamente a pressao por seguranca com a velocidade do time de produto.\n\nEmpresa similar a de voces reduziu vulnerabilidades críticas em producao em 70% e acelerou a certificação ISO 27001 em 60% com a Conviso Platform.\n\nFaz sentido um papo de 20 minutos para eu entender como esta o processo de AppSec de voces hoje?\n\nAbraço,\nAndrei Heimann | AE Enterprise - Conviso Application Security" },
    { day:3,  type:"email",    subject:"[{empresa}] ROI de AppSec, calculo rápido", body:"Ola,\n\nUma pergunta direta: qual e o custo estimado de remediação de uma vulnerabilidade crítica descoberta em producao na {empresa}, considerando horas de engenharia, rollback e risco regulatório?\n\nNa media dos nossos clientes no setor de {setor}, esse custo e 6x maior do que se detectada durante o desenvolvimento.\n\nConsigo te mostrar em 15 minutos como empresas similares estruturaram AppSec para pagar esse custo antecipado, e com ROI positivo no primeiro trimestre.\n\nTem disponibilidade essa semana?\n\nAbraço,\nAndrei Heimann\nAccount Executive | Conviso Application Security\n(51) 99436-7667" },
    { day:6,  type:"call",    subject:"Abertura cold call, CISO {empresa}", body:"Bom dia [Nome], aqui e o Andrei da Conviso Application Security. Tenho 30 segundos?\n\n[PAUSA]\n\nPerfeito. Ligo porque {empresa} tem o perfil exato de empresa onde a Conviso gera mais impacto, time de engenharia ativo em {setor}, com pressao crescente por AppSec formal de clientes e reguladores.\n\nEmpresa similar reduziu 70% das vulnerabilidades críticas e acelerou ISO 27001 em 60%. Faz sentido eu te mostrar como funcionou? Quando voce tem 20 minutos essa semana?" },
    { day:10, type:"email",    subject:"[{empresa}] Case: ISO 27001 em 60% menos tempo", body:"Ola,\n\nRecentemente ajudamos uma empresa do setor de {setor} com perfil muito similar ao da {empresa} a:\n\n- Integrar SAST e DAST no pipeline CI/CD em 2 semanas\n- Zerar vulnerabilidades críticas em producao nos primeiros 90 dias\n- Reduzir em 60% o tempo para certificação ISO 27001\n- Criar um programa Security Champions escalavel\n\nO time de engenharia não precisou parar o roadmap, o nosso CS conduziu tudo.\n\nFaz sentido eu te contar como funcionou? 20 minutos essa semana.\n\nAbraço,\nAndrei Heimann | Conviso Application Security" },
    { day:15, type:"linkedin", subject:"Atualização rápida, {empresa}", body:"Ola,\n\nMandei um email semana passada sobre AppSec e redução de vulnerabilidades na {empresa}, mas imagino que a caixa de entrada esta cheia.\n\nDeixo uma pergunta direta: voces estao em algum processo de certificação ISO 27001, SOC 2 ou PCI-DSS nos próximos 12 meses?\n\nSe sim, vale muito uma conversa antes, posso mostrar como estruturar AppSec para acelerar esse processo. Se não, entendo e não incomodo mais.\n\nAbraço,\nAndrei" },
    { day:21, type:"breakup",  subject:"Última mensagem, {empresa}", body:"Ola,\n\nVou respeitar o seu tempo, essa e minha última mensagem sobre o tema.\n\nSe AppSec não e prioridade agora na {empresa}, faz todo sentido. Mas se em algum momento a conversa sobre ISO 27001, custo de vulnerabilidades ou exigencia de clientes enterprise ganhar urgencia, pode me chamar.\n\nGuardo a {empresa} no radar e fico a disposicao.\n\nAbraço,\nAndrei Heimann | Conviso Application Security\n(51) 99436-7667" },
  ],
  cto: [
    { day:1,  type:"linkedin", subject:"Pipeline de seguranca na {empresa}", body:"Ola, tudo bem?\n\nVi que {empresa} tem um time de engenharia ativo em {setor}. Como CTO, imagino que voce equilibra velocidade de entrega com qualidade e seguranca do codigo.\n\nUma pergunta direta: voces tem algum processo automatizado de SAST ou analise de vulnerabilidades integrado ao pipeline hoje?\n\nPergunto porque vi empresas similares perdendo 40% do tempo do time de seguranca em analise manual, e resolvendo isso com uma integração de 2 semanas.\n\nVale um papo?" },
    { day:3,  type:"email",    subject:"[{empresa}] Seguranca no CI/CD sem travar o roadmap", body:"Ola,\n\nO maior medo de CTOs quando o assunto e AppSec e friccao no pipeline de desenvolvimento. Entendo.\n\nA Conviso Platform integra com GitHub, GitLab e Azure DevOps em media em 2 semanas, sem impactar o roadmap do time. O resultado que vemos em empresas de {setor}:\n\n- SAST rodando automaticamente em cada PR\n- Vulnerabilidades priorizadas por risco de negocio (não lista infinita de falsos positivos)\n- Security Champions: devs como multiplicadores de seguranca\n\nConsigo te mostrar como funciona na pratica em 20 minutos. Tem disponibilidade?\n\nAbraço,\nAndrei Heimann | Conviso Application Security" },
    { day:7,  type:"whatsapp", subject:"WhatsApp, CTO {empresa}", body:"Oi [Nome], tudo bem? Sou o Andrei da Conviso Application Security.\n\nVi que {empresa} tem um time de engenharia relevante em {setor}. Mando uma pergunta direta: voces tem SAST ou analise de dependencias rodando no pipeline hoje?\n\nTenho um case de empresa similar que pode ser relevante. Posso te mandar?" },
    { day:12, type:"email",    subject:"[{empresa}] O que acontece quando uma vuln chega em producao?", body:"Ola,\n\nUma situação que todo CTO conhece: a equipe de seguranca encontra uma vulnerabilidade crítica em producao. O que acontece?\n\nRollback urgente. Horas de engenharia desviadas. Comunicacao com clientes. Risco regulatorio.\n\nO custo medio de remediar uma vulnerabilidade em producao e 6x maior do que no desenvolvimento. Na pratica, isso significa que prevenir com SAST no pipeline e mais barato do que qualquer incidente.\n\nConsigo te mostrar como {empresa} poderia estruturar isso em 2 semanas. Vale 20 minutos?\n\nAbraço,\nAndrei | Conviso Application Security" },
    { day:17, type:"call",    subject:"Abertura cold call, CTO {empresa}", body:"Ola [Nome], Andrei da Conviso Application Security. Vou ser rápido.\n\nLigo porque {empresa} apareceu no nosso radar como empresa com time de dev ativo em {setor}. Uma pergunta tecnica: como esta estruturado hoje o processo de identificacao de vulnerabilidades no pipeline de voces?\n\n[OUCAR RESPOSTA]\n\nEntendi. E quando voce descobre uma vulnerabilidade crítica, qual e o processo de priorização e correção que voces seguem hoje?" },
    { day:22, type:"breakup",  subject:"Encerrando contato, {empresa}", body:"Ola,\n\nFiz algumas tentativas de contato sobre seguranca de aplicações na {empresa} e imagino que ou não e o momento certo, ou não sou a pessoa certa para falar sobre isso.\n\nVou encerrar o contato por aqui. Se algum dia o tema de AppSec, ISO 27001 ou vulnerabilidades em producao ganhar urgencia, pode me chamar, guardo {empresa} no radar.\n\nAbraço e sucesso!\nAndrei Heimann | Conviso Application Security" },
  ],
  eng: [
    { day:1,  type:"linkedin", subject:"Security Champions na {empresa}", body:"Ola, tudo bem?\n\nVi que {empresa} tem times de engenharia ativos em {setor}. Uma pergunta rápida: voces tem devs atuando como Security Champions hoje?\n\nPergunto porque empresas similares estao vendo um resultado interessante ao capacitar engineers para identificar vulnerabilidades na origem, sem depender exclusivamente do time de segurança.\n\nTenho um material relevante sobre o tema. Vale trocar uma ideia?" },
    { day:4,  type:"email",    subject:"[{empresa}] Redução de falsos positivos no pipeline", body:"Ola,\n\nA reclamacao mais comum de engineering managers sobre ferramentas de seguranca: lista infinita de alertas, 80% falsos positivos, time que ignora tudo.\n\nA Conviso Platform funciona diferente, prioriza vulnerabilidades por risco real de negocio, não apenas pela classificacao tecnica. O resultado: o time foca nos 20% que importam.\n\nConsigo te mostrar como funciona na pratica em 15 minutos. Pode ser essa semana?\n\nAbraço,\nAndrei Heimann | Conviso Application Security" },
    { day:8,  type:"whatsapp", subject:"WhatsApp, Eng Manager {empresa}", body:"Oi [Nome], Andrei da Conviso AppSec.\n\nDireto ao ponto: sua equipe de engenharia na {empresa} ja tem SAST ou analise de dependencias integrado ao CI/CD?\n\nSe não, tenho um case de como integrar em 2 semanas sem travar o roadmap. Vale ver?" },
    { day:14, type:"email",    subject:"[{empresa}] 2 semanas para AppSec no pipeline", body:"Ola,\n\nSei que a agenda de um engineering manager e lotada, por isso vou ser objetivo.\n\nO que a Conviso entrega para times de engenharia como o da {empresa}:\n\n- SAST integrado ao GitHub/GitLab em 2 semanas\n- Zero impacto no roadmap atual (o nosso CS conduz)\n- Alertas priorizados por risco, sem lista infinita de falsos positivos\n- Programa Security Champions: seus devs como multiplicadores de seguranca\n\nFaz sentido ver uma demo de 20 minutos focada no stack de voces?\n\nAbraço,\nAndrei" },
    { day:19, type:"follow",   subject:"[{empresa}] Última tentativa, integração gratuita por 30 dias", body:"Ola,\n\nÚltima mensagem sobre o tema, prometo.\n\nEm vez de mais uma conversa, proponho algo diferente: 30 dias gratuitos da Conviso Platform integrada ao pipeline de voces. Sem compromisso.\n\nVoces veem o resultado na pratica, vulnerabilidades identificadas, priorização por risco, o time funcionando. Se não fizer sentido, sem custo e sem pressao.\n\nVale arriscar 2 semanas de integração?" },
    { day:25, type:"breakup",  subject:"Encerrando, {empresa}", body:"Ola,\n\nNão quero continuar incomodando. Encerro o contato por aqui.\n\nSe algum dia a conversa sobre AppSec no pipeline ganhar espaco, pode me chamar.\n\nSucesso!\nAndrei | Conviso Application Security" },
  ],
  cpo: [
    { day:1,  type:"linkedin", subject:"AppSec como diferencial de produto na {empresa}", body:"Ola, tudo bem?\n\nUma tendencia que estou vendo bastante em produtos de {setor}: clientes enterprise bloqueando renovações e novos contratos por falta de evidencia formal de seguranca, pentest, SAST, ISO 27001.\n\n{empresa} ja enfrentou esse tipo de exigencia de clientes?\n\nTenho cases de produtos similares que transformaram AppSec em diferencial competitivo real. Vale trocar uma ideia?" },
    { day:3,  type:"email",    subject:"[{empresa}] AppSec que acelera vendas, não trava o produto", body:"Ola,\n\nPara um Head de Produto, seguranca normalmente soa como atrito, mais processo, mais lentidao, mais custo.\n\nMas ha um angulo diferente que estou vendo em produtos de {setor}: empresas que formalizaram AppSec estao fechando deals enterprise que antes eram barrados por falta de evidencia de seguranca.\n\nIsso significa AppSec como acelerador de vendas, não como overhead.\n\nConsigo te mostrar como funciona em 20 minutos. Disponivel essa semana?\n\nAbraço,\nAndrei Heimann | Conviso Application Security" },
    { day:7,  type:"whatsapp", subject:"WhatsApp, CPO {empresa}", body:"Oi [Nome], Andrei da Conviso AppSec.\n\n{empresa} ja teve algum deal enterprise travado por exigencia de pentest, ISO 27001 ou evidencia de seguranca de aplicações?\n\nSe sim, tenho algo relevante para te mostrar. Vale 15 minutos?" },
    { day:13, type:"email",    subject:"[{empresa}] Clientes exigindo seguranca, como responder", body:"Ola,\n\nCada vez mais, contratos enterprise incluem clausulas de seguranca: pentest anual, SAST no pipeline, ISO 27001, SOC 2.\n\nEmpresas de {setor} que trabalhamos estao usando a Conviso Platform para:\n\n- Gerar relatorios de seguranca para clientes enterprise\n- Acelerar certificações ISO 27001 e SOC 2\n- Transformar AppSec em argumento de venda, não de bloqueio\n\nIsso muda a conversa de 'custo de seguranca' para 'investimento em crescimento'.\n\nFaz sentido conversar?\n\nAbraço,\nAndrei" },
    { day:18, type:"follow",   subject:"[{empresa}] Uma última pergunta", body:"Ola,\n\nUma pergunta antes de encerrar o contato:\n\nNos próximos 6 meses, {empresa} tem algum deal enterprise onde o cliente pode exigir evidencia formal de seguranca?\n\nSe sim, vale muito uma conversa agora, antes da urgencia chegar. Se não, sem problemas.\n\nAbraço,\nAndrei | Conviso Application Security" },
    { day:24, type:"breakup",  subject:"Encerrando, {empresa}", body:"Ola,\n\nEncerro o contato por aqui. Se o tema de AppSec como diferencial de produto ganhar relevancia na {empresa}, pode me chamar.\n\nSucesso!\nAndrei Heimann | Conviso Application Security" },
  ],
  cfo: [
    { day:1,  type:"email",    subject:"[{empresa}] O custo real de uma vulnerabilidade em producao", body:"Ola,\n\nUma pergunta direta para um CFO: qual foi o custo do ultimo incidente de seguranca na {empresa}, ou qual seria o custo estimado de um vazamento de dados hoje?\n\nNa media do setor de {setor}: R$ 6,7 milhoes por incidente, sem contar multas LGPD, perda de clientes e custo reputacional.\n\nA Conviso Platform custa uma fracao disso e reduz vulnerabilidades críticas em 70%. O payback e no primeiro incidente evitado.\n\nConsigo te mostrar o business case em 20 minutos. Disponivel?\n\nAbraço,\nAndrei Heimann | Conviso Application Security" },
    { day:5,  type:"linkedin", subject:"ROI de AppSec, {empresa}", body:"Ola,\n\nTrabalho com CFOs de empresas de {setor} em uma conta que normalmente não esta no orcamento de tecnologia: seguranca de aplicações.\n\nO argumento que tem funcionado: o custo de remediar uma vulnerabilidade em producao e 6x maior do que preveni-la no desenvolvimento. Com a Conviso Platform, o payback aparece no primeiro incidente evitado.\n\nVale 20 minutos para te mostrar o business case?\n\nAbraço,\nAndrei" },
    { day:10, type:"email",    subject:"[{empresa}] Business case: prevencao vs remediação", body:"Ola,\n\nUm numero que costuma mudar a perspectiva de CFOs:\n\nCusto de remediar vulnerabilidade em DESENVOLVIMENTO: 1x\nCusto de remediar vulnerabilidade em PRODUCAO: 6x\nCusto de um incidente de seguranca no setor de {setor}: R$ 6,7 milhoes em media\n\nIsso significa que investir em AppSec preventiva não é custo, e redução de risco financeiro mensuravel.\n\nPosso montar um business case específico para {empresa} em 20 minutos de conversa. Vale?\n\nAbraço,\nAndrei Heimann | Conviso Application Security" },
    { day:16, type:"call",    subject:"Cold call, CFO {empresa}", body:"Bom dia [Nome], Andrei da Conviso Application Security. Tenho 30 segundos?\n\nLigo porque tenho um business case específico para CFOs de empresas de {setor}, sobre custo de vulnerabilidades em producao vs investimento em prevencao.\n\nO numero que costuma surpreender: remediar uma vulnerabilidade em producao custa 6x mais do que preveni-la no desenvolvimento. Faz sentido eu te mostrar o calculo aplicado a {empresa}?" },
    { day:22, type:"breakup",  subject:"Encerrando, {empresa}", body:"Ola,\n\nÚltima mensagem. Entendo que o timing pode não ser o ideal.\n\nSe o tema de risco financeiro de seguranca de aplicações ganhar relevancia na agenda da {empresa}, pode me chamar.\n\nAbraço,\nAndrei | Conviso Application Security" },
  ],
  legal: [
    { day:1,  type:"email",    subject:"[{empresa}] ISO 27001 e AppSec, como acelerar", body:"Ola,\n\nEmpresas de {setor} estao enfrentando uma pressao crescente: clientes enterprise, reguladores e auditorias exigindo evidencia formal de seguranca de aplicações, ISO 27001, SOC 2, PCI-DSS.\n\nO processo manual e demorado e caro. A Conviso Platform automatiza os controles de AppSec necessarios e reduziu em 60% o tempo para certificação de empresas similares.\n\nFaz sentido conversar sobre como isso se aplicaria a {empresa}?\n\nAbraço,\nAndrei Heimann | Conviso Application Security" },
    { day:4,  type:"linkedin", subject:"Compliance de AppSec, {empresa}", body:"Ola, tudo bem?\n\n{empresa} esta em algum processo de certificação, ISO 27001, SOC 2, PCI-DSS, ou tem clientes que exigem esses frameworks?\n\nPergunto porque a Conviso Platform automatiza os controles de seguranca de aplicações necessarios para essas certificações e reduziu em 60% o tempo do processo em empresas de {setor}.\n\nVale uma conversa rápida?" },
    { day:9,  type:"email",    subject:"[{empresa}] Controles de AppSec para ISO 27001", body:"Ola,\n\nOs controles de seguranca de aplicações exigidos pela ISO 27001 (Annex A.14) e pelo PCI-DSS v4.0 incluem:\n\n- SAST e DAST no ciclo de desenvolvimento\n- Gestão formal de vulnerabilidades com SLA\n- Revisão de codigo seguro\n- Testes de seguranca antes de producao\n\nA Conviso Platform cobre todos esses controles com evidencia auditavel, o que acelera auditorias e certificações.\n\nConsigo te mostrar o mapeamento específico para {empresa} em 20 minutos.\n\nAbraço,\nAndrei" },
    { day:15, type:"call",    subject:"Cold call, Compliance {empresa}", body:"Bom dia [Nome], Andrei da Conviso Application Security.\n\nLigo porque {empresa} pode estar em um processo de certificação ou ter clientes que exigem ISO 27001 ou PCI-DSS, e tenho casos específicos de como automatizar os controles de AppSec para acelerar esse processo.\n\nVoces estao em algum processo de certificação nos próximos 12 meses?" },
    { day:21, type:"breakup",  subject:"Encerrando, {empresa}", body:"Ola,\n\nEncerro o contato por aqui. Se o tema de compliance de AppSec, ISO 27001, SOC 2, PCI-DSS, ganhar urgencia na {empresa}, pode me chamar.\n\nAbraço,\nAndrei | Conviso Application Security" },
  ],
};

function safeArr(v) { return Array.isArray(v) ? v : []; }
function fmtDate(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"2-digit" });
}

function applyVars(text, acc) {
  return text
    .replace(/\{empresa\}/g, acc.nome || "a empresa")
    .replace(/\{setor\}/g, (acc.data && acc.data.empresa && acc.data.empresa.setor) || acc.setor || "tecnologia");
}

// ── MINI GAUGE ────────────────────────────────────────────────────────────────
function MiniGauge(props) {
  var fc = FIT_CONFIG[props.score] || FIT_CONFIG.ALTO;
  var pct = props.score === "ALTO" ? 88 : props.score === "MEDIO" ? 55 : 22;
  var r = 18; var circ = Math.PI * r;
  return (
    <svg width="50" height="30" viewBox="0 0 50 30">
      <path d={"M " + (25-r) + " 26 A " + r + " " + r + " 0 0 1 " + (25+r) + " 26"} fill="none" stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round"/>
      <path d={"M " + (25-r) + " 26 A " + r + " " + r + " 0 0 1 " + (25+r) + " 26"} fill="none" stroke={fc.border} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ + " " + circ} strokeDashoffset={circ * (1 - pct/100)}/>
    </svg>
  );
}

// ── COPY BUTTON ───────────────────────────────────────────────────────────────
function CopyBtn(props) {
  var [done, setDone] = useState(false);
  function handle() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(props.text).then(function() { setDone(true); setTimeout(function(){setDone(false);}, 2000); });
    }
  }
  return (
    <button onClick={handle} style={{display:"flex",alignItems:"center",gap:4,background:done?"#dcfce7":"#f8fafc",border:"1px solid "+(done?"#86efac":"#e2e8f0"),borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:10,fontWeight:600,color:done?"#065f46":"#64748b",transition:"all .2s",whiteSpace:"nowrap",fontFamily:"inherit",flexShrink:0}}>
      {done ? "Copiado!" : "Copiar"}
    </button>
  );
}

// ── SEQUENCE VIEW ─────────────────────────────────────────────────────────────
function SequenceView(props) {
  var accounts = props.accounts;
  var [selAcc, setSelAcc] = useState(null);
  var [selProfile, setSelProfile] = useState(null);
  var [generated, setGenerated] = useState(null);
  var [saved, setSaved] = useState([]);
  var [view, setView] = useState("builder"); // builder | library
  var [openSeq, setOpenSeq] = useState(null);

  useEffect(function() {
    storageList("seq:").then(function(keys) {
      if (!keys.length) return;
      Promise.all(keys.map(storageGet)).then(function(items) {
        setSaved(items.filter(Boolean).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}));
      });
    });
  }, []);

  function generate() {
    if (!selAcc || !selProfile) return;
    var template = SEQUENCE_TEMPLATES[selProfile.id] || SEQUENCE_TEMPLATES.ciso;
    var touches = template.map(function(t) {
      return Object.assign({}, t, { body: applyVars(t.body, selAcc), subject: applyVars(t.subject, selAcc) });
    });
    setGenerated({ account: selAcc, profile: selProfile, touches: touches, createdAt: Date.now() });
  }

  function saveSeq() {
    if (!generated) return;
    var id = "seq:" + Date.now();
    var seq = Object.assign({}, generated, { id: id });
    storageSet(id, seq).then(function() {
      setSaved(function(prev) { return [seq].concat(prev); });
      props.showToast("Sequência salva na biblioteca!");
    });
  }

  var profileOpts = STAKEHOLDER_PROFILES;

  if (view === "library") {
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:28,fontWeight:800,color:"#0f172a",marginBottom:4,letterSpacing:"-0.6px"}}>Sequências Salvas</div>
            <div style={{fontSize:13,color:"#64748b"}}>{saved.length + " sequência" + (saved.length !== 1 ? "s" : "") + " na biblioteca"}</div>
          </div>
          <button onClick={function(){setView("builder");}} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:12,padding:"11px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            + Nova sequencia
          </button>
        </div>

        {saved.length === 0 ? (
          <div style={{textAlign:"center",padding:"64px 0",background:"#f8fafc",borderRadius:20,border:"1.5px dashed #e2e8f0"}}>
            <div style={{fontSize:36,marginBottom:12}}>📬</div>
            <div style={{fontSize:15,fontWeight:700,color:"#334155",marginBottom:6}}>Nenhuma sequencia salva ainda</div>
            <div style={{fontSize:12,color:"#94a3b8"}}>Gere uma sequencia e clique em Salvar na Biblioteca</div>
          </div>
        ) : (
          <div className="card-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
            {saved.map(function(seq) {
              var fc = FIT_CONFIG[seq.account && seq.account.fit] || FIT_CONFIG.ALTO;
              return (
                <div key={seq.id} style={{background:"#fff",border:"1.5px solid #e8edf4",borderRadius:18,padding:"20px 22px",cursor:"pointer",transition:"all .2s"}}
                  onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(15,23,42,.1)";e.currentTarget.style.borderColor="#d1dae8";}}
                  onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor="#e8edf4";}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:3}}>{seq.account && seq.account.nome}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>{seq.profile && seq.profile.label}</div>
                    </div>
                    <span style={{background:fc.bg,border:"1px solid " + fc.border,color:fc.text,borderRadius:8,padding:"3px 10px",fontSize:9,fontWeight:700}}>{"FIT " + (seq.account && seq.account.fit)}</span>
                  </div>
                  <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                    {safeArr(seq.touches).map(function(t,i) {
                      var tc = TOUCH_TYPES[t.type] || TOUCH_TYPES.email;
                      return <span key={i} style={{background:tc.bg,color:tc.color,borderRadius:6,padding:"2px 8px",fontSize:9,fontWeight:700}}>{"D" + t.day + " " + tc.label}</span>;
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#94a3b8"}}>{fmtDate(seq.createdAt)}</span>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={function(e){e.stopPropagation();setOpenSeq(seq);}} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Abrir</button>
                      <button onClick={function(e){e.stopPropagation();storageDel(seq.id).then(function(){setSaved(function(prev){return prev.filter(function(s){return s.id!==seq.id;});});props.showToast("Sequência removida.","#ef4444");});}} style={{background:"none",border:"1px solid #fee2e2",color:"#ef4444",borderRadius:8,padding:"5px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {openSeq && <SequenceModal seq={openSeq} onClose={function(){setOpenSeq(null);}}/>}
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:28,fontWeight:800,color:"#0f172a",marginBottom:4,letterSpacing:"-0.6px"}}>Gerador de Sequências</div>
          <div style={{fontSize:13,color:"#64748b"}}>Selecione a conta e o perfil do stakeholder para gerar uma cadencia personalizada de 6 toques.</div>
        </div>
        <button onClick={function(){setView("library");}} style={{background:"#f8fafc",color:"#475569",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"11px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          Biblioteca ({saved.length})
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            1. Selecione a conta
          </div>
          {accounts.length === 0 ? (
            <div style={{background:"#f8fafc",border:"1.5px dashed #e2e8f0",borderRadius:14,padding:"24px",textAlign:"center"}}>
              <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Nenhuma conta mapeada. Va para Busca e analise uma empresa primeiro.</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto"}}>
              {accounts.map(function(acc) {
                var fc = FIT_CONFIG[acc.fit] || FIT_CONFIG.ALTO;
                var active = selAcc && selAcc.id === acc.id;
                return (
                  <div key={acc.id} onClick={function(){setSelAcc(acc);setGenerated(null);}}
                    style={{background:active?"#f0fdf4":"#fff",border:"1.5px solid " + (active?"#10b981":"#e8edf4"),borderRadius:12,padding:"12px 14px",cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acc.nome}</div>
                      <div style={{fontSize:10,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acc.setor}</div>
                    </div>
                    <span style={{background:fc.bg,border:"1px solid " + fc.border,color:fc.text,borderRadius:6,padding:"2px 8px",fontSize:9,fontWeight:700,flexShrink:0}}>{"FIT " + acc.fit}</span>
                    {active && <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981",flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            2. Escolha o stakeholder-alvo
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {profileOpts.map(function(p) {
              var active = selProfile && selProfile.id === p.id;
              return (
                <div key={p.id} onClick={function(){setSelProfile(p);setGenerated(null);}}
                  style={{background:active?"#f0fdf4":"#fff",border:"1.5px solid " + (active?"#10b981":"#e8edf4"),borderRadius:12,padding:"11px 14px",cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#0f172a"}}>{p.label}</div>
                    <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{"Angulo: " + p.angle}</div>
                  </div>
                  {active && <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981",flexShrink:0}}/>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:12,marginBottom:32}}>
        <button onClick={generate} disabled={!selAcc || !selProfile}
          style={{background: selAcc && selProfile ? "linear-gradient(135deg,#10b981,#059669)" : "#e2e8f0",color: selAcc && selProfile ? "#fff" : "#94a3b8",border:"none",borderRadius:12,padding:"14px 32px",fontSize:13,fontWeight:600,cursor: selAcc && selProfile ? "pointer" : "not-allowed",fontFamily:"inherit",boxShadow: selAcc && selProfile ? "0 4px 14px rgba(16,185,129,.35)" : "none",transition:"all .2s"}}>
          Gerar Sequência de 6 Toques
        </button>
        {generated && (
          <button onClick={saveSeq} style={{background:"#fff",color:"#059669",border:"1.5px solid rgba(16,185,129,.35)",borderRadius:12,padding:"14px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
            onMouseEnter={function(e){e.currentTarget.style.background="#f0fdf4";}}
            onMouseLeave={function(e){e.currentTarget.style.background="#fff";}}>
            Salvar na Biblioteca
          </button>
        )}
      </div>

      {generated && (
        <div style={{animation:"fadeUp .4s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:2}}>
                {"Cadencia gerada: " + generated.account.nome + " - " + generated.profile.label}
              </div>
              <div style={{fontSize:12,color:"#64748b"}}>6 toques em 21-25 dias. Personalize conforme necessario antes de usar.</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {safeArr(generated.touches).map(function(t) {
                var tc = TOUCH_TYPES[t.type] || TOUCH_TYPES.email;
                return <span key={t.day} style={{background:tc.bg,color:tc.color,borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:700}}>{"D" + t.day}</span>;
              })}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {safeArr(generated.touches).map(function(touch, idx) {
              var tc = TOUCH_TYPES[touch.type] || TOUCH_TYPES.email;
              return (
                <div key={idx} style={{background:"#fff",border:"1.5px solid #e8edf4",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 8px rgba(15,23,42,.04)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 20px",background:"#fafafa",borderBottom:"1px solid #f1f5f9"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:tc.color,flexShrink:0}}>
                      {tc.icon}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span style={{fontSize:12,fontWeight:700,color:tc.color}}>{tc.label}</span>
                        <span style={{background:tc.bg,border:"1px solid " + tc.color + "40",color:tc.color,borderRadius:20,padding:"1px 8px",fontSize:9,fontWeight:700}}>{"Dia " + touch.day}</span>
                        {idx === 0 && <span style={{background:"#dcfce7",border:"1px solid #86efac",color:"#065f46",borderRadius:20,padding:"1px 8px",fontSize:9,fontWeight:700}}>INICIO</span>}
                        {touch.type === "breakup" && <span style={{background:"#fee2e2",border:"1px solid #fecdd3",color:"#991b1b",borderRadius:20,padding:"1px 8px",fontSize:9,fontWeight:700}}>ENCERRAMENTO</span>}
                      </div>
                      <div style={{fontSize:11.5,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{touch.subject}</div>
                    </div>
                    <CopyBtn text={(touch.type === "email" || touch.type === "linkedin" ? "Assunto: " + touch.subject + "\n\n" : "") + touch.body}/>
                  </div>
                  <div style={{padding:"16px 20px",background:"#fff"}}>
                    <div style={{fontSize:12.5,color:"#1e293b",whiteSpace:"pre-wrap",lineHeight:1.85,fontFamily:"inherit"}}>
                      {touch.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SEQUENCE MODAL ────────────────────────────────────────────────────────────
function SequenceModal(props) {
  var seq = props.seq;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.7)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 16px",overflowY:"auto",backdropFilter:"blur(8px)"}}>
      <div style={{background:"rgba(255,255,255,.98)",borderRadius:24,width:"100%",maxWidth:680,boxShadow:"0 32px 100px rgba(15,23,42,.28),0 0 0 1px rgba(255,255,255,.8)"}}>
        <div style={{padding:"22px 28px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"#0f172a",marginBottom:3}}>{seq.account && seq.account.nome}</div>
            <div style={{fontSize:12,color:"#94a3b8"}}>{seq.profile && seq.profile.label + ", " + fmtDate(seq.createdAt)}</div>
          </div>
          <button onClick={props.onClose} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#64748b",fontSize:18,lineHeight:1,fontFamily:"inherit"}}>x</button>
        </div>
        <div style={{padding:"22px 28px",maxHeight:"70vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
          {safeArr(seq.touches).map(function(touch, idx) {
            var tc = TOUCH_TYPES[touch.type] || TOUCH_TYPES.email;
            return (
              <div key={idx} style={{border:"1.5px solid #e8edf4",borderRadius:14,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:"#fafafa",borderBottom:"1px solid #f1f5f9"}}>
                  <span style={{fontSize:11,fontWeight:700,color:tc.color}}>{tc.label}</span>
                  <span style={{background:tc.bg,color:tc.color,borderRadius:20,padding:"1px 8px",fontSize:9,fontWeight:700}}>{"Dia " + touch.day}</span>
                  <div style={{flex:1,fontSize:11,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{touch.subject}</div>
                  <CopyBtn text={(touch.type==="email"||touch.type==="linkedin"?"Assunto: "+touch.subject+"\n\n":"")+touch.body}/>
                </div>
                <div style={{padding:"14px 16px",fontSize:12,color:"#1e293b",whiteSpace:"pre-wrap",lineHeight:1.8}}>{touch.body}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNT CARD ──────────────────────────────────────────────────────────────
function AccountCard(props) {
  var acc = props.acc;
  var fc = FIT_CONFIG[acc.fit] || FIT_CONFIG.ALTO;
  var sc = STATUS_CONFIG[acc.status] || STATUS_CONFIG.prospecting;
  var [menuOpen, setMenuOpen] = useState(false);

  function handleStatus(s) { props.onStatusChange(acc.id, s); setMenuOpen(false); }

  return (
    <div style={{background:"rgba(255,255,255,.95)",border:"1.5px solid rgba(228,235,244,.8)",borderRadius:20,padding:"20px 22px",transition:"all .25s cubic-bezier(.22,1,.36,1)",position:"relative",boxShadow:"0 2px 12px rgba(15,23,42,.06)"}}
      onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow="0 16px 48px rgba(15,23,42,.14)";e.currentTarget.style.borderColor="rgba(16,185,129,.3)";}}
      onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(15,23,42,.06)";e.currentTarget.style.borderColor="rgba(228,235,244,.8)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acc.nome}</div>
          <div style={{fontSize:11,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acc.setor}</div>
        </div>
        <MiniGauge score={acc.fit}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{background:fc.bg,border:"1px solid "+fc.border,color:fc.text,borderRadius:8,padding:"3px 10px",fontSize:9,fontWeight:700}}>{"FIT "+acc.fit}</span>
        <span style={{background:"#f8fafc",border:"1px solid "+(TIER_COLOR[acc.tier]||"#e2e8f0"),color:TIER_COLOR[acc.tier]||"#94a3b8",borderRadius:8,padding:"3px 10px",fontSize:9,fontWeight:700}}>{acc.tier}</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{position:"relative"}}>
          <button onClick={function(e){e.stopPropagation();setMenuOpen(!menuOpen);}} style={{display:"flex",alignItems:"center",gap:6,background:sc.bg,border:"1px solid "+sc.border,color:sc.color,borderRadius:8,padding:"5px 10px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            {sc.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {menuOpen && (
            <div onClick={function(e){e.stopPropagation();}} style={{position:"absolute",bottom:"calc(100% + 6px)",left:0,background:"#fff",border:"1.5px solid #e8edf4",borderRadius:12,boxShadow:"0 8px 32px rgba(15,23,42,.12)",zIndex:50,minWidth:160,overflow:"hidden"}}>
              {STATUS_ORDER.map(function(s) {
                var sc2 = STATUS_CONFIG[s];
                return (
                  <div key={s} onClick={function(){handleStatus(s);}} style={{padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:11,fontWeight:600,color:sc2.color,background:acc.status===s?sc2.bg:"#fff"}}
                    onMouseEnter={function(e){if(acc.status!==s)e.currentTarget.style.background="#f8fafc";}}
                    onMouseLeave={function(e){if(acc.status!==s)e.currentTarget.style.background="#fff";}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:sc2.color}}/>
                    {sc2.label}
                    {acc.status===s && <svg style={{marginLeft:"auto"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#94a3b8"}}>{fmtDate(acc.savedAt)}</span>
          <button onClick={function(e){e.stopPropagation();props.onOpen(acc);}} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Ver</button>
          <button onClick={function(e){e.stopPropagation();props.onDelete(acc.id);}} style={{background:"none",border:"1px solid #fee2e2",color:"#ef4444",borderRadius:8,padding:"5px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>
        </div>
      </div>
    </div>
  );
}

// ── PIPELINE VIEW ─────────────────────────────────────────────────────────────
function PipelineView(props) {
  var dragState = useRef({active:false, id:null, fromCol:null});
  var [overCol, setOverCol] = useState(null);
  var [dragId, setDragId] = useState(null);
  var colRefs = useRef({});
  var containerRef = useRef(null);

  function getColAtPoint(x, y) {
    var found = null;
    Object.keys(colRefs.current).forEach(function(col) {
      var el = colRefs.current[col];
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) found = col;
    });
    return found;
  }

  function startDrag(accId, fromCol) {
    dragState.current = {active:true, id:accId, fromCol:fromCol};
    setDragId(accId);
    setOverCol(fromCol);
  }
  function endDrag(x, y) {
    if (!dragState.current.active) return;
    var col = getColAtPoint(x, y);
    if (col && col !== dragState.current.fromCol) {
      props.onStatusChange(dragState.current.id, col);
    }
    dragState.current = {active:false, id:null, fromCol:null};
    setDragId(null);
    setOverCol(null);
  }

  // Mouse events
  function onMouseDown(e, accId, fromCol) {
    e.preventDefault();
    startDrag(accId, fromCol);
    function onMove(ev) {
      if (!dragState.current.active) return;
      var col = getColAtPoint(ev.clientX, ev.clientY);
      setOverCol(col || dragState.current.fromCol);
    }
    function onUp(ev) {
      endDrag(ev.clientX, ev.clientY);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Touch events
  function onTouchStart(e, accId, fromCol) {
    startDrag(accId, fromCol);
    function onMove(ev) {
      if (!dragState.current.active || !ev.touches[0]) return;
      var t = ev.touches[0];
      var col = getColAtPoint(t.clientX, t.clientY);
      setOverCol(col || dragState.current.fromCol);
    }
    function onEnd(ev) {
      var t = ev.changedTouches[0];
      if (t) endDrag(t.clientX, t.clientY);
      else { dragState.current={active:false,id:null,fromCol:null}; setDragId(null); setOverCol(null); }
      e.target.removeEventListener("touchmove", onMove);
      e.target.removeEventListener("touchend", onEnd);
    }
    e.target.addEventListener("touchmove", onMove, {passive:true});
    e.target.addEventListener("touchend", onEnd);
  }

  return (
    <div ref={containerRef} className="pipeline-scroll" style={{overflowX:"auto",paddingBottom:16,userSelect:"none"}}>
      <div style={{display:"flex",gap:14,minWidth:900}}>
        {STATUS_ORDER.map(function(col) {
          var sc = STATUS_CONFIG[col];
          var cards = props.accounts.filter(function(a){return a.status===col;});
          var isOver = overCol===col && dragState.current.fromCol!==col;
          return (
            <div key={col}
              ref={function(el){colRefs.current[col]=el;}}
              style={{flex:1,minWidth:155,background:isOver?"rgba(16,185,129,.06)":"#f8fafc",borderRadius:16,padding:14,border:"1.5px solid "+(isOver?"#10b981":"#e8edf4"),transition:"border-color .15s,background .15s",boxShadow:isOver?"0 0 0 3px rgba(16,185,129,.15)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:sc.color}}/>
                <div style={{fontSize:9,fontWeight:700,color:sc.color,textTransform:"uppercase",letterSpacing:.8}}>{sc.label}</div>
                <div style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:"#94a3b8",background:"#e2e8f0",borderRadius:20,padding:"1px 7px"}}>{cards.length}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,minHeight:60}}>
                {cards.map(function(acc) {
                  var fc = FIT_CONFIG[acc.fit]||FIT_CONFIG.ALTO;
                  var isDragging = dragId===acc.id;
                  return (
                    <div key={acc.id}
                      onMouseDown={function(e){onMouseDown(e,acc.id,col);}}
                      onTouchStart={function(e){onTouchStart(e,acc.id,col);}}
                      onClick={function(){if(!dragId)props.onOpen(acc);}}
                      style={{background:"#fff",border:"1px solid "+(isDragging?"#10b981":"#edf0f7"),borderRadius:14,padding:"12px 14px",cursor:isDragging?"grabbing":"grab",touchAction:"none",boxShadow:isDragging?"0 8px 24px rgba(16,185,129,.2)":"0 1px 4px rgba(15,23,42,.05)",opacity:isDragging?0.5:1,transform:isDragging?"rotate(2deg) scale(.96)":"none",transition:isDragging?"none":"all .2s",position:"relative"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:3}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{acc.nome}</div>
                        <div style={{fontSize:13,color:"#cbd5e1",marginLeft:6,flexShrink:0}}>⠿</div>
                      </div>
                      <div style={{fontSize:10,color:"#94a3b8",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acc.setor}</div>
                      <div style={{display:"flex",gap:5}}>
                        <span style={{background:fc.bg,border:"1px solid "+fc.border,color:fc.text,borderRadius:6,padding:"2px 7px",fontSize:8,fontWeight:700}}>{"FIT "+acc.fit}</span>
                        <span style={{fontSize:8,color:TIER_COLOR[acc.tier]||"#94a3b8",fontWeight:700}}>{acc.tier}</span>
                      </div>
                    </div>
                  );
                })}
                {cards.length===0&&(
                  <div style={{textAlign:"center",padding:"28px 8px",color:isOver?"#059669":"#cbd5e1",fontSize:11,border:"2px dashed "+(isOver?"#10b981":"#e8edf4"),borderRadius:10,transition:"all .15s",fontWeight:isOver?600:400}}>
                    {isOver?"Soltar aqui":"Vazio"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {dragId&&<div style={{marginTop:10,textAlign:"center",fontSize:11,color:"#94a3b8"}}>Segure e arraste para outra coluna</div>}
    </div>
  );
}

// ── ACCOUNT MODAL ─────────────────────────────────────────────────────────────
function AccountModal(props) {
  var acc = props.acc;
  var d = acc.data || {};
  var fit = (d.fit && d.fit.score) || acc.fit;
  var fc = FIT_CONFIG[fit] || FIT_CONFIG.ALTO;
  var sc = STATUS_CONFIG[acc.status] || STATUS_CONFIG.prospecting;
  var [activeTab, setActiveTab] = useState("overview");
  var [enrichedContacts, setEnrichedContacts] = useState([]);
  var [enrichedSources, setEnrichedSources] = useState([]);

  // Load enriched stakeholder data from localStorage on open
  useEffect(function() {
    storageGet(acc.id).then(function(stored) {
      if (stored && stored.enriched && stored.enriched.contacts) {
        setEnrichedContacts(stored.enriched.contacts);
        setEnrichedSources(stored.enriched.sources || []);
      }
    });
    // Also try to load from acc.enriched directly if already merged
    if (acc.enriched && acc.enriched.contacts) {
      setEnrichedContacts(acc.enriched.contacts);
      setEnrichedSources(acc.enriched.sources || []);
    }
  }, [acc.id]);

  function sd(path) {
    try { var parts=path.split("."); var cur=d; for(var i=0;i<parts.length;i++){cur=cur[parts[i]];if(cur==null)return null;} return cur; } catch(e){return null;}
  }

  // Merge enriched contacts into stakeholder profiles for display
  function getEnrichedStakeholder(cargo) {
    if (!enrichedContacts.length) return null;
    var cargoLow = cargo.toLowerCase();
    var keywords = cargoLow.split(/[\s\/,]+/).filter(function(w){ return w.length > 3; });
    for (var i = 0; i < enrichedContacts.length; i++) {
      var c = enrichedContacts[i];
      var cLow = (c.cargo || "").toLowerCase();
      if (keywords.some(function(w){ return cLow.includes(w); })) return c;
    }
    return null;
  }

  var tabs=[{id:"overview",label:"Visão Geral"},{id:"stakeholders",label:"Stakeholders"},{id:"messages",label:"Mensagens"},{id:"spin",label:"SPIN & Objeções"},{id:"plan",label:"Plano de Ação"}];
  var empresa=sd("empresa")||{};
  var stakeholders=safeArr(sd("stakeholders"));
  var dores=safeArr(sd("dores.principais"));
  var exposicao=safeArr(sd("dores.exposicao_regulatoria"));
  var sinais=safeArr(sd("dores.sinais_ativos"));
  var triggers=safeArr(sd("triggers"));
  var noticias=safeArr(sd("noticias"));
  var spin=safeArr(sd("estrategia.perguntas_spin"));
  var objecoes=safeArr(sd("estrategia.objeções"));
  var ae=safeArr(sd("próximos_passos.ae"));
  var bdr=safeArr(sd("próximos_passos.bdr"));
  var prazo=sd("próximos_passos.prazo")||"";
  var useCases=safeArr(sd("fit.use_cases"));
  var solucoes=safeArr(sd("fit.soluções_conviso"));
  var fitJust=sd("fit.justificativa")||"";
  var concorrentes=safeArr(sd("mercado.competidores_provedor"));
  var CHANNELS=[{key:"emails",label:"E-mail",color:"#0ea5e9",bg:"rgba(14,165,233,.08)",isObj:true},{key:"inmails",label:"InMail",color:"#0a66c2",bg:"rgba(10,102,194,.08)",isObj:true},{key:"whatsapps",label:"WhatsApp",color:"#16a34a",bg:"rgba(22,163,74,.08)",isObj:false},{key:"cold_calls",label:"Cold Call",color:"#92400e",bg:"#fef3c7",isObj:false}];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.75)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px 16px",overflowY:"auto",backdropFilter:"blur(10px)"}}>
      <div className="modal-box" style={{background:"rgba(255,255,255,.99)",borderRadius:24,width:"100%",maxWidth:820,boxShadow:"0 32px 100px rgba(15,23,42,.3)"}}>
        <div style={{padding:"22px 28px 0",borderBottom:"1px solid #f1f5f9"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:16}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{fontSize:21,fontWeight:800,color:"#0f172a",lineHeight:1.2}}>{acc.nome}</div>
                {acc.liveMode&&<span style={{background:"#dcfce7",border:"1px solid #86efac",color:"#065f46",borderRadius:6,padding:"2px 8px",fontSize:8,fontWeight:700}}>LIVE</span>}
              </div>
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:10}}>{acc.setor}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{background:fc.bg,border:"1px solid "+fc.border,color:fc.text,borderRadius:8,padding:"4px 12px",fontSize:9,fontWeight:700}}>{"FIT "+fit}</span>
                <span style={{background:"#f8fafc",border:"1px solid "+(TIER_COLOR[acc.tier]||"#e2e8f0"),color:TIER_COLOR[acc.tier]||"#94a3b8",borderRadius:8,padding:"4px 12px",fontSize:9,fontWeight:700}}>{acc.tier}</span>
                <span style={{background:sc.bg,border:"1px solid "+sc.border,color:sc.color,borderRadius:8,padding:"4px 12px",fontSize:9,fontWeight:700}}>{sc.label}</span>
                <span style={{background:"#f8fafc",color:"#94a3b8",borderRadius:8,padding:"4px 12px",fontSize:9}}>{"Salvo "+fmtDate(acc.savedAt)}</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0,alignItems:"flex-end"}}>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",maxWidth:200}}>
                {STATUS_ORDER.map(function(s){var sc2=STATUS_CONFIG[s];return <button key={s} onClick={function(){props.onStatusChange(acc.id,s);}} style={{background:acc.status===s?sc2.bg:"#f8fafc",border:"1px solid "+(acc.status===s?sc2.border:"#e2e8f0"),color:acc.status===s?sc2.color:"#94a3b8",borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{sc2.label}</button>;})}
              </div>
              <button onClick={props.onClose} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"7px 14px",cursor:"pointer",color:"#64748b",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>Fechar</button>
            </div>
          </div>
          <div className="modal-tabs" style={{display:"flex",gap:0,overflowX:"auto"}}>
            {tabs.map(function(tab){var active=activeTab===tab.id;return <button key={tab.id} onClick={function(){setActiveTab(tab.id);}} style={{padding:"10px 16px",border:"none",borderBottom:"2.5px solid "+(active?"#10b981":"transparent"),background:"transparent",color:active?"#059669":"#94a3b8",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:active?700:500,transition:"all .15s",whiteSpace:"nowrap"}}>{tab.label}</button>;})}
          </div>
        </div>

        <div style={{padding:"22px 28px",maxHeight:"60vh",overflowY:"auto"}}>

          {activeTab==="overview"&&(
            <div>
              {empresa.resumo&&<Sec title="Resumo da Empresa"><p style={{fontSize:13,lineHeight:1.8,color:"#334155",margin:"0 0 14px"}}>{empresa.resumo}</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>{[["Setor",empresa.setor],["Porte",empresa.tamanho],["Faturamento",empresa.faturamento],["Clientes",empresa.clientes],["Estágio",empresa.estagio],["Bolsa",empresa.bolsa]].filter(function(x){return x[1];}).map(function(item){return <div key={item[0]} style={{background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:8,color:"#065f46",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:3}}>{item[0]}</div><div style={{fontSize:12,color:"#0f172a",fontWeight:600}}>{item[1]}</div></div>;})}</div></Sec>}
              {fitJust&&<Sec title="Fit Conviso"><p style={{fontSize:13,lineHeight:1.7,color:"#334155",marginBottom:10}}>{fitJust}</p>{solucoes.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{solucoes.map(function(s,i){return <span key={i} style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.25)",color:"#059669",borderRadius:8,padding:"3px 10px",fontSize:10,fontWeight:600}}>{s}</span>;})}</div>}</Sec>}
              {useCases.length>0&&<Sec title="Use Cases Prioritários">{useCases.map(function(u,i){return <R key={i} icon=">" color="#10b981">{u}</R>;})}</Sec>}
              {dores.length>0&&<Sec title="Dores Mapeadas">{dores.map(function(d2,i){return <R key={i} icon="!" color="#ef4444">{d2}</R>;})} {exposicao.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{exposicao.map(function(r,i){return <span key={i} style={{background:"#fef3c7",border:"1px solid #f59e0b",color:"#92400e",borderRadius:8,padding:"3px 10px",fontSize:10,fontWeight:600}}>{r}</span>;})}</div>}</Sec>}
              {triggers.length>0&&<Sec title="Gatilhos Comerciais">{triggers.map(function(t,i){return <R key={i} icon="T" color="#7c3aed">{t}</R>;})}</Sec>}
              {sinais.length>0&&<Sec title="Sinais de Intenção"><div style={{background:"#0c2340",borderRadius:12,padding:"12px 16px"}}>{sinais.map(function(s,i){return <div key={i} style={{fontSize:11.5,color:"#7dd3fc",lineHeight:1.6,display:"flex",gap:8,marginBottom:5}}><span style={{color:"#38bdf8",flexShrink:0}}>o</span>{s}</div>;})}</div></Sec>}
              {concorrentes.length>0&&<Sec title="Concorrentes Prováveis"><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{concorrentes.map(function(cc,i){return <span key={i} style={{background:"#fef3c7",border:"1px solid #f59e0b",color:"#92400e",borderRadius:8,padding:"3px 10px",fontSize:10,fontWeight:600}}>{cc}</span>;})}</div></Sec>}
              {noticias.length>0&&<Sec title="Notícias e Contexto">{noticias.map(function(n,i){return <div key={i} style={{background:"#f8fafc",border:"1px solid #e8edf4",borderRadius:12,padding:"12px 14px",marginBottom:8}}>{n.url?<a href={n.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12.5,fontWeight:700,color:"#0ea5e9",textDecoration:"none",display:"block",marginBottom:3}}>{n.titulo}</a>:<div style={{fontSize:12.5,fontWeight:700,color:"#0f172a",marginBottom:3}}>{n.titulo}</div>}<div style={{fontSize:11.5,color:"#64748b",lineHeight:1.6,marginBottom:3}}>{n.resumo}</div><div style={{fontSize:10,color:"#059669",fontWeight:600}}>{"→ "+n.relevancia}</div></div>;})}</Sec>}
            </div>
          )}

          {activeTab==="stakeholders"&&(
            <div>
              {enrichedContacts.length>0&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color:"#059669",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 8px rgba(16,185,129,.5)"}}/>
                    {"Contatos Reais Encontrados — "+enrichedContacts.length+" perfil"+(enrichedContacts.length>1?"s":"")}
                    {enrichedSources.map(function(s,i){return <span key={i} style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",color:"#059669",borderRadius:6,padding:"2px 8px",fontSize:8,fontWeight:600}}>{s}</span>;})}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10,marginBottom:16}}>
                    {enrichedContacts.map(function(contact,i){
                      return (
                        <div key={i} style={{background:"linear-gradient(145deg,#f0fdf4,#fff)",border:"1.5px solid rgba(16,185,129,.25)",borderRadius:14,padding:"14px 16px"}}>
                          <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:2}}>{contact.nome}</div>
                          <div style={{fontSize:11,color:"#059669",marginBottom:10}}>{contact.cargo}</div>
                          <div style={{display:"flex",flexDirection:"column",gap:5}}>
                            {contact.email&&(
                              <a href={"mailto:"+contact.email} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#0ea5e9",textDecoration:"none",background:"rgba(14,165,233,.06)",borderRadius:6,padding:"4px 8px"}}>
                                <span>✉</span>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{contact.email}</span>
                                {contact.email_confidence>0&&<span style={{fontSize:8,color:"#94a3b8",marginLeft:"auto",flexShrink:0}}>{contact.email_confidence+"%"}</span>}
                              </a>
                            )}
                            {contact.linkedin&&(
                              <a href={contact.linkedin.startsWith("http")?contact.linkedin:"https://www.linkedin.com/in/"+contact.linkedin} target="_blank" rel="noopener noreferrer"
                                style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#0a66c2",textDecoration:"none",background:"rgba(10,102,194,.06)",borderRadius:6,padding:"4px 8px",fontWeight:600}}>
                                <span>in</span><span>Ver perfil LinkedIn</span>
                              </a>
                            )}
                            {contact.phone&&<span style={{fontSize:10,color:"#64748b",padding:"2px 0"}}>{contact.phone}</span>}
                            <span style={{fontSize:8,color:"#94a3b8",fontStyle:"italic"}}>{contact.source}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Sec title="Mapeamento Estratégico de Cargos">
              <div className="modal-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {stakeholders.map(function(s,i){
                  var pc=s.prioridade==="PRIMARIO"?"#065f46":s.prioridade==="SECUNDARIO"?"#92400e":"#475569";
                  var uc=s.urgencia==="Alta"?"#991b1b":s.urgencia==="Media"||s.urgencia==="Média"?"#92400e":"#64748b";
                  var match=getEnrichedStakeholder(s.cargo);
                  return (
                    <div key={i} style={{background:match?"linear-gradient(145deg,#f0fdf4,#fff)":"#f8fafc",border:"1.5px solid "+(match?"rgba(16,185,129,.3)":"#e8edf4"),borderRadius:14,padding:"14px 16px",transition:"all .2s"}}
                      onMouseEnter={function(e){e.currentTarget.style.borderColor="#10b981";e.currentTarget.style.boxShadow="0 4px 16px rgba(16,185,129,.1)";}}
                      onMouseLeave={function(e){e.currentTarget.style.borderColor=match?"rgba(16,185,129,.3)":"#e8edf4";e.currentTarget.style.boxShadow="";}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{fontSize:12.5,fontWeight:700,color:"#0f172a",lineHeight:1.3,flex:1}}>{s.cargo}</div>
                        <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end",marginLeft:8,flexShrink:0}}>
                          <span style={{background:pc+"20",border:"1px solid "+pc,color:pc,borderRadius:6,padding:"2px 7px",fontSize:8,fontWeight:700,whiteSpace:"nowrap"}}>{s.prioridade}</span>
                          <span style={{fontSize:8,color:uc,fontWeight:600}}>{"Urgência: "+s.urgencia}</span>
                        </div>
                      </div>
                      {match&&(
                        <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:3}}>{"✓ Match: "+match.nome}</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {match.email&&<a href={"mailto:"+match.email} style={{fontSize:10,color:"#0ea5e9",textDecoration:"none"}}>{match.email}</a>}
                            {match.linkedin&&<a href={match.linkedin.startsWith("http")?match.linkedin:"https://www.linkedin.com/in/"+match.linkedin} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#0a66c2",textDecoration:"none",fontWeight:600}}>Ver LinkedIn →</a>}
                          </div>
                        </div>
                      )}
                      <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>{s.angulo}</div>
                    </div>
                  );
                })}
              </div>
              </Sec>
            </div>
          )}

          {activeTab==="messages"&&(
            <div>
              {CHANNELS.map(function(cfg){
                var items=safeArr(sd("estrategia."+cfg.key));
                if(!items.length)return null;
                return (
                  <Sec key={cfg.key} title={cfg.label}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      {items.map(function(item,i){
                        var text=cfg.isObj?item.corpo:item;
                        var ck=cfg.key+"-"+i;
                        return (
                          <div key={i} style={{border:"1.5px solid #e8edf4",borderRadius:14,overflow:"hidden"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:cfg.bg,borderBottom:"1px solid #e8edf4"}}>
                              <span style={{fontSize:10,fontWeight:700,color:cfg.color}}>{"Template "+(i+1)}</span>
                              {cfg.isObj&&item.assunto&&<span style={{fontSize:11,color:"#64748b",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{"- "+item.assunto}</span>}
                              <CopyBtn text={(cfg.isObj&&item.assunto?"Assunto: "+item.assunto+"\n\n":"")+text}/>
                            </div>
                            <div style={{padding:"14px 16px",fontSize:12.5,color:"#1e293b",whiteSpace:"pre-wrap",lineHeight:1.85,borderLeft:"3px solid "+cfg.color}}>{text}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Sec>
                );
              })}
            </div>
          )}

          {activeTab==="spin"&&(
            <div>
              <Sec title="Perguntas SPIN">
                {spin.map(function(q,i){
                  var tipo=q.startsWith("SITUAÇÃO")||q.startsWith("SITUAÇÃO")?"S":q.startsWith("PROBLEMA")?"P":q.startsWith("IMPLICAÇÃO")||q.startsWith("IMPLICAÇÃO")?"I":"N";
                  var tc=tipo==="S"?"#0ea5e9":tipo==="P"?"#92400e":tipo==="I"?"#991b1b":"#065f46";
                  var clean=q.replace(/^(SITUAÇÃO|SITUAÇÃO|PROBLEMA|IMPLICAÇÃO|IMPLICAÇÃO|NECESSIDADE): /,"");
                  return (
                    <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid #f1f5f9",alignItems:"flex-start"}}>
                      <span style={{background:tc+"20",border:"1px solid "+tc+"50",color:tc,borderRadius:6,padding:"2px 8px",fontSize:9,fontWeight:800,flexShrink:0,marginTop:1}}>{tipo}</span>
                      <span style={{fontSize:12.5,color:"#334155",lineHeight:1.6,flex:1}}>{clean}</span>
                      <CopyBtn text={clean}/>
                    </div>
                  );
                })}
              </Sec>
              {objecoes.length>0&&(
                <Sec title="Objeções e Respostas">
                  {objecoes.map(function(o,i){
                    return (
                      <div key={i} style={{background:"#f8fafc",border:"1.5px solid #e8edf4",borderRadius:14,padding:"14px 16px",marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#92400e",lineHeight:1.4,flex:1}}>{'"'+o.objeção+'"'}</div>
                          <CopyBtn text={'"'+o.objeção+'"\n→ '+o.resposta}/>
                        </div>
                        <div style={{fontSize:12,color:"#334155",lineHeight:1.65}}>{"→ "+o.resposta}</div>
                      </div>
                    );
                  })}
                </Sec>
              )}
            </div>
          )}

          {activeTab==="plan"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:18}}>
                <Sec title="AE — Ações Imediatas">
                  {ae.map(function(a,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid #f1f5f9",gap:8}}><div style={{display:"flex",gap:8,flex:1}}><span style={{color:"#10b981",flexShrink:0,fontWeight:700}}>{">"}</span><span style={{fontSize:12,color:"#334155",lineHeight:1.5}}>{a}</span></div><CopyBtn text={a}/></div>;})}
                </Sec>
                <Sec title="BDR — Ações de Suporte">
                  {bdr.map(function(a,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid #f1f5f9",gap:8}}><div style={{display:"flex",gap:8,flex:1}}><span style={{color:"#f59e0b",flexShrink:0,fontWeight:700}}>{">"}</span><span style={{fontSize:12,color:"#334155",lineHeight:1.5}}>{a}</span></div><CopyBtn text={a}/></div>;})}
                </Sec>
              </div>
              {prazo&&<div style={{background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.2)",borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}><div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg></div><div><div style={{fontSize:9,color:"#059669",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Prazo</div><div style={{fontSize:13,color:"#0f172a",fontWeight:600}}>{prazo}</div></div></div>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}



function CollapsibleChannels(props) {
  var sd = props.sd; var CHANNELS = props.CHANNELS;
  var [open, setOpen] = useState({"emails":true,"inmails":false,"whatsapps":false,"cold_calls":false});
  function toggle(key) { setOpen(function(prev){var n=Object.assign({},prev);n[key]=!n[key];return n;}); }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {CHANNELS.map(function(cfg){
        var items=safeArr(sd("estrategia."+cfg.key));
        if(!items.length)return null;
        var isOpen=open[cfg.key];
        return (
          <div key={cfg.key} style={{border:"1.5px solid #e8edf4",borderRadius:16,overflow:"hidden",transition:"all .25s"}}>
            <div onClick={function(){toggle(cfg.key);}} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px",background:isOpen?cfg.bg:"#fafafa",cursor:"pointer",userSelect:"none",transition:"background .2s"}}>
              <div style={{width:32,height:32,borderRadius:9,background:cfg.bg,border:"1.5px solid "+cfg.color+"40",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:800,color:cfg.color}}>{cfg.label.slice(0,2)}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{cfg.label}</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>{items.length+" template"+(items.length>1?"s":"")}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{transition:"transform .25s cubic-bezier(.22,1,.36,1)",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {isOpen&&(
              <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:12,borderTop:"1px solid #f1f5f9"}}>
                {items.map(function(item,i){
                  var text=cfg.isObj?item.corpo:item;
                  var ck=cfg.key+"-"+i;
                  return (
                    <div key={i} style={{border:"1px solid #e8edf4",borderRadius:12,overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:cfg.bg}}>
                        <span style={{fontSize:10,fontWeight:700,color:cfg.color}}>{"Template "+(i+1)}</span>
                        {cfg.isObj&&item.assunto&&<span style={{fontSize:11,color:"#64748b",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{", "+item.assunto}</span>}
                        <CopyBtn text={(cfg.isObj&&item.assunto?"Assunto: "+item.assunto+"\n\n":"")+text}/>
                      </div>
                      <div style={{padding:"14px 16px",fontSize:12.5,color:"#1e293b",whiteSpace:"pre-wrap",lineHeight:1.85,borderLeft:"3px solid "+cfg.color}}>{text}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function BibliotecaView(props) {
  var [seqs, setSeqs] = useState([]);
  var [loading, setLoading] = useState(true);
  var [openSeq, setOpenSeq] = useState(null);

  useEffect(function() {
    storageList("seq:").then(function(keys) {
      if (!keys.length) { setLoading(false); props.onCountChange(0); return; }
      Promise.all(keys.map(storageGet)).then(function(items) {
        var valid = items.filter(Boolean).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
        setSeqs(valid); setLoading(false); props.onCountChange(valid.length);
      });
    }).catch(function(){setLoading(false);});
  }, []);

  function deleteSeq(id) {
    if (!window.confirm("Remover esta sequência?")) return;
    storageDel(id).then(function() {
      setSeqs(function(prev){var n=prev.filter(function(s){return s.id!==id;});props.onCountChange(n.length);return n;});
      props.showToast("Sequência removida.","#ef4444");
    });
  }

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"64px 0",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:"#10b981"}}/><span style={{color:"#94a3b8",fontSize:13}}>Carregando...</span></div>;

  return (
    <div>
      <div style={{marginBottom:28}}>
        <div style={{fontSize:28,fontWeight:800,color:"#0f172a",marginBottom:4,letterSpacing:"-0.6px"}}>Biblioteca</div>
        <div style={{fontSize:13,color:"#64748b"}}>{seqs.length+" sequência"+(seqs.length!==1?"s":"")+" salva"+(seqs.length!==1?"s":"")+" — todas as cadências geradas ficam aqui."}</div>
      </div>

      {seqs.length===0 ? (
        <div style={{textAlign:"center",padding:"64px 0",background:"#f8fafc",borderRadius:20,border:"1.5px dashed #e2e8f0"}}>
          <div style={{fontSize:36,marginBottom:12}}>📚</div>
          <div style={{fontSize:15,fontWeight:700,color:"#334155",marginBottom:6}}>Nenhuma sequência salva ainda</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Vá para Sequências, gere uma cadência e clique em Salvar na Biblioteca.</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
          {seqs.map(function(seq){
            var fc = FIT_CONFIG[(seq.account&&seq.account.fit)||"ALTO"]||FIT_CONFIG.ALTO;
            var TOUCH_TYPES_LOCAL = {email:{label:"E-mail",color:"#0ea5e9",bg:"rgba(14,165,233,.08)"},linkedin:{label:"InMail",color:"#0a66c2",bg:"rgba(10,102,194,.08)"},whatsapp:{label:"WhatsApp",color:"#16a34a",bg:"rgba(22,163,74,.08)"},call:{label:"Cold Call",color:"#92400e",bg:"#fef3c7"},follow:{label:"Follow-up",color:"#7c3aed",bg:"#f5f3ff"},breakup:{label:"Breakup",color:"#64748b",bg:"#f8fafc"}};
            return (
              <div key={seq.id} style={{background:"#fff",border:"1.5px solid #e8edf4",borderRadius:20,padding:"20px 22px",boxShadow:"0 2px 12px rgba(15,23,42,.06)",transition:"all .25s"}}
                onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(15,23,42,.12)";e.currentTarget.style.borderColor="#d1dae8";}}
                onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(15,23,42,.06)";e.currentTarget.style.borderColor="#e8edf4";}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{seq.account&&seq.account.nome}</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{seq.profile&&seq.profile.label}</div>
                    <div style={{fontSize:10,color:"#cbd5e1"}}>{fmtDate(seq.createdAt)}</div>
                  </div>
                  <span style={{background:fc.bg,border:"1px solid "+fc.border,color:fc.text,borderRadius:8,padding:"3px 10px",fontSize:9,fontWeight:700,flexShrink:0,marginLeft:8}}>{"FIT "+(seq.account&&seq.account.fit)}</span>
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
                  {safeArr(seq.touches).map(function(t,i){
                    var tc=TOUCH_TYPES_LOCAL[t.type]||TOUCH_TYPES_LOCAL.email;
                    return <span key={i} style={{background:tc.bg,color:tc.color,borderRadius:6,padding:"2px 8px",fontSize:9,fontWeight:700}}>{"D"+t.day+" "+tc.label}</span>;
                  })}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={function(){setOpenSeq(seq);}} style={{flex:1,background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:10,padding:"9px 0",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px rgba(16,185,129,.3)"}}>Abrir Sequência</button>
                  <button onClick={function(){deleteSeq(seq.id);}} style={{background:"none",border:"1px solid #fee2e2",color:"#ef4444",borderRadius:10,padding:"9px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Remover</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openSeq&&<SequenceModal seq={openSeq} onClose={function(){setOpenSeq(null);}}/>}
    </div>
  );
}

function Sec(props) {
  return (
    <div style={{marginBottom:22}}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#10b981",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
        {props.title}
      </div>
      {props.children}
    </div>
  );
}
function R(props) {
  return <div style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid #f1f5f9",fontSize:12.5,color:"#334155",lineHeight:1.55}}><span style={{color:props.color,flexShrink:0,fontWeight:700}}>{props.icon}</span>{props.children}</div>;
}

// ── SEARCH VIEW ───────────────────────────────────────────────────────────────
function SearchView(props) {
  var [inputVal, setInputVal] = useState("");
  var [loading, setLoading] = useState(false);
  var [done, setDone] = useState(null);
  var [searchError, setSearchError] = useState("");
  var [duplicate, setDuplicate] = useState(null);

  function isUrl(v) { return /^https?:\/\//i.test(v) || /^www\./.test(v); }

  function extractDomain(val) {
    if (!isUrl(val)) return "";
    try { var url = val.startsWith("http") ? val : "https://" + val; return new URL(url).hostname.replace(/^www\./, ""); }
    catch(e) { return ""; }
  }

  function buildData(company, searchResults) {
    var lower = company.toLowerCase();
    var tavilyAnswers = [];
    if (Array.isArray(searchResults)) {
      searchResults.forEach(function(block) {
        if (block.answer && block.answer.trim().length > 20) tavilyAnswers.push(block.answer.trim());
      });
    }
    var allText = tavilyAnswers.join(" ");
    function extractVal(pats) { for (var i=0;i<pats.length;i++){var m=allText.match(pats[i]);if(m)return m[0];}return null; }
    var faturamento = extractVal([/R\$[\s]*[\d,\.]+[\s]*(bilh[oõ]es?|milh[oõ]es?)[^\.,]*/i]);
    var funcionarios = extractVal([/[\d\.]+[\s]*mil[\s]*funcion[aá]rios?/i,/[\d\.]+[\s]*colaboradores?/i]);
    var bolsa = extractVal([/listada?[^\.,]*(B3|Nasdaq|NYSE)/i]);
    var clientes = extractVal([/[\d,\.]+[\s]*(milh[oõ]es?|mil)[\s]*(de[\s]*)?(clientes?|usu[aá]rios?)/i]);
    var isFintech = /nubank|c6|inter|stone|pagseguro|pagbank|picpay|cielo|btg|xp|neon|creditas|banco/.test(lower);
    var isSaaS   = /totvs|linx|vtex|rdstation|senior|sankhya|contaazul|omie|pipefy/.test(lower);
    var isHealth = /hapvida|amil|unimed|dasa|fleury|einstein|afya|saude|health/.test(lower);
    var isEcomm  = /magalu|americanas|shopee|mercado livre|olist/.test(lower);
    var isTelecom= /\bvivo\b|claro|\btim\b|algar|embratel/.test(lower);
    var setor = isFintech?"Fintech / Banco Digital":isSaaS?"Software / SaaS B2B":isHealth?"Healthtech / Saude Digital":isEcomm?"E-commerce / Varejo Digital":isTelecom?"Telecomunicações":"Empresa com Produto Digital";
    var tier  = (isFintech||isSaaS||isEcomm||isTelecom) ? "Tier 1" : "Tier 2";
    var resumo = tavilyAnswers.length > 0
      ? (tavilyAnswers[0]+(tavilyAnswers[1]?" "+tavilyAnswers[1]:"")).slice(0,500)
      : company+" e uma empresa do setor de "+setor+" com operacao digital relevante no Brasil.";
    var allSources = [];
    if (Array.isArray(searchResults)) { searchResults.forEach(function(b){(b.sources||[]).forEach(function(s){allSources.push(s);});}); }
    var noticias = allSources.filter(function(s){return s.url&&s.title;}).slice(0,4).map(function(s){return {titulo:s.title,resumo:(s.content||"").slice(0,200),relevancia:"Fonte online",url:s.url};});
    if (!noticias.length) noticias = [{titulo:"Buscar noticias recentes de "+company,resumo:"Pesquise '"+company+" seguranca ISO vulnerabilidade' no Google News.",relevancia:"Trigger identification",url:""}];
    return {
      empresa:{nome:company,setor:setor,resumo:resumo,tamanho:funcionarios||(tier==="Tier 1"?"Grande porte":"Medio porte"),faturamento:faturamento||null,clientes:clientes||null,estagio:"Consolidada / Scale-up",bolsa:bolsa||(isFintech||isSaaS?"Verificar B3/Nasdaq":"Capital fechado")},
      fit:{score:"ALTO",justificativa:company+" atua em "+setor+", vertical de alta aderencia ao ICP da Conviso Application Security. Empresas nesse perfil tem times de desenvolvimento ativos e pressao crescente por AppSec formal de clientes e reguladores.",solucoes_conviso:["Conviso Platform","SAST — Analise Estatica","DAST — Teste Dinamico","SCA — Open Source Security","Gestão de Vulnerabilidades","Pentest Continuo","Security Champions Program"],use_cases:["SAST e DAST integrados ao pipeline CI/CD","Gestão centralizada de vulnerabilidades com SLA","Pentest continuo em APIs e aplicações web","Security Champions — devs como multiplicadores","Compliance ISO 27001 e PCI-DSS acelerado"]},
      mercado:{competidores_provedor:["Veracode","Checkmarx","Snyk","SonarQube","Fluid Attacks","GitHub Advanced Security"]},
      dores:{principais:["Vulnerabilidades críticas descobertas apenas em producao — custo 6x maior de remediação","Time de seguranca sobrecarregado, sem escala para acompanhar deploys","Clientes enterprise exigindo ISO 27001 ou SOC 2 para fechar contratos","PCI-DSS v4.0 exige SAST e DAST formais em aplicações de pagamento","Open source sem controle — dependencias com CVEs críticos em producao"],exposicao_regulatoria:["PCI-DSS v4.0","BACEN Res. 4.658","ISO 27001","LGPD","OWASP Top 10"],sinais_ativos:["Verificar vagas de AppSec Engineer e DevSecOps no LinkedIn","Checar certificação ISO 27001 publica — ausencia e oportunidade","Buscar CVEs públicos associados a produtos da empresa no NVD","Monitorar bug bounty programs ativos"]},
      triggers:["Processo de certificação ISO 27001 ou SOC 2 em andamento","Crescimento acelerado do time de engenharia","Incidente de seguranca recente ou vazamento de dados","Cliente enterprise bloqueando contrato por falta de AppSec","Lancamento de novo produto digital ou API publica"],
      stakeholders:[
        {cargo:"CISO / Head de Seguranca da Informação",angulo:"Decisor estrategico. Define budget e estrategia de AppSec. Sente pressao de clientes, reguladores e board. Quer reduzir risco sem frear o produto.",prioridade:"PRIMARIO",urgencia:"Alta"},
        {cargo:"CTO / VP de Engenharia",angulo:"Co-decisor tecnico e economico. Controla o roadmap e quer seguranca integrada ao pipeline sem travar entregas.",prioridade:"PRIMARIO",urgencia:"Alta"},
        {cargo:"Engineering Manager / Head de Engenharia",angulo:"Usuario direto e influenciador forte. Avalia friccao da integração e qualidade dos resultados no pipeline.",prioridade:"SECUNDARIO",urgencia:"Media"},
        {cargo:"CPO / Head de Produto",angulo:"Aliado estrategico. Quer AppSec como diferencial para fechar deals enterprise.",prioridade:"SECUNDARIO",urgencia:"Media"},
        {cargo:"Head de Compliance / Juridico",angulo:"Entra em deals com exigencia regulatoria. Valida aderencia da solução ao framework regulatorio.",prioridade:"TERCIARIO",urgencia:"Baixa"},
        {cargo:"CFO / Diretor Financeiro",angulo:"Aprovacao de budget. Quer ROI claro — custo de vuln em producao 6x maior vs investimento na Conviso.",prioridade:"TERCIARIO",urgencia:"Baixa"},
      ],
      noticias: noticias,
      estrategia:{
        tier:tier,
        emails:[
          {assunto:company+" + Conviso — seguranca de aplicações",corpo:"Ola,\n\nChego ate voce porque "+company+" tem o perfil exato de empresa onde a Conviso Application Security gera mais impacto — time de engenharia ativo em "+setor+", com pressao crescente por AppSec formal.\n\nUma realidade comum em empresas similares:\n, Vulnerabilidades críticas descobertas apenas em producao — custo 6x maior\n, Time de seguranca sem escala para acompanhar o ritmo de deploys\n, Clientes enterprise bloqueando contratos por falta de AppSec formal\n\nA Conviso Platform integra SAST, DAST, SCA e gestão de vulnerabilidades no pipeline — com integração nativa ao GitHub, GitLab e Azure DevOps.\n\nConsigo te mostrar em 20 minutos como funciona.\n\nTem disponibilidade essa semana?\n\nAbraço,\nAndrei Heimann\nAccount Executive | Conviso Application Security\n(51) 99436-7667"},
          {assunto:company+": quanto custa uma vulnerabilidade em producao?",corpo:"Ola,\n\nDireto ao ponto: o custo medio de remediação de uma vulnerabilidade descoberta em producao e 6x maior do que se detectada durante o desenvolvimento.\n\nEmpresas de "+setor+" reduziram esse custo em mais de 70% ao integrar SAST e DAST no pipeline — sem frear a velocidade de entrega.\n\nA "+company+" tem o perfil certo para esse resultado. Valeria 20 minutos?\n\nAbraço,\nAndrei Heimann | Conviso Application Security"},
          {assunto:"Case: ISO 27001 em 60% menos tempo — empresa similar a "+company,corpo:"Ola,\n\nRecentemente ajudamos uma empresa de "+setor+" a:\n\n, Integrar SAST no pipeline CI/CD em menos de 2 semanas\n, Zerar vulnerabilidades críticas em producao nos primeiros 90 dias\n, Reduzir em 60% o tempo para certificação ISO 27001\n, Criar um programa Security Champions escalavel\n\nO time de engenharia não precisou parar o roadmap — o nosso CS conduziu tudo.\n\nFaz sentido eu te contar como funcionou? 20 minutos essa semana.\n\nAbraço,\nAndrei Heimann\nAccount Executive | Conviso Application Security\n(51) 99436-7667"},
        ],
        inmails:[
          {assunto:company+" + Conviso — vale 20 minutos?",corpo:"Ola, tudo bem?\n\nVi que "+company+" tem um time de engenharia ativo em "+setor+", exatamente o perfil onde a Conviso entrega mais resultado.\n\nEmpresa similar reduziu vulnerabilidades críticas em 70% e acelerou ISO 27001 em 60% apos integrar a Conviso Platform no pipeline.\n\nFaz sentido um papo de 20 minutos para eu entender como esta o processo de AppSec de voces hoje?\n\nAbraço,\nAndrei Heimann | AE Enterprise — Conviso Application Security"},
          {assunto:"Uma pergunta sobre seguranca no ciclo de desenvolvimento",corpo:"Ola!\n\nPergunta direta: como voces identificam vulnerabilidades no codigo hoje — e automatizado no pipeline, manual, ou atraves de pentests pontuais?\n\nDependendo da resposta, posso te mostrar como empresas similares resolveram isso de forma estruturada com a Conviso Platform.\n\nVale um papo rápido?"},
          {assunto:"Vi que "+company+" esta crescendo — parabens",corpo:"Ola,\n\nAcompanho o crescimento da "+company+" no setor de "+setor+".\n\nEmpresa que cresce rápido em produto digital normalmente enfrenta um desafio específico: a velocidade de desenvolvimento cresce mais rápido que a maturidade de seguranca — e o risco cresce junto.\n\nValeria 15 minutos para mostrar como outras empresas do mesmo segmento anteciparam esse problema?\n\nAbraço,\nAndrei Heimann | Conviso Application Security"},
        ],
        whatsapps:[
          "Oi [Nome], tudo bem? Sou o Andrei da Conviso Application Security. Vi que "+company+" tem um time de engenharia ativo em "+setor+". Trabalhamos com AppSec integrada ao pipeline de desenvolvimento. Valeria 15 minutos essa semana?",
          "Oi [Nome]! Andrei, da Conviso AppSec. Direto ao ponto: empresa do mesmo setor da "+company+" reduziu 70% das vulnerabilidades críticas e acelerou ISO 27001 em 60% com nossa plataforma. Tenho um case rápido. Posso te mandar?",
          "Oi [Nome], Andrei da Conviso Application Security. Voce cuida de seguranca de aplicações ou engenharia na "+company+"? Se sim, tenho algo relevante — 15 minutos essa semana. Se não for voce, quem seria o contato certo?",
        ],
        cold_calls:[
          "Bom dia [Nome], aqui e o Andrei da Conviso Application Security. Tenho 30 segundos? [PAUSA] Perfeito. Trabalho com seguranca de aplicações integrada ao ciclo de desenvolvimento — e a "+company+" tem exatamente o perfil onde a gente gera mais resultado em "+setor+". Empresas similares reduziram vulnerabilidades críticas em 70% sem frear o time de produto. Faz sentido eu te mostrar como funcionou? Quando voce tem 20 minutos?",
          "[Nome], bom dia! Andrei da Conviso AppSec. Ligo porque a "+company+" apareceu no nosso radar. Uma pergunta: hoje voces tem algum processo automatizado de seguranca no pipeline — SAST, DAST, analise de dependencias? [ouvir] Entendi. E quando descobrem uma vulnerabilidade crítica, qual e o processo de priorização e correção hoje?",
          "Oi [Nome], Andrei da Conviso AppSec. Vou ser rápido. Tenho um case de empresa de "+setor+" com perfil muito similar ao da "+company+" — reduziram 70% das vulns em producao e aceleraram a ISO 27001 em 60%. Vale 2 minutos agora ou prefere que eu ligue amanha?",
        ],
        perguntas_spin:[
          "SITUAÇÃO: Como esta estruturado hoje o processo de seguranca de aplicações — e manual, automatizado no pipeline, ou ainda não tem processo formal?",
          "SITUAÇÃO: Qual o tamanho do time de engenharia e quantos deploys por semana fazem hoje?",
          "SITUAÇÃO: Voces usam alguma ferramenta de SAST, SCA ou analise de dependencias integrada ao pipeline hoje?",
          "SITUAÇÃO: Existe um time ou profissional dedicado de seguranca de aplicações?",
          "PROBLEMA: Com que frequencia vulnerabilidades críticas chegam ate producao sem serem detectadas antes?",
          "PROBLEMA: Quando uma vulnerabilidade e encontrada, qual e o processo de priorização e correção? Tem SLA definido?",
          "PROBLEMA: Algum cliente enterprise ja exigiu relatorio de pentest ou evidencia de AppSec para fechar contrato?",
          "PROBLEMA: O time de dev tem cultura de seguranca, ou ainda e vista como responsabilidade exclusiva do time de infra?",
          "IMPLICAÇÃO: Qual o custo estimado de remediação de uma vuln crítica em producao vs no desenvolvimento?",
          "IMPLICAÇÃO: Voces estao em processo de certificação ISO 27001, SOC 2 ou PCI-DSS? Qual o impacto de não ter AppSec formalizada?",
          "IMPLICAÇÃO: Se ocorrer um incidente de seguranca em producao, qual seria o impacto financeiro, reputacional e contratual?",
          "NECESSIDADE: Se tivessem SAST, DAST e gestão de vulnerabilidades integrados no pipeline hoje, qual seria o impacto?",
          "NECESSIDADE: O que precisaria acontecer para AppSec subir de prioridade na agenda — ou ja esta prioritaria?",
          "NECESSIDADE: Se eu conseguisse te mostrar como integrar seguranca no pipeline em 2 semanas sem impactar o roadmap, isso seria suficiente para uma POC?",
        ],
        objecoes:[
          {objecao:"Ja usamos SonarQube / ferramenta interna",resposta:"SonarQube e otimo para qualidade de codigo. A diferenca com a Conviso Platform e a camada de gestão de vulnerabilidades com contexto de risco de negocio, DAST para aplicações em execucao, SCA para open source e o programa Security Champions. Posso mostrar como as duas se complementam em 20 minutos?"},
          {objecao:"Não temos budget para isso agora",resposta:"Entendo. Antes de fecharmos: qual o custo estimado de remediação de uma vuln crítica em producao, considerando horas de engenharia, rollback e risco regulatorio? Na maioria dos cases, o investimento na Conviso paga em um único incidente evitado."},
          {objecao:"Nossa TI não tem capacidade de implementacao agora",resposta:"A integração com GitHub, GitLab ou Azure DevOps leva em media 2 semanas e e conduzida pelo nosso time de CS — o time de voces não precisa parar o roadmap."},
          {objecao:"Não e prioridade agora, temos outros projetos",resposta:"Faz sentido. Voces tem algum cliente enterprise ou processo de certificação onde AppSec sera exigida nos próximos 6 meses? Normalmente esse tema sobe de prioridade antes do esperado."},
          {objecao:"Ja fazemos pentest periodicamente",resposta:"Pentest pontual e um otimo começo. A diferenca: com deploys frequentes, vulnerabilidades novas surgem entre um pentest e outro. A Conviso complementa com analise continua no pipeline."},
          {objecao:"Precisamos envolver o time de engenharia antes",resposta:"Perfeito — e o caminho certo. Posso preparar uma demo tecnica com o Engineering Manager mostrando a integração no pipeline real de voces. Quem seria o ponto de contato tecnico?"},
          {objecao:"Ja tentamos uma ferramenta de AppSec e o time não adotou",resposta:"O que não funcionou — friccao na integração, muitos falsos positivos, ou o time não sabia priorizar os resultados? A Conviso tem um modelo de Security Champions específico para resolver esse problema de adocao."},
          {objecao:"Preferimos fazer internamente",resposta:"Faz sentido. A Conviso não substitui o time interno — ela da a plataforma e os dados para o time trabalhar com mais eficiencia. Qual e a cobertura atual em aplicações monitoradas vs total do portfolio?"},
        ]
      },
      proximos_passos:{
        ae:["Mapear organograma no LinkedIn Sales Navigator — foco em CISO, CTO e Head de Engenharia da "+company,"Pesquisar vagas abertas de AppSec Engineer, Security Engineer e DevSecOps — sinal de dor ativa","Verificar certificação ISO 27001 publica da "+company+" — ausencia e oportunidade direta","Buscar CVEs públicos associados a produtos da "+company+" no NVD ou GitHub Security Advisories","Preparar business case com custo de remediação de vuln em producao vs investimento na Conviso","Enviar InMail personalizado ao CISO ou CTO referenciando o contexto regulatorio do setor de "+setor],
        bdr:["Cold call focado em CISO e CTO — não confundir com outros perfis de seguranca","Enviar WhatsApp com Loom personalizado referenciando o case mais relevante do segmento","Disparar sequência de 4 emails (Custo de Vuln, Case, ISO 27001, FUP Final)","Monitorar sinais via 6Sense — alertar AE sobre contas com intencao ativa","Mapear eventos do setor: Mind The Sec, Security Leaders, CIAB, eventos de tecnologia"],
        prazo:"Primeira abordagem em ate 48 horas — prioridade Tier 1 se ha sinal de certificação, incidente ou cliente enterprise exigindo AppSec"
      }
    };
  }

  function handleSearch() {
    if (!inputVal.trim() || loading) return;
    var nome = inputVal.trim();
    var domain = extractDomain(nome);

    // Check in-memory for duplicate first (instant, no async needed)
    var nomeLower = nome.toLowerCase().trim();
    if (props.accounts) {
      var dup = props.accounts.find(function(a){ return a.nome && a.nome.toLowerCase().trim() === nomeLower; });
      if (dup) { setDuplicate(dup); setInputVal(""); return; }
    }

    setLoading(true); setDone(null); setSearchError("");

    function doEnrich(n, d) {
      fetch("/api/stakeholders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({company:n,domain:d})})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(stakhData){
          if(!stakhData||!stakhData.contacts||!stakhData.contacts.length) return;
          storageList("acc:").then(function(keys){
            keys.forEach(function(k){
              storageGet(k).then(function(stored){
                if(!stored||stored.nome.toLowerCase()!==n.toLowerCase()) return;
                var merged = mergeStakeholders((stored.data&&stored.data.stakeholders)||[], stakhData.contacts);
                var updated = Object.assign({},stored,{
                  data:Object.assign({},stored.data,{stakeholders:merged}),
                  enriched:{contacts:stakhData.contacts,sources:stakhData.sources||[]}
                });
                storageSet(k, updated);
                if(props.onUpdateAccount) props.onUpdateAccount(updated);
              });
            });
          });
        }).catch(function(){});
    }

    fetch("/api/search", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({company:nome,context:""})})
      .then(function(r){ if(!r.ok) return r.json().then(function(j){throw new Error(j.error||"HTTP "+r.status);}); return r.json(); })
      .then(function(resp){
        var data = buildData(nome, resp.results);
        props.onSave(nome, data, true);
        doEnrich(nome, domain);
        setLoading(false); setDone(nome); setInputVal("");
      })
      .catch(function(){
        var data = buildData(nome, null);
        props.onSave(nome, data, false);
        doEnrich(nome, domain);
        setLoading(false); setDone(nome); setInputVal("");
        setSearchError("Busca online indisponivel. Account mapping gerado com base de conhecimento.");
      });
  }



  return (
    <div>
      <div style={{marginBottom:32}}>
        <div style={{fontSize:26,fontWeight:800,color:"#0f172a",marginBottom:6,letterSpacing:"-0.5px"}}>
          Account <span style={{color:"#10b981"}}>Mapping</span>
        </div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:28,lineHeight:1.7}}>Digite o nome da empresa para gerar o mapeamento completo. O resultado e salvo automaticamente em Contas.</div>
        <div style={{display:"flex",gap:10}}>
          <input value={inputVal} onChange={function(e){setInputVal(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")handleSearch();}}
            placeholder="Ex: Nubank, TOTVS, Stone..."
            style={{flex:1,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"14px 18px",fontSize:13.5,color:"#0f172a",fontFamily:"inherit",outline:"none",boxShadow:"0 1px 3px rgba(15,23,42,.06)",transition:"border-color .2s"}}
            onFocus={function(e){e.target.style.borderColor="#10b981";}} onBlur={function(e){e.target.style.borderColor="#e2e8f0";}}/>
          <button onClick={handleSearch} disabled={loading||!inputVal.trim()}
            style={{background:loading||!inputVal.trim()?"#e2e8f0":"linear-gradient(135deg,#10b981,#059669)",color:loading||!inputVal.trim()?"#94a3b8":"#fff",border:"none",borderRadius:12,padding:"14px 28px",fontSize:13,fontWeight:600,cursor:loading||!inputVal.trim()?"not-allowed":"pointer",fontFamily:"inherit",boxShadow:loading||!inputVal.trim()?"none":"0 4px 14px rgba(16,185,129,.35)",transition:"all .2s",whiteSpace:"nowrap"}}>
            {loading?"Analisando...":"Analisar"}
          </button>
        </div>
        {searchError && (
          <div style={{marginTop:14,background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"12px 16px",fontSize:12,color:"#92400e"}}>{searchError}</div>
        )}

        {searchError && (
          <div style={{marginTop:12,background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"12px 16px",fontSize:12,color:"#92400e"}}>{searchError}</div>
        )}
        {duplicate && (
          <div style={{marginTop:14,background:"#fff7ed",border:"1.5px solid #fb923c",borderRadius:14,padding:"14px 18px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#9a3412",marginBottom:3}}>{"Conta já mapeada: "+duplicate.nome}</div>
                <div style={{fontSize:11,color:"#c2410c"}}>{duplicate.setor + " — " + (STATUS_CONFIG[duplicate.status]&&STATUS_CONFIG[duplicate.status].label)}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){props.onOpenAccount(duplicate);}} style={{background:"#ea580c",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  Ver mapeamento
                </button>
                <button onClick={function(){setDuplicate(null);}} style={{background:"none",border:"1px solid #fb923c",color:"#ea580c",borderRadius:10,padding:"8px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>x</button>
              </div>
            </div>
          </div>
        )}
        {done && (
          <div style={{marginTop:14,display:"flex",alignItems:"center",gap:10,background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,padding:"12px 16px",fontSize:13,color:"#065f46",fontWeight:600}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {done + " mapeado e salvo em Contas!"}
          </div>
        )}
      </div>

      <div style={{background:"linear-gradient(160deg,#f0fdf8 0%,#fff 60%)",border:"1px solid rgba(16,185,129,.2)",borderRadius:20,padding:"20px 24px",marginBottom:24,position:"relative",overflow:"hidden"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:16}}>Como funciona o BDR Helper Pro V1</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14}}>
          {[
            {n:"1",title:"Busca",desc:"Analise qualquer empresa e gere o account mapping completo com fit, dores, stakeholders e mensagens."},
            {n:"2",title:"Contas",desc:"Todas as empresas ficam salvas com status de prospecção. Nunca refaça uma busca, o histórico é permanente."},
            {n:"3",title:"Sequências",desc:"Gere cadências de 6 toques personalizadas por stakeholder com scripts prontos para copiar e usar."},
            {n:"4",title:"Pipeline",desc:"Kanban visual para acompanhar cada conta do mapeamento até o fechamento do deal."},
          ].map(function(item) {
            return (
              <div key={item.n}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{width:24,height:24,borderRadius:7,background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#059669",flexShrink:0}}>{item.n}</div>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#0f172a"}}>{item.title}</div>
                </div>
                <div style={{fontSize:11,color:"#64748b",lineHeight:1.55}}>{item.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNTS VIEW ─────────────────────────────────────────────────────────────
function AccountsView(props) {
  var accounts = props.accounts;
  var [filter, setFilter] = useState({fit:"",tier:"",status:""});
  var [search, setSearch] = useState("");

  var filtered = accounts.filter(function(a) {
    if (filter.fit && a.fit !== filter.fit) return false;
    if (filter.tier && a.tier !== filter.tier) return false;
    if (filter.status && a.status !== filter.status) return false;
    if (search && !a.nome.toLowerCase().includes(search.toLowerCase()) && !a.setor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  var statCounts = {};
  STATUS_ORDER.forEach(function(s){statCounts[s]=accounts.filter(function(a){return a.status===s;}).length;});

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontSize:28,fontWeight:800,color:"#0f172a",marginBottom:4,letterSpacing:"-0.6px"}}>Contas</div>
          <div style={{fontSize:13,color:"#64748b"}}>{accounts.length+" empresa"+(accounts.length!==1?"s":"")+" mapeada"+(accounts.length!==1?"s":"")}</div>
        </div>
      </div>
      <div className="status-chips" style={{display:"flex",gap:10,marginBottom:24,overflowX:"auto",paddingBottom:4}}>
        {STATUS_ORDER.map(function(s){
          var sc=STATUS_CONFIG[s]; var cnt=statCounts[s];
          return <div key={s} onClick={function(){setFilter(function(f){return Object.assign({},f,{status:f.status===s?"":s});});}} style={{flexShrink:0,background:filter.status===s?sc.bg:"#fff",border:"1.5px solid "+(filter.status===s?sc.border:"#e8edf4"),borderRadius:14,padding:"12px 16px",cursor:"pointer",transition:"all .2s cubic-bezier(.22,1,.36,1)",textAlign:"center",minWidth:100,boxShadow:filter.status===s?"0 4px 16px rgba(15,23,42,.1)":"0 1px 4px rgba(15,23,42,.04)"}}>
            <div style={{fontSize:20,fontWeight:800,color:filter.status===s?sc.color:"#64748b"}}>{cnt}</div>
            <div style={{fontSize:9,fontWeight:600,color:filter.status===s?sc.color:"#94a3b8",textTransform:"uppercase",letterSpacing:.8,marginTop:2}}>{sc.label}</div>
          </div>;
        })}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Buscar por nome ou setor..."
          style={{flex:1,minWidth:200,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"9px 14px",fontSize:13,color:"#0f172a",fontFamily:"inherit",outline:"none",transition:"border-color .2s"}}
          onFocus={function(e){e.target.style.borderColor="#10b981";}} onBlur={function(e){e.target.style.borderColor="#e2e8f0";}}/>
        {[["fit",["","ALTO","MEDIO","BAIXO"],["Fit","Fit Alto","Fit Medio","Fit Baixo"]],["tier",["","Tier 1","Tier 2","Tier 3"],["Tier","Tier 1","Tier 2","Tier 3"]]].map(function(cfg){
          return <select key={cfg[0]} value={filter[cfg[0]]} onChange={function(e){setFilter(function(f){var n=Object.assign({},f);n[cfg[0]]=e.target.value;return n;});}} style={{background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"9px 14px",fontSize:12,color:filter[cfg[0]]?"#0f172a":"#94a3b8",fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
            {cfg[1].map(function(v,i){return <option key={v} value={v}>{cfg[2][i]}</option>;})}</select>;
        })}
        {(filter.fit||filter.tier||filter.status||search)&&<button onClick={function(){setFilter({fit:"",tier:"",status:""});setSearch("");}} style={{background:"#fee2e2",border:"1px solid #fecdd3",color:"#991b1b",borderRadius:10,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Limpar</button>}
      </div>
      {filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"64px 0",background:"#f8fafc",borderRadius:20,border:"1.5px dashed #e2e8f0"}}>
          <div style={{fontSize:36,marginBottom:12}}>🔍</div>
          <div style={{fontSize:15,fontWeight:700,color:"#334155",marginBottom:6}}>{accounts.length===0?"Nenhuma conta mapeada ainda":"Nenhuma conta com esses filtros"}</div>
          <div style={{fontSize:12,color:"#94a3b8"}}>{accounts.length===0?"Vá para Busca e analise sua primeira empresa":"Tente limpar os filtros"}</div>
        </div>
      ) : (
        <div className="card-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {filtered.map(function(acc){return <AccountCard key={acc.id} acc={acc} onOpen={props.onOpen} onStatusChange={props.onStatusChange} onDelete={props.onDelete}/>;}) }
        </div>
      )}
    </div>
  );
}


// ── INSIGHTS VIEW ─────────────────────────────────────────────────────────────

// Merge API-enriched contacts into stakeholder profiles
function mergeStakeholders(stakeholders, contacts) {
  var keywords = {
    "CISO":["ciso","chief information security","head of security","segurança da informação","information security"],
    "CTO":["cto","chief technology","vp engineering","vp de engenharia","head of engineering","diretor de tecnologia"],
    "Engineering Manager":["engineering manager","head of engineering","tech lead","líder técnico"],
    "CPO":["cpo","chief product","head of product","head de produto","vp product"],
    "CFO":["cfo","chief financial","diretor financeiro","vp finance"],
    "Compliance":["compliance","jurídico","legal","regulat"],
  };
  return stakeholders.map(function(s) {
    if (s.linkedin || s.email) return s; // already enriched
    var cargo = (s.cargo||"").toLowerCase();
    var matched = null;
    Object.keys(keywords).forEach(function(k) {
      if (matched) return;
      keywords[k].forEach(function(kw) {
        if (!matched && cargo.includes(k.toLowerCase())) {
          // find contact whose title matches
          contacts.forEach(function(c) {
            if (!matched && c.cargo && c.cargo.toLowerCase().includes(kw)) matched = c;
          });
        }
      });
    });
    if (!matched) {
      // Try broader match
      contacts.forEach(function(c) {
        if (matched) return;
        var ct = (c.cargo||"").toLowerCase();
        if (cargo.split(" ").some(function(w){return w.length>4&&ct.includes(w);})) matched = c;
      });
    }
    if (matched) {
      return Object.assign({},s,{
        nome: matched.nome||s.nome||"",
        email: matched.email||s.email||"",
        linkedin: matched.linkedin||s.linkedin||"",
        phone: matched.phone||s.phone||"",
        source: matched.source||"",
      });
    }
    return s;
  });
}

function SemiCircleChart(props) {
  var convSteps = props.convSteps||[];
  var colors=["#0f172a","#0369a1","#7c3aed","#065f46","#991b1b"];
  var radii=[90,76,62,48,34];
  var steps=convSteps.slice(0,5);
  var pathData=steps.map(function(step,i){
    var pct=step.pct/100;
    var r=radii[i];
    if(pct<=0) return null;
    var startA=Math.PI; var endA=Math.PI+(Math.PI*pct);
    var x1=100+r*Math.cos(startA); var y1=100+r*Math.sin(startA);
    var x2=100+r*Math.cos(endA);   var y2=100+r*Math.sin(endA);
    var large=pct>0.5?1:0;
    return {d:"M "+x1+" "+y1+" A "+r+" "+r+" 0 "+large+" 1 "+x2+" "+y2,color:colors[i],key:i};
  }).filter(Boolean);
  return (
    <svg width="200" height="110" viewBox="0 0 200 110">
      {pathData.map(function(p){return <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth="10" strokeLinecap="round" opacity="0.85"/>;})}
      <text x="100" y="98" textAnchor="middle" fontSize="11" fill="#94a3b8">0%</text>
      <text x="10" y="105" textAnchor="middle" fontSize="11" fill="#94a3b8">Map.</text>
      <text x="190" y="105" textAnchor="middle" fontSize="11" fill="#065f46">Conv.</text>
    </svg>
  );
}

function InsightsView(props) {
  var accounts = props.accounts;
  var total = accounts.length;

  // ── SVG Donut chart helper
  function buildDonutPaths(segments, cx, cy, r, innerR) {
    var total2=segments.reduce(function(s,seg){return s+(seg.value||0);},0)||1;
    var startAngle=-Math.PI/2;
    var result=[];
    for(var i=0;i<segments.length;i++){
      var seg=segments[i];
      var angle=(seg.value/total2)*Math.PI*2;
      var endAngle=startAngle+angle;
      var x1=cx+r*Math.cos(startAngle); var y1=cy+r*Math.sin(startAngle);
      var x2=cx+r*Math.cos(endAngle);   var y2=cy+r*Math.sin(endAngle);
      var ix1=cx+innerR*Math.cos(endAngle); var iy1=cy+innerR*Math.sin(endAngle);
      var ix2=cx+innerR*Math.cos(startAngle); var iy2=cy+innerR*Math.sin(startAngle);
      var large=angle>Math.PI?1:0;
      if(seg.value>0) result.push({d:"M "+x1+" "+y1+" A "+r+" "+r+" 0 "+large+" 1 "+x2+" "+y2+" L "+ix1+" "+iy1+" A "+innerR+" "+innerR+" 0 "+large+" 0 "+ix2+" "+iy2+" Z",fill:seg.color,key:i});
      startAngle=endAngle;
    }
    return result;
  }
  function DonutChart(dprops) {
    var segments=dprops.segments; var size=dprops.size||120; var hole=dprops.hole||0.62;
    var cx=size/2; var cy=size/2; var r=size/2-8; var innerR=r*hole;
    var pathData=buildDonutPaths(segments,cx,cy,r,innerR);
    return (
      <svg width={size} height={size} viewBox={"0 0 "+size+" "+size}>
        {pathData.map(function(p){return <path key={p.key} d={p.d} fill={p.fill} opacity="0.9"/>;})}
        {dprops.centerLabel&&<text x={cx} y={cy-5} textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{dprops.centerLabel}</text>}
        {dprops.centerSub&&<text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#94a3b8">{dprops.centerSub}</text>}
      </svg>
    );
  }

  // ── Funnel by status
  var funnel = STATUS_ORDER.map(function(s) {
    return { status:s, label:STATUS_CONFIG[s].label, count:accounts.filter(function(a){return a.status===s;}).length, color:STATUS_CONFIG[s].color, bg:STATUS_CONFIG[s].bg, border:STATUS_CONFIG[s].border };
  });
  var maxFunnel = Math.max.apply(null, funnel.map(function(f){return f.count;})) || 1;

  // ── By fit score
  var byFit = ["ALTO","MEDIO","BAIXO"].map(function(f) {
    var cnt = accounts.filter(function(a){return a.fit===f;}).length;
    return { fit:f, count:cnt, pct:total?Math.round(cnt/total*100):0, color:FIT_CONFIG[f].text, bg:FIT_CONFIG[f].bg, border:FIT_CONFIG[f].border };
  });

  // ── By tier
  var byTier = ["Tier 1","Tier 2","Tier 3"].map(function(t) {
    var cnt = accounts.filter(function(a){return a.tier===t;}).length;
    return { tier:t, count:cnt, pct:total?Math.round(cnt/total*100):0, color:TIER_COLOR[t]||"#94a3b8" };
  });

  // ── By setor (top 6)
  var setorMap = {};
  accounts.forEach(function(a) {
    var s = (a.setor||"Outros").split("/")[0].trim();
    setorMap[s] = (setorMap[s]||0) + 1;
  });
  var bySetor = Object.keys(setorMap).map(function(s){return {setor:s,count:setorMap[s]};})
    .sort(function(a,b){return b.count-a.count;}).slice(0,6);
  var maxSetor = (bySetor[0]&&bySetor[0].count)||1;

  // ── Velocity: accounts saved by week (last 8 weeks)
  var now = Date.now();
  var weeks = [];
  for (var w = 7; w >= 0; w--) {
    var wStart = now - (w+1)*7*24*60*60*1000;
    var wEnd   = now - w*7*24*60*60*1000;
    var label  = w===0?"Esta semana":"Sem -"+(w);
    var cnt    = accounts.filter(function(a){return a.savedAt>=wStart && a.savedAt<wEnd;}).length;
    weeks.push({label:label, count:cnt});
  }
  var maxWeek = Math.max.apply(null, weeks.map(function(w){return w.count;})) || 1;

  // ── Conversion rates
  var contacted  = accounts.filter(function(a){return ["contacted","meeting","proposal","won"].indexOf(a.status)>-1;}).length;
  var meeting    = accounts.filter(function(a){return ["meeting","proposal","won"].indexOf(a.status)>-1;}).length;
  var proposal   = accounts.filter(function(a){return ["proposal","won"].indexOf(a.status)>-1;}).length;
  var won        = accounts.filter(function(a){return a.status==="won";}).length;

  var convSteps = [
    {label:"Mapeado",   count:total,     pct:100},
    {label:"Contatado", count:contacted, pct:total?Math.round(contacted/total*100):0},
    {label:"Reunião",   count:meeting,   pct:total?Math.round(meeting/total*100):0},
    {label:"Proposta",  count:proposal,  pct:total?Math.round(proposal/total*100):0},
    {label:"Ganho",     count:won,       pct:total?Math.round(won/total*100):0},
  ];

  // ── KPI cards
  var kpis = [
    {label:"Total Mapeado",    value:total,     sub:"empresas",          color:"#0f172a", icon:"T"},
    {label:"Fit Alto",         value:byFit[0]&&byFit[0].count||0, sub:"prospects prime",  color:"#065f46", icon:"A"},
    {label:"Em Andamento",     value:contacted, sub:"contatados ou mais", color:"#7c3aed", icon:"C"},
    {label:"Taxa de Ganho",    value:(total?Math.round(won/total*100):0)+"%", sub:"dos mapeados",color:"#059669", icon:"G"},
  ];

  if (total === 0) {
    return (
      <div>
        <div style={{fontSize:26,fontWeight:800,color:"#0f172a",marginBottom:6,letterSpacing:"-0.5px"}}>Insights</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:32}}>Dashboard de performance da sua prospecção.</div>
        <div style={{textAlign:"center",padding:"64px 0",background:"#f8fafc",borderRadius:20,border:"1.5px dashed #e2e8f0"}}>
          <div style={{fontSize:36,marginBottom:12}}>📊</div>
          <div style={{fontSize:15,fontWeight:700,color:"#334155",marginBottom:6}}>Nenhum dado ainda</div>
          <div style={{fontSize:12,color:"#94a3b8"}}>Mapeie sua primeira empresa em Busca para comecar a ver insights.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:28,fontWeight:800,color:"#0f172a",marginBottom:4,letterSpacing:"-0.6px"}}>Insights</div>
          <div style={{fontSize:13,color:"#64748b"}}>{"Performance da sua prospecção baseada em " + total + " conta" + (total!==1?"s":"") + " mapeada" + (total!==1?"s":"") + "."}</div>
        </div>
      </div>

      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14,marginBottom:24}}>
        {kpis.map(function(k) {
          return (
            <div key={k.label} style={{background:"#fff",border:"1px solid #e8edf4",borderRadius:18,padding:"20px 22px",boxShadow:"0 4px 20px rgba(15,23,42,.06)",position:"relative",overflow:"hidden"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>{k.label}</div>
              <div style={{fontSize:32,fontWeight:800,color:k.color,lineHeight:1,marginBottom:6}}>{k.value}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="chart-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>

        <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:20,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            Funil de Conversão
          </div>
          {convSteps.map(function(step, i) {
            var colors = ["#0f172a","#0369a1","#7c3aed","#b45309","#065f46"];
            return (
              <div key={step.label} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:600,color:colors[i]}}>{step.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:"#94a3b8"}}>{step.count}</span>
                    <span style={{fontSize:11,fontWeight:700,color:colors[i],minWidth:32,textAlign:"right"}}>{step.pct+"%"}</span>
                  </div>
                </div>
                <div style={{height:6,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:step.pct+"%",background:colors[i],borderRadius:4,transition:"width .8s cubic-bezier(.22,1,.36,1)"}}/>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:20,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            Contas por Semana
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120}}>
            {weeks.map(function(w, i) {
              var h = Math.round((w.count/maxWeek)*100);
              var isLast = i===weeks.length-1;
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:9,fontWeight:700,color:isLast?"#059669":"#94a3b8"}}>{w.count||""}</div>
                  <div style={{width:"100%",height:h+"%",minHeight:w.count?4:2,background:isLast?"linear-gradient(180deg,#10b981,#059669)":"#e2e8f0",borderRadius:"4px 4px 0 0",transition:"height .6s ease"}}/>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,marginTop:6}}>
            {weeks.map(function(w,i){
              return <div key={i} style={{flex:1,textAlign:"center",fontSize:8,color:i===weeks.length-1?"#059669":"#cbd5e1",overflow:"hidden"}}>{i===weeks.length-1?"Agora":"S-"+i}</div>;
            })}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,marginBottom:18}}>

        <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            Distribuição por Fit
          </div>
          {byFit.map(function(f) {
            return (
              <div key={f.fit} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:700,color:f.color,background:f.bg,border:"1px solid "+f.border,borderRadius:6,padding:"2px 8px"}}>{"FIT "+f.fit}</span>
                  <span style={{fontSize:12,fontWeight:700,color:f.color}}>{f.count+" ("+f.pct+"%)"}</span>
                </div>
                <div style={{height:6,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:f.pct+"%",background:f.color,borderRadius:4}}/>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            Distribuição por Tier
          </div>
          {byTier.map(function(t) {
            return (
              <div key={t.tier} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:700,color:t.color}}>{t.tier}</span>
                  <span style={{fontSize:12,fontWeight:700,color:t.color}}>{t.count+" ("+t.pct+"%)"}</span>
                </div>
                <div style={{height:6,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:t.pct+"%",background:t.color,borderRadius:4}}/>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            Top Setores
          </div>
          {bySetor.length===0 ? (
            <div style={{fontSize:12,color:"#94a3b8"}}>Sem dados</div>
          ) : bySetor.map(function(s, i) {
            var barColors = ["#10b981","#0ea5e9","#7c3aed","#f59e0b","#ef4444","#64748b"];
            var w = Math.round(s.count/maxSetor*100);
            return (
              <div key={s.setor} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:"#334155",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}}>{s.setor}</span>
                  <span style={{fontSize:11,fontWeight:700,color:barColors[i]||"#94a3b8",flexShrink:0}}>{s.count}</span>
                </div>
                <div style={{height:5,background:"#f1f5f9",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:w+"%",background:barColors[i]||"#94a3b8",borderRadius:3}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
          Status Completo, {total} Contas
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {funnel.map(function(f) {
            var barH = f.count ? Math.round(f.count/maxFunnel*60)+16 : 8;
            return (
              <div key={f.status} style={{flex:1,minWidth:80,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{fontSize:22,fontWeight:800,color:f.color}}>{f.count}</div>
                <div style={{width:"100%",height:barH,background:f.bg,border:"1.5px solid "+f.border,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:f.color}}/>
                </div>
                <div style={{fontSize:9,fontWeight:600,color:f.color,textTransform:"uppercase",letterSpacing:.6,textAlign:"center"}}>{f.label}</div>
              </div>
            );
          })}
        </div>
      </div>


      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginTop:18}}>
        <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            Fit Score, Visão Donut
          </div>
          <div style={{display:"flex",alignItems:"center",gap:24}}>
            <DonutChart size={120} hole={0.62}
              segments={byFit.map(function(f){return {value:f.count,color:f.color};})}
              centerLabel={total} centerSub="contas"/>
            <div style={{flex:1}}>
              {byFit.map(function(f){return (
                <div key={f.fit} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:f.color,flexShrink:0}}/>
                  <div style={{fontSize:11,color:"#334155",flex:1}}>{"FIT "+f.fit}</div>
                  <div style={{fontSize:12,fontWeight:700,color:f.color}}>{f.count}</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{f.pct+"%"}</div>
                </div>
              );})}
            </div>
          </div>
        </div>
        <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
            Funil, Semicírculo
          </div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <SemiCircleChart convSteps={convSteps}/>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
            {convSteps.map(function(step,i){
              var colors=["#0f172a","#0369a1","#7c3aed","#065f46","#991b1b"];
              return <div key={step.label} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:colors[i]}}/><span style={{fontSize:10,color:"#64748b"}}>{step.label+": "+step.pct+"%"}</span></div>;
            })}
          </div>
        </div>
      </div>

      <div style={{background:"rgba(255,255,255,.95)",border:"1px solid rgba(228,235,244,.8)",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(15,23,42,.07)",marginTop:18}}>
        <div style={{fontSize:10,fontWeight:700,color:"#10b981",letterSpacing:2,textTransform:"uppercase",marginBottom:18,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:14,background:"linear-gradient(180deg,#10b981,#059669)",borderRadius:3,boxShadow:"0 0 8px rgba(16,185,129,.4)"}}/>
          Métricas de Velocidade
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14}}>
          {[
            {label:"Média por Semana", value:total?(weeks.reduce(function(s,w){return s+w.count;},0)/Math.max(1,weeks.filter(function(w){return w.count>0;}).length)).toFixed(1):0, sub:"contas mapeadas", color:"#0369a1"},
            {label:"Melhor Semana",    value:Math.max.apply(null,weeks.map(function(w){return w.count;})), sub:"contas em uma semana", color:"#7c3aed"},
            {label:"Taxa de Avanço",   value:total?Math.round(contacted/total*100)+"%":"0%", sub:"mapeado para contatado", color:"#059669"},
            {label:"Taxa de Reunião",  value:contacted?Math.round(meeting/contacted*100)+"%":"0%", sub:"contatado para reunião", color:"#065f46"},
          ].map(function(m){return (
            <div key={m.label} style={{background:"#f8fafc",border:"1px solid #e8edf4",borderRadius:14,padding:"16px 18px"}}>
              <div style={{fontSize:9,color:"#94a3b8",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:.8}}>{m.label}</div>
              <div style={{fontSize:28,fontWeight:800,color:m.color,lineHeight:1,marginBottom:4}}>{m.value}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{m.sub}</div>
            </div>
          );})}
        </div>
      </div>

    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  var [nav, setNav] = useState("search");
  var [accounts, setAccounts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [openAcc, setOpenAcc] = useState(null);
  var [toast, setToast] = useState(null);
  var [sidebarOpen, setSidebarOpen] = useState(true);
  var [seqCount, setSeqCount] = useState(0);

  function showToast(msg, color) {
    setToast({msg:msg,color:color||"#059669"});
    setTimeout(function(){setToast(null);}, 3000);
  }

  useEffect(function() {
    Promise.all([
      storageList("acc:"),
      storageList("seq:")
    ]).then(function(results) {
      var accKeys = results[0]; var seqKeys = results[1];
      setSeqCount(seqKeys.length);
      if (!accKeys.length) { setLoading(false); return; }
      return Promise.all(accKeys.map(storageGet)).then(function(items) {
        var valid = items.filter(Boolean).sort(function(a,b){return (b.savedAt||0)-(a.savedAt||0);});
        setAccounts(valid); setLoading(false);
      });
    }).catch(function(){setLoading(false);});
  }, []);

  function saveAccount(nome, data, liveMode) {
    var id = "acc:" + Date.now() + "-" + Math.random().toString(36).slice(2,7);
    var acc = { id:id, nome:nome, setor:(data.empresa&&data.empresa.setor)||"Empresa", fit:(data.fit&&data.fit.score)||"ALTO", tier:(data.estrategia&&data.estrategia.tier)||"Tier 2", status:"prospecting", liveMode:liveMode||false, savedAt:Date.now(), data:data };
    storageSet(id, acc).then(function() {
      setAccounts(function(prev){return [acc].concat(prev);});
    });
  }

  function updateStatus(id, status) {
    setAccounts(function(prev) {
      return prev.map(function(a) {
        if (a.id!==id) return a;
        var updated = Object.assign({},a,{status:status});
        storageSet(id, updated);
        if (openAcc&&openAcc.id===id) setOpenAcc(updated);
        return updated;
      });
    });
    showToast("Status: " + STATUS_CONFIG[status].label);
  }

  function deleteAccount(id) {
    if (!window.confirm("Remover esta conta?")) return;
    storageDel(id).then(function() {
      setAccounts(function(prev){return prev.filter(function(a){return a.id!==id;});});
      showToast("Conta removida.", "#ef4444");
    });
  }

  var css = [
    "*{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:Inter,system-ui,Verdana,sans-serif;background:linear-gradient(135deg,#f0fdf8 0%,#f8fafc 50%,#f0f4ff 100%);min-height:100vh}",
    "@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}",
    "@keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}",
    "::-webkit-scrollbar{width:5px;height:5px}",
    "::-webkit-scrollbar-track{background:#f1f5f9}",
    "::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}",
    "@media(max-width:768px){.main-content{padding:20px!important}.g2{grid-template-columns:1fr!important}.modal-grid{grid-template-columns:1fr!important}.kpi-grid{grid-template-columns:1fr 1fr!important}.chart-grid{grid-template-columns:1fr!important}.card-grid{grid-template-columns:1fr!important}.modal-box{max-width:98vw!important;border-radius:16px!important}.modal-tabs{overflow-x:auto!important}.modal-tabs button{font-size:10px!important;padding:8px 10px!important}.status-chips{overflow-x:auto!important}.pipeline-scroll{overflow-x:auto!important}}",
    "@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}",
    "@keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}50%{box-shadow:0 0 0 6px rgba(16,185,129,.1)}}",
    "@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}",
    ".sidebar{transition:width .3s cubic-bezier(.22,1,.36,1)}",
    ".sidebar-label{transition:opacity .2s ease,transform .2s ease;white-space:nowrap;overflow:hidden}",
    ".sidebar-label.hidden{opacity:0;transform:translateX(-6px);pointer-events:none;width:0}",
    ".sidebar-label.visible{opacity:1;transform:translateX(0)}",
    ".toggle-btn{transition:all .25s cubic-bezier(.22,1,.36,1)}",
    ".toggle-btn:hover{background:rgba(16,185,129,.1) !important}",

    ".card-hover{transition:all .25s cubic-bezier(.22,1,.36,1)}",
    ".card-hover:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(15,23,42,.12)}",
    ".glass{background:rgba(255,255,255,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}",
    ".gradient-border{position:relative;background:#fff;border-radius:18px}",
    ".gradient-border::before{content:'';position:absolute;inset:-1.5px;border-radius:19px;background:linear-gradient(135deg,#10b981,#0ea5e9,#8b5cf6);z-index:-1;opacity:.4}",
    ".badge-glow{animation:glow 2.5s ease-in-out infinite}",
  ].join("");

  var NAV = [
    {id:"search",    emoji:"🔍", label:"Busca"},
    {id:"accounts",  emoji:"📁", label:"Contas",     count:accounts.length||null},
    {id:"sequences", emoji:"📬", label:"Sequências"},
    {id:"biblioteca",emoji:"📚", label:"Biblioteca", count:seqCount||null},
    {id:"pipeline",  emoji:"📊", label:"Pipeline"},
    {id:"relatorios",emoji:"📈", label:"Relatórios"},
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:"#f8fafc",overflow:"hidden"}}>
      <style>{css}</style>

      <div className="sidebar" style={{width:sidebarOpen?224:64,background:"#fff",borderRight:"1px solid #e8edf4",display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"4px 0 24px rgba(15,23,42,.06)",position:"relative",overflow:"hidden"}}>
        <div style={{height:3,background:"linear-gradient(90deg,#10b981,#0ea5e9,#8b5cf6)",flexShrink:0}}/>

        {sidebarOpen ? (
          <div style={{padding:"14px 14px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9,overflow:"hidden",flex:1,minWidth:0}}>
              <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(16,185,129,.4)",flexShrink:0}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.4)" strokeWidth="1.8"/><circle cx="12" cy="12" r="5" stroke="rgba(255,255,255,.7)" strokeWidth="1.8"/><circle cx="12" cy="12" r="2" fill="white"/></svg>
              </div>
              <div style={{minWidth:0,overflow:"hidden"}}>
                <div style={{fontSize:12.5,fontWeight:800,color:"#0f172a",letterSpacing:"-0.3px",lineHeight:1.2,whiteSpace:"nowrap"}}>BDR Helper <span style={{color:"#10b981"}}>Pro</span></div>
                <div style={{fontSize:7.5,color:"#10b981",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>PROSPECTING TOOL V1</div>
              </div>
            </div>
            <button className="toggle-btn" onClick={function(){setSidebarOpen(false);}} title="Recolher menu"
              style={{width:26,height:26,borderRadius:7,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",flexShrink:0,padding:0}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>
        ) : (
          <div style={{padding:"14px 0 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,flexShrink:0}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(16,185,129,.4)"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.4)" strokeWidth="1.8"/><circle cx="12" cy="12" r="5" stroke="rgba(255,255,255,.7)" strokeWidth="1.8"/><circle cx="12" cy="12" r="2" fill="white"/></svg>
            </div>
            <button className="toggle-btn" onClick={function(){setSidebarOpen(true);}} title="Expandir menu"
              style={{width:26,height:26,borderRadius:7,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",padding:0}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}

        <div style={{height:1,background:"#f1f5f9",margin:"0 10px 8px",flexShrink:0}}/>

        <nav style={{padding:"0 8px",flex:1,overflow:"hidden"}}>
          {NAV.map(function(item) {
            var active = nav===item.id;
            return (
              <button key={item.id} onClick={function(){setNav(item.id);}}
                title={sidebarOpen?"":item.label}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:sidebarOpen?"10px 12px":"10px 0",justifyContent:sidebarOpen?"flex-start":"center",borderRadius:12,border:"none",background:active?"linear-gradient(135deg,#10b981,#059669)":"transparent",color:active?"#fff":"#64748b",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?600:500,marginBottom:4,transition:"all .25s cubic-bezier(.22,1,.36,1)",textAlign:"left",boxShadow:active?"0 4px 14px rgba(16,185,129,.3)":"none"}}
                onMouseEnter={function(e){if(!active){e.currentTarget.style.background="#f8fafc";e.currentTarget.style.color="#0f172a";}}}
                onMouseLeave={function(e){if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#64748b";}}}>
                <span style={{fontSize:sidebarOpen?16:20,flexShrink:0,transition:"font-size .2s ease"}}>{item.emoji}</span>
                <span className={"sidebar-label " + (sidebarOpen?"visible":"hidden")} style={{flex:1}}>
                  {item.label}
                </span>
                {sidebarOpen && item.count ? (
                  <span style={{background:active?"rgba(255,255,255,.25)":"#e8edf4",color:active?"#fff":"#64748b",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700,flexShrink:0}}>
                    {item.count}
                  </span>
                ) : null}
                {!sidebarOpen && item.count ? (
                  <span style={{position:"absolute",top:6,right:6,width:16,height:16,background:"#10b981",color:"#fff",borderRadius:"50%",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 2px #fff"}}>
                    {item.count > 9 ? "9+" : item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div style={{padding:"10px 8px 18px",borderTop:"1px solid #f1f5f9",flexShrink:0,overflow:"hidden"}}>
          <div className={"sidebar-label " + (sidebarOpen?"visible":"hidden")} style={{fontSize:10,color:"#94a3b8",lineHeight:1.6,paddingLeft:4}}>
            {accounts.length+" conta"+(accounts.length!==1?"s":"")+" salva"+(accounts.length!==1?"s":"")}
          </div>
          {!sidebarOpen && (
            <div style={{display:"flex",justifyContent:"center"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#e2e8f0"}}/>
            </div>
          )}
        </div>
      </div>

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div className="main-content" style={{flex:1,overflowY:"auto",padding:"36px 40px"}}>
          {loading ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981"}}/>
              <span style={{color:"#94a3b8",fontSize:13}}>Carregando...</span>
            </div>
          ) : (
            <div style={{animation:"fadeUp .35s ease"}}>
              {nav==="search"    && <SearchView accounts={accounts} onSave={saveAccount} onOpenAccount={function(acc){setOpenAcc(acc);}} onUpdateAccount={function(updated){setAccounts(function(prev){return prev.map(function(a){return a.id===updated.id?updated:a;});});}}/>}
              {nav==="accounts"  && <AccountsView accounts={accounts} onOpen={setOpenAcc} onStatusChange={updateStatus} onDelete={deleteAccount}/>}
              {nav==="sequences" && <SequenceView accounts={accounts} showToast={showToast}/>}
              {nav==="relatorios"&& <InsightsView accounts={accounts}/>}
              {nav==="biblioteca" && <BibliotecaView showToast={showToast} onCountChange={setSeqCount}/>}
              {nav==="pipeline"  && (
                <div>
                  <div style={{fontSize:28,fontWeight:800,color:"#0f172a",marginBottom:4,letterSpacing:"-0.6px"}}>Pipeline</div>
                  <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>Arraste os cards entre colunas para avançar ou recuar o estágio da prospecção.</div>
                  <PipelineView accounts={accounts} onOpen={setOpenAcc} onStatusChange={updateStatus}/>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {openAcc && <AccountModal acc={openAcc} onClose={function(){setOpenAcc(null);}} onStatusChange={updateStatus}/>}
      {toast && (
        <div style={{position:"fixed",bottom:28,right:28,background:toast.color,color:"#fff",borderRadius:14,padding:"14px 22px",fontSize:13,fontWeight:600,boxShadow:"0 12px 40px rgba(15,23,42,.2),0 0 0 1px rgba(255,255,255,.15)",animation:"toastIn .35s cubic-bezier(.22,1,.36,1)",zIndex:300,maxWidth:340,display:"flex",alignItems:"center",gap:10}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
