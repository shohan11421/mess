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
    const dateInput = document.getElementById("mealDate");
    const date = (isAdmin && dateInput.value) ? dateInput.value : getToday();

    if (count < 1) return alert("Enter at least 1 meal");

    const entries = Array.from({length: count}, () => ({ 
        member: member, 
        date: date, 
        added_by: currentUser.id 
    }));

    const { error } = await supabase.from('meals').insert(entries);
    if(error) alert(error.message);
    else {
        document.getElementById("mealCount").value = 1;
        fetchData();
    }
};

window.addBazar = async () => {
    const itemInput = document.getElementById("bazarItem");
    const priceInput = document.getElementById("bazarPrice");
    const member = document.getElementById("bazarMember").value;
    const dateInput = document.getElementById("bazarDate");
    const date = (isAdmin && dateInput.value) ? dateInput.value : getToday();

    if(!itemInput.value || !priceInput.value) return alert("Fill all fields");

    const { error } = await supabase.from('bazar').insert([{ 
        member: member, 
        item: itemInput.value, 
        price: Number(priceInput.value), 
        date: date,
        added_by: currentUser.id 
    }]);
    
    if(error) alert(error.message);
    else {
        itemInput.value = "";
        priceInput.value = "";
        fetchData();
    }
};

window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`;
    const lastDayNum = new Date(year, mon, 0).getDate();
    const lastDay = `${monthVal}-${String(lastDayNum).padStart(2, '0')}`;

    // Clear UI
    const cal = document.getElementById("mealCalendar");
    const sum = document.getElementById("summaryContent");
    if(cal) cal.innerHTML = "<tr><td colspan='6'>Refreshing...</td></tr>";

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
};

// --- UI RENDERING ---
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;
    
    let html = `
        <div class="summary-header">
            <p>Total Bazar: <b>${totalBazar}৳</b> | Total Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p>
        </div>
        <table class="pro-table">
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
            <td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td>
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
    const el = document.getElementById("mealCalendar");
    if(el) el.innerHTML = html + "</tbody>";
}

function renderBazarList(bList) {
    const el = document.getElementById("bazarList");
    if(!el) return;
    el.innerHTML = `<h3>Bazar Records</h3>` + bList.reverse().map(b => `
        <div class="bazar-item">
            <span>${b.date} - <b>${b.member}</b> (${b.item})</span>
            <b style="color:#10b981">${b.price}৳</b>
        </div>`).join('');
}

function renderAdmin(meals, bazar) {
    const mb = document.getElementById("adminMealBody");
    const bb = document.getElementById("adminBazarBody");
    if(mb) mb.innerHTML = meals.map(m => `<tr><td>${m.date}</td><td>${m.member}</td><td><button class="btn-del" onclick="del('meals','${m.id}')">Del</button></td></tr>`).join('');
    if(bb) bb.innerHTML = bazar.map(b => `<tr><td>${b.item}</td><td>${b.price}৳</td><td><button class="btn-del" onclick="del('bazar','${b.id}')">Del</button></td></tr>`).join('');
}

window.del = async (t, id) => { if(confirm("Permanently delete?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};

// --- AUTH & INIT ---
async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    const vMonth = document.getElementById("viewMonth");
    if(vMonth) {
        vMonth.innerHTML = "";
        for(let i=0; i<3; i++) {
            let d = new Date(); d.setMonth(d.getMonth() - i);
            let val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            vMonth.innerHTML += `<option value="${val}">${d.toLocaleString('default',{month:'long',year:'numeric'})}</option>`;
        }
    }

    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'USER'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    document.getElementById("mealDate").value = document.getElementById("bazarDate").value = getToday();
    
    if(isAdmin) {
        const btn = document.getElementById("adminTabBtn");
        if(btn) btn.style.display = "block";
    }
    
    fetchData();
}

window.logout = async () => { await supabase.auth.signOut(); location.reload(); };
window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

document.getElementById("loginBtn").onclick = () => {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    supabase.auth.signInWithPassword({ email: e, password: p });
};
supabase.auth.onAuthStateChange((ev, ses) => { if(ses) { currentUser = ses.user; afterLogin(); } });
