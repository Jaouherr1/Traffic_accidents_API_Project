from marshmallow import Schema, fields, post_dump, validate, ValidationError
import re

class AdminIdSecurityMixin:
    @post_dump
    def remove_admin_sensitive_ids(self, data, many, **kwargs):
        if data.get("role") == "admin":
            data.pop("id", None)
            data.pop("user_id", None)
            data.pop("author_id", None)
        return data

def validate_password(password):
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long.")
    if not re.search(r"\d", password):
        raise ValidationError("Password must contain at least one number.")
    if not re.search(r"[A-Z]", password):
        raise ValidationError("Password must contain at least one uppercase letter.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValidationError("Password must contain at least one special character.")

# --- Main Schema ---
class UserSchema(Schema, AdminIdSecurityMixin):
    id = fields.Str(dump_only=True)
    username = fields.Str(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate_password)
    email = fields.Email(allow_none=True, required=False)
    role = fields.Str(load_default="user") 
    points = fields.Int(dump_only=True)
    banned_until = fields.DateTime(dump_only=True) 
    created_at = fields.DateTime(dump_only=True)
    
    # FIXED: Changed Str to Method and fixed function name
    status = fields.Method("get_status_value", dump_only=True)
    
    badge_number = fields.Str()
    institution = fields.Str()

    def get_status_value(self, obj):
        # Handle the Enum conversion to string
        try:
            return obj.status.value if hasattr(obj.status, 'value') else str(obj.status)
        except:
            return "pending"

    def get_badges_list(self, obj):
        if not obj.badges:
            return []
        return obj.badges.split(",")

# --- Other schemas remain largely the same, but ensure they inherit correctly ---

class LeaderboardUserSchema(Schema):
    rank = fields.Int(dump_only=True)
    username = fields.Str(dump_only=True)
    points = fields.Int(dump_only=True)
    badges = fields.Str(dump_only=True)

class UserPublicSchema(Schema):
    username = fields.Str(dump_only=True)
    points = fields.Int(dump_only=True)
    badges = fields.Str(dump_only=True)

class UserProfileSchema(UserPublicSchema):
    id = fields.Str(dump_only=True)
    role = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

class TokenResponseSchema(Schema):
    access_token = fields.Str(dump_only=True)
    refresh_token = fields.Str(dump_only=True)
    role = fields.Str(dump_only=True)
    username = fields.Str(dump_only=True)

class OfficerApplicationSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate_password)
    email = fields.Email(required=True)
    institution = fields.Str(required=True)
    badge_number = fields.Str(required=True)
    role = fields.Str(load_default="officer") # Helpful to include this

class AdminApplicationSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate_password)
    full_name = fields.Str(required=True)
    department = fields.Str(required=True)
    secret_invite_code = fields.Str(required=True)


class LoginSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)