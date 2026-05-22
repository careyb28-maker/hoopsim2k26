import random
import math

def simulate_game(team1, team2, players, pbp_log=None):
    """
    Simulates a basketball game between team1 and team2 using player attributes.
    If pbp_log is a list, play-by-play descriptions will be appended to it.
    Returns: (team1_score, team2_score, box_score)
    """
    # Filter players by team
    t1_players = [p for p in players if p["team_id"] == team1["abbreviation"]]
    t2_players = [p for p in players if p["team_id"] == team2["abbreviation"]]
    
    # Sort into starters and bench based on overall rating (top 5 starters, rest bench)
    # Ensure positions are roughly aligned (usually done in roster management, but let's sort by overall)
    t1_players.sort(key=lambda x: x["overall"], reverse=True)
    t2_players.sort(key=lambda x: x["overall"], reverse=True)
    
    t1_starters = t1_players[:5]
    t1_bench = t1_players[5:]
    t2_starters = t2_players[:5]
    t2_bench = t2_players[5:]
    
    # Track game states
    t1_score = 0
    t2_score = 0
    
    # Initialize box scores for all players in this game
    box_score = {}
    for p in t1_players + t2_players:
        box_score[p["id"]] = {
            "name": p["name"],
            "team": p["team_id"],
            "position": p["position"],
            "points": 0,
            "rebounds": 0,
            "assists": 0,
            "steals": 0,
            "blocks": 0,
            "turnovers": 0,
            "fg_made": 0,
            "fg_attempted": 0,
            "three_made": 0,
            "three_attempted": 0,
            "ft_made": 0,
            "ft_attempted": 0,
            "minutes": 0
        }
        
    # Standard pacing: ~95-102 possessions per team
    base_pace = 98.0
    pace_factor = (
        (sum(p["ratings"]["playmaking"] for p in t1_starters) / 5.0) +
        (sum(p["ratings"]["playmaking"] for p in t2_starters) / 5.0) +
        (sum(p["ratings"]["athleticism"] for p in t1_starters) / 5.0) +
        (sum(p["ratings"]["athleticism"] for p in t2_starters) / 5.0)
    ) / 400.0  # Normalized factor between 0.0 and 1.0
    
    total_possessions = int(base_pace + (pace_factor - 0.5) * 15.0 + random.randint(-4, 4)) * 2
    
    # We will simulate 4 quarters, each having total_possessions / 4
    possessions_per_quarter = total_possessions // 4
    
    # Usage rates for different positions
    usage_weights = {
        "PG": 0.24,
        "SG": 0.26,
        "SF": 0.22,
        "PF": 0.17,
        "C": 0.11
    }
    
    # Helper to pick 5 active players on court for a team
    def get_lineup(starters, bench, quarter, possession_index):
        # Lineup rotation based on quarter and possession
        # Q1: 0-80% starters, 80-100% bench mix
        # Q2: 0-50% bench mix, 50-100% starters
        # Q3: 0-80% starters, 80-100% bench mix
        # Q4: 0-30% bench mix, 30-100% starters (clutch)
        
        # Determine how many bench players are on court
        bench_count = 0
        q_pos = possession_index / possessions_per_quarter
        
        if quarter in [1, 3]:
            if q_pos > 0.7:
                bench_count = random.randint(2, 4)
            elif q_pos > 0.5:
                bench_count = random.randint(1, 2)
        elif quarter == 2:
            if q_pos < 0.6:
                bench_count = random.randint(3, 5)
            else:
                bench_count = random.randint(0, 2)
        elif quarter == 4:
            if q_pos < 0.4:
                bench_count = random.randint(2, 4)
            elif q_pos > 0.8:
                bench_count = 0  # Starters finish the game
            else:
                bench_count = random.randint(0, 1)
                
        if bench_count == 0:
            return starters
        
        # Sub bench players in, trying to match positions if possible
        lineup = list(starters)
        sub_indices = random.sample(range(5), k=min(bench_count, len(bench)))
        for idx in sub_indices:
            if idx < len(bench):
                lineup[idx] = bench[idx]
        return lineup

    if pbp_log is not None:
        pbp_log.append(f"🏀 Game Start: {team1['city']} {team1['name']} at {team2['city']} {team2['name']}!")
        
    for quarter in range(1, 5):
        if pbp_log is not None:
            pbp_log.append(f"--- Quarter {quarter} ---")
            
        for pos_idx in range(possessions_per_quarter):
            # Jump ball check at very start of Q1
            if quarter == 1 and pos_idx == 0 and pbp_log is not None:
                pbp_log.append(f"🏀 Jump Ball at center court! {t1_starters[4]['name']} and {t2_starters[4]['name']} leap, and the tip is controlled by {t1_starters[0]['name']}.")

            # Dynamic Timeout check (2% chance)
            if random.random() < 0.02 and pbp_log is not None:
                timeout_team = team1 if random.random() < 0.5 else team2
                pbp_log.append(f"📞 Timeout called by the {timeout_team['name']} to talk things over.")

            # Determine active lineups
            t1_court = get_lineup(t1_starters, t1_bench, quarter, pos_idx)
            t2_court = get_lineup(t2_starters, t2_bench, quarter, pos_idx)
            
            # Increment minutes played (approximate)
            for p in t1_court + t2_court:
                box_score[p["id"]]["minutes"] += 48.0 / (possessions_per_quarter * 4.0)
                
            # Determine which team has possession (50/50 starting, then alternate or based on rebound)
            if random.random() < 0.5:
                off_team, def_team = team1, team2
                off_court, def_court = t1_court, t2_court
            else:
                off_team, def_team = team2, team1
                off_court, def_court = t2_court, t1_court
                
            # Simulate Possession
            simulate_possession(off_team, def_team, off_court, def_court, box_score, pbp_log)
            
        # End of Quarter news
        t1_score_q = sum(box_score[p["id"]]["points"] for p in t1_players)
        t2_score_q = sum(box_score[p["id"]]["points"] for p in t2_players)
        if pbp_log is not None:
            pbp_log.append(f"End of Q{quarter}: {team1['abbreviation']} {t1_score_q} - {team2['abbreviation']} {t2_score_q}")

    # Final calculations
    t1_score = sum(box_score[p["id"]]["points"] for p in t1_players)
    t2_score = sum(box_score[p["id"]]["points"] for p in t2_players)
    
    # Overtime check if tied
    ot_count = 0
    while t1_score == t2_score:
        ot_count += 1
        if pbp_log is not None:
            pbp_log.append(f"🔥 OVERTIME {ot_count}! Game tied at {t1_score}!")
            
        t1_court = t1_starters
        t2_court = t2_starters
        
        # Sim 10 possessions each
        for pos_idx in range(10):
            # Team 1 offense
            simulate_possession(team1, team2, t1_court, t2_court, box_score, pbp_log)
            # Team 2 offense
            simulate_possession(team2, team1, t2_court, t1_court, box_score, pbp_log)
            
        t1_score = sum(box_score[p["id"]]["points"] for p in t1_players)
        t2_score = sum(box_score[p["id"]]["points"] for p in t2_players)

    # Round minutes
    for pid in box_score:
        box_score[pid]["minutes"] = round(box_score[pid]["minutes"], 1)

    if pbp_log is not None:
        pbp_log.append(f"🏆 Final Score: {team1['abbreviation']} {t1_score}, {team2['abbreviation']} {t2_score}")
        
    return t1_score, t2_score, box_score

