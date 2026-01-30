import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null;

// Navigation
window.openTab = (tabId, index) => {
    document.querySelector(".tab-slider-container").style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

// Global Fetch
window.fetchData = async () => {
    const mVal = document.getElementById("viewMonth").value;
    if (!mVal) return;
    const [y, m] = mVal.split('-').map(Number);
    const fDay = `${mVal}-01`, lDay = `${mVal}-${new Date(y, m, 0).getDate()}`;

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

// --- Attendance (Full Name Fix) ---
function renderCalendar(mList, monthYear) {
    let html = `<thead><tr><th style="position:sticky; left:0; background:#f8fafc; z-index:2">Day</th>`;
    membersList.forEach(name => html += `<th style="min-width:75px">${name}</th>`);
    html += `</tr></thead><tbody>`;
    const days = new Date(...monthYear.split('-'), 0).getDate();
    for (let i = 1; i <= days; i++) {
        const dStr = `${monthYear}-${String(i).padStart(2,'0')}`;
        html += `<tr><td style="position:sticky; left:0; background:white; font-weight:bold; border-right:1px solid #eee">${i}</td>`;
        membersList.forEach(name => {
            const count = mList.filter(x => x.date === dStr && x.member === name).length;
            html += `<td style="color:${count > 0 ? '#3b82f6' : '#cbd5e1'}">${count || '-'}</td>`;
        });
        html += `</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + "</tbody>";
}

// --- Bill Logic (Restored Math) ---
window.calcPersonalBill = (m, mealBalance) => {
    const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
    const billsTotal = fields.reduce((sum, f) => sum + (Number(document.getElementById(`${f}-${m}`).value) || 0), 0);
    const final = billsTotal - mealBalance;
    const target = document.getElementById(`final-${m}`);
    target.innerText = final.toFixed(2) + "৳";
    target.style.color = final > 0 ? "#ef4444" : "#10b981";
};

function renderBillsTab(mList, bList, savedBills) {
    const totalB = bList.reduce((s, b) => s + b.price, 0), totalM = mList.length, rate = totalM ? (totalB / totalM) : 0;
    let html = `<table class="pro-table"><thead><tr><th>Name</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Bal</th><th>Total</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length, paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = Number((paid - (meals * rate)).toFixed(2));
        const s = savedBills.find(sb => sb.member === m) || {};
        html += `<tr><td><b>${m}</b></td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td style="font-weight:bold; color:${bal>=0?'#10b981':'#ef4444'}">${bal}৳</td>
            <td id="final-${m}" style="font-weight:bold">${(s.total_payable || (0-bal)).toFixed(2)}৳</td></tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
}

// --- Admin Logic (Delete Restored) ---
window.filterAdminByMember = (n) => { selectedAdminMember = n; fetchData(); };
window.del = async (table, id) => {
    if (!confirm("Delete?")) return;
    await supabase.from(table).delete().eq('id', id); fetchData();
};
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
    document.getElementById("adminBazarBody").innerHTML = fB.reverse().map(b => `<div class="bazar-row"><div><b>${b.item}</b><br><small>${b.date}</small></div><div style="display:flex; align-items:center; gap:8px"><b>${b.price}৳</b><button class="btn-del-mini" onclick="del('bazar','${b.id}')">✕</button></div></div>`).join('');
}

// --- Save & Auth ---
window.addMeal = async () => {
    const member = document.getElementById("mealMember").value, count = parseInt(document.getElementById("mealCount").value);
    const type = document.getElementById("mealDateType").value;
    let date = (type === 'today') ? new Date().toLocaleDateString('en-CA') : (type === 'tomorrow') ? new Date(Date.now() + 86400000).toLocaleDateString('en-CA') : document.getElementById("mealDate").value;
    await supabase.from('meals').insert(Array(count).fill({ member, date })); fetchData();
};

window.addBazar = async () => {
    const member = document.getElementById("bazarMember").value, item = document.getElementById("bazarItem").value, price = parseFloat(document.getElementById("bazarPrice").value);
    if (item && price) { await supabase.from('bazar').insert([{ member, item, price, date: new Date().toLocaleDateString('en-CA') }]); fetchData(); }
};

window.saveMonthlyBills = async () => {
    const month = document.getElementById("viewMonth").value;
    const updates = membersList.map(m => ({
        month, member: m,
        rent: Number(document.getElementById(`rent-${m}`).value) || 0,
        wifi: Number(document.getElementById(`wifi-${m}`).value) || 0,
        gas: Number(document.getElementById(`gas-${m}`).value) || 0,
        elec: Number(document.getElementById(`elec-${m}`).value) || 0,
        khala: Number(document.getElementById(`khala-${m}`).value) || 0,
        total_payable: parseFloat(document.getElementById(`final-${m}`).innerText)
    }));
    await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' }); alert("Saved!");
};

// --- Lifecycle ---
document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => { 
        if (session) { currentUser = session.user; afterLogin(); } 
        else { document.getElementById("loginDiv").style.display = "block"; }
    });
    document.getElementById("loginBtn").onclick = async () => { 
        await supabase.auth.signInWithPassword({ email: document.getElementById("email").value, password: document.getElementById("password").value });
    };
});

async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
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

function renderSummary(mList, bList) {
    const totalB = bList.reduce((s, b) => s + b.price, 0), totalM = mList.length, rate = totalM ? (totalB / totalM).toFixed(2) : 0;
    let html = `<div class="card" style="background:#1e293b; color:white; text-align:center">Bazar: ${totalB}৳ | Meals: ${totalM} | Rate: ${rate}৳</div><div class="table-container"><table class="pro-table"><thead><tr><th>MEMBER</th><th>MEALS</th><th>COST</th><th>PAID</th><th>STATUS</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length, paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2), bal = (paid - cost).toFixed(2);
        html += `<tr><td><b>${m}</b></td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td><td style="color:${bal>=0?'#10b981':'#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table></div>";
}
window.logout = async () => { await supabase.auth.signOut(); location.reload(); };
window.toggleAdminDate = () => { document.getElementById("mealDate").style.display = document.getElementById("mealDateType").value === 'custom' ? 'block' : 'none'; };
function renderBazarList(bList) { document.getElementById("bazarListContent").innerHTML = bList.slice().reverse().map(b => `<div class="bazar-row"><div><b>${b.item}</b><br><small>${b.member} • ${b.date}</small></div><b>${b.price}৳</b></div>`).join('') || '<p>No records</p>'; }
function renderPersonalStats(mList) { const name = membersList.find(m => currentUser.email.toUpperCase().includes(m)) || "User"; document.getElementById("personalStats").innerHTML = `User: <b>${name}</b> | Meals: <b>${mList.filter(m => m.member === name).length}</b>`; }
