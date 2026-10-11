import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Material,
} from 'three';
import {
  BUILDINGS,
  HOUSE,
  LAB,
  MEADOW,
  TOWN_BOUNDS,
  TREES,
  townSolids,
  type AABB,
  type Building,
} from './layout.ts';
import { makeShadow, toon } from './meshes.ts';

// Centered on the origin. The extra south reach is so the title camera can sit
// behind the house and still have grass under it.
export const GROUND = { min: -26, size: 52 };

// PlaneGeometry.rotateX(-PI/2) stores uv.y along +z.
// CanvasTexture flips Y, so the painted row is (1 - v).
export function groundCanvasPoint(x: number, z: number, size: number): { x: number; y: number } {
  const u = (x - GROUND.min) / GROUND.size;
  const v = (z - GROUND.min) / GROUND.size;
  return { x: u * size, y: (1 - v) * size };
}

export type Place = {
  group: Group;
  solids: AABB[];
  bounds: AABB;
};

function box(parent: Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive = 0): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), toon(color, emissive));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function building(parent: Group, b: Building): void {
  box(parent, b.w, b.h, b.d, b.wall, b.x, b.h / 2, b.z);
  const roof = new Mesh(new ConeGeometry(Math.hypot(b.w, b.d) * 0.42, b.h * 0.62, 4), toon(b.roof));
  roof.position.set(b.x, b.h + b.h * 0.22, b.z);
  roof.rotation.y = Math.PI / 4;
  parent.add(roof);
  const chimney = b.id !== 'lab';
  if (chimney) box(parent, 0.34, 0.7, 0.34, 0x8d5a45, b.x + b.w * 0.22, b.h + 0.55, b.z - b.d * 0.12);
  const doorZ = b.door === 'north' ? b.z - b.d / 2 + 0.08 : b.z + b.d / 2 - 0.08;
  const doorY = 0.7;
  if (b.door !== 'none') {
    box(parent, 1.05, 1.45, 0.12, b.trim, b.x, doorY, doorZ);
    box(parent, 0.42, 0.42, 0.08, 0xf6d27a, b.x + b.w * 0.28, 1.35, b.door === 'north' ? b.z - b.d / 2 + 0.08 : b.z + b.d / 2 - 0.08, 0x5a3414);
    box(parent, 0.42, 0.42, 0.08, 0xf6d27a, b.x - b.w * 0.28, 1.35, b.door === 'north' ? b.z - b.d / 2 + 0.08 : b.z + b.d / 2 - 0.08, 0x5a3414);
  }
  box(parent, b.w + 0.3, 0.08, 0.4, 0xd8c3a2, b.x, 0.04, b.door === 'south' ? b.z + b.d / 2 + 0.15 : b.z - b.d / 2 - 0.15);
}

function tree(parent: Group, x: number, z: number, s: number): void {
  const trunk = new Mesh(new CylinderGeometry(0.12 * s, 0.16 * s, 0.7 * s, 6), toon(0x7a5132));
  trunk.position.set(x, 0.35 * s, z);
  const leaves = new Mesh(new SphereGeometry(0.72 * s, 12, 10), toon(s > 1 ? 0x3f8f4e : 0x4e9a52));
  leaves.position.set(x, 1.15 * s, z);
  const cap = new Mesh(new SphereGeometry(0.48 * s, 10, 8), toon(0x2f6e3c));
  cap.position.set(x + 0.1 * s, 1.55 * s, z - 0.05);
  parent.add(trunk, leaves, cap);
}