def simulate_possession(off_team, def_team, off_court, def_court, box_score, pbp_log):
    # Select initiator of offense (weighted by playmaking)
    pm_weights = [p["ratings"]["playmaking"] for p in off_court]
    initiator = random.choices(off_court, weights=pm_weights, k=1)[0]
    
    # Select defender (matchup by position or overall defensive ability)
    defender = random.choice(def_court) # Simplify to random court defender for now
    
    # 1. Turnover Check
    to_chance = 0.12 - (initiator["ratings"]["playmaking"] * 0.001) + (defender["ratings"]["perimeter_defense"] * 0.0005)
    to_chance = max(0.04, min(0.30, to_chance))
    
    if random.random() < to_chance:
        box_score[initiator["id"]]["turnovers"] += 1
        # Steal check
        if random.random() < 0.45:
            stealer = random.choices(def_court, weights=[p["ratings"]["perimeter_defense"] for p in def_court], k=1)[0]
            box_score[stealer["id"]]["steals"] += 1
            if pbp_log is not None:
                pbp_log.append(f"🔒 Steal! {stealer['name']} strips the ball from {initiator['name']}.")
        else:
            if random.random() < 0.25 and pbp_log is not None:
                pbp_log.append(f"💥 Offensive Foul! {initiator['name']} charges right into {defender['name']}, turning the ball over.")
            elif pbp_log is not None:
                pbp_log.append(f"⚠️ Turnover! {initiator['name']} throws a bad pass out of bounds.")
        return

    # 2. Select Shooter (weighted by usage / overall)
    shoot_weights = []
    for p in off_court:
        # Base weight on position usage, scaled by overall
        base_use = 0.20
        if p["position"] == "PG": base_use = 0.24
        elif p["position"] == "SG": base_use = 0.26
        elif p["position"] == "SF": base_use = 0.22
        elif p["position"] == "PF": base_use = 0.17
        elif p["position"] == "C": base_use = 0.11
        shoot_weights.append(base_use * (p["overall"] / 70.0))
        
    shooter = random.choices(off_court, weights=shoot_weights, k=1)[0]
    
    # 3. Determine Shot Type
    # PG/SG shoot 3PTers and midranges. C shoots inside.
    three_odds = 0.35
    if shooter["position"] in ["PG", "SG"]: three_odds = 0.50
    elif shooter["position"] == "SF": three_odds = 0.40
    elif shooter["position"] == "PF": three_odds = 0.25
    elif shooter["position"] == "C": three_odds = 0.05
    
    is_three = random.random() < three_odds
    
    # Select defender blocking/contesting the shot
    if is_three:
        # Contested by perimeter defender
        contester = random.choices(def_court, weights=[p["ratings"]["perimeter_defense"] for p in def_court], k=1)[0]
        shoot_rating = shooter["ratings"]["outside_scoring"]
        def_rating = contester["ratings"]["perimeter_defense"]
    else:
        # Contested by interior defender (heavier weight on C/PF)
        def_weights = []
        for p in def_court:
            w = 1.0
            if p["position"] == "C": w = 3.0
            elif p["position"] == "PF": w = 2.0
            def_weights.append(w * p["ratings"]["interior_defense"])
        contester = random.choices(def_court, weights=def_weights, k=1)[0]
        
        # Decide if Slasher/Inside or Midrange Outside
        is_inside = random.random() < 0.65 if shooter["position"] in ["C", "PF"] else random.random() < 0.40
        if is_inside:
            shoot_rating = shooter["ratings"]["inside_scoring"]
            def_rating = contester["ratings"]["interior_defense"]
        else:
            shoot_rating = shooter["ratings"]["outside_scoring"]
            def_rating = contester["ratings"]["perimeter_defense"]
            
    # 4. Shooting Foul Check
    foul_odds = 0.08 + (shooter["ratings"]["athleticism"] * 0.0005) - (contester["ratings"]["interior_defense"] * 0.0002)
    foul_odds = max(0.02, min(0.20, foul_odds))
    
    if random.random() < foul_odds:
        # Shooting foul!
        box_score[shooter["id"]]["fg_attempted"] += 1 if not is_three else 0 # Real stat tracking
        box_score[contester["id"]]["minutes"] += 0.05 # Add slightly to fouling count or logic
        
        ft_makes = 0
        ft_shots = 3 if is_three else 2
        
        ft_pct = 0.55 + (shooter["ratings"]["outside_scoring"] * 0.003)
        ft_pct = max(0.40, min(0.95, ft_pct))
        
        for _ in range(ft_shots):
            box_score[shooter["id"]]["ft_attempted"] += 1
            if random.random() < ft_pct:
                ft_makes += 1
                box_score[shooter["id"]]["ft_made"] += 1
                
        box_score[shooter["id"]]["points"] += ft_makes
        
        if pbp_log is not None:
            if ft_makes == ft_shots:
                pbp_log.append(f"💥 Foul! {shooter['name']} was hit by {contester['name']} and sinks both free throws.")
            elif ft_makes > 0:
                pbp_log.append(f"💥 Foul! {shooter['name']} goes to the line and makes {ft_makes} of {ft_shots}.")
            else:
                pbp_log.append(f"❌ Foul! {shooter['name']} misses both free throws after being hacked by {contester['name']}.")
        return

    # 5. Shot Simulation
    if is_three:
        base_pct = 0.31 + (shoot_rating - def_rating) * 0.002
        # Clutch boost
        if "Clutch" in shooter["traits"]:
            base_pct += 0.03
        base_pct = max(0.15, min(0.55, base_pct))
        
        box_score[shooter["id"]]["fg_attempted"] += 1
        box_score[shooter["id"]]["three_attempted"] += 1
        
        if random.random() < base_pct:
            # SINK IT
            box_score[shooter["id"]]["fg_made"] += 1
            box_score[shooter["id"]]["three_made"] += 1
            box_score[shooter["id"]]["points"] += 3
            
            # Assist check
            assist_giver = award_assist(shooter, off_court, box_score)
            
            if pbp_log is not None:
                ast_str = f" (Assisted by {assist_giver['name']})" if assist_giver else ""
                pbp_log.append(f"👌 {shooter['name']} drills a cold-blooded 3-pointer!{ast_str}")
        else:
            # MISS
            if pbp_log is not None:
                pbp_log.append(f"🧱 {shooter['name']} launches a deep 3-pointer... Clang! Miss.")
            handle_rebound(off_court, def_court, shooter, box_score, pbp_log)
            
    else:
        # 2-point shot
        # Check for blocked shot
        block_odds = 0.02 + (contester["ratings"]["interior_defense"] * 0.001) - (shooter["ratings"]["athleticism"] * 0.0005)
        block_odds = max(0.01, min(0.15, block_odds))
        
        if not is_three and random.random() < block_odds:
            # BLOCKED!
            box_score[shooter["id"]]["fg_attempted"] += 1
            box_score[contester["id"]]["blocks"] += 1
            if pbp_log is not None:
                pbp_log.append(f"❌ REJECTED! {contester['name']} swats {shooter['name']}'s shot into the crowd!")
            handle_rebound(off_court, def_court, shooter, box_score, pbp_log)
            return
            
        base_pct = 0.44 + (shoot_rating - def_rating) * 0.0025
        if "Clutch" in shooter["traits"]:
            base_pct += 0.02
        base_pct = max(0.20, min(0.70, base_pct))
        
        box_score[shooter["id"]]["fg_attempted"] += 1
        
        if random.random() < base_pct:
            box_score[shooter["id"]]["fg_made"] += 1
            box_score[shooter["id"]]["points"] += 2
            
            # Assist check
            assist_giver = award_assist(shooter, off_court, box_score)
            
            if pbp_log is not None:
                ast_str = f" (Assisted by {assist_giver['name']})" if assist_giver else ""
                if is_inside:
                    if shooter["ratings"]["athleticism"] > 72 and random.random() < 0.35:
                        pbp_log.append(f"🔨 {shooter['name']} crushes a ferocious two-handed dunk!{ast_str}")
                    else:
                        pbp_log.append(f"🏀 {shooter['name']} scores a slick inside layup.{ast_str}")
                else:
                    pbp_log.append(f"🗑️ {shooter['name']} pulls up and sinks a smooth mid-range jumper!{ast_str}")
        else:
            if pbp_log is not None:
                if is_inside:
                    pbp_log.append(f"🧱 {shooter['name']} drives inside, shoots, but it spins out.")
                else:
                    pbp_log.append(f"🧱 {shooter['name']} fires a mid-range jump shot... off the iron.")
            handle_rebound(off_court, def_court, shooter, box_score, pbp_log)

