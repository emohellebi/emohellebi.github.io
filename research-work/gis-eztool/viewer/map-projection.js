// Spherical Equal Earth, independently implemented from the published equations.
// Šavrič, Patterson & Jenny (2018), doi:10.1080/13658816.2018.1504949.
// Reference / comparison: https://proj.org/en/stable/operations/projections/eqearth.html
const D=Math.PI/180, M=Math.sqrt(3)/2;
const A=1.340264,B=-.081106,C=.000893,E=.003796;
const polynomial=t=>t*(A+B*t*t+C*t**6+E*t**8);
const derivative=t=>A+3*B*t*t+7*C*t**6+9*E*t**8;
export const HALF_WIDTH=Math.PI/(M*A), HALF_HEIGHT=polynomial(Math.PI/3);
export function project(lon,lat){
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
  const t=Math.asin(M*Math.sin(lat*D));
  return {x:lon*D*Math.cos(t)/(M*derivative(t)),y:polynomial(t)};
}
export function unproject(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(y)>HALF_HEIGHT+1e-10)return null;
  let t=y/A;
  for(let i=0;i<12;i++){const step=(polynomial(t)-y)/derivative(t);t-=step;if(Math.abs(step)<1e-12)break;}
  const lon=x*M*derivative(t)/Math.cos(t)/D;
  if(Math.abs(lon)>180+1e-7)return null;
  return {lon:Math.max(-180,Math.min(180,lon)),lat:Math.asin(Math.max(-1,Math.min(1,Math.sin(t)/M)))/D};
}
// Split sampled geographic paths at ±180°. Interpolate to both edges, never
// connect opposite edges across the map. Null samples also break a path.
export function splitDateline(points){
  const lines=[];let line=[],previous=null;
  const flush=()=>{if(line.length>1)lines.push(line);line=[];};
  for(const point of points){
    if(!point||!project(point.lon,point.lat)){flush();previous=null;continue;}
    if(previous&&Math.abs(point.lon-previous.lon)>180){
      const edge=previous.lon>0?180:-180,unwrapped=point.lon+(edge>0?360:-360);
      const ratio=unwrapped===previous.lon?0:(edge-previous.lon)/(unwrapped-previous.lon);
      const lat=previous.lat+(point.lat-previous.lat)*ratio;
      line.push({lon:edge,lat});flush();line.push({lon:-edge,lat});
    }
    line.push(point);previous=point;
  }
  flush();return lines;
}
