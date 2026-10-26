import assert from 'node:assert/strict';
import fs from 'node:fs';
import {optimizeTerritories} from '../public/territory-optimizer.mjs';
import {moveToVehicle} from '../public/manual-routing.mjs';
const depot=[-34.62,-58.48];const stops=Array.from({length:6},(_,i)=>({id:i+1,idx:i+1,np:'NP '+Math.floor(i/2),type:i%2?'Entrega':'Retiro',coord:[depot[0]+.01*Math.cos(i),depot[1]+.01*Math.sin(i)],address:'Calle '+i,windows:[[480,1080]],service:15,lines:[],note:''}));const matrix={durations:Array.from({length:7},(_,i)=>Array.from({length:7},(_,j)=>i===j?0:300)),distances:Array.from({length:7},(_,i)=>Array.from({length:7},(_,j)=>i===j?0:1000))};
for(const flexibleStart of [true,false])for(const vehicles of [1,3,4]){
 const config={vehicles,start:480,end:1080,flexibleStart,returnHome:true,twoTrips:true,breakMinutes:60,depotCoord:depot,depotAddress:'Base',maxMapDestinations:1};
 const p=optimizeTerritories(stops,matrix,config,{budgetMs:1500});assert.equal(p.unassigned.length,0);assert.equal(p.routes.length,vehicles);assert.equal(p.routes.reduce((n,r)=>n+r.timeline.filter(t=>!t.stop.depot).length,0),6);for(const r of p.routes){if(!flexibleStart)assert.equal(r.start,480);assert.ok(r.end<=1080);for(const t of r.timeline)assert.ok(t.begin>=480&&t.end<=1080);}
 if(vehicles>1){const from=p.routes.findIndex(r=>r.timeline.length),id=p.routes[from].timeline[0].stop.id;const moved=moveToVehicle({...p,config,matrix},id,(from+1)%vehicles);assert.equal(moved.manualChanges,1);assert.equal(moved.roadPaths,undefined);assert.equal(moved.partition,undefined);}
}
const html=fs.readFileSync(new URL('../public/planner.html',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../public/app.mjs',import.meta.url),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1])||['export','fleetMap'].includes(m[1]),m[1]);for(const id of ['bookSearch','addContact','bookRows'])assert.ok(ids.includes(id));assert.ok(app.includes('data-delete-contact'));assert.ok(app.includes('data-move-stop'));assert.ok(app.includes('maxMapDestinations:0'));
console.log('PASS: territory routing 1/3/4 vehicles, fixed/flexible departure, whole NP manual moves, Maps independence, restored agenda controls.');
