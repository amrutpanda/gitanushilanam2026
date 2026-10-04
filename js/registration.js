const API_BASE_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8787"
        : "https://gitanushilanam-portal.panda2amrut.workers.dev";

const form = document.getElementById("competitionForm");
const phone = document.getElementById("phone");
const whatsapp = document.getElementById("whatsapp");
const sameAsPhone = document.getElementById("sameAsPhone");
const ageInput = document.getElementById("age");
const participantGroupSelect = document.getElementById("participantGroup");
const competitionGrid = document.getElementById("competitionGrid");
const competitionCards = document.querySelectorAll("[data-competition-card]");
const selectedSummary = document.getElementById("selectedSummary");
const selectedTags = document.getElementById("selectedTags");
const participantGroupInfo = document.getElementById("participantGroupInfo");
const status = document.getElementById("status");
const submitButton = form.querySelector('button[type="submit"]');

const registrationModal = document.getElementById("registrationModal");
const registrationModalClose = document.getElementById("registrationModalClose");
const registrationModalIcon = document.getElementById("registrationModalIcon");
const registrationModalTitle = document.getElementById("registrationModalTitle");
const registrationModalMessage = document.getElementById("registrationModalMessage");
const registrationModalName = document.getElementById("registrationModalName");
const registrationSuccessActions = document.getElementById("registrationSuccessActions");
const registrationFailureActions = document.getElementById("registrationFailureActions");
const registerAnotherButton = document.getElementById("registerAnotherButton");
const retryRegistrationButton = document.getElementById("retryRegistrationButton");

let turnstileToken = "";
let registrationPending = false;
let pendingRegistrationData = null;
let requestInFlight = false;
let turnstileNeedsReset = false;

/* =========================================================
   PARTICIPANT GROUPS AND COMPETITION ELIGIBILITY
========================================================= */

const participantGroups = {
    sub_junior: {
        label: "Sub-Junior",
        grade: "Class 3–5",
        competitions: ["bhagavad_gita_quiz", "shloka_recitation"]
    },

    junior: {
        label: "Junior",
        grade: "Class 6–8",
        competitions: ["bhagavad_gita_quiz", "shloka_recitation"]
    },

    senior: {
        label: "Senior",
        grade: "Class 9–12",
        competitions: ["bhagavad_gita_quiz", "shloka_recitation", "treasure_hunt"]
    },

    youth_adult: {
        label: "Youth / Adult",
        grade: "College / Adult",
        competitions: ["bhagavad_gita_quiz", "shloka_recitation", "animated_bg_video", "treasure_hunt"]
    }
};

const competitionLabels = {
    bhagavad_gita_quiz: "Bhagavad Gita Quiz",
    shloka_recitation: "Shloka Recitation",
    animated_bg_video: "Animated BG Video",
    treasure_hunt: "Treasure Hunt"
};

/* =========================================================
   STATUS MESSAGE
========================================================= */

function showStatus(message) {
    status.style.display = "block";
    status.textContent = message;
}

function clearStatus() {
    status.style.display = "none";
    status.textContent = "";
}

/* =========================================================
   RESULT MODAL
========================================================= */

function openResultModal({ type, title, message, participantName = "" }) {
    const isSuccess = type === "success";

    registrationModal.classList.toggle("is-success", isSuccess);
    registrationModal.classList.toggle("is-error", !isSuccess);
    registrationModalIcon.textContent = isSuccess ? "✓" : "!";
    registrationModalTitle.textContent = title;
    registrationModalMessage.textContent = message;
    registrationModalName.textContent = participantName;
    registrationModalName.hidden = !participantName;
    registrationSuccessActions.hidden = !isSuccess;
    registrationFailureActions.hidden = isSuccess;
    registrationModal.hidden = false;
    document.body.classList.add("modal-open");

    requestAnimationFrame(() => registrationModal.classList.add("is-visible"));

    setTimeout(() => {
        if (isSuccess) {
            registerAnotherButton.focus();
        } else {
            retryRegistrationButton.focus();
        }
    }, 80);
}

function closeResultModal() {
    registrationModal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");

    setTimeout(() => {
        registrationModal.hidden = true;
    }, 220);
}

function showSuccessModal(participantName) {
    clearStatus();

    openResultModal({
        type: "success",
        title: "Registration successful!",
        message: "Thank you for registering in Gitanushilanam 2026.",
        participantName
    });
}

function showFailureModal(message) {
    clearStatus();

    openResultModal({
        type: "error",
        title: "Registration not completed",
        message: message || "Registration failed. Please try again."
    });
}

registrationModalClose.addEventListener("click", closeResultModal);

registrationModal
    .querySelectorAll("[data-modal-close]")
    .forEach(element => element.addEventListener("click", closeResultModal));

registerAnotherButton.addEventListener("click", function () {
    closeResultModal();
    clearStatus();

    setTimeout(() => {
        document.getElementById("name").focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 260);
});

retryRegistrationButton.addEventListener("click", function () {
    closeResultModal();
    clearStatus();

    if (turnstileNeedsReset) {
        turnstileNeedsReset = false;
        resetTurnstile();
    }

    setTimeout(() => {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !registrationModal.hidden) {
        closeResultModal();
    }
});

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
        if (checkbox.disabled) {
            checkbox.checked = false;
            card.classList.remove("selected");
            return;
        }

        card.classList.toggle("selected", checkbox.checked);
        updateSelectedCompetitionSummary();
    });
});

/* =========================================================
   SELECTED COMPETITIONS SUMMARY
========================================================= */

