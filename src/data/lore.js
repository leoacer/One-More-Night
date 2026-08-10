// ══════════════════════════════════════════════════════════════════════
//  Every readable thing in the building.
//
//  The whole mystery is here, out of order, the way the player will find
//  it. Nothing states the answer outright until Night 6.
//
//  type: 'note' | 'news' | 'photo' | 'tape' | 'record' | 'plaque'
//  ev:   true → counts as evidence, files itself in the journal
// ══════════════════════════════════════════════════════════════════════

export const DOCS = {

  // ── Night 1: texture, and the first thread ───────────────────────────
  notice_board: {
    title: 'Notice — Entrance Hall', type: 'note', ev: false,
    body: [
      { cls: 'stamp', text: 'BUILDING MANAGEMENT' },
      { p: 'Residents are reminded that the main door remains chained for the duration of the outage. This is for your safety. The chain will be removed when power is restored to the district.' },
      { p: 'Do not use candles in the stairwell.' },
      { p: 'Do not prop the fire doors.' },
      { p: '— H. Halvard, Caretaker' },
    ],
    note: 'A notice in the entrance hall. "Do not prop the fire doors" has been written over an older line, in different ink.',
  },

  news_blackout: {
    title: 'City Herald — Day Three', type: 'news', ev: true,
    body: [
      { h: 'CITY IN THE DARK' },
      { cls: 'byline', text: 'Third day of the outage · District 4 still unaccounted for' },
      { p: 'Engineers have been unable to identify the fault. The affected area has grown from six streets to most of the northern districts. Emergency services ask that residents remain in their homes after dark.' },
      { p: 'A spokesman would not be drawn on how long repairs might take, saying only that "the fault does not appear to be in the equipment."' },
      { p: 'Residents in Kolben Street report that their telephones ring at night with no one on the line.' },
    ],
    journal: { cat: 'evidence', title: 'The blackout is not a fault', text: 'The engineers cannot find anything broken. The outage keeps growing. This did not start in a substation.' },
  },

  note_door: {
    title: 'A folded note', type: 'note', ev: true,
    body: [
      { cls: 'hand', text: 'If you are reading this you have started counting. Stop counting. Counting is how it finds the ones who will keep going.' },
      { cls: 'hand', text: 'Do not knock on the door with no number.' },
      { cls: 'hand', text: 'When you get back to your own door tonight, look at the frame. Look at the underside of the frame.' },
    ],
    journal: { cat: 'evidence', title: 'A warning about the door', text: 'Someone left a note telling me not to knock on a door with no number. I have not seen a door with no number. Not yet.' },
  },

  frame_marks: {
    title: 'The underside of your door frame', type: 'note', ev: true,
    body: [
      { p: 'You run your fingers along the underside of the frame of your own front door, where nobody would look.' },
      { p: 'Tally marks. Cut into the wood with something sharp and small. Grouped in sevens.' },
      { p: 'You count eleven groups before the marks run past the hinge and into the wall, and you stop counting, because you can feel more of them under the paint.' },
      { cls: 'hand', text: 'You do not remember making these. Your hand knows the angle they were made at.' },
    ],
    journal: { cat: 'evidence', title: 'Tally marks in my own door frame', text: 'Sevens. Dozens of groups of seven, cut into the wood under my own door frame, out of sight. I did not make them. My hand disagrees.' },
  },

  // ── Night 2: the missing apartment ───────────────────────────────────
  photo_two: {
    title: 'Photograph — 302', type: 'photo', photo: 'two', ev: true,
    body: [
      { p: 'A colour photograph, gone orange. Two people stand in a lit room with the wallpaper of apartment 302 behind them.' },
      { p: 'One of them is Ilse, forty years younger, laughing at whoever is holding the camera.' },
      { p: 'The other is you.' },
      { p: 'Not someone like you. The chipped tooth. The way you stand with your weight on the left. You, in a coat you have never owned, in a year you were not alive.' },
      { cls: 'hand', text: 'On the back, in pencil: "him again. third time."' },
    ],
    journal: { cat: 'evidence', title: 'A photograph of me, decades old', text: 'Ilse, young, in 302. Standing beside me. On the back, in someone else\'s pencil: "him again. third time."' },
  },

  ilse_table: {
    title: "Ilse's table", type: 'note', ev: true,
    body: [
      { p: 'The table is still laid. Two plates. Bread going hard at the edges but not stale. A cup with tea in it, and the tea is still faintly warm.' },
      { p: 'Her coat is on the hook. Her shoes are by the door. Her glasses are folded on the arm of the chair, and Ilse cannot see the far side of a room without them.' },
      { p: 'Nothing is disturbed. Nothing is packed. She was here, and then the room went on without her.' },
    ],
    journal: { cat: 'evidence', title: '302 is empty, but nothing has left', text: 'Warm tea. Her glasses. Her shoes. Ilse did not walk out of that apartment.' },
  },

  note_tenant: {
    title: 'Tenant List', type: 'note', ev: true,
    body: [
      { cls: 'stamp', text: 'INTERNAL — DO NOT POST' },
      { p: '101 — vacant · 102 — vacant · 103 — vacant · <b>104 — T. Reiner</b> · 105 — vacant · 106 — vacant' },
      { p: '201 — vacant · 202 — vacant · 203 — vacant · <b>204 — see note</b> · 205 — vacant · <b>207 — M. Solt (minor) + guardian</b>' },
      { p: '301 — vacant · <b>302 — I. Vogt</b> · 304 — vacant · 305 — vacant · 306 — vacant · 307 — vacant' },
      { p: '<b>401 — A. Voss</b> · 402-406 — vacant' },
      { cls: 'hand', text: 'note re: 204 — occupied. do not re-let. do not enter while occupied. he is not to be told which number he is.' },
    ],
    journal: { cat: 'evidence', title: 'The building is almost empty', text: 'Five occupied apartments in the whole building. Mine has a handwritten note beside it: "do not re-let. he is not to be told which number he is."' },
  },

  // ── Night 3: the door ────────────────────────────────────────────────
  note_mira: {
    title: "Mira's drawing", type: 'note', drawing: 'door', ev: true,
    body: [
      { p: 'Wax crayon, pressed hard enough to shine. A tall grey rectangle with no handle, crossed out twice.' },
      { cls: 'hand', text: "dont knock. it knocks back" },
      { p: 'The drawing is dated in a child\'s numerals. The date is four days from now.' },
    ],
    journal: { cat: 'evidence', title: 'Mira draws the door before it exists', text: 'She drew the numberless door, crossed out twice, and dated it four days ahead. She drew it before I ever saw it.' },
  },

  door_plaque: {
    title: 'The door with no number', type: 'note', ev: true,
    body: [
      { p: 'Where the number should be there is a clean rectangle of unfaded paint, exactly the size of a number plate, and four small screw holes.' },
      { p: 'The plate is not missing. The plate has never been fitted. The paint under the rectangle is the same age as the paint around it.' },
      { p: 'The door is warm.' },
    ],
    journal: { cat: 'evidence', title: 'The door was built without a number', text: 'The paint where a number plate should be has never been covered. The door is warm to the touch. It was made this way.' },
  },

  news_fire: {
    title: 'City Herald — Archive', type: 'news', ev: true,
    body: [
      { h: 'SEVEN DEAD IN KOLBEN STREET FIRE' },
      { cls: 'byline', text: 'Blaze during power cut · Fire service cites "catastrophic stairwell draw"' },
      { p: 'Seven residents of 14 Kolben Street died last night when a fire that began in a ground-floor flat filled the building\'s single stairwell with smoke within four minutes.' },
      { p: 'Investigators said the building\'s fire doors, which are designed to hold a stairwell clear, had been prevented from closing. "The stairwell acted as a chimney," a spokesman said. "With the doors shut, this is a fire that kills nobody."' },
      { p: 'The block had been without power for eleven days at the time of the fire.' },
      { p: 'The building is expected to be demolished.' },
    ],
    journal: { cat: 'evidence', title: 'Seven died here, in a blackout', text: 'A fire in this building, during a power cut on its eleventh day. Seven dead. The fire doors had been propped. "With the doors shut, this is a fire that kills nobody."' },
  },

  news_demolition: {
    title: 'City Herald — Notice', type: 'news', ev: true,
    body: [
      { h: 'DEMOLITION POSTPONED' },
      { cls: 'byline', text: 'Kolben Street block · third postponement' },
      { p: 'Contractors have again withdrawn from the site. The company would not comment beyond confirming that no work has been carried out.' },
      { p: 'A council officer said the building "remains structurally sound and is not currently a hazard to the public."' },
      { p: 'Utility records show the block continuing to draw power throughout the period in which it has been recorded as unoccupied.' },
    ],
    journal: { cat: 'evidence', title: 'It was never demolished', text: 'Three contractors walked away. The block keeps drawing power while officially empty. It has been "about to be demolished" for years.' },
  },

  // ── Night 4: wrong floor ─────────────────────────────────────────────
  note_voss: {
    title: "Voss's count", type: 'note', ev: true,
    body: [
      { p: 'Sheet after sheet, both sides, in columns. Numbers, in order, one to a line, in the same tired hand.' },
      { p: 'The first sheet begins at 1. The sheet on top of the pile ends at 2,314.' },
      { cls: 'hand', text: 'every one of these was a night. every one of these i went out and came back. ask me what changed on 900 and i can tell you. ask me what i had for supper and i cannot.' },
      { cls: 'hand', text: 'the lift used to go to four. then it did not. now it does again. that is how you know it is starting over.' },
    ],
    journal: { cat: 'evidence', title: 'Voss has counted 2,314 nights', text: 'He has a number for every night he has gone out and come back. He says the lift reaching the fourth floor again means "it is starting over."' },
  },

  elevator_panel: {
    title: 'Behind the lift panel', type: 'note', ev: true,
    body: [
      { p: 'The brass plate comes away with the screwdriver. Behind it: relays, a rat\'s nest of cloth-insulated wire, and a manufacturer\'s card.' },
      { p: 'The card lists the floors the car was built to serve.' },
      { p: '<b>B · 1 · 2 · 3</b>' },
      { p: 'There is no button for four on the card. There is no fourth floor on the card. There is, however, a fifth line, typed, then struck through so heavily the paper has torn.' },
      { cls: 'hand', text: 'Under the tear, still legible if you hold it to the light: <b>4 — do not wire</b>' },
    ],
    journal: { cat: 'evidence', title: 'The lift was built with no fourth floor', text: 'The manufacturer\'s card lists B, 1, 2, 3. A fourth line was typed and struck out: "4 — do not wire." Somebody wired it anyway.' },
  },

  // ── Night 5: the residents ───────────────────────────────────────────
  photo_group: {
    title: 'Group photograph', type: 'photo', photo: 'three', ev: true,
    body: [
      { p: 'Residents on the front steps, squinting into a summer that this street has not had in a long time.' },
      { p: 'Ilse. Tomas, younger, in overalls. A girl of about nine holding a cloth doll. A tall man at the back with his face turned away.' },
      { p: 'And a figure at the left edge who has been scratched out of the emulsion with a pin, right down to the paper, so thoroughly that it took someone a long time.' },
      { p: 'The scratched-out figure is standing where you would stand.' },
      { cls: 'hand', text: 'On the reverse: seven names. Six of them are crossed through.' },
    ],
    journal: { cat: 'evidence', title: 'Seven names, six crossed out', text: 'A group photograph of the residents — Ilse, Tomas, Mira, Voss. One figure scratched out of the film with a pin. Seven names on the back; six struck through. The one not struck through is mine.' },
  },

  note_letter: {
    title: 'Unsent letter', type: 'note', ev: true,
    body: [
      { cls: 'hand', text: 'I have written this eleven times and I have never posted it, because every time I get to the part where I explain what happened, the explanation is different, and all of the versions are true.' },
      { cls: 'hand', text: 'What I can tell you is this. There was a fire. It should not have killed anybody. The stairwell doors were open, and they were open because of me, and I have had a very long time to be exact about that.' },
      { cls: 'hand', text: 'I do not think I am being punished. Punishment ends. This is more like being kept.' },
      { cls: 'hand', text: 'If you find this, and your handwriting looks like mine, put it back where it was.' },
    ],
    journal: { cat: 'evidence', title: 'A letter in my own handwriting', text: 'Unsent, unposted, written eleven times. "The stairwell doors were open, and they were open because of me." The hand is identical to mine.' },
  },

  mira_stairs: {
    title: "Mira's drawing — stairs", type: 'note', drawing: 'stairs', ev: false,
    body: [
      { p: 'A staircase drawn going up, and up, and up, off the top edge of the paper and onto the table underneath, where the crayon has left a mark.' },
      { cls: 'hand', text: 'the stairs go up too many times' },
    ],
    note: 'Mira draws the stairwell with more flights than it has.',
  },

  mira_figures: {
    title: "Mira's drawing — everyone", type: 'note', drawing: 'figures', ev: true,
    body: [
      { p: 'Four stick figures in a row. Three drawn in brown crayon. The fourth, at the end, in red.' },
      { cls: 'hand', text: 'everyone who lives here' },
      { cls: 'hand', text: 'the red one is you' },
      { p: 'Underneath, in smaller letters, pressed so hard the paper has split:' },
      { cls: 'hand', text: 'the red one is the one that keeps coming back' },
    ],
    journal: { cat: 'evidence', title: 'Mira has drawn me as the one who returns', text: '"the red one is you. the red one is the one that keeps coming back."' },
  },

  // ── Night 6: the truth ───────────────────────────────────────────────
  note_lease: {
    title: 'Lease — Apartment 204', type: 'record', ev: true,
    body: [
      { cls: 'stamp', text: 'TENANCY AGREEMENT' },
      { p: 'Being an agreement for the letting of <b>Apartment 204, 14 Kolben Street</b>, for a term of one year certain.' },
      { p: 'Tenant signature: <i>— and here is your signature, the loop on the last letter exactly as you make it —</i>' },
      { p: 'Date of commencement: <b>the eleventh day of the outage</b>' },
      { p: 'Below the date, a clerk has added a line by hand and initialled it:' },
      { cls: 'hand', text: 'renewed automatically. see prior agreements (11).' },
      { p: 'Clipped behind it are eleven identical agreements. Same apartment. Same signature. Eleven different years.' },
    ],
    journal: { cat: 'evidence', title: 'I have signed the same lease eleven times', text: 'Eleven identical tenancy agreements for 204. My signature on all of them. Eleven different years. Each one commences on the eleventh day of an outage.' },
  },

  file_404: {
    title: 'File — Apartment 404', type: 'record', ev: true,
    body: [
      { cls: 'stamp', text: 'CARETAKER — NOT FOR RESIDENTS' },
      { p: 'A buff folder, tab typed <b>404</b>. Inside, the same form the other apartments have, filled in with the same care.' },
      { p: 'FLOOR: 4. ASPECT: none. WINDOWS: none. AREA: <i>increasing</i>.' },
      { p: 'OCCUPANCY: continuous.' },
      { p: 'Under CONDITION, in a hand that starts steady and does not stay that way:' },
      { cls: 'hand', text: 'It is not a room. It is where the building puts what is left over. Every night that is lived twice leaves something and the something has to go somewhere.' },
      { cls: 'hand', text: 'I have sealed it four times. It is not sealed now. Nothing I do to that door lasts more than a season, and I am the only one who tries.' },
      { cls: 'hand', text: 'Do not let 204 find this.' },
    ],
    journal: { cat: 'evidence', title: 'Apartment 404 is on file', text: 'A caretaker\'s file for a room that has no windows and an area recorded as "increasing". "It is where the building puts what is left over." And: "Do not let 204 find this."' },
  },

  register: {
    title: 'Building Register', type: 'record', ev: true,
    body: [
      { p: 'Every tenancy since the building opened, ruled in columns, in several hands across many decades.' },
      { p: 'The column for 204 is the only one that never goes vacant. The name is the same name every time. The handwriting of the clerk changes; the name does not.' },
      { p: 'Beside each entry, in the margin, a number. 1. 2. 3. Up to 11.' },
      { p: 'The final entry has no number beside it yet. There is a space ruled for one.' },
    ],
    journal: { cat: 'evidence', title: 'The register: 204 has never been vacant', text: 'Same tenant, eleven times, decades apart. The last entry has a blank space ruled for the next number.' },
  },

  news_missing: {
    title: 'City Herald — Missing', type: 'news', ev: true,
    body: [
      { h: 'STILL MISSING' },
      { cls: 'byline', text: 'One year after the Kolben Street fire' },
      { p: 'Of the seven residents recorded as dying in the fire at 14 Kolben Street, six were recovered.' },
      { p: 'The seventh has never been found. The occupant of apartment 204 was seen by two neighbours on the landing minutes before the fire took hold, and was not seen again.' },
      { p: 'A fire officer, speaking privately, said the stairwell doors on the second and third floors had both been wedged, and that the wedges were newspaper, folded tight — "which is a thing a resident does, not a thing a fire does."' },
      { p: 'The family have asked that the search be formally closed.' },
    ],
    journal: { cat: 'evidence', title: 'The seventh body was never found', text: 'Six recovered, one never found: the occupant of 204. Both stairwell doors were wedged with folded newspaper. "A thing a resident does."' },
  },

  wedge: {
    title: 'Under the stairwell door', type: 'note', ev: true,
    body: [
      { p: 'The stairwell door has a brass kick-plate and, beneath it, a gap of about a centimetre where the floor has settled.' },
      { p: 'Wedged into the gap, compressed flat and grey with age, is a folded newspaper.' },
      { p: 'You work it out with your fingers. It comes free in one piece. It is folded into eight — a tight, deliberate, practised fold, the fold of somebody who has wedged a lot of doors.' },
      { p: 'You know the fold. Your hands make it without being asked.' },
      { p: 'The date on the newspaper is the eleventh day of the outage.' },
    ],
    journal: { cat: 'evidence', title: 'I wedged the doors', text: 'A newspaper folded into eight, wedged under the stairwell door, dated the eleventh day of the outage. My hands know the fold. They make it without being asked.' },
  },

  // ── tapes ────────────────────────────────────────────────────────────
  tape_a: {
    title: 'Tape — "Tenants Mtg"', type: 'tape', ev: true,
    body: [
      { spk: 'HALVARD', text: '— and I have said it at every one of these. The doors close by themselves for a reason. If you prop them, you are building a chimney.' },
      { spk: 'VOICE', text: "It's four flights with the shopping and no lift, Halvard." },
      { spk: 'HALVARD', text: 'Then take four trips.' },
      { spk: 'VOICE (laughing)', text: "204 props them every single day. Ask him." },
      { spk: 'ANOTHER VOICE', text: "I don't prop them. They stick." },
      { spk: 'HALVARD', text: 'They stick because you prop them.' },
      { cls: 'hand', text: '[the recording continues for some minutes. Nothing further is said about the doors.]' },
    ],
    journal: { cat: 'evidence', title: 'A tenants\' meeting about the fire doors', text: 'Halvard warned them. Somebody laughed and said 204 props the doors every day. A voice that sounds like mine said "they stick."' },
  },
  tape_b: {
    title: 'Tape — unlabelled', type: 'tape', ev: true,
    body: [
      { cls: 'hand', text: '[four minutes of room tone. Rain. A clock.]' },
      { spk: 'A WOMAN', text: 'It is not that he does not remember. It is that he remembers it the way you remember a story someone told you.' },
      { spk: 'A MAN', text: 'Then tell him.' },
      { spk: 'A WOMAN', text: 'I have told him. Twice. He was very kind about it both times and then he went to bed and in the morning he was new again.' },
      { spk: 'A MAN', text: 'So we let him keep going.' },
      { spk: 'A WOMAN', text: 'We let him keep going. He is the only one of us who still finds anything out. If he stops, we are just people in a building in the dark.' },
      { cls: 'hand', text: '[the tape runs out mid-sentence]' },
    ],
    journal: { cat: 'evidence', title: 'They know I forget', text: 'A woman who sounds like Ilse: "I have told him. Twice. In the morning he was new again." They keep letting me investigate because I am the only one who still finds anything out.' },
  },
  tape_c: {
    title: 'Tape — "For whoever is in 204 now"', type: 'tape', ev: true,
    body: [
      { spk: 'A MAN', text: "If you're playing this, you found the recorder, which means you're doing the same things I did, in roughly the same order, which is the part I still can't get used to." },
      { spk: 'A MAN', text: 'So. Quickly, because you have about nine minutes.' },
      { spk: 'A MAN', text: "The building isn't haunted. That's the wrong word and the wrong word wastes nights. The building is *keeping* something. Seven people went into the smoke and it kept them, and it kept the one who made the smoke, and the one who made the smoke is us." },
      { spk: 'A MAN', text: "You can leave. I want to be clear that you can leave — the chain on the front door is not locked, it has never been locked, and every one of us has walked past it a thousand times without trying it. That's not a trick. That's just what guilt looks like from the inside." },
      { spk: 'A MAN', text: "The other thing you can do is open the door on the third floor. I have not done that. I've stood in front of it on eleven separate last nights and I have gone back to bed eleven times." },
      { spk: 'A MAN (quieter)', text: "Take the child with you. Whatever else you do. She isn't one of the seven. She should never have been counted." },
      { cls: 'hand', text: '[click]' },
    ],
    journal: { cat: 'evidence', title: 'A recording addressed to me', text: 'A man with my voice: the chain on the front door has never been locked. The building is keeping the seven who died, and the one who made the smoke. "Take the child with you. She isn\'t one of the seven."' },
  },

  // ── caretaker's log ──────────────────────────────────────────────────
  note_halvard: {
    title: 'Maintenance Log', type: 'record', ev: true,
    body: [
      { p: '<b>3rd.</b> Corridor lamp F2 gone again. Third bulb this month. Bulbs are fine when I test them downstairs.' },
      { p: '<b>7th.</b> 302 says her wallpaper changed pattern. It did.' },
      { p: '<b>9th.</b> Sealed the third-floor door. Six nails, batten across. Will hold.' },
      { p: '<b>10th.</b> Door not sealed. Nails on the floor beneath it, heads up, arranged.' },
      { p: '<b>11th.</b> He is out again tonight. I have stopped following. He gets further each time and it is better if I know where he has got to than if I do not.' },
      { p: '<b>—</b> If anybody reads this after me: the job is not the boiler and it is not the lamps. The job is the count. Somebody has to know what night it is. Do not let it be him.' },
    ],
    journal: { cat: 'evidence', title: "The caretaker's real job is the count", text: '"The job is not the boiler and it is not the lamps. The job is the count. Somebody has to know what night it is. Do not let it be him."' },
  },

  // ── flavour, no evidence value ───────────────────────────────────────
  laundry_note: {
    title: 'Pinned above the machines', type: 'note', ev: false,
    body: [
      { cls: 'hand', text: 'WHOEVER KEEPS TAKING THINGS OUT OF MACHINE 2 BEFORE THE CYCLE ENDS — I KNOW WHO YOU ARE' },
      { p: 'Underneath, in a different hand, much smaller:' },
      { cls: 'hand', text: 'you do not' },
    ],
  },
  boiler_note: {
    title: 'Chalked on the boiler', type: 'note', ev: false,
    body: [
      { p: 'Numbers in chalk on the boiler casing, a column of them, each crossed out and replaced by the one below.' },
      { p: 'The bottom number is not crossed out. It reads <b>11</b>.' },
    ],
  },
  mailbox_note: {
    title: 'Mailbox 204', type: 'note', ev: false,
    body: [
      { p: 'Your mailbox is full. Not with post — with the same folded circular, dozens of copies, pressed in until the door would not shut.' },
      { p: 'Every copy advertises the same thing: a hardware shop on Kolben Street, two doors down, offering key cutting while you wait.' },
    ],
  },
  graffiti_note: {
    title: 'Scratched into the plaster', type: 'note', ev: false,
    body: [
      { p: 'Not sprayed — scratched, with something small and hard, by somebody with a great deal of time.' },
      { cls: 'hand', text: 'IT IS NOT THE BUILDING THAT IS CHANGING' },
    ],
  },
  child_note: {
    title: 'On the toybox', type: 'note', ev: false,
    body: [
      { cls: 'hand', text: 'MIRAS ROOM. KNOCK 3 TIMES. IF SOMEONE KNOCKS 4 TIMES DO NOT OPEN IT IS NOT ME' },
    ],
  },
  workshop_note: {
    title: "Tomas's bench", type: 'note', ev: false,
    body: [
      { p: 'A repair ticket, filled in properly, in a workshop that has not had a customer in years.' },
      { p: 'ITEM: torch. FAULT: "goes out on the stairs." ACTION: "nothing wrong with it."' },
      { p: 'CUSTOMER: <b>204</b>. Under that, eleven previous ticket numbers, all for the same torch, all with the same fault, all with the same action.' },
    ],
    journal: { cat: 'evidence', title: 'Tomas has fixed my torch eleven times', text: 'Eleven repair tickets, same torch, same fault — "goes out on the stairs" — same finding: "nothing wrong with it."' },
  },
  roof_plaque: {
    title: 'Cast into the parapet', type: 'plaque', ev: false,
    body: [
      { p: 'A foundation plate, green with verdigris, set into the parapet where nobody would ever read it.' },
      { p: '<b>14 KOLBEN STREET</b>' },
      { p: 'ERECTED FOR THE HOUSING OF FORTY FAMILIES' },
      { p: 'Below, added later, stamped rather than cast:' },
      { p: '<b>OCCUPANCY: 7</b>' },
    ],
  },
  impossible_room: {
    title: 'Apartment 403', type: 'note', ev: true,
    body: [
      { p: 'The apartment is your apartment.' },
      { p: 'Not similar. The same. The scorch ring on the kitchen counter where you put a pan down badly on your first night. The book face-down on the arm of the chair, open at the page you left it at. The window catch that only shuts if you lift it.' },
      { p: 'The only difference is the dust, which is thick and even and undisturbed, and lies across everything including the seat of the chair, as though the room has been exactly like this, alone, for a very long time.' },
      { p: 'On the table, two plates. One has been used.' },
    ],
    journal: { cat: 'evidence', title: '403 is my apartment, under years of dust', text: 'Identical to 204 down to the scorch ring and the book I left open. Undisturbed dust over everything. Two plates on the table; one used.' },
  },
};

/** Every doc that counts toward the ending gates. */
export const EVIDENCE_IDS = Object.entries(DOCS).filter(([, d]) => d.ev).map(([k]) => k);
