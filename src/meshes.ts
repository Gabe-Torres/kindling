import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  SphereGeometry,
  type BufferGeometry,
} from 'three';
import type { LineId, Stage } from './rules.ts';

const pixels = new Uint8Array([
  72, 68, 64, 255,
  170, 166, 158, 255,
  255, 252, 248, 255,
]);

export const GRADIENT = new DataTexture(pixels, 3, 1, RGBAFormat);
GRADIENT.magFilter = NearestFilter;
GRADIENT.minFilter = NearestFilter;
GRADIENT.colorSpace = NoColorSpace;
GRADIENT.needsUpdate = true;

export function toon(color: number, emissive = 0): MeshToonMaterial {
  const material = new MeshToonMaterial({ color, emissive, gradientMap: GRADIENT });
  material.userData.baseEmissive = emissive;
  return material;
}

function part(geo: BufferGeometry, color: number, x: number, y: number, z: number, emissive = 0): Mesh {
  const mesh = new Mesh(geo, toon(color, emissive));
  mesh.position.set(x, y, z);
  return mesh;
}

function eyes(parent: Group, y: number, z: number, spread: number, size: number): void {
  parent.add(part(new SphereGeometry(size, 8, 8), 0x1d1a17, -spread, y, z));
  parent.add(part(new SphereGeometry(size, 8, 8), 0x1d1a17, spread, y, z));
  parent.add(part(new SphereGeometry(size * 0.35, 6, 6), 0xfff8ee, -spread - size * 0.2, y + size * 0.2, z - size * 0.4));
  parent.add(part(new SphereGeometry(size * 0.35, 6, 6), 0xfff8ee, spread - size * 0.2, y + size * 0.2, z - size * 0.4));
}

