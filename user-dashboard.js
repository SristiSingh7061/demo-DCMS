let currentUser = null;
let allDepartments = [];

document.addEventListener("DOMContentLoaded", async () => {
    const user = await setupPage();
    if (!user || user.role !== "user") {
        window.location.href = "/login";
        return;
    }
    currentUser = user;

    document.getElementById("welcomeTitle").textContent =
        `Welcome, ${user.fullname}! (${user.emp_code}) — ${user.dept_name || "No Department"}`;

    await loadDepartments();
    await loadReceived();
});

// ── TAB SWITCH ────────────────────────────────────────────────────────────────
function switchTab(btn, tabName) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("tab-" + tabName).classList.add("active");
    btn.classList.add("active");
}

// ── LOAD DEPARTMENTS ──────────────────────────────────────────────────────────
async function loadDepartments() {
    try {
        const data = await fetchJson("/api/departments");
        allDepartments = data.departments;
        const deptSelect = document.getElementById("c-dept");
        data.departments.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d.id;
            opt.textContent = d.name;
            deptSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Could not load departments", e);
    }
}

// ── LOAD DEPT USERS ───────────────────────────────────────────────────────────
async function loadDeptUsers() {
    const deptId = document.getElementById("c-dept").value;
    const personSelect = document.getElementById("c-person");
    personSelect.innerHTML = '<option value="">— Select Person —</option>';

    if (!deptId) {
        personSelect.innerHTML = '<option value="">— Select Department first —</option>';
        return;
    }

    try {
        const data = await fetchJson(`/api/users/by-dept/${deptId}`);
        if (data.users.length === 0) {
            personSelect.innerHTML = '<option value="">— No employees in this department —</option>';
            return;
        }
        data.users.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.id;
            opt.textContent = `${u.fullname} (${u.emp_code})`;
            personSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Could not load dept users", e);
    }
}

// ── SUBMIT COMPLAINT ──────────────────────────────────────────────────────────
async function submitComplaint() {
    const title    = document.getElementById("c-title").value.trim();
    const category = document.getElementById("c-category").value;
    const dept     = document.getElementById("c-dept").value;
    const person   = document.getElementById("c-person").value;
    const desc     = document.getElementById("c-desc").value.trim();

    if (!title || !category || !dept || !person || !desc) {
        showMessage("Please fill all required fields, including concerned person.", "error");
        return;
    }

    try {
        const data = await fetchJson("/api/complaints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title, category,
                target_dept: dept,
                assigned_to: person,
                description: desc
            })
        });

        if (data.success) {
            showMessage(`Complaint submitted! ID: ${data.complaint_id}`, "success");
            document.getElementById("c-title").value = "";
            document.getElementById("c-category").value = "";
            document.getElementById("c-dept").value = "";
            document.getElementById("c-person").innerHTML = '<option value="">— Select Department first —</option>';
            document.getElementById("c-desc").value = "";
        } else {
            showMessage(data.error || "Failed to submit.", "error");
        }
    } catch (e) {
        showMessage(e.error || "Failed to submit complaint.", "error");
    }
}

