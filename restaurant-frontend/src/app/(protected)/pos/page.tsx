"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  usePosCart,
  PosHeader,
  ProductGrid,
  CartPanel,
  PaymentDialog,
  ReceiptDialog,
  ExistingOrderDialog,
} from "@/features/pos";
import { useOrders, useOrder } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canAccessRevenueReport } from "@/lib/utils/permissions";
import type { MenuItem, OrderType, Order } from "@/lib/types";
import type { PaymentLine as PosPaymentLine, CartItemType } from "@/features/pos";

export default function PosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const cart = usePosCart();
  const { addPayment } = useOrders();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [existingDialogOpen, setExistingDialogOpen] = useState(false);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const { data: existingOrderData } = useOrder(existingOrderId ?? "");
  const existingOrder: Order | null = existingOrderId
    ? existingOrderData ?? null
    : null;

  const [completedOrderNumber, setCompletedOrderNumber] = useState("");
  const [completedPayments, setCompletedPayments] = useState<PosPaymentLine[]>([]);
  const [completedOrderType, setCompletedOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [completedCustomerName, setCompletedCustomerName] = useState("");
  const [completedTableNumber, setCompletedTableNumber] = useState("");
  const [completedDiscountName, setCompletedDiscountName] = useState<string | undefined>();
  // Server-computed figures captured at payment time so the receipt always
  // mirrors the recorded transaction/invoice instead of client cart math.
  const [completedItems, setCompletedItems] = useState<CartItemType[]>([]);
  const [completedTotals, setCompletedTotals] = useState<{
    subtotal: number;
    discountAmount: number;
    vatAmount: number;
    serviceChargeAmount: number;
    totalAmount: number;
  } | null>(null);
  // For partial settlements (existing orders): the balance being paid now and
  // what was already paid before this session.
  const [completedDue, setCompletedDue] = useState<number | undefined>(undefined);
  const [completedPrevPaid, setCompletedPrevPaid] = useState<number | undefined>(undefined);

  function resetCompletedTransaction() {
    setCompletedOrderNumber("");
    setCompletedPayments([]);
    setCompletedItems([]);
    setCompletedTotals(null);
    setCompletedDiscountName(undefined);
    setCompletedDue(undefined);
    setCompletedPrevPaid(undefined);
  }

  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      cart.addItem({
        id: crypto.randomUUID(),
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      });
      toast.success(`Added ${item.name}`);
    },
    [cart]
  );

  async function payExistingOrder(payments: PosPaymentLine[]) {
    if (!existingOrder) return;
    const orderId = existingOrder.id;
    const backendTotal = existingOrder.total_amount;
    const alreadyPaid = (existingOrder.payments ?? []).reduce(
      (sum, p) => sum + (p.amount ?? 0),
      0
    );
    const dueNow = Math.max(
      0,
      Math.round((backendTotal - alreadyPaid) * 100) / 100
    );

    setCompletedCustomerName(existingOrder.customer?.name ?? "");
    setCompletedTableNumber(existingOrder.table?.number ?? "");
    setCompletedItems(
      (existingOrder.items ?? []).map((i) => ({
        id: i.id,
        menu_item_id: i.menu_item_id,
        name: i.name ?? i.menu_item_name ?? "Unnamed item",
        price: i.unit_price,
        quantity: i.quantity,
      }))
    );
    setCompletedTotals({
      subtotal: existingOrder.subtotal,
      discountAmount: existingOrder.discount_amount ?? 0,
      vatAmount: existingOrder.tax_amount ?? 0,
      serviceChargeAmount: existingOrder.service_charge ?? 0,
      totalAmount: backendTotal,
    });
    setCompletedDiscountName(existingOrder.applied_discount?.name);
    setCompletedDue(dueNow);
    setCompletedPrevPaid(alreadyPaid);

    // Single payment settles the remaining balance. The dialog already emits
    // the exact due for card/e-wallet and the full tendered amount for cash.
    const payment = payments[0];
    await addPayment.mutateAsync({
      id: orderId,
      data: {
        payment_method: payment.method,
        amount: Math.round(payment.amount * 100) / 100,
        reference: payment.reference,
      },
    });

    setCompletedOrderNumber(existingOrder.order_number);
    setCompletedPayments(payments);
    setCompletedOrderType(
      existingOrder.order_type as "dine_in" | "takeaway"
    );
    setExistingOrderId(null);
    setPaymentOpen(false);
    setReceiptOpen(true);
    toast.success("Payment processed successfully");
  }

  async function handleProcessPayment(
    payments: PosPaymentLine[],
    _orderType: OrderType,
    _customerId?: string,
    _tableId?: string
  ) {
    try {
      const validPayments = payments.filter((p) => p.amount > 0);
      if (validPayments.length === 0) return;

      // POS is an EXISTING-order settlement screen. It must NEVER create a new
      // restaurant order — order creation belongs to the Waiter/Orders workflow.
      // The cart's Pay button is intentionally disabled until an existing
      // served/unpaid order is loaded (see CartPanel), so reaching this guard
      // is defensive only and must not spawn an orphan Pending Order.
      if (!existingOrder) {
        toast.error("Load an existing served order before settling payment.");
        return;
      }

      await payExistingOrder(validPayments);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        "Failed to process payment";
      toast.error(message);
    }
  }

  function handleNewOrder() {
    cart.clearCart();
    resetCompletedTransaction();
    setExistingOrderId(null);
  }

  const dialogTotals = useMemo(() => {
    if (existingOrder) {
      const alreadyPaid = (existingOrder.payments ?? []).reduce(
        (sum, p) => sum + (p.amount ?? 0),
        0
      );
      return {
        totalAmount: Math.max(
          0,
          Math.round((existingOrder.total_amount - alreadyPaid) * 100) / 100
        ),
        subtotal: existingOrder.subtotal,
        discountAmount: existingOrder.discount_amount,
        vatAmount: existingOrder.tax_amount,
        serviceChargeAmount: existingOrder.service_charge,
      };
    }
    return {
      totalAmount: cart.computed.totalAmount,
      subtotal: cart.computed.subtotal,
      discountAmount: cart.computed.discountAmount,
      vatAmount: cart.computed.vatAmount,
      serviceChargeAmount: cart.computed.serviceChargeAmount,
    };
  }, [existingOrder, cart.computed]);

  const receiptItems: CartItemType[] =
    completedItems.length > 0
      ? completedItems
      : existingOrder
        ? existingOrder.items.map((i) => ({
            id: i.id,
            menu_item_id: i.menu_item_id,
            name: i.name ?? i.menu_item_name ?? "Unnamed item",
            price: i.unit_price,
            quantity: i.quantity,
          }))
        : cart.state.items;

  const receiptTotals =
    completedTotals ??
    (existingOrder
      ? {
          subtotal: existingOrder.subtotal,
          discountAmount: existingOrder.discount_amount,
          vatAmount: existingOrder.tax_amount,
          serviceChargeAmount: existingOrder.service_charge,
          totalAmount: existingOrder.total_amount,
        }
      : {
          subtotal: cart.computed.subtotal,
          discountAmount: cart.computed.discountAmount,
          vatAmount: cart.computed.vatAmount,
          serviceChargeAmount: cart.computed.serviceChargeAmount,
          totalAmount: cart.computed.totalAmount,
        });

  const canReport = canAccessRevenueReport(user?.role);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <PosHeader
        itemCount={cart.computed.itemCount}
        onClearCart={cart.clearCart}
        onReport={() => router.push("/reports")}
        canReport={canReport}
      />

      <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ProductGrid onAddToCart={handleAddToCart} />
        </div>

        <div className="w-full xl:w-[380px] xl:shrink-0 border-t xl:border-t-0 xl:border-l">
          <CartPanel
            items={cart.state.items}
            subtotal={cart.computed.subtotal}
            discountAmount={cart.computed.discountAmount}
            vatAmount={cart.computed.vatAmount}
            serviceChargeAmount={cart.computed.serviceChargeAmount}
            serviceChargePercent={cart.computed.serviceChargePercent}
            totalAmount={cart.computed.totalAmount}
            itemCount={cart.computed.itemCount}
            onUpdateQuantity={cart.updateQuantity}
            onRemove={cart.removeItem}
            onUpdateNotes={cart.updateItemNotes}
            existingOrder={existingOrder}
            onSelectExistingOrder={() => setExistingDialogOpen(true)}
            onClearExistingOrder={() => setExistingOrderId(null)}
            onPayExisting={() => setPaymentOpen(true)}
          />
        </div>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        totalAmount={dialogTotals.totalAmount}
        discountAmount={dialogTotals.discountAmount}
        vatAmount={dialogTotals.vatAmount}
        serviceChargeAmount={dialogTotals.serviceChargeAmount}
        subtotal={dialogTotals.subtotal}
        onProcessPayment={handleProcessPayment}
        isProcessing={addPayment.isPending}
        existingOrder={existingOrder}
      />

      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        orderNumber={completedOrderNumber}
        items={receiptItems}
        subtotal={receiptTotals.subtotal}
        discountAmount={receiptTotals.discountAmount}
        discountName={completedDiscountName}
        vatAmount={receiptTotals.vatAmount}
        serviceChargeAmount={receiptTotals.serviceChargeAmount}
        totalAmount={receiptTotals.totalAmount}
        payments={completedPayments}
        previouslyPaid={completedPrevPaid}
        amountDueForChange={completedDue}
        orderType={completedOrderType}
        customerName={completedCustomerName || undefined}
        tableNumber={completedTableNumber || undefined}
        onNewOrder={handleNewOrder}
      />

      <ExistingOrderDialog
        open={existingDialogOpen}
        onOpenChange={setExistingDialogOpen}
        onSelect={(order) => {
          setExistingOrderId(order.id);
          setExistingDialogOpen(false);
        }}
      />
    </div>
  );
}
