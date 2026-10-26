// Presentation only: the planner remains the sole owner of routes and edits.
export function arrangeRoutes(host,result,colors){
 host.classList.remove('empty');
 const cards=[...host.querySelectorAll('article.route-card')],map=host.querySelector('#fleetMap');
 const top=host.querySelector('.result-top');const configure=document.createElement('button');configure.className='secondary configure-day';configure.textContent='Configurar jornada';configure.onclick=()=>document.getElementById('dataTab').click();top.append(configure);
 const explanation=document.createElement('details');explanation.className='route-explanation';explanation.innerHTML='<summary>Cómo se calculó este plan</summary>';
 for(const p of [...top.querySelectorAll('p.small')])explanation.append(p);top.append(explanation);
 const metrics=[...host.children].filter(n=>n.classList.contains('notice')&&!n.classList.contains('unassigned'));
 const audit=document.createElement('details');audit.className='route-audit';audit.innerHTML='<summary>Revisar carga de trabajo y calles compartidas</summary>';for(const n of metrics)audit.append(n);if(metrics.some(n=>n.classList.contains('warning'))){audit.open=true;audit.querySelector('summary').textContent='Observaciones del plan · revisar antes de despachar';}
 const board=document.createElement('div');board.className='route-workspace';
 const list=document.createElement('div');list.className='route-list';
 const tools=document.createElement('div');tools.className='route-controls';
 const label=document.createElement('label');label.textContent='Buscar en los recorridos';const search=document.createElement('input');search.type='search';search.placeholder='Dirección, NP o cliente';label.append(search);tools.append(label);
 const tabs=document.createElement('div');tabs.className='vehicle-filters';tabs.setAttribute('aria-label','Filtrar recorridos');tools.append(tabs);
 let selected=0;const buttons=[];
 const empty=document.createElement('p');empty.className='notice';empty.textContent='No hay paradas que coincidan con la búsqueda.';empty.hidden=true;
 function filter(){let found=false;const q=search.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();cards.forEach((card,i)=>{let matching=!q;for(const stop of card.querySelectorAll('.stop')){const matches=!q||stop.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q);stop.hidden=!matches;if(matches)matching=true;}card.hidden=(selected!==-1&&selected!==i)||!matching;if(!card.hidden)found=true;});empty.hidden=found;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(selected===i-1)));}
 for(let i=-1;i<cards.length;i++){const b=document.createElement('button');b.type='button';b.textContent=i<0?'Ver todas':`Camioneta ${i+1} · ${result.routes[i].timeline.filter(t=>!t.stop.depot).length} paradas · ${result.routes[i].dist.toFixed(1)} km`;if(i>=0)b.style.setProperty('--vehicle',colors[i%colors.length]);b.onclick=()=>{selected=i;filter();};buttons.push(b);tabs.append(b);}
 search.oninput=()=>{selected=-1;filter();};list.append(tools,...cards,empty);board.append(map,list);top.after(board);board.after(audit);
 cards.forEach((card,i)=>{const route=result.routes[i];card.id=`vehicle-${i}`;
  const head=card.querySelector('.route-head');const links=card.querySelector('.map-links');if(links)head.after(links);
  let index=0;for(const node of card.querySelectorAll('.stop')){if(node.classList.contains('break'))continue;const action=node.querySelector('[data-move-stop]');if(!action)continue;node.id=`route-stop-${action.dataset.moveStop}`;
   const content=action.closest('.stop').querySelector('div');const detail=document.createElement('details');detail.className='stop-details';detail.innerHTML='<summary>Notas y productos</summary>';
   const ps=[...content.children].filter(n=>n.tagName==='P');for(const p of ps){if(p.contains(action)||p.querySelector('.badge')||/Llegada /.test(p.textContent)||p.textContent.includes('Atención conjunta'))continue;detail.append(p);}
   if(detail.children.length>1)content.append(detail);const move=document.createElement('details');move.className='move-details';move.innerHTML='<summary>Mover o reordenar</summary>';move.append(action.closest('p'));content.append(move);const moveLabel=move.querySelector('label');if(moveLabel?.firstChild?.nodeType===3)moveLabel.firstChild.textContent='Destino ';index++;
  }
 });filter();
 if(host.routeFocusHandler)host.removeEventListener('route-stop-focus',host.routeFocusHandler);
 host.routeFocusHandler=e=>{const routeIndex=result.routes.findIndex(r=>r.route.some(s=>String(s.id)===String(e.detail)));selected=routeIndex;search.value='';filter();const node=document.getElementById(`route-stop-${e.detail}`);if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.tabIndex=-1;node.focus({preventScroll:true});}};host.addEventListener('route-stop-focus',host.routeFocusHandler);
}
