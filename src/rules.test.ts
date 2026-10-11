import {
  BUILDINGS,
  HOUSE,
  LAB,
  MEADOW,
  PELL,
  PLAYER_RADIUS,
  TOWN_BOUNDS,
  TOWN_SPAWN,
  buildingSolid,
  circleHits,
  doorMat,
  inMeadow,
  insideBounds,
  moveWithCollision,
  pointIn,
  townSolids,
} from './layout.ts';
import {
  BUN_PRICE,
  EVOLVE,
  LINES,
  START_LEVEL,
  applyXp,
  bestMove,
  canFlee,
  cleanName,
  counterLine,
  effectiveness,
  hpAfterGrowth,
  lerpAngle,
  makeFighter,
  maxHp,
  movesAt,
  objective,
  resolveTurn,
  rubyLabel,
  rubyPrize,
  stageAt,
  stageName,
  statsFor,
  strike,
  turnOrder,
  typeMod,
  wildEncounter,
  xpForLevel,
  xpGain,
  yawFromDirection,
  type LineId,
  type StoryFlags,
} from './rules.ts';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function fight(playerLine: LineId, move: 'tackle' | 'stem' | 'ember' | 'squirt') {
  let player = makeFighter(playerLine, START_LEVEL);
  let foe = makeFighter(counterLine(playerLine), START_LEVEL);
  const startHp = player.hp;
  let guard = 0;
  while (player.hp > 0 && foe.hp > 0 && guard < 12) {
    const foeMove = bestMove(foe, player);
    const next = resolveTurn(player, foe, move, foeMove, () => 1);
    player = next.player;
    foe = next.foe;
    guard += 1;
  }
  return { player, foe, turns: guard, startHp };
}

const pip = makeFighter('pip', 5);
const rival = makeFighter('emberkit', 5);
assert(counterLine('pip') === 'emberkit', 'fire beats grass');
assert(counterLine('emberkit') === 'drop', 'water beats fire');
assert(counterLine('drop') === 'pip', 'grass beats water');
assert(typeMod('fire', 'grass') === typeMod('water', 'fire'), 'super is shared');
assert(typeMod('grass', 'fire') < 1, 'grass resists fire');
assert(bestMove(rival, pip) === 'ember', 'rival uses the super effective move');
assert(bestMove(pip, rival) === 'tackle', 'your stab is the worse play');

const tackle = strike(pip, rival, 'tackle', 1);
const ember = strike(rival, pip, 'ember', 1);
const stem = strike(pip, rival, 'stem', 1);
assert(ember.damage > tackle.damage, `rival should hit harder (${ember.damage} vs ${tackle.damage})`);
assert(stem.damage < tackle.damage, 'resisted stab is worse than tackle');
assert(effectiveness(ember.mod) === 'super', 'ember is super');
assert(effectiveness(stem.mod) === 'weak', 'stem is weak into fire');

const won = fight('pip', 'tackle');
assert(won.foe.hp === 0 && won.player.hp > 0, `tackle should win the first fight, player ${won.player.hp} foe ${won.foe.hp} turns ${won.turns}`);
const lost = fight('pip', 'stem');
assert(lost.player.hp === 0 && lost.foe.hp > 0, `stem should lose the first fight, player ${lost.player.hp} foe ${lost.foe.hp}`);
assert(fight('emberkit', 'tackle').player.hp > 0, 'fire starter can win with tackle');
assert(fight('drop', 'tackle').player.hp > 0, 'water starter can win with tackle');

assert(turnOrder(pip, rival)[0] === 'player', 'equal speed lets the player go first');
const fast = makeFighter('wisp', 8);
assert(turnOrder(pip, fast)[0] === 'foe', 'faster foe goes first');

const ko = resolveTurn(pip, makeFighter('mote', 2), 'tackle', 'dust', () => 1);
assert(ko.hits[0].fainted || ko.foe.hp < ko.hits[0].hpAfter + ko.hits[0].damage, 'damage sticks');
assert(ko.player.hp <= pip.hp, 'player hp only drops');

