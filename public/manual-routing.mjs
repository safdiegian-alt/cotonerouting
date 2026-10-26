import {evaluate,vehicleContext,beamInsert,directPairs,zoneEdges,scorePlan,routeCost} from './optimizer.mjs?v=33';
import {prepareAssignments,assignmentGroups,assignmentKey,checkCenter} from './assignment-rules.mjs?v=33';
import {improveDepot} from './depot-planning.mjs?v=33';
function rebuild(items,ctx){
 let best=evaluate(items.filter(s=>!s.depot),ctx);const groups=assignmentGroups(items.filter(s=>!s.depot));
 for(let trial=0;trial<12;trial++){
  const pending=groups.map((g,i)=>({g,k:trial===0?Math.min(...g.flatMap(s=>s.windows.map(w=>w[1]))):trial===1?Math.min(...g.flatMap(s=>s.windows.map(w=>w[0]))):((i+1)*7919*(trial+1)%104729)})).sort((a,b)=>a.k-b.k);
  let candidate=evaluate([],ctx);for(const {g} of pending){candidate=beamInsert(candidate.route,g,ctx);if(!candidate)break;}
  if(candidate&&(!best||routeCost(candidate)<routeCost(best)))best=candidate;
 }
 return best?improveDepot(best.route,ctx):null;
}
export function moveToVehicle(plan,stopId,to){
 if(!plan.matrix)throw Error('Volvé a calcular las rutas antes de cambiar una camioneta.');
 if(!Number.isInteger(to)||to<0||to>=plan.routes.length)throw Error('Camioneta inválida.');
 const from=plan.routes.findIndex(r=>r.route.some(s=>!s.depot&&String(s.id)===String(stopId)));
 if(from<0)throw Error('La parada ya no está asignada.');if(from===to)return plan;
 const all=prepareAssignments([...plan.routes.flatMap(r=>r.route.filter(s=>!s.depot)),...plan.unassigned],plan.config),byId=new Map(all.map(s=>[s.id,s]));
 const stop=all.find(s=>String(s.id)===String(stopId));const key=assignmentKey(stop);
 const group=all.filter(s=>assignmentKey(s)===key);const groupIds=new Set(group.map(s=>s.id));
 if(group.some(s=>plan.unassigned.some(u=>u.id===s.id)))throw Error('Este grupo tiene movimientos pendientes. Resolvelos y recalculá antes de moverlo.');
 const pickups={};for(const s of all)if(s.type==='Retiro')(pickups[s.np]??=[]).push(s.id);
 const ctx={...plan.config,...plan.matrix,maxMapDestinations:0,pickups,directPairs:directPairs(all)};
 const raw=plan.routes.map(r=>r.route.filter(s=>!s.depot).map(s=>byId.get(s.id)));
 const routes=[...plan.routes];
 for(let v=0;v<raw.length;v++){
  const owns=raw[v].some(s=>groupIds.has(s.id));if(v!==to&&!owns)continue;
  const items=raw[v].filter(s=>!groupIds.has(s.id));if(v===to)items.push(...group);
  const rebuilt=rebuild(items,vehicleContext(ctx,v));
  if(!rebuilt)throw Error('No se encontró un orden válido en la camioneta '+(v+1)+'. Se revisaron horarios, retiros previos y regreso con descarga en Campana antes del fin de jornada. El cambio no se aplicó.');
  routes[v]=rebuilt;
 }
 if(!checkCenter(routes))throw Error('El Centro debe quedar a cargo de una sola camioneta durante toda la jornada.');
 const before=all.map(s=>s.id).sort((a,b)=>a-b),after=[...routes.flatMap(r=>r.route.filter(s=>!s.depot)),...plan.unassigned].map(s=>s.id).sort((a,b)=>a-b);
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('No se pudo verificar el cambio.');
 return {...plan,...scorePlan(routes,plan.unassigned,zoneEdges(all,plan.matrix)),partition:undefined,territory:undefined,roadCandidates:[],roadPaths:undefined,roads:undefined,manualChanges:(plan.manualChanges||0)+1,lastMovedCount:group.length};
}

export function reorderStop(plan,stopId,beforeId){
 if(!plan.matrix)throw Error('Volvé a calcular las rutas antes de reordenar.');
 const v=plan.routes.findIndex(r=>r.route.some(s=>!s.depot&&String(s.id)===String(stopId)));if(v<0)throw Error('La parada ya no está asignada.');
 const original=plan.routes[v].route.filter(s=>!s.depot),selected=original.find(s=>String(s.id)===String(stopId));
 if(String(stopId)===String(beforeId))return plan;
 const ordered=original.filter(s=>s!==selected);const index=beforeId==='__end__'?ordered.length:ordered.findIndex(s=>String(s.id)===String(beforeId));if(index<0)throw Error('Elegí una parada de la misma camioneta.');ordered.splice(index,0,selected);
 const all=[...plan.routes.flatMap(r=>r.route.filter(s=>!s.depot)),...plan.unassigned],pickups={};for(const s of all)if(s.type==='Retiro')(pickups[s.np]??=[]).push(s.id);
 const ctx=vehicleContext({...plan.config,...plan.matrix,maxMapDestinations:0,pickups,directPairs:directPairs(all)},v);
 const route=improveDepot(ordered,ctx);if(!route)throw Error('Ese orden no respeta los horarios, el retiro antes de la entrega o el fin de jornada. Se conserva el recorrido anterior.');
 const routes=plan.routes.map((r,i)=>i===v?route:r);
 return {...plan,...scorePlan(routes,plan.unassigned,zoneEdges(all,plan.matrix)),partition:undefined,territory:undefined,roadCandidates:[],roadPaths:undefined,roads:undefined,manualChanges:(plan.manualChanges||0)+1};
}
