// =====================================================================
//  LAST LIGHT - p5.js prototype
//  Story flow:  RUN -> BITE -> CITY -> (gate locked) PHARMACY -> key
//  -> phone call -> CITY -> hospital -> FLOOR 1..5 -> (elevator dies)
//  -> STAIRS -> FLOOR 6 + BOSS -> CHOICE -> ENDING
//
//  Solo OR local co-op (press 1 or 2 on the title screen).
//  The story and ending are the SAME either way. Co-op just scales enemy HP.
//
//  CONTROLS
//   P1: WASD move | SHIFT sprint (loud) | SPACE attack
//   P2: Arrows move | . sprint | / attack
//   ENTER or click: advance dialogue
// =====================================================================

const W = 960, H = 600;

let state = "title";            // title | run | play | choice | ending | gameover
let players = [];
let G = { infection: 0, infectionOn: false, flags: {}, id: null, level: null,
          enemies: [], items: [], levelTime: 0, spawnT: 0, shake: 0 };
let R = null;                   // run-intro state
let dlg = null;                 // dialogue {lines, i, after}
let toastMsg = { text: "", t: 0 };
let darkLayer;
let endingLines = [];

const KEYS_P1 = { up: 87, down: 83, left: 65, right: 68, sprint: 16, attack: 32 };
const KEYS_P2 = { up: 38, down: 40, left: 37, right: 39, sprint: 190, attack: 191 };

// ---------------------------------------------------------------------
//  p5 SETUP / DRAW
// ---------------------------------------------------------------------
function setup() {
  pixelDensity(1);
  const c = createCanvas(W, H);
  c.parent(document.querySelector("main"));
  darkLayer = createGraphics(W, H);
  darkLayer.pixelDensity(1);
  textFont("monospace");
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);
  background(0);
  push();
  if (G.shake > 0) { translate(random(-G.shake, G.shake), random(-G.shake, G.shake)); G.shake = max(0, G.shake - 30 * dt); }

  if (state === "title") drawTitle();
  else if (state === "run") { if (!dlg) updateRun(dt); drawRun(); }
  else if (state === "play") { if (!dlg) updatePlay(dt); drawPlay(); }
  else if (state === "choice") drawChoice();
  else if (state === "ending") drawEnding();
  else if (state === "gameover") { drawPlay(); drawGameOver(); }
  pop();

  if (dlg) drawDialogue();
  if (toastMsg.t > 0) { toastMsg.t -= dt; drawToast(); }
}

// ---------------------------------------------------------------------
//  GAME FLOW
// ---------------------------------------------------------------------
function startGame(nPlayers) {
  players = [];
  for (let i = 0; i < nPlayers; i++) {
    players.push({ id: i, x: 0, y: 0, r: 10, hp: 100, alive: true, fx: 1, fy: 0, cd: 0, atk: 0,
                   noise: 0, flash: 0, keys: i === 0 ? KEYS_P1 : KEYS_P2,
                   col: i === 0 ? [80, 160, 255] : [255, 170, 60] });
  }
  G = { infection: 0, infectionOn: false, flags: {}, id: null, level: null,
        enemies: [], items: [], levelTime: 0, spawnT: 0, shake: 0 };
  startRun();
}

function say(lines, after) { dlg = { lines, i: 0, after: after || null }; }

function advanceDialogue() {
  if (!dlg) return;
  dlg.i++;
  if (dlg.i >= dlg.lines.length) { const a = dlg.after; dlg = null; if (a) a(); }
}

function toast(text, sec = 2.5) { toastMsg = { text, t: sec }; }

// ---------------------------------------------------------------------
//  PART 1: FIRST-PERSON RUN (pseudo-3D). Outcome is ALWAYS the bite.
// ---------------------------------------------------------------------
function startRun() {
  R = { lane: 0, laneX: 0, obstacles: [], t: 0, spawnT: 0, horde: 60 };
  state = "run";
  say(STORY.lines.runIntro);
}

