import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co'
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ" 
const supabase = createClient(supabaseUrl, supabaseKey)

const membersList = ["SHOHAN","NABIL","TOMAL","ABIR","MASUM"];
let currentUser = null;
let isAdmin = false;

// --- HELPERS ---
const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const isDateAllowed = (selectedDate) => {
    const dateObj = new Date(selectedDate);
    const now = new Date();
    const limitDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Start of previous month
    return dateObj >= limitDate;
};

// --- AUTH ---
async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) document.getElementById("loginMsg").innerText = error.message;
}

const logout = () => { supabase.auth.signOut().then(() => location.reload()); };

// --- CORE FUNCTIONS ---
async function fetchData() {
    const selectedMonth = document.getElementById("viewMonth").value;
    const { data: meals } = await supabase.from('meals').select('*').gte('date', `${selectedMonth}-01`).lte('date', `${selectedMonth}-31`);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', `${selectedMonth}-01`).lte('date', `${selectedMonth}-31`);
    const { data: schedule } = await supabase.from('bazar_schedule').select('*');

    renderCalendar(meals || [], selectedMonth);
    renderPersonalDashboard(meals || [], bazar || [], schedule || []);
    renderBazar(bazar || []);
    renderSummary(meals || [], bazar || []);
}

async function addMeal() {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    let date = isAdmin ? document.getElementById("mealDate").value : getLocalDate();

    if (!isDateAllowed(date)) return alert("Error: Date too old (Only Current/Prev Month allowed)");
    
    const rows = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    await supabase.from('meals').insert(rows);
    fetchData();
}

async function addBazar() {
    const member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    let date = isAdmin ? document.getElementById("bazarDate").value : getLocalDate();

    if (!isDateAllowed(date)) return alert("Error: Date too old");
    
    await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]);
    fetchData();
}

// --- RENDERING ---
function renderCalendar(mList, monthYear) {
    const [year, month] = monthYear.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    let html = `<tr><th>Day</th>${membersList.map(m => `<th>${m[0]}</th>`).join('')}</tr>`;
    for (let i = 1; i <= days; i++) {
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(m => {
            const count = mList.filter(ml => ml.date === dateStr && ml.member === m).length;
            return `<td>${count || '-'}</td>`;
        }).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html;
}

function renderPersonalDashboard(mList, bList, sList) {
    const myName = emailToMember(currentUser.email);
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const mealRate = mList.length ? (totalBazar / mList.length) : 0;
    const myMeals = mList.filter(m => m.member === myName).length;
    const myPaid = bList.filter(b => b.member === myName).reduce((s, b) => s + b.price, 0);
    const bal = (myPaid - (myMeals * mealRate)).toFixed(2);

    document.getElementById("myStatsContent").innerHTML = `
        <div style="display:flex; justify-content:space-between">
            <span>Meals: <b>${myMeals}</b></span><span>Paid: <b>${myPaid}৳</b></span>
            <span>Bal: <b style="color:${bal>=0?'green':'red'}">${bal}৳</b></span>
        </div>`;
}

function renderBazar(bList) {
    document.getElementById("bazarList").innerHTML = bList.map(b => `
        <div class="receipt-card">
            <div class="receipt-info"><span>${b.date}</span><br><span>${b.member}</span></div>
            <div class="receipt-main"><span>${b.item}</span><br><span style="color:green">${b.price}৳</span></div>
        </div>`).join('');
}

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const mealRate = mList.length ? (totalBazar / mList.length).toFixed(2) : 0;
    let html = `<p><b>Total Bazar:</b> ${totalBazar}৳ | <b>Meal Rate:</b> ${mealRate}৳</p><hr>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        html += `<p>${m}: Meals ${meals} | Bal: ${(paid - (meals * mealRate)).toFixed(2)}৳</p>`;
    });
    document.getElementById("summaryContent").innerHTML = html;
}

// --- APP FLOW ---
function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    document.getElementById("adminTabBtn").style.display = isAdmin ? "inline-block" : "none";
    
    // Admin only fields
    document.querySelectorAll(".admin-date").forEach(el => el.style.display = isAdmin ? "block" : "none");

    const selects = [document.getElementById("mealMember"), document.getElementById("bazarMember"), document.getElementById("schMem")];
    selects.forEach(s => {
        if(s) s.innerHTML = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${emailToMember(currentUser.email)}</option>`;
    });

    // Month Select Initialization (Rolling 2 Months)
    const monthSelect = document.getElementById("viewMonth");
    monthSelect.innerHTML = "";
    for (let i = 0; i < 2; i++) {
        let d = new Date(); d.setMonth(d.getMonth() - i);
        let val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        monthSelect.innerHTML += `<option value="${val}">${d.toLocaleString('default',{month:'long',year:'numeric'})}</option>`;
    }

    document.getElementById("mealDate").value = getLocalDate();
    document.getElementById("bazarDate").value = getLocalDate();
    fetchData();
}

function emailToMember(email) {
    const map = {"shohan@mess.com":"SHOHAN","nabil@mess.com":"NABIL","tomal@mess.com":"TOMAL","abir@mess.com":"ABIR","masum@mess.com":"MASUM"};
    return map[email] || "GUEST";
}

// EXPOSE TO GLOBAL
window.logout = logout;
window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
    if(n === 'admin') fetchAdminData();
};
window.addMeal = addMeal; window.addBazar = addBazar; window.fetchData = fetchData;

document.getElementById("loginBtn").onclick = login;
document.getElementById("addMealBtn").onclick = addMeal;
document.getElementById("addBazarBtn").onclick = addBazar;

supabase.auth.onAuthStateChange((ev, ses) => { if(ses) { currentUser = ses.user; afterLogin(); } });
