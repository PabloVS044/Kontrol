<template>
  <div class="nav-container">
    <nav>
      <div class="icon">
        <img :src="logo" alt="Logo" />
        <h3>Kontrol</h3>
      </div>
      <ul class="navigation">
        <li><Anchor label="Home" link="#header" /></li>
        <li><Anchor label="Features" link="#features" /></li>
        <li><Anchor label="How it works?" link="#how" /></li>
        <li><Anchor label="Pricing" link="#pricing" /></li>
        <li><Anchor label="About" link="#about" /></li>
        <li><Anchor label="Contact" link="#contact" /></li>
      </ul>

      <div class="actions">
        <Anchor label="Login" link="/login" />
        <Anchor label="Get Started" link="/register"  backColor="var(--Secondary)" hoverColor="var(--Background)"/>
      </div>
    </nav>
  </div>
</template>

<script setup>
import "./navbar.css";
import logo from "../assets/img/kontrol.png";
import Anchor from "../components/UI/Button/Anchor.vue";
</script>
