import random

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

ARCHETYPES = {
    "PG": ["Floor General", "Slasher", "3-and-D Guard"],
    "SG": ["Sharpshooter", "Scoring Machine", "Lockdown Wing"],
    "SF": ["Point Forward", "Athletic Slasher", "3-and-D Wing"],
    "PF": ["Stretch Four", "Post Scorer", "Athletic Finisher"],
    "C": ["Paint Protector", "Rebound Machine", "Stretch Center"]
}


def calculate_overall(pos, r):
    if pos == "PG":
        return int(r["playmaking"] * 0.40 + r["outside_scoring"] * 0.20 + r["perimeter_defense"] * 0.20 + r["inside_scoring"] * 0.10 + r["athleticism"] * 0.10)
    if pos == "SG":
        return int(r["outside_scoring"] * 0.30 + r["playmaking"] * 0.20 + r["perimeter_defense"] * 0.25 + r["inside_scoring"] * 0.10 + r["athleticism"] * 0.15)
    if pos == "SF":
        return int(r["outside_scoring"] * 0.25 + r["perimeter_defense"] * 0.25 + r["inside_scoring"] * 0.15 + r["playmaking"] * 0.15 + r["rebounding"] * 0.10 + r["athleticism"] * 0.10)
    if pos == "PF":
        return int(r["inside_scoring"] * 0.30 + r["rebounding"] * 0.20 + r["interior_defense"] * 0.20 + r["outside_scoring"] * 0.15 + r["athleticism"] * 0.15)
    if pos == "C":
        return int(r["inside_scoring"] * 0.40 + r["rebounding"] * 0.30 + r["interior_defense"] * 0.20 + r["athleticism"] * 0.10)
    return 70


def empty_stats():
    return {
        "games_played": 0, "points": 0, "rebounds": 0, "assists": 0,
        "steals": 0, "blocks": 0, "turnovers": 0,
        "fg_made": 0, "fg_attempted": 0,
        "three_made": 0, "three_attempted": 0,
        "ft_made": 0, "ft_attempted": 0
    }


def generate_player(pid, pos, team_id, is_star=False, is_starter=False):
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

    ratings = {}
    for key in ["playmaking", "outside_scoring", "inside_scoring", "perimeter_defense", "interior_defense", "rebounding", "athleticism"]:
        ratings[key] = random.randint(max(25, base - 12), min(99, base + 8))
    ratings["stamina"] = random.randint(70, 95)

    if pos == "PG":
        ratings["playmaking"] = min(99, ratings["playmaking"] + 10)
        ratings["interior_defense"] = max(25, ratings["interior_defense"] - 15)
    elif pos == "SG":
        ratings["outside_scoring"] = min(99, ratings["outside_scoring"] + 10)
    elif pos == "PF":
        ratings["rebounding"] = min(99, ratings["rebounding"] + 8)
        ratings["interior_defense"] = min(99, ratings["interior_defense"] + 8)
    elif pos == "C":
        ratings["inside_scoring"] = min(99, ratings["inside_scoring"] + 10)
        ratings["rebounding"] = min(99, ratings["rebounding"] + 10)
        ratings["interior_defense"] = min(99, ratings["interior_defense"] + 10)
        ratings["playmaking"] = max(25, ratings["playmaking"] - 15)

    overall = calculate_overall(pos, ratings)
    salary = round(max(1.1, (overall - 58) * 1.15), 2)

    return {
        "id": pid,
        "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        "age": age,
        "position": pos,
        "potential": potential,
        "loyalty": random.randint(20, 95),
        "traits": random.sample(TRAITS, k=random.randint(0, 2)),
        "salary": salary,
        "contract_years": random.randint(1, 5 if is_star else 4),
        "injured": False,
        "injury_days": 0,
        "ratings": ratings,
        "overall": overall,
        "team_id": team_id,
        "stats": empty_stats(),
        "career_stats": []
    }


def generate_prospect(pid, year):
    pos = random.choice(["PG", "SG", "SF", "PF", "C"])
    archetype = random.choice(ARCHETYPES[pos])
    age = random.randint(19, 21)
    base = random.randint(62, 74)
    potential = random.randint(base + 8, 96)
    ratings = {
        key: random.randint(base - 15, base + 5)
        for key in ["playmaking", "outside_scoring", "inside_scoring", "perimeter_defense", "interior_defense", "rebounding", "athleticism", "stamina"]
    }

    if archetype in ["Floor General"]:
        ratings["playmaking"] = random.randint(base + 5, base + 20)
    elif archetype in ["Sharpshooter", "Stretch Four", "Stretch Center"]:
        ratings["outside_scoring"] = random.randint(base + 5, base + 20)
    elif archetype in ["Lockdown Wing", "3-and-D Guard", "3-and-D Wing"]:
        ratings["perimeter_defense"] = random.randint(base + 5, base + 20)
    elif archetype == "Paint Protector":
        ratings["interior_defense"] = random.randint(base + 5, base + 20)
    elif archetype == "Rebound Machine":
        ratings["rebounding"] = random.randint(base + 5, base + 20)
    elif archetype in ["Slasher", "Athletic Finisher", "Athletic Slasher"]:
        ratings["inside_scoring"] = random.randint(base + 5, base + 20)
        ratings["athleticism"] = random.randint(base + 5, base + 20)

    for key in ratings:
        ratings[key] = max(10, min(99, ratings[key]))

    return {
        "id": pid,
        "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        "age": age,
        "position": pos,
        "archetype": archetype,
        "potential": potential,
        "ratings": ratings,
        "overall": calculate_overall(pos, ratings),
        "projected_round": 1 if potential >= 84 else 2
    }
