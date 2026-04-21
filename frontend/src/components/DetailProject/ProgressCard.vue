<template>
  <div :class="getColorClass(progress.tipo, 'entry')">
    <div class="dot">
      <div class="dot-inner"></div>
    </div>

    <div class="progress-card">
      <div class="card-header">
        <div class="avatar" :style="getAvatarColor(progress.nombre)">
          {{ getInitials(progress.nombre) }}
        </div>

        <div>
          <h4>{{ progress.nombre }}</h4>
          <p class="fecha">{{ progress.fecha }}</p>
        </div>
      </div>

      <p class="descripcion">{{ progress.descripcion }}</p>
    </div>
  </div>
</template>

<script setup>
import "./ProgressCard.css";

const props = defineProps({
  progress: Object,
});

const getColorClass = (tipo, className) => {
  let cardClass = `${className} `;
  if (tipo === "completed") cardClass += "success";
  if (tipo === "error") cardClass += "error";
  if (tipo === "warning") cardClass += "warning";
  return cardClass;
};

const getInitials = (nombre) => {
  return nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getAvatarColor = (nombre) => {
  let hash = 0;
  for (let char of nombre) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsl(${hue}, 60%, 15%)`,
    color: `hsl(${hue}, 80%, 65%)`,
  };
};
</script>
