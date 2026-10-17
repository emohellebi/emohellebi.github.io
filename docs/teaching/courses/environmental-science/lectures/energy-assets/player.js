(() => {
 const slides=JSON.parse(document.getElementById('slide-data').textContent);
 const el=id=>document.getElementById(id);
 let index=0,remaining=3000,deadline=null,interval=null;
 function show(n){
  index=Math.max(0,Math.min(slides.length-1,n));const s=slides[index];
  el('slide').src=s.image || 'slide-'+String(index+1).padStart(2,'0')+'.png';
  el('slide').alt=s.title+'. '+s.body.replaceAll('\n',' ');
  el('accessible').textContent=s.title+'. '+s.body;
  el('position').textContent=(index+1)+' / '+slides.length;
  el('progress').value=index+1;el('prev').disabled=index===0;el('next').disabled=index===slides.length-1;
  if(el('run-activity'))el('run-activity').hidden=!s.activity;
  history.replaceState(null,'','#'+(index+1));
 }
 async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{el('fullscreen').textContent='Use browser fullscreen';}}
 el('prev').onclick=()=>show(index-1);el('next').onclick=()=>show(index+1);
 el('fullscreen').onclick=full;
 if(el('run-activity')){
  const dialog=el('activity-dialog'),frame=el('activity-frame');
  el('run-activity').onclick=()=>{frame.src='../../energy-assets/activity.html?lab='+encodeURIComponent(slides[index].activity);dialog.showModal();};
  el('close-activity').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{frame.src='about:blank';el('run-activity').focus();});
 }
 const clock=()=>{if(deadline)remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));el('clock').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');if(!remaining){clearInterval(interval);interval=null;deadline=null;el('timer').textContent='Restart';}};
 el('timer').onclick=()=>{if(interval){clock();clearInterval(interval);interval=null;deadline=null;el('timer').textContent='Resume';}else{if(!remaining)remaining=3000;deadline=Date.now()+remaining*1000;interval=setInterval(clock,250);el('timer').textContent='Pause';}};
 document.addEventListener('keydown',e=>{if(el('activity-dialog')?.open||['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(e.target.tagName))return;if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();show(index+1);}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();show(index-1);}if(e.key.toLowerCase()==='f')full();if(e.key==='Home')show(0);if(e.key==='End')show(slides.length-1);});
 window.addEventListener('hashchange',()=>show((Number(location.hash.slice(1))||1)-1));
 show((Number(location.hash.slice(1))||1)-1);
})();
