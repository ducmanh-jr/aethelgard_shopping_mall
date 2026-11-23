<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { X, Check, Upload, Sparkles, Loader2, Trash2 } from 'lucide-vue-next';
import { productService } from '@/services/product.service';
import { aiService } from '@/services/ai.service';
import type { Product, Category } from '@/types';
import { SAMPLE_PRODUCT_IMAGES } from '@/lib/constants';
import { formatVND } from '@/lib/utils';

const props = defineProps<{
  isOpen: boolean;
  initialProduct?: Product | null;
  categories: Category[];
}>();

const emit = defineEmits<{
  close: [];
  success: [product: Product, isEdit: boolean];
}>();

const currentStep = ref(1);
const loading = ref(false);
const isGeneratingAI = ref(false);
const aiNotice = ref('');
const uploadingMain = ref(false);
const uploadingGallery = ref(false);
const error = ref('');

const mainFileInputRef = ref<HTMLInputElement | null>(null);
const galleryFileInputRef = ref<HTMLInputElement | null>(null);

const formData = reactive({
  name: '',
  categoryId: 1,
  sku: '',
  collectionName: 'Thu/Đông 2026',
  countryOfOrigin: 'Ý',
  material: '100% da thật',
  careInstructions: 'Lau bằng khăn ẩm mềm, tránh ánh nắng trực tiếp.',
  basePrice: 2500000,
  originalPrice: 3000000,
  costPrice: 1500000,
  discountPercent: 15,
  stockQuantity: 50,
  imageUrl: '/img/products/gucci-sneaker.jpg',
  galleryUrls: [] as string[],
  description: '',
});

watch(
  () => [props.isOpen, props.initialProduct],
  () => {
    if (!props.isOpen) return;
    const p = props.initialProduct;
    if (p) {
      formData.name = p.name || '';
      formData.categoryId = p.categoryId || props.categories[0]?.id || 1;
      formData.sku = p.sku || '';
      formData.collectionName = p.collectionName || '';
      formData.countryOfOrigin = p.countryOfOrigin || 'Italy';
      formData.material = p.material || '';
      formData.careInstructions = p.careInstructions || '';
      formData.basePrice = p.basePrice || 0;
      formData.originalPrice = p.originalPrice || p.basePrice || 0;
      formData.costPrice = p.costPrice || Math.round((p.basePrice || 0) * 0.6);
      formData.discountPercent = p.discountPercent || 0;
      formData.stockQuantity = p.stockQuantity || 10;
      formData.imageUrl = p.imageUrl || '/img/products/gucci-sneaker.jpg';
      formData.galleryUrls = [...(p.galleryUrls || [])];
      formData.description = p.description || '';
    } else {
      formData.name = '';
      formData.categoryId = props.categories[0]?.id || 1;
      formData.sku = `AG-${Date.now().toString().slice(-5)}`;
      formData.collectionName = 'Thu/Đông 2026';
      formData.countryOfOrigin = 'Ý';
      formData.material = '';
      formData.careInstructions = '';
      formData.basePrice = 0;
      formData.originalPrice = 0;
      formData.costPrice = 0;
      formData.discountPercent = 0;
      formData.stockQuantity = 10;
      formData.imageUrl = '/img/products/sample-velora.jpg';
      formData.galleryUrls = [];
      formData.description = '';
    }
    currentStep.value = 1;
    error.value = '';
    aiNotice.value = '';
  },
  { immediate: true }
);

async function handleGenerateAI() {
  if (!formData.name.trim()) {
    aiNotice.value = 'Vui lòng nhập tên sản phẩm trước khi tạo gợi ý.';
    return;
  }
  isGeneratingAI.value = true;
  aiNotice.value = '';
  try {
    const selectedCategory = props.categories.find((c) => c.id === Number(formData.categoryId))?.name;
    const res = await aiService.generateProductDescription({
      productName: formData.name.trim(),
      categoryName: selectedCategory,
      brand: formData.collectionName,
      material: formData.material,
      careInstructions: formData.careInstructions,
    });
    if (res.description) formData.description = res.description;
    if (res.material && formData.material.length < 5) formData.material = res.material;
    if (res.careInstructions && formData.careInstructions.length < 5) formData.careInstructions = res.careInstructions;
    aiNotice.value = res.isFallback ? 'Đang dùng mẫu mô tả dự phòng.' : 'Đã nhận gợi ý mô tả sản phẩm từ Gemini AI.';
  } catch {
    aiNotice.value = 'Không thể nhận gợi ý mô tả. Vui lòng thử lại.';
  } finally {
    isGeneratingAI.value = false;
  }
}

