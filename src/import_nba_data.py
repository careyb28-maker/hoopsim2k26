import json
import os
import random
import re
import unicodedata
import urllib.request

from player_factory import calculate_overall, empty_stats, generate_prospect

SOURCE_URL = "https://raw.githubusercontent.com/alexnoob/BasketBall-GM-Rosters/master/2025-26.NBA.Roster.json"
BREF_PER_GAME_URL = "https://www.basketball-reference.com/leagues/NBA_2026_per_game.html"
BREF_ADVANCED_URL = "https://www.basketball-reference.com/leagues/NBA_2026_advanced.html"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
ROSTER_SOURCE_PATH = os.path.join(DATA_DIR, "nba_bbgm_2025_26_source.json")
BREF_SOURCE_PATH = os.path.join(DATA_DIR, "nba_bref_2026_stats.json")
SALARY_CAP_MILLIONS = 154.647
SEASON = 2026

NBA_TEAM_IDS = {
    "ATL": 1610612737,
    "BOS": 1610612738,
    "BKN": 1610612751,
    "CHA": 1610612766,
    "CHI": 1610612741,
    "CLE": 1610612739,
    "DAL": 1610612742,
    "DEN": 1610612743,
    "DET": 1610612765,
    "GSW": 1610612744,
    "HOU": 1610612745,
    "IND": 1610612754,
    "LAC": 1610612746,
    "LAL": 1610612747,
    "MEM": 1610612763,
    "MIA": 1610612748,
    "MIL": 1610612749,
    "MIN": 1610612750,
    "NOP": 1610612740,
    "NYK": 1610612752,
    "OKC": 1610612760,
    "ORL": 1610612753,
    "PHI": 1610612755,
    "PHX": 1610612756,
    "POR": 1610612757,
    "SAC": 1610612758,
    "SAS": 1610612759,
    "TOR": 1610612761,
    "UTA": 1610612762,
    "WAS": 1610612764,
}

TRAIT_BY_AWARD = {
    "All-Star": "Clutch",
    "Most Valuable Player": "Winner",
    "Defensive Player of the Year": "Winner",
    "All-Defensive": "Winner",
    "All-League": "Winner",
}

STAR_OVERALLS = {
    "Nikola Jokic": 98,
    "Victor Wembanyama": 97,
    "Shai Gilgeous-Alexander": 96,
    "Luka Doncic": 96,
    "Giannis Antetokounmpo": 96,
    "Jayson Tatum": 95,
    "Anthony Edwards": 94,
    "Joel Embiid": 94,
    "Stephen Curry": 94,
    "Kevin Durant": 93,
    "Jalen Brunson": 93,
    "Anthony Davis": 93,
    "Devin Booker": 92,
    "Donovan Mitchell": 92,
    "Tyrese Haliburton": 92,
    "LeBron James": 92,
    "Kawhi Leonard": 91,
    "Ja Morant": 91,
    "Trae Young": 91,
    "Cade Cunningham": 90,
    "Paolo Banchero": 90,
    "Karl-Anthony Towns": 90,
    "Bam Adebayo": 89,
    "Evan Mobley": 89,
    "Jamal Murray": 89,
    "Jaylen Brown": 89,
    "Jaren Jackson Jr.": 88,
    "Domantas Sabonis": 88,
    "Alperen Sengun": 88,
    "Tyrese Maxey": 88,
    "Zion Williamson": 88,
    "Keyonte George": 89,
    "LaMelo Ball": 88,
    "Jalen Williams": 88,
    "De'Aaron Fox": 88,
    "Kyrie Irving": 88,
    "Scottie Barnes": 88,
    "Franz Wagner": 87,
    "Lauri Markkanen": 90,
    "Chet Holmgren": 87,
    "Rudy Gobert": 87,
    "Desmond Bane": 86,
    "Matas Buzelis": 85,
    "Jalen Johnson": 86,
    "Jalen Duren": 86,
    "Jarrett Allen": 86,
    "Darius Garland": 86,
    "Jrue Holiday": 86,
    "Mikal Bridges": 86,
    "OG Anunoby": 85,
    "Derrick White": 85,
    "Dejounte Murray": 85,
    "Brandon Ingram": 85,
    "Julius Randle": 85,
    "Pascal Siakam": 85,
    "Jimmy Butler": 85,
    "Paul George": 85,
    "Myles Turner": 85,
    "DeMar DeRozan": 84,
    "Zach LaVine": 84,
    "Jalen Green": 84,
    "Jalen Suggs": 84,
    "Austin Reaves": 84,
    "Amen Thompson": 84,
    "Josh Giddey": 84,
    "Dyson Daniels": 84,
    "Mark Williams": 84,
    "Kristaps Porzingis": 84,
    "Daniel Gafford": 83,
    "Nic Claxton": 83,
    "C.J. McCollum": 83,
    "Brandon Miller": 83,
    "Miles Bridges": 83,
    "Coby White": 83,
    "Anfernee Simons": 83,
    "Collin Sexton": 82,
    "Ivica Zubac": 82,
    "Fred VanVleet": 82,
    "Bradley Beal": 82,
    "Norman Powell": 82,
    "Andrew Wiggins": 82,
    "Walker Kessler": 82,
    "Deni Avdija": 82,
    "Shaedon Sharpe": 82,
    "Tari Eason": 82,
    "Jonathan Kuminga": 82,
    "Onyeka Okongwu": 82,
    "P.J. Washington": 81,
    "Klay Thompson": 81,
    "Naz Reid": 81,
    "Deandre Ayton": 81,
    "Alex Sarr": 81,
    "Bilal Coulibaly": 80,
    "Scoot Henderson": 80,
    "Stephon Castle": 80,
    "Devin Vassell": 80,
    "Tobias Harris": 80,
    "Ausar Thompson": 80,
    "Aaron Gordon": 80,
    "Christian Braun": 80,
    "Draymond Green": 80,
    "Isaiah Hartenstein": 80,
    "Alex Caruso": 80,
    "Payton Pritchard": 80,
    "Immanuel Quickley": 80,
    "Jakob Poeltl": 80,
    "R.J. Barrett": 80,
}

