// =====================================================================
//  LAST LIGHT - STORY DATA
//  All the writing + balance numbers live here so you can edit the
//  story without touching game code. Dialogue lines are [speaker, text].
// =====================================================================

const STORY = {
  title: "LAST LIGHT",
  lines: {
    runIntro: [
      ["Kai", "Don't look back. Don't look back."],
      ["Kai", "Okay, I looked back. Bad idea. RUN."],
    ],
    bite: [
      ["Kai", "No. No, no, no..."],
      ["", "A Runner tears at your arm before you throw it off. The bite burns."],
      ["Kai", "If there's a cure, it's at St. Aurelia Hospital. That's where Mara went."],
      ["", "QUEST: Find St. Aurelia Hospital.   (Infection meter started - it only goes up. Find medicine to slow it.)"],
    ],
    lockedGate: [
      ["", "The gate is sealed. A radio crackles: 'Only the Director holds the key.'"],
      ["Kai", "Whitlock. Mara's note said Maple Street Pharmacy. Fine. Pharmacy it is."],
      ["", "QUEST: Find Dr. Whitlock and get the key."],
    ],
    pharmacy: [
      ["Dr. Whitlock", "You're... bitten too. I can see it. Take the key. Don't trust... the sounds. They're not what they seem."],
      ["", "He coughs, goes still... and stands back up."],
      ["Kai", "I'm sorry, Doctor."],
    ],
    call: [
      ["", "Your phone rings. MARA."],
      ["Mara", "Kai? Oh thank God. Listen. I'm inside St. Aurelia. Something is wrong with this place."],
      ["Mara", "I can hear it. Groaning, from inside the walls, like the building is alive."],
      ["Mara", "Be careful. The cure might be hard to find. It's not where it should be."],
      ["Kai", "Mara, I got bitten."],
      ["Mara", "...Then come fast. We don't have a lot of time."],
      ["", "QUEST: Get into St. Aurelia."],
    ],
    enter: [
      ["", "The key turns. The horde catches up. You dive for the elevator as the doors slam shut."],
      ["Kai", "Six floors. The cure's probably at the top. Of course it is."],
    ],
    elevatorDies: [
      ["", "BANG. Sparks. The elevator shudders and dies between floors."],
      ["Mara (phone)", "Kai? Kai, the power's gone on five! Take the stairs, and hurry!"],
      ["Kai", "Stairs. Great. Love stairs."],
    ],
    stairs: [
      ["", "The alarm blares. Every landing is flooding with Hollow."],
      ["Kai", "Keep climbing. Don't stop. Don't stop."],
    ],
    bossIntro: [
      ["Dr. Voss", "You think you're the first to come up here? Everyone wants the cure. No one wants to know what it cost."],
      ["Kai", "Then tell me what it cost."],
    ],
    bossDown: [
      ["", "Voss collapses. In his hand is a glowing vial."],
      ["", "Outside, a helicopter's rotors thump in the distance."],
    ],
    choicePrompt: [
      "Mara: 'There's only one dose, Kai. The helicopter lands in five minutes.'",
      "[1] Use it yourself - survive, but the city is left behind.",
      "[2] Give it to the helicopter - save everyone, but you won't make it.",
    ],
    endingA: [
      "Kai injects the cure. The fever breaks. The helicopter leaves empty.",
      "He stands on the roof of St. Aurelia, alive, over a silent city.",
      "ENDING A: SURVIVOR",
    ],
    endingB: [
      "Kai hands the vial to the crew. Mara stays beside him as the helicopter lifts off.",
      "Months later, the lights of Harrow Bay come back on, one block at a time.",
      "ENDING B: LAST LIGHT",
    ],
  },
};

// ---------------------------------------------------------------------
//  ENEMY TYPES.  speed = pixels/second. sight = pixels.
//  Add a new monster by adding a row here, then using its name in FLOORS.
// ---------------------------------------------------------------------
const ENEMY_TYPES = {
  walker:   { r: 12, hp: 40,  speed: 55,  dmg: 8,  sight: 170, col: [90, 140, 90]  },
  runner:   { r: 10, hp: 25,  speed: 130, dmg: 6,  sight: 260, col: [160, 120, 80] },
  wailer:   { r: 10, hp: 30,  speed: 40,  dmg: 4,  sight: 200, col: [190, 190, 215] }, // screams, alerts everyone nearby
  stalker:  { r: 12, hp: 60,  speed: 150, dmg: 15, sight: 420, col: [225, 225, 240] }, // frozen while you look at it
  brute:    { r: 24, hp: 220, speed: 70,  dmg: 25, sight: 280, col: [120, 60, 60]   },
  whitlock: { r: 12, hp: 70,  speed: 50,  dmg: 8,  sight: 300, col: [200, 200, 170] },
  boss:     { r: 34, hp: 700, speed: 60,  dmg: 30, sight: 9999, col: [150, 40, 170] }, // Dr. Voss
};

// ---------------------------------------------------------------------
//  THE 6 FLOORS - each one harder than the last.
//  darkness: 0 (bright) to 1 (pitch black).  bg/wall are [r,g,b].
// ---------------------------------------------------------------------
const FLOORS = [
  { title: "FLOOR 1 - EMERGENCY ROOM", objective: "Find the Level 1 keycard, then reach the elevator",
    bg: [30, 38, 38], wall: [75, 90, 88], darkness: 0.40, enemies: { walker: 3 },
    intro: [["Kai", "Flipped gurneys. Handprints on the glass. Cheery."], ["", "TIP: SHIFT to sprint is LOUD. Enemies hear it."]] },

  { title: "FLOOR 2 - PEDIATRICS", objective: "Find the Level 2 keycard. Don't wake the Wailers",
    bg: [40, 34, 44], wall: [100, 80, 110], darkness: 0.55, enemies: { walker: 3, wailer: 2 },
    intro: [["Mara (phone)", "I can hear them from up here. Don't make a sound on Two."], ["", "A music box plays by itself somewhere in the dark."]] },

  { title: "FLOOR 3 - RADIOLOGY & MORGUE", objective: "Find the Level 3 keycard in the dark",
    bg: [22, 30, 38], wall: [60, 80, 95], darkness: 0.72, enemies: { walker: 3, runner: 4 },
    intro: [["Kai", "Cold. Dark. Drawers rattling. I hate this floor already."]] },

  { title: "FLOOR 4 - PSYCH WARD", objective: "Find the Level 4 keycard. Don't look away from the Stalkers",
    bg: [38, 38, 34], wall: [110, 108, 95], darkness: 0.78, enemies: { walker: 2, runner: 2, stalker: 3 },
    intro: [["Mara (phone)", "I found Voss's notes. He didn't build this to hurt anyone. He just didn't stop in time."], ["", "TIP: Stalkers freeze while you face them. Look away and they charge."]] },

  { title: "FLOOR 5 - SURGICAL WING", objective: "Find the Level 5 keycard and reach the elevator",
    bg: [36, 28, 28], wall: [105, 70, 70], darkness: 0.82, enemies: { walker: 3, runner: 3, stalker: 2, brute: 1 },
    intro: [["Kai", "Surgical lights swinging. Something big is breathing in here."]] },

  { title: "FLOOR 6 - RESEARCH LAB", objective: "Defeat Dr. Voss and take the cure",
    bg: [26, 34, 42], wall: [110, 130, 145], darkness: 0.60, enemies: { stalker: 2 },
    intro: [["Mara (phone)", "Kai... he's up there. Whatever you do, don't let him reach the vial."]] },
];
