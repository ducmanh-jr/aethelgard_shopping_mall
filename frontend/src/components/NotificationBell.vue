<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Bell, ShoppingBag, Truck, CheckCircle2, Check, Clock } from 'lucide-vue-next';
import { signalRService, type SignalRNotification } from '@/services/signalr.service';
import { useToast } from '@/stores/toast';
import { useAuth } from '@/stores/auth';

const getStorageKey = (userId?: number, email?: string) => {
  if (userId) return `aethelgard_notifications_uid_${userId}`;
  if (email) return `aethelgard_notifications_email_${email}`;
  return 'aethelgard_notifications_guest';
};

const { showToast } = useToast();
const { user } = useAuth();
const notifications = ref<SignalRNotification[]>([]);
const isOpen = ref(false);
const hasNewPulse = ref(false);
const dropdownRef = ref<HTMLDivElement | null>(null);

const isSeller = computed(() => user.value?.role === 'Seller');
const isAdmin = computed(() => user.value?.role === 'Admin');
const isManagement = computed(() => isSeller.value || isAdmin.value);

function loadSavedNotifications() {
  const key = getStorageKey(user.value?.id, user.value?.email);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      notifications.value = Array.isArray(parsed) ? parsed : [];
    } else {
      notifications.value = [];
    }
  } catch {
    notifications.value = [];
  }
}

watch(
  () => [user.value?.id, user.value?.email],
  () => {
    loadSavedNotifications();
  },
  { immediate: true }
);

watch(
  () => [user.value?.role, user.value?.id, user.value?.userId, user.value?.email],
  () => {
    signalRService.startConnection().then(() => {
      if (user.value?.role === 'Admin') {
        signalRService.joinAdminGroup();
      } else if (user.value?.role === 'Seller') {
        const sellerId = user.value?.id || user.value?.userId;
        if (sellerId) signalRService.joinSellerGroup(sellerId);
      }
      if (user.value?.email) {
        signalRService.joinCustomerGroup(user.value.email);
      }
    });
  },
  { immediate: true }
);

let unsubscribe: (() => void) | null = null;

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  try {
    localStorage.removeItem('aethelgard_signalr_notifications');
  } catch {}

  document.addEventListener('mousedown', handleClickOutside);

  unsubscribe = signalRService.subscribe((notif) => {
    if (notif.type === 'ORDER_CREATED' && !isManagement.value) {
      return;
    }

    const next = [notif, ...notifications.value.slice(0, 29)];
    notifications.value = next;
    try {
      const key = getStorageKey(user.value?.id, user.value?.email);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}

    hasNewPulse.value = true;
    setTimeout(() => {
      hasNewPulse.value = false;
    }, 2500);

    showToast(`🔔 ${notif.title}: ${notif.message}`);

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  });
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  if (unsubscribe) unsubscribe();
});

const visibleNotifications = computed(() =>
  notifications.value.filter((n) => (n.type === 'ORDER_CREATED' ? isManagement.value : true))
);

const unreadCount = computed(() => visibleNotifications.value.filter((n) => !n.read).length);

function markAllAsRead() {
  const updated = notifications.value.map((n) => ({ ...n, read: true }));
  notifications.value = updated;
  try {
    const key = getStorageKey(user.value?.id, user.value?.email);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

function clearAllNotifications() {
  notifications.value = [];
  try {
    const key = getStorageKey(user.value?.id, user.value?.email);
    localStorage.removeItem(key);
  } catch {}
}

function getTargetHref(notif: SignalRNotification) {
  if (isAdmin.value) return '/admin';
  if (isSeller.value) {
    return notif.orderCode ? `/orders?code=${encodeURIComponent(notif.orderCode)}` : '/orders';
  }
  if (notif.orderCode) {
    return `/shop/track-order?code=${encodeURIComponent(notif.orderCode)}`;
  }
  return '/shop/my-orders';
}

function formatTimeAgo(isoString: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  } catch {
    return 'Gần đây';
  }
}
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <button
      type="button"
      :class="[
        'relative p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer',
        hasNewPulse
          ? 'border-sky-500 bg-sky-50 scale-105 shadow-md shadow-sky-200'
          : isOpen
          ? 'border-sky-300 bg-sky-50'
          : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50',
      ]"
      title="Thông báo hệ thống theo thời gian thực"
      aria-label="Thông báo thời gian thực"
      @click="isOpen = !isOpen"
    >
      <Bell :class="['w-4 h-4 text-slate-700', hasNewPulse ? 'animate-bounce text-sky-600' : '']" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fade-in"
    >
      <div class="p-3.5 bg-gradient-to-r from-slate-900 to-sky-950 text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <strong class="text-xs tracking-wider uppercase font-semibold text-slate-100">
            SignalR Real-time
          </strong>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="unreadCount > 0"
            type="button"
            class="text-[11px] text-sky-200 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
            @click="markAllAsRead"
          >
            <Check class="w-3 h-3" /> Đã đọc
          </button>
          <button
            v-if="visibleNotifications.length > 0"
            type="button"
            class="text-[11px] text-rose-300 hover:text-rose-100 font-medium transition-colors cursor-pointer"
            title="Xóa toàn bộ thông báo cũ"
            @click="clearAllNotifications"
          >
            Xóa hết
          </button>
        </div>
      </div>

      <div class="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
        <div v-if="visibleNotifications.length === 0" class="py-10 text-center text-slate-400 text-sm">
          <Bell class="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Chưa có thông báo nào mới</p>
          <span class="text-[11px] text-slate-400">Kết nối SignalR đang sẵn sàng nhận dữ liệu</span>
        </div>

        <router-link
          v-for="notif in visibleNotifications"
          :key="notif.id"
          :to="getTargetHref(notif)"
          :class="[
            'block p-3.5 hover:bg-slate-50 transition-colors text-left',
            !notif.read ? 'bg-sky-50/50' : '',
          ]"
          style="text-decoration: none"
          @click="isOpen = false"
        >
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
              <ShoppingBag v-if="notif.type === 'ORDER_CREATED'" class="w-4 h-4 text-emerald-600" />
              <Truck v-else-if="notif.type === 'ORDER_STATUS'" class="w-4 h-4 text-sky-600" />
              <CheckCircle2 v-else-if="notif.type === 'PAYMENT_CONFIRMED'" class="w-4 h-4 text-sky-600" />
              <Bell v-else class="w-4 h-4 text-slate-600" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-1">
                <strong class="text-xs font-bold text-slate-900 truncate">{{ notif.title }}</strong>
                <span class="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                  <Clock class="w-2.5 h-2.5" /> {{ formatTimeAgo(notif.createdAt) }}
                </span>
              </div>
              <p class="text-[12px] text-slate-600 line-clamp-2 leading-relaxed m-0">{{ notif.message }}</p>
              <span
                v-if="notif.orderCode"
                class="inline-block mt-1 text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded"
              >
                {{ notif.orderCode }}
              </span>
            </div>
            <span v-if="!notif.read" class="w-2 h-2 rounded-full bg-sky-600 shrink-0 mt-2"></span>
          </div>
        </router-link>
      </div>

      <div class="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
        <span class="text-[11px] text-slate-500 font-medium">
          Đồng bộ tức thì mọi thay đổi đơn hàng & thanh toán
        </span>
      </div>
    </div>
  </div>
</template>
