<template>
  <div class="nav-container">
    <nav>
      <div class="icon">
        <img :src="logo" alt="Logo">
        <h3>Kontrol</h3>
      </div>
      <ul>
        <li><a href="#header">Home</a></li>
        <li><a href="/features">Features</a></li>
        <li><a href="/how-it-works">How it works?</a></li>
        <li><a href="/pricing">Pricing</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>

      <div class="actions">
        <a to="/login">Login</a>
        <a href="">GetStarted</a>
      </div>
    </nav>
  </div>
</template>

<script>
import "./navbar.css";
import logo from "../assets/img/kontrol.png";

export default {
  name: "Navbar",
  data() {
    return {
      logo: logo
    };
  }

};
</script>
