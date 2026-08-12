// ── Svenska: rum, förändringar iakttagna om natten, kombinationer ──────
//  Det som byggnaden själv säger: rumsnamn, de små felaktigheterna som
//  planen för natten hittar på, och etiketterna på det man kan sätta ihop.

const APT = {};
for (const n of ['102', '103', '104', '105', '106', '202', '203', '204', '205', '207',
  '301', '302', '304', '305', '306', '307', '401', '402', '403', '404', '405', '406']) {
  APT[`room.${n}.name`] = `Lägenhet ${n}`;
}

export default {
  ...APT,
  'room.laundry.name': 'Tvättstugan',
  'room.storage.name': 'Förrådsburarna',
  'room.boiler.name': 'Pannrummet',
  'room.office.name': 'Vaktmästarens kontor',
  'room.maint.name': 'Driftrummet',
  'room.lobby.name': 'Entréhallen',
  'room.206.name': 'Städskrubben',
  'room.newdoor.name': 'Dörren',

  // ── platsnamn i journalen ────────────────────────────────────────
  'loc.lobby': 'Entréhallen',
  'loc.laundry': 'Tvättstugan',
  'loc.storage': 'Förrådsburarna',
  'loc.boiler': 'Pannrummet',
  'loc.office': 'Vaktmästarens kontor',
  'loc.maint': 'Driftrummet',
  'loc.sealed': 'Det igenspikade rummet',
  'loc.roof': 'Taket',
  'loc.stairs': 'Trapphuset',
  'loc.elevator': 'Hissen',
  'loc.newdoor': 'Dörren utan nummer',

  'world.doorNoNumber': 'Dörren utan nummer',

  // ── nattens förändringar ─────────────────────────────────────────
  'chg.plate_swap.obs': 'Numret på {room} står det {now} på. Du är säker på att det stod {was}.',
  'chg.plate_swap.note': 'Lägenhetsnumren {a} och {b} har bytt plats.',
  'chg.door_colour.obs': '{room} har målats om. Den hade inte den här färgen igår. Det luktar inte färg.',
  'chg.door_colour.note': '{room} bytte färg över natten.',
  'chg.lamp_out.obs': 'Korridorlampan här är död. Glaset är kallt. Den lyste när du gick förbi.',
  'chg.unlock.obs': '{room} är olåst. Den har varit låst varje natt sedan du flyttade in.',
  'chg.unlock.note': '{room} stod öppen ikväll.',
  'chg.lock.note': '{room} är låst ikväll. Det var den inte förut.',

  // ── iakttagelser ─────────────────────────────────────────────────
  'obs.newdoor_seen': 'Det står en dörr här. Mellan 302 och 304, i en bit vägg du har gått förbi hundra gånger. Den har inget nummer.',
  'obs.newdoor_seen.jt': 'En dörr som inte fanns',
  'obs.newdoor_seen.jx': 'Tredje våningen, södra sidan, mellan 302 och 304. Ingen nummerskylt, inget nyckelhål, varm att ta på. Den har alltid funnits där, om man ska tro färgen.',
  'obs.lift_wrong': 'Hissen sa tre. Skylten på väggen säger fyra. Båda kan inte ha rätt och ingen av dem känns som om den ljuger.',
  'obs.lift_wrong.jt': 'Hissen går till fyra',
  'obs.lift_wrong.jx': 'Jag tryckte på 3 och hamnade på en våning där alla skyltar står på 4. Trapphuset ovanför tredje våningen är fortfarande igenproppat med skräp.',
  'obs.ilse_moved': 'Ilse är i 305 ikväll och beter sig som om hon alltid har varit i 305. Hennes möbler står i 305. De stod i 302 igår, och 302 är tomt igen.',
  'obs.ilse_moved.jt': 'Ilse har bytt lägenhet',
  'obs.ilse_moved.jx': 'Hon bor i 305 nu, med alla sina saker, och minns inte 302. 302 är tomt och städat.',
  'obs.stair_wedge': 'Något ligger inkilat under trapphusdörren på den här våningen.',

  // ── klotter ──────────────────────────────────────────────────────
  'w.heCounts': 'HAN RÄKNAR',
  'w.sevenLower': 'sju',
  'w.itIsYou': 'DET ÄR DU',

  // ── kombinationer ────────────────────────────────────────────────
  'combo.0.label': 'Sätt i batteriet i ficklampan',
  'combo.1.label': 'Spela upp bandet',
  'combo.2.label': 'Spela upp bandet',
  'combo.3.label': 'Spela upp bandet',
  'combo.4.label': 'Fundera på säkringen',
  'combo.4.note': 'Du skulle kunna sätta i den här säkringen om du hittade skåpet den hör hemma i.',

  // ── etiketter på saker man kan röra ──────────────────────────────
  'lbl.stairwell': 'Trapphuset',
  'lbl.wedge': 'Något under dörren',
  'lbl.castPlate': 'En gjuten skylt',
  'lbl.papers': 'Papper i lådan',
  'lbl.doorFrame': 'Dörrkarmen',
  'lbl.photograph': 'Fotografi',
  'lbl.maintLog': 'Driftjournal',
  'lbl.mailboxes': 'Postfacken',
  'lbl.file404': 'Akt — 404',
  'lbl.register': 'Husets register',
  'lbl.read': 'Läs',

  // ── saker att titta närmare på ───────────────────────────────────
  'ex.radiator': 'Ett element, iskallt. Det har varit kallt längre än strömavbrottet.',
  'ex.stairJunk': 'Trappan upp till fjärde våningen är packad med bråte — lådor, en garderobsdörr, något tungt under alltihop. Någon har gjort det med flit.',
  'ex.waterTank': 'Vattentanken. Tom, att döma av ljudet. Något har ristat en räkning i sidan — dussintals streck, grupperade i sjuor.',
  'ex.roofChair': 'En köksstol, uppburen hit och lämnad vänd mot staden. Sitsen är blanknött. Någon har suttit här väldigt många gånger och sett ljusen slockna, en stadsdel i taget.',
  'ex.book': 'En bok, med framsidan nedåt på stolskarmen, uppslagen på samma sida som den har varit uppslagen på sedan du flyttade in. Du har aldrig kommit förbi den sidan.',
  'ex.clock': 'Klockan stannade för länge sedan. Båda visarna står stilla. Du tänker ständigt dra upp den, och gör det ständigt inte.',
  'ex.wardrobe': 'Garderoben är tom så när som på galgarna, och galgarna hänger alla åt samma håll, vilket på något sätt är värre än om de inte gjorde det.',
  'ex.meters': 'Fem mätare, en per bebodd lägenhet. Fyra snurrar långsamt. Den femte — 204 — snurrar väldigt fort, och har gjort det länge, att döma av siffrorna.',

  // ── journalanteckningar som spelet skriver åt dig ─────────────────
  'j.lateBack.t': 'Jag kom inte tillbaka i tid',
  'j.lateBack.x': 'De tio minuterna tog slut medan jag fortfarande var i korridoren. Jag har inte kvar det som hände sedan. Jag vaknade på min egen våning med dörren stängd bakom mig och smutsiga händer.',
  'j.loop.t': 'Korridoren har inga ändar ikväll',
  'j.loop.x': 'Går jag österut på första och andra våningen hamnar jag i den västra änden igen. Dörrarna kommer i samma ordning. Trapphuset ligger där det alltid har legat, och jag kan inte gå dit.',
  'j.loop.n': 'Korridorerna går runt i sig själva.',
  'j.follower.t': 'Det är någon i korridoren med mig',
  'j.follower.x': 'Den står stilla när jag tittar på den. Den står inte stilla när jag inte gör det. Den är lika lång som jag.',
  'j.noCity.t': 'Det finns ingenting utanför fönstren',
  'j.noCity.x': 'Ingen gata. Inget hus mittemot. Regn, som faller genom platsen där en stad borde vara.',
  'j.mirror.t': 'Spegeln har slutat räkna med mig',
  'j.mirror.x': 'Rummet speglas perfekt. Jag finns inte i det.',
  'j.knockBack.t': 'Den knackade tillbaka',
  'j.knockBack.x': 'Jag lade handen på dörren utan nummer och något på andra sidan knackade fyra gånger. Mira säger att fyra inte är tillåtet.',
  'j.chain.t': 'Kedjan på ytterdörren',
  'j.chain.x': 'Jag stod framför den och provade inte. Jag har aldrig provat. Det är en märklig sak att vara säker på.',
  'j.basementLit.t': 'Källarlamporna fungerar',
  'j.basementLit.x': 'En säkring. Elva dygns strömavbrott, och källarlamporna tänds med en säkring, fast nätet ska vara dött.',
  'j.ilseGone.t': 'Ilse är inte i 302',
  'j.ilseGone.x': 'Hon gick ut i köket. Det finns ingen köksdörr. Teet är fortfarande varmt och hennes glasögon ligger på stolskarmen.',

  // ── laddning, död, övrigt ────────────────────────────────────────
  'ui.load.rebuild': 'Bygger om huset…',
  'ui.load.wallpaper': 'Sätter upp tapeterna…',
  'ui.load.lights': 'Släcker lamporna…',
  'ui.load.residents': 'Väcker de boende…',
  'ui.load.watch': 'Drar upp klockan…',
  'ui.again': 'Igen',
  'x.diedHungry': 'Du gick och lade dig hungrig en gång för mycket.',
  'x.diedExhausted': 'Kroppen gav upp någonstans mellan tredje våningen och din egen ytterdörr.',
  'x.diedCaught': 'Det som har gått bakom dig hann till slut ifatt.',
};
