import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xjzyujkuqtxywcabeiaf.supabase.co';
const supabaseKey = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const membersList = ["SHOHAN", "NABIL", "TOMAL", "ABIR", "SHOJIB", "MASUM"]; 
let currentUser = null, isAdmin = false, isSettlementVisible = false;

// PUBLICATION LOGIC
window.toggleSettlement = () => {
    isSettlementVisible = !isSettlementVisible;
    localStorage.setItem('pub_status', isSettlementVisible); // Save status
    updatePubUI();
    renderFinalSettlement();
};

function updatePubUI() {
    const btn = document.getElementById("publishBtn");
    if (!btn) return;
    btn.innerText = `Statement: ${isSettlementVisible ? 'PUBLIC (ON)' : 'HIDDEN (OFF)'}`;
    btn.className = isSettlementVisible ? "btn-pub-on" : "btn-pub-off";
}

window.renderFinalSettlement = () => {
    const wrapper = document.getElementById("finalSettlementWrapper");
    const body = document.getElementById("finalSettlementBody");
    if (!wrapper || !body) return;

    // Users check local storage for status
    isSettlementVisible = localStorage.getItem('pub_status') === 'true';

    if (isAdmin || isSettlementVisible) {
        wrapper.style.display = "block";
        const summaryRows = document.querySelectorAll("#summaryContent table tbody tr");
        let html = "";
        summaryRows.forEach((row, index) => {
            const name = row.cells[0].innerText;
            const mealBal = parseFloat(row.cells[4].innerText.replace('৳', '')) || 0;
            
            // Get saved individual bills
            const r = localStorage.getItem(`r-${index}`) || 0;
            const w = localStorage.getItem(`w-${index}`) || 0;
            const g = localStorage.getItem(`g-${index}`) || 0;
            const e = localStorage.getItem(`e-${index}`) || 0;
            const k = localStorage.getItem(`k-${index}`) || 0;

            html += `<tr>
                <td class="name-cell">${name}</td>
                <td style="color:${mealBal >= 0 ? '#059669' : '#ef4444'}">${mealBal.toFixed(0)}৳</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="saveAndCalc(${index}, ${mealBal}, 'r', this)">${r}</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="saveAndCalc(${index}, ${mealBal}, 'w', this)">${w}</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="saveAndCalc(${index}, ${mealBal}, 'g', this)">${g}</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="saveAndCalc(${index}, ${mealBal}, 'e', this)">${e}</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="saveAndCalc(${index}, ${mealBal}, 'k', this)">${k}</td>
                <td id="net-${index}" style="font-weight:800; background:#f0fdf4">${(Number(r)+Number(w)+Number(g)+Number(e)+Number(k)-mealBal).toFixed(0)}৳</td>
            </tr>`;
        });
        body.innerHTML = html;
    } else {
        wrapper.style.display = "none";
    }
};

window.saveAndCalc = (idx, mealBal, key, el) => {
    localStorage.setItem(`${key}-${idx}`, el.innerText || 0);
    const row = el.parentElement;
    let total = 0;
    row.querySelectorAll('.editable-bill').forEach(b => total += (parseFloat(b.innerText) || 0));
    document.getElementById(`net-${idx}`).innerText = (total - mealBal).toFixed(0) + "৳";
};

// ... Include your existing Supabase auth and data fetching functions here ...
