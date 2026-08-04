const API_BASE = "https://api.mail.tm";

let currentAccount = null;
let token = null;
let fetchInterval = null;

// بدء التطبيق
window.addEventListener("DOMContentLoaded", () => {
    generateNewEmail();
});

// إنشاء بريد جديد
async function generateNewEmail() {

    document.getElementById("emailAddress").textContent = "جاري إنشاء البريد...";
    document.getElementById("statusText").textContent = "جاري الاتصال...";

    try {

        const domainsRes = await fetch(`${API_BASE}/domains`);
        const domainsData = await domainsRes.json();

        if (
            !domainsData["hydra:member"] ||
            domainsData["hydra:member"].length === 0
        ) {
            throw new Error("لا توجد نطاقات");
        }

        const domain =
            domainsData["hydra:member"][0].domain;

        const username =
            Math.random().toString(36).substring(2, 10);

        const address =
            `${username}@${domain}`;

        const password =
            Math.random().toString(36).substring(2, 12) + "A1!";

        const createRes = await fetch(`${API_BASE}/accounts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                address,
                password
            })
        });

        if (!createRes.ok) {
            throw new Error("فشل إنشاء الحساب");
        }

        const tokenRes = await fetch(`${API_BASE}/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                address,
                password
            })
        });

        const tokenData = await tokenRes.json();

        token = tokenData.token;

        currentAccount = {
            address,
            password
        };

        document.getElementById("emailAddress").textContent = address;
        document.getElementById("statusText").textContent = "جاهز لاستقبال الرسائل";

        if (fetchInterval) {
            clearInterval(fetchInterval);
        }

        refreshInbox();

        fetchInterval = setInterval(refreshInbox, 5000);

    } catch (err) {

        console.error(err);

        document.getElementById("emailAddress").textContent = "حدث خطأ";

        document.getElementById("statusText").textContent = "تعذر الاتصال";

    }

}
// تحديث صندوق الوارد
async function refreshInbox() {

    if (!token) return;

    try {

        const res = await fetch(`${API_BASE}/messages`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();

        const messages = data["hydra:member"] || [];

        const inbox = document.getElementById("inboxList");

        if (messages.length === 0) {

            inbox.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">
                        لا توجد رسائل حتى الآن.
                    </td>
                </tr>
            `;

            return;
        }

        inbox.innerHTML = "";

        messages.forEach(msg => {

            inbox.innerHTML += `
                <tr class="message-row" onclick="readMessage('${msg.id}')">
                    <td>${escapeHtml(msg.from.address)}</td>
                    <td>${escapeHtml(msg.subject || "بدون عنوان")}</td>
                    <td>${new Date(msg.createdAt).toLocaleTimeString()}</td>
                    <td>
                        <button class="btn secondary-btn">
                            قراءة
                        </button>
                    </td>
                </tr>
            `;

        });

        document.getElementById("statusText").textContent =
            "تم تحديث الرسائل";

    } catch (err) {

        console.error(err);

    }

}

// قراءة الرسالة
async function readMessage(id) {

    try {

        const res = await fetch(`${API_BASE}/messages/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const msg = await res.json();

        document.getElementById("mailSubject").textContent =
            msg.subject || "بدون عنوان";

        document.getElementById("mailSender").textContent =
            msg.from.address;

        document.getElementById("mailDate").textContent =
            new Date(msg.createdAt).toLocaleString();

        const body = document.getElementById("mailBody");

        if (msg.html && msg.html.length > 0) {
            body.innerHTML = msg.html[0];
        } else {
            body.textContent = msg.text || "";
        }

        openModal("emailModal");

    } catch (err) {

        alert("تعذر فتح الرسالة");

    }

}
// نسخ البريد
function copyEmail() {

    const email =
        document.getElementById("emailAddress").textContent;

    if (!email.includes("@")) return;

    navigator.clipboard.writeText(email);

    const btn = document.getElementById("copyBtn");

    btn.innerHTML = "✔ تم النسخ";

    setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-copy"></i> نسخ';
    }, 2000);

}

// فتح نافذة
function openModal(id) {

    document.getElementById(id).style.display = "flex";

}

// غلق نافذة
function closeModal(id) {

    document.getElementById(id).style.display = "none";

}

// غلق عند الضغط خارج النافذة
window.addEventListener("click", function (e) {

    if (e.target.classList.contains("modal")) {

        e.target.style.display = "none";

    }

});

// حماية بسيطة
function escapeHtml(text) {

    if (!text) return "";

    return text.replace(/[&<>"']/g, function (m) {

        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[m];

    });

}
