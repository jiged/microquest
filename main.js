import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWorld, fitModel } from './rosie/roseblox.js';
import { TOPICS } from './questions.js';

const $ = id => document.getElementById(id);
const container = $('game-container');

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a4a55');
scene.fog = new THREE.Fog('#0a4a55', 30, 90);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const hemiLight = new THREE.HemisphereLight('#aef', '#425', 0.8);
scene.add(hemiLight);
const sun = new THREE.DirectionalLight('#fff4e0', 2);
sun.position.set(20, 40, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 120 });
scene.add(sun);

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

async function loadSky(url) {
  try {
    const tex = await texLoader.loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  } catch (e) {
    console.warn('sky failed', url, e);
    return null;
  }
}

async function loadTexture(url) {
  try {
    const tex = await texLoader.loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  } catch (e) {
    console.warn('texture failed', url, e);
    return null;
  }
}

async function loadModel(url) {
  try {
    return await gltfLoader.loadAsync(url);
  } catch (e) {
    console.warn('model failed', url);
    return null;
  }
}

// ---------- Audio ----------
const music = new Audio('assets/audio/micro-music.mp3');
music.loop = true;
music.volume = 0.4;
const sfxCorrect = new Audio('assets/audio/correct.mp3');
const sfxWrong = new Audio('assets/audio/wrong.mp3');
function play(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

// ---------- World ----------
const world = await createWorld();
const RING = 20;
const ARENA = 42;
let currentPhase = 1;
let coreGroundTexture = null;
let mitochondriaGroundTexture = null;
let mitochondriaSky = null;
let outerGroundMaterial = null;

function buildGround() {
  if (coreGroundTexture) coreGroundTexture.repeat.set(8, 8);
  const coreGround = new THREE.Mesh(
    new THREE.CircleGeometry(RING, 96).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: coreGroundTexture, color: coreGroundTexture ? 0xffffff : 0x174c53, roughness: 0.72 })
  );
  coreGround.receiveShadow = true;
  scene.add(coreGround);
  world.addStaticMesh(coreGround);

  if (mitochondriaGroundTexture) mitochondriaGroundTexture.repeat.set(12, 12);
  outerGroundMaterial = new THREE.MeshStandardMaterial({ color: '#163a43', roughness: 0.82 });
  const outerGround = new THREE.Mesh(
    new THREE.RingGeometry(RING, ARENA + 6, 128).rotateX(-Math.PI / 2),
    outerGroundMaterial
  );
  outerGround.receiveShadow = true;
  scene.add(outerGround);
  world.addStaticMesh(outerGround);
}

function buildWallRing(radius, segments, gapIndices, height, color) {
  const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.75, emissive: color, emissiveIntensity: 0.25, roughness: 0.2 });
  const segLen = (2 * Math.PI * radius) / segments + 0.3;
  for (let i = 0; i < segments; i++) {
    if (gapIndices.includes(i)) {
      continue;
    }
    const ang = (i / segments) * Math.PI * 2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(segLen, height, 1.2), mat);
    wall.position.set(Math.cos(ang) * radius, height / 2, Math.sin(ang) * radius);
    wall.rotation.y = -ang + Math.PI / 2;
    wall.castShadow = true;
    scene.add(wall);
    wall.updateMatrixWorld(true);
    world.addStaticMesh(wall);
  }
}

// Quest objects are staged by zone; membrane gates open when the Cell Core is restored.
let interactables = [];
let gateEntities = [];
let floaters = [];
let specimenGltf = null;
let phaseBannerTimer = 0;

function addGate(index, segments) {
  const ang = (index / segments) * Math.PI * 2;
  const pos = new THREE.Vector3(Math.cos(ang) * RING, 1.6, Math.sin(ang) * RING);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#ff3fbf', emissive: '#ff3fbf', emissiveIntensity: 0.6, transparent: true, opacity: 0.6 })
  );
  mesh.position.copy(pos);
  scene.add(mesh);
  const body = world.addBody({ type: 'fixed', position: [pos.x, pos.y, pos.z], shape: { type: 'sphere', radius: 2.8 } });
  gateEntities.push({ mesh, body, pos, fade: 0 });
}

