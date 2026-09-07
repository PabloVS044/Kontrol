<template>
  <div class="mkt-cal">
    <div class="mkt-cal-toolbar">
      <div class="mkt-cal-nav">
        <button
          type="button"
          class="mkt-cal-nav-btn"
          :aria-label="t('marketing.calendar.prevMonth')"
          @click="goPrev"
        >‹</button>
        <span class="mkt-cal-month">{{ monthLabel }}</span>
        <button
          type="button"
          class="mkt-cal-nav-btn"
          :aria-label="t('marketing.calendar.nextMonth')"
          @click="goNext"
        >›</button>
      </div>
      <button type="button" class="mkt-cal-today" @click="goToday">{{ t('marketing.calendar.today') }}</button>
    </div>

    <div class="mkt-cal-grid">
      <div v-for="label in weekdayLabels" :key="label" class="mkt-cal-weekday">{{ label }}</div>

      <div
        v-for="day in days"
        :key="day.key"
        :data-key="day.key"
        class="mkt-cal-day"
        :class="{ 'mkt-cal-day--outside': !day.inMonth, 'mkt-cal-day--today': day.isToday }"
      >
        <button
          v-if="canManage"
          type="button"
          class="mkt-cal-day-add"
          :aria-label="t('marketing.calendar.addOnDay', { date: day.label })"
          @click="$emit('create-on-day', day.key)"
        >{{ day.dayNumber }}</button>
        <span v-else class="mkt-cal-day-number">{{ day.dayNumber }}</span>

        <ul class="mkt-cal-events">
          <li
            v-for="publication in day.publications.slice(0, maxVisible)"
            :key="publication.id"
            class="mkt-cal-event"
            :style="{
              color: publicationStatusColors(publication.status).color,
              background: publicationStatusColors(publication.status).bg,
            }"
            @click.stop="$emit('select-publication', publication)"
          >{{ publication.title }}</li>
        </ul>

        <span v-if="day.publications.length > maxVisible" class="mkt-cal-more">
          +{{ day.publications.length - maxVisible }}
        </span>
      </div>
    </div>

    <p v-if="undatedCount" class="mkt-cal-undated">
      {{ t('marketing.calendar.undated', { count: undatedCount }) }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { publicationStatusColors } from '../../utils/publicationStatus.js'
import './MarketingCalendar.css'

const props = defineProps({
  publications: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
})
defineEmits(['create-on-day', 'select-publication'])

const { t, locale } = useI18n()
const maxVisible = 3

const today = new Date()
const current = ref(new Date(today.getFullYear(), today.getMonth(), 1))

const intlLocale = computed(() => (locale.value === 'es' ? 'es-GT' : 'en-US'))

const monthLabel = computed(() => {
  const label = current.value.toLocaleDateString(intlLocale.value, { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// La fecha que ubica a la publicación en la grilla: la de publicación si ya
// se publicó, si no la programada. Sin ninguna de las dos no tiene celda —
// se cuenta aparte en el aviso de "sin fecha" en vez de desaparecer en silencio.
function eventDate(publication) {
  const raw = publication.status === 'PUBLISHED' ? publication.publishedAt : publication.scheduledFor
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

const publicationsByDay = computed(() => {
  const map = new Map()
  for (const publication of props.publications) {
    const date = eventDate(publication)
    if (!date) continue
    const key = dayKey(date)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(publication)
  }
  return map
})

const undatedCount = computed(() =>
  props.publications.filter((publication) => !eventDate(publication)).length
)

const weekdayLabels = computed(() => {
  // Semana de referencia que arranca en lunes (2024-01-01 cae lunes), para no
  // depender de qué día es hoy.
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date.toLocaleDateString(intlLocale.value, { weekday: 'short' })
  })
})

const days = computed(() => {
  const first = current.value
  const dow = (first.getDay() + 6) % 7 // lunes=0 … domingo=6
  const start = new Date(first)
  start.setDate(first.getDate() - dow)

  const todayKey = dayKey(new Date())

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = dayKey(date)
    return {
      key,
      dayNumber: date.getDate(),
      label: date.toLocaleDateString(intlLocale.value, { day: 'numeric', month: 'long' }),
      inMonth: date.getMonth() === first.getMonth(),
      isToday: key === todayKey,
      publications: publicationsByDay.value.get(key) ?? [],
    }
  })
})

function goPrev() {
  current.value = new Date(current.value.getFullYear(), current.value.getMonth() - 1, 1)
}

function goNext() {
  current.value = new Date(current.value.getFullYear(), current.value.getMonth() + 1, 1)
}

function goToday() {
  const now = new Date()
  current.value = new Date(now.getFullYear(), now.getMonth(), 1)
}
</script>
