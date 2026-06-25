document.addEventListener("DOMContentLoaded", async () => {
    const user = await setupPage();
    if (!user || user.role !== "admin") {
        window.location.href = "/login";
        return;
    }

    document.getElementById("welcomeTitle").textContent = `Welcome, ${user.fullname}! (Admin)`;

    await loadDeptOptionsForUserForm();
    await loadComplaints();
    await loadUsers();
    await loadDepartments();
});

// ── TAB SWITCH ────────────────────────────────────────────────────────────────
function switchTab(btn, tabName) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("tab-" + tabName).classList.add("active");
    btn.classList.add("active");
}

// ── LOAD ALL COMPLAINTS ───────────────────────────────────────────────────────
async function loadComplaints() {
    const container = document.getElementById("complaintsTable");
    try {
        const data = await fetchJson("/api/admin/complaints");
        if (!data.success) { container.innerHTML = `<p>${data.error}</p>`; return; }

        if (data.complaints.length === 0) {
            container.innerHTML = `<p>No complaints filed yet.</p>`;
            return;
        }

        let html = `<table>
            <tr>
                <th>ID</th><th>Title</th><th>Category</th><th>Filed By</th>
                <th>Department</th><th>Status</th><th>Date</th>
            </tr>`;

        data.complaints.forEach(c => {
            html += `<tr>
                <td>${c.complaint_id}</td>
                <td>${c.title}</td>
                <td>${c.category}</td>
                <td>${c.filed_by_name} (${c.filed_by_emp})</td>
                <td>${c.dept_name || '-'}</td>
                <td><span class="status-badge status-${c.status.toLowerCase().replace(/\s+/g,'-')}">${c.status}</span></td>
                <td>${c.date_formatted}</td>
            </tr>`;
        });

        html += `</table>`;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<p>Error loading complaints.</p>`;
    }
}

// ── LOAD DEPARTMENTS FOR USER-ADD FORM ────────────────────────────────────────
async function loadDeptOptionsForUserForm() {
    try {
        const data = await fetchJson("/api/admin/departments");
        const select = document.getElementById("u-dept");
        data.departments.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d.id;
            opt.textContent = d.name;
            select.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

// ── ADD NEW USER ──────────────────────────────────────────────────────────────
async function addUser() {
    const fullname = document.getElementById("u-name").value.trim();
    const emp_code = document.getElementById("u-empcode").value.trim();
    const email = document.getElementById("u-email").value.trim();
    const password = document.getElementById("u-password").value;
    const dept_id = document.getElementById("u-dept").value;
    const role = document.getElementById("u-role").value;

    if (!fullname || !emp_code || !password) {
        showMessage("Please fill Name, Employee Code and Password.", "error");
        return;
    }

    try {
        const data = await fetchJson("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullname, emp_code, email, password, dept_id: dept_id || null, role })
        });

        if (data.success) {
            showMessage("Employee added successfully!", "success");
            document.getElementById("u-name").value = "";
            document.getElementById("u-empcode").value = "";
            document.getElementById("u-email").value = "";
            document.getElementById("u-password").value = "";
            document.getElementById("u-dept").value = "";
            document.getElementById("u-role").value = "user";
            await loadUsers();
        } else {
            showMessage(data.error || "Failed to add employee.", "error");
        }
    } catch (e) {
        showMessage(e.error || "Failed to add employee.", "error");
    }
}

// ── LOAD ALL USERS ────────────────────────────────────────────────────────────
async function loadUsers() {
    const container = document.getElementById("usersTable");
    try {
        const data = await fetchJson("/api/admin/users");
        if (!data.success) { container.innerHTML = `<p>${data.error}</p>`; return; }

        let html = `<table>
            <tr><th>Emp Code</th><th>Name</th><th>Email</th><th>Department</th><th>Role</th></tr>`;

        data.users.forEach(u => {
            html += `<tr>
                <td><strong>${u.emp_code}</strong></td>
                <td>${u.fullname}</td>
                <td>${u.email || '-'}</td>
                <td>${u.dept_name || '-'}</td>
                <td>${u.role === 'admin' ? '<span class="status-badge status-resolved">Admin</span>' : 'User'}</td>
            </tr>`;
        });

        html += `</table>`;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<p>Error loading users.</p>`;
    }
}

// ── ADD NEW DEPARTMENT ────────────────────────────────────────────────────────
async function addDept() {
    const name = document.getElementById("d-name").value.trim();
    if (!name) { showMessage("Please enter department name.", "error"); return; }

    try {
        const data = await fetchJson("/api/admin/departments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        if (data.success) {
            showMessage("Department added successfully!", "success");
            document.getElementById("d-name").value = "";
            await loadDepartments();
            document.getElementById("u-dept").innerHTML = '<option value="">-- No Department (for Admin) --</option>';
            await loadDeptOptionsForUserForm();
        } else {
            showMessage(data.error || "Failed to add department.", "error");
        }
    } catch (e) {
        showMessage(e.error || "Failed to add department.", "error");
    }
}

// ── LOAD ALL DEPARTMENTS ──────────────────────────────────────────────────────
async function loadDepartments() {
    const container = document.getElementById("deptsTable");
    try {
        const data = await fetchJson("/api/admin/departments");
        if (!data.success) { container.innerHTML = `<p>${data.error}</p>`; return; }

        let html = `<table><tr><th>ID</th><th>Department Name</th><th>Status</th><th>Action</th></tr>`;
        data.departments.forEach(d => {
            const isActive = d.status === 'active' || d.status == null;
            html += `<tr>
                <td>${d.id}</td>
                <td>${d.name}</td>
                <td>${isActive
                    ? '<span style="color:#27ae60;font-weight:600;">Active</span>'
                    : '<span style="color:#e67e22;font-weight:600;">Closed</span>'}</td>
                <td>${isActive
                    ? `<button onclick="closeDept(${d.id})" style="background:#c0392b;color:white;padding:4px 12px;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Close</button>`
                    : `<button onclick="reopenDept(${d.id})" style="background:#27ae60;color:white;padding:4px 12px;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Reopen</button>`
                }</td>
            </tr>`;
        });
        html += `</table>`;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<p>Error loading departments.</p>`;
    }
}

// ── CLOSE DEPARTMENT ──────────────────────────────────────────────────────────
async function closeDept(id) {
    if (!confirm('Are you sure you want to close this department?')) return;
    const data = await fetchJson(`/api/admin/departments/${id}/close`, { method: "POST" });
    if (data.success) { showMessage("Department closed.", "success"); await loadDepartments(); }
    else showMessage(data.error || "Failed.", "error");
}

// ── REOPEN DEPARTMENT ─────────────────────────────────────────────────────────
async function reopenDept(id) {
    const data = await fetchJson(`/api/admin/departments/${id}/reopen`, { method: "POST" });
    if (data.success) { showMessage("Department reopened!", "success"); await loadDepartments(); }
    else showMessage(data.error || "Failed.", "error");
}