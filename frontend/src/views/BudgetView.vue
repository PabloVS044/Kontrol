<script setup>
import AppNavbar from '../components/AppNavbar.vue'
</script>

<template>
  <div class="budget-layout">
    <AppNavbar />
    <main class="content">
      <header class="header">
        <h1 class="title">Budget Management</h1>
        <nav class="breadcrumbs">
          <span class="gold">Dashboard</span> • <span class="gray">Project plans</span>
        </nav>
      </header>

      <div class="main-grid">
        <div class="left-panel">
          <!-- CARD: Resumen de presupuesto -->
          <section class="summary-card">
            <div class="summary-info">
              <h2 class="card-title">Budget Summary</h2>
              <div class="amount-group">
                <span class="label">Total Allocated</span>
                <h3 class="total-value">$8,293.00</h3>
              </div>
              <div class="amount-group">
                <span class="label gold">Remaining</span>
                <h3 class="remaining-value gold">$2,322.00</h3>
              </div>
            </div>
          </section>
        </div>
        <div class="right-panel"></div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.budget-layout { background-color: var(--Background); min-height: 100vh; color: #fff; }
.content { padding: 60px 80px; }
.title { font-family: 'Playfair Display', serif; font-size: 3rem; margin-bottom: 10px; }
.gold { color: var(--Primary); }
.gray { color: #666; }
.main-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; }
.summary-card { background: var(--Background2); border: 1px solid var(--Border); padding: 40px; }
.card-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; margin-bottom: 30px; }
.amount-group { margin-bottom: 20px; }
.label { font-size: 0.8rem; text-transform: uppercase; color: #666; display: block; }
.total-value { font-size: 2.5rem; font-weight: bold; }
.remaining-value { font-size: 2rem; font-weight: bold; }
</style>