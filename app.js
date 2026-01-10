import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"];
let currentUser = null;
let isAdmin = false;

const getToday = () => new Date().toLocaleDateString('en-CA');

// --- CORE DATA FUNCTIONS ---
window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`;
    const lastDayNum = new Date(year, mon, 0).getDate();
    const lastDay = `${monthVal}-${String(lastDayNum).padStart(2, '0')}`;

    // Clear UI to prevent bleeding
    document.getElementById("mealCalendar").innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";
    document.getElementById("summaryContent").innerHTML = "";

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
};

window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const dateInput = document.getElementById("mealDate");
    const date = (isAdmin && dateInput && dateInput.value) ? dateInput.value : getToday();

    const entries = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    const { error } = await supabase.from('meals').insert(entries);
    if(error) alert(error.message); else fetchData();
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const member = document.getElementById("bazarMember").value;
    const date = (isAdmin && document.getElementById("bazarDate").value) ? document.getElementById("bazarDate").value : getToday();

    if(!item || !price) return alert("Fill all fields");
    const { error } = await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]);
    
    if(error) alert(error.message);
    else {
        document.getElementById("bazarItem").value = "";
        document.getElementById("bazarPrice").value = "";
        fetchData();
    }
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
        html += `<tr><td><b>${m}</b></td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td>
                 <td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
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
    document.getElementById("bazarList").innerHTML = `<h3>Bazar Records</h3>` + bList.reverse().map(b => `
        <div class="bazar-item"><span>${b.date} - <b>${b.member}</b> (${b.item})</span><b style="color:#10b981">${b.price}৳</b></div>`).join('');
}

function renderAdmin(meals, bazar) {
    document.getElementById("adminMealBody").innerHTML = meals.map(m => `<tr><td>${m.date}</td><td>${m.member}</td><td><button class="btn-del" onclick="del('meals','${m.id}')">Del</button></td></tr>`).join('');
    document.getElementById("adminBazarBody").innerHTML = bazar.map(b => `<tr><td>${b.item}</td><td>${b.price}৳</td><td><button class="btn-del" onclick="del('bazar','${b.id}')">Del</button></td></tr>`).join('');
}

window.del = async (t, id) => { if(confirm("Delete?")) { await supabase.from(t).delete().eq('id', id); fetchData(); }};

// --- INITIALIZATION & AUTH ---
async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    // Set up months
    const vMonth = document.getElementById("viewMonth");
    vMonth.innerHTML = "";
    for(let i=0; i<3; i++) {
        let d = new Date(); d.setMonth(d.setMonth(new Date().getMonth() - i));
        let val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        vMonth.innerHTML += `<option value="${val}">${d.toLocaleString('default',{month:'long',year:'numeric'})}</option>`;
    }

    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'USER'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    document.getElementById("mealDate").value = document.getElementById("bazarDate").value = getToday();
    
    if(isAdmin) {
        document.getElementById("adminTabBtn").style.display = "block";
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
    }
    fetchData();
}

window.logout = async () => { await supabase.auth.signOut(); location.reload(); };

window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
};

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById("loginBtn");
    if(loginBtn) {
        loginBtn.onclick = async () => {
            const e = document.getElementById("email").value;
            const p = document.getElementById("password").value;
            const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
            if(error) alert(error.message);
        };
    }

    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            afterLogin();
        } else {
            document.getElementById("loginDiv").style.display = "block";
            document.getElementById("appDiv").style.display = "none";
        }
    });
});
