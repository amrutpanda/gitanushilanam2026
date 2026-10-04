const ADMIN_API_BASE_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8787"
        : "https://gitanushilanam-portal.panda2amrut.workers.dev";

const ADMIN_SESSION_STORAGE_KEY = "gitanushilanam_admin_session";

const loginForm = document.getElementById("adminLoginForm");
const loginButton = document.getElementById("loginButton");
const loginStatus = document.getElementById("loginStatus");

let adminTurnstileToken = "";

function showLoginStatus(message, type = "") {
    loginStatus.textContent = message;
    loginStatus.classList.toggle("is-error", type === "error");
    loginStatus.classList.toggle("is-success", type === "success");
}

function getTurnstileTokenFromPage() {
    const input = document.querySelector('input[name="cf-turnstile-response"]');

    if (!(input instanceof HTMLInputElement)) {
        return "";
    }

    return input.value.trim();
}

function resetAdminTurnstile() {
    adminTurnstileToken = "";

    if (typeof turnstile === "undefined") {
        return;
    }

    try {
        turnstile.reset();
    } catch (error) {
        console.warn("Unable to reset Turnstile:", error);
    }
}

window.onAdminTurnstileSuccess = function (token) {
    adminTurnstileToken = typeof token === "string" ? token.trim() : "";
    showLoginStatus("");
};

window.onAdminTurnstileExpired = function () {
    adminTurnstileToken = "";
    showLoginStatus("Security verification expired. Please complete it again.", "error");
};

window.onAdminTurnstileError = function () {
    adminTurnstileToken = "";
    showLoginStatus("Security verification failed. Please try again.", "error");
};

async function checkExistingSession() {
    const sessionToken = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

    if (!sessionToken) {
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/session`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${sessionToken}`
            }
        });

        if (response.ok) {
            window.location.replace("admin.html");
            return;
        }

        sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
        // Keep the login page available if the session check cannot be completed.
    }
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const turnstileToken = adminTurnstileToken || getTurnstileTokenFromPage();

    if (!turnstileToken) {
        showLoginStatus("Please complete the security verification.", "error");
        return;
    }

    loginButton.disabled = true;
    showLoginStatus("Signing in...");

    try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password,
                turnstile_token: turnstileToken
            })
        });

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error("The admin server returned an invalid response.");
        }

        if (!response.ok || !result.success) {
            showLoginStatus(result.message || "Unable to sign in.", "error");
            resetAdminTurnstile();
            return;
        }

        if (typeof result.session_token !== "string" || result.session_token.length === 0) {
            throw new Error("The admin server did not return a valid session token.");
        }

        sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, result.session_token);
        showLoginStatus("Login successful. Opening dashboard...", "success");
        window.location.replace("admin.html");
    } catch (error) {
        console.error("Admin login error:", error);
        showLoginStatus(
            error instanceof Error ? error.message : "Unable to sign in. Please try again.",
            "error"
        );
        resetAdminTurnstile();
    } finally {
        loginButton.disabled = false;
    }
});

checkExistingSession();
