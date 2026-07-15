import { stateBus, getPollResults } from './shared-state.js';
import { getAudienceUrl } from './qr.js';

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
let screenTitles=["Abertura", "Antes da cláusula", "Enquete · Visual e governança", "Negociação contratual", "Limites da atuação jurídica", "Assinaturas eletrônicas", "Do documento à compreensão", "Contratos em Visual Law", "ALL ADEO", "Síntese prática", "Perguntas do público", "Encerramento"];
const storySteps={6:3,7:3,8:3};
let currentState=stateBus.get();
let selectedNote='rodrigo';
let notes=JSON.parse(localStorage.getItem('contract-speaker-notes-v10')||'{}');
let timerInterval=null;

function advance(direction){
  const state=stateBus.get();
  const steps=storySteps[state.currentScreen]||1;
  let screen=state.currentScreen,step=state.currentStep;
  if(direction>0 && step<steps-1) step++;
  else if(direction<0 && step>0) step--;
  else {screen=Math.max(0,Math.min(11,screen+direction));step=direction>0?0:(storySteps[screen]||1)-1;}
  stateBus.update({currentScreen:screen,currentStep:step});
}


function normalizeContent(content={}){
  return {
    title: content.title || 'Questões Práticas do Direito de Contratos',
    titleLines: content.titleLines || ['Questões Práticas','do Direito de','Contratos'],
    subtitle: content.subtitle || 'Negociação, limites da atuação jurídica e assinaturas eletrônicas',
    speaker: {
      name: content.speaker?.name || 'Rodrigo Kalil Ribeiro',
      role: content.speaker?.role || 'Diretor Jurídico & Compliance',
      company: content.speaker?.company || 'Leroy Merlin e Obramax'
    },
    closingMessage: content.closingMessage || 'Contratos melhores não nascem apenas de cláusulas melhores. Nascem de decisões mais claras.',
    screens: content.screens || screenTitles,
    screenTitles: content.screenTitles || ["Questões Práticas do Direito de Contratos", "Antes da cláusula, existe uma decisão.", "Visual Law e governança da decisão", "Negociação contratual", "Até onde vai o jurídico?", "Assinar é apenas uma parte da validade.", "A camada visual complementa o documento jurídico.", "Contratos Leroy Merlin", "ALL ADEO", "O que os dois casos ensinam", "Perguntas do público", "Negociar · Equilibrar · Evidenciar"]
  };
}

function renderContentEditor(state){
  const content=normalizeContent(state.content||{});
  screenTitles=content.screens;
  $('#panelPresentationTitle').textContent=content.title;
  $('#editTitle').value=content.title;
  $('#editTitleLines').value=content.titleLines.join(' | ');
  $('#editSubtitle').value=content.subtitle;
  $('#editSpeakerName').value=content.speaker.name;
  $('#editSpeakerRole').value=content.speaker.role;
  $('#editSpeakerCompany').value=content.speaker.company;
  $('#editScreenTitles').value=content.screenTitles.join('\n');
  $('#editClosingMessage').value=content.closingMessage;
}

function collectContentEditor(){
  const title=$('#editTitle').value.trim() || 'Questões Práticas do Direito de Contratos';
  const titleLines=$('#editTitleLines').value.split('|').map(v=>v.trim()).filter(Boolean);
  const screenTitles=$('#editScreenTitles').value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,12);
  return {
    title,
    titleLines: titleLines.length?titleLines:[title],
    subtitle: $('#editSubtitle').value.trim(),
    speaker: {
      name: $('#editSpeakerName').value.trim(),
      role: $('#editSpeakerRole').value.trim(),
      company: $('#editSpeakerCompany').value.trim()
    },
    closingMessage: $('#editClosingMessage').value.trim(),
    screenTitles: screenTitles.length===12?screenTitles:normalizeContent(stateBus.get().content).screenTitles,
    screens: screenTitles.length===12?screenTitles.map((t,i)=>["Abertura", "Antes da cláusula", "Enquete · Visual e governança", "Negociação contratual", "Limites da atuação jurídica", "Assinaturas eletrônicas", "Do documento à compreensão", "Contratos em Visual Law", "ALL ADEO", "Síntese prática", "Perguntas do público", "Encerramento"][i]||t):normalizeContent(stateBus.get().content).screens
  };
}

