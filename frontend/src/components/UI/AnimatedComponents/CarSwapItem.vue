<template>
  <div ref="cardRef" :class="['card', customClass]">
    <slot />
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';

defineProps({
  customClass: { type: String, default: '' },
});

const cardRef      = ref(null);
const registerCard = inject('registerCard');

onMounted(() => {
  if (cardRef.value) registerCard(cardRef.value);
});
</script>

<style scoped>
.card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  border: 1px solid #ffffff22;
  background: #000;
  transform-style: preserve-3d;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-sizing: border-box;
  overflow: hidden;
}
</style>