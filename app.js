/* app.js — Full offline logic with admin actions (remarks, log, mark, delete, etc.)
   Works with the provided index.html and style.css, uses Chart.js for charts.
*/


document.addEventListener('DOMContentLoaded', () => {
  /* ===== Storage keys ===== */
  const USERS_KEY = 'afj_users_final_v2';
  const REPORTS_KEY = 'afj_reports_final_v2';
  const SESSION_KEY = 'afj_session_final_v2';
  const THEME_KEY = 'afj_theme_final_v2';
  const NOTIF_KEY = 'afj_notif_final_v2';


  /* ===== Helpers ===== */
  const $ = id => document.getElementById(id);
  const qAll = sel => Array.from(document.querySelectorAll(sel));
  const esc = s => (s === undefined || s === null) ? '' : String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');


  /* ===== Element refs (may or may not exist yet in user's HTML) ===== */
  const loader = $('loader');
  const authWrap = $('authWrap');
  const loginForm = $('loginForm');
  const loginUser = $('loginUser');
  const loginPass = $('loginPass');
  const loginFeedback = $('loginFeedback');
  const openSignup = $('openSignup');
  const signupModal = $('signupModal');
  const signupForm = $('signupForm');
  const signupFeedback = $('signupFeedback');
  const closeSignup = $('closeSignup');


  const remarksModal = $('remarksModal'); // may exist in original; if not we'll create
  const remarkPreset = $('remarkPreset');
  const remarkCustom = $('remarkCustom');
  const remarkNewStatus = $('remarkNewStatus');
  const saveRemarkBtn = $('saveRemarkBtn');
  const closeRemarks = $('closeRemarks');
  const remarksFeedback = $('remarksFeedback');


  const logModal = $('logModal');
  const logList = $('logList');
  const closeLog = $('closeLog');


  const contactModal = $('contactModal');
  const contactInfo = $('contactInfo');
  const closeContact = $('closeContact');


  const app = $('app');
  const navLinks = qAll('.nav-link');
  const pageTitle = $('pageTitle');
  const profileName = $('profileName');
  const profileRole = $('profileRole');
  const themeToggle = $('themeToggle');
  const collapseBtn = $('collapseBtn');
  const logoutBtn = $('logoutBtn');
  const quickReportBtn = $('quickReportBtn');


  const chartReports = $('chartReports') || $('reportsChart') || $('reportsChart'); // handle variants
  const dashboardStats = $('dashboardStats');


  const reportForm = $('reportForm');
  const reportCategory = $('reportCategory') || $('category');
  const reportDesc = $('reportDesc') || $('description') || $('reportDescription');
  const reportPhoto = $('reportPhoto') || $('photo');
  const reportFeedback = $('reportFeedback');


  const userProfile = $('userProfile');
  const userReportsEl = $('userReports');


  const notification = $('notification');
  const badgeTotal = $('badgeTotal');
  const yearEl = $('year');
  const footerClock = $('footerClock');
  const clickSound = $('clickSound');


  const pages = ['home','dashboard','report','profile','about','contact'];


  /* ===== State ===== */
  let currentUser = null;
  let chart = null;
  let activeRemarkTarget = null;
  let soundOn = true;


  /* ===== Ensure storage defaults ===== */
  if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(REPORTS_KEY)) localStorage.setItem(REPORTS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(NOTIF_KEY)) localStorage.setItem(NOTIF_KEY, JSON.stringify([]));


  /* ===== Provide missing modals if not present in HTML (to ensure admin features work) ===== */
  function ensureModals() {
    if (!remarksModal) {
      const html = `
        <div id="remarksModal" class="modal hidden" role="dialog" aria-modal="true">
          <div class="modal-card">
            <h3 id="remarksTitle">Add Remark / Action</h3>
            <div class="form">
              <label for="remarkPreset">Quick remark</label>
              <select id="remarkPreset">
                <option value="">— choose quick remark —</option>
                <option value="Report received and logged for review">Report received and logged for review</option>
                <option value="Under verification by barangay staff">Under verification by barangay staff</option>
                <option value="In progress — maintenance on site">In progress — maintenance on site</option>
                <option value="Resolved — cleared and verified">Resolved — cleared and verified</option>
                <option value="Invalid / insufficient evidence">Invalid / insufficient evidence</option>
              </select>
              <label for="remarkCustom">Custom remark</label>
              <textarea id="remarkCustom" rows="3" placeholder="Add additional details (optional)"></textarea>
              <label for="remarkNewStatus">Change status to</label>
              <select id="remarkNewStatus">
                <option value="">(no change)</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Urgent">Urgent</option>
                <option value="Done">Done</option>
                <option value="Archived">Archived</option>
              </select>
              <div class="form-row" style="margin-top:10px;">
                <button id="saveRemarkBtn" class="btn btn-primary">Save remark</button>
                <button id="closeRemarks" class="btn btn-ghost">Cancel</button>
              </div>
            </div>
            <p id="remarksFeedback" class="feedback"></p>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    }


    if (!logModal) {
      const html = `
        <div id="logModal" class="modal hidden" role="dialog" aria-modal="true">
          <div class="modal-card">
            <h3>Report Log</h3>
            <div id="logList" style="max-height:360px;overflow:auto"></div>
            <div style="margin-top:10px"><button id="closeLog" class="btn btn-ghost">Close</button></div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    }


    if (!contactModal) {
      const html = `
        <div id="contactModal" class="modal hidden" role="dialog" aria-modal="true">
          <div class="modal-card">
            <h3>Contact Resident</h3>
            <div id="contactInfo"></div>
            <div style="margin-top:10px"><button id="closeContact" class="btn btn-ghost">Close</button></div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    }


    // Refresh references after possibly injecting
    window.remarksModal = $('remarksModal');
    window.remarkPreset = $('remarkPreset');
    window.remarkCustom = $('remarkCustom');
    window.remarkNewStatus = $('remarkNewStatus');
    window.saveRemarkBtn = $('saveRemarkBtn');
    window.closeRemarks = $('closeRemarks');
    window.remarksFeedback = $('remarksFeedback');


    window.logModal = $('logModal');
    window.logList = $('logList');
    window.closeLog = $('closeLog');


    window.contactModal = $('contactModal');
    window.contactInfo = $('contactInfo');
    window.closeContact = $('closeContact');


    // Wire up close buttons
    closeRemarks?.addEventListener('click', ()=> remarksModal.classList.add('hidden'));
    closeLog?.addEventListener('click', ()=> logModal.classList.add('hidden'));
    closeContact?.addEventListener('click', ()=> contactModal.classList.add('hidden'));
  }
  ensureModals();


  /* ===== Dashboard reports list container: ensure exists (we'll attach UI here) ===== */
  function ensureReportsListContainer() {
    const dash = $('dashboard');
    if (!dash) return null;
    let list = dash.querySelector('#reportsList');
    if (!list) {
      // create a reports panel below any dashboardStats
      list = document.createElement('div');
      list.id = 'reportsList';
      list.className = 'reports-list';
      list.innerHTML = '<p class="muted">No reports yet.</p>';
      if (dashboardStats && dashboardStats.parentNode) {
        dashboardStats.parentNode.insertBefore(list, dashboardStats.nextSibling);
      } else {
        dash.appendChild(list);
      }
    }
    return list;
  }
  const reportsList = ensureReportsListContainer();


  /* ===== Background lazy loader (if bgImg exists) ===== */
  const bgImg = $('bgImg');
  if (bgImg) {
    bgImg.style.opacity = 0;
    setTimeout(()=> { bgImg.style.opacity = 1; }, 120);
  }


  /* ===== Loader -> show auth or restore session ===== */
  setTimeout(()=> {
    loader && loader.classList.add('hidden');
    const s = localStorage.getItem(SESSION_KEY);
    if (s) { currentUser = JSON.parse(s); enterApp(); }
    else { authWrap && authWrap.classList.remove('hidden'); loginUser && loginUser.focus(); }
  }, 600);


  /* ===== Theme ===== */
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);
  themeToggle?.addEventListener('click', ()=> {
    const now = document.body.classList.toggle('light') ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, now);
    applyTheme(now);
  });
  function applyTheme(name){
    if (name === 'light') { document.body.classList.add('light'); themeToggle && (themeToggle.textContent='🌞'); }
    else { document.body.classList.remove('light'); themeToggle && (themeToggle.textContent='🌙'); }
    if (chart) chart.update();
  }


  /* ===== Sound ===== */
  soundOn = localStorage.getItem('afj_sound') !== 'off';
  function toggleSound(){ soundOn = !soundOn; localStorage.setItem('afj_sound', soundOn ? 'on':'off'); }
  function playClick(){ if (!soundOn || !clickSound) return; try{ clickSound.currentTime = 0; clickSound.play(); }catch(e){} }


  /* ===== Signup wiring ===== */
  openSignup?.addEventListener('click', ()=> { signupModal.classList.remove('hidden'); $('signupName')?.focus(); });
  closeSignup?.addEventListener('click', ()=> { signupModal.classList.add('hidden'); signupFeedback.textContent=''; signupForm.reset(); });
  signupForm?.addEventListener('submit', (ev)=> {
    ev.preventDefault();
    const name = $('signupName').value.trim();
    const username = $('signupUser').value.trim();
    const password = $('signupPass').value;
    if (!name || !username || !password) { signupFeedback.style.color='#ffc6c6'; signupFeedback.textContent='Please complete all fields.'; return; }
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.some(u=>u.username.toLowerCase() === username.toLowerCase())) { signupFeedback.style.color='#ffc6c6'; signupFeedback.textContent='Username already exists.'; return; }
    users.push({ name, username, password, role:'resident', created:new Date().toISOString() });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    signupFeedback.style.color='#b8ffd7'; signupFeedback.textContent='Account created. You may log in.';
    signupForm.reset(); setTimeout(()=> { signupModal.classList.add('hidden'); signupFeedback.textContent=''; }, 900);
  });


  /* ===== Login ===== */
  loginForm?.addEventListener('submit', (ev)=> {
    ev.preventDefault();
    const u = loginUser.value.trim(); const p = loginPass.value;
    loginFeedback.textContent = '';
    if (u === 'barangay_admin' && p === 'barangay123') {
      currentUser = { name:'Barangay Admin', username:'barangay_admin', admin:true, role:'admin' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      loginFeedback.style.color='#b8ffd7'; loginFeedback.textContent='Admin login successful.';
      setTimeout(()=> enterApp(), 550); return;
    }
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const found = users.find(x => x.username === u && x.password === p);
    if (!found) { loginFeedback.style.color='#ffc6c6'; loginFeedback.textContent='Invalid credentials.'; return; }
    currentUser = { name: found.name, username: found.username, admin:false, role: found.role || 'resident' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    loginFeedback.style.color='#b8ffd7'; loginFeedback.textContent = `Welcome, ${found.name}!`;
    setTimeout(()=> enterApp(), 550);
  });


  /* ===== Enter app ===== */
  function enterApp(){
    authWrap && authWrap.classList.add('hidden');
    signupModal && signupModal.classList.add('hidden');
    app && app.classList.remove('hidden');
    if (profileName) profileName.textContent = currentUser.name;
    if (profileRole) profileRole.textContent = (currentUser.role || 'RESIDENT').toUpperCase();
    if (reportForm && currentUser) {
      const nameField = $('name');
      if (nameField) nameField.value = currentUser.name;
    }
    showPage('dashboard'); updateAll(); showToast(`Welcome ${currentUser.name}`);
  }


  /* ===== Logout ===== */
  logoutBtn?.addEventListener('click', ()=> { localStorage.removeItem(SESSION_KEY); location.reload(); });


  /* ===== Navigation wiring ===== */
  navLinks.forEach(a=> a.addEventListener('click', (e)=> { e.preventDefault(); navLinks.forEach(x=>x.classList.remove('active')); a.classList.add('active'); showPage(a.dataset.page); }));
  function showPage(id){
    pageTitle && (pageTitle.textContent = id.charAt(0).toUpperCase() + id.slice(1));
    pages.forEach(p => { const sec = $(p); if (sec) sec.classList.add('hidden'); });
    const el = $(id); if (el) el.classList.remove('hidden');
    if (id === 'dashboard') { updateStats(); renderChart(); loadReportsToUI(); }
    if (id === 'report') { /* nothing extra */ }
    if (id === 'profile') updateProfilePage();
  }


  /* ===== Collapse ===== */
  collapseBtn?.addEventListener('click', ()=> $('sidebar')?.classList.toggle('collapsed'));


  /* ===== Quick report ===== */
  quickReportBtn?.addEventListener('click', ()=> { showPage('report'); window.scrollTo({ top:0, behavior:'smooth' }); });


  /* ===== Report submission (with photo preview support) ===== */
  const previewWrap = $('previewWrap'); const previewImg = $('previewImg');
  if (reportPhoto) {
    reportPhoto.addEventListener('change', (e)=> {
      const f = e.target.files[0];
      if (!f) { previewWrap?.classList.add('hidden'); if (previewImg) previewImg.src=''; return; }
      const fr = new FileReader(); fr.onload = ev => { if (previewImg) previewImg.src = ev.target.result; previewWrap?.classList.remove('hidden'); }; fr.readAsDataURL(f);
    });
  }


  reportForm?.addEventListener('submit', (ev)=> {
    ev.preventDefault();
    if (!currentUser) { alert('Please log in first.'); return; }
    const category = (reportCategory && reportCategory.value) || $('category')?.value || 'Other';
    const description = (reportDesc && reportDesc.value.trim()) || $('description')?.value.trim() || '';
    const location = $('location') ? $('location').value.trim() : '';
    if (!description) { reportFeedback.style.color='#ffc6c6'; reportFeedback.textContent='Complete description.'; return; }
    const push = (photoData) => {
      const arr = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
      const id = `r_${Date.now()}_${Math.floor(Math.random()*9999)}`;
      const newR = {
        id,
        reporterName: currentUser.name,
        reporterUsername: currentUser.username,
        category,
        location,
        description,
        photo: photoData || '',
        date: new Date().toISOString(),
        status: 'Pending',
        remarkLogs: []
      };
      arr.push(newR); localStorage.setItem(REPORTS_KEY, JSON.stringify(arr));
      reportForm.reset(); previewWrap?.classList.add('hidden'); if (previewImg) previewImg.src='';
      reportFeedback.style.color='#b8ffd7'; reportFeedback.textContent='Report submitted.';
      updateAll(); showToast('Report submitted.');
      pushLog(newR.id, `Report submitted by ${currentUser.username}`, 'System');
    };
    if (reportPhoto && reportPhoto.files && reportPhoto.files[0]) {
      const fr = new FileReader(); fr.onload = ev => push(ev.target.result); fr.readAsDataURL(reportPhoto.files[0]);
    } else push('');
  });


  /* ===== Load reports UI and add admin actions ===== */
  function loadReportsToUI(){
    const list = ensureReportsListContainer();
    if (!list) return;
    let arr = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    arr.sort((a,b)=> new Date(b.date) - new Date(a.date));
    if (arr.length === 0) { list.innerHTML = '<p class="muted">No reports to display.</p>'; badgeTotal && (badgeTotal.textContent = ` 0 `); return; }
    const q = ( $('searchInput') && $('searchInput').value.trim().toLowerCase() ) || '';
    const cat = ( $('categoryFilter') && $('categoryFilter').value ) || '';
    const filtered = arr.filter(r => {
      if (cat && r.category !== cat) return false;
      if (!q) return true;
      return (r.reporterName && r.reporterName.toLowerCase().includes(q)) ||
             (r.reporterUsername && r.reporterUsername.toLowerCase().includes(q)) ||
             (r.location && r.location.toLowerCase().includes(q)) ||
             (r.description && r.description.toLowerCase().includes(q));
    });


    list.innerHTML = '';
    filtered.forEach(r => {
      const card = document.createElement('div'); card.className = 'reportCard';
      if (r.status === 'Archived') card.classList.add('archived');
      const dateStr = new Date(r.date).toLocaleString();
      const statusClass = statusColorClass(r.status);
      const pct = statusToPercent(r.status);


      let actionsHtml = `<div class="report-actions">`;
      actionsHtml += `<button class="smallBtn viewLog" data-id="${r.id}">View Log</button> `;
      if (currentUser && currentUser.admin) {
        actionsHtml += `<button class="smallBtn addRemark" data-id="${r.id}">Add Remark</button> `;
        actionsHtml += `<button class="smallBtn markBtn" data-id="${r.id}">${r.status==='Pending' ? 'Mark Done':'Mark Pending'}</button> `;
        actionsHtml += `<button class="smallBtn small requestInfo" data-id="${r.id}">Request Info</button> `;
        actionsHtml += `<button class="smallBtn small contactBtn" data-id="${r.id}">Contact</button> `;
        actionsHtml += `<button class="smallBtn small printBtn" data-id="${r.id}">Print</button> `;
        actionsHtml += `<button class="smallBtn danger delBtn" data-id="${r.id}">Delete</button>`;
      } else {
        const ownerPending = currentUser && currentUser.username === r.reporterUsername && r.status === 'Pending';
        if (ownerPending) actionsHtml += `<button class="smallBtn danger delBtn" data-id="${r.id}">Delete My Report</button>`;
        actionsHtml += `<button class="smallBtn small contactBtn" data-id="${r.id}">Contact</button> `;
        actionsHtml += `<button class="smallBtn small printBtn" data-id="${r.id}">Print</button> `;
      }
      actionsHtml += `</div>`;


      card.innerHTML = `
        <div class="report-meta">
          <div>
            <strong>${esc(r.reporterName)}</strong>
            <div class="muted" style="font-size:12px">@${esc(r.reporterUsername)} • ${dateStr}</div>
          </div>
          <div>
            <span class="status ${esc(statusClass)}">${esc(r.status)}</span>
          </div>
        </div>
        <div style="margin-top:8px"><strong>Category:</strong> ${esc(r.category)} ${r.location ? ' • <strong>Location:</strong> '+esc(r.location) : ''}</div>
        <div style="margin-top:8px">${esc(r.description)}</div>
        ${r.photo ? `<img src="${r.photo}" alt="photo" />` : ''}
        <div class="card-status-bar" data-pct="${pct}"><i style="width:${pct}%;"></i></div>
        <div>${actionsHtml}</div>
      `;
      list.appendChild(card);
    });


    // wire action buttons
    qAll('.addRemark').forEach(b => b.addEventListener('click', e=> openRemarksModal(e.currentTarget.dataset.id)));
    qAll('.viewLog').forEach(b => b.addEventListener('click', e=> openLogModal(e.currentTarget.dataset.id)));
    qAll('.markBtn').forEach(b => b.addEventListener('click', e=> toggleMark(e.currentTarget.dataset.id)));
    qAll('.delBtn').forEach(b => b.addEventListener('click', e=> attemptDelete(e.currentTarget.dataset.id)));
    qAll('.requestInfo').forEach(b => b.addEventListener('click', e=> requestMoreInfo(e.currentTarget.dataset.id)));
    qAll('.contactBtn').forEach(b => b.addEventListener('click', e=> contactResident(e.currentTarget.dataset.id)));
    qAll('.printBtn').forEach(b => b.addEventListener('click', e=> printReport(e.currentTarget.dataset.id)));


    badgeTotal && (badgeTotal.textContent = ` ${JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]').length} `);


    // animate status bars
    qAll('.card-status-bar').forEach(bar => {
      const i = bar.querySelector('i');
      if (i) {
        const pct = parseFloat(bar.dataset.pct) || 0;
        setTimeout(()=> i.style.width = pct + '%', 80);
      }
    });
  }


  /* ===== Helpers for status visuals ===== */
  function statusToPercent(s){
    switch(s){
      case 'Pending': return 20;
      case 'In Progress': return 55;
      case 'Urgent': return 80;
      case 'Done': return 100;
      case 'Archived': return 0;
      default: return 10;
    }
  }
  function statusColorClass(s){
    if (!s) return 'Pending';
    if (s === 'Done') return 'Done';
    if (s === 'In Progress') return 'In Progress';
    if (s === 'Urgent') return 'Urgent';
    if (s === 'Archived') return 'Archived';
    return 'Pending';
  }


  /* ===== Toggle mark (admin) ===== */
  function toggleMark(id){
    if (!currentUser || !currentUser.admin) { alert('Only admin can change status.'); return; }
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');
    const idx = arr.findIndex(r=> r.id===id); if (idx === -1) return;
    arr[idx].status = arr[idx].status === 'Pending' ? 'Done' : 'Pending';
    localStorage.setItem(REPORTS_KEY, JSON.stringify(arr));
    pushLog(arr[idx].id, `${currentUser.username} changed status to ${arr[idx].status}`, currentUser.username);
    loadReportsToUI(); updateStats(); renderChart(); showToast('Status updated.');
  }


  /* ===== Attempt delete (admin or owner pending) ===== */
  function attemptDelete(id){
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');
    const idx = arr.findIndex(r=> r.id===id); if (idx === -1) return;
    const rep = arr[idx];
    const ownerPending = currentUser && currentUser.username === rep.reporterUsername && rep.status==='Pending';
    if (currentUser && (currentUser.admin || ownerPending)) {
      if (!confirm('Delete this report? This cannot be undone.')) return;
      arr.splice(idx,1); localStorage.setItem(REPORTS_KEY, JSON.stringify(arr));
      pushLog(id, `${currentUser.username} deleted the report`, currentUser.username);
      loadReportsToUI(); updateStats(); renderChart(); showToast('Report deleted.');
      return;
    }
    alert('Not authorized to delete this report.');
  }


  /* ===== Request more info (admin) ===== */
  function requestMoreInfo(id){
    if (!currentUser || !currentUser.admin) { alert('Only admin can request more info.'); return; }
    const message = prompt('Enter request details to the resident (this becomes a remark):', 'Please provide clearer photos or exact landmark.');
    if (!message) return;
    pushLog(id, `Admin requested more info: ${message}`, currentUser.username);
    loadReportsToUI(); showToast('Request sent (logged).');
  }


  /* ===== Contact resident (mailto) ===== */
  function contactResident(id){
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');
    const rep = arr.find(r=> r.id===id);
    if (!rep) return;
    const infoHtml = `<p><strong>Report by:</strong> ${esc(rep.reporterName)} (@${esc(rep.reporterUsername)})</p>
      <p><strong>Suggested contact:</strong> <a href="mailto:axl.narvaez@my.nst.edu.ph?subject=Contact%20regarding%20report%20${encodeURIComponent(rep.id)}">Email Axl (proxy contact)</a></p>
      <p class="muted">(Replace with real resident email if you have it.)</p>`;
    contactInfo && (contactInfo.innerHTML = infoHtml);
    contactModal && contactModal.classList.remove('hidden');
  }


  /* ===== Print report ===== */
  function printReport(id){
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');
    const rep = arr.find(r=> r.id===id); if (!rep) return;
    const w = window.open('', '_blank', 'width=800,height=600');
    const html = `
      <html><head><title>Report ${rep.id}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111} img{max-width:100%;height:auto}</style>
      </head><body>
      <h2>Report ${rep.id}</h2>
      <p><strong>Reporter:</strong> ${esc(rep.reporterName)} (@${esc(rep.reporterUsername)})</p>
      <p><strong>Category:</strong> ${esc(rep.category)}</p>
      <p><strong>Location:</strong> ${esc(rep.location)}</p>
      <p><strong>Description:</strong><br>${esc(rep.description)}</p>
      <p><strong>Date:</strong> ${new Date(rep.date).toLocaleString()}</p>
      <p><strong>Status:</strong> ${esc(rep.status)}</p>
      ${rep.photo ? `<p><strong>Photo:</strong><br><img src="${rep.photo}" alt="photo" /></p>` : ''}
      </body></html>`;
    w.document.write(html); w.document.close(); w.print();
  }


  /* ===== Filters & search (if inputs exist) ===== */
  $('searchInput')?.addEventListener('input', ()=> loadReportsToUI());
  $('categoryFilter')?.addEventListener('change', ()=> loadReportsToUI());


  /* ===== CSV export & print page (optional) ===== */
  $('exportCsv')?.addEventListener('click', ()=> {
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]'); if (arr.length===0){ alert('No reports to export.'); return; }
    const csv = toCSV(arr); const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download = `reports_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  });
  $('printBtn')?.addEventListener('click', ()=> window.print());
  function toCSV(arr){ const fields=['id','reporterName','reporterUsername','category','location','description','date','status']; const header = fields.join(',')+'\n'; const rows = arr.map(r=> fields.map(f=> `"${String(r[f]||'').replace(/"/g,'""')}"`).join(',')).join('\n'); return header+rows; }


  /* ===== Stats & chart ===== */
  function updateStats(){
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');
    const total = arr.length;
    const pending = arr.filter(r=> r.status==='Pending').length;
    const done = arr.filter(r=> r.status==='Done').length;
    if ($('statTotal')) $('statTotal').textContent = total;
    if ($('statPending')) $('statPending').textContent = pending;
    if ($('statDone')) $('statDone').textContent = done;
    if (dashboardStats) {
      dashboardStats.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap">
        <div><strong>Total reports:</strong> ${total}</div>
        <div><strong>Pending:</strong> ${pending}</div>
        <div><strong>Done:</strong> ${done}</div>
      </div>`;
    }
  }


  function renderChart(){
    if (!chartReports) return;
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');
    const pending = arr.filter(r=> r.status==='Pending').length;
    const done = arr.filter(r=> r.status==='Done').length;
    const data = { labels:['Pending','Done'], datasets:[{ data:[pending,done], backgroundColor:['#ffb74d','#00c7d9'] }] };
    if (chart){ chart.data = data; chart.update(); return; }
    chart = new Chart(chartReports, { type:'doughnut', data, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } }, cutout:'60%' } });
  }


  /* ===== Recent mini updates ===== */
  function updateRecentMini(){
    const el = $('recentMini');
    if (!el) return;
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]').slice(-6).reverse();
    if (arr.length===0){ el.innerHTML = '<small class="muted">No recent reports.</small>'; return; }
    el.innerHTML = ''; arr.forEach(r=>{
      const d = document.createElement('div');
      d.innerHTML = `<strong>${esc(r.reporterName)}</strong><div class="muted" style="font-size:12px">${esc(r.location)} • ${new Date(r.date).toLocaleString()}</div>`;
      el.appendChild(d);
    });
  }


  /* ===== Profile page render ===== */
  function updateProfilePage(){
    if (!currentUser) return;
    $('pfName') && ($('pfName').textContent = currentUser.name);
    $('pfUser') && ($('pfUser').textContent = currentUser.username);
    $('pfRole') && ($('pfRole').textContent = (currentUser.role || 'RESIDENT').toUpperCase());
    if (userReportsEl) {
      const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]').filter(r=> r.reporterUsername === currentUser.username).sort((a,b)=> new Date(b.date)-new Date(a.date));
      userReportsEl.innerHTML = '';
      if (arr.length===0) { userReportsEl.innerHTML = '<p class="muted">You have not submitted reports yet.</p>'; return; }
      arr.forEach(r=>{
        const card = document.createElement('div'); card.className='reportCard';
        card.innerHTML = `<div><strong>${esc(r.category)}</strong> • ${new Date(r.date).toLocaleString()}</div><div>${esc(r.location)}</div><div style="margin-top:6px">${esc(r.description)}</div>`;
        userReportsEl.appendChild(card);
      });
    }
  }


  /* ===== Notifications & toast ===== */
  function addNotification(obj){
    const arr = JSON.parse(localStorage.getItem(NOTIF_KEY)||'[]'); arr.unshift(obj); localStorage.setItem(NOTIF_KEY, JSON.stringify(arr.slice(0,80)));
  }
  function showToast(text){ if (!notification) return; notification.textContent = text; notification.classList.remove('hidden'); setTimeout(()=> notification.classList.add('hidden'), 2600); }


  /* ===== Clock & footer ===== */
  function tick(){ const now = new Date(); $('clock') && ($('clock').textContent = now.toLocaleTimeString()); yearEl && (yearEl.textContent = now.getFullYear()); footerClock && (footerClock.textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString()); }
  setInterval(tick, 1000); tick();


  /* ===== Ripple & click sound for UI ===== */
  qAll('button, .btn').forEach(btn => btn.addEventListener('click', function(e){
    const r = document.createElement('span'); r.className = 'ripple';
    const rect = this.getBoundingClientRect();
    r.style.left = (e.clientX - rect.left) + 'px';
    r.style.top = (e.clientY - rect.top) + 'px';
    this.appendChild(r); setTimeout(()=> r.remove(), 650);
    playClick();
  }));


  /* ===== Remarks & logs functions ===== */
  function openRemarksModal(reportId){
    if (!currentUser || !currentUser.admin){ alert('Only admin can add remarks.'); return; }
    activeRemarkTarget = reportId;
    remarkPreset && (remarkPreset.value = '');
    remarkCustom && (remarkCustom.value = '');
    remarkNewStatus && (remarkNewStatus.value = '');
    remarksFeedback && (remarksFeedback.textContent = '');
    remarksModal && remarksModal.classList.remove('hidden');
  }
  closeRemarks?.addEventListener('click', ()=> { remarksModal.classList.add('hidden'); });


  saveRemarkBtn?.addEventListener('click', (ev)=> {
    ev.preventDefault();
    if (!activeRemarkTarget) return;
    const preset = remarkPreset ? remarkPreset.value : '';
    const custom = remarkCustom ? remarkCustom.value.trim() : '';
    const newStatus = remarkNewStatus ? remarkNewStatus.value : '';
    const textParts = [];
    if (preset) textParts.push(preset);
    if (custom) textParts.push(custom);
    const remarkText = textParts.join(' — ') || '(no remark text)';
    const arr = JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]'); const idx = arr.findIndex(r=> r.id === activeRemarkTarget);
    if (idx === -1) { remarksFeedback && (remarksFeedback.style.color='#ffc6c6', remarksFeedback.textContent='Report not found.'); return; }
    if (!Array.isArray(arr[idx].remarkLogs)) arr[idx].remarkLogs = [];
    const entry = { by: currentUser.username, name: currentUser.name, text: remarkText, statusChange: newStatus||null, ts: new Date().toISOString() };
    arr[idx].remarkLogs.push(entry);
    if (newStatus) arr[idx].status = newStatus;
    localStorage.setItem(REPORTS_KEY, JSON.stringify(arr));
    pushLog(arr[idx].id, `${currentUser.username} added remark: ${remarkText}${newStatus ? ' (status -> '+newStatus+')' : ''}`, currentUser.username);
    remarksFeedback && (remarksFeedback.style.color='#b8ffd7', remarksFeedback.textContent='Saved.');
    setTimeout(()=> { remarksModal.classList.add('hidden'); remarksFeedback.textContent=''; }, 900);
    loadReportsToUI(); updateStats(); renderChart();
  });


  function pushLog(reportId, text, by){
    const arr = JSON.parse(localStorage.getItem(NOTIF_KEY)||'[]');
    arr.unshift({ reportId, text, by: by || (currentUser && currentUser.username) || 'system', ts: new Date().toISOString() });
    localStorage.setItem(NOTIF_KEY, JSON.stringify(arr.slice(0,200)));
  }


  function openLogModal(reportId){
    const notifications = JSON.parse(localStorage.getItem(NOTIF_KEY)||'[]').filter(n=> n.reportId === reportId);
    logList && (logList.innerHTML = notifications.length ? notifications.map(n=> `<div style="margin-bottom:8px"><strong>${esc(n.by)}</strong> <div class="muted" style="font-size:12px">${new Date(n.ts).toLocaleString()}</div><div>${esc(n.text)}</div></div>`).join('') : '<p class="muted">No log entries.</p>');
    logModal && logModal.classList.remove('hidden');
  }


  /* ===== Update all views ===== */
  function updateAll(){ updateStats(); renderChart(); loadReportsToUI(); updateRecentMini(); updateProfilePage(); /*showToast('Updated.')*/; }


  /* ===== Utility: CSV export helper (redeclared safe) ===== */
  function toCSV(arr){ const fields=['id','reporterName','reporterUsername','category','location','description','date','status']; const header = fields.join(',')+'\n'; const rows = arr.map(r=> fields.map(f=> `"${String(r[f]||'').replace(/"/g,'""')}"`).join(',')).join('\n'); return header+rows; }


  /* ===== Keyboard ESC closes modals ===== */
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { remarksModal?.classList.add('hidden'); logModal?.classList.add('hidden'); contactModal?.classList.add('hidden'); } });


  /* ===== Initial render on load ===== */
  (function initialRender(){
    updateAll();
    renderChart();
  })();


});
// 🔍 GLOBAL SEARCH (Full Header Bar — supports date search)
const globalSearch = document.getElementById('globalSearch');
if (globalSearch) {
  globalSearch.addEventListener('input', e => {
    const query = e.target.value.trim().toLowerCase();
    const reports = JSON.parse(localStorage.getItem('afj_reports_final_v2') || '[]');
    const list = document.getElementById('reportsList');
    if (!list) return;


    // If the query looks like a date (e.g., "2025-10-20" or "Oct 20")
    const isDateQuery = /\d{4}-\d{2}-\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(query);


    const filtered = reports.filter(r => {
      const dateStr = new Date(r.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }).toLowerCase();


      if (isDateQuery && dateStr.includes(query)) return true;


      // normal text search
      return (
        (r.reporterName && r.reporterName.toLowerCase().includes(query)) ||
        (r.reporterUsername && r.reporterUsername.toLowerCase().includes(query)) ||
        (r.location && r.location.toLowerCase().includes(query)) ||
        (r.description && r.description.toLowerCase().includes(query)) ||
        (r.category && r.category.toLowerCase().includes(query))
      );
    });


    // Display results
    list.innerHTML = filtered.length
      ? filtered.map(r => `
        <div class="reportCard">
          <div><strong>${r.reporterName}</strong> — ${r.category}</div>
          <div>${r.description}</div>
          <small>${new Date(r.date).toLocaleString()}</small>
        </div>
      `).join('')
      : '<p class="muted">No matching reports found.</p>';
  });


  // Press Enter = go to Dashboard
  globalSearch.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.querySelector('[data-page="dashboard"]')?.click();
    }
  });
}

