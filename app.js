import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = 'ALL';

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

// --- CORE DATA FETCHING ---
window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    // Parallel fetching for performance
    const [mealsRes, bazarRes, billsRes] = await Promise.all([
        supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay),
        supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay),
        supabase.from('monthly_bills').select('*').eq('month', monthVal)
    ]);

    const meals = mealsRes.data || [];
    const bazar = bazarRes.data || [];
    const savedBills = billsRes.data || [];
    
    renderPersonalStats(meals);
    renderCalendar(meals, monthVal);
    renderSummary(meals, bazar);
    renderBazarList(bazar);
    renderBillsTab(meals, bazar, savedBills);
    
    if(isAdmin) renderAdmin(meals, bazar);
};

// --- PERSONAL BILL DATABASE LOGIC ---
window.saveMonthlyBills = async () => {
    const monthVal = document.getElementById("viewMonth").value;
    
    const updates = membersList.map(m => {
        const balVal = parseFloat(document.getElementById(`bal-val-${m}`).innerText) || 0;
        const totalPayable = parseFloat(document.getElementById(`final-${m}`).innerText) || 0;
        
        return {
            month: monthVal,
            member: m,
            rent: Number(document.getElementById(`rent-${m}`).value) || 0,
            wifi: Number(document.getElementById(`wifi-${m}`).value) || 0,
            gas: Number(document.getElementById(`gas-${m}`).value) || 0,
            elec: Number(document.getElementById(`elec-${m}`).value) || 0,
            khala: Number(document.getElementById(`khala-${m}`).value) || 0,
            meal_balance: balVal,
            total_payable: totalPayable
        };
    });

    const { error } = await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' });
    
    if (error) {
        alert("Error saving: " + error.message);
    } else {
        alert("Bills for " + monthVal + " saved successfully!");
    }
};

window.calcPersonalBill = (m, mealBalance) => {
    const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
    const billsTotal = fields.reduce((sum, f) => {
        return sum + (Number(document.getElementById(`${f}-${m}`).value) || 0);
    }, 0);

    const final = billsTotal - mealBalance;
    const target = document.getElementById(`final-${m}`);
    target.innerText = final.toFixed(2) + "৳";
    target.style.color = final > 0 ? "#ef4444" : "#10b981";
};

function renderBillsTab(mList, bList, savedBills) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals) : 0;

    let html = `<table class="summary-table">
        <thead>
            <tr>
                <th>Member</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Meal Bal</th><th>Total</th>
            </tr>
        </thead>
        <tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = Number((paid - (meals * rate)).toFixed(2));
        
        // Find existing DB data for this month
        const s = savedBills.find(sb => sb.member === m) || {};

        html += `<tr>
            <td class="name-cell">${m}</td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td id="bal-val-${m}" style="font-weight:bold; color:${bal >= 0 ? '#10b981' : '#ef4444'}">${bal}</td>
            <td id="final-${m}" style="font-weight:900;">${s.total_payable ? s.total_payable.toFixed(2) : '0.00'}৳</td>
        </tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
}

// --- UI RENDERING ---
function renderPersonalStats(mList) {
    const name = membersList.find(m => currentUser.email.toUpperCase().includes(m)) || "User";
    const count = mList.filter(m => m.member === name).length;
    document.getElementById("personalStats").innerHTML = `User: <b>${name}</b> | Meals: <b>${count}</b>`;
}

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;

    let html = `
        <div class="summary-black-card">
            <p>Total Bazar: <b>${totalBazar}৳</b> | Total Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p>
        </div>
        <div class="table-container">
            <table class="summary-table">
                <thead><tr><th>MEMBER</th><th>MEALS</th><th>COST</th><th>PAID</th><th>STATUS</th></tr></thead>
                <tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2);
        const bal = (paid - cost).toFixed(2);
        html += `<tr><td class="name-cell">${m}</td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td>
                 <td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table></div>";
}

function renderBazarList(bList) {
    document.getElementById("bazarMemberNav").innerHTML = `<button onclick="filterBazarByMember('ALL')">ALL</button>` + 
        membersList.map(m => `<button class="${selectedBazarMember === m ? 'active' : ''}" onclick="filterBazarByMember('${m}')">${m}</button>`).join('');
    
    let display = (selectedBazarMember && selectedBazarMember !== 'ALL') ? bList.filter(b => b.member === selectedBazarMember) : bList;
    document.getElementById("bazarCurrentViewTitle").innerText = selectedBazarMember === 'ALL' ? "All Records" : `Records: ${selectedBazarMember || 'Select Member'}`;
    document.getElementById("bazarListContent").innerHTML = display.slice().reverse().map(b => `
        <div class="bazar-row">
            <div class="bazar-info"><b>${b.item}</b><span>${b.member} • ${b.date}</span></div>
            <b>${b.price}৳</b>
        </div>`).join('') || '<p style="text-align:center; padding:10px;">No records</p>';
}