function addHabitat(x, z) {
  const group = new THREE.Group();
  const coral = new THREE.MeshStandardMaterial({ color: '#555', emissive: '#000', roughness: 0.8 });
  for (let i = 0; i < 6; i++) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.6, 16, 12), coral);
    blob.position.set((Math.random() - 0.5) * 2.5, 0.4 + Math.random() * 1.2, (Math.random() - 0.5) * 2.5);
    blob.castShadow = true;
    group.add(blob);
  }
  group.position.set(x, 0, z);
  const outerZone = Math.hypot(x, z) > RING;
  group.visible = !outerZone;
  scene.add(group);
  interactables.push({ kind: 'habitat', label: outerZone ? 'Garden Habitat' : 'Damaged Habitat', mesh: group, mat: coral, pos: new THREE.Vector3(x, 1, z), phase: outerZone ? 2 : 1, locked: outerZone, done: false });
}

function addSpecimen(x, z) {
  let mesh;
  if (specimenGltf) {
    mesh = fitModel(specimenGltf.scene.clone(), { height: 1.2 });
  } else {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), new THREE.MeshStandardMaterial({ color: '#ff7ad9', emissive: '#a02070' }));
  }
  const holder = new THREE.Group();
  holder.add(mesh);
  holder.position.set(x, 1, z);
  holder.visible = false;
  scene.add(holder);
  const glow = new THREE.PointLight('#ff7ad9', 6, 6);
  holder.add(glow);
  interactables.push({ kind: 'specimen', label: 'Specimen', mesh: holder, pos: new THREE.Vector3(x, 1, z), phase: 2, locked: true, done: false });
}

function buildLevel() {
  buildGround();
  const SEG = 24;
  const gateSegments = [0, 8, 16];
  buildWallRing(RING, SEG, gateSegments, 3.5, '#3ff0d8');
  buildWallRing(ARENA, 48, [], 5, '#7a4cff');
  gateSegments.forEach(i => addGate(i, SEG));
  [[8, 6], [-9, 4], [0, -10]].forEach(([x, z]) => addHabitat(x, z));
  [[30, 12], [-28, 18], [6, -32]].forEach(([x, z]) => addHabitat(x, z));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    addSpecimen(Math.cos(a) * 33, Math.sin(a) * 33);
  }
  addAmbientCells(false, 34);
}

function addAmbientCells(outerZone, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = outerZone ? 23 + Math.random() * 16 : 2 + Math.random() * 16;
    const color = outerZone
      ? (i % 2 ? '#ffbd62' : '#49f4dc')
      : new THREE.Color().setHSL(0.45 + Math.random() * 0.25, 0.78, 0.62);
    const cell = new THREE.Mesh(
      new THREE.SphereGeometry(0.3 + Math.random() * 1.05, 14, 10),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: outerZone ? 0.58 : 0.48, emissive: outerZone ? '#5c2b08' : '#114' })
    );
    cell.position.set(Math.cos(angle) * radius, 5 + Math.random() * 13, Math.sin(angle) * radius);
    cell.userData.float = Math.random() * 6;
    cell.userData.baseY = cell.position.y;
    scene.add(cell);
    floaters.push(cell);
  }
}

// ---------- Quiz ----------
let selectedTopics = new Set(Object.keys(TOPICS));
let pool = [];
let current = null;
let score = 0;
let won = false;

const TOPIC_META = {
  'Cells (Bio.1)': { icon: '🧫', description: 'Cell structures, membranes & homeostasis' },
  'Ecosystems (Bio.2)': { icon: '🌿', description: 'Populations, interactions & energy flow' },
  'Genetics & Evolution (Bio.3)': { icon: '🧬', description: 'Inheritance, variation & natural selection' },
  'Molecular Biology (Bio.4)': { icon: '🔬', description: 'DNA, RNA & protein synthesis' },
};