async function handleMainFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploadingMain.value = true;
  error.value = '';
  try {
    const res = await productService.uploadImage(file);
    if (res?.url) formData.imageUrl = res.url;
  } catch {
    error.value = 'Không thể tải ảnh lên. Chọn JPG/PNG/WebP dưới 15MB.';
  } finally {
    uploadingMain.value = false;
    if (mainFileInputRef.value) mainFileInputRef.value.value = '';
  }
}

async function handleGalleryUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (formData.galleryUrls.length >= 6) {
    error.value = 'Tối đa 6 ảnh chi tiết.';
    return;
  }
  uploadingGallery.value = true;
  try {
    const res = await productService.uploadImage(file);
    if (res?.url) formData.galleryUrls.push(res.url);
  } catch {
    error.value = 'Không thể tải ảnh góc chụp.';
  } finally {
    uploadingGallery.value = false;
    if (galleryFileInputRef.value) galleryFileInputRef.value.value = '';
  }
}

async function handleSubmit() {
  if (!formData.name.trim()) {
    error.value = 'Vui lòng nhập tên sản phẩm.';
    currentStep.value = 1;
    return;
  }
  if (formData.basePrice < 0 || formData.stockQuantity < 0) {
    error.value = 'Giá bán và tồn kho không được âm.';
    currentStep.value = 2;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const payload = {
      name: formData.name.trim(),
      categoryId: Number(formData.categoryId),
      sku: formData.sku.trim() || `AG-${Date.now().toString().slice(-5)}`,
      collectionName: formData.collectionName.trim() || 'Aethelgard 2026',
      countryOfOrigin: formData.countryOfOrigin.trim() || 'Ý',
      material: formData.material.trim() || 'Chất liệu cao cấp',
      careInstructions: formData.careInstructions.trim() || 'Bảo quản nơi khô ráo.',
      basePrice: Number(formData.basePrice),
      originalPrice: Number(formData.originalPrice) || Number(formData.basePrice),
      costPrice: Number(formData.costPrice) || Math.round(Number(formData.basePrice) * 0.6),
      discountPercent: Number(formData.discountPercent) || 0,
      stockQuantity: Number(formData.stockQuantity),
      imageUrl: formData.imageUrl,
      galleryUrls: formData.galleryUrls,
      description: formData.description.trim() || `Sản phẩm ${formData.name.trim()}`,
      slug:
        formData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') +
        '-' +
        Date.now().toString().slice(-4),
    };
    const isEdit = !!props.initialProduct;
    const saved = isEdit
      ? await productService.updateProduct(props.initialProduct!.id, payload)
      : await productService.createProduct(payload);
    emit('success', saved, isEdit);
    emit('close');
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Không thể lưu sản phẩm.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto" @click.self="emit('close')">
    <div class="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
      <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold m-0">{{ initialProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Niêm Yết Sản Phẩm Mới' }}</h3>
          <p class="text-[11px] text-slate-400 m-0">Bước {{ currentStep }} / 4</p>
        </div>
        <button type="button" class="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 cursor-pointer" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <button
          v-for="step in [1, 2, 3, 4]"
          :key="step"
          type="button"
          :class="[
            'flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
            currentStep === step ? 'bg-slate-900 text-white' : currentStep > step ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-500 border border-slate-200',
          ]"
          @click="currentStep = step"
        >
          {{ step }}. {{ ['Thông tin', 'Giá & Kho', 'Ảnh & Mô tả', 'Xác nhận'][step - 1] }}
        </button>
      </div>

      <div class="p-6 max-h-[70vh] overflow-y-auto space-y-4">
        <p v-if="error" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{{ error }}</p>

        <div v-if="currentStep === 1" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 mb-1">Tên sản phẩm (*)</label>
            <input v-model="formData.name" class="form-control" placeholder="VD: Gucci - Giày Sneaker Rhyton Da Cao Cấp" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Danh mục</label>
            <select v-model="formData.categoryId" class="form-control">
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mã SKU</label>
            <input v-model="formData.sku" class="form-control" :disabled="!!initialProduct" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Bộ sưu tập</label>
            <input v-model="formData.collectionName" class="form-control" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Xuất xứ</label>
            <input v-model="formData.countryOfOrigin" class="form-control" />
          </div>
        </div>

        <div v-if="currentStep === 2" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Giá bán (VNĐ)</label>
            <input v-model.number="formData.basePrice" type="number" min="0" class="form-control" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Giá niêm yết gốc (VNĐ)</label>
            <input v-model.number="formData.originalPrice" type="number" min="0" class="form-control" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Giá vốn (VNĐ)</label>
            <input v-model.number="formData.costPrice" type="number" min="0" class="form-control" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Số lượng tồn kho</label>
            <input v-model.number="formData.stockQuantity" type="number" min="0" class="form-control" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Chất liệu</label>
            <input v-model="formData.material" class="form-control" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Hướng dẫn bảo quản</label>
            <input v-model="formData.careInstructions" class="form-control" />
          </div>
        </div>

        <div v-if="currentStep === 3" class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-bold text-slate-700">Mô tả sản phẩm</label>
              <button
                type="button"
                :disabled="isGeneratingAI"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                @click="handleGenerateAI"
              >
                <Loader2 v-if="isGeneratingAI" class="w-3.5 h-3.5 animate-spin" />
                <Sparkles v-else class="w-3.5 h-3.5" />
                <span>{{ isGeneratingAI ? 'Đang sinh...' : 'AI Viết Mô Tả' }}</span>
              </button>
            </div>
            <textarea v-model="formData.description" rows="4" class="form-control" placeholder="Mô tả chi tiết sản phẩm..." />
            <p v-if="aiNotice" class="text-xs text-purple-700 mt-1">{{ aiNotice }}</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ảnh chính (URL hoặc Tải lên)</label>
            <div class="flex gap-2">
              <input v-model="formData.imageUrl" class="form-control flex-1" />
              <input ref="mainFileInputRef" type="file" accept="image/*" class="hidden" @change="handleMainFileUpload" />
              <button
                type="button"
                class="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                @click="mainFileInputRef?.click()"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>{{ uploadingMain ? '...' : 'Upload' }}</span>
              </button>
            </div>
            <div class="flex gap-2 mt-2 overflow-x-auto pb-1">
              <button
                v-for="(imgUrl, idx) in SAMPLE_PRODUCT_IMAGES.slice(0, 6)"
                :key="imgUrl"
                type="button"
                :class="['w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer', formData.imageUrl === imgUrl ? 'border-slate-900' : 'border-slate-200']"
                @click="formData.imageUrl = imgUrl"
              >
                <img :src="imgUrl" :alt="`Mẫu ${idx + 1}`" class="w-full h-full object-cover" />
              </button>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold text-slate-700">Thư viện ảnh chi tiết ({{ formData.galleryUrls.length }}/6)</label>
              <input ref="galleryFileInputRef" type="file" accept="image/*" class="hidden" @change="handleGalleryUpload" />
              <button type="button" class="text-xs font-bold text-sky-600 hover:underline cursor-pointer" @click="galleryFileInputRef?.click()">
                + {{ uploadingGallery ? 'Đang tải...' : 'Thêm ảnh phụ' }}
              </button>
            </div>
            <div class="flex gap-2 flex-wrap">
              <div v-for="(url, idx) in formData.galleryUrls" :key="url + idx" class="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                <img :src="url" class="w-full h-full object-cover" />
                <button
                  type="button"
                  class="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                  @click="formData.galleryUrls.splice(idx, 1)"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 4" class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
          <div class="flex items-center gap-4">
            <img :src="formData.imageUrl" class="w-20 h-20 rounded-xl object-cover border border-slate-200" />
            <div>
              <h4 class="font-bold text-slate-900 m-0">{{ formData.name || 'Chưa nhập tên' }}</h4>
              <p class="text-xs text-slate-500 m-0">SKU: {{ formData.sku }} • Tồn kho: {{ formData.stockQuantity }}</p>
              <p class="text-sm font-extrabold text-sky-700 mt-1 m-0">{{ formatVND(formData.basePrice) }}</p>
            </div>
          </div>
          <p class="text-xs text-slate-600 m-0">{{ formData.description }}</p>
        </div>
      </div>

      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer"
          @click="currentStep > 1 ? (currentStep -= 1) : emit('close')"
        >
          {{ currentStep > 1 ? '← Quay lại' : 'Hủy' }}
        </button>
        <button
          v-if="currentStep < 4"
          type="button"
          class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
          @click="currentStep += 1"
        >
          Tiếp theo →
        </button>
        <button
          v-else
          type="button"
          :disabled="loading"
          class="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          @click="handleSubmit"
        >
          <Check class="w-4 h-4" />
          <span>{{ loading ? 'Đang lưu...' : initialProduct ? 'Cập Nhật Sản Phẩm' : 'Đăng Bán Ngay' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
