const { db, reply, errorReply, requireClient, requireAdmin, readBody, ApiError } = require('./_shared');

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

async function getPlan(planId) {
  const { data, error } = await db().from('plans').select('*').eq('id', planId).single();
  if (error || !data) throw new ApiError(404, 'الباقة غير موجودة');
  return data;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function handlePlans(req, res) {
  const { data, error } = await db().from('plans').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return reply(res, 200, { ok: true, plans: data || [] });
}

async function handleStripeCheckout(req, res) {
  const { client } = await requireClient(req);
  const body = readBody(req);
  const plan = await getPlan(body.plan_id);

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, 'خدمة الدفع عبر Stripe غير مُفعّلة حالياً. يرجى التواصل مع الإدارة أو استخدام التحويل البنكي.');
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const baseUrl = getBaseUrl(req);

  const { data: payment, error: payErr } = await db().from('payments').insert({
    client_id: client.id, plan_id: plan.id, amount: plan.price, currency: plan.currency || 'SAR', method: 'stripe', status: 'pending'
  }).select().single();
  if (payErr) throw payErr;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: (plan.currency || 'SAR').toLowerCase(),
        product_data: { name: `باقة ${plan.name} — رَشّح` },
        unit_amount: Math.round(Number(plan.price) * 100)
      },
      quantity: 1
    }],
    success_url: `${baseUrl}/billing.html?status=success&payment_id=${payment.id}`,
    cancel_url: `${baseUrl}/billing.html?status=cancelled`,
    metadata: { payment_id: payment.id, client_id: client.id, plan_id: plan.id }
  });

  await db().from('payments').update({ provider_ref: session.id }).eq('id', payment.id);
  return reply(res, 200, { ok: true, checkout_url: session.url });
}

async function handleStripeWebhook(req, res) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return reply(res, 503, { detail: 'Stripe webhook not configured' });
  }
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return reply(res, 400, { detail: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const paymentId = session.metadata?.payment_id;
    const clientId = session.metadata?.client_id;
    const planId = session.metadata?.plan_id;
    if (paymentId && clientId && planId) {
      await db().from('payments').update({ status: 'completed', provider_ref: session.payment_intent || session.id, plan_expires_at: addDays(30) }).eq('id', paymentId);
      await db().from('clients').update({ plan: planId, plan_status: 'active', plan_expires_at: addDays(30) }).eq('id', clientId);
    }
  }
  return reply(res, 200, { received: true });
}

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const base = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const resp = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials'
  });
  const json = await resp.json();
  if (!json.access_token) throw new ApiError(502, 'فشل الاتصال بـ PayPal');
  return { token: json.access_token, base };
}

async function handlePaypalCheckout(req, res) {
  const { client } = await requireClient(req);
  const body = readBody(req);
  const plan = await getPlan(body.plan_id);

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new ApiError(503, 'خدمة الدفع عبر PayPal غير مُفعّلة حالياً. يرجى التواصل مع الإدارة أو استخدام التحويل البنكي.');
  }

  const { data: payment, error: payErr } = await db().from('payments').insert({
    client_id: client.id, plan_id: plan.id, amount: plan.price, currency: plan.currency || 'SAR', method: 'paypal', status: 'pending'
  }).select().single();
  if (payErr) throw payErr;

  const { token, base } = await paypalAccessToken();
  const baseUrl = getBaseUrl(req);

  const orderResp = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ custom_id: payment.id, amount: { currency_code: 'USD', value: (Number(plan.price) / 3.75).toFixed(2) }, description: `باقة ${plan.name} — رَشّح` }],
      application_context: { return_url: `${baseUrl}/api/payments?resource=paypal-capture&payment_id=${payment.id}`, cancel_url: `${baseUrl}/billing.html?status=cancelled` }
    })
  });
  const order = await orderResp.json();
  if (!order.id) throw new ApiError(502, 'فشل إنشاء طلب PayPal');

  await db().from('payments').update({ provider_ref: order.id }).eq('id', payment.id);
  const approveLink = (order.links || []).find(l => l.rel === 'approve');
  return reply(res, 200, { ok: true, checkout_url: approveLink?.href });
}

