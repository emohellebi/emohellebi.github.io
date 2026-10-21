const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');

(async()=>{
  const root=path.join(__dirname,'../research-work/gis-eztool/viewer');
  const source=await fs.readFile(path.join(root,'surface-distance.js'),'utf8');
  const {clearanceKm,GeoidGrid,SurfaceDistance}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  assert.equal(clearanceKm(400,0,0),400);
  assert.equal(clearanceKm(400,4000,0),396);
  assert.equal(clearanceKm(400,-430,0),400.43);
  assert.equal(clearanceKm(400,1000,-30),399.03);
  assert.equal(clearanceKm(400,null,0),null);
  assert.equal(clearanceKm(1,2000,0),null);
  const file=await fs.readFile(path.join(root,'assets/egm2008-0.5deg.bin'));
  const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
  const grid=new GeoidGrid(buffer);
  for(const lat of [-90,-89.9,0,36.068,89.9,90]) {
    assert(Number.isFinite(grid.at(lat,180)));
    assert.equal(grid.at(lat,180),grid.at(lat,-180));
    assert.equal(grid.at(lat,540),grid.at(lat,-180));
  }
  assert(grid.at(36.068,-94.174)<0,'US geoid offset should be negative here');
  assert.equal(grid.at(91,0),null);
  assert.throws(()=>new GeoidGrid(new ArrayBuffer(4)));
  let wall=0,calls=0,mode='ok';
  const points=[0,1,2,3].map(id=>({id,lat:id,lon:id,heightKm:400}));
  const sampler=new SurfaceDistance({clock:()=>wall,fetcher:async url=>{
    if(!url.startsWith('https:'))return {ok:true,arrayBuffer:async()=>buffer};
    calls++;
    if(mode==='failure')return {ok:false,headers:new Headers({'retry-after':'120'})};
    if(mode==='malformed')return {ok:true,json:async()=>({elevation:[0]})};
    return {ok:true,json:async()=>({elevation:[0,4000,-430,null]})};
  }});
  await sampler.update(points,1000,true);assert.equal(calls,0,'Off by default');
  sampler.setEnabled(true);await sampler.update(points,1000,true);
  assert.equal(calls,1);assert.equal(sampler.reading(0,1000,true).elevationM,0);
  assert.equal(sampler.reading(1,1000,true).elevationM,4000);
  assert.equal(sampler.reading(2,1000,true).elevationM,-430);
  assert.equal(sampler.reading(3,1000,true).kind,'unavailable');
  const saved=sampler.reading(0,1000,true).distanceKm;
  assert.equal(sampler.reading(0,9000,true).distanceKm,saved,'Snapshot is not mixed with new altitude');
  assert.equal(sampler.reading(0,17000,true).kind,'waiting','Stale sample hidden');
  assert.equal(sampler.reading(0,999,true).kind,'waiting','Future sample hidden');
  assert.equal(sampler.reading(0,1000,false).kind,'fast');
  await sampler.update(points,1000,true);assert.equal(calls,1,'Paused query not repeated immediately');
  await sampler.update(points.map(p=>({...p,lat:p.lat+1})),2000,true);assert.equal(calls,1,'Five-second throttle');
  wall=5000;await sampler.update(points,2000,false);assert.equal(calls,1,'No sampling in fast-forward');
  mode='failure';await sampler.update(points.map(p=>({...p,lat:p.lat+10})),20000,true);
  assert.equal(calls,2);assert.equal(sampler.reading(0,20000,true).kind,'unavailable');
  sampler.setEnabled(false);sampler.setEnabled(true);wall=65000;
  await sampler.update(points,21000,true);assert.equal(calls,2,'Toggling cannot bypass retry-after');
  wall=130000;mode='malformed';await sampler.update(points.map(p=>({...p,lat:p.lat+10})),22000,true);
  assert.equal(sampler.reading(0,22000,true).kind,'unavailable');

  let resolveRequest;
  const delayed=new SurfaceDistance({clock:()=>0,fetcher:()=>new Promise(r=>resolveRequest=r)});
  delayed.setEnabled(true);const request=delayed.update(points,1000,true);
  delayed.setEnabled(false);resolveRequest({ok:true,arrayBuffer:async()=>buffer});await request;
  assert.equal(delayed.samples.size,0,'Disabled in-flight response must not populate labels');
  assert.equal(delayed.reading(0,1000,true).kind,'off');
  console.log('PASS: mountain/ocean/depression arithmetic; datum correction; actual geoid grid and wrap/poles; opt-in, throttle, synchronized snapshots, stale/future rejection, fast-forward, null/malformed/failure/backoff, cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
