import json
import random

def calculate_overall(pos, r):
    if pos == "PG":
        return int(r["playmaking"] * 0.40 + r["outside_scoring"] * 0.20 + r["perimeter_defense"] * 0.20 + r["inside_scoring"] * 0.10 + r["athleticism"] * 0.10)
    elif pos == "SG":
        return int(r["outside_scoring"] * 0.30 + r["playmaking"] * 0.20 + r["perimeter_defense"] * 0.25 + r["inside_scoring"] * 0.10 + r["athleticism"] * 0.15)
    elif pos == "SF":
        return int(r["outside_scoring"] * 0.25 + r["perimeter_defense"] * 0.25 + r["inside_scoring"] * 0.15 + r["playmaking"] * 0.15 + r["rebounding"] * 0.10 + r["athleticism"] * 0.10)
    elif pos == "PF":
        return int(r["inside_scoring"] * 0.30 + r["rebounding"] * 0.20 + r["interior_defense"] * 0.20 + r["outside_scoring"] * 0.15 + r["athleticism"] * 0.15)
    elif pos == "C":
        return int(r["inside_scoring"] * 0.40 + r["rebounding"] * 0.30 + r["interior_defense"] * 0.20 + r["athleticism"] * 0.10)
    return 70

def progress_player(p):
    """
    Simulates ratings progression or regression for a single player.
    Modifies the player ratings in place and updates overall rating.
    """
    age = p["age"]
    pot = p["potential"]
    traits = p["traits"]
    
    # Gym Rat gives progression boost, Winner gives small boost
    prog_boost = 0.0
    if "Gym Rat" in traits:
        prog_boost += 1.5
    if "Winner" in traits:
        prog_boost += 0.5
        
    delta_ratings = {}
    
    # Developmental Curve
    if age <= 24:
        # Development stage: young players grow rapidly towards their potential
        gap = max(0, pot - p["overall"])
        growth_rate = max(1, int(gap * 0.15 + random.randint(1, 4) + prog_boost))
        
        for k in p["ratings"]:
            if k == "potential" or k == "stamina":
                continue
            # Increase ratings, key skills grow faster
            increase = random.randint(1, max(2, growth_rate))
            delta_ratings[k] = increase
            
        p["ratings"]["stamina"] = min(99, p["ratings"]["stamina"] + random.randint(0, 3))
        
    elif age <= 29:
        # Prime stage: high stability, minor gains, mental skills rise, athleticism caps
        for k in p["ratings"]:
            if k in ["playmaking", "perimeter_defense", "interior_defense"]:
                # Mental/defensive ratings can still grow slightly
                delta_ratings[k] = random.choice([0, 0, 1, 1, 2])
            elif k in ["athleticism"]:
                # Athleticism starts to peak/decline slightly
                delta_ratings[k] = random.choice([-1, 0, 0, 0, 1])
            else:
                # Skill ratings stable
                delta_ratings[k] = random.choice([-1, 0, 1, 1])
                
    elif age <= 33:
        # Post-prime decline: athleticism/stamina regression, skills stay steady
        for k in p["ratings"]:
            if k == "athleticism":
                delta_ratings[k] = random.choice([-3, -2, -1, -1, 0])
            elif k == "stamina":
                delta_ratings[k] = random.choice([-2, -1, -1, 0])
            elif k in ["playmaking", "outside_scoring"]:
                # Vet skills hold steady
                delta_ratings[k] = random.choice([-1, 0, 0, 1])
            else:
                delta_ratings[k] = random.choice([-2, -1, 0, 0])
                
    else:
        # Decline stage (34+): rapid decay across the board
        for k in p["ratings"]:
            if k == "athleticism" or k == "stamina":
                delta_ratings[k] = random.choice([-6, -5, -4, -3])
            elif k in ["outside_scoring", "playmaking"]:
                delta_ratings[k] = random.choice([-3, -2, -1, 0])
            else:
                delta_ratings[k] = random.choice([-4, -3, -2, -1])

    # Apply changes
    for k, delta in delta_ratings.items():
        p["ratings"][k] = max(10, min(99, p["ratings"][k] + delta))
        
    # Potential can drift down slightly if not met, or up slightly
    p["potential"] = max(p["ratings"].get("potential", pot), p["overall"])
    
    # Calculate new overall
    old_overall = p["overall"]
    p["overall"] = calculate_overall(p["position"], p["ratings"])
    return p["overall"] - old_overall

