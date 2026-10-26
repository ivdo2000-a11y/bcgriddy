const SUPABASE_URL = 'https://ziqkrsstxxclbfmndniq.supabase.co'; 
const SUPABASE_ANON_KEY = 'https://ziqkrsstxxclbfmndniq.supabase.co/rest/v1/';

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;
const IMG_UNITS = `${STORAGE_BASE}/imgunits/`;
const IMG_OTHER = `${STORAGE_BASE}/imgother/`;
const CUSTOM_TXT = `${STORAGE_BASE}/custom/`;

let supabase = null;
let currentUser = null;
let userProfile = null;

if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function initAuth() {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
            
            if (data) {
                userProfile = data;
            } else {
                const username = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
                const newProf = { id: currentUser.id, username, avatar_url: currentUser.user_metadata?.avatar_url || '', role: 'user' };
                await supabase.from('profiles').insert([newProf]);
                userProfile = newProf;
            }
            
            document.getElementById('userProfileBtn').style.display = 'flex';
            document.getElementById('profileAvatar').src = userProfile.avatar_url || 'https://ziqkrsstxxclbfmndniq.supabase.co/storage/v1/object/public/imgother/default_avatar.png';
            document.getElementById('profileName').textContent = userProfile.username;
            
            if (userProfile.role === 'admin') {
                document.getElementById('adminBtn').style.display = 'flex';
            } else {
                document.getElementById('adminBtn').style.display = 'none';
            }
            document.getElementById('authModal').classList.remove('active');
        } else {
            currentUser = null;
            userProfile = null;
            document.getElementById('userProfileBtn').style.display = 'none';
            document.getElementById('adminBtn').style.display = 'none';
            document.getElementById('authModal').classList.add('active');
        }
    });
}

window.loginWithProvider = async (provider) => {
    if (!supabase) return showToast("Online features not configured.", "error");
    await supabase.auth.signInWithOAuth({ provider });
};

window.loginWithEmail = async () => {
    if (!supabase) return showToast("Online features not configured.", "error");
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message.includes("Invalid login")) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (!signUpError) showToast("Check your email for confirmation!", "success");
    } else if (!error) {
        showToast("Logged in!", "success");
    } else {
        showToast(error.message, "error");
    }
};

window.logout = async () => {
    if (supabase) await supabase.auth.signOut();
    document.getElementById('profileModal').classList.remove('active');
};

window.openProfileModal = async () => {
    if (!currentUser) return;
    const modal = document.getElementById('profileModal');
    const statsDiv = document.getElementById('profStats');
    statsDiv.innerHTML = '<div style="color:#fff;">Loading stats...</div>';
    modal.classList.add('active');

    const { data: history } = await supabase.from('user_grids').select('*').eq('user_id', currentUser.id);
    
    if (!history || history.length === 0) {
        statsDiv.innerHTML = '<div style="color:#fff;">No games played yet.</div>';
        return;
    }

    let totalScore = 0, wins = 0;
    let favCannon = {}, favStyle = {}, favFoundation = {}, favUnit = {};
    
    history.forEach(h => {
        totalScore += h.score || 0;
        if (h.completed && !h.is_loss) wins++;
        if (h.cannon) favCannon[h.cannon] = (favCannon[h.cannon] || 0) + 1;
        if (h.style) favStyle[h.style] = (favStyle[h.style] || 0) + 1;
        if (h.foundation) favFoundation[h.foundation] = (favFoundation[h.foundation] || 0) + 1;
        if (h.cells) {
            h.cells.flat().forEach(cell => {
                if (cell && cell.unitName) {
                    favUnit[cell.unitName] = (favUnit[cell.unitName] || 0) + 1;
                }
            });
        }
    });

    const getTop = (obj) => {
        if (Object.keys(obj).length === 0) return "None";
        return Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
    };

    const winrate = Math.round((wins / history.length) * 100);
    const avgScore = Math.round(totalScore / history.length);

    statsDiv.innerHTML = `
        <div style="background:#1a1b1e; padding:15px; border-radius:8px;">
            <div style="color:#a0a5b0; font-size:12px;">Games Played</div>
            <div style="color:#fff; font-size:20px; font-weight:bold;">${history.length}</div>
        </div>
        <div style="background:#1a1b1e; padding:15px; border-radius:8px;">
            <div style="color:#a0a5b0; font-size:12px;">Winrate</div>
            <div style="color:#4caf50; font-size:20px; font-weight:bold;">${winrate}%</div>
        </div>
        <div style="background:#1a1b1e; padding:15px; border-radius:8px;">
            <div style="color:#a0a5b0; font-size:12px;">Average Score</div>
            <div style="color:#ffd700; font-size:20px; font-weight:bold;">${avgScore.toLocaleString()}</div>
        </div>
        <div style="background:#1a1b1e; padding:15px; border-radius:8px;">
            <div style="color:#a0a5b0; font-size:12px;">Favorite Unit</div>
            <div style="color:#00CED1; font-size:18px; font-weight:bold;">${getTop(favUnit)}</div>
        </div>
        <div style="grid-column: span 2; background:#1a1b1e; padding:15px; border-radius:8px;">
            <div style="color:#a0a5b0; font-size:12px; margin-bottom:5px;">Favorite Loadout</div>
            <div style="color:#fff; font-size:14px;">Cannon: <span style="color:#e09f3e; font-weight:bold;">${getTop(favCannon)}</span></div>
            <div style="color:#fff; font-size:14px;">Style: <span style="color:#00CED1; font-weight:bold;">${getTop(favStyle)}</span></div>
            <div style="color:#fff; font-size:14px;">Foundation: <span style="color:#9370DB; font-weight:bold;">${getTop(favFoundation)}</span></div>
        </div>
    `;
};

/* =========================================================================
   SETTINGS & BACKUP
   ========================================================================= */
window.openSettingsModal = () => {
    document.getElementById('settingsModal').classList.add('active');
    if (userProfile && userProfile.settings) {
        document.getElementById('settingLockLoadout').checked = userProfile.settings.lockLoadout || false;
        document.getElementById('settingLockDifficulty').checked = userProfile.settings.lockDifficulty || false;
    }
};

window.toggleSetting = async (key) => {
    if (!currentUser) return showToast("Login required to save settings.", "error");
    const val = document.getElementById('setting' + key.charAt(0).toUpperCase() + key.slice(1)).checked;
    if (!userProfile.settings) userProfile.settings = {};
    userProfile.settings[key] = val;
    await supabase.from('profiles').update({ settings: userProfile.settings }).eq('id', currentUser.id);
    showToast("Setting saved!", "success");
};

window.exportSave = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gridsData));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "bc_grid_save.json");
    dlAnchorElem.click();
};

window.importSave = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            localStorage.setItem('bc_grids_v30', JSON.stringify(parsed));
            showToast("Save imported! Reloading...", "success");
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            showToast("Invalid save file.", "error");
        }
    };
    reader.readAsText(file);
};

/* =========================================================================
   ADMIN PANEL
   ========================================================================= */
