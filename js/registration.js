const API_BASE_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8787"
        : "https://gitanushilanam-portal.panda2amrut.workers.dev";

const form = document.getElementById("competitionForm");
const phone = document.getElementById("phone");
const phoneCountryCode = document.getElementById("phoneCountryCode");
const whatsapp = document.getElementById("whatsapp");
const whatsappCountryCode = document.getElementById("whatsappCountryCode");
const sameAsPhone = document.getElementById("sameAsPhone");
const ageInput = document.getElementById("age");
const participantGroupSelect = document.getElementById("participantGroup");
const countrySelect = document.getElementById("country");
const stateSelect = document.getElementById("state");
const citySelect = document.getElementById("city");
const countryManual = document.getElementById("countryManual");
const stateManual = document.getElementById("stateManual");
const cityManual = document.getElementById("cityManual");
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

const LOCATION_DATA_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@countrystatecity/countries-browser@1.0.4/+esm";

let locationDataModulePromise = null;
let selectedCountryCode = "";
let selectedStateCode = "";

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
    animated_bg_video: "Three Minute Gita Video Challenge",
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
   PHONE COUNTRY CODES

   Country/state/city data already loads from the browser
   package below. If that data exposes phone codes, use it to
   expand these dropdowns. A compact fallback list keeps the
   country-code selector useful even if the package is offline.
========================================================= */

const fallbackPhoneCountryCodes = [
    ["+91", "India"],
    ["+1", "USA / Canada"],
    ["+44", "United Kingdom"],
    ["+971", "United Arab Emirates"],
    ["+61", "Australia"],
    ["+65", "Singapore"],
    ["+64", "New Zealand"],
    ["+974", "Qatar"],
    ["+966", "Saudi Arabia"],
    ["+968", "Oman"],
    ["+973", "Bahrain"],
    ["+965", "Kuwait"],
    ["+977", "Nepal"],
    ["+880", "Bangladesh"],
    ["+94", "Sri Lanka"],
    ["+60", "Malaysia"],
    ["+62", "Indonesia"],
    ["+66", "Thailand"],
    ["+81", "Japan"],
    ["+82", "South Korea"],
    ["+49", "Germany"],
    ["+33", "France"],
    ["+39", "Italy"],
    ["+34", "Spain"],
    ["+31", "Netherlands"],
    ["+41", "Switzerland"],
    ["+46", "Sweden"],
    ["+47", "Norway"],
    ["+45", "Denmark"],
    ["+358", "Finland"],
    ["+353", "Ireland"],
    ["+27", "South Africa"],
    ["+230", "Mauritius"],
    ["+254", "Kenya"],
    ["+234", "Nigeria"],
    ["+20", "Egypt"],
    ["+55", "Brazil"],
    ["+52", "Mexico"],
    ["+54", "Argentina"]
];

function normalizePhoneCode(code) {
    if (code === null || code === undefined) {
        return "";
    }

    const firstCode = String(code).split(",")[0].trim();
    if (!firstCode) {
        return "";
    }

    return firstCode.startsWith("+") ? firstCode : `+${firstCode}`;
}

function setPhoneCountryCodeOptions(items) {
    const uniqueItems = new Map();

    fallbackPhoneCountryCodes.forEach(([code, name]) => {
        uniqueItems.set(`${code}|${name}`, { code, name });
    });

    items.forEach(country => {
        const rawCode = country.phonecode ?? country.phoneCode ?? country.dialCode ?? country.dial_code;
        const code = normalizePhoneCode(rawCode);

        if (code) {
            uniqueItems.set(`${code}|${country.name}`, { code, name: country.name });
        }
    });

    const options = [...uniqueItems.values()].sort((a, b) => {
        if (a.code === "+91") return -1;
        if (b.code === "+91") return 1;
        return a.name.localeCompare(b.name);
    });

    [phoneCountryCode, whatsappCountryCode].forEach(select => {
        const previousValue = select.value || "+91";
        select.innerHTML = "";

        options.forEach(({ code, name }) => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = `${code} ${name}`;
            select.appendChild(option);
        });

        select.value = [...select.options].some(option => option.value === previousValue)
            ? previousValue
            : "+91";
    });
}

function buildInternationalPhone(countryCodeSelect, numberInput) {
    const number = numberInput.value.trim();

    if (!number) {
        return "";
    }

    if (number.startsWith("+")) {
        return number;
    }

    return `${countryCodeSelect.value} ${number}`.trim();
}

