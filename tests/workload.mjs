import assert from 'node:assert/strict';
import {evaluate,optimize,operationalCost,workload} from '../public/optimizer.mjs';
import {chooseRoadPlan} from '../public/shared-roads.mjs';
const config={vehicles:4,start:540,end:1200,flexibleStart:true,twoTrips:false,returnHome:false,breakMinutes:30,depotCoord:[-34.6,-58.4],depotAddress:'Campana'};
const stop=(i)=>({id:i,idx:i,np:'NP'+i,type:'Entrega',coord:[-34.6+i*.0001,-58.4],windows:[[540,1200]],service:15,address:'Destino '+i});
const matrix={durations:Array.from({length:37},(_,i)=>Array.from({length:37},(_,j)=>i===j?0:120)),distances:Array.from({length:37},(_,i)=>Array.from({length:37},(_,j)=>i===j?0:500))};
const ctx={...config,...matrix,pickups:{}};
const afternoon={...stop(1),windows:[[832,1000]]};const fixed=evaluate([afternoon],{...ctx,flexibleStart:false});assert.equal(fixed.wait,290);const flexible=evaluate([afternoon],ctx);assert.equal(flexible.wait,0);assert.equal(flexible.start,830);assert.equal(flexible.end,fixed.end);
// Preserve a fixed early appointment even when a later delivery has a long wait.
const pickup={...stop(1),np:'linked',type:'Retiro',windows:[[542,542]]},delivery={...stop(2),np:'linked',windows:[[850,1000]]};const linked=evaluate([pickup,delivery],{...ctx,pickups:{linked:[1]}});assert.equal(linked.start,540);assert.equal(linked.timeline[0].begin,542);assert(linked.wait>280);
// Delaying departure can absorb slack spread across multiple appointments.
const a={...stop(1),windows:[[540,1000]]},b={...stop(2),windows:[[900,1000]]};const absorbed=evaluate([a,b],ctx);assert.equal(absorbed.wait,0);assert.equal(absorbed.timeline[1].begin,900);
console.log('PASS: espera inicial de 290 min eliminada con salida explícita más tarde; citas y esperas inevitables preservadas.');
const stops=Array.from({length:36},(_,i)=>stop(i+1));const oldCounts=[2,4,13,17];let offset=0;const oldRoutes=oldCounts.map(n=>{const r=evaluate(stops.slice(offset,offset+n),ctx);offset+=n;return r});
const result=optimize(stops,matrix,config),w=workload(result.routes);assert.equal(result.unassigned.length,0);assert(w.maxLoad<360,`No concentrar más de 6 horas si hay vehículos libres en este caso homogéneo: ${w.loads}`);assert.equal(w.wait,0);
console.log('PASS: 36 movimientos comparables, distribución anterior 2/4/13/17 -> '+w.counts.join('/')+'; sin esperas ni movimientos omitidos.');
const bad={routes:oldRoutes,unassigned:[]},good={routes:result.routes,unassigned:[]};bad.routes=bad.routes.map((r,i)=>i? r:{...r,wait:r.wait+290,timeline:[...r.timeline,{stop:{depot:true},wait:290}]});const chosen=chooseRoadPlan([{plan:bad,cost:0},{plan:good,cost:10000}],good);assert.equal(chosen.plan,good);
console.log('PASS: calles compartidas no pueden recuperar una alternativa con 290 minutos adicionales de espera.');
