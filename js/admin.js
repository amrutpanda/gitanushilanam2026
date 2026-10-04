const ADMIN_API_BASE_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8787"
        : "https://gitanushilanam-portal.panda2amrut.workers.dev";

const ADMIN_SESSION_STORAGE_KEY = "gitanushilanam_admin_session";
const PAGE_SIZE = 30;

const LOCATION_DATA_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@countrystatecity/countries-browser@1.0.4/+esm";

/* =========================================================
   PAGE ELEMENTS
========================================================= */

const adminIdentity = document.getElementById("adminIdentity");
const adminRoleBadge = document.getElementById("adminRoleBadge");
const logoutButton = document.getElementById("logoutButton");

const filterForm = document.getElementById("filterForm");
const searchFilter = document.getElementById("searchFilter");
const competitionFilter = document.getElementById("competitionFilter");
const participantGroupFilter = document.getElementById("participantGroupFilter");
const countryFilter = document.getElementById("countryFilter");
const stateFilter = document.getElementById("stateFilter");
const reviewFilter = document.getElementById("reviewFilter");
const clearFiltersButton = document.getElementById("clearFiltersButton");

const registrationsBody = document.getElementById("registrationsBody");
const resultCount = document.getElementById("resultCount");
const dashboardStatus = document.getElementById("dashboardStatus");
const previousPageButton = document.getElementById("previousPageButton");
const nextPageButton = document.getElementById("nextPageButton");
const pageIndicator = document.getElementById("pageIndicator");
const registrationPanelDescription = document.getElementById("registrationPanelDescription");

const participantGroupChart = document.getElementById("participantGroupChart");
const competitionChart = document.getElementById("competitionChart");
const registrationTrendChart = document.getElementById("registrationTrendChart");

const refreshAdminsButton = document.getElementById("refreshAdminsButton");
const refreshAuditButton = document.getElementById("refreshAuditButton");
const adminUsersBody = document.getElementById("adminUsersBody");
const auditBody = document.getElementById("auditBody");

const editRegistrationModal = document.getElementById("editRegistrationModal");
const editRegistrationForm = document.getElementById("editRegistrationForm");
const editRegistrationId = document.getElementById("editRegistrationId");
const editRegistrationSubtitle = document.getElementById("editRegistrationSubtitle");
const editFormStatus = document.getElementById("editFormStatus");
const saveRegistrationButton = document.getElementById("saveRegistrationButton");

const editName = document.getElementById("editName");
const editGender = document.getElementById("editGender");
const editEmail = document.getElementById("editEmail");
const editAge = document.getElementById("editAge");
const editParticipantGroup = document.getElementById("editParticipantGroup");
const editInstitution = document.getElementById("editInstitution");
const editPhone = document.getElementById("editPhone");
const editWhatsapp = document.getElementById("editWhatsapp");
const editHeardFrom = document.getElementById("editHeardFrom");

const editCountry = document.getElementById("editCountry");
const editState = document.getElementById("editState");
const editCity = document.getElementById("editCity");
const editCountryManual = document.getElementById("editCountryManual");
const editStateManual = document.getElementById("editStateManual");
const editCityManual = document.getElementById("editCityManual");
const storedLocationNote = document.getElementById("storedLocationNote");

const editQuiz = document.getElementById("editQuiz");
const editShloka = document.getElementById("editShloka");
const editAnimated = document.getElementById("editAnimated");
const editTreasure = document.getElementById("editTreasure");

const summaryElements = {
    total: document.getElementById("totalRegistrations"),
    quiz: document.getElementById("quizRegistrations"),
    shloka: document.getElementById("shlokaRegistrations"),
    animated: document.getElementById("animatedRegistrations"),
    treasure: document.getElementById("treasureRegistrations")
};

const reviewElements = {
    needsReview: document.getElementById("reviewNeedsReview"),
    missingGroup: document.getElementById("reviewMissingGroup"),
    missingCountry: document.getElementById("reviewMissingCountry"),
    missingState: document.getElementById("reviewMissingState"),
    missingCity: document.getElementById("reviewMissingCity"),
    complete: document.getElementById("reviewComplete")
};

/* =========================================================
   LABELS / STATE
========================================================= */

const participantGroupLabels = {
    sub_junior: "Sub-Junior (Class 3–5)",
    junior: "Junior (Class 6–8)",
    senior: "Senior (Class 9–12)",
    youth_adult: "Youth / Adult (College / Adult)"
};

const competitionDefinitions = [
    ["bhagavad_gita_quiz", "Bhagavad Gita Quiz", "Quiz"],
    ["shloka_recitation", "Shloka Recitation", "Shloka"],
    ["animated_bg_video", "Animated BG Video", "Animated"],
    ["treasure_hunt", "Treasure Hunt", "Treasure Hunt"]
];

const auditFieldLabels = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    whatsapp: "WhatsApp",
    age: "Age",
    participant_group: "Participant Group",
    gender: "Gender",
    institution_organization: "Institution / Organization",
    country: "Country",
    state: "State / Province",
    city: "City",
    heard_from: "Heard From",
    bhagavad_gita_quiz: "Bhagavad Gita Quiz",
    shloka_recitation: "Shloka Recitation",
    animated_bg_video: "Animated BG Video",
    treasure_hunt: "Treasure Hunt"
};

