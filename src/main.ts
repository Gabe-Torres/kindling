import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  Group,
} from 'three';
import { createAudio } from './audio.ts';
import {
  BATTLE_CAM,
  BATTLE_SPOTS,
  BUILDINGS,
  HOUSE,
  LAB,
  NIA,
  PELL,
  PLAY_CAM,
  PLAYER_RADIUS,
  ROOM_CAM,
  SIGNS,
  TOWN_SPAWN,
  doorMat,
  inMeadow,
  moveWithCollision,
  pointIn,
  type AABB,
  type SceneId,
} from './layout.ts';
import { LOOKS, makeMonster, makePerson } from './meshes.ts';
import {
  MOVES,
  STARTERS,
  BUN_PRICE,
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
  strike,
  wildEncounter,
  wildMove,
  xpGain,
  yawFromDirection,
  type Fighter,
  type Hit,
  type LineId,
  type MoveId,
  type StoryFlags,
} from './rules.ts';
import {
  afterRival,
  bedLines,
  blackout,
  blurb,
  learnedLine,
  levelLine,
  meadowHint,
  momHeal,
  momIntro,
  niaLine,
  pellPitch,
  pellSold,
  pitch,
  quillHeal,
  quillWaiting,
  reportLines,
  rivalIntro,
  rubyFound,
  signLine,
  takenLines,
  vesperWaiting,
  type Speech,
} from './story.ts';
import { createArena, createHouse, createLab, createSky, createTown } from './world.ts';

// The play camera sits on +z and looks toward -z. W moves -z (north, up the screen).
// That offset is constant, so turning the kid cannot flip the stick.
const SPEED = 5.4;
const SAVE_KEY = 'kindling-save';

type Mon = { line: LineId; level: number; xp: number; hp: number };
type Save = {
  v: 1;
  name: string;
  scene: SceneId;
  x: number;
  z: number;
  yaw: number;
  meadowCarry: number;
  meadowSteps: number;
  rubies: number;
  mon: Mon | null;
  flags: StoryFlags;
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio = createAudio();

const canvas = document.querySelector('#view') as HTMLCanvasElement;
const title = must('#title');
const hud = must('#hud');
const placeEl = must('#place');
const goalEl = must('#goal');
const partnerEl = must('#partner');
const partnerName = must('#partner-name');
const rubiesEl = must('#rubies');
const partnerHp = must('#partner-hp') as HTMLElement;
const box = must('#box');
const whoEl = must('#who');
const lineEl = must('#line');
const choice = must('#choice');
const choiceYes = must('#choice-yes') as HTMLButtonElement;
const choiceNo = must('#choice-no') as HTMLButtonElement;
const battle = must('#battle');
const foeName = must('#foe-name');
const foeLv = must('#foe-lv');
const foeHp = must('#foe-hp') as HTMLElement;
const myName = must('#my-name');
const myLv = must('#my-lv');
const myHp = must('#my-hp') as HTMLElement;
const battleTextEl = must('#battle-text');
const battleActions = must('#battle-actions');
const pausedEl = must('#paused');
const statusEl = must('#status');
const nameInput = must('#name') as HTMLInputElement;
const wakeBtn = must('#wake') as HTMLButtonElement;
const continueBtn = must('#continue') as HTMLButtonElement;
const pauseBtn = must('#pause') as HTMLButtonElement;
const muteBtn = must('#mute') as HTMLButtonElement;
const actBtn = must('#act') as HTMLButtonElement;
const stick = must('#stick');
const knob = must('#knob') as HTMLElement;

if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('coarse');

const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

const scene = new Scene();
scene.background = null;
const camera = new PerspectiveCamera(42, 1, 0.1, 120);
const hemi = new HemisphereLight(0xffe1c8, 0x6d8f4e, 0.95);
const sun = new DirectionalLight(0xfff0d4, 1.35);
sun.position.set(-12, 16, 8);
const fill = new DirectionalLight(0x9ec4e8, 0.35);
fill.position.set(6, 8, -8);
const ambient = new AmbientLight(0xfff4e8, 0.28);
scene.add(hemi, sun, fill, ambient);

const town = createTown();
const house = createHouse();
const lab = createLab();
const arena = createArena();
const skyRig = createSky();
town.group.visible = true;
house.group.visible = false;
lab.group.visible = false;
arena.visible = false;
scene.add(skyRig.sky, town.group, house.group, lab.group, arena);

const kid = makePerson(LOOKS.kid);
const mom = makePerson(LOOKS.mom);
const quill = makePerson(LOOKS.quill);
const vesper = makePerson(LOOKS.vesper);
const nia = makePerson(LOOKS.nia);
const pell = makePerson(LOOKS.pell);
placeAt(mom, HOUSE.mom.x, HOUSE.mom.z, Math.PI);
placeAt(quill, LAB.quill.x, LAB.quill.z, Math.PI);
placeAt(vesper, LAB.vesper.x, LAB.vesper.z, Math.PI / 2);
placeAt(nia, NIA.x, NIA.z, Math.PI);
placeAt(pell, PELL.x, PELL.z, -Math.PI / 2);
house.group.add(mom);
lab.group.add(quill, vesper);
town.group.add(nia, pell);
scene.add(kid);

const tables: Partial<Record<LineId, Group>> = {};
for (const table of LAB.tables) {
  const mesh = makeMonster(table.line, 0);
  mesh.scale.multiplyScalar(0.62);
  placeAt(mesh, table.x, table.z, 0);
  mesh.position.y = 0.86;
  lab.group.add(mesh);
  tables[table.line] = mesh;
}

const follower = new Group();
scene.add(follower);
let followerKey = '';

let save = fresh('Ren');
const state = {
  mode: 'title' as 'title' | 'play' | 'battle',
  paused: false,
  busy: false,
  x: save.x,
  z: save.z,
  yaw: save.yaw,
  mat: null as string | null,
  advance: null as (() => void) | null,
  finishChoice: null as ((yes: boolean) => void) | null,
  battlePick: null as ((pick: MoveId | 'run') => void) | null,
  menuMoves: [] as MoveId[],
  canRun: false,
  time: 0,
  stickX: 0,
  stickZ: 0,
  pitched: false,
};

const keys = new Set<string>();
syncMute();
resize();
const existing = loadSave();
if (existing) continueBtn.hidden = false;

wakeBtn.addEventListener('click', () => {
  audio.unlock();
  void begin(fresh(nameInput.value), true);
});
continueBtn.addEventListener('click', () => {
  audio.unlock();
  const data = loadSave();
  if (data) void begin(data, false);
});
pauseBtn.addEventListener('click', () => togglePause());
muteBtn.addEventListener('click', () => {
  audio.unlock();
  syncMute(audio.toggle());
  if (!audio.muted() && state.mode !== 'battle') audio.startTown();
});
actBtn.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  audio.unlock();
  pressAction();
});

