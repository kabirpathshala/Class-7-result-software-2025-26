/***************
 * DATA LAYER  *
 ***************/
const SUBJECTS = ["English","Hindi","Mathematics","Science","Social Science","Sanskrit"];
const PWT_CODES = ["PWT1","PWT2","PWT3","PWT4"];
const EXAM_MAX = { PWT1:40, PWT2:40, PWT3:40, PWT4:40, HY:100, AN:100 };
const TERM_OF = (exam) => (["PWT1","PWT2","HY"].includes(exam) ? "HY" : "AN");

// Persistent state
let studentsByClass = load('studentsByClass') || { "6":[], "7":[], "8":[] };
// marks[class][subject][exam][roll] = number
let marks = load('marks') || {};
// coschol[class][subject][term] = { ma,se,pf }
let coschol = load('coschol') || {};

function save(key, data){ localStorage.setItem(key, JSON.stringify(data)); }
function load(key){ try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function persist(){ save('studentsByClass', studentsByClass); save('marks', marks); save('coschol', coschol); }
function ensure(obj, ...keys){
  let ref=obj;
  for(const k of keys){ if(!ref[k]) ref[k]={}; ref=ref[k]; }
  return ref;
}

/******************
 * TAB SWITCHING  *
 ******************/
const tabs = document.querySelectorAll('.tab');
const panels = {
  students: document.getElementById('tab-students'),
  marks: document.getElementById('tab-marks'),
  marksheets: document.getElementById('tab-marksheets'),
  report: document.getElementById('tab-report'),
};
tabs.forEach(b=>{
  b.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const name = b.dataset.tab;
    Object.values(panels).forEach(p=>p.classList.add('hidden'));
    panels[name].classList.remove('hidden');
  });
});

/*********************
 * STUDENTS MANAGER  *
 *********************/
const stuClass = document.getElementById('stuClass');
const stuRoll = document.getElementById('stuRoll');
const stuName = document.getElementById('stuName');
const addStudentBtn = document.getElementById('addStudentBtn');
const viewClass = document.getElementById('viewClass');
const studentsTableBody = document.querySelector('#studentsTable tbody');
const importDemo = document.getElementById('importDemo');
const clearClassBtn = document.getElementById('clearClass');
const clearAllBtn = document.getElementById('clearAll');

function renderStudentsTable(){
  const cls = viewClass.value;
  const rows = studentsByClass[cls] || [];
  rows.sort((a,b)=>a.roll-b.roll);
  studentsTableBody.innerHTML = rows.map(s=>`
    <tr>
      <td>${s.roll}</td>
      <td>${esc(s.name)}</td>
      <td>
        <button class="bad" data-del="${s.roll}">Delete</button>
      </td>
    </tr>
  `).join('');
  studentsTableBody.querySelectorAll('[data-del]').forEach(btn=>{
    btn.onclick = ()=>{
      const roll = Number(btn.dataset.del);
      studentsByClass[cls] = rows.filter(r=>r.roll!==roll);
      persist(); renderStudentsTable();
    };
  });
}

addStudentBtn.onclick = ()=>{
  const cls = stuClass.value;
  const roll = Number(stuRoll.value);
  const name = (stuName.value||"").trim();
  if(!roll || !name){ alert('Please fill Roll and Name'); return; }
  const list = studentsByClass[cls] || (studentsByClass[cls]=[]);
  if(list.some(s=>s.roll===roll)){ alert('Roll already exists in this class'); return; }
  list.push({ roll, name });
  stuRoll.value=""; stuName.value="";
  persist(); renderStudentsTable();
};
viewClass.onchange = renderStudentsTable;

importDemo.onclick = ()=>{
  studentsByClass = {
    "6":[{roll:1,name:"Aarav"},{roll:2,name:"Anaya"},{roll:3,name:"Kabir"}],
    "7":[{roll:1,name:"Rohit"},{roll:2,name:"Sana"},{roll:3,name:"Iqra"}],
    "8":[{roll:1,name:"Kunal"},{roll:2,name:"Meera"},{roll:3,name:"Arnav"}],
  };
  persist(); renderStudentsTable();
  alert('Demo students loaded for classes 6, 7, 8.');
};

clearClassBtn.onclick = ()=>{
  const cls = viewClass.value;
  if(!confirm(`Delete ALL students & marks of Class ${cls}?`)) return;
  studentsByClass[cls]=[];
  // also wipe marks & coschol for this class
  if(marks[cls]) delete marks[cls];
  if(coschol[cls]) delete coschol[cls];
  persist(); renderStudentsTable();
  alert(`Cleared Class ${cls}`);
};

