import * as THREE from 'three';
import { OrbitControls } from 'orbit-controls';
import { EarthTiles } from 'earth-tiles';
import { SurfaceDistance } from 'surface-distance';
import { FlatMap } from 'flat-map';

const $ = id => document.getElementById(id);
const S = window.satellite;
const R = 6378.137, TAU = Math.PI * 2, D = Math.PI / 180;
const seed = JSON.parse($('seed-data').textContent);
const palette = {human: '#ffc772', land: '#a9f4cc', water: '#65d9ef', weather: '#c3a5ff'};
const catalog = [
  {id:25544,name:'ISS',agency:'International Space Station',category:'human',label:'Human spaceflight',description:'An orbital laboratory circling Earth roughly every 90 minutes. Its low orbit is your reference for understanding speed, scale, and the changing view of our planet.',science:'ECOSTRESS on the ISS measures thermal patterns associated with plant water stress and evapotranspiration. Availability depends on instrument operations and acquisitions.',resolution:'ECOSTRESS products commonly use a 70 m grid; orbit position alone does not establish an acquisition.',url:'https://ecostress.jpl.nasa.gov/'},
  {id:60989,name:'Sentinel-2C',agency:'ESA · Copernicus',category:'land',label:'Vegetation & land',description:'Multispectral observations of vegetation, cropland, and changing land surfaces. A cornerstone for connecting crop performance to landscape conditions.',science:'Build vegetation and canopy time series around flowering and grain filling, with cloud masks and field boundaries.',resolution:'10 / 20 / 60 m pixels, depending on spectral band.',url:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2'},
  {id:42063,name:'Sentinel-2B',agency:'ESA · Copernicus',category:'land',label:'Vegetation & land',description:'A complementary multispectral view of Earth. Its nearly polar orbit sweeps over different longitudes as Earth turns beneath it.',science:'Compare vegetation trajectories across trials. A 10 m pixel can mix multiple small breeding plots.',resolution:'10 / 20 / 60 m pixels, depending on spectral band.',url:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2'},
  {id:39634,name:'Sentinel-1A',agency:'ESA · Copernicus',category:'land',label:'Radar & land',description:'C-band synthetic aperture radar observes the surface through clouds and without sunlight. Radar backscatter responds to structure, roughness, and moisture.',science:'Add cloud-independent crop and wetness indicators. Backscatter is not a direct soil-moisture measurement and requires careful processing.',resolution:'Resolution depends on acquisition mode and product; pixel spacing is not the same as resolving power.',url:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1'},
  {id:62261,name:'Sentinel-1C',agency:'ESA · Copernicus',category:'land',label:'Radar & land',description:'A radar observer in a near-polar orbit. Compare its trajectory with the optical missions to see why a constellation provides complementary views.',science:'Combine radar and optical covariates for crop development, flooding, and surface conditions.',resolution:'Mode-dependent SAR resolution. Use product metadata for analysis.',url:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1'},
  {id:49260,name:'Landsat 9',agency:'NASA · USGS',category:'land',label:'Land & thermal',description:'Long-term observations of land cover and surface thermal conditions. Its consistent measurements help connect present-day trials with historical environments.',science:'Land surface temperature and vegetation history support heat and water-stress characterization. Surface temperature differs from air temperature.',resolution:'30 m multispectral; 15 m panchromatic; thermal acquired at 100 m, commonly delivered on a 30 m grid.',url:'https://www.usgs.gov/landsat-missions/landsat-9'},
  {id:39084,name:'Landsat 8',agency:'NASA · USGS',category:'land',label:'Land & thermal',description:'A companion to Landsat 9, extending a long record of landscape change and surface temperature.',science:'Harmonized Landsat and Sentinel products can improve the temporal record, while retaining product-specific limitations.',resolution:'30 m multispectral; 15 m panchromatic; native thermal sampling 100 m.',url:'https://www.usgs.gov/landsat-missions/landsat-8'},
  {id:40376,name:'SMAP',agency:'NASA · JPL',category:'water',label:'Soil moisture',description:'L-band microwave observations reveal broad patterns of near-surface soil moisture, helping describe drought and the water cycle.',science:'Useful for regional water-stress context. Model-assisted root-zone estimates must be distinguished from direct surface observations.',resolution:'Standard radiometer soil moisture: 36 km grid. Level-4 model-assisted surface/root-zone estimates: 9 km grid.',url:'https://science.nasa.gov/mission/smap/'},
  {id:39574,name:'GPM Core',agency:'NASA · JAXA',category:'water',label:'Rainfall',description:'The Global Precipitation Measurement Core Observatory anchors a constellation used to estimate rain and snow around the world.',science:'Accumulate precipitation by crop stage, alongside local gauges and irrigation records. IMERG is a multi-satellite product, not a single GPM image.',resolution:'IMERG: 0.1° grid, half-hourly estimates. Grid dimensions vary with latitude.',url:'https://gpm.nasa.gov/data/imerg'},
  {id:27424,name:'Aqua',agency:'NASA · Earth Observing System',category:'weather',label:'Water & atmosphere',description:'A long-running Earth science mission studying water, clouds, atmosphere, and surface conditions. Tracking an orbit does not establish current instrument availability.',science:'Its historical MODIS archive helps characterize vegetation, surface temperature, and atmospheric context across trial years.',resolution:'MODIS bands: 250 m, 500 m, or 1 km native sampling; derived products vary.',url:'https://science.nasa.gov/mission/aqua/'},
  {id:41335,name:'Sentinel-3A',agency:'ESA · EUMETSAT · Copernicus',category:'weather',label:'Surface temperature',description:'A broad-scale view of land and ocean color, surface temperature, and sea-surface height.',science:'Provides regional thermal and vegetation context. Its coarser pixels should not be assigned independent plot-level meaning.',resolution:'OLCI full-resolution sampling about 300 m; SLSTR thermal sampling about 1 km.',url:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-3'},
  {id:51850,name:'GOES-18',agency:'NOAA · NASA',category:'weather',label:'Geostationary weather',description:'A high-altitude weather observer. At roughly 35,786 km above the equator, its orbital period nearly matches Earth’s rotation, so it stays over approximately the same longitude.',science:'Frequent weather observations help interpret cloudiness and rapid environmental changes. Switch to GEO scale to appreciate the distance.',resolution:'ABI: 0.5–2 km at nadir depending on band; ground footprints grow toward the viewing limb.',url:'https://www.goes-r.gov/'}
];
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'}); }
catch(e) { $('loading').innerHTML='<div id="load-error">This browser could not start WebGL. Try opening the tool in Safari or Chrome with WebGL enabled.<p><a href="../" target="_top">Return to the project page</a></p></div>'; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer: coarse)').matches?1.5:2));
renderer.setClearColor(0x050b13);
$('universe').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(43,1,.000001,150);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=1+5/R;controls.maxDistance=30;
controls.enablePan=false;controls.rotateSpeed=.55;controls.zoomSpeed=.7;
const earthGroup = new THREE.Group(); scene.add(earthGroup);
const toScene = p => new THREE.Vector3(p.x/R,p.z/R,-p.y/R);
const geographic = (lat,lon,r=1.002) => new THREE.Vector3(r*Math.cos(lat)*Math.cos(lon),r*Math.sin(lat),-r*Math.cos(lat)*Math.sin(lon));
const textureLoader=new THREE.TextureLoader();
const day=textureLoader.load('assets/earth-day.jpg');
const night=textureLoader.load('assets/earth-night.jpg');
day.colorSpace=THREE.SRGBColorSpace;night.colorSpace=THREE.SRGBColorSpace;
day.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
const sunDirection=new THREE.Vector3(1,0,0);
const earthMaterial=new THREE.ShaderMaterial({uniforms:{dayMap:{value:day},nightMap:{value:night},sun:{value:sunDirection},surface:{value:0}},vertexShader:`varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D dayMap;uniform sampler2D nightMap;uniform vec3 sun;uniform float surface;varying vec2 vUv;varying vec3 vN;void main(){float light=dot(normalize(vN),normalize(sun));float daylight=smoothstep(-.12,.18,light);vec3 d=texture2D(dayMap,vUv).rgb;vec3 n=texture2D(nightMap,vUv).rgb;vec3 color=d*(.025+daylight*(.35+.65*max(light,0.)))+n*1.15*(1.-daylight);gl_FragColor=vec4(mix(color,d,surface),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
const earth=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),earthMaterial);earthGroup.add(earth);
earth.renderOrder=-100;
const earthTiles=new EarthTiles(earthGroup,renderer);
let flatFollowing=false;
const flatMap=new FlatMap(renderer,day,id=>selectMission(id),()=>stopMapFollowing());
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','Interactive Earth. In Global map: arrow keys pan, plus and minus zoom, Home fits the world.');
const surfaceDistance=new SurfaceDistance();
let lastDistanceUI=0;
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.026,64,48),new THREE.ShaderMaterial({uniforms:{sun:{value:sunDirection}},transparent:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false,vertexShader:`varying vec3 vN;varying vec3 vP;void main(){vec4 wp=modelMatrix*vec4(position,1.);vP=wp.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}`,fragmentShader:`varying vec3 vN;varying vec3 vP;uniform vec3 sun;void main(){float rim=pow(max(0.,1.-abs(dot(normalize(vN),normalize(cameraPosition-vP)))),3.);float lit=.18+.82*smoothstep(-.3,.7,dot(normalize(vN),sun));gl_FragColor=vec4(.12,.5,.9,rim*lit*.6);}`}));scene.add(atmosphere);
// Stars are decorative; they are not an astronomical star catalog.
let randomSeed=19;const rnd=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
const starVertices=[];for(let i=0;i<2600;i++){const y=rnd()*2-1,a=rnd()*TAU,r=55+rnd()*20,q=Math.sqrt(1-y*y);starVertices.push(r*q*Math.cos(a),r*y,r*q*Math.sin(a));}
const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(starVertices,3)),new THREE.PointsMaterial({color:0xb6c9dd,size:.026,transparent:true,opacity:.65,sizeAttenuation:true}));scene.add(stars);
scene.add(new THREE.AmbientLight(0x9abbd0,2));const sunlight=new THREE.DirectionalLight(0xffffff,3);scene.add(sunlight);

function craftModel(isISS,color){
  const g=new THREE.Group();const bodyMat=new THREE.MeshStandardMaterial({color:0xdde8ed,metalness:.65,roughness:.35});const solarMat=new THREE.MeshStandardMaterial({color:isISS?0xb4843e:0x306c9b,metalness:.35,roughness:.55,side:THREE.DoubleSide});
  const body=new THREE.Mesh(new THREE.BoxGeometry(isISS?.014:.012,.009,.009),bodyMat);g.add(body);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(isISS?.066:.044,.0018,.002),bodyMat);g.add(beam);
  for(const x of isISS?[-.027,-.016,.016,.027]:[-.016,.016]){const panel=new THREE.Mesh(new THREE.BoxGeometry(isISS?.008:.014,.001,.028),solarMat);panel.position.x=x;g.add(panel);}
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.0045,8,8),new THREE.MeshBasicMaterial({color}));g.add(marker);
  return g;
}
let selected, simTime=Date.now(),speed=1,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,following=false,filter='all', lastTime=performance.now(),lastTrackTime=0,lastTelemetry=0,refreshBusy=false;
const compactLayout=matchMedia('(max-width: 1100px), (max-height: 540px)');
let detailsOpen=false;
function syncDetailPanel(){
  $('detail').hidden=compactLayout.matches&&!detailsOpen;
  $('detail-toggle').setAttribute('aria-expanded',String(detailsOpen));
  $('detail-toggle').textContent=detailsOpen?'Hide details':'Mission details';
  const bottom=$('timeline').getBoundingClientRect().top;
  const top=$('earth-tools').getBoundingClientRect().bottom;
  document.documentElement.style.setProperty('--detail-bottom',`${innerHeight-bottom+12}px`);
  document.documentElement.style.setProperty('--detail-height',`${Math.max(70,bottom-top-32)}px`);
}
$('detail-toggle').onclick=()=>{detailsOpen=!detailsOpen;syncDetailPanel();};
compactLayout.addEventListener('change',syncDetailPanel);syncDetailPanel();
const cached=(()=>{try{return JSON.parse(localStorage.getItem('gis-eztool-elements-v1')||'{}');}catch{return {};}})();
const labelLeaders=document.createElementNS('http://www.w3.org/2000/svg','svg');
labelLeaders.id='label-leaders';labelLeaders.setAttribute('aria-hidden','true');$('labels').append(labelLeaders);
const missions=catalog.map(meta=>{
  const bundled=seed.elements.find(x=>Number(x.satelliteId)===meta.id);
  const saved=cached[meta.id];const record=saved?.line1&&Date.parse(saved.date)>Date.parse(bundled?.date||0)?saved:bundled;
  if(!record)return null;
  const satrec=S.twoline2satrec(record.line1,record.line2);
  const group=craftModel(meta.id===25544,palette[meta.category]);scene.add(group);
  const label=document.createElement('button');label.className='orbit-label';label.style.setProperty('--sat-color',palette[meta.category]);
  const name=document.createElement('span');name.textContent=meta.name;
  const distance=document.createElement('span');distance.className='sat-distance';distance.hidden=true;
  label.append(name,distance);label.onclick=()=>selectMission(meta.id);$('labels').append(label);
  const leader=document.createElementNS('http://www.w3.org/2000/svg','line');leader.setAttribute('stroke',palette[meta.category]);leader.style.display='none';labelLeaders.append(leader);
  return {...meta,record,satrec,group,labelEl:label,distanceEl:distance,leader,position:new THREE.Vector3(),valid:false,source:record===saved?'Browser cache':'Bundled snapshot'};
}).filter(Boolean);
const orbitGroup=new THREE.Group();scene.add(orbitGroup);
const trackGroup=new THREE.Group();earthGroup.add(trackGroup);
const footprintGroup=new THREE.Group();earthGroup.add(footprintGroup);footprintGroup.visible=false;
const siteGroup=new THREE.Group();earthGroup.add(siteGroup);let researchSite=null;
const raycaster=new THREE.Raycaster();
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').hidden=true,5500);}
function positionAt(m,date){try{const p=S.propagate(m.satrec,date);return p?.position&&Number.isFinite(p.position.x)?p:null;}catch{return null;}}
function clearGroup(group){while(group.children.length){const child=group.children[0];group.remove(child);child.geometry?.dispose();child.material?.dispose();}}
function line(points,color,opacity=1){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity}));}
function rebuildPaths(){
  clearGroup(orbitGroup);clearGroup(trackGroup);
  const date=new Date(simTime);
  for(const m of missions){
    if(filter!=='all'&&m.category!==filter)continue;
    const period=TAU/m.satrec.no*60*1000, points=[];
    for(let i=0;i<=160;i++){const p=positionAt(m,new Date(+date+period*i/160));if(p)points.push(toScene(p.position));}
    if(points.length>1)orbitGroup.add(line(points,palette[m.category],m===selected ? .75 : .14));
  }
  if(selected){
    const period=TAU/selected.satrec.no*60*1000;
    const future=[],past=[];
    for(let i=-120;i<=180;i++){
      const date=new Date(simTime+period*i/180);const p=positionAt(selected,date);if(!p)continue;
      const geo=S.eciToGeodetic(p.position,S.gstime(date));
      (i<0?past:future).push(geographic(geo.latitude,geo.longitude));
    }
    if(future.length>1)trackGroup.add(line(future,0xa9f4cc,.9));
    if(past.length>1)trackGroup.add(line(past,0x7c9aa9,.45));
  }
  lastTrackTime=simTime;
}
function updateFootprint(geo){
  clearGroup(footprintGroup);
  const normal=geographic(geo.latitude,geo.longitude,1).normalize();
  const helper=Math.abs(normal.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  const u=new THREE.Vector3().crossVectors(normal,helper).normalize();const v=new THREE.Vector3().crossVectors(normal,u).normalize();
  const angle=Math.acos(R/(R+geo.height)),points=[];
  for(let i=0;i<=120;i++){const a=TAU*i/120;points.push(normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(u,Math.sin(angle)*Math.cos(a)).addScaledVector(v,Math.sin(angle)*Math.sin(a)).multiplyScalar(1.003));}
  footprintGroup.add(line(points,0xffc772,.6));
}
function buildList(){
  $('sat-list').replaceChildren();$('mission-select').replaceChildren();
  for(const m of missions){
    const option=new Option(m.name+' · '+m.label,m.id);$('mission-select').add(option);
    if(filter!=='all'&&m.category!==filter)continue;
    const b=document.createElement('button');b.className='sat-btn'+(m===selected?' active':'');b.style.setProperty('--sat-color',palette[m.category]);b.setAttribute('aria-pressed',String(m===selected));
    b.innerHTML=`<span class="sat-icon" aria-hidden="true">${m.id===25544?'✦':'⌁'}</span><span><div class="sat-name">${m.name}</div><div class="sat-category">${m.label}</div></span>`;
    b.onclick=()=>selectMission(m.id);$('sat-list').append(b);
  }
  $('sat-count').textContent=String(missions.filter(m=>filter==='all'||m.category===filter).length).padStart(2,'0');
  if(selected)$('mission-select').value=String(selected.id);
}
function stopMapFollowing(){flatFollowing=false;$('follow').setAttribute('aria-pressed','false');$('follow').textContent=flatMap.active?'Follow ground point':'Follow spacecraft';}
function stopFollowing(){following=false;stopMapFollowing();}
function selectMission(id){
  selected=missions.find(m=>m.id===Number(id));if(!selected)return;
  if(filter!=='all'&&selected.category!==filter){filter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));}
  stopFollowing();controls.target.set(0,0,0);
  $('mission-name').textContent=selected.name;$('mission-category').textContent=selected.label;$('mission-agency').textContent=selected.agency;$('mission-description').textContent=selected.description;$('science-note').textContent=selected.science;
  missions.forEach(m=>{m.labelEl.classList.toggle('selected',m===selected);m.group.scale.setScalar(m===selected?1.3:.75);});
  buildList();rebuildPaths();updateTelemetry();
  if(selected.id===51850&&!flatMap.active)zoomGEO();
}
function setFlatMode(active){
  flatMap.active=active;controls.enabled=!active;document.body.classList.toggle('flat-map',active);
  document.body.classList.remove('surface-view');
  $('global-map').setAttribute('aria-pressed',String(active));$('home').setAttribute('aria-pressed',String(!active));
  $('map-legend').hidden=!active;$('fit-world').hidden=!active;
  $('orbit-label-text').textContent=active?'All tracks':'Orbits';
  $('surface-open').textContent=active?'3D detail':'Explore land';
  $('zoom-in').setAttribute('aria-label',active?'Zoom in on global map':'Zoom in toward Earth');
  $('zoom-out').setAttribute('aria-label',active?'Zoom out on global map':'Zoom out from Earth');
  $('earth-tools').setAttribute('aria-label',active?'Global map controls':'Earth zoom controls');
  $('universe').setAttribute('aria-label',active?'Interactive Equal Earth global map and satellite ground positions':'Interactive three-dimensional Earth and satellite viewer');
  renderer.domElement.style.cursor=active?'grab':'';
  flatMap.pointers.clear();syncDetailPanel();stopFollowing();
}
function fitMapBounds(){
  const timeline=$('timeline').getBoundingClientRect(),compact=compactLayout.matches;
  const left=compact?12:$('left').getBoundingClientRect().right+16;
  const right=compact?innerWidth-12:$('detail').getBoundingClientRect().left-16;
  const top=$('earth-tools').getBoundingClientRect().bottom+8;
  const legend=$('map-legend').getBoundingClientRect().height||50;
  const bounds={left,top,width:Math.max(70,right-left),height:Math.max(50,timeline.top-top-legend-22)};
  flatMap.setBounds(bounds);
  document.documentElement.style.setProperty('--map-left',`${left}px`);
  document.documentElement.style.setProperty('--map-width',`${bounds.width}px`);
  document.documentElement.style.setProperty('--map-bottom',`${innerHeight-timeline.top+10}px`);
}
function focusEarth(){
  if(flatMap.active)setFlatMode(false);
  document.body.classList.remove('surface-view');syncDetailPanel();
  stopFollowing();controls.target.set(0,0,0);camera.clearViewOffset();
  const p=selected?.position.clone().normalize()||new THREE.Vector3(1,.3,1).normalize();
  p.lerp(sunDirection,.55).normalize();p.applyAxisAngle(new THREE.Vector3(0,1,0),.25);
  let distance=3.8;
  if(compactLayout.matches){
    const top=$('earth-tools').getBoundingClientRect().bottom+16;
    const bottom=$('timeline').getBoundingClientRect().top-16;
    const available=Math.max(70,bottom-top);
    const diameter=Math.min(innerWidth*.82,available*.88);
    distance=Math.sqrt(1+(innerHeight/(diameter*Math.tan(camera.fov*D/2)))**2);
    camera.setViewOffset(innerWidth,innerHeight,0,innerHeight/2-(top+available/2),innerWidth,innerHeight);
  }
  camera.position.copy(p.multiplyScalar(distance));camera.updateProjectionMatrix();controls.update();
}
function zoomGEO(){if(flatMap.active)setFlatMode(false);stopFollowing();controls.target.set(0,0,0);const direction=selected?.id===51850?selected.position.clone().normalize():camera.position.clone().normalize();camera.position.copy(direction.multiplyScalar(compactLayout.matches?25:18));controls.update();notify('True scale: geostationary orbit is about 6.6 Earth radii from the center.');}
function zoomEarth(factor){
  stopFollowing();controls.target.set(0,0,0);camera.clearViewOffset();
  camera.position.setLength(Math.min(30,1+Math.max(5/R,(camera.position.length()-1)*factor)));
  controls.update();
}
function surfaceCoordinates(){
  const p=camera.position.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-earthGroup.rotation.y).normalize();
  return {lat:Math.asin(p.y)/D,lon:Math.atan2(-p.z,p.x)/D};
}
function visitSurface(lat,lon){
  if(flatMap.active)setFlatMode(false);
  stopFollowing();controls.target.set(0,0,0);camera.clearViewOffset();
  camera.position.copy(geographic(lat*D,lon*D,1+80/R).applyAxisAngle(new THREE.Vector3(0,1,0),earthGroup.rotation.y));
  controls.update();$('info').close();
}
$('zoom-in').onclick=()=>{if(flatMap.active){stopMapFollowing();flatMap.zoomBy(1.5);}else zoomEarth(.5);};
$('zoom-out').onclick=()=>{if(flatMap.active){stopMapFollowing();flatMap.zoomBy(1/1.5);}else zoomEarth(2);};
$('global-map').onclick=()=>{setFlatMode(true);fitMapBounds();flatMap.fit();flatMap.invalidate();};
$('fit-world').onclick=()=>{stopMapFollowing();flatMap.fit();};
$('map-info').onclick=()=>showInfo('Global map · Equal Earth',`<p><strong>A world in proportion.</strong> Equal Earth preserves relative areas on a sphere, making it useful for comparing environmental regions without enlarging high latitudes as Mercator does. It does not preserve all shapes, angles or distances. This viewer uses the spherical equations, not an ellipsoidal GIS measurement layer.</p><p><strong>What the dots mean:</strong> predicted satellite ground positions (geodetic subpoints), not spacecraft flying at map height. All tracks shows each mission’s next orbital ground track. The selected track is green for the next orbit and muted for the previous two-thirds orbit. Lines split at ±180° to avoid false connections across the map. The gold horizon is geometric, not a sensor footprint.</p><p><strong>Controls:</strong> drag to pan; scroll, pinch or use + / − to zoom. Fit world resets the map. Select a dot, label or mission. Keyboard: focus the map, use arrow keys to pan, + / − to zoom, Home to fit. Time, filters, mission details and Surface distance work in both views.</p><p><strong>Image limits:</strong> the flat map reprojects the bundled static NASA-based mosaic. Zoom is capped at 8× and does not add new image detail. Choose 3D detail for high-resolution landscape imagery, or Earth view / GEO scale for orbital geometry.</p><p>Projection: Šavrič, Patterson & Jenny (2018). <a href="https://doi.org/10.1080/13658816.2018.1504949" target="_blank" rel="noopener">Original paper</a> · <a href="https://proj.org/en/stable/operations/projections/eqearth.html" target="_blank" rel="noopener">PROJ documentation</a>. Imagery: NASA-based Earth mosaic, via three-globe.</p>`);
$('surface-open').onclick=()=>{
  const {lat,lon}=flatMap.active?(flatMap.at(flatMap.bounds.left+flatMap.bounds.width/2,flatMap.bounds.top+flatMap.bounds.height/2)||{lat:0,lon:0}):surfaceCoordinates();
  showInfo('Explore Earth’s surface',`<p>Zoom into a landscape using latitude and longitude, or try the Arkansas example. High-detail tiles load over the internet as you move. The camera follows Earth’s rotation so the ground stays in view.</p><form id="surface-form"><label>Latitude (−90 to 90°)<input id="surface-lat" type="number" min="-90" max="90" step="any" required value="${lat.toFixed(4)}"></label><label>Longitude (−180 to 180°)<input id="surface-lon" type="number" min="-180" max="180" step="any" required value="${lon.toFixed(4)}"></label><button type="submit">Explore these coordinates</button> <button type="button" id="surface-arkansas">Try Fayetteville, Arkansas</button></form><p><strong>What to expect:</strong> EOxCloudless uses 2024 Sentinel-2 imagery with approximately 10 m land detail at its finest scale. This is a static mosaic, not live imagery, a 3D terrain model, or street-level photography. Coverage and clarity vary, particularly over oceans and polar areas. If tiles are unavailable, the lower-resolution globe remains visible.</p><p>Tiles are provided free for non-commercial educational use by <a href="https://cloudless.eox.at/license-non-commercial" target="_blank" rel="noopener">EOX (CC BY-NC-SA 4.0)</a>. Requests reveal the area being viewed to the imagery provider; no location permission is used.</p>`);
  $('surface-form').onsubmit=e=>{e.preventDefault();const lat=Number($('surface-lat').value),lon=Number($('surface-lon').value);if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)visitSurface(lat,lon);};
  $('surface-arkansas').onclick=()=>visitSurface(36.068,-94.174);
};
function updateTelemetry(){
  if(!selected)return;const date=new Date(simTime),p=positionAt(selected,date);if(!p){$('coordinates').textContent='Position unavailable at this time';['altitude','velocity'].forEach(id=>$(id).textContent='—');return;}
  const geo=S.eciToGeodetic(p.position,S.gstime(date));const velocity=p.velocity?Math.hypot(p.velocity.x,p.velocity.y,p.velocity.z):NaN;
  $('altitude').textContent=Math.round(geo.height).toLocaleString();$('velocity').textContent=velocity.toFixed(2);$('period').textContent=(TAU/selected.satrec.no).toFixed(1);$('inclination').textContent=(selected.satrec.inclo/D).toFixed(1);
  $('coordinates').textContent=`${Math.abs(geo.latitude/D).toFixed(2)}° ${geo.latitude>=0?'N':'S'} / ${Math.abs(geo.longitude/D).toFixed(2)}° ${geo.longitude>=0?'E':'W'}`;
  const epoch=new Date((selected.satrec.jdsatepoch-2440587.5)*86400000);const age=(simTime-epoch.getTime())/3600000;
  $('epoch').textContent=epoch.toISOString().slice(0,16).replace('T',' ')+' UTC';
  $('data-age').textContent=`${Math.abs(age).toFixed(1)} h ${age>=0?'after':'before'} epoch${Math.abs(age)>72?' · reduced confidence':''}${Math.abs(age)>336?' · refresh before relying on this position':''}`;
  $('data-age').className=Math.abs(age)>336?'very-stale':Math.abs(age)>72?'stale':'';
  $('source-status').textContent=selected.source;
  if($('footprint').checked)updateFootprint(geo);
}
function updateSurfaceDistances(){
  const enabled=$('distance-toggle').checked,eligible=paused||speed===1;
  document.body.classList.toggle('distance-labels',enabled);
  surfaceDistance.setEnabled(enabled);
  $('surface-distance-panel').hidden=!enabled;
  if(enabled&&!document.hidden){
    const date=new Date(simTime),points=missions.filter(m=>m.valid).map(m=>{
      const p=positionAt(m,date);if(!p)return null;
      const geo=S.eciToGeodetic(p.position,S.gstime(date));
      return {id:m.id,lat:geo.latitude/D,lon:geo.longitude/D,heightKm:geo.height};
    }).filter(Boolean);
    void surfaceDistance.update(points,simTime,eligible);
  }
  for(const m of missions){
    m.distanceEl.hidden=!enabled;m.labelEl.classList.toggle('with-distance',enabled);
    if(!enabled){m.labelEl.title=m.name;continue;}
    const r=surfaceDistance.reading(m.id,simTime,eligible);
    let text=r.kind==='fast'?'↓ Pause or use 1×':r.kind==='unavailable'?'↓ Surface unavailable':'↓ Sampling surface…';
    if(r.kind==='ready')text=`↓ ≈${r.distanceKm.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})} km · ${Math.floor(r.ageSeconds)}s sample`;
    m.distanceEl.textContent=text;
    m.labelEl.title=r.kind==='ready'?`${m.name}: estimated distance to surface directly below at ${new Date(r.simTime).toISOString()}. Surface elevation ${Math.round(r.elevationM)} m; sample location ${r.lat.toFixed(4)}°, ${r.lon.toFixed(4)}°. Not a nearest-point search.`:`${m.name}: ${text.slice(2)}`;
  }
  if(!enabled)return;
  const r=surfaceDistance.reading(selected.id,simTime,eligible);
  $('surface-distance-value').textContent=r.kind==='ready'?`≈ ${r.distanceKm.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})} km`:r.kind==='fast'?'Pause or use 1×':r.kind==='unavailable'?'Unavailable':'Sampling…';
  $('surface-distance-detail').textContent=r.kind==='ready'?`Surface elevation: ${Math.round(r.elevationM).toLocaleString()} m relative to EGM2008. Sampled ${new Date(r.simTime).toISOString().slice(11,19)} UTC (${Math.floor(r.ageSeconds)} simulated seconds ago), at ${r.lat.toFixed(3)}°, ${r.lon.toFixed(3)}°.`:r.kind==='fast'?'Terrain sampling is suspended during fast-forward. Pause at any point to measure that position.':r.kind==='unavailable'?'Terrain or height-reference data could not be obtained. No sea-level value is substituted. The viewer will retry automatically.':'Obtaining elevation for the predicted satellite positions. An internet connection is required.';
}
$('distance-toggle').onchange=()=>{updateSurfaceDistances();syncDetailPanel();};
$('distance-info').onclick=()=>showInfo('Distance to the surface directly below',`<p><strong>Option 1: vertical surface clearance.</strong> The number is the predicted satellite-to-surface distance along the local WGS84 ellipsoid normal at its sub-satellite latitude and longitude. It is not the shortest distance to a mountain off to one side, a radar measurement, or the distance to the ocean floor.</p><p><strong>Calculation:</strong> satellite ellipsoid height − (surface elevation + geoid correction). Surface elevations come from the <a href="https://open-meteo.com/en/docs/elevation-api" target="_blank" rel="noopener">Open-Meteo elevation API / Copernicus GLO-90</a>. A compact, interpolated <a href="assets/egm2008-0.5deg.json" target="_blank" rel="noopener">EGM2008 geoid grid</a> aligns their vertical reference with the orbital height.</p><p><strong>Timing:</strong> snapshots are requested at most once every five seconds at 1×. Both orbital height and surface elevation in a displayed distance belong to the same sampled position and time. The label gives the sample age; readings older than 15 simulated seconds are hidden. Pause for a fixed-position reading. Fast-forward suspends sampling; it never reuses old terrain as if it were current.</p><p><strong>Oceans, mountains, and valleys:</strong> ocean measurements refer to the modeled water surface, not the seabed. A zero elevation alone does not prove that the location is ocean. Negative elevations are retained for below-sea-level land and water. Higher terrain reduces the gap at the same orbital height, but changing orbital height also matters.</p><p><strong>Limits:</strong> the approximately 90 m terrain grid is a static surface model; peaks and small objects may be missed. Waves, tides, individual buildings and moving objects are not resolved by this estimate. Orbital predictions, terrain data, reference-frame approximations and the coarsened geoid grid all introduce uncertainty. Decimal places are display precision, not an accuracy guarantee. The globe itself remains visually spherical. Do not use this tool for navigation or collision avoidance.</p><p><strong>Data use:</strong> the switch starts requests containing predicted satellite ground coordinates, not your device location. No account or API key is used for this non-commercial educational tool. <a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener">Open-Meteo terms</a> · <a href="https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM" target="_blank" rel="noopener">Copernicus DEM</a> · <a href="https://github.com/OSGeo/PROJ-data/blob/master/us_nga/us_nga_README.txt" target="_blank" rel="noopener">NGA / PROJ geoid source</a>.</p>`);
function placeDistanceLabels(items){
  const obstacles=['left','detail','timeline','view-tools','earth-tools','mobile-select','imagery-credit','map-legend'].map(id=>$(id)).concat(document.querySelector('header')).filter(el=>el&&el.getClientRects().length).map(el=>el.getBoundingClientRect());
  const overlaps=(a,b)=>a.left<b.right+4&&a.right>b.left-4&&a.top<b.bottom+4&&a.bottom>b.top-4;
  // Selected mission gets first choice; leader lines keep displaced labels unambiguous.
  items.sort((a,b)=>(a.m===selected?-1:b.m===selected?1:0));
  for(const {m,x,y} of items){
    const width=m.labelEl.offsetWidth,height=m.labelEl.offsetHeight,candidates=[];
    for(const dy of [0,-1,1,-2,2,-3,3])for(const dx of [9,-width-9]){
      const left=Math.max(4,Math.min(innerWidth-width-4,x+dx)),top=Math.max(4,Math.min(innerHeight-height-4,y-12+dy*(height+8)));
      candidates.push({left,top,right:left+width,bottom:top+height});
    }
    const box=candidates.find(box=>(!flatMap.active||(flatMap.contains(box.left,box.top)&&flatMap.contains(box.right,box.bottom)))&&!obstacles.some(obstacle=>overlaps(box,obstacle)));
    if(!box){m.labelEl.hidden=true;continue;}
    obstacles.push(box);m.labelEl.style.left=`${box.left}px`;m.labelEl.style.top=`${box.top}px`;
    m.leader.setAttribute('x1',x);m.leader.setAttribute('y1',y);
    m.leader.setAttribute('x2',Math.max(box.left,Math.min(box.right,x)));
    m.leader.setAttribute('y2',Math.max(box.top,Math.min(box.bottom,y)));
    m.leader.style.display='';
  }
}
function updateSun(date){
  const days=+date/86400000-10957.5;const mean=(280.46+.9856474*days)*D,anomaly=(357.528+.9856003*days)*D;
  const longitude=mean+(1.915*Math.sin(anomaly)+.02*Math.sin(2*anomaly))*D,obliquity=(23.439-.0000004*days)*D;
  sunDirection.set(Math.cos(longitude),Math.sin(obliquity)*Math.sin(longitude),-Math.cos(obliquity)*Math.sin(longitude)).normalize();sunlight.position.copy(sunDirection).multiplyScalar(15);
}
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-lastTime)/1000,1);lastTime=now;
  if(!paused){if(speed===1&&liveMode)simTime=Date.now();else simTime+=dt*1000*speed;}
  const date=new Date(simTime),previousAngle=earthGroup.rotation.y;earthGroup.rotation.y=S.gstime(date);updateSun(date);
  const height=Math.max(5/R,camera.position.length()-1);
  const surfaceView=!flatMap.active&&!following&&height<1.3;
  if(surfaceView)camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),earthGroup.rotation.y-previousAngle);
  controls.minDistance=following?.03:1+5/R;
  controls.zoomSpeed=following?.7:Math.min(.7,1.4*height/(height+1));
  controls.rotateSpeed=following?.55:Math.min(.55,Math.max(.00005,height*.6));
  const oldSelected=selected?.position.clone();
  for(const m of missions){const p=positionAt(m,date);m.valid=!!p;m.group.visible=!!p&&(filter==='all'||m.category===filter);if(p){m.position.copy(toScene(p.position));m.group.position.copy(m.position);m.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),m.position.clone().normalize());}}
  if(following&&selected?.valid){const delta=selected.position.clone().sub(oldSelected);camera.position.add(delta);controls.target.copy(selected.position);}
  if(!flatMap.active)controls.update();
  $('zoom-in').disabled=flatMap.active?flatMap.zoom>=8:!following&&camera.position.length()<=1+5.01/R;
  $('zoom-out').disabled=flatMap.active?flatMap.zoom<=1:!following&&camera.position.length()>=29.99;
  earthMaterial.uniforms.surface.value=surfaceView?1:0;
  atmosphere.visible=!surfaceView;
  earthTiles.update(camera,now,surfaceView);
  const modeChanged=document.body.classList.contains('surface-view')!==surfaceView;
  document.body.classList.toggle('surface-view',surfaceView);
  if(modeChanged)syncDetailPanel();
  $('imagery-credit').hidden=!surfaceView;
  // Refresh label text before measuring it: a new reading can change its size.
  if(now-lastDistanceUI>250){updateSurfaceDistances();lastDistanceUI=now;}
  // Hide labels and symbols that are occluded by the Earth; WebGL depth handles symbols.
  const distanceLabels=[];
  let mapPoints=[];
  if(flatMap.active){
    fitMapBounds();
    mapPoints=flatMap.update({missions,selected,simTime,now,filter,palette,positionAt,satellite:S,allTracks:$('orbits').checked,ground:$('ground').checked,horizon:$('footprint').checked,follow:flatFollowing,site:researchSite});
    $('zoom-height').textContent=`Map zoom ${flatMap.zoom.toFixed(1)}×`;
  }
  for(const m of missions){
    if(flatMap.active){
      m.leader.style.display='none';const point=mapPoints.find(p=>p.id===m.id);
      m.labelEl.hidden=!point||(!$('label-toggle').checked&&!$('distance-toggle').checked);
      if(!m.labelEl.hidden)distanceLabels.push({m,x:point.x,y:point.y});
      continue;
    }
    const v=m.position.clone().project(camera),toSat=m.position.clone().sub(camera.position),distance=toSat.length();
    const direction=toSat.normalize(),b=camera.position.dot(direction),c=camera.position.lengthSq()-1,disc=b*b-c;
    const hit=disc>0?-b-Math.sqrt(disc):Infinity;
    const hidden=!m.valid||(!$('label-toggle').checked&&!$('distance-toggle').checked)||(filter!=='all'&&m.category!==filter)||v.z>1||v.z< -1||hit>0&&hit<distance-.002||Math.abs(v.x)>1||Math.abs(v.y)>1;
    m.leader.style.display='none';m.labelEl.hidden=hidden;
    if(!hidden){
      const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;
      if($('distance-toggle').checked)distanceLabels.push({m,x,y});
      else {m.labelEl.style.left=`${Math.max(4,Math.min(innerWidth-m.labelEl.offsetWidth-4,x+9))}px`;m.labelEl.style.top=`${Math.max(4,Math.min(innerHeight-m.labelEl.offsetHeight-4,y-12))}px`;}
    }
  }
  if(distanceLabels.length)placeDistanceLabels(distanceLabels);
  if(!flatMap.active&&Math.abs(simTime-lastTrackTime)>20000)rebuildPaths();
  if(now-lastTelemetry>400){updateTelemetry();$('utc-clock').textContent=date.toISOString().slice(0,19).replace('T','  ');$('clock-mode').textContent=paused?'PAUSED':liveMode&&speed===1?'REAL TIME · 1×':`SIMULATION · ${speed}×`;$('context').querySelector('.compass').textContent=$('footprint').checked?'GOLD RING · GEOMETRIC HORIZON, NOT SENSOR SWATH':'EARTH + ORBITS · TRUE DISTANCE SCALE';lastTelemetry=now;}
  if(now-lastTelemetry<20){
    const imagery=earthTiles.state,alt=(camera.position.length()-1)*R;
    if(!flatMap.active)$('zoom-height').textContent=`View height ${alt<100?alt.toFixed(1):Math.round(alt).toLocaleString()} km`;
    $('imagery-status').textContent=imagery.failed?'Some detail unavailable · lower-resolution fallback':imagery.ready<imagery.requested?'Loading landscape detail…':'Daylight mosaic · not live · up to ~10 m land detail';
  }
  orbitGroup.visible=$('orbits').checked;trackGroup.visible=$('ground').checked&&!surfaceView;footprintGroup.visible=$('footprint').checked&&!surfaceView;
  if(flatMap.active)flatMap.render();else renderer.render(scene,camera);
}
let liveMode=true;
function resize(){const close=camera.position.length()>1&&camera.position.length()<2.3;syncDetailPanel();renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.clearViewOffset();camera.updateProjectionMatrix();if(flatMap.active)fitMapBounds();else if(!following&&!close)focusEarth();}window.addEventListener('resize',resize);resize();
$('pause').onclick=()=>{paused=!paused;if(paused)liveMode=false;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');};
$('speed').onchange=()=>{speed=Number($('speed').value);liveMode=false;paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause simulation');};
$('now').onclick=()=>{simTime=Date.now();speed=1;liveMode=true;paused=false;$('speed').value='1';$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause simulation');rebuildPaths();};
$('home').onclick=focusEarth;$('geo').onclick=zoomGEO;
$('follow').onclick=()=>{if(flatMap.active){flatFollowing=!flatFollowing;$('follow').setAttribute('aria-pressed',String(flatFollowing));$('follow').textContent=flatFollowing?'Following · stop':'Follow ground point';return;}if(following){stopFollowing();return;}if(!selected.valid)return;following=true;$('follow').setAttribute('aria-pressed','true');$('follow').textContent='Following · stop';const radial=selected.position.clone().normalize();camera.position.copy(selected.position).addScaledVector(radial,.48).add(new THREE.Vector3(.09,.06,.05));controls.target.copy(selected.position);controls.update();};
$('mission-select').onchange=()=>{selectMission($('mission-select').value);if(selected.id!==51850&&!flatMap.active)focusEarth();};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));if(filter!=='all'&&selected.category!==filter)selectMission(missions.find(m=>m.category===filter).id);buildList();rebuildPaths();});
$('footprint').onchange=()=>{if($('footprint').checked){updateTelemetry();notify('The gold ring shows the geometric horizon on a spherical Earth, not instrument coverage.');}};
$('ground').onchange=()=>{if($('ground').checked)notify('Surface track: green = next orbit; muted = preceding two-thirds orbit.');};
function showInfo(title,html){$('info-title').textContent=title;$('info-body').innerHTML=html;$('info').showModal();}
$('close-info').onclick=()=>$('info').close();
$('mission-info').onclick=()=>showInfo(selected.name,`<p>${selected.description}</p><h3>For genotype × environment research</h3><p>${selected.science}</p><p><strong>Data scale:</strong> ${selected.resolution}</p><p>Orbit visibility does not establish a usable image, a cloud-free observation, an active instrument, or an operational mission. Confirm current mission and product availability with the provider.</p><p><a href="${selected.url}" target="_blank" rel="noopener">Explore official mission / data documentation ↗</a></p><button id="site-open">Check visibility above a research site</button>`);
document.addEventListener('click',e=>{if(e.target.id==='site-open'){siteDialog();}});
function siteDialog(){
  $('info').close();showInfo('Your research site',`<p>Estimate when ${selected.name} is geometrically above a site at more than 10° elevation during the next 24 simulated hours. This is <strong>not an imaging acquisition forecast</strong>.</p><form id="site-form"><label>Latitude (−90 to 90°)<input id="site-lat" type="number" min="-90" max="90" step="any" required value="${researchSite?.lat??40}" style="width:100%;padding:10px;margin:6px 0 12px"></label><label>Longitude (−180 to 180°)<input id="site-lon" type="number" min="-180" max="180" step="any" required value="${researchSite?.lon??-88}" style="width:100%;padding:10px;margin:6px 0 12px"></label><p>Default coordinates are an example, not your location. Assumes sea-level elevation and an unobstructed horizon.</p><button type="submit">Calculate orbital visibility</button></form><div id="pass-results" aria-live="polite"></div>`);
  $('site-form').onsubmit=e=>{e.preventDefault();const lat=Number($('site-lat').value),lon=Number($('site-lon').value);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;researchSite={lat,lon};
    clearGroup(siteGroup);const marker=new THREE.Mesh(new THREE.SphereGeometry(.008,12,12),new THREE.MeshBasicMaterial({color:0xffc772}));marker.position.copy(geographic(lat*D,lon*D,1.005));siteGroup.add(marker);$('pass-results').textContent='Calculating…';setTimeout(()=>calculatePasses(lat,lon),30);};
}
function calculatePasses(lat,lon){
  const observer={latitude:lat*D,longitude:lon*D,height:0},passes=[];let current=null;
  for(let offset=0;offset<=86400;offset+=30){const date=new Date(simTime+offset*1000),pv=positionAt(selected,date);if(!pv)continue;const ecf=S.eciToEcf(pv.position,S.gstime(date)),el=S.ecfToLookAngles(observer,ecf).elevation/D;
    if(el>=10){if(!current)current={start:date,peak:el,ongoing:offset===0};current.peak=Math.max(current.peak,el);current.end=date;}
    else if(current){passes.push(current);current=null;}
  }if(current){current.continues=true;passes.push(current);}
  const format=d=>d.toISOString().slice(5,16).replace('T',' ')+' UTC';
  $('pass-results').innerHTML=passes.length?`<h3>${selected.name} · ${lat}°, ${lon}°</h3><p>30-second sampling; approximate times. Based on selected TLE epoch, with confidence decreasing away from epoch.</p><ol>${passes.slice(0,8).map(p=>`<li>${p.ongoing?'Already above 10° at window start':format(p.start)} → ${p.continues?'continues past window':format(p.end)} · max ${p.peak.toFixed(0)}°</li>`).join('')}</ol>`:'<p>No geometric visibility above 10° in the next 24 simulated hours. This is normal for some orbits and sites.</p>';
}
$('about').onclick=()=>showInfo('The science behind the view',`<p><strong>Real time:</strong> one simulation second equals one real second. Earth rotation is driven by Greenwich sidereal time. Fast-forward accelerates Earth and spacecraft together.</p><p><strong>Trajectories:</strong> satellite.js 6.0.1 uses SGP4/SDP4 to propagate published two-line orbital elements (TLEs). Positions are predictions, not live spacecraft GPS or guaranteed precise ephemerides. Maneuvers and aging elements reduce accuracy.</p><p><strong>Data:</strong> this viewer includes a snapshot retrieved ${seed.retrievedAt.slice(0,10)} from the <a href="https://tle.ivanstanojevic.me/" target="_blank" rel="noopener">TLE API</a>. The Elements button checks for newer records and caches them in this browser for two hours. No account, API key, or background tracking is needed.</p><p><strong>Geometry:</strong> Earth and orbital distances share a true scale. Spacecraft models and site markers are enlarged. Ground tracks project predicted positions onto a sphere; the gold horizon ring is not a sensor swath. Sun direction uses an approximate astronomical model; the globe texture is a static mosaic, not current weather.</p><p><strong>Explore:</strong> drag to rotate, pinch or scroll to zoom. Select a mission, follow it, or use GEO scale. Choose Mission & G×E to connect the spacecraft to environmental data and test visibility at your research site.</p><p><a href="https://github.com/shashwatak/satellite-js" target="_blank" rel="noopener">satellite.js</a> · <a href="https://celestrak.org/NORAD/documentation/gp-data-formats.php" target="_blank" rel="noopener">Orbital data background</a> · Earth imagery distributed in <a href="https://github.com/vasturiano/three-globe" target="_blank" rel="noopener">three-globe</a>, based on NASA imagery.</p><button id="site-open">Explore a research site</button>`);

