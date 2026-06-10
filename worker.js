// Cloudflare Worker — DivinewayFengshui
//
// Routes:
//   GET  /products  → fetch items + prices from ERPNext, return to frontend
//   POST /checkout  → create Stripe Checkout Session
//
// Required secrets (Settings → Variables → Add secret):
//   ERPNEXT_URL        e.g. https://kingstech-worldorb.s.frappe.cloud
//   ERPNEXT_API_KEY    token key
//   ERPNEXT_API_SECRET token secret
//   STRIPE_SECRET_KEY  sk_test_...

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/products' && request.method === 'GET') {
      return handleProducts(env);
    }

    if (pathname === '/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};

// ── /products ─────────────────────────────────────────────────────
async function handleProducts(env) {
  const base    = env.ERPNEXT_URL;
  const headers = {
    'Authorization': `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`,
    'Content-Type':  'application/json',
  };

  // 1. Fetch item list
  const filters = encodeURIComponent(JSON.stringify([
    ['disabled',       '=', 0],
    ['is_sales_item',  '=', 1],
  ]));
  const fields = encodeURIComponent(JSON.stringify([
    'name', 'item_name', 'item_code', 'item_group',
    'description', 'image', 'custom_chinese_name',
  ]));
  const listRes = await fetch(
    `${base}/api/resource/Item?filters=${filters}&fields=${fields}&limit_page_length=200&order_by=item_name%20asc`,
    { headers },
  );
  if (!listRes.ok) {
    return json({ error: `ERPNext items fetch failed (${listRes.status})` }, 502);
  }
  const { data: items = [] } = await listRes.json();

  if (!items.length) return json({ products: [] });

  // 2. Fetch full document for each item in parallel (needed for child table)
  const details = await Promise.all(
    items.map(async item => {
      const r = await fetch(
        `${base}/api/resource/Item/${encodeURIComponent(item.item_code)}`,
        { headers },
      );
      if (!r.ok) return item;
      const d = await r.json();
      return d.data || item;
    }),
  );

  // 3. Fetch prices in one request
  const codes = items.map(i => i.item_code);
  const pFilters = encodeURIComponent(JSON.stringify([
    ['item_code',   'in', codes],
    ['price_list',  '=',  'Standard Selling'],
    ['selling',     '=',  1],
  ]));
  const pFields = encodeURIComponent(JSON.stringify(['item_code', 'price_list_rate']));
  const priceRes = await fetch(
    `${base}/api/resource/Item%20Price?filters=${pFilters}&fields=${pFields}&limit_page_length=500`,
    { headers },
  );
  const priceMap = {};
  if (priceRes.ok) {
    const { data: prices = [] } = await priceRes.json();
    prices.forEach(p => { priceMap[p.item_code] = p.price_list_rate; });
  }

  // 4. Shape response — no credentials leak to frontend
  const products = details.map(item => ({
    item_code:          item.item_code,
    item_name:          item.item_name,
    item_group:         item.item_group || '',
    description:        item.description || '',
    image:              item.image || '',
    custom_chinese_name: item.custom_chinese_name || '',
    talisman_categories: Array.isArray(item.custom_talisman_categories)
      ? item.custom_talisman_categories.map(c => c.category).filter(Boolean)
      : [],
    price: priceMap[item.item_code] || 0,
  }));

  return json({ products });
}

// ── /checkout ─────────────────────────────────────────────────────
async function handleCheckout(request, env) {
  let items, successUrl, cancelUrl;
  try {
    ({ items, successUrl, cancelUrl } = await request.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!Array.isArray(items) || !items.length) {
    return json({ error: 'Cart is empty' }, 400);
  }

  const params = new URLSearchParams();
  params.append('mode',        'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url',  cancelUrl);

  items.forEach((item, i) => {
    params.append(`line_items[${i}][price_data][currency]`,             'sgd');
    params.append(`line_items[${i}][price_data][product_data][name]`,   item.name);
    params.append(`line_items[${i}][price_data][unit_amount]`,          Math.round(item.price * 100));
    params.append(`line_items[${i}][quantity]`,                         String(item.qty));
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

// ── helpers ───────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
