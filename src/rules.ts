// Battle numbers for the first morning in Hearth.
// The rival always has the type that beats yours. Damage is tuned so Tackle
// (neutral) wins that fight if you move first, and the resisted stab move does not.
// Super is a real edge, not a one-turn knockout.

export type TypeName = 'grass' | 'fire' | 'water' | 'normal';
export type LineId = 'pip' | 'emberkit' | 'drop' | 'mote' | 'peb' | 'wisp' | 'sprig';
export type MoveId = 'tackle' | 'stem' | 'thicket' | 'ember' | 'flare' | 'squirt' | 'surge' | 'nip' | 'dust';
export type Stage = 0 | 1 | 2;

export const STAB = 1.15;
export const SUPER = 1.17;
export const RESIST = 0.75;
export const START_LEVEL = 5;
export const EVOLVE = [8, 12] as const;

export const STARTERS = ['pip', 'emberkit', 'drop'] as const;

const CHART: Record<TypeName, Partial<Record<TypeName, number>>> = {
  grass: { water: SUPER, fire: RESIST, grass: RESIST },
  fire: { grass: SUPER, water: RESIST, fire: RESIST },
  water: { fire: SUPER, grass: RESIST, water: RESIST },
  normal: {},
};

export function typeMod(move: TypeName, defender: TypeName): number {
  return CHART[move][defender] ?? 1;
}

export type Move = { id: MoveId; name: string; type: TypeName; power: number };

export const MOVES: Record<MoveId, Move> = {
  tackle: { id: 'tackle', name: 'Tackle', type: 'normal', power: 52 },
  stem: { id: 'stem', name: 'Stem Slap', type: 'grass', power: 52 },
  thicket: { id: 'thicket', name: 'Thicket', type: 'grass', power: 70 },
  ember: { id: 'ember', name: 'Ember', type: 'fire', power: 52 },
  flare: { id: 'flare', name: 'Flare', type: 'fire', power: 70 },
  squirt: { id: 'squirt', name: 'Squirt', type: 'water', power: 52 },
  surge: { id: 'surge', name: 'Surge', type: 'water', power: 70 },
  nip: { id: 'nip', name: 'Nip', type: 'normal', power: 36 },
  dust: { id: 'dust', name: 'Dust', type: 'normal', power: 30 },
};

type StageStats = {
  name: string;
  hp: number;
  atk: number;
  def: number;
  spe: number;
  hpPer: number;
  atkPer: number;
  defPer: number;
  spePer: number;
};

export type Line = {
  id: LineId;
  type: TypeName;
  stages: [StageStats, StageStats, StageStats];
  learn: { level: number; id: MoveId }[];
  evolve: readonly [number, number];
};

const per = { hpPer: 3, atkPer: 1, defPer: 1, spePer: 1 };

function line(
  id: LineId,
  type: TypeName,
  stages: Array<Pick<StageStats, 'name' | 'hp' | 'atk' | 'def' | 'spe'>>,
  learn: { level: number; id: MoveId }[],
  evolve: readonly [number, number] = [99, 99],
): Line {
  const padded = [0, 1, 2].map((i) => {
    const s = stages[Math.min(i, stages.length - 1)];
    return { ...s, ...per };
  }) as [StageStats, StageStats, StageStats];
  return { id, type, stages: padded, learn, evolve };
}

export const LINES: Record<LineId, Line> = {
  pip: line('pip', 'grass', [
    { name: 'Pip', hp: 18, atk: 8, def: 8, spe: 8 },
    { name: 'Fernlet', hp: 26, atk: 11, def: 10, spe: 10 },
    { name: 'Mossantler', hp: 34, atk: 14, def: 13, spe: 13 },
  ], [
    { level: 1, id: 'tackle' },
    { level: 1, id: 'stem' },
    { level: 8, id: 'thicket' },
  ], EVOLVE),
  emberkit: line('emberkit', 'fire', [
    { name: 'Emberkit', hp: 18, atk: 8, def: 8, spe: 8 },
    { name: 'Coalpup', hp: 26, atk: 11, def: 10, spe: 11 },
    { name: 'Kilnhound', hp: 34, atk: 15, def: 12, spe: 14 },
  ], [
    { level: 1, id: 'tackle' },
    { level: 1, id: 'ember' },
    { level: 8, id: 'flare' },
  ], EVOLVE),
  drop: line('drop', 'water', [
    { name: 'Drop', hp: 18, atk: 8, def: 8, spe: 8 },
    { name: 'Brookit', hp: 26, atk: 11, def: 11, spe: 10 },
    { name: 'Rivercrest', hp: 34, atk: 14, def: 13, spe: 13 },
  ], [
    { level: 1, id: 'tackle' },
    { level: 1, id: 'squirt' },
    { level: 8, id: 'surge' },
  ], EVOLVE),
  mote: line('mote', 'normal', [
    { name: 'Mote', hp: 12, atk: 6, def: 5, spe: 7 },
  ], [
    { level: 1, id: 'dust' },
    { level: 1, id: 'nip' },
  ]),
  peb: line('peb', 'normal', [
    { name: 'Peb', hp: 16, atk: 7, def: 9, spe: 4 },
  ], [
    { level: 1, id: 'tackle' },
    { level: 1, id: 'nip' },
  ]),
  wisp: line('wisp', 'fire', [
    { name: 'Wisp', hp: 13, atk: 8, def: 5, spe: 9 },
  ], [
    { level: 1, id: 'ember' },
    { level: 1, id: 'nip' },
  ]),
  sprig: line('sprig', 'grass', [
    { name: 'Sprig', hp: 13, atk: 7, def: 6, spe: 6 },
  ], [
    { level: 1, id: 'stem' },
    { level: 1, id: 'tackle' },
  ]),
};

