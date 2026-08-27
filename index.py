import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").lower().strip()

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY")

admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
app = FastAPI(title="Rasheh Talent API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PLANS = {
    "starter": {"name": "باقة الانطلاق", "price": 199, "credits": 5},
    "pro": {"name": "باقة الشركات المتقدمة", "price": 699, "credits": 25},
    "enterprise": {"name": "باقة التوظيف المفتوحة", "price": 1999, "credits": 100},
}
PUBLIC_FIELDS = "id,full_name,first_name,job_title,city,work_type,gender,years_of_experience,education,expected_salary,skills,status,created_at"


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def token_from_header(authorization: Optional[str]):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="يرجى تسجيل الدخول أولاً.")
    return authorization.split(" ", 1)[1].strip()


def auth_user(authorization: Optional[str]):
    token = token_from_header(authorization)
    try:
        res = admin.auth.get_user(token)
        user = res.user
        if not user:
            raise ValueError("No user")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="انتهت جلسة الدخول. سجل دخولك مرة أخرى.")


def profile_for(user_id: str):
    res = admin.table("clients").select("*").eq("auth_user_id", user_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=403, detail="لا يوجد ملف شركة مرتبط بهذا الحساب.")
    return res.data[0]


class RegisterPayload(BaseModel):
    company_name: str = Field(min_length=2, max_length=150)
    contact_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=6, max_length=100)


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class MatchPayload(BaseModel):
    job_title: str = ""
    city: str = ""
    work_type: str = ""
    min_experience: int = 0
    skills: list[str] = []


class UnlockPayload(BaseModel):
    candidate_id: str


class PurchasePayload(BaseModel):
    plan_id: str
    sender_name: str = Field(min_length=2, max_length=150)
    sender_bank: str = Field(min_length=2, max_length=150)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "Rasheh Talent", "time": utcnow()}


@app.post("/api/auth/register")
def register(payload: RegisterPayload):
    try:
        auth_res = admin.auth.admin.create_user({
            "email": str(payload.email).lower(),
            "password": payload.password,
            "email_confirm": True,
        })
        user = auth_res.user
        admin.table("clients").insert({
            "auth_user_id": user.id,
            "company_name": payload.company_name.strip(),
            "contact_name": payload.contact_name.strip(),
            "email": str(payload.email).lower(),
            "phone": payload.phone.strip(),
            "credits_balance": 2,
        }).execute()
        return {"success": True, "message": "تم إنشاء الحساب وإضافة 2 CV مجانية. سجل الدخول الآن."}
    except Exception as e:
        msg = str(e)
        if "already" in msg.lower() or "duplicate" in msg.lower():
            msg = "البريد مسجل بالفعل. استخدم تسجيل الدخول."
        raise HTTPException(status_code=400, detail=msg)


@app.post("/api/auth/login")
def login(payload: LoginPayload):
    try:
        session = admin.auth.sign_in_with_password({"email": str(payload.email).lower(), "password": payload.password})
        auth_id = session.user.id
        profile = profile_for(auth_id)
        return {
            "success": True,
            "access_token": session.session.access_token,
            "user": {
                "company_name": profile["company_name"],
                "contact_name": profile["contact_name"],
                "email": profile["email"],
                "credits_balance": profile["credits_balance"],
                "is_admin": profile["email"].lower() == ADMIN_EMAIL if ADMIN_EMAIL else False,
            },
        }
    except Exception:
        raise HTTPException(status_code=401, detail="البريد أو كلمة المرور غير صحيحة.")


@app.get("/api/me")
def me(authorization: Optional[str] = Header(None)):
    user = auth_user(authorization)
    profile = profile_for(user.id)
    return {"user": {"company_name": profile["company_name"], "contact_name": profile["contact_name"], "email": profile["email"], "credits_balance": profile["credits_balance"], "is_admin": profile["email"].lower() == ADMIN_EMAIL if ADMIN_EMAIL else False}}


