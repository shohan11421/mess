import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = 'ALL';

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

// --- DATA FETCHING ---
window.fetchData = async () => {
    const monthVal = document.getElementById("viewMonth").value;
    if (!monthVal) return;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const [mealsRes, bazarRes, billsRes, scheduleRes] = await Promise.all([
        supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay),
        supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay),
        supabase.from('monthly_bills').select('*').eq('month', monthVal),
        supabase.from('bazar_schedule').select('*').order('date', { ascending: true })
    ]);

    const meals = mealsRes.data || [];
    const bazar = bazarRes.data || [];
    const savedBills = billsRes.data || [];
    const schedule = scheduleRes.data || [];

    renderPersonalStats(meals);
    renderCalendar(meals, monthVal);
    renderSummary(meals, bazar);
    renderBazarList(bazar);
    renderBillsTab(meals, bazar, savedBills);
    renderBazarSchedule(schedule);
    updateDailyNotification(schedule);
    
    if(isAdmin) renderAdmin(meals, bazar);
};

// --- CORE ACTIONS ---
window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const dateInput = document.getElementById("mealDateSource");
    let date = isAdmin ? dateInput.value : (dateInput.value === "today" ? getToday() : getTomorrow());
    if(!date) return alert("Select Date");
    await supabase.from('meals').insert(Array.from({length: count}, () => ({ member, date, added_by: currentUser.id })));
    fetchData();
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const member = document.getElementById("bazarMember").value;
    const dateInput = document.getElementById("bazarDateSource");
    let date = isAdmin ? dateInput.value : getToday();
    if(item && price && date) { 
        await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]); 
        document.getElementById("bazarItem").value=""; 
        document.getElementById("bazarPrice").value=""; 
        fetchData(); 
    } else { alert("Fill all fields"); }
};

// --- BAZAR SCHEDULE LOGIC ---
window.saveSchedule = async () => {
    const date = document.getElementById("scheduleDate").value;
    const member = document.getElementById("scheduleMember").value;
    const items = document.getElementById("scheduleItems").value; // Get the text field value
    
    if(!date || !member) return alert("Please select date and member.");

    try {
        const { error } = await supabase.from('bazar_schedule').upsert([{ 
            date, 
            member, 
            items_to_bring: items 
        }], { onConflict: 'date' });
        if (error) throw error;
        alert(`Assigned ${member}`);
        document.getElementById("scheduleItems").value = ""; // Clear text field
        fetchData(); 
    } catch (err) { alert("Failed: " + err.message); }
};

window.deleteSchedule = async (date) => {
    if(confirm(`Delete duty for ${date}?`)) {
        const { error } = await supabase.from('bazar_schedule').delete().eq('date', date);
        if (error) alert("Error: " + error.message);
        fetchData();
    }
};

function renderBazarSchedule(scheduleData) {
    const container = document.getElementById("bazarScheduleList");
    if (!container) return;
    const today = getToday();
    
    container.innerHTML = scheduleData.length ? scheduleData.slice(0, 6).map(s => `
        <div class="schedule-item ${s.date === today ? 'duty-today' : ''}" style="position:relative; padding-top:15px;">
            ${isAdmin ? `<button onclick="window.deleteSchedule('${s.date}')" style="position:absolute; top:2px; right:4px; border:none; background:none; color:#ef4444; font-weight:800; cursor:pointer; font-size:14px;">✕</button>` : ''}
            <span>${s.date === today ? 'TODAY' : s.date.split('-').slice(1).join('/')}</span>
            <b>${s.member}</b>
            ${s.items_to_bring ? `<div style="font-size:9px; margin-top:4px; color:#64748b; line-height:1.1; border-top:1px solid #ddd; pt-2px;">${s.items_to_bring}</div>` : ''}
        </div>
    `).join('') : '<p style="grid-column: 1/-1; text-align:center; padding:10px;">No schedule assigned</p>';
}

function updateDailyNotification(scheduleData) {
    const alertDiv = document.getElementById("bazarAlert");
    const nameEl = document.getElementById("todayBazarMember");
    const today = getToday();
    const todayDuty = scheduleData.find(s => s.date === today);
    
    if (todayDuty) {
        alertDiv.style.display = "block";
        nameEl.innerHTML = `${todayDuty.member} ${todayDuty.items_to_bring ? `<br><span style="font-size:12px; font-weight:400; color:#92400e;">🛒 To Bring: ${todayDuty.items_to_bring}</span>` : ''}`;
    } else {
        alertDiv.style.display = "none";
    }
}

// --- REMAINING RENDERING LOGIC ---
function renderPersonalStats(mList) {
    const name = membersList.find(m => currentUser.email.toUpperCase().includes(m)) || "User";
    const count = mList.filter(m => m.member === name).length;
    document.getElementById("personalStats").innerHTML = `User: <b>${name}</b> | Meals: <b>${count}</b>`;
}

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;
    let html = `<div class="card" style="background:#1e293b; color:white"><p>Total Bazar: <b>${totalBazar}৳</b> | Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p></div><table class="summary-table"><thead><tr><th>Member</th><th>Meals</th><th>Cost</th><th>Paid</th><th>Balance</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2);
        const bal = (paid - cost).toFixed(2);
        html += `<tr><td class="name-cell">${m}</td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td><td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table>";
}

