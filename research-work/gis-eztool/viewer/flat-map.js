import * as THREE from 'three';
import {project,unproject,splitDateline,HALF_WIDTH,HALF_HEIGHT} from 'map-projection';

const D=Math.PI/180;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export class FlatMap {
  constructor(renderer,texture,onSelect,onPan){
    this.renderer=renderer;this.onSelect=onSelect;this.onPan=onPan;
    this.active=false;this.zoom=1;this.center={x:0,y:0};this.points=[];this.pointers=new Map();
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-3,3,2,-2,.1,10);this.camera.position.z=5;
    // Texture coordinates remain geographic; vertex positions are reprojected.
    const mesh=new THREE.PlaneGeometry(360,180,360,180),position=mesh.attributes.position;
    for(let i=0;i<position.count;i++){const p=project(position.getX(i),position.getY(i));position.setXYZ(i,p.x,p.y,0);}
    position.needsUpdate=true;mesh.computeBoundingSphere();
    this.scene.add(new THREE.Mesh(mesh,new THREE.MeshBasicMaterial({map:texture,depthTest:false})));
    this.grid=new THREE.Group();this.grid.renderOrder=1;this.scene.add(this.grid);
    for(let lat=-60;lat<=60;lat+=30)this.addLine(this.grid,Array.from({length:181},(_,i)=>({lon:-180+i*2,lat})),lat===0?0x9ce8da:0xa4c1cc,lat===0?.4:.17);
    for(let lon=-180;lon<=180;lon+=30)this.addLine(this.grid,Array.from({length:91},(_,i)=>({lon,lat:-90+i*2})),0xa4c1cc,.17);
    for(const lat of [-90,90])this.addLine(this.grid,[{lon:-180,lat},{lon:180,lat}],0xa4c1cc,.35);
    this.tracks=new THREE.Group();this.tracks.renderOrder=2;this.scene.add(this.tracks);
    this.horizon=new THREE.Group();this.horizon.renderOrder=3;this.scene.add(this.horizon);
    this.markers=new THREE.Group();this.markers.renderOrder=4;this.scene.add(this.markers);
    this.markerObjects=new Map();this.lastTracks=-Infinity;this.lastHorizon=-Infinity;
    this.bindInput(renderer.domElement);
  }
  clear(group){for(const child of [...group.children]){group.remove(child);child.geometry.dispose();child.material.dispose();}}
  addLine(group,points,color,opacity=1,split=false){
    for(const segment of split?splitDateline(points):[points]){
      const coords=segment.map(p=>project(p.lon,p.lat)).filter(Boolean).map(p=>new THREE.Vector3(p.x,p.y,.01));
      if(coords.length<2)continue;
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(coords),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthTest:false})));
    }
  }
  setBounds(bounds){
    this.bounds=bounds;this.scale=Math.min(bounds.width/(2*HALF_WIDTH),bounds.height/(2*HALF_HEIGHT))*.91*this.zoom;
    this.constrain();this.syncCamera();
  }
  constrain(){
    // Keep the center inside Earth; Fit world is always available if panned away.
    this.center.x=clamp(this.center.x,-HALF_WIDTH,HALF_WIDTH);
    this.center.y=clamp(this.center.y,-HALF_HEIGHT,HALF_HEIGHT);
  }
  syncCamera(){
    if(!this.bounds)return;
    const w=this.bounds.width/(2*this.scale),h=this.bounds.height/(2*this.scale);
    Object.assign(this.camera,{left:this.center.x-w,right:this.center.x+w,top:this.center.y+h,bottom:this.center.y-h});
    this.camera.updateProjectionMatrix();
  }
  fit(){this.zoom=1;this.center={x:0,y:0};if(this.bounds)this.setBounds(this.bounds);}
  screen(lon,lat){
    const p=project(lon,lat),b=this.bounds;if(!p||!b)return null;
    return {x:b.left+b.width/2+(p.x-this.center.x)*this.scale,y:b.top+b.height/2-(p.y-this.center.y)*this.scale};
  }
  at(x,y){const b=this.bounds;return unproject(this.center.x+(x-b.left-b.width/2)/this.scale,this.center.y-(y-b.top-b.height/2)/this.scale);}
  contains(x,y){const b=this.bounds;return b&&x>=b.left&&x<=b.left+b.width&&y>=b.top&&y<=b.top+b.height;}
  zoomBy(factor,x=this.bounds.left+this.bounds.width/2,y=this.bounds.top+this.bounds.height/2){
    const b=this.bounds,old=this.scale,px=x-b.left-b.width/2,py=y-b.top-b.height/2;
    this.zoom=clamp(this.zoom*factor,1,8);this.setBounds(b);
    this.center.x+=px/old-px/this.scale;this.center.y-=py/old-py/this.scale;this.constrain();this.syncCamera();
  }
  pan(dx,dy){this.center.x-=dx/this.scale;this.center.y+=dy/this.scale;this.constrain();this.syncCamera();}
  bindInput(canvas){
    canvas.addEventListener('pointerdown',e=>{
      if(!this.active||!this.contains(e.clientX,e.clientY))return;
      this.onPan();canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      this.tap=this.pointers.size===1?{x:e.clientX,y:e.clientY}:null;
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.active||!this.pointers.has(e.pointerId))return;
      const old=[...this.pointers.values()],previous=this.pointers.get(e.pointerId);
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const now=[...this.pointers.values()];
      if(this.tap&&Math.hypot(e.clientX-this.tap.x,e.clientY-this.tap.y)>6)this.tap=null;
      if(now.length===1)this.pan(e.clientX-previous.x,e.clientY-previous.y);
      else if(now.length===2){
        const distance=a=>Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),middle=a=>({x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2});
        const a=middle(old),b=middle(now);if(distance(old)>1)this.zoomBy(distance(now)/distance(old),a.x,a.y);this.pan(b.x-a.x,b.y-a.y);
      }
    });
    const end=e=>{
      if(!this.pointers.has(e.pointerId))return;
      if(e.type==='pointerup'&&this.tap&&this.pointers.size===1){
        const hit=this.points.map(p=>({...p,d:Math.hypot(p.x-e.clientX,p.y-e.clientY)})).filter(p=>p.d<20).sort((a,b)=>a.d-b.d)[0];
        if(hit)this.onSelect(hit.id);
      }
      this.pointers.delete(e.pointerId);this.tap=null;
    };
    for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end);
    canvas.addEventListener('wheel',e=>{if(!this.active||!this.contains(e.clientX,e.clientY))return;e.preventDefault();this.onPan();this.zoomBy(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
    canvas.addEventListener('keydown',e=>{
      if(!this.active)return;
      const pan={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];
      if(pan){e.preventDefault();this.onPan();this.pan(...pan);}
      else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();this.onPan();e.key==='Home'?this.fit():this.zoomBy(e.key==='-'?1/1.5:1.5);}
    });
  }
  invalidate(){this.lastTracks=-Infinity;this.trackKey='';}
  update({missions,selected,simTime,now,filter,palette,positionAt,satellite,allTracks,ground,horizon,follow,site}){
    const date=new Date(simTime),visible=missions.filter(m=>m.valid&&(filter==='all'||m.category===filter));
    const geoAt=(m,time)=>{const p=positionAt(m,new Date(time));if(!p)return null;const g=satellite.eciToGeodetic(p.position,satellite.gstime(new Date(time)));return {lon:g.longitude/D,lat:g.latitude/D,height:g.height};};
    const current=visible.map(m=>({m,g:geoAt(m,simTime)})).filter(p=>p.g);
    const chosen=current.find(p=>p.m===selected);
    if(follow&&chosen){this.center=project(chosen.g.lon,chosen.g.lat);this.syncCamera();}
    const key=[selected.id,filter,allTracks,ground,...visible.map(m=>m.satrec.jdsatepoch)].join(':');
    if(key!==this.trackKey||(Math.abs(simTime-this.trackTime)>20000&&now-this.lastTracks>400)){
      this.clear(this.tracks);this.trackSegments=0;
      for(const m of visible){
        if(!allTracks&&!(m===selected&&ground))continue;
        const period=2*Math.PI/m.satrec.no*60000;
        const future=Array.from({length:241},(_,i)=>geoAt(m,simTime+period*i/240));
        this.addLine(this.tracks,future,m===selected&&ground?0xa9f4cc:palette[m.category],m===selected&&ground?.95:.22,true);
        if(m===selected&&ground){const past=Array.from({length:161},(_,i)=>geoAt(m,simTime-period*(160-i)/240));this.addLine(this.tracks,past,0xc0d0de,.6,true);}
      }
      this.trackSegments=this.tracks.children.length;this.trackKey=key;this.lastTracks=now;this.trackTime=simTime;
    }
    if(now-this.lastHorizon>250||this.horizonEnabled!==horizon||this.horizonMission!==selected.id){
      this.clear(this.horizon);this.horizonEnabled=horizon;this.horizonMission=selected.id;this.lastHorizon=now;
      if(horizon&&chosen){
        const {lat,lon,height}=chosen.g,p=lat*D,l=lon*D,a=Math.acos(6378.137/(6378.137+height));
        const ring=Array.from({length:181},(_,i)=>{
          const bearing=i*2*D,phi=Math.asin(clamp(Math.sin(p)*Math.cos(a)+Math.cos(p)*Math.sin(a)*Math.cos(bearing),-1,1));
          const lambda=l+Math.atan2(Math.sin(bearing)*Math.sin(a)*Math.cos(p),Math.cos(a)-Math.sin(p)*Math.sin(phi));
          return {lat:phi/D,lon:((lambda/D+540)%360)-180};
        });
        this.addLine(this.horizon,ring,0xffc772,.8,true);
      }
    }
    for(const marker of this.markerObjects.values())marker.visible=false;
    this.points=[];
    for(const {m,g} of current){
      let marker=this.markerObjects.get(m.id);
      if(!marker){marker=new THREE.Mesh(new THREE.RingGeometry(.48,1,20),new THREE.MeshBasicMaterial({color:palette[m.category],depthTest:false}));this.markers.add(marker);this.markerObjects.set(m.id,marker);}
      const p=project(g.lon,g.lat);marker.position.set(p.x,p.y,.04);marker.scale.setScalar((m===selected?7:5)/this.scale);marker.visible=true;
      const screen=this.screen(g.lon,g.lat);if(this.contains(screen.x,screen.y))this.points.push({id:m.id,...screen,lon:g.lon,lat:g.lat});
    }
    if(site){
      if(!this.site){this.site=new THREE.Mesh(new THREE.CircleGeometry(1,4),new THREE.MeshBasicMaterial({color:0xffc772,depthTest:false}));this.markers.add(this.site);}
      const p=project(site.lon,site.lat);this.site.position.set(p.x,p.y,.05);this.site.scale.setScalar(6/this.scale);
    }
    return this.points;
  }
  render(){
    const r=this.renderer,b=this.bounds;r.setScissorTest(false);r.setViewport(0,0,innerWidth,innerHeight);r.clear();
    r.setViewport(b.left,innerHeight-b.top-b.height,b.width,b.height);r.setScissor(b.left,innerHeight-b.top-b.height,b.width,b.height);r.setScissorTest(true);r.render(this.scene,this.camera);
    r.setScissorTest(false);r.setViewport(0,0,innerWidth,innerHeight);
  }
  get state(){return {active:this.active,projection:'Equal Earth (spherical)',zoom:this.zoom,center:{...this.center},bounds:this.bounds,trackSegments:this.trackSegments||0,points:this.points};}
}
