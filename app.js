import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, selectedAdminMember = null, selectedBazarMember = 'ALL';

const getToday = () => new Date().toLocaleDateString('en-CA');
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); };

// --- 1. THE PRECISION MATH ENGINE ---
function getMemberMath(m, mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    const rawRate = totalMeals > 0 ? (totalBazar / totalMeals) : 0;
    
    const memberMeals = mList.filter(ml => ml.member === m).length;
    const memberPaid = bList.filter(bl => bl.member === m).reduce((s, b) => s + b.price, 0);
    const memberCost = memberMeals * rawRate;

    return {
        meals: memberMeals,
        paid: memberPaid,
        rawCost: memberCost,
        rawBalance: memberPaid - memberCost,
        rateDisplay: rawRate.toFixed(2)
    };
}

// --- 2. DATA FETCHING ---
window.fetchData = async () => {
    const monthVal = document.getElementById("viewMonth").value;
    if (!monthVal) return;
    const [year, mon] = monthVal.split('-').map(Number);
    const firstDay = `${monthVal}-01`, lastDay = `${monthVal}-${new Date(year, mon, 0).getDate()}`;

    const [mealsRes, bazarRes, billsRes, scheduleRes] = await Promise.all([
        supabase.from('meals').select('*').gte('date', firstDay).lte('date', lastDay),
        supabase.from('bazar').select('*').gte('date', firstDay).lte('date', lastDay),
        supabase.from('monthly_bills').select('*').eq('month', monthVal),
        supabase.from('bazar_schedule').select('*').order('date', { ascending: true })
    ]);

    const meals = mealsRes.data || [];
    const bazar = bazarRes.data || [];
    const savedBills = billsRes.data || [];
    const schedule = scheduleRes.data || [];

    renderPersonalStats(meals);
    renderCalendar(meals, monthVal);
    renderSummary(meals, bazar);
    renderBazarList(bazar);
    renderBillsTab(meals, bazar, savedBills);
    renderBazarSchedule(schedule);
    updateDailyNotification(schedule);
    
    if(isAdmin) renderAdmin(meals, bazar);
};

// --- 3. RENDERING LOGIC ---
function renderSummary(mList, bList) {
    const totalBazar = bList.reduce((s, b) => s + b.price, 0);
    const totalMeals = mList.length;
    let netSurplus = 0, netOwed = 0;

    let html = `<div class="card" style="background:#1e293b; color:white; padding:15px; margin-bottom:15px;">
                    <p style="margin:0">Total Bazar: <b>${totalBazar}৳</b> | Meals: <b>${totalMeals}</b> | Rate: <b>${(totalMeals ? totalBazar/totalMeals : 0).toFixed(2)}৳</b></p>
                </div>
                <table class="summary-table pro-table"><thead><tr><th>Member</th><th>Meals</th><th>Cost</th><th>Paid</th><th>Balance</th></tr></thead><tbody>`;
    
    membersList.forEach(m => {
        const stats = getMemberMath(m, mList, bList);
        const bal = Number(stats.rawBalance.toFixed(2));
        if (bal > 0) netSurplus += bal; else netOwed += Math.abs(bal);
        html += `<tr><td class="name-cell">${m}</td><td>${stats.meals}</td><td>${stats.rawCost.toFixed(2)}৳</td><td>${stats.paid}৳</td><td style="color:${bal >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold">${bal}৳</td></tr>`;
    });

    html += `</tbody><tfoot style="background: #f8fafc; font-size: 0.85em;"><tr><td colspan="5" style="text-align:center; padding: 10px; color: #64748b;">Audit: Surplus (${netSurplus.toFixed(2)}৳) vs Owed (${netOwed.toFixed(2)}৳)</td></tr></tfoot></table>`;
    document.getElementById("summaryContent").innerHTML = html;
}

