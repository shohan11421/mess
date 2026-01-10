import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"];
let currentUser = null;
let isAdmin = false;

const getToday = () => new Date().toLocaleDateString('en-CA');

// --- DATA ACTIONS ---
window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    // Admin uses picker, User uses Today
    let date = isAdmin ? document.getElementById("mealDate").value : getToday();
    
    const entries = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    await supabase.from('meals').insert(entries);
    fetchData();
};

window.addBazar = async () => {
    const member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    let date = isAdmin ? document.getElementById("bazarDate").value : getToday();

    if(!item || !price) return alert("Please fill all fields");
    await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]);
    
    document.getElementById("bazarItem").value = "";
    document.getElementById("bazarPrice").value = "";
    fetchData();
};

async function fetchData() {
    const monthVal = document.getElementById("viewMonth").value; // e.g., "2026-01"
    const [year, mon] = monthVal.split('-').map(Number);
    
    // Get the first and last day of the selected month
    const firstDay = `${monthVal}-01`;
    const lastDayDate = new Date(year, mon, 0).getDate();
    const lastDay = `${monthVal}-${String(lastDayDate).padStart(2, '0')}`;

    // STRICT FILTERING: Only get data between firstDay and lastDay
    const { data: meals, error: mErr } = await supabase.from('meals')
        .select('*')
        .gte('date', firstDay)
        .lte('date', lastDay);
        
    const { data: bazar, error: bErr } = await supabase.from('bazar')
        .select('*')
        .gte('date', firstDay)
        .lte('date', lastDay);

    if (mErr || bErr) return console.error("Fetch Error:", mErr || bErr);
    
    // Clear and Redraw everything for the specific month
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
}
// --- UI RENDERING ---
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;
    
    let html = `
        <div class="summary-header">
            <p>Month Total: <b>${totalBazar}৳</b> | Total Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p>
        </div>
        <table class="data-table">
            <thead><tr><th>Member</th><th>Meals</th><th>Cost</th><th>Paid</th><th>Status</th></tr></thead>
            <tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2);
        const bal = (paid - cost).toFixed(2);
        
        html += `<tr>
            <td><b>${m}</b></td>
            <td>${meals}</td>
            <td>${cost}৳</td>
            <td>${paid}৳</td>
            <td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal >= 0 ? '+' : ''}${bal}৳</td>
        </tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table>";
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

function renderBazarList(bList) {
    document.getElementById("bazarList").innerHTML = `<h3 style="margin-bottom:15px">Monthly Bazar History</h3>` + bList.reverse().map(b => `
        <div class="bazar-item">
            <span>${b.date} - <b>${b.member}</b> (${b.item})</span>
            <span style="color:#10b981; font-weight:bold">${b.price}৳</span>
        </div>`).join('');
}

function renderAdmin(meals, bazar) {
    document.getElementById("adminMealBody").innerHTML = meals.map(m => `
        <tr><td>${m.date}</td><td>${m.member}</td><td><button class="btn-del" onclick="del('meals','${m.id}')">Del</button></td></tr>`).join('');
    document.getElementById("adminBazarBody").innerHTML = bazar.map(b => `
        <tr><td>${b.item}</td><td>${b.price}৳</td><td><button class="btn-del" onclick="del('bazar','${b.id}')">Del</button></td></tr>`).join('');
}

window.del = async (t, id) => { if(confirm("Permanently delete this record?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};

// --- SYSTEM FLOW ---
async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    if(isAdmin) {
        document.getElementById("adminTabBtn").style.display = "block";
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
    }

    const vMonth = document.getElementById("viewMonth");
    vMonth.innerHTML = "";
    // History Access: Current month + Previous 2 months
    for(let i=0; i<3; i++) {
        let d = new Date(); d.setMonth(d.getMonth() - i);
        let val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        vMonth.innerHTML += `<option value="${val}">${d.toLocaleString('default',{month:'long',year:'numeric'})}</option>`;
    }

    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'GUEST'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    document.getElementById("mealDate").value = document.getElementById("bazarDate").value = getToday();
    
    fetchData();
}

window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

window.logout = () => supabase.auth.signOut().then(() => location.reload());
document.getElementById("loginBtn").onclick = () => {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    supabase.auth.signInWithPassword({ email: e, password: p });
};
supabase.auth.onAuthStateChange((ev, ses) => { if(ses) { currentUser = ses.user; afterLogin(); } });

