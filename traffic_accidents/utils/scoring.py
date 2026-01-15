def update_user_badges(user):
    """Checks point milestones and adds badges to the user."""
    current_badges = user.badges.split(",") if user.badges else []
    
    # Badge Milestones
    milestones = [
        (100, "Safe Driver"),
        (500, "Road Watcher"),
        (1000, "Guardian"),
        (5000, "Traffic Legend")
    ]
    
    new_badges_added = False
    for points_needed, badge_name in milestones:
        if user.points >= points_needed and badge_name not in current_badges:
            current_badges.append(badge_name)
            new_badges_added = True
            
    if new_badges_added:
        user.badges = ",".join(current_badges)
    
    return new_badges_added