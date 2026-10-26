import {googleAccess,apiFailure,ApiError} from '@/lib/google';
export const dynamic='force-dynamic';
// Only a Google basemap image leaves this endpoint. The server key never reaches HTML/JS.
export async function POST(request:Request){try{
 const key=await googleAccess(request,'fleet-map',30);
 const raw=await request.text();if(raw.length>1000)throw new ApiError('Mapa inválido.',400);
 const {center,zoom}=JSON.parse(raw);
 if(!Array.isArray(center)||center.length!==2||!center.every(Number.isFinite)||Math.abs(center[0])>85||Math.abs(center[1])>180||!Number.isInteger(zoom)||zoom<3||zoom>19)throw new ApiError('Vista de mapa inválida.',400);
 const url=new URL('https://maps.googleapis.com/maps/api/staticmap');
 for(const [k,v] of Object.entries({center:center.join(','),zoom:String(zoom),size:'640x480',scale:'2',maptype:'roadmap',language:'es',region:'ar',key}))url.searchParams.set(k,v);
 const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
 if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new ApiError(response.status===403?'Google rechazó el mapa: habilitá Maps Static API y permitila en la clave del proyecto. Revisá también la facturación y las restricciones de la clave.':'No se pudo cargar el mapa. Revisá la habilitación y cuota de Maps Static API.',502);
 return new Response(response.body,{headers:{'Content-Type':response.headers.get('content-type')!,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return apiFailure(e)}}