function paintGround(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('no canvas');
  g.fillStyle = '#67a652';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = i % 3 === 0 ? '#78b460' : i % 3 === 1 ? '#589446' : '#8bc46e';
    const x = Math.random() * size;
    const y = Math.random() * size;
    g.fillRect(x, y, 2 + (i % 3), 2 + (i % 2));
  }
  const rect = (minX: number, minZ: number, maxX: number, maxZ: number, color: string) => {
    const a = groundCanvasPoint(minX, maxZ, size);
    const b = groundCanvasPoint(maxX, minZ, size);
    g.fillStyle = color;
    g.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  };
  rect(GROUND.min, GROUND.min, TOWN_BOUNDS.minX + 0.4, GROUND.min + GROUND.size, '#e6d3a4');
  rect(-1.55, -4.4, 1.55, 6.3, '#d2b184');
  rect(MEADOW.minX, MEADOW.minZ, MEADOW.maxX, MEADOW.maxZ, '#3f8a3e');
  for (let i = 0; i < 500; i++) {
    const x = MEADOW.minX + Math.random() * (MEADOW.maxX - MEADOW.minX);
    const z = MEADOW.minZ + Math.random() * (MEADOW.maxZ - MEADOW.minZ);
    const p = groundCanvasPoint(x, z, size);
    g.fillStyle = i % 2 ? '#2f6d32' : '#6aaa4e';
    g.fillRect(p.x, p.y, 2, 3);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function groundMaterial(map: CanvasTexture): Material {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uFog: { value: new Color(0xf2c7a4) },
    },
    vertexShader: `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uFog;
      varying vec3 vW;
      void main() {
        vec2 uv = vec2((vW.x - ${GROUND.min.toFixed(1)}) / ${GROUND.size.toFixed(1)}, (vW.z - ${GROUND.min.toFixed(1)}) / ${GROUND.size.toFixed(1)});
        vec3 col = texture2D(uMap, uv).rgb;
        float fog = smoothstep(24.0, 58.0, length(cameraPosition - vW));
        gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
      }
    `,
  });
}

function grassPatch(parent: Group): InstancedMesh {
  const geo = new BoxGeometry(0.07, 0.5, 0.07);
  geo.translate(0, 0.25, 0);
  const mesh = new InstancedMesh(geo, toon(0x2f7a38), 220);
  const dummy = new Object3D();
  let n = 0;
  const plant = (x: number, z: number, h: number) => {
    if (n >= mesh.count) return;
    if (Math.abs(x) < 1.7 && z > -4.6 && z < 6.5) return;
    dummy.position.set(x, 0, z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.y = (n * 0.7) % Math.PI;
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    n += 1;
  };
  for (let i = 0; i < 160; i++) {
    plant(
      MEADOW.minX + Math.random() * (MEADOW.maxX - MEADOW.minX),
      MEADOW.minZ + Math.random() * (MEADOW.maxZ - MEADOW.minZ),
      0.7 + Math.random() * 0.8,
    );
  }
  for (let i = 0; i < 40; i++) {
    plant(-8 + Math.random() * 18, -2 + Math.random() * 12, 0.45 + Math.random() * 0.4);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function fence(parent: Group, x: number, z: number, alongX: boolean, len: number): void {
  const posts = Math.max(2, Math.round(len / 1.4));
  for (let i = 0; i < posts; i++) {
    const t = posts === 1 ? 0 : i / (posts - 1);
    const px = alongX ? x - len / 2 + t * len : x;
    const pz = alongX ? z : z - len / 2 + t * len;
    box(parent, 0.1, 0.7, 0.1, 0x8a6240, px, 0.35, pz);
  }
  if (alongX) box(parent, len, 0.08, 0.08, 0xc4a074, x, 0.48, z);
  else box(parent, 0.08, 0.08, len, 0xc4a074, x, 0.48, z);
}

function label(text: string, color: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('no canvas');
  g.fillStyle = '#f4efe4';
  g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#2a241c';
  g.lineWidth = 8;
  g.strokeRect(6, 6, 244, 84);
  g.fillStyle = color;
  g.font = '700 42px ui-rounded, Trebuchet MS, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function createTown(): Place {
  const group = new Group();
  const map = paintGround();
  const ground = new Mesh(new PlaneGeometry(GROUND.size, GROUND.size), groundMaterial(map));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  group.add(ground);

  const waterMat = new ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uA: { value: new Color(0x3c8eb4) }, uB: { value: new Color(0x1d516c) } },
    vertexShader: `
      uniform float uTime;
      varying float vH;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.35 + uTime * 1.3) * 0.08 + cos(p.y * 0.28 + uTime * 0.8) * 0.06;
        p.z += w;
        vH = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uA;
      uniform vec3 uB;
      varying float vH;
      void main() {
        float f = smoothstep(-0.08, 0.08, vH);
        gl_FragColor = vec4(mix(uB, uA, f), 0.92);
      }
    `,
  });
  const water = new Mesh(new PlaneGeometry(16, 36, 24, 24), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-18, 0.05, 0);
  group.add(water);
  group.userData.water = waterMat;

  for (const b of BUILDINGS) building(group, b);
  for (const t of TREES) tree(group, t.x, t.z, t.s);
  grassPatch(group);

  for (let i = 0; i < 18; i++) {
    const x = MEADOW.minX + 0.6 + (i % 6) * 1.15;
    const z = MEADOW.minZ + 0.8 + Math.floor(i / 6) * 2.1;
    const flower = new Mesh(new SphereGeometry(0.08, 8, 6), toon(i % 3 === 0 ? 0xf2d36b : i % 3 === 1 ? 0xf08aa8 : 0xf7f4ea));
    flower.position.set(x, 0.16, z);
    group.add(flower);
  }

  fence(group, 2, TOWN_BOUNDS.minZ, true, 22);
  fence(group, 2, TOWN_BOUNDS.maxZ, true, 20);
  fence(group, TOWN_BOUNDS.maxX, 4, false, 16);
  box(group, 0.16, 1.35, 1.5, 0x6b4a32, TOWN_BOUNDS.maxX - 0.1, 0.68, -2.15);
  const sign = new Mesh(new BoxGeometry(0.7, 0.4, 0.08), toon(0xf4efe4));
  sign.position.set(14.55, 0.85, -2.15);
  group.add(sign);
  const cove = new Mesh(new BoxGeometry(0.62, 0.36, 0.08), toon(0xf4efe4));
  cove.position.set(-8.7, 0.78, 3.4);
  group.add(cove);

  const plateZ = -7.7 + 7.5 / 2 + 0.08;
  const plate = new Mesh(new PlaneGeometry(1.7, 0.62), toon(0xf4efe4));
  plate.position.set(-0.3, 2.35, plateZ);
  group.add(plate);
  const words = new Mesh(new PlaneGeometry(1.5, 0.48), textured(label('QUILL', '#2e3d44')));
  words.position.set(-0.3, 2.35, plateZ + 0.04);
  group.add(words);

  for (let i = 0; i < 5; i++) {
    box(group, 0.9, 0.08, 0.28, 0xb08960, -10.2, 0.08 + i * 0.015, -1 + i * 0.55);
  }

  return { group, solids: townSolids(), bounds: TOWN_BOUNDS };
}

