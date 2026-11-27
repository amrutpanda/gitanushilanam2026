(() => {
    const $ = id => document.getElementById(id);
    const names = { bhagavad_gita_quiz: 'Quiz', shloka_recitation: 'Shloka Recitation', animated_bg_video: 'Gita Reel', treasure_hunt: 'Treasure Hunt' };
    const groups = { sub_junior: 'Subjunior', junior: 'Junior', senior: 'Senior', youth_adult: 'Youth / Adult' };
    let page = 1, pages = 1, sequence = 0;
    const text = (tag, value) => { const node = document.createElement(tag); node.textContent = value; return node; };
    const time = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)) + ' IST' : '—';
    function status(message, error = false) { $('submissionReviewStatus').textContent = message; $('submissionReviewStatus').classList.toggle('is-error', error); }
    function privateCleanup() { sequence++; $('submissionReviewBody').replaceChildren(); for (const id of ['submissionEligibleCount', 'submissionReceivedCount', 'submissionMissingCount']) $(id).textContent = '—'; }
    function link(url, label) {
        const a = document.createElement('a');
        if (!/^https:\/\/drive\.google\.com\/file\/d\//.test(url || '')) return text('span', 'Invalid stored link');
        a.href = url; a.textContent = label; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
    }
    async function read(path) {
        const response = await adminFetch(path), result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load submissions.');
        return result;
    }
    function cellSubmission(row, participant, competition, prefix) {
        const cell = row.insertCell(), eligible = participant.registration_type === 'individual' && participant[competition] === 1;
        const url = participant[prefix + '_link'], revision = participant[prefix + '_revision'];
        cell.append(text('p', eligible ? url ? 'Submitted' : revision ? 'Removed · no active link' : 'Not submitted' : 'Not registered for this submission'));
        if (eligible && url) cell.append(link(url, 'Open current video ↗'));
        if (revision) {
            cell.append(text('small', 'First: ' + time(participant[prefix + '_first_submitted_at'])));
            cell.append(text('p', 'Updated: ' + time(participant[prefix + '_updated_at'])));
            const button = text('button', 'View change history'); button.type = 'button'; button.className = 'secondary-button';
            const history = document.createElement('div'); history.className = 'submission-history'; history.hidden = true;
            let historyPage = 1, historyPages = 1;
            async function loadHistory(next = 1) {
                button.disabled = true; history.replaceChildren(text('p', 'Loading history…')); history.hidden = false;
                try {
                    const result = await read(`/admin/api/submissions/${participant.id}/${competition}/history?page=${next}`);
                    historyPage = result.page; historyPages = result.total_pages; history.replaceChildren();
                    for (const entry of result.history) {
                        const article = document.createElement('article');
                        article.append(text('strong', `Revision ${entry.revision} · ${entry.action === 'remove' ? 'Removed' : entry.previous_link ? 'Replaced' : 'Saved'}`), text('small', time(entry.changed_at)));
                        if (entry.link) article.append(link(entry.link, 'Link saved in this revision ↗'));
                        if (entry.previous_link) article.append(link(entry.previous_link, 'Previous link (historical) ↗'));
                        history.append(article);
                    }
                    const nav = document.createElement('div'); nav.className = 'submission-pagination';
                    const newer = text('button', 'Newer'), older = text('button', 'Older');
                    for (const b of [newer, older]) { b.type = 'button'; b.className = 'secondary-button'; }
                    newer.disabled = historyPage <= 1; older.disabled = historyPage >= historyPages;
                    newer.addEventListener('click', () => loadHistory(historyPage - 1)); older.addEventListener('click', () => loadHistory(historyPage + 1));
                    nav.append(newer, text('span', `${historyPage} / ${historyPages}`), older); history.append(nav);
                    button.textContent = 'Hide change history';
                } catch (error) { history.replaceChildren(text('p', error.message)); if (!sessionStorage.getItem('gitanushilanam_admin_session')) privateCleanup(); }
                finally { button.disabled = false; }
            }
            button.addEventListener('click', () => { if (!history.hidden) { history.hidden = true; button.textContent = 'View change history'; } else loadHistory(); });
            cell.append(button, history);
        }
    }
    async function load(next = 1) {
        const current = ++sequence;
        $('submissionPrevious').disabled = $('submissionNext').disabled = true; status('Loading submissions…');
        const params = new URLSearchParams({ page: String(next), search: $('submissionSearch').value.trim(), competition: $('submissionCompetitionFilter').value,
            participant_group: $('submissionGroupFilter').value, status: $('submissionStatusFilter').value });
        try {
            const result = await read('/admin/api/submissions?' + params);
            if (current !== sequence) return;
            page = result.page; pages = result.total_pages; $('submissionReviewBody').replaceChildren();
            $('submissionEligibleCount').textContent = result.counts.eligible_participants;
            $('submissionReceivedCount').textContent = result.counts.submitted_links; $('submissionMissingCount').textContent = result.counts.missing_links;
            for (const participant of result.participants) {
                const row = $('submissionReviewBody').insertRow();
                const name = row.insertCell(); name.append(text('strong', participant.name), text('p', groups[participant.participant_group] || participant.participant_group || 'Group missing'));
                const contact = row.insertCell(); contact.append(text('p', participant.email), text('p', participant.phone));
                row.insertCell().textContent = Object.keys(names).filter(key => participant[key] === 1).map(key => names[key]).join(', ') || 'None selected';
                cellSubmission(row, participant, 'shloka_recitation', 'shloka'); cellSubmission(row, participant, 'animated_bg_video', 'reel');
            }
            if (!result.participants.length) { const cell = $('submissionReviewBody').insertRow().insertCell(); cell.colSpan = 5; cell.textContent = 'No matching participants.'; }
            $('submissionReviewPage').textContent = `Page ${page} of ${pages}`; status(`${result.total} matching participants.`);
        } catch (error) { if (current === sequence) { status(error.message, true); if (!sessionStorage.getItem('gitanushilanam_admin_session')) privateCleanup(); } }
        finally { if (current === sequence) { $('submissionPrevious').disabled = page <= 1; $('submissionNext').disabled = page >= pages; } }
    }
    function competitionChanged() {
        const unsupported = ['bhagavad_gita_quiz', 'treasure_hunt'].includes($('submissionCompetitionFilter').value);
        $('submissionStatusFilter').disabled = unsupported; if (unsupported) $('submissionStatusFilter').value = '';
    }
    $('submissionCompetitionFilter').addEventListener('change', competitionChanged);
    $('submissionReviewFilters').addEventListener('submit', event => { event.preventDefault(); load(); });
    $('clearSubmissionFilters').addEventListener('click', () => { $('submissionReviewFilters').reset(); competitionChanged(); load(); });
    $('submissionPrevious').addEventListener('click', () => load(page - 1)); $('submissionNext').addEventListener('click', () => load(page + 1));
    $('logoutButton').addEventListener('click', privateCleanup);
    load();
})();