let currentAdmin = null;
let isSuperAdmin = false;
let currentPage = 1;
let totalPages = 1;
let currentTotal = 0;
let registrationCache = new Map();
let locationDataModulePromise = null;
let editSelectedCountryCode = "";
let editSelectedStateCode = "";

/* =========================================================
   SESSION / API HELPERS
========================================================= */

function goToLogin() {
    sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    window.location.replace("admin-login.html");
}

function showDashboardStatus(message, isError = false) {
    dashboardStatus.textContent = message;
    dashboardStatus.classList.toggle("is-visible", Boolean(message));
    dashboardStatus.classList.toggle("is-error", isError);
}

function showEditStatus(message, state = "") {
    editFormStatus.textContent = message;
    editFormStatus.classList.toggle("is-error", state === "error");
    editFormStatus.classList.toggle("is-success", state === "success");
}

async function adminFetch(path, options = {}) {
    const sessionToken = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

    if (!sessionToken) {
        goToLogin();
        throw new Error("No active admin session.");
    }

    const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            "Authorization": `Bearer ${sessionToken}`
        }
    });

    if (response.status === 401) {
        goToLogin();
        throw new Error("Admin session expired.");
    }

    return response;
}

async function loadSession() {
    const response = await adminFetch("/api/admin/session");

    if (!response.ok) {
        goToLogin();
        return false;
    }

    const result = await response.json();

    if (!result.success) {
        goToLogin();
        return false;
    }

    currentAdmin = result.admin;
    isSuperAdmin = result.admin.role === "super_admin";

    adminIdentity.textContent = result.admin.name
        ? `${result.admin.name} · ${result.admin.email}`
        : result.admin.email;

    adminRoleBadge.hidden = false;
    const roleLabels = {
        super_admin: "Super Admin",
        admin: "Admin",
        judge: "Judge"
    };

    adminRoleBadge.textContent = roleLabels[result.admin.role] || result.admin.role;
    adminRoleBadge.classList.toggle("is-super-admin", isSuperAdmin);

    document.querySelectorAll("[data-super-admin-only]").forEach(element => {
        element.hidden = !isSuperAdmin;
    });

    registrationPanelDescription.textContent = isSuperAdmin
        ? "View all registrations and correct participant data with a full audit trail."
        : "Read-only registration records and filtering.";

    return true;
}

/* =========================================================
   GENERAL FORMATTING HELPERS
========================================================= */

function createTextElement(tagName, text, className = "") {
    const element = document.createElement(tagName);
    element.textContent = text ?? "";

    if (className) {
        element.className = className;
    }

    return element;
}

