<template>
  <div class="bento-section" :style="{ '--glow-rgb': resolvedGlowColor }">
    <!-- Global Spotlight -->
    <div v-if="enableSpotlight && !shouldDisableAnimations" ref="spotlightRef" class="global-spotlight" />

    <!-- Card Grid -->
    <div ref="gridRef" class="card-grid">
      <component
        :is="'div'"
        v-for="(card, index) in cardData"
        :key="index"
        :ref="el => setCardRef(el, index)"
        :class="[
          'magic-bento-card',
          textAutoHide ? 'magic-bento-card--text-autohide' : '',
          enableBorderGlow ? 'magic-bento-card--border-glow' : '',
          enableStars ? 'particle-container' : ''
        ]"
        :style="{ backgroundColor: card.color, '--glow-color': glowColor, '--label-color': labelColor, '--title-color': titleColor, '--desc-color': descriptionColor, borderColor: cardBorder }"
        @mouseenter="e => onCardMouseEnter(e, index)"
        @mouseleave="e => onCardMouseLeave(e, index)"
        @mousemove="e => onCardMouseMove(e, index)"
        @click="e => onCardClick(e, index)"
      >
        <div class="magic-bento-card__header">
          <div class="magic-bento-card__label">{{ card.label }}</div>
        </div>
        <!-- Icon in the middle -->
        <div v-if="card.icon" class="magic-bento-card__icon">
          <component
            :is="card.icon"
            :size="card.iconSize || iconSize"
            :color="card.iconColor || iconColor || 'var(--glow-color)'"
          />
        </div>
        <div class="magic-bento-card__content">
          <h2 class="magic-bento-card__title">{{ card.title }}</h2>
          <p class="magic-bento-card__description">{{ card.description }}</p>
        </div>
      </component>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { gsap } from 'gsap';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_PARTICLE_COUNT   = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR       = '132, 0, 255';
const MOBILE_BREAKPOINT        = 768;

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  textAutoHide:       { type: Boolean, default: true },
  enableStars:        { type: Boolean, default: true },
  enableSpotlight:    { type: Boolean, default: true },
  enableBorderGlow:   { type: Boolean, default: true },
  disableAnimations:  { type: Boolean, default: false },
  spotlightRadius:    { type: Number,  default: DEFAULT_SPOTLIGHT_RADIUS },
  particleCount:      { type: Number,  default: DEFAULT_PARTICLE_COUNT },
  enableTilt:         { type: Boolean, default: false },
  glowColor:          { type: String,  default: DEFAULT_GLOW_COLOR },
  clickEffect:        { type: Boolean, default: true },
  enableMagnetism:    { type: Boolean, default: true },

  // ── Card colors ──────────────────────────────────────────────
  cardBackground:  { type: String, default: '#060010' },
  cardBorder:      { type: String, default: '#392e4e' },
  labelColor:      { type: String, default: '#ffffff' },
  titleColor:      { type: String, default: '#ffffff' },
  descriptionColor:{ type: String, default: '#ffffff' },

  // ── Icon defaults (can be overridden per card) ───────────────
  iconSize:  { type: Number, default: 40 },
  iconColor: { type: String, default: null }, // null = uses glow color

  // ── Custom cards (optional, overrides defaults) ───────────────
  // Array of { title, description, label, color?, icon?, iconSize?, iconColor? }
  cards: { type: Array, default: null },
});


