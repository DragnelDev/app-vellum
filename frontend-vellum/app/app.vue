<script setup lang="ts">
const { modal } = useAuth();
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator color="var(--v-accent)" :height="2" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly><AuthModal v-if="modal" /></ClientOnly>
    <ToastHost />
  </div>
</template>