function updateRun(dt) {
  R.t += dt;
  R.laneX = lerp(R.laneX, R.lane, 0.15);
  R.spawnT -= dt;
  if (R.spawnT <= 0) {
    R.spawnT = random(0.7, 1.2);
    R.obstacles.push({ lane: floor(random(-1, 2)), z: 1, hit: false, kind: random(["car", "crate", "barrier"]) });
  }
  for (const o of R.obstacles) {
    o.z -= dt * 0.55;
    if (!o.hit && o.z < 0.12 && o.z > 0.02 && abs(o.lane - R.laneX) < 0.6) {
      o.hit = true; R.horde -= 18; G.shake = 10;
    }
  }
  R.obstacles = R.obstacles.filter(o => o.z > -0.1);
  R.horde = min(100, R.horde + dt * 3);
  // Either way you get caught -> same story outcome for every player.
  if (R.t >= 28 || R.horde <= 0) {
    G.shake = 14;
    say(STORY.lines.bite, () => { G.infection = 20; G.infectionOn = true; loadLevel("city"); });
  }
}

function proj(z) {
  const horizon = 230, t = 1 - z;
  const y = horizon + t * t * (H - horizon);
  const k = (y - horizon) / (H - horizon);
  return { y, scale: 0.03 + t * t * 1.1, roadHalf: lerp(25, W * 0.42, k), k };
}

function drawRun() {
  const bob = sin(R.t * 12) * 4;
  push(); translate(0, bob);
  // dusk sky
  for (let y = 0; y < 230; y += 5) { fill(lerp(40, 200, y / 230), lerp(20, 80, y / 230), lerp(50, 60, y / 230)); noStroke(); rect(0, y, W, 5); }
  fill(18, 18, 22); rect(0, 230, W, H);                       // ground
  // road
  const top = proj(1), bot = proj(0);
  fill(45, 45, 52); noStroke();
  quad(W / 2 - top.roadHalf, 230, W / 2 + top.roadHalf, 230, W / 2 + bot.roadHalf, H, W / 2 - bot.roadHalf, H);
  // lane dashes
  for (let i = 0; i < 10; i++) {
    const z = 1 - ((i / 10 + R.t * 0.55) % 1);
    const a = proj(z), b = proj(max(0, z - 0.05));
    for (const l of [-0.31, 0.31]) {
      stroke(210, 200, 120); strokeWeight(2 + a.k * 6);
      line(W / 2 + l * a.roadHalf * 2, a.y, W / 2 + l * b.roadHalf * 2, b.y);
    }
  }
  // roadside buildings
  noStroke();
  for (let i = 0; i < 12; i++) {
    const z = 1 - ((i / 12 + R.t * 0.4) % 1), p = proj(z);
    for (const s of [-1, 1]) {
      fill(20 + i * 2, 20, 30); const bw = 260 * p.scale, bh = 700 * p.scale;
      rect(W / 2 + s * (p.roadHalf + bw / 2 + 10) - bw / 2, p.y - bh, bw, bh);
      if (i % 3 === 0) { fill(255, 120, 40, 160); rect(W / 2 + s * (p.roadHalf + bw / 2 + 10) - bw / 4, p.y - bh * 0.6, bw / 2, bh * 0.1); } // lit window / fire glow
    }
  }
  // obstacles (draw far to near)
  const sorted = [...R.obstacles].sort((a, b) => b.z - a.z);
  for (const o of sorted) {
    const p = proj(o.z), x = W / 2 + o.lane * p.roadHalf * 0.62, w = 150 * p.scale, h = 100 * p.scale;
    noStroke();
    if (o.kind === "car") { fill(120, 40, 40); rect(x - w / 2, p.y - h, w, h); fill(60, 80, 100); rect(x - w / 3, p.y - h * 1.3, w * 0.66, h * 0.4); }
    else if (o.kind === "crate") { fill(130, 95, 50); rect(x - w / 3, p.y - h * 0.8, w * 0.66, h * 0.8); }
    else { fill(220, 120, 30); rect(x - w / 2, p.y - h * 0.5, w, h * 0.5); }
  }
  pop();
  // first-person hands
  const sw = sin(R.t * 12) * 18;
  fill(210, 170, 140); noStroke();
  rect(W / 2 - 170, H - 70 + sw, 60, 90, 20); rect(W / 2 + 110, H - 70 - sw, 60, 90, 20);
  // horde chasing sound/visual: red vignette grows as horde gets close
  const danger = 1 - R.horde / 100;
  noFill(); for (let i = 0; i < 12; i++) { stroke(160, 0, 0, danger * 24); strokeWeight(14); rect(i * 6, i * 6, W - i * 12, H - i * 12); }
  noStroke(); fill(255); textSize(16); textAlign(LEFT, TOP);
  text("RUN!  A / D (or arrows) to switch lanes", 16, 14);
  fill(40); rect(16, 40, 220, 14); fill(220, 50, 50); rect(16, 40, 220 * (R.horde / 100), 14);
  fill(255); textSize(12); text("HORDE DISTANCE", 16, 58);
}

