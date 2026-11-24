<script setup lang="ts">
import Navbar from '@/components/Navbar.vue';
import Footer from '@/components/Footer.vue';
import CustomerCommerceLayer from '@/components/customer/CustomerCommerceLayer.vue';
import ToastContainer from '@/components/ToastContainer.vue';
import ConfirmDialogHost from '@/components/ui/ConfirmDialogHost.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-900">
    <Navbar />
    <div class="flex-1">
      <router-view />
    </div>
    <Footer />
    <CustomerCommerceLayer />
    <ToastContainer />
    <ConfirmDialogHost />
  </div>
</template>
