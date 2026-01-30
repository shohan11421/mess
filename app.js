import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = 'ALL';

// Fetch all data
window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth").value;
    if (!vMonth) return;
    const firstDay = `${vMonth}-01`, lastDay = `${vMonth}-31`;

    const { data: meals } = await supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: bazar } = await supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay);
    const { data: savedBills } = await supabase.from('monthly_bills').select('*').eq('month', vMonth);
    
    renderCalendar(meals || [], vMonth);
    renderSummary(meals || [], bazar || []);
    renderBazarList(bazar || []);
    renderBillsTab(meals || [], bazar || [], savedBills || []);
    if(isAdmin) renderAdmin(meals || [], bazar || []);
};

// --- Personal Bills Logic ---
window.saveMonthlyBills = async () => {
    const monthVal = document.getElementById("viewMonth").value;
    const updates = membersList.map(m => ({
        month: monthVal,
        member: m,
        rent: Number(document.getElementById(`rent-${m}`).value) || 0,
        wifi: Number(document.getElementById(`wifi-${m}`).value) || 0,
        gas: Number(document.getElementById(`gas-${m}`).value) || 0,
        elec: Number(document.getElementById(`elec-${m}`).value) || 0,
        khala: Number(document.getElementById(`khala-${m}`).value) || 0,
        meal_balance: parseFloat(document.getElementById(`bal-val-${m}`).innerText) || 0,
        total_payable: parseFloat(document.getElementById(`final-${m}`).innerText) || 0
    }));

    const { error } = await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' });
    if (error) alert(error.message); else alert("Bills Saved!");
};

window.calcPersonalBill = (m, mealBalance) => {
    const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
    const totalBills = fields.reduce((s, f) => s + (Number(document.getElementById(`${f}-${m}`).value) || 0), 0);
    const final = totalBills - mealBalance;
    const target = document.getElementById(`final-${m}`);
    target.innerText = final.toFixed(2) + "৳";
    target.style.color = final > 0 ? "#ef4444" : "#10b981";
};

function renderBillsTab(mList, bList, savedBills) {
    const totalB = bList.reduce((s, b) => s + b.price, 0);
    const rate = mList.length ? (totalB / mList.length) : 0;
    
    let html = `<table class="summary-table"><thead><tr><th>Member</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Meal Bal</th><th>Total</th></tr></thead><tbody>`;
    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = (paid - (meals * rate)).toFixed(2);
        const s = savedBills.find(sb => sb.member === m) || {};

        html += `<tr>
            <td class="name-cell">${m}</td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td id="bal-val-${m}" style="color:${bal >= 0 ? '#10b981' : '#ef4444'}">${bal}</td>
            <td id="final-${m}" style="font-weight:900;">${s.total_payable ? s.total_payable.toFixed(2) : '0.00'}৳</td>
        </tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
}

// --- Bazar Logic (Admin Date Pick) ---
window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const member = document.getElementById("bazarMember").value;
    const customDate = document.getElementById("bazarDate").value;
    const date = (isAdmin && customDate) ? customDate : new Date().toLocaleDateString('en-CA');

    if(item && price) {
        await supabase.from('bazar').insert([{ member, item, price, date }]);
        document.getElementById("bazarItem").value = "";
        document.getElementById("bazarPrice").value = "";
        fetchData();
    }
};

// ... (Keep existing Auth/Logout/Tab Logic) ...

window.openTab = (tab) => {
    document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
    document.getElementById(tab).style.display = "block";
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");
};

supabase.auth.onAuthStateChange((ev, session) => {
    if (session) { currentUser = session.user; afterLogin(); }
    else { document.getElementById("loginDiv").style.display = "block"; }
});

async function afterLogin() {
    isAdmin = (currentUser.email === "admin@mess.com");
    document.getElementById("loginDiv").style.display = "none";
    document.getElementById("appDiv").style.display = "block";
    
    // Month Picker Setup
    const vM = document.getElementById("viewMonth");
    const now = new Date();
    for(let i=0; i<3; i++) {
        let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        let val = d.toISOString().slice(0, 7);
        vM.innerHTML += `<option value="${val}">${d.toLocaleString('default', {month:'long', year:'numeric'})}</option>`;
    }
    
    if(isAdmin) document.querySelectorAll(".admin-only").forEach(el => el.style.display = "block");
    fetchData();
}