clearAllBtn.onclick = ()=>{
  if(!confirm('Delete ALL data (students, marks, coschol)?')) return;
  studentsByClass={"6":[],"7":[],"8":[]}; marks={}; coschol={};
  persist(); renderStudentsTable();
  alert('All data cleared.');
};

// Initial render
renderStudentsTable();

/****************
 * MARKS ENTRY  *
 ****************/
const marksClass = document.getElementById('marksClass');
const marksSubject = document.getElementById('marksSubject');
const marksExam = document.getElementById('marksExam');
const loadGridBtn = document.getElementById('loadGrid');
const gridTitle = document.getElementById('gridTitle');
const marksTableBody = document.querySelector('#marksTable tbody');
const saveMarksBtn = document.getElementById('saveMarks');
const computeTermBtn = document.getElementById('computeTerm');
const termOutput = document.getElementById('termOutput');
const coPanel = document.getElementById('coPanel');
const coTermLabel = document.getElementById('coTermLabel');
const coMA = document.getElementById('coMA');
const coSE = document.getElementById('coSE');
const coPF = document.getElementById('coPF');
const saveCoBtn = document.getElementById('saveCo');

function maxFor(exam){ return EXAM_MAX[exam] || 0; }

function loadGrid(){
  const cls = marksClass.value;
  const subj = marksSubject.value;
  const exam = marksExam.value;
  const max = maxFor(exam);
  const list = (studentsByClass[cls]||[]).slice().sort((a,b)=>a.roll-b.roll);

  gridTitle.textContent = `Class ${cls} — ${subj} — ${exam} (Max ${max})`;
  const store = ensure(marks, cls, subj, exam);
  marksTableBody.innerHTML = list.map(s=>{
    const v = store[s.roll] ?? "";
    return `<tr>
      <td>${s.roll}</td>
      <td>${esc(s.name)}</td>
      <td><input type="number" min="0" max="${max}" step="1" value="${v}" data-roll="${s.roll}"></td>
    </tr>`;
  }).join('');

  // Show/Load Co-Scholastic for HY/AN term
  const term = TERM_OF(exam);
  coTermLabel.textContent = `Term: ${term}`;
  if(["HY","AN"].includes(exam)){
    coPanel.classList.remove('hidden');
    const co = ensure(coschol, cls, subj)[term] || (ensure(coschol, cls, subj)[term]={ma:0,se:0,pf:0});
    coMA.value = co.ma ?? 0;
    coSE.value = co.se ?? 0;
    coPF.value = co.pf ?? 0;
  }else{
    coPanel.classList.add('hidden');
  }
  termOutput.textContent = "";
}

loadGridBtn.onclick = loadGrid;

saveCoBtn.onclick = ()=>{
  const cls = marksClass.value, subj = marksSubject.value, exam = marksExam.value;
  const term = TERM_OF(exam);
  const co = ensure(coschol, cls, subj);
  co[term] = { ma: num0(coMA.value), se: num0(coSE.value), pf: num0(coPF.value) };
  persist();
  alert('Co-Scholastic saved for this subject & term.');
};

saveMarksBtn.onclick = ()=>{
  const cls = marksClass.value, subj = marksSubject.value, exam = marksExam.value;
  const max = maxFor(exam);
  const store = ensure(marks, cls, subj, exam);
  let ok=true, count=0;
  document.querySelectorAll('#marksTable tbody input[type=number]').forEach(inp=>{
    const roll = Number(inp.dataset.roll);
    const val = inp.value==="" ? null : Number(inp.value);
    if(val!==null && (val<0 || val>max)) ok=false;
    store[roll] = val;
    count++;
  });
  persist();
  termOutput.textContent = ok
    ? `Saved marks for ${count} entries. ✅`
    : `Saved with warnings (values must be 0–${max}). ⚠️`;
};

computeTermBtn.onclick = ()=>{
  const cls = marksClass.value, subj = marksSubject.value, exam = marksExam.value;
  const term = TERM_OF(exam);
  if(!["HY","AN"].includes(exam)){ termOutput.textContent = "Switch Exam to HY or AN to compute term final."; return; }

  const list = (studentsByClass[cls]||[]).slice().sort((a,b)=>a.roll-b.roll);
  const M = marks?.[cls]?.[subj] || {};
  const CO = coschol?.[cls]?.[subj]?.[term] || {ma:0,se:0,pf:0};

  const lines = [`Term: ${term} | Subject: ${subj}`];
  for(const s of list){
    const examRaw = num0(M?.[exam]?.[s.roll]); // /100
    const bestPT = term==="HY"
        ? Math.max(num0(M?.PWT1?.[s.roll]), num0(M?.PWT2?.[s.roll])) // /40
        : Math.max(num0(M?.PWT3?.[s.roll]), num0(M?.PWT4?.[s.roll])); // /40

    const final100 = round1(
      0.5*examRaw + 0.5*bestPT + (CO.ma||0) + (CO.se||0) + (CO.pf||0)
    );
    lines.push(`${s.roll}. ${esc(s.name)}: ${final100} / 100`);
  }
  termOutput.textContent = lines.join('\n');
};

