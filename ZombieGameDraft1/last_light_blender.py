"""
LAST LIGHT - BLENDER BUILD SCRIPT  (Blender 3.6+ / 4.x)
=======================================================
Builds the whole game world in one click:
  * Harrow Bay city street + hospital gate
  * St. Aurelia hospital: 6 floors, each with its own look and props
  * Elevator shaft (the car is parked "dead" on floor 5)
  * Stairwell between floor 5 and 6
  * Floor 6 boss arena
  * Characters + creatures (blocky bases you can sculpt/rig)
  * A first-person "running" camera animation for the opening
  * SPAWN_ empties for enemies, so you know where things go
  * Optional JSON export of the wall layout (for p5.js / Roblox later)

HOW TO USE
  1. Open Blender -> "Scripting" tab -> New -> paste this file -> Run Script (Play).
  2. Edit the SETTINGS / FLOORS blocks below and re-run to experiment.
  3. Each floor is its own Collection ("Floor_1"... "Floor_6"). Click the eye icon to hide floors.
  4. Press Numpad 0 to look through the running camera, press Space to play the animation.

THE FLOOR LAYOUT MATCHES THE p5.js VERSION (same rooms, same corridor), so the
two projects stay in sync. 1 p5 pixel = S meters here.

EXPORTING
  Characters/props -> File > Export > FBX (Selected Objects) -> Roblox Studio Asset Manager > Bulk Import.
  Layout JSON      -> set EXPORT_LAYOUT_JSON = True.
"""

import bpy
import math
import random
import json
import os

# ===================== SETTINGS =====================
SEED = 7                       # change for different city layouts
S = 0.04                       # p5 pixel -> meters (960px wide floor = 38.4 m)
FLOOR_HEIGHT = 5.0             # meters between floors
WALL_H = 3.6
BUILD_CITY = True
BUILD_HOSPITAL = True
BUILD_STAIRS_AND_ELEVATOR = True
BUILD_CHARACTERS = True
BUILD_CAMERA_RUN = True
EXPORT_LAYOUT_JSON = False     # writes last_light_layout.json next to your .blend (or your home folder)
CITY_OFFSET_Y = -90.0          # city sits in front of the hospital
# ====================================================

W, H = 960, 600                # the p5 canvas size (layout is defined in these units)

# ---- Per-floor look + enemies. Mirrors FLOORS in story.js ----
FLOORS = [
    {"name": "Emergency Room",  "wall": (0.30, 0.36, 0.35), "light": (0.8, 0.95, 1.0),  "light_str": 3.0, "props": "er",       "enemies": {"Walker": 3}},
    {"name": "Pediatrics",      "wall": (0.55, 0.40, 0.60), "light": (1.0, 0.85, 0.9),  "light_str": 2.0, "props": "peds",     "enemies": {"Walker": 3, "Wailer": 2}},
    {"name": "Radiology Morgue","wall": (0.20, 0.30, 0.38), "light": (0.5, 0.8, 1.0),   "light_str": 1.2, "props": "morgue",   "enemies": {"Walker": 3, "Runner": 4}},
    {"name": "Psych Ward",      "wall": (0.50, 0.50, 0.42), "light": (1.0, 0.95, 0.7),  "light_str": 1.0, "props": "psych",    "enemies": {"Walker": 2, "Runner": 2, "Stalker": 3}},
    {"name": "Surgical Wing",   "wall": (0.45, 0.25, 0.25), "light": (1.0, 0.5, 0.45),  "light_str": 1.0, "props": "surgery",  "enemies": {"Walker": 3, "Runner": 3, "Stalker": 2, "Brute": 1}},
    {"name": "Research Lab",    "wall": (0.50, 0.60, 0.68), "light": (0.6, 1.0, 1.0),   "light_str": 3.5, "props": "lab",      "enemies": {"Stalker": 2, "BOSS_Voss": 1}},
]