window.addEventListener('keydown', onKey);
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('resize', resize);
document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'play') saveGame();
});
wireStick();

if (new URLSearchParams(location.search).has('selftest')) void runSelfTest();
else {
  // Title has no follow target yet. Snap before the first paint so the
  // opening frame is the town, not the sky the camera climbs through.
  kid.visible = false;
  placeCamera(0, true);
  requestAnimationFrame(loop);
}

function must(id: string): HTMLElement {
  const node = document.querySelector(id);
  if (!(node instanceof HTMLElement)) throw new Error(`missing ${id}`);
  return node;
}

function fresh(name: string): Save {
  return {
    v: 1,
    name: cleanName(name),
    scene: 'house',
    x: 1.15,
    z: -0.25,
    yaw: Math.PI,
    meadowCarry: 0,
    meadowSteps: 0,
    rubies: 0,
    mon: null,
    flags: {
      momSpoke: false,
      chose: false,
      rivalDone: false,
      wonRival: false,
      reportedStage: 0,
      meadowTold: false,
    },
  };
}

function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Save;
    if (data.v !== 1 || !data.name || !data.flags) return null;
    if (data.scene !== 'town' && data.scene !== 'house' && data.scene !== 'lab') return null;
    if (data.mon) data.mon.hp = Math.min(data.mon.hp, maxHp(data.mon.line, data.mon.level));
    const pocket = Math.floor(Number(data.rubies));
    data.rubies = Number.isFinite(pocket) && pocket > 0 ? pocket : 0;
    return data;
  } catch {
    return null;
  }
}

function saveGame(): void {
  if (state.mode === 'title') return;
  save.x = state.x;
  save.z = state.z;
  save.yaw = state.yaw;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // The morning still plays if storage is blocked.
  }
}

async function begin(data: Save, intro: boolean): Promise<void> {
  save = data;
  state.mode = 'play';
  state.paused = false;
  state.x = data.x;
  state.z = data.z;
  state.yaw = data.yaw;
  state.mat = null;
  title.hidden = true;
  hud.hidden = false;
  showScene(data.scene);
  syncFollower(0, true);
  placeCamera(0, true);
  refresh();
  audio.startTown();
  if (intro) {
    state.busy = true;
    await speak([{ who: '', text: 'Sunlight is on the quilt. Morning in Hearth.' }]);
    state.busy = false;
  }
}

function showScene(id: SceneId): void {
  save.scene = id;
  town.group.visible = id === 'town';
  house.group.visible = id === 'house';
  lab.group.visible = id === 'lab';
  arena.visible = false;
  kid.visible = true;
}

function placeName(): string {
  if (save.scene === 'house') return 'Your room';
  if (save.scene === 'lab') return "Quill's lab";
  return 'Hearth';
}

function monName(): string {
  return save.mon ? stageName(save.mon.line, save.mon.level) : 'your partner';
}