function refreshTopicSelection() {
  const topicCount = Object.keys(TOPICS).length;
  document.querySelectorAll('.topic-card').forEach(card => {
    const selected = selectedTopics.has(card.dataset.topic);
    card.setAttribute('aria-pressed', String(selected));
    card.querySelector('.topic-check').textContent = selected ? 'Selected' : 'Add';
  });
  $('topic-count').textContent = selectedTopics.size
    ? `${selectedTopics.size} of ${topicCount} topics selected`
    : 'Choose at least one topic to begin';
  $('start').disabled = selectedTopics.size === 0;
  $('select-all').textContent = selectedTopics.size === topicCount ? 'Clear selection' : 'Select all';
}

function buildTopicButtons() {
  const box = $('topics');
  Object.keys(TOPICS).forEach(name => {
    const meta = TOPIC_META[name] ?? { icon: '🔬', description: 'Biology review questions' };
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'topic-card';
    card.dataset.topic = name;
    card.setAttribute('aria-pressed', 'true');
    const icon = document.createElement('span');
    icon.className = 'topic-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = meta.icon;
    const copy = document.createElement('span');
    copy.className = 'topic-copy';
    const title = document.createElement('span');
    title.className = 'topic-name';
    title.textContent = name;
    const description = document.createElement('span');
    description.className = 'topic-description';
    description.textContent = meta.description;
    copy.append(title, description);
    const state = document.createElement('span');
    state.className = 'topic-check';
    state.textContent = 'Selected';
    card.append(icon, copy, state);
    card.onclick = () => {
      if (selectedTopics.has(name)) selectedTopics.delete(name);
      else selectedTopics.add(name);
      refreshTopicSelection();
    };
    box.appendChild(card);
  });
  $('select-all').onclick = () => {
    if (selectedTopics.size === Object.keys(TOPICS).length) selectedTopics.clear();
    else selectedTopics = new Set(Object.keys(TOPICS));
    refreshTopicSelection();
  };
  refreshTopicSelection();
}

function nextQuestion() {
  if (pool.length === 0) {
    selectedTopics.forEach(t => TOPICS[t].forEach(q => pool.push({ ...q, topic: t })));
    pool.sort(() => Math.random() - 0.5);
  }
  return pool.pop();
}

function openQuiz(target) {
  player.pause();
  const q = nextQuestion();
  current = target;
  $('quiz').classList.remove('hidden');
  $('qtitle').textContent = `${target.label} · ${q.topic}`;
  $('qtext').textContent = q.q;
  $('feedback').textContent = '';
  const box = $('choices');
  box.innerHTML = '';
  q.a.forEach((choice, i) => {
    const b = document.createElement('button');
    b.textContent = choice;
    b.onclick = () => answer(q, i, b);
    box.appendChild(b);
  });
}

function answer(q, i, button) {
  const buttons = [...$('choices').children];
  buttons.forEach(b => (b.disabled = true));
  const fb = $('feedback');
  if (i === q.c) {
    play(sfxCorrect);
    button.className = 'sel';
    fb.style.color = '#7dffb0';
    fb.textContent = `Correct! ${q.e}`;
    score += 10;
    complete(current);
  } else {
    play(sfxWrong);
    buttons[q.c].className = 'sel';
    fb.style.color = '#ffb3c8';
    fb.textContent = `Not quite. ${q.e} Try another question here!`;
  }
  const close = document.createElement('button');
  close.textContent = 'Continue';
  close.onclick = () => {
    $('quiz').classList.add('hidden');
    if (!won) {
      player.start();
    }
  };
  $('choices').appendChild(close);
}

function complete(target) {
  target.done = true;
  if (target.kind === 'habitat') {
    target.mat.color.set('#ffd23f');
    target.mat.emissive.set('#ff7a1a');
    target.mat.emissiveIntensity = 0.6;
    const light = new THREE.PointLight('#ffb04a', 10, 10);
    light.position.y = 2;
    target.mesh.add(light);
  } else {
    target.fade = 1;
  }
  spawnBurst(target.pos);
  if (target.phase === 1) checkPhaseProgress();
  updateHud();
  checkWin();
}