window.openAdminPanel = async () => {
    if (!userProfile || userProfile.role !== 'admin') return;
    document.getElementById('adminPanelModal').classList.add('active');
    const list = document.getElementById('pendingGridsList');
    list.innerHTML = '<div style="color:#fff;">Loading...</div>';
    
    const { data: grids } = await supabase.from('grids')
        .select('*, profiles(username, avatar_url)')
        .eq('status', 'pending');
        
    list.innerHTML = '';
    if (!grids || grids.length === 0) {
        list.innerHTML = '<div style="color:#fff;">No pending grids.</div>';
        return;
    }
    
    grids.forEach(g => {
        const div = document.createElement('div');
        div.className = 'equip-item';
        div.style.height = 'auto';
        div.style.padding = '20px';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; border-bottom: 1px solid #4a4d55; padding-bottom: 15px;">
                <img src="${g.profiles.avatar_url || IMG_OTHER + 'default_avatar.png'}" style="width:50px;height:50px;border-radius:50%; background:#333; object-fit:cover;">
                <div style="text-align:left;">
                    <div style="color:#fff; font-size: 20px; font-weight:bold;">${g.title}</div>
                    <div style="color:#a0a5b0; font-size:14px;">by ${g.profiles.username}</div>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" onclick="approveGrid('${g.id}', 'daily')">Accept as Daily</button>
                <button class="btn btn-primary" style="background:#4caf50;" onclick="approveGrid('${g.id}', 'endless')">Accept as Endless</button>
                <button class="btn btn-danger" onclick="approveGrid('${g.id}', 'rejected')">Reject</button>
            </div>
        `;
        list.appendChild(div);
    });
};

window.approveGrid = async (id, newStatus) => {
    let updateObj = { status: newStatus };
    if (newStatus === 'daily') {
        const dateStr = prompt("Enter date for this Daily Grid (YYYY-MM-DD):");
        if (!dateStr) return;
        updateObj.date = dateStr;
    } else {
        updateObj.date = null;
    }
    
    const { error } = await supabase.from('grids').update(updateObj).eq('id', id);
    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Grid updated successfully!", "success");
        openAdminPanel(); 
    }
};

/* =========================================================================
   BASE GAME LOGIC
   ========================================================================= */
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function bcText(str, opts = {}) { if (str === undefined || str === null) return ''; const size = opts.size || 16; const sizeStyle = size !== 16 ? `font-size:${size}px;` : ''; return `<span class="bc-text" style="${sizeStyle}">${escapeHTML(str)}</span>`; }

function formatConditionName(str) {
    if (!str) return '';
    let safe = escapeHTML(str);
    let parts = safe.split(/( AND | OR | \+ )/);
    for (let i = 0; i < parts.length; i++) {
        let p = parts[i].trim();
        if (p.startsWith("NOT ")) {
            let rest = p.substring(4).trim();
            if (customNegations[rest]) { parts[i] = customNegations[rest]; continue; }
            let neg = "";
            if (rest.startsWith("Has: ")) neg = "Does NOT have " + rest.substring(5);
            else if (rest === "Has talents") neg = "Does NOT have talents";
            else if (rest.startsWith("Can: ")) neg = "Does NOT " + rest.substring(5);
            else if (rest === "Can deal critical hits") neg = "Does NOT deal critical hits";
            else if (rest === "Can do savage blows") neg = "Does NOT do savage blows";
            else if (rest.startsWith("Does ")) {
                let action = rest.substring(5);
                if (["Wave Attacks", "Surge Attacks", "Explosions", "Mini-Wave", "Mini-Surge"].includes(action)) neg = "Does NOT do " + action;
                else neg = "Does NOT " + action;
            } else if (rest.startsWith("Targets: ")) neg = "Does NOT target " + rest.substring(9);
            else if (rest === "No Target Traits") neg = "Has Target Traits";
            else if (rest === "Normal Form") neg = "Is NOT Normal Form";
            else if (rest === "Evolved Form") neg = "Is NOT Evolved Form";
            else if (rest === "True Form") neg = "Is NOT True Form";
            else if (rest === "Ultra Form") neg = "Is NOT Ultra Form";
            else if (rest.startsWith("Rarity: ")) neg = "Rarity is NOT " + rest.substring(8);
            else if (rest === "Massive Damage") neg = "Does NOT deal Massive Damage";
            else if (rest === "Insane damage") neg = "Does NOT deal Insane damage";
            else if (rest === "Strong against") neg = "Is NOT Strong against";
            else if (rest === "Single Target") neg = "Is NOT Single Target";
            else if (rest === "Area Attack") neg = "Is NOT Area Attack";
            else if (rest.startsWith("Immune to ")) neg = "Is NOT immune to " + rest.substring(10);
            else if (rest.startsWith("Has: Immune to ")) neg = "Is NOT immune to " + rest.substring(15);
            else if (rest.includes(" Slayer") || rest.includes(" Killer")) neg = "Does NOT have " + rest;
            else neg = "Is NOT " + rest;
            parts[i] = neg;
        }
    }
    safe = parts.join("");
    safe = safe.replace(/\/(.+?)\//g, (match, p1) => {
        const rawP1 = p1.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const tooltip = customTooltips[rawP1] ? escapeHTML(customTooltips[rawP1]) : "No description.";
        return `<span class="tooltip">${p1}<span class="info-icon">i</span><span class="tooltiptext">${tooltip}</span></span>`;
    });
    return safe;
}

function bcCondText(str, size = 15) { if (!str) return ''; const sizeStyle = size !== 16 ? `font-size:${size}px;` : ''; return `<span class="bc-text" style="${sizeStyle}">${formatConditionName(str)}</span>`; }
function refreshAllBC(root = document) { root.querySelectorAll('[data-bc]').forEach(el => { const size = parseFloat(el.dataset.bcSize || '16'); el.innerHTML = bcText(el.dataset.bc, { size }); }); }

function showToast(msg, type = '') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div'); container.id = 'toast-container';
        container.style.position = 'fixed'; container.style.bottom = '20px'; container.style.right = '20px';
        container.style.display = 'flex'; container.style.flexDirection = 'column'; container.style.gap = '10px';
        container.style.zIndex = '3000'; container.style.pointerEvents = 'none';
        document.body.appendChild(container);
    }
    if (container.children.length >= 5) container.firstElementChild.remove();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span style="font-weight: 300;">${escapeHTML(msg)}</span><span class="toast-close" onclick="this.parentElement.remove()">×</span><div class="toast-progress"></div>`;
    container.appendChild(t);
    setTimeout(() => { if(t.parentElement) t.remove(); }, 2500);
}

let PROCESSED_UNITS = []; let UNIT_MAP = {}; let baseHasTalents = {};
let gridsData = {}; let currentGrid = null; let currentDate = new Date();
let currentLife = 3; const MAX_LIVES = 5; let currentRow = null, currentCol = null;
let customCriteria = {}, customCategoryMap = {}, customTooltips = {}, customNegations = {}; 
let allConditions = [], sortedConditions = [];
let currentCannon = 'Default', currentStyle = 'Default', currentFoundation = 'Default';
let cannonUsesLeft = 1, pendingCannonAction = null, shieldedCells = [];
let timerInterval = null, timerSeconds = 0, thunderPauseUntil = 0;
let currentResTab = 'least', cellAnimations = {}; 
let resultsBrutal = false, resultsNoRepeats = false, resultsCurseblast = false;
let editorState = { rows: ["", "", ""], cols: ["", "", ""], isBrutal: false, brutals: Array(3).fill().map(()=>Array(3).fill("")), name: "" };
let editingCondType = null, editingCondIndex = null, appendMode = 'replace', currentUnitInfoFullName = null;
let cellCache = {}, lastCacheState = "", validUnitsCache = new Map(), conditionCache = new Map();
let bitmaskCache = new Map(), unitIndexMap = new Map(), baseIdFormMasks = new Map();

function clearValidUnitsCache() { validUnitsCache.clear(); conditionCache.clear(); }
function hashStringToSeed(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function createSeededRandom(seedStr) { let h = hashStringToSeed(seedStr); return function() { h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
function getStableConditionList() { return [...allConditions].sort((a, b) => { const catA = getConditionCategory(a) || ""; const catB = getConditionCategory(b) || ""; if (catA !== catB) return catA < catB ? -1 : 1; return a < b ? -1 : (a > b ? 1 : 0); }); }

const FOUNDATIONS = { Default: { name: "Default Foundation", desc: "Every 3 correct answers, a cell blinks pink. Filling it heals 1 life." }, SlowBeam: { name: "Slow Beam Foundation", desc: "Doubles the time before time penalties begin." }, IronWall: { name: "Iron Wall Foundation", desc: "The first instance of damage is completely ignored. Places a shield on your first wrong cell." }, Thunderbolt: { name: "Thunderbolt Foundation", desc: "Every few answers, a cell blinks yellow. Filling it gives +1 cannon use." }, Waterblast: { name: "Waterblast Foundation", desc: "Halves the score penalty for using cannon charges." }, HolyBlast: { name: "Holy Blast Foundation", desc: "Completing the grid without damage upgrades the WORST unit to Legend." }, Breakerblast: { name: "Breakerblast Foundation", desc: "When dropping to 1 life, automatically fire your cannon at a random cell for free." }, Curseblast: { name: "Curseblast Foundation", desc: "Halves the score penalty for losing lives." } };
const STYLES = { Default: { name: "Default Style", desc: "x5 points for Normal rarity answers." }, SlowBeam: { name: "Slow Beam Style", desc: "Percentages do not affect scoring. Shows real-time timer and bonus score." }, IronWall: { name: "Iron Wall Style", desc: "Gain +2 starting lives." }, Thunderbolt: { name: "Thunderbolt Style", desc: "Correct answers start a 5s combo timer. Max combo grants extra score." }, Waterblast: { name: "Waterblast Style", desc: "Always show the number of valid answers in cells." }, HolyBlast: { name: "Holy Blast Style", desc: "Manually placed worst variants are automatically upgraded to Legend rarity." }, Breakerblast: { name: "Breakerblast Style", desc: "Placing a Best answer grants +1 cannon charge." }, Curseblast: { name: "Curseblast Style", desc: "Use lives to buy extra cannon charges. Can't kill you, but won't let you buy more when at 1 HP. Cost scales with starting charges" } };

function isCurseSetActive() { return currentGrid && currentGrid.cannon === 'Curseblast' && currentGrid.style === 'Curseblast' && currentGrid.foundation === 'Curseblast'; }
function isHolySetActive() { return currentGrid && currentGrid.cannon === 'HolyBlast' && currentGrid.style === 'HolyBlast' && currentGrid.foundation === 'HolyBlast'; }
function getSetBonusText(type) { const bonuses = { Default: "Normal answers give as many points as Legendary ones.", SlowBeam: "Removes timer score penalty completely. +1 cannon charge.", IronWall: "Removes cannon score bonus, but 1.5x lives bonus.", Thunderbolt: "+5 seconds to combo duration. Cannon targets only empty cells.", Waterblast: "Changes cannon effect to show all candidates for the cell (no percentages). Select 1 to place. Removes cannon score penalty.", HolyBlast: "Every 3 Legendary answers grants a Holy Mantle (blocks 1 life loss). +200 pts per unused mantle at end.", Breakerblast: "Losing a life removes the worst answer. 2x cannon uses. Best answers give extra points.", Curseblast: "Always have 1 life. Unlimited cannon uses. Removes life score penalty." }; return bonuses[type] || ""; }
function getEquipImage(type, key) { return `${IMG_OTHER}${type}_${key.toLowerCase()}.png`; }

function buildBitsets() {
    bitmaskCache.clear(); unitIndexMap.clear(); baseIdFormMasks.clear();
    for (let i = 0; i < PROCESSED_UNITS.length; i++) {
        const u = PROCESSED_UNITS[i]; unitIndexMap.set(u.fullName, i);
        if (!baseIdFormMasks.has(u.id)) baseIdFormMasks.set(u.id, new Uint32Array(Math.ceil(PROCESSED_UNITS.length / 32)));
        const arr = baseIdFormMasks.get(u.id); arr[i >> 5] |= (1 << (i & 31));
    }
}

function getConditionBitmask(condition) {
    if (bitmaskCache.has(condition)) return bitmaskCache.get(condition);
    const arr = new Uint32Array(Math.ceil(PROCESSED_UNITS.length / 32));
    for (let i = 0; i < PROCESSED_UNITS.length; i++) { if (checkCondition(PROCESSED_UNITS[i].fullName, condition)) arr[i >> 5] |= (1 << (i & 31)); }
    bitmaskCache.set(condition, arr); return arr;
}

function isGridSolvableForCondition(rows, cols, brutalConds = null) {
    const rowMasks = rows.map(r => getConditionBitmask(r));
    const colMasks = cols.map(c => getConditionBitmask(c));
    const cellMasks = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const mask = new Uint32Array(rowMasks[r].length);
            for (let i = 0; i < mask.length; i++) mask[i] = rowMasks[r][i] & colMasks[c][i];
            if (brutalConds && brutalConds[r][c]) { const bMask = getConditionBitmask(brutalConds[r][c]); for (let i = 0; i < mask.length; i++) mask[i] &= bMask[i]; }
            cellMasks.push(mask);
        }
    }
    const cellOptions = [];
    for (let i = 0; i < 9; i++) {
        const mask = cellMasks[i]; const options = new Set();
        for (const [baseId, bMask] of baseIdFormMasks) {
            for (let j = 0; j < mask.length; j++) { if ((mask[j] & bMask[j]) !== 0) { options.add(baseId); break; } }
        }
        cellOptions.push(Array.from(options));
    }
    for (const opts of cellOptions) { if (opts.length === 0) return false; }
    const match = {};
    function dfs(cellIdx, visited) {
        for (const unitId of cellOptions[cellIdx]) {
            if (visited.has(unitId)) continue; visited.add(unitId);
            if (match[unitId] === undefined || dfs(match[unitId], visited)) { match[unitId] = cellIdx; return true; }
        }
        return false;
    }
    let matches = 0;
    for (let i = 0; i < 9; i++) { if (dfs(i, new Set())) matches++; }
    return matches === 9;
}

function buildUnits() {
    PROCESSED_UNITS = []; baseHasTalents = {};
    const ALL_TRAITS = ["Red", "Black", "Floating", "Angel", "Metal", "Alien", "Zombie", "Aku", "Relic", "Traitless"];
    for (const fullName in UNITS_DATA) {
        const data = UNITS_DATA[fullName];
        const idPart = fullName.split(' ')[0]; const baseId = idPart.split('-')[0];
        const name = fullName.split(' ').slice(1).join(' ');
        if (data.talents && data.talents.trim() !== "") baseHasTalents[baseId] = true;
        let baseTraits = [...(data.traits || [])]; let traits = [...baseTraits];
        let abText = data.abilities || ""; const conjureIndex = abText.indexOf("Conjure"); if (conjureIndex !== -1) abText = abText.substring(0, conjureIndex + 7);
        const txt = (abText + "\n" + (data.talents || "")).toLowerCase();
        if (txt.includes("targets: all non-metal")) { if(!traits.includes("All non-Metal")) traits.push("All non-Metal"); } else if (txt.includes("targets: all")) { if(!traits.includes("All")) traits.push("All"); }
        if (data.talents) {
            const tLower = data.talents.toLowerCase();
            for (const trait of ALL_TRAITS) {
                const trLower = trait.toLowerCase();
                if (tLower.includes(`target ${trLower}`) || tLower.includes(`slow ${trLower}`) || tLower.includes(`freeze ${trLower}`) || tLower.includes(`weaken ${trLower}`) || tLower.includes(`knockback ${trLower}`) || tLower.includes(`curse ${trLower}`) || tLower.includes(`dodge ${trLower}`) || tLower.includes(`surge ${trLower}`) || tLower.includes(`wave ${trLower}`)) { if (!traits.includes(trait)) traits.push(trait); }
            }
            if (tLower.includes("dodge all") || tLower.includes("target all")) { if (!traits.includes("All")) traits.push("All"); }
        }
        traits = [...new Set(traits)];
        PROCESSED_UNITS.push({ id: baseId, fullName: fullName, name: name, allNames: [name], baseTraits: baseTraits, traits: traits, abilities: data.abilities || "", talents: data.talents || "", stats: data, allForms: [data] });
    }
    UNIT_MAP = {}; PROCESSED_UNITS.forEach(u => UNIT_MAP[u.fullName] = u); clearValidUnitsCache(); buildBitsets();
}

async function loadCustomCriteria() {
    customCriteria = {}; customCategoryMap = {}; customTooltips = {}; customNegations = {};
    const categories = ['Traits', 'Range', 'Range Type', 'Multi-Hit', 'KB', 'CD', 'Speed', 'TBA', 'Price', 'Target Type', 'Rarity', 'Abilities', 'Misc', 'Gacha', 'Event', 'Source', 'Origin', 'Talents'];
    for (const cat of categories) {
        try {
            let response = await fetch(`${CUSTOM_TXT}${cat}.txt?t=${Date.now()}`);
            if (!response.ok) continue;
            let text = await response.text(); text = text.replace(/^\uFEFF/, '');
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            let currentCond = null; let units = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (/^\d+(-\d+)?$/.test(line)) { if (currentCond) units.push(line); } 
                else {
                    if (currentCond) { customCriteria[currentCond] = units; customCategoryMap[currentCond] = cat; }
                    currentCond = line; units = []; let j = i + 1;
                    const tooltipMatch = currentCond.match(/\/(.+?)\//);
                    if (tooltipMatch && j < lines.length && !/^\d+(-\d+)?$/.test(lines[j]) && !lines[j].startsWith("NOT: ")) { customTooltips[tooltipMatch[1]] = lines[j]; j++; }
                    if (j < lines.length && lines[j].startsWith("NOT: ")) { customNegations[currentCond] = lines[j].substring(5).trim(); j++; }
                    i = j - 1; 
                }
            }
            if (currentCond) { customCriteria[currentCond] = units; customCategoryMap[currentCond] = cat; }
        } catch (e) {}
    }
    let baseConds = ["Rarity: Normal", "Rarity: Special", "Rarity: Rare", "Rarity: Super Rare", "Rarity: Uber Super Rare", "Rarity: Legend Rare", "Normal Form", "Evolved Form", "True Form", "Ultra Form", "Has talents", "Targets: Red","Targets: Black","Targets: Floating","Targets: Angel","Targets: Metal","Targets: Alien","Targets: Zombie","Targets: Aku","Targets: Relic","Targets: Traitless", "No Target Traits", "Targets: Traited", "<200 range","500+ range", "LD","Omni", "Multi-Hit", "1 KB", "<10 CD","60+ CD", "<10 speed","10+ speed", "<1 TBA","10+ TBA", "Has: Behemoth Slayer","Has: Colossus Slayer","Has: Sage Slayer","Has: EVA angel Killer","Has: Witch Killer", "Has: Immune to Wave","Has: Immune to Surge","Has: Immune to Slow","Has: Immune to Freeze","Has: Immune to Curse","Has: Immune to Toxic","Has: Immune to Weaken","Has: Immune to Knockback","Has: Immune to Warp", "Immune to Explosions", "Does Wave Attacks","Does Surge Attacks","Does Explosions","Does Mini-Wave","Does Mini-Surge", "Can: Freeze","Can: Slow","Can: Weaken","Can: Curse","Can: Knockback", "Can deal critical hits","Can do savage blows", "<1000 Price","1000+ Price", "Has \"Cat\" in its name", "Single Target","Area Attack", "Has: Target Only", "Has: Barrier Breaker", "Has: Shield Pierce", "Stops Waves", "Has: Dodge", "Massive Damage", "Insane damage", "Insane Resist", "Resistant to", "Strong against", "Has: Conjure", "Has: Soulstrike", "Has: Zombie Killer"];
    allConditions = [...baseConds];
    for (const name of Object.keys(customCriteria)) { if (!allConditions.includes(name)) allConditions.push(name); }
    sortedConditions = [...allConditions].sort((a, b) => { const catA = getConditionCategory(a) || "Misc"; const catB = getConditionCategory(b) || "Misc"; if (catA !== catB) return catA.localeCompare(catB); return a.localeCompare(b); });
    clearValidUnitsCache(); bitmaskCache.clear();
}

function getConditionCategory(cond) {
    if (customCategoryMap[cond]) return customCategoryMap[cond];
    if (cond.startsWith("Has: Immune") || cond.startsWith("Immune to")) return "Immunities";
    if (cond.includes("Slayer") || cond.includes("Killer")) { if (cond === "Has: Zombie Killer") return "Special"; return "Slayers & Killers"; }
    if (cond.startsWith("Can: ") || cond === "Slow" || cond === "Freeze" || cond === "Weaken" || cond === "Curse" || cond === "Knockback") return "CC Abilities";
    if (cond.startsWith("Does ") || cond === "Wave Attack" || cond === "Surge Attack" || cond === "Explosion Attack" || cond === "Mini-Wave" || cond === "Mini-Surge") return "Attacks";
    if (cond === "Can deal critical hits" || cond === "Can do savage blows" || cond === "Critical Hit" || cond === "Savage Blow") return "Attacks";
    if (cond === "Normal Form" || cond === "Evolved Form" || cond === "True Form" || cond === "Ultra Form") return "Form";
    if (cond === "Has talents" || cond === "Has ultra talents") return "Talents";
    if (["Massive Damage", "Insane damage", "Insane Resist", "Resistant to", "Strong against"].includes(cond)) return "Trait related abilities";
    if (cond === "Has: Target Only" || cond === "Only attacks" || cond === "Has: Barrier Breaker" || cond === "Barrier Breaker" || cond === "Has: Shield Pierce" || cond === "Shield Pierce" || cond === "Stops Waves" || cond === "Has: Dodge" || cond === "Has: Conjure" || cond === "Has: Soulstrike") return "Special";
    if (cond === "Has \"Cat\" in its name" || cond === "Has 'Cat' in name") return "Misc";
    if (["<200 range", "500+ range", "200-400 range", "400-500 range"].includes(cond)) return "Range";
    if (["LD", "Omni"].includes(cond)) return "Range Type";
    if (cond === "Multi-Hit") return "Multi-Hit";
    if (["1 KB", "2 KB", "3 KB"].includes(cond)) return "KB";
    if (["<10 CD", "60+ CD", "10-30 CD"].includes(cond)) return "CD";
    if (["<10 speed", "10+ speed"].includes(cond)) return "Speed";
    if (["<1 TBA", "10+ TBA", "1-3 TBA", "<10 TBA"].includes(cond)) return "TBA";
    if (["<1000 Price", "1000+ Price"].includes(cond)) return "Price";
    if (["Single Target", "Area Attack"].includes(cond)) return "Target Type";
    if (cond.startsWith("Rarity: ")) return "Rarity";
    if (cond.startsWith("Targets: ") && !["Targets: All", "Targets: All non-Metal"].includes(cond)) return "Traits";
    if (cond === "No Target Traits") return "Traits";
    return "Misc";
}

function getUnitDataWithTalents(fullName) {
    const base = UNIT_MAP[fullName]; if (!base) return null;
    let data = { ...base.stats }; let talentsText = data.talents || "";
    if (talentsText) {
        const tbaMatch = talentsText.match(/-([\d,]+) seconds? TBA/i);
        if (tbaMatch) { const tbaReduce = parseFloat(tbaMatch[1].replace(',', '.')); data.tba = (data.tba || 0) - tbaReduce; }
        const speedMatch = talentsText.match(/\+(\d+) Speed/i);
        if (speedMatch) { data.speed = (data.speed || 0) + parseInt(speedMatch[1]); }
    }
    return data;
}

function getExpandedTraits(unit) {
    const ALL_TRAITS = ["Red", "Black", "Floating", "Angel", "Metal", "Alien", "Zombie", "Aku", "Relic", "Traitless"];
    let targetTraits = new Set();
    if (!unit.traits || unit.traits.length === 0) return [];
    for (let t of unit.traits) {
        if (t === "Traited") ALL_TRAITS.forEach(trait => { if (trait !== "Traitless") targetTraits.add(trait); });
        else if (t === "All") ALL_TRAITS.forEach(trait => targetTraits.add(trait));
        else if (t === "All non-Metal") ALL_TRAITS.forEach(trait => { if (trait !== "Metal") targetTraits.add(trait); });
        else targetTraits.add(t);
    }
    return Array.from(targetTraits).sort();
}

function hasExactAbility(originalTxt, abilityName) {
    const lines = originalTxt.split('\n');
    for (let line of lines) { let trimmed = line.trim().toLowerCase(); let target = abilityName.toLowerCase(); if (trimmed === target || trimmed === "abilities: " + target || trimmed === "+" + target) return true; }
    return false;
}

function checkCondition(fullName, condition) {
    if (!condition || typeof condition !== 'string') return false;
    const key = fullName + "||" + condition; if (conditionCache.has(key)) return conditionCache.get(key);
    let res = false;
    if (condition.startsWith("NOT ")) res = !checkCondition(fullName, condition.substring(4));
    else if (condition.includes(" OR ")) res = condition.split(" OR ").some(c => checkCondition(fullName, c.trim()));
    else if (condition.includes(" AND ")) res = condition.split(" AND ").every(c => checkCondition(fullName, c.trim()));
    else if (condition.includes(" + ")) res = condition.split(" + ").every(c => checkCondition(fullName, c.trim()));
    else {
        const unit = UNIT_MAP[fullName]; if (!unit) { conditionCache.set(key, false); return false; }
        const baseData = unit.stats; const dataWithTalents = getUnitDataWithTalents(fullName);
        let abLines = (unit.abilities || "").split('\n');
        if (abLines.length > 0 && (abLines[0].includes(unit.fullName) || abLines[0].includes(unit.name))) abLines.shift();
        let originalTxt = abLines.join('\n') + "\n" + (unit.talents || "");
        const conjureIndex = originalTxt.indexOf("Conjure"); if (conjureIndex !== -1) originalTxt = originalTxt.substring(0, conjureIndex + 7);

        if (condition.startsWith("Rarity: ")) res = baseData.type === condition.replace("Rarity: ", "");
        else if (condition === "Normal Form") res = unit.fullName.split(' ')[0].endsWith('-0');
        else if (condition === "Evolved Form") res = unit.fullName.split(' ')[0].endsWith('-1');
        else if (condition === "True Form") res = unit.fullName.split(' ')[0].endsWith('-2');
        else if (condition === "Ultra Form") res = unit.fullName.split(' ')[0].endsWith('-3');
        else if (condition === "Has talents") res = baseHasTalents[unit.id] === true;
        else if (condition.startsWith("Targets: ")) {
            const trait = condition.replace("Targets: ", "");
            if (trait === "All") res = true;
            else if (trait === "All non-Metal") res = unit.traits.includes("All non-Metal") || unit.traits.includes("All");
            else if (trait === "Traitless") res = unit.traits.includes("Traitless") || unit.traits.includes("All") || unit.traits.includes("All non-Metal");
            else { const expanded = getExpandedTraits(unit); res = expanded.includes(trait); }
        } else if (condition === "No Target Traits") res = unit.baseTraits.length === 0;
        else if (customCriteria[condition]) {
            const cUnits = customCriteria[condition]; const unitId = fullName.split(' ')[0]; const baseId = unitId.split('-')[0];
            for (const pat of cUnits) { if (!pat.includes('-') && baseId === pat) { res = true; break; } if (pat.includes('-') && unitId === pat) { res = true; break; } }
        } else if (condition === "Has: Target Only" || condition === "Only attacks") res = originalTxt.toLowerCase().includes("only attacks");
        else if (condition === "Has: Barrier Breaker" || condition === "Barrier Breaker") res = originalTxt.toLowerCase().includes("break barriers");
        else if (condition === "Has: Shield Pierce" || condition === "Shield Pierce") res = originalTxt.toLowerCase().includes("pierce shields");
        else if (condition === "Has: EVA angel Killer") res = originalTxt.toLowerCase().includes("eva angel killer");
        else if (condition === "Has: Witch Killer") res = originalTxt.toLowerCase().includes("witch killer");
        else if (condition === "Has: Behemoth Slayer" || condition === "Behemoth Slayer") res = originalTxt.toLowerCase().includes("behemoth slayer");
        else if (condition === "Has: Colossus Slayer" || condition === "Colossus Slayer") res = originalTxt.toLowerCase().includes("colossus slayer");
        else if (condition === "Has: Sage Slayer" || condition === "Sage Slayer") res = originalTxt.toLowerCase().includes("sage slayer");
        else if (condition === "Has: Zombie Killer" || condition === "Zombie Killer") res = originalTxt.toLowerCase().includes("zombie killer");
        else if (condition === "Has: Conjure" || condition === "Conjure") res = originalTxt.toLowerCase().includes("conjure");
        else if (condition === "Has: Soulstrike" || condition === "Soulstrike") res = originalTxt.toLowerCase().includes("soulstrike");
        else if (condition.startsWith("Has: Immune to ") || condition.startsWith("Immune to ")) {
            const imm = condition.replace("Has: Immune to ", "").replace("Immune to ", "").toLowerCase();
            const lines = originalTxt.toLowerCase().split('\n');
            for (const line of lines) { if (line.includes('immune to')) { const immPart = line.replace(/.*immune to\s*/, ''); const parts = immPart.split(/,|\s+and\s+/); if (parts.some(p => p.trim() === imm)) { res = true; break; } } }
        } else if (condition === "Has \"Cat\" in its name" || condition === "Has 'Cat' in name") { const unitName = fullName.split(' ').slice(1).join(' '); res = unitName.toLowerCase().includes("cat"); }
        else if (condition === "Massive Damage") res = hasExactAbility(originalTxt, "Massive Damage");
        else if (condition === "Insane damage") res = hasExactAbility(originalTxt, "Insane damage");
        else if (condition === "Insane Resist") res = hasExactAbility(originalTxt, "Insane Resist");
        else if (condition === "Resistant to") res = hasExactAbility(originalTxt, "Resistant to");
        else if (condition === "Strong against") res = hasExactAbility(originalTxt, "Strong against");
        else if (condition === "<200 range") res = unit.allForms.some(f => f.range < 200);
        else if (condition === "200-400 range") res = unit.allForms.some(f => f.range >= 200 && f.range < 400);
        else if (condition === "400-500 range") res = unit.allForms.some(f => f.range >= 400 && f.range < 500);
        else if (condition === "500+ range") res = unit.allForms.some(f => f.range >= 500);
        else if (condition === "LD") res = unit.allForms.some(f => f.rangeType === "LD");
        else if (condition === "Omni") res = unit.allForms.some(f => f.rangeType === "Omni");
        else if (condition === "Multi-Hit") res = unit.allForms.some(f => f.isMultiHit);
        else if (condition === "1 KB") res = unit.allForms.some(f => f.kb === 1);
        else if (condition === "2 KB") res = unit.allForms.some(f => f.kb === 2);
        else if (condition === "3 KB") res = unit.allForms.some(f => f.kb === 3);
        else if (condition === "<10 CD") res = unit.allForms.some(f => f.cd < 10);
        else if (condition === "10-30 CD") res = unit.allForms.some(f => f.cd >= 10 && f.cd < 30);
        else if (condition === "60+ CD") res = unit.allForms.some(f => f.cd >= 60);
        else if (condition === "<10 speed") res = unit.allForms.some(f => f.speed < 10) || dataWithTalents.speed < 10;
        else if (condition === "10+ speed") res = unit.allForms.some(f => f.speed >= 10) || dataWithTalents.speed >= 10;
        else if (condition === "<1 TBA") res = unit.allForms.some(f => f.tba < 1) || dataWithTalents.tba < 1;
        else if (condition === "1-3 TBA") res = unit.allForms.some(f => f.tba >= 1 && f.tba < 3) || (dataWithTalents.tba >= 1 && dataWithTalents.tba < 3);
        else if (condition === "10+ TBA") res = unit.allForms.some(f => f.tba >= 10) || dataWithTalents.tba >= 10;
        else if (condition === "<10 TBA") res = unit.allForms.some(f => f.tba < 10) || dataWithTalents.tba < 10;
        else if (condition === "<1000 Price") res = unit.allForms.some(f => f.price < 1000);
        else if (condition === "1000+ Price") res = unit.allForms.some(f => f.price >= 1000);
        else if (condition === "Single Target") res = unit.allForms.some(f => f.isSingleTarget);
        else if (condition === "Area Attack") res = unit.allForms.some(f => !f.isSingleTarget);
        else {
            function hasAbility(ability, exclude = []) {
                const lines = originalTxt.toLowerCase().split('\n');
                for (const line of lines) { if (line.includes(ability)) { if (!line.includes('immune to') && !line.includes('resistant to') && !exclude.some(e => line.includes(e))) return true; } }
                return false;
            }
            if (condition === "Does Wave Attacks" || condition === "Wave Attack") res = hasAbility('wave', ['mini-wave', 'mini wave', 'stops wave', 'wave blocker']);
            else if (condition === "Does Mini-Wave" || condition === "Mini-Wave") res = hasAbility('mini-wave') || hasAbility('mini wave');
            else if (condition === "Does Surge Attacks" || condition === "Surge Attack") res = hasAbility('surge', ['mini-surge', 'mini surge']);
            else if (condition === "Does Mini-Surge" || condition === "Mini-Surge") res = hasAbility('mini-surge') || hasAbility('mini surge');
            else if (condition === "Does Explosions" || condition === "Explosion Attack") res = hasAbility('explosion');
            else if (condition === "Can: Freeze" || condition === "Freeze") res = hasAbility('freeze');
            else if (condition === "Can: Slow" || condition === "Slow") res = hasAbility('slow');
            else if (condition === "Can: Weaken" || condition === "Weaken") res = hasAbility('weaken');
            else if (condition === "Can: Curse" || condition === "Curse") res = hasAbility('curse');
            else if (condition === "Can: Knockback" || condition === "Knockback") res = hasAbility('knockback');
            else if (condition === "Has: Dodge" || condition === "Dodge") res = hasAbility('dodge');
            else if (condition === "Can deal critical hits" || condition === "Critical Hit") res = hasAbility('critical');
            else if (condition === "Can do savage blows" || condition === "Savage Blow") res = hasAbility('savage');
            else if (condition === "Stops Waves") res = hasAbility('stops wave') || hasAbility('wave blocker');
        }
    }
    conditionCache.set(key, res); return res;
}

function getValidUnits(rowC, colC) {
    if (!rowC && !colC) return [];
    const key = (rowC || "") + "||" + (colC || "");
    if (validUnitsCache.has(key)) return validUnitsCache.get(key);
    let res;
    if (!rowC) res = PROCESSED_UNITS.filter(u => checkCondition(u.fullName, colC));
    else if (!colC) res = PROCESSED_UNITS.filter(u => checkCondition(u.fullName, rowC));
    else res = PROCESSED_UNITS.filter(u => checkCondition(u.fullName, rowC) && checkCondition(u.fullName, colC));
    validUnitsCache.set(key, res); return res;
}

function isUnitUsed(fullName) {
    const baseId = fullName.split(' ')[0].split('-')[0]; let count = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const c = currentGrid.cells[i][j]; if (c && c.unitFullName.split(' ')[0].split('-')[0] === baseId) count++; }
    if (currentGrid.duplicateNextUnit) return count >= 2;
    return count >= 1;
}

function computeDeterministicBrutals(grid) {
    if (!grid || !grid.originalConditions) return null;
    const origRows = grid.originalConditions.rows; const origCols = grid.originalConditions.cols;
    const brutals = Array(3).fill().map(() => Array(3).fill("")); const usedCats = new Set();
    for (let i = 0; i < 3; i++) {
        origRows[i].split(' AND ').forEach(c => usedCats.add(getConditionCategory(c.trim())));
        origCols[i].split(' AND ').forEach(c => usedCats.add(getConditionCategory(c.trim())));
    }
    const stableList = getStableConditionList();
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const rng = createSeededRandom(grid.date + "|brutal|" + r + "|" + c + "|v4");
            const shuffled = [...stableList];
            for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
            let chosen = null;
            for (const cond of shuffled) {
                if (usedCats.has(getConditionCategory(cond))) continue;
                const testBrutals = brutals.map(row => [...row]); testBrutals[r][c] = cond;
                if (isGridSolvableForCondition(origRows, origCols, testBrutals)) { chosen = cond; break; }
            }
            if (!chosen) {
                for (const cond of shuffled) {
                    const testBrutals = brutals.map(row => [...row]); testBrutals[r][c] = cond;
                    if (isGridSolvableForCondition(origRows, origCols, testBrutals)) { chosen = cond; break; }
                }
            }
            if (chosen) { brutals[r][c] = chosen; usedCats.add(getConditionCategory(chosen)); }
        }
    }
    return brutals;
}