// ─── Resolve any color format to "r, g, b" string for rgba() usage ────────────
function resolveToRGB(value) {
  if (!value) return '132, 0, 255';
  const trimmed = value.trim();

  // Already in "r, g, b" format
  if (/^\d+,\s*\d+,\s*\d+$/.test(trimmed)) return trimmed;

  // Resolve CSS variable
  let resolved = trimmed;
  if (trimmed.startsWith('var(')) {
    const varName = trimmed.slice(4, -1).trim();
    resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  // Use a temporary element to let the browser parse any valid color
  const tmp = document.createElement('div');
  tmp.style.color = resolved;
  document.body.appendChild(tmp);
  const computed = getComputedStyle(tmp).color; // always returns "rgb(r, g, b)"
  document.body.removeChild(tmp);

  // Extract r, g, b from "rgb(r, g, b)" or "rgba(r, g, b, a)"
  const match = computed.match(/\d+/g);
  if (match && match.length >= 3) return `${match[0]}, ${match[1]}, ${match[2]}`;

  return '132, 0, 255'; // fallback
}

// ─── Resolved glow color (accepts var(), hex, rgb, "r,g,b") ──────────────────
const resolvedGlowColor = ref('132, 0, 255');

// ─── Card data ────────────────────────────────────────────────────────────────
const defaultCards = [
  { title: 'Analytics',     description: 'Track user behavior',         label: 'Insights'     },
  { title: 'Dashboard',     description: 'Centralized data view',       label: 'Overview'     },
  { title: 'Collaboration', description: 'Work together seamlessly',    label: 'Teamwork'     },
  { title: 'Automation',    description: 'Streamline workflows',        label: 'Efficiency'   },
  { title: 'Integration',   description: 'Connect favorite tools',      label: 'Connectivity' },
  { title: 'Security',      description: 'Enterprise-grade protection', label: 'Protection'   },
];

const cardData = computed(() =>
  (props.cards || defaultCards).map(c => ({
    ...c,
    color: c.color || props.cardBackground
  }))
);

// ─── Refs ─────────────────────────────────────────────────────────────────────
const gridRef      = ref(null);
const spotlightRef = ref(null);
const cardRefs     = ref([]);
const isMobile     = ref(false);

const shouldDisableAnimations = computed(() => props.disableAnimations || isMobile.value);

function setCardRef(el, i) {
  if (el) cardRefs.value[i] = el;
}

// ─── Mobile detection ─────────────────────────────────────────────────────────
function checkMobile() {
  isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT;
}

// ─── Spotlight ────────────────────────────────────────────────────────────────
const calculateSpotlightValues = radius => ({
  proximity:    radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (card, mouseX, mouseY, glow, radius) => {
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--glow-x', `${((mouseX - rect.left) / rect.width) * 100}%`);
  card.style.setProperty('--glow-y', `${((mouseY - rect.top)  / rect.height) * 100}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

function handleGlobalMouseMove(e) {
  if (shouldDisableAnimations.value || !gridRef.value || !spotlightRef.value) return;

  const section  = gridRef.value.closest('.bento-section');
  const rect     = section?.getBoundingClientRect();
  const inside   = rect && e.clientX >= rect.left && e.clientX <= rect.right
                        && e.clientY >= rect.top  && e.clientY <= rect.bottom;

  const cards = gridRef.value.querySelectorAll('.magic-bento-card');

  if (!inside) {
    gsap.to(spotlightRef.value, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    cards.forEach(c => c.style.setProperty('--glow-intensity', '0'));
    return;
  }

  const { proximity, fadeDistance } = calculateSpotlightValues(props.spotlightRadius);
  let minDistance = Infinity;

  cards.forEach(card => {
    const cr       = card.getBoundingClientRect();
    const cx       = cr.left + cr.width / 2;
    const cy       = cr.top  + cr.height / 2;
    const dist     = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(cr.width, cr.height) / 2);
    minDistance    = Math.min(minDistance, dist);

    const intensity = dist <= proximity    ? 1
                    : dist <= fadeDistance ? (fadeDistance - dist) / (fadeDistance - proximity)
                    : 0;
    updateCardGlowProperties(card, e.clientX, e.clientY, intensity, props.spotlightRadius);
  });

  gsap.to(spotlightRef.value, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });

  const targetOpacity = minDistance <= proximity    ? 0.8
                      : minDistance <= fadeDistance ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
                      : 0;

  gsap.to(spotlightRef.value, {
    opacity:  targetOpacity,
    duration: targetOpacity > 0 ? 0.2 : 0.5,
    ease:     'power2.out'
  });
}

function handleGlobalMouseLeave() {
  if (!spotlightRef.value) return;
  gridRef.value?.querySelectorAll('.magic-bento-card').forEach(c => c.style.setProperty('--glow-intensity', '0'));
  gsap.to(spotlightRef.value, { opacity: 0, duration: 0.3, ease: 'power2.out' });
}

// ─── Particles ────────────────────────────────────────────────────────────────
const MAX_CARDS = 20; // supports up to 20 cards
const cardParticles  = ref(Array.from({ length: MAX_CARDS }, () => []));
const cardTimeouts   = ref(Array.from({ length: MAX_CARDS }, () => []));
const cardHovered    = ref(Array.from({ length: MAX_CARDS }, () => false));
const cardMagnetAnim = ref(Array.from({ length: MAX_CARDS }, () => null));

function createParticle(x, y) {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px; height: 4px;
    border-radius: 50%;
    background: rgba(${resolvedGlowColor.value}, 1);
    box-shadow: 0 0 6px rgba(${resolvedGlowColor.value}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px; top: ${y}px;
  `;
  return el;
}

function spawnParticles(index) {
  if (!props.enableStars || shouldDisableAnimations.value) return;
  const card = cardRefs.value[index];
  if (!card) return;

  const { width, height } = card.getBoundingClientRect();

  for (let i = 0; i < props.particleCount; i++) {
    const timeoutId = setTimeout(() => {
      if (!cardHovered.value[index] || !card) return;

      const p = createParticle(Math.random() * width, Math.random() * height);
      card.appendChild(p);
      cardParticles.value[index].push(p);

      gsap.fromTo(p, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
      gsap.to(p, { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: 'none', repeat: -1, yoyo: true });
      gsap.to(p, { opacity: 0.3, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
    }, i * 100);

    cardTimeouts.value[index].push(timeoutId);
  }
}

function clearParticles(index) {
  cardTimeouts.value[index].forEach(clearTimeout);
  cardTimeouts.value[index] = [];
  cardMagnetAnim.value[index]?.kill();

  cardParticles.value[index].forEach(p => {
    gsap.to(p, {
      scale: 0, opacity: 0, duration: 0.3, ease: 'back.in(1.7)',
      onComplete: () => p.parentNode?.removeChild(p)
    });
  });
  cardParticles.value[index] = [];
}

// ─── Card events ──────────────────────────────────────────────────────────────
function onCardMouseEnter(e, index) {
  if (shouldDisableAnimations.value) return;
  const card = cardRefs.value[index];
  if (!card) return;

  cardHovered.value[index] = true;
  spawnParticles(index);

  if (props.enableTilt) {
    gsap.to(card, { rotateX: 5, rotateY: 5, duration: 0.3, ease: 'power2.out', transformPerspective: 1000 });
  }
}

function onCardMouseLeave(e, index) {
  if (shouldDisableAnimations.value) return;
  const card = cardRefs.value[index];
  if (!card) return;

  cardHovered.value[index] = false;
  clearParticles(index);

  if (props.enableTilt) {
    gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.3, ease: 'power2.out' });
  }
  if (props.enableMagnetism) {
    gsap.to(card, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
  }
}

function onCardMouseMove(e, index) {
  if (shouldDisableAnimations.value || (!props.enableTilt && !props.enableMagnetism)) return;
  const card = cardRefs.value[index];
  if (!card) return;

  const rect    = card.getBoundingClientRect();
  const x       = e.clientX - rect.left;
  const y       = e.clientY - rect.top;
  const centerX = rect.width  / 2;
  const centerY = rect.height / 2;

  if (props.enableTilt) {
    gsap.to(card, {
      rotateX: ((y - centerY) / centerY) * -10,
      rotateY: ((x - centerX) / centerX) *  10,
      duration: 0.1, ease: 'power2.out', transformPerspective: 1000
    });
  }

  if (props.enableMagnetism) {
    cardMagnetAnim.value[index] = gsap.to(card, {
      x: (x - centerX) * 0.05,
      y: (y - centerY) * 0.05,
      duration: 0.3, ease: 'power2.out'
    });
  }
}

function onCardClick(e, index) {
  if (!props.clickEffect || shouldDisableAnimations.value) return;
  const card = cardRefs.value[index];
  if (!card) return;

  const rect        = card.getBoundingClientRect();
  const x           = e.clientX - rect.left;
  const y           = e.clientY - rect.top;
  const maxDistance = Math.max(
    Math.hypot(x, y),
    Math.hypot(x - rect.width, y),
    Math.hypot(x, y - rect.height),
    Math.hypot(x - rect.width, y - rect.height)
  );

  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: absolute;
    width: ${maxDistance * 2}px; height: ${maxDistance * 2}px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(${resolvedGlowColor.value}, 0.4) 0%, rgba(${resolvedGlowColor.value}, 0.2) 30%, transparent 70%);
    left: ${x - maxDistance}px; top: ${y - maxDistance}px;
    pointer-events: none; z-index: 1000;
  `;
  card.appendChild(ripple);

  gsap.fromTo(ripple,
    { scale: 0, opacity: 1 },
    { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ripple.remove() }
  );
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  // Resolve glowColor on mount and whenever it changes
  watchEffect(() => {
    resolvedGlowColor.value = resolveToRGB(props.glowColor);
  });

  checkMobile();
  window.addEventListener('resize', checkMobile);
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseleave', handleGlobalMouseLeave);

  // Init spotlight element styles
  if (spotlightRef.value) {
    Object.assign(spotlightRef.value.style, {
      position:      'fixed',
      width:         '800px',
      height:        '800px',
      borderRadius:  '50%',
      pointerEvents: 'none',
      background:    `radial-gradient(circle,
        rgba(${resolvedGlowColor.value}, 0.15) 0%,
        rgba(${resolvedGlowColor.value}, 0.08) 15%,
        rgba(${resolvedGlowColor.value}, 0.04) 25%,
        rgba(${resolvedGlowColor.value}, 0.02) 40%,
        rgba(${resolvedGlowColor.value}, 0.01) 65%,
        transparent 70%
      )`,
      zIndex:        '200',
      opacity:       '0',
      transform:     'translate(-50%, -50%)',
      mixBlendMode:  'screen',
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseleave', handleGlobalMouseLeave);
  cardData.value.forEach((_, i) => clearParticles(i));
});
</script>

<style scoped>
:root {
  --hue: 27;
  --sat: 69%;
  --white: hsl(0, 0%, 100%);

  --border-color: #392e4e;
  --background-dark: #060010;
}

.card-grid {
  display: grid;
  gap: 0.5em;
  padding: 0.75em;
  max-width: 54em;
  font-size: clamp(1rem, 0.9rem + 0.5vw, 1.5rem);
}

.magic-bento-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  aspect-ratio: 4/3;
  min-height: 200px;
  width: 100%;
  max-width: 100%;
  padding: 1.25em;
  border-radius: 20px;
  border: 1px solid;
  background: #060010;
  font-weight: 300;
  overflow: hidden;
  transition: all 0.3s ease;
  --glow-x: 50%;
  --glow-y: 50%;
  --glow-intensity: 0;
  --glow-radius: 200px;
  color: white;
}

.magic-bento-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.magic-bento-card__header,
.magic-bento-card__content {
  display: flex;
  position: relative;
  color: white;
}

.magic-bento-card__header   { gap: 0.75em; justify-content: space-between; }

.magic-bento-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  opacity: 0.85;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.magic-bento-card:hover .magic-bento-card__icon {
  opacity: 1;
  transform: scale(1.08);
}
.magic-bento-card__content  { flex-direction: column; }
.magic-bento-card__label    { font-size: 16px; color: var(--label-color, #ffffff); }

.magic-bento-card__title {
  font-weight: 400;
  font-size: 16px;
  margin: 0 0 0.25em;
  color: var(--title-color, #ffffff);
}

.magic-bento-card__description {
  font-size: 12px;
  line-height: 1.2;
  opacity: 0.9;
  color: var(--desc-color, #ffffff);
}

.magic-bento-card--text-autohide .magic-bento-card__title,
.magic-bento-card--text-autohide .magic-bento-card__description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.magic-bento-card--text-autohide .magic-bento-card__title       { -webkit-line-clamp: 1; }
.magic-bento-card--text-autohide .magic-bento-card__description { -webkit-line-clamp: 2; }

/* Border glow */
.magic-bento-card--border-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  padding: 6px;
  background: radial-gradient(
    var(--glow-radius) circle at var(--glow-x) var(--glow-y),
    rgba(var(--glow-rgb), calc(var(--glow-intensity) * 0.8)) 0%,
    rgba(var(--glow-rgb), calc(var(--glow-intensity) * 0.4)) 30%,
    transparent 60%
  );
  border-radius: inherit;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
}

.magic-bento-card--border-glow:hover {
  box-shadow: 0 4px 20px rgba(46, 24, 78, 0.4), 0 0 30px rgba(var(--glow-rgb), 0.2);
}

.particle-container { position: relative; overflow: hidden; }

.particle-container:hover {
  box-shadow: 0 4px 20px rgba(46, 24, 78, 0.2), 0 0 30px rgba(var(--glow-rgb), 0.2);
}

.bento-section   { position: relative; user-select: none; }
.global-spotlight {
  mix-blend-mode: screen;
  will-change: transform, opacity;
  pointer-events: none;
}

/* Responsive */
@media (max-width: 599px) {
  .card-grid {
    grid-template-columns: 1fr;
    width: 90%;
    margin: 0 auto;
    padding: 0.5em;
  }
  .magic-bento-card { min-height: 180px; }
}

@media (min-width: 600px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .card-grid { grid-template-columns: repeat(4, 1fr); }
  .magic-bento-card:nth-child(3) { grid-column: span 2;    grid-row: span 2; }
  .magic-bento-card:nth-child(4) { grid-column: 1 / span 2; grid-row: 2 / span 2; }
  .magic-bento-card:nth-child(6) { grid-column: 4;          grid-row: 3; }
}
</style>