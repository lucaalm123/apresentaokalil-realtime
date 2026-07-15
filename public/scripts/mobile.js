import { stateBus, getPollResults } from './shared-state.js';

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
let screenTitles=['Abertura','Antes da cláusula','Enquete · Visual e governança','Negociação contratual','Limites da atuação jurídica','Assinaturas eletrônicas','Do documento à compreensão','Contratos em Visual Law','ALL ADEO','Síntese prática','Perguntas do público','Encerramento'];
let lastPollId=null;

const fallbackGuides = [{"title": "Abertura", "text": "A palestra apresenta contratos como sistemas de decisão: negociar, equilibrar e evidenciar."}, {"title": "Antes da cláusula", "text": "Toda cláusula nasce de escolhas, riscos, prioridades e autoridades de decisão."}, {"title": "Enquete ao vivo", "text": "Vote pelo celular: qual recurso visual mais fortalece a governança em contratos complexos?"}, {"title": "Negociação contratual", "text": "Prioridades, autoridade e compensação definem o que realmente entra no contrato."}, {"title": "Limites jurídicos", "text": "Separar recomendação jurídica, escolha comercial e registro de aprovação melhora governança."}, {"title": "Assinaturas eletrônicas", "text": "A validade depende da trilha de evidências e do contexto do risco."}, {"title": "Camadas de comunicação", "text": "A camada visual complementa o documento jurídico sem substituir sua função formal."}, {"title": "Caso Leroy Merlin", "text": "O antes e depois evidencia hierarquia, jornada e orientação visual."}, {"title": "Caso ALL ADEO", "text": "A cartilha orienta; os documentos oficiais continuam sendo a referência formal."}, {"title": "Síntese", "text": "Contratos melhores combinam rigor, decisão, governança e compreensão."}, {"title": "Perguntas do público", "text": "Envie perguntas pelo celular. A equipe pode selecionar uma pergunta para aparecer no telão."}, {"title": "Encerramento", "text": "Envie sua pergunta final ou salve os aprendizados principais."}];

function renderPoll(state){
  const noPoll=$('#noActivePoll'),active=$('#activePoll');
  if(!state.activePollId || state.pollStatus==='closed'){
    noPoll.hidden=false;active.hidden=true;lastPollId=null;return;
  }
  noPoll.hidden=true;active.hidden=false;
  const catalog=stateBus.pollCatalog[state.activePollId];
  $('#mobilePollQuestion').textContent=catalog.title;
  if(lastPollId!==state.activePollId){
    $('#mobilePollOptions').innerHTML='';
    catalog.options.forEach(option=>{
      const button=document.createElement('button');button.type='button';button.textContent=option;
      button.onclick=()=>{
        if(stateBus.get().pollStatus!=='open') return;
        stateBus.vote(state.activePollId,option);
        [...button.parentElement.children].forEach(b=>b.classList.remove('selected'));
        button.classList.add('selected');
        $('#mobileVoteFeedback').textContent=`Resposta registrada: ${option}`;
      };
      $('#mobilePollOptions').appendChild(button);
    });
    lastPollId=state.activePollId;
  }
  const isOpen=state.pollStatus==='open';
  $$('#mobilePollOptions button').forEach(button=>button.disabled=!isOpen);
  if(!isOpen) $('#mobileVoteFeedback').textContent='Votação encerrada.';
  const results=getPollResults(state,state.activePollId);
  $('#mobilePollResults').hidden=!state.showPollResults;
  if(state.showPollResults){
    $('#mobilePollResults').innerHTML=results.map(item=>`<div class="mobile-result"><span>${item.option}</span><strong>${item.percent}%</strong><i><b style="width:${item.percent}%"></b></i></div>`).join('');
  }
}

function applyContent(state){
  const content=state.content||{};
  screenTitles=content.screens||screenTitles;
  if($('#mobileTitle')) $('#mobileTitle').textContent=content.title||'Questões Práticas do Direito de Contratos';
  if($('#mobileSubtitle')) $('#mobileSubtitle').textContent=content.subtitle||'Negociação · limites da atuação jurídica · assinaturas eletrônicas';
  const speaker=content.speaker||{};
  if($('#mobileSpeakerName')) $('#mobileSpeakerName').textContent=speaker.name||'Rodrigo Kalil Ribeiro';
  if($('#mobileSpeakerInfo')) $('#mobileSpeakerInfo').textContent=`${speaker.role||'Diretor Jurídico & Compliance'} · ${speaker.company||'Leroy Merlin e Obramax'}`;
}

function renderGuide(state){
  const guides=state.content?.mobileGuides || fallbackGuides;
  const guide=guides[state.currentScreen] || fallbackGuides[state.currentScreen] || fallbackGuides[0];
  $('#liveGuideTitle').textContent=guide.title || screenTitles[state.currentScreen] || 'Agora';
  $('#liveGuideText').textContent=guide.text || '';
  const status=state.connection?.status || 'local';
  const mode=state.connection?.mode || 'local';
  $('#connectionHint').textContent = mode==='remote'
    ? (status==='online' ? 'sincronizado em tempo real' : 'reconectando ao telão…')
    : 'modo local de demonstração';
}

function render(state){
  applyContent(state);
  $('#currentTopic').textContent=screenTitles[state.currentScreen]||screenTitles[0];
  $('#mobileScreenNumber').textContent=`${String(state.currentScreen+1).padStart(2,'0')} / 12`;
  $('#mobileProgress').style.width=`${(state.currentScreen+1)*(100/12)}%`;
  renderGuide(state);
  renderPoll(state);
}

$('#questionInput').addEventListener('input',event=>$('#charCount').textContent=`${event.target.value.length} / 240`);
$('#sendQuestion').onclick=()=>{
  const input=$('#questionInput');const question=stateBus.addQuestion(input.value);
  if(!question){$('#questionFeedback').textContent='Digite uma pergunta antes de enviar.';return;}
  input.value='';$('#charCount').textContent='0 / 240';$('#questionFeedback').textContent='Pergunta enviada para moderação.';
};
stateBus.subscribe(render);
