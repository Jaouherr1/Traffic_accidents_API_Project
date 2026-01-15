from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User, UserStatus
from schemas.user import UserSchema, LeaderboardUserSchema, AdminApplicationSchema # Ensure these exist in schemas
from decorators import admin_required
from db import db
from flask import request
from werkzeug.security import generate_password_hash

blp = Blueprint("Users", __name__, description="Operations on users")

@blp.route("/profile")
class UserProfile(MethodView):
    @jwt_required()
    @blp.response(200, UserSchema)
    def get(self):
        """Get the current user's points and badges"""
        user_id = get_jwt_identity()
        return User.query.get_or_404(user_id)

@blp.route("/leaderboard")
class Leaderboard(MethodView):
    # Use the specific Leaderboard schema we created
    @blp.response(200, LeaderboardUserSchema(many=True))
    def get(self):
        """List the top 10 users with their rank and badges"""
        users = User.query.order_by(User.points.desc()).limit(10).all()
        
        # Add a dynamic rank to each user object for the response
        for index, user in enumerate(users):
            user.rank = index + 1
            
        return users

@blp.route("/admin/users")
class AdminUserList(MethodView):
    @jwt_required()
    @admin_required
    @blp.response(200, UserSchema(many=True))
    def get(self):
        """Admin only: List all users in the system"""
        return User.query.all()
    
@blp.route("/admin/users/<string:user_id>/status")
class AdminUserStatus(MethodView):
    @jwt_required()
    @admin_required
    def put(self, user_id):
        """Admin only: Approve or Reject a pending officer"""
        data = request.get_json() # Expecting {"status": "approved"} or {"status": "rejected"}
        user = User.query.get_or_404(user_id)

        new_status = data.get("status").lower()
        
        if new_status == "approved":
            user.status = UserStatus.APPROVED
        elif new_status == "rejected":
            user.status = UserStatus.REJECTED
        else:
            abort(400, message="Invalid status. Use 'approved' or 'rejected'.")

        db.session.commit()
        
        # Here is where you would trigger a real email to the officer
        print(f"NOTIFICATION: User {user.username} has been {new_status}!")
        
        return {"message": f"User account {new_status}."}, 200
    
@blp.route("/register-admin") # This is a secret URL
class AdminRegister(MethodView):
    @blp.arguments(AdminApplicationSchema) # This triggers the password validation
    def post(self, data):
        # 1. Check the Secret Code manually
        # You can change 'SECRET123' to your own code
        if data.get("secret_invite_code") != "SECRET123":
            abort(403, message="Invalid admin invite code.")

        if User.query.filter_by(username=data["username"]).first():
            abort(400, message="Username already exists.")

        # 2. Create the Admin
        new_admin = User(
            username=data["username"],
            password=generate_password_hash(data["password"]),
            role="admin",
            status=UserStatus.APPROVED,
            full_name=data.get("full_name"),
            department=data.get("department")
        )

        db.session.add(new_admin)
        db.session.commit()
        
        return {"message": "Admin account created successfully!"}, 201