async function refreshElements(manual=false){
  if(refreshBusy)return;refreshBusy=true;$('refresh').disabled=true;$('refresh').textContent='↻ Checking';
  const stored=(()=>{try{return JSON.parse(localStorage.getItem('gis-eztool-elements-v1')||'{}');}catch{return {};}})();let success=0,failed=0,skipped=0;
  // Two concurrent requests, two-hour browser cache; animation never depends on network availability.
  const queue=[...missions];async function worker(){while(queue.length){const m=queue.shift();if(stored[m.id]?.checkedAt&&Date.now()-stored[m.id].checkedAt<7200000){skipped++;continue;}
    try{const response=await fetch(`https://tle.ivanstanojevic.me/api/tle/${m.id}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(response.status);const record=await response.json();if(!record.line1||!record.line2||Number(record.satelliteId)!==m.id)throw Error('Invalid orbital data');
      const satrec=S.twoline2satrec(record.line1,record.line2);const test=S.propagate(satrec,new Date());if(!test?.position||!Number.isFinite(test.position.x))throw Error('Invalid propagation');
      // Never replace a newer epoch with an older feed record.
      if(satrec.jdsatepoch>=m.satrec.jdsatepoch){m.record=record;m.satrec=satrec;m.source='TLE API · checked '+new Date().toISOString().slice(11,16)+' UTC';stored[m.id]={...record,checkedAt:Date.now()};}else{stored[m.id]={...m.record,checkedAt:Date.now()};m.source='Newer bundled/cache epoch retained';}success++;
    }catch(e){failed++;}}
  }
  await Promise.all([worker(),worker()]);try{localStorage.setItem('gis-eztool-elements-v1',JSON.stringify(stored));}catch{}
  if(success&&surfaceDistance.enabled)surfaceDistance.invalidate();
  refreshBusy=false;$('refresh').disabled=false;$('refresh').textContent='↻ Elements';$('feed-status').textContent=failed?(success?'SNAPSHOT + AVAILABLE UPDATES':'USING SAVED ORBITAL SNAPSHOT'):success?'ORBITAL ELEMENTS CHECKED':'CACHED ORBITAL ELEMENTS';
  rebuildPaths();updateTelemetry();if(manual)notify(failed?`${success} checked; ${failed} unavailable. Retained existing elements where needed.`:success?`${success} orbital records checked.`:`Using ${skipped} cached records; next refresh allowed after two hours.`);
}
$('refresh').onclick=()=>refreshElements(true);
// Ray picking supports tapping the enlarged spacecraft, in addition to labels and catalog.
let pointerStart=null;renderer.domElement.addEventListener('pointerdown',e=>pointerStart={x:e.clientX,y:e.clientY});
renderer.domElement.addEventListener('pointerup',e=>{if(flatMap.active||!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)return;raycaster.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);const hits=raycaster.intersectObjects([earth,...missions.filter(m=>m.group.visible).map(m=>m.group)],true);if(hits.length&&hits[0].object!==earth){const m=missions.find(m=>m.group.children.includes(hits[0].object));if(m)selectMission(m.id);}});
selectMission(25544);
if(paused){$('pause').textContent='▶';$('pause').setAttribute('aria-label','Resume simulation');}
for(const m of missions){const p=positionAt(m,new Date(simTime));if(p)m.position.copy(toScene(p.position));}
updateSun(new Date(simTime));focusEarth();
Promise.all([day.image?.decode?.().catch(()=>{}),night.image?.decode?.().catch(()=>{})]).finally(()=>{});
THREE.DefaultLoadingManager.onLoad=()=>{$('loading').style.display='none';};
THREE.DefaultLoadingManager.onError=url=>{notify('One globe texture could not load. Orbital predictions remain available.');$('loading').style.display='none';};
setTimeout(()=>$('loading').style.display='none',8000);
requestAnimationFrame(animate);refreshElements(false);
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(!document.hidden&&liveMode&&!paused)simTime=Date.now();});
// Minimal read-only diagnostics for reproducible smoke checks.
window.gisEZTool={get state(){return {view:flatMap.active?"map":"globe",map:flatMap.state,flatFollowing,selected:selected.id,simTime,speed,paused,liveMode,following,count:missions.length,valid:missions.filter(m=>m.valid).length,earthAngle:earthGroup.rotation.y,viewHeightKm:(camera.position.length()-1)*R,surface:surfaceCoordinates(),imagery:earthTiles.state,distances:{enabled:surfaceDistance.enabled,requests:surfaceDistance.requests,busy:surfaceDistance.busy,readings:missions.map(m=>({id:m.id,...surfaceDistance.reading(m.id,simTime,paused||speed===1)}))},positions:missions.map(m=>({id:m.id,position:m.position.toArray(),epoch:m.satrec.jdsatepoch}))};}};
