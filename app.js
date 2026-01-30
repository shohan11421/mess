import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"]; 
let currentUser = null;
let isAdmin = false;
let selectedAdminMember = null;
let selectedBazarMember = null;

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
};

const showStatus = (msg, isError = false) => {
    const el = document.createElement('div');
    el.className = 'status-popup';
    el.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
};

window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`;
    const lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    
    renderPersonalDashboard(meals || []);
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderGlobalBazarList(bazar || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
};

function renderPersonalDashboard(mList) {
    const name = membersList.find(m => currentUser.email.toUpperCase().includes(m)) || "User";
    const count = mList.filter(m => m.member === name).length;
    document.getElementById("personalStats").innerHTML = `User: <b>${name}</b> | Meals: <b>${count}</b>`;
}

function renderCalendar(mList, monthYear) {
    const [y, m] = monthYear.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let html = `<thead><tr><th>Day</th>${membersList.map(n => `<th>${n}</th>`).join('')}</tr></thead><tbody>`;
    for (let i = 1; i <= days; i++) {
        const dStr = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(n => {
            const c = mList.filter(x => x.date === dStr && x.member === n).length;
            return `<td>${c || '-'}</td>`;
        }).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + "</tbody>";
}

function renderGlobalBazarList(bList) {
    const name = membersList.find(m => currentUser.email.toUpperCase().includes(m));
    const totalSpent = bList.reduce((s, b) => s + b.price, 0);
    const userSpent = bList.filter(b => b.member === name).reduce((s, b) => s + b.price, 0);

    document.getElementById("bazarStats").innerHTML = `
        <div class="stat-card"><span>Monthly Total</span><b>${totalSpent}৳</b></div>
        <div class="stat-card"><span>Your Total</span><b>${userSpent}৳</b></div>`;

    if (!selectedBazarMember) selectedBazarMember = name;

    document.getElementById("bazarMemberNav").innerHTML = membersList.map(m => `
        <button class="mini-tab ${selectedBazarMember === m ? 'active' : ''}" onclick="filterBazarByMember('${m}')">${m}</button>`).join('');

    const filtered = bList.filter(b => b.member === selectedBazarMember);
    const grouped = filtered.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = { total: 0, items: [] };
        acc[curr.date].total += curr.price;
        acc[curr.date].items.push(curr);
        return acc;
    }, {});

    const html = Object.keys(grouped).sort().reverse().map(date => `
        <div class="day-group">
            <div class="day-header"><span>${date}</span><span>Total: ${grouped[date].total}৳</span></div>
            ${grouped[date].items.map(item => `
                <div class="bazar-row">
                    <span class="item-name">${item.item}</span>
                    <b class="bazar-amount">${item.price}৳</b>
                </div>`).join('')}
        </div>`).join('');

    document.getElementById("bazarList").innerHTML = `<h4>${selectedBazarMember}'s Records</h4>` + (html || '<p style="text-align:center; padding:20px;">No entries.</p>');
}

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;
    let html = `<div class="summary-header"><p>Rate: <b>${rate}৳</b> | Total Bazar: <b>${totalBazar}৳</b></p></div><table class="pro-table"><thead><tr><th>Member</th><th>Meals</th><th>Cost</th><th>Status</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2);
        const bal = (paid - cost).toFixed(2);
        html += `<tr><td><b>${m}</b></td><td>${meals}</td><td>${cost}৳</td><td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table>";
}

function renderAdmin(meals, bazar) {
    document.getElementById("adminMemberList").innerHTML = membersList.map(m => `
        <button class="${selectedAdminMember === m ? 'active' : ''}" onclick="filterAdminByMember('${m}')">${m}</button>`).join('');

    if (!selectedAdminMember) return;
    const fMeals = meals.filter(m => m.member === selectedAdminMember);
    const fBazar = bazar.filter(b => b.member === selectedAdminMember);

    const groupedMeals = fMeals.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = { date: curr.date, count: 0 };
        acc[curr.date].count++; return acc;
    }, {});

    document.getElementById("adminDataHeader").innerHTML = `<h3>Managing: ${selectedAdminMember}</h3>`;
    document.getElementById("adminMealBody").innerHTML = Object.values(groupedMeals).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(g => `
        <tr><td>${g.date}</td><td><b>${g.count}</b></td><td>
            <button class="btn-del" onclick="adjustMeal('${selectedAdminMember}','${g.date}',-1)">−</button>
            <button class="btn-add" onclick="adjustMeal('${selectedAdminMember}','${g.date}',1)">+</button>
        </td></tr>`).join('') || '<tr><td>No meals</td></tr>';

    document.getElementById("adminBazarBody").innerHTML = fBazar.reverse().map(b => `
        <tr><td>${b.item} (${b.price}৳)</td><td><button class="btn-del" onclick="del('bazar','${b.id}')">✕</button></td></tr>`).join('') || '<tr><td>No bazar</td></tr>';
}

window.filterBazarByMember = (n) => { selectedBazarMember = n; fetchData(); };
window.filterAdminByMember = (n) => { selectedAdminMember = n; fetchData(); };

window.adjustMeal = async (m, d, c) => {
    if (c === 1) await supabase.from('meals').insert([{ member: m, date: d, added_by: currentUser.id }]);
    else {
        const { data } = await supabase.from('meals').select('id').eq('member', m).eq('date', d).limit(1);
        if (data.length) await supabase.from('meals').delete().eq('id', data[0].id);
    }
    fetchData();
};

window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const dateType = document.getElementById("mealDateType").value;
    let date = (dateType === "tomorrow") ? getTomorrow() : (isAdmin && dateType === "custom" ? document.getElementById("mealDate").value : getToday());
    const { error } = await supabase.from('meals').insert(Array.from({length: count}, () => ({ member, date, added_by: currentUser.id })));
    if(!error) { showStatus("Meal saved"); fetchData(); }
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const member = document.getElementById("bazarMember").value;
    const { error } = await supabase.from('bazar').insert([{ member, item, price, date: getToday(), added_by: currentUser.id }]);
    if(!error) { showStatus("Bazar saved"); document.getElementById("bazarItem").value=""; document.getElementById("bazarPrice").value=""; fetchData(); }
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
        let target = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        let val = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}`;
        let opt = document.createElement("option"); opt.value = val; opt.text = target.toLocaleString('default', { month: 'long', year: 'numeric' });
        vMonth.appendChild(opt);
    }
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'USER'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    if(isAdmin) { document.getElementById("adminTabBtn").style.display = "block"; document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block"); }
    fetchData();
}

document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => { if (session) { currentUser = session.user; afterLogin(); } else { document.getElementById("loginDiv").style.display = "block"; }});
    document.getElementById("loginBtn").onclick = async () => {
        const { error } = await supabase.auth.signInWithPassword({ email: document.getElementById("email").value, password: document.getElementById("password").value });
        if(error) alert(error.message);
    };
});
