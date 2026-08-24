import { useReducer, useMemo, useCallback } from "react";
import type { PosState, PosAction, CartItem } from "../types";

const initialState: PosState = {
  items: [],
  serviceChargePercent: 0,
};

function posReducer(state: PosState, action: PosAction): PosState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) =>
          i.menu_item_id === action.item.menu_item_id &&
          i.variant === action.item.variant &&
          JSON.stringify(i.modifiers) === JSON.stringify(action.item.modifiers)
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
      };
    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.id !== action.id),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      };
    case "UPDATE_ITEM_NOTES":
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, notes: action.notes } : i
        ),
      };
    case "SET_DISCOUNT":
      return { ...state, discount: action.discount };
    case "SET_SERVICE_CHARGE":
      return { ...state, serviceChargePercent: action.percent };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "CLEAR_CART":
      return {
        ...initialState,
      };
    default:
      return state;
  }
}

export function usePosCart() {
  const [state, dispatch] = useReducer(posReducer, initialState);

  const addItem = useCallback(
    (item: CartItem) => dispatch({ type: "ADD_ITEM", item }),
    []
  );

  const removeItem = useCallback(
    (id: string) => dispatch({ type: "REMOVE_ITEM", id }),
    []
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) =>
      dispatch({ type: "UPDATE_QUANTITY", id, quantity }),
    []
  );

  const updateItemNotes = useCallback(
    (id: string, notes: string) =>
      dispatch({ type: "UPDATE_ITEM_NOTES", id, notes }),
    []
  );

  const setDiscount = useCallback(
    (discount?: { type: "percentage" | "fixed"; value: number }) =>
      dispatch({ type: "SET_DISCOUNT", discount }),
    []
  );

  const setServiceCharge = useCallback(
    (percent: number) => dispatch({ type: "SET_SERVICE_CHARGE", percent }),
    []
  );

  const setNotes = useCallback(
    (notes: string) => dispatch({ type: "SET_NOTES", notes }),
    []
  );

  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  const computed = useMemo(() => {
    const subtotal = state.items.reduce((sum, item) => {
      const modifierTotal = item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0;
      return sum + (item.price + modifierTotal) * item.quantity;
    }, 0);

    let discountAmount = 0;
    if (state.discount) {
      discountAmount =
        state.discount.type === "percentage"
          ? subtotal * (state.discount.value / 100)
          : Math.min(state.discount.value, subtotal);
    }

    const taxableAmount = subtotal - discountAmount;
    const vatAmount = taxableAmount * 0.12;
    const serviceChargeAmount = taxableAmount * (state.serviceChargePercent / 100);
    const totalAmount = taxableAmount + vatAmount + serviceChargeAmount;
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      subtotal,
      discountAmount,
      vatAmount,
      serviceChargeAmount,
      totalAmount,
      itemCount,
    };
  }, [state.items, state.discount, state.serviceChargePercent]);

  return {
    state,
    computed,
    addItem,
    removeItem,
    updateQuantity,
    updateItemNotes,
    setDiscount,
    setServiceCharge,
    setNotes,
    clearCart,
  };
}