function formatRegistrationDate(value) {
    if (!value) {
        return "-";
    }

    const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

function normalizeAuditValue(field, value) {
    if (field === "participant_group") {
        return participantGroupLabels[value] || value || "-";
    }

    if (
        field === "bhagavad_gita_quiz" ||
        field === "shloka_recitation" ||
        field === "animated_bg_video" ||
        field === "treasure_hunt"
    ) {
        return Number(value) === 1 ? "Yes" : "No";
    }

    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

/* =========================================================
   SUMMARY / CHARTS
========================================================= */

function renderBarChart(container, entries) {
    container.innerHTML = "";

    const maximum = Math.max(...entries.map(entry => Number(entry.value) || 0), 0);

    if (maximum === 0) {
        container.appendChild(
            createTextElement("div", "No data available yet.", "chart-empty-state")
        );
        return;
    }

    entries.forEach(entry => {
        const value = Number(entry.value) || 0;
        const row = document.createElement("div");
        row.className = "chart-bar-row";

        row.appendChild(createTextElement("div", entry.label, "chart-bar-label"));

        const track = document.createElement("div");
        track.className = "chart-bar-track";

        const fill = document.createElement("div");
        fill.className = "chart-bar-fill";
        fill.style.width = `${Math.max((value / maximum) * 100, value > 0 ? 2 : 0)}%`;

        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(
            createTextElement("div", value.toLocaleString(), "chart-bar-value")
        );

        container.appendChild(row);
    });
}

function renderTrendChart(points) {
    registrationTrendChart.innerHTML = "";

    if (!Array.isArray(points) || points.length === 0) {
        registrationTrendChart.appendChild(
            createTextElement("div", "No recent registration data.", "chart-empty-state")
        );
        return;
    }

    const width = 900;
    const height = 245;
    const padding = {
        top: 22,
        right: 28,
        bottom: 34,
        left: 36
    };

    const usableWidth = width - padding.left - padding.right;
    const usableHeight = height - padding.top - padding.bottom;
    const values = points.map(point => Number(point.count) || 0);
    const maximum = Math.max(...values, 1);
    const denominator = Math.max(points.length - 1, 1);

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Registration trend for the last 30 days");

    const defs = document.createElementNS(svgNamespace, "defs");
    const gradient = document.createElementNS(svgNamespace, "linearGradient");
    gradient.setAttribute("id", "registrationTrendFill");
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("y2", "1");

    const stopTop = document.createElementNS(svgNamespace, "stop");
    stopTop.setAttribute("offset", "0%");
    stopTop.setAttribute("stop-color", "#315efb");
    stopTop.setAttribute("stop-opacity", "0.20");

    const stopBottom = document.createElementNS(svgNamespace, "stop");
    stopBottom.setAttribute("offset", "100%");
    stopBottom.setAttribute("stop-color", "#315efb");
    stopBottom.setAttribute("stop-opacity", "0.01");

    gradient.appendChild(stopTop);
    gradient.appendChild(stopBottom);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    for (let index = 0; index <= 4; index += 1) {
        const y = padding.top + (usableHeight / 4) * index;
        const line = document.createElementNS(svgNamespace, "line");
        line.setAttribute("x1", String(padding.left));
        line.setAttribute("x2", String(width - padding.right));
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));
        line.setAttribute("class", "trend-grid-line");
        svg.appendChild(line);
    }

    const coordinates = points.map((point, index) => {
        const x = padding.left + (usableWidth * index) / denominator;
        const y = padding.top + usableHeight - ((Number(point.count) || 0) / maximum) * usableHeight;
        return { x, y, point };
    });

    const linePoints = coordinates.map(item => `${item.x},${item.y}`).join(" ");
    const areaPoints = [
        `${coordinates[0].x},${padding.top + usableHeight}`,
        linePoints,
        `${coordinates[coordinates.length - 1].x},${padding.top + usableHeight}`
    ].join(" ");

    const area = document.createElementNS(svgNamespace, "polygon");
    area.setAttribute("points", areaPoints);
    area.setAttribute("class", "trend-area");
    svg.appendChild(area);

    const polyline = document.createElementNS(svgNamespace, "polyline");
    polyline.setAttribute("points", linePoints);
    polyline.setAttribute("class", "trend-line");
    svg.appendChild(polyline);

    coordinates.forEach((item, index) => {
        const circle = document.createElementNS(svgNamespace, "circle");
        circle.setAttribute("cx", String(item.x));
        circle.setAttribute("cy", String(item.y));
        circle.setAttribute("r", "4");
        circle.setAttribute("class", "trend-point");
        svg.appendChild(circle);

        const shouldShowValue = points.length <= 12 || index === coordinates.length - 1;

        if (shouldShowValue) {
            const valueLabel = document.createElementNS(svgNamespace, "text");
            valueLabel.setAttribute("x", String(item.x));
            valueLabel.setAttribute("y", String(Math.max(item.y - 10, 12)));
            valueLabel.setAttribute("text-anchor", "middle");
            valueLabel.setAttribute("class", "trend-value-label");
            valueLabel.textContent = String(Number(item.point.count) || 0);
            svg.appendChild(valueLabel);
        }
    });

    const labelIndexes = [...new Set([
        0,
        Math.floor((points.length - 1) / 2),
        points.length - 1
    ])];

    labelIndexes.forEach(index => {
        const item = coordinates[index];
        const date = new Date(`${item.point.date}T00:00:00Z`);
        const label = Number.isNaN(date.getTime())
            ? item.point.date
            : new Intl.DateTimeFormat("en-IN", {
                day: "numeric",
                month: "short"
            }).format(date);

        const text = document.createElementNS(svgNamespace, "text");
        text.setAttribute("x", String(item.x));
        text.setAttribute("y", String(height - 8));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", "trend-label");
        text.textContent = label;
        svg.appendChild(text);
    });

    registrationTrendChart.appendChild(svg);
}

async function loadSummary() {
    const response = await adminFetch("/admin/api/summary");
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load registration summary.");
    }

    summaryElements.total.textContent = Number(result.summary.total).toLocaleString();
    summaryElements.quiz.textContent = Number(result.summary.quiz).toLocaleString();
    summaryElements.shloka.textContent = Number(result.summary.shloka_recitation).toLocaleString();
    summaryElements.animated.textContent = Number(result.summary.animated_bg_video).toLocaleString();
    summaryElements.treasure.textContent = Number(result.summary.treasure_hunt).toLocaleString();

    renderBarChart(participantGroupChart, [
        {
            label: "Sub-Junior",
            value: result.participant_groups.sub_junior
        },
        {
            label: "Junior",
            value: result.participant_groups.junior
        },
        {
            label: "Senior",
            value: result.participant_groups.senior
        },
        {
            label: "Youth / Adult",
            value: result.participant_groups.youth_adult
        },
        {
            label: "Not assigned",
            value: result.participant_groups.unassigned
        }
    ]);

    renderBarChart(competitionChart, [
        {
            label: "Bhagavad Gita Quiz",
            value: result.summary.quiz
        },
        {
            label: "Shloka Recitation",
            value: result.summary.shloka_recitation
        },
        {
            label: "Animated BG Video",
            value: result.summary.animated_bg_video
        },
        {
            label: "Treasure Hunt",
            value: result.summary.treasure_hunt
        }
    ]);

    renderTrendChart(result.daily_registrations);

    if (isSuperAdmin) {
        reviewElements.needsReview.textContent = Number(result.review.needs_review).toLocaleString();
        reviewElements.missingGroup.textContent = Number(result.review.missing_participant_group).toLocaleString();
        reviewElements.missingCountry.textContent = Number(result.review.missing_country).toLocaleString();
        reviewElements.missingState.textContent = Number(result.review.missing_state).toLocaleString();
        reviewElements.missingCity.textContent = Number(result.review.missing_city).toLocaleString();
        reviewElements.complete.textContent = Number(result.review.complete).toLocaleString();
    }
}

