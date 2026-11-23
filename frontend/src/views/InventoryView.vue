<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  RefreshCw,
  Package,
  Sparkles,
  Wand2,
  History,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-vue-next';
import { inventoryService } from '@/services/inventory.service';
import { aiService } from '@/services/ai.service';
import { productService } from '@/services/product.service';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/stores/toast';
import { formatVND, formatDate, exportToCsv } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';
import Modal from '@/components/ui/Modal.vue';

interface InvItem {
  id: number;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  variants: string;
  available_stock: number;
  reserved_stock: number;
  threshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  status_text: string;
  cost_price: number;
  retail_price: number;
  image_url: string;
  is_active: boolean;
}

interface StockAuditEntry {
  id: string;
  timestamp: string;
  productName: string;
  sku: string;
  change: number;
  newStock: number;
  type: 'RESTOCK' | 'ORDER_HOLD' | 'STATUS_CHANGE';
  note: string;
  actor: string;
}

const router = useRouter();
const { user, isAuthenticated } = useAuth(router);
const { showToast } = useToast();

const isAuthorized = computed(
  () => isAuthenticated.value && (user.value?.role === 'Seller' || user.value?.role === 'Admin')
);

const inventoryList = ref<InvItem[]>([]);
const loading = ref(true);
const activeTab = ref<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
const searchTerm = ref('');
const debouncedSearch = ref('');
const displayLimit = ref(25);
const isTabFading = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchTerm, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedSearch.value = val;
  }, 300);
});

function handleTabChange(tab: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK') {
  if (tab === activeTab.value) return;
  isTabFading.value = true;
  activeTab.value = tab;
  displayLimit.value = 25;
  setTimeout(() => {
    isTabFading.value = false;
  }, 150);
}

const restockTarget = ref<InvItem | null>(null);
const restockQty = ref(25);
const isSubmitting = ref(false);

// Batch / Bulk selection
const selectedIds = ref<Set<number>>(new Set());
const isBulkOperating = ref(false);

// Quản lý Nhật Ký Biến Động Kho
const AUDIT_STORAGE_KEY = STORAGE_KEYS.STOCK_AUDIT || 'AETHELGARD_STOCK_AUDIT_LOG';
const auditLogs = ref<StockAuditEntry[]>([]);
const isAuditModalOpen = ref(false);

function loadAuditLogs() {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) {
      auditLogs.value = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Lỗi đọc audit logs:', e);
  }
}

function saveAuditLog(entry: Omit<StockAuditEntry, 'id' | 'timestamp'>) {
  const newEntry: StockAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: formatDate(new Date(), 'datetime'),
    ...entry,
  };
  const next = [newEntry, ...auditLogs.value.slice(0, 49)];
  auditLogs.value = next;
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('Lỗi lưu audit logs:', e);
  }
}

// State cho Thêm Sản Phẩm Mới
const isAddModalOpen = ref(false);
const isGeneratingAI = ref(false);
let pendingDescription: AbortController | null = null;
const formName = ref('');
const formCategory = ref('Áo Khoác & Outerwear');
const formBrand = ref('Aethelgard Boutique');
const formKeyFeatures = ref('');
const formDescription = ref('');
const formMaterial = ref('');
const formCare = ref('');
const formSeoTitle = ref('');
const formRetailPrice = ref(3850000);
const formStock = ref(30);
const formImageUrl = ref('/img/products/gucci-runway.jpg');

watch(isAddModalOpen, () => {
  isGeneratingAI.value = false;
  pendingDescription?.abort();
  pendingDescription = null;
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
  pendingDescription?.abort();
  pendingDescription = null;
});

