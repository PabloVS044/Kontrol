<template>
  <div id="app">
    <nav>
      <RouterLink to="/">Inicio</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>
