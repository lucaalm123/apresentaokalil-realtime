const POLL_CATALOG = {
  negotiation: {
    title: 'Em contratos complexos, qual recurso visual mais fortalece a governança da decisão?',
    options: ['Mapa de riscos e aprovações','Resumo executivo visual','Linha do tempo de obrigações','Matriz de responsáveis','Trilha de evidências','Checklist de assinatura']
  },
  boundaries: { title: 'Diante deste risco, qual seria o próximo passo?', options: ['Aceitar','Negociar','Mitigar','Escalar','Rejeitar'] },
  signatures: { title: 'O registro das evidências pode ser tão importante quanto a assinatura.', options: ['Mito','Depende','Prática recomendada','Risco'] }
};

const INITIAL_STATE = {
  version: 10.6,
  currentScreen: 0,
  currentStep: 0,
  sessionStartedAt: null,
  sessionElapsed: 0,
  paused: false,
  chromeHidden: false,
  manualNavigationLocked: false,
  motionMode: 'full',
  connection: { mode: 'remote', status: 'online', participants: 0 },
  qr: { visible: false, large: true, label: 'Acompanhe pelo celular', position: 'center', url: 'https://apresentaokalil.luckphantomhive.workers.dev/mobile/' },
  content: {
    title: 'Questões Práticas do Direito de Contratos',
    titleLines: ['Questões Práticas','do Direito de','Contratos'],
    subtitle: 'Negociação, limites da atuação jurídica e assinaturas eletrônicas',
    speaker: { name: 'Rodrigo Kalil Ribeiro', role: 'Diretor Jurídico & Compliance', company: 'Leroy Merlin e Obramax' },
    closingMessage: 'Contratos melhores não nascem apenas de cláusulas melhores. Nascem de decisões mais claras.',
    screens: ["Abertura", "Antes da cláusula", "Enquete · Visual e governança", "Negociação contratual", "Limites da atuação jurídica", "Assinaturas eletrônicas", "Do documento à compreensão", "Contratos em Visual Law", "ALL ADEO", "Síntese prática", "Perguntas do público", "Encerramento"],
    screenTitles: ["Questões Práticas do Direito de Contratos", "Antes da cláusula, existe uma decisão.", "Visual Law e governança da decisão", "Negociação contratual", "Até onde vai o jurídico?", "Assinar é apenas uma parte da validade.", "A camada visual complementa o documento jurídico.", "Contratos Leroy Merlin", "ALL ADEO", "O que os dois casos ensinam", "Perguntas do público", "Negociar · Equilibrar · Evidenciar"],
    mobileGuides: [{"title": "Abertura", "text": "A palestra apresenta contratos como sistemas de decisão: negociar, equilibrar e evidenciar."}, {"title": "Antes da cláusula", "text": "Toda cláusula nasce de escolhas, riscos, prioridades e autoridades de decisão."}, {"title": "Enquete ao vivo", "text": "Vote pelo celular: qual recurso visual mais fortalece a governança em contratos complexos?"}, {"title": "Negociação contratual", "text": "Prioridades, autoridade e compensação definem o que realmente entra no contrato."}, {"title": "Limites jurídicos", "text": "Separar recomendação jurídica, escolha comercial e registro de aprovação melhora governança."}, {"title": "Assinaturas eletrônicas", "text": "A validade depende da trilha de evidências e do contexto do risco."}, {"title": "Camadas de comunicação", "text": "A camada visual complementa o documento jurídico sem substituir sua função formal."}, {"title": "Caso Leroy Merlin", "text": "O antes e depois evidencia hierarquia, jornada e orientação visual."}, {"title": "Caso ALL ADEO", "text": "A cartilha orienta; os documentos oficiais continuam sendo a referência formal."}, {"title": "Síntese", "text": "Contratos melhores combinam rigor, decisão, governança e compreensão."}, {"title": "Perguntas do público", "text": "Envie perguntas pelo celular. A equipe pode selecionar uma pergunta para aparecer no telão."}, {"title": "Encerramento", "text": "Envie sua pergunta final ou salve os aprendizados principais."}]
  },
  activePollId: null,
  pollStatus: 'closed',
  showPollResults: false,
  polls: Object.fromEntries(Object.keys(POLL_CATALOG).map(id => [id,{votes:{}}])),
  questions: [],
  highlightedQuestionId: null,
  updatedAt: Date.now()
};

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function sanitizeText(text, max=240){ return String(text || '').replace(/[<>]/g,'').trim().slice(0,max); }
function mergeState(base, incoming={}){
  return {
    ...base,
    ...incoming,
    connection: {...(base.connection||{}), ...(incoming.connection||{})},
    qr: {...(base.qr||{}), ...(incoming.qr||{})},
    content: {
      ...(base.content||{}),
      ...(incoming.content||{}),
      speaker: {...((base.content||{}).speaker||{}), ...(((incoming.content||{}).speaker)||{})},
      mobileGuides: incoming.content?.mobileGuides || base.content?.mobileGuides || []
    },
    polls: {...(base.polls||{}), ...(incoming.polls||{})},
    questions: Array.isArray(incoming.questions) ? incoming.questions : (base.questions || [])
  };
}
function json(data, init={}){ return new Response(JSON.stringify(data), {headers:{'content-type':'application/json; charset=utf-8', 'cache-control':'no-store'}, ...init}); }

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) {
      const session = url.searchParams.get('session') || 'contratos-praticos-kalil';
      const id = env.PRESENTATION_ROOM.idFromName(session);
      return env.PRESENTATION_ROOM.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};

