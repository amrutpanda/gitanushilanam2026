(() => {
    const api = ["127.0.0.1", "localhost"].includes(location.hostname)
        ? "http://127.0.0.1:8787" : "https://gitanushilanam-portal.panda2amrut.workers.dev";
    const form = document.getElementById("schoolUploadForm");
    const school = document.getElementById("schoolName");
    const workbook = document.getElementById("workbook");
    const button = document.getElementById("uploadButton");
    const status = document.getElementById("uploadStatus");
    const verification = document.getElementById("verificationStatus");
    const receipt = document.getElementById("uploadReceipt");
    const storageKey = "gitanushilanam-school-quiz-upload";
    let token = "";
    let busy = false;
    let state = {};
    try {
        const stored = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
        if (stored && typeof stored === "object" && !Array.isArray(stored)) state = stored;
    } catch { /* Uploading also works without browser storage. */ }
    school.value = typeof state.school === "string" ? state.school : "";

    function persist() {
        try { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
        catch { /* Preserve the current attempt in memory. */ }
    }
    function show(message, error = false) {
        status.textContent = message;
        status.classList.toggle("is-error", error);
    }
    function resetVerification() {
        token = "";
        if (window.turnstile) window.turnstile.reset();
    }
    window.onQuizUploadVerified = value => { token = value; verification.textContent = ""; };
    window.onQuizUploadExpired = () => { token = ""; verification.textContent = "Please complete the security verification again."; };
    window.onQuizUploadError = () => { token = ""; verification.textContent = "Security verification could not load. Please refresh and try again."; };
    school.addEventListener("input", () => { state.school = school.value; persist(); });
    workbook.addEventListener("change", () => { receipt.hidden = true; show(""); });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (busy) return;
        const name = school.value.trim();
        const file = workbook.files[0];
        if (!name) { show("Please enter your school name.", true); school.focus(); return; }
        if (!file || !/\.xlsx$/i.test(file.name) || file.size === 0 || file.size > 2_000_000) {
            show("Please choose a non-empty Excel .xlsx file no larger than 2 MB (2,000,000 bytes).", true); return;
        }
        if (!token) { show("Please complete the security verification before uploading.", true); return; }
        busy = true;
        button.disabled = school.disabled = workbook.disabled = true;
        receipt.hidden = true;
        show("Uploading your file. Please keep this page open…");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
            // Hash raw bytes only. Excel contents are not read or parsed.
            const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
            const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
            const fingerprint = JSON.stringify([name, file.name, hash]);
            if (state.fingerprint !== fingerprint || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(state.requestId || "")) {
                state.requestId = crypto.randomUUID();
                state.fingerprint = fingerprint;
            }
            state.school = name;
            persist();
            const body = new FormData();
            body.append("school_name", name);
            body.append("file", file);
            body.append("request_id", state.requestId);
            body.append("turnstile_token", token);
            const response = await fetch(`${api}/api/school-quiz/uploads`, { method: "POST", body, signal: controller.signal });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Upload failed. Please retry.");
            document.getElementById("receiptDetails").textContent = `${result.school_name} · ${result.original_filename}`;
            receipt.hidden = false;
            workbook.value = "";
            delete state.requestId;
            delete state.fingerprint;
            persist();
            show("File received. Student registrations will be processed later.");
        } catch (error) {
            show(error.name === "AbortError"
                ? "The upload timed out. Complete security verification and retry the same file; a saved upload will not be duplicated."
                : `${error.message || "The upload could not be completed."} Your selected file is retained. Complete security verification before retrying.`, true);
        } finally {
            clearTimeout(timeout);
            busy = false;
            button.disabled = school.disabled = workbook.disabled = false;
            resetVerification();
        }
    });
})();
