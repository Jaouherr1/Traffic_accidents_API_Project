import uuid
from db import db

class Route(db.Model):
    __tablename__ = "routes"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    accident_id = db.Column(db.String(36), db.ForeignKey("accidents.id"))
    route_name = db.Column(db.String(100))
    is_closed = db.Column(db.Boolean, default=True)