function refresh(): void {
  placeEl.textContent = placeName();
  goalEl.textContent = objective(save.flags, save.mon);
  rubiesEl.textContent = rubyLabel(save.rubies);
  if (!save.mon || state.mode !== 'play') {
    partnerEl.hidden = true;
  } else {
    partnerEl.hidden = false;
    const hp = maxHp(save.mon.line, save.mon.level);
    partnerName.textContent = `${monName()}  Lv ${save.mon.level}`;
    setBar(partnerHp, save.mon.hp, hp);
  }
  for (const line of STARTERS) {
    const mesh = tables[line];
    if (!mesh) continue;
    const taken = save.mon?.line === line;
    const stolen = !!save.mon && save.flags.chose && counterLine(save.mon.line) === line;
    mesh.visible = !taken && !stolen;
  }
  vesper.visible = !save.flags.rivalDone;
  statusEl.textContent = `${placeName()}. ${goalEl.textContent}.`;
}

function setBar(el: HTMLElement, hp: number, max: number): void {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, hp / max));
  el.style.transform = `scaleX(${ratio})`;
  el.dataset.band = ratio > 0.5 ? 'high' : ratio > 0.2 ? 'mid' : 'low';
}

function placeAt(mesh: Group, x: number, z: number, yaw: number): void {
  mesh.position.set(x, mesh.position.y, z);
  mesh.rotation.y = yaw;
}

function solidsNow(): AABB[] {
  const place = save.scene === 'town' ? town : save.scene === 'house' ? house : lab;
  const bodies: AABB[] = [...place.solids];
  const add = (x: number, z: number, on = true) => {
    if (!on) return;
    bodies.push({ minX: x - 0.28, maxX: x + 0.28, minZ: z - 0.28, maxZ: z + 0.28 });
  };
  if (save.scene === 'house') add(HOUSE.mom.x, HOUSE.mom.z);
  if (save.scene === 'lab') {
    add(LAB.quill.x, LAB.quill.z);
    add(LAB.vesper.x, LAB.vesper.z, vesper.visible);
  }
  if (save.scene === 'town') add(NIA.x, NIA.z);
  return bodies;
}

function boundsNow(): AABB {
  if (save.scene === 'house') return HOUSE.bounds;
  if (save.scene === 'lab') return LAB.bounds;
  return town.bounds;
}

function step(dt: number, input: { x: number; z: number }): void {
  if (state.mode !== 'play' || state.paused || state.busy) return;
  const len = Math.hypot(input.x, input.z);
  let movedX = 0;
  let movedZ = 0;
  if (len > 0.08) {
    const ix = input.x / len;
    const iz = input.z / len;
    state.yaw = lerpAngle(state.yaw, yawFromDirection(ix, iz), 1 - Math.exp(-dt * 12));
    const next = moveWithCollision(
      state.x,
      state.z,
      ix * SPEED * dt,
      iz * SPEED * dt,
      PLAYER_RADIUS,
      solidsNow(),
      boundsNow(),
    );
    movedX = next.x - state.x;
    movedZ = next.z - state.z;
    state.x = next.x;
    state.z = next.z;
  }
  kid.position.set(state.x, 0, state.z);
  kid.rotation.y = state.yaw;
  checkDoor();
  if (save.scene === 'town' && save.mon && save.flags.rivalDone) {
    const walked = Math.hypot(movedX, movedZ);
    if (inMeadow(state.x, state.z) && walked > 0) void meadowWalk(walked);
  }
}

const HOUSE_DOOR = doorMat(BUILDINGS[0]);
const LAB_DOOR = doorMat(BUILDINGS[1]);

function matUnder(): string | null {
  const here = (id: string, rect: AABB | null) => (rect && pointIn(state.x, state.z, rect) ? id : null);
  if (save.scene === 'house') return here('house-out', HOUSE.exitMat);
  if (save.scene === 'lab') return here('lab-out', LAB.exitMat);
  return here('to-house', HOUSE_DOOR) ?? here('to-lab', LAB_DOOR);
}

function checkDoor(): void {
  const mat = matUnder();
  if (!mat) {
    state.mat = null;
    return;
  }
  if (state.mat === mat) return;
  state.mat = mat;
  void enter(mat);
}

async function enter(id: string): Promise<void> {
  if (state.busy || state.mode !== 'play') return;
  state.busy = true;
  try {
    if (id === 'house-out' && !save.flags.momSpoke) {
      await speak(momIntro(save.name));
      save.flags.momSpoke = true;
      return;
    }
    if (id === 'house-out') relocate('town', TOWN_SPAWN.fromHouse);
    else if (id === 'to-house') relocate('house', HOUSE.entry);
    else if (id === 'lab-out') relocate('town', TOWN_SPAWN.fromLab);
    else if (id === 'to-lab') relocate('lab', LAB.entry);
  } finally {
    state.busy = false;
    refresh();
    saveGame();
  }
}

