import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = null, isSettlementVisible = false;
// ... (Keep your Supabase init and other functions exactly as they are) ...

// Ensure these variables are at the TOP of your app.js
let isSettlementVisible = false;

window.toggleSettlement = () => {
    isSettlementVisible = !isSettlementVisible;
    const btn = document.getElementById("publishBtn");
    if (btn) {
        btn.innerText = `Show Settlement: ${isSettlementVisible ? 'ON' : 'OFF'}`;
        btn.style.background = isSettlementVisible ? "#10b981" : "#fff7ed";
        btn.style.color = isSettlementVisible ? "white" : "#b45309";
    }
    renderFinalSettlement();
};

window.renderFinalSettlement = () => {
    const wrapper = document.getElementById("finalSettlementWrapper");
    const body = document.getElementById("finalSettlementBody");
    if (!wrapper || !body) return;

    // Show if Admin is logged in OR if Admin turned on "Publication"
    if (isAdmin || isSettlementVisible) {
        wrapper.style.display = "block";
        const summaryRows = document.querySelectorAll("#summaryContent table tbody tr");
        let html = "";

        summaryRows.forEach((row, index) => {
            const name = row.cells[0].innerText;
            const mealBal = parseFloat(row.cells[4].innerText.replace('৳', '')) || 0;

            html += `
                <tr>
                    <td class="name-cell">${name}</td>
                    <td style="color:${mealBal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${mealBal >= 0 ? '+' : ''}${mealBal.toFixed(0)}৳</td>
                    <td contenteditable="${isAdmin}" class="editable-bill" id="rent-${index}" oninput="calcTotalNet(${index}, ${mealBal})">0</td>
                    <td contenteditable="${isAdmin}" class="editable-bill" id="wifi-${index}" oninput="calcTotalNet(${index}, ${mealBal})">0</td>
                    <td contenteditable="${isAdmin}" class="editable-bill" id="gas-${index}" oninput="calcTotalNet(${index}, ${mealBal})">0</td>
                    <td contenteditable="${isAdmin}" class="editable-bill" id="elect-${index}" oninput="calcTotalNet(${index}, ${mealBal})">0</td>
                    <td contenteditable="${isAdmin}" class="editable-bill" id="khala-${index}" oninput="calcTotalNet(${index}, ${mealBal})">0</td>
                    <td id="totalNet-${index}" style="font-weight:800; background:#f0fdf4;">${(0 - mealBal).toFixed(0)}৳</td>
                </tr>`;
        });
        body.innerHTML = html;
    } else {
        wrapper.style.display = "none";
    }
};

window.calcTotalNet = (idx, mealBal) => {
    const r = parseFloat(document.getElementById(`rent-${idx}`).innerText) || 0;
    const w = parseFloat(document.getElementById(`wifi-${idx}`).innerText) || 0;
    const g = parseFloat(document.getElementById(`gas-${idx}`).innerText) || 0;
    const e = parseFloat(document.getElementById(`elect-${idx}`).innerText) || 0;
    const k = parseFloat(document.getElementById(`khala-${idx}`).innerText) || 0;

    const totalBills = r + w + g + e + k;
    const netPayable = totalBills - mealBal;
    
    document.getElementById(`totalNet-${idx}`).innerText = netPayable.toFixed(0) + "৳";
};
const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    
    renderPersonalStats(meals || []);
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
    renderFinalSettlement();
};

function renderPersonalStats(mList) {
    const name = membersList.find(m => currentUser.email.toUpperCase().includes(m)) || "User";
    const count = mList.filter(m => m.member === name).length;
    document.getElementById("personalStats").innerHTML = `User: <b>${name}</b> | Meals: <b>${count}</b>`;
}

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;

    let html = `<div class="summary-black-card"><p>Total Bazar: <b>${totalBazar}৳</b> | Total Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p></div><div class="table-container"><table class="summary-table"><thead><tr><th>MEMBER</th><th>MEALS</th><th>COST</th><th>PAID</th><th>STATUS</th></tr></thead><tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2);
        const bal = (paid - cost).toFixed(2);
        html += `<tr><td class="name-cell">${m}</td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td><td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table></div>";
}

window.toggleSettlement = () => {
    isSettlementVisible = !isSettlementVisible;
    const btn = document.getElementById("publishBtn");
    btn.innerText = `Show Settlement: ${isSettlementVisible ? 'ON' : 'OFF'}`;
    btn.style.background = isSettlementVisible ? "#10b981" : "#fff7ed";
    btn.style.color = isSettlementVisible ? "white" : "#b45309";
    renderFinalSettlement();
};

window.renderFinalSettlement = () => {
    const wrapper = document.getElementById("finalSettlementWrapper");
    const body = document.getElementById("finalSettlementBody");
    if (!wrapper || !body) return;
    if (isAdmin || isSettlementVisible) {
        wrapper.style.display = "block";
        const summaryRows = document.querySelectorAll("#summaryContent table tbody tr");
        let html = "";
        summaryRows.forEach((row, index) => {
            const name = row.cells[0].innerText;
            const mealBal = parseFloat(row.cells[4].innerText.replace('৳', '')) || 0;
            html += `<tr><td class="name-cell">${name}</td><td style="text-align:center; color:${mealBal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${mealBal >= 0 ? '+' : ''}${mealBal.toFixed(0)}৳</td><td contenteditable="${isAdmin}" class="${isAdmin ? 'editable-bill' : ''}" id="other-${index}" oninput="calcNet(${index}, ${mealBal})" style="text-align:center;">0</td><td id="net-${index}" style="text-align:center; font-weight:800; background:#f0fdf4;">${(0 - mealBal).toFixed(0)}৳</td></tr>`;
        });
        body.innerHTML = html;
    } else { wrapper.style.display = "none"; }
};

