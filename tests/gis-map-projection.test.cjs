const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../research-work/gis-eztool/viewer/map-projection.js'),'utf8');
  const {project,unproject,splitDateline,HALF_WIDTH,HALF_HEIGHT}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  assert.deepEqual(project(0,0),{x:0,y:0});
  const example=project(122,47);assert.equal(example.x.toFixed(2),'1.55');assert.equal(example.y.toFixed(2),'0.89'); // PROJ's published spherical example.
  for(const lat of [-90,-89.9,-60,-23.5,0,23.5,60,89.9,90])for(const lon of [-180,-179.99,-94.174,0,122,179.99,180]){
    const xy=project(lon,lat),ll=unproject(xy.x,xy.y);
    assert(ll);assert(Math.abs(ll.lon-lon)<1e-6);assert(Math.abs(ll.lat-lat)<1e-6);
    assert(Math.abs(xy.x)<=HALF_WIDTH+1e-10&&Math.abs(xy.y)<=HALF_HEIGHT+1e-10);
  }
  // Numerical area Jacobian: dx dy = cos(latitude) d(longitude) d(latitude).
  const delta=1e-4,D=Math.PI/180;
  for(const lat of [-80,-60,-30,0,30,60,80]){
    const a=project(30+delta,lat),b=project(30-delta,lat),c=project(30,lat+delta),d=project(30,lat-delta);
    const area=((a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x))/(4*(delta*D)**2);
    assert(Math.abs(area/Math.cos(lat*D)-1)<1e-7,'Equal-area property');
  }
  assert.equal(project(0,91),null);assert.equal(project(NaN,0),null);
  assert.equal(unproject(10,0),null);assert.equal(unproject(0,HALF_HEIGHT+1),null);
  for(const points of [[{lon:170,lat:10},{lon:-170,lat:20}],[{lon:-175,lat:70},{lon:175,lat:72}],[{lon:180,lat:90},{lon:-180,lat:89}]]){
    const pieces=splitDateline(points);assert.equal(pieces.length,2);
    for(const segment of pieces)for(let i=1;i<segment.length;i++){
      assert(Math.abs(segment[i].lon-segment[i-1].lon)<=180);
      assert(Number.isFinite(segment[i].lat));
    }
  }
  const broken=splitDateline([{lon:0,lat:0},{lon:5,lat:5},null,{lon:10,lat:10},{lon:15,lat:15}]);assert.equal(broken.length,2);
  console.log('PASS: Equal Earth reference value, inverse round trips, equal-area Jacobian, poles, domain checks, dateline crossings and missing-position gaps.');
})().catch(e=>{console.error(e);process.exitCode=1;});