// Load kho hàng từ backend API
async function loadInventory() {
  loading.value = true;
  try {
    const summary = await inventoryService.getInventory();
    if (summary && summary.items) {
      inventoryList.value = summary.items.map((it: any) => ({
        id: it.id,
        name: it.name,
        category: it.categoryName || 'Thời Trang',
        sku: it.sku || `SKU-${it.id}`,
        barcode: `893850123${it.id.toString().padStart(4, '0')}`,
        variants: 'Tiêu chuẩn / Đa kích cỡ',
        available_stock: it.stockQuantity || 0,
        reserved_stock: it.reservedStock !== undefined ? it.reservedStock : 0,
        threshold: it.safetyThreshold || 10,
        status:
          (it.stockStatus as InvItem['status']) ||
          (it.stockQuantity > 10 ? 'IN_STOCK' : it.stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK'),
        status_text: it.stockQuantity > 10 ? 'Còn Hàng' : it.stockQuantity > 0 ? 'Sắp Hết' : 'Hết Hàng',
        cost_price: it.costPrice !== undefined && it.costPrice > 0 ? it.costPrice : Math.round((it.price || 0) * 0.6),
        retail_price: it.price || 2000000,
        image_url: it.imageUrl || '/img/products/adidas-samba.jpg',
        is_active: it.isActive !== false,
      }));
    }
  } catch {
    showToast('Không thể kết nối máy chủ tồn kho. Đang thử lại...');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAuditLogs();
  if (!isAuthorized.value) {
    router.replace('/');
    return;
  }
  loadInventory();
});

// Xử lý AI Gemini sinh mô tả sản phẩm
async function handleGenerateAIDescription() {
  if (!formName.value.trim()) {
    showToast('Vui lòng nhập tên sản phẩm trước khi yêu cầu AI sinh mô tả.');
    return;
  }

  pendingDescription?.abort();
  const controller = new AbortController();
  pendingDescription = controller;
  isGeneratingAI.value = true;
  const snapshotDesc = formDescription.value;
  const snapshotMat = formMaterial.value;
  const snapshotCare = formCare.value;
  const snapshotSeo = formSeoTitle.value;

  try {
    const res = await aiService.generateProductDescription(
      {
        productName: formName.value.trim(),
        categoryName: formCategory.value,
        brand: formBrand.value,
        keywords: formKeyFeatures.value.trim(),
        material: formMaterial.value,
        careInstructions: formCare.value,
      },
      controller.signal
    );

    if (pendingDescription !== controller || controller.signal.aborted) return;
    if (res) {
      if (res.description && formDescription.value === snapshotDesc) formDescription.value = res.description;
      if (res.material && formMaterial.value === snapshotMat) formMaterial.value = res.material;
      if (res.careInstructions && formCare.value === snapshotCare) formCare.value = res.careInstructions;
      if (res.seoTitle && formSeoTitle.value === snapshotSeo) formSeoTitle.value = res.seoTitle;
      showToast(res.isFallback ? 'Đang dùng mẫu mô tả dự phòng.' : 'Đã nhận gợi ý mô tả sản phẩm.');
    }
  } catch {
    if (!controller.signal.aborted) showToast('Không thể kết nối AI Gemini, vui lòng thử lại sau.');
  } finally {
    if (pendingDescription === controller) {
      pendingDescription = null;
      isGeneratingAI.value = false;
    }
  }
}

// Tạo sản phẩm mới
async function handleCreateProductSubmit() {
  if (!formName.value.trim()) {
    showToast('Vui lòng nhập tên sản phẩm.');
    return;
  }

  isSubmitting.value = true;
  try {
    const catMapping: Record<string, number> = {
      'Áo Khoác & Outerwear': 1,
      'Giày Sneaker Cao Cấp': 2,
      'Túi Xách Da Cao Cấp': 3,
      'Đầm Dạ Hội & Váy Sang Trọng': 4,
      'Phụ Kiện & Đồng Hồ': 5,
    };

    const payload = {
      name: formName.value.trim(),
      categoryId: catMapping[formCategory.value] || 1,
      sku: `AG-${Date.now().toString().slice(-5)}`,
      collectionName: formBrand.value || 'Aethelgard 2026',
      description: formDescription.value.trim() || `Sản phẩm thời trang cao cấp ${formName.value}.`,
      material: formMaterial.value.trim() || 'Vải cao cấp',
      careInstructions: formCare.value.trim() || 'Bảo quản nơi thoáng mát',
      basePrice: formRetailPrice.value,
      originalPrice: Math.round(formRetailPrice.value * 1.15),
      costPrice: Math.round(formRetailPrice.value * 0.6),
      stockQuantity: formStock.value,
      imageUrl: formImageUrl.value,
      slug:
        formName.value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') +
        '-' +
        Date.now().toString().slice(-4),
    };

    const created = await productService.createProduct(payload);
    if (created) {
      showToast(`🎉 Đã niêm yết thành công sản phẩm "${created.name}" lên sàn!`);
      isAddModalOpen.value = false;
      saveAuditLog({
        productName: created.name,
        sku: created.sku,
        change: formStock.value,
        newStock: formStock.value,
        type: 'RESTOCK',
        note: 'Tạo mới sản phẩm và nhập kho ban đầu',
        actor: 'Người bán (Seller)',
      });
      await loadInventory();
    }
  } catch (err: any) {
    showToast(err.response?.data?.message || err.message || 'Không thể tạo sản phẩm lúc này.');
  } finally {
    isSubmitting.value = false;
  }
}

// Toggle active/draft status per product
async function handleToggleStatus(item: InvItem) {
  try {
    const res = await productService.toggleProductStatus(item.id);
    inventoryList.value = inventoryList.value.map((i) =>
      i.id === item.id ? { ...i, is_active: res.isActive } : i
    );
    saveAuditLog({
      productName: item.name,
      sku: item.sku,
      change: 0,
      newStock: item.available_stock,
      type: 'STATUS_CHANGE',
      note: res.isActive ? 'Kích hoạt hiển thị lên sàn' : 'Chuyển sang bản nháp (ẩn)',
      actor: 'Người bán (Seller)',
    });
    showToast(res.message || 'Đã cập nhật trạng thái niêm yết.');
  } catch {
    showToast('Không thể thay đổi trạng thái sản phẩm lúc này.');
  }
}

// Lọc sản phẩm
const filteredItems = computed(() => {
  let list = inventoryList.value;
  if (activeTab.value === 'IN_STOCK') {
    list = list.filter((i) => i.status === 'IN_STOCK');
  } else if (activeTab.value === 'LOW_STOCK') {
    list = list.filter((i) => i.status === 'LOW_STOCK');
  } else if (activeTab.value === 'OUT_OF_STOCK') {
    list = list.filter((i) => i.status === 'OUT_OF_STOCK');
  }

  if (debouncedSearch.value.trim()) {
    const q = debouncedSearch.value.toLowerCase();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.barcode.toLowerCase().includes(q)
    );
  }
  return list;
});