@app.post("/api/match-candidates")
def match_candidates(payload: MatchPayload, authorization: Optional[str] = Header(None)):
    user = auth_user(authorization)
    profile = profile_for(user.id)
    query = admin.table("candidates").select(PUBLIC_FIELDS).eq("status", "active")
    if payload.city.strip():
        query = query.ilike("city", f"%{payload.city.strip()}%")
    if payload.work_type.strip():
        query = query.eq("work_type", payload.work_type.strip())
    if payload.min_experience > 0:
        query = query.gte("years_of_experience", payload.min_experience)
    raw = query.limit(300).execute().data or []
    title = payload.job_title.strip().lower()
    wanted_skills = [s.strip().lower() for s in payload.skills if s.strip()]
    result = []
    for c in raw:
        skills = c.get("skills") or []
        if isinstance(skills, str):
            skills = [skills]
        haystack = " ".join([str(c.get("job_title") or ""), str(c.get("education") or ""), " ".join(map(str, skills))]).lower()
        if title and title not in haystack:
            terms = [t for t in title.split() if len(t) >= 3]
            if not any(t in haystack for t in terms):
                continue
        matched = sum(1 for s in wanted_skills if s in haystack)
        score = 55 + min(int(c.get("years_of_experience") or 0) * 2, 20) + min(matched * 8, 20)
        if title:
            score += 15
        c["match_percentage"] = min(score, 99)
        result.append(c)
    result.sort(key=lambda x: (x["match_percentage"], x.get("years_of_experience") or 0), reverse=True)
    admin.table("search_logs").insert({
        "client_id": profile["id"], "job_title": payload.job_title, "city": payload.city or None,
        "work_type": payload.work_type or None, "min_experience": payload.min_experience,
        "skills_requested": payload.skills, "results_count": len(result),
    }).execute()
    return {"total": len(result), "candidates": result[:50]}


@app.post("/api/unlock")
def unlock(payload: UnlockPayload, authorization: Optional[str] = Header(None)):
    user = auth_user(authorization)
    profile = profile_for(user.id)
    prior = admin.table("contact_requests").select("id").eq("client_id", profile["id"]).eq("candidate_id", payload.candidate_id).eq("status", "unlocked").limit(1).execute()
    candidate_res = admin.table("candidates").select("id,full_name,phone,email,resume_url,job_title,city").eq("id", payload.candidate_id).limit(1).execute()
    if not candidate_res.data:
        raise HTTPException(status_code=404, detail="المرشح غير موجود.")
    candidate = candidate_res.data[0]
    if not prior.data:
        balance = int(profile.get("credits_balance") or 0)
        if balance < 1:
            return {"success": False, "error_code": "NO_CREDITS", "message": "رصيدك غير كافٍ. يرجى شحن باقة."}
        admin.table("clients").update({"credits_balance": balance - 1}).eq("id", profile["id"]).execute()
        admin.table("contact_requests").insert({"client_id": profile["id"], "candidate_id": payload.candidate_id, "status": "unlocked", "paid_amount": 1}).execute()
        balance -= 1
    else:
        balance = int(profile.get("credits_balance") or 0)
    return {"success": True, "new_balance": balance, "candidate": candidate}


@app.post("/api/purchase")
def purchase(payload: PurchasePayload, authorization: Optional[str] = Header(None)):
    user = auth_user(authorization)
    profile = profile_for(user.id)
    plan = PLANS.get(payload.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="الباقة غير صالحة.")
    # A UUID is mandatory in candidate_id in the current schema. We use one as a transaction placeholder.
    # This request is pending; no credits are granted until the business verifies the bank transfer.
    import uuid
    admin.table("contact_requests").insert({
        "client_id": profile["id"], "candidate_id": str(uuid.uuid4()), "status": f"bank_pending:{payload.plan_id}:{payload.sender_bank}:{payload.sender_name}", "paid_amount": plan["price"],
    }).execute()
    return {"success": True, "message": f"تم تسجيل طلب تحويل {plan['name']} بقيمة {plan['price']} ريال. لن يضاف الرصيد إلا بعد مراجعة التحويل."}


@app.get("/api/admin/stats")
def stats(authorization: Optional[str] = Header(None)):
    user = auth_user(authorization)
    profile = profile_for(user.id)
    if ADMIN_EMAIL and profile["email"].lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="هذه الصفحة للمشرف فقط.")
    c = admin.table("candidates").select("id", count="exact").execute().count or 0
    companies = admin.table("clients").select("id", count="exact").execute().count or 0
    unlocked = admin.table("contact_requests").select("id", count="exact").eq("status", "unlocked").execute().count or 0
    return {"total_candidates": c, "total_companies": companies, "total_unlocked": unlocked}