// ---------------------------------------------------------------------
//  LEVELS
// ---------------------------------------------------------------------
function hospitalLayout() {   // MIRRORS the layout in the Blender script
  const walls = [], rooms = [], T = 14, cTop = 250, cBot = 350, n = 6, rw = W / n, gap = 50;
  for (let i = 0; i < n; i++) {
    const x0 = i * rw, mid = x0 + rw / 2;
    walls.push([x0, cTop, rw / 2 - gap / 2, T], [mid + gap / 2, cTop, rw / 2 - gap / 2, T]);
    walls.push([x0, cBot - T, rw / 2 - gap / 2, T], [mid + gap / 2, cBot - T, rw / 2 - gap / 2, T]);
    if (i > 0) walls.push([x0 - T / 2, 0, T, cTop], [x0 - T / 2, cBot, T, H - cBot]);
    rooms.push({ x: mid, y: cTop / 2 }, { x: mid, y: cBot + (H - cBot) / 2 });
  }
  return { walls, rooms };
}

function makeEnemy(type, x, y) {
  const T = ENEMY_TYPES[type], scale = 1 + 0.6 * (players.length - 1);   // co-op scaling
  return { type, x, y, r: T.r, hp: T.hp * scale, maxhp: T.hp * scale, speed: T.speed, dmg: T.dmg, sight: T.sight,
           col: T.col, cd: 0, wanderT: 0, wa: 0, idle: false, alerted: 0, screamed: false, drop: null,
           slam: null, slamCd: 3, summonCd: 5, frozen: false };
}

const LEVEL_BUILDERS = {
  city() {
    const hasKey = !!G.flags.hospitalKey;
    const walls = [[60, 60, 160, 120], [300, 60, 200, 120], [580, 60, 120, 120], [740, 60, 80, 120],
                   [60, 400, 140, 140], [260, 420, 180, 120], [520, 400, 160, 140], [740, 420, 160, 120]];
    const enemies = [];
    const n = hasKey ? 9 : 6;
    for (let i = 0; i < n; i++) enemies.push(["walker,walker,runner".split(",")[i % 3], random(250, 850), random(200, 380)]);
    return { id: "city", title: "HARROW BAY", bg: [30, 28, 36], wall: [60, 55, 75], darkness: 0.5, walls,
             objective: hasKey ? "Return to the hospital gate (right side)" : "Find St. Aurelia Hospital (the gate on the right)",
             start: { x: 40, y: 300 }, items: [{ kind: "med", x: 400, y: 250 }, { kind: "med", x: 620, y: 330 }], enemies,
             goals: [{ x: 880, y: 250, w: 70, h: 100, label: "HOSPITAL GATE",
                       go() { if (G.flags.hospitalKey) say(STORY.lines.enter, () => loadLevel("floor1")); else say(STORY.lines.lockedGate, () => loadLevel("pharmacy")); } }] };
  },

  pharmacy() {
    const walls = [[120, 140, 300, 20], [540, 140, 300, 20], [120, 300, 200, 20], [640, 300, 200, 20], [400, 440, 200, 20]];
    const w = makeEnemy("whitlock", 820, 120); w.drop = "hospitalKey";
    return { id: "pharmacy", title: "MAPLE STREET PHARMACY", bg: [30, 34, 30], wall: [80, 95, 80], darkness: 0.7, walls,
             objective: "Get the key from Dr. Whitlock", start: { x: 50, y: 540 },
             items: [{ kind: "med", x: 300, y: 480 }], enemiesObj: [w, makeEnemy("walker", 500, 250), makeEnemy("walker", 300, 360)],
             enemies: [], goals: [], intro: STORY.lines.pharmacy };
  },

  stairs() {
    const walls = [[0, 450, 800, 20], [160, 320, 800, 20], [0, 190, 800, 20]];
    return { id: "stairs", title: "THE STAIRWELL", bg: [28, 26, 24], wall: [90, 85, 75], darkness: 0.8, walls,
             objective: "CLIMB! Reach the top (upper right)", start: { x: 60, y: 560 }, items: [{ kind: "med", x: 880, y: 390 }], enemies: [],
             goals: [{ x: 840, y: 20, w: 100, h: 60, label: "FLOOR 6", go() { loadLevel("floor6"); } }], intro: STORY.lines.stairs,
             spawner(dt) {
               G.spawnT -= dt;
               if (G.spawnT <= 0 && G.enemies.length < 14) {
                 G.spawnT = max(0.7, 2.2 - G.levelTime * 0.03);
                 const type = random(["walker", "walker", "runner", "runner", "stalker"]);
                 const p = randomFree(12, 250);
                 if (p) { const e = makeEnemy(type, p.x, p.y); e.alerted = 8; G.enemies.push(e); }
               }
             } };
  },

  floor6() {
    const F = FLOORS[5];
    const walls = [[300, 200, 40, 40], [620, 200, 40, 40], [300, 360, 40, 40], [620, 360, 40, 40], [470, 100, 20, 80], [470, 420, 20, 80]];
    const boss = makeEnemy("boss", 760, 300); boss.drop = "vial";
    const en = [boss]; for (let i = 0; i < F.enemies.stalker; i++) en.push(makeEnemy("stalker", random(500, 900), random(60, 540)));
    return { id: "floor6", title: F.title, bg: F.bg, wall: F.wall, darkness: F.darkness, walls, objective: F.objective,
             start: { x: 50, y: 300 }, items: [{ kind: "med", x: 120, y: 120 }, { kind: "med", x: 120, y: 480 }], enemies: [],
             enemiesObj: en, goals: [],
             intro: [...F.intro, ...STORY.lines.bossIntro] };
  },
};