/* =========================================================
   FILTER OPTIONS
========================================================= */

function replaceSelectOptions(select, values) {
    const currentValue = select.value;

    while (select.options.length > 1) {
        select.remove(1);
    }

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    if (values.includes(currentValue)) {
        select.value = currentValue;
    }
}

async function loadFilterOptions() {
    const response = await adminFetch("/admin/api/filter-options");
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load filter options.");
    }

    replaceSelectOptions(countryFilter, result.countries);
    replaceSelectOptions(stateFilter, result.states);
}

/* =========================================================
   REGISTRATION TABLE
========================================================= */

function renderCompetitionBadges(registration) {
    const wrapper = document.createElement("div");
    wrapper.className = "competition-badges";

    competitionDefinitions.forEach(([key, , shortLabel]) => {
        if (Number(registration[key]) === 1) {
            wrapper.appendChild(
                createTextElement("span", shortLabel, "competition-badge")
            );
        }
    });

    if (!wrapper.children.length) {
        wrapper.appendChild(createTextElement("span", "None", "muted-cell"));
    }

    return wrapper;
}

function renderRegistrations(registrations) {
    registrationsBody.innerHTML = "";
    registrationCache = new Map();

    if (!registrations.length) {
        const row = document.createElement("tr");
        row.className = "empty-row";

        const cell = document.createElement("td");
        cell.colSpan = isSuperAdmin ? 12 : 11;
        cell.textContent = "No registrations match the selected filters.";

        row.appendChild(cell);
        registrationsBody.appendChild(row);
        return;
    }

    registrations.forEach(registration => {
        registrationCache.set(Number(registration.id), registration);

        const row = document.createElement("tr");

        if (Number(registration.needs_review) === 1) {
            row.classList.add("needs-review-row");
        }

        const nameCell = document.createElement("td");
        nameCell.className = "primary-cell";
        nameCell.appendChild(createTextElement("strong", registration.name || "-"));
        nameCell.appendChild(
            createTextElement("small", registration.email || "-", "muted-cell")
        );
        row.appendChild(nameCell);

        const contactCell = document.createElement("td");
        const contactStack = document.createElement("div");
        contactStack.className = "contact-stack";
        contactStack.appendChild(createTextElement("span", registration.phone || "-"));
        contactStack.appendChild(
            createTextElement(
                "small",
                `WhatsApp: ${registration.whatsapp || "-"}`
            )
        );
        contactCell.appendChild(contactStack);
        row.appendChild(contactCell);

        row.appendChild(createTextElement("td", String(registration.age ?? "-")));

        const participantGroupLabel =
            participantGroupLabels[registration.participant_group] || "Not assigned";
        row.appendChild(createTextElement("td", participantGroupLabel));

        row.appendChild(createTextElement("td", registration.gender || "-"));
        row.appendChild(
            createTextElement("td", registration.institution_organization || "-")
        );

        const locationCell = document.createElement("td");
        const locationStack = document.createElement("div");
        locationStack.className = "location-stack";

        const cityState = [registration.city, registration.state]
            .filter(Boolean)
            .join(", ");

        locationStack.appendChild(createTextElement("span", cityState || "-"));
        locationStack.appendChild(
            createTextElement("small", registration.country || "-")
        );
        locationCell.appendChild(locationStack);
        row.appendChild(locationCell);

        const competitionCell = document.createElement("td");
        competitionCell.appendChild(renderCompetitionBadges(registration));
        row.appendChild(competitionCell);

        row.appendChild(createTextElement("td", registration.heard_from || "-"));

        const statusCell = document.createElement("td");
        const statusBadge = createTextElement(
            "span",
            Number(registration.needs_review) === 1 ? "Needs review" : "Complete",
            Number(registration.needs_review) === 1
                ? "data-status-badge needs-review"
                : "data-status-badge is-complete"
        );
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        row.appendChild(
            createTextElement("td", formatRegistrationDate(registration.created_at))
        );

        if (isSuperAdmin) {
            const actionCell = document.createElement("td");
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "edit-registration-button";
            editButton.textContent = "Edit";
            editButton.dataset.registrationId = String(registration.id);
            actionCell.appendChild(editButton);
            row.appendChild(actionCell);
        }

        registrationsBody.appendChild(row);
    });
}

