(() => {
    const api = ["localhost", "127.0.0.1"].includes(location.hostname) ? "http://127.0.0.1:8787" : "https://gitanushilanam-portal.panda2amrut.workers.dev";
    const storage = {
        read(key, fallback = null) { try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
        write(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Current-page operation still works. */ } },
        remove(key) { try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ } }
    };
    const sessionKey = "gitanushilanam-mentor-session";
    let token = storage.read(sessionKey, "");
    function session(value) { if (value !== undefined) { token = value; storage.write(sessionKey, value); } return token; }
    function status(element, text, error = false) { element.textContent = text; element.classList.toggle("is-error", error); }
    async function request(path, options = {}, authorization = "") {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(api + path, { ...options, headers: { ...options.headers, ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) }, signal: controller.signal });
            let result;
            try { result = await response.json(); } catch { throw new Error("The server returned an unexpected response. Please retry."); }
            if (!response.ok || !result.success) { const error = new Error(result.message || "Unable to complete this request."); error.status = response.status; throw error; }
            return result;
        } catch (error) {
            if (error.name === "AbortError") throw new Error("The request timed out. Please retry; saved attempts are retained.");
            throw error;
        } finally { clearTimeout(timer); }
    }
    function post(path, data, authorization) { return request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }, authorization); }
    async function hash(value) {
        const digest = await crypto.subtle.digest("SHA-256", typeof value === "string" ? new TextEncoder().encode(value) : value);
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    }
    function whatsapp(element, url) {
        if (/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(url || "")) { element.href = url; element.hidden = false; }
        else { element.removeAttribute("href"); element.hidden = true; }
    }
    function bindVerification(name, statusElement) {
        let value = "";
        window[name] = result => { value = result; status(statusElement, ""); };
        window[name + "Expired"] = () => { value = ""; status(statusElement, "Please complete security verification again."); };
        window[name + "Error"] = () => { value = ""; status(statusElement, "Security verification could not load. Please refresh and try again.", true); };
        return { get: () => value, reset() { value = ""; const element = document.querySelector(`[data-callback="${name}"]`); if (window.turnstile && element) { try { window.turnstile.reset(element); } catch { /* Widget may not yet be rendered. */ } } } };
    }
    async function download(path, file, authorization) {
        const response = await fetch(api + path, { headers: { Authorization: `Bearer ${authorization}` } });
        if (!response.ok) { let data = {}; try { data = await response.json(); } catch {} const error = new Error(data.message || "Download failed."); error.status = response.status; throw error; }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a"); link.href = url; link.download = file.original_filename;
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    function renderFiles(body, rows, onDownload, admin = false) {
        body.replaceChildren();
        if (!rows.length) { const cell = body.insertRow().insertCell(); cell.colSpan = admin ? 6 : 5; cell.textContent = "No uploads yet."; return; }
        for (const file of rows) {
            const row = body.insertRow();
            const date = new Date(file.uploaded_at);
            const values = [...(admin ? [`${file.school_name}\n${file.school_registration_id ? 'ID ' + file.school_registration_id : 'Earlier upload'}${file.mentor_name ? '\n' + file.mentor_name : ''}`] : []),
                file.original_filename, `${(file.file_size / 1024).toFixed(1)} KB`,
                Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date),
                file.uploaded_by_role === "super_admin" ? `Super Admin${admin ? ' #' + file.uploaded_by_id : ''}` : file.uploaded_by_role === "mentor" ? "Mentor" : "Earlier upload"];
            for (const value of values) row.insertCell().textContent = value;
            const button = document.createElement("button"); button.type = "button"; button.className = "button secondary"; button.textContent = "Download";
            button.addEventListener("click", async () => { button.disabled = true; try { await onDownload(file); } finally { button.disabled = false; } }); row.insertCell().append(button);
        }
    }
    function uploader(form, input, output, config) {
        let busy = false;
        const key = config.storageKey;
        let attempt = storage.read(key, {});
        input.addEventListener("change", () => status(output, ""));
        form.addEventListener("submit", async event => {
            event.preventDefault(); if (busy) return;
            const owner = config.owner(), file = input.files[0];
            if (!owner) { status(output, "Select a school / mentor first.", true); return; }
            if (!file || !/\.xlsx$/i.test(file.name) || file.size === 0 || file.size > 2000000) { status(output, "Choose a non-empty .xlsx workbook no larger than 2 MB.", true); return; }
            busy = true; const controls = [...form.querySelectorAll("input,button"), ...(config.controls || [])];
            controls.forEach(element => { element.disabled = true; }); status(output, "Uploading your workbook…");
            try {
                const fingerprint = JSON.stringify([owner.id, file.name, await hash(await file.arrayBuffer())]);
                if (attempt.fingerprint !== fingerprint || !attempt.requestId) attempt = { fingerprint, requestId: crypto.randomUUID() };
                storage.write(key, attempt);
                const body = new FormData(); body.set("request_id", attempt.requestId); body.set("file", file);
                await request(`${config.path}?mentor_id=${encodeURIComponent(owner.id)}`, { method: "POST", body }, config.token());
                input.value = ""; attempt = {}; storage.remove(key);
                status(output, "File received. Student registrations will be processed later.");
                await config.success();
            } catch (error) { status(output, `${error.message} Your selected file is retained for retry.`, true); config.error?.(error); }
            finally { busy = false; controls.forEach(element => { element.disabled = false; }); }
        });
    }
    window.MentorPortal = { api, storage, session, status, request, post, hash, whatsapp, bindVerification, download, renderFiles, uploader };
})();
