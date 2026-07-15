import { stateBus, getPollResults } from './shared-state.js';
import { getAudienceUrl, renderQr } from './qr.js';

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const screens=$$('.screen,.story-section');
let activeIndex=0;
let currentStoryStep=0;
let internalNavigation=false;
let lessonIndex=0;
let lessonTimer=null;
let screenTitles=['Abertura','Antes da cláusula','Enquete · Visual e governança','Negociação contratual','Limites da atuação jurídica','Assinaturas eletrônicas','Do documento à compreensão','Contratos em Visual Law','ALL ADEO','Síntese prática','Perguntas do público','Encerramento'];

function splitText(){
  $$('[data-split]').forEach(el=>{
    if(el.dataset.splitDone) return;
    let index=0;
    const words=el.textContent.trim().split(/\s+/);
    el.innerHTML=words.map(word=>`<span class="word">${[...word].map(char=>`<span class="char" style="--char-index:${index++}">${char}</span>`).join('')}</span>`).join(' ');
    el.dataset.splitDone='1';
  });
}

function sectionTop(index,step=0){
  const el=screens[index];
  if(!el) return 0;
  const steps=Number(el.dataset.storySteps||1);
  if(steps===1) return el.offsetTop;
  const scrollable=el.offsetHeight-innerHeight;
  return el.offsetTop+(scrollable*(step/(steps-1)));
}

function goTo(index,step=0,behavior='smooth'){
  index=Math.max(0,Math.min(screens.length-1,index));
  const steps=Number(screens[index].dataset.storySteps||1);
  step=Math.max(0,Math.min(steps-1,step));
  internalNavigation=true;
  window.scrollTo({top:sectionTop(index,step),behavior:document.body.classList.contains('reduce-motion')?'auto':behavior});
  setTimeout(()=>internalNavigation=false,700);
  setActive(index,step,true);
}

function advance(direction){
  if(stateBus.get().manualNavigationLocked) return;
  const el=screens[activeIndex];
  const steps=Number(el.dataset.storySteps||1);
  if(direction>0 && steps>1 && currentStoryStep<steps-1) return goTo(activeIndex,currentStoryStep+1);
  if(direction<0 && steps>1 && currentStoryStep>0) return goTo(activeIndex,currentStoryStep-1);
  return goTo(activeIndex+direction,direction>0?0:Number(screens[activeIndex+direction]?.dataset.storySteps||1)-1);
}

function setActive(index,step=0,broadcast=false){
  activeIndex=Math.max(0,Math.min(screens.length-1,index));
  currentStoryStep=step;
  screens.forEach((screen,i)=>screen.classList.toggle('is-active',i===activeIndex));
  $('#screenNumber').textContent=String(activeIndex+1).padStart(2,'0');
  $('#progressBar').style.height=`${((activeIndex+Math.max(0,step/3)+1)/screens.length)*100}%`;
  const cursorLabel=screens[activeIndex]?.dataset.cursor||'EXPLORAR';
  $('#cursor span').textContent=cursorLabel;
  if(broadcast) stateBus.update({currentScreen:activeIndex,currentStep:step},{broadcast:true});
  manageLessonCarousel();
}

function updateStories(){
  screens.forEach((section,index)=>{
    const steps=Number(section.dataset.storySteps||1);
    if(steps===1) return;
    const max=section.offsetHeight-innerHeight;
    const progress=Math.max(0,Math.min(1,(scrollY-section.offsetTop)/Math.max(max,1)));
    section.style.setProperty('--story-progress',progress.toFixed(4));
    const step=Math.min(steps-1,Math.floor(progress*steps));
    section.classList.toggle('phase-0',step===0);section.classList.toggle('phase-1',step===1);section.classList.toggle('phase-2',step===2);
    section.querySelector('.case-scene')?.setAttribute('data-phase',String(step));
    if(section.id==='s07') $('#case1PhaseLabel').textContent=['ANTES','TRANSFORMAÇÃO','DEPOIS'][step];
    if(section.id==='s08') $('#case2PhaseLabel').textContent=['DOCUMENTO FORMAL','ORGANIZAÇÃO','CAMADA VISUAL'][step];
    const center=scrollY+innerHeight/2;
    if(center>=section.offsetTop && center<section.offsetTop+section.offsetHeight && index===activeIndex && step!==currentStoryStep){
      currentStoryStep=step;
      if(!internalNavigation) stateBus.update({currentScreen:activeIndex,currentStep:step},{broadcast:true});
    }
  });
}

function detectActive(){
  const center=scrollY+innerHeight*.48;
  let found=activeIndex;
  screens.forEach((screen,i)=>{if(center>=screen.offsetTop && center<screen.offsetTop+screen.offsetHeight) found=i;});
  if(found!==activeIndex){
    const steps=Number(screens[found].dataset.storySteps||1);
    const progress=steps>1?Math.max(0,Math.min(1,(scrollY-screens[found].offsetTop)/(screens[found].offsetHeight-innerHeight))):0;
    const step=Math.min(steps-1,Math.floor(progress*steps));
    setActive(found,step,!internalNavigation);
  }
}

