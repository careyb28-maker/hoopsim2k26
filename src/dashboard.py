import http.server
import socketserver
import json
import os
import sys
import random
from urllib.parse import parse_qs, urlparse

# Ensure src is on Python search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sim_engine import simulate_game
from progression import run_season_progression

PORT = int(os.environ.get("PORT", 8000))
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

class LeagueServer(http.server.BaseHTTPRequestHandler):
    
    def log_message(self, format, *args):
        # Suppress logging to keep output clean unless debugging
        pass

    def do_GET(self):
        url = urlparse(self.path)
        
        # 1. API Endpoints
        if url.path == "/api/league_data":
            self.handle_get_league_data()
        else:
            # 2. Serve Static Files
            self.handle_serve_static(url.path)
            
    def do_POST(self):
        url = urlparse(self.path)
        
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b""
        
        try:
            params = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            params = {}
            
        if url.path == "/api/sim_day":
            self.handle_sim_day()
        elif url.path == "/api/sim_season":
            self.handle_sim_season()
        elif url.path == "/api/simulate_matchup":
            self.handle_live_matchup(params)
        elif url.path == "/api/sign_free_agent":
            self.handle_sign_free_agent(params)
        elif url.path == "/api/draft_player":
            self.handle_draft_player(params)
        elif url.path == "/api/run_progression":
            self.handle_run_progression()
        else:
            self.send_response(404)
            self.end_headers()

    # --- GET HANDLERS ---
    def handle_get_league_data(self):
        try:
            rosters = self.load_json("rosters.json")
            draft_classes = self.load_json("draft_classes.json")
            history = self.load_json("league_history.json")
            
            # Extract current year's draft class
            curr_year = history["current_year"]
            draft_class_obj = next((dc for dc in draft_classes if dc["year"] == curr_year), None)
            draft_class = draft_class_obj["prospects"] if draft_class_obj else []
            
            # Load current news story
            news = history.get("news", "Welcome to Hoops Sim League! Sim a day to start playing.")
            
            res_data = {
                "rosters": rosters,
                "draftClass": draft_class,
                "history": history,
                "news": news
            }
            
            self.send_json(res_data)
        except Exception as e:
            self.send_error_response(500, f"Error loading league data: {str(e)}")

    def handle_serve_static(self, path):
        # Default to index.html
        if path == "/" or path == "":
            path = "/index.html"
            
        file_path = os.path.join(PUBLIC_DIR, path.lstrip("/"))
        
        # Verify file exists and is inside PUBLIC_DIR to prevent directory traversal
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"File Not Found")
            return
            
        # Determine content type
        content_type = "text/plain"
        if file_path.endswith(".html"):
            content_type = "text/html"
        elif file_path.endswith(".css"):
            content_type = "text/css"
        elif file_path.endswith(".js"):
            content_type = "application/javascript"
        elif file_path.endswith(".png"):
            content_type = "image/png"
        elif file_path.endswith(".jpg") or file_path.endswith(".jpeg"):
            content_type = "image/jpeg"
        elif file_path.endswith(".svg"):
            content_type = "image/svg+xml"
            
        try:
            with open(file_path, "rb") as f:
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.end_headers()
                self.wfile.write(f.read())
        except Exception:
            self.send_response(500)
            self.end_headers()

    # --- POST HANDLERS ---
    def handle_sim_day(self):
        try:
            rosters = self.load_json("rosters.json")
            history = self.load_json("league_history.json")
            draft_classes = self.load_json("draft_classes.json")
            
            stage = history["current_stage"]
            news = ""
            
            if stage == "regular_season":
                news = self.sim_regular_season_day(rosters, history)
            elif stage == "playoffs":
                news = self.sim_playoffs_day(rosters, history)
            elif stage == "offseason_draft":
                news = self.auto_draft_pick(rosters, history, draft_classes)
            elif stage == "offseason_free_agency":
                news = self.advance_free_agency_day(rosters, history)
            else:
                news = "Offseason training is active. Please advance training to start the next season."
                
            history["news"] = news
            self.save_json("rosters.json", rosters)
            self.save_json("league_history.json", history)
            self.save_json("draft_classes.json", draft_classes)
            
            self.send_json({"success": True, "news": news})
        except Exception as e:
            self.send_error_response(500, f"Error simulating day: {str(e)}")

    def handle_sim_season(self):
        try:
            rosters = self.load_json("rosters.json")
            history = self.load_json("league_history.json")
            draft_classes = self.load_json("draft_classes.json")
            
            stage = history["current_stage"]
            news = ""
            
            if stage == "regular_season":
                # Sim all remaining regular season games
                games_played = 0
                max_regular_games = 14
                
                # Run sim day in a loop until regular season ends
                while history["current_stage"] == "regular_season":
                    news = self.sim_regular_season_day(rosters, history)
                    games_played += 1
                    if games_played > 100:  # Safety break
                        break
                        
                news = f"Regular Season simulation finished! Standings finalized. {news}"
                
            elif stage == "playoffs":
                # Sim current playoff rounds until champion is crowned
                while history["current_stage"] == "playoffs":
                    news = self.sim_playoffs_day(rosters, history)
                news = f"Playoffs finished! Championship crowned. {news}"
                
            elif stage == "offseason_draft":
                # Auto draft all remaining players
                while history["current_stage"] == "offseason_draft":
                    news = self.auto_draft_pick(rosters, history, draft_classes)
                    
            elif stage == "offseason_free_agency":
                # Sim free agency to completion
                while history["current_stage"] == "offseason_free_agency":
                    news = self.advance_free_agency_day(rosters, history)
            else:
                news = "No active season stage to simulate. Advance offseason training."
                
            history["news"] = news
            self.save_json("rosters.json", rosters)
            self.save_json("league_history.json", history)
            self.save_json("draft_classes.json", draft_classes)
            
            self.send_json({"success": True, "news": news})
        except Exception as e:
            self.send_error_response(500, f"Error simulating season: {str(e)}")

    def handle_live_matchup(self, params):
        try:
            away_abbr = params.get("away")
            home_abbr = params.get("home")
            
            rosters = self.load_json("rosters.json")
            
            away_team = next((t for t in rosters["teams"] if t["abbreviation"] == away_abbr), None)
            home_team = next((t for t in rosters["teams"] if t["abbreviation"] == home_abbr), None)
            
            if not away_team or not home_team:
                self.send_error_response(400, "Invalid away or home team code.")
                return
                
            pbp_log = []
            a_score, h_score, box_score = simulate_game(away_team, home_team, rosters["players"], pbp_log)
            
            self.send_json({
                "success": True,
                "away_score": a_score,
                "home_score": h_score,
                "pbp_log": pbp_log,
                "box_score": box_score
            })
        except Exception as e:
            self.send_error_response(500, f"Live simulator failed: {str(e)}")

    def handle_sign_free_agent(self, params):
        try:
            player_id = params.get("player_id")
            bid = float(params.get("bid"))
            team_id = params.get("team_id")
            
            rosters = self.load_json("rosters.json")
            history = self.load_json("league_history.json")
            
            if history["current_stage"] != "offseason_free_agency":
                self.send_json({"success": False, "message": "Free agency negotiations are closed."})
                return
                
            # Find FA
            fa = next((p for p in rosters["free_agents"] if p["id"] == player_id), None)
            if not fa:
                self.send_json({"success": False, "message": "Free agent not found."})
                return
                
            # Verify cap space
            team_players = [p for p in rosters["players"] if p["team_id"] == team_id]
            current_cap = sum(p["salary"] for p in team_players)
            
            if current_cap + bid > 140.0:
                self.send_json({"success": False, "message": f"Insufficient cap space. Signing this player puts you at ${current_cap + bid:.1f}M (Limit $140M)."})
                return
                
            # Sign player
            rosters["free_agents"].remove(fa)
            fa["team_id"] = team_id
            fa["salary"] = bid
            fa["contract_years"] = random.randint(2, 4)
            rosters["players"].append(fa)
            
            self.save_json("rosters.json", rosters)
            
            self.send_json({"success": True})
        except Exception as e:
            self.send_error_response(500, f"Failed to sign free agent: {str(e)}")

    def handle_draft_player(self, params):
        try:
            prospect_id = params.get("prospect_id")
            team_id = params.get("team_id")
            
            rosters = self.load_json("rosters.json")
            draft_classes = self.load_json("draft_classes.json")
            history = self.load_json("league_history.json")
            
            if history["current_stage"] != "offseason_draft":
                self.send_json({"success": False, "message": "Draft room is closed."})
                return
                
            curr_year = history["current_year"]
            dc_obj = next((dc for dc in draft_classes if dc["year"] == curr_year), None)
            
            if not dc_obj or len(dc_obj["prospects"]) == 0:
                self.send_json({"success": False, "message": "No prospects found for this draft class."})
                return
                
            prospect = next((p for p in dc_obj["prospects"] if p["id"] == prospect_id), None)
            if not prospect:
                self.send_json({"success": False, "message": "Prospect not found."})
                return
                
            # Draft prospect to user's team
            dc_obj["prospects"].remove(prospect)
            
            # Form player object
            new_player = {
                "id": prospect["id"],
                "name": prospect["name"],
                "age": prospect["age"],
                "position": prospect["position"],
                "potential": prospect["potential"],
                "loyalty": random.randint(40, 95),
                "traits": random.sample(["Clutch", "Gym Rat", "Spark Plug", "Loyal"], k=random.randint(0, 1)),
                # Draft pick rookie contract
                "salary": 3.5 if prospect["potential"] >= 88 else 1.8,
                "contract_years": 3,
                "injured": False,
                "injury_days": 0,
                "ratings": prospect["ratings"],
                "overall": prospect["overall"],
                "team_id": team_id,
                "stats": {
                    "games_played": 0, "points": 0, "rebounds": 0, "assists": 0,
                    "steals": 0, "blocks": 0, "turnovers": 0,
                    "fg_made": 0, "fg_attempted": 0,
                    "three_made": 0, "three_attempted": 0,
                    "ft_made": 0, "ft_attempted": 0
                },
                "career_stats": []
            }
            rosters["players"].append(new_player)
            
            # Auto-run rest of round picks for other teams!
            news = f"Draft Pick: {team_id} selected scouted prospect {prospect['name']} ({prospect['position']})!"
            
            # Auto draft step
            self.auto_draft_pick(rosters, history, draft_classes)
            
            self.save_json("rosters.json", rosters)
            self.save_json("draft_classes.json", draft_classes)
            self.save_json("league_history.json", history)
            
            self.send_json({"success": True, "news": news})
        except Exception as e:
            self.send_error_response(500, f"Draft action failed: {str(e)}")

    def handle_run_progression(self):
        try:
            rosters = self.load_json("rosters.json")
            draft_classes = self.load_json("draft_classes.json")
            history = self.load_json("league_history.json")
            
            if history["current_stage"] != "offseason_progression":
                self.send_json({"success": False, "message": "Stage is not training progression."})
                return
                
            stories = run_season_progression(rosters, draft_classes, history)
            
            summary = "Offseason Player Development and Retirements complete! \n" + "\n".join(stories[:4])
            history["news"] = summary
            
            self.save_json("rosters.json", rosters)
            self.save_json("draft_classes.json", draft_classes)
            self.save_json("league_history.json", history)
            
            self.send_json({"success": True, "news": summary})
        except Exception as e:
            self.send_error_response(500, f"Progression simulation failed: {str(e)}")

    # --- MATH & SIMULATION CONTROLLERS ---
    def sim_regular_season_day(self, rosters, history):
        # Basic scheduling: pair teams up randomly for the day
        teams = rosters["teams"]
        players = rosters["players"]
        
        # Sort teams by games played to match active teams
        # Each team plays 14 games.
        active_teams = []
        for t in teams:
            games = t["wins"] + t["losses"]
            if games < 14:
                active_teams.append(t)
                
        if not active_teams:
            # Transition regular season to Playoffs!
            history["current_stage"] = "playoffs"
            self.setup_playoff_bracket(teams, history)
            return "Regular season complete! Playoff bracket locked."
            
        random.shuffle(active_teams)
        matchups = []
        # Pair up teams
        while len(active_teams) >= 2:
            t1 = active_teams.pop(0)
            t2 = active_teams.pop(0)
            matchups.append((t1, t2))
            
        news_stories = []
        for t1, t2 in matchups:
            a_score, h_score, box_score = simulate_game(t1, t2, players)
            
            # Apply records
            if a_score > h_score:
                t1["wins"] += 1
                t2["losses"] += 1
                winner, loser, w_sc, l_sc = t1, t2, a_score, h_score
            else:
                t2["wins"] += 1
                t1["losses"] += 1
                winner, loser, w_sc, l_sc = t2, t1, h_score, a_score
                
            # Apply individual stats to rosters season stats
            for pid, stats in box_score.items():
                p_obj = next((p for p in players if p["id"] == pid), None)
                if p_obj:
                    p_obj["stats"]["games_played"] += 1
                    p_obj["stats"]["points"] += stats["points"]
                    p_obj["stats"]["rebounds"] += stats["rebounds"]
                    p_obj["stats"]["assists"] += stats["assists"]
                    p_obj["stats"]["steals"] += stats["steals"]
                    p_obj["stats"]["blocks"] += stats["blocks"]
                    p_obj["stats"]["turnovers"] += stats["turnovers"]
                    p_obj["stats"]["fg_made"] += stats["fg_made"]
                    p_obj["stats"]["fg_attempted"] += stats["fg_attempted"]
                    p_obj["stats"]["three_made"] += stats["three_made"]
                    p_obj["stats"]["three_attempted"] += stats["three_attempted"]
                    p_obj["stats"]["ft_made"] += stats["ft_made"]
                    p_obj["stats"]["ft_attempted"] += stats["ft_attempted"]
                    
            # Generate a nice headline
            top_scorer = max(box_score.values(), key=lambda x: x["points"])
            news_stories.append(f"🏀 Headline: {winner['city']} {winner['name']} downs {loser['city']} {loser['name']} {w_sc}-{l_sc}! {top_scorer['name']} leads with {top_scorer['points']} PTS.")

        # If after this day all teams reached 14 games, transition
        all_finished = True
        for t in teams:
            if t["wins"] + t["losses"] < 14:
                all_finished = False
                break
                
        if all_finished:
            history["current_stage"] = "playoffs"
            self.setup_playoff_bracket(teams, history)
            return "📆 Daily simulated matchups complete! All teams have played 14 games. Regular season finished! Playoff bracket locked."
            
        return "📆 Daily simulated matchups complete! " + random.choice(news_stories)

    def setup_playoff_bracket(self, teams, history):
        # Sort top 4 teams
        sorted_teams = sorted(teams, key=lambda x: x["wins"], reverse=True)
        top4 = sorted_teams[:4]
        
        # Semifinals bracket: #1 vs #4, #2 vs #3
        history["playoffs_round"] = 1 # 1: Semifinals, 2: Finals
        history["playoffs_bracket"] = {
            "semi1": {"t1": top4[0]["abbreviation"], "t2": top4[3]["abbreviation"], "t1_wins": 0, "t2_wins": 0},
            "semi2": {"t2": top4[1]["abbreviation"], "t1": top4[2]["abbreviation"], "t1_wins": 0, "t2_wins": 0}
        }
        history["playoffs_games"] = []

    def sim_playoffs_day(self, rosters, history):
        bracket = history["playoffs_bracket"]
        players = rosters["players"]
        rnd = history["playoffs_round"]
        
        news = ""
        if rnd == 1:
            # Semifinals (Best of 5)
            s1 = bracket["semi1"]
            s2 = bracket["semi2"]
            
            s1_done = s1["t1_wins"] >= 3 or s1["t2_wins"] >= 3
            s2_done = s2["t1_wins"] >= 3 or s2["t2_wins"] >= 3
            
            if s1_done and s2_done:
                # Transition to Finals!
                w1 = s1["t1"] if s1["t1_wins"] >= 3 else s1["t2"]
                w2 = s2["t1"] if s2["t1_wins"] >= 3 else s2["t2"]
                
                history["playoffs_round"] = 2
                history["playoffs_bracket"] = {
                    "finals": {"t1": w1, "t2": w2, "t1_wins": 0, "t2_wins": 0}
                }
                return f"🏆 SEMIFINALS COMPLETE: {w1} and {w2} advance to the Finals!"
                
            # Play a game for active series
            if not s1_done:
                t1 = next(t for t in rosters["teams"] if t["abbreviation"] == s1["t1"])
                t2 = next(t for t in rosters["teams"] if t["abbreviation"] == s1["t2"])
                a, h, bs = simulate_game(t1, t2, players)
                if a > h:
                    s1["t1_wins"] += 1
                else:
                    s1["t2_wins"] += 1
                    
            if not s2_done:
                t1 = next(t for t in rosters["teams"] if t["abbreviation"] == s2["t1"])
                t2 = next(t for t in rosters["teams"] if t["abbreviation"] == s2["t2"])
                a, h, bs = simulate_game(t1, t2, players)
                if a > h:
                    s2["t1_wins"] += 1
                else:
                    s2["t2_wins"] += 1
                    
            news = f"🏀 Playoff Round: Semifinals in progress! Series 1: {s1['t1']} ({s1['t1_wins']}) vs {s1['t2']} ({s1['t2_wins']}) | Series 2: {s2['t1']} ({s2['t1_wins']}) vs {s2['t2']} ({s2['t2_wins']})"
            
            # Double check if now done
            s1_done = s1["t1_wins"] >= 3 or s1["t2_wins"] >= 3
            s2_done = s2["t1_wins"] >= 3 or s2["t2_wins"] >= 3
            if s1_done and s2_done:
                w1 = s1["t1"] if s1["t1_wins"] >= 3 else s1["t2"]
                w2 = s2["t1"] if s2["t1_wins"] >= 3 else s2["t2"]
                history["playoffs_round"] = 2
                history["playoffs_bracket"] = {
                    "finals": {"t1": w1, "t2": w2, "t1_wins": 0, "t2_wins": 0}
                }
                news = f"🏆 SEMIFINALS COMPLETE: {w1} and {w2} advance to the Finals!"
                
            return news
            
        elif rnd == 2:
            # Finals (Best of 7)
            finals = bracket["finals"]
            f_done = finals["t1_wins"] >= 4 or finals["t2_wins"] >= 4
            
            if f_done:
                # Crown champion!
                champ_abbr = finals["t1"] if finals["t1_wins"] >= 4 else finals["t2"]
                self.crown_champion(champ_abbr, rosters, history)
                return f"🏆 FINALS CHAMPION: The {champ_abbr} have won the Championship!"
                
            t1 = next(t for t in rosters["teams"] if t["abbreviation"] == finals["t1"])
            t2 = next(t for t in rosters["teams"] if t["abbreviation"] == finals["t2"])
            a, h, bs = simulate_game(t1, t2, players)
            
            if a > h:
                finals["t1_wins"] += 1
            else:
                finals["t2_wins"] += 1
                
            news = f"🏀 Finals: {finals['t1']} ({finals['t1_wins']}) vs {finals['t2']} ({finals['t2_wins']})"
            
            # Double check if now done
            f_done = finals["t1_wins"] >= 4 or finals["t2_wins"] >= 4
            if f_done:
                champ_abbr = finals["t1"] if finals["t1_wins"] >= 4 else finals["t2"]
                self.crown_champion(champ_abbr, rosters, history)
                news = f"🏆 FINALS CHAMPION: The {champ_abbr} have won the Championship!"
                
            return news

    def crown_champion(self, champ_abbr, rosters, history):
        # Determine Awards: MVP, DPOY, ROTY
        players = rosters["players"]
        
        # Calculate MVP (Simple player efficiency: PTS + REB + AST)
        mvp_candidate = max(players, key=lambda p: p["stats"]["points"] + p["stats"]["rebounds"] + p["stats"]["assists"])
        
        # DPOY (steals + blocks)
        dpoy_candidate = max(players, key=lambda p: p["stats"]["steals"] + p["stats"]["blocks"])
        
        # Finals MVP (superstar of the champion team)
        champ_players = [p for p in players if p["team_id"] == champ_abbr]
        fmvp_candidate = max(champ_players, key=lambda p: p["stats"]["points"] + p["stats"]["assists"] * 1.5)
        
        season_result = {
            "year": history["current_year"],
            "champion": champ_abbr,
            "mvp": mvp_candidate["name"],
            "dpoy": dpoy_candidate["name"],
            "finals_mvp": fmvp_candidate["name"]
        }
        history["seasons"].append(season_result)
        
        # Transition to Draft!
        history["current_stage"] = "offseason_draft"

    def auto_draft_pick(self, rosters, history, draft_classes):
        curr_year = history["current_year"]
        dc_obj = next((dc for dc in draft_classes if dc["year"] == curr_year), None)
        
        if not dc_obj or len(dc_obj["prospects"]) == 0:
            history["current_stage"] = "offseason_free_agency"
            return "Draft completed! Entering Offseason Free Agency negotiations."
            
        # Select first team draft picker (for simplicity, auto pick draft)
        prospect = max(dc_obj["prospects"], key=lambda p: p["potential"])
        dc_obj["prospects"].remove(prospect)
        
        # Assign to team with lowest wins
        sorted_teams = sorted(rosters["teams"], key=lambda x: x["wins"])
        
        # Draft to team that needs roster members
        draft_team = None
        for t in sorted_teams:
            # Check how many players on team
            count = sum(1 for p in rosters["players"] if p["team_id"] == t["abbreviation"])
            if count < 10:
                draft_team = t
                break
                
        if not draft_team:
            draft_team = sorted_teams[0]
            
        new_player = {
            "id": prospect["id"],
            "name": prospect["name"],
            "age": prospect["age"],
            "position": prospect["position"],
            "potential": prospect["potential"],
            "loyalty": random.randint(40, 95),
            "traits": random.sample(["Clutch", "Gym Rat", "Spark Plug", "Loyal"], k=random.randint(0, 1)),
            "salary": 2.5,
            "contract_years": 3,
            "injured": False,
            "injury_days": 0,
            "ratings": prospect["ratings"],
            "overall": prospect["overall"],
            "team_id": draft_team["abbreviation"],
            "stats": {
                "games_played": 0, "points": 0, "rebounds": 0, "assists": 0,
                "steals": 0, "blocks": 0, "turnovers": 0,
                "fg_made": 0, "fg_attempted": 0,
                "three_made": 0, "three_attempted": 0,
                "ft_made": 0, "ft_attempted": 0
            },
            "career_stats": []
        }
        rosters["players"].append(new_player)
        
        news = f"🗳️ Draft Pick: {draft_team['abbreviation']} selected prospect {prospect['name']} ({prospect['position']})!"
        
        # If prospects empty, transition
        if len(dc_obj["prospects"]) == 0:
            history["current_stage"] = "offseason_free_agency"
            news += " Draft completed! Entering Free Agency negotiations."
            
        return news

    def advance_free_agency_day(self, rosters, history):
        # Check if free agency day finished
        # Sim auto-signing for remaining teams!
        # Sign top free agents to empty roster spots
        free_agents = rosters["free_agents"]
        teams = rosters["teams"]
        
        if not free_agents:
            history["current_stage"] = "offseason_progression"
            return "Free Agency completed! Entering player training progression."
            
        signed_count = 0
        for t in sorted(teams, key=lambda x: random.random()):
            # Count team players
            team_players = [p for p in rosters["players"] if p["team_id"] == t["abbreviation"]]
            if len(team_players) < 10:
                # Find fit free agent
                fa = free_agents.pop(0)
                fa["team_id"] = t["abbreviation"]
                fa["salary"] = round(random.uniform(2.0, 5.0), 2)
                fa["contract_years"] = random.randint(1, 3)
                rosters["players"].append(fa)
                signed_count += 1
                break
                
        news = f"🤝 Free Agency: Auto-signed free agent spot to balance rosters."
        
        # Check if FA empty or teams satisfy minimum 10
        all_saturated = True
        for t in teams:
            count = sum(1 for p in rosters["players"] if p["team_id"] == t["abbreviation"])
            if count < 10:
                all_saturated = False
                break
                
        if all_saturated or not free_agents:
            history["current_stage"] = "offseason_progression"
            news = "Free Agency finished! All rosters populated. Proceed to Offseason Training."
            
        return news

    # --- JSON STORAGE UTILS ---
    def load_json(self, filename):
        path = os.path.join(DATA_DIR, filename)
        with open(path, "r") as f:
            return json.load(f)
            
    def save_json(self, filename, data):
        path = os.path.join(DATA_DIR, filename)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
        
    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"success": False, "message": message}).encode('utf-8'))

class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    pass

if __name__ == "__main__":
    web_dir = PUBLIC_DIR
    print(f"Starting server... Serving from: {PUBLIC_DIR}")
    
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    
    with ThreadingTCPServer(("", PORT), LeagueServer) as httpd:
        print(f"🏀 Hoops Sim League running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.server_close()
            sys.exit(0)
