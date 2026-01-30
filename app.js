import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = null;

// Navigation Slider
window.openTab = (tabId, index) => {
    const container = document.querySelector(".tab-slider-container");
    container.style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

// Data Fetching
window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: savedBills } = await supabase.from('monthly_bills').select('*').eq('month', monthVal);
    
    renderPersonalStats(meals || []);
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    renderBillsTab(meals || [], bazar || [], savedBills || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
};

// Attendance - Full Name Display
function renderCalendar(mList, monthYear) {
    const [y, m] = monthYear.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    
    let html = `<thead><tr><th style="position:sticky; left:0; background:white; z-index:2">Day</th>`;
    membersList.forEach(name => {
        html += `<th style="min-width:70px; font-size:10px">${name}</th>`;
    });
    html += `</tr></thead><tbody>`;

    for (let i = 1; i <= days; i++) {
        const dStr = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td style="position:sticky; left:0; background:white; font-weight:bold; border-right:1px solid #eee">${i}</td>`;
        membersList.forEach(name => {
            const count = mList.filter(x => x.date === dStr && x.member === name).length;
            html += `<td style="color:${count > 0 ? '#3b82f6' : '#cbd5e1'}">${count || '-'}</td>`;
        });
        html += `</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + "</tbody>";
}

// Personal Bills Calculation & Saving
window.calcPersonalBill = (m, mealBalance) => {
    const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
    const billsTotal = fields.reduce((sum, f) => sum + (Number(document.getElementById(`${f}-${m}`).value) || 0), 0);
    const final = billsTotal - mealBalance;
    const target = document.getElementById(`final-${m}`);
    target.innerText = final.toFixed(2) + "৳";
    target.style.color = final > 0 ? "#ef4444" : "#10b981";
};

window.saveMonthlyBills = async () => {
    const month = document.getElementById("viewMonth").value;
    const updates = membersList.map(m => {
        const mealBal = Number(document.getElementById(`status-val-${m}`).innerText) || 0;
        return {
            month, member: m,
            rent: Number(document.getElementById(`rent-${m}`).value) || 0,
            wifi: Number(document.getElementById(`wifi-${m}`).value) || 0,
            gas: Number(document.getElementById(`gas-${m}`).value) || 0,
            elec: Number(document.getElementById(`elec-${m}`).value) || 0,
            khala: Number(document.getElementById(`khala-${m}`).value) || 0,
            meal_balance: mealBal,
            total_payable: parseFloat(document.getElementById(`final-${m}`).innerText)
        };
    });
    const { error } = await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' });
    alert(error ? "Error: " + error.message : "Monthly Records Saved!");
};

function renderBillsTab(mList, bList, savedBills) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const rate = mList.length ? (totalBazar / mList.length) : 0;
    let html = `<table class="summary-table"><thead><tr><th>Name</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Bal</th><th>Total</th></tr></thead><tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = Number((paid - (meals * rate)).toFixed(2));
        const s = savedBills.find(sb => sb.member === m) || {};

        html += `<tr><td class="name-cell" style="font-size:11px">${m}</td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td style="font-weight:bold; color:${bal>=0?'#10b981':'#ef4444'}"><span id="status-val-${m}">${bal}</span></td>
            <td id="final-${m}" style="font-weight:900;">${s.total_payable || '0.00'}৳</td></tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
}

// Summary Rendering
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;
    let html = `<div class="summary-black-card"><p>Bazar: <b>${totalBazar}৳</b> | Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p></div><div class="table-container"><table class="summary-table"><thead><tr><th>MEMBER</th><th>MEALS</th><th>COST</th><th>PAID</th><th>STATUS</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2), bal = (paid - cost).toFixed(2);
        html += `<tr><td class="name-cell">${m}</td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td><td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table></div>";
}

// Admin Panel Logic
window.filterAdminByMember = (n) => { selectedAdminMember = n; fetchData(); };
function renderAdmin(meals, bazar) {
    document.getElementById("adminMemberList").innerHTML = membersList.map(m => `<button class="${selectedAdminMember === m ? 'active' : ''}" onclick="filterAdminByMember('${m}')">${m}</button>`).join('');
    if (!selectedAdminMember) return;
    const fM = meals.filter(m => m.member === selectedAdminMember), fB = bazar.filter(b => b.member === selectedAdminMember);
    const gM = fM.reduce((acc, curr) => { acc[curr.date] = (acc[curr.date] || 0) + 1; return acc; }, {});
    document.getElementById("adminMealBody").innerHTML = Object.keys(gM).sort().reverse().map(d => `<div class="bazar-row"><span>${d}</span><b>${gM[d]}</b></div>`).join('');
    document.getElementById("adminBazarBody").innerHTML = fB.reverse().map(b => `<div class="bazar-row"><div><b>${b.item}</b><br><small>${b.date}</small></div><b>${b.price}৳</b></div>`).join('');
}

// Auth & Lifecycle
document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => { 
        if (session) { currentUser = session.user; afterLogin(); } 
        else { document.getElementById("loginDiv").style.display = "block"; }
    });
    document.getElementById("loginBtn").onclick = async () => { 
        const { error } = await supabase.auth.signInWithPassword({ 
            email: document.getElementById("email").value, 
            password: document.getElementById("password").value 
        });
        if (error) alert(error.message);
    };
});

async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    const vM = document.getElementById("viewMonth");
    for(let i=0; i<3; i++) {
        let t = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        v
