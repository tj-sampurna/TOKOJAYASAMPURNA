/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  condition: 'Baru' | 'Seperti Baru' | 'Bekas Bagus' | 'Bekas Layak';
  location: string;
  images: string[];
  date: string;
  sellerName: string;
  sellerPhone: string;
  isVerified: boolean;
  isFeatured: boolean;
  views: number;
  saves: number;
  isSold: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface MeetingPoint {
  placeName: string;
  dateTime: string;
  notes: string;
}

export interface Order {
  id: string;
  product: Product;
  deliveryType: 'cod' | 'delivery';
  shippingAddress?: ShippingAddress;
  courier?: string;
  shippingCost?: number;
  paymentMethod?: string;
  meetingPoint?: MeetingPoint;
  totalPrice: number;
  orderDate: string;
  status: 'pending' | 'success' | 'shipped' | 'cod_confirmed';
  resi?: string;
}

export interface ChatMessage {
  id: string;
  productId: string;
  sender: 'buyer' | 'seller';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  product: Product;
  messages: ChatMessage[];
  lastMessageAt: string;
}
