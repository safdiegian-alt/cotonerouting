import boundaries from './center-boundaries.mjs?v=33';
const normal=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function ringContains([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if(Math.abs((x-a)*(d-b)-(y-b)*(c-a))<1e-10&&x>=Math.min(a,c)&&x<=Math.max(a,c)&&y>=Math.min(b,d)&&y<=Math.max(b,d))return true;if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
export function isCenterStop(s){if(typeof s.centerOnly==='boolean')return s.centerOnly;if(!s.coord)return false;const [lat,lon]=s.coord,p=[lon,lat];if(boundaries.some(b=>b.geometry.coordinates.some(poly=>ringContains(p,poly[0])&&!poly.slice(1).some(h=>ringContains(p,h)))))return true;
 // Congreso is not an official barrio: explicit operational perimeter around the square.
 return lon>=-58.400&&lon<=-58.390&&lat>=-34.614&&lat<=-34.605;
}
export const assignmentKey=s=>s.assignmentKey??s.np;
export function prepareAssignments(stops,{exclusiveCenter=true}={}){
 const delivered=new Set(stops.filter(s=>s.type!=='Retiro').map(s=>s.np));
 const direct=new Set(stops.filter(s=>/\bdirecto\b/.test(normal(s.note))).map(s=>s.np));
 const items=stops.map(s=>({...s,depotBound:s.type==='Retiro'&&!delivered.has(s.np),assignmentKey:delivered.has(s.np)||direct.has(s.np)?'np:'+s.np:'pickup:'+s.id,centerOnly:isCenterStop(s)}));
 const centralKeys=new Set(items.filter(s=>s.centerOnly).map(assignmentKey));
 if(exclusiveCenter)for(const s of items)if(centralKeys.has(s.assignmentKey))s.assignmentKey='exclusive:center';
 return items;
}
export function assignmentGroups(stops){return Object.values(stops.reduce((a,s)=>((a[assignmentKey(s)]??=[]).push(s),a),{}));}
export function checkCenter(routes){return routes.filter(r=>r.route.some(s=>!s.depot&&isCenterStop(s))).length<=1;}
