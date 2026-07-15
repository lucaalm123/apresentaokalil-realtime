import { runtimeConfig } from '../config/runtime-config.js';

const STORAGE_KEY = 'contract-presentation-v10-state';
const CHANNEL_NAME = 'contract-presentation-v10';
const clientId = sessionStorage.getItem('contract-client-id') || crypto.randomUUID();
sessionStorage.setItem('contract-client-id', clientId);

const pollCatalog = {
  negotiation: {
    title: 'Em contratos complexos, qual recurso visual mais fortalece a governança da decisão?',
    options: ['Mapa de riscos e aprovações','Resumo executivo visual','Linha do tempo de obrigações','Matriz de responsáveis','Trilha de evidências','Checklist de assinatura']
  },
  boundaries: {
    title: 'Diante deste risco, qual seria o próximo passo?',
    options: ['Aceitar','Negociar','Mitigar','Escalar','Rejeitar']
  },
  signatures: {
    title: 'O registro das evidências pode ser tão importante quanto a assinatura.',
    options: ['Mito','Depende','Prática recomendada','Risco']
  }
};

const defaultScreens = ["Abertura", "Antes da cláusula", "Enquete · Visual e governança", "Negociação contratual", "Limites da atuação jurídica", "Assinaturas eletrônicas", "Do documento à compreensão", "Contratos em Visual Law", "ALL ADEO", "Síntese prática", "Perguntas do público", "Encerramento"];
const defaultScreenTitles = ["Questões Práticas do Direito de Contratos", "Antes da cláusula, existe uma decisão.", "Visual Law e governança da decisão", "Negociação contratual", "Até onde vai o jurídico?", "Assinar é apenas uma parte da validade.", "A camada visual complementa o documento jurídico.", "Contratos Leroy Merlin", "ALL ADEO", "O que os dois casos ensinam", "Perguntas do público", "Negociar · Equilibrar · Evidenciar"];

const initialState = {
  version: 10,
  currentScreen: 0,
  currentStep: 0,
  sessionStartedAt: null,
  sessionElapsed: 0,
  paused: false,
  chromeHidden: false,
  manualNavigationLocked: false,
  motionMode: 'full',
  connection: { mode: runtimeConfig.realtime.mode, status: 'connecting', participants: 1 },
  qr: { visible: false, large: true, label: runtimeConfig.audience.qrCodeLabel, position: 'center', url: runtimeConfig.audience.publicUrl || '' },
  content: {
    title: 'Questões Práticas do Direito de Contratos',
    titleLines: ['Questões Práticas','do Direito de','Contratos'],
    subtitle: 'Negociação, limites da atuação jurídica e assinaturas eletrônicas',
    speaker: { name: 'Rodrigo Kalil Ribeiro', role: 'Diretor Jurídico & Compliance', company: 'Leroy Merlin e Obramax' },
    closingMessage: 'Contratos melhores não nascem apenas de cláusulas melhores. Nascem de decisões mais claras.',
    screens: defaultScreens,
    screenTitles: defaultScreenTitles,
    mobileGuides: [{"title": "Abertura", "text": "A palestra apresenta contratos como sistemas de decisão: negociar, equilibrar e evidenciar."}, {"title": "Antes da cláusula", "text": "Toda cláusula nasce de escolhas, riscos, prioridades e autoridades de decisão."}, {"title": "Enquete ao vivo", "text": "Vote pelo celular: qual recurso visual mais fortalece a governança em contratos complexos?"}, {"title": "Negociação contratual", "text": "Prioridades, autoridade e compensação definem o que realmente entra no contrato."}, {"title": "Limites jurídicos", "text": "Separar recomendação jurídica, escolha comercial e registro de aprovação melhora governança."}, {"title": "Assinaturas eletrônicas", "text": "A validade depende da trilha de evidências e do contexto do risco."}, {"title": "Camadas de comunicação", "text": "A camada visual complementa o documento jurídico sem substituir sua função formal."}, {"title": "Caso Leroy Merlin", "text": "O antes e depois evidencia hierarquia, jornada e orientação visual."}, {"title": "Caso ALL ADEO", "text": "A cartilha orienta; os documentos oficiais continuam sendo a referência formal."}, {"title": "Síntese", "text": "Contratos melhores combinam rigor, decisão, governança e compreensão."}, {"title": "Perguntas do público", "text": "Envie perguntas pelo celular. A equipe pode selecionar uma pergunta para aparecer no telão."}, {"title": "Encerramento", "text": "Envie sua pergunta final ou salve os aprendizados principais."}]
  },
  activePollId: null,
  pollStatus: 'closed',
  showPollResults: false,
  polls: Object.fromEntries(Object.keys(pollCatalog).map(id => [id,{votes:{}}])),
  questions: [],
  highlightedQuestionId: null,
  updatedAt: Date.now()
};

