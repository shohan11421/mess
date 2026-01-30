// Global State
let isAdmin = false; 
let isSettlementVisible = false;

// 1. Toggle Function (Admin Only)
window.toggleSettlement = () => {
    isSettlementVisible = !isSettlementVisible;
    const btn = document.getElementById("publishBtn");
    if (btn) {
        btn.innerText = `Statement: ${isSettlementVisible ? 'ON' : 'OFF'}`;
        btn.style.background = isSettlementVisible ? "#dcfce7" : "#fee2e2";
    }
    renderFinalSettlement();
};

// 2. Calculation Logic (Live only, no saving)
window.calcNet = (idx, mealBal) => {
    const row = document.querySelector(`#row-${idx}`);
    const inputs = row.querySelectorAll('.editable-bill');
    let totalBills = 0;
    inputs.forEach(input => {
        totalBills += parseFloat(input.innerText) || 0;
    });
    const finalPay = totalBills - mealBal;
    document.getElementById(`net-${idx}`).innerText = finalPay.toFixed(0) + "৳";
};

// 3. Render Settlement Table
window.renderFinalSettlement = () => {
    const wrapper = document.getElementById("finalSettlementWrapper");
    const body = document.getElementById("finalSettlementBody");
    
    if (!wrapper || !body) return;

    // Show if Admin or if Admin toggled it ON
    if (isAdmin || isSettlementVisible) {
        wrapper.style.display = "block";
        body.innerHTML = ""; // Clear old rows

        const summaryRows = document.querySelectorAll("#summaryContent table tbody tr");
        
        summaryRows.forEach((row, index) => {
            const name = row.cells[0].innerText;
            const mealBal = parseFloat(row.cells[4].innerText.replace('৳', '')) || 0;

            const tr = document.createElement("tr");
            tr.id = `row-${index}`;
            tr.innerHTML = `
                <td class="name-cell">${name}</td>
                <td style="color:${mealBal >= 0 ? 'green' : 'red'}">${mealBal.toFixed(0)}৳</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="calcNet(${index}, ${mealBal})">0</td>
                <td contenteditable="${isAdmin}" class="editable-bill" oninput="calcNet(${index}, ${mealBal})">0</td>
                <td id="net-${index}" style="font-weight:800; background:#f0fdf4">${(0 - mealBal).toFixed(0)}৳</td>
            `;
            body.appendChild(tr);
        });
    } else {
        wrapper.style.display = "none";
    }
};

// Tabs System
window.openTab = (tabName) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).style.display = 'block';
    event.currentTarget.classList.add('active');
    if(tabName === 'summary') renderFinalSettlement();
};
