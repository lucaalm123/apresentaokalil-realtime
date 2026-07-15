import { runtimeConfig } from '../config/runtime-config.js';
import { createQrSvg } from './qr-lib.js';

export function getAudienceUrl(override=''){
  const clean = String(override || '').trim();
  if(clean) return clean;
  if(runtimeConfig.audience.publicUrl) return runtimeConfig.audience.publicUrl;
  if(location.protocol === 'http:' || location.protocol === 'https:'){
    return new URL(runtimeConfig.audience.path || 'mobile/', location.href).href;
  }
  return '';
}

export function renderQr(container, url, size=260){
  container.innerHTML = '';
  const finalUrl = String(url || '').trim();
  if(!finalUrl){
    const p=document.createElement('p');
    p.textContent='Configure a URL pública para ativar o QR Code.';
    p.style.color='#001522';
    p.style.lineHeight='1.4';
    p.style.padding='20px';
    container.appendChild(p);
    return;
  }
  try{
    const wrap=document.createElement('div');
    wrap.className='qr-svg-wrap';
    wrap.innerHTML=createQrSvg(finalUrl,{moduleSize:6,margin:4});
    const svg=wrap.firstElementChild;
    svg.style.width=`${size}px`;
    svg.style.height=`${size}px`;
    container.appendChild(svg);
  }catch(error){
    const a=document.createElement('a');
    a.href=finalUrl;
    a.textContent=finalUrl;
    a.target='_blank';
    a.rel='noopener';
    a.style.color='#001522';
    a.style.wordBreak='break-all';
    container.appendChild(a);
  }
}
