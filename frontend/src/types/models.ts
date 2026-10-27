export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  categoryName: string;
  basePrice: number;
  stockQuantity: number;
  stockStatus: string;
  description: string;
}

export interface ProductPayload {
  name: string;
  sku: string;
  categoryId: number;
  basePrice: number;
  stockQuantity: number;
  description: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: number;
  productName: string;
  specs: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  orderCode: string;
  customerName: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  statusLabel: string;
  createdAt: string;
  items: OrderItem[];
}
