import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"];
let currentUser = null;
let isAdmin = false;

// --- HELPERS ---
const getToday = () => new Date().toLocaleDateString('en-CA');

const checkDateWindow = (selectedDate) => {
    const d = new Date(selectedDate);
    const now = new Date();
    const limit = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d >= limit;
};

// --- AUTH ---
async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) document.getElementById("loginMsg").innerText = "Invalid credentials";
}

window.logout = () => supabase.auth.signOut().then(() => location.reload());

// --- CORE DATA ---
async function fetchData() {
    const month = document.getElementById("viewMonth").value;
    const { data: meals } = await supabase.from('meals').select('*').gte('date', `${month}-01`).lte('date', `${month}-31`);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', `${month}-01`).lte('date', `${month}-31`);
    
    renderCalendar(meals || [], month);
    renderPersonalStats(meals || [], bazar || []);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
}

// --- ACTIONS ---
window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const date = isAdmin ? document.getElementById("mealDate").value : getToday();

    if (!checkDateWindow(date)) return alert("Forbidden: Older than previous month.");
    
    const entries = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    await supabase.from('meals').insert(entries);
    fetchData();
};

window.addBazar = async () => {
    const member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const date = isAdmin ? document.getElementById("bazarDate").value : getToday();

    if (!checkDateWindow(date)) return alert("Forbidden: Older than previous month.");
    await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]);
    fetchData();
};

// --- RENDERING ---
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const rate = mList.length ? (totalBazar / mList.length).toFixed(2) : 0;
    
    let html = `
        <div class="summary-stats">
            <div>TOTAL BAZAR: <b>${totalBazar}৳</b></div>
            <div>MEAL RATE: <b>${rate}৳</b></div>
        </div>
        <table class="pro-table">
            <thead><tr><th>Member</th><th>Meals</th><th>Paid</th><th>Status</th></tr></thead>
            <tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate);
        const bal = (paid - cost).toFixed(2);
        html += `<tr><td><b>${m}</b></td><td>${meals}</td><td>${paid}৳</td>
                 <td style="color:${bal >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table>";
}

function renderCalendar(mList, monthYear) {
    const [y, m] = monthYear.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let html = `<thead><tr><th>Day</th>${membersList.map(name => `<th>${name}</th>`).join('')}</tr></thead><tbody>`;
    for (let i = 1; i <= days; i++) {
        const dStr = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(name => `<td>${mList.filter(x => x.date === dStr && x.member === name).length || '-'}</td>`).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + "</tbody>";
}

function renderPersonalStats(mList, bList) {
    const name = emailToMember(currentUser.email);
    const meals = mList.filter(m => m.member === name).length;
    document.getElementById("personalStats").innerHTML = `<span>User: <strong>${name}</strong> | Your Meals: <strong>${meals}</strong></span>`;
}

function renderBazarList(bList) {
    document.getElementById("bazarList").innerHTML = `<h3>Bazar Records</h3>` + bList.map(b => `
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border)">
            <span>${b.date} - <b>${b.member}</b> (${b.item})</span>
            <b style="color:var(--success)">${b.price}৳</b>
        </div>`).join('');
}

// --- INITIALIZATION ---
function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    // Setup Dropdowns
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = isAdmin ? "block" : "none");
    const mSelect = document.getElementById("mealMember");
    const bSelect = document.getElementById("bazarMember");
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${emailToMember(currentUser.email)}</option>`;
    mSelect.innerHTML = bSelect.innerHTML = opt;

    // Month Selector (Last 2 Months)
    const vMonth = document.getElementById("viewMonth");
    vMonth.innerHTML = "";
    for(let i=0; i<2; i++) {
        let d = new Date(); d.setMonth(d.getMonth() - i);
        let val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        vMonth.innerHTML += `<option value="${val}">${d.toLocaleString('default',{month:'long',year:'numeric'})}</option>`;
    }

    document.getElementById("mealDate").value = getToday();
    document.getElementById("bazarDate").value = getToday();
    fetchData();
}

function emailToMember(email) {
    const map = {"shohan@mess.com":"SHOHAN","nabil@mess.com":"NABIL","tomal@mess.com":"TOMAL","abir@mess.com":"ABIR","masum@mess.com":"MASUM"};
    return map[email] || "GUEST";
}

window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

document.getElementById("loginBtn").onclick = login;
supabase.auth.onAuthStateChange((ev, ses) => { if(ses) { currentUser = ses.user; afterLogin(); } });
