// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = "https://fumeskdjohvhclnltlnv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_f6pHS3QKnc6g4IO2VTR9sQ_ZLTHl7Di";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ESTADO DA APLICAÇÃO
let currentSession = null;
let licenses = [];

// ELEMENTOS DOM
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const licensesTable = document.getElementById('licenses-table-body');

// INICIALIZAÇÃO
async function init() {
    const { data } = await supabaseClient.auth.getSession();
    currentSession = data.session;
    
    if (currentSession) {
        showDashboard();
    } else {
        showLogin();
    }
}

// AUTENTICAÇÃO
loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errorMsg.textContent = "Erro ao entrar: " + error.message;
    } else {
        currentSession = data.session;
        showDashboard();
    }
};

document.getElementById('logout-btn').onclick = async () => {
    await supabaseClient.auth.signOut();
    showLogin();
};

// NAVEGAÇÃO
function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadLicenses();
}

// LOGICA DE LICENÇAS
async function loadLicenses() {
    const { data, error } = await supabaseClient
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        alert("Erro ao carregar licenças: " + error.message);
        return;
    }

    licenses = data;
    renderLicenses();
    updateStats();
}

function renderLicenses() {
    const search = document.getElementById('search-input').value.toLowerCase();
    
    licensesTable.innerHTML = licenses
        .filter(l => 
            (l.company_name || '').toLowerCase().includes(search) || 
            (l.owner_name || '').toLowerCase().includes(search) ||
            l.license_key.toLowerCase().includes(search)
        )
        .map(l => `
            <tr>
                <td>
                    <div style="font-weight:bold">${l.company_name}</div>
                    <div style="font-size:0.85rem; color:var(--primary-color)">${l.owner_name || '—'}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">${l.license_key}</div>
                </td>
                <td><span class="badge badge-${l.status}">${l.status}</span></td>
                <td>${l.plan}</td>
                <td style="font-family:monospace; font-size:0.8rem">${l.device_id || '—'}</td>
                <td>${new Date(l.expires_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-primary btn-sm ${l.status === 'blocked' ? 'btn-green' : 'btn-red'}" 
                        onclick="toggleBlock('${l.license_key}', '${l.status}')">
                        ${l.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button class="btn-primary btn-sm" style="background:#444" 
                        onclick="resetDevice('${l.license_key}')">
                        Reset PC
                    </button>
                </td>
            </tr>
        `).join('');
}

function updateStats() {
    document.getElementById('stat-total').textContent = licenses.length;
    document.getElementById('stat-active').textContent = licenses.filter(l => l.status === 'active').length;
    document.getElementById('stat-blocked').textContent = licenses.filter(l => l.status === 'blocked').length;
}

// AÇÕES
window.toggleBlock = async (key, currentStatus) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const { error } = await supabaseClient
        .from('licenses')
        .update({ status: newStatus })
        .eq('license_key', key);

    if (error) alert("Erro: " + error.message);
    else loadLicenses();
};

window.resetDevice = async (key) => {
    if (!confirm("Isso permitirá que a licença seja usada em outro computador. Continuar?")) return;
    const { error } = await supabaseClient
        .from('licenses')
        .update({ device_id: null })
        .eq('license_key', key);

    if (error) alert("Erro: " + error.message);
    else loadLicenses();
};

// GERAR LICENÇA
const modal = document.getElementById('modal-license');
document.getElementById('new-license-btn').onclick = () => {
    modal.classList.remove('hidden');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    document.getElementById('m-expiry').value = d.toISOString().split('T')[0];
};

document.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');

document.getElementById('license-form').onsubmit = async (e) => {
    e.preventDefault();
    const company = document.getElementById('m-company').value;
    const owner = document.getElementById('m-owner').value;
    const phone = document.getElementById('m-phone').value;
    const login_email = document.getElementById('m-email').value;
    const login_password = document.getElementById('m-password').value;
    const plan = document.getElementById('m-plan').value;
    const expiry = document.getElementById('m-expiry').value;

    const key = generateKey();

    const { error } = await supabaseClient.from('licenses').insert({
        license_key: key,
        company_name: company,
        owner_name: owner,
        phone: phone,
        login_email: login_email,
        login_password: login_password,
        plan: plan,
        status: 'pending',
        expires_at: new Date(expiry).toISOString()
    });

    if (error) {
        alert("Erro ao criar licença: " + error.message);
    } else {
        alert("Licença e Acesso criados!\n\nChave: " + key + "\nEmail: " + login_email + "\nSenha: " + login_password);
        modal.classList.add('hidden');
        loadLicenses();
    }
};

function generateKey() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let k = "";
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) k += "-";
        k += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return k;
}

document.getElementById('search-input').oninput = renderLicenses;

init();
