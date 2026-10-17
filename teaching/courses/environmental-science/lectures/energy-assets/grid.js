/* Transparent three-period teaching model. All profiles are illustrative. */
(() => {
 const root=document.getElementById('grid-explorer');if(!root)return;
 const ids=['solar','wind','battery','power','efficiency','shift'];
 const defaults={solar:100,wind:40,battery:400,power:40,efficiency:0,shift:0};
 const input=id=>document.getElementById('grid-'+id);
 const M=globalThis.EnergyModels;if(!M)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const names=['Night / morning','Midday','Evening'];
 let period=0,timer=null,current=null,settings=null;
 const playback=document.createElement('div');playback.className='grid-playback';
 playback.innerHTML='<h3>Replay the day: follow the stored energy</h3><p>Each frame shows the <strong>end</strong> of one eight-hour period. The store starts empty. Advance manually or play the three frames.</p><div class="period-tabs" role="group" aria-label="Choose a period">'+names.map((n,i)=>'<button type="button" data-period="'+i+'" aria-pressed="false">'+n+'</button>').join('')+'</div><div class="storage-shell" role="img" aria-label="Stored energy" id="storage-meter"><div class="storage-fill" id="storage-fill"></div></div><p id="storage-reading"></p><p id="period-reading" class="lab-reading"></p><div class="lab-buttons"><button type="button" id="grid-play" aria-pressed="false">Play day</button><button type="button" id="grid-step">Next period</button><button type="button" id="grid-restart">Restart day</button></div><p id="grid-motion-note" class="lab-caption"></p>';
 root.querySelector('.energy-controls').after(playback);
 const stop=()=>{clearInterval(timer);timer=null;document.getElementById('grid-play').textContent='Play day';document.getElementById('grid-play').setAttribute('aria-pressed','false');};
 function frame(){
  if(!current)return;const r=current.rows[period],deliverable=r.stored*.8;
  playback.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.period)===period)));
  document.getElementById('storage-fill').style.width=(settings.battery?r.stored/settings.battery*100:0)+'%';
  document.getElementById('storage-meter').setAttribute('aria-label',deliverable.toFixed(1)+' MWh remaining deliverable energy at the end of '+names[period]);
  document.getElementById('storage-reading').textContent=names[period]+': '+deliverable.toFixed(1)+' MWh remaining deliverable energy (80% of '+r.stored.toFixed(1)+' MWh input-equivalent inventory).';
  document.getElementById('period-reading').textContent='Started with '+(r.before*.8).toFixed(1)+' MWh deliverable. Charged '+r.charged.toFixed(1)+' MWh; delivered '+r.returned.toFixed(1)+' MWh to demand. Additional supply: '+(r.backup*8).toFixed(1)+' MWh. Curtailed surplus: '+r.curtailed.toFixed(1)+' MWh.';
  document.getElementById('grid-step').disabled=period===2;
 }
 playback.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{stop();period=Number(b.dataset.period);frame();});
 document.getElementById('grid-play').onclick=()=>{if(timer){stop();return;}period=0;frame();document.getElementById('grid-play').textContent='Pause day';document.getElementById('grid-play').setAttribute('aria-pressed','true');timer=setInterval(()=>{period++;frame();if(period===2)stop();},1800);};
 document.getElementById('grid-step').onclick=()=>{stop();period=Math.min(2,period+1);frame();};
 document.getElementById('grid-restart').onclick=()=>{stop();period=0;frame();};
 const preference=()=>{stop();document.getElementById('grid-play').disabled=reduced.matches;document.getElementById('grid-motion-note').textContent=reduced.matches?'Reduced motion enabled. Use Next period or the period buttons.':'Playback compresses a fictional day into three frames. Changing a model control restarts the timeline.';};
 reduced.addEventListener('change',preference);preference();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 new IntersectionObserver(es=>{if(!es[0].isIntersecting)stop();}).observe(root);
 function update(){
  stop();period=0;
  const p=Object.fromEntries(ids.map(id=>[id,Number(input(id).value)]));
  for(const id of ids)document.getElementById('value-'+id).value=p[id]+(id==='battery'?' MWh':id==='efficiency'?'%':' MW');
  p.weather=input('weather').value;settings=p;current=M.grid(p);
  const {demand,renewable,rows,total,peak:max}=current;
  document.getElementById('grid-rows').innerHTML=rows.map((r,i)=>'<tr><th scope="row">'+names[i]+'</th>'+[r.d,r.r,r.charged,r.returned,r.backup].map(v=>'<td>'+v.toFixed(1)+'</td>').join('')+'</tr>').join('');
  document.getElementById('grid-result').textContent=total<.001?'All three modeled periods meet demand. '+(p.weather==='weak'?'The weak-wind test passes; evaluate ecological tradeoffs next.':'Test weak wind next.'):'Additional supply needed: '+total.toFixed(1)+' MWh across the day; peak modeled gap '+max.toFixed(1)+' MW.';
  const scale=Math.max(...demand,...renewable,1);
  document.getElementById('grid-bars').innerHTML=rows.map((r,i)=>'<div class="energy-bar-group"><div class="energy-bar demand" style="height:'+r.d/scale*100+'%"></div><div class="energy-bar" style="height:'+r.r/scale*100+'%"></div><small>'+names[i]+'</small></div>').join('');
  document.getElementById('grid-balance').textContent='Renewable output: '+(renewable.reduce((a,v)=>a+v,0)*8).toFixed(0)+' MWh. Demand: '+(demand.reduce((a,v)=>a+v,0)*8).toFixed(0)+' MWh. Unused surplus: '+rows.reduce((a,r)=>a+r.curtailed,0).toFixed(0)+' MWh.';
  frame();
 }
 ids.forEach(id=>input(id).addEventListener('input',update));input('weather').addEventListener('change',update);
 document.getElementById('grid-reset').onclick=()=>{ids.forEach(id=>input(id).value=defaults[id]);input('weather').value='normal';update();};
 update();
})();