function materializeBrutalConds() {
    if (!currentGrid.isBrutal) return;
    const brutals = computeDeterministicBrutals(currentGrid);
    let changed = !currentGrid.brutalConds;
    if (!changed) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cur = currentGrid.brutalConds[i] && currentGrid.brutalConds[i][j];
                const nxt = brutals && brutals[i][j];
                if (cur !== nxt) { changed = true; break; }
            }
            if (changed) break;
        }
    }
    if (changed) { currentGrid.brutalConds = brutals; saveGrids(); renderGrid(); }
}

function getDeterministicCurseConditions(grid) {
    if (grid._cachedCurseConds) return grid._cachedCurseConds;
    const origRows = grid.originalConditions.rows; const origCols = grid.originalConditions.cols;
    const brutals = computeDeterministicBrutals({ date: grid.date, isBrutal: true, originalConditions: grid.originalConditions });
    const resultRows = ["", "", ""]; const resultCols = ["", "", ""];
    const usedCats = new Set(); const existingConditions = new Set();
    for(let i=0; i<3; i++) {
        origRows[i].split(' AND ').forEach(c => { existingConditions.add(c.trim()); usedCats.add(getConditionCategory(c.trim())); });
        origCols[i].split(' AND ').forEach(c => { existingConditions.add(c.trim()); usedCats.add(getConditionCategory(c.trim())); });
    }
    if (brutals) { for(let i=0; i<3; i++) for(let j=0; j<3; j++) { if (brutals[i][j]) { existingConditions.add(brutals[i][j]); usedCats.add(getConditionCategory(brutals[i][j])); } } }
    const testRows = [...origRows]; const testCols = [...origCols];
    const sequence = [{ isRow: true, index: 0 }, { isRow: true, index: 1 }, { isRow: true, index: 2 }, { isRow: false, index: 0 }, { isRow: false, index: 1 }, { isRow: false, index: 2 }];
    for (const step of sequence) {
        const { isRow, index } = step;
        const stableList = getStableConditionList();
        const rng = createSeededRandom(grid.date + "|curse|" + (isRow ? "R" : "C") + "|" + index + "|v7");
        const shuffled = [...stableList];
        for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
        let chosen = null;
        const tryCondition = (cond, requireUniqueCat) => {
            if (existingConditions.has(cond)) return false;
            if (requireUniqueCat && usedCats.has(getConditionCategory(cond))) return false;
            const tempRows = [...testRows]; const tempCols = [...testCols];
            if (isRow) tempRows[index] += " AND " + cond; else tempCols[index] += " AND " + cond;
            return isGridSolvableForCondition(tempRows, tempCols, brutals);
        };
        for (const cond of shuffled) { if (tryCondition(cond, true)) { chosen = cond; break; } }
        if (!chosen) { for (const cond of shuffled) { if (tryCondition(cond, false)) { chosen = cond; break; } } }
        if (chosen) {
            if (isRow) testRows[index] += " AND " + chosen; else testCols[index] += " AND " + chosen;
            usedCats.add(getConditionCategory(chosen)); existingConditions.add(chosen);
            if (isRow) resultRows[index] = chosen; else resultCols[index] = chosen;
        }
    }
    grid._cachedCurseConds = { rows: resultRows, cols: resultCols };
    return grid._cachedCurseConds;
}

function getEffectiveConditions(r, c, ignoreCurse = false) {
    let rowC = ignoreCurse ? currentGrid.originalConditions.rows[r] : currentGrid.conditions.rows[r];
    let colC = ignoreCurse ? currentGrid.originalConditions.cols[c] : currentGrid.conditions.cols[c];
    let brutalC = (currentGrid.isBrutal && currentGrid.brutalConds) ? currentGrid.brutalConds[r][c] : "";
    if (brutalC) {
        const existingConds = rowC.split(' AND ').concat(colC.split(' AND ')).map(s=>s.trim());
        if (!existingConds.includes(brutalC)) rowC += " AND " + brutalC;
        else brutalC = "";
    }
    return { row: rowC, col: colC, brutal: brutalC };
}

function getBaseRarity(pct) { if (pct <= 0.5) return 'Legend'; if (pct <= 3) return 'Uber'; if (pct <= 7) return 'SuperRare'; if (pct <= 20) return 'Rare'; return 'Normal'; }

function calculatePercentageForCondition(rowC, colC, unitFullName, hashSalt = "") {
    const valid = getValidUnits(rowC, colC);
    if (valid.length === 0) return { pct: 0, rarity: 'Normal', isBest: false, isWorst: false };
    let grouped = {}; valid.forEach(u => { if (!grouped[u.id]) grouped[u.id] = []; grouped[u.id].push(u); });
    const totalGroups = Object.keys(grouped).length;
    if (totalGroups === 1) return { pct: 100, rarity: 'Special', isBest: false, isWorst: false };
    let totalWeight = 0; const weights = {}; const baseWeights = { 'Normal': 500, 'Rare': 150, 'SuperRare': 40, 'Uber': 10, 'Legend': 2, 'Special': 500 };
    for (const baseId in grouped) {
        const repUnit = grouped[baseId][0]; const rar = repUnit.stats.type; let base = baseWeights[rar] || 300;
        const idNum = parseInt(baseId.replace(/\D/g, '')) || 0; const distFromCenter = Math.abs(idNum - 350); const idMultiplier = 0.2 + (distFromCenter / 350) * 1.5; base *= idMultiplier;
        let hash = 0; const str = baseId + hashSalt + "weight";
        for (let k = 0; k < str.length; k++) hash = ((hash << 5) - hash) + str.charCodeAt(k);
        const noise = 0.5 + (Math.abs(hash) % 100) / 100;
        const w = base * noise; weights[baseId] = w; totalWeight += w;
    }
    let minPct = 100, maxPct = 0;
    for (const baseId in weights) {
        let pct = (weights[baseId] / totalWeight) * 100; if (pct < 0.1) pct = 0.1; if (pct > 99.9) pct = 99.9;
        weights[baseId] = pct; if (pct < minPct) minPct = pct; if (pct > maxPct) maxPct = pct;
    }
    const targetUnit = UNIT_MAP[unitFullName]; if (!targetUnit) return { pct: 0, rarity: 'Normal', isBest: false, isWorst: false };
    const pct = weights[targetUnit.id]; const isBest = (Math.abs(pct - minPct) < 0.001); const isWorst = (Math.abs(pct - maxPct) < 0.001);
    return { pct: parseFloat(pct.toFixed(1)), rarity: getBaseRarity(pct), isBest: isBest && totalGroups > 1, isWorst: isWorst && totalGroups > 1 };
}

function getCellData(r, c, ignoreCurse = false) {
    const stateStr = currentGrid.date + JSON.stringify(currentGrid.cells) + currentGrid.isBrutal + ignoreCurse + JSON.stringify(currentGrid.conditions);
    if (stateStr !== lastCacheState) { cellCache = {}; lastCacheState = stateStr; }
    const key = `${r}-${c}-${ignoreCurse}`; if (cellCache[key]) return cellCache[key];
    const conds = getEffectiveConditions(r, c, ignoreCurse); const valid = getValidUnits(conds.row, conds.col);
    if (valid.length === 0) { cellCache[key] = []; return []; }
    let grouped = {}; valid.forEach(u => { if (!grouped[u.id]) grouped[u.id] = []; grouped[u.id].push(u); });
    const totalGroups = Object.keys(grouped).length;
    if (totalGroups === 1) { const results = valid.map(u => ({ unit: u, pct: 100, rarity: 'Special', isBest: false, isWorst: false })); cellCache[key] = results; return results; }
    
    let totalWeight = 0; const weights = {}; const baseWeights = { 'Normal': 500, 'Rare': 150, 'SuperRare': 40, 'Uber': 10, 'Legend': 2, 'Special': 500 };
    
    const cellIndex = r * 3 + c;
    const votesForCell = (currentGrid.realVotes && currentGrid.realVotes[cellIndex]) ? currentGrid.realVotes[cellIndex] : {};

    for (const baseId in grouped) {
        const repUnit = grouped[baseId][0]; const rar = repUnit.stats.type; let base = baseWeights[rar] || 300;
        const idNum = parseInt(baseId.replace(/\D/g, '')) || 0; const distFromCenter = Math.abs(idNum - 350); const idMultiplier = 0.2 + (distFromCenter / 350) * 1.5; base *= idMultiplier;
        let hash = 0; const str = baseId + r + c + "weight";
        for (let k = 0; k < str.length; k++) hash = ((hash << 5) - hash) + str.charCodeAt(k);
        
        let noise = (Math.abs(hash) % 100) / 100;
        if (noise < 0.4) noise = 0;
        
        const genWeight = base * noise;
        const realVotes = votesForCell[baseId] || 0;
        const finalWeight = genWeight + (realVotes * 500); 
        
        weights[baseId] = finalWeight; totalWeight += finalWeight;
    }

    let minPct = 100, maxPct = 0;
    for (const baseId in weights) {
        let pct = totalWeight === 0 ? 0 : (weights[baseId] / totalWeight) * 100;
        if (pct < 0.1 && weights[baseId] > 0) pct = 0.1;
        if (pct > 99.9) pct = 99.9;
        weights[baseId] = pct;
        if (pct < minPct) minPct = pct;
        if (pct > maxPct) maxPct = pct;
    }

    const results = valid.map(u => {
        const pct = weights[u.id];
        const isBest = (pct > 0 && Math.abs(pct - minPct) < 0.001);
        const isWorst = (Math.abs(pct - maxPct) < 0.001);
        return { unit: u, pct: parseFloat(pct.toFixed(1)), rarity: getBaseRarity(pct), isBest: isBest && totalGroups > 1, isWorst: isWorst && totalGroups > 1 };
    });

    cellCache[key] = results; return results;
}

function calculatePercentage(r, c, unitFullName) {
    const data = getCellData(r, c, false);
    const res = data.find(x => x.unit.fullName === unitFullName);
    if (res) return res;
    return { pct: 0, rarity: 'Normal', isBest: false, isWorst: false };
}

function getRarityPoints(rarity) { return { Normal: 5, Rare: 15, SuperRare: 30, Uber: 50, Legend: 100, Best: 120, Special: 100 }[rarity] || 0; }

function getRarityScore(rarity, pct, isSlowBeam) {
    if (rarity === 'Best') return 1500;
    if (rarity === 'Legend') return 1250;
    if (rarity === 'Special') return 1250;
    if (isSlowBeam) {
        if (rarity === 'Uber') return 800;
        if (rarity === 'SuperRare') return 600;
        if (rarity === 'Rare') return 400;
        return 200;
    }
    let val = 0;
    if (rarity === 'Uber') val = 800 * (1 - (pct - 0.5) / 2.5);
    else if (rarity === 'SuperRare') val = 600 * (1 - (pct - 3) / 4);
    else if (rarity === 'Rare') val = 400 * (1 - (pct - 7) / 13);
    else val = 200 * (1 - (pct - 20) / 80);
    return Math.max(50, Math.round(val));
}

function getRarityColor(rarity) {
    if (rarity === 'Legend') return 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #a1c4fd 100%)';
    if (rarity === 'Best') return 'linear-gradient(135deg, #ffdf00 0%, #fff8a8 50%, #ffdf00 100%)';
    if (rarity === 'Uber') return '#ef4444';
    if (rarity === 'SuperRare') return '#f97316';
    if (rarity === 'Rare') return '#eab308';
    if (rarity === 'Special') return '#22c55e';
    return '#3b82f6';
}

function getDisplayRarity(rarity) { if (rarity === 'SuperRare') return 'Super Rare'; return rarity; }
function upgradeRarity(rarity) {
    if (rarity === 'Best' || rarity === 'Legend' || rarity === 'Special') return rarity;
    const tiers = ['Normal', 'Rare', 'SuperRare', 'Uber', 'Legend'];
    let idx = tiers.indexOf(rarity);
    if (idx !== -1 && idx < tiers.length - 1) return tiers[idx + 1];
    return rarity;
}

function calculateFinalScore(isLoss = false) {
    let filledCells = 0;
    for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { if (currentGrid.cells[r][c]) filledCells++; } }
    let baseCellPoints = filledCells * 500;
    let winBonus = isLoss ? 0 : 1000;
    let livesBonus = 0;
    if (!isLoss) {
        if (currentGrid.style === 'IronWall' && currentGrid.cannon === 'IronWall' && currentGrid.foundation === 'IronWall') livesBonus = Math.round(currentLife * 750);
        else if (currentGrid.foundation === 'Curseblast') livesBonus = Math.round(1250 + currentLife * 250);
        else livesBonus = currentLife * 500;
    }
    let uses = CANNONS[currentGrid.cannon] ? CANNONS[currentGrid.cannon].uses : 1;
    let cannonBonus = 0; const baseCannonScore = 500;
    if (currentGrid.cannon === 'IronWall' && currentGrid.style === 'IronWall' && currentGrid.foundation === 'IronWall') cannonBonus = 0;
    else if (currentGrid.style === 'Waterblast' && currentGrid.cannon === 'Waterblast' && currentGrid.foundation === 'Waterblast') cannonBonus = 1000;
    else if (currentGrid.style === 'Waterblast') cannonBonus = 1000;
    else if (currentGrid.foundation === 'Waterblast') cannonBonus = Math.min(1500, Math.round(250 + (Math.max(0, cannonUsesLeft) / uses) * baseCannonScore * 2));
    else cannonBonus = Math.min(1500, Math.round((Math.max(0, cannonUsesLeft) / uses) * baseCannonScore * 2));
    let timeBonus = 0;
    if (currentGrid.cannon === 'SlowBeam' && currentGrid.style === 'SlowBeam' && currentGrid.foundation === 'SlowBeam') timeBonus = 1000;
    else { let graceSeconds = (currentGrid.foundation === 'SlowBeam' || currentGrid.style === 'SlowBeam') ? 600 : 300; if (currentGrid.isBrutal) graceSeconds += 300; timeBonus = isLoss ? 0 : Math.max(0, Math.round(1000 - Math.max(0, timerSeconds - graceSeconds) * (1000 / graceSeconds))); }
    let rarityBonus = 0; const isSlowBeamStyle = currentGrid.style === 'SlowBeam';
    for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { const cell = currentGrid.cells[r][c]; if (cell) rarityBonus += getRarityScore(cell.rarity, cell.percentage || 0, isSlowBeamStyle); } }
    let holyMantleBonus = (currentGrid.holyMantles || 0) * 200;
    let comboBonus = 0;
    if (currentGrid.style === 'Thunderbolt') comboBonus = (currentGrid.maxCombo || 0) * 150;
    if (currentGrid.cannon === 'Breakerblast' && currentGrid.style === 'Breakerblast' && currentGrid.foundation === 'Breakerblast') {
        let bestCount = 0; for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) { if (currentGrid.cells[r][c] && currentGrid.cells[r][c].rarity === 'Best') bestCount++; } }
        comboBonus += bestCount * 200;
    }
    let totalBase = baseCellPoints + winBonus + livesBonus + cannonBonus + timeBonus + comboBonus + rarityBonus + holyMantleBonus;
    let multiplier = currentGrid.isBrutal ? 1.5 : 1; 
    let finalTotal = Math.round(totalBase * multiplier);
    if (currentGrid.isBrutal) { if (finalTotal > 30000) finalTotal = 30000; } else { if (finalTotal > 20000) finalTotal = 20000; }
    return { base: Math.round(baseCellPoints * multiplier), win: Math.round(winBonus * multiplier), lives: Math.round(livesBonus * multiplier), cannon: Math.round(cannonBonus * multiplier), time: Math.round(timeBonus * multiplier), rarity: Math.round(rarityBonus * multiplier), combo: Math.round(comboBonus * multiplier), holyMantleBonus: Math.round(holyMantleBonus * multiplier), total: finalTotal, filledCells: filledCells };
}

function getGrade(score, isBrutal) {
    if (isBrutal) {
        if (score >= 30000) return { letter: 'P', color: '#9370DB' };
        if (score >= 27000) return { letter: 'SSS', color: '#FFD700' };
        if (score >= 24000) return { letter: 'SS', color: 'linear-gradient(135deg, #FFD700, #FF8C00)' };
        if (score >= 20000) return { letter: 'S', color: '#FFD700' };
        if (score >= 16000) return { letter: 'A', color: '#00CED1' };
        if (score >= 12000) return { letter: 'B', color: '#32CD32' };
        if (score >= 8000) return { letter: 'C', color: '#E0E0E0' };
        if (score >= 5000) return { letter: 'D', color: '#A9A9A9' };
        return { letter: 'F', color: '#808080' };
    } else {
        if (score >= 20000) return { letter: 'SS', color: 'linear-gradient(135deg, #FFD700, #FF8C00)' };
        if (score >= 18000) return { letter: 'S', color: '#FFD700' };
        if (score >= 14000) return { letter: 'A', color: '#00CED1' };
        if (score >= 10000) return { letter: 'B', color: '#32CD32' };
        if (score >= 6000) return { letter: 'C', color: '#E0E0E0' };
        if (score >= 4000) return { letter: 'D', color: '#A9A9A9' };
        return { letter: 'F', color: '#808080' };
    }
}

function formatTime(sec) { const m = Math.floor(sec / 60).toString().padStart(2, '0'); const s = (sec % 60).toString().padStart(2, '0'); return `${m}:${s}`; }

function tickTimer() {
    const now = Date.now(); if (now < thunderPauseUntil) return;
    timerSeconds += 1; currentGrid.timer = timerSeconds;
    if (currentStyle === 'Thunderbolt' || currentStyle === 'SlowBeam') {
        if (currentStyle === 'Thunderbolt' && currentGrid.comboCount > 0 && now > currentGrid.comboTimer) currentGrid.comboCount = 0;
        updateUI();
    }
    saveGrids();
}

function startTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = setInterval(tickTimer, 1000); }
function stopTimer() { clearInterval(timerInterval); timerInterval = null; }
function ensureTimerStarted() { if (!currentGrid.completed && timerSeconds === 0 && !timerInterval) startTimer(); }

