from db import db
from datetime import datetime

class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    accident_id = db.Column(db.String(36), db.ForeignKey("accidents.id"), nullable=False)
    # Correctly points to "user.id"
    user_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)

    author = db.relationship("User", back_populates="comments")
    accident = db.relationship("Accident", back_populates="comments")