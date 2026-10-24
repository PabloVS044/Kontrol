export const sceneProps = {
  src: { type: String, default: '/kontrol-logo.glb' },
  intensity: { type: Number, default: 0.45 },     // max rad rotation from mouse
  damping: { type: Number, default: 0.08 },        // 0..1, lerp factor per frame
  idleSpinSpeed: { type: Number, default: 0.08 }, // rad/s while no input
  scale: { type: Number, default: 1.0 },
  baseRotationY: { type: Number, default: Math.PI }, // flip 180° by default
  baseRotationX: { type: Number, default: 0 },
  // Extra rotation/scale driven from outside (e.g. a GSAP ScrollTrigger scrub
  // tweening a reactive object) — added on top of the mouse-follow/idle
  // motion in KontrolLogo3DScene.vue rather than replacing it.
  scrollRotationY: { type: Number, default: 0 },
  scrollScale: { type: Number, default: 1 },
}