// floors 1-5 share the hospital layout
for (let n = 1; n <= 5; n++) {
  LEVEL_BUILDERS["floor" + n] = () => {
    const F = FLOORS[n - 1], { walls, rooms } = hospitalLayout();
    const spots = [...rooms].sort(() => random() - 0.5);
    const jit = (p) => ({ x: p.x + random(-40, 40), y: p.y + random(-40, 40) });
    const key = jit(spots[0]);
    const items = [{ kind: "keycard", x: key.x, y: key.y, label: "L" + n }, { kind: "med", ...jit(spots[1]) }];
    if (n >= 3) items.push({ kind: "med", ...jit(spots[2]) });
    const enemiesObj = [];
    let idx = 0;
    for (const [type, count] of Object.entries(F.enemies)) for (let i = 0; i < count; i++) {
      let p = idx < spots.length ? jit(spots[idx]) : { x: random(300, 850), y: 300 }; idx++;
      if (dist(p.x, p.y, 40, 300) < 200) p = { x: random(400, 850), y: 300 };
      enemiesObj.push(makeEnemy(type, p.x, p.y));
    }
    const go = n < 5 ? () => loadLevel("floor" + (n + 1))
                     : () => say(STORY.lines.elevatorDies, () => loadLevel("stairs"));   // <-- the elevator dies on floor 5
    return { id: "floor" + n, title: F.title, bg: F.bg, wall: F.wall, darkness: F.darkness, walls, objective: F.objective,
             start: { x: 40, y: 300 }, items, enemies: [], enemiesObj, needs: "keycard", intro: F.intro,
             goals: [{ x: 890, y: 268, w: 60, h: 64, label: n < 5 ? "ELEVATOR" : "ELEVATOR (dead?)", needs: "keycard", go }] };
  };
}

function loadLevel(id, withIntro = true) {
  const L = LEVEL_BUILDERS[id]();
  G.level = L; G.id = id; G.levelTime = 0; G.spawnT = 2; G.flags.keycard = false;
  G.items = L.items.map(i => ({ ...i }));
  G.enemies = [];
  for (const [type, x, y] of L.enemies) G.enemies.push(makeEnemy(type, x, y));
  if (L.enemiesObj) G.enemies.push(...L.enemiesObj);
  players.forEach((p, i) => { p.x = L.start.x + i * 28; p.y = L.start.y; p.hp = 100; p.alive = true; });
  state = "play";
  if (withIntro && L.intro) say(L.intro);
}

