document.addEventListener("DOMContentLoaded", async () => {
    await setupPage();

    const trackForm = document.getElementById("trackForm");
    const trackResult = document.getElementById("trackResult");

    if (!trackForm || !trackResult) return;

    trackForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const formData = new FormData(trackForm);
        const payload = {
            complaint_id: formData.get("complaint_id")
        };

        try {
            const data = await fetchJson("/api/track", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (data.complaint) {
                trackResult.innerHTML = `
                    <h3>Complaint Status</h3>
                    <p><b>Complaint ID:</b> ${data.complaint.complaint_id}</p>
                    <p><b>Title:</b> ${data.complaint.title}</p>
                    <p><b>Category:</b> ${data.complaint.category}</p>
                    <p><b>Description:</b> ${data.complaint.description}</p>
                    <p><b>Status:</b> <span class="status-badge status-${data.complaint.status.toLowerCase().replace(/\s+/g, "-")}">${data.complaint.status}</span></p>
                    <p><b>Email:</b> ${data.complaint.user_email}</p>
                `;
            } else {
                trackResult.innerHTML = `
                    <h3>Complaint not found</h3>
                `;
            }
        } catch (error) {
            showMessage(error.error || error.message || "Tracking failed.", "error");
        }
    });
});