// ══════════════════════════════════════════════════════════════════════
//  The residents, and everything they will and will not say.
//
//  Node format:
//    text   what they say (a string, or (st) => string)
//    opts   [{ t: player line, to: nodeId, if: (st)=>bool, fx: effects, tag }]
//  Effects:
//    { trust: n, flag: 'x', give: ['item'], ev: 'docId', journal: {...},
//      choice: 'id', close: true }
//  tag: 'probe' | 'kind' | 'hard'  — colours the option marker
// ══════════════════════════════════════════════════════════════════════
import { flag, trust, hasItem } from '../core/state.js';

const has = (st, id) => st.evidence.includes(id);

export const NPC_DEFS = {
  ilse: {
    name: 'Ilse Vogt', role: 'Apartment 302', short: 'Ilse',
    coat: 0x4a4258, skin: 0xb9a494, hair: 0xd8d4cc, height: 1.58, stoop: 0.1,
    bio: 'Lived here longer than anyone will say. Kind, sharp, and occasionally knows things she has no way of knowing.',
  },
  tomas: {
    name: 'Tomas Reiner', role: 'Apartment 104', short: 'Tomas',
    coat: 0x3c4a3e, skin: 0xa8917d, hair: 0x2e2a26, height: 1.79, stoop: 0,
    bio: 'Fixes things. Does not believe in anything he cannot take apart, which is a position he defends with more force each night.',
  },
  mira: {
    name: 'Mira Solt', role: 'Apartment 207', short: 'Mira',
    coat: 0x6a4a52, skin: 0xc0aa98, hair: 0x4a3a2e, height: 1.24, stoop: 0,
    bio: 'Nine, or thereabouts. Draws what is going to happen and is not troubled by it.',
  },
  voss: {
    name: 'Arne Voss', role: 'Apartment 401', short: 'Voss',
    coat: 0x3a3a42, skin: 0x9e8a78, hair: 0x6a665e, height: 1.86, stoop: 0.18,
    bio: 'Says he has been in the building for years and has the arithmetic to prove it.',
  },
  halvard: {
    name: 'Halvard', role: 'Caretaker', short: 'Halvard',
    coat: 0x2e3236, skin: 0x9a8672, hair: 0x8e8a84, height: 1.74, stoop: 0.05,
    bio: 'Keeps the boiler, the lamps, and the count. Increasingly of the view that you should stop.',
  },
};

// ── shared closers ──────────────────────────────────────────────────────
const BYE = (to = null) => ({ t: 'I should go.', to, fx: { close: true } });