function renderCalendar() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() || 7) - 1; const startDate = new Date(year, month, 1 - startDayOfWeek);
    const endDayOfWeek = (lastDay.getDay() || 7) - 1; const endDate = new Date(year, month + 1, 0 + (6 - endDayOfWeek));
    const grid = document.getElementById('calendarGrid'); grid.innerHTML = '';
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => { const h = document.createElement('div'); h.className = 'weekday-header'; h.textContent = d; grid.appendChild(h); });
    let d = new Date(startDate);
    while (d <= endDate) {
        const key = getDateKey(d); const isCurrentMonth = d.getMonth() === month;
        const day = document.createElement('div'); day.className = 'calendar-day';
        if (!isCurrentMonth) day.classList.add('other-month');
        const isToday = new Date().toDateString() === d.toDateString(); if (isToday) day.classList.add('active');
        const g = gridsData[key]; let bottomContent = '';
        if (g) {
            day.classList.add('has-grid');
            if (g.completed && !g.isLoss) day.classList.add('completed');
            bottomContent = `#${getGridNumber(key)}`; day.onclick = () => openGrid(key);
        } else {
            bottomContent = `+`; day.onclick = () => { openEditorPage(key); };
        }
        day.innerHTML = `<div class="day-top">${d.getDate()}</div><div class="day-bottom">${bottomContent}</div>`;
        grid.appendChild(day); d.setDate(d.getDate() + 1);
    }
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('currentMonth').innerHTML = `${monthNames[month]} ${year}`;
}

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    renderCalendar();
}

function getDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function saveGrids() { localStorage.setItem('bc_grids_v30', JSON.stringify(gridsData)); }
function loadGrids() { const s = localStorage.getItem('bc_grids_v30'); if (s) gridsData = JSON.parse(s); }

function getGridNumber(key) { if (key === 'endless') return 0; const keys = Object.keys(gridsData).filter(k => k !== 'endless').sort(); const idx = keys.indexOf(key); return idx !== -1 ? idx + 1 : 1; }

function navDailyGrid(dir) {
    if (currentGrid.date === 'endless') return;
    const keys = Object.keys(gridsData).filter(k => k !== 'endless').sort();
    const idx = keys.indexOf(currentGrid.date); if (idx === -1) return;
    const newIdx = idx + dir; if (newIdx >= 0 && newIdx < keys.length) openGrid(keys[newIdx]);
}

function startEndlessMode() {
    if (gridsData['endless']) delete gridsData['endless'];
    let r = [], c = []; let valid = false; let attempts = 0;
    while (!valid && attempts < 1000) {
        attempts++;
        r = [getRandomCond(), getRandomCond(), getRandomCond()]; c = [getRandomCond(), getRandomCond(), getRandomCond()];
        let all = [...r, ...c]; if (new Set(all).size < all.length) continue;
        valid = true;
        for(let i=0; i<3; i++) { for(let j=0; j<3; j++) { if (getValidUnits(r[i], c[j]).length === 0) { valid = false; break; } } if (!valid) break; }
    }
    const key = 'endless';
    gridsData[key] = { date: key, title: "Infinite Mode", conditions: { rows: r, cols: c }, cells: Array(3).fill().map(()=>Array(3).fill(null)), completed: false, timer: 0, cannon: 'Default', cannonUses: CANNONS['Default'].uses, style: 'Default', foundation: 'Default', extraRow: [false,false,false], extraCol: [false,false,false], originalConditions: { rows: [...r], cols: [...c] }, forceLegend: false, isBrutal: false, brutalConds: null, lives: 3, correctCount: 0, firstDamage: false, duplicateNextUnit: false, pinkBlink: null, yellowBlink: null, comboCount: 0, comboTimer: 0, maxCombo: 0, curseFired: false, _cachedCurseConds: null, hasLostLife: false, ironWallShieldUsed: false, holyRows: [false, false, false], holyMantles: 0, legendaryCount: 0 };
    currentGrid = gridsData[key]; currentLife = 3; timerSeconds = 0; shieldedCells = []; thunderPauseUntil = 0; pendingCannonAction = null; cellAnimations = {};
    resultsBrutal = false; resultsNoRepeats = false; resultsCurseblast = false; clearValidUnitsCache();
    loadGridUI();
}

function getRandomCond() { const pool = allConditions.filter(cond => { if (cond === "No Target Traits") return false; return true; }); return pool[Math.floor(Math.random() * pool.length)]; }

async function openGrid(keyOrDate) {
    let key = typeof keyOrDate === 'string' ? keyOrDate : getDateKey(keyOrDate);
    
    if (supabase && key !== 'endless') {
        try {
            const { data } = await supabase.from('grids').select('*').eq('date', key).eq('status', 'daily').single();
            if (data) {
                gridsData[key] = {
                    date: key, title: data.title, conditions: data.conditions, originalConditions: data.original_conditions,
                    brutalConds: data.brutal_conds, isBrutal: !!data.brutal_conds,
                    cells: Array(3).fill().map(()=>Array(3).fill(null)), completed: false, timer: 0,
                    cannon: 'Default', cannonUses: CANNONS['Default'].uses, style: 'Default', foundation: 'Default',
                    extraRow: [false,false,false], extraCol: [false,false,false], forceLegend: false, lives: 3,
                    correctCount: 0, firstDamage: false, duplicateNextUnit: false, pinkBlink: null, yellowBlink: null,
                    comboCount: 0, comboTimer: 0, maxCombo: 0, curseFired: false, _cachedCurseConds: null,
                    hasLostLife: false, ironWallShieldUsed: false, holyRows: [false, false, false], holyMantles: 0, legendaryCount: 0
                };
            }
        } catch(e) { console.log("No online grid found, falling back to local."); }
    }

    if (!gridsData[key]) {
        if (typeof keyOrDate !== 'string') openEditorPage(key);
        return;
    }
    
    currentGrid = gridsData[key];
    
    if (supabase && key !== 'endless') {
        try {
            const { data: votesData } = await supabase.from('votes').select('cell_index, unit_id').eq('grid_id', key);
            currentGrid.realVotes = Array(9).fill().map(() => ({}));
            if (votesData) {
                votesData.forEach(v => {
                    currentGrid.realVotes[v.cell_index][v.unit_id] = (currentGrid.realVotes[v.cell_index][v.unit_id] || 0) + 1;
                });
            }
        } catch(e) { currentGrid.realVotes = null; }
    }

    if (userProfile && userProfile.settings) {
        if (userProfile.settings.lockLoadout) {
            currentGrid.cannon = userProfile.settings.favCannon || 'Default';
            currentGrid.style = userProfile.settings.favStyle || 'Default';
            currentGrid.foundation = userProfile.settings.favFoundation || 'Default';
        }
        if (userProfile.settings.lockDifficulty) {
            currentGrid.isBrutal = userProfile.settings.favDifficulty || false;
            if (currentGrid.isBrutal && !currentGrid.brutalConds) {
                currentGrid.brutalConds = computeDeterministicBrutals(currentGrid);
            }
        }
    }

    if (!currentGrid.style) currentGrid.style = 'Default';
    if (!currentGrid.foundation) currentGrid.foundation = 'Default';
    if (currentGrid.correctCount === undefined) currentGrid.correctCount = 0;
    if (currentGrid.firstDamage === undefined) currentGrid.firstDamage = false;
    if (currentGrid.duplicateNextUnit === undefined) currentGrid.duplicateNextUnit = false;
    if (currentGrid.pinkBlink === undefined) currentGrid.pinkBlink = null;
    if (currentGrid.yellowBlink === undefined) currentGrid.yellowBlink = null;
    if (currentGrid.comboCount === undefined) currentGrid.comboCount = 0;
    if (currentGrid.comboTimer === undefined) currentGrid.comboTimer = 0;
    if (currentGrid.maxCombo === undefined) currentGrid.maxCombo = 0;
    if (currentGrid.lives === undefined) currentGrid.lives = 3;
    if (currentGrid.curseFired === undefined) currentGrid.curseFired = false;
    if (currentGrid._cachedCurseConds === undefined) currentGrid._cachedCurseConds = null;
    if (currentGrid.hasLostLife === undefined) currentGrid.hasLostLife = false;
    if (currentGrid.ironWallShieldUsed === undefined) currentGrid.ironWallShieldUsed = false;
    if (currentGrid.holyRows === undefined) currentGrid.holyRows = [false, false, false];
    if (currentGrid.holyMantles === undefined) currentGrid.holyMantles = 0;
    if (currentGrid.legendaryCount === undefined) currentGrid.legendaryCount = 0;

    if (currentGrid.comboTimer && Date.now() > currentGrid.comboTimer && currentGrid.comboCount > 0) currentGrid.comboCount = 0;
    
    currentLife = currentGrid.lives; if (currentLife > MAX_LIVES) currentLife = MAX_LIVES;
    if (currentLife <= 0 && !currentGrid.isLoss) {
        currentGrid.cells = Array(3).fill().map(()=>Array(3).fill(null)); currentGrid.completed = false; currentGrid.score = 0; currentGrid.timer = 0;
        currentGrid.cannon = 'Default'; currentGrid.cannonUses = CANNONS['Default'].uses; currentGrid.style = 'Default'; currentGrid.foundation = 'Default';
        currentGrid.lives = 3; currentLife = 3; currentGrid.maxCombo = 0; currentGrid.hasLostLife = false; currentGrid.ironWallShieldUsed = false;
        currentGrid.holyRows = [false, false, false]; currentGrid.holyMantles = 0; currentGrid.legendaryCount = 0;
    }
    
    timerSeconds = currentGrid.timer || 0; shieldedCells = []; thunderPauseUntil = 0; pendingCannonAction = null; cellAnimations = {};
    cellCache = {}; lastCacheState = ""; clearValidUnitsCache();
    
    if (!currentGrid.cannon) { currentGrid.cannon = 'Default'; currentGrid.cannonUses = CANNONS['Default'].uses; }
    if (!currentGrid.extraRow) currentGrid.extraRow = [false, false, false];
    if (!currentGrid.extraCol) currentGrid.extraCol = [false, false, false];
    if (currentGrid.isBrutal === undefined) currentGrid.isBrutal = false;
    if (currentGrid.forceLegend === undefined) currentGrid.forceLegend = false;
    
    if (!currentGrid.originalConditions) {
        currentGrid.originalConditions = { rows: currentGrid.conditions.rows.map(r => r.split(' AND ')[0].split(' + ')[0]), cols: currentGrid.conditions.cols.map(c => c.split(' AND ')[0].split(' + ')[0]) };
    }
    if (currentGrid.isBrutal && !currentGrid.brutalConds) materializeBrutalConds();
    
    resultsBrutal = currentGrid.isBrutal; resultsNoRepeats = false; resultsCurseblast = false;
    
    let allFilled = true;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!currentGrid.cells[i][j]) allFilled = false;
    if (currentGrid.completed && !allFilled && !currentGrid.isLoss) currentGrid.completed = false;
    if (allFilled && !currentGrid.completed) currentGrid.completed = true;
    saveGrids();
    
    loadGridUI();
}

function loadGridUI() {
    currentCannon = currentGrid.cannon; cannonUsesLeft = currentGrid.cannonUses; currentStyle = currentGrid.style; currentFoundation = currentGrid.foundation;
    document.getElementById('calendarPage').style.display = 'none'; document.getElementById('editorPage').classList.remove('active'); document.getElementById('gridPage').classList.add('active');
    
    if (currentGrid.date === 'endless') {
        document.getElementById('nextEndlessBtn').style.display = 'block'; document.getElementById('prevGridBtn').style.display = 'none'; document.getElementById('nextGridBtn').style.display = 'none';
        document.getElementById('modeTitle').textContent = 'Infinite Mode'; document.getElementById('gridTitleDisplay').textContent = '';
    } else {
        document.getElementById('nextEndlessBtn').style.display = 'none'; document.getElementById('prevGridBtn').style.display = 'block'; document.getElementById('nextGridBtn').style.display = 'block';
        document.getElementById('modeTitle').textContent = `Archive: ${currentGrid.date}`; document.getElementById('gridTitleDisplay').textContent = currentGrid.title || 'Unnamed Grid';
    }
    
    document.getElementById('imgFoundation').src = getEquipImage('foundation', currentFoundation); document.getElementById('imgStyle').src = getEquipImage('style', currentStyle); document.getElementById('imgCannon').src = getEquipImage('cannon', currentCannon);
    document.getElementById('imgFoundation').style.display = 'block'; document.getElementById('imgStyle').style.display = 'block'; document.getElementById('imgCannon').style.display = 'block'; document.getElementById('cannonFallback').style.display = 'none';
    
    document.getElementById('cannonNameText').textContent = CANNONS[currentCannon].name; document.getElementById('styleNameText').textContent = STYLES[currentStyle].name; document.getElementById('foundNameText').textContent = FOUNDATIONS[currentFoundation].name;
    document.getElementById('setBonusText').style.display = (currentCannon === currentStyle && currentStyle === currentFoundation) ? 'block' : 'none';
    
    document.getElementById('resultsBrutalToggle').checked = resultsBrutal; document.getElementById('resultsNoRepeatsToggle').checked = resultsNoRepeats;
    const curseToggleCont = document.getElementById('curseblastToggleContainer');
    if (curseToggleCont) {
        curseToggleCont.style.display = currentGrid.curseFired ? 'flex' : 'none';
        if (currentGrid.curseFired) document.getElementById('resultsCurseblastToggle').checked = resultsCurseblast;
    }
    
    cellCache = {}; lastCacheState = ""; clearValidUnitsCache(); renderGrid(); updateUI();
    
    if (currentGrid.completed || currentGrid.isLoss) {
        showFinalScore(currentGrid.isLoss);
    } else {
        document.getElementById('livesPanel').style.display = 'flex'; document.getElementById('cannonPanel').style.display = 'flex'; document.getElementById('difficultyPanel').style.display = 'flex';
        document.getElementById('finalScorePanel').style.display = 'none'; document.getElementById('inlineResults').style.display = 'none';
        document.getElementById('brutalToggle').checked = currentGrid.isBrutal;
    }
    
    if (!currentGrid.completed && !currentGrid.isLoss && timerSeconds > 0) startTimer();
}

function closeGridPage() { stopTimer(); document.getElementById('gridPage').classList.remove('active'); document.getElementById('calendarPage').style.display = 'block'; renderCalendar(); }

function toggleBrutalMode() {
    if (currentGrid.completed || currentGrid.isLoss) return;
    if (Object.values(currentGrid.cells).some(row => row.some(c => c)) || currentGrid.hasLostLife) { document.getElementById('brutalToggle').checked = currentGrid.isBrutal; showToast("Cannot change difficulty during game!", "error"); return; }
    currentGrid.isBrutal = document.getElementById('brutalToggle').checked;
    if (currentGrid.isBrutal) { clearValidUnitsCache(); materializeBrutalConds(); } else { currentGrid.brutalConds = null; clearValidUnitsCache(); saveGrids(); renderGrid(); }
}

function checkDeadEnd() {
    let deadEnd = false;
    for (let i=0; i<3; i++) for (let j=0; j<3; j++) {
        if (!currentGrid.cells[i][j]) { const conds = getEffectiveConditions(i, j); const valid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName)); if (valid.length === 0) deadEnd = true; }
    }
    return deadEnd;
}

function willMoveCauseDeadEnd(r, c, fullName) {
    const originalCell = currentGrid.cells[r][c]; currentGrid.cells[r][c] = { unitFullName: fullName };
    let deadEnd = false;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (!currentGrid.cells[i][j]) { const conds = getEffectiveConditions(i, j); const valid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName)); if (valid.length === 0) { deadEnd = true; break; } }
        }
        if (deadEnd) break;
    }
    currentGrid.cells[r][c] = originalCell; return deadEnd;
}

function cancelCannon() { if (pendingCannonAction) { pendingCannonAction = null; renderGrid(); updateUI(); showToast("Cannon action cancelled.", "success"); } }

function renderGrid() {
    const table = document.getElementById('gridTable');
    let html = '<thead><tr>';
    if (currentGrid.date !== 'endless') { const gridNum = getGridNumber(currentGrid.date); html += `<th class="grid-index"><div class="grid-number-text">#${gridNum}</div></th>`; } else html += `<th class="grid-index" style="background:transparent; border:none;"></th>`;
    const isHeaderTarget = pendingCannonAction === 'Curseblast'; const isAllCellsTarget = pendingCannonAction === 'Default' || pendingCannonAction === 'HolyBlast';
    for (let j = 0; j < 3; j++) { let thClass = isHeaderTarget ? 'cannon-valid-target' : ''; html += `<th class="${thClass}" onclick="headerClick(false, ${j})">` + bcCondText(currentGrid.conditions.cols[j], 15) + `</th>`; }
    html += '</tr></thead><tbody>';
    for (let i = 0; i < 3; i++) {
        html += `<tr>`;
        let tdRowClass = isHeaderTarget ? 'cannon-valid-target' : '';
        html += `<td class="${tdRowClass}" onclick="headerClick(true, ${i})" style="background:#2c2e36;font-weight:bold;cursor:pointer;">` + bcCondText(currentGrid.conditions.rows[i], 15) + `</td>`;
        for (let j = 0; j < 3; j++) {
            const cell = currentGrid.cells[i][j]; const isShielded = shieldedCells.includes(`${i}-${j}`);
            const conds = getEffectiveConditions(i, j); const brutalC = conds.brutal;
            let blinkClass = ''; if (!cell) { if (currentGrid.pinkBlink === `${i}-${j}`) blinkClass = 'blink-pink'; if (currentGrid.yellowBlink === `${i}-${j}`) blinkClass = 'blink-yellow'; }
            let cursedClass = ''; if (currentGrid.extraRow && currentGrid.extraRow[i]) cursedClass = 'cursed-cell'; if (currentGrid.extraCol && currentGrid.extraCol[j]) cursedClass = 'cursed-cell';
            let trailClass = ''; if (!cell && currentGrid.holyRows && currentGrid.holyRows[i]) trailClass = 'holy-trail';
            let tdClass = ''; if (isAllCellsTarget) tdClass = 'cannon-valid-target'; else if (pendingCannonAction === 'Waterblast' && !cell) tdClass = 'cannon-valid-target'; else if (pendingCannonAction === 'Breakerblast' && cell) tdClass = 'cannon-valid-target'; else if (pendingCannonAction === 'IronWall' || pendingCannonAction === 'SlowBeam') tdClass = 'cannon-valid-target';
            
            if (cell) {
                const rarityClass = `rarity-${cell.rarity}`; const displayRar = getDisplayRarity(cell.rarity); const pctText = cell.percentage ? ` ${cell.percentage}%` : '';
                const bgColor = getRarityColor(cell.rarity); const txtColor = (cell.rarity === 'Legend' || cell.rarity === 'Best' || cell.rarity === 'Special') ? '#333' : '#fff';
                const animKey = `${i}-${j}`; let animClass = ''; if (cellAnimations[animKey]) animClass = `anim-${cell.rarity}`;
                html += `<td class="filled ${rarityClass} ${animClass} ${cursedClass} ${tdClass} ${trailClass}" onclick="cellClick(${i},${j})" id="cell-${i}-${j}">
                    <div class="cell-content"><img class="cell-image" src="${cell.image}" onerror="this.style.display='none'"><div class="cell-name">${bcText(cell.unitName, { size:14 })}</div></div>
                    <div class="cell-rarity" style="background:${bgColor}; color:${txtColor};">${displayRar}${pctText}</div>
                    ${brutalC ? `<div class="brutal-cond">${formatConditionName(brutalC)}</div>` : ''}${isShielded ? '<div class="shield-icon">🛡️</div>' : ''}
                </td>`;
            } else {
                let optCount = ''; const valid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName)); const uniqueValid = [...new Set(valid.map(u => u.id))].length;
                const showOpt = (currentGrid.correctCount > 0 && (uniqueValid <= 3 || currentStyle === 'Waterblast') && !currentGrid.completed && !currentGrid.isLoss);
                if (showOpt) optCount = uniqueValid;
                html += `<td onclick="cellClick(${i},${j})" id="cell-${i}-${j}" class="${blinkClass} ${cursedClass} ${tdClass} ${trailClass}">
                    <div class="cell-content"></div><div class="cell-options" style="display:${showOpt ? 'block' : 'none'};">${optCount}</div>
                    ${brutalC ? `<div class="brutal-cond">${formatConditionName(brutalC)}</div>` : ''}${isShielded ? '<div class="shield-icon">🛡️</div>' : ''}
                </td>`;
            }
        }
        html += '</tr>';
    }
    html += '</tbody>'; table.innerHTML = html;
    
    document.getElementById('cancelCannonBtn').style.display = pendingCannonAction ? 'block' : 'none';
    document.getElementById('gridWrapper').classList.toggle('cannon-active', !!pendingCannonAction);
    cellAnimations = {};
}