assert(stageAt('pip', EVOLVE[0] - 1) === 0, 'just before the first change');
assert(stageAt('pip', EVOLVE[0]) === 1, 'first change');
assert(stageName('pip', EVOLVE[0]) === 'Fernlet', 'first name');
assert(stageAt('pip', EVOLVE[1]) === 2, 'last change');
assert(stageName('emberkit', EVOLVE[1]) === 'Kilnhound', 'fire last name');
assert(stageName('drop', EVOLVE[1]) === 'Rivercrest', 'water last name');
assert(movesAt('pip', 5).join() === 'tackle,stem', 'opening moves');
assert(movesAt('pip', 8).includes('thicket'), 'learns thicket on the first change');

let level = 5;
let xp = 0;
let guard = 0;
while (level < EVOLVE[0] && guard < 20) {
  const got = applyXp('pip', level, xp, xpGain(3));
  level = got.level;
  xp = got.xp;
  guard += 1;
}
assert(level >= EVOLVE[0] && guard < 12, `meadow fights reach the first change in ${guard}`);
const jumped = applyXp('pip', 7, xpForLevel(7) - 1, 1);
assert(jumped.level === 8 && jumped.stages === 1, 'crossing 8 reports one stage');
const hp = hpAfterGrowth('pip', 7, 8, maxHp('pip', 7) - 4);
assert(hp === maxHp('pip', 8) - 4, 'leveling heals the new hit points and keeps the bruise');
assert(statsFor('pip', 8).hp > statsFor('pip', 7).hp, 'evolution raises hp');

assert(rubyPrize(5, true) === 28, 'a rival loss pays 28 rubies');
assert(rubyPrize(2, false) === BUN_PRICE, 'one small wild pays for a bun');
assert(rubyPrize(3, false) === 8, 'a wild pays less than the rival');
assert(rubyLabel(1) === '1 ruby', 'one ruby');
assert(rubyLabel(0) === '0 rubies', 'an empty pocket');
assert(rubyLabel(6) === '6 rubies', 'the bun price reads as a plural');
assert(insideBounds(PELL.x, PELL.z, TOWN_BOUNDS), 'Pell stands in town');
assert(!townSolids().some((solid) => circleHits(PELL.x, PELL.z, PLAYER_RADIUS, solid)), 'Pell is not inside a wall');

assert(wildEncounter(0.1, 5).line === 'mote', 'common wild');
assert(wildEncounter(0.95, 5).line === 'wisp', 'rare wild');
assert(canFlee(pip, makeFighter('mote', 2), 0.5), 'faster player can run');
assert(!canFlee(pip, makeFighter('wisp', 20), 0.5), 'a fast foe is hard to leave');

const quiet: StoryFlags = { momSpoke: false, chose: false, rivalDone: false, wonRival: false, reportedStage: 0, meadowTold: false };
assert(objective(quiet, null) === 'Talk to Mom', 'open on mom');
assert(objective({ ...quiet, momSpoke: true }, null) === "Go to Quill's lab", 'then the lab');
assert(objective({ ...quiet, momSpoke: true, rivalDone: true }, { line: 'pip', level: 5 }) === 'Train in the meadow', 'then the grass');
assert(objective({ ...quiet, momSpoke: true, rivalDone: true }, { line: 'pip', level: 8 }) === 'Show Quill the change', 'then report');
assert(objective({ ...quiet, momSpoke: true, rivalDone: true, reportedStage: 2 }, { line: 'pip', level: 12 }) === 'Hearth is quiet', 'done');
assert(cleanName('  ren ') === 'Ren', 'name cleans up');
assert(cleanName('!!!') === 'Ren', 'empty name defaults');

assert(Math.abs(yawFromDirection(0, -1)) < 1e-6, 'north is yaw 0');
assert(Math.abs(yawFromDirection(1, 0) - -Math.PI / 2) < 1e-6, 'east is -pi/2');
assert(Math.abs(lerpAngle(3, -3, 1) - -3) > 1 || Math.abs(Math.atan2(Math.sin(lerpAngle(3, -3, 0.5)), Math.cos(lerpAngle(3, -3, 0.5)))) > 2, 'angle lerp takes the short wrap');
const wrapped = lerpAngle(Math.PI - 0.2, -Math.PI + 0.2, 0.5);
assert(Math.abs(Math.atan2(Math.sin(wrapped), Math.cos(wrapped)) - Math.PI) < 0.2 || Math.abs(wrapped) > 2.5, 'wrap stays near pi');

