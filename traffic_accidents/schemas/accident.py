from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from schemas.comment import CommentSchema
from schemas.user import AdminIdSecurityMixin, UserSchema
from schemas.user import UserPublicSchema
class AccidentSchema(Schema,AdminIdSecurityMixin):
    # Identity and Status
    id = fields.Str(dump_only=True)
    status = fields.Str(dump_only=True) 
    role = fields.Str(attribute="author.role", dump_only=True)
    type = fields.Str(required=True)
    reporter = fields.Nested(UserPublicSchema(), dump_only=True)
    # Relationships (Shows the User objects instead of just IDs)
    author = fields.Nested(UserSchema(only=("id", "username", "role")), dump_only=True)
    verifier = fields.Nested(UserSchema(only=("id", "username", "role")), dump_only=True)
    # Location
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    
    # Details
    description = fields.Str(required=True, validate=validate.Length(min=10))
    severity = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    casualties_dead = fields.Int(load_default=0)
    casualties_injured = fields.Int(load_default=0)
    
    # Media and Timestamps
    photo_url = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

    # Nested Comments
    comments = fields.List(fields.Nested(CommentSchema()), dump_only=True)

    @validates_schema
    def validate_fatalities(self, data, **kwargs):
        deaths = data.get("casualties_dead", 0)
        severity = data.get("severity")
        if deaths > 0 and severity is not None and severity < 4:
            raise ValidationError(
                "If fatalities are reported, severity must be 4 or 5.",
                field_name="severity"
            )