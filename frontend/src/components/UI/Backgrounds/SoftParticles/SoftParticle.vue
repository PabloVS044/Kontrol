<template>
  <div class="soft-particles-background">
    <div class="base-gradient"></div>

    <div
      v-for="particle in particles"
      :key="particle.id"
      class="particle"
      :style="{
        width: particle.size + 'px',
        height: particle.size + 'px',
        top: particle.top + '%',
        left: particle.left + '%',
        background: particle.color,
        animationDuration: particle.duration + 's',
        animationDelay: particle.delay + 's',
        opacity: particle.opacity,
        filter: `blur(${particle.blur}px)`,
      }"
    />

    <div class="overlay-noise"></div>
  </div>
</template>

<script setup>
const particles = [
  {
    id: 1,
    size: 360,
    top: 2,
    left: -8,
    color: 'rgba(255, 140, 0, 0.18)',
    duration: 40,
    delay: 0,
    opacity: 0.95,
    blur: 90,
  },
  {
    id: 2,
    size: 320,
    top: 10,
    left: 68,
    color: 'rgba(255, 190, 80, 0.16)',
    duration: 48,
    delay: 2,
    opacity: 0.85,
    blur: 85,
  },
  {
    id: 3,
    size: 420,
    top: 45,
    left: -10,
    color: 'rgba(255, 120, 0, 0.15)',
    duration: 52,
    delay: 5,
    opacity: 0.8,
    blur: 100,
  },
  {
    id: 4,
    size: 300,
    top: 60,
    left: 75,
    color: 'rgba(255, 170, 50, 0.14)',
    duration: 45,
    delay: 3,
    opacity: 0.8,
    blur: 80,
  },
  {
    id: 5,
    size: 250,
    top: 28,
    left: 40,
    color: 'rgba(255, 150, 0, 0.12)',
    duration: 50,
    delay: 6,
    opacity: 0.7,
    blur: 70,
  },
  {
    id: 6,
    size: 230,
    top: 76,
    left: 48,
    color: 'rgba(255, 220, 140, 0.10)',
    duration: 58,
    delay: 4,
    opacity: 0.65,
    blur: 65,
  },
]
</script>

<style scoped>
.soft-particles-background {
  position: fixed;
  inset: 0;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  z-index: 0;
  background:
    radial-gradient(circle at top left, rgba(255, 140, 0, 0.08), transparent 35%),
    radial-gradient(circle at top right, rgba(255, 180, 0, 0.06), transparent 40%),
    linear-gradient(135deg, #030303 0%, #090909 40%, #101010 100%);
}

.base-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 140, 0, 0.05), transparent 30%),
    radial-gradient(circle at 80% 30%, rgba(255, 180, 100, 0.05), transparent 35%),
    radial-gradient(circle at 50% 80%, rgba(255, 120, 0, 0.04), transparent 30%);
}

.particle {
  position: absolute;
  border-radius: 999px;
  transform: translate3d(0, 0, 0);
  mix-blend-mode: screen;
  animation:
    floatParticle ease-in-out infinite alternate,
    pulseParticle ease-in-out infinite;
  will-change: transform, opacity;
  box-shadow:
    0 0 80px rgba(255, 140, 0, 0.25),
    0 0 140px rgba(255, 180, 70, 0.18);
}

.overlay-noise {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px);
  background-size: 4px 4px;
  opacity: 0.1;
  pointer-events: none;
}

@keyframes floatParticle {
  0% {
    transform: translate(0px, 0px) scale(1);
  }

  25% {
    transform: translate(35px, -18px) scale(1.05);
  }

  50% {
    transform: translate(-22px, 24px) scale(0.96);
  }

  75% {
    transform: translate(16px, -20px) scale(1.03);
  }

  100% {
    transform: translate(-30px, 16px) scale(1);
  }
}

@keyframes pulseParticle {
  0% {
    opacity: 0.25;
  }

  50% {
    opacity: 0.9;
  }

  100% {
    opacity: 0.35;
  }
}
</style>