def run_season_progression(rosters, draft_classes, league_history):
    """
    Runs full offseason progression:
    - Aging & Skill development/regressions
    - Stats archiving
    - Retirements & Hall of Fame tracking
    - Team resets
    Returns: list of news stories generated
    """
    news_stories = []
    current_year = league_history["current_year"]
    
    # 1. Archive stats & Age players
    all_players = rosters["players"] + rosters["free_agents"]
    
    # Tracking biggest developers
    max_grower = None
    max_growth = -1
    
    for p in all_players:
        # Archive current season stats to career history
        if p["stats"]["games_played"] > 0:
            stat_snapshot = {
                "year": current_year,
                "team_id": p["team_id"],
                "games_played": p["stats"]["games_played"],
                "points": p["stats"]["points"],
                "rebounds": p["stats"]["rebounds"],
                "assists": p["stats"]["assists"],
                "steals": p["stats"]["steals"],
                "blocks": p["stats"]["blocks"],
                "turnovers": p["stats"]["turnovers"],
                "fg_made": p["stats"]["fg_made"],
                "fg_attempted": p["stats"]["fg_attempted"],
                "three_made": p["stats"]["three_made"],
                "three_attempted": p["stats"]["three_attempted"],
                "ft_made": p["stats"]["ft_made"],
                "ft_attempted": p["stats"]["ft_attempted"]
            }
            p["career_stats"].append(stat_snapshot)
            
        # Reset current season stats
        p["stats"] = {
            "games_played": 0, "points": 0, "rebounds": 0, "assists": 0,
            "steals": 0, "blocks": 0, "turnovers": 0,
            "fg_made": 0, "fg_attempted": 0,
            "three_made": 0, "three_attempted": 0,
            "ft_made": 0, "ft_attempted": 0
        }
        
        # Age player
        p["age"] += 1
        
        # Run progression
        growth = progress_player(p)
        if growth > max_growth and p["age"] <= 24 and p["team_id"] != "FA":
            max_growth = growth
            max_grower = p

    if max_grower and max_growth > 0:
        news_stories.append(f"📈 developmental leap: {max_grower['name']} ({max_grower['team_id']}) put in major work this offseason, increasing his overall rating by +{max_growth} to a {max_grower['overall']} overall!")

    # 2. Process Retirements
    active_players = rosters["players"]
    free_agents = rosters["free_agents"]
    
    retired_list = []
    still_active_players = []
    still_active_fa = []
    
    # Check active rosters
    for p in active_players:
        retire = check_retirement(p)
        if retire:
            retired_list.append(p)
            # Create retirement news
            news_stories.append(f"👴 RETIREMENT: {p['name']} has announced his retirement from basketball at age {p['age']} after playing with {p['team_id']}.")
            process_legend(p, p["team_id"], league_history, news_stories)
        else:
            still_active_players.append(p)
            
    # Check free agents
    for p in free_agents:
        retire = check_retirement(p)
        if retire:
            retired_list.append(p)
            news_stories.append(f"👴 RETIREMENT: Veteran free agent {p['name']} has retired at age {p['age']}.")
            process_legend(p, None, league_history, news_stories)
        else:
            still_active_fa.append(p)
            
    rosters["players"] = still_active_players
    rosters["free_agents"] = still_active_fa

    # 3. Refill rosters if below minimums (10 players per team)
    # A team must have at least 10 players. If below 10, sign cheap free agents.
    from rosters_util import replenish_teams
    replenish_teams(rosters)

    # 4. Generate new draft class for Year + 2 (since Year + 1 draft class is already loaded)
    next_draft_year = current_year + 2
    from player_factory import generate_prospect
    new_prospects = []
    for i in range(16):
        new_prospects.append(generate_prospect(f"D_{next_draft_year}_{i+1}", next_draft_year))
    draft_classes.append({"year": next_draft_year, "prospects": new_prospects})

    # 5. Reset Team wins/losses in rosters
    for t in rosters["teams"]:
        t["wins"] = 0
        t["losses"] = 0

    # 6. Update League History stage
    league_history["current_year"] = current_year + 1
    league_history["current_stage"] = "regular_season"
    league_history["day"] = 0
    
    return news_stories

