<template>
  <main>
    <Navbar />
    <section id="header">
      <div class="header-container">
        <Pill
          label="The future of Business"
          btnColor="var(--PillBack)"
          circleColor="var(--Primary)"
          textColor="var(--Primary)"
        />
        <AnimatedText
          style="margin-top: 0"
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
        />
        <p>
          Manage projects, finances, marketing and communication from one
          centralized platform. Designed for the ambitious.
        </p>

        <div class="goto">
          <Anchor
            label="Start managing your business"
            backColor="var(--Primary)"
            hoverColor="var(--Tertiary)"
            :icon="arrowRightIcon"
          />
          <Anchor
            label="Start managing your business"
            backColor="var(--Tertiary)"
            hoverColor="var(--Secondary)"
            :icon="arrowRightIcon"
          />
        </div>
      </div>
    </section>

    <section id="problem"></section>

    <section id="solution"></section>
  </main>
</template>

<script setup>
import "./LandingPage.css";
import Navbar from "../components/Navbar.vue";
import AnimatedText from "../components/UI/TextEffects/AnimatedText.vue";
import Pill from "../components/UI/Pill/Pill.vue";
import Anchor from "../components/UI/Button/Anchor.vue";
import arrowRightIcon from "../assets/img/arrow-right.png";
</script>
