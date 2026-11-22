(() => {
    const schoolField = document.getElementById("institutionOrganization");
    const emailField = document.getElementById("email");
    const storageKey = "gitanushilanam-institute-registration";
    let state = {};
    try { state = JSON.parse(sessionStorage.getItem(storageKey) || "{}") || {}; }
    catch { /* The form also works when browser storage is unavailable. */ }
    if (typeof state !== "object" || Array.isArray(state)) state = {};

    function saveState() {
        try { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
        catch { /* Keep the state in memory for this page. */ }
    }
    function rememberSchool() {
        state.school = schoolField.value.trim();
        state.email = emailField.value.trim().toLowerCase();
        saveState();
    }
    function restoreSchool() {
        schoolField.value = typeof state.school === "string" ? state.school : "";
        emailField.value = typeof state.email === "string" ? state.email : "";
    }
    schoolField.addEventListener("input", rememberSchool);
    emailField.addEventListener("input", rememberSchool);
    restoreSchool();

    window.instituteRegistration = {
        endpoint: "/api/institute/register",
        lastSubmission: null,
        rememberSchool,
        restoreSchool,
        async prepare(data) {
            rememberSchool();
            const payload = { ...data, email: data.email.trim().toLowerCase(), competitions: ["bhagavad_gita_quiz"] };
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
            const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
            if (state.hash !== hash || !state.requestId) {
                state.hash = hash;
                state.requestId = crypto.randomUUID();
                saveState();
            }
            // Persist only the school and an opaque retry key/hash, never the student fields.
            return { ...payload, request_id: state.requestId };
        },
        showResult(result, data) {
            this.lastSubmission = { ...data };
            const email = result.login_details?.email || data.email;
            const phone = result.login_details?.phone || data.phone;
            document.getElementById("instituteLoginReminder").textContent =
                `Remember these details for the student’s exam login:\nEmail: ${email}\nPhone: ${phone}\nPlease share them with the student or parent.`;
            document.getElementById("retryInstituteEmail").hidden = result.email_sent === true;
        }
    };
})();
