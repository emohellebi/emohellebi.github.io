/* Browser-only experiments. Values are fictional teaching assumptions. */
(() => {
  'use strict';
  const M = globalThis.EnergyModels;
  if (!M) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stops = [];
  const q = (root, name) => root.querySelector('[data-part="' + name + '"]');
  const num = (root, name) => Number(q(root, name).value);
  const fmt = n => n.toLocaleString('en-US', {maximumFractionDigits: 1});
  const control = (id, label, min, max, step, value, unit) => `<label for="${id}">${label}: <output data-part="${id}-value" for="${id}">${value} ${unit}</output><input id="${id}" data-part="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  function bindMotion(root) {
    const button = q(root, 'play');
    function stop() {root.classList.remove('is-running'); button.textContent = 'Play animation'; button.setAttribute('aria-pressed', 'false');}
    button.addEventListener('click', () => {
      if (root.classList.contains('is-running')) stop();
      else {root.classList.add('is-running');button.textContent = 'Pause animation';button.setAttribute('aria-pressed','true');}
    });
    function preference() {stop();button.disabled = reduced.matches;q(root,'motion-note').textContent = reduced.matches ? 'Reduced motion is enabled. Controls and numerical results remain fully available without animation.' : 'Animation is illustrative; arrow speed is not a physical measurement. You control playback.';}
    reduced.addEventListener('change', preference); preference(); stops.push(stop);
    new IntersectionObserver(entries => {if(!entries[0].isIntersecting) stop();}).observe(root);
    return stop;
  }
  const motionButtons = '<div class="lab-buttons"><button type="button" data-part="play" aria-pressed="false">Play animation</button><button type="button" data-part="reset">Reset experiment</button></div><p data-part="motion-note" class="lab-caption"></p>';
  function thermal(root) {
    root.innerHTML = `<span class="lesson-tag">Virtual experiment 9.1</span><h3>Where does the energy go?</h3><p>Hold the input steady. Change the conversion efficiency and watch the two output pathways.</p>
      <div class="lab-controls">${control('thermal-input','Energy input',100,400,20,100,'units')}${control('thermal-eff','Electrical efficiency',20,60,5,35,'%')}
      <label for="thermal-source">Heat source <select id="thermal-source" data-part="source"><option value="coal">Coal combustion</option><option value="gas">Gas combustion (steam-cycle example)</option><option value="nuclear">Nuclear fission</option></select></label></div>
      <svg class="lab-diagram" viewBox="0 0 800 270" role="img" aria-labelledby="thermal-title thermal-desc"><title id="thermal-title">Energy conversion and rejected heat</title><desc id="thermal-desc">A heat source feeds a turbine and generator. The input divides into electricity and rejected heat. Numerical amounts appear below.</desc>
      <path class="stream motion-path" d="M165 110 H275"/><path class="stream electric motion-path" d="M490 110 H645" data-part="electric-path"/><path class="stream reject motion-path" d="M395 145 V225 H645" data-part="heat-path"/>
      <rect class="node" x="5" y="70" width="160" height="80" rx="10"/><text x="85" y="102" text-anchor="middle">Heat source</text><text x="85" y="127" text-anchor="middle" data-part="source-label">Coal</text>
      <rect class="node" x="275" y="65" width="215" height="90" rx="10"/><text x="383" y="100" text-anchor="middle">Turbine +</text><text x="383" y="128" text-anchor="middle">generator</text>
      <rect class="node" x="645" y="75" width="150" height="70" rx="10"/><text x="720" y="117" text-anchor="middle">Electricity</text>
      <rect class="node" x="645" y="190" width="150" height="70" rx="10"/><text x="720" y="232" text-anchor="middle">Rejected heat</text><text class="small" x="285" y="35">Simplified energy accounting, not a plant schematic</text></svg>
      <div class="lab-metrics"><div><output data-part="in">100</output><small>input units</small></div><div><output data-part="out">35</output><small>electricity units</small></div><div><output data-part="heat">65</output><small>rejected-heat units</small></div></div>
      <p class="lab-reading" data-part="reading"></p>${motionButtons}<p class="lab-caption">Assumptions: input = electricity + rejected heat. All non-electrical output is grouped as heat; other plant details are omitted. The slider is hypothetical, not a technology rating. Switching fuel changes the explanation, not the assumed efficiency.</p>`;
    const stop = bindMotion(root);
    function update() {
      const input = num(root,'thermal-input'), efficiency = num(root,'thermal-eff'), r = M.thermal(input,efficiency);
      q(root,'thermal-input-value').value = input + ' units';q(root,'thermal-eff-value').value = efficiency + '%';
      q(root,'in').value=fmt(r.input);q(root,'out').value=fmt(r.electricity);q(root,'heat').value=fmt(r.heat);
      const source = q(root,'source').value;
      q(root,'source-label').textContent={coal:'Coal',gas:'Natural gas',nuclear:'Fission'}[source];
      q(root,'electric-path').style.strokeWidth=3+efficiency/8;q(root,'heat-path').style.strokeWidth=3+(100-efficiency)/8;
      q(root,'reading').textContent=`${fmt(r.input)} = ${fmt(r.electricity)} + ${fmt(r.heat)} energy units. `+(source==='nuclear'?'Fission releases nuclear energy, not energy from burning carbon. The thermal power cycle still rejects heat.':'Combustion releases chemical energy. Changing efficiency does not remove extraction impacts or combustion emissions.');
    }
    root.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',update));
    q(root,'reset').onclick=()=>{stop();q(root,'thermal-input').value=100;q(root,'thermal-eff').value=35;q(root,'source').value='coal';update();};update();
  }
  function decay(root) {
    root.innerHTML=`<span class="lesson-tag">Virtual experiment 9.2</span><h3>Half of what remains</h3><p>Follow an imaginary isotope, starting with 256 parent nuclei. Filled circles show the rounded expected number remaining; outlines represent transformed parent nuclei.</p>
      <div class="lab-controls">${control('decay-half','Half-life',2,8,2,4,'model years')}${control('decay-time','Elapsed time',0,24,.5,0,'model years')}</div>
      <div class="lab-buttons"><button type="button" data-part="play" aria-pressed="false">Play decay</button><button type="button" data-part="step">Advance one half-life</button><button type="button" data-part="reset">Reset time</button></div>
      <p class="lab-caption" data-part="motion-note"></p><div class="atom-field" aria-hidden="true">${'<span class="atom"></span>'.repeat(256)}</div>
      <div class="lab-metrics"><div><output data-part="remaining">256</output><small>expected parent nuclei</small></div><div><output data-part="fraction">100%</output><small>of initial parents</small></div><div><output data-part="halves">0</output><small>half-lives elapsed</small></div></div>
      <p class="lab-reading" data-part="reading"></p><p class="lab-caption">Model: N(t) = 256 × 2<sup>−t / half-life</sup>. This is an expected-value model, not a random sample or a named isotope. Actual nuclei decay probabilistically. It is not a reactor decay-heat, radiation-dose, or waste-safety calculator. Daughter products may also be radioactive.</p>`;
    let timer=null;const atoms=[...root.querySelectorAll('.atom')];
    const stop=()=>{clearInterval(timer);timer=null;q(root,'play').textContent='Play decay';q(root,'play').setAttribute('aria-pressed','false');};stops.push(stop);
    function update(){const h=num(root,'decay-half'),t=num(root,'decay-time'),n=M.decay(256,h,t);
      q(root,'decay-half-value').value=h+' model years';q(root,'decay-time-value').value=fmt(t)+' model years';
      q(root,'remaining').value=fmt(n);q(root,'fraction').value=fmt(n/256*100)+'%';q(root,'halves').value=fmt(t/h);
      atoms.forEach((a,i)=>a.classList.toggle('decayed',((i*73)%256)>=Math.round(n)));
      q(root,'reading').textContent=`After ${fmt(t)} model years, ${fmt(n)} parent nuclei are expected to remain. Each additional half-life halves this remainder—not the original 256.`;
      q(root,'step').disabled=t>=24;if(t>=24)stop();
    }
    q(root,'play').onclick=()=>{if(timer){stop();return;}if(num(root,'decay-time')>=24)q(root,'decay-time').value=0;q(root,'play').textContent='Pause decay';q(root,'play').setAttribute('aria-pressed','true');timer=setInterval(()=>{q(root,'decay-time').value=Math.min(24,num(root,'decay-time')+.5);update();},350);};
    q(root,'step').onclick=()=>{stop();q(root,'decay-time').value=Math.min(24,num(root,'decay-time')+num(root,'decay-half'));update();};
    q(root,'reset').onclick=()=>{stop();q(root,'decay-time').value=0;update();};
    root.querySelectorAll('input').forEach(el=>el.oninput=()=>{stop();update();});
    const preference=()=>{stop();q(root,'play').disabled=reduced.matches;q(root,'motion-note').textContent=reduced.matches?'Reduced motion enabled: use the time slider or advance one half-life.':'Playback compresses model years into seconds; this is not real-time decay.';};
    reduced.addEventListener('change',preference);preference();new IntersectionObserver(es=>{if(!es[0].isIntersecting)stop();}).observe(root);update();
  }
  function resources(root){
    root.innerHTML=`<span class="lesson-tag">Virtual experiment 10.1</span><h3>From moving photons and air to electricity</h3><p>Compare two imaginary 1 MW systems. Move one control at a time; then explain the shape of the response.</p><div class="lab-controls">${control('resource-sun','Sunlight relative to reference',0,100,5,75,'%')}${control('resource-wind','Wind speed',0,30,1,6,'m/s')}</div>
      <svg class="lab-diagram" viewBox="0 0 800 330" role="img" aria-labelledby="resource-title resource-desc"><title id="resource-title">Photovoltaic and wind conversion</title><desc id="resource-desc">Sunlight strikes a semiconductor panel to produce electricity. Wind turns a rotor connected to a generator. The diagrams pause and output values update with the controls.</desc>
      <circle cx="90" cy="60" r="32" fill="#ffce92"/><g data-part="rays"><path class="stream motion-path" d="M115 90 L200 170 M145 75 L250 160 M85 105 L150 180"/></g>
      <path d="M95 180 L270 150 L295 240 L120 270 Z" fill="#173d60" stroke="#8baabc" stroke-width="3"/><path d="M155 170 L180 260 M210 160 L235 250 M108 225 L282 195" stroke="#7196b2" fill="none"/>
      <path class="stream electric motion-path" d="M295 230 H365 V285 H205" data-part="pv-current"/><text x="100" y="316">PV: light → electricity</text>
      <path class="stream motion-path" d="M425 65 H545 M420 100 H520"/>
      <path d="M620 115 L608 275 H632 Z" fill="#b9cfdc"/>
      <g data-part="wind-rotor"><g class="rotor"><circle cx="620" cy="110" r="67" fill="none" stroke="none"/><path d="M620 110 L613 45 Q625 37 629 53 Z M620 110 L675 145 Q673 159 660 151 Z M620 110 L563 142 Q550 135 562 126 Z" fill="#77e5cd"/><circle cx="620" cy="110" r="9" fill="#f0f7fa"/></g></g>
      <path class="stream electric motion-path" d="M640 220 H735 V285 H620" data-part="wind-current"/><text x="445" y="316">Wind: motion → electricity</text></svg>
      <div class="lab-metrics"><div><output data-part="solar">750 kW</output><small>PV output</small></div><div><output data-part="wind">111.1 kW</output><small>wind output</small></div><div><output data-part="state">Generating</output><small>turbine state</small></div></div><p class="lab-reading" data-part="reading"></p>${motionButtons}
      <p class="lab-caption">Hypothetical model: PV power = 1 MW × sunlight fraction. Wind power = 0 below 3 m/s and at or above 25 m/s; otherwise min(1, (v³ − 3³) / (12³ − 3³)) MW. Temperature, air density, wake losses and electrical losses are omitted. Thresholds and the curve are teaching assumptions, not a manufacturer's specification. Rotor speed is symbolic.</p>`;
    const stop=bindMotion(root);
    function update(){const sun=num(root,'resource-sun'),v=num(root,'resource-wind'),power=M.wind(v);
      q(root,'resource-sun-value').value=sun+'%';q(root,'resource-wind-value').value=v+' m/s';q(root,'solar').value=fmt(sun*10)+' kW';q(root,'wind').value=fmt(power*1000)+' kW';
      const state=v<3?'Below cut-in':v>=25?'Protective stop':v>=12?'Rated output':'Generating';q(root,'state').value=state;
      q(root,'rays').style.opacity=sun/100;q(root,'pv-current').style.opacity=sun?1:0;q(root,'wind-current').style.opacity=power?1:0;
      q(root,'wind-rotor').classList.toggle('stopped',power===0);root.style.setProperty('--spin-time',(6-Math.min(v,12)/3)+'s');
      q(root,'reading').textContent=`PV produces ${fmt(sun*10)} kW; the turbine produces ${fmt(power*1000)} kW. `+(v>=25?'Stronger wind is not always more output: this imaginary turbine has stopped at its cut-out threshold.':v>=12?'The generator has reached its rated output. More wind does not increase this model’s electrical output.':v<3?'There is wind, but it is below the modeled generating threshold.':'PV responds linearly in this simplified model; wind follows a nonlinear power curve.');
    }
    root.querySelectorAll('input').forEach(el=>el.oninput=update);q(root,'reset').onclick=()=>{stop();q(root,'resource-sun').value=75;q(root,'resource-wind').value=6;update();};update();
  }
  const questions={
    9:[
      ['A plant receives 200 energy units at 35% electrical efficiency. What leaves as rejected heat?',['70 units','130 units','165 units'],1,'Electricity is 200 × 0.35 = 70. The simplified balance leaves 130 as heat.'],
      ['After two half-lives, what fraction of the original parent nuclei is expected to remain?',['Zero','One-half','One-quarter'],2,'Each half-life halves what remains: 1 → 1/2 → 1/4. It does not subtract half the original amount each time.'],
      ['Why can cooling still be needed after a reactor’s chain reaction stops?',['Fission products continue to decay and release heat','The control rods burn coal','The generator creates new nuclear fuel'],0,'Stopping the chain reaction does not stop radioactive decay of existing fission products.'],
      ['Which is a fairer way to compare electricity systems?',['Compare only what their cooling towers look like','Compare the same electricity service over consistent life-cycle boundaries','Ignore extraction if generation is efficient'],1,'A comparison needs a shared useful output, boundaries and context. Efficiency alone does not describe total impacts.'],
      ['Which evidence best supports recovery of a mined wetland?',['Green vegetation alone','One photograph after planting','Repeated measurements of water regime, native species and soil against a reference'],2,'Recovery must be tested against specified ecological functions and an appropriate reference over time.']
    ],
    10:[
      ['A 10 MW plant operates at 25% capacity factor for 24 hours. Its energy output is:',['2.5 MWh','60 MWh','240 MWh'],1,'Energy = 10 MW × 24 h × 0.25 = 60 MWh. The total does not specify when generation occurs.'],
      ['Why does equal daily renewable energy and demand not guarantee supply in every period?',['Megawatts and megawatt-hours are identical','The sunlight must always be too weak','Generation can arrive before or after demand'],2,'Energy must be available when needed. Storage and flexible demand can help, within their limits.'],
      ['A store charges with 400 MWh and returns 80%. What reaches the load?',['320 MWh','400 MWh','500 MWh'],0,'400 × 0.80 = 320 MWh. The 80 MWh difference represents the assumed round-trip losses.'],
      ['At 25 m/s, why does our imaginary turbine show zero output?',['Wind contains no kinetic energy','The model includes a protective cut-out threshold','Its nameplate rating is always zero'],1,'A power curve includes operational constraints; turbine output does not grow indefinitely with wind speed.'],
      ['Which claim is most defensible after a plan passes the three-period grid model?',['The real grid is reliable all year','There are no ecological costs','It meets this fictional day; more weather, network and ecological evidence is needed'],2,'Three periods are not a reliability study, and the energy balance does not measure ecological or social outcomes.']
    ]
  };
  function quiz(root){const chapter=Number(root.dataset.chapter),items=questions[chapter];
    root.innerHTML=`<h3>Check your reasoning</h3><p>Choose an answer for each question, then check your responses. This is practice—not a submitted or saved grade.</p><form>${items.map((item,i)=>`<fieldset><legend>${i+1}. ${item[0]}</legend>${item[1].map((answer,j)=>`<label><input type="radio" name="q${chapter}-${i}" value="${j}">${answer}</label>`).join('')}<p class="answer-feedback" data-feedback="${i}"></p></fieldset>`).join('')}<div class="lab-buttons"><button type="submit">Check my answers</button><button type="reset">Try again</button></div><p data-part="score" role="status"></p></form>`;
    const form=root.querySelector('form');form.onsubmit=e=>{e.preventDefault();let score=0,answered=0;items.forEach((item,i)=>{const checked=form.querySelector(`input[name="q${chapter}-${i}"]:checked`),correct=checked&&Number(checked.value)===item[2],feedback=root.querySelector(`[data-feedback="${i}"]`);if(checked)answered++;if(correct)score++;feedback.classList.toggle('correct',!!correct);feedback.textContent=!checked?'Select an answer, then check again.':(correct?'Correct. ':'Revisit this idea. ')+item[3];});q(root,'score').textContent=`${score} of ${items.length} correct; ${answered} answered. Read the explanation beneath each question.`;};
    form.onreset=()=>{root.querySelectorAll('.answer-feedback').forEach(e=>{e.textContent='';e.classList.remove('correct');});q(root,'score').textContent='';};
  }
  function notebook(root){const chapter=root.dataset.chapter;
    const fields=[['prediction','Predict','What do you expect to happen, and why?'],['observations','Observe','Record the controls, units and results for at least two trials.'],['explanation','Explain','Explain the mechanism. Did the evidence support your prediction?'],['limits','Evaluate','Name a limitation and an environmental tradeoff that the model cannot settle.']];
    root.innerHTML=`<h3>Your experiment notebook</h3><p>Keep a short record of your investigation. Notes stay only in this open page; download them before refreshing or leaving. Nothing is sent to a server.</p>${fields.map(([id,label,hint])=>`<label for="notebook-${chapter}-${id}">${label}</label><textarea id="notebook-${chapter}-${id}" data-part="${id}" placeholder="${hint}"></textarea>`).join('')}<div class="lab-buttons"><button type="button" data-part="download">Download my notes (.txt)</button></div><p data-part="status" role="status"></p>`;
    q(root,'download').onclick=()=>{const content=`Environmental Science — Chapter ${chapter}\nVirtual experiment notebook\n\n`+fields.map(([id,label])=>`${label}\n${q(root,id).value.trim()||'(No entry)'}\n`).join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`chapter-${chapter}-experiment-notes.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);q(root,'status').textContent='Your notes download has been requested. Keep the file to retain your work.';};
  }
  document.querySelectorAll('[data-energy-lab]').forEach(root=>{({thermal,decay,resources})[root.dataset.energyLab]?.(root);});
  document.querySelectorAll('.experiment .lab-diagram').forEach(svg=>{const wrap=document.createElement('div');wrap.className='diagram-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Energy diagram; scroll horizontally on narrow screens');svg.before(wrap);wrap.append(svg);const hint=document.createElement('p');hint.className='diagram-hint lab-caption';hint.textContent='Swipe the diagram sideways to explore the full pathway, or focus it and use the arrow keys.';wrap.after(hint);});
  document.querySelectorAll('.knowledge-check[data-chapter]').forEach(quiz);
  document.querySelectorAll('.lab-notebook[data-chapter]').forEach(notebook);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stops.forEach(stop=>stop());});
})();
