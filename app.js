import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ----------------- Supabase Config -----------------
const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co'
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ" 
const supabase = createClient(supabaseUrl, supabaseKey)

// ----------------- Global State -----------------
const membersList = ["SHOHAN","NABIL","TOMAL","ABIR","MASUM"];
let currentUser = null;
let isAdmin = false;

// ----------------- Updated Login Logic -----------------
async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if(!email || !password) { alert("Enter email & password!"); return; }

    // ONLY try login (removed the automatic signup block)
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if(error) { 
        // If login fails, just show the error message
        document.getElementById("loginMsg").innerText = "Login failed: " + error.message; 
        return; 
    }
}

// ----------------- UI Management -----------------
function afterLogin() {
    if(!currentUser) return;
    isAdmin = (currentUser.email === "admin@mess.com");
    
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    document.getElementById("adminTabBtn").style.display = isAdmin ? "inline-block" : "none";

    initMemberDropdowns();
    fetchData();
}

function openTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
    document.getElementById(tabName).style.display = "block";
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    if (event) event.currentTarget.classList.add("active");
    
    if(tabName === 'admin' && isAdmin) fetchAdminData();
}

// ----------------- Data Actions -----------------
async function addMeal() {
    let member = document.getElementById("mealMember").value;
    const count = Number(document.getElementById("mealCount").value);
    if(!member || count <= 0) return;

    const date = getTodayStr();
    const inserts = [];
    for(let i=0; i<count; i++) {
        inserts.push({ member, date, added_by: currentUser.id });
    }
    await supabase.from('meals').insert(inserts);
    fetchData();
}

async function addBazar() {
    let member = document.getElementById("bazarMember").value;
    const item = document.getElementById("bazarItem").value.trim();
    const price = Number(document.getElementById("bazarPrice").value);
    if(!member || !item || price <= 0) return;

    await supabase.from('bazar').insert([{
        member, item, price, date: getTodayStr(), added_by: currentUser.id
    }]);
    
    document.getElementById("bazarItem").value = "";
    document.getElementById("bazarPrice").value = "";
    fetchData();
}

// ----------------- Helpers & Rendering -----------------
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function initMemberDropdowns() {
    const mealSelect = document.getElementById("mealMember");
    const bazarSelect = document.getElementById("bazarMember");
    let options = "";
    
    if(isAdmin) {
        membersList.forEach(m => options += `<option value="${m}">${m}</option>`);
    } else {
        const m = emailToMember(currentUser.email);
        options = `<option value="${m}">${m}</option>`;
    }
    mealSelect.innerHTML = options;
    bazarSelect.innerHTML = options;
}

function emailToMember(email) {
    const mapping = {
        "shohan@mess.com": "SHOHAN",
        "nabil@mess.com": "NABIL",
        "tomal@mess.com": "TOMAL",
        "abir@mess.com": "ABIR",
        "masum@mess.com": "MASUM"
    };
    return mapping[email] || "Unknown";
}

async function fetchData() {
    const { data: meals } = await supabase.from('meals').select('*');
    const { data: bazar } = await supabase.from('bazar').select('*');
    
    renderCalendar(meals || []);
    renderBazar(bazar || []);
    renderSummary(meals || [], bazar || []);
}

function renderCalendar(mealsSnap) {
    const d = new Date();
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');

    let table = `<tr><th>Day</th>${membersList.map(m => `<th>${m}</th>`).join('')}</tr>`;

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${d.getFullYear()}-${monthStr}-${i.toString().padStart(2, '0')}`;
        table += `<tr><td>${i}</td>`;
        membersList.forEach(m => {
            const count = mealsSnap.filter(meal => meal.date === dateStr && meal.member === m).length;
            table += `<td>${count || '-'}</td>`;
        });
        table += `</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = table;
}

function renderBazar(bazarSnap) {
    const tbody = document.querySelector("#bazarTable tbody");
    tbody.innerHTML = bazarSnap.map(b => `
        <tr><td>${b.date}</td><td>${b.member}</td><td>${b.item}</td><td>${b.price}৳</td></tr>
    `).join('');
}

function renderSummary(mealsSnap, bazarSnap) {
    const totalBazar = bazarSnap.reduce((s, b) => s + b.price, 0);
    const totalMeals = mealsSnap.length;
    const mealRate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;

    let html = `<p>Total Bazar: ${totalBazar}৳ | Total Meals: ${totalMeals} | Rate: ${mealRate}৳</p><hr>`;
    
    membersList.forEach(m => {
        const mMeals = mealsSnap.filter(meal => meal.member === m).length;
        const mPaid = bazarSnap.filter(b => b.member === m).reduce((s, b) => s + b.price, 0);
        const balance = (mPaid - (mMeals * mealRate)).toFixed(2);
        html += `<p><b>${m}:</b> Meals: ${mMeals}, Paid: ${mPaid}৳, Balance: ${balance}৳</p>`;
    });
    document.getElementById("summaryContent").innerHTML = html;
}

async function fetchAdminData() {
    const { data: meals } = await supabase.from('meals').select('*').order('date', {ascending: false});
    const { data: bazar } = await supabase.from('bazar').select('*').order('date', {ascending: false});

    document.querySelector("#adminMeals tbody").innerHTML = (meals || []).map(m => `
        <tr><td>${m.date}</td><td>${m.member}</td><td><button onclick="deleteMeal('${m.id}')">❌</button></td></tr>
    `).join('');

    document.querySelector("#adminBazar tbody").innerHTML = (bazar || []).map(b => `
        <tr><td>${b.date}</td><td>${b.member}</td><td>${b.item}</td><td>${b.price}৳</td><td><button onclick="deleteBazar('${b.id}')">❌</button></td></tr>
    `).join('');
}

// ----------------- DELETE ACTIONS -----------------
async function deleteMeal(id) {
    if(!confirm("Delete this meal?")) return;
    await supabase.from('meals').delete().eq('id', id);
    fetchAdminData();
    fetchData();
}

async function deleteBazar(id) {
    if(!confirm("Delete this bazar item?")) return;
    await supabase.from('bazar').delete().eq('id', id);
    fetchAdminData();
    fetchData();
}

// ----------------- CRITICAL: EXPOSE TO WINDOW -----------------
// This makes the functions available to the HTML onclick events
window.openTab = openTab;
window.logout = logout;
window.deleteMeal = deleteMeal;
window.deleteBazar = deleteBazar;

// Event Listeners for buttons that don't use onclick in HTML
document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("addMealBtn").addEventListener("click", addMeal);
document.getElementById("addBazarBtn").addEventListener("click", addBazar);

// Auth Listener
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        afterLogin();
    } else {
        document.getElementById("loginDiv").style.display = "block";
        document.getElementById("appDiv").style.display = "none";
    }
});

