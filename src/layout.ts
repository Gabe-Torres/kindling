// World axes: +x east, +z south, -z north, +y up.
// The play camera sits on +z and looks toward -z, so north is up the screen.
// Player and monster fronts are local -z. yaw 0 faces north.

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

export const PLAYER_RADIUS = 0.42;

export const PLAY_CAM = { y: 8.4, z: 9.6, lookY: 1.15 };
export const ROOM_CAM = { y: 6.15, z: 7.05, lookY: 0.85 };
export const BATTLE_CAM = { x: 0.35, y: 2.45, z: 4.7, lookX: 0.05, lookY: 0.72, lookZ: -0.1 };

export const BATTLE_SPOTS = {
  player: { x: -0.15, y: 0, z: 1.42, yaw: 0 },
  foe: { x: 0.4, y: 0, z: -1.58, yaw: Math.PI },
};

export type SceneId = 'town' | 'house' | 'lab';

export const TOWN_BOUNDS: AABB = { minX: -10.6, maxX: 15.4, minZ: -14.1, maxZ: 14.1 };
export const MEADOW: AABB = { minX: 7.3, maxX: 14.7, minZ: -13.2, maxZ: -5.7 };

export type Building = {
  id: 'house' | 'lab' | 'neighbor';
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  door: 'north' | 'south' | 'none';
  wall: number;
  roof: number;
  trim: number;
};

export const BUILDINGS: Building[] = [
  { id: 'house', x: 0, z: 8.7, w: 7.2, d: 6.2, h: 2.75, door: 'north', wall: 0xf3e0c2, roof: 0xc4533a, trim: 0x6a4532 },
  { id: 'lab', x: -0.3, z: -7.7, w: 11, d: 7.5, h: 3.15, door: 'south', wall: 0xe7eef3, roof: 0x5b6c77, trim: 0x2e3d44 },
  { id: 'neighbor', x: 10.7, z: 7.5, w: 5.7, d: 5.1, h: 2.55, door: 'none', wall: 0xd5e2c6, roof: 0x6b8850, trim: 0x445338 },
];

export const TREES: { x: number; z: number; s: number }[] = [
  { x: -8.1, z: -11.2, s: 1.15 },
  { x: -7.2, z: -6.2, s: 0.92 },
  { x: -8.6, z: 0.4, s: 1.2 },
  { x: -6.4, z: 12.2, s: 1.05 },
  { x: 5.6, z: 12.4, s: 1.12 },
  { x: 13.6, z: 11.4, s: 0.88 },
  { x: 13.9, z: -1.2, s: 0.78 },
  { x: -2.8, z: -12.8, s: 1.05 },
  { x: 4.6, z: -12.7, s: 0.96 },
  { x: 3.4, z: -1.4, s: 0.72 },
];

export const SIGNS = [
  { id: 'east', x: 14.55, z: -2.15 },
  { id: 'cove', x: -8.7, z: 3.4 },
];

export const NIA = { x: 10.7, z: 4.15 };
// West of the house, east of the cove sign, so the two talk spots do not overlap.
export const PELL = { x: -6.2, z: 5.1 };

export const TOWN_SPAWN = {
  fromHouse: { x: 0, z: 3.85, yaw: 0 },
  fromLab: { x: -0.3, z: -2.15, yaw: Math.PI },
};

export const HOUSE = {
  bounds: { minX: -3.45, maxX: 3.45, minZ: -2.65, maxZ: 2.45 } as AABB,
  exitMat: { minX: -0.75, maxX: 0.75, minZ: 1.55, maxZ: 2.4 } as AABB,
  entry: { x: 0, z: 1.05, yaw: 0 },
  bed: { x: 2.15, z: 0.45 },
  mom: { x: -1.65, z: -1.2 },
};

export const LAB = {
  bounds: { minX: -5.05, maxX: 5.05, minZ: -3.25, maxZ: 2.95 } as AABB,
  exitMat: { minX: -0.8, maxX: 0.8, minZ: 2.05, maxZ: 2.9 } as AABB,
  entry: { x: 0, z: 1.35, yaw: 0 },
  quill: { x: -0.25, z: -2.25 },
  vesper: { x: 2.65, z: 1.2 },
  tables: [
    { line: 'pip' as const, x: -3.15, z: -0.4 },
    { line: 'emberkit' as const, x: 0.05, z: -0.4 },
    { line: 'drop' as const, x: 3.2, z: -0.4 },
  ],
};

export function buildingSolid(b: Building): AABB {
  return {
    minX: b.x - b.w / 2,
    maxX: b.x + b.w / 2,
    minZ: b.z - b.d / 2,
    maxZ: b.z + b.d / 2,
  };
}

// The mat sits entirely outside the wall so a spawned player can stand clear of it.
export function doorMat(b: Building): AABB | null {
  if (b.door === 'none') return null;
  const half = b.d / 2;
  if (b.door === 'north') {
    const wall = b.z - half;
    return { minX: b.x - 0.72, maxX: b.x + 0.72, minZ: wall - 1.2, maxZ: wall - 0.15 };
  }
  const wall = b.z + half;
  return { minX: b.x - 0.72, maxX: b.x + 0.72, minZ: wall + 0.15, maxZ: wall + 1.2 };
}

export function trunkSolid(tree: { x: number; z: number }): AABB {
  const r = 0.36;
  return { minX: tree.x - r, maxX: tree.x + r, minZ: tree.z - r, maxZ: tree.z + r };
}

export function townSolids(): AABB[] {
  return [
    ...BUILDINGS.map(buildingSolid),
    ...TREES.map(trunkSolid),
    { minX: -40, maxX: TOWN_BOUNDS.minX - 0.05, minZ: -40, maxZ: 40 },
  ];
}

export function pointIn(x: number, z: number, box: AABB): boolean {
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
}

export function inMeadow(x: number, z: number): boolean {
  return pointIn(x, z, MEADOW);
}

export function circleHits(cx: number, cz: number, radius: number, box: AABB): boolean {
  const x = clamp(cx, box.minX, box.maxX);
  const z = clamp(cz, box.minZ, box.maxZ);
  const dx = cx - x;
  const dz = cz - z;
  return dx * dx + dz * dz < radius * radius;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function insideBounds(x: number, z: number, bounds: AABB): boolean {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

// Slide on x, then z. Reject a component that would overlap a solid or leave the bounds.
export function moveWithCollision(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  solids: AABB[],
  bounds: AABB,
): { x: number; z: number } {
  let nx = x + dx;
  if (!insideBounds(nx, z, bounds) || solids.some((s) => circleHits(nx, z, radius, s))) nx = x;
  let nz = z + dz;
  if (!insideBounds(nx, nz, bounds) || solids.some((s) => circleHits(nx, nz, radius, s))) nz = z;
  return { x: nx, z: nz };
}
