<template>
  <div class="nav-container">
    <nav class="landing-nav">
      <div class="icon">
        <img :src="logo" alt="Logo" />
        <h3>Kontrol</h3>
      </div>

      <ul class="navigation">
        <li><Anchor label="Home"         link="#header"   /></li>
        <li><Anchor label="Features"     link="#features" /></li>
        <li><Anchor label="How it works" link="#solution"    /></li>
        <li><Anchor label="Companies"        link="#companies"    /></li>
      </ul>

      <div class="actions">
        <Anchor label="Login"       link="/login"    />
        <Anchor label="Get Started" link="/register" backColor="var(--Secondary)" hoverColor="var(--Background)" />
      </div>

      <button class="hamburger" :class="{ open: isOpen }" @click="isOpen = !isOpen" aria-label="Menu">
        <span /><span /><span />
      </button>
    </nav>

    <div class="mobile-menu" :class="{ open: isOpen }">
      <ul class="mobile-nav">
        <li @click="isOpen = false"><Anchor label="Home"         link="#header"   /></li>
        <li @click="isOpen = false"><Anchor label="Features"     link="#features" /></li>
        <li @click="isOpen = false"><Anchor label="How it works" link="#steps"    /></li>
        <li @click="isOpen = false"><Anchor label="Pricing"      link="#pricing"  /></li>
        <li @click="isOpen = false"><Anchor label="About"        link="#about"    /></li>
        <li @click="isOpen = false"><Anchor label="Contact"      link="#contact"  /></li>
      </ul>
      <div class="mobile-actions">
        <Anchor label="Login"       link="/login"    />
        <Anchor label="Get Started" link="/register" backColor="var(--Secondary)" hoverColor="var(--Background)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import "./navbar.css";
import logo from "../assets/img/kontrol.png";
import Anchor from "../components/UI/Button/Anchor.vue";

const isOpen = ref(false);
</script>
