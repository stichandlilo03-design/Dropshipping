import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    
    const {
      orderId,
      productName,
      productPrice,
      quantity,
      customerEmail,
      customerName,
      shippingCost,
      tax,
    } = body;

    console.log('[Stripe] Creating checkout session for order:', orderId);

    // Calculate totals in cents (Stripe uses cents)
    const unitPriceInCents = Math.round(parseFloat(productPrice) * 100);
    const subtotalInCents = unitPriceInCents * quantity;
    const shippingInCents = Math.round(parseFloat(shippingCost) * 100);
    const taxInCents = Math.round(parseFloat(tax) * 100);
    const totalInCents = subtotalInCents + shippingInCents + taxInCents;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: `Quantity: ${quantity}`,
            },
            unit_amount: unitPriceInCents,
          },
          quantity: quantity,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shipping',
            },
            unit_amount: shippingInCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tax',
            },
            unit_amount: taxInCents,
          },
          quantity: 1,
        },
      ],
      
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?order=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancelled`,
      
      metadata: {
        orderId: orderId,
        customerName: customerName,
      },
      
      automatic_tax: {
        enabled: false, // We're handling tax calculation
      },
    });

    console.log('[Stripe] Session created:', session.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('[Stripe] Error:', error.message);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
