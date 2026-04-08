<template>
  <div
    ref="mountRef"
    class="magic-rings-container"
    :style="{ background, ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}) }"
    @mousemove="onMouseMove"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @click="onClick"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  color:          { type: String,  default: '#fc42ff' },
  colorTwo:       { type: String,  default: '#42fcff' },
  speed:          { type: Number,  default: 1 },
  ringCount:      { type: Number,  default: 6 },
  attenuation:    { type: Number,  default: 10 },
  lineThickness:  { type: Number,  default: 2 },
  baseRadius:     { type: Number,  default: 0.35 },
  radiusStep:     { type: Number,  default: 0.1 },
  scaleRate:      { type: Number,  default: 0.1 },
  opacity:        { type: Number,  default: 1 },
  blur:           { type: Number,  default: 0 },
  noiseAmount:    { type: Number,  default: 0.1 },
  rotation:       { type: Number,  default: 0 },
  ringGap:        { type: Number,  default: 1.5 },
  fadeIn:         { type: Number,  default: 0.7 },
  fadeOut:        { type: Number,  default: 0.5 },
  followMouse:    { type: Boolean, default: false },
  mouseInfluence: { type: Number,  default: 0.2 },
  hoverScale:     { type: Number,  default: 1.2 },
  parallax:       { type: Number,  default: 0.05 },
  clickBurst:     { type: Boolean, default: false },
  background:     { type: String,  default: 'transparent' },
});

// ─── Refs ─────────────────────────────────────────────────────────────────────
const mountRef      = ref(null);
const mouse         = { x: 0, y: 0 };
const smoothMouse   = { x: 0, y: 0 };
const isHovered     = ref(false);
const hoverAmount   = ref(0);
const burst         = ref(0);

// ─── Shaders ──────────────────────────────────────────────────────────────────
const vertexShader = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime, uAttenuation, uLineThickness;
uniform float uBaseRadius, uRadiusStep, uScaleRate;
uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
uniform float uFadeIn, uFadeOut;
uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
uniform vec2 uResolution, uMouse;
uniform vec3 uColor, uColorTwo;
uniform int uRingCount;

const float HP = 1.5707963;
const float CYCLE = 3.45;

float fade(float t) {
  return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);
}

float ring(vec2 p, float ri, float cut, float t0, float px) {
  float t = mod(uTime + t0, CYCLE);
  float r = ri + t / CYCLE * uScaleRate;
  float d = abs(length(p) - r);
  float a = atan(abs(p.y), abs(p.x)) / HP;
  float th = max(1.0 - a, 0.5) * px * uLineThickness;
  float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;
  d += pow(cut * a, 3.0) * r;
  return h * exp(-uAttenuation * d) * fade(t);
}