function onScroll(){updateStories();detectActive();}

function initPointer(){
  if(matchMedia('(pointer:coarse)').matches) return;
  document.body.classList.add('pointer-fine');
  const cursor=$('#cursor');let tx=innerWidth/2,ty=innerHeight/2,x=tx,y=ty;
  addEventListener('pointermove',event=>{
    tx=event.clientX;ty=event.clientY;
    document.documentElement.style.setProperty('--pointer-x',`${tx/innerWidth*100}%`);
    document.documentElement.style.setProperty('--pointer-y',`${ty/innerHeight*100}%`);
    const screen=event.target.closest('.screen,.story-section');
    if(screen?.dataset.cursor) cursor.querySelector('span').textContent=screen.dataset.cursor;
  });
  (function frame(){x+=(tx-x)*.14;y+=(ty-y)*.14;cursor.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;requestAnimationFrame(frame)})();
}


function applyContent(state){
  const content = state.content || {};
  screenTitles = content.screens || screenTitles;
  const titleLines = Array.isArray(content.titleLines) && content.titleLines.length ? content.titleLines : String(content.title || 'Questões Práticas do Direito de Contratos').split(/\s+/).reduce((acc,w,i)=>{ if(i<2) acc[0]=(acc[0]?acc[0]+' ':'')+w; else if(i<5) acc[1]=(acc[1]?acc[1]+' ':'')+w; else acc[2]=(acc[2]?acc[2]+' ':'')+w; return acc; },['','','']).filter(Boolean);
  const heroTitle = $('#heroTitle');
  if(heroTitle){
    heroTitle.innerHTML = titleLines.map(line=>`<span class="title-line">${line}</span>`).join('');
    heroTitle.setAttribute('aria-label', content.title || titleLines.join(' '));
  }
  const heroSubtitle = $('#heroSubtitle'); if(heroSubtitle) heroSubtitle.textContent = content.subtitle || heroSubtitle.textContent;
  const speaker = content.speaker || {};
  if($('#speakerName')) $('#speakerName').textContent = speaker.name || 'Rodrigo Kalil Ribeiro';
  if($('#speakerInfo')) $('#speakerInfo').innerHTML = `${speaker.role || 'Diretor Jurídico & Compliance'}<br>${speaker.company || 'Leroy Merlin e Obramax'}`;
  if($('#closingSpeaker')) $('#closingSpeaker').textContent = speaker.name || 'Rodrigo Kalil Ribeiro';
  if($('#closingMessage')) { const msg=String(content.closingMessage || 'Contratos melhores não nascem apenas de cláusulas melhores. Nascem de decisões mais claras.'); $('#closingMessage').innerHTML = msg.replace(/\.\s+/, '.<br>'); }
  (content.screenTitles || []).forEach((text,index)=>{
    const title = screens[index]?.querySelector('.section-title');
    if(title && index!==0) title.textContent = text;
    screens[index]?.setAttribute('data-title', (content.screens || [])[index] || screens[index].dataset.title || '');
  });
  $('#screenNumber').textContent=String(activeIndex+1).padStart(2,'0');
}

function showQr(label){
  const url=getAudienceUrl(stateBus.get().qr.url);
  $('#qrHeading').textContent=label||stateBus.get().qr.label;
  $('#qrFallback').href=url||'mobile/';
  renderQr($('#qrImage'),url,260);
  $('#qrOverlay').hidden=false;
}
function hideQr(){ $('#qrOverlay').hidden=true; }

function renderPoll(state){
  const pollId = state.activePollId || 'negotiation';
  const poll = stateBus.pollCatalog[pollId] || stateBus.pollCatalog.negotiation;
  const q = $('#pollScreenQuestion');
  const list = $('#pollScreenResults');
  const status = $('#pollScreenStatus');
  const foot = $('#pollScreenFootnote');
  if(!q || !list || !status || !foot) return;
  q.textContent = poll.title;
  const results=getPollResults(state,pollId);
  const total=results[0]?.total||0;
  const isOpen=state.activePollId && state.pollStatus==='open';
  const isPaused=state.activePollId && state.pollStatus==='paused';
  const isClosed=state.activePollId && state.pollStatus==='closed';
  status.textContent = isOpen ? `Votação aberta · ${total} resposta${total===1?'':'s'}` : isPaused ? `Votação pausada · ${total} resposta${total===1?'':'s'}` : isClosed ? `Votação encerrada · ${total} resposta${total===1?'':'s'}` : 'Aguardando abertura pelo painel';
  list.innerHTML=results.map(item=>`<div class=\"poll-screen-result\"><span>${item.option}</span><i><b style=\"width:${state.showPollResults?item.percent:0}%\"></b></i><strong>${state.showPollResults?item.percent+'%':'—'}</strong></div>`).join('');
  foot.textContent = state.showPollResults ? 'Resultados liberados pelo apresentador.' : 'Resultados ocultos pelo apresentador.';
}

