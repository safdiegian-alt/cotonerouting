import {improveDepot} from './depot-planning.mjs?v=33';
import {prepareAssignments,assignmentGroups,assignmentKey,checkCenter} from './assignment-rules.mjs?v=33';
import {evaluate,vehicleContext,beamInsert,directPairs,scorePlan,zoneEdges,workload,optimize} from './optimizer.mjs?v=33';
import {territoryMetric} from './territory-metric.mjs?v=33';
export function optimizeTerritories(stops,matrix,config,options={}){
 config={...config,maxMapDestinations:0};
 stops=prepareAssignments(stops,config);const data={stops,matrix},groups=assignmentGroups(stops);
 const vehicles=Math.min(config.vehicles,groups.length);
 for(let v=0;v<config.vehicles;v++)vehicleContext(config,v);
 if(groups.length&&groups.length<config.vehicles){const p=optimize(stops,matrix,config),fallbackCtx={...config,...matrix,pickups:stops.reduce((a,s)=>{if(s.type==='Retiro')(a[s.np]??=[]).push(s.id);return a;},{}),directPairs:directPairs(stops)};const routes=p.routes.map((r,v)=>improveDepot(r.route,vehicleContext(fallbackCtx,v))||r);return {...p,...scorePlan(routes,p.unassigned,zoneEdges(stops,matrix)),algorithm:'territories-4-improved',search:{...p.search,fallback:true}};}
 const ctx={...config,...matrix,pickups:stops.reduce((a,s)=>{if(s.type==='Retiro')(a[s.np]??=[]).push(s.id);return a;},{}),directPairs:directPairs(stops)};
 const metrics=p=>{const w=workload(p.routes);return {km:p.routes.reduce((a,r)=>a+r.dist,0),minutes:w.loads.reduce((a,b)=>a+b,0),max:w.maxLoad,wait:w.wait,assigned:p.routes.reduce((a,r)=>a+r.timeline.filter(t=>!t.stop.depot).length,0)};}; 
 const territory=territoryMetric(stops,matrix);
 let seed=9263;const random=()=>((seed=seed*16807%2147483647)/2147483647);
 const start=Date.now(),partitionLimit=256,exceptionLimit=2048;
 const bounds={wait:20,max:Math.min(420,config.end-config.start),minutes:400*vehicles,km:Infinity};
 if(!vehicles)return {...scorePlan(Array.from({length:config.vehicles},(_,v)=>evaluate([],vehicleContext(ctx,v))),[],[]),baseline:{km:0,assigned:0,zoneSplits:0},search:{iterations:0,improvements:0},roadCandidates:[]};
const center=ctx.depotCoord,scale=Math.cos(center[0]*Math.PI/180);
const angle=g=>{const ss=[...new Map(g.map(s=>[s.coord.join(','),s])).values()];return Math.atan2(ss.reduce((n,s)=>n+s.coord[0]-center[0],0),ss.reduce((n,s)=>n+(s.coord[1]-center[1])*scale,0));};
const order=[...groups].sort((a,b)=>angle(a)-angle(b));
const n=order.length,cuts=[];let enumerationLimited=false;
function enumerate(prefix,next){if(cuts.length>=20000){enumerationLimited=true;return;}if(prefix.length===vehicles){const sizes=prefix.map((a,i)=>(prefix[i+1]??n+prefix[0])-a);cuts.push({points:prefix,priority:Math.max(...sizes)+random()*12});return;}for(let i=next;i<=n-(vehicles-prefix.length);i++){enumerate([...prefix,i],i+1);if(enumerationLimited)break;}}
if(vehicles===3){enumerate([],0);}else if(vehicles===1){cuts.push({points:[0],priority:0});}else{
// Sample rotations first so a large combination count cannot starve a territory.
const seenCuts=new Set();for(let t=0;t<4000;t++){const set=new Set();if(t<n){for(let v=0;v<vehicles;v++)set.add((t+Math.floor(v*n/vehicles))%n);}while(set.size<vehicles)set.add(Math.floor(random()*n));const points=[...set].sort((a,b)=>a-b),key=points.join(',');if(seenCuts.has(key))continue;seenCuts.add(key);const sizes=points.map((a,i)=>(points[i+1]??n+points[0])-a);cuts.push({points,priority:Math.max(...sizes)+random()*12});}enumerationLimited=true;}
cuts.sort((a,b)=>a.priority-b.priority);
const cache=new Map();let routeTrials=0,partitionTrials=0,complete=0,within=0,exceptionTrials=0,feasibleRepairs=0,best=null,bestUnbounded=null;const frontier=[];
const ok=p=>{const m=metrics(p);return m.assigned===data.stops.length&&Object.keys(bounds).every(k=>m[k]<=bounds[k]+1e-6)};
const rankCache=new WeakMap();const rank=p=>{if(!rankCache.has(p.routes)){const m=metrics(p);rankCache.set(p.routes,territory(p).score+.015*m.km+.005*m.minutes);}return rankCache.get(p.routes);};
function solve(gs,v){const local=vehicleContext(ctx,v);const key=JSON.stringify([local.start,local.end])+gs.map(g=>assignmentKey(g[0])).sort().join('|');if(cache.has(key))return cache.get(key);let bestRoute=null;
 for(let t=0;t<8;t++){routeTrials++;const pending=gs.map(g=>({g,k:t===0?Math.min(...g.flatMap(s=>s.windows.map(w=>w[1]))):t===1?-Math.max(...g.flatMap(s=>s.windows.map(w=>w[0]))):random()})).sort((a,b)=>a.k-b.k);let r=evaluate([],local);for(const {g} of pending){r=beamInsert(r.route,g,local);if(!r)break;}if(r&&(!bestRoute||r.dist+.3*(r.end-r.start)+3*r.wait<bestRoute.dist+.3*(bestRoute.end-bestRoute.start)+3*bestRoute.wait))bestRoute=r;
 }
 cache.set(key,bestRoute);return bestRoute;
}
function accept(p,meta){if(p.routes.some(r=>!r||!r.timeline.length))return;complete++;const item={...p,partition:meta};if(meta.exceptions===0&&(!bestUnbounded||rank(p)<rank(bestUnbounded)))bestUnbounded=item;if(ok(p)){within++;if(!best||meta.exceptions<best.partition.exceptions||(meta.exceptions===best.partition.exceptions&&rank(p)<rank(best)))best=item;}}
for(const cut of cuts){if(partitionTrials>=partitionLimit)break;partitionTrials++;const points=cut.points,sets=points.map((a,i)=>i<points.length-1?order.slice(a,points[i+1]):[...order.slice(a),...order.slice(0,points[0])]);const routes=sets.map(solve);const meta={cuts:points,exceptions:0,groups:sets.map(gs=>gs.map(g=>assignmentKey(g[0])))};accept({routes},meta);frontier.push({sets,routes,meta,solved:routes.filter(Boolean).length});}
const strictWithinBounds=best;
// Explore up to two whole-NP exceptions per geographic partition. All complete
// intermediate routes must remain schedule-feasible; soft laboratory bounds
// apply only when accepting the final candidate.
let repairBest=null,operationalBest=best,repairDepth=0;
const operation=p=>{const m=metrics(p);return m.km+.25*m.minutes+.25*m.max+2*m.wait;};
const origOwner=meta=>new Map(meta.groups.flatMap((gs,v)=>gs.map(np=>[np,v])));
let beam=frontier.filter(f=>f.routes.every(Boolean)).sort((a,b)=>rank({routes:a.routes})-rank({routes:b.routes})).slice(0,50).map(f=>({...f,original:f.meta,owner:origOwner(f.meta),moves:[]}));
const violation=p=>{const m=metrics(p);return Object.keys(bounds).reduce((n,k)=>n+Math.max(0,m[k]-bounds[k]),0)};
const visited=new Set();
for(let depth=1;depth<=2&&exceptionTrials<exceptionLimit;depth++){
 repairDepth=depth;const next=[];
 for(const f of beam){for(let from=0;from<vehicles;from++)for(const g of f.sets[from])for(let to=0;to<vehicles;to++){
  if(from===to||f.sets[from].length<=1||exceptionTrials>=exceptionLimit||f.moves.some(m=>m.np===assignmentKey(g[0])))continue;
  const sets=f.sets.map((gs,i)=>i===from?gs.filter(x=>x!==g):i===to?[...gs,g]:gs);
  const signature=sets.map(gs=>gs.map(g=>assignmentKey(g[0])).sort().join(',')).join('|');if(visited.has(signature))continue;visited.add(signature);exceptionTrials++;
  const routes=sets.map((gs,i)=>i===from||i===to?solve(gs,i):f.routes[i]);if(routes.some(r=>!r))continue;feasibleRepairs++;
  const moves=[...f.moves,{np:assignmentKey(g[0]),from,to}],meta={...f.original,exceptions:moves.length,moves,originalGroups:f.original.groups,groups:sets.map(gs=>gs.map(g=>assignmentKey(g[0])))};const p={routes,partition:meta};
  if(ok(p)&&(!repairBest||rank(p)+10*moves.length<rank(repairBest)+10*repairBest.partition.exceptions))repairBest=p;
  if(ok(p)&&(!operationalBest||operation(p)<operation(operationalBest)))operationalBest=p;
  next.push({sets,routes,original:f.original,owner:f.owner,moves,priority:rank(p)+10*moves.length+2*violation(p)});

 }}
 next.sort((a,b)=>a.priority-b.priority);beam=next.slice(0,30);
}
if(repairBest&&(!best||rank(repairBest)+10*repairBest.partition.exceptions<rank(best)))best=repairBest;

let chosen=operationalBest||best||bestUnbounded;
let fallback=false;
if(!chosen){chosen=optimize(stops,matrix,config);fallback=true;}
const before=metrics(chosen),edges=zoneEdges(stops,matrix);
// Same deterministic within-route polishing used by the reviewed prototype.
const sequenceCost=p=>{const m=metrics(p);return .015*m.km+.005*m.minutes;};
for(let pass=0;pass<30;pass++){
 let bestPlan=chosen,bestScore=sequenceCost(chosen);
 for(let v=0;v<chosen.routes.length;v++){
  const route=chosen.routes[v].route;
  for(let i=0;i<route.length;i++)for(let j=0;j<route.length;j++){
   if(i===j)continue;const items=[...route],item=items.splice(i,1)[0];items.splice(j,0,item);const candidate=evaluate(items,vehicleContext(ctx,v));if(!candidate)continue;
   const p={...chosen,routes:chosen.routes.map((x,k)=>k===v?candidate:x)};
   if(sequenceCost(p)<bestScore-1e-7&&(!ok(chosen)||ok(p))){bestPlan=p;bestScore=sequenceCost(p);}
  }
 }
 if(bestPlan===chosen)break;chosen=bestPlan;
}
// Re-evaluate both discharge opportunities and final consolidation.
for(let v=0;v<chosen.routes.length;v++){const r=improveDepot(chosen.routes[v].route,vehicleContext(ctx,v));if(r)chosen.routes[v]=r;}
while(chosen.routes.length<config.vehicles)chosen.routes.push(evaluate([],vehicleContext(ctx,chosen.routes.length)));
const unassigned=chosen.unassigned||[];const seen=new Set(),owners=new Map();
for(const [v,r] of chosen.routes.entries()){
 if(!evaluate(r.route,vehicleContext(ctx,v)))throw Error('Una ruta no respeta los horarios configurados.');
 for(const s of r.route.filter(s=>!s.depot)){if(seen.has(s.id)||(owners.has(assignmentKey(s))&&owners.get(assignmentKey(s))!==v))throw Error('No se pudo verificar la asignación por NP.');seen.add(s.id);owners.set(assignmentKey(s),v);}
}
for(const s of unassigned){if(seen.has(s.id)||owners.has(assignmentKey(s)))throw Error('Una NP quedó parcialmente asignada.');seen.add(s.id);}
if(!checkCenter(chosen.routes))throw Error('El Centro debe ser atendido por una sola camioneta.');
if(seen.size!==stops.length||stops.some(s=>!seen.has(s.id)))throw Error('Faltan movimientos en el resultado.');
return {...scorePlan(chosen.routes,unassigned,edges),roadCandidates:[],algorithm:'territories-4-improved',territory:territory(chosen),partition:chosen.partition,
 baseline:{km:before.km,assigned:before.assigned,zoneSplits:scorePlan(chosen.routes,unassigned,edges).zones.split},
 search:{iterations:partitionTrials,improvements:Math.max(0,Math.round((before.km-metrics(chosen).km)*100)/100),milliseconds:Date.now()-start,deterministic:true,partitionLimit,exceptionLimit,limited:true,partitionEnumerationComplete:!enumerationLimited&&partitionTrials===cuts.length,complete,exceptionTrials,fallback,optionalBreakSearch:!!config.twoTrips}};
}
