const { createClient } = require('@supabase/supabase-js');
function env(name) { const value = process.env[name]; if (!value) throw new Error(`Missing ${name} in Vercel Environment Variables`); return value; }
function admin() { return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }); }
function anon() { return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { auth: { persistSession: false } }); }
function reply(res, status, body) { res.status(status).json(body); }
function method(req, res, allowed) { if (req.method !== allowed) { reply(res,405,{detail:`Use ${allowed}`}); return false; } return true; }
async function currentUser(req) { const h=req.headers.authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):''; if(!token) throw new Error('يرجى تسجيل الدخول أولاً.'); const {data,error}=await anon().auth.getUser(token); if(error || !data.user) throw new Error('انتهت جلسة الدخول.'); return data.user; }
async function profile(userId) { const {data,error}=await admin().from('clients').select('*').eq('auth_user_id',userId).single(); if(error||!data) throw new Error('لا يوجد ملف شركة لهذا الحساب.'); return data; }
module.exports={admin,anon,reply,method,currentUser,profile};
