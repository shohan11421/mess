import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = 'ALL';

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

window.fetchData = async () => {
    const vMonth = document.getElementById("viewMonth");
    if (!vMonth || !vMonth.value) return;
    const monthVal = vMonth.value;
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

// --- DATABASE SAVE LOGIC ---
window.saveMonthlyBills = async () => {
    const monthVal = document.getElementById("viewMonth").value;
    const updates = membersList.map(m => {
        return {
            month: monthVal,
            member: m,
            rent: Number(document.getElementById(`rent-${m}`).value) || 0,
            wifi: Number(document.getElementById(`wifi-${m}`).value) || 0,
            gas: Number(document.getElementById(`gas-${m}`).value) || 0,
            elec: Number(document.getElementById(`elec-${m}`).value) || 0,
            khala: Number(document.getElementById(`khala-${m}`).value) || 0,
            meal_balance: parseFloat(document.getElementById(`bal-val-${m}`).innerText) || 0,
            total_payable: parseFloat(document.getElementById(`final-${m}`).innerText) || 0
        };
    });

    const { error } = await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' });
    if (error) alert("Error: " + error.message);
    else alert("Success: Bills saved for " + monthVal);
};

window.calcPersonalBill = (m, mealBalance) => {
    const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
    const billsTotal = fields.reduce((sum, f) => sum + (Number(document.getElementById(`${f}-${m}`).value) || 0), 0);
    const final = billsTotal - mealBalance;
    const target = document.getElementById(`final-${m}`);
    target.innerText = final.toFixed(2) + "৳";
    target.style.color = final > 0 ? "#ef4444" : "#10b981";
};

function renderBillsTab(mList, bList, savedBills) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals) : 0;

    let html = `<table class="summary-table"><thead><tr>
        <th>Member</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Meal Bal</th><th>Total</th>
    </tr></thead><tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const bal = Number((paid - (meals * rate)).toFixed(2));
        const s = savedBills.find(sb => sb.member === m) || {};

        html += `<tr>
            <td class="name-cell">${m}</td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="calcPersonalBill('${m}', ${bal})"></td>
            <td id="bal-val-${m}" style="font-weight:bold; color:${bal >= 0 ? '#10b981' : '#ef4444'}">${bal}</td>
            <td id="final-${m}" style="font-weight:900;">${s.total_payable ? s.total_payable.toFixed(2) : '0.00'}৳</td>
        </tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";
}

// ... Rest of your renderSummary, renderCalendar, renderBazarList functions ...

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value, price = Number(document.getElementById("bazarPrice").value), member = document.getElementById("bazarMember").value;
    const dateType = document.getElementById("bazarDateType").value;
    // Fix: Allow admin to pick custom date
    let date = (isAdmin && dateType === "custom") ? document.getElementById("bazarDate").value : getToday();
    
    if(item && price && date) { 
        await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]); 
        document.getElementById("bazarItem").value=""; document.getElementById("bazarPrice").value=""; fetchData(); 
    }
};

// ... Standard openTab, Logout, and Auth Change listeners ...
