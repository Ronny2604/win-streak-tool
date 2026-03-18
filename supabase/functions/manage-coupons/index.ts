import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, name, percent_off, amount_off, currency, duration, duration_in_months } = await req.json();

    if (action === "list") {
      const res = await fetch("https://api.stripe.com/v1/coupons?limit=50", {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const data = await res.json();
      return new Response(JSON.stringify({ coupons: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const params = new URLSearchParams();
      params.append("name", name);
      if (percent_off) params.append("percent_off", String(percent_off));
      if (amount_off) {
        params.append("amount_off", String(amount_off));
        params.append("currency", currency || "brl");
      }
      params.append("duration", duration || "once");
      if (duration === "repeating" && duration_in_months) {
        params.append("duration_in_months", String(duration_in_months));
      }

      const res = await fetch("https://api.stripe.com/v1/coupons", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const coupon = await res.json();
      if (coupon.error) {
        return new Response(JSON.stringify({ error: coupon.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ coupon }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