function renderBazarList(bList) {
    document.getElementById("bazarMemberNav").innerHTML = `<button onclick="window.filterBazarByMember('ALL')">ALL</button>` + membersList.map(m => `<button class="${selectedBazarMember === m ? 'active' : ''}" onclick="window.filterBazarByMember('${m}')">${m}</button>`).join('');
    let display = (selectedBazarMember && selectedBazarMember !== 'ALL') ? bList.filter(b => b.member === selectedBazarMember) : bList;
    document.getElementById("bazarListContent").innerHTML = display.slice().reverse().map(b => `<div class="bazar-row"><div class="bazar-info"><b>${b.item}</b><br><small>${b.member} • ${b.date}</small></div><b>${b.price}৳</b></div>`).join('') || '<p style="text-align:center; padding:10px;">No records</p>';
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
    await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' });
    alert("Saved!");
};

window.renderBillsTab = (mList, bList, savedBills) => {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const rate = mList.length ? (totalBazar / mList.length) : 0;
    let html = `<table class="summary-table"><thead><tr><th>Member</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Meal Bal</th><th>Total</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = Number((paid - (meals * rate)).toFixed(2));
        const s = savedBills.find(sb => sb.member === m) || {};
        html += `<tr><td class="name-cell">${m}</td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td style="font-weight:bold; color:${bal>=0?'#10b981':'#ef4444'}"><span id="status-val-${m}">${bal}</span></td>
            <td id="final-${m}" style="font-weight:900;">${s.total_payable || '0.00'}৳</td></tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
};

window.renderAdmin = (meals, bazar) => {
    document.getElementById("adminMemberList").innerHTML = membersList.map(m => `<button class="${selectedAdminMember === m ? 'active' : ''}" onclick="window.filterAdminByMember('${m}')">${m}</button>`).join('');
    if (!selectedAdminMember) return;
    const fM = meals.filter(m => m.member === selectedAdminMember), fB = bazar.filter(b => b.member === selectedAdminMember);
    const gM = fM.reduce((acc, curr) => { acc[curr.date] = (acc[curr.date] || 0) + 1; return acc; }, {});
    document.getElementById("adminMealBody").innerHTML = Object.keys(gM).sort().reverse().map(d => `<tr><td>${d}</td><td>${gM[d]}</td><td><button onclick="window.adjustMeal('${selectedAdminMember}','${d}')">✕</button></td></tr>`).join('');
    document.getElementById("adminBazarBody").innerHTML = fB.reverse().map(b => `<tr><td style="text-align:left">${b.item}<br><small>${b.date}</small></td><td>${b.price}৳</td><td><button onclick="window.del('bazar','${b.id}')">✕</button></td></tr>`).join('');
};

window.adjustMeal = async (m, d) => { 
    const { data } = await supabase.from('meals').select('id').eq('member', m).eq('date', d).limit(1); 
    if (data.length) await supabase.from('meals').delete().eq('id', data[0].id); 
    fetchData(); 
};
window.del = async (t, id) => { if(confirm("Delete?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};
window.filterBazarByMember = (n) => { selectedBazarMember = n; fetchData(); };
window.filterAdminByMember = (n) => { selectedAdminMember = n; fetchData(); };
window.openTab = (n) => { 
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none"); 
    document.getElementById(n).style.display="block"; 
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};
window.logout = async () => { await supabase.auth.signOut(); location.reload(); };

document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => { 
        if (session) { currentUser = session.user; afterLogin(); } 
        else { document.getElementById("loginDiv").style.display = "block"; }
    });
    document.getElementById("loginBtn").onclick = async () => { 
        await supabase.auth.signInWithPassword({ 
            email: document.getElementById("email").value, 
            password: document.getElementById("password").value 
        }); 
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
    if (isAdmin) {
        document.getElementById("mealDateContainer").innerHTML = `<input type="date" id="mealDateSource" value="${getToday()}">`;
        document.getElementById("bazarDateContainer").innerHTML = `<input type="date" id="bazarDateSource" value="${getToday()}">`;
    } else {
        document.getElementById("mealDateContainer").innerHTML = `<select id="mealDateSource"><option value="today">Today</option><option value="tomorrow">Tomorrow</option></select>`;
        document.getElementById("bazarDateContainer").innerHTML = `<input type="text" id="bazarDateSource" value="Today" disabled>`;
    }
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'User'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    const scheduleSelect = document.getElementById("scheduleMember");
    if (scheduleSelect) scheduleSelect.innerHTML = membersList.map(m => `<option value="${m}">${m}</option>`).join('');
    if(isAdmin) { 
        document.getElementById("adminTabBtn").style.display = "block"; 
        document.getElementById("adminBillBtn").style.display = "block";
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block"); 
    }
    fetchData();
}