const visibleItems = computed(() => filteredItems.value.slice(0, displayLimit.value));

// Bulk actions logic
const isAllSelected = computed(
  () => filteredItems.value.length > 0 && filteredItems.value.every((item) => selectedIds.value.has(item.id))
);

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(filteredItems.value.map((item) => item.id));
  }
}

function toggleSelectItem(id: number) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
}

// Bulk Restock +10
async function handleBulkRestock() {
  if (selectedIds.value.size === 0) return;
  isBulkOperating.value = true;
  try {
    const targetItems = inventoryList.value.filter((item) => selectedIds.value.has(item.id));
    await Promise.all(
      targetItems.map((item) => inventoryService.restock({ productId: item.id, additionalQuantity: 10 }))
    );

    inventoryList.value = inventoryList.value.map((item) => {
      if (selectedIds.value.has(item.id)) {
        const newQty = item.available_stock + 10;
        return {
          ...item,
          available_stock: newQty,
          status: newQty > item.threshold ? 'IN_STOCK' : 'LOW_STOCK',
          status_text: newQty > item.threshold ? 'Còn Hàng' : 'Sắp Hết',
        };
      }
      return item;
    });

    targetItems.forEach((item) => {
      saveAuditLog({
        productName: item.name,
        sku: item.sku,
        change: 10,
        newStock: item.available_stock + 10,
        type: 'RESTOCK',
        note: 'Thao tác nhập kho hàng loạt (+10 chiếc)',
        actor: 'Người bán (Seller)',
      });
    });

    showToast(`Đã nhập bổ sung +10 chiếc cho ${selectedIds.value.size} sản phẩm thành công!`);
    selectedIds.value = new Set();
  } catch {
    showToast('Đã xảy ra lỗi trong quá trình nhập hàng loạt.');
  } finally {
    isBulkOperating.value = false;
  }
}

// Bulk Toggle Status
async function handleBulkToggleStatus() {
  if (selectedIds.value.size === 0) return;
  isBulkOperating.value = true;
  try {
    const targetItems = inventoryList.value.filter((item) => selectedIds.value.has(item.id));
    await Promise.all(targetItems.map((item) => productService.toggleProductStatus(item.id)));
    await loadInventory();
    showToast(`Đã cập nhật trạng thái niêm yết cho ${selectedIds.value.size} sản phẩm!`);
    selectedIds.value = new Set();
  } catch {
    showToast('Không thể thay đổi trạng thái hàng loạt lúc này.');
  } finally {
    isBulkOperating.value = false;
  }
}

