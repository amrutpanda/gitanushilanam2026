(() => {
    const api = ["127.0.0.1", "localhost"].includes(location.hostname)
        ? "http://127.0.0.1:8787" : "https://gitanushilanam-portal.panda2amrut.workers.dev";
    const sessionKey = "gitanushilanam_admin_session";
    const login = document.getElementById("reviewLogin");
    const content = document.getElementById("reviewContent");
    const loginForm = document.getElementById("reviewLoginForm");
    const loginStatus = document.getElementById("reviewLoginStatus");
    const loginButton = document.getElementById("reviewLoginButton");
    const status = document.getElementById("reviewStatus");
    const body = document.getElementById("uploadsBody");
    const search = document.getElementById("schoolSearch");
    const previous = document.getElementById("previousUploads");
    const next = document.getElementById("nextUploads");
    let session = "";
    try { session = sessionStorage.getItem(sessionKey) || ""; } catch { /* Use memory if storage is unavailable. */ }
    let token = "";
    let page = 1;
    let pages = 1;
    let sequence = 0;
    let loginBusy = false;

    function setSession(value) {
        session = value;
        try { if (value) sessionStorage.setItem(sessionKey, value); else sessionStorage.removeItem(sessionKey); }
        catch { /* The current page remains usable without storage. */ }
    }
    function requireLogin(message = "") {
        sequence++;
        setSession("");
        body.replaceChildren();
        body.removeAttribute("aria-busy");
        document.getElementById("totalUploads").textContent = "0";
        document.getElementById("matchingUploads").textContent = "0";
        content.hidden = true;
        login.hidden = false;
        loginStatus.textContent = message;
        loginStatus.classList.toggle("is-error", Boolean(message));
    }
    function resetVerification() { token = ""; if (window.turnstile) window.turnstile.reset(); }
    window.onQuizReviewVerified = value => { token = value; };
    window.onQuizReviewExpired = () => { token = ""; loginStatus.textContent = "Please complete the security verification again."; };
    window.onQuizReviewError = () => { token = ""; loginStatus.textContent = "Security verification could not load. Please refresh and try again."; };

    async function authorizedFetch(path, options = {}) {
        const response = await fetch(`${api}${path}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${session}` } });
        if (response.status === 401 || response.status === 403) {
            requireLogin(response.status === 403 ? "This account does not have permission to review school uploads." : "Your session has expired. Please sign in again.");
            throw new Error("Please sign in with an authorized account.");
        }
        return response;
    }

    async function download(row, button) {
        button.disabled = true;
        status.classList.remove("is-error");
        status.textContent = "Preparing download…";
        try {
            const response = await authorizedFetch(`/api/school-quiz/uploads/download?key=${encodeURIComponent(row.file_key)}`);
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Unable to download this file.");
            }
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = row.original_filename;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            status.textContent = "Download started.";
        } catch (error) {
            status.textContent = error.message || "Download failed. Please retry.";
            status.classList.add("is-error");
        } finally { button.disabled = false; }
    }

    function renderRows(rows) {
        body.replaceChildren();
        if (!rows.length) {
            const row = body.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = "No uploads found.";
            return;
        }
        for (const upload of rows) {
            const row = body.insertRow();
            const date = new Date(upload.uploaded_at);
            const values = [upload.school_name, upload.original_filename,
                `${(upload.file_size / 1024).toFixed(1)} KB`,
                Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata"
                }).format(date)];
            for (const value of values) row.insertCell().textContent = value;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button secondary";
            button.textContent = "Download";
            button.setAttribute("aria-label", `Download ${upload.original_filename} from ${upload.school_name}`);
            button.addEventListener("click", () => download(upload, button));
            row.insertCell().append(button);
        }
    }

    async function loadPage(requestedPage = 1) {
        if (!session) { requireLogin(); return; }
        const current = ++sequence;
        previous.disabled = next.disabled = true;
        status.classList.remove("is-error");
        status.textContent = "Loading uploads…";
        body.setAttribute("aria-busy", "true");
        try {
            const params = new URLSearchParams({ school: search.value.trim(), page: String(requestedPage) });
            const response = await authorizedFetch(`/api/school-quiz/uploads?${params}`);
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Unable to load uploads.");
            if (current !== sequence) return;
            login.hidden = true;
            content.hidden = false;
            page = result.page;
            pages = result.total_pages;
            document.getElementById("totalUploads").textContent = Number(result.total_uploads).toLocaleString("en-IN");
            document.getElementById("matchingUploads").textContent = Number(result.matching_uploads).toLocaleString("en-IN");
            document.getElementById("uploadsPage").textContent = `Page ${page} of ${pages}`;
            renderRows(result.uploads);
            status.textContent = "";
        } catch (error) {
            if (current === sequence) {
                status.textContent = error.message || "Unable to load uploads. Please retry.";
                status.classList.add("is-error");
                if (content.hidden) { loginStatus.textContent = status.textContent; loginStatus.classList.add("is-error"); }
            }
        } finally {
            if (current === sequence) {
                body.removeAttribute("aria-busy");
                previous.disabled = page <= 1;
                next.disabled = page >= pages;
            }
        }
    }

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (loginBusy) return;
        if (!token) { loginStatus.textContent = "Please complete the security verification."; return; }
        loginBusy = true;
        loginButton.disabled = true;
        loginStatus.classList.remove("is-error");
        loginStatus.textContent = "Signing in…";
        try {
            const response = await fetch(`${api}/api/admin/login`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: document.getElementById("reviewEmail").value.trim(), password: document.getElementById("reviewPassword").value, turnstile_token: token })
            });
            const result = await response.json();
            if (!response.ok || !result.success || typeof result.session_token !== "string" || !result.session_token) {
                throw new Error(result.message || "Unable to sign in.");
            }
            setSession(result.session_token);
            document.getElementById("reviewPassword").value = "";
            await loadPage(1);
        } catch (error) {
            loginStatus.textContent = error.message || "Unable to sign in.";
            loginStatus.classList.add("is-error");
        } finally { loginBusy = false; loginButton.disabled = false; resetVerification(); }
    });
    document.getElementById("schoolSearchForm").addEventListener("submit", event => { event.preventDefault(); loadPage(1); });
    document.getElementById("clearSchoolSearch").addEventListener("click", () => { search.value = ""; loadPage(1); });
    previous.addEventListener("click", () => loadPage(page - 1));
    next.addEventListener("click", () => loadPage(page + 1));
    document.getElementById("reviewLogout").addEventListener("click", async () => {
        const oldSession = session;
        requireLogin("Signed out.");
        try { await fetch(`${api}/api/admin/logout`, { method: "POST", headers: { Authorization: `Bearer ${oldSession}` } }); }
        catch { loginStatus.textContent = "Signed out on this page. The server session will expire automatically."; }
        resetVerification();
    });
    if (session) loadPage(1);
})();