function updateSelectedCompetitionSummary() {
    const selected = document.querySelectorAll('input[name="competitions"]:checked:not(:disabled)');
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
   PARTICIPANT-GROUP COMPETITION FILTER
========================================================= */

function getParticipantGroup(groupKey) {
    return participantGroups[groupKey] || null;
}

function clearCompetitionSelection() {
    competitionCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');

        checkbox.checked = false;
        card.classList.remove("selected");
    });

    updateSelectedCompetitionSummary();
}

function setCompetitionVisibility(eligibleCompetitions) {
    let visibleCount = 0;

    competitionCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const isEligible = eligibleCompetitions.includes(checkbox.value);

        checkbox.disabled = !isEligible;

        if (isEligible) {
            card.classList.remove("is-age-hidden");
            card.removeAttribute("aria-hidden");
            visibleCount += 1;
        } else {
            checkbox.checked = false;
            card.classList.remove("selected");
            card.classList.add("is-age-hidden");
            card.setAttribute("aria-hidden", "true");
        }
    });

    competitionGrid.dataset.visibleCount = String(visibleCount);
    updateSelectedCompetitionSummary();
}

function showParticipantGroupInfo(message, state = "info") {
    participantGroupInfo.style.display = "block";
    participantGroupInfo.classList.toggle("is-warning", state === "warning");
    participantGroupInfo.classList.toggle("is-ready", state === "ready");
    participantGroupInfo.textContent = message;
}

function updateCompetitionsForParticipantGroup() {
    const groupKey = participantGroupSelect.value;

    clearCompetitionSelection();

    if (!groupKey) {
        setCompetitionVisibility([]);
        showParticipantGroupInfo(
            "Select the participant group to see the competitions available for that group."
        );
        return;
    }

    const participantGroup = getParticipantGroup(groupKey);

    if (!participantGroup) {
        setCompetitionVisibility([]);
        showParticipantGroupInfo(
            "Please select a valid participant group.",
            "warning"
        );
        return;
    }

    setCompetitionVisibility(participantGroup.competitions);

    const eligibleNames = participantGroup.competitions
        .map(competition => competitionLabels[competition])
        .join(", ");

    showParticipantGroupInfo(
        `${participantGroup.label} (${participantGroup.grade}). Eligible competitions: ${eligibleNames}.`,
        "ready"
    );
}

participantGroupSelect.addEventListener("change", updateCompetitionsForParticipantGroup);

/* =========================================================
   TURNSTILE
========================================================= */

function getTurnstileToken() {
    const tokenField = document.querySelector('input[name="cf-turnstile-response"]');

    return tokenField instanceof HTMLInputElement
        ? tokenField.value.trim()
        : "";
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

window.onTurnstileSuccess = async function (token) {
    turnstileToken = typeof token === "string" ? token.trim() : "";
    turnstileNeedsReset = false;

    if (turnstileToken && registrationPending && pendingRegistrationData && !requestInFlight) {
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

    showFailureModal("Security verification failed. Please try again.");
};

/* =========================================================
   FORM UI RESET
========================================================= */

function resetFormUi() {
    whatsapp.readOnly = false;

    competitionCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');

        checkbox.checked = false;
        checkbox.disabled = true;
        card.classList.remove("selected");
        card.classList.add("is-age-hidden");
        card.setAttribute("aria-hidden", "true");
    });

    competitionGrid.dataset.visibleCount = "0";
    selectedTags.innerHTML = "";
    selectedSummary.style.display = "none";

    showParticipantGroupInfo(
        "Select the participant group to see the competitions available for that group."
    );
}

/* =========================================================
   BUILD REGISTRATION DATA
========================================================= */

function buildRegistrationData() {
    const age = Number(ageInput.value);
    const participantGroupKey = participantGroupSelect.value;
    const participantGroup = getParticipantGroup(participantGroupKey);

    if (!participantGroup) {
        showFailureModal(
            "Please select a valid participant group before selecting a competition."
        );
        return null;
    }

    const selectedCompetitions = Array.from(
        document.querySelectorAll('input[name="competitions"]:checked:not(:disabled)')
    ).map(checkbox => checkbox.value);

    if (selectedCompetitions.length === 0) {
        showFailureModal(
            "Please select at least one competition available for this participant group."
        );
        return null;
    }

    const hasInvalidSelection = selectedCompetitions.some(
        competition => !participantGroup.competitions.includes(competition)
    );

    if (hasInvalidSelection) {
        showFailureModal(
            "One or more selected competitions are not available for this participant group."
        );
        return null;
    }

    return {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: phone.value.trim(),
        whatsapp: whatsapp.value.trim(),
        gender: document.getElementById("gender").value,
        age,
        participant_group: participantGroupKey,
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

            showFailureModal(result.message || "Registration failed.");
            return;
        }

        const participantName = registrationData.name;

        pendingRegistrationData = null;
        turnstileToken = "";
        turnstileNeedsReset = false;

        form.reset();
        resetFormUi();
        resetTurnstile();
        showSuccessModal(participantName);
    } catch (error) {
        console.error("Registration error:", error);

        turnstileToken = "";
        turnstileNeedsReset = true;
        pendingRegistrationData = null;

        showFailureModal(
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

    if (turnstileNeedsReset) {
        pendingRegistrationData = registrationData;
        registrationPending = true;
        turnstileNeedsReset = false;

        resetTurnstile();
        showStatus("Please complete the security verification again.");
        return;
    }

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

/* =========================================================
   INITIAL STATE
========================================================= */

updateCompetitionsForParticipantGroup();
