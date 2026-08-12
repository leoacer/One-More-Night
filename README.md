# One More Night

A 3D first-person survival mystery set in a decaying European apartment block
during a citywide blackout.

Every night you get **ten minutes** outside your own front door. Explore the
building, gather what you can carry, talk to the four people still living
here, and get back before the time is gone.

The building changes between nights. At first barely — a lamp that was on, a
door that was a different colour, an apartment number that has moved one door
along. By the seventh night the corridors do not have ends.

**No engine, no build step, no asset files.** Every wall texture, every
photograph, every footstep and thunderclap is generated procedurally in the
browser at load time. The only dependency is a vendored copy of three.js.

---

## Playing it

The game is a static site. Anything that serves files over HTTP will do —
ES modules mean you cannot just double-click `index.html`.

```sh
git clone https://github.com/leoacer/One-More-Night.git
cd One-More-Night
python3 -m http.server 8000
# then open http://localhost:8000
```

Requires a desktop browser with **WebGL2** and pointer lock: recent Chrome,
Edge, Firefox or Safari. Click the canvas to capture the mouse.

### Controls

| | |
|---|---|
| `W A S D` | move |
| `Mouse` | look |
| `Shift` | sprint (costs stamina) |
| `C` | crouch |
| `Q` | lean / peek round a corner |
| `E` | interact |
| `F` | flashlight |
| `T` | glance at your watch |
| `Tab` | inventory |
| `J` | journal |
| `1`–`9` | pick a dialogue line |
| `Esc` | pause |

---

## The loop

1. Wake in apartment 204. Check your torch, eat if you need to.
2. Go out. The watch on your wrist starts at 10:00 and does not stop.
3. Search rooms, read what people left behind, talk to the residents.
4. Get back to 204 and go to bed. Write down what you saw first — you will
   not remember it as well as you think.
5. Sleep. The building has the rest of the night to itself.

Miss the deadline and you lose the end of the night, along with some of your
health and all of what you were about to find out. On the seventh night,
missing it is final.

### Resources

- **Time** — the only one that matters.
- **Battery** — the torch runs about eight minutes on a cell. Tomas will
  service it, once a night, if you ask.
- **Food** — drains slowly while you are awake and again while you sleep.
- **Health** — lost to hunger and to whatever is walking behind you.
- **Trust** — five separate relationships, each of which changes what people
  are willing to tell you.

---

## The seven nights

| | | |
|---|---|---|
| 1 | *Nothing Happens Tonight* | The building is normal. Meet the residents. Hear things. |
| 2 | *The Missing Apartment* | 302 is occupied. Later it is empty, and the tea is still warm. |
| 3 | *The New Door* | A door appears on the third floor with no number. Nobody agrees about it. |
| 4 | *Wrong Floor* | The lift grows a button for a floor that does not exist. |
| 5 | *The Residents* | People repeat themselves, remember things that never happened, and one of them starts following you. |
| 6 | *The Truth* | The records room, the register, and eleven identical leases. |
| 7 | *One More Night* | The corridors loop. Choose what to do about it. |

There are **five endings** — Escape, Truth, Sacrifice, Stay, and one you get
by running out of time on the last night. Which you reach depends on how you
spend the final ten minutes, how much evidence you actually assembled, and
whether anyone trusts you enough to leave with you.

---

## What is in here

```
index.html              shell, HUD markup, menus
vendor/three.module.js  the only dependency (r170, vendored)
src/
  main.js               game controller: modes, night lifecycle, interaction
  core/
    audio.js            procedural 3D audio — every sound is synthesised
    textures.js         procedural canvas textures — wallpaper, rust, photos
    postfx.js           bloom, grade, grain, vignette, reality distortion
    input.js            keyboard, pointer lock, persisted settings
    state.js            save/load, inventory, trust, evidence, journal
    quality.js          the four quality tiers and what each one buys
    i18n.js             localisation: one flat key→string map per language
    util.js             seeded rng, maths, dom
  world/
    layout.js           the building as data: levels, rooms, geometry constants
    building.js         slabs, walls, doors, stairwell, lift, roof, the city
    furnish.js          one interior recipe per kind of room
    props.js            furniture and clutter, built from primitives
    materials.js        shared materials
  systems/
    player.js           first-person controller, collision, head movement, torch
    lighting.js         a fixed pool of lights reassigned to nearby emitters
    elevator.js         the lift, and its later disagreements with the buttons
    npc.js              residents, idle behaviour, and the follower
    events.js           the director: scripted beats, ambience, dread
    endings.js          which ending you earned
  ui/
    hud.js              prompt, watch, torch, captions, document reader
    panels.js           inventory, journal, dialogue
    style.css
  data/
    nights.js           the night planner — what changes, and when
    dialogue.js         all five residents, across all seven nights
    lore.js             every readable document in the building
    items.js            everything you can carry
    locales/sv/         the Swedish pack, split by what it translates
```

### A few implementation notes

**The building is rebuilt every night** from a seeded plan
(`makeNightPlan`). The seed comes from your save, so reloading a night gives
you exactly the same building — the changes are between nights, not between
loads. Later nights layer more changes on: apartment numbers swap, doors are
repainted, rooms lock and unlock, clutter moves while you are looking
elsewhere.

**Lighting** uses a small pool of real point lights — five to ten, depending
on quality tier — reassigned each frame to the nearest active emitters.
Emissive bulb meshes stay visible at any range, so a lit room across the
building still reads as lit without costing a light slot. Only the torch
casts shadows.

**Audio** is synthesised from noise buffers and oscillators through
`PannerNode`s with HRTF panning, so you can tell which side of you a door
opened on. Convolution reverb is built from decaying noise — one short room,
one long stairwell. Sounds are deliberately played behind you sometimes.

**Quality tiers** (`Esc → Settings → Quality`) are Low, Medium, High and
Ultra. Each tier sets render scale, shadow map size, how many real lights the
pool holds, texture resolution and anisotropy, and how far bloom is
downsampled. Ultra renders at 1.35× and regenerates every procedural texture
at double size, so switching to it costs a moment while the canvases are
redrawn; Low renders at 0.62× with five lights. Changing tier never needs a
page reload.

**Localisation** is patching, not duplication. The English data files stay
the single source of structure, and a language pack is a flat map of
key → string (`doc.<id>.b3`, `dlg.ilse.i1.o2`, `item.torch.desc`, `room.204.name`)
that is written into those structures in place, with an English snapshot kept
so switching back restores the originals. Any key a pack omits falls back to
English one string at a time, so a partial translation never breaks the game.
Swedish (`Svenska`) is complete: interface, all 34 documents, all seven night
cards, every ending, every item, and all 635 lines of dialogue.

**Horror design.** There are three loud moments in the whole game. The rest
is silence, footsteps that stop when you stop, and objects that are not
where you left them. The follower is not a monster: it stops when you look at
it, it will not enter a lit room for long, and Mira will tell you what it is
if you ask her nicely.

---

## Accessibility

Settings (`Esc → Settings`) include mouse sensitivity and Y inversion, field
of view, head-bob amount, film grain amount, master volume, brightness, a
quality tier for weaker GPUs, **language** (English / Svenska),
**captions for non-speech sounds**, and **reduce flashing**, which disables
lamp flicker and lightning.

---

## Licence

Code is MIT. `vendor/three.module.js` is three.js, MIT, © three.js authors —
see `vendor/THREE_LICENSE.txt`.