/* ===== BACKUP & RESTORE FEATURE ===== */
const backupBtn = document.getElementById('backupBtn');
const restoreBtn = document.getElementById('restoreBtn');
const restoreInput = document.getElementById('restoreInput');

if (backupBtn) {
  backupBtn.addEventListener('click', () => {
    const allData = {
      users: JSON.parse(localStorage.getItem('afj_users_final_v2') || '[]'),
      reports: JSON.parse(localStorage.getItem('afj_reports_final_v2') || '[]'),
      session: JSON.parse(localStorage.getItem('afj_session_final_v2') || 'null'),
      notif: JSON.parse(localStorage.getItem('afj_notif_final_v2') || '[]'),
      theme: localStorage.getItem('afj_theme_final_v2') || 'dark'
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `barangay_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    alert('✅ Backup file downloaded successfully!');
  });
}

if (restoreBtn && restoreInput) {
  restoreBtn.addEventListener('click', () => restoreInput.click());
  restoreInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);
        if (!confirm('⚠️ This will overwrite current data. Continue?')) return;

        if (data.users) localStorage.setItem('afj_users_final_v2', JSON.stringify(data.users));
        if (data.reports) localStorage.setItem('afj_reports_final_v2', JSON.stringify(data.reports));
        if (data.session) localStorage.setItem('afj_session_final_v2', JSON.stringify(data.session));
        if (data.notif) localStorage.setItem('afj_notif_final_v2', JSON.stringify(data.notif));
        if (data.theme) localStorage.setItem('afj_theme_final_v2', data.theme);

        alert('✅ Data restored successfully! Please reload the page.');
        location.reload();
      } catch (err) {
        alert('❌ Invalid backup file.');
      }
    };
    reader.readAsText(file);
  });
}


