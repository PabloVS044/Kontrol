<template>
  <div class="card" :style="{ '--back': back, '--titleColor': titleColor, '--borderColor': borderColor, '--shadowColor': shadowColor }">
    <div class="card-top">
      <div class="card-header">
        <h3 class="card-title">{{ title }}</h3>
        <p class="card-subtitle">{{ subtitle }}</p>
      </div>
      <div class="card-icon" v-if="icon">
        <component
          :is="icon"
          v-if="isComponent"
          :size="iconSize"
          :color="iconColor"
        />
        <img
          v-else
          :src="icon"
          :alt="title"
          :style="{ width: iconSize + 'px', color: iconColor }"
        />
      </div>
    </div>
    <ul class="card-list" v-if="characteristics.length">
      <li v-for="characteristic in characteristics" :key="characteristic.title">
        <component
          :is="listIcon"
          v-if="isListComponent"
          :size="listIconSize"
          :color="listIconColor"
        />
        <img
          v-else-if="listIcon"
          :src="listIcon"
          :alt="characteristic.title"
          :style="{ width: listIconSize + 'px', color: listIconColor }"
        />
        <span>{{ characteristic.title }}</span>
      </li>
    </ul>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import "./Card.css"

const props = defineProps({
  title:           { type: String, default: "" },
  subtitle:        { type: String, default: "" },
  icon:            { default: null },
  iconSize:        { type: Number, default: 24 },
  iconColor:       { type: String, default: "var(--Primary)" },
  listIcon:        { default: null },
  listIconSize:    { type: Number, default: 24 },
  listIconColor:   { type: String, default: "var(--Primary)" },
  characteristics: { type: Array,  default: () => [] },
  back:            { type: String, default: "var(--Primary)" },
  titleColor:      { type: String, default: "var(--Text)" },
  borderColor:     { type: String, default: "transparent" },
  shadowColor:     { type: String, default: "rgba(0,0,0,0.25)" },
})

const isComponent = computed(() =>
  typeof props.icon === 'object' || typeof props.icon === 'function'
)

const isListComponent = computed(() =>
  typeof props.listIcon === 'object' || typeof props.listIcon === 'function'
)

</script>