function renderNavigation(state){
  const steps=storySteps[state.currentScreen]||1;
  $('#currentNumber').textContent=String(state.currentScreen+1).padStart(2,'0');
  $('#currentTitle').textContent=screenTitles[state.currentScreen];
  $('#currentStep').textContent=`Etapa ${state.currentStep+1} de ${steps}`;
  const nextIndex=Math.min(11,state.currentScreen+(state.currentStep>=steps-1?1:0));
  $('#nextNumber').textContent=String(nextIndex+1).padStart(2,'0');
  $('#nextTitle').textContent=state.currentStep<steps-1?`${screenTitles[state.currentScreen]} · próxima etapa`:screenTitles[nextIndex];
  $$('#screenJump button').forEach((button,index)=>button.classList.toggle('active',index===state.currentScreen));
  $('#toggleChrome').textContent=state.chromeHidden?'Exibir interface':'Ocultar interface';
  $('#lockNavigation').textContent=state.manualNavigationLocked?'Liberar navegação manual':'Bloquear navegação manual';
  renderConnection(state);
}

function renderConnection(state){
  const status=state.connection?.status || 'local';
  const mode=state.connection?.mode || 'local';
  const participants=state.connection?.participants || 1;
  const online = mode === 'remote' && status === 'online';
  $('#modeBadge').textContent = online ? 'TEMPO REAL CLOUDFLARE' : (mode==='remote' ? 'RECONECTANDO' : 'MODO LOCAL');
  $('#connectionStatus').textContent = online ? `${participants} dispositivo${participants===1?'':'s'} conectado${participants===1?'':'s'}` : (mode==='remote' ? 'Reconectando ao Worker…' : 'Sincronização local ativa');
  document.body.classList.toggle('is-online', online);
}

function renderMotion(state){
  $$('#motionModes button').forEach(button=>button.classList.toggle('active',button.dataset.motion===state.motionMode));
}

function renderQr(state){
  const url=getAudienceUrl(state.qr.url);
  $('#qrUrlInput').value=state.qr.url||url;
  $('#qrLabelInput').value=state.qr.label;
  $('#qrStatus').textContent=state.qr.visible?'Visível':'Oculto';
  $('#qrHelp').textContent=url?'A URL foi calculada a partir do endereço publicado.':'A URL será calculada automaticamente depois do deploy no Cloudflare Pages.';
}

function renderPoll(state){
  const selected=$('#pollSelect').value||state.activePollId||'negotiation';
  if(!$('#pollSelect').value) $('#pollSelect').value=selected;
  const results=getPollResults(state,selected);const total=results[0]?.total||0;
  $('#pollVoteCount').textContent=total;
  $('#pollStatusBadge').textContent=state.activePollId===selected?({open:'Aberta',paused:'Pausada',closed:'Fechada'}[state.pollStatus]||'Fechada'):'Inativa';
  $('#toggleResults').textContent=state.showPollResults?'Ocultar resultados':'Liberar resultados';
  $('#adminPollResults').innerHTML=results.map(item=>`<div class="admin-result"><span>${item.option}</span><strong>${item.percent}%</strong><i><b style="width:${item.percent}%"></b></i></div>`).join('');
}

function questionButton(label,action,extra=''){return `<button type="button" data-action="${action}" class="${extra}">${label}</button>`;}
function renderQuestions(state){
  $('#questionCount').textContent=state.questions.length;
  if(!state.questions.length){$('#questionList').innerHTML='<p class="empty-admin">Nenhuma pergunta recebida.</p>';return;}
  $('#questionList').innerHTML=[...state.questions].reverse().map(question=>`<article class="question-admin" data-id="${question.id}"><p>${question.text}</p><small>${new Date(question.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${question.status}</small><div class="question-actions">${questionButton('Aprovar','approve')}${questionButton(state.highlightedQuestionId===question.id?'Remover do telão':'Destacar','highlight',state.highlightedQuestionId===question.id?'highlight':'')}${questionButton('Respondida','answer')}${questionButton('Arquivar','archive')}${questionButton('Rejeitar','reject')}</div></article>`).join('');
  $$('.question-admin button').forEach(button=>button.onclick=()=>{
    const id=button.closest('.question-admin').dataset.id;
    const action=button.dataset.action;
    if(action==='highlight'){ const current=stateBus.get(); stateBus.update({highlightedQuestionId:current.highlightedQuestionId===id?null:id,currentScreen:10,currentStep:0}); }
    else stateBus.updateQuestion(id,{status:{approve:'approved',answer:'answered',archive:'archived',reject:'rejected'}[action]});
  });
}

function noteKey(){return `screen-${currentState.currentScreen+1}-${selectedNote}`;}
function saveNote(){notes[noteKey()]=$('#speakerNotes').value;localStorage.setItem('contract-speaker-notes-v10',JSON.stringify(notes));}
function renderNotes(){ $('#speakerNotes').value=notes[noteKey()]||''; }

