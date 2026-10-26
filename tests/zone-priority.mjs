import assert from 'node:assert/strict';
import {optimize} from '../public/optimizer.mjs';
const positions=[0,10,10.1,10.2,10.3,10.4,10.5,-10,-10.1];
const matrix={durations:positions.map(a=>positions.map(b=>Math.abs(a-b)*120)),distances:positions.map(a=>positions.map(b=>Math.abs(a-b)*1000))};
const stops=positions.slice(1).map((p,i)=>({id:i+1,idx:i+1,np:'NP'+i,type:'Entrega',coord:[-34.6,-58.4+p/100],windows:[[480,600]],service:10,address:'Parada '+i}));
const r=optimize(stops,matrix,{vehicles:2,start:480,end:600,flexibleStart:true,twoTrips:false,returnHome:false,breakMinutes:30,depotCoord:[-34.6,-58.4],depotAddress:'Campana'});
assert.equal(r.unassigned.length,0);assert.deepEqual(r.routes.map(r=>r.timeline.length).sort((a,b)=>a-b),[2,6]);assert.equal(r.zones.split,0);
console.log('PASS: 6 movimientos en Norte y 2 en Sur se mantienen 6/2; no se divide Norte para igualar cantidades.');
