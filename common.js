async function fetchJson(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    const text = await response.text();

    if (!text) throw new Error("Empty response from server");

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error("Invalid server response");
    }

    if (!response.ok) throw data;
    return data;
}

function renderNav(user) {
    const nav = document.getElementById("nav");
    if (!nav) return;

    let html = `<a href="/"><button>Home</button></a>`;

    if (user) {
        if (user.role === "admin") {
            html += `<a href="/dashboard/admin"><button>Admin Dashboard</button></a>`;
        } else {
            html += `<a href="/dashboard/user"><button>My Dashboard</button></a>`;
        }
        html += `<a href="/logout"><button>Logout (${user.fullname})</button></a>`;
    } else {
        html += `<a href="/login"><button>Login Here</button></a>`;
        html += `<a href="/track"><button>Track Complaint</button></a>`;
    }

    nav.innerHTML = html;
}

function showMessage(message, type = "success") {
    const container = document.getElementById("alertContainer");
    if (!container) return;
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => { container.innerHTML = ""; }, 4000);
}

function clearMessage() {
    const container = document.getElementById("alertContainer");
    if (!container) return;
    container.innerHTML = "";
}

async function getSession() {
    try {
        const data = await fetchJson("/api/session");
        return data.user || null;
    } catch (_) {
        return null;
    }
}

async function setupPage() {
    const user = await getSession();
    renderNav(user);
    return user;
}