const wall = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
const blocked = moveWithCollision(-1, 1, 2, 0, 0.4, [wall], bounds);
assert(blocked.x === -1, 'x movement into a wall is rejected');
const slide = moveWithCollision(-1, 1, 0, 2, 0.4, [wall], bounds);
assert(slide.z === 3, 'z still slides when x is the blocked axis');
const edge = moveWithCollision(9.8, 0, 1, 0, 0.4, [], bounds);
assert(edge.x === 9.8, 'bounds hold the center in');

const house = BUILDINGS[0];
const lab = BUILDINGS[1];
const mat = doorMat(house);
const labDoor = doorMat(lab);
assert(mat !== null && labDoor !== null, 'the two doors have mats');
assert(!pointIn(TOWN_SPAWN.fromHouse.x, TOWN_SPAWN.fromHouse.z, mat!), 'house spawn is off the mat');
assert(!pointIn(TOWN_SPAWN.fromLab.x, TOWN_SPAWN.fromLab.z, labDoor!), 'lab spawn is off the mat');
assert(!circleHits(TOWN_SPAWN.fromHouse.x, TOWN_SPAWN.fromHouse.z, PLAYER_RADIUS, buildingSolid(house)), 'spawn is outside the house');
assert(!circleHits(TOWN_SPAWN.fromLab.x, TOWN_SPAWN.fromLab.z, PLAYER_RADIUS, buildingSolid(lab)), 'spawn is outside the lab');
assert(insideBounds(TOWN_SPAWN.fromHouse.x, TOWN_SPAWN.fromHouse.z, TOWN_BOUNDS), 'house spawn is in town');
assert(insideBounds(TOWN_SPAWN.fromLab.x, TOWN_SPAWN.fromLab.z, TOWN_BOUNDS), 'lab spawn is in town');
assert(!inMeadow(TOWN_SPAWN.fromLab.x, TOWN_SPAWN.fromLab.z), 'leaving the lab is not already a battle');

for (const solid of townSolids()) {
  const meadowHits = circleHits((MEADOW.minX + MEADOW.maxX) / 2, (MEADOW.minZ + MEADOW.maxZ) / 2, 0.2, solid);
  assert(!meadowHits, 'the middle of the meadow is walkable');
}
assert(pointIn(HOUSE.mom.x, HOUSE.mom.z, HOUSE.bounds), 'mom is in the room');
assert(pointIn(HOUSE.bed.x, HOUSE.bed.z, HOUSE.bounds), 'the bed is in the room');
assert(pointIn(HOUSE.entry.x, HOUSE.entry.z, HOUSE.bounds), 'entry is in the room');
assert(!pointIn(HOUSE.entry.x, HOUSE.entry.z, HOUSE.exitMat), 'waking the entry does not leave');
assert(pointIn(LAB.quill.x, LAB.quill.z, LAB.bounds), 'quill is in the lab');
assert(pointIn(LAB.vesper.x, LAB.vesper.z, LAB.bounds), 'vesper is in the lab');
assert(!pointIn(LAB.vesper.x, LAB.vesper.z, LAB.exitMat), 'vesper is not standing on the exit');
for (const table of LAB.tables) assert(pointIn(table.x, table.z, LAB.bounds), 'tables are in the lab');

let reached = false;
let steps = 0;
let banked = 5;
let bankXp = 0;
while (banked < EVOLVE[1] && steps < 40) {
  const wild = wildEncounter(0.2, banked);
  const got = applyXp('drop', banked, bankXp, xpGain(wild.level));
  banked = got.level;
  bankXp = got.xp;
  steps += 1;
  if (got.stages > 0 && banked >= EVOLVE[0]) reached = true;
}
assert(reached && banked >= EVOLVE[1], `a morning in the meadow can reach the last form (${banked} in ${steps})`);

console.log('rules ok');
