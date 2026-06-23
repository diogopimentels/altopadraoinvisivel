import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  size?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  shippingOption: { id: string; name: string; price: number; delivery_time?: number; company?: string } | null;
  setShippingOption: (option: { id: string; name: string; price: number; delivery_time?: number; company?: string } | null) => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleCart: () => void;
  clearCart: () => void;
  totalPrice: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  shippingOption: null,

  setShippingOption: (option) => set({ shippingOption: option }),

  addItem: (newItem) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.id === newItem.id);
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.id === newItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
          isOpen: true, // Always open cart when adding
        };
      }
      return { 
        items: [...state.items, { ...newItem, quantity: 1 }],
        isOpen: true
      };
    });
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  updateQuantity: (id, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.id !== id) };
      }
      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
      };
    });
  },

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  
  clearCart: () => set({ items: [] }),

  totalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  totalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  }
}));
