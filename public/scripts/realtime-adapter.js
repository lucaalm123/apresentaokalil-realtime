import { runtimeConfig } from '../config/runtime-config.js';
import { stateBus } from './shared-state.js';

/**
 * Ponto de extensão para futura sincronização externa.
 * O modo atual é local e usa localStorage + BroadcastChannel.
 * Para produção, configure runtimeConfig.realtime.apiBaseUrl e altere mode para "remote".
 */
export const realtimeAdapter = {
  mode: runtimeConfig.realtime.mode,
  async health(){
    if(this.mode !== 'remote' || !runtimeConfig.realtime.apiBaseUrl) return {ok:true,mode:'local'};
    try{
      const response=await fetch(`${runtimeConfig.realtime.apiBaseUrl}/health`,{credentials:'include'});
      return {ok:response.ok,mode:'remote'};
    }catch{return {ok:false,mode:'remote'};}
  },
  subscribe(handler){ return stateBus.subscribe(handler); },
  update(patch){ return stateBus.update(patch); }
};
