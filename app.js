import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false;

// DATE HELPERS
const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

// CORE DATA FETCHING
window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    
    renderSummary(meals || [], bazar || []);
    renderBillsTab(meals || [], bazar || []);
    renderCalendar(meals || [], monthVal);
};

// SUMMARY LOGIC
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;

    let html = `<div class="summary-black-card"><p>Total Bazar: <b>${totalBazar}৳</b> | Total Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p></div>
                <div class="table-container"><table class="summary-table"><thead><tr><th>MEMBER</th><th>MEALS</th><th>COST</th><th>PAID</th><th>STATUS</th></tr></thead><tbody>`;

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

// PERSONAL BILLS LOGIC
window.calcTotal = (m, bal) => {
    const fields = ['r','w','g','e','k']; // rent, wifi, gas, elec, khala
    const billSum = fields.reduce((s, f) => s + (Number(document.getElementById(`${f}-${m}`).value) || 0), 0);
    const final = billSum - bal;
    const res = document.getElementById(`f-${m}`);
    res.innerText = final.toFixed(2) + "৳";
    res.style.color = final > 0 ? "#ef4444" : "#10b981";
};

function renderBillsTab(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals) : 0;

    let html = `<table class="summary-table"><thead><tr><th>Member</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Bal</th><th>Total</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = (paid - (meals * rate)).toFixed(2);
        html += `<tr><td class="name-cell">${m}</td>
            <td><input type="number" id="r-${m}" class="mini-input" oninput="calcTotal('${m}',${bal})"></td>
            <td><input type="number" id="w-${m}" class="mini-input" oninput="calcTotal('${m}',${bal})"></td>
            <td><input type="number" id="g-${m}" class="mini-input" oninput="calcTotal('${m}',${bal})"></td>
            <td><input type="number" id="e-${m}" class="mini-input" oninput="calcTotal('${m}',${bal})"></td>
            <td><input type="number" id="k-${m}" class="mini-input" oninput="calcTotal('${m}',${bal})"></td>
            <td style="color:${bal>=0?'#10b981':'#ef4444'}"><b>${bal}</b></td>
            <td id="f-${m}" style="font-weight:bold">0.00</td></tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
}

// TAB & AUTH LOGIC
window.openTab = (e, n) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none");
    document.getElementById(n).style.display="block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
};

window.logout = async () => { await supabase.auth.signOut(); location.reload(); };

document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            isAdmin = (currentUser.email === "admin@mess.com");
            document.getElementById("loginDiv").style.display = "none";
            document.getElementById("appDiv").style.display = "block";
            setupPickers();
            if(isAdmin) document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
            fetchData();
        } else {
            document.getElementById("loginDiv").style.display = "block";
        }
    });

    document.getElementById("loginBtn").onclick = async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        await supabase.auth.signInWithPassword({ email, password });
    };
});

function setupPickers() {
    const vM = document.getElementById("viewMonth");
    vM.innerHTML = "";
    for(let i=0; i<3; i++) {
        let t = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        vM.innerHTML += `<option value="${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}">${t.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`;
    }
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'User'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
}

// MEAL & BAZAR SAVING
window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const type = document.getElementById("mealDateType").value;
    const date = type === "custom" ? document.getElementById("mealDate").value : (type === "tomorrow" ? getTomorrow() : getToday());
    await supabase.from('meals').insert(Array.from({length: count}, () => ({ member, date, added_by: currentUser.id })));
    fetchData();
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value, price = Number(document.getElementById("bazarPrice").value), member = document.getElementById("bazarMember").value;
    if(item && price) {
        await supabase.from('bazar').insert([{ member, item, price, date: getToday(), added_by: currentUser.id }]);
        document.getElementById("bazarItem").value = ""; document.getElementById("bazarPrice").value = ""; fetchData();
    }
};

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