window.renderBillsTab = (mList, bList, savedBills) => {
    let html = `<table class="summary-table pro-table" id="printableTable"><thead><tr><th>Member</th><th>Rent</th><th>Wifi</th><th>Gas</th><th>Elec</th><th>Khala</th><th>Meal Bal</th><th>Total</th></tr></thead><tbody>`;
    
    membersList.forEach(m => {
        const stats = getMemberMath(m, mList, bList);
        const s = savedBills.find(sb => sb.member === m) || {};
        const mealBal = Number(stats.rawBalance.toFixed(2));
        
        html += `<tr><td class="name-cell">${m}</td>
            <td><input type="number" id="rent-${m}" value="${s.rent || ''}" class="mini-input" oninput="window.calcPersonalBill('${m}',${mealBal})"></td>
            <td><input type="number" id="wifi-${m}" value="${s.wifi || ''}" class="mini-input" oninput="window.calcPersonalBill('${m}',${mealBal})"></td>
            <td><input type="number" id="gas-${m}" value="${s.gas || ''}" class="mini-input" oninput="window.calcPersonalBill('${m}',${mealBal})"></td>
            <td><input type="number" id="elec-${m}" value="${s.elec || ''}" class="mini-input" oninput="window.calcPersonalBill('${m}',${mealBal})"></td>
            <td><input type="number" id="khala-${m}" value="${s.khala || ''}" class="mini-input" oninput="window.calcPersonalBill('${m}',${mealBal})"></td>
            <td style="font-weight:bold; color:${mealBal>=0?'#10b981':'#ef4444'}"><span id="status-val-${m}" data-bal="${mealBal}">${mealBal}</span>৳</td>
            <td id="final-${m}" style="font-weight:900;">0৳</td></tr>`;
    });
    document.getElementById("billsContent").innerHTML = html + "</tbody></table>";

    membersList.forEach(m => {
        const stats = getMemberMath(m, mList, bList);
        window.calcPersonalBill(m, stats.rawBalance);
    });
};

// --- 4. CORE CALC & SAVE ---
window.calcPersonalBill = (m, mealBalance) => {
    const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
    const billsTotal = fields.reduce((sum, f) => sum + (Number(document.getElementById(`${f}-${m}`).value) || 0), 0);
    const finalVal = Math.round(billsTotal - Number(mealBalance));
    const target = document.getElementById(`final-${m}`);
    if(target) {
        target.innerText = finalVal + "৳";
        target.style.color = finalVal > 0 ? "#ef4444" : "#10b981";
    }
};

window.saveMonthlyBills = async () => {
    const month = document.getElementById("viewMonth").value;
    const updates = membersList.map(m => ({
        month, member: m,
        rent: Number(document.getElementById(`rent-${m}`).value) || 0,
        wifi: Number(document.getElementById(`wifi-${m}`).value) || 0,
        gas: Number(document.getElementById(`gas-${m}`).value) || 0,
        elec: Number(document.getElementById(`elec-${m}`).value) || 0,
        khala: Number(document.getElementById(`khala-${m}`).value) || 0,
        meal_balance: Number(document.getElementById(`status-val-${m}`).dataset.bal),
        total_payable: parseInt(document.getElementById(`final-${m}`).innerText) || 0
    }));
    const { error } = await supabase.from('monthly_bills').upsert(updates, { onConflict: 'month,member' });
    if (error) alert("Error: " + error.message);
    else alert("Cloud Update Successful!");
};

// --- 5. PDF & SHARING ---
window.printPDF = async (shouldShare = false) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const month = document.getElementById("viewMonth").value;

    doc.setFontSize(18);
    doc.text(`Engineers_Hub Mess Bill - ${month}`, 14, 15);

    doc.autoTable({
        html: '#printableTable',
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59] },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index > 0 && data.column.index < 6) {
                const member = membersList[data.row.index];
                const fields = ['rent', 'wifi', 'gas', 'elec', 'khala'];
                const val = document.getElementById(`${fields[data.column.index - 1]}-${member}`).value;
                data.cell.text = val || '0';
            }
        }
    });

    if (shouldShare && navigator.canShare) {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], `Bill_${month}.pdf`, { type: 'application/pdf' });
        try { await navigator.share({ files: [file], title: `Mess Bill ${month}` }); } 
        catch (err) { doc.save(`Bill_${month}.pdf`); }
    } else { doc.save(`Bill_${month}.pdf`); }
};

