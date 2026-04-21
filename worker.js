/**
 * AXiM Systems Edge Proxy - Production v1.0
 * Handles Stripe orchestration, session verification, and PDF generation stubs.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, replace with specific AXiM domains
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS Pre-flight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const apiBase = env.AXIM_API_BASE || 'https://api.axim.us.com/v1';

    /**
     * PHASE 1: Secure Stripe Checkout Session Creation
     */
    if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') {
      try {
        const body = await request.json();
        const origin = request.headers.get('Origin') || new URL(request.url).origin;

        if (!env.AXIM_API_KEY) {
           throw new Error("Missing API Key");
        }

        // Proxy to AXiM Core Billing Engine
        const stripeResponse = await fetch(`${apiBase}/functions/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_API_KEY}`,
          },
          body: JSON.stringify({
            productId: body.productId,
            metadata: body.metadata,
            success_url: `${origin}/#/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/#/app/generator`,
          }),
        });

        if (!stripeResponse.ok) {
          const errorData = await stripeResponse.text();
          throw new Error(`Billing gateway returned ${stripeResponse.status}: ${errorData}`);
        }

        const data = await stripeResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Gateway Error: ' + err.message }), { 
          status: 502, 
          headers: corsHeaders 
        });
      }
    }

    /**
     * PHASE 2: Session Verification
     */
    if (url.pathname === '/api/verify-session' && request.method === 'POST') {
      try {
        const { session_id } = await request.json();
        
        if (!session_id) {
           throw new Error("Missing session_id");
        }

        // Proxy to AXiM Core to verify Stripe payment state
        const verifyResponse = await fetch(`${apiBase}/functions/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_API_KEY}`,
          },
          body: JSON.stringify({ session_id }),
        });

        if (!verifyResponse.ok) {
          throw new Error(`Verification gateway returned ${verifyResponse.status}`);
        }

        const status = await verifyResponse.json();
        return new Response(JSON.stringify(status), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ isPaid: false, error: err.message }), { 
          status: 403, 
          headers: corsHeaders 
        });
      }
    }

    /**
     * PHASE 4: Edge PDF Generation Stub
     */
    if (url.pathname === '/api/generate-paystub' && request.method === 'POST') {
      try {
        const { session_id, formData } = await request.json();

        if (!session_id || !formData) {
           throw new Error("Missing session_id or formData");
        }

        // 1. Verify session_id belongs to a paid transaction again (Server-side check)
        const verifyResponse = await fetch(`${apiBase}/functions/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AXIM_API_KEY}`,
          },
          body: JSON.stringify({ session_id }),
        });

        if (!verifyResponse.ok) {
           throw new Error("Verification gateway failure during PDF generation.");
        }

        const status = await verifyResponse.json();
        if (!status.isPaid) {
           return new Response(JSON.stringify({ error: "Payment not verified." }), {
             status: 402,
             headers: corsHeaders
           });
        }

        // 2. Map formData to pdf-lib template
        // 3. Return PDF stream
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "PDF Drawing Engine Initialized. Ready for final render.",
          downloadUrl: "https://example.com/mock-pdf-download" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Generation Failed: " + err.message }), {
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return new Response('AXiM Systems Proxy: Endpoint Not Found', { status: 404, headers: corsHeaders });
  }
};
