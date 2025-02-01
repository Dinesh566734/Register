document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("teamForm");

    // Remove any existing event listener before adding a new one
    form.removeEventListener("submit", handleSubmit);
    form.addEventListener("submit", handleSubmit);
});

async function handleSubmit(e) {
    e.preventDefault(); // Prevent default form submission

    if (this.dataset.submitted === "true") return; // Prevent duplicate submissions
    this.dataset.submitted = "true"; // Mark form as submitted

    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    // Validate leader details
    const leaderName = document.getElementById("leader-name").value.trim();
    const leaderEmail = document.getElementById("leader-email").value.trim();
    const leaderPhone = document.getElementById("leader-phone").value.trim();

    if (!leaderName || !leaderEmail || !leaderPhone) {
        alert("❌ Leader details are required!");
        submitButton.disabled = false;
        this.dataset.submitted = "false";
        return;
    }

    // Validate all 5 members' details
    const members = [];
    let missingFields = [];

    document.querySelectorAll(".member").forEach((member, index) => {
        const name = member.querySelector(".member-name").value.trim();
        const email = member.querySelector(".member-email").value.trim();
        const phone = member.querySelector(".member-phone").value.trim();

        if (!name || !email || !phone) {
            missingFields.push(`Member ${index + 1}`);
        } else {
            members.push({ name, email, phone });
        }
    });

    // Check if all 5 members' details are filled
    if (members.length < 5) {
        alert(`❌ Some of the member details are missing: ${missingFields.join(", ")}`);
        submitButton.disabled = false;
        this.dataset.submitted = "false";
        return;
    }

    const teamData = {
        leader: { name: leaderName, email: leaderEmail, phone: leaderPhone },
        members: members
    };

    try {
        const response = await fetch("/register-team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teamData)
        });

        const data = await response.json();
        alert(`✅ ${data.message}`);
    } catch (error) {
        alert("❌ Registration failed. Please try again.");
    } finally {
        submitButton.disabled = false;
        this.dataset.submitted = "false"; // Reset submission status
    }
}
