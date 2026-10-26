import {moveToVehicle,reorderStop} from './manual-routing.mjs?v=33';
import {optimizeTerritories} from './territory-optimizer.mjs?v=33';
onmessage=e=>{try{if(e.data.action==='reorder'){postMessage(reorderStop(e.data.plan,e.data.stopId,e.data.beforeId));return;}if(e.data.action==='move'){postMessage(moveToVehicle(e.data.plan,e.data.stopId,e.data.to));return;}const {stops,matrix,config}=e.data;postMessage(optimizeTerritories(stops,matrix,config));}catch(err){postMessage({error:err.message})}};