function relocate(id: SceneId, spawn: { x: number; z: number; yaw: number }): void {
  state.x = spawn.x;
  state.z = spawn.z;
  state.yaw = spawn.yaw;
  state.mat = null;
  kid.position.set(spawn.x, 0, spawn.z);
  kid.rotation.y = spawn.yaw;
  showScene(id);
  syncFollower(0, true);
  placeCamera(0, true);
}

async function meadowWalk(distance: number): Promise<void> {
  if (!save.flags.meadowTold) {
    save.flags.meadowTold = true;
    if (state.busy) return;
    state.busy = true;
    await speak(meadowHint());
    state.busy = false;
    saveGame();
    return;
  }
  if (state.busy || state.mode !== 'play') return;
  save.meadowCarry += distance;
  while (save.meadowCarry >= 0.9) {
    save.meadowCarry -= 0.9;
    save.meadowSteps += 1;
    if (save.meadowSteps > 2 && Math.random() < 0.34) {
      const wild = wildEncounter(Math.random(), save.mon?.level ?? START_LEVEL);
      await startBattle('wild', wild.line, wild.level);
      return;
    }
  }
}

function pressAction(): void {
  if (state.finishChoice) return;
  if (state.advance) {
    state.advance();
    return;
  }
  if (state.mode === 'play' && !state.paused) void interact();
}

async function interact(): Promise<void> {
  if (state.busy || state.mode !== 'play') return;
  const hit = nearestTalk();
  if (!hit) return;
  state.busy = true;
  try {
    await hit();
  } finally {
    state.busy = false;
    refresh();
    saveGame();
  }
}

function nearestTalk(): (() => Promise<void>) | null {
  const spots: { x: number; z: number; fn: () => Promise<void> }[] = [];
  if (save.scene === 'house') {
    spots.push({ x: HOUSE.mom.x, z: HOUSE.mom.z, fn: talkMom });
    spots.push({ x: HOUSE.bed.x, z: HOUSE.bed.z, fn: talkBed });
  } else if (save.scene === 'lab') {
    spots.push({ x: LAB.quill.x, z: LAB.quill.z, fn: talkQuill });
    if (vesper.visible) spots.push({ x: LAB.vesper.x, z: LAB.vesper.z, fn: talkVesper });
    if (!save.mon) {
      for (const table of LAB.tables) spots.push({ x: table.x, z: table.z, fn: () => inspect(table.line) });
    }
  } else {
    spots.push({ x: NIA.x, z: NIA.z, fn: async () => { await speak(niaLine()); } });
    spots.push({ x: PELL.x, z: PELL.z, fn: talkPell });
    for (const sign of SIGNS) spots.push({ x: sign.x, z: sign.z, fn: async () => { await speak(signLine(sign.id)); } });
  }
  let best: { d: number; fn: () => Promise<void> } | null = null;
  for (const spot of spots) {
    const d = Math.hypot(state.x - spot.x, state.z - spot.z);
    if (d < 1.5 && (!best || d < best.d)) best = { d, fn: spot.fn };
  }
  return best?.fn ?? null;
}

async function talkPell(): Promise<void> {
  const mon = save.mon ? monName() : null;
  const wounded = hurt();
  await speak(pellPitch(mon, wounded, save.rubies, BUN_PRICE));
  if (!save.mon || !wounded || save.rubies < BUN_PRICE) return;
  const yes = await choose(`Buy a bun for ${rubyLabel(BUN_PRICE)}?`, 'Buy', 'Not now');
  if (!yes || !save.mon || save.rubies < BUN_PRICE) return;
  save.rubies -= BUN_PRICE;
  save.mon.hp = maxHp(save.mon.line, save.mon.level);
  rubiesEl.textContent = rubyLabel(save.rubies);
  audio.heal();
  await speak(pellSold(monName()));
}

async function talkMom(): Promise<void> {
  if (!save.flags.momSpoke) {
    await speak(momIntro(save.name));
    save.flags.momSpoke = true;
    return;
  }
  if (!save.mon) {
    await speak([{ who: 'Mom', text: 'The lab is north, past the path. Quill is waiting.' }]);
    return;
  }
  await healWith(momHeal(monName(), hurt()));
}

async function talkBed(): Promise<void> {
  const wounded = hurt();
  await speak(bedLines(save.mon ? monName() : null, wounded));
  if (wounded && save.mon) {
    save.mon.hp = maxHp(save.mon.line, save.mon.level);
    audio.heal();
  }
}

async function talkQuill(): Promise<void> {
  if (!save.mon) {
    await speak(state.pitched ? quillWaiting() : pitch(save.name));
    state.pitched = true;
    return;
  }
  if (!save.flags.rivalDone) {
    await speak([{ who: 'Quill', text: 'Choose first. Vesper will not let the morning move without a battle.' }]);
    return;
  }
  const stage = stageAt(save.mon.line, save.mon.level);
  if (stage > save.flags.reportedStage) {
    await speak(reportLines(stage));
    save.flags.reportedStage = stage;
    return;
  }
  await healWith(quillHeal(monName(), hurt()));
}

async function talkVesper(): Promise<void> {
  if (!save.mon) await speak(vesperWaiting());
}