function checkPhaseProgress() {
  const coreHabitats = interactables.filter(item => item.kind === 'habitat' && item.phase === 1);
  if (currentPhase === 1 && coreHabitats.length > 0 && coreHabitats.every(item => item.done)) {
    unlockMitochondriaGarden();
  }
}

function unlockMitochondriaGarden() {
  currentPhase = 2;
  if (mitochondriaSky) {
    scene.background = mitochondriaSky;
    scene.environment = mitochondriaSky;
  } else {
    scene.background = new THREE.Color('#123c3c');
  }
  scene.fog.color.set('#123c3c');
  hemiLight.color.set('#b9ffe7');
  hemiLight.groundColor.set('#364019');
  sun.color.set('#ffd596');
  if (outerGroundMaterial && mitochondriaGroundTexture) {
    outerGroundMaterial.map = mitochondriaGroundTexture;
    outerGroundMaterial.color.set('#ffffff');
    outerGroundMaterial.needsUpdate = true;
  }
  gateEntities.forEach(gate => {
    gate.body?.remove();
    gate.body = null;
    gate.fade = 1;
  });
  interactables.filter(item => item.phase === 2).forEach(item => {
    item.locked = false;
    item.mesh.visible = true;
    item.mesh.scale.setScalar(0.08);
    item.appear = 0.08;
  });
  addAmbientCells(true, 30);
  $('phase-banner-title').textContent = 'Mitochondrial Garden unlocked!';
  $('phase-banner-copy').textContent = 'The membrane gates open. Explore the energy-rich outer zone and collect its specimens.';
  $('phase-banner').classList.remove('hidden');
  clearTimeout(phaseBannerTimer);
  phaseBannerTimer = setTimeout(() => $('phase-banner').classList.add('hidden'), 4800);
  spawnBurst(new THREE.Vector3(0, 2, 0));
  updateHud();
}

function counts(kind, phase = null) {
  const list = interactables.filter(item => item.kind === kind && (phase === null || item.phase === phase));
  return `${list.filter(item => item.done).length}/${list.length}`;
}

function updateHud() {
  const zone = currentPhase === 1 ? 'Cell Core' : 'Mitochondrial Garden';
  const objective = currentPhase === 1
    ? `Restore inner habitats: ${counts('habitat', 1)}`
    : `Restore garden habitats: ${counts('habitat', 2)} · Collect specimens: ${counts('specimen')}`;
  $('hud').innerHTML = `<div class="hud-zone"><span class="eyebrow">PHASE ${currentPhase} OF 2</span><strong>${zone}</strong><div class="hud-objective">${objective}</div></div><div class="hud-counts">🌱 Habitats ${counts('habitat')}<br>🧫 Specimens ${counts('specimen')}</div><div class="hud-score">✦ ${score} points</div>`;
}

function checkWin() {
  const left = interactables.filter(item => !item.done).length;
  if (left === 0) {
    won = true;
    setTimeout(() => {
      $('quiz').classList.add('hidden');
      $('phase-banner').classList.add('hidden');
      player.pause();
      $('menu').classList.remove('hidden');
      $('menu').innerHTML = `<div class="menu-kicker">Quest complete</div><h1 class="menu-title">Micro<span>Quest</span></h1><p class="menu-lead">You restored the microscopic world and collected every specimen.</p><p class="menu-lead"><b>Final score: ${score}</b></p><button id="play-again" class="primary-button" type="button">Explore again →</button>`;
      $('play-again').onclick = () => location.reload();
    }, 1500);
  }
}

// ---------- Effects ----------
let particles = [];
function spawnBurst(pos) {
  for (let i = 0; i < 30; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? '#3ff0d8' : '#ffd23f', transparent: true }));
    p.position.copy(pos);
    p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6, (Math.random() - 0.5) * 6);
    p.userData.life = 1.2;
    scene.add(p);
    particles.push(p);
  }
}

