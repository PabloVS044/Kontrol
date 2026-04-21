<template>
  <div class="progress-tab-container">
    <div class="title-container">
      <div class="logo-indicator">
        <Clock />
      </div>
      <h3>Bitacora de avances</h3>
      <p>{{ progress.length }} entradas registradas</p>
      <button>Agregar</button>
    </div>

    <div class="progress-items">
      <ProgressCard v-for="(p, index) in progress" :key="index" :progress="p"/>
    </div>

  </div>
</template>

<script setup>
import "./ProgressTab.css";
import ProgressCard from "./ProgressCard.vue";
import { Clock } from "lucide-vue-next";
const progress = [
  {
    nombre: "Maria Garcia",
    foto: "placeholder.png",
    fecha: "10 abr 2026 * 08:30",
    descripcion: "Se completó la fase inicial de planificación",
    tipo: "completed",
  },
  {
    nombre: "Maria Garcia",
    foto: "placeholder.png",
    fecha: "10 abr 2026 * 08:30",
    descripcion: "Se completó la fase inicial de planificación",
    tipo: "completed",
  },
];
</script>
