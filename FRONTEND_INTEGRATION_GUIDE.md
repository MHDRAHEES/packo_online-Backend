# Next.js 15 App Router + Express Backend Integration Guide

This guide explains how to seamlessly connect your **Next.js 15 App Router** frontend (`http://localhost:5000`) with your **Express + MongoDB Backend** (`http://localhost:8000/api/v1`).

---

## 1. Environment Variable Setup (`.env.local` in Next.js)

In your Next.js project root, create or update `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

---

## 2. API Client (`lib/api.ts` in Next.js)

Create an Axios or Fetch instance configured with `withCredentials: true` so HTTP-only JWT cookies automatically attach to requests.

Install Axios in Next.js (if not already installed):
```bash
npm install axios
```

Create `lib/api.ts`:
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  withCredentials: true, // Crucial for sending/receiving HTTP-Only JWT Cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);
```

---

## 3. Authentication Integration (`context/AuthContext.tsx`)

Create an Auth Context to manage user state across your Next.js App Router components:

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: object) => Promise<void>;
  register: (userData: object) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check current user session on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (credentials: object) => {
    const { data } = await api.post('/auth/login', credentials);
    setUser(data.data.user);
  };

  const register = async (userData: object) => {
    const { data } = await api.post('/auth/register', userData);
    setUser(data.data.user);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## 4. Product Fetching (Next.js App Router Server Component)

Fetch products with search, pagination, and filters directly inside Next.js 15 Server Components or Client Components:

```typescript
// app/products/page.tsx
import { api } from '@/lib/api';

async function getProducts(searchParams: { keyword?: string; category?: string; page?: string }) {
  const query = new URLSearchParams(searchParams as Record<string, string>).toString();
  const res = await fetch(`http://localhost:8000/api/v1/products?${query}`, {
    cache: 'no-store', // Server-side fetching
  });
  return res.json();
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const data = await getProducts(params);
  const products = data?.data?.products || [];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Product Catalog</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product: any) => (
          <div key={product._id} className="border p-4 rounded-lg shadow">
            <img src={product.images[0]?.url || '/placeholder.png'} alt={product.name} className="h-48 w-full object-cover rounded" />
            <h2 className="text-lg font-semibold mt-2">{product.name}</h2>
            <p className="text-gray-600">${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

---

## 5. Full Proceed Payment & Order Confirmation Integration

### Step 5.1: Razorpay Script Helper (`utils/loadRazorpay.ts`)
```typescript
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
```

### Step 5.2: Checkout Component (`app/checkout/page.tsx`)
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { loadRazorpayScript } from '@/utils/loadRazorpay';
import { useCart } from '@/context/CartContext'; // Or your cart store

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart, totalAmount } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Razorpay' | 'COD'>('Razorpay');

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'India',
  });

  const handleProceedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create initial order in backend database
      const createdOrder = await api.placeOrder({
        items: cartItems,
        customer,
        paymentMethod,
        subtotal: totalAmount,
        shipping: 0,
        tax: 0,
        discount: 0,
        total: totalAmount,
      });

      const orderId = createdOrder.id || (createdOrder as any)._id;

      // 2. Handle Online Payment via Razorpay
      if (paymentMethod === 'Razorpay') {
        const resLoaded = await loadRazorpayScript();
        if (!resLoaded) {
          alert('Razorpay SDK failed to load. Please check your internet connection.');
          setLoading(false);
          return;
        }

        // Call backend checkout endpoint to generate Razorpay Order ID
        const checkoutRes = await api.createRazorpayOrder(totalAmount, orderId);

        const options = {
          key: checkoutRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: checkoutRes.amount,
          currency: checkoutRes.currency || 'INR',
          name: 'E-Commerce Store',
          description: `Order #${orderId}`,
          order_id: checkoutRes.id,
          handler: async function (response: any) {
            try {
              // Verify Payment Signature on backend
              await api.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId,
              });

              clearCart();
              router.push(`/order-confirmation/${orderId}`);
            } catch (err: any) {
              alert(err.message || 'Payment Verification Failed');
            }
          },
          prefill: {
            name: customer.name,
            email: customer.email,
            contact: customer.phone,
          },
          theme: {
            color: '#2563eb',
          },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      } else {
        // Cash on Delivery (COD) Flow
        clearCart();
        router.push(`/order-confirmation/${orderId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Checkout & Payment</h1>
      <form onSubmit={handleProceedPayment} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Shipping Form */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Shipping Address</h2>
          <input required type="text" placeholder="Full Name" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} className="w-full border p-2 rounded" />
          <input required type="email" placeholder="Email Address" value={customer.email} onChange={(e) => setCustomer({...customer, email: e.target.value})} className="w-full border p-2 rounded" />
          <input required type="tel" placeholder="Phone Number" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} className="w-full border p-2 rounded" />
          <input required type="text" placeholder="Address" value={customer.address} onChange={(e) => setCustomer({...customer, address: e.target.value})} className="w-full border p-2 rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input required type="text" placeholder="City" value={customer.city} onChange={(e) => setCustomer({...customer, city: e.target.value})} className="border p-2 rounded" />
            <input required type="text" placeholder="Postal Code" value={customer.postalCode} onChange={(e) => setCustomer({...customer, postalCode: e.target.value})} className="border p-2 rounded" />
          </div>
        </div>

        {/* Payment Method & Summary */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Select Payment Method</h2>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 border p-3 rounded cursor-pointer">
              <input type="radio" name="payment" value="Razorpay" checked={paymentMethod === 'Razorpay'} onChange={() => setPaymentMethod('Razorpay')} />
              <span>Razorpay (UPI, Credit/Debit Card, NetBanking)</span>
            </label>
            <label className="flex items-center space-x-3 border p-3 rounded cursor-pointer">
              <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
              <span>Cash on Delivery (COD)</span>
            </label>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Payable:</span>
              <span>₹{totalAmount}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cartItems.length === 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-lg transition"
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Step 5.3: Order Confirmation Page (`app/order-confirmation/[id]/page.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function OrderConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = (params?.id as string) || searchParams?.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const data = await api.getOrderById(orderId);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 my-10 bg-white border rounded-xl shadow-lg">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
          ✓
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Order Confirmed!</h1>
        <p className="text-gray-600">Thank you for your purchase. We are preparing your order.</p>
        <p className="text-sm bg-gray-100 p-2 rounded inline-block font-mono">
          Order ID: <span className="font-bold">{orderId}</span>
        </p>
      </div>

      {order && (
        <div className="mt-8 space-y-6 border-t pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700">Payment Status</h3>
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold mt-1 ${order.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {order.isPaid ? 'Paid' : 'Pending Payment (COD)'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Total Amount</h3>
              <p className="text-lg font-bold text-gray-900">₹{order.totalPrice}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Shipping Address</h3>
            <p className="text-gray-600">{order.shippingAddress?.address}, {order.shippingAddress?.city} - {order.shippingAddress?.postalCode}</p>
            <p className="text-gray-600">Phone: {order.shippingAddress?.phone}</p>
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
```

---

## 6. Image Uploads (Multer + Cloudinary)

Upload images from admin forms:

```typescript
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const { data } = await api.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(data.data.url);
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      {uploading && <p>Uploading to Cloudinary...</p>}
      {imageUrl && <img src={imageUrl} alt="Uploaded" className="w-32 h-32 object-cover rounded mt-2" />}
    </div>
  );
}
```

---

## 🔑 Summary Checklist for Connecting Frontend to Backend

| Task | Frontend Code | Backend Endpoint |
|---|---|---|
| **Register** | `api.post('/auth/register', data)` | `POST /api/v1/auth/register` |
| **Login** | `api.post('/auth/login', data)` | `POST /api/v1/auth/login` |
| **Get Logged User** | `api.get('/auth/me')` | `GET /api/v1/auth/me` |
| **Fetch Products** | `api.get('/products?page=1&keyword=shirt')` | `GET /api/v1/products` |
| **Add to Cart** | `api.post('/cart', { productId, quantity })` | `POST /api/v1/cart` |
| **Place Order** | `api.post('/orders', orderPayload)` | `POST /api/v1/orders` |
| **Razorpay Checkout** | `api.post('/payment/checkout', { amount })` | `POST /api/v1/payment/checkout` |
| **Upload Image** | `api.post('/upload/single', formData)` | `POST /api/v1/upload/single` |

---

### Important CORS & Cookie Notes
- Make sure `CLIENT_URL=http://localhost:3000` in your backend `.env`.
- Always set `{ withCredentials: true }` in Axios / `credentials: 'include'` in fetch so JWT cookies sent by Express are saved in the browser automatically!
