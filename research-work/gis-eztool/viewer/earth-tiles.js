import * as THREE from 'three';

// EOX's public WGS84 WMTS: 2^(z+1) columns, 2^z rows, 256px tiles.
// Stream only the current view. No bulk download, prefetch or persistent tile store.
export class EarthTiles {
  constructor(earthGroup, renderer) {
    this.group = new THREE.Group();
    earthGroup.add(this.group);
    this.earthGroup = earthGroup;
    this.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    this.cache = new Map();
    this.wanted = [];
    this.active = 0;
    this.level = 0;
    this.enabled = false;
    this.lastUpdate = -Infinity;
    this.frustum = new THREE.Frustum();
  }

  bounds(z, x, y) {
    const step = Math.PI / 2 ** z;
    const lat = Math.PI / 2 - (y + .5) * step;
    const lon = -Math.PI + (x + .5) * step;
    const center = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
    // Conservative angular cap, including longitude convergence near the poles.
    const angle = Math.min(Math.PI, step * .5 * (1 + Math.cos(Math.max(0, Math.abs(lat) - step * .5))));
    return { center, angle, sphere: new THREE.Sphere(center, 2 * Math.sin(angle / 2) + .00001) };
  }

  visible(z, x, y) {
    const b = this.bounds(z, x, y);
    return b.center.dot(this.direction) >= Math.cos(Math.min(Math.PI, this.horizon + b.angle))
      && this.frustum.intersectsSphere(b.sphere);
  }

  tilesAt(level) {
    const result = [];
    const visit = (z, x, y) => {
      if (!this.visible(z, x, y) || result.length > 100) return;
      if (z === level) {
        result.push({ z, x, y, key: `${z}/${y}/${x}`, distance: this.bounds(z,x,y).center.distanceToSquared(this.direction) });
      } else {
        for (let dy=0;dy<2;dy++) for (let dx=0;dx<2;dx++) visit(z+1, x*2+dx, y*2+dy);
      }
    };
    for (let y=0;y<4;y++) for (let x=0;x<8;x++) visit(2,x,y);
    return result.sort((a,b) => a.distance-b.distance);
  }

  update(camera, now, enabled) {
    this.enabled = enabled;
    this.group.visible = enabled;
    if (!enabled) { this.wanted = []; return; }
    if (now-this.lastUpdate < 300) return;
    this.lastUpdate = now;
    this.earthGroup.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const localCamera = this.earthGroup.worldToLocal(camera.position.clone());
    const distance = localCamera.length();
    this.direction = localCamera.normalize();
    this.horizon = Math.acos(1 / Math.max(1.000001, distance));
    this.frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(this.earthGroup.matrixWorld));
    const kmPerPixel = (distance-1)*6378.137*2*Math.tan(camera.fov*Math.PI/360)/innerHeight;
    const latitudeFactor = Math.max(.06, Math.sqrt(Math.max(0,1-this.direction.y**2)));
    let level = Math.max(2, Math.min(13, Math.round(Math.log2(40075.017*latitudeFactor/(512*kmPerPixel)))));
    let wanted = this.tilesAt(level);
    while (wanted.length > 80 && level > 2) wanted = this.tilesAt(--level);
    this.level = level;
    this.wanted = wanted;
    for (const tile of this.cache.values()) {
      if (!tile.mesh) continue;
      tile.mesh.visible = tile.z <= level && this.visible(tile.z,tile.x,tile.y);
      if (tile.mesh.visible) tile.used = now;
    }
    this.pump();
    this.trimCache(128);
  }

  trimCache(limit) {
    // Bound GPU memory. Keep current tiles and evict old views first.
    const keys = new Set(this.wanted.map(t => t.key));
    const old = [...this.cache.values()].filter(t => t.status !== 'loading' && !keys.has(t.key)).sort((a,b) => a.used-b.used);
    while (this.cache.size > limit && old.length) {
      const tile = old.shift();
      this.group.remove(tile.mesh);
      tile.mesh?.geometry.dispose();
      tile.mesh?.material.dispose();
      tile.texture?.dispose();
      tile.texture?.image?.close?.();
      this.cache.delete(tile.key);
    }
  }

  pump() {
    if (!this.enabled) return;
    for (const wanted of this.wanted) {
      if (this.active >= 4) break;
      const old = this.cache.get(wanted.key);
      if (old && (old.status !== 'failed' || Date.now()-old.failedAt < 60000)) continue;
      const tile = { ...wanted, status:'loading', used:performance.now() };
      this.trimCache(127);
      this.cache.set(tile.key,tile);
      this.active++;
      this.load(tile).finally(() => { this.active--; this.pump(); });
    }
  }

  async load(tile) {
    try {
      const response = await fetch(`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024/default/WGS84/${tile.key}.jpg`, { signal:AbortSignal.timeout(12000), credentials:'omit', referrerPolicy:'no-referrer' });
      if (!response.ok) throw Error(`Imagery HTTP ${response.status}`);
      const blob = await response.blob();
      // EOX may return a 116-byte, 256px transparent PNG for missing coverage.
      if (blob.size < 512) throw Error('No imagery at this location');
      const bitmap = await createImageBitmap(blob, { imageOrientation:'flipY' });
      if (bitmap.width < 256 || bitmap.height < 256) { bitmap.close(); throw Error('No imagery at this location'); }
      const texture = new THREE.Texture(bitmap);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = this.anisotropy;
      texture.needsUpdate = true;
      tile.texture = texture;
      tile.mesh = this.mesh(tile,texture);
      tile.mesh.visible = this.enabled && tile.z <= this.level && this.visible(tile.z,tile.x,tile.y);
      this.group.add(tile.mesh);
      tile.status = 'ready';
    } catch {
      tile.status = 'failed';
      tile.failedAt = Date.now();
    }
  }

  mesh({z,x,y}, texture) {
    const segments = 16, positions = [], uv = [], indices = [];
    const step = Math.PI/2**z;
    for (let row=0;row<=segments;row++) {
      const v = row/segments, lat = Math.PI/2-(y+v)*step;
      for (let col=0;col<=segments;col++) {
        const u = col/segments, lon = -Math.PI+(x+u)*step, r=1.000005;
        positions.push(r*Math.cos(lat)*Math.cos(lon), r*Math.sin(lat), -r*Math.cos(lat)*Math.sin(lon));
        uv.push(u,1-v);
        if (row<segments && col<segments) {
          const a=row*(segments+1)+col,b=a+segments+1;
          indices.push(a,b,a+1,b,b+1,a+1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture, alphaTest:.01, depthTest:false, toneMapped:false}));
    // Paint coarser tiles before finer tiles, over the base globe but before orbits.
    // This avoids z-fighting and cracks between differently tessellated levels.
    mesh.renderOrder = -50+z;
    return mesh;
  }

  get state() {
    const tiles = this.wanted.map(t => this.cache.get(t.key));
    return { enabled:this.enabled, level:this.level, requested:tiles.length, ready:tiles.filter(t=>t?.status==='ready').length, failed:tiles.filter(t=>t?.status==='failed').length, active:this.active, cached:this.cache.size };
  }
}
