from marshmallow import Schema, fields
from schemas.user import AdminIdSecurityMixin, UserPublicSchema
class CommentSchema(Schema,AdminIdSecurityMixin):
    id = fields.Int(dump_only=True)
    content = fields.Str(required=True)
    role = fields.Str(attribute="author.role", dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    author = fields.Nested(UserPublicSchema(), dump_only=True)
    # This reaches into the 'author' relationship in the Model 
    # and pulls only the 'username'
    username = fields.String(attribute="author.username", dump_only=True)