export type Fighter = { line: LineId; level: number; hp: number };

export function stageAt(line: LineId, level: number): Stage {
  const [a, b] = LINES[line].evolve;
  if (level >= b) return 2;
  if (level >= a) return 1;
  return 0;
}

export function stageName(line: LineId, level: number): string {
  return LINES[line].stages[stageAt(line, level)].name;
}

export type Stats = { hp: number; atk: number; def: number; spe: number };

export function statsFor(line: LineId, level: number): Stats {
  const s = LINES[line].stages[stageAt(line, level)];
  const grow = (base: number, each: number) => base + (level - 1) * each;
  return {
    hp: grow(s.hp, s.hpPer),
    atk: grow(s.atk, s.atkPer),
    def: grow(s.def, s.defPer),
    spe: grow(s.spe, s.spePer),
  };
}

export function maxHp(line: LineId, level: number): number {
  return statsFor(line, level).hp;
}

export function makeFighter(line: LineId, level: number, hp = maxHp(line, level)): Fighter {
  return { line, level, hp: Math.max(0, Math.min(hp, maxHp(line, level))) };
}

export function movesAt(line: LineId, level: number): MoveId[] {
  return LINES[line].learn.filter((entry) => entry.level <= level).map((entry) => entry.id).slice(-4);
}

export function counterLine(line: LineId): LineId {
  if (line === 'pip') return 'emberkit';
  if (line === 'emberkit') return 'drop';
  return 'pip';
}