# ---- Characters: (skin RGB, height, arm length, head scale, bulk) ----
CHARACTERS = {
    "Kai":      ((0.85, 0.65, 0.50), 1.00, 1.00, 1.00, 1.00),
    "Mara":     ((0.70, 0.50, 0.38), 0.95, 0.95, 1.00, 0.85),
    "Whitlock": ((0.80, 0.72, 0.65), 1.00, 1.00, 1.00, 0.95),
    "Walker":   ((0.45, 0.55, 0.45), 1.00, 1.00, 1.00, 1.00),
    "Runner":   ((0.50, 0.45, 0.40), 1.00, 1.30, 0.90, 0.80),
    "Wailer":   ((0.60, 0.60, 0.65), 0.80, 1.00, 1.30, 0.80),
    "Stalker":  ((0.75, 0.75, 0.80), 1.25, 1.70, 0.90, 0.55),
    "Brute":    ((0.40, 0.35, 0.35), 1.50, 1.40, 0.80, 1.90),
    "Voss":     ((0.55, 0.25, 0.60), 1.80, 1.60, 0.90, 2.20),
}

random.seed(SEED)
_mat_cache = {}
LAYOUT_EXPORT = {"floors": {}}


# ===================== HELPERS =====================
def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def new_collection(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(c)
    return c


def mat(name, color, emission=0.0, rough=0.7):
    if name in _mat_cache:
        return _mat_cache[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color[:3], 1)
    b.inputs["Roughness"].default_value = rough
    if emission > 0:
        key = "Emission Color" if "Emission Color" in b.inputs else "Emission"
        b.inputs[key].default_value = (*color[:3], 1)
        b.inputs["Emission Strength"].default_value = emission
    _mat_cache[name] = m
    return m


def link_to(obj, col):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)


