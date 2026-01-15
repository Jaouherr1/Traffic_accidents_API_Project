from marshmallow import Schema, fields

class CheckInSchema(Schema):
    id = fields.Str(dump_only=True)
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    location_name = fields.Str()
    created_at = fields.DateTime(dump_only=True)
    username = fields.Function(lambda obj: obj.user.username) # Shows who checked in