function buildRegistrationQuery(page) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));

    if (searchFilter.value.trim()) {
        params.set("search", searchFilter.value.trim());
    }

    if (competitionFilter.value) {
        params.set("competition", competitionFilter.value);
    }

    if (participantGroupFilter.value) {
        params.set("participant_group", participantGroupFilter.value);
    }

    if (countryFilter.value) {
        params.set("country", countryFilter.value);
    }

    if (stateFilter.value) {
        params.set("state", stateFilter.value);
    }

    if (isSuperAdmin && reviewFilter.value) {
        params.set("review", reviewFilter.value);
    }

    return params.toString();
}

async function loadRegistrations(page = 1) {
    showDashboardStatus("Loading registrations...");

    try {
        const response = await adminFetch(
            `/admin/api/registrations?${buildRegistrationQuery(page)}`
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load registrations.");
        }

        currentPage = result.page;
        totalPages = result.total_pages;
        currentTotal = result.total;

        renderRegistrations(result.registrations);

        const firstResult = currentTotal === 0
            ? 0
            : (currentPage - 1) * PAGE_SIZE + 1;
        const lastResult = Math.min(currentPage * PAGE_SIZE, currentTotal);

        resultCount.textContent = currentTotal === 0
            ? "0 matching registrations"
            : `Showing ${firstResult}-${lastResult} of ${currentTotal.toLocaleString()} matching registrations`;

        pageIndicator.textContent = `Page ${currentPage} of ${Math.max(totalPages, 1)}`;
        previousPageButton.disabled = currentPage <= 1;
        nextPageButton.disabled = currentPage >= totalPages || totalPages === 0;
        showDashboardStatus("");
    } catch (error) {
        console.error("Registration loading error:", error);
        showDashboardStatus(
            error instanceof Error ? error.message : "Unable to load registrations.",
            true
        );
    }
}

/* =========================================================
   SUPER ADMIN DATA REVIEW SHORTCUTS
========================================================= */

