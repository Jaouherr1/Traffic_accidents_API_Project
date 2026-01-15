from flask_smorest import Blueprint, abort
from flask import request
from db import db
from models.user import User, UserStatus
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, create_refresh_token, get_jwt_identity
from flask.views import MethodView
from decorators import admin_required
from blocklist import blocklist
from datetime import datetime, timezone, timedelta
from schemas.user import UserSchema, TokenResponseSchema, OfficerApplicationSchema, AdminApplicationSchema, LoginSchema
from passlib.hash import pbkdf2_sha256
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

blp = Blueprint("auth", __name__, description="Operations on authentication")

# --- NEW SECURITY HELPER: REMOVES ID IF ROLE IS ADMIN ---
def scrub_admin_id(data, role):
    if role == "admin":
        data.pop("id", None)
    return data

# --- SHARED EMAIL FUNCTION ---
def send_approval_email(user):
    sender_email = "jaouher.chouchane0@gmail.com"
    app_password = "gmdx vriz buei pbes"  # Your working App Password
    
    msg = MIMEMultipart()
    msg["Subject"] = f"🚨 URGENT: New Admin Approval Required ({user.username})"
    msg["From"] = sender_email
    msg["To"] = sender_email
    
    body = f"""
    <html>
        <body>
            <h2 style="color: #d9534f;">New Admin Registration Request</h2>
            <hr>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Full Name:</strong> {getattr(user, 'full_name', 'N/A')}</p>
            <p><strong>Department:</strong> {getattr(user, 'department', 'N/A')}</p>
            <p style="font-size: 1.2em;"><strong>SECRET USER ID:</strong> <code style="background: #f4f4f4; padding: 5px;">{user.id}</code></p>
            <hr>
            <p>To approve this admin, use the <b>/admin/process-admin</b> endpoint in Insomnia with the Secret ID above.</p>
        </body>
    </html>
    """
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, app_password)
            server.send_message(msg)
        print(f"Approval email sent for {user.username}")
    except Exception as e:
        print(f"Failed to send email: {e}")

# --- ROUTES ---

@blp.route("/register")
class Register(MethodView):
    @blp.arguments(UserSchema) # Use the schema for validation
    def post(self, user_data):
        # 1. Catch the 'role' from the raw request
        raw_data = request.get_json()
        requested_role = raw_data.get("role", "user").lower()
        
        # 2. Block Admin registration here
        if requested_role == "admin":
            abort(403, message="Admin registration is restricted here. Please use the secure internal setup portal.")

        # 3. Block Officer registration here (Redirect them to apply)
        if requested_role == "officer":
            abort(400, message="Officers must use the /apply-officer endpoint.")

        # 4. Standard validation
        if User.query.filter_by(username=user_data["username"]).first():
            abort(400, message="User already exists.")

        # 5. Create standard user
        user = User(
            username=user_data["username"],
            password=pbkdf2_sha256.hash(user_data["password"]),
            role="user", # Force role to user for safety
            status=UserStatus.APPROVED
        )
        db.session.add(user)
        db.session.commit()

        return {
            "message": "Registration successful.",
            "username": user.username,
            "role": user.role
        }, 201

@blp.route("/login")
class Login(MethodView):
    @blp.arguments(LoginSchema)  # Ensure you are using the simplified LoginSchema
    @blp.response(200, TokenResponseSchema)
    def post(self, user_data):
        # 1. Find user by username
        user = User.query.filter_by(username=user_data["username"]).first()

        # DEBUG PRINTS: Check your terminal after you click login
        if not user:
            print(f"DEBUG: User '{user_data['username']}' not found in database.")
        else:
            is_valid = pbkdf2_sha256.verify(user_data["password"], user.password)
            print(f"DEBUG: User found. Password valid: {is_valid}")

        # 2. Check credentials
        if user and pbkdf2_sha256.verify(user_data["password"], user.password):
            
            # --- Status check (Keep your existing feature) ---
            status_val = str(user.status.value if hasattr(user.status, 'value') else user.status).lower()

            if "pending" in status_val:
                abort(403, message="Account is still pending approval.")
            if "rejected" in status_val:
                abort(403, message="Your application was rejected.")

            # --- Ban check (Keep your existing feature) ---
            if user.banned_until and user.banned_until > datetime.now(timezone.utc):
                expiry = user.banned_until.strftime("%Y-%m-%d %H:%M:%S")
                abort(403, message=f"Account is banned until {expiry} UTC.")
            
            # 3. Success! Create tokens
            access_token = create_access_token(identity=str(user.id), fresh=True)
            refresh_token = create_refresh_token(identity=str(user.id))

            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "role": user.role,
                "username": user.username
            }, 200

        # 4. Failed Login
        abort(401, message="Invalid username or password.")
        
@blp.route("/admin/users/<string:user_id>")
class AdminUserDelete(MethodView):
    @jwt_required()
    @admin_required
    def delete(self, user_id):
        # 1. Prevent an admin from deleting themselves
        current_user_id = get_jwt_identity()
        if str(user_id) == str(current_user_id):
            abort(400, message="You cannot delete your own account.")

        user = User.query.get_or_404(user_id)

        # 2. Prevent deleting other admins (Security Rule)
        if user.role == "admin":
            abort(403, message="Administrative accounts cannot be deleted through this endpoint.")

        # 3. Perform the deletion
        db.session.delete(user)
        db.session.commit()

        return {"message": f"User '{user.username}' (Role: {user.role}) has been permanently deleted."}, 200

