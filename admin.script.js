const ADMIN_USER = "lloyd99";
const ADMIN_PASS = "Lloyd998877";

async function getStoredProducts() {
    try {
        const response = await fetch('products.json?v=' + Date.now());
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {}
    const data = localStorage.getItem('lf_products');
    return data ? JSON.parse(data) : [];
}

async function getStoredOrders() {
    const owner = localStorage.getItem('gh_owner') || 'osam98714-boop';
    const repo = localStorage.getItem('gh_repo') || 'Lf-Store';
    const token = localStorage.getItem('gh_token');

    if (token) {
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/orders.json?v=` + Date.now();
            const res = await fetch(url, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (res.ok) {
                const fileData = await res.json();
                const decoded = decodeURIComponent(escape(atob(fileData.content)));
                const orders = JSON.parse(decoded);
                if (Array.isArray(orders)) return orders;
            }
        } catch (e) {
            console.error("تعذر جلب الطلبات من GitHub API:", e);
        }
    }

    const localData = localStorage.getItem('lf_orders');
    return localData ? JSON.parse(localData) : [];
}

document.addEventListener('DOMContentLoaded', () => {
    setupAdminEvents();
    loadGithubSettings();
});

function loadGithubSettings() {
    const owner = localStorage.getItem('gh_owner') || 'osam98714-boop';
    const repo = localStorage.getItem('gh_repo') || 'Lf-Store';
    const token = localStorage.getItem('gh_token') || '';

    if (document.getElementById('gh-owner')) document.getElementById('gh-owner').value = owner;
    if (document.getElementById('gh-repo')) document.getElementById('gh-repo').value = repo;
    if (document.getElementById('gh-token')) document.getElementById('gh-token').value = token;
}

function setupAdminEvents() {
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('admin-username').value;
            const pass = document.getElementById('admin-password').value;

            if (user === ADMIN_USER && pass === ADMIN_PASS) {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('dashboard-screen').classList.remove('hidden');
                renderDashboard();
            } else {
                alert('اسم المستخدم أو كلمة السر غير صحيحة!');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            document.getElementById('dashboard-screen').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        });
    }

    document.querySelectorAll('.sidebar-menu li').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.sidebar-menu li').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

            const targetTab = e.currentTarget;
            targetTab.classList.add('active');
            const page = document.getElementById(targetTab.dataset.tab);
            if (page) page.classList.add('active');
        });
    });

    const ghForm = document.getElementById('github-settings-form');
    if (ghForm) {
        ghForm.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('gh_owner', document.getElementById('gh-owner').value.trim());
            localStorage.setItem('gh_repo', document.getElementById('gh-repo').value.trim());
            localStorage.setItem('gh_token', document.getElementById('gh-token').value.trim());
            alert('تم حفظ إعدادات الربط السحابي بنجاح!');
            renderDashboard();
        });
    }

    const addProdForm = document.getElementById('add-product-form');
    if (addProdForm) {
        addProdForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('save-prod-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ والتحديث في GitHub...';

            const newProduct = {
                id: 'bot_' + Date.now(),
                name: document.getElementById('prod-name').value,
                price: Number(document.getElementById('prod-price').value),
                category: document.getElementById('prod-category').value,
                lang: document.getElementById('prod-lang').value,
                tag: document.getElementById('prod-tag').value,
                img: document.getElementById('prod-img').value,
                desc: document.getElementById('prod-desc').value
            };

            const currentProducts = await getStoredProducts();
            currentProducts.push(newProduct);

            const success = await pushJsonToGithub('products.json', currentProducts, 'تحديث المنتجات');

            if (success) {
                e.target.reset();
                alert('تم إضافة البوت وتحديث ملف products.json في GitHub بنجاح!');
                renderDashboard();
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ وإرسال التحديث إلى GitHub & Vercel';
        });
    }
}

async function pushJsonToGithub(fileName, dataArray, commitMsg) {
    const owner = localStorage.getItem('gh_owner') || 'osam98714-boop';
    const repo = localStorage.getItem('gh_repo') || 'Lf-Store';
    const token = localStorage.getItem('gh_token');

    if (!token) {
        alert('تنبيه: يرجى إدخال الـ Token في إعدادات الربط السحابي أولاً!');
        return false;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;
    const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(dataArray, null, 2))));

    try {
        let sha = "";
        const getFileRes = await fetch(url + '?v=' + Date.now(), {
            headers: { 'Authorization': `token ${token}` }
        });
        if (getFileRes.ok) {
            const fileData = await getFileRes.json();
            sha = fileData.sha;
        }

        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: commitMsg,
                content: contentEncoded,
                sha: sha ? sha : undefined
            })
        });

        return putRes.ok;
    } catch (err) {
        console.error('تعذر التحديث:', err);
        return false;
    }
}

async function renderDashboard() {
    updateStats();
    renderProductsTable();
    renderOrdersTable();
}

async function updateStats() {
    const products = await getStoredProducts();
    const orders = await getStoredOrders();

    if (document.getElementById('stat-total-products')) document.getElementById('stat-total-products').innerText = products.length;
    if (document.getElementById('stat-total-orders')) document.getElementById('stat-total-orders').innerText = orders.length;
    if (document.getElementById('stat-paid-orders')) document.getElementById('stat-paid-orders').innerText = orders.filter(o => o.paymentStatus === 'تم التأكيد').length;
}

async function renderProductsTable() {
    const products = await getStoredProducts();
    const container = document.getElementById('admin-products-table');

    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">لا توجد بوتات مضافة حالياً.</p>';
        return;
    }

    let html = `<table><tr><th>اسم البوت</th><th>السعر ($)</th><th>التصنيف</th><th>اللغة</th><th>الوسم</th><th>الإجراء</th></tr>`;
    products.forEach(p => {
        html += `<tr>
            <td>${p.name}</td>
            <td>$${p.price}</td>
            <td>${p.category}</td>
            <td>${p.lang}</td>
            <td>${p.tag}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">حذف</button></td>
        </tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}

async function renderOrdersTable() {
    const orders = await getStoredOrders();
    const container = document.getElementById('admin-orders-table');

    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">لا توجد طلبات مسجلة حالياً.</p>';
        return;
    }

    let html = `<table><tr><th>رقم الطلب</th><th>العميل</th><th>الرقم</th><th>البوت</th><th>السعر</th><th>الحالة</th><th>الإجراءات</th></tr>`;
    orders.forEach(o => {
        html += `<tr>
            <td>${o.id}</td>
            <td>${o.clientName}</td>
            <td>${o.clientPhone}</td>
            <td>${o.productName}</td>
            <td>${o.productPrice}</td>
            <td>${o.paymentStatus || 'جديد'}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="confirmPayment('${o.id}')">تأكيد الدفع</button>
                <button class="btn btn-danger btn-sm" onclick="rejectOrder('${o.id}')">حذف الطلب</button>
            </td>
        </tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}

async function deleteProduct(id) {
    if (!confirm('هل أنت تأكد من حذف هذا البوت؟')) return;
    let products = await getStoredProducts();
    products = products.filter(p => p.id !== id);
    
    const success = await pushJsonToGithub('products.json', products, 'حذف منتج');
    if (success) {
        alert('تم حذف البوت وتحديث GitHub بنجاح!');
        renderDashboard();
    }
}

async function confirmPayment(orderId) {
    let orders = await getStoredOrders();
    let order = orders.find(o => o.id === orderId);
    if (order) {
        order.paymentStatus = 'تم التأكيد';
        await pushJsonToGithub('orders.json', orders, 'تأكيد دفع الطلب');
        alert('تم تأكيد حالة الدفع بنجاح!');
        renderDashboard();
    }
}

async function rejectOrder(orderId) {
    if (confirm('هل أنت تأكد من حذف هذا الطلب؟')) {
        let orders = await getStoredOrders();
        orders = orders.filter(o => o.id !== orderId);
        await pushJsonToGithub('orders.json', orders, 'حذف طلب');
        alert('تم حذف الطلب بنجاح!');
        renderDashboard();
    }
}