setPhoneCountryCodeOptions([]);

/* =========================================================
   WHATSAPP NUMBER
========================================================= */

sameAsPhone.addEventListener("change", function () {
    if (this.checked) {
        whatsappCountryCode.value = phoneCountryCode.value;
        whatsapp.value = phone.value;
        whatsappCountryCode.disabled = true;
        whatsapp.readOnly = true;
    } else {
        whatsappCountryCode.disabled = false;
        whatsapp.readOnly = false;
    }
});

phoneCountryCode.addEventListener("change", function () {
    if (sameAsPhone.checked) {
        whatsappCountryCode.value = phoneCountryCode.value;
    }
});

phone.addEventListener("input", function () {
    if (sameAsPhone.checked) {
        whatsapp.value = phone.value;
    }
});

/* =========================================================
   COUNTRY / STATE / CITY DROPDOWNS

   The browser package lazy-loads geographic data from jsDelivr.
   If it cannot load, the form automatically falls back to
   manual Country / State / City entry so registration still works.
========================================================= */

function getLocationDataModule() {
    if (!locationDataModulePromise) {
        locationDataModulePromise = import(LOCATION_DATA_MODULE_URL);
    }

    return locationDataModulePromise;
}

function sortByName(items) {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function resetLocationSelect(select, message, disabled = true) {
    select.innerHTML = "";

    const option = document.createElement("option");
    option.value = "";
    option.textContent = message;
    select.appendChild(option);
    select.disabled = disabled;
}

function appendLocationOption(select, value, label, code = "") {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;

    if (code) {
        option.dataset.code = code;
    }

    select.appendChild(option);
}

function appendOtherLocationOption(select) {
    const option = document.createElement("option");
    option.value = "__other__";
    option.textContent = "Other / Not listed";
    select.appendChild(option);
}

function setManualLocationField(select, input, manualMode) {
    input.hidden = !manualMode;
    input.required = manualMode;
    select.required = !manualMode;

    if (manualMode) {
        input.value = "";
    }
}

function enableFullManualLocationFallback() {
    [countrySelect, stateSelect, citySelect].forEach(select => {
        select.hidden = true;
        select.disabled = true;
        select.required = false;
    });

    [countryManual, stateManual, cityManual].forEach(input => {
        input.hidden = false;
        input.required = true;
    });

    countryManual.placeholder = "Enter your country";
    stateManual.placeholder = "Enter your state / province";
    cityManual.placeholder = "Enter your city";
}

function getLocationValue(select, manualInput) {
    if (!manualInput.hidden) {
        return manualInput.value.trim();
    }

    if (select.value === "__other__") {
        return manualInput.value.trim();
    }

    return select.value.trim();
}

async function loadCountries() {
    countrySelect.classList.add("location-select-loading");
    resetLocationSelect(countrySelect, "Loading countries...", true);
    resetLocationSelect(stateSelect, "Select country first", true);
    resetLocationSelect(citySelect, "Select state first", true);

    try {
        const { getCountries } = await getLocationDataModule();
        const countries = sortByName(await getCountries());

        setPhoneCountryCodeOptions(countries);
        resetLocationSelect(countrySelect, "Select country", false);

        countries.forEach(country => {
            appendLocationOption(
                countrySelect,
                country.name,
                country.name,
                country.iso2
            );
        });

        appendOtherLocationOption(countrySelect);
    } catch (error) {
        console.error("Unable to load country data:", error);
        enableFullManualLocationFallback();
    } finally {
        countrySelect.classList.remove("location-select-loading");
    }
}

countrySelect.addEventListener("change", async function () {
    setManualLocationField(countrySelect, countryManual, false);
    setManualLocationField(stateSelect, stateManual, false);
    setManualLocationField(citySelect, cityManual, false);

    selectedCountryCode = "";
    selectedStateCode = "";

    if (!countrySelect.hidden) {
        stateSelect.hidden = false;
        citySelect.hidden = false;
    }

    resetLocationSelect(stateSelect, "Select country first", true);
    resetLocationSelect(citySelect, "Select state first", true);

    if (!countrySelect.value) {
        return;
    }

    if (countrySelect.value === "__other__") {
        setManualLocationField(countrySelect, countryManual, true);

        stateSelect.hidden = true;
        stateSelect.disabled = true;
        stateSelect.required = false;
        citySelect.hidden = true;
        citySelect.disabled = true;
        citySelect.required = false;

        stateManual.hidden = false;
        stateManual.required = true;
        cityManual.hidden = false;
        cityManual.required = true;
        return;
    }

    const selectedOption = countrySelect.options[countrySelect.selectedIndex];
    selectedCountryCode = selectedOption.dataset.code || "";

    if (!selectedCountryCode) {
        enableFullManualLocationFallback();
        return;
    }

    stateSelect.classList.add("location-select-loading");
    resetLocationSelect(stateSelect, "Loading states...", true);

    try {
        const { getStatesOfCountry } = await getLocationDataModule();
        const states = sortByName(await getStatesOfCountry(selectedCountryCode));

        if (states.length === 0) {
            resetLocationSelect(stateSelect, "No states listed", false);
            appendOtherLocationOption(stateSelect);
            return;
        }

        resetLocationSelect(stateSelect, "Select state / province", false);

        states.forEach(state => {
            appendLocationOption(
                stateSelect,
                state.name,
                state.name,
                state.iso2
            );
        });

        appendOtherLocationOption(stateSelect);
    } catch (error) {
        console.error("Unable to load state data:", error);
        resetLocationSelect(stateSelect, "State data unavailable", true);
        stateManual.hidden = false;
        stateManual.required = true;
        cityManual.hidden = false;
        cityManual.required = true;
    } finally {
        stateSelect.classList.remove("location-select-loading");
    }
});

stateSelect.addEventListener("change", async function () {
    setManualLocationField(stateSelect, stateManual, false);
    setManualLocationField(citySelect, cityManual, false);

    selectedStateCode = "";
    citySelect.hidden = false;
    resetLocationSelect(citySelect, "Select state first", true);

    if (!stateSelect.value) {
        return;
    }

    if (stateSelect.value === "__other__") {
        setManualLocationField(stateSelect, stateManual, true);

        citySelect.hidden = true;
        citySelect.disabled = true;
        citySelect.required = false;
        cityManual.hidden = false;
        cityManual.required = true;
        return;
    }

    const selectedOption = stateSelect.options[stateSelect.selectedIndex];
    selectedStateCode = selectedOption.dataset.code || "";

    if (!selectedCountryCode || !selectedStateCode) {
        cityManual.hidden = false;
        cityManual.required = true;
        return;
    }

    citySelect.classList.add("location-select-loading");
    resetLocationSelect(citySelect, "Loading cities...", true);

    try {
        const { getCitiesOfState } = await getLocationDataModule();
        const cities = sortByName(
            await getCitiesOfState(selectedCountryCode, selectedStateCode)
        );

        if (cities.length === 0) {
            resetLocationSelect(citySelect, "No cities listed", false);
            appendOtherLocationOption(citySelect);
            return;
        }

        resetLocationSelect(citySelect, "Select city", false);

        cities.forEach(city => {
            appendLocationOption(citySelect, city.name, city.name);
        });

        appendOtherLocationOption(citySelect);
    } catch (error) {
        console.error("Unable to load city data:", error);
        resetLocationSelect(citySelect, "City data unavailable", true);
        cityManual.hidden = false;
        cityManual.required = true;
    } finally {
        citySelect.classList.remove("location-select-loading");
    }
});

citySelect.addEventListener("change", function () {
    setManualLocationField(
        citySelect,
        cityManual,
        citySelect.value === "__other__"
    );
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
    phoneCountryCode.value = "+91";
    whatsappCountryCode.value = "+91";
    whatsappCountryCode.disabled = false;
    whatsapp.readOnly = false;

    countryManual.value = "";
    stateManual.value = "";
    cityManual.value = "";

    if (!countrySelect.hidden) {
        countrySelect.value = "";
        resetLocationSelect(stateSelect, "Select country first", true);
        resetLocationSelect(citySelect, "Select state first", true);
        setManualLocationField(countrySelect, countryManual, false);
        setManualLocationField(stateSelect, stateManual, false);
        setManualLocationField(citySelect, cityManual, false);
    }

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
        phone: buildInternationalPhone(phoneCountryCode, phone),
        whatsapp: sameAsPhone.checked
            ? buildInternationalPhone(phoneCountryCode, phone)
            : buildInternationalPhone(whatsappCountryCode, whatsapp),
        gender: document.getElementById("gender").value,
        age,
        participant_group: participantGroupKey,
        institution_organization: document.getElementById("institutionOrganization").value.trim(),
        country: getLocationValue(countrySelect, countryManual),
        state: getLocationValue(stateSelect, stateManual),
        city: getLocationValue(citySelect, cityManual),
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
loadCountries();