document.querySelectorAll("[data-review-target]").forEach(button => {
    button.addEventListener("click", function () {
        if (!isSuperAdmin) {
            return;
        }

        reviewFilter.value = button.dataset.reviewTarget || "";
        loadRegistrations(1);
        document.getElementById("registrations").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
});

/* =========================================================
   LOCATION DATA FOR SUPER ADMIN EDITING
========================================================= */

function getLocationDataModule() {
    if (!locationDataModulePromise) {
        locationDataModulePromise = import(LOCATION_DATA_MODULE_URL);
    }

    return locationDataModulePromise;
}

function sortByName(items) {
    return [...items].sort((left, right) => left.name.localeCompare(right.name));
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

function setManualLocationField(select, input, manualMode, currentValue = "") {
    input.hidden = !manualMode;
    input.required = manualMode;
    select.required = !manualMode;

    if (manualMode) {
        input.value = currentValue;
    }
}

function enableFullManualEditLocation(country, state, city) {
    [editCountry, editState, editCity].forEach(select => {
        select.hidden = true;
        select.disabled = true;
        select.required = false;
    });

    [
        [editCountryManual, country],
        [editStateManual, state],
        [editCityManual, city]
    ].forEach(([input, value]) => {
        input.hidden = false;
        input.required = true;
        input.value = value || "";
    });
}

function getEditLocationValue(select, manualInput) {
    if (!manualInput.hidden) {
        return manualInput.value.trim();
    }

    return select.value.trim();
}

function findLocationOptionByName(select, value) {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (!normalizedValue) {
        return null;
    }

    return [...select.options].find(option => {
        return option.value.toLowerCase() === normalizedValue;
    }) || null;
}

async function populateEditCountries(selectedCountry = "") {
    editCountry.hidden = false;
    editState.hidden = false;
    editCity.hidden = false;
    editCountryManual.hidden = true;
    editStateManual.hidden = true;
    editCityManual.hidden = true;

    resetLocationSelect(editCountry, "Loading countries...", true);
    resetLocationSelect(editState, "Select country first", true);
    resetLocationSelect(editCity, "Select state first", true);

    const { getCountries } = await getLocationDataModule();
    const countries = sortByName(await getCountries());

    resetLocationSelect(editCountry, "Select country", false);

    countries.forEach(country => {
        appendLocationOption(
            editCountry,
            country.name,
            country.name,
            country.iso2
        );
    });

    appendOtherLocationOption(editCountry);

    if (!selectedCountry) {
        return false;
    }

    const matchedCountry = findLocationOptionByName(editCountry, selectedCountry);

    if (!matchedCountry) {
        editCountry.value = "__other__";
        setManualLocationField(
            editCountry,
            editCountryManual,
            true,
            selectedCountry
        );
        return false;
    }

    editCountry.value = matchedCountry.value;
    editSelectedCountryCode = matchedCountry.dataset.code || "";
    return Boolean(editSelectedCountryCode);
}

async function populateEditStates(selectedState = "") {
    resetLocationSelect(editState, "Loading states...", true);
    resetLocationSelect(editCity, "Select state first", true);
    editSelectedStateCode = "";

    if (!editSelectedCountryCode) {
        return false;
    }

    const { getStatesOfCountry } = await getLocationDataModule();
    const states = sortByName(
        await getStatesOfCountry(editSelectedCountryCode)
    );

    resetLocationSelect(editState, "Select state / province", false);

    states.forEach(state => {
        appendLocationOption(
            editState,
            state.name,
            state.name,
            state.iso2
        );
    });

    appendOtherLocationOption(editState);

    if (!selectedState) {
        return false;
    }

    const matchedState = findLocationOptionByName(editState, selectedState);

    if (!matchedState) {
        editState.value = "__other__";
        setManualLocationField(
            editState,
            editStateManual,
            true,
            selectedState
        );
        return false;
    }

    editState.value = matchedState.value;
    editSelectedStateCode = matchedState.dataset.code || "";
    return Boolean(editSelectedStateCode);
}

async function populateEditCities(selectedCity = "") {
    resetLocationSelect(editCity, "Loading cities...", true);

    if (!editSelectedCountryCode || !editSelectedStateCode) {
        return false;
    }

    const { getCitiesOfState } = await getLocationDataModule();
    const cities = sortByName(
        await getCitiesOfState(editSelectedCountryCode, editSelectedStateCode)
    );

    resetLocationSelect(editCity, "Select city", false);

    cities.forEach(city => {
        appendLocationOption(editCity, city.name, city.name);
    });

    appendOtherLocationOption(editCity);

    if (!selectedCity) {
        return false;
    }

    const matchedCity = findLocationOptionByName(editCity, selectedCity);

    if (!matchedCity) {
        editCity.value = "__other__";
        setManualLocationField(editCity, editCityManual, true, selectedCity);
        return false;
    }

    editCity.value = matchedCity.value;
    return true;
}

async function prepareEditLocation(country, state, city) {
    storedLocationNote.textContent =
        `Currently stored: ${country || "-"} / ${state || "-"} / ${city || "-"}`;

    editSelectedCountryCode = "";
    editSelectedStateCode = "";

    try {
        const countryMatched = await populateEditCountries(country);

        if (!countryMatched) {
            if (editCountry.value === "__other__") {
                editState.hidden = true;
                editState.disabled = true;
                editState.required = false;
                editCity.hidden = true;
                editCity.disabled = true;
                editCity.required = false;

                editStateManual.hidden = false;
                editStateManual.required = true;
                editStateManual.value = state || "";

                editCityManual.hidden = false;
                editCityManual.required = true;
                editCityManual.value = city || "";
            }
            return;
        }

        const stateMatched = await populateEditStates(state);

        if (!stateMatched) {
            if (editState.value === "__other__") {
                editCity.hidden = true;
                editCity.disabled = true;
                editCity.required = false;
                editCityManual.hidden = false;
                editCityManual.required = true;
                editCityManual.value = city || "";
            }
            return;
        }

        await populateEditCities(city);
    } catch (error) {
        console.error("Unable to load edit location data:", error);
        enableFullManualEditLocation(country, state, city);
    }
}

editCountry.addEventListener("change", async function () {
    setManualLocationField(editCountry, editCountryManual, false);
    setManualLocationField(editState, editStateManual, false);
    setManualLocationField(editCity, editCityManual, false);

    editSelectedCountryCode = "";
    editSelectedStateCode = "";

    editState.hidden = false;
    editCity.hidden = false;
    resetLocationSelect(editState, "Select country first", true);
    resetLocationSelect(editCity, "Select state first", true);

    if (!editCountry.value) {
        return;
    }

    if (editCountry.value === "__other__") {
        setManualLocationField(editCountry, editCountryManual, true);

        editState.hidden = true;
        editState.disabled = true;
        editState.required = false;
        editCity.hidden = true;
        editCity.disabled = true;
        editCity.required = false;

        editStateManual.hidden = false;
        editStateManual.required = true;
        editStateManual.value = "";
        editCityManual.hidden = false;
        editCityManual.required = true;
        editCityManual.value = "";
        return;
    }

    const option = editCountry.options[editCountry.selectedIndex];
    editSelectedCountryCode = option.dataset.code || "";

    try {
        await populateEditStates("");
    } catch (error) {
        console.error("Unable to load states:", error);
        editState.hidden = true;
        editState.disabled = true;
        editState.required = false;
        editStateManual.hidden = false;
        editStateManual.required = true;
    }
});

editState.addEventListener("change", async function () {
    setManualLocationField(editState, editStateManual, false);
    setManualLocationField(editCity, editCityManual, false);

    editSelectedStateCode = "";
    editCity.hidden = false;
    resetLocationSelect(editCity, "Select state first", true);

    if (!editState.value) {
        return;
    }

    if (editState.value === "__other__") {
        setManualLocationField(editState, editStateManual, true);
        editCity.hidden = true;
        editCity.disabled = true;
        editCity.required = false;
        editCityManual.hidden = false;
        editCityManual.required = true;
        editCityManual.value = "";
        return;
    }

    const option = editState.options[editState.selectedIndex];
    editSelectedStateCode = option.dataset.code || "";

    try {
        await populateEditCities("");
    } catch (error) {
        console.error("Unable to load cities:", error);
        editCity.hidden = true;
        editCity.disabled = true;
        editCity.required = false;
        editCityManual.hidden = false;
        editCityManual.required = true;
    }
});

editCity.addEventListener("change", function () {
    setManualLocationField(
        editCity,
        editCityManual,
        editCity.value === "__other__"
    );
});

/* =========================================================
   EDIT REGISTRATION MODAL
========================================================= */

async function openEditRegistration(registration) {
    if (!isSuperAdmin) {
        return;
    }

    editRegistrationId.value = String(registration.id);
    editRegistrationSubtitle.textContent =
        `Registration #${registration.id} · ${registration.email || registration.name || "Participant"}`;

    editName.value = registration.name || "";
    editGender.value = registration.gender || "";
    editEmail.value = registration.email || "";
    editAge.value = registration.age ?? "";
    editParticipantGroup.value = registration.participant_group || "";
    editInstitution.value = registration.institution_organization || "";
    editPhone.value = registration.phone || "";
    editWhatsapp.value = registration.whatsapp || "";
    editHeardFrom.value = registration.heard_from || "";

    editQuiz.checked = Number(registration.bhagavad_gita_quiz) === 1;
    editShloka.checked = Number(registration.shloka_recitation) === 1;
    editAnimated.checked = Number(registration.animated_bg_video) === 1;
    editTreasure.checked = Number(registration.treasure_hunt) === 1;

    showEditStatus("");
    editRegistrationModal.hidden = false;
    document.body.classList.add("modal-open");

    await prepareEditLocation(
        registration.country || "",
        registration.state || "",
        registration.city || ""
    );
}

function closeEditRegistration() {
    editRegistrationModal.hidden = true;
    document.body.classList.remove("modal-open");
    showEditStatus("");
}

document.querySelectorAll("[data-edit-modal-close]").forEach(element => {
    element.addEventListener("click", closeEditRegistration);
});

registrationsBody.addEventListener("click", function (event) {
    const button = event.target.closest(".edit-registration-button");

    if (!button || !isSuperAdmin) {
        return;
    }

    const registrationId = Number(button.dataset.registrationId);
    const registration = registrationCache.get(registrationId);

    if (registration) {
        openEditRegistration(registration);
    }
});

editRegistrationForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!isSuperAdmin) {
        showEditStatus("Only a Super Admin can edit registrations.", "error");
        return;
    }

    const competitionCheckboxes = [
        editQuiz,
        editShloka,
        editAnimated,
        editTreasure
    ];

    const competitions = competitionCheckboxes
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    if (competitions.length === 0) {
        showEditStatus("Select at least one competition.", "error");
        return;
    }

    const payload = {
        name: editName.value.trim(),
        gender: editGender.value,
        email: editEmail.value.trim(),
        age: Number(editAge.value),
        participant_group: editParticipantGroup.value,
        institution_organization: editInstitution.value.trim(),
        phone: editPhone.value.trim(),
        whatsapp: editWhatsapp.value.trim(),
        country: getEditLocationValue(editCountry, editCountryManual),
        state: getEditLocationValue(editState, editStateManual),
        city: getEditLocationValue(editCity, editCityManual),
        heard_from: editHeardFrom.value.trim(),
        competitions
    };

    saveRegistrationButton.disabled = true;
    showEditStatus("Saving changes...");

    try {
        const registrationId = Number(editRegistrationId.value);
        const response = await adminFetch(
            `/admin/api/registrations/${registrationId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to update registration.");
        }

        showEditStatus(
            result.no_changes
                ? "No changes were required."
                : "Registration updated and recorded in the audit log.",
            "success"
        );

        await Promise.all([
            loadSummary(),
            loadFilterOptions(),
            loadRegistrations(currentPage),
            loadAuditLog()
        ]);

        window.setTimeout(closeEditRegistration, 650);
    } catch (error) {
        console.error("Registration update error:", error);
        showEditStatus(
            error instanceof Error ? error.message : "Unable to update registration.",
            "error"
        );
    } finally {
        saveRegistrationButton.disabled = false;
    }
});

/* =========================================================
   ADMIN MANAGEMENT - READ ONLY
========================================================= */

async function loadAdmins() {
    if (!isSuperAdmin) {
        return;
    }

    const response = await adminFetch("/admin/api/admins");
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load admin accounts.");
    }

    adminUsersBody.innerHTML = "";

    if (!result.admins.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "No administrator accounts found.";
        row.appendChild(cell);
        adminUsersBody.appendChild(row);
        return;
    }

    result.admins.forEach(admin => {
        const row = document.createElement("tr");
        row.appendChild(createTextElement("td", admin.name || "-"));
        row.appendChild(createTextElement("td", admin.email));
        row.appendChild(
            createTextElement(
                "td",
                ({
                    super_admin: "Super Admin",
                    admin: "Admin",
                    judge: "Judge"
                })[admin.role] || admin.role
            )
        );

        const statusCell = document.createElement("td");
        statusCell.appendChild(
            createTextElement(
                "span",
                Number(admin.active) === 1 ? "Active" : "Disabled",
                Number(admin.active) === 1
                    ? "account-status is-active"
                    : "account-status is-disabled"
            )
        );
        row.appendChild(statusCell);

        const passwordCell = document.createElement("td");
        passwordCell.appendChild(
            createTextElement(
                "span",
                Number(admin.password_set) === 1 ? "Set" : "Not set",
                Number(admin.password_set) === 1
                    ? "password-status is-set"
                    : "password-status is-missing"
            )
        );
        row.appendChild(passwordCell);

        row.appendChild(createTextElement("td", formatRegistrationDate(admin.last_login_at)));
        row.appendChild(createTextElement("td", formatRegistrationDate(admin.created_at)));
        adminUsersBody.appendChild(row);
    });
}

/* =========================================================
   AUDIT LOG
========================================================= */

function parseAuditJson(value) {
    if (!value) {
        return {};
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function renderAuditChanges(oldValues, newValues) {
    const wrapper = document.createElement("div");
    wrapper.className = "audit-change-list";

    const oldData = parseAuditJson(oldValues);
    const newData = parseAuditJson(newValues);
    const fields = [...new Set([
        ...Object.keys(oldData),
        ...Object.keys(newData)
    ])];

    if (!fields.length) {
        wrapper.appendChild(
            createTextElement("span", "No field details", "muted-cell")
        );
        return wrapper;
    }

    fields.forEach(field => {
        const item = document.createElement("div");
        item.className = "audit-change-item";

        const label = auditFieldLabels[field] || field;
        const before = normalizeAuditValue(field, oldData[field]);
        const after = normalizeAuditValue(field, newData[field]);

        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        item.appendChild(strong);
        item.appendChild(document.createTextNode(`${before} → ${after}`));
        wrapper.appendChild(item);
    });

    return wrapper;
}

async function loadAuditLog() {
    if (!isSuperAdmin) {
        return;
    }

    const response = await adminFetch("/admin/api/audit-log?page=1&page_size=50");
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load audit log.");
    }

    auditBody.innerHTML = "";

    if (!result.entries.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "No Super Admin registration changes recorded yet.";
        row.appendChild(cell);
        auditBody.appendChild(row);
        return;
    }

    result.entries.forEach(entry => {
        const row = document.createElement("tr");
        row.appendChild(createTextElement("td", formatRegistrationDate(entry.created_at)));

        const adminCell = document.createElement("td");
        adminCell.appendChild(createTextElement("strong", entry.admin_email));
        adminCell.appendChild(
            createTextElement("div", entry.admin_role || "-", "muted-cell")
        );
        row.appendChild(adminCell);

        row.appendChild(
            createTextElement(
                "td",
                entry.action === "registration_update"
                    ? "Registration updated"
                    : entry.action
            )
        );

        row.appendChild(
            createTextElement(
                "td",
                entry.entity_type === "registration"
                    ? `Registration #${entry.entity_id}`
                    : `${entry.entity_type} ${entry.entity_id || ""}`.trim()
            )
        );

        const changesCell = document.createElement("td");
        changesCell.appendChild(
            renderAuditChanges(entry.old_values, entry.new_values)
        );
        row.appendChild(changesCell);
        auditBody.appendChild(row);
    });
}

