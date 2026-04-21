<template>
  <div class="progress-tab-container">
    <div class="title-container">
      <div class="logo-indicator">
        <Clock />
      </div>
      <h3>Bitacora de avances</h3>
      <p>{{ progress.length }} entradas registradas</p>
      <Button label="Agregar" type="button" @click="showModal = true"/>
    </div>

    <div class="progress-items">
      <ProgressCard v-for="(p, index) in progress" :key="index" :progress="p"/>
    </div>

  </div>

  <ProgressModal
    v-model="showModal"
    @submit="handleAddEntry"
  />
</template>

<script setup>
import { ref } from "vue";
import "./ProgressTab.css";
import ProgressCard from "./ProgressCard.vue";
import ProgressModal from "./ProgressModal.vue";
import { Clock } from "lucide-vue-next";
import Button from "../UI/Button/Button.vue";

const showModal = ref(false);

const progress = ref([
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
]);

function handleAddEntry(entry) {
  const date = new Date(entry.fecha);
  const formatted = date.toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  }) + " * " + date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  progress.value.unshift({
    nombre: entry.nombre || "Anónimo",
    foto: "placeholder.png",
    fecha: formatted,
    descripcion: entry.descripcion,
    tipo: entry.tipo,
  });

  showModal.value = false;
}
</script>
