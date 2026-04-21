/**
 * Cloudflare Worker Proxy for AXiM Pay Stub Generator
 * Handles Stripe Session creation dynamically ensuring CORS and environment routing.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Restrict this in production to your domain
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') {
      try {
        const body = await request.json();
        const origin = request.headers.get('Origin') || 'http://localhost:5173';
        
        // In a real implementation:
        // 1. Validate body.productId
        // 2. Make fetch to Stripe API using env.STRIPE_SECRET_KEY
        // 3. Pass success_url: `${origin}/#/success`
        // 4. Pass cancel_url: `${origin}/#/app/generator`
        
        // Mock Stripe Response for the frontend to handle redirect:
        const mockStripeResponse = {
          url: `${origin}/#/success` // Bypassing actual stripe for demo purposes
        };

        return new Response(JSON.stringify(mockStripeResponse), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};