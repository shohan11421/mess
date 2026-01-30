import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- CONFIGURATION ---
const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"]; 
let currentUser = null;
let isAdmin = false;
let selectedAdminMember = null;

// --- UTILITIES ---
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

// --- DATA FETCHING ---
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

// --- RENDER FUNCTIONS ---
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

// --- PROFESSIONAL GROUPED ADMIN RENDER ---
function renderAdmin(meals, bazar) {
    const listEl = document.getElementById("adminMemberList");
    listEl.innerHTML = membersList.map(m => `
        <button class="${selectedAdminMember === m ? 'active' : ''}" onclick="filterAdminByMember('${m}')">${m}</button>
    `).join('');

    if (!selectedAdminMember) return;

    // 1. Group Meals by Date
    const filteredMeals = meals.filter(m => m.member === selectedAdminMember);
    const groupedMeals = filteredMeals.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = { date: curr.date, count: 0 };
        acc[curr.date].count++;
        return acc;
    }, {});

    // 2. Group Bazar by Date
    const filteredBazar = bazar.filter(b => b.member === selectedAdminMember);
    const groupedBazar = filteredBazar.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = { date: curr.date, total: 0, items: [] };
        acc[curr.date].total += curr.price;
        acc[curr.date].items.push(curr);
        return acc;
    }, {});

    document.getElementById("adminDataHeader").innerHTML = `<h3>Managing: ${selectedAdminMember}</h3>`;

    // Render Meals Table
    document.getElementById("adminMealBody").innerHTML = Object.values(groupedMeals)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(g => `
        <tr>
            <td style="text-align:left">${g.date}</td>
            <td><b>${g.count}</b></td>
            <td>
                <button class="btn-del" onclick="adjustMeal('${selectedAdminMember}', '${g.date}', -1)">−</button>
                <button class="btn-add" onclick="adjustMeal('${selectedAdminMember}', '${g.date}', 1)">+</button>
            </td>
        </tr>`).join('') || '<tr><td colspan="3">No records</td></tr>';

    // Render Grouped Bazar Table
    document.getElementById("adminBazarBody").innerHTML = Object.values(groupedBazar)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(g => `
        <tr style="background:#f1f5f9"><td colspan="3" style="text-align:left"><b>${g.date}</b> (Total: ${g.total}৳)</td></tr>
        ${g.items.map(item => `
            <tr>
                <td style="text-align:left; padding-left:20px; font-size:12px;">${item.item}</td>
                <td>${item.price}৳</td>
                <td><button class="btn-del" onclick="del('bazar','${item.id}')">✕</button></td>
            </tr>
        `).join('')}
    `).join('') || '<tr><td colspan="3">No records</td></tr>';
}

// --- ACTIONS ---
window.filterAdminByMember = (name) => {
    selectedAdminMember = name;
    fetchData();
};

window.adjustMeal = async (member, date, change) => {
    if (change === 1) {
        await supabase.from('meals').insert([{ member, date, added_by: currentUser.id }]);
        showStatus("Added 1 meal");
    } else {
        const { data } = await supabase.from('meals').select('id').eq('member', member).eq('date', date).limit(1);
        if (data && data.length > 0) {
            await supabase.from('meals').delete().eq('id', data[0].id);
            showStatus("Removed 1 meal");
        }
    }
    fetchData();
};

window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const dateType = document.getElementById("mealDateType").value;
    let date = (dateType === "tomorrow") ? getTomorrow() : (isAdmin && dateType === "custom" ? document.getElementById("mealDate").value : getToday());

    const entries = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    const { error } = await supabase.from('meals').insert(entries);
    if(!error) { showStatus(`Added ${count} meal(s)`); fetchData(); }
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

window.del = async (t, id) => { if(confirm("Delete record?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};
window.logout = async () => { await supabase.auth.signOut(); location.reload(); };

window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
};

// --- AUTH & INIT ---
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