async function inspect(line: LineId): Promise<void> {
  if (save.mon) {
    await speak([{ who: '', text: `${stageName(line, START_LEVEL)} tilts its head. You already walk with ${monName()}.` }]);
    return;
  }
  await speak([{ who: '', text: blurb(line) }]);
  const yes = await choose(`Take ${stageName(line, START_LEVEL)}?`, 'Take', 'Not now');
  if (!yes || save.mon) return;
  save.mon = { line, level: START_LEVEL, xp: 0, hp: maxHp(line, START_LEVEL) };
  save.flags.chose = true;
  refresh();
  syncFollower(0, true);
  await speak(takenLines(line));
  await startBattle('rival', counterLine(line), START_LEVEL);
}

function hurt(): boolean {
  if (!save.mon) return false;
  return save.mon.hp < maxHp(save.mon.line, save.mon.level);
}

async function healWith(lines: Speech[]): Promise<void> {
  const wounded = hurt();
  await speak(lines);
  if (wounded && save.mon) {
    save.mon.hp = maxHp(save.mon.line, save.mon.level);
    audio.heal();
  }
}

function speak(lines: Speech[]): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const show = () => {
      if (i >= lines.length) {
        box.hidden = true;
        state.advance = null;
        resolve();
        return;
      }
      const line = lines[i];
      whoEl.hidden = !line.who;
      whoEl.textContent = line.who;
      lineEl.textContent = line.text;
      statusEl.textContent = `${line.who ? `${line.who}. ` : ''}${line.text}`;
      box.hidden = false;
      audio.blip();
      state.advance = () => {
        i += 1;
        show();
      };
    };
    show();
  });
}

function choose(prompt: string, yes: string, no: string): Promise<boolean> {
  whoEl.hidden = true;
  lineEl.textContent = prompt;
  box.hidden = false;
  choice.hidden = false;
  choiceYes.textContent = yes;
  choiceNo.textContent = no;
  statusEl.textContent = prompt;
  return new Promise((resolve) => {
    const finish = (value: boolean) => {
      if (state.finishChoice !== finish) return;
      state.finishChoice = null;
      choice.hidden = true;
      box.hidden = true;
      resolve(value);
    };
    state.finishChoice = finish;
    choiceYes.onclick = () => finish(true);
    choiceNo.onclick = () => finish(false);
  });
}