export class PresentationRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sockets = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', {status: 426});
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      await this.acceptSocket(server);
      return new Response(null, {status: 101, webSocket: client});
    }
    if (url.pathname === '/api/state') return json(await this.getStoredState());
    if (url.pathname === '/api/reset' && request.method === 'POST') {
      await this.putState(clone(INITIAL_STATE));
      await this.broadcastState();
      return json({ok:true});
    }
    if (url.pathname === '/api/health') return json({ok:true, realtime:'durable-object-websocket', clients:this.sockets.size});
    return new Response('Not found', {status:404});
  }

  async getStoredState() {
    let value = await this.state.storage.get('state');
    if (!value) {
      value = clone(INITIAL_STATE);
      await this.state.storage.put('state', value);
    } else if (Number(value.version || 0) < Number(INITIAL_STATE.version)) {
      value = mergeState(clone(INITIAL_STATE), value);
      value.version = INITIAL_STATE.version;
      await this.state.storage.put('state', value);
    }
    value.connection = {...(value.connection||{}), mode:'remote', status:'online', participants:this.sockets.size};
    return value;
  }

  async putState(value) {
    value.updatedAt = Date.now();
    value.connection = {...(value.connection||{}), mode:'remote', status:'online', participants:this.sockets.size};
    await this.state.storage.put('state', value);
    return value;
  }

  async acceptSocket(ws) {
    const id = crypto.randomUUID();
    ws.accept();
    this.sockets.set(id, ws);
    ws.send(JSON.stringify({type:'state', state: await this.getStoredState(), source:'server'}));
    this.broadcastParticipants();
    ws.addEventListener('message', event => this.handleMessage(id, event.data));
    const close = () => { this.sockets.delete(id); this.broadcastParticipants(); };
    ws.addEventListener('close', close);
    ws.addEventListener('error', close);
  }

  async handleMessage(id, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const source = msg.source || id;
    let current = await this.getStoredState();
    if (msg.type === 'hello') {
      if (msg.state && (!current.updatedAt || msg.state.updatedAt > current.updatedAt)) current = mergeState(current, msg.state);
      await this.putState(current);
      this.send(id, {type:'state', state: current, source:'server'});
      this.broadcastParticipants();
      return;
    }
    if (msg.type === 'patch') current = mergeState(current, msg.patch || {});
    if (msg.type === 'state') current = mergeState(current, msg.state || {});
    if (msg.type === 'vote') {
      const pollId = msg.pollId;
      const option = sanitizeText(msg.option, 120);
      const voterId = sanitizeText(msg.voterId || source, 80);
      if (POLL_CATALOG[pollId] && POLL_CATALOG[pollId].options.includes(option)) {
        current.polls ||= {};
        current.polls[pollId] ||= {votes:{}};
        current.polls[pollId].votes[voterId] = option;
      }
    }
    if (msg.type === 'question') {
      const incoming = msg.question || {};
      const safe = sanitizeText(incoming.text, 240);
      if (safe) {
        current.questions ||= [];
        if (!current.questions.some(q => q.id === incoming.id)) {
          current.questions.push({id: sanitizeText(incoming.id || crypto.randomUUID(), 80), text:safe, at:incoming.at || new Date().toISOString(), status:'pending', likes:0});
        }
      }
    }
    if (msg.type === 'questionUpdate') {
      const qid = sanitizeText(msg.id, 80);
      const patch = msg.patch || {};
      current.questions = (current.questions || []).map(q => q.id === qid ? {...q, ...patch, text:q.text} : q);
    }
    if (msg.type === 'reset') current = clone(INITIAL_STATE);
    current = await this.putState(current);
    await this.broadcast({type:'state', state: current, source});
  }

  send(id, payload) {
    const socket = this.sockets.get(id);
    try { socket?.send(JSON.stringify(payload)); } catch { this.sockets.delete(id); }
  }
  async broadcast(payload) {
    const text = JSON.stringify(payload);
    for (const [id, socket] of this.sockets) {
      try { socket.send(text); } catch { this.sockets.delete(id); }
    }
  }
  async broadcastState() { await this.broadcast({type:'state', state: await this.getStoredState(), source:'server'}); }
  broadcastParticipants() { this.broadcast({type:'participants', count:this.sockets.size, source:'server'}); }
}
