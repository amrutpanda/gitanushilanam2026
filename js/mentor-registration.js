(() => {
    const P = window.MentorPortal, $ = id => document.getElementById(id);
    const form = $("mentorRegistrationForm"), loginForm = $("mentorLoginForm");
    const registration = P.bindVerification("onMentorRegisterVerified", $("registerVerification"));
    const login = P.bindVerification("onMentorLoginVerified", $("loginVerification"));
    const key = "gitanushilanam-mentor-registration";
    let attempt = P.storage.read(key, {}), busy = false, loginBusy = false, completed = false;
    const names = ["name", "school_name", "email", "designation", "phone", "total_strength", "willing_count", "state", "district", "place", "school_registration_id"];
    for (const name of names) if (name !== "district" && typeof attempt.fields?.[name] === "string") $(name).value = attempt.fields[name];
    function fieldValue(name) { return name === "district" && $("district").value === "__other__" ? $("districtManual").value : $(name).value; }
    function saveDraft() { attempt.fields = Object.fromEntries(names.map(name => [name, fieldValue(name)])); P.storage.write(key, attempt); }
    let districts = {}, districtsReady = false;
    const restoredDistrict = attempt.fields?.district || "", restoredState = attempt.fields?.state || "";
    function districtManual() {
        const manual = $("district").value === "__other__";
        $("districtManual").hidden = $("districtManualLabel").hidden = !manual;
        $("districtManual").disabled = !manual; $("districtManual").required = manual;
    }
    function districtOptions(value = "") {
        const state = $("state").value, options = districts[state] || [];
        $("district").replaceChildren();
        const first = document.createElement("option"); first.value = ""; first.textContent = state ? "Select district" : "Select state first"; $("district").append(first);
        for (const name of options) { const option = document.createElement("option"); option.value = name; option.textContent = name; $("district").append(option); }
        if (state) { const other = document.createElement("option"); other.value = "__other__"; other.textContent = "Other / enter manually"; $("district").append(other); }
        $("district").disabled = !state || busy;
        $("districtManual").value = "";
        if (state && value) { $("district").value = options.includes(value) ? value : "__other__"; if (!options.includes(value)) $("districtManual").value = value; }
        else if (state && districtsReady && !options.length) $("district").value = "__other__";
        districtManual();
        if (busy) $("districtManual").disabled = true;
    }
    form.addEventListener("input", saveDraft);
    $("district").addEventListener("change", () => { districtManual(); saveDraft(); });
    $("state").addEventListener("change", () => { districtOptions(); saveDraft(); });
    (async () => {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch("data/india-districts.json?v=20261124mentor1", { signal: controller.signal });
            if (!response.ok) throw new Error("District list unavailable");
            districts = await response.json();
            if (!districts || typeof districts !== "object" || Array.isArray(districts)) throw new Error("Invalid districts");
        } catch {
            districts = {}; $("districtHelp").textContent = "The district list could not load. Please enter your district manually.";
        } finally { clearTimeout(timer); districtsReady = true; districtOptions(fieldValue("district") || ($("state").value === restoredState ? restoredDistrict : "")); }
    })();
    function view() {
        const showLogin = location.hash === "#login";
        $("loginPanel").hidden = !showLogin; $("registrationPanel").hidden = showLogin || completed;
        $("registrationReceipt").hidden = showLogin || !completed;
        $("openLogin").hidden = showLogin;
        if (showLogin) { $("loginPanel").scrollIntoView({ block: "start" }); $("loginEmail").focus(); }
    }
    window.addEventListener("hashchange", view); view();
    function counts() { $("willing_count").max = $("total_strength").value || "10000000"; }
    $("total_strength").addEventListener("input", counts); counts();
    form.addEventListener("submit", async event => {
        event.preventDefault(); if (busy) return;
        if (!registration.get()) { P.status($("registerStatus"), "Please complete security verification.", true); return; }
        const data = Object.fromEntries(names.map(name => [name, fieldValue(name).trim()]));
        data.total_strength = Number(data.total_strength); data.willing_count = Number(data.willing_count);
        data.school_registration_id = data.school_registration_id ? Number(data.school_registration_id) : null;
        if (data.willing_count > data.total_strength) { P.status($("registerStatus"), "Willing participants cannot exceed school strength.", true); return; }
        busy = true; const controls = [...form.querySelectorAll("input,select,button")]; controls.forEach(e => { e.disabled = true; });
        P.status($("registerStatus"), "Saving mentor registration…");
        try {
            const fingerprint = await P.hash(JSON.stringify(data));
            if (attempt.fingerprint !== fingerprint || !attempt.requestId) { attempt.fingerprint = fingerprint; attempt.requestId = crypto.randomUUID(); }
            P.storage.write(key, attempt);
            const result = await P.post("/api/mentors/register", { ...data, request_id: attempt.requestId, turnstile_token: registration.get() });
            completed = true;
            $("receiptId").textContent = result.school_registration_id;
            $("receiptSchool").textContent = result.school_name;
            $("receiptCredentials").textContent = `Remember your login: ${result.login_details.email} · ${result.login_details.phone}`;
            $("receiptEmail").textContent = result.email_sent ? "A confirmation email has been sent to your school email address." : "Your registration is saved. Confirmation email is pending; you can still log in and join the WhatsApp group.";
            P.whatsapp($("receiptWhatsApp"), result.whatsapp_group);
            $("loginEmail").value = result.login_details.email; $("loginPhone").value = result.login_details.phone.replace(/^\+91/, "");
            P.storage.remove(key); attempt = {}; view(); $("registrationReceipt").focus();
        } catch (error) { P.status($("registerStatus"), error.message, true); }
        finally { busy = false; controls.forEach(e => { e.disabled = false; }); $("district").disabled = !$("state").value; districtManual(); registration.reset(); }
    });
    loginForm.addEventListener("submit", async event => {
        event.preventDefault(); if (loginBusy) return;
        if (!login.get()) { P.status($("loginStatus"), "Please complete security verification.", true); return; }
        loginBusy = true; const button = loginForm.querySelector("button"); button.disabled = true; P.status($("loginStatus"), "Signing in…");
        try {
            const result = await P.post("/api/mentors/login", { email: $("loginEmail").value.trim(), phone: $("loginPhone").value.trim(), turnstile_token: login.get() });
            P.session(result.session_token); location.assign("mentor-dashboard.html");
        } catch (error) { P.status($("loginStatus"), error.message, true); }
        finally { loginBusy = false; button.disabled = false; login.reset(); }
    });
})();
