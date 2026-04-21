<template>
  <button
    class="btn"
    :type="type"
    :disabled="disabled"
    @click="handleClick"
    :style="{
      '--background': backColor,
      '--hoverBack': hoverBack
    }"
  >
    {{ label }}
  </button>
</template>

<script>
export default {
  name: "Button",
  props: {
    label: {
      type: String,
      default: "Button",
    },
    type: {
      type: String,
      default: "button",
      validator: (value) => ["button", "submit", "reset"].includes(value),
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    backColor: {
        default: 'var(--Primary)'
    },
    hoverBack: {
        default: 'var(--secondary)'
    }
  },
  methods: {
    handleClick() {
      this.$emit("click");
    },
  },
};
</script>

<style src="./button.css" scoped></style>