export function strike(
  attacker: Fighter,
  defender: Fighter,
  moveId: MoveId,
  roll: number,
): { damage: number; mod: number } {
  const move = MOVES[moveId];
  const a = statsFor(attacker.line, attacker.level);
  const d = statsFor(defender.line, defender.level);
  const mod = typeMod(move.type, LINES[defender.line].type);
  const stab = move.type === LINES[attacker.line].type && move.type !== 'normal' ? STAB : 1;
  const rollMul = 0.97 + clamp01(roll) * 0.03;
  const raw = (move.power / 5) * (a.atk / d.def) * (0.7 + attacker.level * 0.06);
  const damage = Math.max(1, Math.floor(raw * stab * mod * rollMul));
  return { damage, mod };
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export type Side = 'player' | 'foe';

export type Hit = {
  side: Side;
  move: MoveId;
  damage: number;
  hpAfter: number;
  mod: number;
  fainted: boolean;
};

export function effectiveness(mod: number): 'super' | 'weak' | 'even' {
  if (mod > 1.01) return 'super';
  if (mod < 0.99) return 'weak';
  return 'even';
}

export function turnOrder(player: Fighter, foe: Fighter): Side[] {
  const ps = statsFor(player.line, player.level).spe;
  const fs = statsFor(foe.line, foe.level).spe;
  if (fs > ps) return ['foe', 'player'];
  return ['player', 'foe'];
}

export function resolveTurn(
  player: Fighter,
  foe: Fighter,
  playerMove: MoveId,
  foeMove: MoveId,
  roll: () => number,
): { player: Fighter; foe: Fighter; hits: Hit[] } {
  const a = { ...player };
  const b = { ...foe };
  const hits: Hit[] = [];
  for (const side of turnOrder(a, b)) {
    if (a.hp <= 0 || b.hp <= 0) break;
    if (side === 'player') {
      const hit = strike(a, b, playerMove, roll());
      b.hp = Math.max(0, b.hp - hit.damage);
      hits.push({ side, move: playerMove, damage: hit.damage, hpAfter: b.hp, mod: hit.mod, fainted: b.hp === 0 });
    } else {
      const hit = strike(b, a, foeMove, roll());
      a.hp = Math.max(0, a.hp - hit.damage);
      hits.push({ side, move: foeMove, damage: hit.damage, hpAfter: a.hp, mod: hit.mod, fainted: a.hp === 0 });
    }
  }
  return { player: a, foe: b, hits };
}

export function bestMove(attacker: Fighter, defender: Fighter): MoveId {
  let best = movesAt(attacker.line, attacker.level)[0];
  let score = -1;
  for (const id of movesAt(attacker.line, attacker.level)) {
    const move = MOVES[id];
    const mod = typeMod(move.type, LINES[defender.line].type);
    const stab = move.type === LINES[attacker.line].type && move.type !== 'normal' ? STAB : 1;
    const value = move.power * mod * stab;
    if (value > score) {
      score = value;
      best = id;
    }
  }
  return best;
}

export function wildMove(attacker: Fighter, defender: Fighter, roll: number): MoveId {
  const known = movesAt(attacker.line, attacker.level);
  if (roll < 0.35) return known[Math.floor(clamp01(roll) * known.length * 2) % known.length];
  return bestMove(attacker, defender);
}

export function canFlee(player: Fighter, foe: Fighter, roll: number): boolean {
  const ps = statsFor(player.line, player.level).spe;
  const fs = statsFor(foe.line, foe.level).spe;
  return roll < (ps >= fs ? 0.8 : 0.4);
}

export function xpForLevel(level: number): number {
  return 10 + level * 5;
}

export function xpGain(foeLevel: number): number {
  return 16 + foeLevel * 6;
}

// Rubies are the only currency. A win pays them. A loss and a retreat pay nothing.
export const BUN_PRICE = 6;

export function rubyPrize(foeLevel: number, rival: boolean): number {
  const level = Math.max(1, Math.floor(foeLevel));
  return rival ? 8 + level * 4 : 2 + level * 2;
}

export function rubyLabel(count: number): string {
  const n = Math.max(0, Math.floor(count));
  return n === 1 ? '1 ruby' : `${n} rubies`;
}

export function applyXp(
  line: LineId,
  level: number,
  xp: number,
  gain: number,
): { level: number; xp: number; stages: number } {
  const before = stageAt(line, level);
  let next = level;
  let bank = xp + gain;
  while (next < 30 && bank >= xpForLevel(next)) {
    bank -= xpForLevel(next);
    next += 1;
  }
  return { level: next, xp: bank, stages: stageAt(line, next) - before };
}

export function hpAfterGrowth(line: LineId, oldLevel: number, newLevel: number, hp: number): number {
  const grew = maxHp(line, newLevel) - maxHp(line, oldLevel);
  return Math.min(maxHp(line, newLevel), hp + Math.max(0, grew));
}

export function wildEncounter(roll: number, playerLevel: number): { line: LineId; level: number } {
  const level = Math.min(6, 2 + Math.floor(playerLevel / 4));
  const r = clamp01(roll);
  if (r < 0.48) return { line: 'mote', level };
  if (r < 0.76) return { line: 'peb', level };
  if (r < 0.9) return { line: 'sprig', level: Math.max(2, level - 1) };
  return { line: 'wisp', level };
}

export type StoryFlags = {
  momSpoke: boolean;
  chose: boolean;
  rivalDone: boolean;
  wonRival: boolean;
  reportedStage: number;
  meadowTold: boolean;
};

export function objective(flags: StoryFlags, mon: { line: LineId; level: number } | null): string {
  if (!flags.momSpoke) return 'Talk to Mom';
  if (!mon) return "Go to Quill's lab";
  if (!flags.rivalDone) return 'Battle Vesper';
  const stage = stageAt(mon.line, mon.level);
  if (stage === 0) return 'Train in the meadow';
  if (flags.reportedStage < stage && flags.reportedStage < 2) {
    return stage >= 2 && flags.reportedStage === 0 ? 'Show Quill the new form' : 'Show Quill the change';
  }
  if (stage < 2) return 'Reach the last form';
  return 'Hearth is quiet';
}

export function cleanName(raw: string): string {
  const letters = raw.replace(/[^a-zA-Z ]/g, '').trim().replace(/\s+/g, ' ').slice(0, 10);
  if (!letters) return 'Ren';
  return letters.charAt(0).toUpperCase() + letters.slice(1);
}

// Local -z is the front. yaw 0 looks north, which is world (0, -1).
export function yawFromDirection(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

export function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}