function updateUI() {
    const d = document.getElementById('livesDisplay');
    let html = '';
    for (let i = 0; i < currentLife; i++) html += `<div class="life-icon life-full"></div>`;
    for (let i = currentLife; i < MAX_LIVES; i++) html += `<div class="life-icon life-lost"></div>`;
    d.innerHTML = html;
    
    const livesTitle = document.querySelector('#livesPanel .panel-title');
    if (livesTitle && currentGrid) {
        if (isHolySetActive()) {
            const progress = (currentGrid.legendaryCount || 0) % 3;
            livesTitle.innerHTML = `<span class="bc-text" style="font-size:16px;">LIVES</span> <span style="color:#87CEFA; font-size:12px; font-family:'Segoe UI'; font-weight:bold; letter-spacing: 0;">(Holy Mantle: ${currentGrid.holyMantles || 0} - ${progress}/3)</span>`;
        } else livesTitle.innerHTML = `<span class="bc-text" style="font-size:16px;">LIVES</span>`;
    }

    document.getElementById('cannonCharges').textContent = isCurseSetActive() ? '∞' : cannonUsesLeft;
    const comboDisp = document.getElementById('comboDisplay');
    
    if (currentGrid && currentStyle === 'Thunderbolt') {
        comboDisp.style.position = 'absolute'; comboDisp.style.top = '0px'; comboDisp.style.right = '0px'; comboDisp.style.bottom = 'auto'; comboDisp.style.background = '#ff4757';
        if (currentGrid.comboCount > 0 || (currentGrid.maxCombo && currentGrid.maxCombo > 0)) {
            comboDisp.style.display = 'flex'; comboDisp.style.flexDirection = 'column'; comboDisp.style.alignItems = 'center'; comboDisp.style.justifyContent = 'center';
            comboDisp.style.padding = '4px 8px'; comboDisp.style.borderRadius = '8px'; comboDisp.style.minWidth = '55px';
            let timeLeft = 0; if (currentGrid.comboCount > 0) timeLeft = Math.max(0, Math.ceil((currentGrid.comboTimer - Date.now()) / 1000));
            comboDisp.innerHTML = `<div style="font-size:16px; line-height:1; color:white;">x${currentGrid.comboCount}</div><div style="font-size:10px; opacity:0.8; line-height:1.1; color:#ffb3c6;">Max: x${currentGrid.maxCombo || 0}</div>${currentGrid.comboCount > 0 ? `<div style="font-size:11px; font-weight:bold; line-height:1; color:white; margin-top:2px;">${timeLeft}s</div>` : ''}`;
        } else comboDisp.style.display = 'none';
    } else if (currentGrid && currentStyle === 'SlowBeam') {
        comboDisp.style.display = 'flex'; comboDisp.style.flexDirection = 'column'; comboDisp.style.alignItems = 'center'; comboDisp.style.justifyContent = 'center';
        comboDisp.style.padding = '4px 8px'; comboDisp.style.borderRadius = '8px'; comboDisp.style.minWidth = '65px';
        comboDisp.style.position = 'absolute'; comboDisp.style.top = '20px'; comboDisp.style.right = '-50px'; comboDisp.style.bottom = 'auto'; comboDisp.style.background = '#4caf50';
        let tb = Math.max(0, Math.round(1000 - Math.max(0, timerSeconds - 600) * (1000 / 600)));
        comboDisp.innerHTML = `<div style="font-size:14px; font-weight:bold; color:white; line-height:1.1;">${formatTime(timerSeconds)}</div><div style="font-size:11px; color:#fff; font-weight:bold;">+${tb} pts</div>`;
    } else if (comboDisp) comboDisp.style.display = 'none';

    if (currentGrid) { currentGrid.lives = currentLife; saveGrids(); }
}

async function showFinalScore(isLoss = false) {
    try {
        document.getElementById('finalScorePanel').style.display = 'flex'; document.getElementById('inlineResults').style.display = 'block';
        const scoreObj = calculateFinalScore(isLoss); const grade = isLoss ? { letter: 'F', color: '#ff4757' } : getGrade(scoreObj.total, currentGrid.isBrutal);
        const gradeEl = document.getElementById('finalGrade'); gradeEl.textContent = grade.letter;
        
        if (grade.color.includes('gradient')) { gradeEl.style.background = grade.color; gradeEl.style.webkitBackgroundClip = 'text'; gradeEl.style.webkitTextFillColor = 'transparent'; gradeEl.style.color = 'transparent'; } 
        else { gradeEl.style.background = 'none'; gradeEl.style.webkitBackgroundClip = 'border-box'; gradeEl.style.webkitTextFillColor = grade.color; gradeEl.style.color = grade.color; }
        
        document.getElementById('finalScoreValue').textContent = scoreObj.total.toLocaleString();
        document.querySelector('#bd-cells').previousElementSibling.textContent = `Filled cells (${scoreObj.filledCells} x 500)`; document.getElementById('bd-cells').textContent = '+' + scoreObj.base.toLocaleString();
        document.querySelector('#bd-win').previousElementSibling.textContent = `Win bonus`; document.getElementById('bd-win').textContent = '+' + scoreObj.win.toLocaleString();
        document.querySelector('#bd-lives').previousElementSibling.textContent = `Lives remaining`; document.getElementById('bd-lives').textContent = '+' + scoreObj.lives.toLocaleString();
        document.querySelector('#bd-cannon').previousElementSibling.textContent = `Cannon charges`; document.getElementById('bd-cannon').textContent = '+' + scoreObj.cannon.toLocaleString();
        document.querySelector('#bd-time').previousElementSibling.textContent = `Time bonus`; document.getElementById('bd-time').textContent = '+' + scoreObj.time.toLocaleString();
        document.querySelector('#bd-rarity').previousElementSibling.textContent = `Rarity bonus`; document.getElementById('bd-rarity').textContent = '+' + scoreObj.rarity.toLocaleString();
        
        let holyMantleRow = document.getElementById('bd-holymantle-row');
        if (!holyMantleRow) { holyMantleRow = document.createElement('div'); holyMantleRow.id = 'bd-holymantle-row'; holyMantleRow.className = 'bd-row'; document.getElementById('scoreBreakdown').appendChild(holyMantleRow); }
        if (scoreObj.holyMantleBonus > 0) { holyMantleRow.style.display = 'flex'; holyMantleRow.innerHTML = `<span>Holy Mantle Bonus</span><span id="bd-holymantle">+${scoreObj.holyMantleBonus}</span>`; } 
        else holyMantleRow.style.display = 'none';
        
        if (currentStyle === 'Thunderbolt' || (currentCannon === 'Breakerblast' && currentStyle === 'Breakerblast' && currentFoundation === 'Breakerblast')) {
            document.getElementById('bd-combo').parentElement.style.display = 'flex'; document.querySelector('#bd-combo').previousElementSibling.textContent = `Combo bonus`; document.getElementById('bd-combo').textContent = '+' + scoreObj.combo.toLocaleString();
        } else document.getElementById('bd-combo').parentElement.style.display = 'none';
        
        document.getElementById('bd-brutal-row').style.display = currentGrid.isBrutal ? 'flex' : 'none';
        
        resultsBrutal = currentGrid.isBrutal; document.getElementById('resultsBrutalToggle').checked = resultsBrutal;
        const curseToggleCont = document.getElementById('curseblastToggleContainer');
        if (curseToggleCont) {
            curseToggleCont.style.display = currentGrid.curseFired ? 'flex' : 'none';
            if (currentGrid.curseFired) document.getElementById('resultsCurseblastToggle').checked = resultsCurseblast;
        }
        
        renderResults();

        if (currentUser && !currentGrid.isLoss && currentGrid.date !== 'endless') {
            const { data: existing } = await supabase.from('user_grids').select('id').eq('user_id', currentUser.id).eq('grid_date', currentGrid.date);
            if (!existing || existing.length === 0) {
                await supabase.from('user_grids').insert([{
                    user_id: currentUser.id, grid_date: currentGrid.date, score: scoreObj.total,
                    completed: currentGrid.completed, is_loss: currentGrid.isLoss,
                    cannon: currentGrid.cannon, style: currentGrid.style, foundation: currentGrid.foundation,
                    cells: currentGrid.cells
                }]);
            }
        }

    } catch (e) { console.error("Error showing final score:", e); }
}

function toggleBreakdown() { const bd = document.getElementById('scoreBreakdown'); bd.style.display = bd.style.display === 'none' || bd.style.display === '' ? 'block' : 'none'; }

function gameOver() {
    currentGrid.isLoss = true; currentGrid.completed = true; stopTimer(); saveGrids(); renderGrid(); updateUI(); showFinalScore(true); showToast("GAME OVER!", "error");
}

function headerClick(isRow, index) {
    if (currentGrid.completed || currentGrid.isLoss) return;
    
    if (pendingCannonAction === 'Curseblast') {
        pendingCannonAction = null;
        if (isRow && currentGrid.extraRow[index]) { showToast("Cannot use Curseblast on this row again!", "error"); renderGrid(); return; }
        if (!isRow && currentGrid.extraCol[index]) { showToast("Cannot use Curseblast on this column again!", "error"); renderGrid(); return; }
        if (isRow) { if (currentGrid.cells[index].some(c => c)) { showToast("Cannot use Curseblast on a row with units!", "error"); renderGrid(); return; } } 
        else { if ([0,1,2].some(r => currentGrid.cells[r][index])) { showToast("Cannot use Curseblast on a column with units!", "error"); renderGrid(); return; } }
        
        if (currentGrid.isBrutal && !currentGrid.brutalConds) materializeBrutalConds();
        const allCurseConds = getDeterministicCurseConditions(currentGrid); const cond = isRow ? allCurseConds.rows[index] : allCurseConds.cols[index];
        
        if (cond) {
            if (isRow) currentGrid.conditions.rows[index] = currentGrid.originalConditions.rows[index] + " AND " + cond;
            else currentGrid.conditions.cols[index] = currentGrid.originalConditions.cols[index] + " AND " + cond;
            cellCache = {}; lastCacheState = ""; clearValidUnitsCache(); showToast("Constraint added! All new units will be Legend.", "success");
        } else showToast("Max difficulty reached! No extra condition added.", "error");
        
        if (isRow) currentGrid.extraRow[index] = true; else currentGrid.extraCol[index] = true;
        ensureTimerStarted(); currentGrid.forceLegend = true; currentGrid.curseFired = true;
        if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); }
        for (let k = 0; k < 3; k++) { const cellId = isRow ? `cell-${index}-${k}` : `cell-${k}-${index}`; triggerEffect(cellId, 'fx-curse'); }
        renderGrid(); updateUI(); return;
    }
}

function triggerRowEffect(r, className) {
    const gridWrapper = document.getElementById('gridWrapper'); const row = document.querySelector(`#gridTable tbody tr:nth-child(${r + 1})`);
    if (!row || !gridWrapper) return;
    const overlay = document.createElement('div'); overlay.className = `effect-overlay ${className}`;
    const rowRect = row.getBoundingClientRect(); const wrapperRect = gridWrapper.getBoundingClientRect();
    overlay.style.position = 'absolute'; overlay.style.top = (rowRect.top - wrapperRect.top) + 'px'; overlay.style.left = (rowRect.left - wrapperRect.left) + 'px';
    overlay.style.width = rowRect.width + 'px'; overlay.style.height = rowRect.height + 'px'; overlay.style.zIndex = '10'; overlay.style.pointerEvents = 'none';
    gridWrapper.appendChild(overlay); setTimeout(() => overlay.remove(), 1000);
}

function cellClick(r, c) {
    if (currentGrid.completed || currentGrid.isLoss) return;
    if (pendingCannonAction === 'Curseblast') return;
    
    if (pendingCannonAction === 'IronWall') {
        ensureTimerStarted(); shieldedCells.push(`${r}-${c}`); pendingCannonAction = null;
        if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); }
        triggerEffect(`cell-${r}-${c}`, 'fx-iron'); renderGrid(); updateUI(); showToast("Shield placed!", "success"); return;
    }
    if (pendingCannonAction === 'Breakerblast') {
        if (!currentGrid.cells[r][c]) { showToast("Cell is empty!", "error"); return; }
        currentGrid.cells[r][c] = null; pendingCannonAction = null;
        if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); }
        triggerEffect(`cell-${r}-${c}`, 'fx-breaker'); setTimeout(() => { renderGrid(); updateUI(); }, 500); showToast("Answer removed!", "success"); return;
    }
    if (pendingCannonAction === 'Waterblast') {
        if (currentGrid.cells[r][c]) { showToast("Cell is full!", "error"); return; }
        triggerWaterblastOptions(r, c); return;
    }

    if (pendingCannonAction === 'Default') {
        pendingCannonAction = null; ensureTimerStarted();
        let hasEmpty = false; for(let k=0; k<3; k++) { if(!currentGrid.cells[r][k]) hasEmpty = true; }
        if (!hasEmpty) {
            showToast("Row is already full!", "error"); triggerRowEffect(r, 'fx-default');
            if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); }
            renderGrid(); updateUI(); return;
        }
        let j = 2;
        const interval = setInterval(() => {
            if (j < 0) {
                clearInterval(interval);
                if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); }
                updateUI(); if (checkDeadEnd()) gameOver(); else checkComplete(); return;
            }
            if (!currentGrid.cells[r][j] && !currentGrid.completed) {
                const conds = getEffectiveConditions(r, j); let valid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName));
                if (valid.length > 0) { let safeValid = valid.filter(u => !willMoveCauseDeadEnd(r, j, u.fullName)); if (safeValid.length > 0) valid = safeValid; else valid = []; }
                if (valid.length > 0) {
                    let chosenUnit = valid[0];
                    if (currentCannon === 'Default' && currentStyle === 'Default' && currentFoundation === 'Default') chosenUnit = valid[Math.floor(Math.random() * valid.length)];
                    else { let maxPct = -1; for (const u of valid) { const calc = calculatePercentage(r, j, u.fullName); if (calc.pct > maxPct) { maxPct = calc.pct; chosenUnit = u; } } }
                    if (placeUnit(r, j, chosenUnit.fullName, chosenUnit.name, true)) setTimeout(() => triggerEffect(`cell-${r}-${j}`, 'fx-default'), 10);
                }
            }
            j--;
        }, 150); return;
    }

    if (pendingCannonAction === 'SlowBeam') {
        pendingCannonAction = null; ensureTimerStarted(); currentGrid.duplicateNextUnit = true; showToast("Next unit placed will be duplicated!", "success");
        if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); }
        triggerEffect(`cell-${r}-${c}`, 'fx-slow'); renderGrid(); updateUI(); return;
    }

    if (pendingCannonAction === 'HolyBlast') {
        pendingCannonAction = null; ensureTimerStarted();
        if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); }
        updateUI(); if (!currentGrid.holyRows) currentGrid.holyRows = [false, false, false]; currentGrid.holyRows[r] = true;
        renderGrid(); updateUI(); triggerRowEffect(r, 'fx-holy'); showToast("Golden trail left!", "success");
        if (checkDeadEnd()) gameOver(); else checkComplete(); return;
    }

    if (currentGrid.cells[r][c]) { showToast("Cell already filled!", "error"); return; }
    currentRow = r; currentCol = c; document.getElementById('unitSearch').value = ''; document.getElementById('suggestions').innerHTML = '';
    document.getElementById('unitModal').classList.add('active'); document.getElementById('unitSearch').focus();
}

function closeUnitModal() { document.getElementById('unitModal').classList.remove('active'); }
function closeWaterblastModal() { document.getElementById('waterblastModal').classList.remove('active'); renderGrid(); updateUI(); }

document.getElementById('unitSearch').addEventListener('input', function(e) {
    const q = e.target.value.toLowerCase(); const div = document.getElementById('suggestions');
    if (q.length < 3) { div.innerHTML = ''; return; }
    const results = PROCESSED_UNITS.filter(u => { if (isUnitUsed(u.fullName)) return false; if (u.name.toLowerCase().includes(q)) return true; return u.allNames.some(n => n.toLowerCase().includes(q)); }).slice(0, 15);
    if (!results.length) { div.innerHTML = '<div style="padding:15px;color:#999;font-size:16px;">Nothing found</div>'; return; }
    div.innerHTML = ''; results.forEach(u => { const item = document.createElement('div'); item.className = 'suggestion-item'; item.textContent = u.name; item.onclick = () => selectUnit(u.fullName, u.name); div.appendChild(item); });
});

function placeUnit(r, c, fullName, unitName, isCannon = false) {
    if (currentGrid.cells[r][c]) return false;
    if (!isCannon && willMoveCauseDeadEnd(r, c, fullName)) { if (!confirm("WARNING: Placing this unit here will leave another empty cell with NO valid unused units!\n\nThis will result in an instant Game Over.\n\nAre you sure you want to proceed?")) return false; }
    
    ensureTimerStarted();
    let calc = calculatePercentage(r, c, fullName); let rarity = calc.rarity;
    if (currentGrid.forceLegend && rarity !== 'Best' && rarity !== 'Special') rarity = 'Legend';
    if (calc.isBest) rarity = 'Best';
    else if (currentStyle === 'HolyBlast' && calc.isWorst && !isCannon) { rarity = upgradeRarity(rarity); showToast("Holy Blast Style: Worst variant upgraded!", "success"); }
    if (currentGrid.holyRows && currentGrid.holyRows[r] && rarity !== 'Best' && rarity !== 'Special') rarity = upgradeRarity(rarity);
    
    if (currentGrid.pinkBlink === `${r}-${c}`) { currentGrid.pinkBlink = null; if (currentLife < MAX_LIVES) { currentLife++; if (!isCannon) showToast("Healed 1 life!", "success"); } else { if (!isCannon) showToast("Already at max lives!", "error"); } updateUI(); }
    if (currentGrid.yellowBlink === `${r}-${c}`) { currentGrid.yellowBlink = null; cannonUsesLeft++; if (!isCannon) showToast("+1 Cannon use!", "success"); updateUI(); }

    currentGrid.cells[r][c] = { unitFullName: fullName, unitName: unitName, image: `${IMG_UNITS}${fullName.split(' ')[0]}.png`, rarity: rarity, percentage: calc.pct };
    cellAnimations[`${r}-${c}`] = true;
    if (currentGrid.duplicateNextUnit) currentGrid.duplicateNextUnit = false;
    currentGrid.correctCount++;

    if (isHolySetActive() && (rarity === 'Legend' || rarity === 'Best' || rarity === 'Special')) {
        currentGrid.legendaryCount = (currentGrid.legendaryCount || 0) + 1;
        if (currentGrid.legendaryCount % 3 === 0) { currentGrid.holyMantles = (currentGrid.holyMantles || 0) + 1; showToast("Holy Mantle gained!", "success"); }
    }
    
    if (currentFoundation === 'Default' && currentGrid.correctCount % 3 === 0) { const empty = []; for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(!currentGrid.cells[i][j]) empty.push(`${i}-${j}`); if (empty.length > 0) currentGrid.pinkBlink = empty[Math.floor(Math.random()*empty.length)]; }
    if (currentFoundation === 'Thunderbolt') { let threshold = 8 - CANNONS[currentCannon].uses; if (currentGrid.correctCount % threshold === 0) { const empty = []; for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(!currentGrid.cells[i][j]) empty.push(`${i}-${j}`); if (empty.length > 0) currentGrid.yellowBlink = empty[Math.floor(Math.random()*empty.length)]; } }
    if (currentStyle === 'Breakerblast' && (calc.isBest || calc.rarity === 'Special')) { cannonUsesLeft++; if (!isCannon) showToast("+1 Cannon use (Style)!", "success"); }
    
    if (currentStyle === 'Thunderbolt') {
        if (Date.now() < currentGrid.comboTimer) currentGrid.comboCount++; else currentGrid.comboCount = 1;
        let duration = (currentCannon === 'Thunderbolt' && currentFoundation === 'Thunderbolt') ? 10000 : 5000;
        currentGrid.comboTimer = Date.now() + duration;
        if (!currentGrid.maxCombo || currentGrid.comboCount > currentGrid.maxCombo) currentGrid.maxCombo = currentGrid.comboCount;
        if (!isCannon) showToast(`Combo x${currentGrid.comboCount}!`, "success");
    }
    
    if (currentUser && !isCannon && currentGrid.date !== 'endless' && supabase) {
        const cellIdx = r * 3 + c;
        supabase.from('votes').upsert({ grid_id: currentGrid.date, cell_index: cellIdx, unit_id: fullName.split(' ')[0].split('-')[0], user_id: currentUser.id })
        .then(({error}) => { if(error) console.log("Vote error:", error); });
    }

    saveGrids(); renderGrid(); updateUI();
    if (checkDeadEnd()) gameOver(); else checkComplete();
    return true;
}

function selectUnit(fullName, unitName) {
    const conds = getEffectiveConditions(currentRow, currentCol);
    if (!checkCondition(fullName, conds.row) || !checkCondition(fullName, conds.col)) { handleDamage(); closeUnitModal(); renderGrid(); return; }
    if (isUnitUsed(fullName)) { showToast("This unit is already used!", "error"); closeUnitModal(); return; }
    if (placeUnit(currentRow, currentCol, fullName, unitName, false)) closeUnitModal();
}

