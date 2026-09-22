let turnstileWidgetId = null;
let turnstileToken = "";

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
   TURNSTILE
========================================================= */

window.addEventListener("load", () => {
    if (typeof turnstile === "undefined") {
        console.error("Cloudflare Turnstile failed to load.");
        status.style.display = "block";
        status.textContent = "Security verification could not be loaded. Please refresh the page and try again.";
        return;
    }

    turnstile.ready(() => {
        turnstileWidgetId = turnstile.render("#turnstile-container", {
            sitekey: "0x4AAAAAAE_c66rSIocTR0zk",
            action: "registration",
            size: "flexible",

            callback(token) {
                turnstileToken = token;
            },

            "expired-callback"() {
                turnstileToken = "";
            },

            "error-callback"() {
                turnstileToken = "";
            }
        });
    });
});

function resetTurnstile() {
    turnstileToken = "";

    if (typeof turnstile !== "undefined" && turnstileWidgetId !== null) {
        turnstile.reset(turnstileWidgetId);
    }
}

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

function resetCompetitionUI() {
    competitionCards.forEach(card => {
        card.classList.remove("selected");
    });

    selectedTags.innerHTML = "";
    selectedSummary.style.display = "none";
    ageRuleInfo.style.display = "none";
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
   FORM SUBMISSION
========================================================= */

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const selectedCompetitions = Array.from(
        document.querySelectorAll('input[name="competitions"]:checked')
    ).map(checkbox => checkbox.value);

    status.style.display = "block";

    if (selectedCompetitions.length === 0) {
        status.textContent = "Please select at least one competition.";
        return;
    }

    if (!turnstileToken) {
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
            throw new Error("Invalid response from the registration server.");
        }

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Registration failed.");
        }

        status.textContent = result.message || "Registration successful.";

        form.reset();
        whatsapp.readOnly = false;
        resetCompetitionUI();
        resetTurnstile();

    } catch (error) {
        console.error("Registration error:", error);
        status.textContent = error instanceof Error
            ? error.message
            : "Registration failed. Please try again.";

        resetTurnstile();

    } finally {
        submitButton.disabled = false;
    }
});
