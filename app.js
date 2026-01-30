import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"]; // Add new members here
let currentUser = null;
let isAdmin = false;
let selectedAdminMember = null;

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
};

const showStatus = (msg, isError = false) => {
    const statusEl = document.createElement('div');
    statusEl.className = 'status-popup';
    statusEl.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    statusEl.innerText = msg;
    document.body.appendChild(statusEl);
    setTimeout(() => statusEl.remove(), 3000);
};

window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`;
    const lastDayNum = new Date(year, mon, 0).getDate();
    const lastDay = `${monthVal}-${String(lastDayNum).padStart(2, '0')}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    
    renderPersonalDashboard(meals || []);
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderGlobalBazarList(bazar || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
};

function renderPersonalDashboard(mList) {
    const userEmail = currentUser.email.toUpperCase();
    const memberName = membersList.find(m => userEmail.includes(m)) || "User";
    const userMeals = mList.filter(m => m.member === memberName).length;
    document.getElementById("personalStats").innerHTML = `User: <b>${memberName}</b> | Your Meals: <b>${userMeals}</b>`;
}

function renderCalendar(mList, monthYear) {
    const [y, m] = monthYear.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let html = `<thead><tr><th>Day</th>${membersList.map(name => `<th>${name}</th>`).join('')}</tr></thead><tbody>`;
    for (let i = 1; i <= days; i++) {
        const dStr = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(name => {
            const count = mList.filter(x => x.date === dStr && x.member === name).length;
            return `<td>${count || '-'}</td>`;
        }).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + "</tbody>";
}

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;
    let html = `<div class="summary-header"><p>Total Bazar: <b>${totalBazar}৳</b> | Total Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p></div><table class="pro-table"><thead><tr><th>Member</th><th>Meals</th><th>Cost</th><th>Paid</th><th>Status</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2);
        const bal = (paid - cost).toFixed(2);
        html += `<tr><td><b>${m}</b></td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td><td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table>";
}

function renderGlobalBazarList(bList) {
    document.getElementById("bazarList").innerHTML = `<h3>Recent Bazar</h3>` + bList.slice(-10).reverse().map(b => `
        <div class="bazar-item"><span>${b.date} - <b>${b.member}</b> (${b.item})</span><b>${b.price}৳</b></div>`).join('');
}

// --- NEW ADMIN RENDER ---
function renderAdmin(meals, bazar) {
    const listEl = document.getElementById("adminMemberList");
    listEl.innerHTML = membersList.map(m => `
        <button class="${selectedAdminMember === m ? 'active' : ''}" onclick="filterAdminByMember('${m}')">${m}</button>
    `).join('');

    if (!selectedAdminMember) return;

    const filteredMeals = meals.filter(m => m.member === selectedAdminMember);
    const filteredBazar = bazar.filter(b => b.member === selectedAdminMember);

    document.getElementById("adminDataHeader").innerHTML = `<h3>Managing: ${selectedAdminMember}</h3>`;

    document.getElementById("adminMealBody").innerHTML = filteredMeals.reverse().map(m => `
        <tr><td>${m.date}</td><td><button class="btn-del" onclick="del('meals','${m.id}')">✕</button></td></tr>
    `).join('') || '<tr><td>No records</td></tr>';

    document.getElementById("adminBazarBody").innerHTML = filteredBazar.reverse().map(b => `
        <tr><td>${b.item} (${b.price}৳)</td><td><button class="btn-del" onclick="del('bazar','${b.id}')">✕</button></td></tr>
    `).join('') || '<tr><td>No records</td></tr>';
}

window.filterAdminByMember = (name) => {
    selectedAdminMember = name;
    fetchData();
};

window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const dateType = document.getElementById("mealDateType").value;
    let date = (dateType === "tomorrow") ? getTomorrow() : (isAdmin && dateType === "custom" ? document.getElementById("mealDate").value : getToday());

    const entries = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    const { error } = await supabase.from('meals').insert(entries);
    if(!error) { showStatus(`Added ${count} meal(s) for ${date}`); fetchData(); }
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const member = document.getElementById("bazarMember").value;
    const { error } = await supabase.from('bazar').insert([{ member, item, price, date: getToday(), added_by: currentUser.id }]);
    if(!error) { showStatus("Bazar saved!"); document.getElementById("bazarItem").value = ""; document.getElementById("bazarPrice").value = ""; fetchData(); }
};

window.toggleAdminDate = () => {
    const type = document.getElementById("mealDateType").value;
    document.getElementById("mealDate").style.display = (type === 'custom') ? 'block' : 'none';
};

window.del = async (t, id) => { if(confirm("Delete?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};
window.logout = async () => { await supabase.auth.signOut(); location.reload(); };
window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
};

async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    const vMonth = document.getElementById("viewMonth");
    vMonth.innerHTML = "";
    for(let i=0; i<3; i++) {
        let d = new Date();
        let target = new Date(d.getFullYear(), d.getMonth() - i, 1);
        let val = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}`;
        let opt = document.createElement("option"); opt.value = val;
        opt.text = target.toLocaleString('default', { month: 'long', year: 'numeric' });
        vMonth.appendChild(opt);
    }

    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'USER'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    
    if(isAdmin) {
        document.getElementById("adminTabBtn").style.display = "block";
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
    }
    fetchData();
}

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
        if(error) alert(error.message);
    };
});