// ---------------------------------------------------------------------
//  COLLISION HELPERS
// ---------------------------------------------------------------------
function hitsWall(x, y, r) {
  for (const w of G.level.walls) {
    const cx = constrain(x, w[0], w[0] + w[2]), cy = constrain(y, w[1], w[1] + w[3]);
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
function moveWithWalls(o, dx, dy, r) {
  const nx = constrain(o.x + dx, r, W - r); if (!hitsWall(nx, o.y, r)) o.x = nx;
  const ny = constrain(o.y + dy, r, H - r); if (!hitsWall(o.x, ny, r)) o.y = ny;
}
function randomFree(r, minDistFromPlayers) {
  for (let i = 0; i < 40; i++) {
    const x = random(r, W - r), y = random(r, H - r);
    if (!hitsWall(x, y, r) && players.every(p => dist(x, y, p.x, p.y) > minDistFromPlayers)) return { x, y };
  }
  return null;
}

// ---------------------------------------------------------------------
//  PLAY: UPDATE
// ---------------------------------------------------------------------
function updatePlay(dt) {
  const L = G.level;
  G.levelTime += dt;
  players.forEach(p => updatePlayer(p, dt));
  G.enemies.forEach(e => updateEnemy(e, dt));
  G.enemies = G.enemies.filter(e => e.hp > 0);
  if (L.spawner) L.spawner(dt);

  // pickups
  for (const it of G.items) for (const p of players) {
    if (p.alive && !it.taken && dist(it.x, it.y, p.x, p.y) < 22) { it.taken = true; onPickup(it, p); }
  }
  G.items = G.items.filter(i => !i.taken);

  // goals
  for (const g of L.goals) for (const p of players) {
    if (p.alive && p.x > g.x && p.x < g.x + g.w && p.y > g.y && p.y < g.y + g.h) {
      if (g.needs && !G.flags[g.needs]) toast("LOCKED - find the " + g.needs + " first");
      else { g.go(); return; }
    }
  }

  // infection clock (faster on the stairs)
  if (G.infectionOn) {
    G.infection += (L.id === "stairs" ? 0.15 : 0.1) * dt;
    if (G.infection >= 100) { gameOver("The infection took you."); return; }
  }
  if (players.every(p => !p.alive)) gameOver("You were overwhelmed.");
}

function onPickup(it, p) {
  if (it.kind === "med") { p.hp = min(100, p.hp + 30); G.infection = max(0, G.infection - 12); toast("Medicine: +HP, infection slowed"); }
  else if (it.kind === "keycard") { G.flags.keycard = true; toast("Keycard " + (it.label || "") + " acquired - go to the elevator"); }
  else if (it.kind === "hospitalKey") { G.flags.hospitalKey = true; say(STORY.lines.call, () => loadLevel("city")); }
  else if (it.kind === "vial") { state = "choice"; }
}

function updatePlayer(p, dt) {
  p.cd = max(0, p.cd - dt); p.flash = max(0, p.flash - dt); p.noise = 0;
  if (!p.alive) return;
  const K = p.keys;
  let dx = (keyIsDown(K.right) ? 1 : 0) - (keyIsDown(K.left) ? 1 : 0);
  let dy = (keyIsDown(K.down) ? 1 : 0) - (keyIsDown(K.up) ? 1 : 0);
  const sprint = keyIsDown(K.sprint);
  if (dx || dy) {
    const m = Math.hypot(dx, dy); dx /= m; dy /= m; p.fx = dx; p.fy = dy;
    const sp = (sprint ? 250 : 150) * dt;
    moveWithWalls(p, dx * sp, dy * sp, p.r);
    p.noise = sprint ? 220 : 50;       // NOISE MECHANIC: sprinting is loud
  }
  if (p.atk > 0) { p.atk -= dt; p.noise = max(p.noise, 170); }
}

function tryAttack(p) {
  if (!p.alive || p.cd > 0) return;
  p.cd = 0.4; p.atk = 0.15;
  for (const e of G.enemies) {
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < e.r + 50) {
      const dx = (e.x - p.x) / d, dy = (e.y - p.y) / d;
      if (dx * p.fx + dy * p.fy > -0.1) { damageEnemy(e, 20); moveWithWalls(e, dx * 12, dy * 12, e.r); }
    }
  }
}

function damageEnemy(e, amt) {
  e.hp -= amt; e.alerted = 6;
  if (e.hp <= 0) {
    if (e.drop) G.items.push({ kind: e.drop, x: e.x, y: e.y });
    if (e.type === "boss") say(STORY.lines.bossDown);
    if (e.type === "whitlock") toast("He dropped the hospital key!");
  }
}

function damagePlayer(p, amt) {
  p.hp -= amt; p.flash = 0.25; G.shake = 6;
  if (p.hp <= 0) p.alive = false;
}

function playerLooking(e) {
  return players.some(p => {
    if (!p.alive) return false;
    const d = dist(p.x, p.y, e.x, e.y); if (d > 420 || d < 1) return false;
    return ((e.x - p.x) / d) * p.fx + ((e.y - p.y) / d) * p.fy > 0.6;
  });
}

// ---------------------------------------------------------------------
//  ENEMY AI (straight-line chase + sliding on walls).
//  UPGRADE IDEA: replace with A* pathfinding on a grid.
// ---------------------------------------------------------------------
function updateEnemy(e, dt) {
  e.cd = max(0, e.cd - dt); e.alerted = max(0, e.alerted - dt); e.frozen = false;
  let tgt = null, best = 1e9, heard = false;
  for (const p of players) {
    if (!p.alive) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < best) { best = d; tgt = p; }
    if (d < p.noise) heard = true;
  }
  if (!tgt) return;
  const alert = best < e.sight || heard || e.alerted > 0;
  let speed = e.speed;
  if (e.type === "stalker" && playerLooking(e)) { speed = 0; e.frozen = true; }
  if (e.type === "boss") { const ph = bossPhase(e); speed = [60, 85, 110][ph - 1]; }

  if (alert) {
    if (e.type === "wailer" && !e.screamed) {
      e.screamed = true; G.shake = 8; toast("A WAILER SCREAMS!");
      for (const o of G.enemies) if (dist(o.x, o.y, e.x, e.y) < 450) o.alerted = 8;
    }
    const a = atan2(tgt.y - e.y, tgt.x - e.x);
    moveWithWalls(e, cos(a) * speed * dt, sin(a) * speed * dt, e.r);
    if (best < e.r + tgt.r + 6 && e.cd <= 0 && !e.frozen) { damagePlayer(tgt, e.dmg); e.cd = e.type === "brute" ? 1.6 : 0.9; }
  } else {
    e.wanderT -= dt;
    if (e.wanderT <= 0) { e.wa = random(TWO_PI); e.wanderT = random(1, 3); e.idle = random() < 0.4; }
    if (!e.idle) moveWithWalls(e, cos(e.wa) * speed * 0.3 * dt, sin(e.wa) * speed * 0.3 * dt, e.r);
  }
  if (e.type === "boss") updateBoss(e, dt);
}

