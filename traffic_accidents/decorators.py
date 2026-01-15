from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask_smorest import abort
from functools import wraps

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request() # Checks if a valid token exists
        claims = get_jwt()
        if claims.get("role") != "admin":
            abort(403, message="Admin privilege required.")
        return fn(*args, **kwargs)
    return wrapper

def officer_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request() # <--- CRITICAL: Added this missing line
        claims = get_jwt()
        # Allow both officers and admins to perform officer-level actions
        if claims.get("role") not in ["officer", "admin"]:
            abort(403, message="Officer or Admin privilege required.")
        return fn(*args, **kwargs)
    return wrapper