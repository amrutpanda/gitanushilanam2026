const API_BASE_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8787"
        : "https://gitanushilanam-portal.panda2amrut.workers.dev";

const form = document.getElementById("competitionForm");
const phone = document.getElementById("phone");
const whatsapp = document.getElementById("whatsapp");
const sameAsPhone = document.getElementById("sameAsPhone");
const ageInput = document.getElementById("age");
const competitionCards = document.querySelectorAll("[data-competition-card]");
const selectedSummary = document.getElementById("selectedSummary");
const selectedTags = document.getElementById("selectedTags");
const ageRuleInfo = document.getElementById("ageRuleInfo");
const status = document.getElementById("status");
const submitButton = form.querySelector('button[type="submit"]');


/* =========================================================
   WHATSAPP NUMBER
========================================================= */

sameAsPhone.addEventListener("change", function () {
    if (this.checked) {
        whatsapp.value = phone.value;
        whatsapp.readOnly = true;
    } else {
        whatsapp.readOnly = false;
    }
});

phone.addEventListener("input", function () {
    if (sameAsPhone.checked) {
        whatsapp.value = phone.value;
    }
});


/* =========================================================
   COMPETITION CARD SELECTION
========================================================= */

competitionCards.forEach(card => {
    const checkbox = card.querySelector('input[type="checkbox"]');

    checkbox.addEventListener("change", function () {
        card.classList.toggle("selected", checkbox.checked);
        updateSelectedCompetitionSummary();
    });
});


/* =========================================================
   SELECTED COMPETITIONS SUMMARY
========================================================= */

function updateSelectedCompetitionSummary() {
    const selected = document.querySelectorAll('input[name="competitions"]:checked');

    selectedTags.innerHTML = "";

    if (selected.length === 0) {
        selectedSummary.style.display = "none";
        return;
    }

    selectedSummary.style.display = "block";

    selected.forEach(checkbox => {
        const card = checkbox.closest(".competition-card");
        const title = card.querySelector("h4").textContent.trim();
        const tag = document.createElement("span");

        tag.className = "competition-tag";
        tag.textContent = title;

        selectedTags.appendChild(tag);
    });
}


/* =========================================================
   AGE-BASED COMPETITION FILTER
========================================================= */

/*
   Placeholder for later age filtering logic.

   Example future rules:

   const competitionRules = {
       bhagavad_gita_quiz: { minAge: 10, maxAge: 18 },
       shloka_recitation: { minAge: 5, maxAge: 18 },
       animated_bg_video: { minAge: 12, maxAge: 18 },
       treasure_hunt: { minAge: 10, maxAge: 16 }
   };
*/

function updateCompetitionsForAge(age) {
    if (!age) {
        ageRuleInfo.style.display = "none";
        return;
    }

    ageRuleInfo.style.display = "block";
    ageRuleInfo.textContent =
        "Age detected: " +
        age +
        ". Age-based competition eligibility will be applied here once the final competition rules are configured.";
}

ageInput.addEventListener("input", function () {
    const age = Number(this.value);
    updateCompetitionsForAge(age);
});


/* =========================================================
   TURNSTILE
========================================================= */

function getTurnstileToken() {
    const tokenField = document.querySelector('input[name="cf-turnstile-response"]');

    if (!(tokenField instanceof HTMLInputElement)) {
        return "";
    }

    return tokenField.value.trim();
}

function resetTurnstile() {
    if (typeof turnstile === "undefined") {
        return;
    }

    try {
        turnstile.reset();
    } catch (error) {
        console.warn("Unable to reset Turnstile:", error);
    }
}


/* =========================================================
   FORM UI RESET
========================================================= */

function resetFormUi() {
    whatsapp.readOnly = false;

    competitionCards.forEach(card => {
        card.classList.remove("selected");
    });

    selectedTags.innerHTML = "";
    selectedSummary.style.display = "none";
    ageRuleInfo.style.display = "none";
}


/* =========================================================
   FORM SUBMISSION
========================================================= */

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const selectedCompetitions = Array.from(
        document.querySelectorAll('input[name="competitions"]:checked')
    ).map(checkbox => checkbox.value);

    if (selectedCompetitions.length === 0) {
        status.style.display = "block";
        status.textContent = "Please select at least one competition.";
        return;
    }

    const turnstileToken = getTurnstileToken();

    if (!turnstileToken) {
        status.style.display = "block";
        status.textContent = "Please complete the security verification.";
        return;
    }

    const registrationData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: phone.value.trim(),
        whatsapp: whatsapp.value.trim(),
        gender: document.getElementById("gender").value,
        age: Number(ageInput.value),
        institution_organization: document.getElementById("institutionOrganization").value.trim(),
        country: document.getElementById("country").value.trim(),
        state: document.getElementById("state").value.trim(),
        city: document.getElementById("city").value.trim(),
        heard_from: document.getElementById("heardFrom").value,
        competitions: selectedCompetitions,
        turnstile_token: turnstileToken
    };

    try {
        submitButton.disabled = true;
        status.style.display = "block";
        status.textContent = "Submitting registration...";

        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(registrationData)
        });

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error("The registration server returned an invalid response.");
        }

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Registration failed.");
        }

        form.reset();
        resetFormUi();
        resetTurnstile();

        status.style.display = "block";
        status.textContent = result.message || "Registration successful.";

        console.log("Registration response:", result);

    } catch (error) {
        console.error("Registration error:", error);

        resetTurnstile();

        status.style.display = "block";
        status.textContent = error instanceof Error
            ? error.message
            : "Registration failed. Please try again.";

    } finally {
        submitButton.disabled = false;
    }
});
