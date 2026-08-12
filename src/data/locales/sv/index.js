// ── Svenska språkpaket ────────────────────────────────────────────────
//  Delarna slås ihop till en enda platt nyckel→sträng-karta. Nycklar som
//  saknas faller tillbaka på engelskan, en sträng i taget.
import ui from './ui.js';
import story from './story.js';
import docs from './docs.js';
import world from './world.js';
import dialogue from './dialogue.js';
import dialogue2 from './dialogue2.js';
import dialogue3 from './dialogue3.js';

export default { ...ui, ...story, ...docs, ...world, ...dialogue, ...dialogue2, ...dialogue3 };
