// ── everything the player can carry ────────────────────────────────────
//  kind: 'tool' | 'consumable' | 'key' | 'document' | 'oddity'
//  clue: shown in italics — these are what the mystery is actually made of

export const ITEMS = {
  flashlight: {
    name: 'Flashlight', glyph: '🔦', kind: 'tool', unique: true,
    desc: 'A heavy rubber-cased torch. The kind that survives being dropped down a stairwell.',
    clue: 'Someone scratched a name off the grip. Four letters. You can still feel the grooves.',
  },
  battery: {
    name: 'Battery', glyph: '🔋', kind: 'consumable', stack: true,
    desc: 'A D-cell, still cold. Reloads the flashlight to full.',
    use: 'reload',
    useLabel: 'Load into flashlight',
  },
  food: {
    name: 'Tinned Food', glyph: '🥫', kind: 'consumable', stack: true,
    desc: 'Label soaked off. Weight says beans, smell says otherwise. It will keep you upright.',
    use: 'eat', useLabel: 'Eat',
  },
  medicine: {
    name: 'Medicine', glyph: '💊', kind: 'consumable', stack: true,
    desc: 'A blister pack, three left. Bitter, and they work.',
    use: 'heal', useLabel: 'Take a dose',
  },
  water: {
    name: 'Bottled Water', glyph: '💧', kind: 'consumable', stack: true,
    desc: 'The taps ran brown two days into the blackout. This did not come from the taps.',
    use: 'eat', useLabel: 'Drink',
  },
  screwdriver: {
    name: 'Screwdriver', glyph: '🪛', kind: 'tool', unique: true,
    desc: 'Flat head, worn nearly round. Opens panels, grilles and things not meant to be opened.',
    clue: 'Tomas will want this back. He will not ask for it.',
  },
  crowbar: {
    name: 'Crowbar', glyph: '⛏', kind: 'tool', unique: true,
    desc: 'Short, painted red once. Heavy enough to change a door\'s mind.',
  },
  fuse: {
    name: 'Ceramic Fuse', glyph: '🧯', kind: 'tool', stack: true,
    desc: 'Old-pattern, 15 amp. The basement box eats these.',
  },
  key_basement: {
    name: 'Boiler Room Key', glyph: '🔑', kind: 'key',
    desc: 'Brass, worn smooth, tagged with a paper label: BOILER — DO NOT COPY.',
  },
  key_office: {
    name: "Caretaker's Key", glyph: '🗝', kind: 'key',
    desc: 'Halvard keeps this on a chain. If you are holding it, he is not.',
    clue: 'The tag has been rewritten several times. Under the current label: 404.',
  },
  key_401: {
    name: 'Key to 401', glyph: '🔑', kind: 'key',
    desc: 'Cut recently. The brass is still bright where the machine bit it.',
    clue: 'Nobody has cut a key in this city for eleven days.',
  },
  key_roof: {
    name: 'Roof Key', glyph: '🔑', kind: 'key',
    desc: 'A padlock key on a loop of wire. Smells of rust and rain.',
  },
  key_302: {
    name: 'Key to 302', glyph: '🗝', kind: 'key',
    desc: "Ilse's spare. She pressed it into your hand and closed your fingers over it.",
  },
  recorder: {
    name: 'Tape Recorder', glyph: '📼', kind: 'tool', unique: true,
    desc: 'A dictaphone with a cracked window. It still turns. Tapes go in the slot.',
    clue: 'The counter reads 0074. You have never recorded anything.',
  },
  tape_a: { name: 'Tape — "Tenants Mtg"', glyph: '🎞', kind: 'document', doc: 'tape_a', desc: 'A cassette labelled in biro: TENANTS MTG, and a date eleven years old.' },
  tape_b: { name: 'Tape — unlabelled', glyph: '🎞', kind: 'document', doc: 'tape_b', desc: 'No label. Someone scratched the plastic where a label should be.' },
  tape_c: { name: 'Tape — "For whoever"', glyph: '🎞', kind: 'document', doc: 'tape_c', desc: 'A strip of masking tape reads: FOR WHOEVER IS IN 204 NOW.' },
  photo_two: { name: 'Photograph', glyph: '🖼', kind: 'document', doc: 'photo_two', desc: 'A colour photograph gone orange with age. Two people in a lit room.' },
  photo_ilse: { name: "Ilse's Photograph", glyph: '🖼', kind: 'document', doc: 'photo_ilse', desc: 'Taken in 302. The wallpaper is the same wallpaper. The people are not.' },
  photo_group: { name: 'Group Photograph', glyph: '🖼', kind: 'document', doc: 'photo_group', desc: 'Residents on the front steps, squinting. Someone has been scratched out.' },
  news_blackout: { name: 'Newspaper Cutting', glyph: '📰', kind: 'document', doc: 'news_blackout', desc: 'Front page, day three of the blackout.' },
  news_fire: { name: 'Newspaper — Archive', glyph: '📰', kind: 'document', doc: 'news_fire', desc: 'Yellowed. Folded so the headline is on the outside.' },
  news_missing: { name: 'Newspaper — Missing', glyph: '📰', kind: 'document', doc: 'news_missing', desc: 'A column of small photographs under one headline.' },
  note_door: { name: 'Note — "Do not"', glyph: '📄', kind: 'document', doc: 'note_door', desc: 'Torn from a lined pad, folded four times.' },
  note_tenant: { name: 'Tenant List', glyph: '📄', kind: 'document', doc: 'note_tenant', desc: 'A typed list of residents by apartment, annotated by hand.' },
  note_mira: { name: "Mira's Drawing", glyph: '🖍', kind: 'document', doc: 'note_mira', desc: 'Wax crayon on the back of a utility bill.' },
  note_voss: { name: "Voss's Count", glyph: '📄', kind: 'document', doc: 'note_voss', desc: 'Numbers in columns, thousands of them, in the same hand.' },
  note_halvard: { name: 'Maintenance Log', glyph: '📓', kind: 'document', doc: 'note_halvard', desc: "The caretaker's log book, entries going back decades." },
  note_lease: { name: 'Lease — 204', glyph: '📄', kind: 'document', doc: 'note_lease', desc: 'Your own tenancy agreement. You have never read it properly.' },
  note_letter: { name: 'Unsent Letter', glyph: '✉', kind: 'document', doc: 'note_letter', desc: 'Sealed, addressed, never posted. The stamp is for a postal rate long gone.' },
  file_404: { name: 'File — Apartment 404', glyph: '🗂', kind: 'document', doc: 'file_404', desc: 'A buff folder. The tab is typed: 404. There is no apartment 404.' },
  register: { name: 'Building Register', glyph: '📕', kind: 'document', doc: 'register', desc: 'Every tenancy since the building opened, in one book.' },
  coin: { name: 'Old Coins', glyph: '🪙', kind: 'oddity', stack: true, desc: 'Small change from a currency that was withdrawn a long time ago.', clue: 'All of them are dated the same year.' },
  ring: { name: 'Wedding Ring', glyph: '💍', kind: 'oddity', desc: 'Plain, worn thin on one side. Engraved inside, almost rubbed away.', clue: 'The engraving is your own handwriting.' },
  doll: { name: 'Cloth Doll', glyph: '🧸', kind: 'oddity', desc: "Mira's. Or it was. The stitching on the face has been picked out and redone.", },
  strange: {
    name: 'The Object', glyph: '🌑', kind: 'oddity',
    desc: 'It has no obvious function and it is slightly too heavy for its size. Held still, it is still. Held loosely, it turns to face the stairwell.',
    clue: 'Every resident recognises it. None of them will say what it is.',
  },
  bulb: { name: 'Light Bulb', glyph: '💡', kind: 'tool', stack: true, desc: 'Filament intact, glass clouded. Fits the corridor fittings.' },
};

/** Recipes. Order-independent. */
export const COMBOS = [
  { a: 'battery', b: 'flashlight', out: 'reload', label: 'Load the battery into the flashlight' },
  { a: 'tape_a', b: 'recorder', out: 'play:tape_a', label: 'Play the tape' },
  { a: 'tape_b', b: 'recorder', out: 'play:tape_b', label: 'Play the tape' },
  { a: 'tape_c', b: 'recorder', out: 'play:tape_c', label: 'Play the tape' },
  { a: 'fuse', b: 'screwdriver', out: 'note:You could fit this fuse if you found the box it belongs to.', label: 'Consider the fuse' },
];

export const START_INVENTORY = [
  { id: 'flashlight', qty: 1 },
  { id: 'battery', qty: 2 },
  { id: 'food', qty: 1 },
];
