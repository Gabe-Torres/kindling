import * as THREE from 'three';
import { BATTLE_CAM, BATTLE_SPOTS, PLAY_CAM } from './layout.ts';
import { yawFromDirection } from './rules.ts';

const UP = new THREE.Vector3(0, 1, 0);

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function basis(camera: THREE.PerspectiveCamera): { flat: THREE.Vector3; right: THREE.Vector3 } {
  camera.updateMatrixWorld(true);
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const flat = fwd.clone();
  flat.y = 0;
  flat.normalize();
  const right = new THREE.Vector3().crossVectors(flat, UP);
  return { flat, right };
}

const play = new THREE.PerspectiveCamera(42, 9 / 16, 0.1, 80);
play.position.set(0, PLAY_CAM.y, PLAY_CAM.z);
play.lookAt(0, PLAY_CAM.lookY, 0);
const playBasis = basis(play);
assert(playBasis.flat.z < -0.9, `play camera should look north, z=${playBasis.flat.z.toFixed(3)}`);
assert(playBasis.right.x > 0.9, `screen right should be +x, x=${playBasis.right.x.toFixed(3)}`);

const battle = new THREE.PerspectiveCamera(42, 9 / 16, 0.1, 80);
battle.position.set(BATTLE_CAM.x, BATTLE_CAM.y, BATTLE_CAM.z);
battle.lookAt(BATTLE_CAM.lookX, BATTLE_CAM.lookY, BATTLE_CAM.lookZ);
const battleBasis = basis(battle);
assert(battleBasis.flat.z < -0.85, 'battle camera looks toward the foe');
assert(BATTLE_SPOTS.player.z > BATTLE_SPOTS.foe.z, 'your kindling stands closer to the camera');

const cases: Array<[number, number, number, number]> = [
  [0, -1, 0, -1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [-1, 0, -1, 0],
];
for (const [dx, dz, ex, ez] of cases) {
  const obj = new THREE.Object3D();
  obj.rotation.y = yawFromDirection(dx, dz);
  const front = new THREE.Vector3(0, 0, -1).applyQuaternion(obj.quaternion);
  const along = front.x * ex + front.z * ez;
  assert(along > 0.99, `facing (${dx}, ${dz}) produced (${front.x.toFixed(2)}, ${front.z.toFixed(2)})`);
}

console.log('frame ok');
