import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = null;

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

window.fetchData = async () => {
    const monthVal = document.getElementById("viewMonth").value;
    if (!monthVal) return;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: savedBills } = await supabase.from('monthly_bills').select('*').eq('month', monthVal);
    
    renderPersonalStats(meals || []);
    renderCalendar(meals || [], monthVal);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    renderBillsTab(meals || [], bazar || [], savedBills || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
};

window.calcPersonalBill = (m, mealBalance) => {
    const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
    const billsTotal = fields.reduce((sum, f) => sum + (Number(document.getElementById(`${f}-${m}`).value) || 0), 0);
    const final = billsTotal - mealBalance;
    const target = document.getElementById(`final-${m}`);
    target.innerText = final.toFixed(2) + "৳";
    target.style.color = final > 0 ? "#ef4444" : "#10b981";
};

window.saveMonthlyBills = async () => {
    const month = document.getElementById("viewMonth").value;
    const updates = membersList.map(m => {
        const mealBal = Number(document.getElementById(`status-val-${m}`).innerText) || 0;
        return {
            month, member: m,
            rent: Number(document.getElementById(`rent-${m}`).value) || 0,
            wifi: Number(document.getElementById(`wifi-${m}`).value) || 0,
            gas: Number(document.getElementById(`gas-${m}`).value) || 0,
            elec: Number(document.getElementById(`elec-${m}`).value) || 0,
            khala: Number(document.getElementById(`khala-${m}`).value) || 0,
            meal_balance: mealBal,
            total_payable: parseFloat(document.getElementById(`final-${m}`).innerText)
        };
    });
    const { error } = await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' });
    alert(error ? "Error: " + error.message : "Bills Saved Successfully!");
};

function renderBillsTab(mList, bList, savedBills) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const rate = mList.length ? (totalBazar / mList.length) : 0;
    let html = `<table class="summary-table"><thead><tr><th>Member</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Meal Bal</th><th>Total</th></tr></thead><tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = Number((paid - (meals * rate)).toFixed(2));
        const s = savedBills.find(sb => sb.member === m) || {};

        html += `<tr><td class="name-cell">${m}</td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="calcPersonalBill('${m}',${bal})"></td>
            <td style="font-weight:bold; color:${bal>=0?'#10b981':'#ef4444'}"><span id="status-val-${m}">${bal}</span></td>
            <td id="final-${m}" style="font-weight:900;">${s.total_payable || '0.00'}৳</td></tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
}

// ... existing renderPersonalStats, renderSummary, renderBazarList, renderCalendar, renderAdmin ...
// (Keep those from your previous code)

window.openTab = (n) => { 
    document.querySelectorAll(".tab-content").forEach(c => c.style.display="none"); 
    document.getElementById(n).style.display="block"; 
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

window.logout = async () => { await supabase.auth.signOut(); location.reload(); };

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
    const vM = document.getElementById("viewMonth"); vM.innerHTML = "";
    for(let i=0; i<3; i++) {
        let t = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        vM.innerHTML += `<option value="${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}">${t.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`;
    }
    const opt = isAdmin ? membersList.map(m => `<option>${m}</option>`).join('') : `<option>${membersList.find(m => currentUser.email.toUpperCase().includes(m)) || 'User'}</option>`;
    document.getElementById("mealMember").innerHTML = document.getElementById("bazarMember").innerHTML = opt;
    if(isAdmin) { 
        document.getElementById("adminTabBtn").style.display = "block"; 
        document.getElementById("adminBillBtn").style.display = "block";
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block"); 
    }
    fetchData();
}