/****************
 * MARKSHEETS   *
 ****************/
const msClass = document.getElementById('msClass');
const msType = document.getElementById('msType');
const msWrap = document.getElementById('msWrap');
document.getElementById('renderMS').onclick = ()=>renderMarksheets(msClass.value, msType.value);
document.getElementById('exportCSV').onclick = exportCurrentCSV;

let lastCSV = null;
function renderMarksheets(cls, type){
  const list = (studentsByClass[cls]||[]).slice().sort((a,b)=>a.roll-b.roll);
  if(list.length===0){ msWrap.innerHTML = `<div class="muted">No students in Class ${cls}.</div>`; return; }

  let html = '';
  lastCSV = [];

  if(type==="RAW"){
    html += `<div class="card" style="background:#0f1524"><strong>Class ${cls} — Raw Exam Marks</strong></div>`;
    for(const subj of SUBJECTS){
      html += `<h3>${subj}</h3><table><thead>
        <tr><th>Roll</th><th>Name</th><th>PWT1/40</th><th>PWT2/40</th><th>PWT3/40</th><th>PWT4/40</th><th>HY/100</th><th>AN/100</th></tr>
      </thead><tbody>`;
      const rowsCSV = [["Roll","Name","PWT1","PWT2","PWT3","PWT4","HY","AN"]];
      for(const s of list){
        const M = marks?.[cls]?.[subj] || {};
        const r = [
          s.roll, esc(s.name),
          show(M?.PWT1?.[s.roll]), show(M?.PWT2?.[s.roll]),
          show(M?.PWT3?.[s.roll]), show(M?.PWT4?.[s.roll]),
          show(M?.HY?.[s.roll]), show(M?.AN?.[s.roll]),
        ];
        rowsCSV.push(r);
        html += `<tr>
          <td>${s.roll}</td><td>${esc(s.name)}</td>
          <td>${show(M?.PWT1?.[s.roll])}</td>
          <td>${show(M?.PWT2?.[s.roll])}</td>
          <td>${show(M?.PWT3?.[s.roll])}</td>
          <td>${show(M?.PWT4?.[s.roll])}</td>
          <td>${show(M?.HY?.[s.roll])}</td>
          <td>${show(M?.AN?.[s.roll])}</td>
        </tr>`;
      }
      html += `</tbody></table><div class="hr"></div>`;
      lastCSV.push({ title:`${subj} (Raw)`, rows:rowsCSV });
    }
  } else {
    const term = (type==="HYFINAL") ? "HY" : "AN";
    html += `<div class="card" style="background:#0f1524"><strong>Class ${cls} — ${term} Final (100)</strong> <span class="pill">0.5×Exam + 0.5×Best PWT + MA+SE+PF</span></div>`;
    for(const subj of SUBJECTS){
      const CO = coschol?.[cls]?.[subj]?.[term] || {ma:0,se:0,pf:0};
      const headerCSV = ["Roll","Name", `${term}Exam`, "BestPT", "MA","SE","PF", `${term}Final`];
      const rowsCSV = [headerCSV];
      html += `<h3>${subj} <span class="badge">MA:${CO.ma||0} SE:${CO.se||0} PF:${CO.pf||0}</span></h3>
        <table><thead>
          <tr><th>Roll</th><th>Name</th><th>${term} Exam (/100)</th><th>Best PWT (/40)</th><th>MA</th><th>SE</th><th>PF</th><th>${term} Final (/100)</th></tr>
        </thead><tbody>`;
      for(const s of list){
        const M = marks?.[cls]?.[subj] || {};
        const examRaw = num0(M?.[term]?.[s.roll]);
        const bestPT = term==="HY"
          ? Math.max(num0(M?.PWT1?.[s.roll]), num0(M?.PWT2?.[s.roll]))
          : Math.max(num0(M?.PWT3?.[s.roll]), num0(M?.PWT4?.[s.roll]));
        const final100 = round1(0.5*examRaw + 0.5*bestPT + (CO.ma||0) + (CO.se||0) + (CO.pf||0));
        rowsCSV.push([s.roll, esc(s.name), examRaw, bestPT, CO.ma||0, CO.se||0, CO.pf||0, final100]);
        html += `<tr>
          <td>${s.roll}</td><td>${esc(s.name)}</td>
          <td>${examRaw}</td><td>${bestPT}</td>
          <td>${CO.ma||0}</td><td>${CO.se||0}</td><td>${CO.pf||0}</td>
          <td class="score">${final100}</td>
        </tr>`;
      }
      html += `</tbody></table><div class="hr"></div>`;
      lastCSV.push({ title:`${subj} (${term} Final)`, rows:rowsCSV });
    }
  }

  msWrap.innerHTML = html;
}