function bossPhase(e) { const r = e.hp / e.maxhp; return r > 0.66 ? 1 : r > 0.33 ? 2 : 3; }

function updateBoss(e, dt) {
  const ph = bossPhase(e);
  if (ph >= 2) {                                    // PHASE 2: ground slam
    if (e.slam) {
      e.slam.t += dt;
      if (e.slam.t >= 0.9) { for (const p of players) if (p.alive && dist(p.x, p.y, e.slam.x, e.slam.y) < 150) damagePlayer(p, 25); G.shake = 14; e.slam = null; }
    } else { e.slamCd -= dt; if (e.slamCd <= 0) { e.slam = { t: 0, x: e.x, y: e.y }; e.slamCd = 4; } }
  }
  if (ph === 3) {                                   // PHASE 3: summons runners
    e.summonCd -= dt;
    if (e.summonCd <= 0 && G.enemies.length < 8) { const r = makeEnemy("runner", e.x + random(-60, 60), e.y + random(-60, 60)); r.alerted = 10; G.enemies.push(r); e.summonCd = 5; }
  }
}

// ---------------------------------------------------------------------
//  DRAWING (play)
// ---------------------------------------------------------------------
function drawPlay() {
  const L = G.level; if (!L) return;
  background(...L.bg);
  noStroke();
  fill(...L.wall); for (const w of L.walls) rect(w[0], w[1], w[2], w[3]);
  for (const g of L.goals) {
    const open = !g.needs || G.flags[g.needs];
    fill(open ? color(60, 200, 90, 160) : color(200, 60, 60, 160)); rect(g.x, g.y, g.w, g.h);
    fill(255); textSize(11); textAlign(CENTER, CENTER); text(g.label, g.x + g.w / 2, g.y + g.h / 2);
  }
  for (const it of G.items) {
    const c = { med: [80, 220, 120], keycard: [255, 220, 60], hospitalKey: [255, 140, 40], vial: [120, 255, 255] }[it.kind];
    fill(...c); circle(it.x, it.y, 14 + sin(frameCount * 0.1) * 3);
    fill(255); textSize(10); textAlign(CENTER); text(it.kind === "med" ? "+" : it.kind === "keycard" ? "KEY" : it.kind.toUpperCase(), it.x, it.y - 14);
  }
  for (const e of G.enemies) drawEnemy(e);
  for (const p of players) {
    if (!p.alive) continue;
    fill(p.flash > 0 ? color(255, 80, 80) : color(...p.col)); circle(p.x, p.y, p.r * 2);
    stroke(255); strokeWeight(2); line(p.x, p.y, p.x + p.fx * 16, p.y + p.fy * 16); noStroke();
    if (p.atk > 0) { fill(255, 255, 255, 140); circle(p.x + p.fx * 30, p.y + p.fy * 30, 36); }
    if (p.noise > 100) { noFill(); stroke(255, 255, 255, 50); circle(p.x, p.y, p.noise * 2); noStroke(); }   // noise ring
  }
  drawDarkness(L);
  drawHUD(L);
}

