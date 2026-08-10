// ══════════════════════════════════════════════════════════════════════
//  Endings. Which one you get depends on what you did on the last night,
//  and how much of the building you understood before you did it.
// ══════════════════════════════════════════════════════════════════════

export const ENDINGS = {
  escape: {
    title: 'The Street',
    body: `The hook is resting in the loop. It has always been resting in the loop.

You lift it off with one finger — it weighs nothing, it is the lightest thing in the building — and the door opens onto Kolben Street with the rain coming in sideways, and you step out into it, and the rain does not touch you.

You notice this at the corner. Your coat is dry. Your hands are dry. The water is arriving and passing through the place where you are standing and continuing on into the gutter, and the gutter is full, and the street is very loud, and you are the only quiet thing in it.

There is a building behind you with one lit window on the second floor. Someone is standing in it. From here you cannot make out the face, and you already know that if you walked back and climbed the stairs and opened the door of 204 you would find the room empty and the bed unmade and the book face-down on the arm of the chair, open at the same page.

You do not walk back. You walk to the end of the street, and then to the end of the next one, and the city goes on being dark around you for a long time.

Somewhere behind you, on the eleventh day of an outage, a man in 204 is putting on his coat and checking his torch and telling himself it is only ten minutes.`,
  },

  truth: {
    title: 'The Remainder',
    body: `The door opens because you are the person it is the remainder of.

Inside there is no room. There is a corridor, and it is your corridor, and at the end of it is your own front door with the tally marks under the frame, and beyond that another corridor, and another door, going back and back at an interval of exactly ten minutes.

Every one of them has you in it. Not ghosts — you, doing the ordinary things: checking a torch, knocking twice and once, folding a newspaper into eight and pushing it under a fire door with the side of your foot because your hands are full, because your hands were full, because you were carrying things and you were coming straight back.

You watch yourself do it four hundred times. You watch the smoke find the open stair. You watch six people be found and one not be.

And then you are standing in the corridor on the third floor with your hand on a door that has no number, and it is closed, and it has always been closed, and you understand — completely, without any of the comfort of not being sure — exactly what happened here and exactly whose ten minutes these are.

The building lets go.

It does not forgive you, because a building cannot. It simply stops needing you, the way a held breath stops being held.

In the morning the block on Kolben Street is empty, and the fire doors are shut, all of them, on every floor.`,
  },

  sacrifice: {
    title: 'Two Sets of Footprints',
    body: `She holds on to your coat the whole way down and she does not look at the walls, because you told her not to, and she is better at doing what she is told than you ever gave her credit for.

The chain lifts off. The door swings in. The rain comes at you sideways and it hits her — properly, wetly, an ordinary miserable soaking — and she makes a noise you have not heard anyone in this building make, which is the noise of being surprised by weather.

She goes down the steps. You go to follow her.

There is nothing dramatic. No hand on your shoulder, no wall where the doorway was. You simply find that you have not moved, and that you are not going to, and that this was decided a long time before tonight by somebody who folded a newspaper into eight and did not come back for it.

Mira gets to the pavement and turns round.

"Come on," she says.

"In a minute," you tell her, which is the eleventh lie you have told in this building and the only one you are glad about. "Go to the corner. Wait under the shop awning, it's dry. Someone will come."

She goes. You watch her all the way to the corner, and she looks back twice, and the second time you wave, and then the rain gets between you.

The door closes on its own, the way a fire door is supposed to.

Upstairs, someone has laid two places at a table on the third floor, and there is a chair on the roof facing the city, and you have a very long time now, and for the first time since the eleventh day you can think of one thing you did that came out right.`,
  },

  stay: {
    title: 'Occupancy: Seven',
    body: `The ten minutes go.

You feel them go — not as an alarm, as a kind of settling, the way a house settles at the end of a cold day. Somewhere below, a door that has been standing open for eleven years swings quietly shut.

You do not go outside. You have thought about it seriously, over and over, on eleven separate last nights, and tonight you sit down on the edge of the bed with your coat still on and you let the time run out, and it is not despair, it is something closer to putting down something heavy.

Ilse knocks in the morning. Two, then one.

There is tea, which is impossible, and it is warm, which is more impossible, and nobody mentions either. Tomas fixes a lamp that is not broken. Voss writes a number on a fresh sheet and underlines it. Mira draws four figures in brown crayon and does not need the red one any more, and pins it to your door without being asked.

The building keeps you. It keeps all of you, the way a drawer keeps things.

On the parapet of the roof, under the verdigris, a stamped plate says OCCUPANCY: 7, and for the first time in a very long time the number is correct, and nobody has to go out tonight at all.`,
  },

  remainder: {
    title: 'What Is Left Over',
    body: `The door opens, because it was always going to.

Inside there is a room the size of a cupboard and a smell of burning that is not in the air, and it is full — floor to ceiling, packed, sedimentary — with the things eleven years of repeated evenings have shed. Torch batteries. Folded newspapers. Cups of tea that were warm once. Four hundred identical Tuesdays, pressed flat.

You do not understand what you are looking at, because you did not find out enough to understand it, and the room does not explain itself to visitors.

You stand in it until the ten minutes are gone.

In the morning you wake in 204 with the taste of smoke in your mouth and no memory of the night, and the book is face-down on the arm of the chair, open at the same page, and there is a torch on the table with a fresh cell in it.

Eleven days without power. Ten minutes is what you allow yourself. You have never been able to say why the number matters.

It simply does.`,
  },

  lost: {
    title: 'You Did Not Come Back',
    body: `The ten minutes end and you are not behind your own door.

It is not violent. The corridor simply stops being a corridor you are in.

Somewhere below, a caretaker writes a date in a log book, and beside it a number, and then he sits for a while with the pen in his hand before he writes the second thing, which is the same thing he has had to write before.

In the morning, 204 is vacant. The register has a space ruled for a name. Ilse lays two places out of habit and then remembers, and is briefly, terribly clear-headed about it, and then it goes, the way it goes.

By the following night the corridor lamp outside 205 is working again and nobody can quite say when it stopped.`,
  },
};

/**
 * Which ending has the player earned?
 *  how: 'front' | 'door' | 'stayed' | 'dead'
 */
export function resolveEnding(st, how) {
  const ev = st.evidence.length;
  const tookMira = st.flags.mira_following || st.choices.includes('took_mira');

  if (how === 'dead') return 'lost';
  if (how === 'stayed') return 'stay';
  if (how === 'front') return tookMira ? 'sacrifice' : 'escape';
  if (how === 'door') {
    if (tookMira) return 'sacrifice';
    return ev >= 9 ? 'truth' : 'remainder';
  }
  return 'lost';
}

export function endingStats(st) {
  const out = [
    { k: 'Nights', v: `${st.stats.nightsDone}` },
    { k: 'Evidence', v: `${st.evidence.length}` },
    { k: 'Documents', v: `${st.docsRead.length}` },
    { k: 'People met', v: `${st.metNpcs.length}` },
  ];
  const bonds = Object.entries(st.trust).filter(([, v]) => v >= 4).map(([k]) => k);
  if (bonds.length) out.push({ k: 'Trusted by', v: `${bonds.length}` });
  if (st.journal.notes.length) out.push({ k: 'Own notes', v: `${st.journal.notes.length}` });
  return out;
}
