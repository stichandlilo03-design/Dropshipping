'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Home, ShoppingCart, Package } from 'lucide-react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const updateOrderStatus = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        const orderId = searchParams.get('order_id');

        console.log('[Success] Session ID:', sessionId);
        console.log('[Success] Order ID:', orderId);

        if (!sessionId) {
          setError('No session ID found');
          setLoading(false);
          return;
        }

        // Update the order status from "pending_payment" to "paid"
        if (orderId && orderId !== 'unknown') {
          try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
              status: 'paid',
              stripeSessionId: sessionId,
              updatedAt: new Date().toISOString(),
            });

            console.log('[Success] Order updated to paid status:', orderId);

            // Fetch updated order
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, where('__name__', '==', orderId));
            const querySnapshot = await getDocs(ordersRef);
            
            let foundOrder = null;
            querySnapshot.forEach(doc => {
              if (doc.id === orderId) {
                foundOrder = { id: doc.id, ...doc.data() };
              }
            });

            if (foundOrder) {
              setOrder(foundOrder);
            }
          } catch (err) {
            console.error('[Success] Error updating order:', err);
            setError('Could not update order status');
          }
        } else {
          // Fallback: search by session ID
          try {
            const ordersRef = collection(db, 'orders');
            const querySnapshot = await getDocs(ordersRef);
            
            let foundOrder = null;
            querySnapshot.forEach(doc => {
              const data = doc.data();
              if (data.stripeSessionId === sessionId || doc.id === sessionId) {
                foundOrder = { id: doc.id, ...data };
              }
            });

            if (foundOrder) {
              // Update status to paid
              const orderRef = doc(db, 'orders', foundOrder.id);
              await updateDoc(orderRef, {
                status: 'paid',
                stripeSessionId: sessionId,
                updatedAt: new Date().toISOString(),
              });

              foundOrder.status = 'paid';
              setOrder(foundOrder);
              console.log('[Success] Order found and updated:', foundOrder.id);
            } else {
              console.warn('[Success] Order not found by session ID');
              setError('Order not found');
            }
          } catch (err) {
            console.error('[Success] Error finding order:', err);
            setError('Could not find order');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('[Success] Error:', err);
        setError(err.message || 'An error occurred');
        setLoading(false);
      }
    };

    updateOrderStatus();

    // Clear cart from localStorage after successful payment
    try {
      localStorage.removeItem('cart');
      console.log('[Success] Cart cleared from localStorage');
    } catch (err) {
      console.error('[Success] Error clearing cart:', err);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Success Message */}
        <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-8 text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <Check size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-200 mb-2">Order Confirmed!</h2>
          <p className="text-green-100">
            Thank you for your purchase. Your order has been successfully created and is being processed.
          </p>
        </div>

        {error && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-6 mb-8">
            <p className="text-yellow-200">{error}</p>
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8 space-y-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Order ID</p>
              <p className="text-white font-mono text-lg break-all">{order.id}</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-1">Order Status</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-600/20 text-green-400">
                  ✅ Paid
                </span>
                <span className="text-gray-400 text-sm">Payment received</span>
              </div>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-3">Items Ordered</p>
              <div className="space-y-2">
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-gray-300 text-sm">
                    <span>{item.productName} x {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>${order.tax?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span>$10.00</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-700">
                  <span>Total</span>
                  <span className="text-green-400">${order.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>

            {order.customerEmail && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Confirmation Email</p>
                <p className="text-white">{order.customerEmail}</p>
              </div>
            )}
          </div>
        )}

        {/* What's Next */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">What's Next?</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Package size={20} className="text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold">Order Processing</p>
                <p className="text-gray-400 text-sm">Your order is being prepared for shipment</p>
              </div>
            </div>
            <div className="flex gap-3">
              <ShoppingCart size={20} className="text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold">View Your Order</p>
                <p className="text-gray-400 text-sm">Check the status in your account dashboard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 grid grid-cols-2 gap-4">
          <Link
            href="/customer/account"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition text-center flex items-center justify-center gap-2"
          >
            <ShoppingCart size={20} />
            View Order
          </Link>
          <Link
            href="/shop"
            className="bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition text-center flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function SuccessSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Processing...</p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<SuccessSuspense />}>
      <SuccessContent />
    </Suspense>
  );
}
