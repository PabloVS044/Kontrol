<template>
    <button class="btn" :type="type" :disabled="disabled" @click="handleClick">
        {{ label }}
    </button>
</template>

<script>
export default {
    name: 'Button',
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
        }
    },
    methods: {
        handleClick() {
            this.$emit('click');
        }
    }
}
</script>

<style src="./button.css" scoped></style>