window.calcNet = (idx, mealBal) => {
    const val = parseFloat(document.getElementById(`other-${idx}`).innerText) || 0;
    document.getElementById(`net-${idx}`).innerText = (val - mealBal).toFixed(0) + "৳";
};

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

function renderBazarList(bList) {
    document.getElementById("bazarMemberNav").innerHTML = membersList.map(m => `<button class="${selectedBazarMember === m ? 'active' : ''}" onclick="filterBazarByMember('${m}')">${m}</button>`).join('');
    let display = (selectedBazarMember && selectedBazarMember !== 'ALL') ? bList.filter(b => b.member === selectedBazarMember) : bList;
    document.getElementById("bazarCurrentViewTitle").innerText = selectedBazarMember === 'ALL' ? "All Records" : `Records: ${selectedBazarMember || 'All'}`;
    document.getElementById("bazarListContent").innerHTML = display.slice().reverse().map(b => `<div class="bazar-row"><div class="bazar-info"><b>${b.item}</b><span>${b.member} • ${b.date}</span></div><b>${b.price}৳</b></div>`).join('') || '<p style="text-align:center; padding:10px;">No records</p>';
}

function renderAdmin(meals, bazar) {
    document.getElementById("adminMemberList").innerHTML = membersList.map(m => `<button class="${selectedAdminMember === m ? 'active' : ''}" onclick="filterAdminByMember('${m}')">${m}</button>`).join('');
    if (!selectedAdminMember) return;
    document.getElementById("adminCurrentTitle").innerText = `Editing: ${selectedAdminMember}`;
    const fM = meals.filter(m => m.member === selectedAdminMember), fB = bazar.filter(b => b.member === selectedAdminMember);
    const gM = fM.reduce((acc, curr) => { acc[curr.date] = (acc[curr.date] || 0) + 1; return acc; }, {});
    document.getElementById("adminMealBody").innerHTML = `<table class="pro-table mini-table"><tbody>` + Object.keys(gM).sort().reverse().map(d => `<tr><td>${d}</td><td>${gM[d]}</td><td><button class="btn-del-mini" onclick="adjustMeal('${selectedAdminMember}','${d}')">✕</button></td></tr>`).join('') + `</tbody></table>`;
    document.getElementById("adminBazarBody").innerHTML = `<table class="pro-table mini-table"><tbody>` + fB.reverse().map(b => `<tr><td style="text-align:left">${b.item}<br><small>${b.date}</small></td><td>${b.price}৳</td><td><button class="btn-del-mini" onclick="del('bazar','${b.id}')">✕</button></td></tr>`).join('') + `</tbody></table>`;
}

window.filterBazarByMember = (n) => { selectedBazarMember = n; fetchData(); };
window.filterAdminByMember = (n) => { selectedAdminMember = n; fetchData(); };
window.toggleAdminDate = () => { document.getElementById("mealDate").style.display = document.getElementById("mealDateType").value === 'custom' ? 'block' : 'none'; };
window.toggleBazarAdminDate = () => { document.getElementById("bazarDate").style.display = document.getElementById("bazarDateType").value === 'custom' ? 'block' : 'none'; };

window.addMeal = async () => {
    const member = document.getElementById("mealMember").value, count = parseInt(document.getElementById("mealCount").value);
    const dateType = document.getElementById("mealDateType").value;
    let date = dateType === "tomorrow" ? getTomorrow() : (dateType === "custom" ? document.getElementById("mealDate").value : getToday());
    await supabase.from('meals').insert(Array.from({length: count}, () => ({ member, date, added_by: currentUser.id })));
    fetchData();
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value, price = Number(document.getElementById("bazarPrice").value), member = document.getElementById("bazarMember").value;
    const dateType = document.getElementById("bazarDateType").value;
    let date = (isAdmin && dateType === "custom") ? document.getElementById("bazarDate").value : getToday();
    if(item && price && date) { await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]); document.getElementById("bazarItem").value=""; document.getElementById("bazarPrice").value=""; fetchData(); }
};

window.openTab = (n) => { 
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none"); 
    document.getElementById(n).style.display="block"; 
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

window.logout = async () => { await supabase.auth.signOut(); location.reload(); };
window.del = async (t, id) => { if(confirm("Delete?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};
window.adjustMeal = async (m, d) => { const { data } = await supabase.from('meals').select('id').eq('member', m).eq('date', d).limit(1); if (data.length) await supabase.from('meals').delete().eq('id', data[0].id); fetchData(); };

document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => { if (session) { currentUser = session.user; afterLogin(); } else { document.getElementById("loginDiv").style.display = "block"; }});
    document.getElementById("loginBtn").onclick = async () => { await supabase.auth.signInWithPassword({ email: document.getElementById("email").value, password: document.getElementById("password").value }); };
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
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'User'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    if(isAdmin) { document.getElementById("adminTabBtn").style.display = "block"; document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block"); }
    fetchData();
}