function handleDamage() {
    if (currentFoundation === 'IronWall' && !currentGrid.firstDamage) { currentGrid.firstDamage = true; showToast("First damage ignored!", "success"); saveGrids(); return; }
    if (shieldedCells.includes(`${currentRow}-${currentCol}`)) { shieldedCells = shieldedCells.filter(x => x !== `${currentRow}-${currentCol}`); showToast("Wrong! Shield consumed.", "error"); updateUI(); renderGrid(); return; }
    if (currentFoundation === 'IronWall' && !currentGrid.ironWallShieldUsed) { currentGrid.ironWallShieldUsed = true; if (currentRow !== null && currentCol !== null) { shieldedCells.push(`${currentRow}-${currentCol}`); showToast("Iron Wall Foundation: Shield placed on error!", "success"); } }
    
    if (isHolySetActive() && currentGrid.holyMantles > 0) { currentGrid.holyMantles--; showToast("Holy Mantle consumed! Life saved.", "success"); updateUI(); renderGrid(); return; }
    
    currentLife--; currentGrid.lives = currentLife; currentGrid.hasLostLife = true; saveGrids(); showToast(`Wrong! Lives left: ${currentLife}`, "error"); updateUI();
    if (currentLife <= 0) { setTimeout(() => gameOver(), 500); return; }
    
    if (currentFoundation === 'Breakerblast') {
        const isBreakerSet = (currentGrid.cannon === 'Breakerblast' && currentGrid.style === 'Breakerblast' && currentGrid.foundation === 'Breakerblast');
        if (isBreakerSet) {
            let worstCell = null; let worstScore = 9999;
            for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { const cell = currentGrid.cells[i][j]; if (cell) { const score = getRarityPoints(cell.rarity); if (score < worstScore) { worstScore = score; worstCell = {i, j}; } } } }
            if (worstCell) { currentGrid.cells[worstCell.i][worstCell.j] = null; showToast("Set Bonus: Worst answer removed!", "success"); renderGrid(); checkComplete(); }
        } else if (currentLife === 1) freeCannonShot();
    }
}

function freeCannonShot() {
    if (currentGrid.completed || currentGrid.isLoss) return;
    if (currentCannon === 'Default') {
        const r = Math.floor(Math.random() * 3); let fired = false; let j = 2;
        const interval = setInterval(() => {
            if (j < 0) { clearInterval(interval); if (!fired) triggerRowEffect(r, 'fx-default'); if (checkDeadEnd()) gameOver(); else checkComplete(); return; }
            if (!currentGrid.cells[r][j] && !currentGrid.completed) {
                const conds = getEffectiveConditions(r, j); let valid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName));
                if (valid.length > 0) { let safeValid = valid.filter(u => !willMoveCauseDeadEnd(r, j, u.fullName)); if (safeValid.length > 0) valid = safeValid; }
                if (valid.length > 0) {
                    let chosenUnit = valid[0];
                    if (currentCannon === 'Default' && currentStyle === 'Default' && currentFoundation === 'Default') chosenUnit = valid[Math.floor(Math.random() * valid.length)];
                    else { let maxPct = -1; for (const u of valid) { const calc = calculatePercentage(r, j, u.fullName); if (calc.pct > maxPct) { maxPct = calc.pct; chosenUnit = u; } } }
                    if (placeUnit(r, j, chosenUnit.fullName, chosenUnit.name, true)) { fired = true; setTimeout(() => triggerEffect(`cell-${r}-${j}`, 'fx-default'), 10); }
                }
            }
            j--;
        }, 150); showToast("Foundation: Default Cannon fired!", "success");
    } else if (currentCannon === 'HolyBlast') {
        const r = Math.floor(Math.random() * 3); if (!currentGrid.holyRows) currentGrid.holyRows = [false, false, false]; currentGrid.holyRows[r] = true;
        renderGrid(); triggerRowEffect(r, 'fx-holy'); saveGrids(); updateUI(); showToast("Foundation: Holy Blast fired! Golden trail left.", "success"); if (checkDeadEnd()) gameOver(); else checkComplete();
    } else if (currentCannon === 'Thunderbolt') {
        let allCells = []; for (let i=0; i<3; i++) for (let j=0; j<3; j++) allCells.push({i, j});
        const pick = allCells[Math.floor(Math.random() * allCells.length)]; const cell = currentGrid.cells[pick.i][pick.j];
        if (cell) { thunderPauseUntil = Date.now() + 5000; triggerEffect(`cell-${pick.i}-${pick.j}`, 'fx-thunder'); saveGrids(); updateUI(); showToast("Foundation: Thunderbolt fired (Paused timer)!", "success"); if (checkDeadEnd()) gameOver(); else checkComplete(); } 
        else {
            const conds = getEffectiveConditions(pick.i, pick.j); let valid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName));
            if (valid.length > 0) { let safeValid = valid.filter(u => !willMoveCauseDeadEnd(pick.i, pick.j, u.fullName)); if (safeValid.length > 0) valid = safeValid; }
            if (valid.length > 0) { const u = valid[Math.floor(Math.random() * valid.length)]; placeUnit(pick.i, pick.j, u.fullName, u.name, true); }
            triggerEffect(`cell-${pick.i}-${pick.j}`, 'fx-thunder'); saveGrids(); updateUI(); showToast("Foundation: Thunderbolt fired!", "success"); if (checkDeadEnd()) gameOver(); else checkComplete();
        }
    } else if (currentCannon === 'SlowBeam') {
        currentGrid.duplicateNextUnit = true; triggerEffect(`cell-1-1`, 'fx-slow'); saveGrids(); renderGrid(); updateUI(); showToast("Foundation: Slow Beam fired!", "success"); if (checkDeadEnd()) gameOver(); else checkComplete();
    } else if (currentCannon === 'IronWall') {
        let allCells = []; for (let i=0; i<3; i++) for (let j=0; j<3; j++) allCells.push({i, j});
        const pick = allCells[Math.floor(Math.random() * allCells.length)]; shieldedCells.push(`${pick.i}-${pick.j}`);
        triggerEffect(`cell-${pick.i}-${pick.j}`, 'fx-iron'); saveGrids(); renderGrid(); updateUI(); showToast("Foundation: Iron Wall fired!", "success"); if (checkDeadEnd()) gameOver(); else checkComplete();
    } else if (currentCannon === 'Waterblast') {
        const emptyCells = []; for (let i=0; i<3; i++) for (let j=0; j<3; j++) if (!currentGrid.cells[i][j]) emptyCells.push({r:i, c:j});
        if (emptyCells.length > 0) { const pick = emptyCells[Math.floor(Math.random() * emptyCells.length)]; triggerWaterblastOptions(pick.r, pick.c, true); showToast("Foundation: Waterblast fired!", "success"); } 
        else { triggerEffect(`cell-1-1`, 'fx-water'); showToast("Foundation: Waterblast had no empty cells!", "error"); }
    } else if (currentCannon === 'Curseblast') {
        const emptyRows = [0,1,2].filter(i => !currentGrid.cells[i].some(c => c)); const emptyCols = [0,1,2].filter(j => ![0,1,2].some(r => currentGrid.cells[r][j]));
        if (emptyRows.length === 0 && emptyCols.length === 0) { triggerEffect(`cell-1-1`, 'fx-curse'); showToast("Foundation: Curseblast had no empty lines!", "error"); return; }
        const isRow = emptyRows.length > 0 && (emptyCols.length === 0 || Math.random() < 0.5);
        const index = isRow ? emptyRows[Math.floor(Math.random() * emptyRows.length)] : emptyCols[Math.floor(Math.random() * emptyCols.length)];
        if (currentGrid.isBrutal && !currentGrid.brutalConds) materializeBrutalConds();
        const allCurseConds = getDeterministicCurseConditions(currentGrid); const cond = isRow ? allCurseConds.rows[index] : allCurseConds.cols[index];
        if (cond) {
            if (isRow) { currentGrid.conditions.rows[index] = currentGrid.originalConditions.rows[index] + " AND " + cond; currentGrid.extraRow[index] = true; } 
            else { currentGrid.conditions.cols[index] = currentGrid.originalConditions.cols[index] + " AND " + cond; currentGrid.extraCol[index] = true; }
            currentGrid.curseFired = true; currentGrid.forceLegend = true; cellCache = {}; lastCacheState = ""; clearValidUnitsCache();
            for (let k = 0; k < 3; k++) { triggerEffect(isRow ? `cell-${index}-${k}` : `cell-${k}-${index}`, 'fx-curse'); }
            showToast("Foundation: Curseblast fired!", "success");
        } else {
            if (isRow) currentGrid.extraRow[index] = true; else currentGrid.extraCol[index] = true;
            currentGrid.curseFired = true; currentGrid.forceLegend = true;
            for (let k = 0; k < 3; k++) { triggerEffect(isRow ? `cell-${index}-${k}` : `cell-${k}-${index}`, 'fx-curse'); }
            showToast("Foundation: Curseblast couldn't find a condition, but buffed the line!", "error");
        }
        saveGrids(); renderGrid(); updateUI(); if (checkDeadEnd()) gameOver(); else checkComplete();
    } else if (currentCannon === 'Breakerblast') {
        const filledCells = []; for (let i=0; i<3; i++) for (let j=0; j<3; j++) if (currentGrid.cells[i][j]) filledCells.push({r:i, c:j});
        if (filledCells.length > 0) { const target = filledCells[Math.floor(Math.random() * filledCells.length)]; currentGrid.cells[target.r][target.c] = null; triggerEffect(`cell-${target.r}-${target.c}`, 'fx-breaker'); showToast("Foundation: Breakerblast fired!", "success"); } 
        else { triggerEffect(`cell-1-1`, 'fx-breaker'); showToast("Foundation: Breakerblast had no filled cells!", "error"); }
        saveGrids(); renderGrid(); updateUI(); if (checkDeadEnd()) gameOver(); else checkComplete();
    }
}

function checkComplete() {
    if (currentGrid.isLoss) return;
    try {
        let all = true; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!currentGrid.cells[i][j]) all = false;
        if (all) {
            if (!currentGrid.completed) {
                currentGrid.completed = true; stopTimer();
                if (currentFoundation === 'HolyBlast' && !currentGrid.hasLostLife) {
                    let worstCell = null; let minPts = Infinity; let maxPct = -1;
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            const cell = currentGrid.cells[i][j];
                            if (cell && cell.rarity !== 'Legend' && cell.rarity !== 'Special' && cell.rarity !== 'Best') {
                                const pts = getRarityPoints(cell.rarity); const pct = cell.percentage || 0;
                                if (pts < minPts || (pts === minPts && pct > maxPct)) { minPts = pts; maxPct = pct; worstCell = {i, j}; }
                            }
                        }
                    }
                    if (worstCell) { currentGrid.cells[worstCell.i][worstCell.j].rarity = 'Legend'; cellAnimations[`${worstCell.i}-${worstCell.j}`] = true; renderGrid(); showToast("Holy Blast Foundation: Worst answer upgraded to Legend!", "success"); }
                }
                saveGrids(); updateUI();
            }
            showFinalScore(false);
            setTimeout(() => { document.getElementById('inlineResults').scrollIntoView({ behavior: 'smooth' }); }, 100);
        }
    } catch (e) { console.error("Error in checkComplete:", e); }
}

function resetCurrentGrid(auto = false) {
    if (auto || confirm('Reset entire grid and lose progress?')) {
        currentGrid.cells = Array(3).fill().map(()=>Array(3).fill(null)); currentGrid.completed = false; currentGrid.isLoss = false; currentGrid.score = 0; currentGrid.timer = 0;
        currentGrid.cannon = 'Default'; currentGrid.cannonUses = CANNONS['Default'].uses; currentGrid.style = 'Default'; currentGrid.foundation = 'Default';
        currentGrid.forceLegend = false; currentGrid.lives = 3; currentGrid.correctCount = 0; currentGrid.firstDamage = false; currentGrid.duplicateNextUnit = false;
        currentGrid.pinkBlink = null; currentGrid.yellowBlink = null; currentGrid.comboCount = 0; currentGrid.comboTimer = 0; currentGrid.maxCombo = 0; currentGrid.hadCurseSet = false;
        currentGrid.curseFired = false; currentGrid.brutalConds = null; currentGrid.isBrutal = false; currentGrid._cachedCurseConds = null; currentGrid.hasLostLife = false; currentGrid.ironWallShieldUsed = false;
        currentGrid.holyRows = [false, false, false]; currentGrid.holyMantles = 0; currentGrid.legendaryCount = 0;
        cellAnimations = {}; clearValidUnitsCache(); cellCache = {}; lastCacheState = "";
        if (currentGrid.originalConditions) { currentGrid.conditions.rows = [...currentGrid.originalConditions.rows]; currentGrid.conditions.cols = [...currentGrid.originalConditions.cols]; }
        currentGrid.extraRow = [false, false, false]; currentGrid.extraCol = [false, false, false];
        currentLife = 3; timerSeconds = 0; stopTimer(); shieldedCells = []; pendingCannonAction = null;
        document.getElementById('brutalToggle').checked = false; document.getElementById('resultsBrutalToggle').checked = false; document.getElementById('resultsNoRepeatsToggle').checked = false; document.getElementById('resultsCurseblastToggle').checked = false;
        resultsBrutal = false; resultsNoRepeats = false; resultsCurseblast = false;
        saveGrids(); loadGridUI();
    }
}

function openEquipSelectModal() {
    if (currentGrid.completed || currentGrid.isLoss) { showToast("Grid already complete.", "error"); return; }
    if (currentGrid.curseFired) { showToast("Cannot change loadout after firing Curseblast.", "error"); return; }
    let hasProgress = Object.values(currentGrid.cells).some(row => row.some(c => c)) || pendingCannonAction !== null || currentGrid.hasLostLife;
    if (hasProgress) { showToast("Cannot change loadout during game!", "error"); return; }

    const cGrid = document.getElementById('equipCannonGrid'); const sGrid = document.getElementById('equipStyleGrid'); const fGrid = document.getElementById('equipFoundationGrid');
    cGrid.innerHTML = ''; sGrid.innerHTML = ''; fGrid.innerHTML = '';
    
    for (const [key, data] of Object.entries(CANNONS)) {
        const div = document.createElement('div'); div.className = `equip-item ${currentCannon === key ? 'selected' : ''}`;
        div.innerHTML = `<div class="equip-img-box"><img class="cannon-img" src="${getEquipImage('cannon', key)}" onerror="this.src='${getEquipImage('cannon', 'Default')}'"></div><div class="equip-item-name">${data.name}</div><div class="equip-item-desc">${data.desc}</div>`;
        div.onclick = () => { currentCannon = key; updateLoadoutSelection(); }; cGrid.appendChild(div);
    }
    for (const [key, data] of Object.entries(STYLES)) {
        const div = document.createElement('div'); div.className = `equip-item ${currentStyle === key ? 'selected' : ''}`;
        div.innerHTML = `<div class="equip-img-box"><img class="style-img" src="${getEquipImage('style', key)}" onerror="this.src='${getEquipImage('style', 'Default')}'"></div><div class="equip-item-name">${data.name}</div><div class="equip-item-desc">${data.desc}</div>`;
        div.onclick = () => { currentStyle = key; updateLoadoutSelection(); }; sGrid.appendChild(div);
    }
    for (const [key, data] of Object.entries(FOUNDATIONS)) {
        const div = document.createElement('div'); div.className = `equip-item ${currentFoundation === key ? 'selected' : ''}`;
        div.innerHTML = `<div class="equip-img-box"><img class="foundation-img" src="${getEquipImage('foundation', key)}" onerror="this.src='${getEquipImage('foundation', 'Default')}'"></div><div class="equip-item-name">${data.name}</div><div class="equip-item-desc">${data.desc}</div>`;
        div.onclick = () => { currentFoundation = key; updateLoadoutSelection(); }; fGrid.appendChild(div);
    }
    
    const existingBonus = document.getElementById('setBonusInfo'); if (existingBonus) existingBonus.remove();
    if (currentCannon === currentStyle && currentStyle === currentFoundation) {
        const bonusDiv = document.createElement('div'); bonusDiv.id = 'setBonusInfo';
        bonusDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: #3a2f1d; border: 2px solid #e09f3e; border-radius: 8px; color: #ffd700; text-align: center; font-weight: bold;';
        bonusDiv.innerHTML = `Set Bonus Active: ${getSetBonusText(currentCannon)}`; document.querySelector('.equip-list-container').appendChild(bonusDiv);
    }
    document.getElementById('equipSelectModal').classList.add('active');
}

function updateLoadoutSelection() {
    document.querySelectorAll('#equipCannonGrid .equip-item').forEach(el => el.classList.remove('selected')); document.querySelectorAll('#equipStyleGrid .equip-item').forEach(el => el.classList.remove('selected')); document.querySelectorAll('#equipFoundationGrid .equip-item').forEach(el => el.classList.remove('selected'));
    const cKeys = Object.keys(CANNONS); document.querySelectorAll('#equipCannonGrid .equip-item')[cKeys.indexOf(currentCannon)].classList.add('selected');
    const sKeys = Object.keys(STYLES); document.querySelectorAll('#equipStyleGrid .equip-item')[sKeys.indexOf(currentStyle)].classList.add('selected');
    const fKeys = Object.keys(FOUNDATIONS); document.querySelectorAll('#equipFoundationGrid .equip-item')[fKeys.indexOf(currentFoundation)].classList.add('selected');
    const existingBonus = document.getElementById('setBonusInfo'); if (existingBonus) existingBonus.remove();
    if (currentCannon === currentStyle && currentStyle === currentFoundation) {
        const bonusDiv = document.createElement('div'); bonusDiv.id = 'setBonusInfo';
        bonusDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: #3a2f1d; border: 2px solid #e09f3e; border-radius: 8px; color: #ffd700; text-align: center; font-weight: bold;';
        bonusDiv.innerHTML = `Set Bonus Active: ${getSetBonusText(currentCannon)}`; document.querySelector('.equip-list-container').appendChild(bonusDiv);
    }
}

function randomizeLoadout() {
    const cannons = Object.keys(CANNONS); const styles = Object.keys(STYLES); const foundations = Object.keys(FOUNDATIONS);
    currentCannon = cannons[Math.floor(Math.random() * cannons.length)]; currentStyle = styles[Math.floor(Math.random() * styles.length)]; currentFoundation = foundations[Math.floor(Math.random() * foundations.length)];
    updateLoadoutSelection(); closeEquipSelectModal();
}

function closeEquipSelectModal() {
    if (currentGrid) {
        if (currentGrid.curseFired) { document.getElementById('equipSelectModal').classList.remove('active'); loadGridUI(); return; }
        let hasCells = Object.values(currentGrid.cells).some(row => row.some(c => c));
        let prevCannon = currentGrid.cannon; let prevStyle = currentGrid.style; let prevFoundation = currentGrid.foundation;
        let prevCurseSet = (prevCannon === 'Curseblast' && prevStyle === 'Curseblast' && prevFoundation === 'Curseblast');
        currentGrid.cannon = currentCannon; currentGrid.cannonUses = CANNONS[currentCannon].uses; currentGrid.style = currentStyle; currentGrid.foundation = currentFoundation;
        let isCurseSet = (currentCannon === 'Curseblast' && currentStyle === 'Curseblast' && currentFoundation === 'Curseblast');
        let isSlowBeamSet = (currentCannon === 'SlowBeam' && currentStyle === 'SlowBeam' && currentFoundation === 'SlowBeam');
        let isBreakerSet = (currentCannon === 'Breakerblast' && currentStyle === 'Breakerblast' && currentFoundation === 'Breakerblast');
        if (isSlowBeamSet) currentGrid.cannonUses += 1;
        if (isBreakerSet) currentGrid.cannonUses *= 2;
        if (isCurseSet) { currentGrid.lives = 1; currentLife = 1; } else if (prevCurseSet) { currentGrid.lives = 3; currentLife = 3; }
        if (currentGrid.style === 'IronWall' && currentGrid.correctCount === 0 && !prevCurseSet && !isCurseSet) { currentGrid.lives = MAX_LIVES; currentLife = MAX_LIVES; } 
        else if (currentGrid.style !== 'IronWall' && currentGrid.correctCount === 0 && !prevCurseSet && !isCurseSet) { currentGrid.lives = 3; currentLife = 3; }
        if (!hasCells && (prevCannon !== currentCannon || prevStyle !== currentStyle || prevFoundation !== currentFoundation)) {
            pendingCannonAction = null; clearValidUnitsCache(); currentGrid.conditions.rows = [...currentGrid.originalConditions.rows]; currentGrid.conditions.cols = [...currentGrid.originalConditions.cols];
            currentGrid.extraRow = [false, false, false]; currentGrid.extraCol = [false, false, false]; currentGrid.curseFired = false; currentGrid.forceLegend = false; currentGrid._cachedCurseConds = null;
            currentGrid.holyRows = [false, false, false]; currentGrid.holyMantles = 0; currentGrid.legendaryCount = 0;
        }
        
        if (currentUser && userProfile && userProfile.settings && userProfile.settings.lockLoadout) {
            userProfile.settings.favCannon = currentCannon; userProfile.settings.favStyle = currentStyle; userProfile.settings.favFoundation = currentFoundation;
            supabase.from('profiles').update({ settings: userProfile.settings }).eq('id', currentUser.id);
        }

        saveGrids(); loadGridUI();
    }
    document.getElementById('equipSelectModal').classList.remove('active');
}