def check_retirement(p):
    age = p["age"]
    overall = p["overall"]
    
    if age < 32:
        return False
        
    # Probability scaling
    if age == 32:
        chance = 0.01 if overall < 70 else 0.0
    elif age == 33:
        chance = 0.05 if overall < 72 else 0.01
    elif age == 34:
        chance = 0.15 if overall < 75 else 0.05
    elif age == 35:
        chance = 0.30 if overall < 78 else 0.15
    elif age == 36:
        chance = 0.50 if overall < 82 else 0.30
    elif age == 37:
        chance = 0.70 if overall < 85 else 0.50
    elif age == 38:
        chance = 0.90 if overall < 88 else 0.75
    else:
        chance = 1.0  # Force retire at 39+
        
    # If overall is very low, retire earlier
    if overall < 62:
        chance = max(chance, 0.40)
        
    return random.random() < chance

def process_legend(p, last_team, league_history, news):
    """
    Checks if a retiring player is worthy of the Hall of Fame
    or having their jersey retired by their franchise.
    """
    # Calculate simple legend score
    # Look at career history in career_stats
    career = p.get("career_stats", [])
    if not career:
        return
        
    total_pts = sum(s["points"] for s in career)
    total_ast = sum(s["assists"] for s in career)
    total_reb = sum(s["rebounds"] for s in career)
    total_gp = sum(s["games_played"] for s in career)
    
    if total_gp == 0:
        return
        
    ppg = total_pts / total_gp
    rpg = total_reb / total_gp
    apg = total_ast / total_gp
    
    # Legend score based on career volume + peak ability
    # 20k points is massive, but in a small league let's scale
    # Star players average ~20 points, playing 80 games = 1600 points per season.
    # In 10 seasons, they accumulate ~16,000 points.
    legend_score = (total_pts * 1.0) + (total_reb * 1.5) + (total_ast * 1.5) + (p["overall"] * 50)
    
    # Check HoF (induction threshold)
    if legend_score > 25000 or p["overall"] >= 88:
        hof_entry = {
            "name": p["name"],
            "age": p["age"],
            "position": p["position"],
            "career_points": total_pts,
            "career_rebounds": total_reb,
            "career_assists": total_ast,
            "games_played": total_gp,
            "career_ppg": round(ppg, 1),
            "career_rpg": round(rpg, 1),
            "career_apg": round(apg, 1),
            "induction_year": league_history["current_year"]
        }
        league_history["hall_of_fame"].append(hof_entry)
        news.append(f"🏆 HALL OF FAME: {p['name']} has been inducted into the Hall of Fame! A legendary career comes to a close.")
        
        # Jersey Retirement check by last team
        if last_team and last_team != "FA" and total_gp > 300:
            jersey_num = random.randint(1, 99)
            # Ensure number is not already retired by team
            taken_nums = [rj["number"] for rj in league_history["retired_jerseys"] if rj["team"] == last_team]
            while jersey_num in taken_nums:
                jersey_num = random.randint(1, 99)
                
            rj = {
                "team": last_team,
                "number": jersey_num,
                "player": p["name"]
            }
            league_history["retired_jerseys"].append(rj)
            news.append(f"👕 JERSEY RETIRED: The {last_team} have retired Jersey #{jersey_num} in honor of {p['name']}!")