export function makeShadow(radius = 0.34): Mesh {
  const mesh = new Mesh(
    new CircleGeometry(radius, 18),
    new MeshBasicMaterial({ color: 0x1a2418, transparent: true, opacity: 0.2, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

export type PersonLook = {
  shirt: number;
  pants: number;
  hair: number;
  skin?: number;
  hat?: number;
  coat?: number;
};

// People stand with their face on local -z, same as the kindlings.
export function makePerson(look: PersonLook): Group {
  const root = new Group();
  const bob = new Group();
  bob.name = 'bob';
  root.add(bob);
  const skin = look.skin ?? 0xf0c3a0;
  bob.add(part(new CapsuleGeometry(0.08, 0.26, 4, 8), look.pants, -0.1, 0.28, 0));
  bob.add(part(new CapsuleGeometry(0.08, 0.26, 4, 8), look.pants, 0.1, 0.28, 0));
  bob.add(part(new BoxGeometry(0.16, 0.08, 0.24), 0x241c18, -0.1, 0.06, 0.02));
  bob.add(part(new BoxGeometry(0.16, 0.08, 0.24), 0x241c18, 0.1, 0.06, 0.02));
  bob.add(part(new CapsuleGeometry(0.2, 0.32, 4, 8), look.shirt, 0, 0.76, 0));
  bob.add(part(new SphereGeometry(0.2, 16, 12), skin, 0, 1.2, 0));
  eyes(bob, 1.24, -0.16, 0.07, 0.028);
  const hair = part(new SphereGeometry(0.18, 14, 8), look.hair, 0, 1.34, 0.05);
  hair.scale.set(1.15, 0.62, 0.95);
  bob.add(hair);
  if (look.hat !== undefined) {
    bob.add(part(new CylinderGeometry(0.18, 0.2, 0.14, 12), look.hat, 0, 1.4, 0));
    const brim = part(new BoxGeometry(0.46, 0.04, 0.22), look.hat, 0, 1.33, -0.12);
    bob.add(brim);
  }
  if (look.coat !== undefined) {
    bob.add(part(new BoxGeometry(0.52, 0.58, 0.3), look.coat, 0, 0.78, 0));
  }
  bob.add(makeShadow(0.28));
  root.userData.bob = bob;
  return root;
}

export const LOOKS = {
  kid: { shirt: 0x2f8f8a, pants: 0x2c3344, hair: 0x4a3428, hat: 0xe2a23a },
  mom: { shirt: 0xf7f1e8, pants: 0x6e4a58, hair: 0x6a4634, coat: 0xd4546a },
  quill: { shirt: 0x3d6d8a, pants: 0x394049, hair: 0xd5d5d5, coat: 0xf4f6f7 },
  vesper: { shirt: 0xb4332a, pants: 0x24222c, hair: 0x1b1922 },
  nia: { shirt: 0x6a8f4e, pants: 0x3e4a38, hair: 0x3a2a22 },
} as const;

function leaf(parent: Group, x: number, y: number, z: number, s: number, tilt: number): void {
  const mesh = part(new SphereGeometry(0.16 * s, 10, 8), 0x8ed36a, x, y, z);
  mesh.scale.set(0.55, 1, 0.28);
  mesh.rotation.z = tilt;
  parent.add(mesh);
}

function flame(parent: Group, x: number, y: number, z: number, s: number): void {
  const mesh = part(new ConeGeometry(0.12 * s, 0.32 * s, 8), 0xffb15a, x, y, z, 0xff5a12);
  mesh.rotation.x = Math.PI / 2;
  parent.add(mesh);
}

function grassMon(parent: Group, stage: Stage): void {
  const body = stage === 0 ? 0x67b85c : stage === 1 ? 0x4ea24a : 0x3d8c40;
  if (stage === 0) {
    parent.add(part(new SphereGeometry(0.32, 16, 12), body, 0, 0.36, 0));
    parent.add(part(new SphereGeometry(0.1, 8, 8), 0xc8e6a8, 0, 0.28, -0.22));
    leaf(parent, 0, 0.72, 0, 1, 0.1);
    eyes(parent, 0.42, -0.24, 0.1, 0.04);
    return;
  }
  if (stage === 1) {
    parent.add(part(new CapsuleGeometry(0.28, 0.28, 4, 10), body, 0, 0.48, 0));
    parent.add(part(new SphereGeometry(0.2, 12, 10), 0x8dcc74, 0, 0.86, -0.02));
    leaf(parent, -0.16, 1.05, 0, 1.1, 0.5);
    leaf(parent, 0.16, 1.08, 0, 1.2, -0.4);
    eyes(parent, 0.9, -0.16, 0.08, 0.035);
    parent.add(part(new CapsuleGeometry(0.06, 0.12, 3, 6), body, -0.16, 0.16, 0.08));
    parent.add(part(new CapsuleGeometry(0.06, 0.12, 3, 6), body, 0.16, 0.16, 0.08));
    return;
  }
  parent.add(part(new CapsuleGeometry(0.32, 0.46, 4, 10), body, 0, 0.62, 0));
  parent.add(part(new SphereGeometry(0.24, 14, 10), 0x2f6d34, 0, 1.15, -0.04));
  for (const [x, z] of [[-0.2, 0.16], [0.2, 0.16], [-0.2, -0.12], [0.2, -0.12]] as const) {
    parent.add(part(new CapsuleGeometry(0.07, 0.2, 3, 6), 0x2c6134, x, 0.22, z));
  }
  const left = part(new CylinderGeometry(0.03, 0.05, 0.42, 6), 0x6b4a2e, -0.16, 1.4, 0);
  left.rotation.z = 0.7;
  const right = part(new CylinderGeometry(0.03, 0.05, 0.42, 6), 0x6b4a2e, 0.16, 1.4, 0);
  right.rotation.z = -0.7;
  parent.add(left, right);
  leaf(parent, -0.32, 1.52, 0, 1.3, 0.8);
  leaf(parent, 0.32, 1.52, 0, 1.3, -0.8);
  eyes(parent, 1.18, -0.18, 0.08, 0.035);
}

function fireMon(parent: Group, stage: Stage, wisp: boolean): void {
  if (wisp) {
    flame(parent, 0, 0.34, 0, 1.4);
    flame(parent, 0, 0.55, -0.02, 0.8);
    eyes(parent, 0.4, -0.12, 0.06, 0.03);
    return;
  }
  const body = stage === 2 ? 0xd85a28 : 0xf08a3c;
  const r = stage === 0 ? 0.28 : stage === 1 ? 0.34 : 0.4;
  const y = stage === 0 ? 0.34 : 0.48;
  parent.add(part(new SphereGeometry(r, 16, 12), body, 0, y, 0));
  parent.add(part(new SphereGeometry(r * 0.45, 10, 8), 0xffd7b0, 0, y - 0.04, -r * 0.7));
  const earL = part(new ConeGeometry(0.08, 0.2, 6), body, -0.12, y + r + 0.02, 0);
  const earR = part(new ConeGeometry(0.08, 0.2, 6), body, 0.12, y + r + 0.02, 0);
  earL.rotation.z = 0.3;
  earR.rotation.z = -0.3;
  parent.add(earL, earR);
  eyes(parent, y + 0.04, -r * 0.72, r * 0.32, 0.035);
  flame(parent, 0, y * 0.7, r + 0.12, stage === 0 ? 0.9 : stage === 1 ? 1.25 : 1.7);
  if (stage === 2) {
    flame(parent, -0.18, y + r, -0.05, 0.7);
    flame(parent, 0.18, y + r, -0.05, 0.7);
    parent.add(part(new CapsuleGeometry(0.06, 0.22, 3, 6), body, -0.16, 0.2, 0.1));
    parent.add(part(new CapsuleGeometry(0.06, 0.22, 3, 6), body, 0.16, 0.2, 0.1));
  }
}

function waterMon(parent: Group, stage: Stage): void {
  const body = stage === 2 ? 0x2f78b0 : 0x4aa0d8;
  if (stage === 0) {
    parent.add(part(new SphereGeometry(0.3, 16, 12), body, 0, 0.32, 0));
    parent.add(part(new SphereGeometry(0.16, 10, 8), 0xd7f4ff, 0, 0.28, -0.2));
    const fin = part(new SphereGeometry(0.16, 10, 8), 0x2a6ea8, 0, 0.34, 0.26);
    fin.scale.set(0.3, 0.7, 0.5);
    parent.add(fin);
    eyes(parent, 0.38, -0.22, 0.1, 0.04);
    return;
  }
  const len = stage === 1 ? 0.34 : 0.7;
  parent.add(part(new CapsuleGeometry(0.24, len, 4, 10), body, 0, 0.4, 0));
  parent.add(part(new SphereGeometry(0.18, 12, 10), 0xd7f4ff, 0, 0.38, -0.22 - len * 0.15));
  const crest = part(new ConeGeometry(0.12, stage === 2 ? 0.46 : 0.28, 6), 0x8fd4f2, 0, 0.72, -0.05);
  parent.add(crest);
  const tail = part(new SphereGeometry(0.2, 10, 8), 0x2a6ea8, 0, 0.42, 0.36 + len * 0.35);
  tail.scale.set(0.25, 0.85, 0.55);
  parent.add(tail);
  eyes(parent, 0.46, -0.28 - len * 0.1, 0.1, 0.035);
  if (stage === 2) {
    parent.add(part(new CapsuleGeometry(0.05, 0.16, 3, 6), body, -0.18, 0.16, 0.1));
    parent.add(part(new CapsuleGeometry(0.05, 0.16, 3, 6), body, 0.18, 0.16, 0.1));
  }
}

function moteMon(parent: Group): void {
  parent.add(part(new SphereGeometry(0.18, 12, 10), 0xf3e2b8, 0, 0.28, 0));
  const wingL = part(new SphereGeometry(0.16, 8, 6), 0xfff8ee, -0.2, 0.32, 0.02);
  wingL.scale.set(0.4, 0.15, 0.9);
  const wingR = part(new SphereGeometry(0.16, 8, 6), 0xfff8ee, 0.2, 0.32, 0.02);
  wingR.scale.set(0.4, 0.15, 0.9);
  parent.add(wingL, wingR);
  eyes(parent, 0.32, -0.14, 0.06, 0.025);
}

function pebMon(parent: Group): void {
  parent.add(part(new DodecahedronGeometry(0.32, 0), 0x8d8274, 0, 0.32, 0));
  parent.add(part(new DodecahedronGeometry(0.12, 0), 0xb1a898, 0.12, 0.48, -0.12));
  eyes(parent, 0.38, -0.22, 0.1, 0.035);
}

function sprigMon(parent: Group): void {
  parent.add(part(new SphereGeometry(0.2, 12, 10), 0x7dcc62, 0, 0.24, 0));
  leaf(parent, 0, 0.48, 0, 0.7, 0.2);
  eyes(parent, 0.28, -0.14, 0.07, 0.028);
}

// Kindlings face local -z. Evolution changes the silhouette, not just the scale.
export function makeMonster(line: LineId, stage: Stage): Group {
  const root = new Group();
  const bob = new Group();
  bob.name = 'bob';
  root.add(bob);
  if (line === 'pip') grassMon(bob, stage);
  else if (line === 'sprig') sprigMon(bob);
  else if (line === 'emberkit') fireMon(bob, stage, false);
  else if (line === 'wisp') fireMon(bob, 0, true);
  else if (line === 'drop') waterMon(bob, stage);
  else if (line === 'mote') moteMon(bob);
  else pebMon(bob);
  bob.add(makeShadow(0.3 + stage * 0.06));
  const scale = line === 'mote' || line === 'sprig' || line === 'wisp' ? 0.9 : 1 + stage * 0.12;
  root.scale.setScalar(scale);
  root.userData.bob = bob;
  return root;
}
