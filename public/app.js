const $ = (s) => document.querySelector(s);
const state = { menu: [], category: 'All', search: '', cart: {}, user: null, authMode: 'login' };
const money = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2500);
}
function showPanel(selector) {
  closePanels(); $('#overlay').classList.remove('hidden'); $(selector).classList.remove('hidden');
}
function closePanels() {
  ['#cartDrawer','#authModal','#checkoutModal','#ordersModal'].forEach(s => $(s).classList.add('hidden'));
  $('#overlay').classList.add('hidden');
}
function cartLines() {
  return Object.entries(state.cart).map(([id, quantity]) => {
    const item = state.menu.find(x => x.id === Number(id));
    return item ? { ...item, quantity } : null;
  }).filter(Boolean);
}
function cartTotal() { return cartLines().reduce((sum, x) => sum + x.price * x.quantity, 0); }
function updateCartBadge() { $('#cartCount').textContent = cartLines().reduce((sum, x) => sum + x.quantity, 0); }
function renderMenu() {
  const categories = ['All', ...new Set(state.menu.map(x => x.category))];
  $('#categories').innerHTML = categories.map(c => `<button class="category ${state.category === c ? 'active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c === 'All' ? 'All items' : c)}</button>`).join('');
  const filtered = state.menu.filter(item => (state.category === 'All' || item.category === state.category) && `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(state.search.toLowerCase()));
  $('#menuGrid').innerHTML = filtered.length ? filtered.map(item => `
    <article class="food-card">
      <div class="food-image"><img loading="lazy" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.src='https://placehold.co/600x400/f3e6d7/70452d?text=Crave+Food'"><span class="food-category">${escapeHtml(item.category)}</span></div>
      <div class="food-details"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><div class="food-bottom"><span class="price">${money(item.price)}</span><button class="add-btn" data-add="${item.id}" aria-label="Add ${escapeHtml(item.name)} to cart">+</button></div></div>
    </article>`).join('') : '<div class="empty-state">No dishes found. Try another search.</div>';
}
function renderCart() {
  const lines = cartLines();
  $('#drawerCount').textContent = `(${lines.reduce((sum,x)=>sum+x.quantity,0)})`;
  $('#cartItems').innerHTML = lines.length ? lines.map(item => `
    <div class="cart-row"><img src="${escapeHtml(item.image)}" alt=""><div><h4>${escapeHtml(item.name)}</h4><p>${money(item.price * item.quantity)}</p><div class="quantity"><button data-qty="${item.id}" data-delta="-1">−</button><span>${item.quantity}</span><button data-qty="${item.id}" data-delta="1">+</button></div></div><button class="close-btn" data-remove="${item.id}" aria-label="Remove item" style="width:27px;height:27px;font-size:18px">×</button></div>`).join('') : '<div class="empty-state">Your cart is waiting for something delicious.</div>';
  $('#subtotal').textContent = money(cartTotal()); $('#total').textContent = money(cartTotal()); $('#checkoutTotal').textContent = money(cartTotal());
  $('#checkoutBtn').disabled = !lines.length; $('#checkoutBtn').style.opacity = lines.length ? '1' : '.5'; updateCartBadge();
}
function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1; renderCart(); toast('Added to your cart!');
}
function openAuth(mode = 'login') {
  state.authMode = mode; const register = mode === 'register';
  $('#authTitle').textContent = register ? 'Create your account.' : 'Welcome back.';
  $('#authSub').textContent = register ? 'Join Crave for easy ordering.' : 'Log in to see your orders and checkout.';
  $('#nameField').classList.toggle('hidden', !register);
  $('#nameField input').required = register;
  $('#authSubmit').textContent = register ? 'Create account' : 'Log in';
  $('#switchText').textContent = register ? 'Already have an account?' : 'New to Crave?';
  $('#switchAuth').textContent = register ? 'Log in' : 'Create an account';
  $('#authError').textContent = ''; $('#authForm').reset(); showPanel('#authModal');
}
async function loadOrders() {
  if (!state.user) { openAuth(); return; }
  try {
    const orders = await api('/api/orders');
    $('#ordersList').innerHTML = orders.length ? orders.map(o => `<article class="order-card"><div class="order-top"><span>Order #${o.id}</span><span class="order-status">${escapeHtml(o.status)}</span></div><p>${o.items.map(i=>`${escapeHtml(i.name)} × ${i.quantity}`).join('<br>')}<br><b>Total: ${money(o.total)}</b><br>${escapeHtml(o.created_at)}</p></article>`).join('') : '<div class="empty-state">No orders yet. Your first favourite is waiting.</div>';
    showPanel('#ordersModal');
  } catch (e) { toast(e.message); }
}

