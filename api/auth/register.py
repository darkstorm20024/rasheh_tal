import os
import json
from supabase import create_client
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))

            company_name = body["company_name"].strip()
            contact_name = body["contact_name"].strip()
            email = body["email"].strip().lower()
            phone = body["phone"].strip()
            password = body["password"]

            auth = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })

            supabase.table("clients").insert({
                "auth_user_id": auth.user.id,
                "company_name": company_name,
                "contact_name": contact_name,
                "email": email,
                "phone": phone,
                "credits_balance": 2
            }).execute()

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": "تم إنشاء الحساب وإضافة 2 CV مجانية. سجل الدخول الآن."
            }, ensure_ascii=False).encode("utf-8"))

        except Exception as error:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "detail": str(error)
            }, ensure_ascii=False).encode("utf-8"))
