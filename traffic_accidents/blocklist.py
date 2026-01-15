from flask_jwt_extended import get_jwt
from flask_smorest import abort
from functools import wraps
blocklist = set()
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        jwt_data = get_jwt()
        if jwt_data.get("role") != "admin":
            abort(403, message="Admin area. Access denied.")
        return fn(*args, **kwargs)
    return wrapper