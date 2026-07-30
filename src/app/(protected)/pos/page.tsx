"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  usePosCart,
  PosHeader,
  ProductGrid,
  CartPanel,
  DiscountDialog,
  PaymentDialog,
  ReceiptDialog,
} from "@/features/pos";
import { useOrders } from "@/lib/hooks";
import type { MenuItem } from "@/lib/types";
import type { PosDiscount, PaymentLine as PosPaymentLine } from "@/features/pos";

export default function PosPage() {
  const cart = usePosCart();
  const { create: createOrder, addPayment } = useOrders();

  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState("");
  const [completedPayments, setCompletedPayments] = useState<PosPaymentLine[]>([]);

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

  function handleApplyDiscount(discount?: PosDiscount) {
    cart.setDiscount(discount);
    if (discount) {
      toast.success("Discount applied");
    } else {
      toast.success("Discount removed");
    }
  }

  function handleServiceChargeInput() {
    const input = window.prompt(
      "Enter service charge percentage (0-100):",
      String(cart.state.serviceChargePercent)
    );
    if (input === null) return;
    const val = parseFloat(input);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      cart.setServiceCharge(val);
      toast.success(
        val > 0 ? `Service charge set to ${val}%` : "Service charge removed"
      );
    }
  }

  async function handleProcessPayment(payments: PosPaymentLine[]) {
    try {
      const orderResult = await createOrder.mutateAsync({
        order_type: cart.state.orderType,
        customer_id: cart.state.customerId,
        table_id: cart.state.tableId,
        notes: cart.state.notes,
        items: cart.state.items.map((item) => ({
          menu_item_id: item.menu_item_id,
          variant: item.variant,
          quantity: item.quantity,
          unit_price: item.price,
          notes: item.notes,
          modifiers: item.modifiers?.map((m) => ({
            modifier_option_id: "",
            price: m.price,
          })),
        })),
      });

      const orderId = orderResult.data.data.id;

      for (const payment of payments) {
        await addPayment.mutateAsync({
          id: orderId,
          data: {
            payment_method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
          },
        });
      }

      setCompletedOrderNumber(orderResult.data.data.order_number);
      setCompletedPayments(payments);
      setPaymentOpen(false);
      setReceiptOpen(true);
      toast.success("Payment processed successfully");
    } catch {
      toast.error("Failed to process payment");
    }
  }

  function handleNewOrder() {
    cart.clearCart();
    setCompletedOrderNumber("");
    setCompletedPayments([]);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <PosHeader
        orderType={cart.state.orderType}
        customerId={cart.state.customerId}
        tableId={cart.state.tableId}
        itemCount={cart.computed.itemCount}
        onSetOrderType={cart.setOrderType}
        onSetCustomer={cart.setCustomer}
        onSetTable={cart.setTable}
        onClearCart={cart.clearCart}
      />

      <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ProductGrid onAddToCart={handleAddToCart} />
        </div>

        <div className="w-full xl:w-[380px] xl:shrink-0 border-t xl:border-t-0 xl:border-l">
          <CartPanel
            items={cart.state.items}
            subtotal={cart.computed.subtotal}
            discount={cart.state.discount}
            discountAmount={cart.computed.discountAmount}
            vatAmount={cart.computed.vatAmount}
            serviceChargeAmount={cart.computed.serviceChargeAmount}
            serviceChargePercent={cart.state.serviceChargePercent}
            totalAmount={cart.computed.totalAmount}
            itemCount={cart.computed.itemCount}
            onUpdateQuantity={cart.updateQuantity}
            onRemove={cart.removeItem}
            onUpdateNotes={cart.updateItemNotes}
            onEditDiscount={() => setDiscountOpen(true)}
            onEditServiceCharge={handleServiceChargeInput}
            onPay={() => setPaymentOpen(true)}
          />
        </div>
      </div>

      <DiscountDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        currentDiscount={cart.state.discount}
        subtotal={cart.computed.subtotal}
        onApply={handleApplyDiscount}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        totalAmount={cart.computed.totalAmount}
        discountAmount={cart.computed.discountAmount}
        vatAmount={cart.computed.vatAmount}
        serviceChargeAmount={cart.computed.serviceChargeAmount}
        subtotal={cart.computed.subtotal}
        onProcessPayment={handleProcessPayment}
        isProcessing={createOrder.isPending || addPayment.isPending}
      />

      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        orderNumber={completedOrderNumber}
        items={cart.state.items}
        subtotal={cart.computed.subtotal}
        discount={cart.state.discount}
        discountAmount={cart.computed.discountAmount}
        vatAmount={cart.computed.vatAmount}
        serviceChargeAmount={cart.computed.serviceChargeAmount}
        totalAmount={cart.computed.totalAmount}
        payments={completedPayments}
        orderType={cart.state.orderType}
        onNewOrder={handleNewOrder}
      />
    </div>
  );
}
