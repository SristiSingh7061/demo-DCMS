document.addEventListener("DOMContentLoaded", async () => {
    await setupPage();

    const registerForm = document.getElementById("registerForm");
    if (!registerForm) return;

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const formData = new FormData(registerForm);

        try {
            const response = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullname: formData.get("fullname"),
                    email: formData.get("email"),
                    phone: formData.get("phone"),
                    password: formData.get("password"),
                    confirm_password: formData.get("confirm_password")
                })
            });

            const text = await response.text();
            const data = JSON.parse(text);

            if (data.success) {
                showMessage(data.message || "Registration Successful!", "success");
                setTimeout(() => window.location.href = "/login", 1500);
            } else {
                showMessage(data.error || "Registration failed.", "danger");
            }
        } catch (err) {
            showMessage("Something went wrong: " + err.message, "danger");
        }
    });
});