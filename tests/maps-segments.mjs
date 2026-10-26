import assert from 'node:assert/strict';
import {directMapLinks} from '../public/route-links.mjs';
import {visitPoints} from '../public/visit-utils.mjs';
const config={depotCoord:[-34.62,-58.48],returnHome:false};
for(const count of [0,1,10,11,20,21,35]){
 const r={timeline:Array.from({length:count},(_,i)=>({stop:{coord:[-34.5-i*.001,-58.4]}}))};
 const original=JSON.stringify(r),links=directMapLinks(r,config),joined=[];
 assert.equal(links.length,Math.ceil(count/10));
 for(const [i,l] of links.entries()){const u=new URL(l.url),parts=[u.searchParams.get('origin'),...(u.searchParams.get('waypoints')?.split('|')||[]),u.searchParams.get('destination')];assert(parts.length<=11);assert(l.url.length<=2048);if(i)assert.equal(parts[0],joined.at(-1));joined.push(...parts.slice(i?1:0));}
 if(count)assert.deepEqual(joined,visitPoints(r,config).map(p=>p.join(',')));
 assert.equal(JSON.stringify(r),original);
}
const r={timeline:[{stop:{coord:[-34.5,-58.4]}},{stop:{coord:config.depotCoord,depot:true}},{stop:{coord:[-34.6,-58.5]}},{stop:{coord:config.depotCoord,depot:true,finalUnload:true}}]};
assert.equal(directMapLinks(r,{...config,returnHome:true}).length,1);
assert.deepEqual(visitPoints(r,{...config,returnHome:true}),[config.depotCoord,[-34.5,-58.4],config.depotCoord,[-34.6,-58.5],config.depotCoord]);
console.log('PASS: complete coverage, continuity, 1/2/more links, depot stops, no route mutation.');
