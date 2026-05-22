// Hoops Sim League - Frontend Engine

let state = {
    currentYear: 2026,
    currentStage: "regular_season",
    userTeam: "BOS",
    teams: [],
    players: [],
    freeAgents: [],
    draftClass: [],
    history: { seasons: [], retired_jerseys: [], hall_of_fame: [] },
    news: "Welcome to the new Hoops Sim League! Click 'Simulate Day' to begin.",
    activeTab: "dashboard-tab",
    
    // Live Sim State
    liveSim: {
        awayTeam: null,
        homeTeam: null,
        pbp: [],
        pbpIndex: 0,
        boxScore: {},
        intervalId: null,
        speed: 3500,
        boxScoreTeam: "away", // Which team to display in box score
        finalAwayScore: 0,
        finalHomeScore: 0,
        currentAwayScore: 0,
        currentHomeScore: 0,
        arena3d: null,
        phase: "setup", // "setup", "warmup", "game"
        isPaused: false,
        warmupTimer: null
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

// 1. Initial Setup & Fetching
async function initApp() {
    await fetchLeagueData();
    renderAll();
    showToast("🏀 Hoops Sim League initialized successfully!");
}

async function fetchLeagueData() {
    try {
        const res = await fetch("/api/league_data");
        const data = await res.json();
        
        state.currentYear = data.history.current_year;
        state.currentStage = data.history.current_stage;
        state.teams = data.rosters.teams;
        if (!state.teams.some(t => t.abbreviation === state.userTeam) && state.teams.length > 0) {
            state.userTeam = state.teams[0].abbreviation;
        }
        state.players = data.rosters.players;
        state.freeAgents = data.rosters.free_agents || [];
        state.draftClass = data.draftClass || [];
        state.history = data.history;
        state.news = data.news || state.news;
        
        // Update header badges
        document.getElementById("season-year").textContent = state.currentYear;
        
        // Human readable stage
        let stageText = "Regular Season";
        if (state.currentStage === "playoffs") stageText = "Playoffs 🏆";
        else if (state.currentStage === "offseason_draft") stageText = "Offseason - Draft";
        else if (state.currentStage === "offseason_free_agency") stageText = "Offseason - Free Agency";
        else if (state.currentStage === "offseason_progression") stageText = "Offseason - Training";
        
        document.getElementById("season-stage").textContent = stageText;
        
        // Populate selectors
        populateTeamSelectors();
        updateStageButtons();
        
    } catch (err) {
        console.error("Error fetching league data:", err);
        showToast("⚠️ Failed to load league data from server.");
    }
}

function populateTeamSelectors() {
    const rosterSelect = document.getElementById("roster-team-select");
    const oldRosterVal = rosterSelect.value;
    rosterSelect.innerHTML = "";
    
    const awaySelect = document.getElementById("sim-team1-select");
    const homeSelect = document.getElementById("sim-team2-select");
    awaySelect.innerHTML = "";
    homeSelect.innerHTML = "";
    
    state.teams.forEach((t, idx) => {
        // Roster selector
        const opt = document.createElement("option");
        opt.value = t.abbreviation;
        opt.textContent = `${t.city} ${t.name} (${t.abbreviation})`;
        rosterSelect.appendChild(opt);
        
        // Away selector
        const optAway = document.createElement("option");
        optAway.value = t.abbreviation;
        optAway.textContent = `${t.city} ${t.name}`;
        if (idx === 0) optAway.selected = true;
        awaySelect.appendChild(optAway);
        
        // Home selector
        const optHome = document.createElement("option");
        optHome.value = t.abbreviation;
        optHome.textContent = `${t.city} ${t.name}`;
        if (idx === 1) optHome.selected = true;
        homeSelect.appendChild(optHome);
    });
    
    if (oldRosterVal) {
        rosterSelect.value = oldRosterVal;
    } else {
        rosterSelect.value = state.userTeam;
    }
    
    // Set user team badge
    const uTeam = state.teams.find(t => t.abbreviation === state.userTeam);
    if (uTeam) {
        document.getElementById("user-team-name").textContent = `${uTeam.city} ${uTeam.name}`;
        document.getElementById("user-team-name").style.color = uTeam.colors.primary;
    }
}

function updateStageButtons() {
    const btnSimDay = document.getElementById("btn-sim-day");
    const btnSimSeason = document.getElementById("btn-sim-season");
    const btnStartPlayoffs = document.getElementById("btn-start-playoffs");
    const btnEnterOffseason = document.getElementById("btn-enter-offseason");
    
    btnSimDay.classList.add("hidden");
    btnSimSeason.classList.add("hidden");
    btnStartPlayoffs.classList.add("hidden");
    btnEnterOffseason.classList.add("hidden");
    
    if (state.currentStage === "regular_season") {
        btnSimDay.classList.remove("hidden");
        btnSimSeason.classList.remove("hidden");
    } else if (state.currentStage === "playoffs") {
        btnSimDay.classList.remove("hidden");
        btnSimDay.textContent = "Simulate Playoff Game";
        btnSimSeason.classList.remove("hidden");
        btnSimSeason.textContent = "Simulate Playoff Round";
    } else if (state.currentStage === "offseason_draft") {
        // In draft stage
        btnSimDay.classList.remove("hidden");
        btnSimDay.textContent = "Auto Draft Step";
        btnSimSeason.classList.remove("hidden");
        btnSimSeason.textContent = "Simulate Entire Draft";
    } else if (state.currentStage === "offseason_free_agency") {
        btnSimDay.classList.remove("hidden");
        btnSimDay.textContent = "Advance Free Agency Day";
        btnSimSeason.classList.remove("hidden");
        btnSimSeason.textContent = "Simulate Free Agency End";
    } else if (state.currentStage === "offseason_progression") {
        btnEnterOffseason.classList.remove("hidden");
        btnEnterOffseason.textContent = "Run Offseason Training & Start Next Season";
    }
}

// 2. Rendering Controllers
function renderAll() {
    updateNewsTicker();
    renderDashboardTab();
    renderRostersTab();
    renderFreeAgencyTab();
    renderDraftTab();
    renderHistoryTab();
}

function updateNewsTicker() {
    const ticker = document.getElementById("news-text");
    ticker.textContent = state.news;
}

// Render Dashboard (Standings & Leaders)
function renderDashboardTab() {
    // 1. Standings
    const tbody = document.getElementById("standings-tbody");
    tbody.innerHTML = "";
    
    // Sort teams by wins
    const sortedTeams = [...state.teams].sort((a, b) => b.wins - a.wins);
    const maxWins = sortedTeams[0].wins;
    
    sortedTeams.forEach((t) => {
        const pct = (t.wins + t.losses) === 0 ? ".000" : (t.wins / (t.wins + t.losses)).toFixed(3).substring(1);
        const gb = maxWins === t.wins ? "-" : (maxWins - t.wins);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-left team-name-col">
                <span class="team-badge" style="color: ${t.colors.primary}; background-color: ${t.colors.primary};"></span>
                <span>${t.city} ${t.name} (${t.abbreviation})</span>
            </td>
            <td><strong>${t.wins}</strong></td>
            <td>${t.losses}</td>
            <td>${pct}</td>
            <td>${gb}</td>
            <td>
                <span class="team-badge" style="background-color: ${t.colors.primary};"></span>
                <span class="team-badge" style="background-color: ${t.colors.secondary};"></span>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // 2. Leaders
    renderStatLeaders("pts");
    
    // 3. Schedule / Remaining
    const schedBody = document.getElementById("schedule-body");
    schedBody.innerHTML = "";
    
    if (state.currentStage === "regular_season") {
        const matchups = [];
        for (let i = 0; i < Math.min(6, state.teams.length - 1); i += 2) {
            matchups.push([state.teams[i], state.teams[i + 1]]);
        }
        schedBody.innerHTML = matchups.map(([away, home]) => `
            <div class="schedule-item">
                <span class="schedule-team">${away.abbreviation} ${away.name}</span>
                <span class="schedule-vs">at</span>
                <span class="schedule-team">${home.abbreviation} ${home.name}</span>
            </div>
        `).join("");
    } else if (state.currentStage === "playoffs") {
        schedBody.innerHTML = `<div class="empty-state">🏆 Playoffs are in progress! Click 'Simulate Playoff Game' above.</div>`;
    } else {
        schedBody.innerHTML = `<div class="empty-state">🤝 Offseason in progress. Standard season games suspended.</div>`;
    }
}

function renderStatLeaders(stat) {
    const container = document.getElementById("leaders-list");
    container.innerHTML = "";
    
    // Extract active players
    const activePlayers = [...state.players];
    
    // Stat selector logic
    let statSelector = (p) => 0;
    let label = "PTS";
    
    if (stat === "pts") {
        statSelector = (p) => p.stats.games_played === 0 ? 0 : (p.stats.points / p.stats.games_played);
        label = "PPG";
    } else if (stat === "reb") {
        statSelector = (p) => p.stats.games_played === 0 ? 0 : (p.stats.rebounds / p.stats.games_played);
        label = "RPG";
    } else if (stat === "ast") {
        statSelector = (p) => p.stats.games_played === 0 ? 0 : (p.stats.assists / p.stats.games_played);
        label = "APG";
    }
    
    // Sort players by stat average
    const sorted = activePlayers
        .filter(p => p.stats.games_played > 0)
        .sort((a, b) => statSelector(b) - statSelector(a))
        .slice(0, 5);
        
    if (sorted.length === 0) {
        container.innerHTML = `<div class="empty-state">No stats accumulated yet. Sim games to populate leaders!</div>`;
        return;
    }
    
    sorted.forEach((p, idx) => {
        const val = statSelector(p).toFixed(1);
        const item = document.createElement("div");
        item.className = "leader-item";
        item.innerHTML = `
            <div class="leader-rank">#${idx + 1}</div>
            <div class="leader-details">
                <div class="leader-name">${p.name}</div>
                <div class="leader-team-pos">${p.team_id} • ${p.position}</div>
            </div>
            <div class="leader-val">${val} <span style="font-size: 11px; color: var(--text-muted);">${label}</span></div>
        `;
        container.appendChild(item);
    });
}

// Render Rosters
function renderRostersTab() {
    const selectedTeam = document.getElementById("roster-team-select").value;
    const teamPlayers = state.players.filter(p => p.team_id === selectedTeam);
    
    // Calculate total salaries
    const spent = teamPlayers.reduce((acc, p) => acc + p.salary, 0);
    document.getElementById("team-cap-spent").textContent = `$${spent.toFixed(1)}M`;
    
    const selectedTeamObj = state.teams.find(t => t.abbreviation === selectedTeam);
    const cap = selectedTeamObj ? selectedTeamObj.budget : 154.647;
    const pct = Math.min(100, (spent / cap) * 100);
    const capLabel = document.querySelector(".team-cap-info span");
    if (capLabel) {
        capLabel.innerHTML = `Cap Spent: <strong id="team-cap-spent">$${spent.toFixed(1)}M</strong> / $${cap.toFixed(1)}M`;
    }
    const fill = document.getElementById("team-cap-fill");
    fill.style.width = `${pct}%`;
    if (pct > 90) fill.style.background = "var(--accent-crimson)";
    else if (pct > 75) fill.style.background = "var(--accent-amber)";
    else fill.style.background = "linear-gradient(90deg, var(--accent-emerald), var(--accent-primary))";
    
    const tbody = document.getElementById("roster-tbody");
    tbody.innerHTML = "";
    
    // Sort starters first (top 5 overall)
    teamPlayers.sort((a, b) => b.overall - a.overall);
    
    teamPlayers.forEach((p, idx) => {
        const isStarter = idx < 5;
        const nameDisplay = isStarter ? `⭐ <strong>${p.name}</strong>` : p.name;
        
        let traitBadges = "";
        p.traits.forEach(t => {
            let cls = "";
            if (t === "Clutch") cls = "clutch";
            else if (t === "Gym Rat") cls = "gym";
            traitBadges += `<span class="trait-badge ${cls}">${t}</span>`;
        });
        
        const ovrClass = p.overall >= 84 ? "high" : (p.overall >= 74 ? "mid" : "");
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-left">${nameDisplay}</td>
            <td><strong>${p.position}</strong></td>
            <td>${p.age}</td>
            <td><span class="ovr-pill ${ovrClass}">${p.overall}</span></td>
            <td><span class="ovr-pill">${p.potential}</span></td>
            <td>${p.ratings.inside_scoring}</td>
            <td>${p.ratings.outside_scoring}</td>
            <td>${p.ratings.perimeter_defense}</td>
            <td class="text-left">${traitBadges}</td>
            <td><strong>$${p.salary.toFixed(1)}M</strong></td>
            <td>${p.contract_years}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Render Free Agency
function renderFreeAgencyTab() {
    const tbody = document.getElementById("fa-tbody");
    tbody.innerHTML = "";
    
    if (state.currentStage !== "offseason_free_agency") {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="8" class="text-center">Free agency is currently closed. Enter the Offseason stage to negotiate.</td></tr>`;
        return;
    }
    
    if (state.freeAgents.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="8" class="text-center">No free agents left on the market.</td></tr>`;
        return;
    }
    
    // Show top FAs
    state.freeAgents.sort((a, b) => b.overall - a.overall);
    
    state.freeAgents.forEach((p) => {
        let traitBadges = "";
        p.traits.forEach(t => {
            let cls = "";
            if (t === "Clutch") cls = "clutch";
            else if (t === "Gym Rat") cls = "gym";
            traitBadges += `<span class="trait-badge ${cls}">${t}</span>`;
        });
        
        // Calculate dynamic demands based on overall & traits
        let demand = p.salary;
        if (p.traits.includes("Money-Motivated")) demand *= 1.20;
        if (p.traits.includes("Loyal") || p.traits.includes("Hometown Discount")) demand *= 0.90;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-left"><strong>${p.name}</strong></td>
            <td><strong>${p.position}</strong></td>
            <td>${p.age}</td>
            <td><span class="ovr-pill high">${p.overall}</span></td>
            <td><span class="ovr-pill">${p.potential}</span></td>
            <td class="text-left">${traitBadges}</td>
            <td><strong style="color: var(--accent-emerald);">$${demand.toFixed(1)}M / year</strong></td>
            <td>
                <button class="btn btn-primary" onclick="bidFreeAgent('${p.id}', ${demand})">Sign Player</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Offer free agent contract
async function bidFreeAgent(playerId, amount) {
    try {
        const res = await fetch("/api/sign_free_agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_id: playerId, bid: amount, team_id: state.userTeam })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(`✅ Successfully signed to ${state.userTeam}!`);
            await fetchLeagueData();
            renderAll();
        } else {
            showToast(`❌ Bid rejected: ${data.message}`);
        }
    } catch (err) {
        console.error("Error signing free agent:", err);
        showToast("⚠️ Communication error offering contract.");
    }
}

// Render Draft
function renderDraftTab() {
    const list = document.getElementById("draft-order-list");
    list.innerHTML = "";
    
    const grid = document.getElementById("prospects-grid");
    grid.innerHTML = "";
    
    if (state.currentStage !== "offseason_draft") {
        list.innerHTML = `<div class="empty-state">The Draft is currently closed. Complete the season to draft new players!</div>`;
        grid.innerHTML = `<div class="empty-state">No prospects scouted for this stage.</div>`;
        return;
    }
    
    // Current draft order
    // In our 8-team league, draft order is inverse of last regular season wins
    // Render basic order representation
    const sortedTeams = [...state.teams].sort((a, b) => a.wins - b.wins);
    
    sortedTeams.forEach((t, idx) => {
        const li = document.createElement("li");
        li.className = "draft-order-item";
        if (idx === 0) {
            li.className += " active";
            li.innerHTML = `👉 <strong>Pick #${idx + 1}: ${t.city} ${t.name}</strong>`;
            document.getElementById("current-draft-pick-desc").textContent = `Active Draft Pick: ${t.city} ${t.name}`;
        } else {
            li.textContent = `Pick #${idx + 1}: ${t.city} ${t.name}`;
        }
        list.appendChild(li);
    });
    
    // Render available prospects
    if (state.draftClass.length === 0) {
        grid.innerHTML = `<div class="empty-state">No draft prospects available.</div>`;
        return;
    }
    
    // Sort prospects by project round / overall
    const prospects = [...state.draftClass].sort((a, b) => b.potential - a.potential);
    
    prospects.forEach((p) => {
        const card = document.createElement("div");
        card.className = "prospect-card";
        
        card.innerHTML = `
            <div class="prospect-header">
                <div>
                    <h3 class="prospect-name">${p.name}</h3>
                    <div class="prospect-pos-arch">${p.position} • ${p.archetype}</div>
                </div>
                <div class="ovr-pill high">${p.overall} OVR</div>
            </div>
            <div class="prospect-stats">
                <div class="prospect-stat">
                    <span class="prospect-stat-label">Potential</span>
                    <span class="prospect-stat-val" style="color: var(--accent-amber);">${p.potential}</span>
                </div>
                <div class="prospect-stat">
                    <span class="prospect-stat-label">Age</span>
                    <span class="prospect-stat-val">${p.age}</span>
                </div>
                <div class="prospect-stat">
                    <span class="prospect-stat-label">Projected</span>
                    <span class="prospect-stat-val">Rnd ${p.projected_round}</span>
                </div>
            </div>
            <button class="btn btn-primary" onclick="draftProspect('${p.id}')">Draft Prospect</button>
        `;
        grid.appendChild(card);
    });
}

// Draft a player
async function draftProspect(prospectId) {
    try {
        const res = await fetch("/api/draft_player", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prospect_id: prospectId, team_id: state.userTeam })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(`🗳️ Draft Pick completed successfully!`);
            await fetchLeagueData();
            renderAll();
        } else {
            showToast(`❌ Draft failed: ${data.message}`);
        }
    } catch (err) {
        console.error("Draft error:", err);
        showToast("⚠️ Communication error making draft pick.");
    }
}

// Render History & Hall of Fame
function renderHistoryTab() {
    // 1. Champions
    const champContainer = document.getElementById("champions-list");
    champContainer.innerHTML = "";
    
    if (state.history.seasons.length === 0) {
        champContainer.innerHTML = `<div class="empty-state">No champions crowned yet. Simulate the first season to crown a champion!</div>`;
    } else {
        state.history.seasons.forEach((s) => {
            const row = document.createElement("div");
            row.className = "champion-row";
            row.innerHTML = `
                <div>
                    <span class="champ-year">${s.year} Champion</span>
                    <div class="champ-team">🏆 ${s.champion}</div>
                </div>
                <div class="champ-mvp">
                    <div>MVP: <strong>${s.mvp}</strong></div>
                    <div>Finals MVP: <strong>${s.finals_mvp}</strong></div>
                </div>
            `;
            champContainer.appendChild(row);
        });
    }
    
    // 2. Retired Jerseys
    const jerseyContainer = document.getElementById("jersey-wall");
    jerseyContainer.innerHTML = "";
    
    if (state.history.retired_jerseys.length === 0) {
        jerseyContainer.innerHTML = `<div class="empty-state">No jerseys retired yet.</div>`;
    } else {
        state.history.retired_jerseys.forEach((rj) => {
            const tObj = state.teams.find(t => t.abbreviation === rj.team);
            const color = tObj ? tObj.colors.primary : "#3b82f6";
            
            const div = document.createElement("div");
            div.className = "retired-jersey-item";
            div.innerHTML = `
                <div class="jersey-vector" style="color: ${color};">
                    ${rj.number}
                </div>
                <div class="jersey-player-name">${rj.player}</div>
                <div class="jersey-team-abbr">${rj.team}</div>
            `;
            jerseyContainer.appendChild(div);
        });
    }
    
    // 3. Hall of Fame
    const hofTbody = document.getElementById("hof-tbody");
    hofTbody.innerHTML = "";
    
    if (state.history.hall_of_fame.length === 0) {
        hofTbody.innerHTML = `<tr class="empty-row"><td colspan="8" class="text-center">No legendary players have retired to the Hall of Fame yet.</td></tr>`;
    } else {
        state.history.hall_of_fame.forEach((h) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="text-left">👑 <strong>${h.name}</strong></td>
                <td><strong>${h.position}</strong></td>
                <td>${h.games_played}</td>
                <td><strong>${h.career_points}</strong></td>
                <td>${h.career_rebounds}</td>
                <td>${h.career_assists}</td>
                <td><strong style="color: var(--accent-amber);">${h.career_ppg} PPG</strong></td>
                <td>Class of ${h.induction_year}</td>
            `;
            hofTbody.appendChild(tr);
        });
    }
}

// 3. Simulated Play Loop
async function simulateDay() {
    try {
        const res = await fetch("/api/sim_day", { method: "POST" });
        const data = await res.json();
        
        state.news = data.news;
        showToast("📆 simulated matchups completed!");
        await fetchLeagueData();
        renderAll();
    } catch (err) {
        console.error("Error simulating day:", err);
        showToast("⚠️ Failed to sim day.");
    }
}

async function simulateSeason() {
    try {
        showToast("🔄 Simulating regular season in progress...");
        const res = await fetch("/api/sim_season", { method: "POST" });
        const data = await res.json();
        
        state.news = data.news;
        showToast("🏆 Regular Season simulation completed!");
        await fetchLeagueData();
        renderAll();
    } catch (err) {
        console.error("Error simulating season:", err);
        showToast("⚠️ Simulation engine timed out.");
    }
}

async function runProgression() {
    try {
        showToast("⚡ Running offseason player growth & training...");
        const res = await fetch("/api/run_progression", { method: "POST" });
        const data = await res.json();
        
        state.news = data.news;
        showToast("🚀 Roster progression completed! New draft prospects loaded.");
        await fetchLeagueData();
        renderAll();
    } catch (err) {
        console.error("Progression error:", err);
        showToast("⚠️ Failed to run progression.");
    }
}

// 4. Play-By-Play Live Matchup Visualizer
async function startLiveSim() {
    if (state.liveSim.intervalId) {
        clearInterval(state.liveSim.intervalId);
    }
    
    const awayAbbr = document.getElementById("sim-team1-select").value;
    const homeAbbr = document.getElementById("sim-team2-select").value;
    
    if (awayAbbr === homeAbbr) {
        showToast("❌ Away and Home teams must be different!");
        return;
    }
    
    const awayTeamObj = state.teams.find(t => t.abbreviation === awayAbbr);
    const homeTeamObj = state.teams.find(t => t.abbreviation === homeAbbr);
    
    // Reset visuals
    document.getElementById("live-arena").classList.remove("hidden");
    document.getElementById("sim-away-name").textContent = awayTeamObj.name.toUpperCase();
    document.getElementById("sim-away-dot").style.color = awayTeamObj.colors.primary;
    setLogo("sim-away-logo", awayTeamObj);
    document.getElementById("sim-home-name").textContent = homeTeamObj.name.toUpperCase();
    document.getElementById("sim-home-dot").style.color = homeTeamObj.colors.primary;
    setLogo("sim-home-logo", homeTeamObj);
    
    document.getElementById("sim-away-score").textContent = "0";
    document.getElementById("sim-home-score").textContent = "0";
    document.getElementById("sim-match-time").textContent = "1ST QUARTER";
    document.getElementById("featured-play").textContent = "Broadcast crew is setting the stage.";
    document.getElementById("possession-team").textContent = "Tipoff";
    document.getElementById("momentum-away").textContent = awayTeamObj.abbreviation;
    document.getElementById("momentum-home").textContent = homeTeamObj.abbreviation;
    document.getElementById("momentum-fill").style.width = "50%";
    document.getElementById("court-ball").className = "";
    
    const logContainer = document.getElementById("pbp-log-container");
    logContainer.innerHTML = `<div class="pbp-msg normal">Setting up the floor. Tipoff is moments away.</div>`;
    try {
        initArena3D(awayTeamObj, homeTeamObj);
    } catch (e) {
        console.error("Failed to initialize 3D Arena:", e);
    }
    
    showToast("🏀 Simulating live matchup...");
    
    try {
        const res = await fetch("/api/simulate_matchup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ away: awayAbbr, home: homeAbbr })
        });
        const data = await res.json();
        
        state.liveSim.awayTeam = awayTeamObj;
        state.liveSim.homeTeam = homeTeamObj;
        state.liveSim.pbp = data.pbp_log;
        state.liveSim.boxScore = data.box_score;
        state.liveSim.pbpIndex = 0;
        state.liveSim.finalAwayScore = data.away_score;
        state.liveSim.finalHomeScore = data.home_score;
        state.liveSim.currentAwayScore = 0;
        state.liveSim.currentHomeScore = 0;
        
        // Show box score corresponding to away team first
        state.liveSim.boxScoreTeam = "away";
        document.getElementById("box-away-btn").textContent = awayTeamObj.name;
        document.getElementById("box-home-btn").textContent = homeTeamObj.name;
        
        // Render box score placeholders
        renderLiveBoxScore();
        
        // Reset pause state and phase
        state.liveSim.isPaused = false;
        state.liveSim.phase = "warmup";
        
        const btnPause = document.getElementById("btn-pause-sim");
        if (btnPause) {
            btnPause.innerHTML = "⏸ Pause";
            btnPause.classList.remove("btn-paused");
        }
        
        // Show warmup overlay
        const overlay = document.getElementById("warmup-overlay");
        if (overlay) {
            overlay.classList.remove("hidden");
        }
        
        const matchupText = document.getElementById("warmup-matchup-text");
        if (matchupText) {
            matchupText.textContent = `${awayTeamObj.city.toUpperCase()} ${awayTeamObj.name.toUpperCase()} vs ${homeTeamObj.city.toUpperCase()} ${homeTeamObj.name.toUpperCase()}`;
        }
        
        // Start Warmup Countdown
        let secondsLeft = 5;
        const countdownText = document.getElementById("warmup-countdown-text");
        if (countdownText) {
            countdownText.textContent = `Tipoff in ${secondsLeft}s...`;
        }
        
        if (state.liveSim.warmupTimer) {
            clearInterval(state.liveSim.warmupTimer);
        }
        
        state.liveSim.warmupTimer = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(state.liveSim.warmupTimer);
                state.liveSim.warmupTimer = null;
                endWarmups();
            } else {
                if (countdownText) {
                    countdownText.textContent = `Tipoff in ${secondsLeft}s...`;
                }
            }
        }, 1000);
        
    } catch (err) {
        console.error("Live sim error:", err);
        showToast("⚠️ Match simulator setup failed.");
    }
}

function startAnimationLoop() {
    if (state.liveSim.intervalId) {
        clearInterval(state.liveSim.intervalId);
    }
    if (state.liveSim.isPaused) {
        return;
    }
    
    animateNextPlay();
    state.liveSim.intervalId = setInterval(() => {
        animateNextPlay();
    }, state.liveSim.speed);
}

function setLogo(elementId, team) {
    const img = document.getElementById(elementId);
    if (!img) return;
    if (team.logo_url) {
        img.src = team.logo_url;
        img.alt = `${team.city} ${team.name}`;
        img.classList.remove("hidden");
    } else {
        img.removeAttribute("src");
        img.alt = "";
        img.classList.add("hidden");
    }
}

function disposeArena3D() {
    if (state.liveSim.warmupTimer) {
        clearInterval(state.liveSim.warmupTimer);
        state.liveSim.warmupTimer = null;
    }
    const arena = state.liveSim.arena3d;
    if (!arena) return;
    cancelAnimationFrame(arena.frameId);
    if (arena.onResize) {
        window.removeEventListener("resize", arena.onResize);
    }
    arena.renderer.dispose();
    arena.container.innerHTML = "";
    state.liveSim.arena3d = null;
}

function initArena3D(awayTeam, homeTeam) {
    const container = document.getElementById("arena-3d");
    if (!container || !window.THREE) {
        return;
    }

    disposeArena3D();
    container.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090907);
    scene.fog = new THREE.Fog(0x090907, 28, 96);

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 140);
    camera.position.set(0, 17.5, 23);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfaf6e8, 0x16120d, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(0, 18, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x7dd3fc, 0.85, 60);
    rimLight.position.set(-12, 10, -15);
    scene.add(rimLight);
    const warmLight = new THREE.PointLight(0xffedd5, 0.65, 52);
    warmLight.position.set(12, 9, 16);
    scene.add(warmLight);

    const courtTexture = makeCourtTexture(awayTeam, homeTeam);
    const courtMaterial = new THREE.MeshStandardMaterial({
        map: courtTexture,
        roughness: 0.58,
        metalness: 0.05
    });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), courtMaterial);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);

    addArenaStands(scene, awayTeam, homeTeam);
    addHoop(scene, -13.6);
    addHoop(scene, 13.6);

    const awayRoster = state.players
        .filter((p) => p.team_id === awayTeam.abbreviation)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 5);
    const homeRoster = state.players
        .filter((p) => p.team_id === homeTeam.abbreviation)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 5);
    const awayPlayers = createLineup(scene, awayTeam, awayRoster, -1);
    const homePlayers = createLineup(scene, homeTeam, homeRoster, 1);

    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 })
    );
    ball.castShadow = true;
    ball.position.set(0, 0.55, 0);
    scene.add(ball);

    // Create secondary warmup ball if in warmup phase
    let warmupBall = null;
    if (state.liveSim.phase === "warmup") {
        warmupBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.34, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 })
        );
        warmupBall.castShadow = true;
        warmupBall.position.set(0, 0.55, 0);
        scene.add(warmupBall);
    }

    const arena = {
        container,
        scene,
        camera,
        renderer,
        awayPlayers,
        homePlayers,
        ball,
        warmupBall,
        ballTarget: new THREE.Vector3(0, 0.55, 0),
        playPulse: 0,
        frameId: null,
        clock: new THREE.Clock(),
        possessionSide: null
    };
    state.liveSim.arena3d = arena;

    const onResize = () => {
        if (state.liveSim.arena3d !== arena) return;
        const nextWidth = container.clientWidth || 900;
        const nextHeight = container.clientHeight || 460;
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight);
    };
    window.addEventListener("resize", onResize, { passive: true });
    arena.onResize = onResize;

    animateArena3D();
}

function makeCourtTexture(awayTeam, homeTeam) {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 860;
    const ctx = canvas.getContext("2d");
    const woodA = "#b46b32";
    const woodB = "#9d5729";
    ctx.fillStyle = woodA;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += 92) {
        ctx.fillStyle = (x / 92) % 2 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.05)";
        ctx.fillRect(x, 0, 46, canvas.height);
    }

    ctx.strokeStyle = "rgba(255,246,220,0.82)";
    ctx.lineWidth = 7;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 36);
    ctx.lineTo(canvas.width / 2, canvas.height - 36);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 92, 0, Math.PI * 2);
    ctx.stroke();

    drawPaint(ctx, 36, canvas.height / 2, 1, awayTeam.colors.primary);
    drawPaint(ctx, canvas.width - 36, canvas.height / 2, -1, homeTeam.colors.primary);

    ctx.fillStyle = homeTeam.colors.primary;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "900 96px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(homeTeam.abbreviation, canvas.width / 2, canvas.height / 2);

    ctx.font = "900 46px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.save();
    ctx.translate(110, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(awayTeam.name.toUpperCase(), 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(canvas.width - 110, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(homeTeam.name.toUpperCase(), 0, 0);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    drawCourtLogoDecals(ctx, texture, canvas, awayTeam, homeTeam);
    return texture;
}

function drawCourtLogoDecals(ctx, texture, canvas, awayTeam, homeTeam) {
    const drawLogo = (team, x, y, size, alpha = 0.92) => {
        if (!team.logo_url) return;
        const img = new Image();
        img.onload = () => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = "rgba(0,0,0,0.22)";
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 7;
            ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
            ctx.restore();
            texture.needsUpdate = true;
        };
        img.src = team.logo_url;
    };

    drawLogo(homeTeam, canvas.width / 2, canvas.height / 2, 230, 0.9);
    drawLogo(awayTeam, 275, canvas.height / 2, 142, 0.56);
    drawLogo(homeTeam, canvas.width - 275, canvas.height / 2, 142, 0.56);
}

function drawPaint(ctx, baselineX, centerY, dir, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(dir > 0 ? baselineX : baselineX - 260, centerY - 180, 260, 360);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,246,220,0.84)";
    ctx.lineWidth = 6;
    ctx.strokeRect(dir > 0 ? baselineX : baselineX - 260, centerY - 180, 260, 360);
    ctx.beginPath();
    ctx.arc(baselineX, centerY, 265, -Math.PI / 2, Math.PI / 2, dir < 0);
    ctx.stroke();
    ctx.strokeStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(baselineX + dir * 86, centerY, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function addArenaStands(scene, awayTeam, homeTeam) {
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x171713, roughness: 0.82 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2a22, roughness: 0.7 });
    const longRow = new THREE.BoxGeometry(37, 0.82, 1.5);
    const shortRow = new THREE.BoxGeometry(1.5, 0.82, 25);
    [-1, 1].forEach((zSign) => {
        for (let row = 0; row < 8; row++) {
            const stand = new THREE.Mesh(longRow, standMaterial);
            stand.position.set(0, 0.42 + row * 0.5, zSign * (10.4 + row * 1.02));
            stand.receiveShadow = true;
            scene.add(stand);
        }
    });
    [-1, 1].forEach((xSign) => {
        for (let row = 0; row < 6; row++) {
            const stand = new THREE.Mesh(shortRow, standMaterial);
            stand.position.set(xSign * (17.2 + row * 0.95), 0.42 + row * 0.5, 0);
            stand.receiveShadow = true;
            scene.add(stand);
        }
    });

    const ribbonGeometry = new THREE.BoxGeometry(36.5, 0.28, 0.24);
    [-1, 1].forEach((zSign) => {
        const ribbon = new THREE.Mesh(ribbonGeometry, trimMaterial);
        ribbon.position.set(0, 2.75, zSign * 10.25);
        scene.add(ribbon);
    });

    const colors = [
        awayTeam.colors.primary,
        homeTeam.colors.primary,
        awayTeam.colors.secondary || "#f7f3e8",
        homeTeam.colors.secondary || "#f7f3e8",
        "#f7f3e8",
        "#111827",
        "#38bdf8",
        "#f97316"
    ];
    const fanBodyGeometry = new THREE.CapsuleGeometry(0.13, 0.26, 4, 7);
    const fanHeadGeometry = new THREE.SphereGeometry(0.105, 7, 7);
    const fanMaterials = colors.map((color) => new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.72
    }));
    const headMaterials = [0x2b1a12, 0x5b3827, 0x8d5524, 0xd6a06f, 0x1a1410].map((color) => (
        new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
    ));

    const addFan = (x, y, z, idx, faceRotation = 0) => {
        const fan = new THREE.Group();
        const body = new THREE.Mesh(fanBodyGeometry, fanMaterials[idx % fanMaterials.length]);
        body.position.y = 0.12;
        const head = new THREE.Mesh(headGeometryCache(fanHeadGeometry), headMaterials[idx % headMaterials.length]);
        head.position.y = 0.39;
        fan.add(body, head);
        fan.position.set(x, y, z);
        fan.rotation.y = faceRotation;
        scene.add(fan);
    };

    let idx = 0;
    [-1, 1].forEach((zSign) => {
        for (let row = 0; row < 8; row++) {
            for (let seat = 0; seat < 38; seat++) {
                const x = -17.3 + seat * 0.94 + (row % 2) * 0.24;
                const z = zSign * (9.88 + row * 1.02);
                const y = 0.92 + row * 0.5 + ((seat + row) % 4) * 0.018;
                addFan(x, y, z, idx++, zSign > 0 ? Math.PI : 0);
            }
        }
    });
    [-1, 1].forEach((xSign) => {
        for (let row = 0; row < 6; row++) {
            for (let seat = 0; seat < 24; seat++) {
                const z = -11.4 + seat * 0.98 + (row % 2) * 0.2;
                const x = xSign * (16.65 + row * 0.95);
                const y = 0.88 + row * 0.5 + ((seat + row) % 3) * 0.02;
                addFan(x, y, z, idx++, xSign > 0 ? -Math.PI / 2 : Math.PI / 2);
            }
        }
    });
}

function addHoop(scene, x) {
    const dir = x < 0 ? 1 : -1;
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xd7d0bc, roughness: 0.35 });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25 });
    const boardMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.28,
        roughness: 0.15
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 2.7), boardMaterial);
    board.position.set(x, 2.15, 0);
    scene.add(board);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 10, 32), rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x + dir * 0.58, 1.75, 0);
    scene.add(rim);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 12), poleMaterial);
    pole.position.set(x - dir * 0.42, 1.25, 0);
    scene.add(pole);
}

function headGeometryCache(geometry) {
    return geometry;
}

function createLineup(scene, team, roster, direction) {
    const basePositions = [
        [-7.5, -3.0], [-5.5, 2.6], [-2.4, -0.8], [-1.0, 3.0], [-0.4, -3.2]
    ];
    const players = [];
    for (let i = 0; i < 5; i++) {
        const player = roster[i] || { name: `${team.abbreviation} ${i + 1}`, position: "", overall: 75 };
        const group = createPlayerModel(team, player, i);
        const [x, z] = basePositions[i];
        group.position.set(x * direction, 0, z);
        group.rotation.y = direction > 0 ? -0.15 : 0.15;
        scene.add(group);
        players.push({
            group,
            base: new THREE.Vector3(x * direction, 0, z),
            target: new THREE.Vector3(x * direction, 0, z),
            index: i,
            limbs: group.userData.limbs,
            number: group.userData.number,
            direction: direction,
            name: player.name
        });
    }
    return players;
}

function createPlayerModel(team, player, index) {
    const group = new THREE.Group();
    const primary = new THREE.Color(team.colors.primary || "#0ea5e9");
    const secondary = new THREE.Color(team.colors.secondary || "#ffffff");
    const skinTones = [0x3b2418, 0x6b3f28, 0x9a623f, 0xc48a5a, 0xe1b184];
    const skin = new THREE.Color(skinTones[index % skinTones.length]);
    const jerseyMaterial = new THREE.MeshStandardMaterial({ color: primary, roughness: 0.48 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: secondary, roughness: 0.42 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55 });
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.36 });

    const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.58, 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    group.add(shadow);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 0.64, 7, 14), jerseyMaterial);
    torso.position.y = 1.18;
    torso.scale.set(1.05, 1.0, 0.72);
    torso.castShadow = true;
    group.add(torso);

    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.42), jerseyMaterial);
    shorts.position.y = 0.72;
    shorts.castShadow = true;
    group.add(shorts);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.055, 0.44), trimMaterial);
    belt.position.y = 0.9;
    group.add(belt);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 18), skinMaterial);
    head.position.y = 1.78;
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 14), new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.8 }));
    hair.position.y = 1.88;
    hair.scale.set(1, 0.45, 1);
    group.add(hair);

    const limbs = [];
    const makeLimb = (radius, length, material) => {
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
        limb.castShadow = true;
        return limb;
    };

    [-1, 1].forEach((side) => {
        const arm = makeLimb(0.055, 0.66, skinMaterial);
        arm.position.set(side * 0.38, 1.16, 0);
        arm.rotation.z = side * 0.18;
        group.add(arm);
        limbs.push({ mesh: arm, side, type: "arm" });

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.2, 0.075), trimMaterial);
        stripe.position.set(side * 0.31, 1.48, 0);
        group.add(stripe);

        const leg = makeLimb(0.075, 0.62, skinMaterial);
        leg.position.set(side * 0.16, 0.39, 0);
        leg.rotation.z = side * 0.05;
        group.add(leg);
        limbs.push({ mesh: leg, side, type: "leg" });

        const sock = makeLimb(0.072, 0.16, trimMaterial);
        sock.position.set(side * 0.16, 0.12, 0);
        group.add(sock);

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.34), shoeMaterial);
        shoe.position.set(side * 0.16, 0.045, 0.05);
        shoe.castShadow = true;
        group.add(shoe);
    });

    const number = Math.max(0, Math.min(99, Math.round(player.overall || 75)));
    const numberSprite = makeJerseyNumberSprite(number, team.colors.secondary || "#ffffff");
    numberSprite.position.set(0, 1.22, -0.24);
    numberSprite.scale.set(0.44, 0.24, 1);
    group.add(numberSprite);

    const namePlate = makeJerseyNumberSprite((player.position || "").slice(0, 2).toUpperCase(), "#f8fafc", 48);
    namePlate.position.set(0, 1.52, -0.25);
    namePlate.scale.set(0.28, 0.12, 1);
    group.add(namePlate);

    group.userData = { limbs, number, torso, head };
    return group;
}

function makeJerseyNumberSprite(text, color, fontSize = 72) {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `900 ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.strokeText(String(text), canvas.width / 2, canvas.height / 2 + 2);
    ctx.fillStyle = color;
    ctx.fillText(String(text), canvas.width / 2, canvas.height / 2 + 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    return new THREE.Sprite(material);
}

function animateArena3D() {
    const arena = state.liveSim.arena3d;
    if (!arena) return;

    const elapsed = arena.clock.getElapsedTime();
    arena.playPulse = Math.max(0, arena.playPulse - 0.018);

    // If in warmup phase, render warmup shootarounds and cinematic camera sweeps
    if (state.liveSim.phase === "warmup") {
        animateWarmup(elapsed, arena);
        
        // Slow sweeping camera arc
        const sweepAngle = elapsed * 0.22;
        arena.camera.position.x = Math.sin(sweepAngle) * 21;
        arena.camera.position.z = 18 + Math.cos(sweepAngle * 0.8) * 6;
        arena.camera.position.y = 12.5 + Math.sin(elapsed * 0.3) * 2.5;
        
        arena.camera.lookAt(0, 1.2, 0);
        arena.renderer.render(arena.scene, arena.camera);
        arena.frameId = requestAnimationFrame(animateArena3D);
        return;
    }

    // --- GAMEPLAY PHASE RENDERING ---

    // 1. Try to run our high-fidelity play-by-play animation matching the text log
    const details = state.liveSim.currentPlayDetails;
    if (state.liveSim.phase === "game" && details) {
        const speedMs = state.liveSim.speed;
        const playFraction = Math.min(1.0, (elapsed - state.liveSim.playStartTime) / (speedMs / 1000));
        
        animatePlayTrajectory(elapsed, arena, details, playFraction);
        
        // Camera follow (slow zoom & pan)
        arena.camera.position.x = Math.sin(elapsed * 0.18) * 1.25;
        arena.camera.position.y = 17.5 + Math.sin(elapsed * 0.11) * 0.35;
        arena.camera.lookAt(arena.ball.position.x * 0.08, 0.6, arena.ball.position.z * 0.08);
        
        arena.renderer.render(arena.scene, arena.camera);
        arena.frameId = requestAnimationFrame(animateArena3D);
        return;
    }

    // Dribbler Detection
    let dribbler = null;
    let minPlayerDist = 999;
    const allPlayers = [...arena.awayPlayers, ...arena.homePlayers];
    
    allPlayers.forEach((p) => {
        const dist = p.group.position.distanceTo(arena.ballTarget);
        if (dist < minPlayerDist) {
            minPlayerDist = dist;
            dribbler = p;
        }
    });
    
    const isBallDribbled = dribbler && minPlayerDist < 0.85;

    // Calculate dynamic dribble animation parameters if dribbled
    let dribbleBounceY = 0.55;
    let dribbleArmRotationX = 0;
    
    if (isBallDribbled) {
        // High frequency bounce: 15 rad/sec (approx 2.4 bounces per sec)
        const dribblePhase = elapsed * 15;
        // Bounce shape: absolute sine waves look like sharp bounces off the floor
        const bounceVal = Math.abs(Math.sin(dribblePhase));
        
        // Ball height: goes between 0.48 (floor) and 1.32 (hand)
        dribbleBounceY = 0.48 + bounceVal * 0.84;
        
        // Sync arm rotation in phase: 
        // bounceVal = 1 (ball in hand) -> arm is up (rotation.x = 0.2)
        // bounceVal = 0 (ball on floor) -> arm is fully extended down (rotation.x = 0.95)
        dribbleArmRotationX = 0.95 - bounceVal * 0.75;
        
        // Perfect bounce synced to hand
        const ballOffset = new THREE.Vector3(0.42, 0, 0.12);
        ballOffset.applyEuler(dribbler.group.rotation);
        
        arena.ball.position.set(
            dribbler.group.position.x + ballOffset.x,
            dribbleBounceY,
            dribbler.group.position.z + ballOffset.z
        );
    } else {
        // Ball in flight (passes/shots)
        arena.ball.position.lerp(arena.ballTarget, 0.08);
        arena.ball.position.y = arena.ballTarget.y + Math.abs(Math.sin(elapsed * 7)) * 0.18;
    }

    // Player Animations
    allPlayers.forEach((player) => {
        const limbs = player.group.userData.limbs;
        const torso = player.group.userData.torso;
        const head = player.group.userData.head;

        // Reset default rotations
        if (torso) torso.rotation.set(0, 0, 0);
        if (head) head.rotation.set(0, 0, 0);

        const distToTarget = player.group.position.distanceTo(player.target);
        const isRunning = distToTarget > 0.45;

        if (isRunning) {
            // Running lean & tilt
            if (torso) torso.rotation.x = 0.26;
            if (head) head.rotation.x = -0.08;

            // Face target direction
            player.group.rotation.y = Math.atan2(
                player.target.x - player.group.position.x,
                player.target.z - player.group.position.z
            );
            
            // Running bobbing
            const runPhase = elapsed * 13 + player.index * 1.8;
            player.group.position.y = Math.abs(Math.sin(runPhase)) * 0.11;
            player.group.position.lerp(player.target, 0.07);
            player.group.rotation.z = Math.sin(runPhase) * 0.015;

            // Wide limb swings
            limbs.forEach((limb) => {
                const swing = Math.sin(runPhase + limb.side * Math.PI) * 0.58;
                if (limb.type === "arm") {
                    // If this player is dribbling, override their right arm to push ball
                    if (player === dribbler && limb.side === 1) {
                        limb.mesh.rotation.x = dribbleArmRotationX;
                        limb.mesh.rotation.z = 0.15;
                    } else {
                        limb.mesh.rotation.x = swing;
                        limb.mesh.rotation.z = limb.side * 0.18;
                    }
                } else {
                    limb.mesh.rotation.x = -swing * 0.78;
                    limb.mesh.rotation.z = limb.side * 0.06;
                }
            });
        } else {
            // Idle Stance
            if (player === dribbler) {
                // If they have the ball, face the basket they are attacking to prevent feedback loop!
                const hoopX = player.direction * 13.6;
                const hoopZ = 0;
                player.group.rotation.y = Math.atan2(
                    hoopX - player.group.position.x,
                    hoopZ - player.group.position.z
                );
            } else {
                // Idle Stance - face the ball
                player.group.rotation.y = Math.atan2(
                    arena.ball.position.x - player.group.position.x,
                    arena.ball.position.z - player.group.position.z
                );
            }
            
            // Idle bobbing
            const idlePhase = elapsed * 2.2 + player.index * 1.8;
            player.group.position.y = Math.max(0, Math.sin(idlePhase) * 0.022);
            player.group.position.lerp(player.target, 0.07);
            player.group.rotation.z = Math.sin(idlePhase) * 0.01;

            // Micro arm / leg swings
            limbs.forEach((limb) => {
                const swing = Math.sin(idlePhase + limb.side * 0.9) * 0.12;
                if (limb.type === "arm") {
                    if (player === dribbler && limb.side === 1) {
                        limb.mesh.rotation.x = dribbleArmRotationX;
                        limb.mesh.rotation.z = 0.15;
                    } else {
                        limb.mesh.rotation.x = swing;
                        limb.mesh.rotation.z = limb.side * 0.15;
                    }
                } else {
                    limb.mesh.rotation.x = -swing * 0.6;
                    limb.mesh.rotation.z = limb.side * 0.04;
                }
            });
        }
    });

    // Camera follow (slow zoom & pan)
    arena.camera.position.x = Math.sin(elapsed * 0.18) * 1.25;
    arena.camera.position.y = 17.5 + Math.sin(elapsed * 0.11) * 0.35;
    arena.camera.lookAt(arena.ball.position.x * 0.08, 0.6, arena.ball.position.z * 0.08);
    
    arena.renderer.render(arena.scene, arena.camera);
    arena.frameId = requestAnimationFrame(animateArena3D);
}

// --- WARMUP DRILLS & PLAYBACK CONTROL ACTIONS ---

function animateWarmup(elapsed, arena) {
    const warmupDuration = 4.0;
    const t = elapsed % warmupDuration;
    
    const warmupTeam = (players, side, ball) => {
        // shooter index
        const shooterIdx = Math.floor(elapsed / warmupDuration) % 5;
        // rebounder index
        const rebounderIdx = (shooterIdx + 2) % 5;
        
        // Key spots:
        const hoopX = side * 13.6;
        const hoopZ = 0;
        const layupReleaseX = side * 11.5;
        const layupReleaseZ = side * 0.5;
        
        const startThreeX = side * 7.5;
        const startThreeZ = side * -4.5;
        
        const rebounderSpotX = side * 11.5;
        const rebounderSpotZ = side * -1.5;
        
        players.forEach((p, idx) => {
            const limbs = p.group.userData.limbs;
            const torso = p.group.userData.torso;
            const head = p.group.userData.head;
            
            p.group.rotation.set(0, 0, 0);
            if (torso) torso.rotation.set(0, 0, 0);
            if (head) head.rotation.set(0, 0, 0);
            
            if (idx === shooterIdx) {
                if (t < 1.8) {
                    // Running & Dribbling
                    const progress = t / 1.8;
                    const posX = THREE.MathUtils.lerp(startThreeX, layupReleaseX, progress);
                    const posZ = THREE.MathUtils.lerp(startThreeZ, layupReleaseZ, progress);
                    p.group.position.set(posX, 0, posZ);
                    
                    if (torso) torso.rotation.x = 0.25;
                    if (head) head.rotation.x = -0.1;
                    
                    p.group.rotation.y = Math.atan2(layupReleaseX - posX, layupReleaseZ - posZ);
                    
                    const swingPhase = elapsed * 15;
                    p.group.position.y = Math.abs(Math.sin(swingPhase)) * 0.12;
                    
                    limbs.forEach((limb) => {
                        const swing = Math.sin(swingPhase + limb.side * Math.PI) * 0.6;
                        if (limb.type === "arm") {
                            if (limb.side === 1) {
                                limb.mesh.rotation.x = 0.7 + Math.sin(elapsed * 13) * 0.4;
                            } else {
                                limb.mesh.rotation.x = swing;
                            }
                        } else {
                            limb.mesh.rotation.x = -swing * 0.8;
                        }
                    });
                    
                    const bounceY = 0.55 + Math.abs(Math.cos(elapsed * 13)) * 0.9;
                    const ballOffset = new THREE.Vector3(side * 0.45, 0, 0.15);
                    ballOffset.applyEuler(p.group.rotation);
                    
                    ball.position.set(
                        p.group.position.x + ballOffset.x,
                        bounceY,
                        p.group.position.z + ballOffset.z
                    );
                } else if (t < 2.1) {
                    // Jumper / Layup launch
                    const progress = (t - 1.8) / 0.3;
                    const posX = THREE.MathUtils.lerp(layupReleaseX, hoopX * 0.94, progress);
                    const posZ = THREE.MathUtils.lerp(layupReleaseZ, hoopZ, progress);
                    
                    const jumpY = Math.sin(progress * Math.PI) * 0.9;
                    p.group.position.set(posX, jumpY, posZ);
                    p.group.rotation.y = Math.atan2(hoopX - posX, hoopZ - posZ);
                    
                    limbs.forEach((limb) => {
                        if (limb.type === "arm") {
                            limb.mesh.rotation.x = -1.6;
                            limb.mesh.rotation.z = limb.side * 0.2;
                        } else {
                            limb.mesh.rotation.x = 0.3;
                        }
                    });
                    
                    const ballOffset = new THREE.Vector3(0, 0.5, 0.35);
                    ballOffset.applyEuler(p.group.rotation);
                    
                    ball.position.set(
                        p.group.position.x + ballOffset.x,
                        p.group.position.y + 1.6 + ballOffset.y,
                        p.group.position.z + ballOffset.z
                    );
                } else if (t < 2.6) {
                    // Ball in flight to hoop
                    const progress = (t - 2.1) / 0.5;
                    const landY = Math.max(0, (1 - progress) * 0.3);
                    p.group.position.set(hoopX * 0.94, landY, hoopZ);
                    p.group.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
                    
                    limbs.forEach((limb) => {
                        if (limb.type === "arm") {
                            limb.mesh.rotation.x = -1.8;
                        }
                    });
                    
                    const ballProg = progress;
                    const ballX = THREE.MathUtils.lerp(hoopX * 0.94, hoopX, ballProg);
                    const ballZ = THREE.MathUtils.lerp(hoopZ, hoopZ, ballProg);
                    const ballY = THREE.MathUtils.lerp(2.4, 1.75, ballProg) + Math.sin(ballProg * Math.PI) * 0.5;
                    
                    ball.position.set(ballX, ballY, ballZ);
                } else {
                    // Running back to queue
                    const progress = (t - 2.6) / (warmupDuration - 2.6);
                    const queueEndX = side * 4.5;
                    const queueEndZ = side * -6.5;
                    
                    const posX = THREE.MathUtils.lerp(hoopX * 0.94, queueEndX, progress);
                    const posZ = THREE.MathUtils.lerp(hoopZ, queueEndZ, progress);
                    p.group.position.set(posX, 0, posZ);
                    p.group.rotation.y = Math.atan2(queueEndX - posX, queueEndZ - posZ);
                    if (torso) torso.rotation.x = 0.2;
                    
                    const swingPhase = elapsed * 12;
                    p.group.position.y = Math.abs(Math.sin(swingPhase)) * 0.08;
                    limbs.forEach((limb) => {
                        const swing = Math.sin(swingPhase + limb.side * Math.PI) * 0.45;
                        limb.mesh.rotation.x = limb.type === "arm" ? swing : -swing * 0.8;
                    });
                }
            } else if (idx === rebounderIdx) {
                if (t < 2.4) {
                    p.group.position.set(rebounderSpotX, 0, rebounderSpotZ);
                    p.group.rotation.y = Math.atan2(hoopX - rebounderSpotX, hoopZ - rebounderSpotZ);
                    
                    limbs.forEach((limb) => {
                        limb.mesh.rotation.set(0, 0, 0);
                        if (limb.type === "arm") {
                            limb.mesh.rotation.x = -0.2;
                        }
                    });
                } else if (t < 2.9) {
                    // Rebound & Catch
                    const progress = (t - 2.4) / 0.5;
                    const posX = THREE.MathUtils.lerp(rebounderSpotX, hoopX * 0.98, progress * 0.4);
                    const posZ = THREE.MathUtils.lerp(rebounderSpotZ, hoopZ, progress * 0.4);
                    p.group.position.set(posX, 0, posZ);
                    p.group.rotation.y = Math.atan2(hoopX - posX, hoopZ - posZ);
                    
                    limbs.forEach((limb) => {
                        if (limb.type === "arm") {
                            limb.mesh.rotation.x = -1.2;
                            limb.mesh.rotation.z = limb.side * 0.3;
                        }
                    });
                    
                    const ballDropProg = (t - 2.4) / 0.5;
                    ball.position.set(hoopX, 1.75 - ballDropProg * 0.57, hoopZ);
                } else {
                    // Passing ball back to next shooter
                    const progress = (t - 2.9) / 1.1;
                    p.group.position.set(rebounderSpotX, 0, rebounderSpotZ);
                    
                    const nextShooter = players[(shooterIdx + 1) % 5];
                    p.group.rotation.y = Math.atan2(
                        nextShooter.group.position.x - p.group.position.x,
                        nextShooter.group.position.z - p.group.position.z
                    );
                    
                    limbs.forEach((limb) => {
                        if (limb.type === "arm") {
                            limb.mesh.rotation.x = -1.1 + Math.sin(progress * Math.PI) * -0.5;
                        }
                    });
                    
                    const passProg = Math.min(1.0, progress * 1.5);
                    const ballX = THREE.MathUtils.lerp(hoopX * 0.98, nextShooter.group.position.x, passProg);
                    const ballZ = THREE.MathUtils.lerp(hoopZ, nextShooter.group.position.z, passProg);
                    const ballY = THREE.MathUtils.lerp(1.18, 1.18, passProg) + Math.sin(passProg * Math.PI) * 0.28;
                    
                    ball.position.set(ballX, ballY, ballZ);
                }
            } else {
                let queuePos = 0;
                if (idx === (shooterIdx + 1) % 5) queuePos = 1;
                else if (idx === (shooterIdx + 3) % 5) queuePos = 2;
                else if (idx === (shooterIdx + 4) % 5) queuePos = 3;
                
                let targetX, targetZ;
                if (queuePos === 1) {
                    targetX = startThreeX;
                    targetZ = startThreeZ;
                } else if (queuePos === 2) {
                    targetX = side * 6.5;
                    targetZ = side * -5.5;
                } else {
                    targetX = side * 5.5;
                    targetZ = side * -6.5;
                }
                
                p.group.position.lerp(new THREE.Vector3(targetX, 0, targetZ), 0.05);
                p.group.rotation.y = Math.atan2(hoopX - p.group.position.x, hoopZ - p.group.position.z);
                
                const idlePhase = elapsed * 1.8 + idx * 1.5;
                p.group.position.y = Math.max(0, Math.sin(idlePhase) * 0.015);
                
                limbs.forEach((limb) => {
                    limb.mesh.rotation.set(0, 0, 0);
                    if (limb.type === "arm") {
                        limb.mesh.rotation.x = -0.1 + Math.sin(idlePhase) * 0.05;
                    }
                });
            }
        });
    };
    
    warmupTeam(arena.awayPlayers, -1, arena.ball);
    if (arena.warmupBall) {
        warmupTeam(arena.homePlayers, 1, arena.warmupBall);
    }
}

function endWarmups() {
    if (state.liveSim.warmupTimer) {
        clearInterval(state.liveSim.warmupTimer);
        state.liveSim.warmupTimer = null;
    }
    
    const overlay = document.getElementById("warmup-overlay");
    if (overlay) {
        overlay.classList.add("hidden");
    }
    
    state.liveSim.phase = "game";
    
    // Cleanup secondary warmup ball
    const arena = state.liveSim.arena3d;
    if (arena && arena.warmupBall) {
        arena.scene.remove(arena.warmupBall);
        if (arena.warmupBall.geometry) arena.warmupBall.geometry.dispose();
        if (arena.warmupBall.material) arena.warmupBall.material.dispose();
        delete arena.warmupBall;
    }
    
    // Reset player spacing for tip-off
    if (arena) {
        [...arena.awayPlayers, ...arena.homePlayers].forEach((player) => {
            player.target.copy(player.base);
            player.group.position.copy(player.base);
            player.group.rotation.set(0, player.direction > 0 ? -0.15 : 0.15, 0);
        });
        arena.ballTarget.set(0, 0.55, 0);
        arena.ball.position.set(0, 0.55, 0);
    }
    
    // Active simulation play
    startAnimationLoop();
}

function togglePauseSim() {
    if (state.liveSim.phase !== "game") {
        showToast("⚠️ Can only pause during active game play.");
        return;
    }
    
    const btnPause = document.getElementById("btn-pause-sim");
    if (!btnPause) return;
    
    if (state.liveSim.isPaused) {
        state.liveSim.isPaused = false;
        btnPause.innerHTML = "⏸ Pause";
        btnPause.classList.remove("btn-paused");
        showToast("▶ Sim resumed.");
        startAnimationLoop();
    } else {
        state.liveSim.isPaused = true;
        btnPause.innerHTML = "▶ Resume";
        btnPause.classList.add("btn-paused");
        showToast("⏸ Sim paused.");
        if (state.liveSim.intervalId) {
            clearInterval(state.liveSim.intervalId);
            state.liveSim.intervalId = null;
        }
    }
}

async function skipLiveSimToEnd() {
    if (state.liveSim.phase === "warmup") {
        endWarmups();
    }
    
    if (state.liveSim.phase !== "game") {
        showToast("⚠️ Can only skip during an active match.");
        return;
    }
    
    showToast("⏭ Skipping simulation to end...");
    
    if (state.liveSim.intervalId) {
        clearInterval(state.liveSim.intervalId);
        state.liveSim.intervalId = null;
    }
    
    const pbpList = state.liveSim.pbp;
    
    // Fast loop to calculate final scores instantly
    while (state.liveSim.pbpIndex < pbpList.length - 1) {
        const playText = pbpList[state.liveSim.pbpIndex];
        state.liveSim.pbpIndex++;
        
        const playMeta = getPlayMeta(playText);
        const scoringTeam = findTeamForPlay(playText);
        
        if (playText.includes("End of Q") || playText.includes("Final Score:")) {
            const parts = playText.split(" ");
            const awayAbbr = state.liveSim.awayTeam.abbreviation;
            const homeAbbr = state.liveSim.homeTeam.abbreviation;
            
            let awayIdx = parts.indexOf(awayAbbr);
            let homeIdx = parts.indexOf(homeAbbr);
            
            if (awayIdx !== -1 && homeIdx !== -1) {
                const awayScore = parseInt(parts[awayIdx + 1].replace(",", ""));
                const homeScore = parseInt(parts[homeIdx + 1].replace(",", ""));
                
                state.liveSim.currentAwayScore = awayScore;
                state.liveSim.currentHomeScore = homeScore;
            }
        } else {
            const points = getPlayPoints(playText);
            if (points && scoringTeam) {
                if (scoringTeam === "away") {
                    state.liveSim.currentAwayScore += points;
                } else if (scoringTeam === "home") {
                    state.liveSim.currentHomeScore += points;
                }
            }
        }
    }
    
    // Run the last play to update final graphics & buzzer
    state.liveSim.pbpIndex = pbpList.length - 1;
    animateNextPlay();
}

function parsePlayDetails(playText, arena) {
    const details = {
        type: "normal", // "three-make", "three-miss", "layup-make", "layup-miss", "steal", "turnover", "block", "rebound", "foul"
        actor: null,        // Primary ball-handler, shooter, or initiator
        secondaryActor: null, // Blocker, stealer, rebounder, or contester
        passer: null,        // Assist giver
    };

    const lower = playText.toLowerCase();
    
    // Find references to any of our 10 active players
    const allPlayers = [...arena.awayPlayers, ...arena.homePlayers];
    
    const findRealPlayerInSubstring = (substring) => {
        let bestMatch = null;
        let matchLength = 0;
        allPlayers.forEach(p => {
            if (substring.includes(p.name)) {
                if (p.name.length > matchLength) {
                    bestMatch = p;
                    matchLength = p.name.length;
                }
            } else {
                const parts = p.name.split(" ");
                const lastName = parts[parts.length - 1];
                if (lastName && lastName.length > 2 && substring.includes(lastName)) {
                    if (lastName.length > matchLength) {
                        bestMatch = p;
                        matchLength = lastName.length;
                    }
                }
            }
        });
        return bestMatch;
    };

    if (lower.includes("jump ball") || lower.includes("tip is controlled")) {
        details.type = "tip-off";
        const leapIdx = lower.indexOf(" leap");
        const andIdx = lower.indexOf(" and ");
        const centerIdx = lower.indexOf("center court! ");
        
        if (centerIdx !== -1 && andIdx !== -1) {
            const p1Text = playText.substring(centerIdx + 14, andIdx).trim();
            details.actor = findRealPlayerInSubstring(p1Text);
        }
        if (andIdx !== -1 && leapIdx !== -1) {
            const p2Text = playText.substring(andIdx + 5, leapIdx).trim();
            details.secondaryActor = findRealPlayerInSubstring(p2Text);
        }
        const controlledIdx = lower.indexOf("controlled by ");
        if (controlledIdx !== -1) {
            const p3Text = playText.substring(controlledIdx + 14).replace(".", "").trim();
            details.passer = findRealPlayerInSubstring(p3Text);
        }
    } else if (lower.includes("timeout called")) {
        details.type = "timeout";
    } else if (lower.includes("offensive foul!") || lower.includes("charges right into")) {
        details.type = "charge";
        const foulIdx = lower.indexOf("offensive foul!");
        const chargesIdx = lower.indexOf(" charges");
        const intoIdx = lower.indexOf("charges right into ");
        const turningIdx = lower.indexOf(", turning");
        
        if (foulIdx !== -1 && chargesIdx !== -1) {
            const p1Text = playText.substring(foulIdx + 15, chargesIdx).trim();
            details.actor = findRealPlayerInSubstring(p1Text);
        }
        if (intoIdx !== -1 && turningIdx !== -1) {
            const p2Text = playText.substring(intoIdx + 19, turningIdx).trim();
            details.secondaryActor = findRealPlayerInSubstring(p2Text);
        }
    } else if (lower.includes("ferocious two-handed dunk!")) {
        details.type = "dunk";
        const crushesIdx = lower.indexOf(" crushes");
        if (crushesIdx !== -1) {
            const p1Text = playText.substring(2, crushesIdx).trim();
            details.actor = findRealPlayerInSubstring(p1Text);
        }
        const assistIdx = lower.indexOf("assisted by ");
        if (assistIdx !== -1) {
            const assistText = playText.substring(assistIdx + 12).replace(")", "").trim();
            details.passer = findRealPlayerInSubstring(assistText);
        }
    } else if (lower.includes("smooth mid-range jumper!")) {
        details.type = "jumper-make";
        const pullsIdx = lower.indexOf(" pulls up");
        if (pullsIdx !== -1) {
            const p1Text = playText.substring(2, pullsIdx).trim();
            details.actor = findRealPlayerInSubstring(p1Text);
        }
        const assistIdx = lower.indexOf("assisted by ");
        if (assistIdx !== -1) {
            const assistText = playText.substring(assistIdx + 12).replace(")", "").trim();
            details.passer = findRealPlayerInSubstring(assistText);
        }
    } else if (lower.includes("mid-range jump shot...")) {
        details.type = "jumper-miss";
        const firesIdx = lower.indexOf(" fires");
        if (firesIdx !== -1) {
            const p1Text = playText.substring(2, firesIdx).trim();
            details.actor = findRealPlayerInSubstring(p1Text);
        }
    } else if (lower.includes("foul!")) {
        if (lower.includes("free throw") || lower.includes("makes") || lower.includes("line")) {
            details.type = "freethrow";
        } else {
            details.type = "foul";
        }
        const foulIdx = lower.indexOf("foul!");
        const hitIdx = lower.indexOf(" was hit");
        const goesIdx = lower.indexOf(" goes to");
        const missesIdx = lower.indexOf(" misses");
        const hackedIdx = lower.indexOf("hacked by");
        
        if (hitIdx !== -1) {
            const shooterName = playText.substring(foulIdx + 5, hitIdx).trim();
            details.actor = findRealPlayerInSubstring(shooterName);
            const byIdx = lower.indexOf("by ", hitIdx);
            const andIdx = lower.indexOf(" and ", hitIdx);
            if (byIdx !== -1 && andIdx !== -1) {
                const contName = playText.substring(byIdx + 3, andIdx).trim();
                details.secondaryActor = findRealPlayerInSubstring(contName);
            }
        } else if (goesIdx !== -1) {
            const shooterName = playText.substring(foulIdx + 5, goesIdx).trim();
            details.actor = findRealPlayerInSubstring(shooterName);
        } else if (missesIdx !== -1) {
            const shooterName = playText.substring(foulIdx + 5, missesIdx).trim();
            details.actor = findRealPlayerInSubstring(shooterName);
            if (hackedIdx !== -1) {
                const contName = playText.substring(hackedIdx + 9).replace(".", "").trim();
                details.secondaryActor = findRealPlayerInSubstring(contName);
            }
        }
    } else if (lower.includes("steal!")) {
        details.type = "steal";
        const stealIdx = lower.indexOf("steal!");
        const stripsIdx = lower.indexOf(" strips");
        const fromIdx = lower.indexOf("from ");
        
        if (stealIdx !== -1 && stripsIdx !== -1) {
            const stealerNameText = playText.substring(stealIdx + 6, stripsIdx).trim();
            details.secondaryActor = findRealPlayerInSubstring(stealerNameText);
        }
        if (fromIdx !== -1) {
            const initiatorNameText = playText.substring(fromIdx + 5).replace(".", "").trim();
            details.actor = findRealPlayerInSubstring(initiatorNameText);
        }
    } else if (lower.includes("turnover!")) {
        details.type = "turnover";
        const toIdx = lower.indexOf("turnover!");
        const throwsIdx = lower.indexOf(" throws");
        if (toIdx !== -1 && throwsIdx !== -1) {
            const initName = playText.substring(toIdx + 9, throwsIdx).trim();
            details.actor = findRealPlayerInSubstring(initName);
        }
    } else if (lower.includes("3-pointer")) {
        const isMake = lower.includes("drills");
        details.type = isMake ? "three-make" : "three-miss";
        
        const drillsIdx = lower.indexOf(" drills");
        const launchesIdx = lower.indexOf(" launches");
        
        if (isMake && drillsIdx !== -1) {
            const drillsSubstr = playText.substring(0, drillsIdx);
            details.actor = findRealPlayerInSubstring(drillsSubstr);
            
            const assistIdx = lower.indexOf("assisted by ");
            if (assistIdx !== -1) {
                const assistText = playText.substring(assistIdx + 12).replace(")", "").trim();
                details.passer = findRealPlayerInSubstring(assistText);
            }
        } else if (!isMake && launchesIdx !== -1) {
            const launchesSubstr = playText.substring(0, launchesIdx);
            details.actor = findRealPlayerInSubstring(launchesSubstr);
        }
    } else if (lower.includes("inside layup")) {
        const isMake = lower.includes("scores");
        details.type = isMake ? "layup-make" : "layup-miss";
        
        const scoresIdx = lower.indexOf(" scores");
        const drivesIdx = lower.indexOf(" drives");
        
        if (isMake && scoresIdx !== -1) {
            const scoresSubstr = playText.substring(0, scoresIdx);
            details.actor = findRealPlayerInSubstring(scoresSubstr);
            
            const assistIdx = lower.indexOf("assisted by ");
            if (assistIdx !== -1) {
                const assistText = playText.substring(assistIdx + 12).replace(")", "").trim();
                details.passer = findRealPlayerInSubstring(assistText);
            }
        } else if (!isMake && drivesIdx !== -1) {
            const drivesSubstr = playText.substring(0, drivesIdx);
            details.actor = findRealPlayerInSubstring(drivesSubstr);
        }
    } else if (lower.includes("rejected!")) {
        details.type = "block";
        const rejIdx = lower.indexOf("rejected!");
        const swatsIdx = lower.indexOf(" swats");
        const shotIdx = lower.indexOf("'s shot");
        
        if (rejIdx !== -1 && swatsIdx !== -1) {
            const blockerNameText = playText.substring(rejIdx + 9, swatsIdx).trim();
            details.secondaryActor = findRealPlayerInSubstring(blockerNameText);
        }
        if (swatsIdx !== -1 && shotIdx !== -1) {
            const shooterNameText = playText.substring(swatsIdx + 6, shotIdx).trim();
            details.actor = findRealPlayerInSubstring(shooterNameText);
        }
    } else if (lower.includes("rebound")) {
        details.type = "rebound";
        const defRebIdx = lower.indexOf("rebound ");
        const offRebIdx = lower.indexOf("offensive rebound ");
        const boardIdx = lower.indexOf("!");
        
        if (offRebIdx !== -1) {
            const rebounderName = playText.substring(offRebIdx + 18, boardIdx !== -1 ? boardIdx : playText.length).trim();
            details.secondaryActor = findRealPlayerInSubstring(rebounderName);
        } else if (defRebIdx !== -1) {
            const rebounderName = playText.substring(defRebIdx + 8, boardIdx !== -1 ? boardIdx : playText.length).trim();
            details.secondaryActor = findRealPlayerInSubstring(rebounderName);
        }
    }

    // Fallbacks if player wasn't identified from text
    const offense = arena.possessionSide === "home" ? arena.homePlayers : arena.awayPlayers;
    const defense = arena.possessionSide === "home" ? arena.awayPlayers : arena.homePlayers;
    
    if (!details.actor) {
        details.actor = offense[0];
    }
    if (!details.secondaryActor) {
        if (details.type === "steal" || details.type === "block" || details.type === "foul") {
            details.secondaryActor = defense[0];
        } else if (details.type === "rebound") {
            details.secondaryActor = defense[1] || defense[0];
        }
    }
    
    return details;
}

function setPlayerStance(player, stance, elapsed, options = {}) {
    const limbs = player.group.userData.limbs || player.limbs;
    const torso = player.group.userData.torso || player.torso;
    const head = player.group.userData.head || player.head;
    
    // Reset standard torso and head leaning
    if (torso) torso.rotation.set(0, 0, 0);
    if (head) head.rotation.set(0, 0, 0);
    
    // Face target
    if (options.lookAt) {
        player.group.rotation.y = Math.atan2(
            options.lookAt.x - player.group.position.x,
            options.lookAt.z - player.group.position.z
        );
    }
    
    if (stance === "idle") {
        const idlePhase = elapsed * 2.2 + player.index * 1.8;
        player.group.position.y = Math.max(0, Math.sin(idlePhase) * 0.022);
        player.group.rotation.z = Math.sin(idlePhase) * 0.01;
        
        limbs.forEach((limb) => {
            const swing = Math.sin(idlePhase + limb.side * 0.9) * 0.12;
            if (limb.type === "arm") {
                limb.mesh.rotation.x = swing;
                limb.mesh.rotation.z = limb.side * 0.15;
            } else {
                limb.mesh.rotation.x = -swing * 0.6;
                limb.mesh.rotation.z = limb.side * 0.04;
            }
        });
    } else if (stance === "run") {
        if (torso) torso.rotation.x = 0.26;
        if (head) head.rotation.x = -0.08;
        
        const runPhase = elapsed * 13 + player.index * 1.8;
        player.group.position.y = Math.abs(Math.sin(runPhase)) * 0.11;
        player.group.rotation.z = Math.sin(runPhase) * 0.015;
        
        limbs.forEach((limb) => {
            const swing = Math.sin(runPhase + limb.side * Math.PI) * 0.58;
            if (limb.type === "arm") {
                limb.mesh.rotation.x = swing;
                limb.mesh.rotation.z = limb.side * 0.18;
            } else {
                limb.mesh.rotation.x = -swing * 0.78;
                limb.mesh.rotation.z = limb.side * 0.06;
            }
        });
    } else if (stance === "dribble") {
        if (torso) torso.rotation.x = 0.26;
        if (head) head.rotation.x = -0.08;
        
        const runPhase = elapsed * 13 + player.index * 1.8;
        player.group.position.y = Math.abs(Math.sin(runPhase)) * 0.11;
        player.group.rotation.z = Math.sin(runPhase) * 0.015;
        
        const dribblePhase = elapsed * 15;
        const bounceVal = Math.abs(Math.sin(dribblePhase));
        const dribbleArmRotationX = 0.95 - bounceVal * 0.75;
        
        limbs.forEach((limb) => {
            if (limb.type === "arm" && limb.side === 1) {
                limb.mesh.rotation.x = dribbleArmRotationX;
                limb.mesh.rotation.z = 0.15;
            } else if (limb.type === "arm") {
                limb.mesh.rotation.x = Math.sin(runPhase) * 0.58;
                limb.mesh.rotation.z = limb.side * 0.18;
            } else {
                const swing = Math.sin(runPhase + limb.side * Math.PI) * 0.58;
                limb.mesh.rotation.x = -swing * 0.78;
                limb.mesh.rotation.z = limb.side * 0.06;
            }
        });
    } else if (stance === "shoot") {
        const jumpT = options.jumpT !== undefined ? options.jumpT : 0.5;
        player.group.position.y = Math.sin(jumpT * Math.PI) * 0.8;
        
        limbs.forEach((limb) => {
            if (limb.type === "arm") {
                limb.mesh.rotation.x = -0.5 - jumpT * 0.9;
                limb.mesh.rotation.z = limb.side * 0.15;
            } else {
                limb.mesh.rotation.x = 0.12;
                limb.mesh.rotation.z = limb.side * 0.05;
            }
        });
    } else if (stance === "pass") {
        if (torso) torso.rotation.x = 0.15;
        
        limbs.forEach((limb) => {
            if (limb.type === "arm") {
                limb.mesh.rotation.x = 0.85;
                limb.mesh.rotation.z = limb.side * 0.1;
            } else {
                limb.mesh.rotation.x = 0;
                limb.mesh.rotation.z = limb.side * 0.05;
            }
        });
    } else if (stance === "block") {
        const jumpT = options.jumpT !== undefined ? options.jumpT : 0.5;
        player.group.position.y = Math.sin(jumpT * Math.PI) * 0.9;
        
        limbs.forEach((limb) => {
            if (limb.type === "arm") {
                limb.mesh.rotation.x = -1.8;
                limb.mesh.rotation.z = limb.side * 0.05;
            } else {
                limb.mesh.rotation.x = 0.1;
                limb.mesh.rotation.z = limb.side * 0.05;
            }
        });
    } else if (stance === "rebound") {
        const jumpT = options.jumpT !== undefined ? options.jumpT : 0.5;
        player.group.position.y = Math.sin(jumpT * Math.PI) * 0.8;
        
        limbs.forEach((limb) => {
            if (limb.type === "arm") {
                limb.mesh.rotation.x = -1.2;
                limb.mesh.rotation.z = limb.side * 0.12;
            } else {
                limb.mesh.rotation.x = 0.08;
                limb.mesh.rotation.z = limb.side * 0.05;
            }
        });
    }
}

function animateInboundAndTransition(elapsed, arena, details, playFraction) {
    const dir = arena.possessionSide === "home" ? 1 : -1;
    const offense = arena.possessionSide === "home" ? arena.homePlayers : arena.awayPlayers;
    const defense = arena.possessionSide === "home" ? arena.awayPlayers : arena.homePlayers;
    
    const inbounder = offense[4] || offense[0];
    const pg = offense[0];
    
    const allPlayers = [...arena.awayPlayers, ...arena.homePlayers];
    const handledPlayers = new Set();
    
    if (playFraction < 0.12) {
        // Inbound pass phase (0.0 to 0.12 of the play)
        const t = playFraction / 0.12;
        
        // Inbounder stands out of bounds at baseline, turns to pass
        inbounder.group.position.set(-dir * 14.3, 0, 0.5);
        setPlayerStance(inbounder, "pass", elapsed, { lookAt: pg.group.position });
        handledPlayers.add(inbounder);
        
        // PG runs to catch the ball
        const pgStart = new THREE.Vector3(-dir * 12.0, 0, 1.5);
        const pgCatch = new THREE.Vector3(-dir * 10.5, 0, 1.2);
        pg.group.position.lerpVectors(pgStart, pgCatch, t);
        setPlayerStance(pg, "run", elapsed, { lookAt: pgCatch });
        handledPlayers.add(pg);
        
        // Ball travels from inbounder to PG
        const ballStart = new THREE.Vector3(-dir * 14.3, 0.9, 0.5);
        const ballEnd = new THREE.Vector3(pg.group.position.x, 0.9, pg.group.position.z);
        arena.ball.position.lerpVectors(ballStart, ballEnd, t);
        arena.ball.position.y += Math.sin(t * Math.PI) * 0.4;
    } else {
        // Upcourt dribble phase (0.12 to 0.35 of the play)
        const t = (playFraction - 0.12) / 0.23;
        
        // Inbounder runs onto the court to their frontcourt spacing spot
        const inboundSpot = new THREE.Vector3(dir * 11.0, 0, -2.5);
        inbounder.group.position.lerpVectors(new THREE.Vector3(-dir * 14.3, 0, 0.5), inboundSpot, t);
        setPlayerStance(inbounder, "run", elapsed, { lookAt: inboundSpot });
        handledPlayers.add(inbounder);
        
        // PG dribbles upcourt to the top of key spot
        const pgCatch = new THREE.Vector3(-dir * 10.5, 0, 1.2);
        const pgFront = new THREE.Vector3(dir * 6.5, 0, 0.5);
        pg.group.position.lerpVectors(pgCatch, pgFront, t);
        setPlayerStance(pg, "dribble", elapsed, { lookAt: pgFront });
        handledPlayers.add(pg);
        
        // Ball bounces as PG dribbles
        const bounceVal = Math.abs(Math.sin(elapsed * 15));
        const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
        ballOffset.applyEuler(pg.group.rotation);
        arena.ball.position.copy(pg.group.position).add(ballOffset);
    }
    
    // Other players transition smoothly to their tactical spacing targets
    allPlayers.forEach(p => {
        if (!handledPlayers.has(p)) {
            const dist = p.group.position.distanceTo(p.target);
            p.group.position.lerp(p.target, 0.06);
            
            if (dist > 0.4) {
                setPlayerStance(p, "run", elapsed, { lookAt: p.target });
            } else {
                setPlayerStance(p, "idle", elapsed, { lookAt: arena.ball.position });
            }
        }
    });
    
    arena.ballTarget.copy(arena.ball.position);
}

function animateJumpBall(elapsed, arena, details, playFraction, handledPlayers) {
    const dir = arena.possessionSide === "home" ? 1 : -1;
    const jumper1 = details.actor;
    const jumper2 = details.secondaryActor;
    const receiver = details.passer || (arena.possessionSide === "home" ? arena.homePlayers[0] : arena.awayPlayers[0]);
    
    const allPlayers = [...arena.awayPlayers, ...arena.homePlayers];
    
    // Position jumper centers:
    jumper1.group.position.set(-0.5, 0, 0);
    jumper2.group.position.set(0.5, 0, 0);
    
    if (playFraction < 0.4) {
        const t = playFraction / 0.4;
        arena.ball.position.set(0, 0.55 + t * 4.0, 0);
        
        setPlayerStance(jumper1, "idle", elapsed, { lookAt: arena.ball.position });
        setPlayerStance(jumper2, "idle", elapsed, { lookAt: arena.ball.position });
        handledPlayers.add(jumper1);
        handledPlayers.add(jumper2);
    } else if (playFraction < 0.65) {
        const t = (playFraction - 0.4) / 0.25;
        
        jumper1.group.position.y = Math.sin(t * Math.PI) * 1.35;
        jumper2.group.position.y = Math.sin(t * Math.PI) * 1.25;
        
        jumper1.limbs.forEach(limb => { if (limb.type === "arm" && limb.side === 1) limb.mesh.rotation.z = -1.5; });
        jumper2.limbs.forEach(limb => { if (limb.type === "arm" && limb.side === -1) limb.mesh.rotation.z = 1.5; });
        
        handledPlayers.add(jumper1);
        handledPlayers.add(jumper2);
        
        if (t < 0.5) {
            arena.ball.position.set(0, 4.55 - (t * 2) * 0.2, 0);
        } else {
            const tipT = (t - 0.5) * 2;
            const receiverPos = receiver.group.position.clone();
            arena.ball.position.lerpVectors(new THREE.Vector3(0, 4.35, 0), receiverPos, tipT);
            arena.ball.position.y += Math.sin(tipT * Math.PI) * 0.6;
        }
    } else {
        const t = (playFraction - 0.65) / 0.35;
        
        jumper1.group.position.y = 0;
        jumper2.group.position.y = 0;
        setPlayerStance(jumper1, "idle", elapsed, { lookAt: receiver.group.position });
        setPlayerStance(jumper2, "idle", elapsed, { lookAt: receiver.group.position });
        handledPlayers.add(jumper1);
        handledPlayers.add(jumper2);
        
        const bounceVal = Math.abs(Math.sin(elapsed * 15));
        const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
        ballOffset.applyEuler(receiver.group.rotation);
        arena.ball.position.copy(receiver.group.position).add(ballOffset);
        
        setPlayerStance(receiver, "dribble", elapsed, { lookAt: new THREE.Vector3(dir * 6.5, 0, 0.5) });
        handledPlayers.add(receiver);
    }
    
    const otherOff = arena.possessionSide === "home" ? arena.homePlayers.filter(p => p !== jumper1) : arena.awayPlayers.filter(p => p !== jumper1);
    const otherDef = arena.possessionSide === "home" ? arena.awayPlayers.filter(p => p !== jumper2) : arena.homePlayers.filter(p => p !== jumper2);
    const circlePlayers = [...otherOff, ...otherDef];
    circlePlayers.forEach((p, idx) => {
        if (!handledPlayers.has(p)) {
            const angle = (idx / 8) * Math.PI * 2;
            const px = Math.cos(angle) * 2.8;
            const pz = Math.sin(angle) * 2.8;
            p.group.position.set(px, 0, pz);
            p.target.set(px, 0, pz);
            setPlayerStance(p, "idle", elapsed, { lookAt: arena.ball.position });
            handledPlayers.add(p);
        }
    });
    
    arena.ballTarget.copy(arena.ball.position);
}

function animateTimeout(elapsed, arena, details, playFraction, handledPlayers) {
    const offense = arena.possessionSide === "home" ? arena.homePlayers : arena.awayPlayers;
    const defense = arena.possessionSide === "home" ? arena.awayPlayers : arena.homePlayers;
    
    offense.forEach((p, idx) => {
        const spot = new THREE.Vector3(-4.0 + (idx - 2) * 0.9, 0, -6.8);
        p.group.position.lerp(spot, 0.05);
        setPlayerStance(p, "idle", elapsed, { lookAt: new THREE.Vector3(-4.0, 0, -7.5) });
        handledPlayers.add(p);
    });
    
    defense.forEach((p, idx) => {
        const spot = new THREE.Vector3(4.0 + (idx - 2) * 0.9, 0, -6.8);
        p.group.position.lerp(spot, 0.05);
        setPlayerStance(p, "idle", elapsed, { lookAt: new THREE.Vector3(4.0, 0, -7.5) });
        handledPlayers.add(p);
    });
    
    arena.ball.position.set(0, 0.34, 0);
    arena.ballTarget.copy(arena.ball.position);
}

function animateFreeThrow(elapsed, arena, details, playFraction, handledPlayers) {
    const dir = arena.possessionSide === "home" ? 1 : -1;
    const shooter = details.actor;
    const offense = arena.possessionSide === "home" ? arena.homePlayers : arena.awayPlayers;
    const defense = arena.possessionSide === "home" ? arena.awayPlayers : arena.homePlayers;
    
    const hoopX = dir * 13.6;
    const hoopY = 3.05;
    const hoopPos = new THREE.Vector3(hoopX, hoopY, 0);
    
    offense.forEach((p, idx) => {
        if (p !== shooter) {
            const spot = (idx === 1) ? [dir * 7.5, 3.5] : (idx === 2) ? [dir * 7.5, -3.5] : (idx === 3) ? [dir * 6.5, 1.5] : [dir * 6.5, -1.5];
            p.group.position.set(spot[0], 0, spot[1]);
            setPlayerStance(p, "idle", elapsed, { lookAt: shooter.group.position });
            handledPlayers.add(p);
        }
    });
    defense.forEach((p, idx) => {
        const spot = (idx === 0) ? [dir * 11.2, 1.8] : (idx === 1) ? [dir * 11.2, -1.8] : (idx === 2) ? [dir * 12.4, 1.8] : (idx === 3) ? [dir * 12.4, -1.8] : [dir * 7.0, 0];
        p.group.position.set(spot[0], 0, spot[1]);
        setPlayerStance(p, "idle", elapsed, { lookAt: shooter.group.position });
        handledPlayers.add(p);
    });
    
    shooter.group.position.set(dir * 9.0, 0, 0);
    handledPlayers.add(shooter);
    
    if (playFraction < 0.3) {
        const t = playFraction / 0.3;
        setPlayerStance(shooter, "idle", elapsed, { lookAt: hoopPos });
        
        const bounceVal = Math.abs(Math.sin(t * Math.PI * 3));
        arena.ball.position.set(dir * 9.0, 0.48 + bounceVal * 0.6, 0.4);
    } else if (playFraction < 0.6) {
        const t = (playFraction - 0.3) / 0.3;
        
        if (t < 0.4) {
            const riseT = t / 0.4;
            shooter.group.position.y = Math.sin(riseT * Math.PI) * 0.15;
            setPlayerStance(shooter, "shoot", elapsed, { lookAt: hoopPos, jumpT: riseT });
            
            const ballOffset = new THREE.Vector3(0.42, 1.18 + riseT * 0.6, 0.12);
            ballOffset.applyEuler(shooter.group.rotation);
            arena.ball.position.copy(shooter.group.position).add(ballOffset);
        } else {
            const shotT = (t - 0.4) / 0.6;
            const startBall = new THREE.Vector3(dir * 9.0, 2.1, 0);
            
            const isMiss = details.type === "normal" && playFraction > 0.5;
            const endBall = hoopPos.clone();
            if (isMiss) {
                endBall.x -= dir * 0.24;
            }
            arena.ball.position.lerpVectors(startBall, endBall, shotT);
            arena.ball.position.y += Math.sin(shotT * Math.PI) * 1.5;
            
            shooter.group.position.y = 0;
            setPlayerStance(shooter, "shoot", elapsed, { lookAt: hoopPos, jumpT: 0 });
        }
    } else if (playFraction < 0.7) {
        const t = (playFraction - 0.6) / 0.1;
        setPlayerStance(shooter, "idle", elapsed, { lookAt: hoopPos });
        
        const startBall = hoopPos.clone();
        const endBall = new THREE.Vector3(dir * 9.0, 0.9, 0);
        arena.ball.position.lerpVectors(startBall, endBall, t);
    } else {
        const t = (playFraction - 0.7) / 0.3;
        
        if (t < 0.4) {
            const riseT = t / 0.4;
            shooter.group.position.y = Math.sin(riseT * Math.PI) * 0.15;
            setPlayerStance(shooter, "shoot", elapsed, { lookAt: hoopPos, jumpT: riseT });
            
            const ballOffset = new THREE.Vector3(0.42, 1.18 + riseT * 0.6, 0.12);
            ballOffset.applyEuler(shooter.group.rotation);
            arena.ball.position.copy(shooter.group.position).add(ballOffset);
        } else {
            const shotT = (t - 0.4) / 0.6;
            const startBall = new THREE.Vector3(dir * 9.0, 2.1, 0);
            
            arena.ball.position.lerpVectors(startBall, hoopPos, shotT);
            arena.ball.position.y += Math.sin(shotT * Math.PI) * 1.5;
            
            shooter.group.position.y = 0;
            setPlayerStance(shooter, "shoot", elapsed, { lookAt: hoopPos, jumpT: 0 });
            if (shotT > 0.95) {
                arena.playPulse = 1.0;
            }
        }
    }
    
    arena.ballTarget.copy(arena.ball.position);
}

function animatePlayTrajectory(elapsed, arena, details, playFraction) {
    const dir = arena.possessionSide === "home" ? 1 : -1;
    const hoopX = dir * 13.6;
    const hoopZ = 0;
    const hoopY = 3.05;
    const hoopPos = new THREE.Vector3(hoopX, hoopY, hoopZ);
    const oppositeHoopPos = new THREE.Vector3(-dir * 13.6, hoopY, 0);
    
    const actor = details.actor;
    const secActor = details.secondaryActor;
    const passer = details.passer;
    
    const allPlayers = [...arena.awayPlayers, ...arena.homePlayers];
    const handledPlayers = new Set();
    
    // 1. Special non-transition play types
    if (details.type === "tip-off") {
        animateJumpBall(elapsed, arena, details, playFraction, handledPlayers);
        return;
    }
    if (details.type === "timeout") {
        animateTimeout(elapsed, arena, details, playFraction, handledPlayers);
        return;
    }
    if (details.type === "freethrow") {
        animateFreeThrow(elapsed, arena, details, playFraction, handledPlayers);
        return;
    }
    
    // 2. Standard plays transition upcourt
    if (playFraction < 0.35) {
        animateInboundAndTransition(elapsed, arena, details, playFraction);
        return;
    }
    
    // Scale the main play execution
    const t_exec = (playFraction - 0.35) / 0.65;
    
    if (details.type === "three-make" || details.type === "three-miss") {
        const hasPass = !!passer;
        if (hasPass && t_exec < 0.3) {
            const t = t_exec / 0.3;
            const ballPos = new THREE.Vector3().lerpVectors(passer.group.position, actor.group.position, t);
            ballPos.y += Math.sin(t * Math.PI) * 0.8 + 0.9;
            arena.ball.position.copy(ballPos);
            
            setPlayerStance(passer, "pass", elapsed, { lookAt: actor.group.position });
            setPlayerStance(actor, "idle", elapsed, { lookAt: passer.group.position });
            handledPlayers.add(passer);
            handledPlayers.add(actor);
        }
        else if (t_exec < 0.55) {
            const t = hasPass ? (t_exec - 0.3) / 0.25 : t_exec / 0.55;
            const ballOffset = new THREE.Vector3(0.42, 1.18 + t * 0.6, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
            
            setPlayerStance(actor, "shoot", elapsed, { lookAt: hoopPos, jumpT: t });
            handledPlayers.add(actor);
            
            if (passer) {
                setPlayerStance(passer, "run", elapsed, { lookAt: hoopPos });
                handledPlayers.add(passer);
            }
        }
        else if (t_exec < 0.85) {
            const t = (t_exec - 0.55) / 0.3;
            const startPos = new THREE.Vector3(actor.group.position.x, actor.group.position.y + 2.0, actor.group.position.z);
            const endPos = hoopPos.clone();
            
            if (details.type === "three-miss") {
                endPos.x -= dir * 0.28;
            }
            
            arena.ball.position.lerpVectors(startPos, endPos, t);
            arena.ball.position.y += Math.sin(t * Math.PI) * 2.8;
            
            const landT = Math.min(1.0, (t_exec - 0.55) / 0.2);
            actor.group.position.y = 0.6 * (1.0 - landT);
            
            setPlayerStance(actor, "shoot", elapsed, { lookAt: hoopPos, jumpT: 1.0 - landT });
            handledPlayers.add(actor);
            
            if (passer) {
                setPlayerStance(passer, "idle", elapsed, { lookAt: hoopPos });
                handledPlayers.add(passer);
            }
        }
        else {
            const t = (t_exec - 0.85) / 0.15;
            if (details.type === "three-make") {
                arena.ball.position.set(hoopX, hoopY - t * 1.5, hoopZ);
                arena.playPulse = 1.0;
                
                setPlayerStance(actor, "idle", elapsed, { lookAt: hoopPos });
                handledPlayers.add(actor);
            } else {
                const clangPos = new THREE.Vector3(hoopX - dir * 0.28, hoopY + 0.1, hoopZ);
                const reboundPos = secActor ? secActor.group.position.clone() : new THREE.Vector3(dir * 10.5, 0.55, 1.8);
                arena.ball.position.lerpVectors(clangPos, reboundPos, t);
                arena.ball.position.y += Math.sin(t * Math.PI) * 1.2;
                
                if (secActor) {
                    secActor.group.position.y = Math.sin(t * Math.PI) * 0.8;
                    secActor.target.copy(reboundPos);
                    setPlayerStance(secActor, "rebound", elapsed, { lookAt: arena.ball.position, jumpT: t });
                    handledPlayers.add(secActor);
                }
                
                setPlayerStance(actor, "idle", elapsed, { lookAt: arena.ball.position });
                handledPlayers.add(actor);
            }
            
            if (passer) {
                setPlayerStance(passer, "idle", elapsed, { lookAt: arena.ball.position });
                handledPlayers.add(passer);
            }
        }
    }
    else if (details.type === "layup-make" || details.type === "layup-miss" || details.type === "block") {
        const hasPass = !!passer;
        if (hasPass && t_exec < 0.3) {
            const t = t_exec / 0.3;
            const ballPos = new THREE.Vector3().lerpVectors(passer.group.position, actor.group.position, t);
            ballPos.y += Math.sin(t * Math.PI) * 0.6 + 0.9;
            arena.ball.position.copy(ballPos);
            
            setPlayerStance(passer, "pass", elapsed, { lookAt: actor.group.position });
            setPlayerStance(actor, "idle", elapsed, { lookAt: passer.group.position });
            handledPlayers.add(passer);
            handledPlayers.add(actor);
        }
        else if (t_exec < 0.65) {
            const t = hasPass ? (t_exec - 0.3) / 0.35 : t_exec / 0.65;
            const startSpot = new THREE.Vector3(dir * 6.5, 0, 0.5);
            const rimSpot = new THREE.Vector3(dir * 12.0, 0, 0.1);
            actor.group.position.lerpVectors(startSpot, rimSpot, t);
            
            setPlayerStance(actor, "dribble", elapsed, { lookAt: rimSpot });
            handledPlayers.add(actor);
            
            const bounceVal = Math.abs(Math.sin(elapsed * 18));
            const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
            
            if (secActor) {
                const targetDefSpot = new THREE.Vector3(dir * 11.4, 0, 0.2);
                secActor.group.position.lerp(targetDefSpot, 0.1);
                setPlayerStance(secActor, "run", elapsed, { lookAt: actor.group.position });
                handledPlayers.add(secActor);
            }
            
            if (passer) {
                setPlayerStance(passer, "run", elapsed, { lookAt: hoopPos });
                handledPlayers.add(passer);
            }
        }
        else if (t_exec < 0.80) {
            const t = (t_exec - 0.65) / 0.15;
            
            actor.group.position.y = Math.sin(t * Math.PI) * 1.1;
            actor.group.position.x = dir * (12.0 + t * 0.3);
            
            setPlayerStance(actor, "shoot", elapsed, { lookAt: hoopPos, jumpT: t });
            handledPlayers.add(actor);
            
            if (secActor) {
                if (details.type === "block") {
                    setPlayerStance(secActor, "block", elapsed, { lookAt: actor.group.position, jumpT: t });
                } else {
                    setPlayerStance(secActor, "rebound", elapsed, { lookAt: actor.group.position, jumpT: t * 0.5 });
                }
                handledPlayers.add(secActor);
            }
            
            const releasePos = new THREE.Vector3(actor.group.position.x, actor.group.position.y + 0.8, actor.group.position.z);
            const rimSpot = new THREE.Vector3(dir * 13.0, hoopY + 0.3, 0);
            
            if (details.type === "block") {
                if (t < 0.5) {
                    arena.ball.position.lerpVectors(releasePos, rimSpot, t * 2);
                } else {
                    const blockT = (t - 0.5) * 2;
                    const swatOutPos = new THREE.Vector3(dir * 8.0, 0.3, 3.5);
                    arena.ball.position.lerpVectors(rimSpot, swatOutPos, blockT);
                }
            } else {
                arena.ball.position.lerpVectors(releasePos, rimSpot, t);
            }
            
            if (passer) {
                setPlayerStance(passer, "idle", elapsed, { lookAt: hoopPos });
                handledPlayers.add(passer);
            }
        }
        else {
            const t = (t_exec - 0.80) / 0.20;
            actor.group.position.y = Math.max(0, actor.group.position.y - 0.18);
            if (secActor) secActor.group.position.y = Math.max(0, secActor.group.position.y - 0.18);
            
            setPlayerStance(actor, "idle", elapsed, { lookAt: hoopPos });
            handledPlayers.add(actor);
            
            if (secActor) {
                setPlayerStance(secActor, "idle", elapsed, { lookAt: hoopPos });
                handledPlayers.add(secActor);
            }
            
            if (details.type === "layup-make") {
                arena.ball.position.set(hoopX, hoopY - t * 1.8, 0);
                arena.playPulse = 1.0;
            } else if (details.type === "layup-miss") {
                const bounceSpot = secActor ? secActor.group.position.clone() : new THREE.Vector3(dir * 10.5, 0.55, -1.5);
                arena.ball.position.lerpVectors(new THREE.Vector3(dir * 13.0, hoopY + 0.3, 0), bounceSpot, t);
                arena.ball.position.y += Math.sin(t * Math.PI) * 0.8;
                
                if (secActor) {
                    secActor.group.position.y = Math.sin(t * Math.PI) * 0.7;
                    setPlayerStance(secActor, "rebound", elapsed, { lookAt: arena.ball.position, jumpT: t });
                    handledPlayers.add(secActor);
                }
            } else if (details.type === "block") {
                arena.ball.position.y = 0.34;
            }
            
            if (passer) {
                setPlayerStance(passer, "idle", elapsed, { lookAt: arena.ball.position });
                handledPlayers.add(passer);
            }
        }
    }
    else if (details.type === "dunk") {
        const hasPass = !!passer;
        if (hasPass && t_exec < 0.3) {
            const t = t_exec / 0.3;
            const ballPos = new THREE.Vector3().lerpVectors(passer.group.position, actor.group.position, t);
            ballPos.y += Math.sin(t * Math.PI) * 0.6 + 0.9;
            arena.ball.position.copy(ballPos);
            
            setPlayerStance(passer, "pass", elapsed, { lookAt: actor.group.position });
            setPlayerStance(actor, "idle", elapsed, { lookAt: passer.group.position });
            handledPlayers.add(passer);
            handledPlayers.add(actor);
        } else if (t_exec < 0.65) {
            const t = hasPass ? (t_exec - 0.3) / 0.35 : t_exec / 0.65;
            const startSpot = new THREE.Vector3(dir * 6.5, 0, 0.5);
            const rimSpot = new THREE.Vector3(dir * 11.5, 0, 0);
            actor.group.position.lerpVectors(startSpot, rimSpot, t);
            
            setPlayerStance(actor, "dribble", elapsed, { lookAt: rimSpot });
            handledPlayers.add(actor);
            
            const bounceVal = Math.abs(Math.sin(elapsed * 18));
            const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
            
            if (passer) {
                setPlayerStance(passer, "run", elapsed, { lookAt: hoopPos });
                handledPlayers.add(passer);
            }
        } else if (t_exec < 0.82) {
            const t = (t_exec - 0.65) / 0.17;
            actor.group.position.x = dir * (11.5 + t * 0.6);
            actor.group.position.y = Math.sin(t * Math.PI * 0.5) * 1.9;
            
            actor.limbs.forEach(limb => {
                if (limb.type === "arm") {
                    limb.mesh.rotation.z = -limb.side * 1.4;
                }
            });
            handledPlayers.add(actor);
            arena.ball.position.set(actor.group.position.x, actor.group.position.y + 1.2, actor.group.position.z);
        } else if (t_exec < 0.90) {
            const t = (t_exec - 0.82) / 0.08;
            actor.group.position.y = 1.9;
            actor.limbs.forEach(limb => {
                if (limb.type === "arm") {
                    limb.mesh.rotation.z = -limb.side * 1.4;
                }
            });
            handledPlayers.add(actor);
            
            arena.ball.position.set(hoopX, hoopY - t * 1.5, 0);
            arena.playPulse = 1.0;
        } else {
            const t = (t_exec - 0.90) / 0.10;
            actor.group.position.y = 1.9 * (1.0 - t);
            setPlayerStance(actor, "idle", elapsed, { lookAt: hoopPos });
            handledPlayers.add(actor);
            arena.ball.position.set(hoopX, 0.42, 0);
        }
    }
    else if (details.type === "jumper-make" || details.type === "jumper-miss") {
        const hasPass = !!passer;
        const shotSpot = new THREE.Vector3(dir * 9.5, 0, dir * 2.5);
        
        if (hasPass && t_exec < 0.3) {
            const t = t_exec / 0.3;
            const ballPos = new THREE.Vector3().lerpVectors(passer.group.position, actor.group.position, t);
            ballPos.y += Math.sin(t * Math.PI) * 0.6 + 0.9;
            arena.ball.position.copy(ballPos);
            
            setPlayerStance(passer, "pass", elapsed, { lookAt: actor.group.position });
            setPlayerStance(actor, "idle", elapsed, { lookAt: passer.group.position });
            handledPlayers.add(passer);
            handledPlayers.add(actor);
        } else if (t_exec < 0.6) {
            const t = hasPass ? (t_exec - 0.3) / 0.3 : t_exec / 0.6;
            const startSpot = new THREE.Vector3(dir * 6.5, 0, 0.5);
            actor.group.position.lerpVectors(startSpot, shotSpot, t);
            
            setPlayerStance(actor, "dribble", elapsed, { lookAt: shotSpot });
            handledPlayers.add(actor);
            
            const bounceVal = Math.abs(Math.sin(elapsed * 15));
            const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
            
            if (passer) {
                setPlayerStance(passer, "run", elapsed, { lookAt: hoopPos });
                handledPlayers.add(passer);
            }
        } else if (t_exec < 0.8) {
            const t = (t_exec - 0.6) / 0.2;
            actor.group.position.copy(shotSpot);
            actor.group.position.y = Math.sin(t * Math.PI) * 0.7;
            
            setPlayerStance(actor, "shoot", elapsed, { lookAt: hoopPos, jumpT: t });
            handledPlayers.add(actor);
            
            const ballOffset = new THREE.Vector3(0.42, 1.18 + t * 0.6, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
        } else if (t_exec < 0.92) {
            const t = (t_exec - 0.8) / 0.12;
            const startBall = new THREE.Vector3(shotSpot.x, 2.3, shotSpot.z);
            const endBall = hoopPos.clone();
            if (details.type === "jumper-miss") {
                endBall.x -= dir * 0.25;
            }
            arena.ball.position.lerpVectors(startBall, endBall, t);
            arena.ball.position.y += Math.sin(t * Math.PI) * 1.8;
            
            actor.group.position.copy(shotSpot);
            setPlayerStance(actor, "idle", elapsed, { lookAt: hoopPos });
            handledPlayers.add(actor);
        } else {
            const t = (t_exec - 0.92) / 0.08;
            if (details.type === "jumper-make") {
                arena.ball.position.set(hoopX, hoopY - t * 1.5, 0);
                arena.playPulse = 1.0;
            } else {
                const clangPos = new THREE.Vector3(hoopX - dir * 0.25, hoopY + 0.1, 0);
                const reboundPos = secActor ? secActor.group.position.clone() : new THREE.Vector3(dir * 10.5, 0.55, -1.5);
                arena.ball.position.lerpVectors(clangPos, reboundPos, t);
                arena.ball.position.y += Math.sin(t * Math.PI) * 0.8;
                
                if (secActor) {
                    secActor.group.position.y = Math.sin(t * Math.PI) * 0.6;
                    setPlayerStance(secActor, "rebound", elapsed, { lookAt: arena.ball.position, jumpT: t });
                    handledPlayers.add(secActor);
                }
            }
            
            actor.group.position.copy(shotSpot);
            setPlayerStance(actor, "idle", elapsed, { lookAt: arena.ball.position });
            handledPlayers.add(actor);
        }
    }
    else if (details.type === "charge") {
        const driveSpot = new THREE.Vector3(dir * 9.8, 0, 0.2);
        if (t_exec < 0.5) {
            const t = t_exec / 0.5;
            const startSpot = new THREE.Vector3(dir * 6.5, 0, 0.5);
            actor.group.position.lerpVectors(startSpot, driveSpot, t);
            
            setPlayerStance(actor, "dribble", elapsed, { lookAt: driveSpot });
            handledPlayers.add(actor);
            
            const bounceVal = Math.abs(Math.sin(elapsed * 15));
            const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
            
            if (secActor) {
                secActor.group.position.set(dir * 10.2, 0, 0.2);
                setPlayerStance(secActor, "idle", elapsed, { lookAt: actor.group.position });
                handledPlayers.add(secActor);
            }
        } else if (t_exec < 0.8) {
            const t = (t_exec - 0.5) / 0.3;
            actor.group.position.copy(driveSpot);
            setPlayerStance(actor, "idle", elapsed, { lookAt: driveSpot });
            handledPlayers.add(actor);
            
            if (secActor) {
                secActor.group.position.set(dir * (10.2 + t * 0.8), 0, 0.2);
                secActor.group.rotation.x = -Math.PI / 2 * t;
                handledPlayers.add(secActor);
            }
            
            const startBall = new THREE.Vector3(driveSpot.x, 0.9, driveSpot.z);
            const looseBallSpot = new THREE.Vector3(dir * 7.5, 0.34, 4.5);
            arena.ball.position.lerpVectors(startBall, looseBallSpot, t);
            arena.ball.position.y += Math.abs(Math.sin(t * Math.PI * 2)) * 0.8;
        } else {
            actor.group.position.copy(driveSpot);
            setPlayerStance(actor, "idle", elapsed, { lookAt: arena.ball.position });
            handledPlayers.add(actor);
            
            if (secActor) {
                secActor.group.position.set(dir * 11.0, 0, 0.2);
                secActor.group.rotation.x = -Math.PI / 2;
                handledPlayers.add(secActor);
            }
            
            arena.ball.position.set(dir * 7.5, 0.34, 4.5);
        }
    }
    else if (details.type === "steal") {
        if (t_exec < 0.45) {
            const t = t_exec / 0.45;
            const startSpot = new THREE.Vector3(dir * 2.0, 0, 1.0);
            const stealSpot = new THREE.Vector3(dir * 4.2, 0, 1.6);
            actor.group.position.lerpVectors(startSpot, stealSpot, t);
            
            setPlayerStance(actor, "dribble", elapsed, { lookAt: hoopPos });
            handledPlayers.add(actor);
            
            const bounceVal = Math.abs(Math.sin(elapsed * 18));
            const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
            
            const stealerStart = new THREE.Vector3(dir * 3.2, 0, 3.5);
            secActor.group.position.lerpVectors(stealerStart, stealSpot, t);
            
            setPlayerStance(secActor, "run", elapsed, { lookAt: actor.group.position });
            handledPlayers.add(secActor);
        }
        else {
            const t = (t_exec - 0.45) / 0.55;
            const stealSpot = new THREE.Vector3(dir * 4.2, 0, 1.6);
            const breakawaySpot = new THREE.Vector3(-dir * 9.5, 0, -1.0);
            secActor.group.position.lerpVectors(stealSpot, breakawaySpot, t);
            
            setPlayerStance(secActor, "dribble", elapsed, { lookAt: oppositeHoopPos });
            handledPlayers.add(secActor);
            
            const bounceVal = Math.abs(Math.sin(elapsed * 18));
            const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
            ballOffset.applyEuler(secActor.group.rotation);
            arena.ball.position.copy(secActor.group.position).add(ballOffset);
            
            const initiatorChase = new THREE.Vector3(-dir * 7.5, 0, -0.8);
            actor.group.position.lerpVectors(stealSpot, initiatorChase, t);
            
            setPlayerStance(actor, "run", elapsed, { lookAt: secActor.group.position });
            handledPlayers.add(actor);
        }
    }
    else if (details.type === "turnover") {
        if (t_exec < 0.4) {
            setPlayerStance(actor, "dribble", elapsed, { lookAt: hoopPos });
            handledPlayers.add(actor);
            
            const bounceVal = Math.abs(Math.sin(elapsed * 15));
            const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
            ballOffset.applyEuler(actor.group.rotation);
            arena.ball.position.copy(actor.group.position).add(ballOffset);
        } else {
            const t = (t_exec - 0.4) / 0.6;
            const startSpot = actor.group.position.clone();
            const outOfBounds = new THREE.Vector3(dir * 8.0, 0.34, 8.2);
            arena.ball.position.lerpVectors(startSpot, outOfBounds, t);
            arena.ball.position.y += Math.sin(t * Math.PI) * 0.8;
            
            setPlayerStance(actor, "pass", elapsed, { lookAt: outOfBounds });
            handledPlayers.add(actor);
        }
    }
    else if (details.type === "foul") {
        const bounceVal = Math.abs(Math.sin(elapsed * 10));
        const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
        ballOffset.applyEuler(actor.group.rotation);
        arena.ball.position.copy(actor.group.position).add(ballOffset);
        
        if (secActor) {
            setPlayerStance(actor, "dribble", elapsed, { lookAt: secActor.group.position });
            setPlayerStance(secActor, "run", elapsed, { lookAt: actor.group.position });
            handledPlayers.add(actor);
            handledPlayers.add(secActor);
        } else {
            setPlayerStance(actor, "dribble", elapsed, { lookAt: hoopPos });
            handledPlayers.add(actor);
        }
    }
    else {
        setPlayerStance(actor, "dribble", elapsed, { lookAt: hoopPos });
        handledPlayers.add(actor);
        
        const bounceVal = Math.abs(Math.sin(elapsed * 15));
        const ballOffset = new THREE.Vector3(0.42, 0.48 + bounceVal * 0.84, 0.12);
        ballOffset.applyEuler(actor.group.rotation);
        arena.ball.position.copy(actor.group.position).add(ballOffset);
    }
    
    // Spacing and idles for other players
    allPlayers.forEach(p => {
        if (!handledPlayers.has(p)) {
            const dist = p.group.position.distanceTo(p.target);
            p.group.position.lerp(p.target, 0.08);
            
            if (dist > 0.4) {
                setPlayerStance(p, "run", elapsed, { lookAt: p.target });
            } else {
                setPlayerStance(p, "idle", elapsed, { lookAt: arena.ball.position });
            }
        }
    });

    arena.ballTarget.copy(arena.ball.position);
}

function updateArena3D(teamSide, playMeta, playText) {
    const arena = state.liveSim.arena3d;
    if (!arena) return;

    const resolvedSide = teamSide || arena.possessionSide || (state.liveSim.pbpIndex % 2 === 0 ? "away" : "home");
    arena.possessionSide = resolvedSide;
    arena.playPulse = 1;

    // Reset player jump/height offset and limb rotations from any previous plays
    [...arena.awayPlayers, ...arena.homePlayers].forEach((p) => {
        p.group.position.y = 0;
        p.limbs.forEach(limb => {
            limb.mesh.rotation.set(0, 0, 0);
            if (limb.type === "arm") {
                limb.mesh.rotation.z = limb.side * 0.18;
            } else {
                limb.mesh.rotation.z = limb.side * 0.06;
            }
        });
    });

    if (playMeta.className === "quarter" || playMeta.className === "final") {
        state.liveSim.currentPlayDetails = null;
        [...arena.awayPlayers, ...arena.homePlayers].forEach((player) => {
            player.target.copy(player.base);
            player.group.position.copy(player.base);
            player.group.rotation.set(0, player.direction > 0 ? -0.15 : 0.15, 0);
        });
        arena.ballTarget.set(0, 0.55, 0);
        arena.ball.position.set(0, 0.55, 0);
        return;
    }

    // Parse specific action details from the play text
    const details = parsePlayDetails(playText || "", arena);
    state.liveSim.currentPlayDetails = details;
    state.liveSim.playStartTime = arena.clock.getElapsedTime();

    const offense = resolvedSide === "home" ? arena.homePlayers : arena.awayPlayers;
    const defense = resolvedSide === "home" ? arena.awayPlayers : arena.homePlayers;
    const dir = resolvedSide === "home" ? 1 : -1;

    // Beautiful NBA 4-out/1-in Spacing Sets
    const spacing = [
        [dir * 6.5, 0.5],    // PG (top of key)
        [dir * 7.5, -4.5],   // SG (wing)
        [dir * 11.5, 6.2],   // SF (corner)
        [dir * 8.5, 4.5],    // PF (wing/corner)
        [dir * 11.0, -2.5]   // C (low post)
    ];

    // Set targets for offense
    offense.forEach((player, index) => {
        const spot = spacing[index] || [player.base.x, player.base.z];
        player.target.set(spot[0], 0, spot[1]);
        player.group.rotation.set(0, 0, 0);
        player.group.rotation.y = Math.atan2(dir * 13.6 - spot[0], 0 - spot[1]);
    });

    // Set targets for defense (positioned in front of their matchup facing them)
    defense.forEach((player, index) => {
        const marker = offense[index] || offense[0];
        const defX = marker.target.x + (dir * 1.0);
        const defZ = marker.target.z * 0.95 + (index - 2) * 0.15;
        player.target.set(defX, 0, defZ);
        player.group.rotation.set(0, 0, 0);
        player.group.rotation.y = Math.atan2(marker.target.x - defX, marker.target.z - defZ);
    });

    // Action-specific positioning and starting warps
    if (details.type === "tip-off") {
        // Lineup around center circle
        const jumper1 = details.actor || offense[4];
        const jumper2 = details.secondaryActor || defense[4];
        
        jumper1.group.position.set(-0.5, 0, 0);
        jumper1.target.set(-0.5, 0, 0);
        
        jumper2.group.position.set(0.5, 0, 0);
        jumper2.target.set(0.5, 0, 0);
        
        const otherOff = offense.filter(p => p !== jumper1);
        const otherDef = defense.filter(p => p !== jumper2);
        const circlePlayers = [...otherOff, ...otherDef];
        circlePlayers.forEach((p, idx) => {
            const angle = (idx / 8) * Math.PI * 2;
            const px = Math.cos(angle) * 2.8;
            const pz = Math.sin(angle) * 2.8;
            p.group.position.set(px, 0, pz);
            p.target.set(px, 0, pz);
            p.group.rotation.set(0, -angle, 0);
        });
        
        arena.ball.position.set(0, 0.55, 0);
        arena.ballTarget.set(0, 0.55, 0);
    } else if (details.type === "timeout") {
        // Walk to benches
        offense.forEach((p, idx) => {
            p.target.set(-4.0 + (idx - 2) * 0.9, 0, -6.8);
        });
        defense.forEach((p, idx) => {
            p.target.set(4.0 + (idx - 2) * 0.9, 0, -6.8);
        });
        arena.ballTarget.set(0, 0.34, 0);
    } else if (details.type === "freethrow") {
        // Lineup for free throws instantly
        const shooter = details.actor || offense[0];
        offense.forEach((p, idx) => {
            const spot = (p === shooter) ? [dir * 9.0, 0] : (idx === 1) ? [dir * 7.5, 3.5] : (idx === 2) ? [dir * 7.5, -3.5] : (idx === 3) ? [dir * 6.5, 1.5] : [dir * 6.5, -1.5];
            p.group.position.set(spot[0], 0, spot[1]);
            p.target.set(spot[0], 0, spot[1]);
        });
        defense.forEach((p, idx) => {
            const spot = (idx === 0) ? [dir * 11.2, 1.8] : (idx === 1) ? [dir * 11.2, -1.8] : (idx === 2) ? [dir * 12.4, 1.8] : (idx === 3) ? [dir * 12.4, -1.8] : [dir * 7.0, 0];
            p.group.position.set(spot[0], 0, spot[1]);
            p.target.set(spot[0], 0, spot[1]);
        });
        arena.ball.position.set(dir * 9.0, 1.0, 0);
        arena.ballTarget.set(dir * 9.0, 1.0, 0);
    } else {
        // Standard game play: inbound pass warp!
        const inbounder = offense[4] || offense[0];
        const pg = offense[0];
        
        inbounder.group.position.set(-dir * 14.3, 0, 0.5);
        pg.group.position.set(-dir * 12.0, 0, 1.5);
        
        arena.ball.position.set(-dir * 14.3, 1.0, 0.5);
        arena.ballTarget.set(-dir * 14.3, 1.0, 0.5);
        
        // Ensure other players are initialized (not at 0, 0, 0)
        [...offense.slice(1, 4), ...defense].forEach((p) => {
            if (p.group.position.length() < 0.1) {
                p.group.position.copy(p.target);
            }
        });
    }
}

function animateNextPlay() {
    const pbpList = state.liveSim.pbp;
    const index = state.liveSim.pbpIndex;
    
    if (index >= pbpList.length) {
        // Match finished
        clearInterval(state.liveSim.intervalId);
        state.liveSim.intervalId = null;
        document.getElementById("sim-match-time").textContent = "FINAL";
        showToast("🏁 Game finished!");
        fetchLeagueData(); // Refresh records/standings
        return;
    }
    
    const playText = pbpList[index];
    state.liveSim.pbpIndex++;
    const playMeta = getPlayMeta(playText);
    const scoringTeam = findTeamForPlay(playText);
    
    // Render play description
    const container = document.getElementById("pbp-log-container");
    const msg = document.createElement("div");
    msg.className = `pbp-msg ${playMeta.className}`;
    
    msg.innerHTML = playText;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    
    // Update Score and Time
    // A quick hack is to parse scores from play if it's quarter end or final,
    // or let it dynamically grow. To make it precise, we can update scoreboard scores incrementally!
    // Since our pbp has: "End of Q1: NYE 24 - LAS 26" or similar, we can match and parse this!
    if (playText.includes("End of Q") || playText.includes("Final Score:")) {
        const parts = playText.split(" ");
        const awayAbbr = state.liveSim.awayTeam.abbreviation;
        const homeAbbr = state.liveSim.homeTeam.abbreviation;
        
        let awayIdx = parts.indexOf(awayAbbr);
        let homeIdx = parts.indexOf(homeAbbr);
        
        if (awayIdx !== -1 && homeIdx !== -1) {
            const awayScore = parseInt(parts[awayIdx + 1].replace(",", ""));
            const homeScore = parseInt(parts[homeIdx + 1].replace(",", ""));
            
            state.liveSim.currentAwayScore = awayScore;
            state.liveSim.currentHomeScore = homeScore;
            document.getElementById("sim-away-score").textContent = awayScore;
            document.getElementById("sim-home-score").textContent = homeScore;
        }
        
        if (playText.includes("End of Q")) {
            const qNum = playText.substring(playText.indexOf("Q") + 1, playText.indexOf("Q") + 2);
            document.getElementById("sim-match-time").textContent = `END OF Q${qNum}`;
        } else {
            document.getElementById("sim-match-time").textContent = "FINAL";
        }
    } else {
        addLivePoints(playText, scoringTeam);
    }
    
    updateLiveScoreboardClock();
    updateCourtBroadcast(playText, playMeta, scoringTeam);
    updateArena3D(scoringTeam, playMeta, playText);
    renderLiveBoxScore();
}

function getPlayMeta(playText) {
    const lower = playText.toLowerCase();
    if (playText.includes("Final Score")) return { className: "final", label: "Final" };
    if (playText.includes("End of Q")) return { className: "quarter", label: "Quarter" };
    if (lower.includes("miss") || lower.includes("clang") || lower.includes("spins out")) return { className: "miss", label: "Miss" };
    if (lower.includes("drills") && lower.includes("3-pointer")) return { className: "three-make", label: "Three" };
    if (lower.includes("layup") || lower.includes("scores")) return { className: "shot-make", label: "Score" };
    if (lower.includes("steal") || lower.includes("turnover")) return { className: "stop", label: "Stop" };
    if (lower.includes("rebound")) return { className: "rebound", label: "Board" };
    if (lower.includes("foul") || lower.includes("hacked")) return { className: "foul", label: "Whistle" };
    return { className: "normal", label: "Live" };
}

function findTeamForPlay(playText) {
    const players = Object.values(state.liveSim.boxScore);
    const match = players.find(p => playText.includes(p.name));
    if (!match) return null;
    if (match.team === state.liveSim.awayTeam.abbreviation) return "away";
    if (match.team === state.liveSim.homeTeam.abbreviation) return "home";
    return null;
}

function getPlayPoints(playText) {
    const lower = playText.toLowerCase();
    if (lower.includes("drills") && lower.includes("3-pointer")) return 3;
    if (lower.includes("scores") || lower.includes("layup")) return 2;
    if (lower.includes("sinks both")) return 2;
    
    const ftMatch = lower.match(/makes (\d+) of/);
    if (ftMatch) return parseInt(ftMatch[1]);
    
    return 0;
}

function addLivePoints(playText, teamSide) {
    const points = getPlayPoints(playText);
    if (!points || !teamSide) return;
    
    if (teamSide === "away") {
        state.liveSim.currentAwayScore += points;
    } else if (teamSide === "home") {
        state.liveSim.currentHomeScore += points;
    }
    
    document.getElementById("sim-away-score").textContent = state.liveSim.currentAwayScore;
    document.getElementById("sim-home-score").textContent = state.liveSim.currentHomeScore;
}

function updateCourtBroadcast(playText, playMeta, teamSide) {
    const ball = document.getElementById("court-ball");
    const possession = document.getElementById("possession-team");
    const featured = document.getElementById("featured-play");
    
    ball.className = "";
    if (teamSide === "away") {
        ball.classList.add("ball-away");
        possession.textContent = state.liveSim.awayTeam.abbreviation;
    } else if (teamSide === "home") {
        ball.classList.add("ball-home");
        possession.textContent = state.liveSim.homeTeam.abbreviation;
    } else {
        ball.classList.add("ball-center");
        possession.textContent = playMeta.label;
    }
    
    if (["three-make", "shot-make", "foul", "stop", "final"].includes(playMeta.className)) {
        featured.textContent = playText.replace(/^[^\w]+/, "");
    }
}

function updateLiveScoreboardClock() {
    const progress = Math.min(1.0, state.liveSim.pbpIndex / Math.max(1, state.liveSim.pbp.length));
    
    if (progress >= 1) {
        state.liveSim.currentAwayScore = state.liveSim.finalAwayScore;
        state.liveSim.currentHomeScore = state.liveSim.finalHomeScore;
    }
    
    document.getElementById("sim-away-score").textContent = state.liveSim.currentAwayScore;
    document.getElementById("sim-home-score").textContent = state.liveSim.currentHomeScore;
    
    const total = Math.max(1, state.liveSim.currentAwayScore + state.liveSim.currentHomeScore);
    const homeShare = Math.min(76, Math.max(24, 50 + ((state.liveSim.currentHomeScore - state.liveSim.currentAwayScore) / total) * 90));
    document.getElementById("momentum-fill").style.width = `${homeShare}%`;
    
    const q = Math.min(4, Math.max(1, Math.ceil(progress * 4)));
    if (progress < 1 && !document.getElementById("sim-match-time").textContent.includes("FINAL")) {
        document.getElementById("sim-match-time").textContent = `Q${q} · ${(progress * 100).toFixed(0)}%`;
    }
}

function renderLiveBoxScore() {
    const tbody = document.getElementById("boxscore-tbody");
    tbody.innerHTML = "";
    
    const isAway = state.liveSim.boxScoreTeam === "away";
    const activeAbbr = isAway ? state.liveSim.awayTeam.abbreviation : state.liveSim.homeTeam.abbreviation;
    
    // Filter player box scores
    const playerBoxScores = Object.values(state.liveSim.boxScore).filter(p => p.team === activeAbbr);
    playerBoxScores.sort((a, b) => b.points - a.points);
    
    // Calculate progress scale (so stats grow as game simulates)
    const scale = Math.min(1.0, state.liveSim.pbpIndex / state.liveSim.pbp.length);
    
    playerBoxScores.forEach((p) => {
        const minVal = Math.round(p.minutes * scale);
        const ptsVal = Math.round(p.points * scale);
        const astVal = Math.round(p.assists * scale);
        const rebVal = Math.round(p.rebounds * scale);
        const stlVal = Math.round(p.steals * scale);
        const blkVal = Math.round(p.blocks * scale);
        const toVal = Math.round(p.turnovers * scale);
        
        const fgm = Math.round(p.fg_made * scale);
        const fga = Math.round(p.fg_attempted * scale);
        const tpm = Math.round(p.three_made * scale);
        const tpa = Math.round(p.three_attempted * scale);
        const ftm = Math.round(p.ft_made * scale);
        const fta = Math.round(p.ft_attempted * scale);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-left"><strong>${p.name}</strong> <span style="font-size: 10px; color: var(--text-muted);">${p.position}</span></td>
            <td>${minVal}</td>
            <td><strong>${ptsVal}</strong></td>
            <td>${astVal}</td>
            <td>${rebVal}</td>
            <td>${stlVal}</td>
            <td>${blkVal}</td>
            <td>${toVal}</td>
            <td>${fgm}-${fga}</td>
            <td>${tpm}-${tpa}</td>
            <td>${ftm}-${fta}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 5. Utility Toast
function showToast(message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 6. Navigation Tabs router
function setupEventListeners() {
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            navButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const tabId = btn.getAttribute("data-tab");
            state.activeTab = tabId;
            
            // Toggle view
            const panes = document.querySelectorAll(".tab-pane");
            panes.forEach(pane => pane.classList.remove("active"));
            document.getElementById(tabId).classList.add("active");
            
            // Update Title
            const headings = {
                "dashboard-tab": "League Standings & Dashboard",
                "rosters-tab": "Rosters & Cap Room",
                "free-agency-tab": "Free Agency Negotiations",
                "draft-tab": "Draft Room Prospects",
                "live-sim-tab": "Interactive Court Matchups",
                "history-tab": "Hall of Fame & Honors"
            };
            document.getElementById("page-title").textContent = headings[tabId];
            
            // Extra fetch on tab switch if needed
            fetchLeagueData();
            renderAll();
        });
    });
    
    // Team rosters select
    document.getElementById("roster-team-select").addEventListener("change", () => {
        renderRostersTab();
    });
    
    // Sim controls
    document.getElementById("btn-sim-day").addEventListener("click", simulateDay);
    document.getElementById("btn-sim-season").addEventListener("click", simulateSeason);
    document.getElementById("btn-enter-offseason").addEventListener("click", runProgression);
    document.getElementById("btn-start-live-sim").addEventListener("click", startLiveSim);

    // Playback control listeners
    const btnPause = document.getElementById("btn-pause-sim");
    if (btnPause) {
        btnPause.addEventListener("click", togglePauseSim);
    }
    const btnSkipSim = document.getElementById("btn-skip-sim");
    if (btnSkipSim) {
        btnSkipSim.addEventListener("click", skipLiveSimToEnd);
    }
    const btnSkipWarmup = document.getElementById("btn-skip-warmup");
    if (btnSkipWarmup) {
        btnSkipWarmup.addEventListener("click", endWarmups);
    }
    
    // Leader filters
    const filterBtns = document.querySelectorAll(".leaders-card .filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderStatLeaders(btn.getAttribute("data-leader"));
        });
    });
    
    // Live Box Score Filters
    document.getElementById("box-away-btn").addEventListener("click", () => {
        document.getElementById("box-away-btn").classList.add("active");
        document.getElementById("box-home-btn").classList.remove("active");
        state.liveSim.boxScoreTeam = "away";
        renderLiveBoxScore();
    });
    document.getElementById("box-home-btn").addEventListener("click", () => {
        document.getElementById("box-home-btn").classList.add("active");
        document.getElementById("box-away-btn").classList.remove("active");
        state.liveSim.boxScoreTeam = "home";
        renderLiveBoxScore();
    });
    
    // Match Sim Speed Controllers
    const speedBtns = document.querySelectorAll(".match-speed-control .speed-btn");
    speedBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            speedBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const spd = parseInt(btn.getAttribute("data-speed"));
            state.liveSim.speed = spd;
            
            // If sim is running, restart interval with new speed
            if (state.liveSim.intervalId) {
                startAnimationLoop();
            }
        });
    });
}
