import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');
    const appointment_id = searchParams.get('appointment_id');
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    if (!session_id || !appointment_id) {
      return NextResponse.redirect(`${origin}/book?error=missing_params`);
    }

    // Verify session is paid
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      
      // Update Supabase
      const { data, error } = await supabase
        .from('appointments')
        .update({ deposit_paid: true, status: 'confirmed' })
        .eq('id', appointment_id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error);
      }

      // We send the Telegram message regardless of Supabase update failure
      // because we know Stripe took the money!
      const clientName = data ? data.client_name : "Bilinmeyen Müşteri";
      const clientPhone = data ? data.client_phone : "Yok";
      const apptDate = data ? new Date(data.appointment_date).toLocaleString('tr-TR') : "Bilinmiyor";
      const depositAmt = data ? data.deposit_amount : "50";
      const errorNote = error ? "\n⚠️ DİKKAT: Veritabanı (Supabase) güncellenemedi! SQL iznini kontrol et." : "";

      const message = `💰 YENİ KAPORA GELDİ!\n\nMüşteri: ${clientName}\nTelefon: ${clientPhone || 'Yok'}\nTarih: ${apptDate}\nÖdenen: £${depositAmt}\n\nStripe üzerinden başarıyla ödendi.${errorNote}`;
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
        }),
      });

      // Redirect to success UI
      return NextResponse.redirect(`${origin}/book?success=true`);
    } else {
      return NextResponse.redirect(`${origin}/book?canceled=true`);
    }

  } catch (err: any) {
    console.error('Confirmation error:', err);
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/book?error=server_error`);
  }
}
