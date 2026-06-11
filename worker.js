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

    if (pathname === '/orders' && request.method === 'GET') {
      return handleOrders(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};

// ── /products ─────────────────────────────────────────────────────
async function handleProducts(request, env) {
  const cache    = caches.default;
  const cacheKey = new Request('https://divineway.kah-yan.workers.dev/products?v=2');

  // ?bust=<timestamp> from the client means: skip cache, fetch fresh, then repopulate cache.
  // caches.default.delete() only evicts the local PoP; bust param is the reliable cross-PoP fix.
  const bustParam = new URL(request.url).searchParams.has('bust');
  if (!bustParam) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

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
        ['warehouse', '=', 'ECommerce - DF'],
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

  // qty from ECommerce - DF warehouse only
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
  params.append('currency',    'sgd');
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

  const today = new Date().toISOString().split('T')[0];

  // Create Sales Invoice (draft)
  const createRes = await fetch(`${base}/api/resource/Sales Invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer,
      company:      'Divineway Fengshui',
      posting_date: today,
      due_date:     today,
      debit_to:     'Debtors - DF',
      update_stock: 1,
      remarks: `Paid via Stripe. Session: ${sessionId || 'N/A'}`,
      items: items.map(i => ({
        item_code:      i.sku,
        qty:            i.qty,
        rate:           i.price,
        income_account: 'Sales - DF',
        warehouse:      'ECommerce - DF',
      })),
    }),
  });
  if (!createRes.ok) {
    let errBody = {};
    try { errBody = await createRes.json(); } catch { /* ignore */ }
    const msgs = errBody._server_messages
      ? JSON.parse(errBody._server_messages).map(m => (typeof m === 'string' ? JSON.parse(m).message : m.message)).join(' | ')
      : null;
    return json({
      step:  'create',
      error: msgs || errBody.exception || errBody.message || `ERPNext ${createRes.status}`,
    }, 502);
  }
  const { data: invoice } = await createRes.json();

  // Fetch full document then submit
  const getRes = await fetch(
    `${base}/api/resource/Sales Invoice/${encodeURIComponent(invoice.name)}`,
    { headers },
  );
  if (!getRes.ok) return json({ step: 'fetch', invoice: invoice.name, error: 'Could not fetch draft invoice' }, 502);
  const { data: fullDoc } = await getRes.json();

  const submitRes = await fetch(`${base}/api/method/frappe.client.submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doc: JSON.stringify(fullDoc) }),
  });
  if (!submitRes.ok) {
    let submitErr = {};
    try { submitErr = await submitRes.json(); } catch { /* ignore */ }
    const msgs = submitErr._server_messages
      ? JSON.parse(submitErr._server_messages).map(m => (typeof m === 'string' ? JSON.parse(m).message : m.message)).join(' | ')
      : null;
    return json({
      step:    'submit',
      invoice: invoice.name,
      error:   msgs || submitErr.exception || submitErr.message || `ERPNext ${submitRes.status}`,
    }, 502);
  }

  // ── Payment Entry — marks the invoice as Paid ──────────────────
  const grandTotal = fullDoc.grand_total || items.reduce((s, i) => s + i.price * i.qty, 0);
  const paidTo     = 'Stripe - DF';

  let paymentName  = null;
  let paymentError = null;

  const peCreateRes = await fetch(`${base}/api/resource/Payment Entry`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      company:          'Divineway Fengshui',
      payment_type:     'Receive',
      mode_of_payment:  'Stripe',
      party_type:       'Customer',
      party:            customer,
      posting_date:     today,
      paid_from:        'Debtors - DF',
      paid_to:          paidTo,
      paid_amount:      grandTotal,
      received_amount:  grandTotal,
      reference_no:     sessionId || '',
      reference_date:   today,
      remarks:          `Stripe Payment. Session: ${sessionId || 'N/A'}`,
      references: [{
        reference_doctype:  'Sales Invoice',
        reference_name:     invoice.name,
        total_amount:       grandTotal,
        outstanding_amount: grandTotal,
        allocated_amount:   grandTotal,
      }],
    }),
  });

  if (peCreateRes.ok) {
    const { data: pe } = await peCreateRes.json();
    paymentName = pe.name;

    const peGetRes = await fetch(`${base}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, { headers });
    if (peGetRes.ok) {
      const { data: peDoc } = await peGetRes.json();
      const peSubmitRes = await fetch(`${base}/api/method/frappe.client.submit`, {
        method: 'POST',
        headers,
        body:   JSON.stringify({ doc: JSON.stringify(peDoc) }),
      });
      if (!peSubmitRes.ok) {
        let e = {};
        try { e = await peSubmitRes.json(); } catch { /* ignore */ }
        paymentError = e.exception || e.message || 'Payment entry submit failed';
      }
    }
  } else {
    let e = {};
    try { e = await peCreateRes.json(); } catch { /* ignore */ }
    const msgs = e._server_messages
      ? JSON.parse(e._server_messages).map(m => (typeof m === 'string' ? JSON.parse(m).message : m.message)).join(' | ')
      : null;
    paymentError = msgs || e.exception || e.message || 'Payment entry creation failed';
  }

  // Bust product cache so stock qty reflects the deduction immediately
  const cache    = caches.default;
  const cacheKey = new Request('https://divineway.kah-yan.workers.dev/products?v=2');
  await cache.delete(cacheKey);

  return json({
    invoice:      invoice.name,
    submitted:    true,
    payment:      paymentName,
    paymentError: paymentError || undefined,
  });
}

// ── /orders ───────────────────────────────────────────────────────
async function handleOrders(request, env) {
  const url      = new URL(request.url);
  const customer = url.searchParams.get('customer');
  const uid      = url.searchParams.get('uid');

  if (!customer || !uid) return json({ error: 'customer and uid required' }, 400);

  const base    = env.ERPNEXT_BASE_URL;
  const headers = {
    'Authorization': `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`,
    'Content-Type':  'application/json',
  };

  // Security: verify this customer was created for this Firebase UID
  const custRes = await fetch(
    `${base}/api/resource/Customer/${encodeURIComponent(customer)}`,
    { headers },
  );
  if (!custRes.ok) return json({ error: 'Customer not found' }, 404);
  const { data: custDoc } = await custRes.json();
  if (!String(custDoc.customer_details || '').includes(`firebase:${uid}`)) {
    return json({ error: 'Unauthorized' }, 403);
  }

  // Fetch submitted Sales Invoices for this customer
  const invFilters = encodeURIComponent(JSON.stringify([
    ['customer',  '=', customer],
    ['docstatus', '=', 1],
  ]));
  const invFields = encodeURIComponent(JSON.stringify([
    'name', 'posting_date', 'grand_total', 'status',
  ]));
  const invRes = await fetch(
    `${base}/api/resource/Sales Invoice?filters=${invFilters}&fields=${invFields}&limit_page_length=50&order_by=posting_date%20desc`,
    { headers },
  );
  if (!invRes.ok) return json({ error: 'Failed to fetch invoices' }, 502);
  const { data: invoices = [] } = await invRes.json();

  if (!invoices.length) return json({ orders: [] });

  // Fetch all line items for these invoices in one query
  const names      = invoices.map(i => i.name);
  const itemFilter = encodeURIComponent(JSON.stringify([['parent', 'in', names]]));
  const itemFields = encodeURIComponent(JSON.stringify([
    'parent', 'item_name', 'item_code', 'qty', 'rate',
  ]));
  const itemRes = await fetch(
    `${base}/api/resource/Sales Invoice Item?filters=${itemFilter}&fields=${itemFields}&limit_page_length=500`,
    { headers },
  );
  const itemMap = {};
  if (itemRes.ok) {
    const { data: rows = [] } = await itemRes.json();
    rows.forEach(r => {
      if (!itemMap[r.parent]) itemMap[r.parent] = [];
      itemMap[r.parent].push({ item_name: r.item_name, item_code: r.item_code, qty: r.qty, rate: r.rate });
    });
  }

  const orders = invoices.map(inv => ({
    name:   inv.name,
    date:   inv.posting_date,
    total:  inv.grand_total,
    status: inv.status,
    items:  itemMap[inv.name] || [],
  }));

  return json({ orders });
}

// ── helpers ───────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
