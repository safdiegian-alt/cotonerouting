import {windows} from './optimizer.mjs?v=33';
export function applyManualStops(stops,edits){
 let next=Math.max(0,...stops.map(s=>s.id))+1;const result=[...stops];
 for(const e of edits)if(e.data?.kind==='manual'){
  const s=e.data.stop;result.push({...s,id:next++,key:e.key,windows:windows(s.schedule),coord:null,confirmed:false,manual:true,lines:[],note:'Parada agregada manualmente'});
 }
 const removed=new Set(edits.filter(e=>e.data?.kind==='removed').map(e=>e.data.stopKey));
 return result.filter(s=>!removed.has(s.key));
}
