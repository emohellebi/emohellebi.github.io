// Run: node --test tests/environmental-science-exam.test.cjs
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const repo=path.resolve(__dirname,".."),context={window:{}};
vm.createContext(context);
for(const file of ["assets/data/environmental-science-question-bank.js","assets/js/environmental-science-lab.js","assets/js/environmental-science-clock.js"])
  vm.runInContext(fs.readFileSync(path.join(repo,file),"utf8"),context,{filename:file});
const bank=context.window.ENV_SCIENCE_BANK,m=context.window.ENV_SCIENCE_LAB.models;
test("bank is balanced, unique, sourced and has one declared correct choice",()=>{
  assert.equal(bank.questions.length,160);
  assert.equal(new Set(bank.questions.map(q=>q.id)).size,160);
  assert.equal(new Set(bank.questions.map(q=>q.prompt)).size,160);
  for(const ch of [9,10])assert.equal(bank.questions.filter(q=>q.chapter===ch).length,80);
  assert.equal(bank.questions.filter(q=>q.media).length,20);
  for(const q of bank.questions){
    assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);
    assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id);
    assert.ok(["Science","Issues","Solutions"].includes(q.section),q.id);
    assert.ok(q.slide>=1&&q.slide<=(q.chapter===9?60:48),q.id);
    assert.ok(q.explanation.length>35,q.id);
  }
});
test("every referenced course figure exists",()=>{
  for(const q of bank.questions.filter(q=>q.media?.kind==="figure"))
    assert.ok(fs.existsSync(path.join(repo,"teaching/courses/environmental-science/lectures/energy-assets/figures",q.media.asset+".webp")),q.id);
});
test("thermal balance and storage conserve the stated input",()=>{
  for(let efficiency=0;efficiency<=100;efficiency++){
    const h=m.heat(efficiency),s=m.storage(efficiency);
    assert.equal(h.electricity+h.heat,100);
    assert.ok(Math.abs(s.delivered+s.loss-2)<1e-12);
  }
  assert.equal(m.storage(80).delivered,1.6);
});
test("solar angle and hydropower examples agree with their equations",()=>{
  assert.equal(m.solar(0),100);
  assert.ok(Math.abs(m.solar(60)-50)<1e-10);
  assert.ok(Math.abs(m.solar(90))<1e-10);
  assert.ok(Math.abs(m.hydro(20)-156.96)<1e-10);
  assert.equal(m.hydro(30)/m.hydro(10),3);
});
test("grid checks power and usable energy independently",()=>{
  assert.equal(m.grid(3,10).gap,3);assert.equal(m.grid(3,10).energy,12);
  assert.ok(m.grid(3,10).powerOK&&m.grid(3,10).energyOK);
  assert.equal(m.grid(1,10).gap,5);assert.equal(m.grid(1,10).energy,20);
  assert.ok(!m.grid(1,10).powerOK&&!m.grid(1,10).energyOK);
  assert.ok(m.grid(1,8).powerOK&&m.grid(1,8).energyOK);
  assert.equal(m.grid(6,6).gap,0);
});
const {createClock,formatTime}=context.window.ENV_SCIENCE_CLOCK;
test("timing is off by default and does not accumulate elapsed time",()=>{
  let now=1000;const clock=createClock(()=>now);
  now+=120000;clock.resume();
  assert.equal(clock.snapshot().mode,"off");assert.equal(clock.snapshot().elapsedMs,0);
  assert.equal(clock.snapshot().running,false);
});
test("stopwatch uses timestamps and excludes paused intervals",()=>{
  let now=0;const clock=createClock(()=>now);clock.start("stopwatch");
  now=12345;assert.equal(clock.snapshot().elapsedMs,12345);
  clock.pause();now+=300000;assert.equal(clock.snapshot().elapsedMs,12345);
  clock.pause();clock.resume();clock.resume();now+=1000;
  assert.equal(clock.snapshot().elapsedMs,13345);
});
test("countdown expires at zero without becoming negative or stopping elapsed time",()=>{
  let now=0;const clock=createClock(()=>now);clock.start("countdown",1);
  now=59999;assert.equal(clock.snapshot().remainingMs,1);assert.equal(clock.snapshot().expired,false);
  now=60000;assert.equal(clock.snapshot().remainingMs,0);assert.equal(clock.snapshot().expired,true);
  now=180000;assert.equal(clock.snapshot().remainingMs,0);assert.equal(clock.snapshot().elapsedMs,180000);
  assert.equal(clock.snapshot().running,true);
});
test("countdown pause preserves the remaining target across a long gap",()=>{
  let now=0;const clock=createClock(()=>now);clock.start("countdown",15);
  now=5000;clock.pause();now+=3600000;assert.equal(clock.snapshot().remainingMs,895000);
  clock.resume();now+=10000;assert.equal(clock.snapshot().remainingMs,885000);
});
test("changing timing mode starts fresh and turning it off clears the running clock",()=>{
  let now=0;const clock=createClock(()=>now);clock.start("stopwatch");now=40000;
  clock.start("countdown",2);assert.equal(clock.snapshot().remainingMs,120000);
  now+=90000;clock.start("off");now+=60000;
  assert.equal(clock.snapshot().elapsedMs,0);assert.equal(clock.snapshot().running,false);
  clock.start("stopwatch");assert.equal(clock.snapshot().elapsedMs,0);
});
test("a finished clock remains frozen while results are read",()=>{
  let now=0;const clock=createClock(()=>now);clock.start("stopwatch");now=9000;clock.pause();
  now+=120000;assert.equal(clock.snapshot().elapsedMs,9000);
});
test("invalid modes and countdown durations are rejected without changing the clock",()=>{
  const clock=createClock(()=>0);clock.start("stopwatch");
  for(const minutes of [0,-1,0.5,241,NaN,Infinity])assert.throws(()=>clock.start("countdown",minutes));
  assert.throws(()=>clock.start("unknown"));assert.equal(clock.snapshot().mode,"stopwatch");
  clock.start("countdown",240);assert.equal(clock.snapshot().limitMs,14400000);
});
test("clock formatting covers subsecond boundaries and multi-hour sessions",()=>{
  assert.equal(formatTime(0),"00:00");assert.equal(formatTime(999),"00:00");
  assert.equal(formatTime(1,true),"00:01");assert.equal(formatTime(60000,true),"01:00");
  assert.equal(formatTime(59999,true),"01:00");assert.equal(formatTime(59999),"00:59");
  assert.equal(formatTime(3901000),"1:05:01");assert.equal(formatTime(-500),"00:00");
});
