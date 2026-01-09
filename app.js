import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"];
let currentUser = null;
let isAdmin = false;

// --- UTILS ---
const getLocalDate = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

const isDateAllowed = (selectedDate) => {
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
    if(error) document.getElementById("loginMsg").innerText = "Authentication Failed";
}

const logout = () => supabase.auth.signOut().then(() => location.reload());

// --- CORE APP ---
async function fetchData() {
    const selectedMonth = document.getElementById("viewMonth").value;
    const { data: meals } = await supabase.from('meals').select('*').gte('date', `${selectedMonth}-01`).lte('date', `${selectedMonth}-31`);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', `${selectedMonth}-01`).lte('date', `${selectedMonth}-31`);
    
    renderCalendar(meals || [], selectedMonth);
    renderPersonalStats(meals || [], bazar || []);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
}

async function addMeal() {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const date = isAdmin ? document.getElementById("mealDate").value : getLocalDate();

    if (!isDateAllowed(date)) return alert("Forbidden: Date exceeds 2-month limit.");
    
    const entries = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    await supabase.from('meals').insert(entries);
    fetchData();
}

async function addBazar() {
    const member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const date = isAdmin ? document.getElementById("bazarDate").value : getLocalDate();

    if (!isDateAllowed(date)) return alert("Forbidden: Date exceeds 2-month limit.");

    await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]);
    fetchData();
}

// --- UI RENDERING ---
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const mealRate = mList.length ? (totalBazar / mList.length).toFixed(2) : 0;
    
    let html = `
        <div style="margin-bottom: 1rem; font-weight: 600;">
            Rate: <span style="color:var(--accent)">${mealRate}৳</span> | 
            Total: ${totalBazar}৳
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Member</th>
                    <th>Meals</th>
                    <th>Total Cost</th>
                    <th>Deposited</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * mealRate).toFixed(2);
        const balance = (paid - cost).toFixed(2);

        html += `
            <tr>
                <td><strong>${m}</strong></td>
                <td>${meals}</td>
                <td>${cost}৳</td>
                <td>${paid}৳</td>
                <td style="color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">
                    ${balance >= 0 ? '+' : ''}${balance}৳
                </td>
            </tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + `</tbody></table>`;
}

function renderCalendar(mList, monthYear) {
    const [year, month] = monthYear.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    
    let html = `<thead><tr><th>Day</th>${membersList.map(m => `<th>${m}</th>`).join('')}</tr></thead><tbody>`;
    for (let i = 1; i <= days; i++) {
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(m => {
            const count = mList.filter(ml => ml.date === dateStr && ml.member === m).length;
            return `<td>${count || '-'}</td>`;
        }).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + `</tbody>`;
}

function renderPersonalStats(mList, bList) {
    const name = emailToMember(currentUser.email);
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const rate = mList.length ? (totalBazar / mList.length) : 0;
    const meals = mList.filter(m => m.member === name).length;
    const paid = bList.filter(b => b.member === name).reduce((s, b) => s + b.price, 0);
    const bal = (paid - (meals * rate)).toFixed(2);

    document.getElementById("personalStats").innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Welcome, <strong>${name}</strong></span>
            <span>Meals: <b>${meals}</b> | Bal: <b style="color:${bal>=0?'var(--success)':'var(--danger)'}">${bal}৳</b></span>
        </div>`;
}

function renderBazarList(bList) {
    document.getElementById("bazarList").innerHTML = bList.map(b => `
        <div class="receipt-card" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border);">
            <div><small>${b.date}</small><br><strong>${b.member}</strong>: ${b.item}</div>
            <div style="font-weight:bold; color:var(--success)">${b.price}৳</div>
        </div>`).join('');
}

// --- SYSTEM FLOW ---
function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    document.getElementById("adminTabBtn").style.display = isAdmin ? "inline-block" : "none";
    
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = isAdmin ? "block" : "none");

    const selects = [document.getElementById("mealMember"), document.getElementById("bazarMember")];
    selects.forEach(s => {
        s.innerHTML = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${emailToMember(currentUser.email)}</option>`;
    });

    const monthSelect = document.getElementById("viewMonth");
    monthSelect.innerHTML = "";
    for (let i = 0; i < 2; i++) {
        let d = new Date(); d.setMonth(d.getMonth() - i);
        let val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        monthSelect.innerHTML += `<option value="${val}">${d.toLocaleString('default',{month:'long',year:'numeric'})}</option>`;
    }
    
    document.getElementById("mealDate").value = getLocalDate();
    fetchData();
}

function emailToMember(email) {
    const map = {"shohan@mess.com":"SHOHAN","nabil@mess.com":"NABIL","tomal@mess.com":"TOMAL","abir@mess.com":"ABIR","masum@mess.com":"MASUM"};
    return map[email] || "GUEST";
}

// EXPOSE GLOBALLY
window.openTab = (n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};
window.logout = logout; window.addMeal = addMeal; window.addBazar = addBazar; window.fetchData = fetchData;

document.getElementById("loginBtn").onclick = login;
supabase.auth.onAuthStateChange((ev, ses) => { if(ses) { currentUser = ses.user; afterLogin(); } });
