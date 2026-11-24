(() => {
    const P = window.MentorPortal, $ = id => document.getElementById(id);
    let mentors = [], selected = null, page = 1, pages = 1, sequence = 0;
    function expired(error) {
        if (error.status === 401) { P.session(""); $("mentorDashboard").hidden = true; location.replace("mentor-registration.html#login"); }
    }
    async function history(next = 1) {
        if (!selected) return;
        const current = ++sequence, owner = selected.id;
        $("previousUploads").disabled = $("nextUploads").disabled = true;
        P.status($("historyStatus"), "Loading uploads…");
        try {
            const result = await P.request(`/api/mentors/uploads?mentor_id=${owner}&page=${next}`, {}, P.session());
            if (current !== sequence) return;
            page = result.page; pages = result.total_pages;
            $("uploadCount").textContent = `${result.total_uploads} uploaded workbook${result.total_uploads === 1 ? '' : 's'}`;
            $("uploadPage").textContent = `Page ${page} of ${pages}`;
            P.renderFiles($("mentorUploads"), result.uploads, async file => {
                try { await P.download(`/api/mentors/uploads/download?mentor_id=${owner}&key=${encodeURIComponent(file.file_key)}`, file, P.session()); P.status($("historyStatus"), "Download started."); }
                catch (error) { P.status($("historyStatus"), error.message, true); expired(error); }
            });
            P.status($("historyStatus"), "");
        } catch (error) { if (current === sequence) { P.status($("historyStatus"), error.message, true); expired(error); } }
        finally { if (current === sequence) { $("previousUploads").disabled = page <= 1; $("nextUploads").disabled = page >= pages; } }
    }
    function select() {
        selected = mentors.find(mentor => mentor.id === $("mentorSchool").value) || mentors[0];
        if (!selected) return;
        P.storage.write("mentor-selected-school", selected.id);
        $("schoolId").textContent = selected.school_id; $("schoolTitle").textContent = selected.school_name;
        $("schoolLocation").textContent = `${selected.place}, ${selected.district}, ${selected.state}`;
        $("mentorIdentity").textContent = `${selected.name} · ${selected.designation} · ${selected.email} · ${selected.phone}`;
        $("schoolCounts").textContent = `School strength: ${selected.total_strength} · Willing participants: ${selected.willing_count}`;
        $("mentorWorkbook").value = ""; $("mentorUploads").replaceChildren(); P.status($("mentorUploadStatus"), ""); history();
    }
    $("mentorSchool").addEventListener("change", select);
    $("previousUploads").addEventListener("click", () => history(page - 1));
    $("nextUploads").addEventListener("click", () => history(page + 1));
    $("refreshUploads").addEventListener("click", () => history(page));
    P.uploader($("mentorUploadForm"), $("mentorWorkbook"), $("mentorUploadStatus"), { storageKey: "mentor-workbook-attempt", path: "/api/mentors/uploads",
        owner: () => selected, token: P.session, controls: [$("mentorSchool"), $("mentorLogout")], success: () => history(1), error: expired });
    $("mentorLogout").addEventListener("click", async () => {
        $("mentorLogout").disabled = true;
        try { await P.request("/api/mentors/logout", { method: "POST" }, P.session()); }
        catch { /* Clear this page's credentials even if the server is unreachable. */ }
        finally { P.session(""); P.storage.remove("mentor-selected-school"); location.replace("mentor-registration.html#login"); }
    });
    (async () => {
        if (!P.session()) { location.replace("mentor-registration.html#login"); return; }
        try {
            const result = await P.request("/api/mentors/session", {}, P.session()); mentors = result.mentors;
            if (!mentors.length) { P.session(""); location.replace("mentor-registration.html#login"); return; }
            $("mentorSchool").replaceChildren(...mentors.map(mentor => { const option = document.createElement("option"); option.value = mentor.id; option.textContent = `${mentor.school_id} · ${mentor.school_name}`; return option; }));
            const previous = P.storage.read("mentor-selected-school"); if (mentors.some(m => m.id === previous)) $("mentorSchool").value = previous;
            $("schoolChoice").hidden = mentors.length < 2; P.whatsapp($("dashboardWhatsApp"), result.whatsapp_group);
            $("mentorDashboard").hidden = false; P.status($("dashboardStatus"), ""); select();
        } catch (error) { P.status($("dashboardStatus"), `${error.message} Refresh this page to retry.`, true); expired(error); }
    })();
})();
