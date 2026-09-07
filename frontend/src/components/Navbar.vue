<template>
  <div class="nav-container">
    <nav class="landing-nav">
      <div class="icon">
        <img :src="logo" alt="Kontrol logo" />
        <h3>Kontrol</h3>
      </div>

      <ul class="navigation">
        <li v-for="item in navLinks" :key="item.link">
          <Anchor :label="item.label" :link="item.link" />
        </li>
      </ul>

      <div class="actions">
        <Anchor label="Login"       link="/login"    />
        <Anchor label="Get Started" link="/register" backColor="var(--k-color-secondary)" hoverColor="var(--k-color-bg)" />
      </div>

      <button class="hamburger" :class="{ open: isOpen }" @click="isOpen = !isOpen" aria-label="Menu">
        <span /><span /><span />
      </button>
    </nav>

    <div class="mobile-menu" :class="{ open: isOpen }">
      <ul class="mobile-nav">
        <li v-for="item in navLinks" :key="item.link" @click="isOpen = false">
          <Anchor :label="item.label" :link="item.link" />
        </li>
      </ul>
      <div class="mobile-actions">
        <Anchor label="Login"       link="/login"    />
        <Anchor label="Get Started" link="/register" backColor="var(--k-color-secondary)" hoverColor="var(--k-color-bg)" />
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

const navLinks = [
  { label: "Home", link: "#header" },
  { label: "Features", link: "#features" },
  { label: "How it works", link: "#steps" },
  { label: "Companies", link: "#companies" },
];
</script>