async function startBattle(kind: 'rival' | 'wild', foeLine: LineId, foeLevel: number): Promise<void> {
  if (!save.mon) return;
  state.mode = 'battle';
  state.busy = true;
  audio.stopTown();
  box.hidden = true;
  kid.visible = false;
  follower.visible = false;
  town.group.visible = false;
  house.group.visible = false;
  lab.group.visible = false;
  arena.visible = true;
  battle.hidden = false;
  clearArenaMons();
  const playerStage = stageAt(save.mon.line, save.mon.level);
  let playerMesh = spawnBattle(save.mon.line, playerStage, 'player');
  let foeMesh = spawnBattle(foeLine, stageAt(foeLine, foeLevel), 'foe');
  let player = makeFighter(save.mon.line, save.mon.level, save.mon.hp);
  let foe = makeFighter(foeLine, foeLevel, maxHp(foeLine, foeLevel));
  const foeMax = foe.hp;
  myName.textContent = monName();
  foeName.textContent = kind === 'rival' ? `Vesper's ${stageName(foeLine, foeLevel)}` : `Wild ${stageName(foeLine, foeLevel)}`;
  const paintCards = () => {
    myLv.textContent = `Lv ${player.level}`;
    foeLv.textContent = `Lv ${foe.level}`;
    setBar(myHp, player.hp, maxHp(player.line, player.level));
    setBar(foeHp, foe.hp, foeMax);
  };
  paintCards();
  placeCamera(0, true);
  await battleSay(kind === 'rival' ? rivalIntro(foeLine)[0].text : `A wild ${stageName(foeLine, foeLevel)} darts out of the grass.`);

  let fled = false;
  while (player.hp > 0 && foe.hp > 0) {
    const pick = await battleMenu(player, kind === 'wild');
    if (pick === 'run') {
      if (canFlee(player, foe, Math.random())) {
        await battleSay('You slip back into the grass.', 0);
        fled = true;
        break;
      }
      await battleSay('Not this time.');
      const move = bestMove(foe, player);
      const blow = strike(foe, player, move, Math.random());
      const before = player.hp;
      player.hp = Math.max(0, player.hp - blow.damage);
      await animateHit({
        side: 'foe',
        move,
        damage: blow.damage,
        hpAfter: player.hp,
        mod: blow.mod,
        fainted: player.hp === 0,
      }, playerMesh, foeMesh, before, player.hp, maxHp(player.line, player.level), myHp);
      continue;
    }
    const foeMove = kind === 'rival' ? bestMove(foe, player) : wildMove(foe, player, Math.random());
    const result = resolveTurn(player, foe, pick, foeMove, Math.random);
    for (const hit of result.hits) {
      const before = hit.side === 'player' ? foe.hp : player.hp;
      const max = hit.side === 'player' ? foeMax : maxHp(player.line, player.level);
      const bar = hit.side === 'player' ? foeHp : myHp;
      await animateHit(hit, playerMesh, foeMesh, before, hit.hpAfter, max, bar);
    }
    player = result.player;
    foe = result.foe;
    paintCards();
  }

  if (fled) {
    save.mon.hp = player.hp;
  } else if (foe.hp <= 0) {
    await battleSay(`${stageName(foe.line, foe.level)} is done.`, 0);
    const prize = rubyPrize(foe.level, kind === 'rival');
    save.rubies += prize;
    rubiesEl.textContent = rubyLabel(save.rubies);
    audio.gems();
    await battleSay(rubyFound(prize, kind === 'rival')[0].text, 0);
    const oldLevel = save.mon.level;
    const oldName = stageName(save.mon.line, oldLevel);
    const known = new Set(movesAt(save.mon.line, oldLevel));
    const grown = applyXp(save.mon.line, oldLevel, save.mon.xp, xpGain(foe.level));
    save.mon.level = grown.level;
    save.mon.xp = grown.xp;
    save.mon.hp = hpAfterGrowth(save.mon.line, oldLevel, grown.level, player.hp);
    player.level = grown.level;
    player.hp = save.mon.hp;
    paintCards();
    if (grown.level !== oldLevel) await battleSay(levelLine(oldName, grown.level)[0].text, 0);
    for (const id of movesAt(save.mon.line, grown.level)) {
      if (!known.has(id)) await battleSay(learnedLine(stageName(save.mon.line, grown.level), MOVES[id].name)[0].text, 0);
    }
    if (grown.stages > 0) {
      const nextName = stageName(save.mon.line, grown.level);
      await battleSay(`${oldName} is changing.`, 0);
      audio.evolve();
      playerMesh = await evolveMesh(playerMesh, save.mon.line, stageAt(save.mon.line, grown.level));
      await battleSay(`${oldName} changed into ${nextName}.`, 0);
      myName.textContent = nextName;
    }
    if (kind === 'rival') {
      save.flags.rivalDone = true;
      save.flags.wonRival = true;
    }
  } else {
    save.mon.hp = 0;
    await battleSay(blackout(monName())[0].text, 0);
    await battleSay(blackout(monName())[1].text, 0);
    save.mon.hp = maxHp(save.mon.line, save.mon.level);
    if (kind === 'rival') {
      save.flags.rivalDone = true;
      save.flags.wonRival = false;
    }
    state.x = 1.15;
    state.z = -0.25;
    state.yaw = Math.PI;
    save.scene = 'house';
  }

  clearArenaMons();
  battle.hidden = true;
  battleActions.replaceChildren();
  state.battlePick = null;
  state.mode = 'play';
  showScene(save.scene);
  kid.position.set(state.x, 0, state.z);
  kid.rotation.y = state.yaw;
  followerKey = '';
  syncFollower(0, true);
  placeCamera(0, true);
  refresh();
  if (kind === 'rival') await speak(afterRival(save.name, monName(), save.flags.wonRival));
  state.busy = false;
  audio.startTown();
  saveGame();
}

function clearArenaMons(): void {
  for (const child of [...arena.children]) {
    if (child.userData.battle) arena.remove(child);
  }
}

function spawnBattle(line: LineId, stage: 0 | 1 | 2, who: 'player' | 'foe'): Group {
  const spot = BATTLE_SPOTS[who];
  const mesh = makeMonster(line, stage);
  mesh.userData.battle = true;
  mesh.position.set(spot.x, spot.y, spot.z);
  mesh.rotation.y = spot.yaw;
  mesh.scale.multiplyScalar(1.35);
  arena.add(mesh);
  return mesh;
}

async function evolveMesh(current: Group, line: LineId, stage: 0 | 1 | 2): Promise<Group> {
  const next = spawnBattle(line, stage, 'player');
  next.scale.setScalar(0.15);
  arena.remove(current);
  await tween(720, (t) => {
    next.scale.setScalar(0.15 + t * 1.35);
    flash(next, t < 0.72 && Math.floor(t * 10) % 2 === 0);
  });
  flash(next, false);
  return next;
}

