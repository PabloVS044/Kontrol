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
        <slot>{{ label }}</slot>
    </button>
</template>

<script>
export default {
    name: 'Button',
    emits: ['click'],
    props: {
        label: {
            type: String,
            default: 'Button'
        },
        type: {
            type: String,
            default: 'button',
            validator: value => ['button', 'submit', 'reset'].includes(value)
        },
        disabled: {
            type: Boolean,
            default: false
        },
        backColor: {
            type: string,
            default: 'var(--Primary)'
        },
        hoverBack: {
            type: String,
            default: 'var(--Primary2)'
        }
    },
    methods: {
        handleClick(event) {
            this.$emit('click', eventt);
        }
    }
}
</script>

<style src="./button.css" scoped></style>