@blp.route("/admin/process-admin")
class ProcessAdmin(MethodView):
    @jwt_required()
    @admin_required 
    def post(self):
        data = request.get_json()
        user_id = data.get("user_id")
        action = data.get("action") 

        target_user = User.query.get_or_404(user_id)

        if target_user.role != "admin":
            abort(400, message="This endpoint is only for admin roles.")

        if action == "approve":
            target_user.status = UserStatus.APPROVED
            db.session.commit()
            return {"message": f"Admin {target_user.username} is now ACTIVE."}, 200
        
        elif action == "reject":
            db.session.delete(target_user)
            db.session.commit()
            return {"message": "Admin request deleted."}, 200
            
        abort(400, message="Invalid action.")

@blp.route("/admin/pending-officers")
class PendingOfficers(MethodView):
    @jwt_required()
    @admin_required
    def get(self):
        pending_users = User.query.filter_by(status=UserStatus.PENDING).all()
        results = []
        for u in pending_users:
            user_data = {
                "username": u.username,
                "email": u.email,
                "institution": getattr(u, 'institution', 'N/A'),
                "badge_number": getattr(u, 'badge_number', 'N/A'),
                "role_requested": u.role,
                "id": u.id # Included to be scrubbed below
            }
            # SECURITY: Remove ID if the user in the list is an admin
            scrubbed_data = scrub_admin_id(user_data, u.role)
            results.append(scrubbed_data)
            
        return {"pending_officers": results}, 200

@blp.route("/apply-officer")
class OfficerApplication(MethodView):
    @blp.arguments(OfficerApplicationSchema)
    def post(self, officer_data):
        if User.query.filter_by(username=officer_data["username"]).first():
            abort(400, message="Username already exists.")

        new_user = User(
            username=officer_data["username"],
            password=pbkdf2_sha256.hash(officer_data["password"]),
            email=officer_data["email"],
            institution=officer_data["institution"],
            badge_number=officer_data["badge_number"],
            role="user", 
            status=UserStatus.PENDING 
        )
        db.session.add(new_user)
        db.session.commit()
        return {"message": "Application submitted. Awaiting Admin approval."}, 201

@blp.route("/logout")
class UserLogout(MethodView):
    @jwt_required()
    def post(self):
        jti = get_jwt()["jti"]
        blocklist.add(jti)
        return {"message": "Successfully logged out"}, 200

@blp.route("/refresh")
class TokenRefresh(MethodView):
    @jwt_required(refresh=True)
    def post(self):
        current_user = get_jwt_identity()
        new_token = create_access_token(identity=current_user, fresh=False)
        return {"access_token": new_token}, 200

@blp.route("/admin/users/<string:user_id>/ban")
class BanUser(MethodView):
    @jwt_required()
    @admin_required
    def post(self, user_id):
        data = request.get_json()
        duration = data.get("duration")
        user = User.query.get_or_404(user_id)
        
        if user.role == "admin":
            abort(400, message="You cannot ban an administrative account.")

        now = datetime.now(timezone.utc)
        durations = {
            "1day": now + timedelta(days=1),
            "1week": now + timedelta(weeks=1),
            "permanent": datetime(9999, 12, 31, tzinfo=timezone.utc),
            "unban": None
        }

        if duration not in durations:
            abort(400, message="Invalid duration.")

        user.banned_until = durations[duration]
        db.session.commit()
        return {"message": f"Ban status updated for {user.username}."}, 200

@blp.route("/admin/process-officer")
class ProcessOfficer(MethodView):
    @jwt_required()
    @admin_required
    def post(self):
        data = request.get_json()
        user_id = data.get("user_id")
        action = data.get("action")

        user = User.query.get_or_404(user_id)
        if user.status != UserStatus.PENDING:
            abort(400, message="User is not in a pending state.")

        if action == "approve":
            user.status = UserStatus.APPROVED
            user.role = "officer"
            msg = "Approved as officer."
        elif action == "reject":
            user.status = UserStatus.REJECTED
            msg = "Application rejected."
        else:
            abort(400, message="Invalid action.")

        db.session.commit()
        return {"message": msg}, 200

@blp.route("/register-admin")
class AdminRegister(MethodView):
    @blp.arguments(AdminApplicationSchema)
    def post(self, admin_data):
        # 1. Verify the Secret Invite Code
        # Change "SECRET123" to your preferred code
        if admin_data.get("secret_invite_code") != "SECRET123":
            abort(403, message="Invalid admin invite code.")

        if User.query.filter_by(username=admin_data["username"]).first():
            abort(400, message="Username already exists.")

        # 2. Create the Admin (Automatically Approved)
        new_admin = User(
            username=admin_data["username"],
            password=pbkdf2_sha256.hash(admin_data["password"]),
            role="admin",
            status=UserStatus.PENDING,
            full_name=admin_data.get("full_name"),
            department=admin_data.get("department")
        )

        db.session.add(new_admin)
        db.session.commit()

        # 3. Optional: Send notification email to yourself
        send_approval_email(new_admin)

        return {"message": "Admin registration request submitted! It is currently PENDING approval. Please check your email."
        }, 201