function renderCalendar(mList, monthYear) {
    const [y, m] = monthYear.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let html = `<thead><tr><th>Day</th>${membersList.map(n => `<th>${n[0]}</th>`).join('')}</tr></thead><tbody>`;
    for (let i = 1; i <= days; i++) {
        const dStr = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(n => {
            const c = mList.filter(x => x.date === dStr && x.member === n).length;
            return `<td>${c || '-'}</td>`;
        }).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + "</tbody>";
}

function renderAdmin(meals, bazar) {
    document.getElementById("adminMemberList").innerHTML = membersList.map(m => `<button class="${selectedAdminMember === m ? 'active' : ''}" onclick="filterAdminByMember('${m}')">${m}</button>`).join('');
    if (!selectedAdminMember) return;
    document.getElementById("adminCurrentTitle").innerText = `Editing: ${selectedAdminMember}`;
    const fM = meals.filter(m => m.member === selectedAdminMember), fB = bazar.filter(b => b.member === selectedAdminMember);
    const gM = fM.reduce((acc, curr) => { acc[curr.date] = (acc[curr.date] || 0) + 1; return acc; }, {});
    document.getElementById("adminMealBody").innerHTML = Object.keys(gM).sort().reverse().map(d => `<tr><td>${d}</td><td>${gM[d]}</td><td><button class="btn-del-mini" onclick="adjustMeal('${selectedAdminMember}','${d}')">✕</button></td></tr>`).join('');
    document.getElementById("adminBazarBody").innerHTML = fB.reverse().map(b => `<tr><td style="text-align:left">${b.item}<br><small>${b.date}</small></td><td>${b.price}৳</td><td><button class="btn-del-mini" onclick="del('bazar','${b.id}')">✕</button></td></tr>`).join('');
}

// --- ACTION HANDLERS ---
window.filterBazarByMember = (n) => { selectedBazarMember = n; fetchData(); };
window.filterAdminByMember = (n) => { selectedAdminMember = n; fetchData(); };
window.toggleAdminDate = () => { document.getElementById("mealDate").style.display = document.getElementById("mealDateType").value === 'custom' ? 'block' : 'none'; };

window.addMeal = async () => {
    const member = document.getElementById("mealMember").value, count = parseInt(document.getElementById("mealCount").value);
    const dateType = document.getElementById("mealDateType").value;
    let date = dateType === "tomorrow" ? getTomorrow() : (dateType === "custom" ? document.getElementById("mealDate").value : getToday());
    await supabase.from('meals').insert(Array.from({length: count}, () => ({ member, date, added_by: currentUser.id })));
    fetchData();
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value, price = Number(document.getElementById("bazarPrice").value), member = document.getElementById("bazarMember").value;
    let date = getToday();
    if(item && price) { 
        await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]); 
        document.getElementById("bazarItem").value=""; document.getElementById("bazarPrice").value=""; fetchData(); 
    }
};

window.openTab = (n) => { 
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none"); 
    document.getElementById(n).style.display="block"; 
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

window.logout = async () => { await supabase.auth.signOut(); location.reload(); };
window.del = async (t, id) => { if(confirm("Delete?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};
window.adjustMeal = async (m, d) => { 
    const { data } = await supabase.from('meals').select('id').eq('member', m).eq('date', d).limit(1); 
    if (data && data.length) await supabase.from('meals').delete().eq('id', data[0].id); 
    fetchData(); 
};

// --- AUTH & INITIALIZATION ---
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
    
    const vM = document.getElementById("viewMonth"); 
    vM.innerHTML = "";
    for(let i=0; i<3; i++) {
        let t = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        vM.innerHTML += `<option value="${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}">${t.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`;
    }
    
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'User'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    
    if(isAdmin) { 
        document.getElementById("adminTabBtn").style.display = "block"; 
        document.getElementById("adminBillBtn").style.display = "block";
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block"); 
    }
    fetchData();
}
