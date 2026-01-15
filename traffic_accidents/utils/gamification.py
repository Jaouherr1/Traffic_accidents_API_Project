from db import db

def add_points(user, amount, reason=""):
    """Adds points to a user and checks for badge upgrades."""
    user.points += amount
    if user.points < 0:
        user.points = 0
    
    # Badge Milestones
    milestones = [
        (10, "First Responder"),  # Awarded after first report (+10 points)
        (100, "Safe Driver"),
        (500, "Road Watcher"),
        (1000, "Guardian"),
        (5000, "Traffic Legend")
    ]
    
    current_badges = user.badges.split(",") if user.badges else []
    new_added = False
    
    for score, name in milestones:
        if user.points >= score and name not in current_badges:
            current_badges.append(name)
            new_added = True
            
    if new_added:
        user.badges = ",".join([b for b in current_badges if b])
    
    return {"points_added": amount, "total_points": user.points, "new_badges": new_added}