SIGNATURE_RATINGS = {
    "Nikola Jokic": {
        "playmaking": 97,
        "outside_scoring": 88,
        "inside_scoring": 98,
        "perimeter_defense": 64,
        "interior_defense": 84,
        "rebounding": 97,
        "athleticism": 69,
        "stamina": 96,
    },
    "Victor Wembanyama": {
        "playmaking": 76,
        "outside_scoring": 86,
        "inside_scoring": 96,
        "perimeter_defense": 84,
        "interior_defense": 99,
        "rebounding": 95,
        "athleticism": 92,
        "stamina": 93,
    },
    "Shai Gilgeous-Alexander": {
        "playmaking": 93,
        "outside_scoring": 92,
        "inside_scoring": 96,
        "perimeter_defense": 90,
        "interior_defense": 67,
        "rebounding": 65,
        "athleticism": 91,
        "stamina": 96,
    },
    "Luka Doncic": {
        "playmaking": 98,
        "outside_scoring": 93,
        "inside_scoring": 92,
        "perimeter_defense": 72,
        "interior_defense": 68,
        "rebounding": 86,
        "athleticism": 78,
        "stamina": 94,
    },
    "Giannis Antetokounmpo": {
        "playmaking": 84,
        "outside_scoring": 70,
        "inside_scoring": 98,
        "perimeter_defense": 91,
        "interior_defense": 96,
        "rebounding": 93,
        "athleticism": 98,
        "stamina": 95,
    },
}


def clamp(value, low=25, high=99):
    return max(low, min(high, int(round(value))))


