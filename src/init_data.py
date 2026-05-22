import json
import os
import random

# Ensure directories exist
os.makedirs("data", exist_ok=True)

# Define Teams
TEAMS = [
    {
        "id": "NYE",
        "name": "Empire",
        "city": "New York",
        "abbreviation": "NYE",
        "colors": {"primary": "#1D4ED8", "secondary": "#F59E0B"},
        "budget": 140.0,
        "wins": 0,
        "losses": 0
    },
    {
        "id": "BOS",
        "name": "Owls",
        "city": "Boston",
        "abbreviation": "BOS",
        "colors": {"primary": "#047857", "secondary": "#F9FAFB"},
        "budget": 135.0,
        "wins": 0,
        "losses": 0
    },
    {
        "id": "LAS",
        "name": "Stars",
        "city": "Los Angeles",
        "abbreviation": "LAS",
        "colors": {"primary": "#6D28D9", "secondary": "#FBBF24"},
        "budget": 145.0,
        "wins": 0,
        "losses": 0
    },
    {
        "id": "CHI",
        "name": "Winds",
        "city": "Chicago",
        "abbreviation": "CHI",
        "colors": {"primary": "#DC2626", "secondary": "#1F2937"},
        "budget": 130.0,
        "wins": 0,
        "losses": 0
    },
    {
        "id": "MIA",
        "name": "Heatwave",
        "city": "Miami",
        "abbreviation": "MIA",
        "colors": {"primary": "#E11D48", "secondary": "#F59E0B"},
        "budget": 138.0,
        "wins": 0,
        "losses": 0
    },
    {
        "id": "SFS",
        "name": "Surf",
        "city": "San Francisco",
        "abbreviation": "SFS",
        "colors": {"primary": "#0284C7", "secondary": "#EA580C"},
        "budget": 142.0,
        "wins": 0,
        "losses": 0
    },
    {
        "id": "DAL",
        "name": "Outlaws",
        "city": "Dallas",
        "abbreviation": "DAL",
        "colors": {"primary": "#475569", "secondary": "#1E3A8A"},
        "budget": 132.0,
        "wins": 0,
        "losses": 0
    },
    {
        "id": "SEA",
        "name": "Emeralds",
        "city": "Seattle",
        "abbreviation": "SEA",
        "colors": {"primary": "#059669", "secondary": "#FBBF24"},
        "budget": 136.0,
        "wins": 0,
        "losses": 0
    }
]

# Random Names
FIRST_NAMES = [
    "Marcus", "Julian", "Elijah", "Terrence", "Winston", "Deandre", "Kendrick", "Gordon",
    "Harrison", "Preston", "Arthur", "Jonas", "Devin", "Darnell", "LeBron", "Kyrie",
    "Damian", "Giannis", "Nikola", "Luka", "Joel", "Shai", "Kawhi", "Jayson", "Anthony",
    "Stephen", "Kevin", "Klay", "Draymond", "Russell", "Bradley", "Zach", "LaMelo",
    "Lonzo", "Brandon", "Ja", "Zion", "Cade", "Evan", "Scottie", "Tyrese", "De'Aaron",
    "Domantas", "Jimmy", "Bam", "Tyler", "Kristaps", "Jaylen", "Jrue", "Derrick", "Al"
]

LAST_NAMES = [
    "Vance", "Sterling", "Cole", "Brooks", "Russo", "Miller", "Ross", "Finch", "Thorne",
    "Legend", "Storm", "Butler", "Splash", "O'Neal", "Bryant", "Jordan", "James",
    "Curry", "Durant", "Antetokounmpo", "Jokic", "Doncic", "Embiid", "Gilgeous", "Leonard",
    "Tatum", "Davis", "Green", "Westbrook", "Beal", "LaVine", "Ball", "Ingram", "Morant",
    "Williamson", "Cunningham", "Mobley", "Barnes", "Haliburton", "Fox", "Sabonis",
    "Adebayo", "Herro", "Porzingis", "Brown", "Holiday", "White", "Horford", "Smart"
]

TRAITS = ["Clutch", "Gym Rat", "Spark Plug", "Loyal", "Money-Motivated", "Winner", "Hometown Discount", "Mercenary"]

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

