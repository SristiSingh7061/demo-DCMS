document.addEventListener("DOMContentLoaded", async () => {
    await setupPage();

    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const formData = new FormData(loginForm);
        const payload = {
            emp_code: formData.get("emp_code"),
            password: formData.get("password")
        };

        try {
            const data = await fetchJson("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            window.location.href = data.redirect || "/";
        } catch (error) {
            showMessage(error.error || error.message || "Login failed.", "error");
        }
    });
});