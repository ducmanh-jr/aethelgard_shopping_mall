import apiClient from '../api/client';
import type { Category, Order, PagedResult, Product, ProductPayload } from '../types/models';

export const authService = {
  login: (payload: { email: string; password: string }) =>
    apiClient.post('/auth/login', payload).then((r) => r.data),
  register: (payload: { fullName: string; email: string; password: string; role: string }) =>
    apiClient.post('/auth/register', payload).then((r) => r.data)
};

export const productService = {
  getCategories: () =>
    apiClient.get<Category[]>('/products/categories').then((r) => r.data),
  getPaged: (params: Record<string, unknown>) =>
    apiClient.get<PagedResult<Product>>('/products', { params }).then((r) => r.data),
  create: (payload: ProductPayload) =>
    apiClient.post<Product>('/products', payload).then((r) => r.data),
  update: (id: number, payload: ProductPayload) =>
    apiClient.put<Product>(`/products/${id}`, payload).then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete(`/products/${id}`).then((r) => r.data)
};

export const orderService = {
  getAll: (params?: Record<string, string>) =>
    apiClient.get<Order[]>('/orders', { params }).then((r) => r.data),
  create: (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    paymentMethod: string;
    items: { productId: number; specs: string; quantity: number }[];
  }) => apiClient.post<Order>('/orders', payload).then((r) => r.data)
};

export const aiService = {
  recommend: (params: Record<string, unknown>) =>
    apiClient.get('/ai/recommend', { params }).then((r) => r.data),
  generateDescription: (payload: {
    productName: string;
    categoryName?: string;
    brand?: string;
    material?: string;
    keywords?: string;
  }) => apiClient.post('/ai/generate-description', payload).then((r) => r.data)
};
