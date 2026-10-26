import {prepareAssignments,assignmentGroups,assignmentKey} from './assignment-rules.mjs?v=33';
import {visitPoints} from './visit-utils.mjs?v=33';
export const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const minute=s=>{const [h,m]=s.split(':').map(Number);return h*60+(m||0)};
export const clock=n=>{const m=Math.ceil(n);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`};
export function windows(raw){
 const value=String(raw??'').trim(),s=norm(value);if(!s)return null;
 if(!/\d/.test(value)){if(/\bmanana\b/.test(s))return [[480,600]];return null}
 const tokens=[...value.replace(/(\d{1,2})[.,](\d{2})(?!\d)/g,'$1:$2').matchAll(/\d+(?::\d+)?/g)].map(x=>x[0]);
 if(tokens.some(t=>{const [h,m='0']=t.split(':');return +h>23||+m>59||h.length>2||m.length>2}))return null;
 const nums=tokens.map(minute);if(s.includes('partir')&&nums.length===1)return nums[0]<1200?[[nums[0],1200]]:null;
 if(nums.length===1&&/^(?:a\s+las?\s+)?\d{1,2}(?::\d{2}|[.,]\d{2})?\s*(?:h(?:s|oras?)?\.?)?$/i.test(value))return [[nums[0],nums[0]]];
 if(nums.length===2||nums.length===4){const a=[];for(let i=0;i<nums.length;i+=2){if(nums[i]>=nums[i+1])return null;a.push([nums[i],nums[i+1]])}return a}return null
}
export function parseCSV(text){text=text.replace(/^\uFEFF/,'');const sep=text.split(/\r?\n/)[0].includes(';')?';':',';let rows=[],row=[],v='',q=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){v+='"';i++}else q=!q}else if(c===sep&&!q){row.push(v);v=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(v);if(row.some(x=>x.trim()))rows.push(row);row=[];v=''}else v+=c}if(q)throw Error('El CSV tiene comillas sin cerrar.');if(v||row.length){row.push(v);rows.push(row)}const keys=rows.shift()?.map(x=>x.trim());if(!keys?.includes('Movimiento')||!keys.includes('Nota Pedido'))throw Error('El CSV debe incluir Movimiento y Nota Pedido.');return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]||''])))}
export const isInterior=row=>norm(addressField(row,'Movimiento')).split(' ').includes('interior');
export const isMoveRow=row=>/^mover(?: |$)/.test(norm(addressField(row,'Movimiento')));
export const isPickupRow=row=>/^(?:retiros?|retira(?:r)?)(?: |$)/.test(norm(addressField(row,'Movimiento')));
export function vehicleContext(ctx,v){const h=ctx.vehicleHours?.[v]||ctx;if(!Number.isFinite(h.start)||!Number.isFinite(h.end)||h.start<0||h.end>=1440||h.start>=h.end)throw Error('Revisá el horario de la camioneta '+(v+1));return {...ctx,start:h.start,end:h.end,availabilityStart:h.start};}
function addressField(row,...names){for(const name of names){const key=Object.keys(row).find(k=>norm(k)===norm(name));if(key!==undefined)return String(row[key]??'').trim();}return ''; }
export function importRows(rows){rows=rows.filter(r=>!isInterior(r)&&!isMoveRow(r));let result=[];for(let i=0;i<rows.length;i++){const r=rows[i],pick=isPickupRow(r),np=(r['Tipo NP']||'NP')+' '+r['Nota Pedido'];const address=addressField(r,pick?'Origen':'Domicilio Entrega'),city=pick?addressField(r,'Localidad','Localdad'):addressField(r,'Localidad Entrega');const name=addressField(r,pick?'Proveedor':'Cliente')||'Sin nombre';const legacyKey=[np,pick,address?norm(address):'missing-'+norm(name),norm(city),norm(r.Horario)].join('|');const key=pick?legacyKey+'|proveedor:'+norm(name):legacyKey;let old=result.find(x=>x.key===key);if(old){old.lines.push(r);continue}result.push({id:result.length+1,key,legacyKey,np,type:pick?'Retiro':r.Movimiento||'Entrega',address,city,name,schedule:r.Horario||'',windows:windows(r.Horario),service:15,coord:null,confirmed:false,lines:[r],note:String(r.NotaEntrega||'')})}return result}
function same(a,b){return a&&b&&!a.depot&&!b.depot&&Math.abs(a.coord[0]-b.coord[0])<0.0001&&Math.abs(a.coord[1]-b.coord[1])<0.0001}
function samePickupVisit(a,b){return a&&b&&!a.depot&&!b.depot&&a.type==='Retiro'&&b.type==='Retiro'&&norm(a.address)===norm(b.address)&&Math.abs(a.coord[0]-b.coord[0])<.000001&&Math.abs(a.coord[1]-b.coord[1])<.000001;}
function commonStarts(items,duration){let slots=[[-Infinity,Infinity]];for(const s of items){const next=[];for(const a of slots)for(const [lo,hi] of s.windows){const left=Math.max(a[0],lo),right=Math.min(a[1],lo===hi?hi:hi-duration);if(left<=right+.00001)next.push([left,right]);}slots=next;}return slots.sort((a,b)=>a[0]-b[0]);}
function evaluateAt(route,ctx){let time=ctx.start,dist=0,wait=0,prev=0,timeline=[],visits=[];
 for(const pair of ctx.directPairs||[]){const a=route.findIndex(s=>s.id===pair.from),b=route.findIndex(s=>pair.to.includes(s.id));if(a>=0&&b>=0){if(b<=a)return null;const next=route.slice(a+1).find(s=>!same(s,route[a]));if(!next||!pair.to.includes(next.id))return null;}}
 const seen=new Set();for(let k=0;k<route.length;){const s=route[k];if(s.depot){k++;if(!route.slice(0,k-1).some(x=>!x.depot)||!route.slice(k).some(x=>!x.depot))continue;const dt=ctx.durations[prev]?.[0],dd=ctx.distances[prev]?.[0];if(dt==null||dd==null)return null;const arrive=time+dt/60;time=arrive+ctx.breakMinutes;dist+=dd/1000;const entry={stop:s,arrive,begin:arrive,end:time,wait:0,legKm:dd/1000,visitId:visits.length};timeline.push(entry);visits.push({...entry,idx:0,lastIdx:0,service:ctx.breakMinutes,startWindows:[[-Infinity,Infinity]]});prev=0;continue;}
 const dt=ctx.durations[prev]?.[s.idx],dd=ctx.distances[prev]?.[s.idx];if(dt==null||dd==null)return null;const arrive=time+dt/60;
 let items=[s],duration=s.service,slots=commonStarts(items,duration);let begin=slots.map(([lo,hi])=>Math.max(arrive,lo)<=hi+.00001?Math.max(arrive,lo):Infinity).reduce((a,b)=>Math.min(a,b),Infinity);if(!Number.isFinite(begin))return null;
 for(let j=k+1;j<route.length&&samePickupVisit(s,route[j]);j++){const candidate=[...items,route[j]],service=Math.max(...candidate.map(x=>x.service)),windows=commonStarts(candidate,service);const at=windows.map(([lo,hi])=>Math.max(arrive,lo)<=hi+.00001?Math.max(arrive,lo):Infinity).reduce((a,b)=>Math.min(a,b),Infinity);if(!Number.isFinite(at))break;items=candidate;duration=service;slots=windows;begin=at;}
 for(const item of items){if(item.type!=='Retiro'&&ctx.pickups[item.np]?.some(id=>!seen.has(id)))return null;seen.add(item.id);}
 time=begin+duration;dist+=dd/1000;wait+=begin-arrive;const visitId=visits.length;items.forEach((item,i)=>timeline.push({stop:item,arrive,begin,end:time,wait:i?0:begin-arrive,legKm:i?0:dd/1000,visitId,sharedVisit:items.length>1,visitMovements:items.length}));visits.push({stop:s,idx:s.idx,lastIdx:items.at(-1).idx,arrive,begin,end:time,service:duration,startWindows:slots});prev=items.at(-1).idx;k+=items.length;
 }
 const lastDepot=timeline.findLastIndex(t=>t.stop.depot);const unload=timeline.slice(lastDepot+1).some(t=>t.stop.depotBound);if(unload&&timeline.length){const dt=ctx.durations[prev]?.[0],dd=ctx.distances[prev]?.[0];if(dt==null||dd==null)return null;const arrive=time+dt/60;time=arrive+(ctx.breakMinutes??15);dist+=dd/1000;const stop={depot:true,finalUnload:true,id:'final-depot',idx:0,coord:ctx.depotCoord,address:ctx.depotAddress,type:'Descarga final',note:'Consolidación de retiros en Campana'};const entry={stop,arrive,begin:arrive,end:time,wait:0,legKm:dd/1000,visitId:visits.length};timeline.push(entry);visits.push({...entry,idx:0,lastIdx:0,service:ctx.breakMinutes??15,startWindows:[[-Infinity,Infinity]]});prev=0;}
 if(ctx.returnHome&&timeline.length&&prev!==0){if(ctx.durations[prev]?.[0]==null||ctx.distances[prev]?.[0]==null)return null;time+=ctx.durations[prev][0]/60;dist+=ctx.distances[prev][0]/1000;}if(time>ctx.end)return null;const result={route,timeline,visits,dist,wait,end:time,start:ctx.start,availableStart:ctx.availabilityStart??ctx.start,availableEnd:ctx.end};if(ctx.maxMapDestinations&&visitPoints(result,ctx).length-1>ctx.maxMapDestinations)return null;return result;
}
export function evaluate(route,ctx){const early=evaluateAt(route,ctx);if(!early||!ctx.flexibleStart||!early.visits.length)return early;
 let latest=early.visits.at(-1).begin;
 for(let i=early.visits.length-1;i>=0;i--){const v=early.visits[i];if(i<early.visits.length-1){const next=early.visits[i+1];latest-=ctx.durations[v.lastIdx][next.idx]/60+v.service;}let allowed=-Infinity;for(const [lo,hi] of v.startWindows){const candidate=Math.min(latest,hi);if(candidate>=lo-.00001)allowed=Math.max(allowed,candidate);}if(!Number.isFinite(allowed))return early;latest=allowed;}
 const departure=Math.max(ctx.start,latest-ctx.durations[0][early.visits[0].idx]/60);if(departure<=ctx.start+.01)return early;const delayed=evaluateAt(route,{...ctx,start:departure});return delayed&&delayed.end<=early.end+.01?delayed:early;
}
export function workload(routes){const counts=routes.map(r=>r.timeline.filter(t=>!t.stop.depot).length),loads=routes.map(r=>r.timeline.length?r.end-r.start:0);const mean=loads.reduce((a,b)=>a+b,0)/Math.max(1,loads.length),averageCount=counts.reduce((a,b)=>a+b,0)/Math.max(1,counts.length);const wait=routes.reduce((a,r)=>a+r.wait,0),excess=routes.reduce((a,r)=>a+r.timeline.reduce((b,t)=>b+Math.max(0,t.wait-30),0),0);return {counts,loads,wait,excess,maxLoad:Math.max(0,...loads),countSpread:Math.max(0,...counts)-Math.min(...counts,Infinity),loadPenalty:loads.reduce((a,n)=>a+(n-mean)**2/Math.max(30,mean),0),countPenalty:counts.reduce((a,n)=>a+(n-averageCount)**2/Math.max(1,averageCount),0)};}
export function routeCost(r){return r.dist*.5+(r.end-r.start)+r.wait+4*r.timeline.reduce((a,t)=>a+Math.max(0,t.wait-30),0);}
export function operationalCost(routes){const w=workload(routes);const mean=w.loads.reduce((a,b)=>a+b,0)/Math.max(1,w.loads.length);const overload=w.loads.reduce((a,n)=>a+Math.max(0,n-Math.max(240,mean*1.5)),0);return routes.reduce((a,r)=>a+routeCost(r),0)+.6*w.maxLoad+.75*overload;}
export function beamInsert(base,group,ctx){let states=[{route:base,remaining:group}];for(let n=0;n<group.length;n++){let next=[];for(const st of states){for(const s of st.remaining){if(s.type!=='Retiro'&&st.remaining.some(x=>x.np===s.np&&x.type==='Retiro'))continue;for(let p=0;p<=st.route.length;p++){const r=[...st.route.slice(0,p),s,...st.route.slice(p)];let ev=evaluate(r,ctx);if(!ev)continue;next.push({route:r,remaining:st.remaining.filter(x=>x.id!==s.id),ev,score:routeCost(ev)})}}}next.sort((a,b)=>a.score-b.score);states=next.slice(0,8);if(!states.length)return null}return states[0].ev}
// Nearby stops use road distance, not spelling of a locality. Each stop contributes
// at most three neighbors so dense areas do not dominate quadratically.
export function zoneEdges(stops,matrix){
 const edges=new Map();
 for(const a of stops){const near=stops.filter(b=>b.id!==a.id&&b.np!==a.np).map(b=>({b,d:Math.max(matrix.distances[a.idx]?.[b.idx]??Infinity,matrix.distances[b.idx]?.[a.idx]??Infinity)/1000})).filter(x=>x.d<=4).sort((a,b)=>a.d-b.d).slice(0,3);
 for(const {b,d} of near){const key=[a.id,b.id].sort((a,b)=>a-b).join(':');edges.set(key,{a:a.id,b:b.id,weight:Math.max(0,4-d)});}}
 return [...edges.values()];
}
export function zoneMetrics(routes,edges){const owners=new Map();routes.forEach((r,v)=>r.route.forEach(s=>{if(!s.depot)owners.set(s.id,v)}));let split=0,penalty=0;for(const e of edges)if(owners.has(e.a)&&owners.has(e.b)&&owners.get(e.a)!==owners.get(e.b)){split++;penalty+=e.weight}return {split,penalty};}
export function directPairs(stops){const pairs=[];for(const s of stops){if(!/\bdirecto\b/.test(norm(s.note)))continue;const destinations=stops.filter(t=>t.np===s.np&&t.id!==s.id&&t.type==='Retiro'&&!same(s,t));if(destinations.length&&destinations.every(t=>same(t,destinations[0])))pairs.push({from:s.id,to:destinations.map(t=>t.id)});}return pairs;}
export function optimize(stops,matrix,config){stops=prepareAssignments(stops,config);const started=Date.now();const pickups={};for(const s of stops)if(s.type==='Retiro')(pickups[s.np]??=[]).push(s.id);const ctx={...config,...matrix,pickups,directPairs:directPairs(stops)};const groups=assignmentGroups(stops);const edges=zoneEdges(stops,matrix);const roadOptions=[];let best=null;let seed=197;function rand(){seed=(seed*16807)%2147483647;return seed/2147483647}for(let trial=0;trial<18;trial++){const weighted=groups.map(g=>({g,w:trial===0?Math.min(...g.flatMap(s=>s.windows.map(w=>w[1]))):rand()*1200})).sort((a,b)=>a.w-b.w);let routes=Array.from({length:config.vehicles},(_,v)=>evaluate(config.twoTrips?[{depot:true,id:'depot',coord:config.depotCoord,type:'Descanso',address:config.depotAddress}]:[],vehicleContext(ctx,v))),unassigned=[];for(const {g} of weighted){let choice=null;for(let v=0;v<routes.length;v++){let ev=beamInsert(routes[v].route,g,vehicleContext(ctx,v));if(!ev)continue;let score=scored(routes.map((r,i)=>i===v?ev:r),[]).score-scored(routes,[]).score;if(!choice||score<choice.score)choice={v,ev,score}}if(choice)routes[choice.v]=choice.ev;else unassigned.push(...g)}const candidate=scored(routes,unassigned);roadOptions.push(candidate);if(!best||candidate.score<best.score)best=candidate}

const baseline={km:best.routes.reduce((a,r)=>a+r.dist,0),assigned:stops.length-best.unassigned.length,workload:workload(best.routes),zoneSplits:best.zones.split};
function scored(routes,unassigned){return scorePlan(routes,unassigned,edges)}
let current=best,iterations=0,improvements=0;const groupsByNP=new Map(groups.map(g=>[assignmentKey(g[0]),g]));
for(let iter=0;iter<5000;iter++){
iterations++;
const assignedGroups=groups.filter(g=>current.routes.some(r=>r.route.some(s=>assignmentKey(s)===assignmentKey(g[0]))));
if(!assignedGroups.length)break;
const anchor=assignedGroups[Math.floor(rand()*assignedGroups.length)];
const removal=assignedGroups.map(g=>({g,w:iter%2===0?(matrix.distances[anchor[0].idx][g[0].idx]??1e9)*(0.6+rand()):rand()})).sort((a,b)=>a.w-b.w).slice(0,Math.min(assignedGroups.length,1+Math.floor(rand()*5))).map(x=>x.g);
const removed=new Set(removal.map(g=>assignmentKey(g[0])));
let routes=current.routes.map((r,v)=>evaluate(r.route.filter(s=>s.depot||!removed.has(assignmentKey(s))),vehicleContext(ctx,v)));
if(routes.some(r=>!r))continue;
let pending=[...new Set([...current.unassigned.map(s=>assignmentKey(s)),...removed])].map(np=>groupsByNP.get(np));
pending=pending.map(g=>({g,w:iter%3===0?Math.min(...g.flatMap(s=>s.windows.map(w=>w[1]))):rand()*1400})).sort((a,b)=>a.w-b.w).map(x=>x.g);
let unassigned=[];
for(const g of pending){let choice=null;for(let v=0;v<routes.length;v++){const ev=beamInsert(routes[v].route,g,vehicleContext(ctx,v));if(!ev)continue;const test=routes.map((r,i)=>i===v?ev:r);const cost=scored(test,[]).score;if(!choice||cost<choice.cost)choice={v,ev,cost}}if(choice)routes[choice.v]=choice.ev;else unassigned.push(...g)}
// Reverse a route segment only when precedence and all windows still hold.
for(let v=0;v<routes.length;v++){const r=routes[v];if(r.route.length<3)continue;const i=Math.floor(rand()*(r.route.length-1)),j=i+1+Math.floor(rand()*(r.route.length-i-1));const ev=evaluate([...r.route.slice(0,i),...r.route.slice(i,j+1).reverse(),...r.route.slice(j+1)],vehicleContext(ctx,v));if(ev&&routeCost(ev)<routeCost(r))routes[v]=ev}
const candidate=scored(routes,unassigned),temperature=2*(1-iter/5000);
if(candidate.score<best.score-1e-7){best=candidate;improvements++}
if(candidate.score<=current.score||rand()<Math.exp((current.score-candidate.score)/Math.max(.05,temperature)))current=candidate;
}
// Deterministic cross-vehicle relocation and swap of whole NPs. Hard constraints
// are re-evaluated on both routes before any improvement can be accepted.
let polishing=true,passes=0;
while(polishing&&passes++<4){polishing=false;
 for(const g of groups){const from=best.routes.findIndex(r=>r.route.some(s=>assignmentKey(s)===assignmentKey(g[0])));if(from<0)continue;
 for(let to=0;to<best.routes.length;to++){if(to===from)continue;
 const source=evaluate(best.routes[from].route.filter(s=>s.depot||assignmentKey(s)!==assignmentKey(g[0])),vehicleContext(ctx,from)),dest=beamInsert(best.routes[to].route,g,vehicleContext(ctx,to));
 if(source&&dest){const candidate=scored(best.routes.map((r,v)=>v===from?source:v===to?dest:r),best.unassigned);if(candidate.score<best.score-1e-7){best=candidate;improvements++;polishing=true;break;}}
 const other=groups.filter(h=>best.routes[to].route.some(s=>assignmentKey(s)===assignmentKey(h[0])));
 for(const h of other){const a=beamInsert(best.routes[from].route.filter(s=>s.depot||assignmentKey(s)!==assignmentKey(g[0])),h,vehicleContext(ctx,from)),b=beamInsert(best.routes[to].route.filter(s=>s.depot||assignmentKey(s)!==assignmentKey(h[0])),g,vehicleContext(ctx,to));if(!a||!b)continue;const candidate=scored(best.routes.map((r,v)=>v===from?a:v===to?b:r),best.unassigned);if(candidate.score<best.score-1e-7){best=candidate;improvements++;polishing=true;break;}}
 if(polishing)break;
 }
 }
}
// Audit the complete result independently of the insertion decisions.
const seen=new Set(),owners=new Map();for(let v=0;v<best.routes.length;v++){const verified=evaluate(best.routes[v].route,vehicleContext(ctx,v));if(!verified)throw Error('La verificación final detectó una ruta que incumple las restricciones.');for(const s of verified.route){if(s.depot)continue;if(seen.has(s.id))throw Error('Movimiento duplicado en el plan.');seen.add(s.id);if(owners.has(assignmentKey(s))&&owners.get(assignmentKey(s))!==v)throw Error('Una NP quedó dividida entre camionetas.');owners.set(assignmentKey(s),v)}}for(const s of best.unassigned){if(seen.has(s.id))throw Error('Movimiento asignado y pendiente al mismo tiempo.');seen.add(s.id)}if(seen.size!==stops.length)throw Error('Faltan movimientos en el resultado.');for(const g of groups){const assigned=g.filter(s=>owners.has(assignmentKey(s)));if(assigned.length&&best.unassigned.some(s=>assignmentKey(s)===assignmentKey(g[0])))throw Error('Una NP quedó parcialmente pendiente.');}
const signature=p=>JSON.stringify(p.routes.map(r=>r.route.map(s=>s.id)));const alternate=roadOptions.filter(p=>p.unassigned.length===best.unassigned.length&&signature(p)!==signature(best)).sort((a,b)=>a.score-b.score)[0];return {...best,roadCandidates:alternate?[alternate]:[],baseline,search:{iterations,improvements,milliseconds:Date.now()-started}}}


export function scorePlan(routes,unassigned,edges){let overlaps=0;for(let v=0;v<routes.length;v++)for(let j=v+1;j<routes.length;j++)for(const s of routes[v].route)if(routes[j].route.some(t=>same(s,t)))overlaps++;const zones=zoneMetrics(routes,edges);return {routes,unassigned,overlaps,zones,score:unassigned.length*100000+operationalCost(routes)+overlaps*8+zones.penalty*1.5}}
