import {database} from '@/db/raw';
export const dynamic='force-dynamic';
const reply=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return reply({error:'Iniciá sesión.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Origen no permitido.'},403);
 try{const raw=await request.text();if(raw.length>12000)return reply({error:'Datos demasiado extensos.'},413);const b=JSON.parse(raw);if(typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date)))return reply({error:'Fecha inválida.'},400);
 let key,data;
 if(b.action==='add'){
 const s=b.stop;if(!s||!['Entrega','Retiro'].includes(s.type)||['name','address','np','schedule'].some(k=>typeof s[k]!=='string'||!s[k].trim()||s[k].length>700)||typeof s.city!=='string'||s.city.length>300||!Number.isFinite(s.service)||s.service<1||s.service>180)return reply({error:'Completá nombre, dirección, NP y horario.'},400);
 key='manual:'+crypto.randomUUID();data={kind:'manual',stop:{type:s.type,name:s.name.trim(),address:s.address.trim(),city:s.city.trim(),np:s.np.trim().toUpperCase().replace(/\s+/g,' '),schedule:s.schedule.trim(),service:s.service}};
 }else if(b.action==='remove'){
 if(typeof b.key!=='string'||!b.key||b.key.length>2400)return reply({error:'Parada inválida.'},400);
 key='removed:'+b.key;data={kind:'removed',stopKey:b.key};
 }else return reply({error:'Acción inválida.'},400);
 await database().prepare('INSERT INTO daily_edits(owner,day,movement_key,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(owner,day,movement_key) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(owner,b.date,key,JSON.stringify(data),new Date().toISOString()).run();return reply({ok:true});
 }catch{return reply({error:'No se pudo guardar el cambio. Reintentá.'},503);}
}