window.shareAsText = () => {
    const month = document.getElementById("viewMonth").value;
    let report = `*Engineers_Hub Bill (${month})*\n\n`;
    membersList.forEach(m => {
        const total = document.getElementById(`final-${m}`).innerText;
        report += `👤 *${m}* -> *${total}*\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(report)}`, '_blank');
};

// --- 6. ADD DATA FUNCTIONS ---
window.addMeal = async () => {
    const member = document.getElementById("mealMember").value;
    const count = parseInt(document.getElementById("mealCount").value);
    const dateInput = document.getElementById("mealDateSource");
    let date = isAdmin ? dateInput.value : (dateInput.value === "today" ? getToday() : getTomorrow());
    if(!date) return alert("Select Date");
    await supabase.from('meals').insert(Array.from({length: count}, () => ({ member, date, added_by: currentUser.id })));
    fetchData();
};

window.addBazar = async () => {
    const item = document.getElementById("bazarItem").value;
    const price = Number(document.getElementById("bazarPrice").value);
    const member = document.getElementById("bazarMember").value;
    const dateInput = document.getElementById("bazarDateSource");
    let date = isAdmin ? dateInput.value : getToday();
    if(item && price) { 
        await supabase.from('bazar').insert([{ member, item, price, date, added_by: currentUser.id }]); 
        document.getElementById("bazarItem").value=""; document.getElementById("bazarPrice").value=""; 
        fetchData(); 
    } else { alert("Fill all fields"); }
};

window.saveSchedule = async () => {
    const date = document.getElementById("scheduleDate").value;
    const member = document.getElementById("scheduleMember").value;
    const items = document.getElementById("scheduleItems").value;
    if(!date || !member) return alert("Select date and member.");
    await supabase.from('bazar_schedule').upsert([{ date, member, items_to_bring: items }], { onConflict: 'date' });
    alert(`Assigned ${member}`); fetchData(); 
};

// --- 7. UI UTILS ---
function renderPersonalStats(mList) {
    const name = membersList.find(m => currentUser.email.toUpperCase().includes(m)) || "User";
    const count = mList.filter(m => m.member === name).length;
    document.getElementById("personalStats").innerHTML = `User: <b>${name}</b> | Meals: <b>${count}</b>`;
}

function renderBazarList(bList) {
    document.getElementById("bazarMemberNav").innerHTML = `<button onclick="window.filterBazarByMember('ALL')">ALL</button>` + membersList.map(m => `<button class="${selectedBazarMember === m ? 'active' : ''}" onclick="window.filterBazarByMember('${m}')">${m}</button>`).join('');
    let display = (selectedBazarMember !== 'ALL') ? bList.filter(b => b.member === selectedBazarMember) : bList;
    document.getElementById("bazarListContent").innerHTML = display.slice().reverse().map(b => `<div class="bazar-row"><div class="bazar-info"><b>${b.item}</b><br><small>${b.member} • ${b.date}</small></div><b>${b.price}৳</b></div>`).join('') || '<p style="text-align:center">No records</p>';
}

function renderCalendar(mList, monthYear) {
    const [y, m] = monthYear.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let html = `<thead><tr><th>Day</th>${membersList.map(n => `<th>${n}</th>`).join('')}</tr></thead><tbody>`;
    for (let i = 1; i <= days; i++) {
        const dStr = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        html += `<tr><td>${i}</td>${membersList.map(n => {
            const c = mList.filter(x => x.date === dStr && x.member === n).length;
            return `<td>${c || '-'}</td>`;
        }).join('')}</tr>`;
    }
    document.getElementById("mealCalendar").innerHTML = html + "</tbody>";
}

function renderBazarSchedule(scheduleData) {
    const container = document.getElementById("bazarScheduleList");
    if (!container) return;
    const today = getToday();
    container.innerHTML = scheduleData.length ? scheduleData.slice(0, 6).map(s => `
        <div class="schedule-item ${s.date === today ? 'duty-today' : ''}" style="position:relative">
            ${isAdmin ? `<button onclick="window.deleteSchedule('${s.date}')" style="position:absolute; top:2px; right:4px; border:none; background:none; color:red; cursor:pointer;">✕</button>` : ''}
            <span>${s.date === today ? 'TODAY' : s.date.split('-').slice(1).join('/')}</span>
            <b>${s.member}</b>
        </div>
    `).join('') : '<p>No schedule</p>';
}

function updateDailyNotification(scheduleData) {
    const alertDiv = document.getElementById("bazarAlert");
    const todayDuty = scheduleData.find(s => s.date === getToday());
    if (todayDuty) {
        alertDiv.style.display = "block";
        document.getElementById("todayBazarMember").innerHTML = `${todayDuty.member} ${todayDuty.items_to_bring ? `<br><small>🛒 ${todayDuty.items_to_bring}</small>` : ''}`;
    } else { alertDiv.style.display = "none"; }
}

window.renderAdmin = (meals, bazar) => {
    document.getElementById("adminMemberList").innerHTML =
