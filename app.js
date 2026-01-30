import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, isSettlementVisible = false;

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
    
    // NEW HOOK
    renderFinalSettlement();
};

function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rate = totalMeals ? (totalBazar / totalMeals).toFixed(2) : 0;

    let html = `<div class="summary-black-card"><p>Total Bazar: <b>${totalBazar}৳</b> | Total Meals: <b>${totalMeals}</b> | Rate: <b>${rate}৳</b></p></div><div class="table-container"><table class="summary-table"><thead><tr><th>MEMBER</th><th>MEALS</th><th>COST</th><th>PAID</th><th>STATUS</th></tr></thead><tbody>`;

    membersList.forEach(m => {
        const meals = mList.filter(ml => ml.member === m).length;
        const paid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
        const cost = (meals * rate).toFixed(2);
        const bal = (paid - cost).toFixed(2);
        html += `<tr><td class="name-cell">${m}</td><td>${meals}</td><td>${cost}৳</td><td>${paid}৳</td><td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });
    document.getElementById("summaryContent").innerHTML = html + "</tbody></table></div>";
}

// NEW: Settlement Logic
window.toggleSettlement = () => {
    isSettlementVisible = !isSettlementVisible;
    const btn = document.getElementById("publishBtn");
    btn.innerText = `Show Settlement: ${isSettlementVisible ? 'ON' : 'OFF'}`;
    btn.style.background = isSettlementVisible ? "#10b981" : "#fff7ed";
    btn.style.color = isSettlementVisible ? "white" : "#b45309";
    renderFinalSettlement();
};

window.renderFinalSettlement = () => {
    const wrapper = document.getElementById("finalSettlementWrapper");
    const body = document.getElementById("finalSettlementBody");
    if (!wrapper || !body) return;

    if (isAdmin || isSettlementVisible) {
        wrapper.style.display = "block";
        const summaryRows = document.querySelectorAll("#summaryContent table tbody tr");
        let html = "";
        summaryRows.forEach((row, index) => {
            const name = row.cells[0].innerText;
            const mealBal = parseFloat(row.cells[4].innerText.replace('৳', '')) || 0;
            html += `<tr>
                <td class="name-cell">${name}</td>
                <td style="text-align:center; color:${mealBal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${mealBal >= 0 ? '+' : ''}${mealBal.toFixed(0)}৳</td>
                <td contenteditable="${isAdmin}" class="${isAdmin ? 'editable-bill' : ''}" id="other-${index}" oninput="calcNet(${index}, ${mealBal})" style="text-align:center;">0</td>
                <td id="net-${index}" style="text-align:center; font-weight:800; background:#f0fdf4;">${(0 - mealBal).toFixed(0)}৳</td>
            </tr>`;
        });
        body.innerHTML = html;
    } else { wrapper.style.display = "none"; }
};

window.calcNet = (idx, mealBal) => {
    const otherVal = parseFloat(document.getElementById(`other-${idx}`).innerText) || 0;
    document.getElementById(`net-${idx}`).innerText = (otherVal - mealBal).toFixed(0) + "৳";
};

// ... keep all other original functions (addMeal, addBazar, openTab, etc.)