const totalStock = computed(() =>
  inventoryList.value.reduce((sum, item) => sum + item.available_stock, 0)
);
const lowStockCount = computed(
  () => inventoryList.value.filter((item) => item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK').length
);
const totalValue = computed(() =>
  inventoryList.value.reduce((sum, item) => sum + item.available_stock * item.cost_price, 0)
);

const inStockCount = computed(() => inventoryList.value.filter((i) => i.status === 'IN_STOCK').length);
const lowStockOnlyCount = computed(() => inventoryList.value.filter((i) => i.status === 'LOW_STOCK').length);
const outOfStockCount = computed(() => inventoryList.value.filter((i) => i.status === 'OUT_OF_STOCK').length);

// Xử lý gửi lệnh nhập hàng đơn chiếc
async function handleRestockSubmit() {
  if (!restockTarget.value) return;
  isSubmitting.value = true;
  try {
    await inventoryService.restock({
      productId: restockTarget.value.id,
      additionalQuantity: restockQty.value,
      note: `Nhập bổ sung kho sàn qua Kênh Người Bán +${restockQty.value}`,
    });

    const targetId = restockTarget.value.id;
    const targetName = restockTarget.value.name;
    const targetSku = restockTarget.value.sku;
    const prevStock = restockTarget.value.available_stock;

    inventoryList.value = inventoryList.value.map((item) => {
      if (item.id === targetId) {
        const newQty = item.available_stock + restockQty.value;
        return {
          ...item,
          available_stock: newQty,
          status: newQty > item.threshold ? 'IN_STOCK' : 'LOW_STOCK',
          status_text: newQty > item.threshold ? 'Còn Hàng' : 'Sắp Hết',
        };
      }
      return item;
    });

    saveAuditLog({
      productName: targetName,
      sku: targetSku,
      change: restockQty.value,
      newStock: prevStock + restockQty.value,
      type: 'RESTOCK',
      note: `Nhập kho bổ sung +${restockQty.value} chiếc`,
      actor: 'Người bán (Seller)',
    });

    showToast(`Đã nhập bổ sung +${restockQty.value} sản phẩm cho "${targetName}" vào CSDL!`);
    restockTarget.value = null;
  } catch (err: any) {
    showToast(err.response?.data?.message || err.message || 'Lỗi khi nhập hàng.');
  } finally {
    isSubmitting.value = false;
  }
}

// Xuất file CSV kho hàng dùng utility tập trung
function handleExportInventoryCSV() {
  if (inventoryList.value.length === 0) {
    showToast('Không có dữ liệu tồn kho để xuất.');
    return;
  }
  exportToCsv(
    filteredItems.value,
    [
      { key: 'sku', label: 'Mã SKU' },
      { key: 'name', label: 'Tên Mặt Hàng' },
      { key: 'category', label: 'Danh Mục' },
      { key: 'available_stock', label: 'Tồn Kho Khả Dụng' },
      { key: 'reserved_stock', label: 'Đang Chờ Giao' },
      { key: 'threshold', label: 'Định Mức An Toàn' },
      { key: 'status_text', label: 'Trạng Thái Kho' },
      { key: (item) => formatVND(item.cost_price), label: 'Giá Vốn COGS' },
      { key: (item) => formatVND(item.retail_price), label: 'Giá Niêm Yết' },
      { key: (item) => (item.is_active ? 'Đang Bán' : 'Tạm Ẩn'), label: 'Hiển Thị Sàn' },
    ],
    `Aethelgard_TonKho_${new Date().toISOString().slice(0, 10)}.csv`
  );
  showToast(`Đã xuất thành công ${filteredItems.value.length} sản phẩm ra file CSV Excel!`);
}

function handleImgError(e: Event) {
  (e.target as HTMLImageElement).src = '/img/products/adidas-samba.jpg';
}
</script>

<template>
  <div v-if="!isAuthorized" class="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
    <div class="flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-slate-400 font-medium">Đang xác thực quyền truy cập kho hàng...</p>
    </div>
  </div>

  <main v-else class="inventory-container pb-28">
    <!-- TIÊU ĐỀ TRANG -->
    <div class="inv-page-header">
      <div class="inv-header-titles">
        <h1>Quản Lý Tồn Kho & Hàng Hóa</h1>
        <p>Kiểm soát lượng tồn khả dụng, đồng bộ dữ liệu thời gian thực và ghi nhận biến động kho</p>
      </div>

      <div class="inv-header-actions">
        <button
          type="button"
          class="btn-clean-primary"
          :style="{
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            border: 'none',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            color: '#fff',
          }"
          @click="isAddModalOpen = true"
        >
          <Sparkles class="w-4 h-4 text-amber-300" />
          + Thêm Sản Phẩm (AI Copilot)
        </button>
        <button
          type="button"
          class="btn-clean-secondary flex items-center gap-2"
          @click="isAuditModalOpen = true"
        >
          <History class="w-4 h-4 text-sky-600" />
          <span>Nhật Ký Biến Động Kho</span>
        </button>
        <button
          type="button"
          class="btn-clean-secondary flex items-center gap-1.5"
          title="Xuất danh sách tồn kho ra file CSV/Excel"
          @click="handleExportInventoryCSV"
        >
          <FileSpreadsheet class="w-4 h-4 text-emerald-600" />
          <span class="hidden sm:inline">Xuất CSV</span>
        </button>
        <button
          type="button"
          class="btn-clean-secondary"
          @click="restockTarget = inventoryList[0] || null"
        >
          + Nhập Hàng Bổ Sung
        </button>
        <button
          type="button"
          class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm cursor-pointer"
          title="Tải lại tồn kho"
          @click="loadInventory"
        >
          <RefreshCw :class="['w-4 h-4', loading ? 'animate-spin text-sky-600' : '']" />
        </button>
      </div>
    </div>

    <!-- THẺ CHỈ SỐ KPI -->
    <div class="inv-kpi-grid">
      <div class="inv-kpi-card">
        <span class="label">Tổng Mã SKU</span>
        <span class="num">{{ inventoryList.length }}</span>
        <span class="sub" style="color: #64748B">
          Đang niêm yết trên sàn
        </span>
      </div>
      <div class="inv-kpi-card">
        <span class="label">Tổng Hàng Lưu Kho</span>
        <span class="num">{{ totalStock.toLocaleString('vi-VN') }}</span>
        <span class="sub" style="color: #64748B">
          Chiếc sản phẩm khả dụng
        </span>
      </div>
      <div class="inv-kpi-card warning-card">
        <span class="label">Cảnh Báo Tồn Thấp</span>
        <span class="num" style="color: #D97706">
          {{ lowStockCount }}
        </span>
        <span class="sub" style="color: #D97706">
          Cần lên đơn nhập hàng
        </span>
      </div>
      <div class="inv-kpi-card asset-card">
        <span class="label">Tổng Trị Giá Tồn Kho</span>
        <span class="num" style="color: #0284C7; font-size: 1.45rem">
          {{ formatVND(totalValue) }}
        </span>
        <span class="sub">Định giá theo giá vốn COGS thực tế</span>
      </div>
    </div>

    <!-- FILTER & TABS -->
    <div class="inv-filter-bar">
      <div class="inv-tabs">
        <button
          type="button"
          :class="['inv-tab-btn', activeTab === 'ALL' ? 'active' : '']"
          @click="handleTabChange('ALL')"
        >
          Tất Cả ({{ inventoryList.length }})
        </button>
        <button
          type="button"
          :class="['inv-tab-btn', activeTab === 'IN_STOCK' ? 'active' : '']"
          @click="handleTabChange('IN_STOCK')"
        >
          Còn Hàng ({{ inStockCount }})
        </button>
        <button
          type="button"
          :class="['inv-tab-btn', activeTab === 'LOW_STOCK' ? 'active' : '']"
          @click="handleTabChange('LOW_STOCK')"
        >
          Sắp Hết ({{ lowStockOnlyCount }})
        </button>
        <button
          type="button"
          :class="['inv-tab-btn', activeTab === 'OUT_OF_STOCK' ? 'active' : '']"
          @click="handleTabChange('OUT_OF_STOCK')"
        >
          Hết Hàng ({{ outOfStockCount }})
        </button>
      </div>

      <div class="inv-search-wrap">
        <input
          v-model="searchTerm"
          type="text"
          class="inv-search-input"
          placeholder="Tìm theo Tên, SKU hoặc Mã vạch..."
        />
      </div>
    </div>

    <!-- BẢNG TỒN KHO -->
    <div class="inv-table-wrapper inv-table-wrap">
      <table class="inv-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center">
              <input
                type="checkbox"
                :checked="isAllSelected"
                class="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                title="Chọn tất cả"
                @change="toggleSelectAll"
              />
            </th>
            <th>Sản Phẩm & Phân Loại</th>
            <th>Mã SKU / Mã vạch</th>
            <th>Tồn Khả Dụng</th>
            <th>Đang Chờ Giao</th>
            <th>Ngưỡng An Toàn</th>
            <th>Trạng Thái</th>
            <th>Giá Vốn (COGS)</th>
            <th>Giá Bán Lẻ</th>
            <th style="text-align: right">Thao Tác</th>
          </tr>
        </thead>
        <tbody :class="['transition-opacity duration-200', isTabFading ? 'opacity-40' : 'opacity-100']">
          <template v-if="loading">
            <tr v-for="idx in 6" :key="`skeleton-${idx}`" class="border-b border-slate-100">
              <td class="px-4 py-4">
                <div class="h-4 w-4 rounded bg-slate-200/80 animate-pulse" />
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl shrink-0 bg-slate-200/80 animate-pulse" />
                  <div class="space-y-1.5">
                    <div class="h-4 w-40 rounded-lg bg-slate-200/80 animate-pulse" />
                    <div class="h-3 w-24 rounded-lg bg-slate-200/80 animate-pulse" />
                  </div>
                </div>
              </td>
              <td class="px-4 py-4"><div class="h-4 w-24 rounded-lg bg-slate-200/80 animate-pulse" /></td>
              <td class="px-4 py-4"><div class="h-4 w-20 rounded-lg bg-slate-200/80 animate-pulse" /></td>
              <td class="px-4 py-4"><div class="h-4 w-12 rounded-lg bg-slate-200/80 animate-pulse" /></td>
              <td class="px-4 py-4"><div class="h-4 w-12 rounded-lg bg-slate-200/80 animate-pulse" /></td>
              <td class="px-4 py-4"><div class="h-6 w-20 rounded-full bg-slate-200/80 animate-pulse" /></td>
              <td class="px-4 py-4"><div class="h-4 w-20 rounded-lg bg-slate-200/80 animate-pulse" /></td>
              <td class="px-4 py-4"><div class="h-4 w-20 rounded-lg bg-slate-200/80 animate-pulse" /></td>
              <td class="px-4 py-4 text-right"><div class="h-8 w-24 rounded-xl ml-auto bg-slate-200/80 animate-pulse" /></td>
            </tr>
          </template>
          <tr v-else-if="filteredItems.length === 0">
            <td colspan="10" style="text-align: center; padding: 3rem; color: #64748B">
              Không tìm thấy mặt hàng nào phù hợp với bộ lọc hiện tại.
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="item in visibleItems"
              :key="item.id"
              :class="selectedIds.has(item.id) ? 'bg-sky-50/40' : ''"
            >
              <td style="text-align: center">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(item.id)"
                  class="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  @change="toggleSelectItem(item.id)"
                />
              </td>
              <td>
                <div class="inv-product-cell">
                  <img
                    :src="item.image_url"
                    :alt="item.name"
                    @error="handleImgError"
                  />
                  <div class="inv-p-meta">
                    <strong class="flex items-center gap-1.5">
                      <span>{{ item.name }}</span>
                      <span
                        v-if="!item.is_active"
                        class="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold"
                      >
                        Nháp (Ẩn)
                      </span>
                    </strong>
                    <span>{{ item.category }} • {{ item.variants }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-weight: 700; color: #0F172A">{{ item.sku }}</div>
                <div style="font-size: 0.75rem; color: #64748B">{{ item.barcode }}</div>
              </td>
              <td>
                <span class="stock-pill">{{ item.available_stock }}</span>
              </td>
              <td>
                <span :style="{ color: item.reserved_stock > 0 ? '#0284C7' : '#64748B', fontWeight: 700 }">
                  {{ item.reserved_stock }} sp
                </span>
              </td>
              <td>
                <span style="color: #D97706; font-weight: 700">{{ item.threshold }} sp</span>
              </td>
              <td>
                <span :class="['status-badge-clean', item.status]">{{ item.status_text }}</span>
              </td>
              <td>
                <span style="font-weight: 600; color: #475569">
                  {{ formatVND(item.cost_price) }}
                </span>
              </td>
              <td>
                <span style="font-weight: 700; color: #0F172A">
                  {{ formatVND(item.retail_price) }}
                </span>
              </td>
              <td style="text-align: right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    :title="item.is_active ? 'Chuyển sang Nháp (Ẩn)' : 'Kích hoạt hiển thị'"
                    @click="handleToggleStatus(item)"
                  >
                    <Eye v-if="item.is_active" class="w-3.5 h-3.5 text-emerald-600" />
                    <EyeOff v-else class="w-3.5 h-3.5 text-amber-600" />
                  </button>
                  <button
                    type="button"
                    class="btn-action-small"
                    @click="restockTarget = item"
                  >
                    Nhập Hàng
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="displayLimit < filteredItems.length" class="flex justify-center mt-6 mb-4">
      <button
        type="button"
        class="px-6 py-2.5 rounded-full bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
        @click="displayLimit += 25"
      >
        <span>Tải thêm 25 mặt hàng</span>
        <span class="text-[11px] text-slate-400 font-semibold">
          {{ `(Đang xem ${visibleItems.length} / ${filteredItems.length})` }}
        </span>
      </button>
    </div>

    <!-- FLOATING BOTTOM BATCH ACTION BAR (HÀNH ĐỘNG HÀNG LOẠT) -->
    <div
      v-if="selectedIds.size > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-fade-in max-w-xl w-[92%] sm:w-auto"
    >
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center">
          {{ selectedIds.size }}
        </span>
        <span class="text-xs font-semibold whitespace-nowrap">sản phẩm đã chọn</span>
      </div>

      <div class="h-4 w-px bg-slate-700 hidden sm:block" />

      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          :disabled="isBulkOperating"
          class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          @click="handleBulkRestock"
        >
          <Package class="w-3.5 h-3.5" />
          <span>+ Nhập Kho (+10)</span>
        </button>
        <button
          type="button"
          :disabled="isBulkOperating"
          class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          @click="handleBulkToggleStatus"
        >
          <Layers class="w-3.5 h-3.5 text-sky-400" />
          <span>Đổi Bật/Ẩn</span>
        </button>
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
          @click="selectedIds = new Set()"
        >
          Bỏ chọn
        </button>
      </div>
    </div>

    <!-- HỘP THOẠI NHẬP HÀNG ĐƠN CHIẾC -->
    <div v-if="restockTarget" class="inv-modal-backdrop active">
      <div class="inv-modal-card animate-fade-in">
        <div class="inv-modal-header">
          <h3>Nhập Hàng Bổ Sung</h3>
          <button
            type="button"
            class="inv-modal-close"
            :disabled="isSubmitting"
            @click="restockTarget = null"
          >
            &times;
          </button>
        </div>
        <div class="inv-modal-body">
          <p style="font-size: 0.88rem; color: #475569; margin-bottom: 1.25rem">
            Ghi nhận số lượng sản phẩm nhập kho thực tế từ nhà máy/xưởng cho mã SKU:
          </p>

          <div
            style="
              display: flex;
              gap: 12px;
              align-items: center;
              background: #F8FAFC;
              padding: 12px;
              border-radius: 12px;
              margin-bottom: 1.25rem;
              border: 1px solid #E2E8F0;
            "
          >
            <img
              :src="restockTarget.image_url"
              :alt="restockTarget.name"
              style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover"
            />
            <div>
              <div style="font-weight: 700; font-size: 0.88rem">{{ restockTarget.name }}</div>
              <div style="font-size: 0.75rem; color: #64748B">
                Mã SKU: {{ restockTarget.sku }} • Hiện tại trong kho: <strong>{{ restockTarget.available_stock }}</strong> sp
              </div>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem">
            <label
              style="
                display: block;
                font-size: 0.78rem;
                font-weight: 700;
                text-transform: uppercase;
                color: #475569;
                margin-bottom: 6px;
              "
            >
              Số Lượng Nhập Bổ Sung (Chiếc)
            </label>
            <input
              type="number"
              min="1"
              class="inv-search-input"
              style="width: 100%; font-size: 1rem; font-weight: 700; color: #0F172A"
              :value="restockQty"
              @input="restockQty = Math.max(1, Number(($event.target as HTMLInputElement).value))"
            />
          </div>

          <div
            style="
              background: #F0F9FF;
              padding: 12px;
              border-radius: 12px;
              font-size: 0.8rem;
              color: #0369A1;
              line-height: 1.5;
              border: 1px solid #BAE6FD;
            "
          >
            Số lượng tồn sau khi nhập: <strong>{{ restockTarget.available_stock + restockQty }}</strong> chiếc sản phẩm khả dụng trên sàn.
          </div>
        </div>
        <div class="inv-modal-footer">
          <button
            type="button"
            class="btn-clean-secondary"
            :disabled="isSubmitting"
            @click="restockTarget = null"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            class="btn-clean-primary"
            style="background: #0284C7"
            :disabled="isSubmitting"
            @click="handleRestockSubmit"
          >
            {{ isSubmitting ? 'Đang lưu vào CSDL...' : 'Xác Nhận Nhập Kho' }}
          </button>
        </div>
      </div>
    </div>

    <!-- DRAWER NHẬT KÝ BIẾN ĐỘNG KHO MƯỢT MÀ -->
    <Modal
      :is-open="isAuditModalOpen"
      size="lg"
      :show-close-button="false"
      @close="isAuditModalOpen = false"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
            <History class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 m-0">Nhật Ký Biến Động Kho Hàng</h3>
            <p class="text-xs text-slate-500 m-0">Lịch sử xuất nhập kho và thay đổi tồn kho thực tế</p>
          </div>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xl cursor-pointer"
          aria-label="Đóng"
          @click="isAuditModalOpen = false"
        >
          &times;
        </button>
      </div>

      <div class="py-2 space-y-3 max-h-[60vh] overflow-y-auto">
        <div v-if="auditLogs.length === 0" class="text-center py-12 text-slate-400 text-xs">
          Chưa có nhật ký biến động kho nào được ghi nhận gần đây.
        </div>
        <div
          v-for="log in auditLogs"
          v-else
          :key="log.id"
          class="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
        >
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 truncate">{{ log.productName }}</span>
              <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                {{ log.sku }}
              </span>
            </div>
            <div class="text-slate-500 text-[11px] flex items-center gap-2">
              <span>{{ log.note }}</span>
              <span>•</span>
              <span>{{ log.timestamp }}</span>
              <span>•</span>
              <span class="text-slate-700 font-medium">{{ log.actor }}</span>
            </div>
          </div>

          <div class="text-right shrink-0">
            <span
              v-if="log.change > 0"
              class="inline-flex items-center gap-0.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
            >
              <ArrowUpRight class="w-3.5 h-3.5" />
              +{{ log.change }} sp
            </span>
            <span
              v-else-if="log.change < 0"
              class="inline-flex items-center gap-0.5 text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
            >
              <ArrowDownRight class="w-3.5 h-3.5" />
              {{ log.change }} sp
            </span>
            <span
              v-else
              class="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg"
            >
              Cập nhật
            </span>
            <div class="text-[10px] text-slate-400 mt-1">
              Tồn sau đổi: <strong>{{ log.newStock }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 mt-3">
        <span>Hiển thị tối đa 50 sự kiện gần nhất</span>
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold cursor-pointer hover:bg-slate-800"
          @click="isAuditModalOpen = false"
        >
          Đóng
        </button>
      </div>
    </Modal>

    <!-- MODAL THÊM SẢN PHẨM MỚI VỚI AI COPILOT -->
    <div v-if="isAddModalOpen" class="inv-modal-backdrop active">
      <div class="inv-modal-card animate-fade-in" style="max-width: 680px; max-height: 90vh; overflow-y: auto">
        <div class="inv-modal-header" style="border-bottom: 1px solid #E2E8F0; padding-bottom: 14px">
          <div style="display: flex; align-items: center; gap: 10px">
            <div style="background: #E0F2FE; color: #0284C7; padding: 8px; border-radius: 10px">
              <Sparkles class="w-5 h-5" />
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; color: #0F172A">Thêm Sản Phẩm Mới & AI Copilot</h3>
              <p style="margin: 0; font-size: 0.8rem; color: #64748B">
                Tự động tạo mô tả bán hàng xa xỉ và thông số bảo quản với Google Gemini
              </p>
            </div>
          </div>
          <button
            type="button"
            class="inv-modal-close"
            :disabled="isSubmitting"
            @click="isAddModalOpen = false"
          >
            &times;
          </button>
        </div>

        <form class="inv-modal-body" style="display: flex; flex-direction: column; gap: 14px" @submit.prevent="handleCreateProductSubmit">
          <!-- Box hướng dẫn AI -->
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 12px; padding: 14px 16px">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
              <span style="font-size: 0.85rem; font-weight: 700; color: #0369A1">
                ✨ Trợ Lý Sáng Tạo Nội Dung Gemini AI
              </span>
              <button
                type="button"
                :disabled="isGeneratingAI"
                :style="{
                  background: isGeneratingAI ? '#93C5FD' : '#0284C7',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isGeneratingAI ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
                }"
                @click="handleGenerateAIDescription"
              >
                <Wand2 :class="['w-3.5 h-3.5', isGeneratingAI ? 'animate-spin' : '']" />
                {{ isGeneratingAI ? 'Gemini Đang Soạn...' : '✨ AI Sinh Mô Tả (Gemini)' }}
              </button>
            </div>
            <p style="margin: 0; font-size: 0.78rem; color: #0369A1">
              Điền tên và điểm nổi bật sơ lược, bấm <strong>"AI Sinh Mô Tả"</strong> để Gemini tự động điền tiêu đề chuẩn SEO, bài giới thiệu và hướng dẫn chất liệu.
            </p>
          </div>

          <!-- Tên sản phẩm -->
          <div>
            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
              Tên sản phẩm (*)
            </label>
            <input
              v-model="formName"
              type="text"
              placeholder="Ví dụ: Áo Khoác Dạ Tweed Cao Cấp Dáng Lửng"
              class="inv-search-input"
              style="width: 100%; font-size: 0.9rem"
              required
            />
            <div v-if="formSeoTitle" style="margin-top: 4px; font-size: 0.75rem; color: #0284C7">
              🏷️ <em>Gợi ý tiêu đề SEO: {{ formSeoTitle }}</em>
            </div>
          </div>

          <!-- Ngành hàng & Thương hiệu -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
                Ngành hàng
              </label>
              <select
                v-model="formCategory"
                class="inv-search-input"
                style="width: 100%; font-size: 0.88rem"
              >
                <option value="Áo Khoác & Outerwear">Áo Khoác & Outerwear</option>
                <option value="Giày Sneaker Cao Cấp">Giày Sneaker Cao Cấp</option>
                <option value="Túi Xách Da Cao Cấp">Túi Xách Da Cao Cấp</option>
                <option value="Đầm Dạ Hội & Váy Sang Trọng">Đầm Dạ Hội & Váy Sang Trọng</option>
                <option value="Phụ Kiện & Đồng Hồ">Phụ Kiện & Đồng Hồ</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
                Thương hiệu
              </label>
              <input
                v-model="formBrand"
                type="text"
                placeholder="Aethelgard, Gucci, Dior..."
                class="inv-search-input"
                style="width: 100%; font-size: 0.88rem"
              />
            </div>
          </div>

          <!-- Điểm nổi bật / từ khóa -->
          <div>
            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
              Gợi ý cho AI: Chất liệu hoặc Điểm nổi bật
            </label>
            <input
              v-model="formKeyFeatures"
              type="text"
              placeholder="Ví dụ: Vải tweed dệt kim sa Ý, khuy mạ vàng 18K, thanh lịch dạ tiệc..."
              class="inv-search-input"
              style="width: 100%; font-size: 0.88rem"
            />
          </div>

          <!-- Mô tả sản phẩm (Do AI sinh) -->
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px">
              <label style="font-size: 0.8rem; font-weight: 700; color: #334155">
                Mô tả chi tiết sản phẩm
              </label>
              <span v-if="formDescription" style="font-size: 0.75rem; color: #10B981; font-weight: 600">
                ✓ Đã được AI định dạng
              </span>
            </div>
            <textarea
              v-model="formDescription"
              rows="4"
              class="inv-search-input"
              style="width: 100%; font-size: 0.88rem; line-height: 1.5"
              placeholder="Mô tả sẽ tự động được Gemini soạn thảo khi bạn bấm nút 'AI Sinh Mô Tả'..."
            />
          </div>

          <!-- Chất liệu & Hướng dẫn bảo quản -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
                Chất liệu gợi ý
              </label>
              <input
                v-model="formMaterial"
                type="text"
                placeholder="VD: 100% Cashmere dệt tay"
                class="inv-search-input"
                style="width: 100%; font-size: 0.85rem"
              />
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
                Bảo quản gợi ý
              </label>
              <input
                v-model="formCare"
                type="text"
                placeholder="VD: Giặt khô, tránh ánh nắng gắt"
                class="inv-search-input"
                style="width: 100%; font-size: 0.85rem"
              />
            </div>
          </div>

          <!-- Giá & Tồn kho & Ảnh -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
                Giá bán lẻ (VNĐ)
              </label>
              <input
                v-model.number="formRetailPrice"
                type="number"
                min="1000"
                step="50000"
                class="inv-search-input"
                style="width: 100%; font-size: 0.9rem; font-weight: 700; color: #0F172A"
                required
              />
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
                Số lượng nhập ban đầu
              </label>
              <input
                v-model.number="formStock"
                type="number"
                min="1"
                class="inv-search-input"
                style="width: 100%; font-size: 0.9rem; font-weight: 700; color: #0F172A"
                required
              />
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 4px">
                Ảnh đại diện
              </label>
              <select
                v-model="formImageUrl"
                class="inv-search-input"
                style="width: 100%; font-size: 0.85rem"
              >
                <option value="/img/products/gucci-runway.jpg">Áo Khoác Runway</option>
                <option value="/img/products/gucci-sneaker.jpg">Giày Sneaker Ý</option>
                <option value="/img/products/sample-velora.jpg">Hoodie Streetwear</option>
                <option value="/img/products/balenciaga-track-beige.jpg">Track Sneaker</option>
                <option value="/img/products/adidas-samba.jpg">Adidas Samba Classic</option>
              </select>
            </div>
          </div>

          <div class="inv-modal-footer" style="margin-top: 10px; padding-top: 14px; border-top: 1px solid #E2E8F0">
            <button
              type="button"
              class="btn-clean-secondary"
              :disabled="isSubmitting"
              @click="isAddModalOpen = false"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              class="btn-clean-primary"
              style="background: #0284C7; border: none; font-weight: 700"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Đang Niêm Yết...' : '✓ Niêm Yết Lên Sàn' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>