document.addEventListener('click', async event => {
  const category = event.target.closest('[data-category]');
  if (category) { state.category = category.dataset.category; renderMenu(); return; }
  const add = event.target.closest('[data-add]');
  if (add) { addToCart(Number(add.dataset.add)); return; }
  const qty = event.target.closest('[data-qty]');
  if (qty) {
    const id = qty.dataset.qty; state.cart[id] = (state.cart[id] || 0) + Number(qty.dataset.delta);
    if (state.cart[id] <= 0) delete state.cart[id];
    renderCart(); return;
  }
  const remove = event.target.closest('[data-remove]');
  if (remove) { delete state.cart[remove.dataset.remove]; renderCart(); return; }
  if (event.target.closest('[data-close]') || event.target.id === 'overlay') { closePanels(); return; }
});
$('#searchInput').addEventListener('input', e => { state.search = e.target.value; renderMenu(); });
$('#cartBtn').addEventListener('click', () => { renderCart(); showPanel('#cartDrawer'); });
$('#authBtn').addEventListener('click', () => state.user ? (api('/api/logout', { method: 'POST' }).then(() => { state.user = null; $('#authBtn').textContent = 'Log in'; toast('Logged out.'); }).catch(e => toast(e.message))) : openAuth());
$('#switchAuth').addEventListener('click', () => openAuth(state.authMode === 'login' ? 'register' : 'login'));
$('#ordersBtn').addEventListener('click', loadOrders);
$('#checkoutBtn').addEventListener('click', () => {
  if (!cartLines().length) return;
  if (!state.user) { closePanels(); openAuth(); toast('Log in to continue checkout.'); return; }
  $('#checkoutError').textContent = ''; $('#checkoutTotal').textContent = money(cartTotal()); showPanel('#checkoutModal');
});
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault(); const form = new FormData(e.currentTarget);
  const body = Object.fromEntries(form.entries());
  try {
    const data = await api(`/api/${state.authMode}`, { method: 'POST', body: JSON.stringify(body) });
    state.user = data.user; $('#authBtn').textContent = 'Log out'; closePanels(); toast(`Welcome${state.user.name ? ', ' + state.user.name.split(' ')[0] : ''}!`);
  } catch (error) { $('#authError').textContent = error.message; }
});
$('#checkoutForm').addEventListener('submit', async e => {
  e.preventDefault(); const form = Object.fromEntries(new FormData(e.currentTarget).entries());
  const items = cartLines().map(x => ({ id: x.id, quantity: x.quantity }));
  try {
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify({ ...form, items }) });
    state.cart = {}; renderCart(); closePanels(); e.currentTarget.reset(); toast(`Order #${order.id} placed successfully!`);
  } catch (error) { $('#checkoutError').textContent = error.message; }
});
async function init() {
  try {
    state.menu = await api('/api/menu'); renderMenu(); renderCart();
    const me = await api('/api/me'); state.user = me.user;
    if (state.user) $('#authBtn').textContent = 'Log out';
  } catch (error) { $('#menuGrid').innerHTML = `<div class="empty-state">${escapeHtml(error.message)} Start the server and refresh.</div>`; }
}
init();
