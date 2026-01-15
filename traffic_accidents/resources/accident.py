import os
from flask import request
from werkzeug.utils import secure_filename
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
from db import db
from models.accident import Accident
from schemas.accident import AccidentSchema
from models.user import User 
from decorators import officer_required, admin_required
from utils.gamification import add_points # Ensure these are imported

blp = Blueprint("Accidents", __name__, description="Operations on accidents")

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@blp.route("/accidents")
class AccidentList(MethodView):
    
    @blp.response(200, AccidentSchema(many=True))
    def get(self):
        return Accident.query.order_by(Accident.created_at.desc()).all()

    @jwt_required()
    @blp.response(201, AccidentSchema)
    def post(self):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            abort(401, message="Invalid user. Please login again.")

        # DATA PARSING
        data = request.form.to_dict()
        file = request.files.get('photo')

        try:
            lat = float(data.get("latitude", 0))
            lng = float(data.get("longitude", 0))
            deaths = int(data.get("casualties_dead", 0))
            injuries = int(data.get("casualties_injured", 0))
            severity = int(data.get("severity", 1))
            description = data.get("description", "")
        except (ValueError, TypeError):
            abort(400, message="Latitude, longitude, deaths, injuries, and severity must be numbers.")

        # VALIDATION

        if deaths > 0 and severity < 4:
            abort(400, message="Fatalities reported. Severity must be 4 or 5.")

        if len(description) < 10:
            abort(400, message="Description must be at least 10 characters long.")

        # COOLDOWN CHECK
        cooldown_time = datetime.utcnow() - timedelta(minutes=2)
        recent = Accident.query.filter(
            Accident.user_id == current_user_id,
            Accident.created_at >= cooldown_time
        ).first()
        if recent:
            abort(429, message="Please wait 2 minutes before reporting again.")

        # PHOTO HANDLING
        photo_filename = None
        if file:
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_name = f"{datetime.utcnow().timestamp()}_{filename}"
                try:
                    file.save(os.path.join(UPLOAD_FOLDER, unique_name))
                    photo_filename = unique_name
                except Exception as e:
                    abort(500, message=f"Error saving photo: {e}")
            else:
                abort(400, message="Invalid photo format.")

        # SCORING LOGIC FOR NEW POST
        is_first = Accident.query.filter_by(user_id=current_user_id).count() == 0

        # DATABASE SAVE
        try:
            new_accident = Accident(
                latitude=lat,
                longitude=lng,
                description=description,
                severity=severity,
                casualties_injured=injuries,
                casualties_dead=deaths,
                user_id=current_user_id,
                photo_url=photo_filename,
                status="not_confirmed"
            )
            db.session.add(new_accident)

            # APPLY FEATURES: First Report (+10)
            if is_first:
                add_points(user, 10, "First Report Bonus")
            
            # APPLY FEATURES: High Severity (+100)
            if severity == 5:
                add_points(user, 100, "High Severity Report")

            db.session.commit()
            return new_accident
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, message=f"Database Error: {str(e)}")


@blp.route("/accidents/<string:accident_id>")
class AccidentDetail(MethodView):

    @blp.response(200, AccidentSchema)
    def get(self, accident_id):
        return Accident.query.get_or_404(accident_id)

    @jwt_required()
    def delete(self, accident_id):
        accident = Accident.query.get_or_404(accident_id)
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get("role")

        if user_role == "admin" or str(accident.user_id) == str(current_user_id):
            try:
                if accident.photo_url:
                    photo_path = os.path.join(UPLOAD_FOLDER, accident.photo_url)
                    if os.path.exists(photo_path):
                        os.remove(photo_path)
                db.session.delete(accident)
                db.session.commit()
                return {"message": "Accident report deleted successfully."}, 200
            except Exception as e:
                db.session.rollback()
                abort(500, message=f"Database Error: {str(e)}")
        
        abort(403, message="Access denied. You can only delete your own reports.")

@blp.route("/accidents/<string:accident_id>/status")
class AccidentStatus(MethodView):

    @jwt_required()
    @officer_required
    @blp.response(200, AccidentSchema)
    def put(self, accident_id):
        data = request.get_json()
        new_status = data.get("status")

        if new_status not in ["confirmed", "false_report"]:
            abort(400, message="Invalid status.")

        accident = Accident.query.get_or_404(accident_id)
        accident.status = new_status
        accident.verified_by = get_jwt_identity()

        reporter = User.query.get(accident.user_id)
        if reporter:
            if new_status == "confirmed":
                # APPLY FEATURES: Confirmed Report (+50)
                add_points(reporter, 50, "Verification Bonus")
            elif new_status == "false_report":
                # APPLY FEATURES: False Report (-20)
                add_points(reporter, -20, "False Report Penalty")

        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Error updating accident status.")
        return accident