function textured(map: CanvasTexture): MeshBasicMaterial {
  map.colorSpace = SRGBColorSpace;
  return new MeshBasicMaterial({ map });
}

function room(group: Group, innerW: number, innerD: number, wall: number, floor: number): void {
  box(group, innerW, 0.08, innerD, floor, 0, 0.02, 0);
  const t = 0.16;
  const h = 2.15;
  box(group, innerW + t, h, t, wall, 0, h / 2, -innerD / 2);
  box(group, t, h, innerD, wall, -innerW / 2, h / 2, 0);
  box(group, t, h, innerD, wall, innerW / 2, h / 2, 0);
  // The south wall stays low so the follow camera can see over it.
  const south = 1.05;
  box(group, (innerW - 1.5) / 2, south, t, wall, -innerW / 4 - 0.35, south / 2, innerD / 2);
  box(group, (innerW - 1.5) / 2, south, t, wall, innerW / 4 + 0.35, south / 2, innerD / 2);
  box(group, 1.2, 1.15, 0.08, 0x6a4532, 0, 0.58, innerD / 2 - 0.02);
}

export function createHouse(): Place {
  const group = new Group();
  room(group, 8.1, 6.2, 0xf6e7cf, 0xd8b48a);
  box(group, 1.5, 0.4, 0.9, 0xf7f4ee, HOUSE.bed.x, 0.28, HOUSE.bed.z);
  box(group, 1.55, 0.16, 0.95, 0xd4546a, HOUSE.bed.x, 0.52, HOUSE.bed.z);
  box(group, 0.45, 0.16, 0.3, 0xf7f4ee, HOUSE.bed.x + 0.4, 0.62, HOUSE.bed.z - 0.2);
  box(group, 1.3, 0.12, 0.8, 0xc49a62, -1.5, 0.52, -1.55);
  box(group, 0.1, 0.5, 0.1, 0x8a6240, -1.95, 0.25, -1.85);
  box(group, 0.1, 0.5, 0.1, 0x8a6240, -1.05, 0.25, -1.85);
  box(group, 0.1, 0.5, 0.1, 0x8a6240, -1.95, 0.25, -1.25);
  box(group, 0.1, 0.5, 0.1, 0x8a6240, -1.05, 0.25, -1.25);
  const rug = new Mesh(new CylinderGeometry(0.9, 0.9, 0.03, 18), toon(0xd4546a));
  rug.position.set(0.1, 0.07, 0.1);
  group.add(rug);
  box(group, 0.7, 0.5, 0.08, 0xf6d27a, -3.7, 1.4, 0.2, 0x5a3414);
  const solids: AABB[] = [
    { minX: HOUSE.bed.x - 0.8, maxX: HOUSE.bed.x + 0.8, minZ: HOUSE.bed.z - 0.5, maxZ: HOUSE.bed.z + 0.5 },
    { minX: -2.15, maxX: -0.85, minZ: -2.05, maxZ: -1.1 },
  ];
  return { group, solids, bounds: HOUSE.bounds };
}

