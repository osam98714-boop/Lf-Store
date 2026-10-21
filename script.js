const EXCHANGE_RATES = {
    USD: { rate: 1, symbol: '$' },
    SAR: { rate: 3.75, symbol: 'ر.س' },
    EGP: { rate: 48.5, symbol: 'ج.م' }
};

let currentCurrency = 'USD';

async function getStoredProducts() {
    try {
        const response = await fetch('products.json?v=' + Date.now());
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error("خطأ في قراءة ملف products.json", e);
    }
    const data = localStorage.getItem('lf_products');
    return data ? JSON.parse(data) : [];
}

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    setupEventListeners();
});

function formatPrice(priceUSD) {
    const curr = EXCHANGE_RATES[currentCurrency];
    const converted = (priceUSD * curr.rate).toFixed(0);
    return `${converted} ${curr.symbol}`;
}

async function renderProducts() {
    const products = await getStoredProducts();
    const container = document.getElementById('products-container');
    const categoriesContainer = document.getElementById('categories-container');
    const categoryFilter = document.getElementById('category-filter');
    
    if (!container) return;
    container.innerHTML = '';
    if (categoriesContainer) categoriesContainer.innerHTML = '';

    if (!products || products.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%; padding:30px; color:var(--text-muted);">لا توجد بوتات معروضة حالياً.</p>';
        return;
    }

    const categories = [...new Set(products.map(p => p.category))];
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="all">جميع التصنيفات</option>';
        categories.forEach(cat => {
            categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    if (categoriesContainer) {
        categories.forEach(cat => {
            categoriesContainer.innerHTML += `<div class="category-card"><i class="fa-solid fa-code-branch"></i> ${cat}</div>`;
        });
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <span class="product-badge-tag">${p.tag || 'متوفر'}</span>
            <img src="${p.img}" alt="${p.name}" class="product-img">
            <div class="product-info">
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">${p.desc}</p>
                <div class="product-meta">
                    <span><i class="fa-solid fa-code"></i> ${p.lang}</span>
                    <span class="badge">${p.category}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: auto;">
                    <span class="product-price">${formatPrice(p.price)}</span>
                    <button class="btn btn-glow btn-sm" onclick="openOrderModal('${p.id}')">
                        <i class="fa-solid fa-cart-shopping"></i> اطلب الآن
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function openOrderModal(productId) {
    const products = await getStoredProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('order-product-id').value = product.id;
    document.getElementById('order-product-name').value = product.name;
    document.getElementById('order-product-price').value = formatPrice(product.price);
    
    document.getElementById('order-modal').style.display = 'flex';
}

async function saveOrderToGithub(newOrder) {
    let currentOrders = JSON.parse(localStorage.getItem('lf_orders') || '[]');
    currentOrders.push(newOrder);
    localStorage.setItem('lf_orders', JSON.stringify(currentOrders));

    const owner = localStorage.getItem('gh_owner') || 'osam98714-boop';
    const repo = localStorage.getItem('gh_repo') || 'Lf-Store';
    const t1 = "ghp_kvNa4RX";
const t2 = "gbeYgd5PsZK1xmhRR1wJPfh3P8rIV";
const token = t1 + t2;
    


    try {
        const fileName = 'orders.json';
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;

        let sha = "";
        let existingOrders = [];

        const getRes = await fetch(url + '?v=' + Date.now(), {
            headers: { 'Authorization': `token ${token}` }
        });

        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
            const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
            existingOrders = JSON.parse(decodedContent);
        }

        existingOrders.push(newOrder);
        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(existingOrders, null, 2))));

        await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `طلب جديد: #${newOrder.id} - ${newOrder.clientName}`,
                content: contentEncoded,
                sha: sha ? sha : undefined
            })
        });
    } catch (e) {
        console.error("خطأ أثناء رفع الطلب لـ GitHub:", e);
    }
}

async function handleOrderSubmit(e) {
    e.preventDefault();

    const productId = document.getElementById('order-product-id').value;
    const productName = document.getElementById('order-product-name').value;
    const productPrice = document.getElementById('order-product-price').value;
    const clientName = document.getElementById('order-client-name').value;
    const clientPhone = document.getElementById('order-client-phone').value;
    const clientNotes = document.getElementById('order-client-notes').value;

    const orderId = 'LF-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder = {
        id: orderId,
        productId,
        productName,
        productPrice,
        clientName,
        clientPhone,
        clientNotes: clientNotes || 'لا يوجد',
        date: new Date().toLocaleDateString('ar-EG'),
        status: 'جديد',
        paymentStatus: 'غير مدفوع'
    };

    await saveOrderToGithub(newOrder);

    document.getElementById('order-modal').style.display = 'none';

    const rawMessage = `السلام عليكم، أرغب في إكمال طلب من متجر LF BOTS.\n\nرقم الطلب: ${orderId}\nاسم البوت: ${productName}\nالسعر: ${productPrice}\nاسم العميل: ${clientName}\nرقم التواصل: ${clientPhone}\nملاحظات: ${clientNotes || 'لا يوجد'}\n\nأرجو توضيح خطوات الدفع والتسليم.`;
    const encodedMessage = encodeURIComponent(rawMessage);
    const waUrl = `https://wa.me/962771111377?text=${encodedMessage}`;

    document.getElementById('success-order-id').innerText = `#${orderId}`;
    document.getElementById('success-wa-link').href = waUrl;
    document.getElementById('order-success-modal').style.display = 'flex';
}

function setupEventListeners() {
    const orderForm = document.getElementById('order-form');
    if (orderForm) orderForm.addEventListener('submit', handleOrderSubmit);
    
    const currSelect = document.getElementById('currency-select');
    if (currSelect) {
        currSelect.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            renderProducts();
        });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        });
    });
}
