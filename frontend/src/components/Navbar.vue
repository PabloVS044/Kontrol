<template>
  <div class="nav-container">
    <nav class="landing-nav">
      <div class="icon">
        <img :src="logo" :alt="t('footer.logoAlt')" />
        <h3>Kontrol</h3>
      </div>

      <ul class="navigation">
        <li v-for="item in navLinks" :key="item.link">
          <Anchor :label="item.label" :link="item.link" />
        </li>
      </ul>

      <div class="actions">
        <!-- El selector también aquí: la landing es lo primero que se ve, y
             quien llega buscando la versión en español no debería tener que
             crear una cuenta para encontrar dónde se cambia. -->
        <LanguageSelector />
        <Anchor :label="t('landing.nav.login')" link="/login" />
        <Anchor :label="t('landing.nav.getStarted')" link="/register" backColor="var(--k-color-secondary)" hoverColor="var(--k-color-bg)" />
      </div>

      <button class="hamburger" :class="{ open: isOpen }" @click="isOpen = !isOpen" :aria-label="t('landing.nav.menu')">
        <span /><span /><span />
      </button>
    </nav>

    <div class="mobile-menu" :class="{ open: isOpen }">
      <ul class="mobile-nav">
        <li v-for="item in navLinks" :key="item.link" @click="isOpen = false">
          <Anchor :label="item.label" :link="item.link" />
        </li>
      </ul>
      <!-- En su propia fila: en `.mobile-actions` los enlaces reparten el
           ancho a partes iguales y el selector quedaba estrujado. -->
      <div class="mobile-lang">
        <LanguageSelector variant="inline" />
      </div>

      <div class="mobile-actions">
        <Anchor :label="t('landing.nav.login')" link="/login" />
        <Anchor :label="t('landing.nav.getStarted')" link="/register" backColor="var(--k-color-secondary)" hoverColor="var(--k-color-bg)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import "./navbar.css";
import logo from "../assets/img/kontrol.png";
import Anchor from "../components/UI/Button/Anchor.vue";
import LanguageSelector from "./common/LanguageSelector.vue";

const { t } = useI18n();
const isOpen = ref(false);

const navLinks = computed(() => [
  { label: t("landing.nav.home"), link: "#header" },
  { label: t("landing.nav.features"), link: "#features" },
  { label: t("landing.nav.steps"), link: "#steps" },
  { label: t("landing.nav.companies"), link: "#companies" },
]);
</script>
