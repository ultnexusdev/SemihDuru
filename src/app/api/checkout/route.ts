import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export async function POST(req: Request) {
  try {
    const { appointmentId, depositAmount, clientName, serviceName } = await req.json();

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Tattoo Deposit: ${serviceName}`,
              description: `Deposit for appointment booking by ${clientName}`,
            },
            unit_amount: Math.round(depositAmount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/api/confirm?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`,
      cancel_url: `${origin}/book?canceled=true`,
      metadata: {
        appointmentId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