export function createLab(): Place {
  const group = new Group();
  room(group, 10.6, 6.8, 0xe7eef3, 0xd5ddd8);
  box(group, 2.2, 0.7, 0.7, 0xc8b08a, LAB.quill.x, 0.4, LAB.quill.z - 0.55);
  for (const table of LAB.tables) {
    box(group, 1.15, 0.7, 0.7, 0xd7c4a4, table.x, 0.4, table.z);
    box(group, 0.7, 0.08, 0.5, 0xf4efe4, table.x, 0.78, table.z);
  }
  box(group, 0.9, 0.7, 0.08, 0x9fd0c8, 4.7, 1.5, -0.4, 0x1c4a44);
  const solids: AABB[] = [
    { minX: LAB.quill.x - 1.2, maxX: LAB.quill.x + 1.2, minZ: LAB.quill.z - 1.05, maxZ: LAB.quill.z - 0.15 },
    ...LAB.tables.map((table) => ({
      minX: table.x - 0.6,
      maxX: table.x + 0.6,
      minZ: table.z - 0.4,
      maxZ: table.z + 0.4,
    })),
  ];
  return { group, solids, bounds: LAB.bounds };
}

export function createArena(): Group {
  const group = new Group();
  const dirt = new Mesh(new CylinderGeometry(3.4, 3.6, 0.12, 28), toon(0xc4a06a));
  dirt.position.y = 0.02;
  group.add(dirt);
  const ring = new Mesh(new CylinderGeometry(3.5, 3.5, 0.18, 28), toon(0x6e9a48));
  ring.position.y = 0.02;
  group.add(ring);
  const inner = new Mesh(new CylinderGeometry(3.15, 3.15, 0.2, 28), toon(0xd8b184));
  inner.position.y = 0.04;
  group.add(inner);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new Mesh(new SphereGeometry(0.16, 8, 6), toon(0x8d8680));
    stone.position.set(Math.cos(a) * 3.15, 0.16, Math.sin(a) * 3.15);
    group.add(stone);
  }
  group.add(makeShadow(1.2));
  return group;
}

export function createSky(): { sky: Mesh; update: (t: number, x: number, y: number, z: number) => void } {
  const sky = new Mesh(
    new SphereGeometry(70, 20, 16),
    new ShaderMaterial({
      side: 1,
      depthWrite: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 horizon = vec3(0.949, 0.780, 0.643);
          vec3 zenith = vec3(0.455, 0.710, 0.890);
          vec3 col = mix(horizon, zenith, smoothstep(0.02, 0.62, h));
          float sun = pow(max(dot(d, normalize(vec3(-0.45, 0.28, 0.2))), 0.0), 30.0);
          col = mix(col, vec3(1.0, 0.93, 0.75), sun);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  const birds: Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const bird = new Mesh(new ConeGeometry(0.15, 0.45, 4), toon(0x2c3344));
    bird.rotation.z = Math.PI / 2;
    sky.add(bird);
    birds.push(bird);
  }
  return {
    sky,
    update: (t, x, y, z) => {
      sky.position.set(x, y, z);
      birds.forEach((bird, i) => {
        const a = t * 0.25 + i * 2.1;
        const r = 8 + i * 2;
        bird.position.set(Math.cos(a) * r, 6 + Math.sin(t + i) * 0.4, 4 + Math.sin(a) * r * 0.35);
      });
    },
  };
}