export const DIALOGUE = {

  // ══════════════════ ILSE ══════════════════
  ilse: {
    greet(st) {
      const n = st.night;
      if (n === 1) return 'i1';
      if (n === 2) return 'i2';
      if (n === 3) return 'i3';
      if (n === 4) return 'i4';
      if (n === 5) return 'i5';
      if (n === 6) return 'i6';
      return 'i7';
    },
    nodes: {
      i1: {
        text: "Oh — it's you. Come in, come in, don't stand in the draught. I put the kettle on out of habit and then remembered. You get very stupid about kettles, in a blackout.",
        opts: [
          { t: "You knew it was me before you opened the door.", to: 'i1_knew', tag: 'probe' },
          { t: "How are you managing up here?", to: 'i1_manage', tag: 'kind', fx: { trust: 1 } },
          { t: "Have you heard anything strange at night?", to: 'i1_noise', tag: 'probe' },
          BYE(),
        ],
      },
      i1_knew: {
        text: "You knock the same way every time. Two, then one. Your father did that.",
        opts: [
          { t: "You never met my father.", to: 'i1_father', tag: 'hard' },
          { t: "…I suppose I do.", to: 'i1_manage', fx: { trust: 1 } },
        ],
      },
      i1_father: {
        text: "Didn't I? No. No, of course not. I'm sorry, dear — at my age the people run together. You have a face that belongs to several of them.",
        opts: [
          { t: "What did you mean, several?", to: 'i1_several', tag: 'probe' },
          { t: "It's alright.", to: 'i1_manage', fx: { trust: 1 } },
        ],
      },
      i1_several: {
        text: "Nothing. Nothing at all. Ask me again in a few days, when you've been out a few more times, and I'll probably tell you.",
        opts: [
          { t: "Why in a few days?", to: 'i1_days', tag: 'probe' },
          BYE(),
        ],
      },
      i1_days: {
        text: "Because you won't believe me now, and you'll waste one of your nights being polite about it. I would rather you spent them looking.",
        opts: [
          { t: "Looking at what?", to: 'i1_look', tag: 'probe', fx: { journal: { cat: 'characters', title: 'Ilse wants me to look', text: 'She says I would not believe her yet, and would rather I spent my nights looking. She counts my nights the way I do.' } } },
          BYE(),
        ],
      },
      i1_look: {
        text: "At the building, dear. It's the only thing here worth looking at. Everything else is just us.",
        opts: [BYE()],
      },
      i1_manage: {
        text: "Well enough. I have candles I'm not allowed to burn and a great deal of time. Tomas brings me tins and pretends they were spare. He's not subtle, that boy.",
        opts: [
          { t: "Have you heard anything strange at night?", to: 'i1_noise', tag: 'probe' },
          { t: "Do you need anything?", to: 'i1_need', tag: 'kind', fx: { trust: 1 } },
          BYE(),
        ],
      },
      i1_need: {
        text: "Batteries, if you ever have one spare. Not for a torch. I have a little radio and I like to hear it hiss. It's company, of a sort.",
        opts: [
          { t: "Take one of mine.", to: 'i1_gave', if: (st) => hasItem(st, 'battery', 2), tag: 'kind', fx: { trust: 2, flag: 'gave_ilse_battery', take: 'battery' } },
          { t: "I'll bring one when I can.", to: 'i1_noise', fx: { trust: 1 } },
        ],
      },
      i1_gave: {
        text: "…Oh. Well. That's very good of you. People don't, usually. Not on the first night.",
        opts: [
          { t: "The first night of what?", to: 'i1_several', tag: 'probe' },
          BYE(),
        ],
      },
      i1_noise: {
        text: "Every night, dear. Doors that nobody's behind. Someone on the stair at four in the morning who never arrives anywhere. You stop hearing it eventually — that's the part I'd warn you about, if warnings worked.",
        opts: [
          { t: "You stop hearing it?", to: 'i1_stop', tag: 'probe' },
          BYE(),
        ],
      },
      i1_stop: {
        text: "You stop *noticing* it. Same thing, worse. Write things down. Genuinely — write them down, tonight, before you sleep. Sleep is where it gets you.",
        opts: [
          { t: "Where what gets me?", to: 'i1_what', tag: 'probe' },
          { t: "I keep a journal.", to: 'i1_journal', fx: { trust: 1 } },
        ],
      },
      i1_what: { text: "Goodnight, dear. Two knocks and one. I'll know it's you.", opts: [BYE()] },
      i1_journal: {
        text: "Good. Read it in the morning before you do anything else. Especially the parts that embarrass you.",
        opts: [BYE()],
      },

      // ── night 2
      i2: {
        text: "There you are. Sit — no, sit, the chair by the window, that's the one that doesn't wobble. I've laid two places. I always lay two. It's not sad, it's just how the table looks right.",
        opts: [
          { t: "Who's the second place for?", to: 'i2_second', tag: 'probe' },
          { t: "You said to come up. Twice.", to: 'i2_twice', tag: 'probe' },
          { t: "Are you alright, Ilse?", to: 'i2_alright', tag: 'kind', fx: { trust: 1 } },
          BYE(),
        ],
      },
      i2_second: {
        text: "For whoever comes. Somebody usually does. Tonight it's you, which I'd rather hoped.",
        opts: [
          { t: "You said to come up. Twice.", to: 'i2_twice', tag: 'probe' },
          { t: "Why hope for me?", to: 'i2_hope', tag: 'probe' },
        ],
      },
      i2_hope: {
        text: "Because you still ask questions in the right order. That goes, you know. It goes before the memory does.",
        opts: [{ t: "Whose memory?", to: 'i2_twice', tag: 'probe' }],
      },
      i2_twice: {
        text: "Did I? Then it was important. I've been trying to say something to you for a long while and it keeps not surviving the journey.",
        opts: [
          { t: "Say it now.", to: 'i2_say', tag: 'hard' },
          { t: "Take your time.", to: 'i2_say', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      i2_say: {
        text: "There was a fire here. Not recently — you'd have to look it up, and you should. Nobody talks about it, and that's not grief. Grief talks. This is something else.",
        opts: [
          { t: "How many died?", to: 'i2_seven', tag: 'probe' },
          { t: "Why doesn't anyone talk about it?", to: 'i2_seven', tag: 'probe' },
        ],
      },
      i2_seven: {
        text: "Seven. And they're all still on the list, if you can find the list. That's not superstition, dear, that's paperwork.",
        opts: [
          { t: "What list?", to: 'i2_list', tag: 'probe', fx: { journal: { cat: 'evidence', title: 'Seven names still on a list', text: 'Ilse: seven died in a fire here, and all seven are still on some list. "That is not superstition, that is paperwork."' } } },
          BYE(),
        ],
      },
      i2_list: {
        text: "Halvard keeps it. He'd burn it before he showed you, and he's not wrong to. — Now. I'm going to go and see about the tea and you're going to look at the photograph on the dresser, and then you're going to go, and you are not going to come back up here tonight. Promise me.",
        opts: [
          { t: "…I promise.", to: null, fx: { close: true, flag: 'ilse_promise', trust: 1, journal: { cat: 'characters', title: 'Ilse sent me to the photograph', text: 'She told me to look at the photograph on her dresser, then leave and not come back tonight. She went to see about tea. There is no gas.' } } },
          { t: "Ilse, there's no gas. You can't make tea.", to: 'i2_gas', tag: 'hard' },
        ],
      },
      i2_gas: {
        text: "…No. There isn't, is there.",
        opts: [
          { t: "Ilse?", to: null, fx: { close: true, flag: 'ilse_promise', journal: { cat: 'characters', title: 'Ilse went to make tea', text: 'There is no gas and no power. She went to the kitchen anyway. She told me to look at the photograph on the dresser first.' } } },
        ],
      },

      // ── night 3
      i3: {
        text: "Come in. You look like you haven't slept, which makes two of us and about four of everyone.",
        opts: [
          { t: "You disappeared. Last night, out of this room.", to: 'i3_gone', tag: 'hard' },
          { t: "There's a door on this floor that wasn't there.", to: 'i3_door', tag: 'probe', if: (st) => flag(st, 'seen_newdoor') },
          { t: "You told me about the fire.", to: 'i3_fire', tag: 'probe', if: (st) => flag(st, 'ilse_promise') },
          BYE(),
        ],
      },
      i3_gone: {
        text: "Did I. — Don't look at me like that, dear, I'm not being coy. I don't have it. There's a piece of last night missing and I've stopped digging at those. You find things.",
        opts: [
          { t: "Your tea was still warm.", to: 'i3_warm', tag: 'hard' },
          { t: "I'm sorry. I shouldn't push.", to: 'i3_door', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      i3_warm: {
        text: "Then I was here, and then I was not here, and the tea didn't know the difference. That's the whole of it. Ask a better question.",
        opts: [
          { t: "There's a door on this floor that wasn't there.", to: 'i3_door', tag: 'probe' },
          BYE(),
        ],
      },
      i3_door: {
        text: "…",
        opts: [
          { t: "You've seen it.", to: 'i3_door2', tag: 'probe' },
        ],
      },
      i3_door2: {
        text: "I have lived on this floor for a very long time and I have watched that door be there and not be there and I have never once heard anybody go in. Do you understand what I'm telling you? Nobody goes in. Things come out.",
        opts: [
          { t: "What comes out?", to: 'i3_out', tag: 'probe', fx: { ev: 'door_plaque', journal: { cat: 'evidence', title: 'Ilse on the door', text: '"Nobody goes in. Things come out." She has watched the door be there and not be there, for years.' } } },
          { t: "Then I won't knock.", to: 'i3_knock', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      i3_out: {
        text: "Small things. A smell of burning that isn't in the air. A night you're certain you already had. Nothing you could show a policeman.",
        opts: [BYE()],
      },
      i3_knock: {
        text: "Good. Mira drew it, you know. Before it was there. She draws a great many things before they're there and everyone has agreed to find it charming.",
        opts: [
          { t: "That isn't charming.", to: 'i3_out', tag: 'hard', fx: { journal: { cat: 'characters', title: 'Mira drew the door first', text: 'Ilse says Mira drew the numberless door before it appeared, and that the adults have agreed to find this charming.' } } },
        ],
      },
      i3_fire: {
        text: "I told you? Then I meant to. Look it up before you ask me again — I'd rather argue with you about it than tell it to you.",
        opts: [BYE()],
      },

      // ── night 4
      i4: {
        text: "You've been up there. Don't deny it, you've got that look — like a man who's been somewhere that didn't have a floor plan.",
        opts: [
          { t: "There's a fourth floor.", to: 'i4_four', tag: 'probe' },
          { t: "Who lives in 401?", to: 'i4_voss', tag: 'probe' },
          { t: "Do you ever leave this building?", to: 'i4_leave', tag: 'hard' },
          BYE(),
        ],
      },
      i4_four: {
        text: "There is when it wants there to be. It has more room than it lets on, this place. Rather like a person that way — you can live with somebody for years and then find a whole floor of them.",
        opts: [
          { t: "Who lives in 401?", to: 'i4_voss', tag: 'probe' },
          { t: "How long have you known?", to: 'i4_known', tag: 'probe' },
        ],
      },
      i4_known: {
        text: "Since the third time you asked me about it.",
        opts: [
          { t: "I've never asked you about it.", to: 'i4_third', tag: 'hard' },
        ],
      },
      i4_third: {
        text: "No, dear. You haven't.",
        opts: [
          { t: "Ilse —", to: 'i4_voss', fx: { journal: { cat: 'characters', title: 'Ilse counts my questions', text: '"Since the third time you asked me about it." I have never asked her about the fourth floor. She did not correct herself.' } } },
        ],
      },
      i4_voss: {
        text: "Voss. He was here before me. He counts, and he'll tell you the number, and the number will be too large, and he will be telling the truth. Be kind to him. He's the only one of us doing arithmetic.",
        opts: [
          { t: "Doing arithmetic about what?", to: 'i4_arith', tag: 'probe' },
          BYE(),
        ],
      },
      i4_arith: { text: "Ask him. It's his. I'd only get it wrong and he'd never forgive me.", opts: [BYE()] },
      i4_leave: {
        text: "…That's the first time anyone's asked me that in — well. That's the first time anyone's asked me that.",
        opts: [
          { t: "You could just walk out the front door.", to: 'i4_front', tag: 'hard' },
        ],
      },
      i4_front: {
        text: "Yes. I know. I've known for a very long time. Knowing isn't the part that's difficult.",
        opts: [BYE()],
      },

      // ── night 5 (she is in 305 and does not know it)
      i5: {
        text: "Hello, dear. Mind the boxes — I still haven't got everything straight and I've been here long enough that it's embarrassing.",
        opts: [
          { t: "Ilse, this is 305. You live in 302.", to: 'i5_302', tag: 'hard' },
          { t: "Do you remember the fire?", to: 'i5_fire', tag: 'probe' },
          { t: "Do you remember my name?", to: 'i5_name', tag: 'probe' },
          BYE(),
        ],
      },
      i5_302: {
        text: "302? No, dear, that's been empty since before you came. Nice room. Better light. — Why are you looking at me like that. Sit down. You've gone grey.",
        opts: [
          { t: "I had tea in 302 with you three nights ago.", to: 'i5_tea', tag: 'hard' },
          { t: "Never mind. It doesn't matter.", to: 'i5_fire', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      i5_tea: {
        text: "We did, didn't we. And it was in this room, and the table was where that table is, and both of those are true, and I have stopped trying to make them agree. You will too. It takes about a year.",
        opts: [
          { t: "A year.", to: 'i5_year', tag: 'probe', fx: { ev: 'photo_group', journal: { cat: 'characters', title: 'Ilse holds two versions at once', text: 'She remembers tea in 302 and in 305, both true, and has stopped trying to reconcile them. "It takes about a year."' } } },
        ],
      },
      i5_year: {
        text: "Give or take. You were much angrier about it the first time.",
        opts: [
          { t: "The first time.", to: 'i5_first', tag: 'hard' },
        ],
      },
      i5_first: {
        text: "…I've said too much and it's not even late. Come tomorrow. Bring the photograph, if you still have it. I'll tell you the rest tomorrow — I always mean to.",
        opts: [BYE()],
      },
      i5_fire: {
        text: "Of course. I made soup for the Kerns afterwards and nobody ate it. And your birthday — the one we had in the courtyard with the paper lanterns, that was a fortnight after, do you remember? You were so pleased with the lanterns.",
        opts: [
          { t: "I've never had a birthday in this building.", to: 'i5_birthday', tag: 'hard' },
          { t: "…I remember the lanterns.", to: 'i5_lanterns', tag: 'kind', fx: { trust: 1, flag: 'lied_to_ilse' } },
        ],
      },
      i5_birthday: {
        text: "You *were*. You wore the awful jacket. — No. No, don't. If you tell me it didn't happen I shall have to put it somewhere, and I have run out of somewhere.",
        opts: [
          { t: "I'm sorry.", to: 'i5_name', tag: 'kind', fx: { trust: 1, journal: { cat: 'characters', title: 'Ilse remembers a birthday I never had', text: 'Paper lanterns in the courtyard, a fortnight after the fire, an awful jacket. She remembers it in detail. It did not happen.' } } },
        ],
      },
      i5_lanterns: {
        text: "There. Now — that's better, isn't it. That's much better for both of us.",
        opts: [BYE()],
      },
      i5_name: {
        text: "…Of course I do.",
        opts: [
          { t: "Say it, then.", to: 'i5_saymine', tag: 'hard' },
          { t: "It's alright.", to: null, tag: 'kind', fx: { close: true, trust: 1 } },
        ],
      },
      i5_saymine: {
        text: "You are the one in 204.",
        opts: [
          { t: "That's not a name.", to: 'i5_notname', tag: 'hard' },
        ],
      },
      i5_notname: {
        text: "No. It isn't. I've been very careful about that for a long time and I would rather you didn't make me stop.",
        opts: [BYE()],
      },

      // ── night 6
      i6: {
        text: "You've found it, then. I can see it on you. Sit down and ask, and I'll answer properly, because I think this is the last night I'll be able to.",
        opts: [
          { t: "What is this building?", to: 'i6_what', tag: 'probe' },
          { t: "What happened the night of the fire?", to: 'i6_fire', tag: 'probe', if: (st) => has(st, 'news_fire') },
          { t: "Who am I?", to: 'i6_who', tag: 'hard' },
          BYE(),
        ],
      },
      i6_what: {
        text: "It's a building. That's not me being clever — it genuinely is only a building, and that's what's wrong with it. It has no opinions. It kept us the way a drawer keeps things: because nobody has taken us out.",
        opts: [
          { t: "Kept you since the fire.", to: 'i6_fire', tag: 'probe' },
          { t: "Who am I?", to: 'i6_who', tag: 'hard' },
        ],
      },
      i6_fire: {
        text: "It started downstairs and it should have stayed downstairs. Buildings like this are built to survive a fire in one flat — the stair is meant to be a chimney with a lid on it. Somebody took the lid off.",
        opts: [
          { t: "The fire doors were propped.", to: 'i6_props', tag: 'probe', if: (st) => has(st, 'news_fire') || has(st, 'tape_a') },
          { t: "Who took the lid off?", to: 'i6_props', tag: 'hard' },
        ],
      },
      i6_props: {
        text: "Both of them. Second floor and third. Folded paper under the kick plates, packed tight, the way you'd do it if you meant it to hold all day and you meant to take it out before dark.",
        opts: [
          { t: "And whoever did it forgot.", to: 'i6_forgot', tag: 'probe', fx: { ev: 'news_missing' } },
        ],
      },
      i6_forgot: {
        text: "Whoever did it went out for ten minutes. That's all it was. Ten minutes, and a fire on the ground floor, and two doors that couldn't shut.",
        opts: [
          { t: "Ilse. Who am I?", to: 'i6_who', tag: 'hard' },
          { t: "…", to: 'i6_who', tag: 'probe' },
        ],
      },
      i6_who: {
        text: "You are the seventh. Six of us were found. You were not, and you have been going out for ten minutes every night since, and coming back, and being surprised in the morning.",
        opts: [
          { t: "That's not possible.", to: 'i6_possible', tag: 'hard' },
          { t: "How many times?", to: 'i6_times', tag: 'probe' },
        ],
      },
      i6_possible: {
        text: "No. And yet here we both are, and the tea is cold, and neither of us has aged. Take the key. It's my spare — if you need somewhere on the last night that the building doesn't watch as closely, 302 is as close as I can offer.",
        opts: [
          { t: "Thank you.", to: 'i6_times', fx: { give: ['key_302'], trust: 2 } },
        ],
      },
      i6_times: {
        text: "Eleven, that I've counted. Voss says more. Voss is probably right and I would rather he weren't.",
        opts: [
          { t: "Is there a way out?", to: 'i6_out', tag: 'probe', fx: { ev: 'note_lease', give: ['key_302'], journal: { cat: 'evidence', title: 'I am the seventh', text: 'Ilse: six were found after the fire, the seventh was not. That one has gone out for ten minutes every night since. Eleven cycles that she has counted.' } } },
        ],
      },
      i6_out: {
        text: "Three, and you won't like any of them. The front door, which is not locked and never has been. The door on this floor, which is. And staying, which is what the rest of us picked, and I'd ask you not to judge us for it until you've had a few thousand goes at it yourself.",
        opts: [
          { t: "Tomorrow, then.", to: null, fx: { close: true, flag: 'knows_three_ways', journal: { cat: 'evidence', title: 'Three ways out', text: 'The front door, which has never been locked. The numberless door, which is. Or staying, which is what the others chose.' } } },
        ],
      },

      // ── night 7
      i7: {
        text: "You came. I told them you'd come and Tomas bet me a tin of something you wouldn't. — It's tonight, isn't it. You can feel it in the corridor. The building's holding its breath.",
        opts: [
          { t: "I'm going to open the door.", to: 'i7_door', tag: 'hard' },
          { t: "I'm going to walk out the front.", to: 'i7_front', tag: 'probe' },
          { t: "Come with me.", to: 'i7_come', tag: 'kind' },
          { t: "What about Mira?", to: 'i7_mira', tag: 'kind', if: (st) => st.metNpcs.includes('mira') },
        ],
      },
      i7_door: {
        text: "Then be quick and don't look at the walls on the way. — If you find anything of mine in there, leave it. I've made my arrangements.",
        opts: [{ t: "What about Mira?", to: 'i7_mira', tag: 'kind' }, BYE()],
      },
      i7_front: {
        text: "Good. That's the one I'd choose for you. It won't feel like an ending, and that's how you'll know it worked — endings are the building's idea of a kindness.",
        opts: [{ t: "What about Mira?", to: 'i7_mira', tag: 'kind' }, BYE()],
      },
      i7_come: {
        text: "No, dear. I've been part of the plumbing for a long time and I'd only make a mess of it out there. But thank you. Genuinely — you're the only one who's asked, out of eleven.",
        opts: [{ t: "What about Mira?", to: 'i7_mira', tag: 'kind', fx: { trust: 2 } }, BYE()],
      },
      i7_mira: {
        text: "Take her. She wasn't one of the seven. She was upstairs at her grandmother's and she came home to a building that had already decided how many people it had, and it counted her in anyway, and none of us have ever been able to make it count her out.",
        opts: [
          { t: "I'll take her out.", to: 'i7_promise', tag: 'kind', fx: { flag: 'promised_mira', trust: 2, choice: 'promise_mira', journal: { cat: 'events', title: 'I promised to take Mira out', text: 'She was not one of the seven. She came home late and the building counted her anyway.' } } },
          { t: "I can't carry anyone.", to: 'i7_cant', tag: 'hard', fx: { trust: -2 } },
        ],
      },
      i7_promise: { text: "Then go. Go now, and don't come and say goodbye, I shall be unbearable.", opts: [BYE()] },
      i7_cant: { text: "No. I don't suppose you can. Go on, then.", opts: [BYE()] },
    },
  },

  // ══════════════════ TOMAS ══════════════════
  tomas: {
    greet(st) {
      const n = st.night;
      if (n === 1) return 't1';
      if (n === 2) return 't2';
      if (n === 3) return 't3';
      if (n === 4) return 't4';
      if (n === 5) return flag(st, 'tomas_loop_caught') ? 't5_caught' : 't5';
      if (n === 6) return 't6';
      return 't7';
    },
    nodes: {
      t1: {
        text: "Careful, there's a spring on this floor somewhere and I'm not looking for it in the dark. — You're 204, right. Torch working?",
        opts: [
          { t: "It works. Barely.", to: 't1_torch', fx: { trust: 1 } },
          { t: "What do you do down here all night?", to: 't1_do', tag: 'probe' },
          { t: "Does the building make noises to you?", to: 't1_noise', tag: 'probe' },
          BYE(),
        ],
      },
      t1_torch: {
        text: "Bring it by when it stops. It'll stop. They all stop on the stairs — cold contracts the contacts, or people jog it on the rail. Take a couple of cells, I've got a drawer of them and nothing to put them in.",
        opts: [
          { t: "Thanks, Tomas.", to: 't1_do', fx: { give: ['battery', 'battery'], trust: 1 } },
        ],
      },
      t1_do: {
        text: "Fix things. There's nothing to fix, so I take things apart that work and put them back. Keeps the hands honest. Ask Halvard, he'll tell you I'm a menace.",
        opts: [
          { t: "Does the building make noises to you?", to: 't1_noise', tag: 'probe' },
          { t: "What's Halvard like?", to: 't1_hal', tag: 'probe' },
          BYE(),
        ],
      },
      t1_hal: {
        text: "Decent. Wound tight. Takes the building personally, which you shouldn't do with a building. He's got a log book he writes in like it's scripture.",
        opts: [
          { t: "Where does he keep it?", to: 't1_log', tag: 'probe', fx: { journal: { cat: 'characters', title: "Halvard keeps a log", text: 'Tomas says the caretaker writes everything in a log book, in the basement office, "like it\'s scripture."' } } },
          BYE(),
        ],
      },
      t1_log: { text: "Office. Basement, south side. Locked, and he'd know. Don't.", opts: [BYE()] },
      t1_noise: {
        text: "It's a hundred-year-old building with no heating in it. It contracts. Water hammers in the risers. Wood moves. Every single noise in here has a boring explanation and I know most of them by name.",
        opts: [
          { t: "And the ones you don't?", to: 't1_dont', tag: 'probe' },
          { t: "Fair enough.", to: null, fx: { close: true, trust: 1 } },
        ],
      },
      t1_dont: {
        text: "Then I haven't found the pipe yet. — Look. I'm not being smart with you. If you start listening for it you'll hear it everywhere, and then you'll be no good to anybody. Ask Voss.",
        opts: [
          { t: "Who's Voss?", to: 't1_voss', tag: 'probe' },
        ],
      },
      t1_voss: {
        text: "Top floor. Was. There's no top floor now, there's three floors and a wall. Forget I said it.",
        opts: [BYE({})],
      },

      t2: {
        text: "You look like you've had a night. Sit down, don't touch that, it's live — no it isn't, nothing's live. Force of habit.",
        opts: [
          { t: "Ilse's gone. Out of her flat, mid-conversation.", to: 't2_ilse', tag: 'hard' },
          { t: "Can you fix my torch?", to: 't2_fix', fx: { flag: 'torch_serviced' } },
          BYE(),
        ],
      },
      t2_ilse: {
        text: "She wanders. She's eighty-something and it's pitch dark and there are nine hundred places to be in this building. She'll be in the laundry telling the machines about the war.",
        opts: [
          { t: "Her tea was still warm on the table.", to: 't2_warm', tag: 'hard' },
          { t: "You're probably right.", to: 't2_fix', fx: { trust: 1 } },
        ],
      },
      t2_warm: {
        text: "…Then she'd only just left. That's what warm tea means. That's *literally* what warm tea means.",
        opts: [
          { t: "Her glasses were on the chair. She can't see without them.", to: 't2_glasses', tag: 'hard' },
        ],
      },
      t2_glasses: {
        text: "Then she's stumbling round in the dark without her glasses and instead of looking for her we're standing in my flat doing a puzzle about it. Go and look for her. I'll do the basement.",
        opts: [
          { t: "Alright.", to: null, fx: { close: true, trust: 2, flag: 'tomas_searching', journal: { cat: 'characters', title: 'Tomas is searching the basement', text: 'He refuses the explanation and accepts the emergency, which is the most useful anybody has been.' } } },
        ],
      },
      t2_fix: {
        text: "Give it here. — Contacts are fine. Cell's fine. Reflector's fine. There's nothing wrong with this torch and I've told you that before.",
        opts: [
          { t: "You've never seen this torch before.", to: 't2_before', tag: 'hard' },
          { t: "Thanks anyway.", to: null, fx: { close: true, trust: 1 } },
        ],
      },
      t2_before: {
        text: "…No. I have. I've got the ticket somewhere. — Look, take it, it works, and don't make a thing of it.",
        opts: [
          { t: "Show me the ticket.", to: 't2_ticket', tag: 'probe', fx: { ev: 'workshop_note' } },
          BYE(),
        ],
      },
      t2_ticket: {
        text: "It's on the bench. Go on, read it. Read all of them, if you want to ruin your evening.",
        opts: [BYE()],
      },

      t3: {
        text: "Before you start — no. Whatever it is. No.",
        opts: [
          { t: "There's a door on the third floor with no number.", to: 't3_door', tag: 'probe', if: (st) => flag(st, 'seen_newdoor') },
          { t: "Did you find Ilse?", to: 't3_ilse', tag: 'kind', if: (st) => flag(st, 'tomas_searching') },
          BYE(),
        ],
      },
      t3_ilse: {
        text: "She was in her flat. Door open, kettle out, complaining about the draught. I asked her where she'd been and she asked me where I'd been, and she wasn't being funny.",
        opts: [
          { t: "Doesn't that frighten you?", to: 't3_frighten', tag: 'probe' },
          { t: "There's a door on the third floor with no number.", to: 't3_door', tag: 'probe' },
        ],
      },
      t3_frighten: {
        text: "It makes me want a drink and a working phone. Frightened is for things you can't take apart. I haven't finished taking this apart.",
        opts: [{ t: "There's a door on the third floor with no number.", to: 't3_door', tag: 'probe' }],
      },
      t3_door: {
        text: "Third floor's got six doors. 301, 302, 304, 305, 306, 307. I've rewired every one of them. There's no seventh.",
        opts: [
          { t: "Come and look at it.", to: 't3_look', tag: 'hard' },
          { t: "Then I'm wrong.", to: null, tag: 'kind', fx: { close: true, trust: 1 } },
        ],
      },
      t3_look: {
        text: "…No.",
        opts: [
          { t: "Why not?", to: 't3_why', tag: 'hard' },
        ],
      },
      t3_why: {
        text: "Because I've got a system, alright? The system is: there are six doors on the third floor. The system has held for a long time and I am not going up there to watch it stop holding. That's not stupidity, that's maintenance.",
        opts: [
          { t: "That's the most honest thing anyone's said to me here.", to: null, fx: { close: true, trust: 2, journal: { cat: 'characters', title: "Tomas refuses to look", text: '"There are six doors on the third floor. I am not going up there to watch that stop being true." He is not denying it. He is defending himself from it.' } } },
        ],
      },

      t4: {
        text: "You want the lift. I can hear you wanting the lift from here.",
        opts: [
          { t: "It has a button for four.", to: 't4_four', tag: 'probe' },
          { t: "Is there a fourth floor or not?", to: 't4_four', tag: 'hard' },
          BYE(),
        ],
      },
      t4_four: {
        text: "There's a button. A button's a switch. A switch closes a circuit. Whether the circuit goes anywhere is a separate question and the answer used to be no.",
        opts: [
          { t: "Used to be.", to: 't4_used', tag: 'probe' },
        ],
      },
      t4_used: {
        text: "I pulled that panel eleven years ago and there were four wires in a five-wire loom, and the fifth was cut back to the sheath. Somebody's joined it. Not spliced — *joined*, clean, with the right tool, and I'm the only one in this building with the right tool and it hasn't left my bench.",
        opts: [
          { t: "Show me the panel.", to: 't4_panel', tag: 'probe', fx: { give: ['screwdriver'], ev: 'elevator_panel', journal: { cat: 'evidence', title: 'The fifth wire was joined', text: "Tomas: the lift loom had a fifth wire cut back to the sheath. Someone has joined it properly, with a tool only he owns, which never left his bench." } } },
          { t: "Then who joined it?", to: 't4_who', tag: 'hard' },
        ],
      },
      t4_panel: {
        text: "Take the driver. Brass plate, four screws, don't drop them down the shaft. And if there's anything behind there that isn't wire, put the plate back and don't tell me.",
        opts: [BYE()],
      },
      t4_who: {
        text: "That's the question, isn't it. That's been the question for eleven years and I've spent every one of them not asking it.",
        opts: [
          { t: "Give me the screwdriver. I'll ask it.", to: 't4_panel', tag: 'hard', fx: { trust: 1 } },
        ],
      },

      t5: {
        text: "Careful, there's a spring on this floor somewhere and I'm not looking for it in the dark. — You're 204, right. Torch working?",
        opts: [
          { t: "Tomas. You said this to me on the first night. Word for word.", to: 't5_word', tag: 'hard' },
          { t: "…It works. Barely.", to: 't5_loop', fx: { trust: 0 } },
        ],
      },
      t5_loop: {
        text: "Bring it by when it stops. It'll stop. They all stop on the stairs — cold contracts the contacts, or people jog it on the rail. Take a couple of cells, I've got a drawer of them and nothing to put them in.",
        opts: [
          { t: "You said that too. All of it. Including the pause.", to: 't5_word', tag: 'hard' },
          { t: "Thanks, Tomas.", to: null, fx: { close: true, give: ['battery'] } },
        ],
      },
      t5_word: {
        text: "…",
        opts: [
          { t: "Tomas.", to: 't5_break', tag: 'probe' },
        ],
      },
      t5_break: {
        text: "I know. I know I did. I've got about four evenings in me and I've been running them for — I don't know. A while. It's not that I forget. It's that the evening comes round and my mouth already knows the shape of it.",
        opts: [
          { t: "How long?", to: 't5_long', tag: 'probe', fx: { flag: 'tomas_loop_caught', trust: 2, ev: 'tape_a', journal: { cat: 'characters', title: 'Tomas is running out of evenings', text: '"It is not that I forget. The evening comes round and my mouth already knows the shape of it." He says he has about four left.' } } },
        ],
      },
      t5_long: {
        text: "Ask Voss. He's got the number and I've spent a lot of effort not having it. — Do me a favour. When I do it again, and I will, don't stop me. It's better when I don't notice.",
        opts: [
          { t: "I won't stop you.", to: null, fx: { close: true, trust: 1, choice: 'spare_tomas' } },
          { t: "I'll stop you every time.", to: null, fx: { close: true, trust: -1, choice: 'confront_tomas' } },
        ],
      },
      t5_caught: {
        text: "Don't. I know. Let me get to the end of it, it's the only bit of the day that goes the way it should.",
        opts: [
          { t: "Alright.", to: null, fx: { close: true, trust: 1 } },
          BYE(),
        ],
      },

      t6: {
        text: "I went and looked at the front door tonight. First time in — first time. Stood in front of it for a while.",
        opts: [
          { t: "And?", to: 't6_and', tag: 'probe' },
          { t: "The chain isn't locked.", to: 't6_chain', tag: 'hard', if: (st) => has(st, 'tape_c') },
        ],
      },
      t6_chain: {
        text: "I know. I've known since about the second year. It's a chain with a hook on it and the hook is *resting* in the loop and I have stood there and looked at it and gone back upstairs and made my tea.",
        opts: [
          { t: "Why?", to: 't6_why', tag: 'probe' },
        ],
      },
      t6_and: {
        text: "And nothing. That's the whole story. I stood there, and I came back up, and I fixed a lamp that isn't broken.",
        opts: [
          { t: "Why?", to: 't6_why', tag: 'probe' },
        ],
      },
      t6_why: {
        text: "Because of what's on the other side of it, and I don't mean anything supernatural, I mean the street. Eleven years of street. Everyone I owed an explanation to has had eleven years of not getting one.",
        opts: [
          { t: "That's not a reason to stay.", to: 't6_reason', tag: 'hard' },
          { t: "I understand.", to: 't6_reason', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      t6_reason: {
        text: "No. It's a habit that's learned to argue. — If you go, go properly. Don't stand in front of it like I did. And take the crowbar off my bench, the third-floor door isn't going to be reasonable.",
        opts: [
          { t: "Thank you, Tomas.", to: null, fx: { close: true, give: ['crowbar'], trust: 2, flag: 'has_crowbar' } },
        ],
      },

      t7: {
        text: "Everything's wrong tonight. The corridor's long, the lift's lying, and I've been in this room twice without leaving it. So. What do you need.",
        opts: [
          { t: "Hold the lift for me.", to: 't7_lift', tag: 'probe', fx: { flag: 'tomas_holds_lift', trust: 1, choice: 'tomas_helps' } },
          { t: "Come with me. Out the front.", to: 't7_come', tag: 'kind' },
          { t: "Nothing. Thank you for the batteries.", to: 't7_bye', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      t7_lift: { text: "Done. It'll be on your floor and the doors will stay open. That's a promise from a man who can actually keep one.", opts: [BYE()] },
      t7_come: {
        text: "…Ask me at the door. Not now. If you're standing there and you ask me at the door, I might.",
        opts: [{ t: "I'll ask you at the door.", to: null, fx: { close: true, flag: 'tomas_maybe', trust: 1 } }],
      },
      t7_bye: { text: "Any time. Genuinely — any of the times.", opts: [BYE()] },
    },
  },

  // ══════════════════ MIRA ══════════════════
  mira: {
    greet(st) {
      const n = st.night;
      if (n <= 1) return 'm1';
      if (n === 2) return 'm2';
      if (n === 3) return 'm3';
      if (n === 4) return 'm4';
      if (n === 5) return 'm5';
      if (n === 6) return 'm6';
      return 'm7';
    },
    nodes: {
      m1: {
        text: "You knocked three times. Good. — I'm not allowed to open it for four.",
        opts: [
          { t: "Who told you that?", to: 'm1_who', tag: 'probe' },
          { t: "What are you drawing?", to: 'm1_draw', tag: 'kind', fx: { trust: 1 } },
          { t: "Is there a grown-up here?", to: 'm1_grown', tag: 'kind' },
        ],
      },
      m1_who: { text: "Me. I worked it out.", opts: [{ t: "What are you drawing?", to: 'm1_draw', tag: 'kind', fx: { trust: 1 } }] },
      m1_grown: {
        text: "Mum's at Nana's. She's been at Nana's for ages. Everyone's very nice about it.",
        opts: [
          { t: "What are you drawing?", to: 'm1_draw', tag: 'kind', fx: { trust: 1 } },
          { t: "How long is ages?", to: 'm1_ages', tag: 'probe' },
        ],
      },
      m1_ages: {
        text: "I don't know. Ilse does everyone's ages. She says mine's nine and it's been nine for a while and that I'm not to mind.",
        opts: [{ t: "What are you drawing?", to: 'm1_draw', tag: 'kind', fx: { trust: 1, journal: { cat: 'characters', title: 'Mira has been nine for a while', text: 'She says so herself, without concern. Ilse told her not to mind.' } } }],
      },
      m1_draw: {
        text: "The building. That one's for you, you can have it. — You have to keep it, though. If you throw it away I'll know, because I'll draw you throwing it away and then I'll have to draw it twice.",
        opts: [
          { t: "I'll keep it.", to: 'm1_keep', tag: 'kind', fx: { give: ['note_mira'], trust: 2 } },
          { t: "Why would you draw it twice?", to: 'm1_twice', tag: 'probe' },
        ],
      },
      m1_twice: { text: "Because it happens twice. Most things do. You get used to it.", opts: [{ t: "I'll keep the drawing.", to: 'm1_keep', fx: { give: ['note_mira'], trust: 2 } }] },
      m1_keep: { text: "Good. Bye. Come on Thursday, Thursday's interesting.", opts: [BYE()] },

      m2: {
        text: "The lady upstairs went in the wall.",
        opts: [
          { t: "Ilse? When?", to: 'm2_when', tag: 'probe' },
          { t: "Walls don't have insides, Mira.", to: 'm2_walls', tag: 'hard' },
        ],
      },
      m2_walls: { text: "This one does. It's very thick. You can hear people in it if you press.", opts: [{ t: "Ilse? When?", to: 'm2_when', tag: 'probe' }] },
      m2_when: {
        text: "In a bit. She hasn't yet. — Don't be cross, it's hard to do it in the right order.",
        opts: [
          { t: "Mira, has Ilse gone into the wall or not?", to: 'm2_not', tag: 'hard' },
          { t: "Take your time. Tell me what you saw.", to: 'm2_not', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      m2_not: {
        text: "She goes in the wall and she comes back out and she doesn't know. That's the sad bit. Coming back out and not knowing is the sad bit.",
        opts: [
          { t: "Does it happen to you?", to: 'm2_you', tag: 'probe' },
        ],
      },
      m2_you: {
        text: "No. I'm not one of the seven, so it doesn't work on me properly. It just makes me draw.",
        opts: [
          { t: "The seven?", to: 'm2_seven', tag: 'probe', fx: { journal: { cat: 'characters', title: 'Mira is not one of the seven', text: '"I am not one of the seven, so it does not work on me properly. It just makes me draw."' } } },
        ],
      },
      m2_seven: { text: "You know. — You do know. You just haven't got there yet, which is different.", opts: [BYE()] },

      m3: {
        text: "You saw the door!",
        opts: [
          { t: "You drew it before it was there.", to: 'm3_drew', tag: 'probe' },
          { t: "How did you know I saw it?", to: 'm3_knew', tag: 'probe' },
        ],
      },
      m3_knew: { text: "You've got the face. Everyone gets the face.", opts: [{ t: "You drew it before it was there.", to: 'm3_drew', tag: 'probe' }] },
      m3_drew: {
        text: "I drew it when it was there. It's always there, it's just not always *now*. — Do you want the one with the door? You can have it but you have to promise not to knock.",
        opts: [
          { t: "I promise.", to: 'm3_give', tag: 'kind', fx: { give: ['note_mira'], ev: 'note_mira', trust: 2 } },
          { t: "I can't promise that.", to: 'm3_cant', tag: 'hard' },
        ],
      },
      m3_give: { text: "It knocks back. Four times. That's why four's not allowed.", opts: [BYE()] },
      m3_cant: {
        text: "…Oh. — Then take it anyway. You'll want it after.",
        opts: [{ t: "After what?", to: 'm3_after', fx: { give: ['note_mira'], ev: 'note_mira', trust: 1 } }],
      },
      m3_after: { text: "After you knock.", opts: [BYE()] },

      m4: {
        text: "Did you go up? — You went up. There's dust on you and there isn't any dust anywhere else.",
        opts: [
          { t: "There's a whole floor up there.", to: 'm4_floor', tag: 'probe' },
          { t: "Have you been up there?", to: 'm4_been', tag: 'probe' },
        ],
      },
      m4_been: { text: "I'm not allowed. Not because of a grown-up. Because of the stairs.", opts: [{ t: "What about the stairs?", to: 'm4_stairs', tag: 'probe' }] },
      m4_floor: { text: "There's more than one. It puts them in when it needs somewhere to put things.", opts: [{ t: "What about the stairs?", to: 'm4_stairs', tag: 'probe' }] },
      m4_stairs: {
        text: "They go up too many times. If you count while you're going up you get a different number than if you don't count. So don't count. Mr Voss counts and look at him.",
        opts: [
          { t: "What's wrong with Voss?", to: 'm4_voss', tag: 'probe', fx: { journal: { cat: 'characters', title: 'Do not count on the stairs', text: 'Mira: counting the flights gives a different number than not counting. "Mr Voss counts and look at him."' } } },
        ],
      },
      m4_voss: { text: "He's the most awake person here and it's made him thin.", opts: [BYE()] },

      m5: {
        text: "Hello. You're early. — No. Sorry. That's tomorrow. Hello.",
        opts: [
          { t: "Mira, do you know my name?", to: 'm5_name', tag: 'probe' },
          { t: "Someone's been following me.", to: 'm5_follow', tag: 'hard' },
        ],
      },
      m5_name: {
        text: "Yes. Everyone does. Nobody says it because Halvard said not to and everyone's frightened of Halvard except Ilse and me.",
        opts: [
          { t: "Say it.", to: 'm5_say', tag: 'hard' },
          { t: "Why did he say not to?", to: 'm5_why', tag: 'probe' },
        ],
      },
      m5_why: {
        text: "He says if you hear it you'll remember all of it at once and that would be cruel. He's not being mean. He cries about it in the boiler room.",
        opts: [
          { t: "Say it anyway.", to: 'm5_say', tag: 'hard' },
          { t: "Then don't say it.", to: 'm5_dont', tag: 'kind', fx: { trust: 2, choice: 'spared_name' } },
        ],
      },
      m5_say: {
        text: "…No. I've decided. I'm allowed to decide things. — I'll tell you the other thing instead. You're the red one. In my drawings. Everyone else is brown and you're red because you're the one that keeps coming back.",
        opts: [
          { t: "How many times?", to: 'm5_times', tag: 'probe', fx: { ev: 'mira_figures' } },
        ],
      },
      m5_dont: {
        text: "Alright. — Thank you. Nobody lets me not do things.",
        opts: [{ t: "Is someone following me?", to: 'm5_follow', tag: 'probe' }],
      },
      m5_times: { text: "Lots. I've run out of the red crayon twice.", opts: [{ t: "Is someone following me?", to: 'm5_follow', tag: 'probe' }] },
      m5_follow: {
        text: "That's not a someone. That's the bit of you that stayed on the stairs. It wants to catch up. Don't let it catch up in the dark — it's fine in the light, it just stands there being sad.",
        opts: [
          { t: "How do I stop it?", to: 'm5_stop', tag: 'probe', fx: { journal: { cat: 'evidence', title: 'The follower', text: 'Mira: it is "the bit of you that stayed on the stairs". It is harmless in light. In the dark it wants to catch up.' } } },
        ],
      },
      m5_stop: { text: "Turn the lights on. It's not clever. It's just very patient.", opts: [BYE()] },

      m6: {
        text: "You've been in the office. — Don't worry, I won't say. Halvard's going to be so cross and I've drawn it already so it's fine.",
        opts: [
          { t: "Mira, what happened in the fire?", to: 'm6_fire', tag: 'probe' },
          { t: "Were you here when it happened?", to: 'm6_here', tag: 'probe' },
        ],
      },
      m6_here: {
        text: "No! That's the whole thing. I was at Nana's and I came back after and everyone was doing the night again and they just — counted me. Like when you're setting the table and you do an extra one without thinking.",
        opts: [
          { t: "So you shouldn't be here at all.", to: 'm6_shouldnt', tag: 'probe', fx: { ev: 'register', trust: 1 } },
        ],
      },
      m6_shouldnt: {
        text: "No. And nobody can un-count me, they've all tried. Ilse tried for ages. — You could, though. Probably. You're the red one.",
        opts: [
          { t: "How?", to: 'm6_how', tag: 'probe' },
        ],
      },
      m6_how: {
        text: "Take me with you when you go. Out the front, or through the door, I don't mind which. You have to actually go, though. You can't just say it and then be in bed.",
        opts: [
          { t: "I'll take you.", to: 'm6_yes', tag: 'kind', fx: { flag: 'promised_mira', trust: 2, choice: 'promise_mira' } },
          { t: "I don't know if I can.", to: 'm6_maybe', tag: 'hard' },
        ],
      },
      m6_yes: { text: "Okay. — I'll be ready. I've been ready for a really long time, so.", opts: [BYE()] },
      m6_maybe: { text: "That's alright. You said that last time too and then you did try. You just ran out of minutes.", opts: [BYE()] },
      m6_fire: {
        text: "It was downstairs and the smoke went up the stairs instead of staying put, because the doors were open. Doors are supposed to shut by themselves. Someone kept them open with paper.",
        opts: [
          { t: "Who?", to: 'm6_who', tag: 'hard' },
        ],
      },
      m6_who: {
        text: "…I'm not going to say it in a mean way, so don't hear it in a mean way. It was you. You didn't mean it. You were carrying things.",
        opts: [
          { t: "…", to: 'm6_here', fx: { ev: 'wedge', journal: { cat: 'evidence', title: 'Mira says I propped the doors', text: '"It was you. You did not mean it. You were carrying things."' } } },
        ],
      },

      m7: {
        text: "It's tonight. — I did my shoes myself.",
        opts: [
          { t: "Come with me. Now.", to: 'm7_go', tag: 'kind', if: (st) => flag(st, 'promised_mira'), fx: { flag: 'mira_following', choice: 'took_mira' } },
          { t: "Stay here. Stay inside, whatever happens.", to: 'm7_stay', tag: 'hard' },
          { t: "Are you frightened?", to: 'm7_scared', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      m7_scared: {
        text: "A bit. Mostly of you changing your mind at the end. You do that in some of them.",
        opts: [
          { t: "Come with me. Now.", to: 'm7_go', tag: 'kind', fx: { flag: 'mira_following', choice: 'took_mira' } },
          { t: "Stay here.", to: 'm7_stay', tag: 'hard' },
        ],
      },
      m7_go: { text: "Okay. I'll hold on to your coat. Don't go fast, I'm little.", opts: [{ t: "Stay close.", to: null, fx: { close: true } }] },
      m7_stay: {
        text: "…Okay.",
        opts: [{ t: "I'm sorry.", to: null, fx: { close: true, trust: -1, choice: 'left_mira' } }],
      },
    },
  },

  // ══════════════════ VOSS ══════════════════
  voss: {
    greet(st) {
      const n = st.night;
      if (n === 4) return 'v4';
      if (n === 5) return 'v5';
      if (n === 6) return 'v6';
      return 'v7';
    },
    nodes: {
      v4: {
        text: "Two thousand three hundred and fourteen. — That's not a greeting, it's an answer. You always ask eventually and I've started saving us the time.",
        opts: [
          { t: "Two thousand three hundred and fourteen what?", to: 'v4_what', tag: 'probe' },
          { t: "How long have you been here?", to: 'v4_what', tag: 'probe' },
          { t: "You're saying we've met.", to: 'v4_met', tag: 'hard' },
        ],
      },
      v4_met: {
        text: "We have met nineteen times. You have been surprised on nineteen occasions. I have stopped being wounded by it, which took about four hundred nights, so please don't apologise, you'll set me back.",
        opts: [{ t: "Two thousand three hundred and fourteen what?", to: 'v4_what', tag: 'probe' }],
      },
      v4_what: {
        text: "Nights. Each one: out of the door, ten minutes, back before it's up. I write the number down when I get in. That is the entire architecture of my life and I recommend it — a man with a number can't be talked out of his own past.",
        opts: [
          { t: "Nobody could survive that.", to: 'v4_survive', tag: 'hard' },
          { t: "Why ten minutes?", to: 'v4_ten', tag: 'probe', fx: { ev: 'note_voss' } },
        ],
      },
      v4_survive: {
        text: "You are doing it. You're doing it right now. The only difference between us is stationery.",
        opts: [{ t: "Why ten minutes?", to: 'v4_ten', tag: 'probe', fx: { ev: 'note_voss' } }],
      },
      v4_ten: {
        text: "Because that's how long it took. Whatever happened here took ten minutes and the building has never got past them. You'll notice you never decided on ten. You simply *knew* it, on your first night, like a man knows his own address.",
        opts: [
          { t: "What happened here?", to: 'v4_happened', tag: 'probe' },
          { t: "…I did know it.", to: 'v4_happened', tag: 'probe', fx: { trust: 1, journal: { cat: 'evidence', title: 'Ten minutes is not my rule', text: 'Voss: whatever happened here took ten minutes and the building has never got past them. I never decided on ten. I simply knew it.' } } },
        ],
      },
      v4_happened: {
        text: "A fire, badly handled. I have the newspaper. You've probably got the newspaper. What the newspaper doesn't have is that the building has been running the ten minutes ever since, with whoever it has, and it prefers you because you still *do* things in them.",
        opts: [
          { t: "How do I stop it?", to: 'v4_stop', tag: 'probe' },
          BYE(),
        ],
      },
      v4_stop: {
        text: "I don't know. I have a number and no theory. Come back tomorrow — you always do — and bring me something I haven't seen. That's my price. I'm very cheap.",
        opts: [{ t: "Tomorrow, then.", to: null, fx: { close: true, trust: 1 } }],
      },

      v5: {
        text: "You've been in my flat.",
        opts: [
          { t: "I have not.", to: 'v5_not', tag: 'hard' },
          { t: "What's missing?", to: 'v5_missing', tag: 'probe' },
        ],
      },
      v5_not: {
        text: "Sheets 1,100 to 1,140 are gone from the middle of the stack and the stack was against the wall and the dust line is *wrong*. Somebody has been in my flat and there are five of us and four of us can't climb.",
        opts: [{ t: "What's missing?", to: 'v5_missing', tag: 'probe' }],
      },
      v5_missing: {
        text: "Forty nights. Forty nights of my life, out of the middle, and I do not have them anywhere else, because the number *is* the memory, that's the entire point of the system —",
        opts: [
          { t: "I didn't take them. But I believe you.", to: 'v5_believe', tag: 'kind', fx: { trust: 2 } },
          { t: "Maybe you miscounted.", to: 'v5_miscount', tag: 'hard', fx: { trust: -2 } },
        ],
      },
      v5_miscount: {
        text: "I have not miscounted. I have not miscounted in two thousand three hundred and — — get out. Get out of my flat.",
        opts: [{ t: "Voss —", to: null, fx: { close: true, trust: -1 } }],
      },
      v5_believe: {
        text: "…Thank you. — It takes them, you see. Not people. It takes *the record*. That's why nobody here can hold on to anything: the building isn't erasing us, it's filing us, and the file is somewhere in this building and it is not in any of the rooms we can get into.",
        opts: [
          { t: "The fourth floor.", to: 'v5_four', tag: 'probe', fx: { journal: { cat: 'evidence', title: 'The building files people', text: 'Voss: forty sheets gone from the middle of his count. "It is not erasing us, it is filing us, and the file is in a room we cannot get into."' } } },
        ],
      },
      v5_four: {
        text: "404. There is a room on this floor I have never been able to enter and it is on the other side of a wall that has no door in it. If you find the door, you will find the paperwork. And I would like my forty nights back.",
        opts: [
          { t: "I've seen a door with no number. Third floor.", to: 'v5_third', tag: 'probe', if: (st) => flag(st, 'seen_newdoor') },
          BYE(),
        ],
      },
      v5_third: {
        text: "Third floor. — Of course. Of course it isn't on the fourth floor, that would be *organised*. Go through it. Whatever it costs, go through it, and if there is a stack of paper in there with my hand on it, bring me one sheet. One. Any one.",
        opts: [
          { t: "I'll try.", to: null, fx: { close: true, trust: 2, flag: 'voss_wants_sheet', choice: 'voss_favour' } },
        ],
      },

      v6: {
        text: "You've got the look of a man who has been in the records. Sit. Mind the sheets.",
        opts: [
          { t: "I'm the seventh. The one they never found.", to: 'v6_seventh', tag: 'hard', if: (st) => has(st, 'news_missing') || has(st, 'note_lease') },
          { t: "Why does the building keep us?", to: 'v6_keep', tag: 'probe' },
          BYE(),
        ],
      },
      v6_seventh: {
        text: "Yes. — I've known for about nine hundred nights and I have never once said it, because every version of you that I've told has spent the rest of the night apologising to me, and I would rather have the company than the apology.",
        opts: [
          { t: "Why does the building keep us?", to: 'v6_keep', tag: 'probe', fx: { trust: 1 } },
        ],
      },
      v6_keep: {
        text: "It doesn't keep us. *You* keep us. — Don't make that face, I'm not blaming you, I'm doing arithmetic. Six died. One did not, and could not stand it, and has gone out for ten minutes every night since trying to arrive at a version of the evening where the doors were shut.",
        opts: [
          { t: "And the six of you are just… along for it.", to: 'v6_along', tag: 'probe' },
          { t: "That's a theory, not a proof.", to: 'v6_proof', tag: 'hard' },
        ],
      },
      v6_proof: {
        text: "It is a theory with two thousand three hundred data points and no competitor. Bring me a better one and I'll burn this and thank you.",
        opts: [{ t: "So the six of you are along for it.", to: 'v6_along', tag: 'probe' }],
      },
      v6_along: {
        text: "We are the *set dressing*. And I want to be extremely clear that I am not complaining, because the alternative to being kept is being the six people who were found. — There is a way to end it. You will not like it and I am obliged to tell you.",
        opts: [
          { t: "Tell me.", to: 'v6_way', tag: 'probe' },
        ],
      },
      v6_way: {
        text: "Stop coming back. Go out and do not return before the ten minutes are up. The loop needs you inside it at the end. If you are elsewhere when it closes — through the front door, through that door on the third floor, off the roof, I don't care — it cannot start again.",
        opts: [
          { t: "What happens to you?", to: 'v6_you', tag: 'kind' },
          { t: "And then?", to: 'v6_then', tag: 'probe' },
        ],
      },
      v6_you: {
        text: "I stop. That is what I want and I have wanted it for a very long time and I have never been able to arrange it myself, because I am not the one the building is holding on to.",
        opts: [{ t: "And then?", to: 'v6_then', tag: 'probe', fx: { trust: 2 } }],
      },
      v6_then: {
        text: "Then it is eleven days into a blackout and a building on Kolben Street is empty, as it has been for some time. — Write the number down when you get in tonight. Whatever else you do. Somebody should have the last one.",
        opts: [
          { t: "I'll write it down.", to: null, fx: { close: true, flag: 'knows_loop_rule', trust: 1, ev: 'register', journal: { cat: 'evidence', title: 'How the loop ends', text: 'Voss: the loop needs me inside it at the end. If I am elsewhere when the ten minutes close — out the front, through the door, off the roof — it cannot start again.' } } },
        ],
      },

      v7: {
        text: "Two thousand three hundred and twenty-one. Last one, I should think. — You've come to say goodbye, which is thoughtful and slightly premature.",
        opts: [
          { t: "Come with me.", to: 'v7_come', tag: 'kind' },
          { t: "I found your sheets.", to: 'v7_sheets', tag: 'probe', if: (st) => flag(st, 'voss_wants_sheet') && has(st, 'file_404') },
          { t: "I'm going through the door.", to: 'v7_door', tag: 'hard' },
        ],
      },
      v7_sheets: {
        text: "…Forty nights. In a folder, in a room, filed. — Thank you. Genuinely. I am going to sit down with these and be extremely boring about them for as long as I have left.",
        opts: [{ t: "Come with me.", to: 'v7_come', tag: 'kind', fx: { trust: 2, flag: 'voss_grateful' } }],
      },
      v7_come: {
        text: "No. I've been the one who stays for longer than you've been anything at all. — Go and be somewhere else when it closes. That's the whole job. Don't be clever about it.",
        opts: [{ t: "Goodbye, Voss.", to: null, fx: { close: true, trust: 1 } }],
      },
      v7_door: {
        text: "Then knock properly and go in properly. And if there is a version of me in there, tell him the number. He'll have lost it.",
        opts: [{ t: "I will.", to: null, fx: { close: true, trust: 1 } }],
      },
    },
  },

  // ══════════════════ HALVARD ══════════════════
  halvard: {
    greet(st) {
      const n = st.night;
      const t = trust(st, 'halvard');
      if (n === 1) return 'h1';
      if (n === 2) return 'h2';
      if (n === 3) return 'h3';
      if (n === 4) return 'h4';
      if (n === 5) return 'h5';
      if (n === 6) return t <= -2 ? 'h6_hostile' : 'h6';
      return 'h7';
    },
    nodes: {
      h1: {
        text: "Basement's not for residents. Never has been. — You're 204. I'd know that coat anywhere.",
        opts: [
          { t: "You've seen this coat before?", to: 'h1_coat', tag: 'probe' },
          { t: "Just looking around.", to: 'h1_look', fx: { trust: 1 } },
          { t: "Is there power down here?", to: 'h1_power', tag: 'probe' },
        ],
      },
      h1_coat: { text: "It's a coat. There are four coats in this building. Don't make things of it.", opts: [{ t: "Fair enough.", to: 'h1_look', fx: { trust: 1 } }] },
      h1_power: {
        text: "There's no power anywhere. There's a boiler that doesn't run and a fuse box I keep tidy out of self-respect. If the lamps in your corridor are on, that's not the grid, and I'd rather you didn't think about it too hard.",
        opts: [
          { t: "If it isn't the grid, what is it?", to: 'h1_what', tag: 'hard' },
          { t: "Understood.", to: 'h1_look', fx: { trust: 1 } },
        ],
      },
      h1_what: { text: "Goodnight, 204.", opts: [BYE()] },
      h1_look: {
        text: "Then look, and go up. And do me one courtesy: when you go back in tonight, shut your door properly. People in this building are careless about doors and I've had enough of it for one lifetime.",
        opts: [
          { t: "Why does it matter?", to: 'h1_matter', tag: 'probe' },
          { t: "I'll shut it.", to: null, fx: { close: true, trust: 1, flag: 'halvard_door_advice' } },
        ],
      },
      h1_matter: { text: "Because doors are the only thing in a building that are *for* anything. Goodnight.", opts: [BYE()] },

      h2: {
        text: "You've been up to 302.",
        opts: [
          { t: "Ilse has gone. From inside a locked room.", to: 'h2_gone', tag: 'hard' },
          { t: "Does she do that often?", to: 'h2_often', tag: 'probe' },
        ],
      },
      h2_often: { text: "She's an old woman in an unlit building. She'll turn up.", opts: [{ t: "Her tea was still warm.", to: 'h2_gone', tag: 'hard' }] },
      h2_gone: {
        text: "She'll be back before morning. They always are. — Don't file a report, don't organise a search, and don't tell the child. Those three things, and everyone's fine.",
        opts: [
          { t: "'They always are.'", to: 'h2_always', tag: 'hard' },
          { t: "Alright.", to: null, fx: { close: true, trust: 1 } },
        ],
      },
      h2_always: {
        text: "…People come back. It's a building, not a plughole. — Go up, 204.",
        opts: [
          { t: "What's in the boiler room?", to: 'h2_boiler', tag: 'probe' },
          BYE(),
        ],
      },
      h2_boiler: {
        text: "A boiler. Locked, because it's full of things that will take your hand off and I'd have to write it up.",
        opts: [BYE()],
      },

      h3: {
        text: "No.",
        opts: [
          { t: "I haven't asked anything yet.", to: 'h3_asked', tag: 'probe' },
          { t: "There's a door on the third floor.", to: 'h3_door', tag: 'hard' },
        ],
      },
      h3_asked: { text: "You've got the walk. Ask, then, and then go up.", opts: [{ t: "There's a door on the third floor.", to: 'h3_door', tag: 'hard' }] },
      h3_door: {
        text: "There is a door on the third floor. There has been a door on the third floor for a very long time and I have sealed it four times, and I have written each of those four times in a book, and none of that is any of your business.",
        opts: [
          { t: "It's my building too.", to: 'h3_mine', tag: 'hard', fx: { trust: -1 } },
          { t: "Why do you keep sealing it?", to: 'h3_seal', tag: 'probe' },
        ],
      },
      h3_seal: {
        text: "Because that's the job. You put a barrier between the residents and the thing that will hurt them. That's what a caretaker *is*. It's not lamps.",
        opts: [
          { t: "What's on the other side?", to: 'h3_other', tag: 'probe', fx: { ev: 'note_halvard', journal: { cat: 'characters', title: 'Halvard has sealed the door four times', text: 'He calls it the job: "You put a barrier between the residents and the thing that will hurt them."' } } },
        ],
      },
      h3_mine: { text: "It is not. You are a tenant. Tenants leave.", opts: [{ t: "Then let me leave.", to: 'h3_leave', tag: 'hard' }] },
      h3_leave: { text: "…Go up, 204.", opts: [BYE()] },
      h3_other: { text: "Go up, 204. I mean it kindly and I will not say it kindly twice.", opts: [BYE()] },

      h4: {
        text: "The lift's been to four. I can hear which floors it's been to; I've listened to that motor for thirty years. — Which of you did that.",
        opts: [
          { t: "It took me there. I didn't ask it to.", to: 'h4_took', tag: 'probe' },
          { t: "I pressed the button. It's a button.", to: 'h4_button', tag: 'hard', fx: { trust: -1 } },
        ],
      },
      h4_button: { text: "It is not a button. It is a *permission*.", opts: [{ t: "Permission from whom?", to: 'h4_took', tag: 'probe' }] },
      h4_took: {
        text: "Then it's started. — Listen to me. There is a floor up there that fills up. Every night that gets lived twice puts something on it. It has been filling since before you were a tenant and I have kept the stair blocked and the wire cut and it does not matter, because it isn't a place you get to by climbing.",
        opts: [
          { t: "How do you get to it?", to: 'h4_how', tag: 'probe' },
          { t: "You cut the lift wire.", to: 'h4_wire', tag: 'hard' },
        ],
      },
      h4_wire: {
        text: "I cut it in the year of the fire and I have re-cut it eleven times since, and every time, within a season, it is joined again. Beautifully. Better than I could do it. — Ask me who joins it. Go on.",
        opts: [
          { t: "Who joins it?", to: 'h4_who', tag: 'hard' },
        ],
      },
      h4_who: {
        text: "You do. Not — not you *now*. The you that's been here longer than you have. I've watched you do it twice and both times you looked at me afterwards and asked me the way to the stairs.",
        opts: [
          { t: "That's not possible.", to: 'h4_poss', tag: 'hard', fx: { ev: 'elevator_panel', journal: { cat: 'characters', title: 'Halvard says I rejoin the wire', text: 'He has cut the lift wire eleven times. He says he has twice watched me splice it back — and then ask him the way to the stairs.' } } },
          { t: "Then help me stop doing it.", to: 'h4_help', tag: 'kind', fx: { trust: 2 } },
        ],
      },
      h4_poss: { text: "No. Go up, 204. Shut your door.", opts: [BYE()] },
      h4_help: {
        text: "…That's a new one. Twelve years and that's a new one. — Come and see me when you've stopped guessing and started knowing. Not before. I've nothing to give a man who's still enjoying it.",
        opts: [{ t: "I'll come back.", to: null, fx: { close: true, flag: 'halvard_open', trust: 1 } }],
      },
      h4_how: { text: "You don't. Go up.", opts: [BYE()] },

      h5: {
        text: "My keys are gone.",
        opts: [
          { t: "I don't have your keys.", to: 'h5_deny', tag: 'probe' },
          { t: "Then you left them somewhere.", to: 'h5_deny', tag: 'hard', fx: { trust: -1 } },
          { t: "I took them.", to: 'h5_admit', tag: 'hard', if: (st) => hasItem(st, 'key_office'), fx: { trust: 1 } },
        ],
      },
      h5_admit: {
        text: "…At least you say it. — Keep them. I've been carrying that ring for thirty years and every one of those keys opens a room I'd rather you didn't go into, and I have run out of the energy it takes to be the last locked door in a building like this.",
        opts: [
          { t: "I'm sorry.", to: 'h5_sorry', tag: 'kind', fx: { trust: 2, flag: 'has_office_key' } },
        ],
      },
      h5_sorry: { text: "Don't be sorry. Be quick. You're on five of seven and you always waste six.", opts: [{ t: "Five of seven?", to: 'h5_seven', tag: 'probe' }] },
      h5_seven: {
        text: "Seven nights, then it turns over and you're new again. Seven. Every time. I have the dates.",
        opts: [{ t: "Show me the dates.", to: null, fx: { close: true, flag: 'halvard_open', ev: 'note_halvard', journal: { cat: 'evidence', title: 'Seven nights, then it turns over', text: 'Halvard: seven nights, then it starts again and I am new. He has the dates in his log.' } } }],
      },
      h5_deny: {
        text: "Somebody has them. There are five of us and one of you keeps ending up in rooms he can't be in. — I'm not accusing you of stealing. I'm accusing you of being the reason things move.",
        opts: [
          { t: "That's not the same thing.", to: 'h5_same', tag: 'probe' },
          { t: "Maybe I am.", to: 'h5_maybe', tag: 'kind', fx: { trust: 1 } },
        ],
      },
      h5_same: { text: "It is here.", opts: [BYE()] },
      h5_maybe: {
        text: "…Yes. Well. — Five of seven. Get on with it.",
        opts: [{ t: "Five of seven?", to: 'h5_seven', tag: 'probe' }],
      },

      h6: {
        text: "You've read the log. Sit down. I'm too tired to stand in a doorway being the villain.",
        opts: [
          { t: "You've known the whole time.", to: 'h6_known', tag: 'hard' },
          { t: "What is 404?", to: 'h6_404', tag: 'probe' },
          { t: "I need the key to the records.", to: 'h6_key', tag: 'probe' },
        ],
      },
      h6_known: {
        text: "I've known since the second cycle. And every cycle I've decided again that the kind thing is to keep you comfortable and blocked and out of it — and every cycle you get a little further anyway, and I've begun to wonder whether the kindness was ever for you.",
        opts: [{ t: "What is 404?", to: 'h6_404', tag: 'probe', fx: { trust: 1 } }],
      },
      h6_404: {
        text: "It's not a room, it's a remainder. Every night this building lives twice leaves a residue and the residue has to sit somewhere. That's the door on the third floor. It's the only room in this building I can't paint.",
        opts: [
          { t: "Give me the key to it.", to: 'h6_nokey', tag: 'hard' },
          { t: "I need the key to the records.", to: 'h6_key', tag: 'probe' },
        ],
      },
      h6_nokey: {
        text: "There's no key. There's no lock. That door opens for the person it's the remainder *of*, and that has never once been me. — Take the crowbar off Tomas if it makes you feel prepared. It won't help and it'll make you feel better, and I'm past objecting to that.",
        opts: [{ t: "I need the key to the records.", to: 'h6_key', tag: 'probe' }],
      },
      h6_key: {
        text: "404 in the record room is the file, yes. — Here. Office, cabinets, everything. On one condition, and I'd like you to actually hear it: when you know, do something. Don't do what the others did and sit with it. The ones who sat with it are still sitting.",
        opts: [
          { t: "I'll do something.", to: null, fx: { close: true, give: ['key_office'], flag: 'has_office_key', trust: 3, choice: 'halvard_ally', journal: { cat: 'characters', title: 'Halvard gave me his keys', text: '"When you know, do something. The ones who sat with it are still sitting."' } } },
        ],
      },
      h6_hostile: {
        text: "No. Not tonight, not from you. I've spent twelve years keeping this building from eating a man who won't stop wandering into its mouth, and tonight I'm going to sit in this chair.",
        opts: [
          { t: "Then sit in it.", to: null, tag: 'hard', fx: { close: true, trust: -1 } },
          { t: "I know what I am. I know about the doors.", to: 'h6_soften', tag: 'kind', if: (st) => has(st, 'wedge') || has(st, 'news_missing') },
        ],
      },
      h6_soften: {
        text: "…Say it, then. Out loud. I've waited twelve years for one of you to say it out loud.",
        opts: [
          { t: "I propped the fire doors. Seven people died.", to: 'h6_said', tag: 'hard', fx: { trust: 4, flag: 'confessed', choice: 'confessed' } },
        ],
      },
      h6_said: {
        text: "…Yes. — Take the keys. Office, cabinets, all of it. And when you know the rest of it, do something with it. The ones who sat with it are still sitting.",
        opts: [{ t: "Thank you.", to: null, fx: { close: true, give: ['key_office'], flag: 'has_office_key' } }],
      },

      h7: {
        text: "Last night. — Don't look surprised, I've kept the count for twelve years, it's the only thing I'm good at.",
        opts: [
          { t: "I'm going through the door.", to: 'h7_door', tag: 'hard' },
          { t: "I'm walking out the front.", to: 'h7_front', tag: 'probe' },
          { t: "Come with me.", to: 'h7_come', tag: 'kind' },
        ],
      },
      h7_door: {
        text: "Then I won't stop you, and that is the single hardest sentence I have ever constructed. — Go quickly. And whatever's in there wearing my face, don't talk to it. It's got nothing to say that I haven't.",
        opts: [{ t: "Goodbye, Halvard.", to: null, fx: { close: true, trust: 1 } }],
      },
      h7_front: {
        text: "The chain isn't locked. It's never been locked. I've stood in front of it more nights than you've been alive. — Go on. Somebody should.",
        opts: [{ t: "Come with me.", to: 'h7_come', tag: 'kind' }, BYE()],
      },
      h7_come: {
        text: "Somebody has to hold the count. If we all go out at once nobody knows what night it was, and then it isn't an ending, it's just a Tuesday. — I'll be in the office. Shut your door on the way past.",
        opts: [{ t: "I'll shut it.", to: null, fx: { close: true, trust: 2, flag: 'halvard_farewell' } }],
      },
    },
  },
};