void main() {
  float px = 1.0 / min(uResolution.x, uResolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;
  float cr = cos(uRotation), sr = sin(uRotation);
  p = mat2(cr, -sr, sr, cr) * p;
  p -= uMouse * uMouseInfluence;
  float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
  p /= sc;
  vec3 c = vec3(0.0);
  float rcf = max(float(uRingCount) - 1.0, 1.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);
    vec2 pr = p - fi * uParallax * uMouse;
    vec3 rc = mix(uColor, uColorTwo, fi / rcf);
    c = mix(c, rc, vec3(ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px)));
  }
  c *= 1.0 + uBurst * 2.0;
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uNoiseAmount;
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)) * uOpacity);
}
`;


// ─── Resolve CSS variables to actual color values ─────────────────────────────
function resolveColor(value) {
  if (!value) return '#ffffff';
  const trimmed = value.trim();
  if (trimmed.startsWith('var(')) {
    const varName = trimmed.slice(4, -1).trim();
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#ffffff';
  }
  return trimmed;
}

// ─── Three.js setup ───────────────────────────────────────────────────────────
let renderer, uniforms, frameId, ro;

onMounted(() => {
  const mount = mountRef.value;
  if (!mount) return;

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true });
  } catch {
    return;
  }

  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    return;
  }

  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.z = 1;

  uniforms = {
    uTime:           { value: 0 },
    uAttenuation:    { value: 0 },
    uResolution:     { value: new THREE.Vector2() },
    uColor:          { value: new THREE.Color() },
    uColorTwo:       { value: new THREE.Color() },
    uLineThickness:  { value: 0 },
    uBaseRadius:     { value: 0 },
    uRadiusStep:     { value: 0 },
    uScaleRate:      { value: 0 },
    uRingCount:      { value: 0 },
    uOpacity:        { value: 1 },
    uNoiseAmount:    { value: 0 },
    uRotation:       { value: 0 },
    uRingGap:        { value: 1.6 },
    uFadeIn:         { value: 0.5 },
    uFadeOut:        { value: 0.75 },
    uMouse:          { value: new THREE.Vector2() },
    uMouseInfluence: { value: 0 },
    uHoverAmount:    { value: 0 },
    uHoverScale:     { value: 1 },
    uParallax:       { value: 0 },
    uBurst:          { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  scene.add(quad);

  const resize = () => {
    const w   = mount.clientWidth;
    const h   = mount.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr);
    uniforms.uResolution.value.set(w * dpr, h * dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  ro = new ResizeObserver(resize);
  ro.observe(mount);

  const animate = (t) => {
    frameId = requestAnimationFrame(animate);

    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
    hoverAmount.value += ((isHovered.value ? 1 : 0) - hoverAmount.value) * 0.08;
    burst.value *= 0.95;
    if (burst.value < 0.001) burst.value = 0;

    uniforms.uTime.value          = t * 0.001 * props.speed;
    uniforms.uAttenuation.value   = props.attenuation;
    uniforms.uColor.value.set(resolveColor(props.color));
    uniforms.uColorTwo.value.set(resolveColor(props.colorTwo));
    uniforms.uLineThickness.value = props.lineThickness;
    uniforms.uBaseRadius.value    = props.baseRadius;
    uniforms.uRadiusStep.value    = props.radiusStep;
    uniforms.uScaleRate.value     = props.scaleRate;
    uniforms.uRingCount.value     = props.ringCount;
    uniforms.uOpacity.value       = props.opacity;
    uniforms.uNoiseAmount.value   = props.noiseAmount;
    uniforms.uRotation.value      = (props.rotation * Math.PI) / 180;
    uniforms.uRingGap.value       = props.ringGap;
    uniforms.uFadeIn.value        = props.fadeIn;
    uniforms.uFadeOut.value       = props.fadeOut;
    uniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y);
    uniforms.uMouseInfluence.value = props.followMouse ? props.mouseInfluence : 0;
    uniforms.uHoverAmount.value   = hoverAmount.value;
    uniforms.uHoverScale.value    = props.hoverScale;
    uniforms.uParallax.value      = props.parallax;
    uniforms.uBurst.value         = props.clickBurst ? burst.value : 0;

    renderer.render(scene, camera);
  };
  frameId = requestAnimationFrame(animate);
});

onUnmounted(() => {
  cancelAnimationFrame(frameId);
  window.removeEventListener('resize', () => {});
  ro?.disconnect();
  const mount = mountRef.value;
  if (mount && renderer?.domElement) {
    try { mount.removeChild(renderer.domElement); } catch { /* noop */ }
  }
  renderer?.dispose();
});

// ─── Eventos del mouse ────────────────────────────────────────────────────────
function onMouseMove(e) {
  const rect = mountRef.value.getBoundingClientRect();
  mouse.x =  (e.clientX - rect.left)  / rect.width  - 0.5;
  mouse.y = -((e.clientY - rect.top)  / rect.height - 0.5);
}

function onMouseEnter() {
  isHovered.value = true;
}

function onMouseLeave() {
  isHovered.value = false;
  mouse.x = 0;
  mouse.y = 0;
}

function onClick() {
  burst.value = 1;
}
</script>

<style scoped>
.magic-rings-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: block;
}
</style>