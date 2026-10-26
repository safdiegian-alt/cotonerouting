import {visitPoints} from './visit-utils.mjs?v=33';
export function itinerary(route,config){const stops=route.timeline.map(t=>({address:t.stop.address,city:t.stop.city||'',coord:t.stop.coord,np:t.stop.np||'',type:t.stop.depot?'Descanso en Campana':t.stop.type,begin:t.begin,end:t.end}));if(config.returnHome&&stops.length&&!route.timeline.at(-1).stop.finalUnload)stops.push({address:config.depotAddress,coord:config.depotCoord,type:'Regreso final a Campana',begin:route.end,end:route.end});return {start:config.depotCoord,departure:route.start??config.start,stops};}
export function mapsURL(points,maxIntermediates=3){if(points.length<2||points.length>maxIntermediates+2)throw Error('El enlace móvil admite hasta 3 paradas intermedias.');const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('travelmode','driving');u.searchParams.set('origin',points[0].join(','));u.searchParams.set('destination',points.at(-1).join(','));if(points.length>2)u.searchParams.set('waypoints',points.slice(1,-1).map(p=>p.join(',')).join('|'));if(u.href.length>2048)throw Error('El enlace excede el límite de Google Maps.');return u.href;}
export function routeLink(route,config,base){const data=itinerary(route,config);const u=new URL('/route.html',base);u.hash=encodeURIComponent(JSON.stringify(data));return {label:'Abrir recorrido completo',url:u.href};}

export function directMapLink(route,config){const points=visitPoints(route,config);return points.length>=2&&points.length<=11?{label:'Recorrido completo en Google Maps',url:mapsURL(points,9)}:null;}

// Presentation-only splitting: overlapping endpoints preserve every leg in order.
export function directMapLinks(route,config){
 const points=visitPoints(route,config),parts=[];
 for(let start=0;start<points.length-1;start+=10)parts.push(points.slice(start,start+11));
 return parts.map((part,i)=>({label:parts.length===1?'Recorrido completo en Google Maps':`Google Maps · Tramo ${i+1} de ${parts.length}`,url:mapsURL(part,9)}));
}
