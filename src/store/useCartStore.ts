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
  supplier_id?: string | null;
}

export type ShippingOption = {
  id: string;
  name: string;
  price: number;
  delivery_time?: number;
  company?: string;
  breakdown?: { supplier_id: string; supplier_name: string; price: number }[];
};

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  shippingOption: ShippingOption | null;
  setShippingOption: (option: ShippingOption | null) => void;
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
          isOpen: true,
          shippingOption: null,
        };
      }
      return {
        items: [...state.items, { ...newItem, quantity: 1 }],
        isOpen: true,
        shippingOption: null,
      };
    });
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      shippingOption: null,
    }));
  },

  updateQuantity: (id, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.id !== id), shippingOption: null };
      }
      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
        shippingOption: null,
      };
    });
  },

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  clearCart: () => set({ items: [], shippingOption: null }),

  totalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  totalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
}));
