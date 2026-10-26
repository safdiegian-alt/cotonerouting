import assert from 'node:assert/strict';
import {importRows,directPairs,vehicleContext,evaluate} from '../public/optimizer.mjs';
import {optimizeTerritories} from '../public/territory-optimizer.mjs';
import {moveToVehicle} from '../public/manual-routing.mjs';
const row={Movimiento:'RETIRA',Proveedor:'Proveedor correcto',Cliente:'Cliente distinto','Nota Pedido':'10',Origen:'Origen 123',Localdad:'CABA','Domicilio Entrega':'Destino 456','Localidad Entrega':'CABA',Horario:'9 a 17',NotaEntrega:'Nota válida','Mover A':'directo'};
const pickup=importRows([row])[0];assert.equal(pickup.type,'Retiro');assert.equal(pickup.name,row.Proveedor);assert.equal(pickup.address,row.Origen);assert.equal(pickup.note,'Nota válida');assert.equal(importRows([{...row,Movimiento:'entrega'}])[0].name,row.Cliente);
const noProvider=importRows([{...row,Proveedor:''}])[0];assert.equal(noProvider.name,'Sin nombre');assert.equal(directPairs([{...pickup,coord:[0,0]},{...pickup,id:2,coord:[1,1]}]).length,0);
const config={vehicles:3,start:480,end:840,vehicleHours:[{start:480,end:600},{start:600,end:720},{start:720,end:840}],returnHome:true,twoTrips:false,breakMinutes:60,depotCoord:[-34.62,-58.48],depotAddress:'Base'};
const stops=[[480,600],[600,720],[720,840]].map((w,i)=>({id:i+1,idx:i+1,np:'NP '+i,type:'Retiro',address:'Calle '+i,name:'Proveedor '+i,coord:[[-34.63,-58.48],[-34.62,-58.47],[-34.61,-58.48]][i],windows:[w],service:15,lines:[],note:''}));
const matrix={durations:Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>i===j?0:300)),distances:Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>i===j?0:1000))};
for(const flexibleStart of [false,true]){const cfg={...config,flexibleStart};const plan=optimizeTerritories(stops,matrix,cfg,{budgetMs:1200});assert.equal(plan.unassigned.length,0);for(const [v,r] of plan.routes.entries()){assert.equal(r.availableStart,cfg.vehicleHours[v].start);assert.ok(r.start>=r.availableStart);assert.ok(r.end<=cfg.vehicleHours[v].end);if(!flexibleStart)assert.equal(r.start,cfg.vehicleHours[v].start);}assert.throws(()=>moveToVehicle({...plan,config:cfg,matrix},1,2));}
const ctx={...config,...matrix,pickups:{},directPairs:[],flexibleStart:false};assert.equal(evaluate([{...stops[0],windows:[[585,600]]}],vehicleContext({...ctx,vehicleHours:[{start:585,end:600}]},0)),null);
assert.throws(()=>vehicleContext({...config,vehicleHours:[{start:700,end:600}]},0));
console.log('PASS: Retira/provider, Entrega/client, Mover A ignored, distinct shifts, fixed/flexible starts, manual move and return deadline rejection.');

// Each movement reads only its own address columns, including legacy CSV spelling.
const locations={...row,Localidad:'San Martín',Localdad:'Legacy city','Localidad Entrega':'Belgrano'};
assert.equal(importRows([locations])[0].city,'San Martín');
const delivery=importRows([{...locations,Movimiento:'Entrega'}])[0];
assert.equal(delivery.address,'Destino 456');assert.equal(delivery.city,'Belgrano');
assert.equal(importRows([{...row,Localdad:'Haedo'}])[0].city,'Haedo');
assert.equal(importRows([{...locations,Localidad:''}])[0].city,'');
const lowercase={Movimiento:'Entrega','Nota Pedido':'20','domicilio entrega':'Entrega 789','localidad entrega':'Olivos',Origen:'No usar',Localidad:'No usar'};
assert.equal(importRows([lowercase])[0].address,'Entrega 789');assert.equal(importRows([lowercase])[0].city,'Olivos');
assert.equal(importRows([{...locations,Movimiento:'Entrega','Domicilio Entrega':'','Localidad Entrega':''}])[0].address,'');
assert.equal(importRows([{...locations,Movimiento:'Entrega','Localidad Entrega':''}])[0].city,'');
assert.equal(importRows([{...locations,Origen:''}])[0].address,'');

// Supplier ownership must hold for every pickup, even for the same client and NP.
const it4wRows=['NUEVA FORMAS','ELEMENTI'].map((Proveedor,i)=>({...row,Cliente:'IT4W',Proveedor,Movimiento:i?'Retira':'Retiro',Origen:`Proveedor ${i+1} 123`,Localidad:'CABA','Domicilio Entrega':''}));
const supplierStops=importRows(it4wRows);
assert.deepEqual(supplierStops.map(s=>s.name),['NUEVA FORMAS','ELEMENTI']);
assert.deepEqual(supplierStops.map(s=>s.address),['Proveedor 1 123','Proveedor 2 123']);
assert.equal(importRows(it4wRows.map(r=>({...r,Origen:'Misma calle 100'}))).length,2);
const {restoreEdits}=await import('../public/readiness.mjs');
const wrongContact={id:'client',aliases:['IT4W']};
restoreEdits(supplierStops,[{key:supplierStops[0].legacyKey,data:{address:'Direccion cliente',contactId:'client'}}],[wrongContact]);
assert.equal(supplierStops[0].address,'Proveedor 1 123');
restoreEdits(supplierStops,[{key:supplierStops[0].legacyKey,data:{address:'Correccion proveedor',contactId:'supplier'}}],[{id:'supplier',aliases:['NUEVA FORMAS']}]);
assert.equal(supplierStops[0].address,'Correccion proveedor');
assert.equal(importRows([{...row,Movimiento:'Retirar'}])[0].name,row.Proveedor);
console.log('PASS: all pickups use supplier origin; separate suppliers and reject client address restoration.');

// Regression: the real CSV contains separate Mover rows for the same client/NP.
const transfers=[{...row,Movimiento:'Mover',Cliente:'Randstad',Proveedor:'UNIVERSAL GRABADOS',Origen:'Bonpland 2245','Domicilio Entrega':''},{...row,Movimiento:'Mover',Cliente:'IT4W',Proveedor:'loguearte','Domicilio Entrega':''}];
assert.deepEqual(importRows(transfers),[]);
const retained=importRows([...transfers,{...row,Movimiento:'Retiro',Cliente:'Randstad',Proveedor:'PUNTO DIGITAL'}]);
assert.equal(retained.length,1);assert.equal(retained[0].name,'PUNTO DIGITAL');assert.equal(retained[0].address,row.Origen);
assert.equal(importRows([{...row,Movimiento:'Entrega','Mover A':'otra empresa'}]).length,1);
console.log('PASS: Mover rows excluded independently of Mover A; real pickups and deliveries retained.');
