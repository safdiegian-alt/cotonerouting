export const dynamic='force-dynamic';
export async function GET(request:Request){
 const owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return Response.json({error:'Iniciá sesión para usar el planificador.'},{status:401,headers:{'Cache-Control':'no-store'}});
 try {
  return Response.json({rows:[],example:false},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'No se pudo limpiar la jornada anterior. Recargá para reintentar; tus direcciones siguen guardadas.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
