document.addEventListener("DOMContentLoaded", async () => {
    const user = await setupPage();
    if (!user) {
        window.location.href = "/login";
        return;
    }

    const complaintForm = document.getElementById("complaintForm");
    if (!complaintForm) return;

    complaintForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const formData = new FormData(complaintForm);
        const payload = {
            title: formData.get("title"),
            category: formData.get("category"),
            description: formData.get("description")
        };

        try {
            const data = await fetchJson("/complaint/new", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            showMessage(data.message || "Complaint registered successfully.", "success");
            complaintForm.reset();
        } catch (error) {
            showMessage(error.error || error.message || "Failed to register complaint.", "error");
        }
    });
});