export function territoryMetric(stops,matrix){
const data={stops,matrix};
const siteKey=s=>s.coord.map(x=>x.toFixed(5)).join(',');
const sites=[...new Map(data.stops.map(s=>[siteKey(s),s])).values()];
const distance=(a,b)=>(data.matrix.distances[a.idx][b.idx]+data.matrix.distances[b.idx][a.idx])/2000;
const links=new Map();
for(const s of sites)for(const t of sites.filter(t=>t!==s).sort((a,b)=>distance(s,a)-distance(s,b)).slice(0,3)){
 const key=[siteKey(s),siteKey(t)].sort().join('|');links.set(key,{a:siteKey(s),b:siteKey(t),weight:Math.exp(-distance(s,t)/3.5)});
}
return function territory(p){let dispersion=0,owners=new Map(),shared=0;const medoids=[];
 for(const [v,r] of p.routes.entries()){
  const ss=[...new Map(r.route.filter(s=>!s.depot).map(s=>[siteKey(s),s])).values()];
  let center=null,value=Infinity;for(const a of ss){const val=ss.reduce((n,b)=>n+distance(a,b),0);if(val<value){center=a;value=val;}}
  if(center)dispersion+=value;medoids.push(center?.id??null);
  for(const s of ss){let os=owners.get(siteKey(s))??new Set();os.add(v);owners.set(siteKey(s),os);}
 }
 let cuts=0;for(const e of links.values()){const a=owners.get(e.a),b=owners.get(e.b);if(a&&b&&![...a].some(v=>b.has(v)))cuts+=e.weight;}
 for(const os of owners.values())shared+=os.size-1;
 return {dispersion,neighborCuts:cuts,sharedSites:shared,score:dispersion+30*cuts+10*shared,medoids};
}

}