function cleanQuestion(text){ return String(text || '').replace(/[<>]/g,'').trim().slice(0,240); }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function mergeState(base, incoming={}){
  const merged = {
    ...base,
    ...incoming,
    connection: {...(base.connection||{}), ...(incoming.connection||{})},
    qr: {...(base.qr||{}), ...(incoming.qr||{})},
    content: {
      ...(base.content||{}),
      ...(incoming.content||{}),
      speaker: {...((base.content||{}).speaker||{}), ...(((incoming.content||{}).speaker)||{})},
      mobileGuides: (incoming.content?.mobileGuides || base.content?.mobileGuides || [])
    },
    polls: {...(base.polls||{}), ...(incoming.polls||{})},
    questions: Array.isArray(incoming.questions) ? incoming.questions : (base.questions || [])
  };
  merged.content.screens ||= defaultScreens;
  merged.content.screenTitles ||= defaultScreenTitles;
  return merged;
}
function load(){
  try{return mergeState(initialState, JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}
  catch{return clone(initialState);}
}

let state = load();
const listeners = new Set();
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
let socket = null;
let socketOpen = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let pendingHello = true;

function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function emit(meta={source:clientId}){ listeners.forEach(fn=>fn(clone(state),meta)); }
function localBroadcast(payload){ channel?.postMessage({...payload,source:clientId}); }
function canRemote(){ return runtimeConfig.realtime.mode === 'remote' || runtimeConfig.features.productionRealtime; }
function wsUrl(){
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const path = runtimeConfig.realtime.wsPath || '/ws';
  const session = encodeURIComponent(runtimeConfig.realtime.sessionId || 'default');
  return `${proto}//${location.host}${path}?session=${session}`;
}
function setConnection(patch, broadcast=false){
  state = mergeState(state,{connection:{...state.connection,...patch},updatedAt:Date.now()});
  persist(); emit({source:'connection'});
  if(broadcast) localBroadcast({type:'state',state});
}
function sendRemote(message){
  if(!socketOpen || !socket) return false;
  try{ socket.send(JSON.stringify({...message, source: clientId})); return true; }catch{return false;}
}
function handleRemoteMessage(data){
  let msg;
  try{ msg = JSON.parse(data); }catch{return;}
  if(!msg || msg.source === clientId && msg.type !== 'state') return;
  if(msg.type === 'state' || msg.type === 'snapshot'){
    state = mergeState(initialState, msg.state || {});
    persist();
    emit({source: msg.source || 'remote', remote: true});
  }
  if(msg.type === 'participants'){
    setConnection({participants: msg.count, status: socketOpen?'online':'offline'});
  }
}
function connectRemote(){
  if(!canRemote() || socketOpen || socket) return;
  setConnection({mode:'remote', status:'connecting'});
  try{ socket = new WebSocket(wsUrl()); }catch{ socket=null; setConnection({mode:'local', status:'local-fallback'}); return; }
  socket.addEventListener('open',()=>{
    socketOpen = true; reconnectAttempts = 0;
    setConnection({mode:'remote', status:'online'});
    if(pendingHello){ sendRemote({type:'hello', state}); pendingHello=false; }
  });
  socket.addEventListener('message',event=>handleRemoteMessage(event.data));
  socket.addEventListener('close',()=>{
    socketOpen=false; socket=null; pendingHello=true;
    setConnection({mode:'remote', status:'offline'});
    clearTimeout(reconnectTimer);
    reconnectTimer=setTimeout(connectRemote, Math.min(1000*Math.pow(1.6,reconnectAttempts++), 10000));
  });
  socket.addEventListener('error',()=>{
    setConnection({mode:'remote', status:'error'});
    try{socket.close();}catch{}
  });
}

channel && (channel.onmessage = event => {
  const msg = event.data || {};
  if(msg.source === clientId) return;
  if(msg.type === 'state'){
    state = mergeState(initialState,msg.state || {});
    persist();
    emit({source:msg.source,remote:true,localChannel:true});
  }
});
window.addEventListener('storage', event => {
  if(event.key !== STORAGE_KEY || !event.newValue) return;
  try{state = mergeState(initialState,JSON.parse(event.newValue));emit({source:'storage',remote:true});}catch{}
});

export const stateBus = {
  config: runtimeConfig,
  clientId,
  pollCatalog,
  get(){ return clone(state); },
  subscribe(fn){ listeners.add(fn); fn(clone(state),{source:'initial'}); return ()=>listeners.delete(fn); },
  update(patch, options={}){
    const next = typeof patch === 'function' ? patch(clone(state)) : patch;
    state = mergeState(state,{...next,updatedAt:Date.now()});
    persist(); emit({source:clientId,local:true});
    if(options.broadcast !== false){
      localBroadcast({type:'state',state});
      sendRemote({type:'patch', patch: next});
    }
    return clone(state);
  },
  reset(){
    state=clone(initialState);persist();emit({source:clientId,local:true});localBroadcast({type:'state',state});sendRemote({type:'reset', state});
  },
  vote(pollId, option){
    const voterId = localStorage.getItem('contract-voter-id') || crypto.randomUUID();
    localStorage.setItem('contract-voter-id',voterId);
    this.update(current=>{
      const polls = clone(current.polls || {});
      polls[pollId] ||= {votes:{}};
      polls[pollId].votes[voterId] = option;
      return {polls};
    }, {broadcast:false});
    localBroadcast({type:'state',state});
    sendRemote({type:'vote', pollId, option, voterId});
    return clone(state);
  },
  addQuestion(text){
    const safe = cleanQuestion(text);
    if(!safe) return null;
    const question = {id:crypto.randomUUID(),text:safe,at:new Date().toISOString(),status:'pending',likes:0};
    this.update(current=>({questions:[...(current.questions||[]),question]}), {broadcast:false});
    localBroadcast({type:'state',state});
    sendRemote({type:'question', question});
    return question;
  },
  updateQuestion(id, patch){
    this.update(current=>({questions:(current.questions||[]).map(q=>q.id===id?{...q,...patch}:q)}), {broadcast:false});
    localBroadcast({type:'state',state});
    sendRemote({type:'questionUpdate', id, patch});
  }
};

connectRemote();

export function getPollResults(stateValue, pollId){
  const catalog = pollCatalog[pollId];
  if(!catalog) return [];
  const values = Object.values(stateValue.polls?.[pollId]?.votes||{});
  const total = values.length;
  return catalog.options.map(option=>{
    const count = values.filter(value=>value===option).length;
    return {option,count,total,percent:total?Math.round(count/total*100):0};
  });
}