async function animateHit(
  hit: Hit,
  playerMesh: Group,
  foeMesh: Group,
  fromHp: number,
  toHp: number,
  max: number,
  bar: HTMLElement,
): Promise<void> {
  const actor = hit.side === 'player' ? playerMesh : foeMesh;
  const target = hit.side === 'player' ? foeMesh : playerMesh;
  const home = actor.position.z;
  const dir = hit.side === 'player' ? -1 : 1;
  audio.hit();
  await tween(160, (t) => {
    actor.position.z = home + dir * Math.sin(t * Math.PI) * 0.5;
  });
  actor.position.z = home;
  if (effectiveness(hit.mod) === 'super') audio.super();
  flash(target, true);
  await tween(90, () => {});
  flash(target, false);
  await tween(260, (t) => setBar(bar, fromHp + (toHp - fromHp) * t, max));
  const name = hit.side === 'player' ? monName() : foeName.textContent ?? 'The foe';
  let text = `${name} used ${MOVES[hit.move].name}.`;
  const effect = effectiveness(hit.mod);
  if (effect === 'super') text += ' It is super effective.';
  if (effect === 'weak') text += ' It is not very effective.';
  await battleSay(text);
}

function flash(root: Group, on: boolean): void {
  root.traverse((obj) => {
    const mesh = obj as { material?: { emissive?: { setHex: (hex: number) => void }; userData?: { baseEmissive?: number } } };
    if (!mesh.material?.emissive) return;
    mesh.material.emissive.setHex(on ? 0xffffff : mesh.material.userData?.baseEmissive ?? 0);
  });
}