def box(name, center, size, material, col):
    """Cube centered at `center` with full dimensions `size` (meters)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(material)
    link_to(o, col)
    return o


def cyl(name, center, radius, depth, material, col, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=center)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    link_to(o, col)
    return o


def empty(name, loc, col, kind='PLAIN_AXES', size=0.6):
    bpy.ops.object.empty_add(type=kind, location=loc, radius=size)
    o = bpy.context.active_object
    o.name = name
    link_to(o, col)
    return o


def p5_to_blender(x, y, z=0.0):
    """p5 (x right, y DOWN, pixels) -> Blender (x right, y UP, meters)."""
    return (x * S, (H - y) * S, z)


def rect_box(name, rect, z0, wall_h, material, col):
    x, y, w, h = rect
    c = p5_to_blender(x + w / 2, y + h / 2, z0 + wall_h / 2)
    return box(name, c, (w * S, h * S, wall_h), material, col)


# ===================== HOSPITAL LAYOUT (same as hospitalLayout() in sketch.js) =====================
def hospital_layout():
    walls, rooms = [], []
    T, c_top, c_bot, n, rw, gap = 14, 250, 350, 6, W / 6, 50
    for i in range(n):
        x0 = i * rw
        mid = x0 + rw / 2
        walls += [(x0, c_top, rw / 2 - gap / 2, T), (mid + gap / 2, c_top, rw / 2 - gap / 2, T)]
        walls += [(x0, c_bot - T, rw / 2 - gap / 2, T), (mid + gap / 2, c_bot - T, rw / 2 - gap / 2, T)]
        if i > 0:
            walls += [(x0 - T / 2, 0, T, c_top), (x0 - T / 2, c_bot, T, H - c_bot)]
        rooms += [(mid, c_top / 2), (mid, c_bot + (H - c_bot) / 2)]
    # outer shell
    walls += [(0, 0, W, T), (0, H - T, W, T), (0, 0, T, H), (W - T, 0, T, H)]
    return walls, rooms


# ===================== PER-FLOOR PROPS =====================
def room_props(kind, rooms, z0, col, floor_idx):
    """Different set dressing per floor. rooms = list of (x,y) in p5 coords."""
    m_metal = mat("Metal", (0.6, 0.62, 0.65), rough=0.3)
    m_cloth = mat("Cloth", (0.8, 0.8, 0.85))
    m_dark = mat("DarkProp", (0.1, 0.1, 0.12))
    m_blood = mat("Ooze", (0.05, 0.3, 0.25), emission=0.4)   # teal ooze: Roblox-safe, not red blood
    for i, (rx, ry) in enumerate(rooms):
        x, y, _ = p5_to_blender(rx, ry)
        if kind == "er":            # gurneys + curtains
            box(f"Gurney_{i}", (x, y, z0 + 0.5), (0.9, 2.0, 0.9), m_cloth, col)
            box(f"Curtain_{i}", (x + 1.4, y, z0 + 1.2), (0.05, 2.5, 2.4), mat("Curtain", (0.4, 0.6, 0.5)), col)
        elif kind == "peds":        # cribs + toy blocks
            box(f"Crib_{i}", (x, y, z0 + 0.5), (1.0, 1.4, 1.0), mat("CribWood", (0.7, 0.5, 0.3)), col)
            for k in range(4):
                box(f"ToyBlock_{i}_{k}", (x + random.uniform(-1.5, 1.5), y + random.uniform(-1.5, 1.5), z0 + 0.1),
                    (0.2, 0.2, 0.2), mat(f"Toy{k}", [(1, .2, .2), (.2, 1, .2), (.2, .4, 1), (1, 1, .2)][k]), col)
        elif kind == "morgue":      # drawer wall + slabs
            box(f"Drawers_{i}", (x, y + 1.8, z0 + 1.0), (3.0, 0.8, 2.0), m_metal, col)
            box(f"Slab_{i}", (x, y - 0.3, z0 + 0.5), (0.9, 2.1, 0.9), m_metal, col)
        elif kind == "psych":       # padded cell cubes + chair
            box(f"Padding_{i}", (x, y, z0 + 1.0), (0.1, 2.5, 2.0), mat("Padding", (0.7, 0.7, 0.65)), col)
            box(f"Chair_{i}", (x, y, z0 + 0.3), (0.5, 0.5, 0.6), m_dark, col)
        elif kind == "surgery":     # operating tables + big lamps
            box(f"OpTable_{i}", (x, y, z0 + 0.5), (0.9, 2.0, 1.0), m_metal, col)
            cyl(f"OpLamp_{i}", (x, y, z0 + WALL_H - 0.6), 0.6, 0.15, mat("Lamp", (1, 1, 0.9), emission=6), col)
            box(f"Ooze_{i}", (x + 0.6, y, z0 + 0.02), (0.8, 0.8, 0.02), m_blood, col)
        elif kind == "lab":         # containment tanks (one is empty/broken)
            t = cyl(f"Tank_{i}", (x, y, z0 + 1.2), 0.6, 2.4, mat("Glass", (0.4, 0.9, 1.0), emission=0.8), col)
            if i == 3:
                t.name = "Tank_EMPTY_Voss"
                t.display_type = 'WIRE'


def floor_lights(z0, col, light_color, strength, floor_idx):
    m = mat(f"Light_{floor_idx}", light_color, emission=strength * 2)
    for i in range(10):
        lx = 2.0 + i * 3.7
        o = box(f"CeilingLight_{floor_idx}_{i}", (lx, H * S / 2, z0 + WALL_H - 0.05), (1.5, 0.45, 0.1), m, col)
        o["flicker"] = (i % 3 == 0)    # custom property -> flicker this light in game
    bpy.ops.object.light_add(type='AREA', location=(W * S / 2, H * S / 2, z0 + WALL_H - 0.4))
    L = bpy.context.active_object
    L.name = f"FloorLight_{floor_idx}"
    L.data.color = light_color
    L.data.energy = 300 * strength
    L.data.size = W * S * 0.5
    link_to(L, col)


# ===================== BUILDERS =====================
def build_floor(idx, spec):
    z0 = idx * FLOOR_HEIGHT
    col = new_collection(f"Floor_{idx + 1}")
    walls, rooms = hospital_layout()
    wall_m = mat(f"Wall_{idx + 1}", spec["wall"])
    floor_m = mat(f"FloorTile_{idx + 1}", tuple(c * 0.6 for c in spec["wall"]))

    box(f"Slab_{idx + 1}", (W * S / 2, H * S / 2, z0 - 0.15), (W * S, H * S, 0.3), floor_m, col)
    LAYOUT_EXPORT["floors"][idx + 1] = {"walls": [list(w) for w in walls], "rooms": [list(r) for r in rooms]}

    arena = (idx == 5)
    for i, w in enumerate(walls):
        if arena and i < len(walls) - 4:
            continue   # floor 6 is an open arena: skip interior walls, keep the outer shell (last 4 walls)
        rect_box(f"Wall_{idx + 1}_{i}", w, z0, WALL_H, wall_m, col)

    if arena:           # boss arena pillars (same as sketch.js floor6)
        for k, r in enumerate([(300, 200, 40, 40), (620, 200, 40, 40), (300, 360, 40, 40), (620, 360, 40, 40)]):
            rect_box(f"Pillar_{k}", r, z0, WALL_H, mat("Pillar", (0.7, 0.75, 0.8)), col)
        cyl("BossPlatform", (*p5_to_blender(700, 300)[:2], z0 + 0.05), 5.0, 0.1, mat("BossFloor", (0.3, 0.1, 0.35), emission=0.5), col, 32)
        rooms_for_props = [(480, 130), (480, 470), (200, 130), (200, 470)]
    else:
        rooms_for_props = rooms

    room_props(spec["props"], rooms_for_props, z0, col, idx)
    floor_lights(z0, col, spec["light"], spec["light_str"], idx)

    # Spawn markers: first N rooms (skipping the start room)
    spots = rooms[2:] if not arena else rooms_for_props
    n = 0
    for etype, count in spec["enemies"].items():
        for _ in range(count):
            sx, sy = spots[n % len(spots)]
            x, y, _z = p5_to_blender(sx, sy)
            empty(f"SPAWN_{etype}_{idx + 1}_{n}", (x, y, z0 + 0.1), col, 'SPHERE', 0.5)
            n += 1
    empty(f"KEYCARD_L{idx + 1}", (*p5_to_blender(*rooms[0])[:2], z0 + 0.8), col, 'ARROWS', 0.4)


def build_elevator_and_stairs():
    col = new_collection("Elevator_And_Stairs")
    shaft_m = mat("Shaft", (0.1, 0.1, 0.12))
    ex, ey, _ = p5_to_blender(920, 300)
    shaft = box("ElevatorShaft", (ex + 1.0, ey, FLOOR_HEIGHT * 3), (2.4, 2.4, FLOOR_HEIGHT * 6), shaft_m, col)
    shaft.display_type = 'WIRE'
    # The elevator car is parked "dead" at floor 5 (index 4)
    box("ElevatorCar_DEAD_Floor5", (ex + 1.0, ey, FLOOR_HEIGHT * 4 + 1.3), (2.0, 2.0, 2.6), mat("Elevator", (0.5, 0.5, 0.55), rough=0.2), col)
    for i in range(6):
        box(f"ElevatorDoor_F{i + 1}", (ex - 0.1, ey, FLOOR_HEIGHT * i + 1.1), (0.1, 1.6, 2.2), mat("ElevDoor", (0.4, 0.4, 0.45)), col)

    # Stairwell: floor 5 -> floor 6 (two flights with a landing), built on the building's left side
    step_m = mat("Stairs", (0.35, 0.33, 0.3))
    z_start = FLOOR_HEIGHT * 4
    steps = 12
    rise = FLOOR_HEIGHT / (steps * 2)
    for f in range(2):
        for s in range(steps):
            idx = f * steps + s
            y = -2 - s * 0.5 if f == 0 else -2 - (steps - 1 - s) * 0.5
            x = -3.0 if f == 0 else -4.6
            box(f"Step_{idx}", (x, y, z_start + rise * idx + rise / 2), (1.4, 0.5, rise), step_m, col)
    box("StairLanding", (-3.8, -2 - steps * 0.5 - 0.6, z_start + FLOOR_HEIGHT / 2), (3.2, 1.2, 0.2), step_m, col)
    empty("STAIRS_ALARM_START", (-3.0, -2.0, z_start + 0.2), col, 'CUBE', 0.5)


def build_city():
    col = new_collection("City_HarrowBay")
    oy = CITY_OFFSET_Y
    road_m = mat("Asphalt", (0.07, 0.07, 0.08), rough=0.4)
    walk_m = mat("Sidewalk", (0.25, 0.25, 0.27))
    box("Road", (W * S / 2, oy / 2 - 5, -0.05), (10, 100, 0.1), road_m, col)
    box("SidewalkL", (W * S / 2 - 7, oy / 2 - 5, 0.0), (4, 100, 0.2), walk_m, col)
    box("SidewalkR", (W * S / 2 + 7, oy / 2 - 5, 0.0), (4, 100, 0.2), walk_m, col)
    # lane dashes
    for i in range(24):
        box(f"LaneDash_{i}", (W * S / 2, oy + i * 4, 0.01), (0.2, 1.8, 0.02), mat("Dash", (0.9, 0.85, 0.4)), col)
    # buildings (dark silhouettes), some with warm "fire glow" windows
    for side in (-1, 1):
        for i in range(14):
            h = random.uniform(8, 30)
            x = W * S / 2 + side * random.uniform(12, 20)
            y = oy + i * 6 + random.uniform(-1, 1)
            box(f"Building_{side}_{i}", (x, y, h / 2), (random.uniform(6, 9), random.uniform(5, 8), h), mat(f"Bld{i % 4}", (0.08 + 0.02 * (i % 4), 0.08, 0.1)), col)
            if random.random() < 0.4:
                box(f"Glow_{side}_{i}", (x - side * 3.0, y, h * 0.35), (0.1, 2.0, 1.5), mat("FireGlow", (1.0, 0.45, 0.1), emission=6), col)
    # wrecked cars + street lamps
    for i in range(10):
        cx = W * S / 2 + random.uniform(-3.5, 3.5)
        cy = oy + random.uniform(5, 80)
        c = box(f"WreckedCar_{i}", (cx, cy, 0.7), (1.8, 4.0, 1.4), mat("CarRed", (0.4, 0.07, 0.07)), col)
        c.rotation_euler[2] = math.radians(random.uniform(-30, 30))
    for i in range(8):
        lx = W * S / 2 + (-5.5 if i % 2 == 0 else 5.5)
        ly = oy + (i // 2) * 20
        cyl(f"LampPost_{i}", (lx, ly, 3.0), 0.12, 6.0, mat("LampMetal", (0.2, 0.2, 0.2)), col, 8)
        box(f"LampHead_{i}", (lx, ly, 6.1), (0.6, 0.3, 0.2), mat("LampLight", (1.0, 0.8, 0.5), emission=8), col)
    # hospital gate + sign
    box("HospitalGate", (W * S / 2, -4, 1.5), (10, 0.4, 3.0), mat("GateRed", (0.5, 0.1, 0.1)), col)
    box("HospitalSign", (W * S / 2, -4.3, 4.2), (8, 0.3, 1.0), mat("SignGlow", (0.2, 1.0, 0.6), emission=3), col)
    empty("PHARMACY_Maple_Street", (W * S / 2 - 14, oy + 55, 0.5), col, 'CUBE', 1.0)
    empty("QUEST_FindHospital", (W * S / 2, -2, 0.5), col, 'ARROWS', 1.0)
    # moody world lighting
    bpy.context.scene.world = bpy.data.worlds.new("DuskWorld")
    bpy.context.scene.world.use_nodes = True
    bg = bpy.context.scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.12, 0.06, 0.09, 1)
    bg.inputs[1].default_value = 0.6


def build_characters():
    col = new_collection("Characters")
    x0 = W * S + 15
    for i, (name, (skin, height, arm, head, bulk)) in enumerate(CHARACTERS.items()):
        x = x0 + i * 4.0
        skin_m, cloth_m = mat(f"{name}_skin", skin), mat(f"{name}_cloth", (0.2, 0.25, 0.3))
        leg_h, torso_h = 1.0 * height, 1.0 * height
        arm_h, head_sz = 1.0 * arm * height, 0.8 * head
        def part(pn, loc, size, m):
            box(f"{name}_{pn}", loc, size, m, col)
        part("LeftLeg",  (x - 0.25 * bulk, 0, leg_h / 2), (0.45 * bulk, 0.45 * bulk, leg_h), cloth_m)
        part("RightLeg", (x + 0.25 * bulk, 0, leg_h / 2), (0.45 * bulk, 0.45 * bulk, leg_h), cloth_m)
        part("Torso", (x, 0, leg_h + torso_h / 2), (1.0 * bulk, 0.5 * bulk, torso_h), cloth_m)
        top = leg_h + torso_h
        part("LeftArm",  (x - 0.5 * bulk - 0.25, 0, top - arm_h / 2), (0.4 * bulk, 0.4 * bulk, arm_h), skin_m)
        part("RightArm", (x + 0.5 * bulk + 0.25, 0, top - arm_h / 2), (0.4 * bulk, 0.4 * bulk, arm_h), skin_m)
        part("Head", (x, 0, top + head_sz / 2), (head_sz, head_sz, head_sz), skin_m)
        empty(f"LABEL_{name}", (x, 0, top + head_sz + 0.5), col, 'PLAIN_AXES', 0.2)


def build_run_camera():
    """First-person 'running through the city' intro shot. Press Numpad 0 to look through it."""
    scene = bpy.context.scene
    bpy.ops.object.camera_add(location=(W * S / 2, CITY_OFFSET_Y + 5, 1.7), rotation=(math.radians(90), 0, 0))
    cam = bpy.context.active_object
    cam.name = "Cam_FirstPersonRun"
    cam.data.lens = 28
    scene.camera = cam
    scene.frame_start, scene.frame_end = 1, 250
    end_y = -12.0
    for f in range(1, 251, 5):
        t = (f - 1) / 249
        cam.location = (W * S / 2 + math.sin(f * 0.25) * 0.08,
                        CITY_OFFSET_Y + 5 + t * (end_y - (CITY_OFFSET_Y + 5)),
                        1.7 + 0.07 * abs(math.sin(f * 0.5)))              # head bob
        cam.rotation_euler = (math.radians(90), 0, math.sin(f * 0.25) * 0.012)   # tiny sway
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)


def export_layout():
    base = bpy.path.abspath("//") if bpy.data.filepath else os.path.expanduser("~")
    path = os.path.join(base, "last_light_layout.json")
    with open(path, "w") as fh:
        json.dump(LAYOUT_EXPORT, fh, indent=2)
    print("Layout exported to", path)


# ===================== RUN =====================
clear_scene()
if BUILD_CITY:
    build_city()
if BUILD_HOSPITAL:
    for i, spec in enumerate(FLOORS):
        build_floor(i, spec)
if BUILD_STAIRS_AND_ELEVATOR:
    build_elevator_and_stairs()
if BUILD_CHARACTERS:
    build_characters()
if BUILD_CAMERA_RUN:
    build_run_camera()
if EXPORT_LAYOUT_JSON and BUILD_HOSPITAL:
    export_layout()
print("LAST LIGHT world built: 6 floors, city, elevator, stairs, characters.")
