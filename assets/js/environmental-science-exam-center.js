(function () {
  "use strict";
  const root=document.getElementById("environmental-exam-center"),bank=window.ENV_SCIENCE_BANK,lab=window.ENV_SCIENCE_LAB,timing=window.ENV_SCIENCE_CLOCK;
  if(!root||!bank||!lab||!timing)return;
  const h=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
  const ids=new Set(bank.questions.map(q=>q.id)),storageKey="environmental-science-practice-v1";
  let persistent=true;
  const history=(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(storageKey)||"{}");
      const clean=a=>Array.isArray(a)?[...new Set(a.filter(x=>ids.has(x)))]:[];
      const test="es-storage-check";localStorage.setItem(test,"1");localStorage.removeItem(test);
      return {seen:clean(raw.seen),missed:clean(raw.missed)};
    }catch(_){persistent=false;return {seen:[],missed:[]};}
  })();
  const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(history));}catch(_){persistent=false;}};
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const state={chapters:[9,10],sections:["Science","Issues","Solutions"],media:true,size:15,mode:"all",paused:reduced.matches,session:[],answers:[],cursor:0,timingMode:"off",timerMinutes:15};
  const clock=timing.createClock();
  let clockInterval=null,sessionActive=false;
  function stopClockLoop(){if(clockInterval!==null)clearInterval(clockInterval);clockInterval=null;}
  function runClockLoop(){
    stopClockLoop();updateClock();
    if(sessionActive&&clock.snapshot().running)clockInterval=setInterval(updateClock,250);
  }
  function finishClock(){sessionActive=false;clock.pause();stopClockLoop();}
  function clockToolbar(){
    return `<div class="es-session-timing" role="group" aria-label="Optional session timing">
      <label for="es-session-timing-mode">Timing <select id="es-session-timing-mode">${[["off","Off"],["stopwatch","Stopwatch"],["countdown",`Countdown (${state.timerMinutes} min)`]].map(([value,label])=>`<option value="${value}" ${state.timingMode===value?"selected":""}>${label}</option>`).join("")}</select></label>
      <div class="es-clock-reading" id="es-clock-reading" ${state.timingMode==="off"?"hidden":""}><span id="es-clock-label"></span><output id="es-clock-time" role="timer" aria-live="off"></output><small id="es-clock-state"></small></div>
      <button id="es-clock-pause" type="button" ${state.timingMode==="off"?"hidden":""}>Pause clock</button>
      <p class="es-clock-help">Changing timing mode starts a fresh clock; your answers stay. Timing includes explanations and time in other tabs unless you pause the clock.</p>
      <p id="es-clock-notice" class="es-clock-notice" role="status"></p>
    </div>`;
  }
  function updateClock(){
    const display=root.querySelector("#es-clock-time");if(!display)return;
    const s=clock.snapshot(),off=s.mode==="off",complete=state.answers.length===state.session.length;
    root.querySelector("#es-clock-reading").hidden=off;
    const pause=root.querySelector("#es-clock-pause");pause.hidden=off;pause.disabled=complete;
    pause.textContent=s.running?"Pause clock":"Resume clock";
    root.querySelector("#es-session-timing-mode").disabled=complete;
    root.querySelector("#es-clock-label").textContent=s.mode==="countdown"?"Time remaining":"Elapsed time";
    display.textContent=timing.formatTime(s.mode==="countdown"?s.remainingMs:s.elapsedMs,s.mode==="countdown");
    root.querySelector("#es-clock-state").textContent=complete?"Finished":s.running?"Running":"Paused";
    root.querySelector(".es-session-timing").classList.toggle("es-clock-urgent",s.mode==="countdown"&&s.remainingMs<=60000);
    const notice=root.querySelector("#es-clock-notice"),message=s.expired?"Your time target is reached. You can keep practicing; your answers are safe.":"";
    if(notice.textContent!==message)notice.textContent=message;
  }
  function clockSummary(){
    const s=clock.snapshot();
    if(s.mode==="off")return "Timing off.";
    const elapsed=timing.formatTime(s.elapsedMs);
    return s.mode==="stopwatch"?`Stopwatch: ${elapsed} clocked time (pauses excluded).`:
      `Countdown: ${elapsed} clocked time / ${timing.formatTime(s.limitMs)} target (pauses excluded). ${s.expired?"Time target reached; practice was allowed to continue.":"Finished before the time target."}`;
  }
  document.addEventListener("visibilitychange",()=>{if(sessionActive)updateClock();});
  window.addEventListener("pagehide",stopClockLoop);
  window.addEventListener("pageshow",()=>{if(sessionActive)runClockLoop();});
  reduced.addEventListener?.("change",e=>{if(e.matches){state.paused=true;root.classList.add("es-paused");const b=root.querySelector("#es-motion");if(b){b.textContent="Play animation";b.setAttribute("aria-pressed","true");}}});
  const pool=()=>bank.questions.filter(q=>state.chapters.includes(q.chapter)&&state.sections.includes(q.section)&&(state.media||!q.media)&&(state.mode!=="missed"||history.missed.includes(q.id)));
  function focus(selector){root.querySelector(selector)?.focus({preventScroll:true});}
  function scroll(){root.scrollIntoView({block:"start",behavior:"instant"});}
  function setup(){
    finishClock();
    root.classList.toggle("es-paused",state.paused);
    root.innerHTML=`<section class="es-builder" aria-labelledby="es-builder-title">
      <div class="es-builder-heading"><div><span class="es-eyebrow">YOUR PRACTICE SESSION</span><h2 id="es-builder-title" tabindex="-1">Choose your challenge</h2></div><div class="es-pool-number"><strong id="es-pool-count"></strong><span>questions available</span></div></div>
      <form id="es-form">
        <fieldset><legend>01 <span>Chapters</span></legend><div class="es-chapter-grid">${[9,10].map(ch=>`<label class="es-chapter-choice"><input type="checkbox" name="chapter" value="${ch}" ${state.chapters.includes(ch)?"checked":""}><span><small>CHAPTER ${ch}</small><strong>${h(bank.chapters[ch].title)}</strong><em>${bank.questions.filter(q=>q.chapter===ch).length} questions</em></span></label>`).join("")}</div></fieldset>
        <fieldset><legend>02 <span>Topics</span></legend><div class="es-check-row">${["Science","Issues","Solutions"].map(s=>`<label><input type="checkbox" name="section" value="${s}" ${state.sections.includes(s)?"checked":""}> ${s}</label>`).join("")}</div></fieldset>
        <div class="es-config-columns"><fieldset><legend>03 <span>Question format</span></legend><label class="es-media-switch"><input id="es-media-toggle" type="checkbox" role="switch" ${state.media?"checked":""}><span><strong>Include visual & interactive questions</strong><small>Figures, plots, experiments and animated systems.</small></span></label><p class="es-help">Turn off for text-only practice. Motion can be paused separately, without losing the visual questions.</p></fieldset>
        <fieldset><legend>04 <span>Session length</span></legend><div class="es-quick-sizes">${[5,10,15,25,40].map(n=>`<button type="button" data-size="${n}" aria-label="Choose ${n} questions">${n}</button>`).join("")}<button type="button" id="es-all">All available</button></div><label class="es-number-label" for="es-size">Or enter any number <input id="es-size" type="number" required min="1" step="1" value="${state.size}" aria-describedby="es-size-help"></label><p class="es-help" id="es-size-help"></p></fieldset></div>
        <fieldset><legend>05 <span>Practice focus</span></legend><div class="es-check-row"><label><input type="radio" name="mode" value="all" ${state.mode==="all"?"checked":""}> Full selected bank</label><label><input type="radio" name="mode" value="missed" ${state.mode==="missed"?"checked":""}> Review missed questions</label></div></fieldset>
        <fieldset aria-describedby="es-timing-help"><legend>06 <span>Optional timing</span></legend><div class="es-check-row">${[["off","Off · no clock"],["stopwatch","Stopwatch · count up"],["countdown","Timer · count down"]].map(([value,label])=>`<label><input type="radio" name="timing" value="${value}" ${state.timingMode===value?"checked":""}> ${label}</label>`).join("")}</div>
          <label class="es-number-label" id="es-timer-minutes-label" for="es-timer-minutes" ${state.timingMode==="countdown"?"":"hidden"}>Time limit for the whole session (minutes) <input id="es-timer-minutes" type="number" min="1" max="240" step="1" required value="${state.timerMinutes}" ${state.timingMode==="countdown"?"":"disabled"}></label>
          <p class="es-help" id="es-timing-help">Timing is off by default. You can pause/resume the clock or change modes during practice. A countdown is a reminder: reaching zero will not end the session or erase answers. Pausing the clock does not lock the questions.</p>
        </fieldset>
        <div class="es-plan" aria-live="polite" id="es-plan"></div>
        <div class="es-start-row"><button type="submit" class="es-button es-primary" id="es-start">Start practice <span aria-hidden="true">→</span></button><button type="button" id="es-reset" class="es-text-button">Reset my history</button></div>
      </form><p class="es-privacy" id="es-privacy">${persistent?"Progress stays in this browser. No account, paid API or server submission.":"Browser storage is unavailable. Practice still works; history will last only until this page closes."} Questions are original practice, not official exam items.</p></section>`;
    root.querySelectorAll('input[name="chapter"]').forEach(x=>x.addEventListener("change",()=>{state.chapters=[...root.querySelectorAll('input[name="chapter"]:checked')].map(i=>Number(i.value));update();}));
    root.querySelectorAll('input[name="section"]').forEach(x=>x.addEventListener("change",()=>{state.sections=[...root.querySelectorAll('input[name="section"]:checked')].map(i=>i.value);update();}));
    root.querySelector("#es-media-toggle").addEventListener("change",e=>{state.media=e.target.checked;update();});
    root.querySelectorAll('input[name="mode"]').forEach(x=>x.addEventListener("change",()=>{state.mode=x.value;update();}));
    root.querySelectorAll('input[name="timing"]').forEach(x=>x.addEventListener("change",()=>{
      state.timingMode=x.value;
      root.querySelector("#es-timer-minutes-label").hidden=x.value!=="countdown";
      root.querySelector("#es-timer-minutes").disabled=x.value!=="countdown";
      update();
    }));
    root.querySelector("#es-timer-minutes").addEventListener("input",e=>{state.timerMinutes=Number(e.target.value);update();});
    root.querySelector("#es-size").addEventListener("input",e=>{state.size=Number(e.target.value);update();});
    root.querySelectorAll("[data-size]").forEach(b=>b.addEventListener("click",()=>{state.size=Math.min(Number(b.dataset.size),pool().length||1);root.querySelector("#es-size").value=state.size;update();}));
    root.querySelector("#es-all").addEventListener("click",()=>{state.size=pool().length||1;root.querySelector("#es-size").value=state.size;update();});
    root.querySelector("#es-reset").addEventListener("click",()=>{
      if(window.confirm("Reset Environmental Science practice history in this browser? Your Biochemistry history will not change.")){history.seen=[];history.missed=[];save();update();}
    });
    root.querySelector("#es-form").addEventListener("submit",e=>{e.preventDefault();if(root.querySelector("#es-form").reportValidity()&&pool().length)start();});
    update();
  }
  function update(){
    const p=pool(),visual=p.filter(q=>q.media).length,input=root.querySelector("#es-size"),valid=Number.isInteger(state.size)&&state.size>=1&&state.size<=p.length;
    input.max=String(Math.max(1,p.length));
    input.setCustomValidity(!p.length?"Select chapters and topics with available questions.":!valid?`Choose a whole number from 1 to ${p.length}.`:"");
    root.querySelector("#es-pool-count").textContent=p.length;
    root.querySelector("#es-size-help").textContent=p.length?`Choose 1–${p.length}. No duplicate questions within a session.`:"No matching questions. Change your filters or practice focus.";
    const timeValid=state.timingMode!=="countdown"||(Number.isInteger(state.timerMinutes)&&state.timerMinutes>=1&&state.timerMinutes<=240);
    root.querySelector("#es-timer-minutes").setCustomValidity(timeValid?"":"Choose a whole number of minutes from 1 to 240.");
    root.querySelector("#es-start").disabled=!valid||!p.length||!timeValid;
    root.querySelectorAll("[data-size]").forEach(b=>{b.setAttribute("aria-pressed",String(Number(b.dataset.size)===state.size));b.disabled=!p.length;});
    root.querySelector("#es-all").disabled=!p.length;
    const fresh=p.filter(q=>!history.seen.includes(q.id)).length;
    const timingPlan=state.timingMode==="off"?"Timing off.":state.timingMode==="stopwatch"?"Stopwatch enabled.":timeValid?`${state.timerMinutes}-minute countdown enabled. Reaching zero will not end your session.`:"Choose a valid countdown duration.";
    root.querySelector("#es-plan").innerHTML=p.length?`<strong>${p.length-visual} text + ${visual} visual / interactive questions</strong><span>${fresh} not yet answered in this pool. ${history.missed.length} marked for review across both chapters.</span><small>Fresh questions first within each format. Longer sessions may revisit earlier questions. Choose your answer to reveal the explanation. ${timingPlan}</small>`:`<strong>No questions match this selection.</strong><span>${state.mode==="missed"?"There may be no missed questions in these chapters and topics yet. Try the full bank.":"Select at least one chapter and one topic."}</span>`;
  }
  function choose(items,n){
    return [...shuffle(items.filter(q=>!history.seen.includes(q.id))),...shuffle(items.filter(q=>history.seen.includes(q.id)))].slice(0,n);
  }
  function start(){
    const p=pool(),n=Math.min(state.size,p.length),visual=p.filter(q=>q.media),text=p.filter(q=>!q.media);
    if(!n)return;
    const nv=visual.length?Math.min(visual.length,Math.max(1,Math.round(n*0.3)),n):0;
    let chosen=[...choose(visual,nv),...choose(text,n-nv)];
    if(chosen.length<n){const used=new Set(chosen.map(q=>q.id));chosen.push(...choose(p.filter(q=>!used.has(q.id)),n-chosen.length));}
    state.session=shuffle(chosen).map(q=>({...q,order:shuffle(q.options.map((_,i)=>i))}));
    state.cursor=0;state.answers=[];
    // Switching away from an invalid, disabled countdown field must not prevent
    // an untimed/stopwatch session or leave an unusable in-session countdown.
    if(!Number.isInteger(state.timerMinutes)||state.timerMinutes<1||state.timerMinutes>240)state.timerMinutes=15;
    clock.start(state.timingMode,state.timerMinutes);sessionActive=true;
    question();runClockLoop();scroll();
  }
  function question(){
    const q=state.session[state.cursor],score=state.answers.filter(a=>a.correct).length;
    const animated=q.media&&!["figure","grid"].includes(q.media.kind);
    root.classList.toggle("es-paused",state.paused);
    root.innerHTML=`<section class="es-quiz" aria-labelledby="es-question">
      <div class="es-quiz-top"><button id="es-exit" class="es-text-button">← End session</button><span>Question ${state.cursor+1} of ${state.session.length}</span><span>${score} / ${state.answers.length} correct</span></div>
      ${clockToolbar()}
      <progress value="${state.cursor}" max="${state.session.length}" aria-label="Session progress"></progress>
      <div class="es-question-tags"><span>CHAPTER ${q.chapter}</span><span>${h(q.section)}</span><span>${h(q.topic)}</span></div>
      <h2 id="es-question" tabindex="-1">${h(q.prompt)}</h2>
      ${q.media?`<div class="es-media-panel">${animated?`<div class="es-motion-row"><button id="es-motion" type="button" aria-pressed="${state.paused}">${state.paused?"Play animation":"Pause animation"}</button><span>Controls still work when paused.</span></div>`:""}<div id="es-lab"></div></div>`:""}
      <div class="es-answer-label" id="es-answer-label">Choose one answer</div><div class="es-options" role="group" aria-labelledby="es-answer-label">${q.order.map((i,pos)=>`<button type="button" data-option="${i}"><b aria-hidden="true">${String.fromCharCode(65+pos)}</b><span>${h(q.options[i])}</span><span class="es-option-result"></span></button>`).join("")}</div>
      <div id="es-feedback" aria-live="polite"></div>
    </section>`;
    if(q.media)lab.mount(root.querySelector("#es-lab"),q.media);
    root.querySelector("#es-session-timing-mode").addEventListener("change",e=>{
      state.timingMode=e.target.value;clock.start(state.timingMode,state.timerMinutes);runClockLoop();
    });
    root.querySelector("#es-clock-pause").addEventListener("click",()=>{clock.snapshot().running?clock.pause():clock.resume();runClockLoop();});
    updateClock();
    root.querySelector("#es-motion")?.addEventListener("click",e=>{state.paused=!state.paused;root.classList.toggle("es-paused",state.paused);e.currentTarget.textContent=state.paused?"Play animation":"Pause animation";e.currentTarget.setAttribute("aria-pressed",String(state.paused));});
    root.querySelector("#es-exit").addEventListener("click",()=>{if(window.confirm("End this session? Answers already checked will stay in your study history.")){if(state.answers.length)report(true);else{setup();focus("#es-builder-title");}}});
    root.querySelectorAll("[data-option]").forEach(b=>b.addEventListener("click",()=>answer(Number(b.dataset.option))));
    focus("#es-question");
  }
  function answer(choice){
    if(state.answers.length>state.cursor)return;
    const q=state.session[state.cursor],correct=choice===q.answer;
    state.answers.push({choice,correct});
    if(state.answers.length===state.session.length){finishClock();updateClock();}
    if(!history.seen.includes(q.id))history.seen.push(q.id);
    if(correct)history.missed=history.missed.filter(id=>id!==q.id);
    else if(!history.missed.includes(q.id))history.missed.push(q.id);
    save();
    root.querySelectorAll("[data-option]").forEach(b=>{
      b.disabled=true;const i=Number(b.dataset.option);
      if(i===q.answer){b.classList.add("es-correct");b.querySelector(".es-option-result").textContent="✓ Correct";}
      else if(i===choice){b.classList.add("es-incorrect");b.querySelector(".es-option-result").textContent="× Your answer";}
    });
    const feedback=root.querySelector("#es-feedback");
    feedback.className=`es-feedback ${correct?"es-feedback-correct":""}`;
    feedback.innerHTML=`<h3 tabindex="-1" id="es-result">${correct?"Correct.":"Not quite. Here is the reasoning."}</h3><p>${h(q.explanation)}</p><p class="es-answer-source"><a href="${bank.chapters[q.chapter].href}" target="_blank" rel="noopener">Study Chapter ${q.chapter} ↗</a> · Based on ${h(bank.chapters[q.chapter].deck)}, slide ${q.slide}.</p><button id="es-next" class="es-button es-primary">${state.cursor+1===state.session.length?"See my results":"Next question"} →</button>${!persistent?'<p class="es-help">Progress is available for this visit only; browser storage is unavailable.</p>':""}`;
    root.querySelector("#es-next").addEventListener("click",()=>{state.cursor++;if(state.cursor<state.session.length)question();else report();});
    focus("#es-result");
  }
  function report(early=false){
    finishClock();
    const timingReport=clockSummary();
    const attempted=state.answers.length,correct=state.answers.filter(a=>a.correct).length,percent=attempted?Math.round(correct/attempted*100):0;
    const answered=state.session.slice(0,attempted);
    root.innerHTML=`<section class="es-report" aria-labelledby="es-report-title"><span class="es-eyebrow">${early?"SESSION ENDED":"SESSION COMPLETE"}</span><h2 id="es-report-title" tabindex="-1">${correct===attempted?"Well done. Explain the mechanisms next.":"Good practice. Your next steps are below."}</h2>
      <div class="es-result-summary"><strong>${percent}<small>%</small></strong><div>${correct} correct of ${attempted} answered${early?` · ${state.session.length-attempted} not attempted`:""}<p>This practice score is not a prediction of an exam grade.</p></div></div>
      <p class="es-report-timing">${h(timingReport)}</p>
      <div class="es-breakdown">${[9,10].map(ch=>{const indices=answered.map((q,i)=>q.chapter===ch?i:-1).filter(i=>i>=0);if(!indices.length)return"";const hits=indices.filter(i=>state.answers[i].correct).length;return`<div><span>Chapter ${ch}</span><progress max="${indices.length}" value="${hits}" aria-label="Chapter ${ch}: ${hits} correct of ${indices.length}"></progress><strong>${hits}/${indices.length}</strong></div>`;}).join("")}</div>
      <div class="es-start-row"><button id="es-new" class="es-button es-primary">Build another session</button><button id="es-review-missed" class="es-button" ${history.missed.length?"":"disabled"}>Practice missed questions (${history.missed.length})</button><button id="es-download" class="es-text-button">Download session notes</button></div>
      <h3>Review your answers</h3><p class="es-help">Missed concepts stay in your review list until you answer them correctly. Open a row for the reasoning and lesson link.</p>
      <div class="es-review-list">${answered.map((q,i)=>`<details ${state.answers[i].correct?"":"open"}><summary><span>${state.answers[i].correct?"✓":"×"}</span> ${i+1}. ${h(q.prompt)}</summary><p><strong>Your answer:</strong> ${h(q.options[state.answers[i].choice])}</p>${state.answers[i].correct?"":`<p><strong>Correct answer:</strong> ${h(q.options[q.answer])}</p>`}<p>${h(q.explanation)}</p><a href="${bank.chapters[q.chapter].href}" target="_blank" rel="noopener">Study Chapter ${q.chapter} ↗</a><small> ${h(bank.chapters[q.chapter].deck)}, slide ${q.slide}.</small></details>`).join("")}</div></section>`;
    root.querySelector("#es-new").addEventListener("click",()=>{setup();focus("#es-builder-title");scroll();});
    root.querySelector("#es-review-missed").addEventListener("click",()=>{state.mode="missed";state.chapters=[9,10];state.sections=["Science","Issues","Solutions"];state.media=true;state.size=Math.min(10,history.missed.length);setup();focus("#es-builder-title");scroll();});
    root.querySelector("#es-download").addEventListener("click",()=>{
      const text=[`Environmental Science practice\n${correct}/${attempted} correct\n${timingReport}\nOriginal study questions, not an official assessment.\n`,
        ...answered.map((q,i)=>`${i+1}. Chapter ${q.chapter} — ${q.section}\n${q.prompt}\nYour answer: ${q.options[state.answers[i].choice]}\nCorrect answer: ${q.options[q.answer]}\n${q.explanation}\nSource: ${bank.chapters[q.chapter].deck}, slide ${q.slide}\n`)].join("\n");
      const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"})),a=document.createElement("a");
      a.href=url;a.download="environmental-science-session.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    focus("#es-report-title");scroll();
  }
  setup();
}());