def award_assist(shooter, lineup, box_score):
    # Assist occurs ~60% of the time on makes
    if random.random() > 0.60:
        return None
    # Potential passers (excluding shooter)
    passers = [p for p in lineup if p["id"] != shooter["id"]]
    if not passers:
        return None
        
    weights = [p["ratings"]["playmaking"] for p in passers]
    passer = random.choices(passers, weights=weights, k=1)[0]
    box_score[passer["id"]]["assists"] += 1
    return passer

def handle_rebound(off_lineup, def_lineup, shooter, box_score, pbp_log):
    # Sum up rebounding ratings
    off_reb_sum = sum(p["ratings"]["rebounding"] for p in off_lineup)
    def_reb_sum = sum(p["ratings"]["rebounding"] for p in def_lineup)
    
    # Base defensive rebound rate is 72%
    def_reb_pct = 0.72 + (def_reb_sum - off_reb_sum) * 0.001
    def_reb_pct = max(0.55, min(0.88, def_reb_pct))
    
    if random.random() < def_reb_pct:
        # Defensive Rebound
        # Rebound goes to tallest/best rebounding positions (C/PF weighted heavily)
        weights = []
        for p in def_lineup:
            w = 1.0
            if p["position"] == "C": w = 4.0
            elif p["position"] == "PF": w = 2.5
            elif p["position"] == "SF": w = 1.5
            weights.append(w * p["ratings"]["rebounding"])
            
        rebounder = random.choices(def_lineup, weights=weights, k=1)[0]
        box_score[rebounder["id"]]["rebounds"] += 1
        if pbp_log is not None:
            pbp_log.append(f"🛡️ Rebound {rebounder['name']}! Defensive board secured.")
    else:
        # Offensive Rebound (offense gets another possession)
        weights = []
        for p in off_lineup:
            w = 1.0
            if p["position"] == "C": w = 4.0
            elif p["position"] == "PF": w = 2.5
            elif p["position"] == "SF": w = 1.5
            weights.append(w * p["ratings"]["rebounding"])
            
        rebounder = random.choices(off_lineup, weights=weights, k=1)[0]
        box_score[rebounder["id"]]["rebounds"] += 1
        if pbp_log is not None:
            pbp_log.append(f"🔥 Offensive Rebound {rebounder['name']}! Second chance opportunity.")
            
        # Recursive offense sim
        # To avoid infinite recursion in weird cases, give offensive board and don't recursively run,
        # but let's just make it count as a rebound. The simulator loop handles possession alternation,
        # so keeping it simple is fine.
