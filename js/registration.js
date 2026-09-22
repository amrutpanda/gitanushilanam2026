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

let turnstileToken = "";
let registrationPending = false;
let pendingRegistrationData = null;
let requestInFlight = false;
let turnstileNeedsReset = false;


/* =========================================================
   STATUS MESSAGE
========================================================= */

function showStatus(message) {
    status.style.display = "block";
    status.textContent = message;
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


/* =========================================================
   AGE-BASED COMPETITION FILTER
========================================================= */

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
    turnstileToken = "";

    if (typeof turnstile === "undefined") {
        return;
    }

    try {
        turnstile.reset();
    } catch (error) {
        console.warn("Unable to reset Turnstile:", error);
    }
}

/*
   These functions are called by the Turnstile widget.

   registration.html must include:
       data-callback="onTurnstileSuccess"
       data-expired-callback="onTurnstileExpired"
       data-error-callback="onTurnstileError"
*/

window.onTurnstileSuccess = async function (token) {
    turnstileToken = typeof token === "string" ? token.trim() : "";
    turnstileNeedsReset = false;

    if (
        turnstileToken &&
        registrationPending &&
        pendingRegistrationData &&
        !requestInFlight
    ) {
        await sendRegistration(pendingRegistrationData, turnstileToken);
    }
};

window.onTurnstileExpired = function () {
    turnstileToken = "";

    if (registrationPending) {
        showStatus("Security verification expired. Please complete it again.");
    }
};

window.onTurnstileError = function () {
    turnstileToken = "";
    registrationPending = false;
    pendingRegistrationData = null;
    turnstileNeedsReset = true;

    showStatus("Security verification failed. Please try again.");
};


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
   BUILD REGISTRATION DATA
========================================================= */

function buildRegistrationData() {
    const selectedCompetitions = Array.from(
        document.querySelectorAll('input[name="competitions"]:checked')
    ).map(checkbox => checkbox.value);

    if (selectedCompetitions.length === 0) {
        showStatus("Please select at least one competition.");
        return null;
    }

    return {
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
        competitions: selectedCompetitions
    };
}


/* =========================================================
   SEND REGISTRATION
========================================================= */

async function sendRegistration(registrationData, token) {
    if (requestInFlight || !registrationPending || !token) {
        return;
    }

    requestInFlight = true;
    registrationPending = false;
    submitButton.disabled = true;

    showStatus("Submitting registration...");

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...registrationData,
                turnstile_token: token
            })
        });

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error("The registration server returned an invalid response.");
        }

        if (!response.ok || !result.success) {
            turnstileToken = "";
            turnstileNeedsReset = true;
            pendingRegistrationData = null;

            showStatus(result.message || "Registration failed.");
            return;
        }

        pendingRegistrationData = null;
        turnstileToken = "";
        turnstileNeedsReset = false;

        form.reset();
        resetFormUi();

        showStatus(result.message || "Registration successful.");

        /*
           Registration is complete. Resetting here is safe because the
           registration result is already known and the form has been cleared.
        */
        resetTurnstile();

    } catch (error) {
        console.error("Registration error:", error);

        turnstileToken = "";
        turnstileNeedsReset = true;
        pendingRegistrationData = null;

        showStatus(
            error instanceof Error
                ? error.message
                : "Registration failed. Please try again."
        );

    } finally {
        requestInFlight = false;
        submitButton.disabled = false;
    }
}


/* =========================================================
   FORM SUBMISSION
========================================================= */

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (requestInFlight) {
        return;
    }

    const registrationData = buildRegistrationData();

    if (!registrationData) {
        return;
    }

    /*
       If the previous token was consumed by a failed/duplicate request,
       do not reuse it. Reset Turnstile and wait for a fresh success callback.
    */
    if (turnstileNeedsReset) {
        pendingRegistrationData = registrationData;
        registrationPending = true;
        turnstileNeedsReset = false;

        resetTurnstile();
        showStatus("Please complete the security verification again.");
        return;
    }

    /*
       Use the callback token when available. The hidden field is also checked
       in case Turnstile completed before this JavaScript observed the callback.
    */
    const currentToken = turnstileToken || getTurnstileToken();

    pendingRegistrationData = registrationData;
    registrationPending = true;

    if (!currentToken) {
        showStatus("Please complete the security verification.");
        return;
    }

    turnstileToken = currentToken;

    await sendRegistration(registrationData, turnstileToken);
});
