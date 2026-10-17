/* V1 local activities. No accounts, persistence, APIs, scores sent, or tracking. */
(() => {
  'use strict';
  const M = globalThis.EnergyV1Models;
  if (!M) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fmt = v => v.toLocaleString('en-US', {maximumFractionDigits: 2});
  const games = {
    fuels: {
      title:'Game: identify the fuel pathway',
      intro:'Match the evidence to a resource. Then explain the source of its stored energy.',
      questions:[
        ['Wetland plants undergo burial, heating and pressure over geological time.', ['Coal','Crude oil','Uranium'],0,'Coal develops from accumulated plant material. Ancient photosynthesis supplied much of its chemical energy.'],
        ['A refinery separates a liquid mixture into fractions with different boiling ranges.', ['Natural gas','Crude oil','Enriched uranium'],1,'Crude oil is a mixture. Fractional distillation separates components rather than making all fuel from one pure compound.'],
        ['Methane is the dominant component of a gaseous hydrocarbon mixture.', ['Coal','Hydrogen','Natural gas'],2,'Natural gas is predominantly methane. Its chemical energy differs from nuclear energy.'],
        ['Controlled fission releases heat without burning carbon-containing fuel.', ['Uranium fuel','Gasoline','Coal'],0,'Uranium supplies nuclear energy. Extraction, cooling and radioactive waste still require management.']
      ], source:'Book sections 9.1–9.3, pp. 264–274.'
    },
    conversion: {
      title:'Game: which conversion comes next?',
      intro:'Identify the mechanism, not just the word “renewable.” Choose one answer per pathway.',
      questions:[
        ['Sunlight reaches a photovoltaic cell. What produces electrical output?', ['A semiconductor and separated charge carriers','Boiling water in every panel','A tiny wind rotor'],0,'PV converts absorbed light into electrical energy in a semiconductor; it does not require a steam cycle.'],
        ['Mirrors heat a fluid in a concentrating solar power plant. What follows?', ['Photosynthesis','A thermal power cycle','Uranium enrichment'],1,'CSP collects heat. A thermal cycle can drive a turbine and generator. Some designs also store heat.'],
        ['A binary-cycle geothermal plant uses moderately hot geothermal water. What boils?', ['The entire reservoir','The soil','A separate working fluid'],2,'Heat crosses a heat exchanger to a fluid with a lower boiling point. The two fluid circuits stay separate.'],
        ['Cellulose will become ethanol. What must happen before fermentation?', ['Conversion of cellulose to simpler sugars','Separation of uranium isotopes','Removal of all carbon'],0,'Pretreatment and breakdown of cellulose produce sugars that microbes can ferment. Processing itself consumes energy.'],
        ['Which source depends directly on gravitational tides rather than incoming sunlight?', ['Photovoltaics','Tidal currents','Plant biomass'],1,'Tidal motion comes from gravitational interactions. Wind, most waves and photosynthesis are driven by solar energy.']
      ], source:'Book sections 10.1–10.3, pp. 298–309. Mechanism clarification: DOE solar basics.'
    },
    safeguards: {
      title:'Game: match the safeguard to the mechanism',
      intro:'A safeguard earns credit only if it addresses the stated problem. Every option still needs site-specific evaluation.',
      questions:[
        ['A proposed solar project would clear intact desert habitat.', ['Build more transmission lines through it','Evaluate rooftops and disturbed land first','Add a larger battery only'],1,'Siting changes the land-disturbance pathway. Storage can address timing, but does not by itself prevent habitat loss.'],
        ['Monitoring finds bat fatalities during low-wind migration periods.', ['Operate continuously at all wind speeds','Apply universal “zero wildlife impact” labels','Test targeted curtailment and monitor its results'],2,'The chapter describes raising the starting wind speed to reduce exposure at study sites. Effects and energy tradeoffs need local measurement.'],
        ['A run-of-river diversion would leave too little water in the bypassed channel.', ['Set an ecological flow requirement and protect fish passage','Add solar mirrors beside the intake','Count only the electricity generated'],0,'Small projects still alter flow. Seasonal water needs and fish movement belong in operating rules.'],
        ['Expanding biofuel crops would replace a diverse natural ecosystem.', ['Ignore land conversion if the crop grows back','Screen feedstocks, protect habitat and account for soil needs','Assume all biomass is automatically carbon neutral'],1,'Renewal of biomass does not reverse every land-use effect. Residues have existing functions too, so removal needs limits.']
      ], source:'Book sections 10.8–10.11, pp. 317–325.'
    }
  };
  function quiz(root,key){
    const data=games[key], id='v1-'+key;
    root.classList.add('v1-game');
    root.innerHTML=`<h3>${data.title}</h3><p>${data.intro}</p><form>${data.questions.map((q,i)=>`<fieldset><legend>${i+1}. ${q[0]}</legend><label for="${id}-${i}">Your answer<select id="${id}-${i}" name="${id}-${i}"><option value="">Choose a pathway</option>${q[1].map((a,j)=>`<option value="${j}">${a}</option>`).join('')}</select></label><p class="v1-feedback" data-feedback="${i}"></p></fieldset>`).join('')}<div class="v1-controls"><button type="submit">Check and explain</button><button type="reset">Try again</button></div><p class="v1-result" data-score role="status" aria-live="polite">Your score appears after you check your choices.</p></form><p class="v1-note">${data.source} Original practice questions. Nothing is submitted.</p>`;
    const form=root.querySelector('form');
    form.onsubmit=e=>{e.preventDefault();let correct=0,answered=0;data.questions.forEach((q,i)=>{
      const value=form.elements[id+'-'+i].value, yes=value!==''&&Number(value)===q[2];
      correct+=yes?1:0;answered+=value!==''?1:0;
      const p=root.querySelector(`[data-feedback="${i}"]`);p.className='v1-feedback '+(yes?'correct':'incorrect');
      p.textContent=(yes?'Correct. ':value===''?'Not answered. ':'Reconsider. ')+q[3];
    });root.querySelector('[data-score]').textContent=`${correct} of ${data.questions.length} correct; ${answered} answered. Use the explanations to revise your reasoning.`;};
    form.onreset=()=>{root.querySelectorAll('[data-feedback]').forEach(p=>p.textContent='');root.querySelector('[data-score]').textContent='Choices cleared. Make another prediction.';};
  }
  function reactor(root){
    root.innerHTML=`<h3>Animation: control the chain, remove the heat</h3><p>Start with 24 symbolic neutron units. Step through generations, insert the control rods, then ask whether cooling is still needed.</p><div class="v1-controls"><label for="v1-rods">Control-rod state<select id="v1-rods"><option value="balanced">Balanced toy chain</option><option value="withdrawn">More withdrawn</option><option value="inserted">Inserted</option></select></label><label for="v1-cooling">Heat removal<select id="v1-cooling"><option value="on">Available</option><option value="off">Unavailable</option></select></label></div><div class="v1-reactor" data-rods="balanced" aria-hidden="true"><div class="reactor-rods"></div><div class="nuclei">${'<i></i>'.repeat(48)}</div><div class="heat-path">Heat removal<br><strong data-heat-label>Available</strong></div></div><p>Generation <output data-generation>0</output> · Symbolic neutron units <output data-neutrons>24</output></p><div class="v1-controls"><button type="button" data-action="step">Next generation</button><button type="button" data-action="play" aria-pressed="false">Play generations</button><button type="button" data-action="reset">Reset</button></div><p class="v1-result" role="status" aria-live="polite"></p><p class="v1-note">Toy model only: each generation multiplies neutron units by 1, 1.35 or 0.2, capped at 240 for display. These are invented factors, not reactor parameters. Circles encode relative activity; they are not individual particles. Existing fission products continue releasing decay heat after shutdown. The diagram does not calculate temperature, radiation, risk or safe operating conditions. Based on pp. 272–274, 283–284, 289–290; NRC decay-heat explanation.</p>`;
    let n=24,g=0,timer=null;const rods=root.querySelector('#v1-rods'),cool=root.querySelector('#v1-cooling');
    const play=root.querySelector('[data-action=play]');
    function stop(){clearInterval(timer);timer=null;play.textContent='Play generations';play.setAttribute('aria-pressed','false');root.querySelector('.heat-path').classList.remove('flowing');}
    function update(){
      root.querySelector('[data-generation]').value=g;root.querySelector('[data-neutrons]').value=fmt(n);
      root.querySelector('.v1-reactor').dataset.rods=rods.value;
      root.querySelectorAll('.nuclei i').forEach((a,i)=>a.classList.toggle('off',i>=Math.ceil(n/5)));
      root.querySelector('[data-heat-label]').textContent=cool.value==='on'?'Available':'Unavailable';
      root.querySelector('.heat-path').classList.toggle('flowing',cool.value==='on'&&timer!==null&&!reduce.matches);
      root.querySelector('.v1-result').textContent=(rods.value==='inserted'?'Neutron absorption suppresses the toy chain. Radioactive products still release heat. ':rods.value==='withdrawn'?'The toy chain grows across generations. Cooling alone does not regulate this multiplication. ':'The toy chain stays steady while the assumed balance remains unchanged. ')+(cool.value==='on'?'Heat removal is available in this conceptual state.':'Heat removal is unavailable. Stopping fission does not remove the need to cool the fuel.');
      root.querySelector('[data-action=step]').disabled=g>=12;
      if(g>=12)stop();
    }
    function step(){if(g<12){n=M.neutronStep(n,rods.value);g++;update();}}
    root.querySelector('[data-action=step]').onclick=()=>{stop();step();};
    play.onclick=()=>{if(timer){stop();return;}if(g>=12){g=0;n=24;}play.textContent='Pause generations';play.setAttribute('aria-pressed','true');timer=setInterval(step,900);update();};
    root.querySelector('[data-action=reset]').onclick=()=>{stop();g=0;n=24;rods.value='balanced';cool.value='on';update();};
    rods.onchange=update;cool.onchange=update;
    const preference=()=>{stop();play.disabled=reduce.matches;update();};reduce.addEventListener('change',preference);preference();
    new IntersectionObserver(es=>{if(!es[0].isIntersecting)stop();}).observe(root);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  }
  function spill(root){
    const rounds=[
      {phase:'Before a spill',question:'A port is preparing its tanker operations. Which choice acts on prevention?',correct:'prevent',explain:'Vessel protection, maintenance and a practiced response plan reduce the chance or consequences of a release. Cleanup equipment alone cannot prevent a hull breach.'},
      {phase:'During a spill',question:'Surface oil is approaching a sheltered, sensitive shoreline. Which response can contain and recover surface oil when conditions permit?',correct:'recover',explain:'Booms can help contain surface oil and skimmers can recover it. Waves, currents and oil properties limit performance. Recovered material still needs management.'},
      {phase:'After response',question:'The shoreline looks cleaner. What is the strongest next step before declaring recovery?',correct:'monitor',explain:'Compare biological, water and sediment indicators with reference conditions over time. A cleaner surface does not establish full ecological recovery.'}
    ];
    const actions=[['prevent','Prevention and preparedness'],['recover','Booms and skimmers'],['disperse','Chemical dispersants'],['monitor','Restoration and monitoring']];
    root.innerHTML=`<h3>Game: an oil-spill response room</h3><p>Work through three decisions. Explain your choice before revealing its consequences. This is a classroom case, not spill-response guidance.</p><div class="v1-stage" aria-hidden="true">${rounds.map(r=>`<span>${r.phase}</span>`).join('')}</div><p data-question></p><div class="v1-controls">${actions.map(([id,label])=>`<button type="button" data-choice="${id}">${label}</button>`).join('')}</div><p class="v1-result" role="status" aria-live="polite">Choose an intervention.</p><div class="v1-controls"><button type="button" data-next disabled>Next decision</button><button type="button" data-reset>Restart game</button></div><p class="v1-note">Book pp. 284–286. NOAA clarifies that dispersants break oil into droplets in the water column: they do not remove the oil or guarantee harmlessness. No response percentages or environmental scores are invented here.</p>`;
    let round=0,solved=false;const feedback=root.querySelector('.v1-result'),next=root.querySelector('[data-next]');
    function render(){root.querySelectorAll('.v1-stage span').forEach((e,i)=>e.classList.toggle('active',i===round));root.querySelector('[data-question]').textContent=rounds[round].question;next.disabled=true;next.textContent=round===2?'Finish case':'Next decision';solved=false;root.querySelectorAll('[data-choice]').forEach(b=>b.disabled=false);}
    root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const id=b.dataset.choice;solved=id===rounds[round].correct;next.disabled=!solved;feedback.textContent=solved?'Good match. '+rounds[round].explain:id==='disperse'?'Dispersants redistribute oil into small droplets. That can change which organisms are exposed; it does not equal recovery or elimination of the oil. Try an intervention that directly answers this decision.':'This may have a role elsewhere, but it does not address the immediate question. Revisit the stage and mechanism.';});
    next.onclick=()=>{if(!solved)return;if(round<2){round++;render();feedback.textContent='Choose an intervention.';}else{feedback.textContent='Case completed: prevention, response and ecosystem recovery answer different questions. Name one indicator you would monitor and one uncertainty.';next.disabled=true;root.querySelectorAll('[data-choice]').forEach(b=>b.disabled=true);}};
    root.querySelector('[data-reset]').onclick=()=>{round=0;render();feedback.textContent='Choose an intervention.';};render();
  }
  function eroei(root){
    root.innerHTML=`<h3>Experiment: energy returned versus energy invested</h3><p>Hold delivered energy at 100 units. Increase the energy required to build, obtain and process that supply. Predict when the net energy reaches zero.</p><div class="v1-controls"><label for="v1-investment">Energy invested: <output data-invested>10</output> units<input type="range" id="v1-investment" min="5" max="125" step="5" value="10"></label><button type="button" data-reset>Reset investment</button></div><div class="v1-energy-bars" aria-hidden="true"><div class="v1-energy-row"><span>Delivered</span><div class="track"><div class="fill" style="width:80%"></div></div><span>100 units</span></div><div class="v1-energy-row invested"><span>Invested</span><div class="track"><div class="fill" data-investment-bar></div></div><span data-investment-label></span></div></div><p>EROEI: <output data-ratio>10</output> · Net energy: <output data-net>90 units</output></p><p class="v1-result" role="status" aria-live="polite"></p><p class="v1-note">Original numerical exercise, not measured performance of a technology. EROEI = delivered / invested; net energy = delivered − invested. The bar scale is 0–125 energy units. Use consistent boundaries. This ratio does not measure cost, biodiversity, water use or when electricity is available. Book pp. 311–312, 324–325.</p>`;
    const input=root.querySelector('#v1-investment');
    function update(){const v=Number(input.value),r=M.energyReturn(100,v);root.querySelector('[data-invested]').value=v;root.querySelector('[data-ratio]').value=fmt(r.ratio);root.querySelector('[data-net]').value=fmt(r.net)+' units';root.querySelector('[data-investment-bar]').style.width=v/125*100+'%';root.querySelector('[data-investment-label]').textContent=v+' units';root.querySelector('.v1-result').textContent=r.net>0?`The system returns ${fmt(r.ratio)} units for every unit invested, leaving ${fmt(r.net)} net units within this boundary.`:r.net===0?'Energy break-even: output equals investment. Positive gross output alone is not a net energy gain.':`Investment exceeds delivery by ${fmt(-r.net)} units. This is a net energy loss within the assumed boundary.`;}
    input.oninput=update;root.querySelector('[data-reset]').onclick=()=>{input.value=10;update();};update();
  }
  document.querySelectorAll('[data-v1]').forEach(root=>{const type=root.dataset.v1;if(games[type])quiz(root,type);else if(type==='reactor')reactor(root);else if(type==='spill')spill(root);else if(type==='eroei')eroei(root);});
})();