function useCannon() {
    if (currentGrid.completed || currentGrid.isLoss) return;
    if (pendingCannonAction) return; 
    if (currentStyle === 'Curseblast' && cannonUsesLeft === 0 && !isCurseSetActive()) {
        if (currentLife <= 1) { showToast("Cannot buy charge at 1 life!", "error"); return; }
        let uses = CANNONS[currentCannon].uses; let cost = 4; if (uses >= 5) cost = 1; else if (uses >= 3) cost = 2; else if (uses >= 2) cost = 3;
        let newLife = Math.max(1, currentLife - cost); currentLife = newLife; cannonUsesLeft++; currentGrid.cannonUses = cannonUsesLeft;
        ensureTimerStarted(); saveGrids(); updateUI(); showToast(`Bought 1 charge for ${cost} lives.`, "success"); return;
    }
    if (cannonUsesLeft <= 0 && !isCurseSetActive()) return;

    if (currentCannon === 'Default') { pendingCannonAction = 'Default'; showToast("Select a row for Default Cannon.", "success"); } 
    else if (currentCannon === 'SlowBeam') { pendingCannonAction = 'SlowBeam'; showToast("Select a cell to enable duplicate placement.", "success"); } 
    else if (currentCannon === 'HolyBlast') { pendingCannonAction = 'HolyBlast'; showToast("Select a cell in the row you want to leave a golden trail on.", "success"); } 
    else if (currentCannon === 'IronWall') { pendingCannonAction = 'IronWall'; showToast("Click a cell to place a shield.", "success"); } 
    else if (currentCannon === 'Thunderbolt') {
        ensureTimerStarted(); let allCells = []; for (let i=0; i<3; i++) for (let j=0; j<3; j++) allCells.push({i, j});
        let targetCells = allCells; if (currentStyle === 'Thunderbolt' && currentFoundation === 'Thunderbolt') { targetCells = allCells.filter(c => !currentGrid.cells[c.i][c.j]); if (targetCells.length === 0) targetCells = allCells; }
        const pick = targetCells[Math.floor(Math.random() * targetCells.length)]; const cell = currentGrid.cells[pick.i][pick.j];
        if (cell && !(currentStyle === 'Thunderbolt' && currentFoundation === 'Thunderbolt')) {
            thunderPauseUntil = Date.now() + 5000; showToast("Cell filled! Timer paused 5s.", "success"); triggerEffect(`cell-${pick.i}-${pick.j}`, 'fx-thunder');
            if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); } updateUI();
        } else if (!cell) {
            const conds = getEffectiveConditions(pick.i, pick.j); let valid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName));
            if (valid.length > 0) { let safeValid = valid.filter(u => !willMoveCauseDeadEnd(pick.i, pick.j, u.fullName)); if (safeValid.length > 0) valid = safeValid; else valid = []; }
            if (valid.length > 0) { const u = valid[Math.floor(Math.random() * valid.length)]; placeUnit(pick.i, pick.j, u.fullName, u.name, true); }
            triggerEffect(`cell-${pick.i}-${pick.j}`, 'fx-thunder'); if (!isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); } updateUI();
        }
        return;
    } else if (currentCannon === 'Waterblast') { pendingCannonAction = 'Waterblast'; showToast("Click an empty cell to waterblast.", "success"); } 
    else if (currentCannon === 'Breakerblast') {
        let hasFilled = false; for (let i=0; i<3; i++) for (let j=0; j<3; j++) if (currentGrid.cells[i][j]) hasFilled = true;
        if (!hasFilled) { showToast("No filled cells to break!", "error"); return; }
        pendingCannonAction = 'Breakerblast'; showToast("Click a filled cell to remove answer.", "success");
    } else if (currentCannon === 'Curseblast') { pendingCannonAction = 'Curseblast'; showToast("Click a row/column header to add a constraint.", "success"); }
    if (pendingCannonAction) renderGrid();
}

function triggerWaterblastOptions(r, c, isFree = false) {
    pendingCannonAction = null; ensureTimerStarted(); const conds = getEffectiveConditions(r, c);
    const onlyRow = PROCESSED_UNITS.filter(u => checkCondition(u.fullName, conds.row) && !checkCondition(u.fullName, conds.col) && !isUnitUsed(u.fullName));
    const onlyCol = PROCESSED_UNITS.filter(u => !checkCondition(u.fullName, conds.row) && checkCondition(u.fullName, conds.col) && !isUnitUsed(u.fullName));
    const both = PROCESSED_UNITS.filter(u => checkCondition(u.fullName, conds.row) && checkCondition(u.fullName, conds.col) && !isUnitUsed(u.fullName));
    if (both.length === 0) { showToast("No valid unused answers!", "error"); return; }
    const options = [];
    if (onlyRow.length > 0) options.push({ type: 'row', unit: onlyRow[Math.floor(Math.random() * onlyRow.length)] });
    if (onlyCol.length > 0) options.push({ type: 'col', unit: onlyCol[Math.floor(Math.random() * onlyCol.length)] });
    options.push({ type: 'both', unit: both[Math.floor(Math.random() * both.length)] });
    while (options.length < 3 && both.length > 0) { const extra = both[Math.floor(Math.random() * both.length)]; if(!options.find(o => o.unit.fullName === extra.fullName)) options.push({type:'both', unit: extra}); else break; }
    options.sort(() => Math.random() - 0.5);
    let validOptions = options.filter(opt => !willMoveCauseDeadEnd(r, c, opt.unit.fullName));
    if (validOptions.length === 0) { showToast("All options would cause a dead end!", "error"); renderGrid(); return; }
    if (!isFree && !isCurseSetActive()) { cannonUsesLeft--; currentGrid.cannonUses = cannonUsesLeft; saveGrids(); } updateUI();
    const modalTitle = document.getElementById('waterblastModal').querySelector('h3'); if (modalTitle) modalTitle.innerHTML = bcCondText(conds.row + ' + ' + conds.col, 18);
    const container = document.getElementById('waterblastOptions');
    if (currentStyle === 'Waterblast' && currentFoundation === 'Waterblast') {
        container.className = 'cannon-modal-grid-3'; container.innerHTML = '';
        let allValid = getValidUnits(conds.row, conds.col).filter(u => !isUnitUsed(u.fullName)); let safeAllValid = allValid.filter(u => !willMoveCauseDeadEnd(r, c, u.fullName));
        safeAllValid.sort((a, b) => { const idA = parseInt(a.id.replace(/\D/g, '')) || 0; const idB = parseInt(b.id.replace(/\D/g, '')) || 0; return idA - idB; });
        safeAllValid.forEach(u => {
            const div = document.createElement('div'); div.className = 'cannon-option'; div.style.flexDirection = 'column'; div.style.padding = '10px';
            div.innerHTML = `<img class="cannon-option-img" src="${IMG_UNITS}${u.fullName.split(' ')[0]}.png" onerror="this.style.display='none';"><div class="cannon-option-info" style="align-items:center; text-align:center;"><h4 style="font-size:14px; margin-top:5px;">${u.name}</h4></div>`;
            div.onclick = () => { document.getElementById('waterblastModal').classList.remove('active'); triggerEffect(`cell-${r}-${c}`, 'fx-water'); setTimeout(() => { placeUnit(r, c, u.fullName, u.name, true); }, 600); };
            container.appendChild(div);
        });
        document.getElementById('waterblastModal').classList.add('active'); return;
    }
    container.className = 'cannon-modal-grid'; container.innerHTML = '';
    validOptions.forEach(opt => {
        const div = document.createElement('div'); div.className = 'cannon-option';
        div.innerHTML = `<img class="cannon-option-img" src="${IMG_UNITS}${opt.unit.fullName.split(' ')[0]}.png" onerror="this.style.display='none';"><div class="cannon-option-info"><h4>${opt.unit.name}</h4></div>`;
        div.onclick = () => {
            document.getElementById('waterblastModal').classList.remove('active');
            if (opt.type === 'both') { triggerEffect(`cell-${r}-${c}`, 'fx-water'); setTimeout(() => { if (placeUnit(r, c, opt.unit.fullName, opt.unit.name, true)) showToast("Correct! Cell filled.", "success"); }, 600); } 
            else { triggerEffect(`cell-${r}-${c}`, 'fx-water'); setTimeout(() => { handleDamage(); }, 600); }
        };
        container.appendChild(div);
    });
    document.getElementById('waterblastModal').classList.add('active');
}

function triggerEffect(cellId, className) { const el = document.getElementById(cellId); if (!el) return; const overlay = document.createElement('div'); overlay.className = `effect-overlay ${className}`; el.appendChild(overlay); setTimeout(() => overlay.remove(), 1000); }

function shareResult() {
    const score = document.getElementById('finalScoreValue').textContent; const grade = document.getElementById('finalGrade').textContent;
    let text = `I scored ${score} (${grade}) on the Battle Cats Grid "${currentGrid.title || 'Unnamed'}"!`;
    if (currentGrid.isLoss) text = `I failed the Battle Cats Grid "${currentGrid.title || 'Unnamed'}" with ${score} points.`;
    navigator.clipboard.writeText(text).then(() => { showToast("Result copied to clipboard!", "success"); }).catch(err => { showToast("Failed to copy result.", "error"); });
}

function toggleResultsBrutal() { resultsBrutal = document.getElementById('resultsBrutalToggle').checked; renderResults(); }
function toggleResultsNoRepeats() { resultsNoRepeats = document.getElementById('resultsNoRepeatsToggle').checked; renderResults(); }
function toggleResultsCurseblast() { resultsCurseblast = document.getElementById('resultsCurseblastToggle').checked; renderResults(); }
function switchResTab(tab) { currentResTab = tab; document.querySelectorAll('.res-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); renderResults(); }

function getResolvedResults(showCurse) {
    const result = Array(3).fill().map(() => Array(3).fill(null)); const cells = [];
    for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { const data = getCellData(i, j, !showCurse); data.sort((a, b) => currentResTab === 'least' ? a.pct - b.pct : b.pct - a.pct); cells.push({ i, j, data, index: 0 }); } }
    if (!resultsNoRepeats) { for (let c of cells) { if (c.data.length > 0) result[c.i][c.j] = c.data[0]; } return result; }
    let changed = true;
    while (changed) {
        changed = false; const counts = {};
        for (let c of cells) { if (c.data.length > 0) { const uid = c.data[c.index].unit.id; counts[uid] = (counts[uid] || 0) + 1; } }
        let duplicateUnitId = null; for (let uid in counts) { if (counts[uid] > 1) { duplicateUnitId = uid; break; } }
        if (duplicateUnitId) {
            const dupCells = cells.filter(c => c.data.length > 0 && c.data[c.index].unit.id === duplicateUnitId); let bestCellToAdvance = null; let minCost = Infinity;
            for (let c of dupCells) { if (c.index + 1 < c.data.length) { let currentPct = c.data[c.index].pct; let nextPct = c.data[c.index + 1].pct; let cost = currentResTab === 'least' ? nextPct - currentPct : currentPct - nextPct; if (cost < minCost) { minCost = cost; bestCellToAdvance = c; } } }
            if (bestCellToAdvance) { bestCellToAdvance.index++; changed = true; } else break;
        }
    }
    for (let c of cells) { if (c.data.length > 0) result[c.i][c.j] = c.data[c.index]; } return result;
}

function openCandidatesModal(r, c) {
    const origBrutal = currentGrid.isBrutal; const origBrutalConds = currentGrid.brutalConds;
    if (resultsBrutal) { currentGrid.isBrutal = true; if (!currentGrid.brutalConds) currentGrid.brutalConds = computeDeterministicBrutals(currentGrid); } else currentGrid.isBrutal = false;
    const cellData = getCellData(r, c, !resultsCurseblast); const conds = getEffectiveConditions(r, c, !resultsCurseblast);
    currentGrid.isBrutal = origBrutal; currentGrid.brutalConds = origBrutalConds;
    const uniqueMap = new Map(); cellData.forEach(item => { if (!uniqueMap.has(item.unit.id) || item.pct < uniqueMap.get(item.unit.id).pct) uniqueMap.set(item.unit.id, item); });
    let uniqueCandidates = Array.from(uniqueMap.values()); uniqueCandidates.sort((a, b) => b.pct - a.pct);
    const list = document.getElementById('candidatesList'); list.innerHTML = '';
    uniqueCandidates.forEach(item => { const div = document.createElement('div'); div.className = 'candidate-item'; div.style.cursor = 'pointer'; div.innerHTML = `<img src="${IMG_UNITS}${item.unit.fullName.split(' ')[0]}.png" onerror="this.style.display='none'"><span>${item.unit.name}</span><span class="candidate-percent">${item.pct}%</span>`; div.onclick = () => showUnitInfo(item.unit.fullName); list.appendChild(div); });
    document.getElementById('candidatesTitle').innerHTML = bcCondText(conds.row + ' + ' + conds.col, 20); document.getElementById('candidatesModal').classList.add('active');
}

function closeCandidatesModal() { document.getElementById('candidatesModal').classList.remove('active'); }

function showUnitInfo(fullName) {
    currentUnitInfoFullName = fullName; const unit = UNIT_MAP[fullName]; if (!unit) return;
    const matchingConds = []; for (const cond of allConditions) { if (cond === "Targets: All" || cond === "Targets: All non-Metal") continue; if (checkCondition(fullName, cond)) matchingConds.push(cond); }
    const expandedTraits = getExpandedTraits(unit); for (const trait of expandedTraits) { const traitCond = `Targets: ${trait}`; if (!matchingConds.includes(traitCond) && !customCriteria[traitCond]) matchingConds.push(traitCond); }
    const grouped = {}; matchingConds.forEach(c => { let cat = getConditionCategory(c) || "Misc"; if (cat === "TargetType") cat = "Target Type"; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(c); });
    let forms = Object.keys(UNITS_DATA).filter(k => k.startsWith(unit.id + '-')).sort(); let idx = forms.indexOf(fullName);
    let html = `<div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; border-bottom:1px solid #35383f; padding-bottom:10px;"><button class="btn btn-primary" style="padding: 5px 10px; border-radius: 8px; border: none; cursor: pointer; color: white;" onclick="changeUnitForm(-1)">◀</button><img src="${IMG_UNITS}${unit.fullName.split(' ')[0]}.png" onerror="this.style.display='none'" style="width:50px;height:50px;object-fit:contain;"><div style="font-weight:bold; color:#fff; font-size:18px; flex: 1; text-align: center;">${unit.name}</div><button class="btn btn-primary" style="padding: 5px 10px; border-radius: 8px; border: none; cursor: pointer; color: white;" onclick="changeUnitForm(1)">▶</button></div>`;
    if (Object.keys(grouped).length === 0) html += `<div style="color:#a0a5b0;">No matching conditions found.</div>`;
    else { for (const [cat, conds] of Object.entries(grouped)) html += `<div class="cond-category"><strong>${cat}</strong>${conds.map(c => `<span class="cond-tag">${formatConditionName(c)}</span>`).join('')}</div>`; }
    document.getElementById('unitInfoContent').innerHTML = html; document.getElementById('unitInfoModal').classList.add('active');
}

function changeUnitForm(dir) { if (!currentUnitInfoFullName) return; const unit = UNIT_MAP[currentUnitInfoFullName]; let forms = Object.keys(UNITS_DATA).filter(k => k.startsWith(unit.id + '-')).sort(); let idx = forms.indexOf(currentUnitInfoFullName); idx = (idx + dir + forms.length) % forms.length; showUnitInfo(forms[idx]); }
function closeUnitInfoModal() { document.getElementById('unitInfoModal').classList.remove('active'); if (document.getElementById('editorPage').classList.contains('active')) { document.getElementById('editorUnitSearch').value = ''; document.getElementById('editorUnitResults').style.display = 'none'; } }

function renderResults() {
    const container = document.getElementById('resultsGridContainer'); container.innerHTML = '';
    const origBrutal = currentGrid.isBrutal; const origBrutalConds = currentGrid.brutalConds;
    if (resultsBrutal) { currentGrid.isBrutal = true; if (!currentGrid.brutalConds) currentGrid.brutalConds = computeDeterministicBrutals(currentGrid); } else currentGrid.isBrutal = false;
    const showCurse = resultsCurseblast;
    container.innerHTML += `<div class="res-cell header" style="background:transparent; border:none;"></div>`;
    for (let j = 0; j < 3; j++) container.innerHTML += `<div class="res-cell header">${bcCondText(showCurse ? currentGrid.conditions.cols[j] : currentGrid.originalConditions.cols[j], 13)}</div>`;
    const resolved = getResolvedResults(showCurse);
    for (let i = 0; i < 3; i++) {
        container.innerHTML += `<div class="res-cell header">${bcCondText(showCurse ? currentGrid.conditions.rows[i] : currentGrid.originalConditions.rows[i], 13)}</div>`;
        for (let j = 0; j < 3; j++) {
            const conds = getEffectiveConditions(i, j, !showCurse); const cellData = getCellData(i, j, !showCurse); let content = '';
            if (currentResTab === 'candidates') { const uniqueCount = new Set(cellData.map(item => item.unit.id)).size; content = `<div class="big-count" style="cursor:pointer;" onclick="openCandidatesModal(${i}, ${j})">${uniqueCount}</div>`; } 
            else {
                const item = resolved[i][j];
                if (!item) content = `<div style="color:#a0a5b0;">No valid units</div>`;
                else {
                    let displayRar = item.rarity; let color = getRarityColor(displayRar); let txtColor = (displayRar === 'Legend' || displayRar === 'Best' || displayRar === 'Special') ? '#333' : '#fff';
                    content = `<img src="${IMG_UNITS}${item.unit.fullName.split(' ')[0]}.png" onerror="this.style.display='none'"><div class="name">${bcText(item.unit.name, {size: 12})}</div><div class="res-bottom-banner" style="background:${color}; color:${txtColor};">${getDisplayRarity(displayRar)} ${item.pct}%</div>`;
                }
            }
            let brutalHtml = '';
            if (resultsBrutal && conds.brutal) brutalHtml = `<div style="font-size: 10px; color: #ff4757; background: rgba(0,0,0,0.8); padding: 2px 4px; border-radius: 4px; margin-bottom: 5px; text-align: center; width: 100%; word-break: break-word; z-index: 5; position: relative;">${formatConditionName(conds.brutal)}</div>`;
            container.innerHTML += `<div class="res-cell" style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 5px;">${brutalHtml}<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; flex: 1;">${content}</div></div>`;
        }
    }
    currentGrid.isBrutal = origBrutal; currentGrid.brutalConds = origBrutalConds;
}

function openEditorPage(dateKey = null) {
    document.getElementById('calendarPage').style.display = 'none'; document.getElementById('gridPage').classList.remove('active'); document.getElementById('editorPage').classList.add('active');
    if (dateKey) { document.getElementById('editorDate').value = dateKey; document.getElementById('editorDate').disabled = false; } else { document.getElementById('editorDate').value = getDateKey(new Date()); document.getElementById('editorDate').disabled = false; }
    document.getElementById('editorBrutalToggle').checked = false; document.getElementById('editorUnitSearch').value = ''; document.getElementById('editorUnitResults').style.display = 'none';
    editorState = { rows: ["", "", ""], cols: ["", "", ""], isBrutal: false, brutals: Array(3).fill().map(()=>Array(3).fill("")), name: "" };
    if (dateKey && gridsData[dateKey]) {
        const g = gridsData[dateKey]; editorState.rows = [...g.originalConditions.rows]; editorState.cols = [...g.originalConditions.cols];
        editorState.isBrutal = g.isBrutal || false; if (g.brutalConds) editorState.brutals = g.brutalConds; editorState.name = g.title || ''; document.getElementById('editorBrutalToggle').checked = g.isBrutal;
    }
    updateEditor();
}

function closeEditorPage() { document.getElementById('editorPage').classList.remove('active'); document.getElementById('calendarPage').style.display = 'block'; renderCalendar(); }

function setAppendMode(mode) {
    if (appendMode === mode) appendMode = 'replace'; else appendMode = mode;
    const btnA = document.getElementById('mode-and'); const btnO = document.getElementById('mode-or'); const btnN = document.getElementById('mode-not');
    if(btnA) { btnA.classList.toggle('active', appendMode === 'and'); btnA.style.background = appendMode === 'and' ? '#4caf50' : ''; btnA.style.borderColor = appendMode === 'and' ? '#4caf50' : ''; btnA.style.color = appendMode === 'and' ? 'white' : ''; }
    if(btnO) { btnO.classList.toggle('active', appendMode === 'or'); btnO.style.background = appendMode === 'or' ? '#4caf50' : ''; btnO.style.borderColor = appendMode === 'or' ? '#4caf50' : ''; btnO.style.color = appendMode === 'or' ? 'white' : ''; }
    if(btnN) { btnN.classList.toggle('active', appendMode === 'not'); btnN.style.background = appendMode === 'not' ? '#4caf50' : ''; btnN.style.borderColor = appendMode === 'not' ? '#4caf50' : ''; btnN.style.color = appendMode === 'not' ? 'white' : ''; }
}

function openConditionSelectModal(type, index) {
    editingCondType = type; editingCondIndex = index; document.getElementById('condSearch').value = '';
    const removeText = type === 'brutal' ? 'Random' : 'Remove Condition';
    let html = `<div class="cond-btn" onclick="selectCondition('')" style="width:100%; text-align:center; background:#d33838; border-color:#d33838; margin-bottom: 10px;">${removeText}</div>`;
    let currentCategory = "";
    for (const cond of sortedConditions) {
        const cat = getConditionCategory(cond) || "Misc";
        if (cat !== currentCategory) { if (currentCategory !== "") html += `</div>`; html += `<div class="cond-category-title">${cat}</div><div class="cond-grid">`; currentCategory = cat; }
        html += `<div class="cond-btn" onclick='selectCondition(${JSON.stringify(cond)})'>${formatConditionName(cond)}</div>`;
    }
    if (currentCategory !== "") html += `</div>`;
    document.getElementById('condList').innerHTML = html; setAppendMode('replace'); document.getElementById('conditionSelectModal').classList.add('active');
}

function openBrutalSelectModal(i, j) {
    editingCondType = 'brutal'; editingCondIndex = { i, j }; document.getElementById('condSearch').value = '';
    let html = `<div class="cond-btn" onclick="selectCondition('')" style="width:100%; text-align:center; background:#d33838; border-color:#d33838; margin-bottom: 10px;">Random</div>`;
    let currentCategory = "";
    for (const cond of sortedConditions) {
        const cat = getConditionCategory(cond) || "Misc";
        if (cat !== currentCategory) { if (currentCategory !== "") html += `</div>`; html += `<div class="cond-category-title">${cat}</div><div class="cond-grid">`; currentCategory = cat; }
        html += `<div class="cond-btn" onclick='selectCondition(${JSON.stringify(cond)})'>${formatConditionName(cond)}</div>`;
    }
    if (currentCategory !== "") html += `</div>`;
    document.getElementById('condList').innerHTML = html; setAppendMode('replace'); document.getElementById('conditionSelectModal').classList.add('active');
}

function filterConditions() {
    const q = document.getElementById('condSearch').value.toLowerCase(); const btns = document.querySelectorAll('#condList .cond-btn');
    btns.forEach(btn => { if (btn.classList.contains('mode-btn') || btn.textContent === 'Remove Condition' || btn.textContent === 'Random') btn.style.display = 'block'; else if (btn.textContent.toLowerCase().includes(q)) btn.style.display = 'block'; else btn.style.display = 'none'; });
    document.querySelectorAll('#condList .cond-category-title').forEach(title => {
        let next = title.nextElementSibling; let hasVisible = false;
        while (next && next.classList.contains('cond-grid')) { const btns = next.querySelectorAll('.cond-btn'); for (let btn of btns) { if (btn.style.display !== 'none') hasVisible = true; } next = next.nextElementSibling; }
        title.style.display = hasVisible ? 'block' : 'none';
    });
}

function selectCondition(cond) {
    if (editingCondType === 'row') {
        let cur = editorState.rows[editingCondIndex] || '';
        if (cond === '') editorState.rows[editingCondIndex] = '';
        else if (appendMode === 'and') editorState.rows[editingCondIndex] = cur ? `${cur} AND ${cond}` : cond;
        else if (appendMode === 'or') editorState.rows[editingCondIndex] = cur ? `${cur} OR ${cond}` : cond;
        else if (appendMode === 'not') editorState.rows[editingCondIndex] = cur ? `${cur} AND NOT ${cond}` : `NOT ${cond}`;
        else editorState.rows[editingCondIndex] = cond;
    } else if (editingCondType === 'col') {
        let cur = editorState.cols[editingCondIndex] || '';
        if (cond === '') editorState.cols[editingCondIndex] = '';
        else if (appendMode === 'and') editorState.cols[editingCondIndex] = cur ? `${cur} AND ${cond}` : cond;
        else if (appendMode === 'or') editorState.cols[editingCondIndex] = cur ? `${cur} OR ${cond}` : cond;
        else if (appendMode === 'not') editorState.cols[editingCondIndex] = cur ? `${cur} AND NOT ${cond}` : `NOT ${cond}`;
        else editorState.cols[editingCondIndex] = cond;
    } else if (editingCondType === 'brutal') {
        let cur = editorState.brutals[editingCondIndex.i][editingCondIndex.j] || '';
        if (cond === '') editorState.brutals[editingCondIndex.i][editingCondIndex.j] = '';
        else if (appendMode === 'and') editorState.brutals[editingCondIndex.i][editingCondIndex.j] = cur ? `${cur} AND ${cond}` : cond;
        else if (appendMode === 'or') editorState.brutals[editingCondIndex.i][editingCondIndex.j] = cur ? `${cur} OR ${cond}` : cond;
        else if (appendMode === 'not') editorState.brutals[editingCondIndex.i][editingCondIndex.j] = cur ? `${cur} AND NOT ${cond}` : `NOT ${cond}`;
        else editorState.brutals[editingCondIndex.i][editingCondIndex.j] = cond;
    }
    closeConditionSelectModal(); updateEditor();
}

function closeConditionSelectModal() { document.getElementById('conditionSelectModal').classList.remove('active'); }
function updateEditorBrutal(i, j, val) { editorState.brutals[i][j] = val; updateEditor(); }

function getEditorBrutal(rC, cC, i, j) {
    if (!editorState.isBrutal) return "";
    if (editorState.brutals[i][j]) return editorState.brutals[i][j];
    const stableList = getStableConditionList(); const rng = createSeededRandom("editor|" + rC + "|" + cC + "|" + i + "|" + j + "|v4");
    const shuffled = [...stableList]; for (let k = shuffled.length - 1; k > 0; k--) { const jj = Math.floor(rng() * (k + 1)); [shuffled[k], shuffled[jj]] = [shuffled[jj], shuffled[k]]; }
    for (const cond of shuffled) { let tempRow = rC + " AND " + cond; if (getValidUnits(tempRow, cC).length > 0) return cond; }
    return "";
}

function getUnsolvableCells() {
    if (editorState.rows.some(r => !r) || editorState.cols.some(c => !c)) return { solvable: false, failedCells: [] };
    const cells = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let rowC = editorState.rows[i]; let colC = editorState.cols[j]; let br = "";
            if (editorState.isBrutal) { br = getEditorBrutal(rowC, colC, i, j); if (br) rowC += " AND " + br; }
            const valid = getValidUnits(rowC, colC); const uniqueIds = [...new Set(valid.map(u => u.id))]; cells.push({ id: `cell_${i}_${j}`, options: uniqueIds, r: i, c: j });
        }
    }
    const match = {}; const cellToUnit = {}; 
    function dfs(cellIdx, visited) { for (const unitId of cells[cellIdx].options) { if (visited.has(unitId)) continue; visited.add(unitId); if (match[unitId] === undefined || dfs(match[unitId], visited)) { match[unitId] = cellIdx; cellToUnit[cellIdx] = unitId; return true; } } return false; }
    let matches = 0; for (let i = 0; i < 9; i++) { if (dfs(i, new Set())) matches++; }
    if (matches === 9) return { solvable: true, failedCells: [] };
    const failedCells = []; for (let i = 0; i < 9; i++) { if (cellToUnit[i] === undefined) failedCells.push(cells[i]); } return { solvable: false, failedCells };
}

