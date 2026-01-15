import uuid
from datetime import datetime
from db import db
import enum

# 1. Define the Enum for strict security
class UserStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(500), nullable=False)
    full_name = db.Column(db.String(100), nullable=True)  # For admin users
    department = db.Column(db.String(100), nullable=True)  # For admin users
    role = db.Column(
        db.String(20), 
        nullable=False, 
        default="user",
        info={'check_constraint': "role IN ('admin', 'officer', 'user')"}
    )
    
    # Officer fields
    email = db.Column(db.String(120), unique=True, nullable=True)
    institution = db.Column(db.String(200), nullable=True)  
    badge_number = db.Column(db.String(100), unique=True, nullable=True) # Fixed Typo
    
    points = db.Column(db.Integer, default=0)
    badges = db.Column(db.String(500), default="")
    
    # 2. Link the column to the Enum class for strict validation
    status = db.Column(
        db.Enum(UserStatus), 
        default=UserStatus.PENDING, 
        nullable=False
    )
    
    banned_until = db.Column(db.DateTime, nullable=True) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    accidents = db.relationship(
        "Accident", 
        back_populates="reporter", 
        lazy="dynamic", 
        foreign_keys='Accident.user_id'
    )
    
    comments = db.relationship("Comment", back_populates="author", cascade="all, delete-orphan")