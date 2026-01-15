from flask import Flask
from flask_smorest import Api
from flask_jwt_extended import JWTManager
from db import db
from flask_cors import CORS
from datetime import datetime, timedelta
from blocklist import blocklist
# Import Models
from models import user
from models.user import User 
from models.accident import Accident
from models.comment import Comment
from models.route import Route

# Import Blueprints
from resources.auth import blp as AuthBlueprint
from resources.accident import blp as AccidentBlueprint
from resources.comment import blp as CommentBlueprint
from resources.user import blp as UserBlueprint
from resources.navigation import blp as NavBlueprint
def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config.update({
    "API_TITLE": "Traffic Accident API",
    "API_VERSION": "v1",
    "OPENAPI_VERSION": "3.0.3",
    "OPENAPI_URL_PREFIX": "/",
    "OPENAPI_SWAGGER_UI_PATH": "/swagger-ui",
    "OPENAPI_SWAGGER_UI_URL": "https://cdn.jsdelivr.net/npm/swagger-ui-dist/",
    "SQLALCHEMY_DATABASE_URI": "sqlite:///data.db",
    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    "JWT_SECRET_KEY": "super-secret-key", # Change this in production!
    "MAIL_SERVER": "smtp.gmail.com",
    "MAIL_PORT": 587,
    "MAIL_USE_TLS": True,
    "MAIL_USERNAME": "jaouher.chouchane0@gmail.com",
    "MAIL_PASSWORD": "gmdxvrizbueipbes",
    
    # --- ADD THESE NEW JWT CONFIGS ---
    "JWT_ACCESS_TOKEN_EXPIRES": timedelta(minutes=15),
    "JWT_REFRESH_TOKEN_EXPIRES": timedelta(days=30),
    "JWT_BLACKLIST_ENABLED": True,
    "JWT_BLACKLIST_TOKEN_CHECKS": ["access", "refresh"],
})

    db.init_app(app)
    jwt = JWTManager(app)
    api = Api(app)
    # --- BLOCKLIST CHECK ---
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        return jwt_payload["jti"] in blocklist
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {"message": "The token has been revoked.", "error": "token_revoked"}, 401
    @jwt.additional_claims_loader
    def add_claims_to_jwt(identity):
        user = User.query.get(identity)
        if user and user.role == "admin":
            return {"is_admin": True, "role": "admin"}
        if user and user.role == "officer":
            return {"is_officer": True, "role": "officer"}
        return {"is_admin": False, "role": "user"}

    # --- BAN SECURITY CHECK ---
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        user = User.query.get(identity)
    
        if user and user.banned_until:
            # ONLY block them if the ban time is still in the FUTURE
            if user.banned_until > datetime.utcnow():
                return None

        return user
    # Register Blueprints
    api.register_blueprint(AuthBlueprint)
    api.register_blueprint(AccidentBlueprint)
    api.register_blueprint(CommentBlueprint)
    api.register_blueprint(UserBlueprint)
    api.register_blueprint(NavBlueprint)

    with app.app_context():
        db.create_all()

    @app.route('/')
    def home():
        return {"status": "online", "message": "API Running", "swagger": "/swagger-ui"}
    
    return app

if __name__ == "__main__":
    app = create_app()
    # 0.0.0.0 tells Flask to listen to all network interfaces
    app.run(debug=True, host="0.0.0.0", port=5000)