function updateEffects(dt, t) {
  particles = particles.filter(p => {
    p.userData.life -= dt;
    p.userData.v.y -= 6 * dt;
    p.position.addScaledVector(p.userData.v, dt);
    p.material.opacity = Math.max(0, p.userData.life);
    if (p.userData.life <= 0) {
      scene.remove(p);
      return false;
    }
    return true;
  });
  floaters.forEach(cell => {
    cell.position.y = cell.userData.baseY + Math.sin(t + cell.userData.float) * 0.22;
  });
  gateEntities.forEach(gate => {
    if (gate.fade > 0) {
      gate.fade = Math.max(0, gate.fade - dt * 1.4);
      gate.mesh.scale.setScalar(Math.max(0.001, gate.fade));
      if (gate.fade === 0) gate.mesh.visible = false;
    }
  });
  interactables.forEach(item => {
    if (item.appear !== undefined) {
      item.appear = Math.min(1, item.appear + dt * 1.8);
      item.mesh.scale.setScalar(item.appear);
      if (item.appear >= 1) delete item.appear;
    }
    if (item.kind === 'specimen' && !item.done) {
      item.mesh.rotation.y += dt;
      item.mesh.position.y = 1 + Math.sin(t * 2 + item.pos.x) * 0.3;
    }
    if (item.fade !== undefined && item.fade > 0) {
      item.fade = Math.max(0, item.fade - dt * 1.4);
      item.mesh.scale.setScalar(Math.max(0.001, item.fade));
      if (item.fade === 0) item.mesh.visible = false;
    }
  });
}

// ---------- Player / loop ----------
const [heroGltf, specGltf, coreSky, gardenSky, coreTexture, gardenTexture] = await Promise.all([
  loadModel('assets/models/explorer.glb'),
  loadModel('assets/models/specimen.glb'),
  loadSky('assets/micro-sky.webp'),
  loadSky('assets/mitochondria-sky.webp'),
  loadTexture('assets/cell-ground.webp'),
  loadTexture('assets/mitochondria-ground.webp'),
]);
specimenGltf = specGltf;
coreGroundTexture = coreTexture;
mitochondriaGroundTexture = gardenTexture;
mitochondriaSky = gardenSky;
if (coreSky) {
  scene.background = coreSky;
  scene.environment = coreSky;
}
buildLevel();
updateHud();

const player = await world.addPlayer({ camera, canvas: renderer.domElement, model: heroGltf, feet: [0, 0.2, 0], height: 1.8, view: 'third' });
scene.add(player.root);
buildTopicButtons();

let nearest = null;
addEventListener('keydown', e => {
  if (e.code === 'KeyE' && nearest && player.active) {
    openQuiz(nearest);
  }
});

$('start').onclick = () => {
  if (selectedTopics.size === 0) return;
  const studentId = $('student-id').value.trim();
  const studentPin = $('student-pin').value;
  if (!studentId || !studentPin) {
    $('login-feedback').textContent = 'Enter both fields to continue. These preview fields are not verified by the game.';
    (!studentId ? $('student-id') : $('student-pin')).focus();
    return;
  }
  // This local preview does not authenticate or retain credentials; wire the site login before student use.
  $('student-id').value = '';
  $('student-pin').value = '';
  pool = [];
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  music.play().catch(() => {});
  player.start();
};

function findNearest() {
  nearest = null;
  let best = 4.5;
  const pos = player.position;
  interactables.forEach(it => {
    if (it.done || it.locked) return;
    const d = Math.hypot(it.pos.x - pos.x, it.pos.z - pos.z);
    if (d < best) {
      best = d;
      nearest = it;
    }
  });
  const prompt = $('prompt');
  prompt.classList.toggle('hidden', !nearest || !player.active);
  if (nearest) {
    prompt.textContent = `Press E to investigate: ${nearest.label}`;
  }
}

const timer = new THREE.Timer();
renderer.setAnimationLoop(time => {
  timer.update(time);
  const dt = Math.min(0.1, Math.max(0, timer.getDelta()));
  world.advance(dt, { paused: !player.active, afterStep: () => findNearest() });
  updateEffects(dt, time / 1000);
  renderer.render(scene, camera);
});