async function handlePaypalCapture(req, res) {
  const paymentId = req.query.payment_id;
  const token_paypal = req.query.token;
  if (!paymentId || !token_paypal) return reply(res, 400, { detail: 'بيانات غير مكتملة' });

  const { data: payment } = await db().from('payments').select('*').eq('id', paymentId).single();
  if (!payment) return reply(res, 404, { detail: 'عملية الدفع غير موجودة' });

  const { token, base } = await paypalAccessToken();
  const captureResp = await fetch(`${base}/v2/checkout/orders/${token_paypal}/capture`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const capture = await captureResp.json();
  const baseUrl = getBaseUrl(req);

  if (capture.status === 'COMPLETED') {
    await db().from('payments').update({ status: 'completed', plan_expires_at: addDays(30) }).eq('id', paymentId);
    await db().from('clients').update({ plan: payment.plan_id, plan_status: 'active', plan_expires_at: addDays(30) }).eq('id', payment.client_id);
    res.writeHead(302, { Location: `${baseUrl}/billing.html?status=success` });
    return res.end();
  }
  await db().from('payments').update({ status: 'failed' }).eq('id', paymentId);
  res.writeHead(302, { Location: `${baseUrl}/billing.html?status=failed` });
  return res.end();
}

async function handleBankTransfer(req, res) {
  const { client } = await requireClient(req);
  const body = readBody(req);
  const plan = await getPlan(body.plan_id);

  const { data: payment, error } = await db().from('payments').insert({
    client_id: client.id, plan_id: plan.id, amount: plan.price, currency: plan.currency || 'SAR',
    method: 'bank_transfer', status: 'pending', proof_url: body.proof_url || null, notes: body.notes || null
  }).select().single();
  if (error) throw error;

  await db().from('clients').update({ plan_status: 'pending' }).eq('id', client.id);
  return reply(res, 200, { ok: true, detail: 'تم استلام طلب التحويل البنكي، سيتم تفعيل باقتك بعد المراجعة والتأكيد.', payment });
}

async function handleMyPayments(req, res) {
  const { client } = await requireClient(req);
  const { data, error } = await db().from('payments').select('*').eq('client_id', client.id).order('created_at', { ascending: false });
  if (error) throw error;
  return reply(res, 200, { ok: true, payments: data || [] });
}

async function handleAdminPayments(req, res) {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const { data, error } = await db().from('payments').select(`*, client:clients ( company_name, email )`).order('created_at', { ascending: false });
    if (error) throw error;
    return reply(res, 200, { ok: true, payments: data || [] });
  }
  if (req.method === 'PUT') {
    const body = readBody(req);
    if (!body.id || !body.status) return reply(res, 400, { detail: 'المعرّف والحالة مطلوبان' });
    const { data: payment, error: getErr } = await db().from('payments').select('*').eq('id', body.id).single();
    if (getErr || !payment) return reply(res, 404, { detail: 'عملية الدفع غير موجودة' });

    const updates = { status: body.status, notes: body.notes || payment.notes };
    if (body.status === 'completed') updates.plan_expires_at = addDays(30);

    const { data, error } = await db().from('payments').update(updates).eq('id', body.id).select().single();
    if (error) throw error;

    if (body.status === 'completed') {
      await db().from('clients').update({ plan: payment.plan_id, plan_status: 'active', plan_expires_at: addDays(30) }).eq('id', payment.client_id);
    } else if (body.status === 'rejected') {
      await db().from('clients').update({ plan_status: 'active' }).eq('id', payment.client_id);
    }
    return reply(res, 200, { ok: true, payment: data });
  }
  return reply(res, 405, { detail: 'Method not allowed' });
}

module.exports = async (req, res) => {
  try {
    const resource = req.query.resource;
    if (resource === 'plans') return await handlePlans(req, res);
    if (resource === 'checkout-stripe' && req.method === 'POST') return await handleStripeCheckout(req, res);
    if (resource === 'webhook-stripe' && req.method === 'POST') return await handleStripeWebhook(req, res);
    if (resource === 'checkout-paypal' && req.method === 'POST') return await handlePaypalCheckout(req, res);
    if (resource === 'paypal-capture') return await handlePaypalCapture(req, res);
    if (resource === 'bank-transfer' && req.method === 'POST') return await handleBankTransfer(req, res);
    if (resource === 'my-payments') return await handleMyPayments(req, res);
    if (resource === 'admin-payments') return await handleAdminPayments(req, res);
    return reply(res, 400, { detail: 'مورد غير معروف' });
  } catch (error) {
    return errorReply(res, error);
  }
};
