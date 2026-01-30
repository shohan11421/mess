import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = null;
window.isSettlementVisible = false; // Statement Toggle State

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

// --- FETCH DATA ---
window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    const monthVal = vMonth.value;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    
    renderPersonalStats(meals || []);
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
    
    // Always call settlement render to check visibility
    window.renderFinalSettlement();
};

// --- STATEMENT TOGGLE LOGIC ---
window.toggleSettlement = () => {
    window.isSettlementVisible = !window.isSettlementVisible;
    const btn = document.getElementById("publishBtn");
    if (btn) {
        btn.innerText = `Statement: ${window.isSettlementVisible ? 'PUBLIC' : 'HIDDEN'}`;
        btn.style.background = window.isSettlementVisible ? "#dcfce7" : "#fee2e2";
        btn.style.color = window.isSettlementVisible ? "#166534" : "#b91c1c";
    }
    window.renderFinalSettlement();
};

// --- LIVE CALCULATION ---
window.calcNet = (idx, mealBal) => {
    const row = document.getElementById(`row-${idx}`);
    if (!row) return;
    const inputs = row.querySelectorAll('.editable-bill');
    let totalBills = 0;
    inputs.forEach(input => totalBills += parseFloat(input.innerText) || 0);
    const finalPay = totalBills - mealBal;
    const netEl = document.getElementById(`net-${idx}`);
    if (netEl) netEl.innerText = finalPay.toFixed(0) + "৳";
};

// --- RENDER COMPACT SETTLEMENT ---
window.renderFinalSettlement = () => {
    const wrapper = document.getElementById("finalSettlementWrapper");
    const body = document.getElementById("finalSettlementBody");
    if (!wrapper || !body) return;

    if (isAdmin || window.isSettlementVisible) {
        wrapper.style.display = "block";
        body.innerHTML = ""; 

        // Get data from the Summary Table rows
        const summaryRows = document.querySelectorAll("#summaryContent table tbody tr");
        summaryRows.forEach((row, index) => {
            const name = row.cells[0].innerText;
            const mealBal = parseFloat(row.cells[4].innerText.replace(/[^0-9.-]+/g,"")) || 0;

            const tr = document.createElement("tr");
            tr.id = `row-${index}`;
            tr.innerHTML = `
                <td class="name-cell">${name}</td>
                <td style="color:${mealBal >= 0 ? '#059669' : '#ef4444'}; font-weight:bold;">${mealBal.toFixed(0)}৳</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="window.calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="window.calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="window.calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="window.calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="window.calcNet(${index}, ${mealBal})">0</td>
                <td id="net-${index}" style="font-weight:800; background:#f0fdf4;">${(0 - mealBal).toFixed(0)}৳</td>
            `;
            body.appendChild(tr);
        });
    } else {
        wrapper.style.display = "none";
    }
};

// --- SUMMARY RENDER ---
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;

    let html = `
        <div class="summary-black-card">
            <p>Bazar: <b>${totalBazar}৳</b> | Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p>
        </div>
        <div class="table-container">
            <table class="summary-table">
                <thead><tr><th class="name-cell">MEMBER</th><th>MEALS</th><th>COST</th><th>PAID</th><th>STATUS</th></tr></thead>
                <tbody>`;

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

// --- TAB SYSTEM ---
window.openTab = (n) => { 
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none"); 
    document.getElementById(n).style.display="block"; 
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
    if(n === 'summary') window.renderFinalSettlement();
};

// --- AUTH & INIT ---
document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => { 
        if (session) { currentUser = session.user; afterLogin(); } 
        else { document.getElementById("loginDiv").style.display = "block"; }
    });
    document.getElementById("loginBtn").onclick = async () => { 
        await supabase.auth.signInWithPassword({ 
            email: document.getElementById("email").value, 
            password: document.getElementById("password").value 
        }); 
    };
});

async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    // Month Picker Init
    const vM = document.getElementById("viewMonth"); vM.innerHTML = "";
    for(let i=0; i<3; i++) {
        let t = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        vM.innerHTML += `<option value="${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}">${t.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`;
    }
    
    // Member Dropdowns
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'User'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    
    if(isAdmin) { 
        document.getElementById("adminTabBtn").style.display = "block"; 
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block"); 
    }
    fetchData();
}

// ... rest of your existing bazar and admin helper functions ...
window.logout = async () => { await supabase.auth.signOut(); location.reload(); };
window.addMeal = async () => { /* ... existing ... */ await fetchData(); };
window.addBazar = async () => { /* ... existing ... */ await fetchData(); };