function drawEnemy(e) {
  noStroke();
  let c = e.col; if (e.type === "boss") c = [[150, 40, 170], [190, 50, 120], [220, 40, 40]][bossPhase(e) - 1];
  fill(...c, e.frozen ? 120 : 255); circle(e.x, e.y, e.r * 2);
  fill(255, 40, 40); circle(e.x - e.r * 0.3, e.y - e.r * 0.2, 4); circle(e.x + e.r * 0.3, e.y - e.r * 0.2, 4);
  if (e.slam) { noFill(); stroke(255, 60, 60, 200); strokeWeight(3); circle(e.slam.x, e.slam.y, 300 * (e.slam.t / 0.9)); circle(e.slam.x, e.slam.y, 300); noStroke(); }
  if (e.maxhp > 100 && e.type !== "boss") { fill(60); rect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4); fill(220, 60, 60); rect(e.x - e.r, e.y - e.r - 10, e.r * 2 * e.hp / e.maxhp, 4); }
}

function drawDarkness(L) {
  const d = darkLayer, ctx = d.drawingContext;
  d.clear(); d.noStroke(); d.fill(0, 0, 0, L.darkness * 255); d.rect(0, 0, W, H);
  ctx.globalCompositeOperation = "destination-out";
  for (const p of players) {                    // flashlight glow around each player
    if (!p.alive) continue;
    const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 200);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 200, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  image(d, 0, 0, W, H);
}

function drawHUD(L) {
  noStroke(); textAlign(LEFT, TOP); textSize(13);
  fill(0, 0, 0, 150); rect(0, 0, W, 54);
  fill(255); text(L.title + "  -  " + L.objective, 12, 8);
  players.forEach((p, i) => {
    const x = 12 + i * 190;
    fill(50); rect(x, 30, 80, 8); fill(...p.col); rect(x, 30, 80 * max(0, p.hp) / 100, 8);
    fill(200); textSize(10); text("P" + (i + 1) + " HP", x + 86, 29);
  });
  if (G.infectionOn) {
    fill(50); rect(W - 232, 30, 220, 10); fill(90, 220, 90); rect(W - 232, 30, 220 * G.infection / 100, 10);
    fill(200); textSize(10); textAlign(RIGHT, TOP); text("INFECTION", W - 12, 8 + 5);
  }
  const boss = G.enemies.find(e => e.type === "boss");
  if (boss) { fill(50); rect(W / 2 - 200, H - 26, 400, 12); fill(170, 50, 190); rect(W / 2 - 200, H - 26, 400 * boss.hp / boss.maxhp, 12); fill(255); textAlign(CENTER, BOTTOM); text("DR. VOSS", W / 2, H - 28); }
  if (L.id === "stairs") { fill(255, 200, 80); textAlign(CENTER, TOP); textSize(14); text("ALARM  " + nf(G.levelTime, 1, 1) + "s", W / 2, 60); }
}