/* =========================================================
   FILTER / PAGINATION EVENTS
========================================================= */

filterForm.addEventListener("submit", function (event) {
    event.preventDefault();
    loadRegistrations(1);
});

clearFiltersButton.addEventListener("click", function () {
    searchFilter.value = "";
    competitionFilter.value = "";
    participantGroupFilter.value = "";
    countryFilter.value = "";
    stateFilter.value = "";

    if (reviewFilter) {
        reviewFilter.value = "";
    }

    loadRegistrations(1);
});

previousPageButton.addEventListener("click", function () {
    if (currentPage > 1) {
        loadRegistrations(currentPage - 1);
    }
});

nextPageButton.addEventListener("click", function () {
    if (currentPage < totalPages) {
        loadRegistrations(currentPage + 1);
    }
});

if (refreshAdminsButton) {
    refreshAdminsButton.addEventListener("click", function () {
        loadAdmins().catch(error => {
            console.error("Admin refresh error:", error);
            showDashboardStatus(error.message, true);
        });
    });
}

if (refreshAuditButton) {
    refreshAuditButton.addEventListener("click", function () {
        loadAuditLog().catch(error => {
            console.error("Audit refresh error:", error);
            showDashboardStatus(error.message, true);
        });
    });
}

/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;

    try {
        await adminFetch("/api/admin/logout", {
            method: "POST"
        });
    } catch (error) {
        console.warn("Logout request failed:", error);
    } finally {
        goToLogin();
    }
});

/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeDashboard() {
    try {
        const sessionValid = await loadSession();

        if (!sessionValid) {
            return;
        }

        await Promise.all([
            loadSummary(),
            loadFilterOptions()
        ]);

        if (isSuperAdmin) {
            await Promise.all([
                loadAdmins(),
                loadAuditLog()
            ]);
        }

        await loadRegistrations(1);
    } catch (error) {
        console.error("Dashboard initialization error:", error);
        showDashboardStatus(
            error instanceof Error ? error.message : "Unable to initialize the dashboard.",
            true
        );
    }
}

initializeDashboard();
