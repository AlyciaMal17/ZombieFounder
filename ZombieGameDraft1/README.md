# LAST LIGHT - project starter

```
last_light/
  blender/last_light_blender.py   <- builds city + 6 floors + elevator/stairs + characters + run camera
  p5/index.html                   <- open this (with Live Server in VS Code)
  p5/story.js                     <- ALL dialogue, enemy stats, floor config (edit this first!)
  p5/sketch.js                    <- the game engine / logic
```

## Run the p5.js game (VS Code)
1. Install the **Live Server** extension. Open the `last_light` folder in VS Code.
2. Right-click `p5/index.html` -> **Open with Live Server**.
3. Press **1** (solo) or **2** (local co-op).

Controls: P1 WASD + SHIFT (sprint, loud) + SPACE (attack). P2 arrows + `.` + `/`. ENTER/click = dialogue.

## Run the Blender build
Blender -> Scripting tab -> New -> paste `last_light_blender.py` -> Run. Numpad 0 = look through the
first-person run camera, Space = play. Each floor is a Collection you can hide.

## How the two versions line up
| Story beat            | p5.js                       | Blender                          |
|-----------------------|-----------------------------|----------------------------------|
| 1 Run                 | `startRun()` pseudo-3D      | `Cam_FirstPersonRun` animation   |
| 2 Bite                | `STORY.lines.bite`          | (cutscene - add later)           |
| 3 City                | `LEVEL_BUILDERS.city`       | `City_HarrowBay` collection      |
| 4 Key (pharmacy)      | `LEVEL_BUILDERS.pharmacy`   | `PHARMACY_Maple_Street` empty    |
| 5 Phone call          | `STORY.lines.call`          | n/a                              |
| 6 Elevator / 6 floors | `floor1..floor5`, `floor6`  | `Floor_1..Floor_6`               |
| Elevator dies (F5)    | `floor5` goal -> stairs     | `ElevatorCar_DEAD_Floor5`        |
| Stairs                | `LEVEL_BUILDERS.stairs`     | `Elevator_And_Stairs` collection |
| Boss + choice         | `updateBoss()`, `drawChoice`| `BossPlatform`, `Tank_EMPTY_Voss`|

Set `EXPORT_LAYOUT_JSON = True` in the Blender script to dump the wall layout to JSON for a future loader.

## Easy next upgrades
- **New monster:** add a row to `ENEMY_TYPES` in `story.js`, then use its name in `FLOORS[n].enemies`.
- **New floor/level:** add a builder to `LEVEL_BUILDERS` in `sketch.js` (copy `floor6`) and call `loadLevel("yourId")`.
- **Better AI:** swap the straight-line chase in `updateEnemy()` for A* pathfinding on a grid.
- **Hearing system v2:** make thrown objects / gunshots create noise (`p.noise`-style) at a position.
- **Real pharmacy:** add a pharmacy door goal to the city map so players walk there (currently triggered by the gate).
- **Save/checkpoints:** store `G.flags`, `G.id`, infection in `localStorage`.
- **Go 3D:** the Blender layout and p5 layout match, so the same design can move to Three.js / Roblox later.
