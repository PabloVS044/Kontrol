<template>
  <div :class="getColorClass(tipo, 'entry')">
    <div class="dot">
      <div class="dot-inner"></div>
    </div>

    <div class="progress-card">
      <div class="card-header">
        <div class="avatar" :style="getAvatarColor(nombre)">
          {{ getInitials(nombre) }}
        </div>

        <div>
          <h4>{{ nombre }}</h4>
          <p class="fecha">{{ fechaFormateada }}</p>
        </div>
      </div>

      <p class="descripcion">{{ entry.title }}</p>
      <p v-if="entry.details" class="descripcion" style="opacity: 0.7; font-size: 13px; margin-top: 6px;">{{ entry.details }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import './ProgressCard.css'

const props = defineProps({
  entry: {
    type: Object,
    required: true,
  },
})

const UPDATE_TYPE_MAP = {
  MILESTONE: 'completed',
  BLOCKER: 'error',
  UPDATE: 'warning',
}

const nombre = computed(() => {
  const { firstName, lastName, email } = props.entry.author ?? {}
  return [firstName, lastName].filter(Boolean).join(' ') || email || 'Desconocido'
})

const tipo = computed(() => UPDATE_TYPE_MAP[props.entry.updateType] ?? 'warning')

const fechaFormateada = computed(() => {
  const raw = props.entry.happenedAt
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
})

const getColorClass = (t, className) => {
  let cardClass = `${className} `
  if (t === 'completed') cardClass += 'success'
  else if (t === 'error') cardClass += 'error'
  else cardClass += 'warning'
  return cardClass
}

const getInitials = (n) =>
  n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

const getAvatarColor = (n) => {
  let hash = 0
  for (const char of n) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return {
    background: `hsl(${hue}, 60%, 15%)`,
    color: `hsl(${hue}, 80%, 65%)`,
  }
}
</script>
