/**
 * frontend/src/context/CartContext.jsx
 * Global cart state with real-time subtotal / tax / discount computation.
 */
import React, { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

// ─── Pure math helpers ────────────────────────────────────────────────────────
function computeTotals(items, discount) {
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const tax      = items.reduce((sum, i) => sum + (i.unit_price * i.quantity * (i.tax_percent / 100)), 0);
  const total    = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, discount, total };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const exists = state.items.find(i => i.product_id === action.product.id);
      const items = exists
        ? state.items.map(i =>
            i.product_id === action.product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [
            ...state.items,
            {
              product_id:  action.product.id,
              product_name: action.product.name,
              unit_price:  parseFloat(action.product.price),
              tax_percent: parseFloat(action.product.tax_percent || 0),
              quantity:    1,
              category_color: action.product.category_color || '#6366f1',
            },
          ];
      return { ...state, items, ...computeTotals(items, state.discount) };
    }
    case 'REMOVE': {
      const items = state.items.filter(i => i.product_id !== action.product_id);
      return { ...state, items, ...computeTotals(items, state.discount) };
    }
    case 'UPDATE_QTY': {
      const items = action.quantity <= 0
        ? state.items.filter(i => i.product_id !== action.product_id)
        : state.items.map(i =>
            i.product_id === action.product_id
              ? { ...i, quantity: action.quantity }
              : i
          );
      return { ...state, items, ...computeTotals(items, state.discount) };
    }
    case 'APPLY_DISCOUNT':
      return { ...state, discount: action.amount, coupon: action.coupon,
               ...computeTotals(state.items, action.amount) };
    case 'SET_CUSTOMER':
      return { ...state, customer: action.customer };
    case 'SET_TABLE':
      return { ...state, tableId: action.tableId, tableLabel: action.tableLabel };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

const initialState = {
  items: [], subtotal: 0, tax: 0, discount: 0, total: 0,
  coupon: null, customer: null, tableId: null, tableLabel: null,
};

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  const addProduct    = useCallback((p) => dispatch({ type: 'ADD', product: p }), []);
  const removeItem    = useCallback((id) => dispatch({ type: 'REMOVE', product_id: id }), []);
  const updateQty     = useCallback((id, qty) => dispatch({ type: 'UPDATE_QTY', product_id: id, quantity: qty }), []);
  const applyDiscount = useCallback((amt, coupon) => dispatch({ type: 'APPLY_DISCOUNT', amount: amt, coupon }), []);
  const setCustomer   = useCallback((c) => dispatch({ type: 'SET_CUSTOMER', customer: c }), []);
  const setTable      = useCallback((id, label) => dispatch({ type: 'SET_TABLE', tableId: id, tableLabel: label }), []);
  const clearCart     = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return (
    <CartContext.Provider value={{ cart, addProduct, removeItem, updateQty,
                                   applyDiscount, setCustomer, setTable, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
