// ----------------- Supabase Config -----------------
const SUPABASE_URL = "https://xjzyujkuqtxywcabeiaf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EQwjYIpX-jYondk86PwRmg_MhsrCgLJ";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------- Members -----------------
const membersList = ["SHOHAN","NABIL","TOMAL","ABIR","MASUM"];
let currentUser = null;
let isAdmin = false;

// ----------------- Login / Signup -----------------
async function login(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if(!email || !password){ alert("Enter email & password!"); return;}

  // Try login first
  let { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // If user does not exist, sign them up automatically
  if(error && error.message.includes("Invalid login credentials")){
    const { data: signupData, error: signupError } = await supabase.auth.signUp({ email, password });
    if(signupError){
      document.getElementById("loginMsg").innerText = signupError.message;
      return;
    }
    alert("Account created! Please login again.");
    return;
  }

  if(error){ 
    document.getElementById("loginMsg").innerText = error.message; 
    return; 
  }

  currentUser = data.user;
  afterLogin();
}

document.getElementById("loginBtn").onclick = login;

// ----------------- After login setup -----------------
function afterLogin(){
  if(!currentUser) return;

  isAdmin = (currentUser.email === "admin@mess.com");
  document.getElementById("loginDiv").style.display="none";
  document.getElementById("appDiv").style.display="block";
  document.getElementById("adminTabBtn").style.display = isAdmin ? "inline-block" : "none";

  initMemberDropdowns();
  fetchData();
  if(isAdmin) fetchAdminData();
}

// ----------------- Logout -----------------
async function logout(){
  await supabase.auth.signOut();
  currentUser = null;
  document.getElementById("appDiv").style.display="none";
  document.getElementById("loginDiv").style.display="block";
}

// ----------------- Auth state -----------------
supabase.auth.onAuthStateChange((event, session)=>{
  if(session){
    currentUser = session.user;
    afterLogin();
  } else {
    document.getElementById("loginDiv").style.display="block";
    document.getElementById("appDiv").style.display="none";
  }
});

// ----------------- Helpers -----------------
function emailToMember(email){
  switch(email){
    case "shohan@mess.com": return "SHOHAN";
    case "nabil@mess.com": return "NABIL";
    case "tomal@mess.com": return "TOMAL";
    case "abir@mess.com": return "ABIR";
    case "masum@mess.com": return "MASUM";
    default: return null;
  }
}

function initMemberDropdowns(){
  const mealSelect = document.getElementById("mealMember");
  const bazarSelect = document.getElementById("bazarMember");
  mealSelect.innerHTML=""; bazarSelect.innerHTML="";
  if(isAdmin){
    membersList.forEach(m=>{
      mealSelect.innerHTML += `<option value="${m}">${m}</option>`;
      bazarSelect.innerHTML += `<option value="${m}">${m}</option>`;
    });
  } else {
    const m = emailToMember(currentUser.email);
    mealSelect.innerHTML = `<option value="${m}">${m}</option>`;
    bazarSelect.innerHTML = `<option value="${m}">${m}</option>`;
  }
}

function getTodayStr(){
  const d = new Date();
  const mm = (d.getMonth()+1).toString().padStart(2,'0');
  const dd = d.getDate().toString().padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ----------------- Add Meal -----------------
async function addMeal(){
  let member = document.getElementById("mealMember").value;
  if(!isAdmin) member = emailToMember(currentUser.email);
  const count = Number(document.getElementById("mealCount").value);
  if(!member || count<=0) return;

  const date = getTodayStr();
  for(let i=0;i<count;i++){
    await supabase.from('meals').insert([{member,date,added_by:currentUser.id}]);
  }
  document.getElementById("mealCount").value = 1;
}
document.getElementById("addMealBtn").onclick = addMeal;

// ----------------- Add Bazar -----------------
async function addBazar(){
  let member = document.getElementById("bazarMember").value;
  if(!isAdmin) member = emailToMember(currentUser.email);
  const item = document.getElementById("bazarItem").value.trim();
  const price = Number(document.getElementById("bazarPrice").value);
  if(!member || !item || price<=0) return;

  const date = getTodayStr();
  await supabase.from('bazar').insert([{member,item,price,date,added_by:currentUser.id}]);

  document.getElementById("bazarItem").value="";
  document.getElementById("bazarPrice").value="";
}
document.getElementById("addBazarBtn").onclick = addBazar;

// ----------------- Tabs -----------------
function openTab(tabName){
  document.querySelectorAll(".tab-content").forEach(tc=>tc.style.display="none");
  document.getElementById(tabName).style.display="block";
  document.querySelectorAll(".tab-btn").forEach(btn=>btn.classList.remove("active"));
  event.currentTarget.classList.add("active");
}

// ----------------- Fetch & Render -----------------
async function fetchData(){
  let { data: meals } = await supabase.from('meals').select('*');
  let { data: bazar } = await supabase.from('bazar').select('*');

  if(!isAdmin){
    meals = meals.filter(m=>m.added_by===currentUser.id);
    bazar = bazar.filter(b=>b.added_by===currentUser.id);
  }

  renderCalendar(meals);
  renderBazar(bazar);
  renderSummary(meals,bazar);
}

// ----------------- Render Functions -----------------
function renderCalendar(mealsSnap){
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year,month+1,0).getDate();

  let table = "<tr><th>Day</th>";
  membersList.forEach(m=>table+=`<th>${m}</th>`); 
  table+="</tr>";

  for(let d=1; d<=daysInMonth; d++){
    const dd = d.toString().padStart(2,'0');
    const mm = (month+1).toString().padStart(2,'0');
    const dateStr = `${year}-${mm}-${dd}`;
    table += `<tr><td>${d}</td>`;
    membersList.forEach(m=>{
      const count = mealsSnap.filter(meal=>meal.date===dateStr && meal.member===m).length;
      table += `<td>${count}</td>`;
    });
    table += "</tr>";
  }
  document.getElementById("mealCalendar").innerHTML = table;
}

function renderBazar(bazarSnap){
  const tbody = document.querySelector("#bazarTable tbody");
  tbody.innerHTML="";
  bazarSnap.forEach(b=>{
    tbody.innerHTML+=`<tr>
      <td>${b.date}</td>
      <td>${b.member}</td>
      <td>${b.item}</td>
      <td>${b.price}৳</td>
    </tr>`;
  });
}

function renderSummary(mealsSnap,bazarSnap){
  let summary="";
  const totalBazar = bazarSnap.reduce((s,b)=>s+b.price,0);
  const memberMeals = {};
  membersList.forEach(m=>memberMeals[m]=0);
  mealsSnap.forEach(m=>memberMeals[m.member]++);
  const totalMeal = mealsSnap.length;
  const mealRate = totalMeal ? (totalBazar/totalMeal).toFixed(2) : 0;

  summary += `<p><b>Total Bazar:</b> ${totalBazar}৳</p>`;
  summary += `<p><b>Total Meal:</b> ${totalMeal}</p>`;
  summary += `<p><b>Meal Rate:</b> ${mealRate}৳</p><hr>`;

  membersList.forEach(m=>{
    const memberBazar = bazarSnap.filter(b=>b.member===m).reduce((s,b)=>s+b.price,0);
    const mealCost = memberMeals[m]*mealRate;
    const balance = memberBazar - mealCost;
    summary += `<p><b>${m}</b> | Meal: ${memberMeals[m]} | Paid: ${memberBazar}৳ | Should Pay/Receive: ${balance.toFixed(2)}৳</p>`;
  });

  document.getElementById("summaryContent").innerHTML = summary;
}

// ----------------- Admin -----------------
async function fetchAdminData(){
  if(!isAdmin) return;

  const { data: meals } = await supabase.from('meals').select('*');
  const { data: bazar } = await supabase.from('bazar').select('*');

  const mealTbody = document.querySelector("#adminMeals tbody");
  mealTbody.innerHTML="";
  meals.forEach(m=>{
    mealTbody.innerHTML += `<tr>
      <td>${m.date}</td>
      <td>${m.member}</td>
      <td><button onclick="deleteMeal('${m.id}')">Delete</button></td>
    </tr>`;
  });

  const bazarTbody = document.querySelector("#adminBazar tbody");
  bazarTbody.innerHTML="";
  bazar.forEach(b=>{
    bazarTbody.innerHTML += `<tr>
      <td>${b.date}</td>
      <td>${b.member}</td>
      <td>${b.item}</td>
      <td>${b.price}৳</td>
      <td><button onclick="deleteBazar('${b.id}')">Delete</button></td>
    </tr>`;
  });
}

async function deleteMeal(id){ if(isAdmin) await supabase.from('meals').delete().eq('id',id); fetchData(); fetchAdminData(); }
async function deleteBazar(id){ if(isAdmin) await supabase.from('bazar').delete().eq('id',id); fetchData(); fetchAdminData(); }
