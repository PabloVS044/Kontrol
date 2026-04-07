<template>
  <main>
    <Navbar />
    <section id="header">
      <AnimatedText
      style="margin-top: 125px"
        effects="split shiny"
        text="Take control of your bussiness"
        tag="h1"
        class="hero-title"
        color="var(--Primary)"
        shine-color="var(--Text)"
        :speed="5"
        :delay="2.4"
        :spread="135"
        direction="left"
        :yoyo="false"
        :pause-on-hover="false"
        :disabled="false"
        :split-delay="50"
        :duration="1.25"
        ease="power3.out"
        :from="{ opacity: 0, y: 40 }"
        :to="{ opacity: 1, y: 0 }"
        text-align="center"
      />
      <p style="color: white">
        Organiza tus tareas de manera eficiente y mantente productivo.
      </p>
    </section>

    <section id="problem"></section>

    <section id="solution"></section>
  </main>
</template>

<script>
import Navbar from "../components/Navbar.vue";
import AnimatedText from "../components/UI/TextEffects/AnimatedText.vue";
export default {
  components: {
    Navbar,
    AnimatedText,
  },
};
</script>
