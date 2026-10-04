const ADMIN_API_BASE_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8787"
        : "https://gitanushilanam-portal.panda2amrut.workers.dev";

const ADMIN_SESSION_STORAGE_KEY = "gitanushilanam_admin_session";
const PAGE_SIZE = 30;

const adminIdentity = document.getElementById("adminIdentity");
const logoutButton = document.getElementById("logoutButton");
const filterForm = document.getElementById("filterForm");
const searchFilter = document.getElementById("searchFilter");
const competitionFilter = document.getElementById("competitionFilter");
const participantGroupFilter = document.getElementById("participantGroupFilter");
const countryFilter = document.getElementById("countryFilter");
const stateFilter = document.getElementById("stateFilter");
const clearFiltersButton = document.getElementById("clearFiltersButton");
const registrationsBody = document.getElementById("registrationsBody");
const resultCount = document.getElementById("resultCount");
const dashboardStatus = document.getElementById("dashboardStatus");
const previousPageButton = document.getElementById("previousPageButton");
const nextPageButton = document.getElementById("nextPageButton");
const pageIndicator = document.getElementById("pageIndicator");

const summaryElements = {
    total: document.getElementById("totalRegistrations"),
    quiz: document.getElementById("quizRegistrations"),
    shloka: document.getElementById("shlokaRegistrations"),
    animated: document.getElementById("animatedRegistrations"),
    treasure: document.getElementById("treasureRegistrations")
};

const participantGroupLabels = {
    sub_junior: "Sub-Junior (Class 3–5)",
    junior: "Junior (Class 6–8)",
    senior: "Senior (Class 9–12)",
    youth_adult: "Youth / Adult (College / Adult)"
};

let currentPage = 1;
let totalPages = 1;
let currentTotal = 0;

function goToLogin() {
    sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    window.location.replace("admin-login.html");
}

function showDashboardStatus(message, isError = false) {
    dashboardStatus.textContent = message;
    dashboardStatus.classList.toggle("is-visible", Boolean(message));
    dashboardStatus.classList.toggle("is-error", isError);
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

    adminIdentity.textContent = result.admin.name
        ? `${result.admin.name} · ${result.admin.email}`
        : result.admin.email;

    return true;
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
}

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

function renderCompetitionBadges(registration) {
    const wrapper = document.createElement("div");
    wrapper.className = "competition-badges";

    const competitions = [
        ["bhagavad_gita_quiz", "Quiz"],
        ["shloka_recitation", "Shloka"],
        ["animated_bg_video", "Animated"],
        ["treasure_hunt", "Treasure Hunt"]
    ];

    competitions.forEach(([key, label]) => {
        if (Number(registration[key]) === 1) {
            wrapper.appendChild(createTextElement("span", label, "competition-badge"));
        }
    });

    if (!wrapper.children.length) {
        wrapper.appendChild(createTextElement("span", "None", "muted-cell"));
    }

    return wrapper;
}

function renderRegistrations(registrations) {
    registrationsBody.innerHTML = "";

    if (!registrations.length) {
        const row = document.createElement("tr");
        row.className = "empty-row";

        const cell = document.createElement("td");
        cell.colSpan = 10;
        cell.textContent = "No registrations match the selected filters.";

        row.appendChild(cell);
        registrationsBody.appendChild(row);
        return;
    }

    registrations.forEach(registration => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.className = "primary-cell";
        nameCell.appendChild(createTextElement("strong", registration.name));
        nameCell.appendChild(createTextElement("small", registration.email, "muted-cell"));
        row.appendChild(nameCell);

        const contactCell = document.createElement("td");
        const contactStack = document.createElement("div");
        contactStack.className = "contact-stack";
        contactStack.appendChild(createTextElement("span", registration.phone));
        contactStack.appendChild(createTextElement("small", `WhatsApp: ${registration.whatsapp}`));
        contactCell.appendChild(contactStack);
        row.appendChild(contactCell);

        row.appendChild(createTextElement("td", String(registration.age)));

        const participantGroupLabel = participantGroupLabels[registration.participant_group] || "-";
        row.appendChild(createTextElement("td", participantGroupLabel));

        row.appendChild(createTextElement("td", registration.gender || "-"));
        row.appendChild(createTextElement("td", registration.institution_organization || "-"));

        const locationCell = document.createElement("td");
        const locationStack = document.createElement("div");
        locationStack.className = "location-stack";
        locationStack.appendChild(createTextElement("span", `${registration.city}, ${registration.state}`));
        locationStack.appendChild(createTextElement("small", registration.country));
        locationCell.appendChild(locationStack);
        row.appendChild(locationCell);

        const competitionCell = document.createElement("td");
        competitionCell.appendChild(renderCompetitionBadges(registration));
        row.appendChild(competitionCell);

        row.appendChild(createTextElement("td", registration.heard_from || "-"));
        row.appendChild(createTextElement("td", formatRegistrationDate(registration.created_at)));
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

    return params.toString();
}

async function loadRegistrations(page = 1) {
    showDashboardStatus("Loading registrations...");

    try {
        const response = await adminFetch(`/admin/api/registrations?${buildRegistrationQuery(page)}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load registrations.");
        }

        currentPage = result.page;
        totalPages = result.total_pages;
        currentTotal = result.total;

        renderRegistrations(result.registrations);

        const firstResult = currentTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
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