function updateEditor() {
    editorState.isBrutal = document.getElementById('editorBrutalToggle').checked;
    const grid = document.getElementById('editorGrid'); grid.innerHTML = '';
    grid.innerHTML += `<div class="editor-header-cell" style="background:#1a1b1e; border:2px solid #35383f; padding:0;"><input type="text" id="editorName" class="text-input" style="margin:0; padding:5px; font-size:12px; height:100%; width:100%; border-radius:12px; border:none; background:transparent; text-align:center;" placeholder="Grid Name" value="${escapeHTML(editorState.name || '')}" oninput="editorState.name = this.value"></div>`;
    for (let j = 0; j < 3; j++) { const val = editorState.cols[j]; const html = val ? `<div class="cond-text">${formatConditionName(val)}</div>` : `<div class="add-icon">+</div>`; grid.innerHTML += `<div class="editor-header-cell" onclick="openConditionSelectModal('col', ${j})">${html}</div>`; }
    const { solvable, failedCells } = getUnsolvableCells(); const failedSet = new Set(failedCells.map(c => `${c.r}_${c.c}`));
    for (let i = 0; i < 3; i++) {
        const val = editorState.rows[i]; const html = val ? `<div class="cond-text">${formatConditionName(val)}</div>` : `<div class="add-icon">+</div>`;
        grid.innerHTML += `<div class="editor-header-cell" onclick="openConditionSelectModal('row', ${i})">${html}</div>`;
        for (let j = 0; j < 3; j++) {
            const rC = editorState.rows[i]; const cC = editorState.cols[j]; let count = 0; let isSemi = !rC || !cC; let currentBr = "";
            if (rC && cC) { currentBr = getEditorBrutal(rC, cC, i, j); let rowC = rC; if (editorState.isBrutal && currentBr) rowC += " AND " + currentBr; const valid = getValidUnits(rowC, cC); count = new Set(valid.map(u => u.id)).size; } 
            else if (rC) count = new Set(getValidUnits(rC, "").map(u => u.id)).size; 
            else if (cC) count = new Set(getValidUnits("", cC).map(u => u.id)).size;
            const isFailed = failedSet.has(`${i}_${j}`); const numClass = (!isSemi && (count === 0 || isFailed)) ? 'invalid-num' : ''; const cellClass = (!isSemi && (count === 0 || isFailed)) ? 'invalid' : ''; const opacity = isSemi ? 'style="opacity: 0.5;"' : ''; const display = (rC || cC) ? count : '-';
            let cellHTML = `<div class="editor-cell ${cellClass}" onclick='openEditorCand(${JSON.stringify(rC)}, ${JSON.stringify(cC)}, ${i}, ${j})'>`;
            if (editorState.isBrutal && rC && cC) { const displayBr = editorState.brutals[i][j] || currentBr; cellHTML += `<div class="editor-brutal-btn" onclick="event.stopPropagation(); openBrutalSelectModal(${i}, ${j})">${formatConditionName(displayBr)}</div>`; }
            const numStyle = (editorState.isBrutal && rC && cC) ? 'style="transform: translateY(-15px);"' : '';
            cellHTML += `<span class="${numClass}" ${opacity} ${numStyle}>${display}</span></div>`; grid.innerHTML += cellHTML;
        }
    }
    const saveBtn = document.getElementById('editorSaveBtn');
    if (editorState.rows.some(r => !r) || editorState.cols.some(c => !c) || !solvable) {
        saveBtn.style.opacity = '0.5'; saveBtn.style.pointerEvents = 'none';
        if (!solvable && !editorState.rows.some(r => !r) && !editorState.cols.some(c => !c)) saveBtn.textContent = "Cannot Save: Grid Unsolvable"; else saveBtn.textContent = "Save Grid";
    } else { saveBtn.style.opacity = '1'; saveBtn.style.pointerEvents = 'auto'; saveBtn.textContent = "Save Grid"; }
}

function openEditorCand(rC, cC, i, j) {
    if (!rC && !cC) return;
    let rowC = rC; if (rC && cC) { const br = getEditorBrutal(rC, cC, i, j); if (br) rowC += " AND " + br; }
    const valid = getValidUnits(rowC, cC); if (valid.length === 0) return;
    const uniqueMap = new Map(); for (const u of valid) { const calc = calculatePercentageForCondition(rowC, cC, u.fullName, "editor"); if (!uniqueMap.has(u.id) || calc.pct < uniqueMap.get(u.id).pct) uniqueMap.set(u.id, { unit: u, pct: calc.pct }); }
    let items = Array.from(uniqueMap.values()); items.sort((a, b) => b.pct - a.pct);
    const list = document.getElementById('candidatesList'); list.innerHTML = '';
    items.forEach(item => { const div = document.createElement('div'); div.className = 'candidate-item'; div.style.cursor = 'pointer'; div.innerHTML = `<img src="${IMG_UNITS}${item.unit.fullName.split(' ')[0]}.png" onerror="this.style.display='none'"><span>${item.unit.name}</span><span class="candidate-percent">${item.pct}%</span>`; div.onclick = () => showUnitInfo(item.unit.fullName); list.appendChild(div); });
    document.getElementById('candidatesTitle').innerHTML = bcCondText((rowC ? rowC + ' ' : '') + (cC ? '+ ' + cC : ''), 20); document.getElementById('candidatesModal').classList.add('active');
}

async function saveEditorGrid() {
    const date = document.getElementById('editorDate').value; let name = editorState.name ? editorState.name.trim() : ""; if (!name) name = "Unnamed";
    if (!date) { showToast('Fill date!', 'error'); return; }
    const key = date;
    if (gridsData[key] && gridsData[key].completed && !gridsData[key].isLoss) { showToast('Cannot edit a completed grid!', 'error'); return; }
    const { solvable } = getUnsolvableCells(); if (!solvable) { showToast('Grid is unsolvable!', 'error'); return; }
    
    const newGrid = { date: key, title: name, conditions: { rows: [...editorState.rows], cols: [...editorState.cols] }, cells: Array(3).fill().map(()=>Array(3).fill(null)), completed: false, timer: 0, cannon: 'Default', cannonUses: CANNONS['Default'].uses, style: 'Default', foundation: 'Default', extraRow: [false,false,false], extraCol: [false,false,false], originalConditions: { rows: [...editorState.rows], cols: [...editorState.cols] }, forceLegend: false, isBrutal: editorState.isBrutal, brutalConds: editorState.isBrutal ? computeDeterministicBrutals({ date: key, isBrutal: true, originalConditions: { rows: [...editorState.rows], cols: [...editorState.cols] } }) : null, lives: 3, correctCount: 0, firstDamage: false, duplicateNextUnit: false, pinkBlink: null, yellowBlink: null, comboCount: 0, comboTimer: 0, maxCombo: 0, hadCurseSet: false, curseFired: false, _cachedCurseConds: null, hasLostLife: false, ironWallShieldUsed: false, holyRows: [false, false, false], holyMantles: 0, legendaryCount: 0 };
    
    if (currentUser && userProfile && userProfile.role === 'admin') {
        const { error } = await supabase.from('grids').insert([{
            date: key, title: name, conditions: newGrid.conditions, original_conditions: newGrid.originalConditions,
            brutal_conds: newGrid.brutalConds, status: 'daily', author_id: currentUser.id
        }]);
        if (error) showToast(error.message, "error"); else showToast('Grid published to Daily!', 'success');
    } else if (currentUser) {
        const { error } = await supabase.from('grids').insert([{
            title: name, conditions: newGrid.conditions, original_conditions: newGrid.originalConditions,
            brutal_conds: newGrid.brutalConds, status: 'pending', author_id: currentUser.id
        }]);
        if (error) showToast(error.message, "error"); else showToast('Grid submitted to Admin for review!', 'success');
    } else {
        showToast('Not logged in. Saving locally only.', 'error');
    }

    clearValidUnitsCache(); cellCache = {}; lastCacheState = ""; gridsData[key] = newGrid; saveGrids(); 
    closeEditorPage();
    if (currentGrid && currentGrid.date === key) openGrid(key);
}

function handleEditorSearch(q) {
    q = q.toLowerCase(); const resultsDiv = document.getElementById('editorUnitResults');
    if (q.length < 2) { resultsDiv.style.display = 'none'; return; }
    const results = PROCESSED_UNITS.filter(u => { if (u.name.toLowerCase().includes(q)) return true; return u.allNames.some(n => n.toLowerCase().includes(q)); }).slice(0, 10);
    if (!results.length) { resultsDiv.innerHTML = '<div style="padding:10px;color:#999;">Nothing found</div>'; resultsDiv.style.display = 'block'; return; }
    resultsDiv.innerHTML = '';
    results.forEach(u => { const item = document.createElement('div'); item.className = 'autocomplete-item'; item.innerHTML = `<img src="${IMG_UNITS}${u.fullName.split(' ')[0]}.png" onerror="this.style.display='none'"><span>${u.name}</span>`; item.onclick = () => { document.getElementById('editorUnitSearch').value = u.name; resultsDiv.style.display = 'none'; showUnitInfo(u.fullName); }; resultsDiv.appendChild(item); });
    resultsDiv.style.display = 'block';
}

function showBrutalInfo() { document.getElementById('brutalInfoModal').classList.add('active'); }
function closeBrutalInfoModal() { document.getElementById('brutalInfoModal').classList.remove('active'); }

async function init() {
    refreshAllBC(); buildUnits(); loadGrids(); renderCalendar(); await loadCustomCriteria(); 
    await initAuth();
    
    CANNONS['Default'] = { name: "Default Cannon", uses: 1, desc: "Fills a row with the WORST possible answers. (Uses: 1)" };
    CANNONS['SlowBeam'] = { name: "Slow Beam Cannon", uses: 2, desc: "Next unit placed can be placed again (duplicate). (Uses: 2)" };
    CANNONS['IronWall'] = { name: "Iron Wall Cannon", uses: 3, desc: "Shields a cell. Wrong answers won't cost a life. (Uses: 3)" };
    CANNONS['Thunderbolt'] = { name: "Thunderbolt Cannon", uses: 3, desc: "Fills a random cell. If full, pauses timer 5s. (Uses: 3)" };
    CANNONS['Waterblast'] = { name: "Waterblast Cannon", uses: 3, desc: "Pick a cell, get 3 options. Correct fills instantly. (Uses: 3)" };
    CANNONS['HolyBlast'] = { name: "Holy Blast Cannon", uses: 1, desc: "Leaves a golden trail on a row. Units placed there are upgraded by 1 rarity. (Uses: 1)" };
    CANNONS['Breakerblast'] = { name: "Breakerblast Cannon", uses: 5, desc: "Removes an answer from a cell. (Uses: 5)" };
    CANNONS['Curseblast'] = { name: "Curseblast Cannon", uses: 1, desc: "Adds a random constraint. All new answers become Legend rarity. (Uses: 1)" };

    document.getElementById('editorUnitSearch').addEventListener('input', function(e) { handleEditorSearch(e.target.value); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { cancelCannon(); closeWaterblastModal(); closeBrutalInfoModal(); } });

    const today = new Date();
    if (Object.keys(gridsData).length === 0) {
        const key = getDateKey(today);
        gridsData[key] = { date: key, title: "Daily Challenge", conditions: { rows: ["Rarity: Normal","Targets: Red","<200 range"], cols: ["Rarity: Rare","Targets: Floating","Area Attack"] }, cells: Array(3).fill().map(()=>Array(3).fill(null)), completed: false, timer: 0, cannon: 'Default', cannonUses: CANNONS['Default'].uses, style: 'Default', foundation: 'Default', extraRow: [false,false,false], extraCol: [false,false,false], originalConditions: { rows: ["Rarity: Normal","Targets: Red","<200 range"], cols: ["Rarity: Rare","Targets: Floating","Area Attack"] }, forceLegend: false, isBrutal: false, brutalConds: null, lives: 3, correctCount: 0, firstDamage: false, duplicateNextUnit: false, pinkBlink: null, yellowBlink: null, comboCount: 0, comboTimer: 0, maxCombo: 0, hadCurseSet: false, curseFired: false, _cachedCurseConds: null, hasLostLife: false, ironWallShieldUsed: false, holyRows: [false, false, false], holyMantles: 0, legendaryCount: 0 };
        saveGrids();
    }
    renderCalendar();
}
init();