// ---------------------------------------------------------------------
//  OTHER SCREENS
// ---------------------------------------------------------------------
function drawTitle() {
  background(10, 14, 16); textAlign(CENTER, CENTER); fill(230); textSize(64); text(STORY.title, W / 2, 150);
  textSize(16); fill(150); text("Harrow Bay is gone. St. Aurelia is six floors up. You have a cure to find.", W / 2, 210);
  fill(255); textSize(20); text("Press 1 - SOLO", W / 2, 300); text("Press 2 - LOCAL CO-OP (same story, same ending)", W / 2, 335);
  fill(140); textSize(13);
  text("P1: WASD + SHIFT (sprint, loud!) + SPACE (attack)     P2: Arrows + . (sprint) + / (attack)", W / 2, 420);
  text("ENTER or click to advance dialogue", W / 2, 445);
}

function drawDialogue() {
  const l = dlg.lines[dlg.i];
  noStroke(); fill(0, 0, 0, 215); rect(30, H - 160, W - 60, 140, 8);
  textAlign(LEFT, TOP);
  if (l[0]) { fill(255, 210, 90); textSize(16); text(l[0], 50, H - 148); }
  fill(240); textSize(17); text(l[1], 50, H - 122, W - 100, 90);
  fill(140); textSize(11); textAlign(RIGHT, BOTTOM); text("ENTER / click", W - 45, H - 28);
}

function drawToast() { noStroke(); fill(0, 0, 0, 190); rect(W / 2 - 230, 64, 460, 30, 6); fill(255); textAlign(CENTER, CENTER); textSize(13); text(toastMsg.text, W / 2, 79); }

function drawChoice() {
  background(8, 12, 16); textAlign(CENTER, CENTER); fill(120, 255, 255); textSize(26); text("THE CURE", W / 2, 120);
  fill(255); textSize(18); STORY.lines.choicePrompt.forEach((t, i) => text(t, W / 2, 220 + i * 55));
}

function drawEnding() {
  background(6, 8, 12); textAlign(CENTER, CENTER); fill(255); textSize(19);
  endingLines.forEach((t, i) => { if (i === endingLines.length - 1) { textSize(30); fill(255, 210, 90); } text(t, W / 2, 180 + i * 70); });
  fill(130); textSize(13); text("Press R to play again", W / 2, H - 40);
}

function gameOver(msg) { G.overMsg = msg; state = "gameover"; }
function drawGameOver() {
  noStroke(); fill(0, 0, 0, 200); rect(0, 0, W, H); fill(220, 60, 60); textAlign(CENTER, CENTER); textSize(40); text("YOU DIED", W / 2, 240);
  fill(255); textSize(16); text(G.overMsg || "", W / 2, 290); text("Press R to retry this level", W / 2, 330);
}

// ---------------------------------------------------------------------
//  INPUT
// ---------------------------------------------------------------------
function keyPressed() {
  if (dlg) { if (keyCode === ENTER) advanceDialogue(); return false; }
  if (state === "title") { if (key === "1") startGame(1); if (key === "2") startGame(2); }
  else if (state === "run") {
    if (keyCode === LEFT_ARROW || keyCode === 65) R.lane = max(-1, R.lane - 1);
    if (keyCode === RIGHT_ARROW || keyCode === 68) R.lane = min(1, R.lane + 1);
  } else if (state === "play") {
    for (const p of players) if (keyCode === p.keys.attack) tryAttack(p);
  } else if (state === "choice") {
    if (key === "1") { endingLines = STORY.lines.endingA; state = "ending"; }
    if (key === "2") { endingLines = STORY.lines.endingB; state = "ending"; }
  } else if (state === "ending") { if (key === "r" || key === "R") state = "title"; }
  else if (state === "gameover") { if (key === "r" || key === "R") { G.infection = min(G.infection, 85); loadLevel(G.id, false); } }
  return false;
}

function mousePressed() { if (dlg) advanceDialogue(); }
