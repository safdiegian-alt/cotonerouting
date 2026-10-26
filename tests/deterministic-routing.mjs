import assert from 'node:assert/strict';
import {optimizeTerritories} from '../public/territory-optimizer.mjs';
const stops=Array.from({length:6},(_,i)=>({id:i+1,idx:i+1,np:'NP '+Math.floor(i/2),type:i%2?'Entrega':'Retiro',centerOnly:false,coord:[-34.62+i*.005,-58.48+i*.002],address:'Calle '+i,windows:[[480,1100]],service:15,note:''}));
const matrix={durations:Array.from({length:7},(_,i)=>Array.from({length:7},(_,j)=>Math.abs(i-j)*60)),distances:Array.from({length:7},(_,i)=>Array.from({length:7},(_,j)=>Math.abs(i-j)*400))};
const base={start:480,end:1200,breakMinutes:15,returnHome:true,twoTrips:true,flexibleStart:true,depotCoord:[-34.62,-58.48],depotAddress:'Campana'};
const signature=p=>JSON.stringify({routes:p.routes,unassigned:p.unassigned,score:p.score,iterations:p.search.iterations});
const realNow=Date.now;
try{for(const vehicles of [2,4]){let clock=0;Date.now=()=>++clock;const a=optimizeTerritories(stops,matrix,{...base,vehicles},{budgetMs:1});clock=0;Date.now=()=>clock+=100000;const b=optimizeTerritories(stops,matrix,{...base,vehicles},{budgetMs:65000});assert.equal(signature(a),signature(b));}}finally{Date.now=realNow;}
console.log('PASS: identical routes and timings with fast/slow clocks; territory and fallback searches ignore elapsed-time budgets.');

// A complete feasible territory must not be discarded just for exceeding soft workload targets.
const longDay=stops.slice(0,2).map((s,i)=>({...s,windows:[[i?1000:485,i?1000:485]]}));
const result=optimizeTerritories(longDay,matrix,{...base,vehicles:1,flexibleStart:false});
assert.equal(result.unassigned.length,0);assert.equal(result.search.fallback,false);
console.log('PASS: feasible territorial plan retained when soft workload targets cannot be met.');
