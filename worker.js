// Cloudflare Worker — DivinewayFengshui Stripe Checkout
// Deploy this file in the Cloudflare Workers dashboard (paste into the editor).
//
// Required secret (Settings → Variables → Add secret):
//   STRIPE_SECRET_KEY  →  sk_test_... (from Stripe dashboard, test mode)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let items, successUrl, cancelUrl;
    try {
      ({ items, successUrl, cancelUrl } = await request.json());
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!Array.isArray(items) || !items.length) {
      return json({ error: 'Cart is empty' }, 400);
    }

    // Build Stripe Checkout Session params (form-encoded)
    const params = new URLSearchParams();
    params.append('mode',        'payment');
    params.append('success_url', successUrl);
    params.append('cancel_url',  cancelUrl);

    items.forEach((item, i) => {
      params.append(`line_items[${i}][price_data][currency]`,                  'sgd');
      params.append(`line_items[${i}][price_data][product_data][name]`,        item.name);
      params.append(`line_items[${i}][price_data][unit_amount]`,               Math.round(item.price * 100));
      params.append(`line_items[${i}][quantity]`,                              String(item.qty));
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return json({ error: session.error?.message || 'Stripe error' }, stripeRes.status);
    }

    return json({ url: session.url });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
