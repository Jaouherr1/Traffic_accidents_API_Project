from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import db
from models.user import User
from models.checkin import CheckIn
from schemas.checkin import CheckInSchema
from utils.gamification import add_points

blp = Blueprint("Navigation", __name__, description="Safe zone check-ins")

@blp.route("/safe-checkin")
class SafeCheckIn(MethodView):
    
    @jwt_required()
    @blp.response(200, CheckInSchema(many=True))
    def get(self):
        """List all recent safe zone check-ins"""
        return CheckIn.query.order_by(CheckIn.created_at.desc()).all()

    @jwt_required()
    @blp.arguments(CheckInSchema)
    def post(self, checkin_data):
        """Create a check-in and earn points"""
        user_id = get_jwt_identity()
        user = User.query.get_or_404(user_id)
        
        # 1. Create the database record
        new_checkin = CheckIn(
            user_id=user_id,
            latitude=checkin_data["latitude"],
            longitude=checkin_data["longitude"],
            location_name=checkin_data.get("location_name", "Unknown Location")
        )
        
        # 2. Award points
        add_points(user, 2, "Safe Zone Confirmation")
        
        try:
            db.session.add(new_checkin)
            db.session.commit()
        except Exception:
            db.session.rollback()
            abort(500, message="Error saving check-in.")
        
        return {
            "message": "Check-in successful! +2 points awarded.",
            "location": new_checkin.location_name
        }, 201