// ── LOAD RECEIVED COMPLAINTS ──────────────────────────────────────────────────
async function loadReceived() {
    const container = document.getElementById("receivedContent");
    try {
        const data = await fetchJson("/api/complaints/received");
        if (!data.success) {
            container.innerHTML = `<p class="empty-state">${data.error}</p>`;
            return;
        }

        if (data.complaints.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p>No complaints assigned to your department yet.</p>
                </div>`;
            return;
        }

        let html = "";
        data.complaints.forEach(c => {
            const isActive = c.status !== "Resolved" && c.status !== "Rejected" && c.status !== "Closed";
            const otherDepts = allDepartments.filter(d => d.id != c.target_dept);
            const statusClass = "status-" + c.status.toLowerCase().replace(/\s+/g, '-');

            html += `
            <div class="received-card">

                <div class="card-top-row">
                    <h4>${c.title}</h4>
                    <span class="status-badge ${statusClass}">${c.status}</span>
                </div>

                <div class="meta">
                    <span>${c.complaint_id}</span>
                    <span>·</span>
                    Filed by: <strong>${c.filed_by_name} (${c.filed_by_emp})</strong>
                    <span>·</span>
                    <span>${c.date_formatted}</span>
                </div>

                ${c.description ? `<div class="desc">${c.description}</div>` : ''}

                ${c.remark ? `
                <div class="remark-box">
                    <span>💬</span>
                    <span><strong>Last Remark:</strong> ${c.remark}</span>
                </div>` : ''}

                ${isActive ? `
                <div class="update-section">
                    <label>Update Status</label>
                    <select id="status-${c.id}">
                        <option value="">— Select New Status —</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <textarea id="remark-${c.id}" placeholder="Add a remark (optional)..."></textarea>
                    <button onclick="updateComplaint(${c.id})">Save Update</button>
                </div>

                <div class="forward-section">
                    <label>↪ Forward to Another Department</label>
                    <select id="fwd-dept-${c.id}" onchange="loadFwdUsers(${c.id})">
                        <option value="">— Select Department —</option>
                        ${otherDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                    </select>
                    <select id="fwd-person-${c.id}" style="margin-top:8px;">
                        <option value="">— Select Department first —</option>
                    </select>
                    <button onclick="forwardComplaint(${c.id})" style="margin-top:8px;">Forward Complaint</button>
                </div>
                ` : `
                <p style="font-size:12.5px; color:#888; margin-top:10px;">
                    ✅ This complaint is <strong>${c.status.toLowerCase()}</strong>.
                </p>`}

                <button class="history-toggle" onclick="toggleHistory(${c.id})">▼ &nbsp;Action History</button>
                <div id="hist-${c.id}" class="history-box"></div>

            </div>`;
        });

        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<p style="color:var(--red); padding:16px;">Error loading complaints.</p>`;
        console.error(e);
    }
}

// ── UPDATE STATUS ──────────────────────────────────────────────────────────────
async function updateComplaint(id) {
    const status = document.getElementById(`status-${id}`).value;
    const remark = document.getElementById(`remark-${id}`).value.trim();

    if (!status) { alert("Please select a status."); return; }

    try {
        const data = await fetchJson(`/api/complaints/${id}/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, remark })
        });

        if (data.success) {
            showMessage("Complaint updated successfully!", "success");
            await loadReceived();
        } else {
            showMessage(data.error || "Update failed.", "error");
        }
    } catch (e) {
        showMessage("Update failed.", "error");
    }
}

// ── FORWARD COMPLAINT ──────────────────────────────────────────────────────────
async function loadFwdUsers(complaintId) {
    const deptId = document.getElementById(`fwd-dept-${complaintId}`).value;
    const personSelect = document.getElementById(`fwd-person-${complaintId}`);
    personSelect.innerHTML = '<option value="">— Select Person —</option>';
    if (!deptId) return;

    try {
        const data = await fetchJson(`/api/users/by-dept/${deptId}`);
        data.users.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.id;
            opt.textContent = `${u.fullname} (${u.emp_code})`;
            personSelect.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

async function forwardComplaint(id) {
    const dept   = document.getElementById(`fwd-dept-${id}`).value;
    const person = document.getElementById(`fwd-person-${id}`).value;

    if (!dept) { alert("Select a department to forward to."); return; }

    try {
        const data = await fetchJson(`/api/complaints/${id}/forward`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_dept: dept, assigned_to: person || null })
        });

        if (data.success) {
            showMessage("Complaint forwarded successfully!", "success");
            await loadReceived();
        } else {
            showMessage(data.error || "Forward failed.", "error");
        }
    } catch (e) {
        showMessage("Forward failed.", "error");
    }
}

// ── ACTION HISTORY ────────────────────────────────────────────────────────────
async function toggleHistory(id) {
    const box = document.getElementById(`hist-${id}`);
    const isShowing = box.classList.contains("show");

    if (isShowing) {
        box.classList.remove("show");
        return;
    }

    box.innerHTML = '<div style="padding:12px 16px; color:#888; font-size:13px;">Loading history…</div>';
    box.classList.add("show");

    try {
        const data = await fetchJson(`/api/complaints/${id}/history`);
        if (data.history.length === 0) {
            box.innerHTML = '<div style="padding:12px 16px; color:#aaa; font-size:13px;">No history yet.</div>';
            return;
        }
        box.innerHTML = data.history.map(h => `
            <div class="history-item">
                <div class="h-action">🔹 ${h.action}</div>
                <div class="h-meta">${h.done_by} &nbsp;·&nbsp; ${h.dept_name} &nbsp;·&nbsp; ${h.date_formatted}</div>
                ${h.note ? `<div class="h-note">${h.note}</div>` : ''}
            </div>
        `).join('');
    } catch (e) {
        box.innerHTML = '<div style="padding:12px 16px; color:var(--red); font-size:13px;">Error loading history.</div>';
    }
}