// ══════════════════════════════════════════════════════════════════════
//  A small hand-rolled post chain: bloom → grade → grain → vignette,
//  plus a "distortion" channel the game pushes when reality slips.
//  Written directly against WebGLRenderTarget so the game has no
//  dependency on three's example addons.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';

const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BRIGHT_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform float threshold;
uniform float softness;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(threshold, threshold + softness, l);
  gl_FragColor = vec4(c.rgb * k, 1.0);
}
`;

const BLUR_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 dir;          // texel-sized step
varying vec2 vUv;
void main(){
  // 9-tap gaussian
  vec4 s = texture2D(tDiffuse, vUv) * 0.2270270270;
  s += texture2D(tDiffuse, vUv + dir * 1.3846153846) * 0.3162162162;
  s += texture2D(tDiffuse, vUv - dir * 1.3846153846) * 0.3162162162;
  s += texture2D(tDiffuse, vUv + dir * 3.2307692308) * 0.0702702703;
  s += texture2D(tDiffuse, vUv - dir * 3.2307692308) * 0.0702702703;
  gl_FragColor = s;
}
`;

const COMPOSITE_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform float time;
uniform float grain;
uniform float vignette;
uniform float bloomAmt;
uniform float aberration;
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform float distort;      // reality slipping: 0 normal, 1 very wrong
uniform float pulse;        // 0..1 radial red pulse (damage / dread)
uniform float desat;        // grey-out on low health
uniform vec3  tintShadow;
uniform vec3  tintHigh;
uniform vec2  resolution;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main(){
  vec2 uv = vUv;
  vec2 cen = uv - 0.5;
  float r2 = dot(cen, cen);

  // ── barrel warp that grows with distortion; breathes slowly
  if (distort > 0.001) {
    float wob = sin(time * 0.7 + uv.y * 9.0) * 0.5 + sin(time * 1.13 + uv.x * 7.0) * 0.5;
    uv += cen * r2 * distort * 0.22;
    uv += vec2(wob) * distort * 0.0035;
    uv += vec2(noise(uv * 6.0 + time * 0.15) - 0.5) * distort * 0.012;
  }

  // ── chromatic aberration, stronger at the edges
  float ab = aberration * (0.4 + r2 * 2.2) + distort * 0.0035;
  vec2 off = cen * ab;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + off).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - off).b;

  // ── bloom
  vec3 bl = texture2D(tBloom, uv).rgb;
  col += bl * bloomAmt;

  // ── grade: cold shadows, warm highlights
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = mix(tintShadow, tintHigh, smoothstep(0.02, 0.55, l));
  col *= tint;

  col = (col - 0.5) * contrast + 0.5;
  col *= brightness;
  col = mix(vec3(l), col, saturation * (1.0 - desat));

  // ── damage / dread pulse
  if (pulse > 0.001) {
    float ring = smoothstep(0.12, 0.62, r2);
    col = mix(col, vec3(0.42, 0.045, 0.05), ring * pulse * 0.85);
  }

  // ── vignette
  float v = 1.0 - vignette * smoothstep(0.16, 0.86, r2 * 1.55);
  col *= v;

  // ── film grain (luma-weighted so shadows stay noisy, highlights clean)
  float g = noise(gl_FragCoord.xy * 0.85 + vec2(time * 61.3, time * 37.7));
  float gw = mix(0.040, 0.010, smoothstep(0.0, 0.6, l));
  col += (g - 0.5) * gw * grain * 2.2;

  // ── a faint horizontal tear when things are very wrong
  if (distort > 0.35) {
    float band = step(0.985, hash(vec2(floor(uv.y * 90.0), floor(time * 7.0))));
    col += band * distort * 0.09;
  }

  // The scene was rendered into a linear render target, so three's own
  // colour-space conversion never ran. Do it here, last.
  col = max(col, 0.0);
  vec3 srgb = mix(col * 12.92,
                  1.055 * pow(col, vec3(0.41666)) - 0.055,
                  step(vec3(0.0031308), col));
  gl_FragColor = vec4(srgb, 1.0);
}
`;

function fsQuad(material) {
  const g = new THREE.BufferGeometry();
  // one oversized triangle — no seam, one less vertex than a quad
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  return new THREE.Mesh(g, material);
}

export class PostFX {
  constructor(renderer, settings) {
    this.renderer = renderer;
    this.settings = settings;
    this.enabled = true;

    const rt = (w, h, half = true) => new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: half ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });

    this.sceneRT = rt(2, 2);
    this.brightRT = rt(2, 2);
    this.blurRT = rt(2, 2);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.matBright = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BRIGHT_FRAG,
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.62 }, softness: { value: 0.4 } },
      depthTest: false, depthWrite: false,
    });
    this.matBlur = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BLUR_FRAG,
      uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.matComp = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        time: { value: 0 },
        grain: { value: 1 },
        vignette: { value: 0.85 },
        bloomAmt: { value: 0.55 },
        aberration: { value: 0.0016 },
        brightness: { value: 1 },
        contrast: { value: 1.14 },
        saturation: { value: 0.86 },
        distort: { value: 0 },
        pulse: { value: 0 },
        desat: { value: 0 },
        tintShadow: { value: new THREE.Vector3(0.80, 0.90, 1.06) },
        tintHigh: { value: new THREE.Vector3(1.06, 1.00, 0.90) },
        resolution: { value: new THREE.Vector2(1, 1) },
      },
      depthTest: false, depthWrite: false,
    });

    this.quadBright = fsQuad(this.matBright);
    this.quadBlur = fsQuad(this.matBlur);
    this.quadComp = fsQuad(this.matComp);
    this.scene = new THREE.Scene();
    this._current = null;
  }

  setSize(w, h) {
    const s = Math.max(0.5, this.settings.quality);
    this.w = Math.max(2, Math.floor(w * s));
    this.h = Math.max(2, Math.floor(h * s));
    this.sceneRT.setSize(this.w, this.h);
    const bw = Math.max(2, this.w >> 2), bh = Math.max(2, this.h >> 2);
    this.brightRT.setSize(bw, bh);
    this.blurRT.setSize(bw, bh);
    this.matComp.uniforms.resolution.value.set(this.w, this.h);
  }

  _draw(quad, target) {
    if (this._current !== quad) {
      this.scene.clear();
      this.scene.add(quad);
      this._current = quad;
    }
    this.renderer.setRenderTarget(target || null);
    this.renderer.render(this.scene, this.camera);
  }

  render(scene, camera, dt, params) {
    const r = this.renderer;
    const u = this.matComp.uniforms;
    u.time.value += dt;
    u.grain.value = this.settings.grain;
    u.brightness.value = this.settings.brightness * (params.brightness ?? 1);
    u.distort.value = params.distort ?? 0;
    u.pulse.value = params.pulse ?? 0;
    u.desat.value = params.desat ?? 0;
    u.vignette.value = params.vignette ?? 0.85;
    u.bloomAmt.value = params.bloom ?? 0.55;
    u.aberration.value = (params.aberration ?? 0.0016);

    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }

    // 1) scene → sceneRT
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    // 2) bright pass
    this.matBright.uniforms.tDiffuse.value = this.sceneRT.texture;
    this._draw(this.quadBright, this.brightRT);

    // 3) separable blur
    const bw = this.brightRT.width, bh = this.brightRT.height;
    this.matBlur.uniforms.tDiffuse.value = this.brightRT.texture;
    this.matBlur.uniforms.dir.value.set(1 / bw, 0);
    this._draw(this.quadBlur, this.blurRT);
    this.matBlur.uniforms.tDiffuse.value = this.blurRT.texture;
    this.matBlur.uniforms.dir.value.set(0, 1 / bh);
    this._draw(this.quadBlur, this.brightRT);

    // 4) composite → screen
    u.tDiffuse.value = this.sceneRT.texture;
    u.tBloom.value = this.brightRT.texture;
    this._draw(this.quadComp, null);
  }

  dispose() {
    this.sceneRT.dispose(); this.brightRT.dispose(); this.blurRT.dispose();
    this.matBright.dispose(); this.matBlur.dispose(); this.matComp.dispose();
  }
}
