from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from flask import request
from db import db
from flask.views import MethodView
from models.comment import Comment
from models.accident import Accident
from models.user import User  # Added: Needed to find the author to award points
from schemas.comment import CommentSchema
from utils.gamification import add_points  # Added: Needed for the scoring system

blp = Blueprint("comments", __name__, description="Comments")

@blp.route("/accidents/<string:accident_id>/comments")
class CommentsByAccident(MethodView):

    @blp.response(200, CommentSchema(many=True))
    def get(self, accident_id):
        """List comments for a specific accident"""
        Accident.query.get_or_404(accident_id)
        comments = Comment.query.filter_by(accident_id=accident_id).all()
        return comments

    @jwt_required()
    @blp.arguments(CommentSchema)
    @blp.response(201, CommentSchema)
    def post(self, comment_data, accident_id):
        """Post a new comment to an accident"""
        Accident.query.get_or_404(accident_id)
        current_user_id = get_jwt_identity()
        
        new_comment = Comment(
            content=comment_data["content"],
            accident_id=accident_id,
            user_id=current_user_id
        )
        
        db.session.add(new_comment)
        db.session.commit()
        return new_comment

@blp.route("/comments/<int:comment_id>")
class CommentDetail(MethodView):

    @jwt_required()
    def delete(self, comment_id):
        """Delete a comment (Owner or Admin only)"""
        comment = Comment.query.get_or_404(comment_id)
        
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get("role")

        if comment.user_id != current_user_id and user_role != "admin":
            abort(403, message="Only the owner or an admin can delete this comment.")

        try:
            db.session.delete(comment)
            db.session.commit()
            return {"message": "Comment deleted successfully."}, 200
        except Exception:
            db.session.rollback()
            abort(500, message="An error occurred while deleting the comment.")

# Fixed: Moved outside of the previous class to correct indentation
@blp.route("/comments/<int:comment_id>/upvote")
class CommentUpvote(MethodView):
    
    @jwt_required()
    def post(self, comment_id):
        """Award points to the author of a helpful comment"""
        comment = Comment.query.get_or_404(comment_id)
        author = User.query.get(comment.user_id)
        
        if not author:
            abort(404, message="Author not found.")

        # Action: Helpful Comment (+5 points)
        add_points(author, 5, "Comment Upvoted")
        
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            abort(500, message="Error processing upvote.")
            
        return {"message": f"Upvoted! {author.username} gained 5 points."}, 200