function renderTimer(state){
  clearInterval(timerInterval);
  const update=()=>{
    const timerState=stateBus.get();
    const start=timerState.sessionStartedAt;
    const elapsed=(timerState.sessionElapsed||0)+(start?Math.max(0,Date.now()-start):0);
    const hours=Math.floor(elapsed/3600000);const minutes=Math.floor(elapsed%3600000/60000);const seconds=Math.floor(elapsed%60000/1000);
    $('#masterTimer').textContent=[hours,minutes,seconds].map(v=>String(v).padStart(2,'0')).join(':');
  };
  update();timerInterval=setInterval(update,1000);
  $('#startPause').textContent=state.sessionStartedAt?'Pausar cronômetro':(state.paused?'Retomar cronômetro':'Iniciar cronômetro');
}

function render(state){currentState=state;renderContentEditor(state);renderNavigation(state);renderMotion(state);renderQr(state);renderPoll(state);renderQuestions(state);renderNotes();renderTimer(state);}

for(let i=0;i<12;i++){
  const button=document.createElement('button');button.type='button';button.textContent=String(i+1).padStart(2,'0');button.title=screenTitles[i];button.onclick=()=>stateBus.update({currentScreen:i,currentStep:0});$('#screenJump').appendChild(button);
}
Object.entries(stateBus.pollCatalog).forEach(([id,poll])=>{const option=document.createElement('option');option.value=id;option.textContent=poll.title;$('#pollSelect').appendChild(option);});

$('#prevScreen').onclick=()=>advance(-1);$('#nextScreen').onclick=()=>advance(1);
$('#restartDeck').onclick=()=>stateBus.update({currentScreen:0,currentStep:0,highlightedQuestionId:null});
$('#startPause').onclick=()=>stateBus.update(state=>{
  if(state.sessionStartedAt){return {sessionElapsed:(state.sessionElapsed||0)+(Date.now()-state.sessionStartedAt),sessionStartedAt:null,paused:true};}
  return {sessionStartedAt:Date.now(),paused:false};
});
$('#toggleChrome').onclick=()=>stateBus.update(state=>({chromeHidden:!state.chromeHidden}));
$('#lockNavigation').onclick=()=>stateBus.update(state=>({manualNavigationLocked:!state.manualNavigationLocked}));
$$('#motionModes button').forEach(button=>button.onclick=()=>stateBus.update({motionMode:button.dataset.motion}));
$('#showQr').onclick=()=>stateBus.update(state=>({qr:{...state.qr,visible:true,label:$('#qrLabelInput').value.trim()||'Acesse o conteúdo complementar'}}));
$('#hideQr').onclick=()=>stateBus.update(state=>({qr:{...state.qr,visible:false}}));
$('#copyQrUrl').onclick=async()=>{const url=getAudienceUrl();if(url){await navigator.clipboard.writeText(url);$('#qrHelp').textContent='URL copiada.';}else $('#qrHelp').textContent='Publique o site para gerar a URL definitiva.';};
$('#qrLabelInput').addEventListener('change',()=>stateBus.update(state=>({qr:{...state.qr,label:$('#qrLabelInput').value.trim()}})));
$('#qrUrlInput').addEventListener('change',()=>stateBus.update(state=>({qr:{...state.qr,url:$('#qrUrlInput').value.trim()}})));
$('#pollSelect').onchange=()=>renderPoll(stateBus.get());
$('#openPoll').onclick=()=>stateBus.update(state=>({activePollId:$('#pollSelect').value,pollStatus:'open',showPollResults:false,currentScreen:2,currentStep:0,qr:{...state.qr,visible:true,label:'Vote pelo celular'}}));
$('#closePoll').onclick=()=>stateBus.update({pollStatus:'closed'});
$('#hidePoll').onclick=()=>stateBus.update({pollStatus:'closed',activePollId:null,showPollResults:false});
$('#toggleResults').onclick=()=>stateBus.update(state=>({showPollResults:!state.showPollResults}));
$('#resetPoll').onclick=()=>{const id=$('#pollSelect').value;stateBus.update(state=>({polls:{...state.polls,[id]:{votes:{}}}}));};
$('#exportPoll').onclick=()=>{
  const id=$('#pollSelect').value;const results=getPollResults(stateBus.get(),id);const csv=['opcao,respostas,percentual',...results.map(r=>`"${r.option}",${r.count},${r.percent}`)].join('\n');download(`enquete-${id}.csv`,csv,'text/csv');
};
$$('.note-tabs button').forEach(button=>button.onclick=()=>{saveNote();selectedNote=button.dataset.note;$$('.note-tabs button').forEach(b=>b.classList.toggle('active',b===button));renderNotes();});
$('#speakerNotes').addEventListener('input',()=>{clearTimeout(window.noteSaveTimer);window.noteSaveTimer=setTimeout(saveNote,300);});
$('#exportNotes').onclick=()=>{saveNote();download('notas-palestrantes.json',JSON.stringify(notes,null,2),'application/json');};
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

$('#saveContent').onclick=()=>stateBus.update({content:collectContentEditor()});
$('#resetContent').onclick=()=>stateBus.update({content:normalizeContent({})});
stateBus.subscribe(render);
