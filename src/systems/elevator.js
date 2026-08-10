// ══════════════════════════════════════════════════════════════════════
//  The lift. It works. Later on, it stops agreeing with the buttons.
// ══════════════════════════════════════════════════════════════════════
import { levelY, LEVELS } from '../world/layout.js';
import { clamp, damp } from '../core/util.js';

const DOOR_TIME = 1.4;
const HOLD_TIME = 7.0;
const SPEED = 1.9;

export class Elevator {
  constructor(building, audio, plan) {
    this.b = building;
    this.audio = audio;
    this.plan = plan;
    this.level = 0;
    this.y = levelY(0);
    this.targetLevel = 0;
    this.state = 'idle';       // idle | opening | open | closing | moving
    this.doorOpen = 0;
    this.hold = 0;
    this.queue = [];
    this.lastPos = { x: building.elevCar?.cx || 0, z: building.elevCar?.cz || 0 };
    this.arrivedAt = null;
    this.forcedOpen = false;
    for (const lv of LEVELS) this.b.setLandingDoor(lv, 0);
    this.b.setElevatorY(this.y, 0);
  }

  get pos() {
    const c = this.b.elevCar;
    return { x: c.cx, y: this.y, z: c.cz };
  }

  /** Where does the button labelled `lv` actually go tonight? */
  resolve(lv) {
    const map = this.plan.elevatorMap;
    if (!map) return lv;
    const v = map[String(lv)];
    return v == null ? lv : v;
  }

  call(lv) {
    if (!LEVELS.includes(lv)) return;
    if (this.level === lv && (this.state === 'open' || this.state === 'opening')) {
      this.hold = HOLD_TIME; return;
    }
    this.queue.push({ lv, announced: lv });
    this.audio.play('click', { pos: this.pos, volume: 0.6 });
  }

  press(lv) {
    if (!this.plan.floor4Open && lv === 3) {
      this.audio.play('click', { volume: 0.5 });
      return { refused: true };
    }
    const dest = this.resolve(lv);
    this.queue.push({ lv: dest, announced: lv });
    this.audio.play('click', { pos: this.pos, volume: 0.6 });
    return { dest, announced: lv, lied: dest !== lv };
  }

  /** Is the player standing inside the car? */
  contains(p) {
    const c = this.b.elevCar;
    return Math.abs(p.x - c.cx) < 0.85 && Math.abs(p.z - c.cz) < 1.0 &&
      p.y > this.y - 0.4 && p.y < this.y + 2.4;
  }

  update(dt, playerPos) {
    const b = this.b;
    switch (this.state) {
      case 'idle': {
        if (this.queue.length) {
          const next = this.queue.shift();
          if (next.lv === this.level) { this.state = 'opening'; this.arrivedAt = next; }
          else {
            this.targetLevel = next.lv;
            this.arrivedAt = next;
            this.state = 'moving';
            this.audio.bed('motor', 0.16, { fade: 0.4 });
          }
        }
        break;
      }
      case 'moving': {
        const ty = levelY(this.targetLevel);
        const dir = Math.sign(ty - this.y);
        this.y += dir * SPEED * dt;
        if ((dir > 0 && this.y >= ty) || (dir < 0 && this.y <= ty) || dir === 0) {
          this.y = ty;
          this.level = this.targetLevel;
          this.state = 'opening';
          this.audio.bedOff('motor', 0.35);
          this.audio.play('ding', { pos: this.pos, volume: 0.7, hall: true });
        }
        break;
      }
      case 'opening': {
        if (this.doorOpen === 0) this.audio.play('elev_doors', { pos: this.pos, volume: 0.55 });
        this.doorOpen = clamp(this.doorOpen + dt / DOOR_TIME, 0, 1);
        if (this.doorOpen >= 1) { this.state = 'open'; this.hold = HOLD_TIME; }
        break;
      }
      case 'open': {
        this.hold -= dt;
        if (this.hold <= 0 && !this.forcedOpen) {
          if (this.contains(playerPos) || this.queue.length) this.state = 'closing';
          else if (this.hold < -12) this.state = 'closing';
        }
        break;
      }
      case 'closing': {
        if (this.doorOpen === 1) this.audio.play('elev_doors', { pos: this.pos, volume: 0.45, rate: 0.9 });
        this.doorOpen = clamp(this.doorOpen - dt / DOOR_TIME, 0, 1);
        if (this.doorOpen <= 0) this.state = 'idle';
        break;
      }
      default: break;
    }

    b.setElevatorY(this.y, this.doorOpen);
    for (const lv of LEVELS) {
      b.setLandingDoor(lv, lv === this.level ? this.doorOpen : 0);
      const d = b.elevDoors.get(lv);
      if (d?.digit) {
        const near = Math.abs(this.y - levelY(lv)) < 8;
        d.digit.material.emissiveIntensity = near ? 1.2 : 0.25;
      }
    }
    if (b.elevCar?.bulb) {
      b.elevCar.bulb.material.emissiveIntensity = damp(
        b.elevCar.bulb.material.emissiveIntensity,
        this.state === 'moving' ? 1.1 + Math.sin(performance.now() * 0.01) * 0.5 : 1.7, 6, dt);
    }
  }

  /** For night 7: leave it standing open wherever it is. */
  forceOpen() { this.forcedOpen = true; this.state = 'opening'; }
}