function exportCurrentCSV(){
  if(!lastCSV || lastCSV.length===0){ alert('Render a marksheet first.'); return; }
  let out = '';
  lastCSV.forEach(block=>{
    out += `## ${block.title}\n`;
    block.rows.forEach(r=>{ out += r.map(csvSafe).join(',') + '\n'; });
    out += '\n';
  });
  downloadText(out, `marksheets_${Date.now()}.csv`);
}

/****************
 * REPORT CARD  *
 ****************/
const rcClass = document.getElementById('rcClass');
const rcRoll = document.getElementById('rcRoll');
const rcWrap = document.getElementById('rcWrap');
document.getElementById('renderRC').onclick = ()=>renderReportCard(rcClass.value, Number(rcRoll.value||0));
document.getElementById('printRC').onclick = ()=>window.print();

function renderReportCard(cls, roll){
  const stu = (studentsByClass[cls]||[]).find(s=>s.roll===roll);
  if(!stu){ rcWrap.innerHTML = `<div class="muted">Student not found in Class ${cls}.</div>`; return; }

  let total = 0, maxTotal = SUBJECTS.length * 100;
  let rows = '';
  for(const subj of SUBJECTS){
    const HYF = computeTermFinal(cls, subj, 'HY', roll);
    const ANF = computeTermFinal(cls, subj, 'AN', roll);
    const OVER = round1(0.4*HYF + 0.6*ANF);
    total += OVER;
    const grade = gradeFrom(OVER);
    rows += `<tr>
      <td>${subj}</td>
      <td>${HYF}</td>
      <td>${ANF}</td>
      <td class="score">${OVER}</td>
      <td>${grade}</td>
    </tr>`;
  }
  const pct = round1((total/maxTotal)*100);
  const overallGrade = gradeFrom(pct);

  rcWrap.innerHTML = `
    <div class="card print-card">
      <div class="row" style="justify-content:space-between">
        <div><strong>EMRS Ghughri</strong><div class="muted">Session: 2024–25</div></div>
        <div class="pill">Class ${cls} • Roll ${roll}</div>
      </div>
      <div style="margin:8px 0 14px"><strong>Student:</strong> ${esc(stu.name)}</div>

      <table>
        <thead><tr><th>Subject</th><th>HY Final (/100)</th><th>AN Final (/100)</th><th>Overall 40/60 (/100)</th><th>Grade</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="row" style="margin-top:12px;gap:16px">
        <div><strong>Total:</strong> ${round1(total)} / ${maxTotal}</div>
        <div><strong>Percentage:</strong> ${pct}%</div>
        <div><strong>Overall Grade:</strong> ${overallGrade}</div>
      </div>

      <div class="hr"></div>
      <div class="row" style="justify-content:space-between">
        <div>Class Teacher: _____________</div>
        <div>Principal: _____________</div>
        <div>Date: _____________</div>
      </div>
    </div>
  `;
}

/******************
 * CALC HELPERS   *
 ******************/
function computeTermFinal(cls, subj, term, roll){
  const M = marks?.[cls]?.[subj] || {};
  const CO = coschol?.[cls]?.[subj]?.[term] || {ma:0,se:0,pf:0};
  const examRaw = num0(M?.[term]?.[roll]); // HY or AN /100
  const bestPT = term==='HY'
    ? Math.max(num0(M?.PWT1?.[roll]), num0(M?.PWT2?.[roll]))
    : Math.max(num0(M?.PWT3?.[roll]), num0(M?.PWT4?.[roll]));
  const final100 = 0.5*examRaw + 0.5*bestPT + (CO.ma||0)+(CO.se||0)+(CO.pf||0);
  return round1(final100);
}

function gradeFrom(x){
  if(x>=91) return 'A1';
  if(x>=81) return 'A2';
  if(x>=71) return 'B1';
  if(x>=61) return 'B2';
  if(x>=51) return 'C1';
  if(x>=41) return 'C2';
  if(x>=33) return 'D';
  return 'E';
}

/******************
 * UTILITIES      *
 ******************/
function num0(v){ if(v===null||v===undefined||v==="") return 0; const n=Number(v); return Number.isFinite(n)?n:0; }
function round1(x){ return Math.round(x*10)/10; }
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function show(v){ return (v===null||v===undefined||v==="") ? '' : v; }
function csvSafe(x){ const s=String(x??""); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
function downloadText(text, filename){
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}

// End of app.js
