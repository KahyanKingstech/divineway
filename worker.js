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
      return handleProducts(request, env);
    }

    if (pathname === '/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }

    if (pathname === '/customer' && request.method === 'POST') {
      return handleCustomer(request, env);
    }

    if (pathname === '/invoice' && request.method === 'POST') {
      return handleInvoice(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};

// ── /products ─────────────────────────────────────────────────────
async function handleProducts(request, env) {
  // Serve from Cloudflare edge cache if available (5 min TTL)
  const cache    = caches.default;
  const cacheKey = new Request('https://divineway.kah-yan.workers.dev/products?v=2');
  const cached   = await cache.match(cacheKey);
  if (cached) return cached;

  const base    = env.ERPNEXT_BASE_URL;
  const headers = {
    'Authorization': `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`,
    'Content-Type':  'application/json',
  };

  // 1. Fetch item list (include is_stock_item for stock filtering)
  const filters = encodeURIComponent(JSON.stringify([
    ['disabled',       '=', 0],
    ['is_sales_item',  '=', 1],
  ]));
  const fields = encodeURIComponent(JSON.stringify([
    'name', 'item_name', 'item_code', 'item_group',
    'description', 'image', 'custom_chinese_name', 'is_stock_item',
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

  // 2. Fetch item details, prices, and bin stock in parallel
  const codes      = items.map(i => i.item_code);
  const stockCodes = items.filter(i => i.is_stock_item).map(i => i.item_code);

  const pFilters = encodeURIComponent(JSON.stringify([
    ['item_code',  'in', codes],
    ['price_list', '=',  'Standard Selling'],
    ['selling',    '=',  1],
  ]));
  const pFields = encodeURIComponent(JSON.stringify(['item_code', 'price_list_rate']));

  const bFilters = stockCodes.length
    ? encodeURIComponent(JSON.stringify([
        ['item_code', 'in', stockCodes],
        ['warehouse', '=', 'ECommerce - WOB'],
      ]))
    : null;
  const bFields = encodeURIComponent(JSON.stringify(['item_code', 'actual_qty']));

  const [details, priceRes, binRes] = await Promise.all([
    Promise.all(items.map(async item => {
      const r = await fetch(
        `${base}/api/resource/Item/${encodeURIComponent(item.item_code)}`,
        { headers },
      );
      if (!r.ok) return item;
      const d = await r.json();
      return d.data || item;
    })),
    fetch(
      `${base}/api/resource/Item%20Price?filters=${pFilters}&fields=${pFields}&limit_page_length=500`,
      { headers },
    ),
    bFilters
      ? fetch(`${base}/api/resource/Bin?filters=${bFilters}&fields=${bFields}&limit_page_length=500`, { headers })
      : Promise.resolve(null),
  ]);

  const priceMap = {};
  if (priceRes.ok) {
    const { data: prices = [] } = await priceRes.json();
    prices.forEach(p => { priceMap[p.item_code] = p.price_list_rate; });
  }

  // qty from ECommerce - WOB warehouse only
  const stockMap = {};
  if (binRes && binRes.ok) {
    const { data: bins = [] } = await binRes.json();
    bins.forEach(b => { stockMap[b.item_code] = b.actual_qty || 0; });
  }

  // 3. Shape response — filter out stock items with no stock
  const products = details
    .filter(item => {
      if (!item.is_stock_item) return true;       // service item — always show
      return (stockMap[item.item_code] || 0) > 0; // stock item — only if in stock
    })
    .map(item => ({
      item_code:           item.item_code,
      item_name:           item.item_name,
      item_group:          item.item_group || '',
      description:         item.description || '',
      image:               item.image
                             ? (item.image.startsWith('http') ? item.image : base + item.image)
                             : '',
      custom_chinese_name: item.custom_chinese_name || '',
      talisman_categories: Array.isArray(item.custom_talisman_categories)
        ? item.custom_talisman_categories.map(c => c.category).filter(Boolean)
        : [],
      price:        priceMap[item.item_code] || 0,
      is_stock_item: item.is_stock_item ? 1 : 0,
      qty:           item.is_stock_item ? (stockMap[item.item_code] || 0) : null,
    }));

  // Cache for 5 minutes
  const response = json({ products });
  const toCache  = new Response(response.body, response);
  toCache.headers.set('Cache-Control', 'public, max-age=300');
  await cache.put(cacheKey, toCache);

  return response;
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

// ── /customer ─────────────────────────────────────────────────────
async function handleCustomer(request, env) {
  let uid, name, email;
  try { ({ uid, name, email } = await request.json()); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!uid || !email) return json({ error: 'uid and email required' }, 400);

  const base    = env.ERPNEXT_BASE_URL;
  const headers = {
    'Authorization': `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`,
    'Content-Type':  'application/json',
  };

  // Find existing customer by Firebase UID stored in customer_details
  const searchFilters = encodeURIComponent(JSON.stringify([['customer_details', 'like', `%firebase:${uid}%`]]));
  const searchFields  = encodeURIComponent(JSON.stringify(['name', 'customer_name']));
  const searchRes = await fetch(
    `${base}/api/resource/Customer?filters=${searchFilters}&fields=${searchFields}&limit_page_length=1`,
    { headers },
  );
  if (searchRes.ok) {
    const { data = [] } = await searchRes.json();
    if (data.length) return json({ customer: data[0].name, created: false });
  }

  // Create new customer
  const createRes = await fetch(`${base}/api/resource/Customer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer_name:    name || email,
      customer_type:    'Individual',
      customer_group:   'Individual',
      customer_details: `firebase:${uid}\nemail: ${email}`,
    }),
  });
  if (!createRes.ok) return json({ error: 'Failed to create customer' }, 502);
  const { data } = await createRes.json();
  return json({ customer: data.name, created: true });
}

// ── /invoice ──────────────────────────────────────────────────────
async function handleInvoice(request, env) {
  let customer, items, sessionId;
  try { ({ customer, items, sessionId } = await request.json()); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!customer || !Array.isArray(items) || !items.length) return json({ error: 'customer and items required' }, 400);

  const base    = env.ERPNEXT_BASE_URL;
  const headers = {
    'Authorization': `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`,
    'Content-Type':  'application/json',
  };

  // Create Sales Invoice (draft)
  const createRes = await fetch(`${base}/api/resource/Sales Invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer,
      update_stock: 1,
      remarks: `Paid via Stripe. Session: ${sessionId || 'N/A'}`,
      items: items.map(i => ({
        item_code: i.sku,
        qty:       i.qty,
        rate:      i.price,
        warehouse: 'ECommerce - WOB',
      })),
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    return json({ error: err.exception || 'Failed to create invoice' }, 502);
  }
  const { data: invoice } = await createRes.json();

  // Fetch full document then submit via frappe.client.submit
  const getRes = await fetch(
    `${base}/api/resource/Sales Invoice/${encodeURIComponent(invoice.name)}`,
    { headers },
  );
  if (!getRes.ok) return json({ invoice: invoice.name, submitted: false, error: 'Could not fetch draft invoice' }, 502);
  const { data: fullDoc } = await getRes.json();

  const submitRes = await fetch(`${base}/api/method/frappe.client.submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doc: JSON.stringify(fullDoc) }),
  });
  if (!submitRes.ok) {
    const submitErr = await submitRes.json().catch(() => ({}));
    return json({ invoice: invoice.name, submitted: false, error: submitErr.exception || submitErr.message || 'Submit failed' }, 502);
  }

  return json({ invoice: invoice.name, submitted: true });
}

// ── helpers ───────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
