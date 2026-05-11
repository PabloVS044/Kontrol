<template>
  <div class="admin-wrapper">
    <AdminNavbar />
    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
</script>

<style scoped>
.admin-wrapper {
  min-height: 100vh;
}

.admin-content {
  padding: 80px 40px 40px;
}

@media (max-width: 640px) {
  .admin-content { padding: 72px 16px 24px; }
}
</style>
