import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
const MP_API_URL = "https://api.mercadopago.com/v1";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { payoutId } = await req.json();
    if (!payoutId) throw new Error("Payout ID is required");

    // 1. Get payout request
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('withdrawal_requests')
      .select('*, profiles(*)')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) throw new Error("Payout request not found");
    if (payout.status !== 'pending' && payout.status !== 'failed' && payout.status !== 'processing') {
       throw new Error(`Payout is already ${payout.status}`);
    }

    // 2. Update status to processing
    await supabaseAdmin
      .from('withdrawal_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', payoutId);

    // 3. Prepare Mercado Pago Payout
    const payoutBody = {
      amount: Number(payout.amount),
      external_reference: payout.id,
      payout_method_id: "pix",
      payout_method_info: {
        pix_key: payout.pix_key,
        pix_key_type: payout.pix_key_type || "email" // fallback
      }
    };

    console.log("Processing Payout via Mercado Pago:", payoutId);

    const response = await fetch(`${MP_API_URL}/payouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": payoutId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payoutBody),
    });

    const resData = await response.json();
    console.log("Mercado Pago Response:", response.status, resData);

    if (response.status >= 400) {
      const errorMsg = resData.message || (resData.cause && resData.cause[0]?.description) || "Erro no Mercado Pago";
      
      // Update status to failed
      await supabaseAdmin
        .from('withdrawal_requests')
        .update({ 
          status: 'failed', 
          error_message: errorMsg,
          updated_at: new Date().toISOString() 
        })
        .eq('id', payoutId);

      throw new Error(errorMsg);
    }

    // 4. Success! Update status to completed
    await supabaseAdmin
      .from('withdrawal_requests')
      .update({ 
        status: 'completed', 
        external_payout_id: String(resData.id),
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', payoutId);

    // 5. Update transaction to completed
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'completed' })
      .eq('user_id', payout.user_id)
      .eq('amount', -payout.amount)
      .eq('type', 'Saque')
      .eq('status', 'pending');

    return new Response(JSON.stringify({ success: true, payout_id: resData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Payout Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