def generate_player(pid, pos, team_id, is_star=False, is_starter=False):
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    name = f"{first_name} {last_name}"
    
    # Age & Potential
    if is_star:
        age = random.randint(23, 33)
        base = random.randint(84, 92)
        potential = random.randint(base, 96)
    elif is_starter:
        age = random.randint(21, 31)
        base = random.randint(75, 83)
        potential = random.randint(base, 90)
    else:
        age = random.randint(19, 35)
        base = random.randint(66, 74)
        potential = random.randint(base, 85)
        
    # Ratings
    ratings = {}
    if pos == "PG":
        ratings["playmaking"] = random.randint(base - 2, min(99, base + 10))
        ratings["outside_scoring"] = random.randint(base - 5, min(99, base + 5))
        ratings["inside_scoring"] = random.randint(base - 15, base)
        ratings["perimeter_defense"] = random.randint(base - 5, min(99, base + 5))
        ratings["interior_defense"] = random.randint(30, 60)
        ratings["rebounding"] = random.randint(30, 60)
        ratings["athleticism"] = random.randint(base - 5, min(99, base + 5))
    elif pos == "SG":
        ratings["playmaking"] = random.randint(base - 8, base + 2)
        ratings["outside_scoring"] = random.randint(base - 2, min(99, base + 10))
        ratings["inside_scoring"] = random.randint(base - 10, base + 2)
        ratings["perimeter_defense"] = random.randint(base - 5, min(99, base + 5))
        ratings["interior_defense"] = random.randint(35, 65)
        ratings["rebounding"] = random.randint(35, 65)
        ratings["athleticism"] = random.randint(base - 3, min(99, base + 8))
    elif pos == "SF":
        ratings["playmaking"] = random.randint(base - 10, base + 2)
        ratings["outside_scoring"] = random.randint(base - 5, base + 5)
        ratings["inside_scoring"] = random.randint(base - 5, base + 5)
        ratings["perimeter_defense"] = random.randint(base - 2, min(99, base + 8))
        ratings["interior_defense"] = random.randint(base - 10, base + 5)
        ratings["rebounding"] = random.randint(base - 10, base + 5)
        ratings["athleticism"] = random.randint(base - 5, min(99, base + 5))
    elif pos == "PF":
        ratings["playmaking"] = random.randint(30, 65)
        ratings["outside_scoring"] = random.randint(base - 15, base + 2)
        ratings["inside_scoring"] = random.randint(base - 2, min(99, base + 8))
        ratings["perimeter_defense"] = random.randint(40, 70)
        ratings["interior_defense"] = random.randint(base - 5, min(99, base + 8))
        ratings["rebounding"] = random.randint(base - 3, min(99, base + 8))
        ratings["athleticism"] = random.randint(base - 5, min(99, base + 5))
    elif pos == "C":
        ratings["playmaking"] = random.randint(25, 55)
        ratings["outside_scoring"] = random.randint(25, 60)
        ratings["inside_scoring"] = random.randint(base - 2, min(99, base + 10))
        ratings["perimeter_defense"] = random.randint(30, 55)
        ratings["interior_defense"] = random.randint(base - 2, min(99, base + 10))
        ratings["rebounding"] = random.randint(base - 2, min(99, base + 10))
        ratings["athleticism"] = random.randint(base - 8, base + 5)

    ratings["stamina"] = random.randint(70, 95)
    
    # Cap all values
    for k in ratings:
        ratings[k] = max(0, min(99, ratings[k]))
        
    overall = calculate_overall(pos, ratings)
    
    # Loyalty and Traits
    p_traits = random.sample(TRAITS, k=random.randint(0, 2))
    
    # Salary logic: Overall-based
    if overall >= 88:
        salary = round(random.uniform(28.0, 42.0), 2)
    elif overall >= 82:
        salary = round(random.uniform(18.0, 28.0), 2)
    elif overall >= 75:
        salary = round(random.uniform(8.0, 18.0), 2)
    elif overall >= 70:
        salary = round(random.uniform(3.0, 8.0), 2)
    else:
        salary = round(random.uniform(1.0, 3.0), 2)
        
    contract_years = random.randint(1, 4)
    if is_star:
        contract_years = random.randint(2, 5)

    return {
        "id": pid,
        "name": name,
        "age": age,
        "position": pos,
        "potential": potential,
        "loyalty": random.randint(20, 95),
        "traits": p_traits,
        "salary": salary,
        "contract_years": contract_years,
        "injured": False,
        "injury_days": 0,
        "ratings": ratings,
        "overall": overall,
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

# Build Teams and Roster
rosters = {"teams": TEAMS, "players": [], "free_agents": []}
player_id_counter = 1

for t in TEAMS:
    # 5 positions for starters
    positions = ["PG", "SG", "SF", "PF", "C"]
    
    # Generate 5 starters
    for i, pos in enumerate(positions):
        # 1 star per team guaranteed
        is_star = (i == 0 or (t["abbreviation"] == "LAS" and i == 2) or (t["abbreviation"] == "SFS" and i == 1))
        p = generate_player(f"P{player_id_counter}", pos, t["abbreviation"], is_star=is_star, is_starter=True)
        rosters["players"].append(p)
        player_id_counter += 1
        
    # Generate 5 bench players
    random.shuffle(positions)
    for pos in positions:
        p = generate_player(f"P{player_id_counter}", pos, t["abbreviation"], is_star=False, is_starter=False)
        rosters["players"].append(p)
        player_id_counter += 1

# Add some initial Free Agents
for pos in ["PG", "SG", "SF", "PF", "C"]:
    p = generate_player(f"P{player_id_counter}", pos, "FA", is_star=False, is_starter=False)
    rosters["free_agents"].append(p)
    player_id_counter += 1

# Draft classes
draft_classes = []
archetypes = {
    "PG": ["Floor General", "Slasher", "3-and-D Guard"],
    "SG": ["Sharpshooter", "Scoring Machine", "Lockdown Wing"],
    "SF": ["Point Forward", "Athletic Slasher", "3-and-D Wing"],
    "PF": ["Stretch Four", "Post Scorer", "Athletic Finisher"],
    "C": ["Paint Protector", "Rebound Machine", "Stretch Center"]
}

def generate_prospect(pid, year):
    pos = random.choice(["PG", "SG", "SF", "PF", "C"])
    arch = random.choice(archetypes[pos])
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    name = f"{first_name} {last_name}"
    
    age = random.randint(19, 21)
    base = random.randint(62, 74)
    potential = random.randint(base + 8, 96)
    
    ratings = {}
    # Base ratings generated like normal players but slightly lower overall
    for k in ["playmaking", "outside_scoring", "inside_scoring", "perimeter_defense", "interior_defense", "rebounding", "athleticism", "stamina"]:
        ratings[k] = random.randint(base - 15, base + 5)
        
    # Boost rating according to archetype
    if arch == "Floor General":
        ratings["playmaking"] = random.randint(base + 5, base + 20)
    elif arch == "Sharpshooter" or arch == "Stretch Four" or arch == "Stretch Center":
        ratings["outside_scoring"] = random.randint(base + 5, base + 20)
    elif arch == "Lockdown Wing" or arch == "3-and-D Guard" or arch == "3-and-D Wing":
        ratings["perimeter_defense"] = random.randint(base + 5, base + 20)
    elif arch == "Paint Protector":
        ratings["interior_defense"] = random.randint(base + 5, base + 20)
    elif arch == "Rebound Machine":
        ratings["rebounding"] = random.randint(base + 5, base + 20)
    elif arch == "Slasher" or arch == "Athletic Finisher" or arch == "Athletic Slasher":
        ratings["inside_scoring"] = random.randint(base + 5, base + 20)
        ratings["athleticism"] = random.randint(base + 5, base + 20)
        
    for k in ratings:
        ratings[k] = max(10, min(99, ratings[k]))
        
    overall = calculate_overall(pos, ratings)
    
    return {
        "id": pid,
        "name": name,
        "age": age,
        "position": pos,
        "archetype": arch,
        "potential": potential,
        "ratings": ratings,
        "overall": overall,
        "projected_round": 1 if potential >= 84 else 2
    }

# Generate 2 draft classes (current and next)
for year in [2026, 2027]:
    prospects = []
    # 16 prospects per draft class (2 rounds for 8 teams)
    for i in range(16):
        prospects.append(generate_prospect(f"D_{year}_{i+1}", year))
    draft_classes.append({"year": year, "prospects": prospects})

# League history
league_history = {
    "current_year": 2026,
    "current_stage": "regular_season", # Stages: regular_season, playoffs, offseason_draft, offseason_free_agency, offseason_progression
    "day": 0,
    "seasons": [],
    "all_time_stats": {
        "scoring_leaders": [],
        "rebound_leaders": [],
        "assist_leaders": []
    },
    "retired_jerseys": [
        {"team": "LAS", "number": 8, "player": "Kobe Bryant"},
        {"team": "LAS", "number": 24, "player": "Kobe Bryant"},
        {"team": "CHI", "number": 23, "player": "Michael Jordan"},
        {"team": "BOS", "number": 33, "player": "Larry Bird"}
    ],
    "hall_of_fame": []
}

# Write files
with open("data/rosters.json", "w") as f:
    json.dump(rosters, f, indent=2)

with open("data/draft_classes.json", "w") as f:
    json.dump(draft_classes, f, indent=2)

with open("data/league_history.json", "w") as f:
    json.dump(league_history, f, indent=2)

print("Hoops Sim League data successfully initialized!")