function renderQuestionsPage(state){
  const selected = state.questions.find(q=>q.id===state.highlightedQuestionId);
  const featured = $('#featuredQuestionText');
  if(featured) featured.textContent = selected ? selected.text : 'Nenhuma pergunta destacada ainda.';
  const queue = $('#questionQueueList');
  if(queue){
    const items=(state.questions||[]).slice(-4).reverse();
    queue.innerHTML = items.length ? items.map(q=>`<article><p>${q.text}</p><small>${q.status}</small></article>`).join('') : '<span>Aguardando perguntas do público.</span>';
  }
}

function renderQuestion(state){
  const question=state.questions.find(q=>q.id===state.highlightedQuestionId);
  $('#questionOverlay').hidden=!question;
  if(question) $('#highlightedQuestion').textContent=question.text;
}

function applyState(state,meta){
  applyContent(state);
  document.body.classList.toggle('reduce-motion',state.motionMode==='reduced');
  document.body.classList.toggle('low-performance',state.motionMode==='low');
  document.body.classList.toggle('chrome-hidden',state.chromeHidden);
  if(state.qr.visible) showQr(state.qr.label); else if(meta.source!=='initial') hideQr();
  renderPoll(state);renderQuestionsPage(state);renderQuestion(state);
  if(meta.source!==stateBus.clientId && (state.currentScreen!==activeIndex || state.currentStep!==currentStoryStep)) goTo(state.currentScreen,state.currentStep,meta.source==='initial'?'auto':'smooth');
}

function manageLessonCarousel(){
  clearInterval(lessonTimer);
  if(activeIndex!==9 || document.body.classList.contains('reduce-motion')) return;
  const lessons=$$('.lesson');
  lessonTimer=setInterval(()=>{lessons[lessonIndex].classList.remove('is-current');lessonIndex=(lessonIndex+1)%lessons.length;lessons[lessonIndex].classList.add('is-current');},2800);
}

function dismissLoader(){
  const loader=$('#loader');
  if(!loader) return;
  loader.classList.add('done');
  setTimeout(()=>loader.remove(),1400);
}

function bootPresentation(){
  splitText();
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll);
  $('#prevButton')?.addEventListener('click',()=>advance(-1));
  $('#nextButton')?.addEventListener('click',()=>advance(1));
  $$('[data-next]').forEach(button=>button.addEventListener('click',()=>advance(1)));
  $$('[data-goto]').forEach(button=>button.addEventListener('click',()=>goTo(screens.findIndex(screen=>screen.id===button.dataset.goto),0)));
  $('#motionButton')?.addEventListener('click',()=>{const state=stateBus.get();const next=state.motionMode==='full'?'reduced':'full';stateBus.update({motionMode:next});$('#motionButton')?.setAttribute('aria-pressed',String(next!=='full'));});
  $('#signatureQrButton')?.addEventListener('click',()=>showQr('Participe da dinâmica sobre assinaturas'));
  $('#heroQrButton')?.addEventListener('click',()=>showQr('Acompanhe pelo celular e participe da palestra'));
  $('#finalQrButton')?.addEventListener('click',()=>showQr('Acesse os materiais e participe'));
  $$('[data-show-poll]').forEach(button=>button.addEventListener('click',()=>{
    const pollId=button.dataset.showPoll||'negotiation';
    stateBus.update({activePollId:pollId,pollStatus:'open',showPollResults:false,currentScreen:2,currentStep:0,qr:{...stateBus.get().qr,visible:true,label:'Participe da enquete pelo celular'}});
    showQr('Participe da enquete pelo celular');
  }));
  $('#closeQr')?.addEventListener('click',hideQr);
  $('#qrOverlay')?.addEventListener('click',event=>{if(event.target.id==='qrOverlay')hideQr();});
  addEventListener('keydown',event=>{
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();advance(1)}
    if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();advance(-1)}
    if(event.key==='Home')goTo(0);if(event.key==='End')goTo(screens.length-1);
    if(event.key.toLowerCase()==='f')document.documentElement.requestFullscreen?.();
    if(event.key==='Escape'){hideQr();}
  });
  initPointer();
  if(!location.hash){
    window.scrollTo({top:0,behavior:'auto'});
    stateBus.update({currentScreen:0,currentStep:0,qr:{...stateBus.get().qr,visible:false}},{broadcast:false});
    setActive(0,0,false);
  }
  stateBus.subscribe(applyState);
  onScroll();
  document.documentElement.classList.add('presentation-ready');
}

try{
  bootPresentation();
}catch(error){
  console.error('[Apresentação] Falha de inicialização:',error);
  document.body.classList.add('presentation-fallback');
  window.scrollTo({top:0,behavior:'auto'});
}finally{
  setTimeout(dismissLoader,1100);
}
