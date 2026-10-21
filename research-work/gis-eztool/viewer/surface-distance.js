// Predicted distance down the WGS84 ellipsoid normal, not a nearest-terrain search.
// Copernicus GLO-90 heights H use EGM2008; satellite.js reports ellipsoid height h.
// Correct the datum before subtracting: clearance = h - (H + N) / 1000.
export function clearanceKm(heightKm, elevationM, geoidM) {
  if (![heightKm,elevationM,geoidM].every(Number.isFinite)) return null;
  const value=heightKm-(elevationM+geoidM)/1000;
  return value>=0 ? value : null;
}

export class GeoidGrid {
  constructor(buffer) {
    if (buffer.byteLength !== 361*720*2) throw Error('Invalid geoid grid');
    this.data=new DataView(buffer);
  }
  at(lat,lon) {
    if (!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90) return null;
    const x=(((lon+180)%360+360)%360)*2, y=(90-lat)*2;
    const x0=Math.floor(x),x1=(x0+1)%720,y0=Math.floor(y),y1=Math.min(360,y0+1);
    const fx=x-x0,fy=y-y0,get=(row,col)=>this.data.getInt16((row*720+col)*2,true)*.01;
    return (get(y0,x0)*(1-fx)+get(y0,x1)*fx)*(1-fy)+(get(y1,x0)*(1-fx)+get(y1,x1)*fx)*fy;
  }
}

export class SurfaceDistance {
  constructor({fetcher=(...args)=>fetch(...args),clock=()=>Date.now(),geoidURL='assets/egm2008-0.5deg.bin'}={}) {
    this.fetcher=fetcher;this.clock=clock;this.geoidURL=geoidURL;
    this.enabled=false;this.grid=null;this.busy=false;this.generation=0;
    this.nextRequest=0;this.retryAt=0;this.samples=new Map();this.cache=new Map();
    this.controller=null;this.error=null;this.requests=0;
  }
  setEnabled(enabled) {
    if (enabled===this.enabled) return;
    this.enabled=enabled;this.invalidate();
    // Preserve rate-limit backoff even if the switch is toggled repeatedly.
  }
  invalidate() {
    this.generation++;this.samples.clear();
    this.controller?.abort();this.controller=null;this.busy=false;
  }
  key(point) { return `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`; }
  async update(points,simTime,eligible) {
    if (!this.enabled||!eligible||this.busy) return;
    const valid=points.filter(p=>[p.lat,p.lon,p.heightKm].every(Number.isFinite)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180&&p.heightKm>=0).slice(0,12);
    const needed=valid.filter(p=>{const s=this.samples.get(p.id);return !s||s.simTime!==simTime||s.key!==this.key(p)||s.heightKm!==p.heightKm;});
    if (!needed.length) return; // Paused at an already sampled position: no repeat requests.
    const now=this.clock();
    if (now<this.retryAt) return;
    const missing=needed.filter(p=>!this.cache.has(this.key(p)));
    if (missing.length&&now<this.nextRequest) return;
    const generation=this.generation;
    const controller=new AbortController();this.controller=controller;this.busy=true;
    const timer=setTimeout(()=>controller.abort(),12000);
    const options={signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'};
    try {
      if (!this.grid) {
        const response=await this.fetcher(this.geoidURL,options);
        if (!response.ok) throw Error('Geoid unavailable');
        this.grid=new GeoidGrid(await response.arrayBuffer());
      }
      if (generation!==this.generation) return;
      if (missing.length) {
        this.nextRequest=this.clock()+5000;this.requests++;
        const query=new URLSearchParams({latitude:missing.map(p=>p.lat.toFixed(4)).join(','),longitude:missing.map(p=>p.lon.toFixed(4)).join(',')});
        const response=await this.fetcher(`https://api.open-meteo.com/v1/elevation?${query}`,options);
        if (!response.ok) {
          const retry=Number(response.headers?.get('retry-after'));
          this.retryAt=this.clock()+Math.max(60000,Math.min(3600000,Number.isFinite(retry)?retry*1000:0));
          throw Error('Elevation service unavailable');
        }
        const result=await response.json();
        if (!Array.isArray(result.elevation)||result.elevation.length!==missing.length) throw Error('Invalid elevation response');
        if (generation!==this.generation) return;
        missing.forEach((p,i)=>{
          const h=result.elevation[i];
          // Do not turn null into sea level or clamp legitimate negative land elevations.
          if (typeof h==='number'&&Number.isFinite(h)&&h>=-1000&&h<=10000) this.cache.set(this.key(p),h);
          else this.samples.set(p.id,{kind:'unavailable',simTime,key:this.key(p)});
        });
        while (this.cache.size>256) this.cache.delete(this.cache.keys().next().value);
      }
      if (generation!==this.generation) return;
      this.error=null;
      for (const p of needed) {
        const key=this.key(p);
        if (!this.cache.has(key)) continue;
        const elevationM=this.cache.get(key),geoidM=this.grid.at(p.lat,p.lon);
        const distanceKm=clearanceKm(p.heightKm,elevationM,geoidM);
        this.samples.set(p.id,{...p,key,simTime,elevationM,geoidM,distanceKm,kind:distanceKm===null?'unavailable':'ready'});
      }
    } catch {
      if (generation===this.generation) {
        this.error='Elevation or height-reference data unavailable';
        this.retryAt=Math.max(this.retryAt,this.clock()+60000);
      }
    } finally {
      clearTimeout(timer);
      if (generation===this.generation) {this.busy=false;this.controller=null;}
    }
  }
  reading(id,simTime,eligible) {
    if (!this.enabled) return {kind:'off'};
    if (!eligible) return {kind:'fast'};
    const sample=this.samples.get(id),age=sample ? (simTime-sample.simTime)/1000 : Infinity;
    // Never attach a distant-time terrain sample to the current satellite position.
    if (sample&&age>=0&&age<=15) return {...sample,ageSeconds:age};
    return {kind:this.error?'unavailable':this.busy?'loading':'waiting'};
  }
}
