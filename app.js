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
    
    // Admin Override: Use date picker. Regular User: Use Today.
    let date = isAdmin ? document.getElementById("mealDate").value : getToday();
    
    if (!date) return alert("Please select a valid date");

    const entries = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    const { error } = await supabase.from('meals').insert(entries);
    
    if(error) alert("Error saving meal: " + error.message);
    else {
        document.getElementById("mealCount").value = 1;
        fetchData(); // Refresh all views
    }
};

window.addBazar = async () => {
    const member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    
    // Admin Override: Use date picker. Regular User: Use Today.
    let date = isAdmin ? document.getElementById("bazarDate").value : getToday();

    if(!item || !price || !date) return alert("Please fill all fields correctly");

    const { error } = await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]);
    
    if(error) alert("Error saving bazar: " + error.message);
    else {
        document.getElementById("bazarItem").value = "";
        document.getElementById("bazarPrice").value = "";
        fetchData();
    }
};

async function fetchData() {
    const monthVal = document.getElementById("viewMonth").value; // e.g., "2026-01"
    
    const year = parseInt(monthVal.split('-')[0]);
    const mon = parseInt(monthVal.split('-')[1]);
    const lastDay = new Date(year, mon, 0).getDate();

    // Strict fetch within selected month boundaries
    const { data: meals } = await supabase.from('meals')
        .select('*')
        .gte('date', `${monthVal}-01`)
        .lte('date', `${monthVal}-${lastDay}`);
        
    const { data: bazar } = await supabase.from('bazar')
        .select('*')
        .gte('date', `${monthVal}-01`)
        .lte('date', `${monthVal}-${lastDay}`);
    
    // Render all components with strict current data
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
        <div class="summary-stats-banner">
            <div>TOTAL BAZAR: <b>${totalBazar}৳</b></div>
            <div>TOTAL MEALS: <b>${totalMeals}</b></div>
            <div>MEAL RATE: <b>${rate}৳</b></div>
        </div>
        <table class="pro-table">
            <thead><tr><th>Member</th><th>Meals</th><th>Cost</th><th>Paid</th><th>Balance</th></tr></thead>
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
            <td style="color:${bal >= 0 ? '#059669' : '#dc2626'}; font-weight:bold">${bal}৳</td>
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
    document.getElementById("bazarList").innerHTML = `<h3>Bazar Records</h3>` + bList.reverse().map(b => `
        <div class="bazar-row">
            <span>${b.date} - <b>${b.member}</b> (${b.item})</span>
            <b class="text-success">${b.price}৳</b>
        </div>`).join('');
}

function renderAdmin(meals, bazar) {
    const mTable = document.getElementById("adminMealTable");
    const bTable = document.getElementById("adminBazarTable");
    
    mTable.innerHTML = `<tr><th>Date</th><th>Member</th><th>Action</th></tr>` + meals.map(m => `
        <tr><td>${m.date}</td><td>${m.member}</td><td><button class="btn-del" onclick="del('meals','${m.id}')">Delete</button></td></tr>`).join('');
    
    bTable.innerHTML = `<tr><th>Item</th><th>Price</th><th>Action</th></tr>` + bazar.map(b => `
        <tr><td>${b.item}</td><td>${b.price}৳</td><td><button class="btn-del" onclick="del('bazar','${b.id}')">Delete</button></td></tr>`).join('');
}

window.del = async (t, id) => { 
    if(confirm("Confirm deletion?")) { 
        await supabase.from(t).delete().eq('id', id); 
        fetchData(); 
    }
};

// --- INITIALIZATION ---
async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    if(isAdmin) {
        document.getElementById("adminTabBtn").style.display = "block";
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
    }

    // Initialize Month Selector for everyone (Last month and Current month)
    const vMonth = document.getElementById("viewMonth");
    vMonth.innerHTML = "";
    for(let i=0; i<2; i++) {
        let d = new Date(); d.setMonth(d.getMonth() - i);
        let val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        vMonth.innerHTML += `<option value="${val}" ${i===0 ? 'selected' : ''}>${d.toLocaleString('default',{month:'long',year:'numeric'})}</option>`;
    }

    document.getElementById("mealDate").value = getToday();
    document.getElementById("bazarDate").value = getToday();

    // Admin can add for anyone; Users can only add for themselves
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'GUEST'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    
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
