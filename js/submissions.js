(() => {
    const $ = id => document.getElementById(id), active = document.body.dataset.competition;
    const api = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:8787' : 'https://gitanushilanam-portal.panda2amrut.workers.dev';
    const sessionKey = 'gitanushilanam-participant-submission-session';
    const storage = {
        read(key, fallback = null) { try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
        write(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {} },
        remove(key) { try { sessionStorage.removeItem(key); } catch {} }
    };
    let token = storage.read(sessionKey, ''), verification = '', state = null, selected = null, draft = null;
    let busy = false, loading = false, loginBusy = false, clockOffset = 0;
    function status(id, text, error = false) { $(id).textContent = text; $(id).classList.toggle('is-error', error); }
    function formatTime(value) { return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)) + ' IST' : ''; }
    function draftKey() { return `gitanushilanam-submission-draft:${state.participant.id}:${active}`; }
    function closed() { return selected && (selected.closed || Date.now() + clockOffset >= Date.parse(selected.deadline) + 1000); }
    function controls() {
        $('videoLink').disabled = busy || closed(); $('saveSubmission').disabled = busy || closed();
        $('removeSubmission').disabled = busy || closed(); $('reloadSubmission').disabled = busy || loading;
        $('submissionLogout').disabled = busy;
        if (selected) $('submissionDeadline').textContent = `${closed() ? 'Submissions closed' : 'Closes'}: ${formatTime(selected.deadline)}. ${closed() ? 'Your saved entry remains available to view.' : 'You can save, replace or remove your link until then.'}`;
    }
    function signOut(message = '') {
        token = ''; storage.remove(sessionKey); state = selected = draft = null;
        $('submissionAccount').hidden = true; $('submissionEditor').hidden = true; $('submissionLogin').hidden = false;
        $('competitionCards').replaceChildren(); $('participantName').textContent = $('participantContact').textContent = '';
        $('videoLink').value = ''; $('savedSubmissionLink').removeAttribute('href'); $('savedSubmissionLink').hidden = true;
        $('savedSubmissionStatus').textContent = $('savedSubmissionTime').textContent = '';
        $('submissionLogout').disabled = false; $('retrySubmissionLoad').hidden = true; status('submissionPageStatus', ''); status('submissionLoginStatus', message, Boolean(message));
    }
    async function request(path, options = {}, authenticated = true) {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch(api + path, { ...options, signal: controller.signal, headers: { ...options.headers, ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) } });
            let result; try { result = await response.json(); } catch { throw new Error('The server returned an unexpected response. Please retry.'); }
            if (!response.ok || !result.success) {
                const error = new Error(result.message || 'Unable to complete the request.'); error.status = response.status;
                if (authenticated && response.status === 401) signOut('Your session expired. Log in again to continue.');
                throw error;
            }
            return result;
        } catch (error) { if (error.name === 'AbortError') throw new Error('The request timed out. Retry the same save to check whether it was received.'); throw error; }
        finally { clearTimeout(timer); }
    }
    function post(path, body, authenticated = true) { return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, authenticated); }
    window.onSubmissionLoginVerified = value => { verification = value; status('submissionVerification', ''); };
    window.onSubmissionLoginExpired = () => { verification = ''; status('submissionVerification', 'Please complete security verification again.'); };
    window.onSubmissionLoginError = () => { verification = ''; status('submissionVerification', 'Security verification could not load. Please refresh and try again.', true); };
    function resetVerification() { verification = ''; if (window.turnstile) { try { window.turnstile.reset(document.querySelector('.cf-turnstile')); } catch {} } }
    function renderCards() {
        $('competitionCards').replaceChildren();
        for (const competition of state.competitions) {
            const card = document.createElement('article'); card.className = 'panel submission-card';
            if (competition.key === active) card.setAttribute('aria-current', 'page');
            const title = document.createElement('h3'); title.textContent = competition.name; card.append(title);
            const summary = document.createElement('p');
            summary.textContent = competition.accepts_links ? (competition.submission?.link ? 'Submitted' : competition.submission ? 'Removed · no active submission' : 'Not submitted') : 'Registered · no link submission on this page.';
            card.append(summary);
            if (competition.accepts_links) {
                const link = document.createElement('a'); link.className = 'button secondary'; link.href = competition.page;
                link.textContent = competition.closed ? 'View submission' : 'Manage submission'; card.append(link);
            }
            $('competitionCards').append(card);
        }
        if (!state.competitions.length) $('competitionCards').textContent = 'No competitions are currently selected in your registration. Please contact the organizers.';
    }
    function renderEditor() {
        selected = state.competitions.find(c => c.key === active && c.accepts_links) || null;
        $('submissionEditor').hidden = !selected;
        if (!selected) {
            if (active) status('submissionPageStatus', 'Your registration does not include this competition. Your registered competitions are shown above.');
            return;
        }
        $('editorTitle').textContent = selected.name;
        const saved = selected.submission;
        $('savedSubmissionStatus').textContent = saved?.link ? 'Current submission saved' : saved ? 'Submission removed — no active link' : 'No submission saved yet';
        $('savedSubmissionLink').hidden = !saved?.link;
        if (saved?.link) $('savedSubmissionLink').href = saved.link; else $('savedSubmissionLink').removeAttribute('href');
        $('savedSubmissionTime').textContent = saved ? `First submitted: ${formatTime(saved.first_submitted_at)} · Last updated: ${formatTime(saved.updated_at)}` : '';
        $('removeSubmission').hidden = !saved?.link;
        $('saveSubmission').textContent = saved?.link ? 'Save replacement' : 'Save submission';
        draft = storage.read(draftKey());
        if (draft?.action === 'remove' && saved && !saved.link && saved.revision > draft.expectedRevision) {
            storage.remove(draftKey()); draft = null;
        }
        $('videoLink').value = draft?.link ?? saved?.link ?? '';
        $('submissionDraftNotice').textContent = draft ? (draft.requestId ? 'A previous save attempt is retained. Retry it, or reload the saved entry to discard the local attempt.' : 'Your unsaved link has been restored on this browser tab.') : '';
        controls();
    }
    async function load() {
        if (loading || !token) return;
        loading = true; $('retrySubmissionLoad').hidden = true; status('submissionPageStatus', 'Loading your submissions…');
        try {
            state = await request('/api/participant-submissions'); clockOffset = Date.parse(state.server_time) - Date.now();
            $('submissionLogin').hidden = true; $('submissionAccount').hidden = false;
            $('participantName').textContent = state.participant.name; $('participantContact').textContent = `${state.participant.email} · ${state.participant.phone}`;
            status('submissionPageStatus', ''); renderCards(); renderEditor();
        } catch (error) { if (token) { status('submissionPageStatus', error.message, true); $('retrySubmissionLoad').hidden = false; } }
        finally { loading = false; if (selected) controls(); }
    }
    $('submissionLoginForm').addEventListener('submit', async event => {
        event.preventDefault(); if (loginBusy) return;
        if (!verification) { status('submissionLoginStatus', 'Please complete security verification.', true); return; }
        loginBusy = true; const button = $('submissionLoginForm').querySelector('button'); button.disabled = true; status('submissionLoginStatus', 'Signing in…');
        try {
            const result = await post('/api/participant-submissions/login', { email: $('submissionEmail').value.trim(), phone: $('submissionPhone').value.trim(), turnstile_token: verification }, false);
            token = result.session_token; storage.write(sessionKey, token); status('submissionLoginStatus', ''); await load();
        } catch (error) { status('submissionLoginStatus', error.message, true); }
        finally { loginBusy = false; button.disabled = false; resetVerification(); }
    });
    $('videoLink').addEventListener('input', () => {
        if (!selected || busy) return;
        draft = { link: $('videoLink').value, expectedRevision: draft?.expectedRevision ?? selected.submission?.revision ?? 0 };
        storage.write(draftKey(), draft); status('submissionSaveStatus', ''); $('submissionDraftNotice').textContent = 'Unsaved changes.';
    });
    async function mutate(action) {
        if (!selected || busy || loading) return;
        if (closed()) { status('submissionSaveStatus', 'The submission deadline has passed.', true); controls(); return; }
        const key = draftKey(), link = action === 'save' ? $('videoLink').value.trim() : null;
        const revision = action === 'save' ? draft?.expectedRevision ?? selected.submission?.revision ?? 0 : selected.submission?.revision ?? 0;
        const fingerprint = JSON.stringify([action, link, revision]);
        if (draft?.fingerprint !== fingerprint || !draft?.requestId) draft = { link: link ?? '', expectedRevision: revision, fingerprint, requestId: crypto.randomUUID(), action };
        storage.write(key, draft); busy = true; controls(); status('submissionSaveStatus', action === 'remove' ? 'Removing submission…' : 'Saving link…');
        try {
            const result = await post('/api/participant-submissions/' + active, { action, link, expected_revision: revision, request_id: draft.requestId });
            storage.remove(key); draft = null; selected.submission = result.submission; renderCards(); renderEditor();
            status('submissionSaveStatus', result.already_saved ? 'This save attempt was already recorded. Your latest saved entry is shown above.' : action === 'remove' ? 'Submission removed. You can add a new link before the deadline.' : 'Submission saved successfully. The current link is shown above.');
        } catch (error) {
            if (token) {
                status('submissionSaveStatus', error.message + (error.status === 409 ? ' Your entered link is retained; review the saved entry before retrying.' : ' Your save attempt is retained for retry.'), true);
                if (error.status === 410) selected.closed = true;
            }
        } finally { busy = false; if (selected) controls(); }
    }
    $('submissionLinkForm').addEventListener('submit', e => { e.preventDefault(); mutate('save'); });
    $('removeSubmission').addEventListener('click', () => {
        if (confirm('Remove your current submission? You will have no active link for this competition until you save another one before the deadline.')) mutate('remove');
    });
    $('reloadSubmission').addEventListener('click', async () => {
        if (busy || loading) return;
        if (draft && !confirm('Discard this tab’s unsaved changes and load the latest saved submission?')) return;
        storage.remove(draftKey()); draft = null; status('submissionSaveStatus', ''); await load();
    });
    $('retrySubmissionLoad').addEventListener('click', load);
    $('submissionLogout').addEventListener('click', async () => {
        if (busy) return; $('submissionLogout').disabled = true;
        try { await post('/api/participant-submissions/logout', {}); } catch {} finally { signOut(); }
    });
    setInterval(() => { if (selected) controls(); }, 1000);
    if (token) load();
})();
