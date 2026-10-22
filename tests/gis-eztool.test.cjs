// Run with Playwright installed: GIS_DOCS=/path/to/docs node tests/gis-eztool.test.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');

const repo = path.resolve(__dirname, '..');
const docs = path.resolve(process.env.GIS_DOCS || path.join(repo, 'docs'));
const qa = process.env.GIS_QA;
const project = '/research-work/gis-eztool/';
const viewer = project + 'viewer/';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };

(async () => {
  if (qa) await fs.mkdir(qa, { recursive: true });
  const seed = JSON.parse(await fs.readFile(path.join(repo, 'research-work/gis-eztool/viewer/data/orbits.json'), 'utf8'));
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(docs, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(docs + path.sep)) throw Error('Outside docs');
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch { res.statusCode = 404; res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [], missing = [];
  async function newPage(options = {}, failure = false) {
    const page = await browser.newPage(options);
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400 && !r.url().includes('favicon')) missing.push(r.url()); });
    await page.route('https://tle.ivanstanojevic.me/api/tle/*', async route => {
      if (failure) return route.fulfill({ status: 503, body: 'Unavailable' });
      const id = Number(new URL(route.request().url()).pathname.split('/').pop());
      const record = seed.elements.find(r => Number(r.satelliteId) === id);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) });
    });
    await page.route('https://api.open-meteo.com/v1/elevation?*', route => {
      const count=new URL(route.request().url()).searchParams.get('latitude').split(',').length;
      return route.fulfill(failure?{status:503,body:'Unavailable'}:{status:200,contentType:'application/json',body:JSON.stringify({elevation:Array.from({length:count},(_,i)=>[0,4000,-430,null,150][i%5])})});
    });
    if (!process.env.GIS_LIVE_IMAGERY || failure) {
      const png = await page.evaluate(() => {
        const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#4a7161';ctx.fillRect(0,0,256,256);
        ctx.fillStyle='#c1b380';ctx.fillRect(0,0,128,128);
        return canvas.toDataURL('image/png').split(',')[1];
      });
      await page.route('https://tiles.maps.eox.at/**', route => route.fulfill(failure
        ? { status:503, body:'Unavailable', headers:{'access-control-allow-origin':'*'} }
        : { status:200, contentType:'image/png', body:Buffer.from(png,'base64'), headers:{'access-control-allow-origin':'*'} }));
    }
    return page;
  }
  async function ready(page) {
    await page.waitForFunction(() => window.gisEZTool?.state.valid === 12);
    await page.locator('#loading').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.getElementById('refresh').disabled);
  }
  async function shot(page, name) { if (qa) await page.screenshot({ path: path.join(qa, name + '.png'), fullPage: true }); }
  async function checkDistanceLayout(page) {
    assert(await page.evaluate(()=>{
      const labels=[...document.querySelectorAll('.orbit-label:not([hidden])')].map(el=>el.getBoundingClientRect());
      const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      const controls=['timeline','view-tools','earth-tools'].map(id=>document.getElementById(id).getBoundingClientRect());
      return labels.every((box,i)=>box.left>=0&&box.right<=innerWidth+1&&box.top>=0&&box.bottom<=innerHeight+1&&!labels.slice(i+1).some(other=>overlap(box,other))&&!controls.some(control=>overlap(box,control)));
    }),'Distance labels must fit without overlapping one another or controls');
  }
  async function checkGlobalMap(page,name){
    await page.locator('#global-map').click();
    await page.waitForFunction(()=>window.gisEZTool.state.map.points.length===12);
    assert.equal(await page.locator('#global-map').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#orbit-label-text').innerText(),'All tracks');
    assert(!(await page.evaluate(()=>window.gisEZTool.state.imagery.enabled)));
    assert(await page.evaluate(()=>window.gisEZTool.state.map.trackSegments>0));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await checkDistanceLayout(page);
    await shot(page,'global-map-'+name);
    await page.locator('#map-info').click();
    assert.match(await page.locator('#info-body').innerText(),/does not preserve all shapes/);
    await page.locator('#close-info').click();
    if(await page.locator('#mission-select').isVisible())await page.locator('#mission-select').selectOption('51850');
    else await page.locator('.sat-btn').filter({hasText:'GOES-18'}).click();
    assert.equal(await page.evaluate(()=>window.gisEZTool.state.view),'map','GOES selection must not force 3D');
    await page.locator('#ground').uncheck();await page.locator('#orbits').uncheck();
    await page.waitForFunction(()=>window.gisEZTool.state.map.trackSegments===0);
    await page.locator('#ground').check();await page.locator('#orbits').check();
    await page.locator('#zoom-in').click();assert((await page.evaluate(()=>window.gisEZTool.state.map.zoom))>1);
    await page.locator('#label-toggle').uncheck();
    const before=await page.evaluate(()=>window.gisEZTool.state.map),b=before.bounds,x=b.left+b.width/2,y=b.top+b.height/2;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y+15,{steps:4});await page.mouse.up();
    assert.notDeepEqual(await page.evaluate(()=>window.gisEZTool.state.map.center),before.center);
    await page.locator('#universe canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Home');
    assert.equal(await page.evaluate(()=>window.gisEZTool.state.map.zoom),1);
    if(name==='390x844'){
      const touch=await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-35,y},{x:x+35,y}]});
      for(let step=1;step<=4;step++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-35-step*8,y},{x:x+35+step*8,y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert((await page.evaluate(()=>window.gisEZTool.state.map.zoom))>1.5,'Flat-map two-finger pinch');
    }
    await page.locator('#fit-world').click();
    await page.waitForTimeout(100);
    const tap=await page.evaluate(()=>{const points=window.gisEZTool.state.map.points;return points.map(p=>({...p,gap:Math.min(...points.filter(q=>q.id!==p.id).map(q=>Math.hypot(q.x-p.x,q.y-p.y)))})).sort((a,b)=>b.gap-a.gap)[0];});
    await page.mouse.click(tap.x,tap.y);
    assert.equal(await page.evaluate(()=>window.gisEZTool.state.selected),tap.id,'Tap a ground-position marker');
    assert.equal(await page.evaluate(()=>window.gisEZTool.state.view),'map');
    if(await page.locator('[data-filter=water]').isVisible()){
      await page.locator('[data-filter=water]').click();await page.waitForFunction(()=>window.gisEZTool.state.map.points.length===2);
      await page.locator('[data-filter=all]').click();
    }
    await page.locator('#label-toggle').check();await page.locator('#distance-toggle').check();
    await page.waitForFunction(()=>window.gisEZTool.state.distances.readings.some(r=>r.kind==='ready'));
    await page.waitForTimeout(350);await checkDistanceLayout(page);
    if(await page.locator('#detail').isHidden())await page.locator('#detail-toggle').click();
    assert(await page.locator('#surface-distance-panel').isVisible());
    await page.locator('#follow').click();assert(await page.evaluate(()=>window.gisEZTool.state.flatFollowing));
    if(await page.locator('#detail-toggle').isVisible())await page.locator('#detail-toggle').click();
    await page.locator('#fit-world').click();assert(!(await page.evaluate(()=>window.gisEZTool.state.flatFollowing)));
    await page.locator('#distance-toggle').uncheck();
    await page.locator('#home').click();assert.equal(await page.evaluate(()=>window.gisEZTool.state.view),'globe');
    assert(await page.locator('#map-legend').isHidden());
    await page.locator('#global-map').click();await page.locator('#surface-open').click();await page.locator('#surface-arkansas').click();
    assert.equal(await page.evaluate(()=>window.gisEZTool.state.view),'globe');
    await page.locator('#home').click();
  }
  try {
    const page = await newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(base + '/research-work/');
    const cards = page.locator('#arkansas-research .research-theme-grid > .research-theme-card');
    assert.equal(await cards.count(), 3);
    assert.match(await cards.nth(0).innerText(), /Genotype × Environment Interactions/);
    assert.match(await cards.nth(1).innerText(), /Spatial Analysis/);
    assert.match(await cards.nth(2).innerText(), /03\s+GIS_EZMO²/);
    await cards.nth(2).scrollIntoViewIfNeeded();
    await shot(page, 'research-desktop');
    await cards.nth(2).click();
    await page.waitForURL('**' + project);
    assert.equal(await page.title(), 'GIS_EZMO² – Elias Mohellebi');
    await page.locator('.gis-viewer-shell').scrollIntoViewIfNeeded();
    const frame = page.frameLocator('iframe');
    await frame.locator('#loading').waitFor({ state: 'hidden' });
    assert.equal(await frame.locator('.sat-btn').count(), 12);
    assert.equal(await frame.locator('.brand strong').innerText(), 'GIS_EZMO²');
    await shot(page, 'project-desktop');
    await page.getByRole('link', { name: 'Launch GIS_EZMO²' }).click();
    await ready(page);
    const a = await page.evaluate(() => window.gisEZTool.state);
    await page.waitForTimeout(1200);
    const b = await page.evaluate(() => window.gisEZTool.state);
    assert(b.simTime > a.simTime + 800);
    assert.notDeepEqual(a.positions[0].position, b.positions[0].position);
    assert.equal(b.distances.requests,0,'Terrain must be opt-in');
    assert(await page.locator('#surface-distance-panel').isHidden());
    await page.locator('#distance-toggle').check();
    await page.waitForFunction(()=>window.gisEZTool.state.distances.readings[0].kind==='ready');
    await page.locator('#pause').click();
    await page.waitForFunction(()=>window.gisEZTool.state.distances.readings[0].simTime===window.gisEZTool.state.simTime);
    const readings=await page.evaluate(()=>window.gisEZTool.state.distances.readings);
    assert.equal(readings[0].elevationM,0);assert.equal(readings[1].elevationM,4000);assert.equal(readings[2].elevationM,-430);
    assert.equal(readings[3].kind,'unavailable');
    for(const r of readings.filter(r=>r.kind==='ready')) assert(Math.abs(r.distanceKm-(r.heightKm-(r.elevationM+r.geoidM)/1000))<1e-8);
    assert(await page.locator('#surface-distance-panel').isVisible());
    assert.match(await page.locator('#surface-distance-value').innerText(),/km/);
    assert.equal(await page.locator('.sat-distance:not([hidden])').count(),12);
    await page.locator('#label-toggle').uncheck();
    await page.waitForTimeout(300);
    assert(await page.locator('.orbit-label:visible').count()>0,'Distance labels work independently');
    await page.locator('#label-toggle').check();
    await page.locator('#distance-info').click();
    assert.match(await page.locator('#info-body').innerText(),/not the shortest distance/);
    await page.locator('#close-info').click();
    await shot(page,'distance-desktop');
    await checkDistanceLayout(page);
    const calls=await page.evaluate(()=>window.gisEZTool.state.distances.requests);
    await page.locator('#speed').selectOption('1000');
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>window.gisEZTool.state.distances.requests),calls);
    assert.match(await page.locator('#surface-distance-value').innerText(),/Pause/);
    await page.locator('#distance-toggle').uncheck();
    assert(await page.locator('#surface-distance-panel').isHidden());
    await page.locator('#now').click();
    await page.locator('#pause').click();
    const paused = await page.evaluate(() => window.gisEZTool.state.simTime);
    await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => window.gisEZTool.state.simTime), paused);
    await page.locator('#speed').selectOption('1000');
    await page.waitForTimeout(1000);
    assert((await page.evaluate(() => window.gisEZTool.state.simTime)) > paused + 200000);
    await page.locator('#now').click();
    assert(Math.abs(await page.evaluate(() => window.gisEZTool.state.simTime - Date.now())) < 1500);
    await page.locator('#follow').click();
    assert(await page.evaluate(() => window.gisEZTool.state.following));
    await page.locator('#home').click();
    assert(!(await page.evaluate(() => window.gisEZTool.state.following)));
    await page.locator('[data-filter=water]').click();
    assert.equal(await page.locator('.sat-btn').count(), 2);
    await page.locator('#mission-info').click();
    await page.locator('#site-open').click();
    await page.locator('#site-lat').fill('36.07');
    await page.locator('#site-lon').fill('-94.17');
    await page.locator('#site-form button').click();
    await page.waitForFunction(() => document.getElementById('pass-results').textContent.length > 50);
    await page.locator('#close-info').click();
    await page.locator('[data-filter=all]').click();
    await page.locator('.sat-btn').filter({ hasText: 'GOES-18' }).click();
    assert.equal(await page.evaluate(() => window.gisEZTool.state.selected), 51850);
    await page.locator('#footprint').check();
    await page.waitForTimeout(500);
    assert.match(await page.locator('.compass').innerText(), /NOT SENSOR SWATH/);
    await page.locator('#footprint').uncheck();
    await page.locator('#label-toggle').uncheck();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.orbit-label:visible').count(), 0);
    await page.locator('#label-toggle').check();
    await page.locator('.sat-btn').filter({ hasText: 'Sentinel-2C' }).click();
    await page.locator('#home').click();
    await shot(page, 'viewer-desktop');
    await page.locator('#surface-open').click();
    await page.locator('#surface-arkansas').click();
    await page.waitForFunction(() => window.gisEZTool.state.imagery.ready > 0);
    const region = await page.evaluate(() => window.gisEZTool.state);
    assert(Math.abs(region.surface.lat-36.068) < .001);
    assert(Math.abs(region.surface.lon+94.174) < .001);
    assert(Math.abs(region.viewHeightKm-80) < .01);
    await shot(page, 'surface-region');
    for (let i=0;i<4;i++) { await page.locator('#zoom-in').click(); await page.waitForTimeout(100); }
    await page.waitForFunction(() => window.gisEZTool.state.imagery.level === 13 && window.gisEZTool.state.imagery.ready > 0);
    await page.waitForFunction(() => document.getElementById('zoom-in').disabled);
    assert(await page.locator('#imagery-credit').isVisible());
    await page.waitForFunction(() => { const s=window.gisEZTool.state.imagery;return s.ready+s.failed === s.requested; });
    if (process.env.GIS_LIVE_IMAGERY) assert.equal(await page.evaluate(() => window.gisEZTool.state.imagery.failed),0, 'Live land imagery unavailable');
    await shot(page, 'surface-detail');
    await page.locator('#speed').selectOption('1000');
    const ground = await page.evaluate(() => window.gisEZTool.state.surface);
    await page.waitForTimeout(800);
    const steady = await page.evaluate(() => window.gisEZTool.state.surface);
    assert(Math.abs(ground.lon-steady.lon) < .001, 'Ground must stay fixed during accelerated time');
    await page.locator('#now').click();
    await page.setViewportSize({ width:1300,height:900 });
    assert(Math.abs((await page.evaluate(() => window.gisEZTool.state.viewHeightKm))-5) < .01, 'Resize must preserve surface zoom');
    await page.locator('#zoom-out').click();
    assert(Math.abs((await page.evaluate(() => window.gisEZTool.state.viewHeightKm))-10) < .01);
    await page.mouse.move(650,450);
    await page.mouse.wheel(0,-400);
    await page.waitForTimeout(400);
    assert(await page.evaluate(() => window.gisEZTool.state.viewHeightKm>=4.99), 'Wheel must not enter the globe');
    assert(await page.evaluate(() => window.gisEZTool.state.imagery.active<=4 && window.gisEZTool.state.imagery.cached<=128));
    if (!process.env.GIS_LIVE_IMAGERY) {
      for (const [lat,lon] of [[0,179.99],[89.9,0],[-89.9,-179.99]]) {
        await page.locator('#surface-open').click();
        await page.locator('#surface-lat').fill(String(lat));
        await page.locator('#surface-lon').fill(String(lon));
        await page.locator('#surface-form button[type=submit]').click();
        await page.waitForTimeout(500);
        const edge = await page.evaluate(() => window.gisEZTool.state);
        assert(Math.abs(edge.surface.lat-lat)<.001 && Math.abs(edge.surface.lon-lon)<.001);
        assert(edge.imagery.requested>0 && edge.imagery.requested<=80 && edge.imagery.cached<=128, 'Polar/dateline tile bounds');
      }
    }
    await page.locator('#home').click();
    await page.waitForFunction(() => !window.gisEZTool.state.imagery.enabled);
    await checkGlobalMap(page,'desktop');
    await page.close();

    for (const size of [[390, 844], [320, 568], [844, 390], [820, 1180]]) {
      const [width, height] = size;
      const mobile = await newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      await mobile.goto(base + viewer); await ready(mobile);
      assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Viewer overflow ' + size);
      const compact = width <= 1100 || height <= 540;
      if (compact) {
        assert(await mobile.locator('#detail').isHidden());
        await mobile.locator('#mission-select').selectOption('40376');
        assert.equal(await mobile.evaluate(() => window.gisEZTool.state.selected), 40376);
        await shot(mobile, 'viewer-' + width + 'x' + height);
        await mobile.locator('#detail-toggle').click();
        assert.equal(await mobile.locator('#detail-toggle').getAttribute('aria-expanded'), 'true');
        assert(await mobile.locator('#detail').isVisible());
        assert(await mobile.evaluate(() => {
          const detail=document.getElementById('detail').getBoundingClientRect();
          return detail.top >= document.getElementById('view-tools').getBoundingClientRect().bottom
            && detail.bottom < document.getElementById('timeline').getBoundingClientRect().top;
        }), 'Detail panel overlaps controls ' + size);
        await mobile.locator('#mission-info').click();
        assert(await mobile.locator('#info').isVisible());
        await mobile.locator('#close-info').click();
        await shot(mobile, 'details-' + width + 'x' + height);
        await mobile.locator('#detail-toggle').click();
        assert(await mobile.locator('#detail').isHidden());
        await mobile.locator('#distance-toggle').check();
        await mobile.waitForFunction(()=>window.gisEZTool.state.distances.readings.some(r=>r.kind==='ready'));
        assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await shot(mobile,'distance-'+width+'x'+height);
        await checkDistanceLayout(mobile);
        await mobile.locator('#detail-toggle').click();
        await mobile.locator('#distance-info').click();
        assert(await mobile.locator('#info').isVisible());
        await mobile.locator('#close-info').click();
        await mobile.locator('#detail-toggle').click();
        await mobile.locator('#distance-toggle').uncheck();
        await mobile.locator('#surface-open').click();
        await mobile.locator('#surface-arkansas').click();
        await mobile.waitForFunction(() => window.gisEZTool.state.imagery.ready > 0);
        await mobile.locator('#zoom-in').click();
        assert(Math.abs((await mobile.evaluate(() => window.gisEZTool.state.viewHeightKm))-40)<.01);
        if (width === 390) {
          const touch = await mobile.context().newCDPSession(mobile);
          await touch.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:140,y:400},{x:250,y:400}]});
          for(let step=1;step<=4;step++) await touch.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:140-step*8,y:400},{x:250+step*8,y:400}]});
          await touch.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
          await mobile.waitForTimeout(400);
          const height = await mobile.evaluate(() => window.gisEZTool.state.viewHeightKm);
          assert(height<39 && height>=4.99, 'Two-finger pinch must zoom safely');
        }
        assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
        await shot(mobile, 'surface-' + width + 'x' + height);
        await mobile.locator('#home').click();
      }
      await checkGlobalMap(mobile,width+'x'+height);
      await mobile.locator('.back-project').click();
      await mobile.waitForURL('**' + project);
      assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Project overflow ' + size);
      await mobile.goto(base + '/research-work/');
      assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Research overflow ' + size);
      if (width === 390) { await mobile.locator('.gis-project-card').scrollIntoViewIfNeeded(); await shot(mobile, 'research-mobile'); }
      await mobile.close();
    }

    const reduced = await newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }, true);
    await reduced.goto(base + viewer); await ready(reduced);
    assert(await reduced.evaluate(() => window.gisEZTool.state.paused));
    assert.match(await reduced.locator('#feed-status').innerText(), /SNAPSHOT/);
    assert.equal(await reduced.evaluate(() => window.gisEZTool.state.valid), 12);
    await reduced.locator('#distance-toggle').check();
    await reduced.waitForFunction(()=>window.gisEZTool.state.distances.readings[0].kind==='unavailable');
    assert(!/\d+\.\d+ km/.test(await reduced.locator('.sat-distance').first().innerText()),'Failure must not fabricate a distance');
    await reduced.locator('#distance-toggle').uncheck();
    await reduced.locator('#surface-open').click();
    await reduced.locator('#surface-arkansas').click();
    await reduced.waitForFunction(() => window.gisEZTool.state.imagery.failed > 0);
    await reduced.waitForFunction(() => document.getElementById('imagery-status').textContent.includes('fallback'));
    assert.match(await reduced.locator('#imagery-status').innerText(), /fallback/);
    await reduced.locator('#home').click();
    await reduced.locator('#pause').click();
    assert(!(await reduced.evaluate(() => window.gisEZTool.state.paused)));
    await reduced.close();

    const blockedStorage = await newPage({ viewport: { width: 390, height: 844 } }, true);
    await blockedStorage.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    await blockedStorage.goto(base + viewer); await ready(blockedStorage);
    assert.equal(await blockedStorage.evaluate(() => window.gisEZTool.state.valid), 12);
    await blockedStorage.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log('PASS: Equal Earth global map, marker picking, filters, tracks, follow, touch/pan/zoom/keyboard and globe/detail transitions; surface distances and failure handling; existing orbital/imagery controls; desktop/mobile/tablet/landscape; no browser errors or missing local assets.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
