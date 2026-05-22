import random

def replenish_teams(rosters):
    """
    Ensures every team has at least 10 players by auto-signing free agents if necessary.
    """
    teams = rosters["teams"]
    players = rosters["players"]
    free_agents = rosters["free_agents"]
    
    # Calculate initial counts
    team_counts = {}
    for t in teams:
        team_counts[t["abbreviation"]] = 0
    for p in players:
        if p["team_id"] in team_counts:
            team_counts[p["team_id"]] += 1
            
    # Sort free agents by overall to get best players first
    free_agents.sort(key=lambda x: x["overall"], reverse=True)
    
    for t in teams:
        abbr = t["abbreviation"]
        count = team_counts[abbr]
        
        while count < 10:
            if not free_agents:
                # Emergency generation of a player
                from player_factory import generate_player
                # Use a dummy player ID
                new_id = f"P_emerg_{random.randint(1000, 9999)}"
                pos = random.choice(["PG", "SG", "SF", "PF", "C"])
                new_p = generate_player(new_id, pos, abbr, is_star=False, is_starter=False)
                players.append(new_p)
                count += 1
            else:
                # Sign best available FA
                fa = free_agents.pop(0)
                fa["team_id"] = abbr
                # Adjust contract to a cheap minimum standard
                fa["salary"] = round(random.uniform(1.0, 2.5), 2)
                fa["contract_years"] = random.randint(1, 2)
                players.append(fa)
                count += 1
