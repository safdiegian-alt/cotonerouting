import {evaluate,routeCost} from './optimizer.mjs?v=33';
// Compare direct travel to a depot stop at each transition. No capacity is invented.
export function improveDepot(route,ctx){
 const bare=route.filter(s=>!s.depot);let best=evaluate(bare,ctx);if(!best||!ctx.twoTrips)return best;
 for(let i=1;i<bare.length;i++){
  const prefix=bare.slice(0,i);if(!prefix.some(s=>s.depotBound))continue;
  const a=bare[i-1],b=bare[i],direct=ctx.durations[a.idx][b.idx]/60,via=(ctx.durations[a.idx][0]+ctx.durations[0][b.idx])/60;
  const vector=s=>[(s.coord[1]-ctx.depotCoord[1])*Math.cos(ctx.depotCoord[0]*Math.PI/180),s.coord[0]-ctx.depotCoord[0]];
  const u=vector(a),v=vector(b),cos=(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1);
  const useful=cos<.5&&via-direct<=5;
  const stop={depot:true,id:'depot',idx:0,coord:ctx.depotCoord,address:ctx.depotAddress,type:'Descarga y descanso',note:useful?'Cambio de corredor; desvío al depósito de '+Math.max(0,via-direct).toFixed(1)+' min':'Descarga durante espera disponible'};
  const candidate=evaluate([...prefix,stop,...bare.slice(i)],ctx);if(!candidate)continue;
  // An on-the-way unload is operationally useful even if its configured service takes time.
  const existing=best.timeline.some(t=>t.stop.depot&&!t.stop.finalUnload);
  if((useful&&!existing)||(useful===existing&&routeCost(candidate)<routeCost(best)))best=candidate;
 }
 return best;
}
