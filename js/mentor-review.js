(() => {
    const P = window.MentorPortal, $ = id => document.getElementById(id);
    // Share the established Super Admin login, but keep the review outside the admin dashboard.
    const key = "gitanushilanam_admin_session";
    let token = ""; try { token = sessionStorage.getItem(key) || ""; } catch {}
    let mentorPage = 1, mentorPages = 1, filePage = 1, filePages = 1, mentorSequence = 0, fileSequence = 0, selected = null, busy = false;
    const verification = P.bindVerification("onMentorAdminVerified", $("reviewVerification"));
    const resendKeys = P.storage.read("mentor-confirmation-attempts", {});
    function setToken(value) { token = value; try { if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key); } catch {} }
    function signIn(message = "") {
        mentorSequence++; fileSequence++; setToken(""); selected = null;
        $("reviewLogin").hidden = false; $("reviewContent").hidden = true; $("adminUploadPanel").hidden = true;
        $("mentorsBody").replaceChildren(); $("filesBody").replaceChildren(); $("adminUploadTarget").textContent = "";
        $("adminWorkbook").value = ""; $("storageUsage").textContent = "";
        for (const id of ["totalSchools", "totalMentors", "totalUploads"]) $(id).textContent = "0";
        P.status($("reviewLoginStatus"), message, Boolean(message));
    }
    function failed(error, output) { P.status(output, error.message, true); if (error.status === 401 || error.status === 403) signIn("Please sign in with an active Super Admin account."); }
    async function mentors(next = 1) {
        const current = ++mentorSequence;
        $("previousMentors").disabled = $("nextMentors").disabled = true; P.status($("mentorReviewStatus"), "Loading mentors…");
        try {
            const result = await P.request(`/api/mentor-admin/mentors?search=${encodeURIComponent($("mentorSearch").value.trim())}&page=${next}`, {}, token);
            if (current !== mentorSequence) return;
            mentorPage = result.page; mentorPages = result.total_pages;
            $("totalSchools").textContent = result.total_schools; $("totalMentors").textContent = result.total_mentors;
            $("mentorPage").textContent = `Page ${mentorPage} of ${mentorPages}`;
            $("mentorsBody").replaceChildren();
            if (!result.mentors.length) { const cell = $("mentorsBody").insertRow().insertCell(); cell.colSpan = 6; cell.textContent = "No matching mentors."; }
            for (const mentor of result.mentors) {
                const row = $("mentorsBody").insertRow();
                for (const value of [`${mentor.school_id}\n${mentor.school_name}`, `${mentor.name}\n${mentor.designation}`, `${mentor.email}\n${mentor.phone}`,
                    `${mentor.total_strength} / ${mentor.willing_count}`, `${mentor.place}\n${mentor.district}\n${mentor.state}`]) row.insertCell().textContent = value;
                const cell = row.insertCell();
                const upload = document.createElement("button"); upload.type = "button"; upload.className = "button secondary"; upload.textContent = "Upload for mentor";
                upload.addEventListener("click", () => {
                    if ($("adminUploadForm").querySelector("button").disabled) return;
                    selected = mentor; $("adminUploadTarget").textContent = `ID ${mentor.school_id} · ${mentor.school_name}\n${mentor.name} · ${mentor.email} · ${mentor.phone}`;
                    $("adminWorkbook").value = ""; P.status($("adminUploadStatus"), ""); $("adminUploadPanel").hidden = false; $("adminUploadPanel").focus();
                });
                const resend = document.createElement("button"); resend.type = "button"; resend.className = "button quiet"; resend.textContent = mentor.email_sent_at ? "Resend confirmation" : "Send confirmation";
                resend.addEventListener("click", async () => {
                    resend.disabled = true;
                    if (!resendKeys[mentor.id]) resendKeys[mentor.id] = crypto.randomUUID(); P.storage.write("mentor-confirmation-attempts", resendKeys);
                    try { await P.post("/api/mentor-admin/confirmation", { mentor_id: mentor.id, request_id: resendKeys[mentor.id] }, token);
                        delete resendKeys[mentor.id]; P.storage.write("mentor-confirmation-attempts", resendKeys); P.status($("mentorReviewStatus"), `Confirmation email sent to ${mentor.email}.`); }
                    catch (error) { failed(error, $("mentorReviewStatus")); }
                    finally { resend.disabled = false; }
                }); cell.append(upload, resend);
            }
            P.status($("mentorReviewStatus"), `${result.matching_mentors} matching mentor${result.matching_mentors === 1 ? '' : 's'}.`);
        } catch (error) { if (current === mentorSequence) failed(error, $("mentorReviewStatus")); }
        finally { if (current === mentorSequence) { $("previousMentors").disabled = mentorPage <= 1; $("nextMentors").disabled = mentorPage >= mentorPages; } }
    }
    async function files(next = 1) {
        const current = ++fileSequence;
        $("previousFiles").disabled = $("nextFiles").disabled = true; P.status($("fileReviewStatus"), "Loading workbooks…");
        try {
            const result = await P.request(`/api/mentor-admin/uploads?school=${encodeURIComponent($("fileSearch").value.trim())}&page=${next}`, {}, token);
            if (current !== fileSequence) return;
            filePage = result.page; filePages = result.total_pages; $("totalUploads").textContent = result.total_uploads;
            $("storageUsage").textContent = `${(result.storage_used_bytes / 1000000).toFixed(2)} MB of ${(result.storage_limit_bytes / 1000000).toFixed(0)} MB collection capacity used.`;
            $("filePage").textContent = `Page ${filePage} of ${filePages}`;
            P.renderFiles($("filesBody"), result.uploads, async file => {
                try { await P.download(`/api/mentor-admin/uploads/download?key=${encodeURIComponent(file.file_key)}`, file, token); P.status($("fileReviewStatus"), "Download started."); }
                catch (error) { failed(error, $("fileReviewStatus")); }
            }, true); P.status($("fileReviewStatus"), `${result.matching_uploads} matching files.`);
        } catch (error) { if (current === fileSequence) failed(error, $("fileReviewStatus")); }
        finally { if (current === fileSequence) { $("previousFiles").disabled = filePage <= 1; $("nextFiles").disabled = filePage >= filePages; } }
    }
    function load() { $("reviewLogin").hidden = true; $("reviewContent").hidden = false; mentors(); files(); }
    $("reviewLoginForm").addEventListener("submit", async event => {
        event.preventDefault(); if (busy) return;
        if (!verification.get()) { P.status($("reviewLoginStatus"), "Please complete security verification.", true); return; }
        busy = true; const button = $("reviewLoginForm").querySelector("button"); button.disabled = true;
        try { const result = await P.post("/api/admin/login", { email: $("reviewEmail").value.trim(), password: $("reviewPassword").value, turnstile_token: verification.get() });
            setToken(result.session_token); $("reviewPassword").value = ""; load(); }
        catch (error) { P.status($("reviewLoginStatus"), error.message, true); }
        finally { busy = false; button.disabled = false; verification.reset(); }
    });
    $("mentorSearchForm").addEventListener("submit", e => { e.preventDefault(); mentors(); });
    $("fileSearchForm").addEventListener("submit", e => { e.preventDefault(); files(); });
    $("clearMentorSearch").addEventListener("click", () => { $("mentorSearch").value = ""; mentors(); });
    $("clearFileSearch").addEventListener("click", () => { $("fileSearch").value = ""; files(); });
    $("previousMentors").addEventListener("click", () => mentors(mentorPage - 1)); $("nextMentors").addEventListener("click", () => mentors(mentorPage + 1));
    $("previousFiles").addEventListener("click", () => files(filePage - 1)); $("nextFiles").addEventListener("click", () => files(filePage + 1));
    $("cancelAdminUpload").addEventListener("click", () => { selected = null; $("adminUploadPanel").hidden = true; $("adminWorkbook").value = ""; });
    P.uploader($("adminUploadForm"), $("adminWorkbook"), $("adminUploadStatus"), { storageKey: "mentor-admin-workbook-attempt", path: "/api/mentor-admin/uploads",
        owner: () => selected, token: () => token, controls: [$("cancelAdminUpload"), $("reviewLogout")], success: () => files(1), error: e => failed(e, $("adminUploadStatus")) });
    $("reviewLogout").addEventListener("click", async () => { try { await P.request("/api/admin/logout", { method: "POST" }, token); } catch {} finally { signIn(); } });
    if (token) load();
})();