def safe_float(value, default=0.0):
    try:
        if value != value:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_name(name):
    text = unicodedata.normalize("NFKD", name or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace(".", "").replace("'", "").replace("’", "")
    text = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
    return text


def scaled_rating(value):
    return clamp(35 + value * 0.64)


def rotation_floor(age, gp, gs, mpg, ppg, rpg, apg, spg, bpg, per, obpm, dbpm, usage):
    start_rate = gs / max(1, gp)
    stocks = spg + bpg
    floor = 55

    if mpg >= 34 and start_rate >= 0.65:
        floor = 80
    elif mpg >= 30 and start_rate >= 0.55:
        floor = 78
    elif mpg >= 27 and start_rate >= 0.45:
        floor = 76
    elif mpg >= 23:
        floor = 74
    elif mpg >= 18:
        floor = 72
    elif mpg >= 14:
        floor = 69
    elif mpg >= 10:
        floor = 66

    if ppg >= 18 or (ppg >= 15 and apg >= 4):
        floor = max(floor, 80)
    elif ppg >= 14 or apg >= 5:
        floor = max(floor, 77)
    elif ppg >= 10 and mpg >= 20:
        floor = max(floor, 74)

    if rpg >= 8 or (rpg >= 6 and bpg >= 1):
        floor = max(floor, 77)
    elif rpg >= 5 and mpg >= 24:
        floor = max(floor, 74)

    if stocks >= 2.2 and mpg >= 20:
        floor = max(floor, 78)
    elif stocks >= 1.6 and mpg >= 20:
        floor = max(floor, 75)

    if per >= 18 and mpg >= 18:
        floor = max(floor, 78)
    elif per >= 15 and mpg >= 18:
        floor = max(floor, 75)

    if (obpm or 0) + (dbpm or 0) >= 2.5 and mpg >= 18:
        floor = max(floor, 78)
    elif (obpm or 0) + (dbpm or 0) >= 0.5 and mpg >= 18:
        floor = max(floor, 75)

    if usage >= 23 and mpg >= 24:
        floor = max(floor, 78)

    if age <= 23 and mpg >= 18:
        floor += 2
    elif age <= 25 and mpg >= 24:
        floor += 1

    return min(floor, 84)


def current_stat_rating_floor(stat):
    ppg = stat["ppg"]
    rpg = stat["rpg"]
    apg = stat["apg"]
    stocks = stat["spg"] + stat["bpg"]
    mpg = stat["mpg"]
    gp = stat["gp"]
    gs = stat["gs"]
    age = stat["age"]
    per = stat["per"]
    usage = stat["usage"]
    bpm = stat["bpm"]
    ts = stat["ts_pct"]
    start_rate = gs / max(1, gp)

    floor = 55
    if mpg >= 32 and start_rate >= 0.7:
        floor = 80
    elif mpg >= 28 and start_rate >= 0.55:
        floor = 77
    elif mpg >= 24:
        floor = 74
    elif mpg >= 18:
        floor = 70
    elif mpg >= 14:
        floor = 66

    if ppg >= 26:
        floor = max(floor, 89)
    elif ppg >= 23 and apg >= 5:
        floor = max(floor, 88)
    elif ppg >= 22:
        floor = max(floor, 86)
    elif ppg >= 18 and apg >= 5:
        floor = max(floor, 85)
    elif ppg >= 18:
        floor = max(floor, 83)
    elif ppg >= 15 and mpg >= 27:
        floor = max(floor, 81)

    if apg >= 7 and mpg >= 28:
        floor = max(floor, 85)
    elif apg >= 5 and mpg >= 27:
        floor = max(floor, 82)

    if rpg >= 10 and mpg >= 24:
        floor = max(floor, 84)
    elif rpg >= 7 and ppg >= 12:
        floor = max(floor, 81)

    if stocks >= 2.3 and mpg >= 24:
        floor = max(floor, 83)
    elif stocks >= 1.8 and mpg >= 24:
        floor = max(floor, 80)

    if per >= 20 and mpg >= 24:
        floor = max(floor, 85)
    elif per >= 17 and mpg >= 24:
        floor = max(floor, 82)

    if bpm >= 3 and mpg >= 24:
        floor = max(floor, 85)
    elif bpm >= 1 and mpg >= 24:
        floor = max(floor, 82)

    if usage >= 25 and ts >= 0.58 and mpg >= 28:
        floor = max(floor, 86)

    if age <= 23 and mpg >= 26 and (ppg >= 14 or stocks >= 1.5):
        floor += 2
    elif age <= 25 and mpg >= 26:
        floor += 1

    if "AS" in stat["awards"]:
        floor = max(floor, 90)

    return min(floor, 90)


def current_stat_overall(stat):
    ppg = stat["ppg"]
    rpg = stat["rpg"]
    apg = stat["apg"]
    stocks = stat["spg"] + stat["bpg"]
    mpg = stat["mpg"]
    gp = stat["gp"]
    gs = stat["gs"]
    age = stat["age"]
    per = stat["per"]
    usage = stat["usage"]
    bpm = stat["bpm"]
    vorp = stat["vorp"]
    ts = stat["ts_pct"]
    ws48 = stat["ws48"]
    start_rate = gs / max(1, gp)

    score = (
        55
        + ppg * 0.62
        + apg * 0.82
        + rpg * 0.42
        + stocks * 1.45
        + max(0, mpg - 18) * 0.20
        + max(0, usage - 18) * 0.18
        + max(0, per - 12) * 0.34
        + bpm * 0.42
        + vorp * 0.30
        + (ts - 0.56) * 13
        + (ws48 - 0.08) * 12
    )

    if gp >= 50 and start_rate >= 0.75:
        score += 1.8
    if age <= 23 and mpg >= 24:
        score += 2.0
    elif age <= 25 and mpg >= 24:
        score += 1.0
    if "AS" in stat["awards"]:
        score += 2.0
    if "MVP" in stat["awards"]:
        score += 1.0
    if "DPOY" in stat["awards"]:
        score += 1.0

    cap = 86
    if ppg >= 27 or "AS" in stat["awards"]:
        cap = 92
    elif ppg >= 23 and apg >= 5:
        cap = 89
    elif ppg >= 23 or (per >= 20 and mpg >= 28):
        cap = 88
    elif ppg >= 18 or bpm >= 3:
        cap = 86
    elif ppg >= 15 or mpg >= 30:
        cap = 84

    return min(max(current_stat_rating_floor(stat), clamp(score, 55, 92)), cap)


def lift_ratings_to_overall(position, ratings, target_overall):
    current = calculate_overall(position, ratings)
    if current >= target_overall:
        return

    core_by_position = {
        "PG": ["playmaking", "outside_scoring", "perimeter_defense", "athleticism", "inside_scoring"],
        "SG": ["outside_scoring", "perimeter_defense", "playmaking", "athleticism", "inside_scoring"],
        "SF": ["outside_scoring", "perimeter_defense", "inside_scoring", "athleticism", "rebounding", "playmaking"],
        "PF": ["inside_scoring", "rebounding", "interior_defense", "athleticism", "outside_scoring"],
        "C": ["inside_scoring", "rebounding", "interior_defense", "athleticism"],
    }
    core = core_by_position.get(position, list(ratings.keys()))

    while calculate_overall(position, ratings) < target_overall:
        changed = False
        for key in core:
            if ratings[key] < 92:
                ratings[key] += 1
                changed = True
            if calculate_overall(position, ratings) >= target_overall:
                break
        if not changed:
            break


def latest_rating(player):
    ratings = player.get("ratings", [])
    if not ratings:
        return {}
    return max(ratings, key=lambda rating: rating.get("season", 0))


def latest_regular_stats(player):
    stats = [s for s in player.get("stats", []) if not s.get("playoffs")]
    if not stats:
        return {}
    return max(stats, key=lambda stat: stat.get("season", 0))


def map_position(raw_pos, ratings):
    raw_pos = raw_pos or ""
    if raw_pos in ["PG", "SG", "SF", "PF", "C"]:
        return raw_pos
    if raw_pos == "G":
        return "PG" if ratings.get("pss", 0) >= ratings.get("tp", 0) else "SG"
    if raw_pos == "GF":
        return "SF"
    if raw_pos == "F":
        return "SF"
    if raw_pos == "FC":
        return "PF"
    if raw_pos == "C":
        return "C"
    return "SG"


def traits_for_player(player):
    traits = []
    awards = [award.get("type", "") for award in player.get("awards", [])]
    for award in awards:
        for award_key, trait in TRAIT_BY_AWARD.items():
            if award_key in award and trait not in traits:
                traits.append(trait)
    rating = latest_rating(player)
    if rating.get("endu", 0) >= 70 and "Gym Rat" not in traits:
        traits.append("Gym Rat")
    if rating.get("tp", 0) >= 70 and "Clutch" not in traits:
        traits.append("Clutch")
    return traits[:2]


def convert_player(player, team_abbr, current_stat=None):
    rating = latest_rating(player)
    stats = latest_regular_stats(player)
    position = current_stat["pos"] if current_stat and current_stat.get("pos") in ["PG", "SG", "SF", "PF", "C"] else map_position(player.get("pos"), rating)
    age = int(current_stat["age"]) if current_stat and current_stat.get("age") else max(18, SEASON - int(player.get("born", {}).get("year", SEASON - 24)))

    ratings = {
        "playmaking": scaled_rating(rating.get("pss", 40) * 0.68 + rating.get("oiq", 40) * 0.32),
        "outside_scoring": scaled_rating(rating.get("tp", 40) * 0.62 + rating.get("fg", 40) * 0.28 + rating.get("ft", 40) * 0.10),
        "inside_scoring": scaled_rating(rating.get("ins", 40) * 0.46 + rating.get("dnk", 40) * 0.32 + rating.get("fg", 40) * 0.22),
        "perimeter_defense": scaled_rating(rating.get("drb", 40) * 0.62 + rating.get("diq", 40) * 0.38),
        "interior_defense": scaled_rating(rating.get("diq", 40) * 0.48 + rating.get("stre", 40) * 0.22 + rating.get("hgt", 40) * 0.30),
        "rebounding": scaled_rating(rating.get("reb", 40) * 0.72 + rating.get("hgt", 40) * 0.28),
        "athleticism": scaled_rating(rating.get("spd", 40) * 0.38 + rating.get("jmp", 40) * 0.38 + rating.get("stre", 40) * 0.24),
        "stamina": scaled_rating(rating.get("endu", 40)),
    }
    if current_stat:
        gp = max(1, current_stat["gp"])
        ppg = current_stat["ppg"]
        apg = current_stat["apg"]
        rpg = current_stat["rpg"]
        spg = current_stat["spg"]
        bpg = current_stat["bpg"]
        usage = current_stat["usage"]
        overall = current_stat_overall(current_stat)

        ratings["outside_scoring"] = max(
            ratings["outside_scoring"],
            clamp(58 + current_stat["three_pct"] * 55 + min(10, current_stat["three_attempts"]) * 1.4 + current_stat["ft_pct"] * 8)
        )
        ratings["inside_scoring"] = max(
            ratings["inside_scoring"],
            clamp(58 + current_stat["fg_pct"] * 45 + min(10, current_stat["ppg"]) * 0.8)
        )
        ratings["playmaking"] = max(ratings["playmaking"], clamp(55 + current_stat["apg"] * 5.0 + current_stat["usage"] * 0.45))
        ratings["rebounding"] = max(ratings["rebounding"], clamp(55 + current_stat["rpg"] * 3.3))
        ratings["perimeter_defense"] = max(ratings["perimeter_defense"], clamp(55 + current_stat["spg"] * 10 + current_stat["bpm"] * 1.2))
        ratings["interior_defense"] = max(ratings["interior_defense"], clamp(55 + current_stat["bpg"] * 12 + current_stat["rpg"] * 1.0))
        ratings["stamina"] = max(ratings["stamina"], clamp(55 + current_stat["mpg"] * 1.25))
    else:
        gp = max(1, stats.get("gp", 1))
        gs = stats.get("gs", 0)
        mpg = stats.get("min", 0) / gp
        ppg = stats.get("pts", 0) / gp
        apg = stats.get("ast", 0) / gp
        rpg = (stats.get("orb", 0) + stats.get("drb", 0)) / gp
        spg = stats.get("stl", 0) / gp
        bpg = stats.get("blk", 0) / gp
        per = stats.get("per", 10)
        usage = stats.get("usgp", 14)
        games_factor = min(1.0, gp / 55.0)
        all_star_bonus = 2 if any("All-Star" in award.get("type", "") for award in player.get("awards", [])) else 0
        all_nba_bonus = 2 if any("All-League" in award.get("type", "") for award in player.get("awards", [])) else 0
        all_defense_bonus = 1 if any("All-Defensive" in award.get("type", "") for award in player.get("awards", [])) else 0

        production_overall = (
            58
            + ppg * 0.62
            + apg * 1.05
            + rpg * 0.52
            + (spg + bpg) * 1.55
            + max(0, per - 12) * 0.48
            + max(0, usage - 20) * 0.22
            + all_star_bonus
            + all_nba_bonus
            + all_defense_bonus
        )
        tools_overall = calculate_overall(position, ratings)
        overall = clamp((production_overall * 0.72 + tools_overall * 0.28) * (0.94 + games_factor * 0.06), 55, 89)

        role_floor = rotation_floor(age, gp, gs, mpg, ppg, rpg, apg, spg, bpg, per, stats.get("obpm", 0), stats.get("dbpm", 0), usage)
        if overall < role_floor:
            overall = role_floor

    if player["name"] in SIGNATURE_RATINGS:
        ratings.update(SIGNATURE_RATINGS[player["name"]])
    elif player["name"] in STAR_OVERALLS:
        target = STAR_OVERALLS[player["name"]]
        current = calculate_overall(position, ratings)
        lift = max(0, target - current)
        for key in ["playmaking", "outside_scoring", "inside_scoring", "perimeter_defense", "interior_defense", "rebounding", "athleticism", "stamina"]:
            ratings[key] = clamp(ratings[key] + lift * 0.65)

    if player["name"] in STAR_OVERALLS:
        overall = STAR_OVERALLS[player["name"]]

    lift_ratings_to_overall(position, ratings, overall)

    contract = player.get("contract", {})
    salary = round(float(contract.get("amount", max(1200, overall * 260))) / 1000.0, 2)
    contract_years = max(1, int(contract.get("exp", SEASON + 1)) - SEASON)

    return {
        "id": f"NBA_{player.get('srID') or player['name'].replace(' ', '_')}",
        "name": player["name"],
        "age": age,
        "position": position,
        "potential": clamp(max(overall, overall + max(0, 27 - age) * 1.8 + random.randint(0, 4)), 45, 99),
        "loyalty": random.randint(35, 90),
        "traits": traits_for_player(player),
        "salary": salary,
        "contract_years": contract_years,
        "injured": player.get("injury", {}).get("type") not in [None, "Healthy"],
        "injury_days": int(player.get("injury", {}).get("gamesRemaining", 0) or 0),
        "ratings": ratings,
        "overall": overall,
        "team_id": team_abbr,
        "stats": empty_stats(),
        "career_stats": [],
        "headshot_url": player.get("imgURL", ""),
        "source": "Basketball GM 2025-26 NBA roster"
    }


def fetch_source():
    os.makedirs(DATA_DIR, exist_ok=True)
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "HoopsSimLeague/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read()
    with open(ROSTER_SOURCE_PATH, "wb") as f:
        f.write(raw)
    return json.loads(raw.decode("utf-8"))


def fetch_bref_stats():
    try:
        import pandas as pd
    except ImportError:
        print("pandas is not installed; using cached roster stats only.")
        return {}

    def clean_table(url):
        table = pd.read_html(url)[0]
        table = table[table["Rk"] != "Rk"].copy()
        for column in table.columns:
            if column not in ["Player", "Team", "Pos", "Awards"]:
                table[column] = pd.to_numeric(table[column], errors="coerce")
        return table

    per_game = clean_table(BREF_PER_GAME_URL)
    advanced = clean_table(BREF_ADVANCED_URL)
    advanced_cols = ["Player", "Team", "PER", "TS%", "USG%", "BPM", "VORP", "WS/48"]
    merged = per_game.merge(advanced[advanced_cols], on=["Player", "Team"], how="left")

    rows = []
    for _, row in merged.iterrows():
        stat = {
            "player": row["Player"],
            "team": row["Team"],
            "pos": row["Pos"],
            "age": safe_float(row.get("Age")),
            "gp": safe_float(row.get("G")),
            "gs": safe_float(row.get("GS")),
            "mpg": safe_float(row.get("MP")),
            "ppg": safe_float(row.get("PTS")),
            "rpg": safe_float(row.get("TRB")),
            "apg": safe_float(row.get("AST")),
            "spg": safe_float(row.get("STL")),
            "bpg": safe_float(row.get("BLK")),
            "tov": safe_float(row.get("TOV")),
            "fg_pct": safe_float(row.get("FG%")),
            "three_made": safe_float(row.get("3P")),
            "three_attempts": safe_float(row.get("3PA")),
            "three_pct": safe_float(row.get("3P%")),
            "ft_pct": safe_float(row.get("FT%")),
            "per": safe_float(row.get("PER"), 12),
            "ts_pct": safe_float(row.get("TS%"), 0.56),
            "usage": safe_float(row.get("USG%"), 18),
            "bpm": safe_float(row.get("BPM")),
            "vorp": safe_float(row.get("VORP")),
            "ws48": safe_float(row.get("WS/48"), 0.08),
            "awards": "" if row.get("Awards") != row.get("Awards") else str(row.get("Awards")),
        }
        rows.append(stat)

    with open(BREF_SOURCE_PATH, "w") as f:
        json.dump(rows, f, indent=2)

    by_name = {}
    for stat in rows:
        key = normalize_name(stat["player"])
        by_name.setdefault(key, []).append(stat)
    return by_name


def pick_current_stat(player_name, team_abbr, bref_stats):
    candidates = bref_stats.get(normalize_name(player_name), [])
    if not candidates:
        return None

    matching_team = [stat for stat in candidates if stat["team"] == team_abbr]
    if matching_team:
        return max(matching_team, key=lambda stat: stat["gp"])

    total_rows = [stat for stat in candidates if stat["team"] == "2TM"]
    if total_rows:
        return max(total_rows, key=lambda stat: stat["gp"])

    return max(candidates, key=lambda stat: stat["gp"])


def build_rosters(source, bref_stats):
    active_team_ids = {p["tid"] for p in source["players"] if isinstance(p.get("tid"), int) and 0 <= p["tid"] <= 29}
    source_teams = [team for team in source["teams"] if team["tid"] in active_team_ids]
    team_by_tid = {}
    teams = []

    for team in sorted(source_teams, key=lambda t: t["tid"]):
        colors = team.get("colors") or ["#888888", "#ffffff"]
        converted = {
            "id": team["abbrev"],
            "name": team["name"],
            "city": team["region"],
            "abbreviation": team["abbrev"],
            "colors": {
                "primary": colors[0],
                "secondary": colors[1] if len(colors) > 1 else "#ffffff",
            },
            "budget": SALARY_CAP_MILLIONS,
            "wins": 0,
            "losses": 0,
            "logo_url": f"/logos/{team['abbrev']}.svg",
        }
        teams.append(converted)
        team_by_tid[team["tid"]] = converted

    players = []
    for player in source["players"]:
        tid = player.get("tid")
        if tid not in team_by_tid or not player.get("name"):
            continue
        team_abbr = team_by_tid[tid]["abbreviation"]
        players.append(convert_player(player, team_abbr, pick_current_stat(player["name"], team_abbr, bref_stats)))

    players.sort(key=lambda p: (p["team_id"], -p["overall"], p["name"]))
    return {"teams": teams, "players": players, "free_agents": []}


def build_draft_classes():
    return [
        {"year": year, "prospects": [generate_prospect(f"D_{year}_{i + 1}", year) for i in range(60)]}
        for year in [2026, 2027]
    ]


def build_history(rosters):
    retired = []
    for team in rosters["teams"]:
        if team["abbreviation"] == "LAL":
            retired.extend([
                {"team": "LAL", "number": 8, "player": "Kobe Bryant"},
                {"team": "LAL", "number": 24, "player": "Kobe Bryant"},
            ])
        elif team["abbreviation"] == "CHI":
            retired.append({"team": "CHI", "number": 23, "player": "Michael Jordan"})
        elif team["abbreviation"] == "BOS":
            retired.append({"team": "BOS", "number": 33, "player": "Larry Bird"})

    return {
        "current_year": 2026,
        "current_stage": "regular_season",
        "day": 0,
        "seasons": [],
        "all_time_stats": {"scoring_leaders": [], "rebound_leaders": [], "assist_leaders": []},
        "retired_jerseys": retired,
        "hall_of_fame": [],
        "news": "Real 2025-26 NBA teams and rosters loaded. Start a live matchup to watch the league sim."
    }


def write_json(filename, data):
    with open(os.path.join(DATA_DIR, filename), "w") as f:
        json.dump(data, f, indent=2)


def main():
    source = fetch_source()
    bref_stats = fetch_bref_stats()
    rosters = build_rosters(source, bref_stats)
    write_json("rosters.json", rosters)
    write_json("draft_classes.json", build_draft_classes())
    write_json("league_history.json", build_history(rosters))
    print(f"Imported {len(rosters['teams'])} NBA teams and {len(rosters['players'])} players.")
    print(f"Source cached at {ROSTER_SOURCE_PATH}")


if __name__ == "__main__":
    main()