function battleMenu(fighter: Fighter, allowRun: boolean): Promise<MoveId | 'run'> {
  battleActions.replaceChildren();
  const moves = movesAt(fighter.line, fighter.level);
  state.menuMoves = moves;
  state.canRun = allowRun;
  battleTextEl.textContent = `What will ${monName()} do?`;
  return new Promise((resolve) => {
    const finish = (pick: MoveId | 'run') => {
      if (state.battlePick !== finish) return;
      state.battlePick = null;
      battleActions.replaceChildren();
      resolve(pick);
    };
    state.battlePick = finish;
    moves.forEach((id, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${index + 1} ${MOVES[id].name}`;
      button.addEventListener('click', () => finish(id));
      battleActions.append(button);
    });
    if (allowRun) {
      const run = document.createElement('button');
      run.type = 'button';
      run.textContent = 'Run';
      run.addEventListener('click', () => finish('run'));
      battleActions.append(run);
    }
  });
}

function battleSay(text: string, auto = 760): Promise<void> {
  battleTextEl.textContent = text;
  statusEl.textContent = text;
  battleActions.replaceChildren();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (state.advance === done) state.advance = null;
      resolve();
    };
    state.advance = done;
    const timer = auto > 0 ? window.setTimeout(done, auto) : 0;
  });
}

function syncFollower(dt: number, snap: boolean): void {
  if (!save.mon || state.mode !== 'play') {
    follower.visible = false;
    return;
  }
  const stage = stageAt(save.mon.line, save.mon.level);
  const key = `${save.mon.line}-${stage}`;
  if (key !== followerKey) {
    follower.clear();
    const mesh = makeMonster(save.mon.line, stage);
    mesh.scale.multiplyScalar(0.62);
    follower.add(mesh);
    followerKey = key;
  }
  follower.visible = true;
  const tx = state.x + Math.sin(state.yaw) * 1.05;
  const tz = state.z + Math.cos(state.yaw) * 1.05;
  if (snap) follower.position.set(tx, 0, tz);
  else {
    follower.position.x += (tx - follower.position.x) * (1 - Math.exp(-dt * 6));
    follower.position.z += (tz - follower.position.z) * (1 - Math.exp(-dt * 6));
  }
  const dx = tx - follower.position.x;
  const dz = tz - follower.position.z;
  if (Math.hypot(dx, dz) > 0.04) follower.rotation.y = yawFromDirection(dx, dz);
}

function placeCamera(dt: number, snap: boolean): void {
  const look = new Vector3();
  const desired = new Vector3();
  if (state.mode === 'title') {
    // South of Hearth (+z), looking north (−z) and slightly down. The title
    // card covers the top of the page; this pose fills the rest with the town.
    desired.set(Math.sin(state.time * 0.08) * 2.2, 10.4, 24.6);
    look.set(1.4, 0.85, -2.2);
  } else if (state.mode === 'battle') {
    desired.set(BATTLE_CAM.x, BATTLE_CAM.y, BATTLE_CAM.z);
    look.set(BATTLE_CAM.lookX, BATTLE_CAM.lookY, BATTLE_CAM.lookZ);
  } else {
    const rig = save.scene === 'town' ? PLAY_CAM : ROOM_CAM;
    desired.set(state.x, rig.y, state.z + rig.z);
    look.set(state.x, rig.lookY, state.z);
  }
  if (snap || state.mode === 'title') camera.position.copy(desired);
  else camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
  camera.lookAt(look);
}

function readInput(): { x: number; z: number } {
  let x = state.stickX;
  let z = state.stickZ;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
  return { x, z };
}

function loop(now: number): void {
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  state.time += dt;
  step(dt, readInput());
  const amp = reduceMotion ? 0 : 0.035;
  bob(kid, state.time, amp);
  bob(follower, state.time + 0.6, amp);
  for (const person of [mom, quill, vesper, nia, pell]) bob(person, state.time, amp * 0.6);
  syncFollower(dt, false);
  placeCamera(dt, false);
  const water = town.group.userData.water as { uniforms?: { uTime: { value: number } } } | undefined;
  if (water?.uniforms) water.uniforms.uTime.value = state.time;
  skyRig.update(state.time, camera.position.x, camera.position.y, camera.position.z);
  kid.visible = state.mode === 'play';
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

let last = performance.now();

function bob(root: Group, time: number, amp: number): void {
  const node = root.userData.bob as Group | undefined;
  if (!node) {
    const child = root.children[0];
    if (child && child.userData && (child as Group).userData.bob) {
      ((child as Group).userData.bob as Group).position.y = Math.sin(time * 3) * amp;
    }
    return;
  }
  node.position.y = Math.sin(time * 3) * amp;
}

function tween(ms: number, fn: (t: number) => void): Promise<void> {
  const t0 = performance.now();
  return new Promise((resolve) => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function onKey(event: KeyboardEvent): void {
  if (event.repeat) return;
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  keys.add(event.code);
  audio.unlock();
  if (event.code === 'KeyM') {
    syncMute(audio.toggle());
    if (!audio.muted() && state.mode !== 'battle') audio.startTown();
    return;
  }
  if (event.code === 'KeyP') {
    togglePause();
    return;
  }
  if (state.finishChoice) {
    if (event.code === 'KeyY' || event.code === 'Enter') state.finishChoice(true);
    if (event.code === 'KeyN' || event.code === 'Escape') state.finishChoice(false);
    return;
  }
  if (state.advance && (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE')) {
    state.advance();
    return;
  }
  if (state.mode === 'battle' && state.battlePick) {
    const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
    if (index >= 0 && state.menuMoves[index]) state.battlePick(state.menuMoves[index]);
    if ((event.code === 'KeyR' || event.code === 'Escape') && state.canRun) state.battlePick('run');
    return;
  }
  if (state.mode === 'play' && !state.paused && (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE')) {
    void interact();
  }
}

function togglePause(): void {
  if (state.mode !== 'play') return;
  state.paused = !state.paused;
  pausedEl.hidden = !state.paused;
  pauseBtn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
  pauseBtn.textContent = state.paused ? 'Play' : 'Pause';
}

function syncMute(muted = audio.muted()): void {
  muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  muteBtn.textContent = muted ? 'Muted' : 'Sound';
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

function wireStick(): void {
  let pointer = -1;
  let originX = 0;
  let originY = 0;
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const max = 42;
    const len = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, len / max);
    state.stickX = (dx / len) * scale;
    state.stickZ = (dy / len) * scale;
    knob.style.transform = `translate(${(dx / len) * scale * 28}px, ${(dy / len) * scale * 28}px)`;
  };
  stick.addEventListener('pointerdown', (event) => {
    pointer = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    stick.setPointerCapture(pointer);
    move(event);
  });
  stick.addEventListener('pointermove', move);
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = -1;
    state.stickX = 0;
    state.stickZ = 0;
    knob.style.transform = 'translate(0px, 0px)';
  };
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);
}

async function runSelfTest(): Promise<void> {
  audio.setMuted(true);
  const data = fresh('Ren');
  data.scene = 'town';
  data.x = 0;
  data.z = 0;
  data.yaw = 0;
  data.flags.momSpoke = true;
  await begin(data, false);
  const fail = (msg: string) => {
    statusEl.textContent = `SELFTEST FAIL ${msg}`;
    throw new Error(msg);
  };
  step(0.45, { x: 0, z: -1 });
  if (!(state.z < -1)) fail(`W should move north, z=${state.z.toFixed(2)}`);
  kid.updateMatrixWorld(true);
  const north = new Vector3(0, 0, -1).applyQuaternion(kid.quaternion);
  const travelN = new Vector3(0, 0, state.z).normalize();
  if (north.dot(travelN) < 0.9) fail(`facing drifted north ${north.dot(travelN).toFixed(2)}`);
  state.x = 0;
  state.z = 0;
  state.yaw = 0;
  step(0.45, { x: 1, z: 0 });
  if (!(state.x > 1)) fail(`D should move east, x=${state.x.toFixed(2)}`);
  kid.updateMatrixWorld(true);
  const east = new Vector3(0, 0, -1).applyQuaternion(kid.quaternion);
  if (east.dot(new Vector3(1, 0, 0)) < 0.9) fail(`facing drifted east ${east.x.toFixed(2)}`);
  placeCamera(0.016, true);
  camera.updateMatrixWorld(true);
  const fwd = new Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  fwd.normalize();
  const right = new Vector3().crossVectors(fwd, new Vector3(0, 1, 0));
  if (fwd.z > -0.9) fail(`camera looks the wrong way ${fwd.z.toFixed(2)}`);
  if (right.x < 0.9) fail(`screen right is ${right.x.toFixed(2)}`);
  renderer.render(scene, camera);
  statusEl.textContent = 'SELFTEST OK';
  requestAnimationFrame(loop);
}

