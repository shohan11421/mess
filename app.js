import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = 'ALL';

// --- Navigation ---
window.openTab = (tabId, index) => {
    document.querySelector(".tab-slider-container").style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

// --- Data Fetch ---
window.fetchData = async () => {
    const mVal = document.getElementById("viewMonth").value;
    if (!mVal) return;
    const fDay = `${mVal}-01`, lDay = `${mVal}-${new Date(...mVal.split('-'), 0).getDate()}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', fDay).lte('date', lDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', fDay).lte('date', lDay);
    const { data: savedBills } = await supabase.from('monthly_bills').select('*').eq('month', mVal);
    
    renderCalendar(meals || [], mVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    renderBillsTab(meals || [], bazar || [], savedBills || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
    renderPersonalStats(meals || []);
};

// --- Summary (Mobile Fix) ---
function renderSummary(mList, bList) {
    const totalB = bList.reduce((s, b) => s + b.price, 0);
    const totalM = mList.length;
    const rate = totalM ? (totalB / totalM).toFixed(2) : 0;

    let html = `
        <div class="summary-box">
            <div>Total Bazar: <b>${totalB}৳</b> | Total Meals: <b>${totalM}</b> | Rate:</div>
            <h2>${rate}৳</h2>
        </div>
        <div class="card" style="padding:0">
            <table class="pro-table">
                <thead>
                    <tr><th>Member</th><th>Meals</th><th>Cost</th></tr>
                </thead>
                <tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const cost = (meals * rate).toFixed(2);
        html += `<tr><td>${m}</td><td>${meals}</td><td>${cost}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table></div>";
}

// --- Bazar (Admin Date Fix) ---
window.filterBazarByMember = (name) => { selectedBazarMember = name; fetchData(); };
window.addBazar = async () => {
    const member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value;
    const price = parseFloat(document.getElementById("bazarPrice").value);
    const customDate = document.getElementById("bazarDate").value;
    const date = (isAdmin && customDate) ? customDate : new Date().toLocaleDateString('en-CA');

    if (item && price) { 
        await supabase.from('bazar').insert([{ member, item, price, date }]); 
        document.getElementById("bazarItem").value = ""; 
        document.getElementById("bazarPrice").value = ""; 
        fetchData(); 
    }
};

function renderBazarList(bList) {
    document.getElementById("bazarMemberNav").innerHTML = membersList.map(m => `<button class="${selectedBazarMember === m ? 'active' : ''}" onclick="filterBazarByMember('${m}')">${m}</button>`).join('');
    let display = (selectedBazarMember === 'ALL') ? bList : bList.filter(b => b.member === selectedBazarMember);
    document.getElementById("bazarListContent").innerHTML = display.slice().reverse().map(b => `
        <div class="bazar-row">
            <div><b>${b.item}</b><small>${b.member} • ${b.date}</small></div>
            <div class="bazar-price">${b.price}৳</div>
        </div>`).join('');
}

// --- Admin & Meals ---
window.filterAdminByMember = (n) => { selectedAdminMember = n; fetchData(); };
window.del = async (table, id) => { if (confirm("Delete?")) { await supabase.from(table).delete().eq('id', id); fetchData(); } };
window.adjustMeal = async (member, date) => {
    const { data } = await supabase.from('meals').select('id').eq('member', member).eq('date', date).limit(1);
    if (data?.length > 0) window.del('meals', data[0].id);
};

function renderAdmin(meals, bazar) {
    document.getElementById("adminMemberList").innerHTML = membersList.map(m => `<button class="${selectedAdminMember === m ? 'active' : ''}" onclick="filterAdminByMember('${m}')">${m}</button>`).join('');
    if (!selectedAdminMember) return;
    const fM = meals.filter(m => m.member === selectedAdminMember), fB = bazar.filter(b => b.member === selectedAdminMember);
    const gM = fM.reduce((acc, curr) => { acc[curr.date] = (acc[curr.date] || 0) + 1; return acc; }, {});
    document.getElementById("adminMealBody").innerHTML = Object.keys(gM).sort().reverse().map(d => `<div class="bazar-row"><span>${d} (x${gM[d]})</span><button class="btn-del-mini" onclick="adjustMeal('${selectedAdminMember}','${d}')">✕</button></div>`).join('');
    document.getElementById("adminBazarBody").innerHTML = fB.reverse().map(b => `<div class="bazar-row"><div><b>${b.item}</b><small>${b.date}</small></div><button class="btn-del-mini" onclick="del('bazar','${b.id}')">✕</button></div>`).join('');
}

// --- Auth & Init ---
document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((ev, session) => { if (session) { currentUser = session.user; afterLogin(); } else { document.getElementById("loginDiv").style.display = "block"; } });
    document.getElementById("loginBtn").onclick = async () => { await supabase.auth.signInWithPassword({ email: document.getElementById("email").value, password: document.getElementById("password").value }); };
});

async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none"; document.getElementById("appDiv").style.display = "block";
    const vM = document.getElementById("viewMonth"); vM.innerHTML = "";
    for(let i=0; i<3; i++) {
        let t = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        vM.innerHTML += `<option value="${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}">${t.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`;
    }
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m))}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    if(isAdmin) document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block"); 
    fetchData();
}

// (Helper functions for Calendar, Bills, Stats, Logout go here - keep from previous version)
