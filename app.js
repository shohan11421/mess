import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 1. CONFIGURATION
const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co'
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ" 
const supabase = createClient(supabaseUrl, supabaseKey)

const membersList = ["SHOHAN","NABIL","TOMAL","ABIR","MASUM"];
let currentUser = null;
let isAdmin = false;

// 2. AUTHENTICATION
async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) document.getElementById("loginMsg").innerText = error.message;
}

async function logout() {
    await supabase.auth.signOut();
    location.reload(); 
}

// 3. DATA FETCHING & RENDERING
async function fetchData() {
    const { data: meals } = await supabase.from('meals').select('*');
    const { data: bazar } = await supabase.from('bazar').select('*');
    const { data: schedule } = await supabase.from('bazar_schedule').select('*');

    const mList = meals || [];
    const bList = bazar || [];
    const sList = schedule || [];

    renderCalendar(mList);
    renderPersonalDashboard(mList, bList, sList);
    renderBazar(bList);
    renderSummary(mList, bList);
}

function renderPersonalDashboard(mList, bList, sList) {
    const myName = emailToMember(currentUser.email);
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const mealRate = mList.length ? (totalBazar / mList.length) : 0;
    
    const myMeals = mList.filter(m => m.member === myName).length;
    const myPaid = bList.filter(b => b.member === myName).reduce((s, b) => s + b.price, 0);
    const myCost = (myMeals * mealRate);
    const balance = (myPaid - myCost).toFixed(2);

    document.getElementById("myStatsContent").innerHTML = `
        <p>Welcome, <b>${myName}</b>! | Your Meals: <b>${myMeals}</b> | Paid: <b>${myPaid}৳</b></p>
        <p>Current Balance: <b style="color:${balance >= 0 ? 'green' : 'red'}">${balance}৳</b></p>
    `;

    document.getElementById("bazarScheduleDisplay").innerHTML = sList.map(s => 
        `<span style="background:white; padding:5px 10px; border-radius:15px; border:1px solid #ddd"><b>${s.day_of_week}:</b> ${s.member_name}</span>`
    ).join('');
}

// 4. ACTION FUNCTIONS
async function addMeal() {
    const member = document.getElementById("mealMember").value;
    const count = Number(document.getElementById("mealCount").value);
    const date = new Date().toISOString().split('T')[0];
    const inserts = Array.from({length: count}, () => ({ member, date, added_by: currentUser.id }));
    await supabase.from('meals').insert(inserts);
    fetchData();
}

async function addBazar() {
    const member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    await supabase.from('bazar').insert([{ member, item, price, date: new Date().toISOString().split('T')[0], added_by: currentUser.id }]);
    fetchData();
}

async function updateSchedule() {
    const day = document.getElementById("schDay").value;
    const mem = document.getElementById("schMem").value;
    // Simple logic: delete old day entry and insert new
    await supabase.from('bazar_schedule').delete().eq('day_of_week', day);
    await supabase.from('bazar_schedule').insert([{ day_of_week: day, member_name: mem }]);
    fetchData();
    alert("Schedule Updated!");
}

// 5. HELPERS & UI
function openTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
    document.getElementById(tabName).style.display = "block";
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    if (event) event.currentTarget.classList.add("active");
    if (tabName === 'admin') fetchAdminData();
}

function emailToMember(email) {
    const map = {"shohan@mess.com":"SHOHAN","nabil@mess.com":"NABIL","tomal@mess.com":"TOMAL","abir@mess.com":"ABIR","masum@mess.com":"MASUM"};
    return map[email] || "GUEST";
}

function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    document.getElementById("adminTabBtn").style.display = isAdmin ? "inline-block" : "none";
    
    // Fill dropdowns
    const selects = [document.getElementById("mealMember"), document.getElementById("bazarMember")];
    selects.forEach(s => {
        s.innerHTML = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${emailToMember(currentUser.email)}</option>`;
    });
    fetchData();
}

// 6. GLOBAL EXPOSURE (Crucial for HTML onclicks)
window.logout = logout;
window.openTab = openTab;
window.addMeal = addMeal;
window.addBazar = addBazar;
window.updateSchedule = updateSchedule;

// Initialize
document.getElementById("loginBtn").onclick = login;
document.getElementById("addMealBtn").onclick = addMeal;
document.getElementById("addBazarBtn").onclick = addBazar;

supabase.auth.onAuthStateChange((event, session) => {
    if (session) { currentUser = session.user; afterLogin(); }
});

// (Remaining rendering functions renderCalendar, renderBazar, renderSummary, fetchAdminData go here - same as previous version)
function renderCalendar(mList) {
    const d = new Date();
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    let html = `<tr><th>Day</th>${membersList.map(m => `<th>${m}</th>`).join('')}</tr>`;
    for (let i = 1; i <= days; i++) {
        const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(m => `<td>${mList.filter(ml => ml.date === dateStr && ml.member === m).length || '-'}</td>`).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html;
}

function renderBazar(bList) {
    document.querySelector("#bazarTable tbody").innerHTML = bList.map(b => `<tr><td>${b.date}</td><td>${b.member}</td><td>${b.item}</td><td>${b.price}৳</td></tr>`).join('');
}

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const mealRate = mList.length ? (totalBazar / mList.length).toFixed(2) : 0;
    let html = `<p><b>Meal Rate:</b> ${mealRate}৳</p><hr>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        html += `<p>${m}: Meals ${meals} | Paid ${paid}৳ | Balance ${(paid - (meals * mealRate)).toFixed(2)}৳</p>`;
    });
    document.getElementById("summaryContent").innerHTML = html;
}

async function fetchAdminData() {
    const { data: meals } = await supabase.from('meals').select('*');
    const { data: bazar } = await supabase.from('bazar').select('*');
    document.querySelector("#adminMeals tbody").innerHTML = (meals || []).map(m => `<tr><td>${m.date}</td><td>${m.member}</td><td><button onclick="deleteMeal('${m.id}')">❌</button></td></tr>`).join('');
    document.querySelector("#adminBazar tbody").innerHTML = (bazar || []).map(b => `<tr><td>${b.date}</td><td>${b.member}</td><td>${b.price}৳</td><td><button onclick="deleteBazar('${b.id}')">❌</button></td></tr>`).join('');
}

async function deleteMeal(id) { await supabase.from('meals').delete().eq('id', id); fetchAdminData(); fetchData(); }
async function deleteBazar(id) { await supabase.from('bazar').delete().eq('id', id); fetchAdminData(); fetchData(); }
window.deleteMeal = deleteMeal;
window.deleteBazar = deleteBazar;
