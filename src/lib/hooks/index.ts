"use client";

export { useAuth } from "@/providers/AuthProvider";
export { useCustomers } from "./useCustomers";
export { useFloorPlans, useTables } from "./useTables";
export { useReservations } from "./useReservations";
export { useMenuCategories, useMenuItems } from "./useMenu";
export { useOrders, useOrder } from "./useOrders";
export { useNotifications } from "./useNotifications";
export { useKitchenOrders } from "./useKitchen";
export {
  useIngredients,
  useSuppliers,
  usePurchaseOrders,
  usePurchaseOrder,
  useRecipes,
  useRecipe,
  useStockMovements,
  useStockAdjust,
  useStockTransfer,
  useLogWastage,
} from "./useInventory";
export {
  useStaff,
  useStaffMember,
  useStaffPerformance,
  useShiftSchedule,
  useAttendance,
  useClockIn,
  useClockOut,
} from "./useStaff";
export { useDashboard } from "./useDashboard";
export { useUsers } from "./useUsers";
