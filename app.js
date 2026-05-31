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
const historyTable = document.getElementById('history-table-body');

// GRAFICOS
let statusChart = null;
let plansChart = null;

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

// NAVEGAÇÃO ENTRE PÁGINAS
document.querySelectorAll('.nav-links li').forEach(li => {
    li.onclick = () => {
        const page = li.getAttribute('data-page');
        
        // Ativar link no menu
        document.querySelectorAll('.nav-links li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');
        
        // Trocar seção visível
        document.querySelectorAll('.page-content').forEach(section => section.classList.add('hidden'));
        document.getElementById(`${page}-page`).classList.remove('hidden');
        
        // Atualizar título
        const titles = { 'licenses': 'Gestão de Licenças', 'stats': 'Painel de Estatísticas', 'history': 'Histórico de Atividade' };
        document.getElementById('page-title').textContent = titles[page];

        // Sempre recarregar dados ao trocar de aba para ver atualizações do ERP
        loadLicenses();
        if (page === 'stats') renderCharts();
    };
});

document.getElementById('refresh-btn').onclick = () => {
    const btn = document.getElementById('refresh-btn');
    btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Atualizando...';
    loadLicenses().then(() => {
        btn.innerHTML = '<i class="fa-solid fa-sync"></i> Recarregar';
    });
};

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
    renderHistory();
    updateStats();
    if (!document.getElementById('stats-page').classList.contains('hidden')) renderCharts();
}

function renderLicenses() {
    const search = document.getElementById('search-input').value.toLowerCase();
    
    licensesTable.innerHTML = licenses
        .filter(l => 
            (l.company_name || '').toLowerCase().includes(search) || 
            (l.owner_name || '').toLowerCase().includes(search) ||
            (l.phone || '').toLowerCase().includes(search) ||
            (l.license_key || '').toLowerCase().includes(search)
        )
        .map(l => `
            <tr>
                <td>
                    <div style="font-weight:bold">${l.company_name}</div>
                    <div style="font-size:0.85rem; color:var(--primary-color)">${l.owner_name || '—'}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">${l.license_key}</div>
                </td>
                <td><span class="badge badge-${l.status}">${l.status}</span></td>
                <td>${l.plan === 'monthly' ? 'Mensal' : 'Anual'}</td>
                <td>
                    ${l.phone ? `<a href="https://wa.me/${l.phone.replace(/\D/g, '')}" target="_blank" style="color:var(--green); text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> ${l.phone}</a>` : '—'}
                </td>
                <td>${new Date(l.expires_at).toLocaleDateString()}</td>
                <td>
                    <div style="display:flex; gap:5px; flex-wrap:wrap">
                        <button class="btn-primary btn-sm" style="background:#444" 
                            onclick="editLicense('${l.id}')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-primary btn-sm ${l.status === 'blocked' ? 'btn-green' : 'btn-red'}" 
                            onclick="toggleBlock('${l.license_key}', '${l.status}')">
                            ${l.status === 'blocked' ? 'Ativar' : 'Bloquear'}
                        </button>
                        <button class="btn-primary btn-sm btn-red" 
                            onclick="deleteLicense('${l.license_key}', '${l.company_name}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
}

function renderHistory() {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    historyTable.innerHTML = licenses.map(l => {
        const expiryDate = new Date(l.expires_at);
        const isExpiringSoon = expiryDate <= sevenDaysFromNow && expiryDate > now;
        const isExpired = expiryDate <= now;
        
        let expiryClass = '';
        if (isExpired) expiryClass = 'text-danger';
        else if (isExpiringSoon) expiryClass = 'text-warning';

        // Garante que o número de funcionários seja exibido corretamente (0 se nulo)
        const employeesCount = l.total_employees !== undefined && l.total_employees !== null ? l.total_employees : 0;

        return `
            <tr class="${isExpiringSoon ? 'warning-row' : ''}">
                <td>
                    <div style="font-weight:bold">${l.company_name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">${l.owner_name}</div>
                </td>
                <td>
                    ${l.last_validation_at ? new Date(l.last_validation_at).toLocaleString() : '<span style="color:var(--text-muted)">Nunca acedeu</span>'}
                </td>
                <td style="font-family:monospace; font-size:0.85rem">
                    ${l.device_id || '<span style="color:var(--text-muted)">Aguardando ativação...</span>'}
                </td>
                <td class="${expiryClass}">
                    ${expiryDate.toLocaleDateString()}
                    ${isExpiringSoon ? '<br><small>⚠️ Expira em breve</small>' : ''}
                    ${isExpired ? '<br><small>❌ Expirada</small>' : ''}
                </td>
                <td style="font-weight:bold; text-align:center; font-size: 1.1rem; color: var(--primary)">
                    ${employeesCount}
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    document.getElementById('stat-total').textContent = licenses.length;
    document.getElementById('stat-active').textContent = licenses.filter(l => l.status === 'active').length;
    document.getElementById('stat-blocked').textContent = licenses.filter(l => l.status === 'blocked').length;
    
    const monthlyPrice = 10000;
    const yearlyPrice = 100000;
    
    const revenue = licenses.reduce((acc, l) => {
        if (l.status !== 'active') return acc;
        return acc + (l.plan === 'monthly' ? monthlyPrice : yearlyPrice / 12);
    }, 0);
    
    document.getElementById('stat-revenue').textContent = revenue.toLocaleString() + " Mzn";
}

function renderCharts() {
    const ctxStatus = document.getElementById('chart-status').getContext('2d');
    const ctxPlans = document.getElementById('chart-plans').getContext('2d');

    if (statusChart) statusChart.destroy();
    if (plansChart) plansChart.destroy();

    const statusData = {
        active: licenses.filter(l => l.status === 'active').length,
        blocked: licenses.filter(l => l.status === 'blocked').length,
        pending: licenses.filter(l => l.status === 'pending').length,
        expired: licenses.filter(l => l.status === 'expired').length
    };

    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Ativas', 'Bloqueadas', 'Pendentes', 'Expiradas'],
            datasets: [{
                data: [statusData.active, statusData.blocked, statusData.pending, statusData.expired],
                backgroundColor: ['#00d4aa', '#ff4d4d', '#ffa500', '#8fa3c0'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e1e7ef' } } } }
    });

    const plansData = {
        monthly: licenses.filter(l => l.plan === 'monthly').length,
        yearly: licenses.filter(l => l.plan === 'yearly').length
    };

    plansChart = new Chart(ctxPlans, {
        type: 'pie',
        data: {
            labels: ['Mensal', 'Anual'],
            datasets: [{
                data: [plansData.monthly, plansData.yearly],
                backgroundColor: ['#0088ff', '#9d50bb'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e1e7ef' } } } }
    });
}

// AÇÕES
window.editLicense = (id) => {
    const l = licenses.find(lic => lic.id === id);
    if (!l) return;
    
    document.getElementById('m-id').value = l.id;
    document.getElementById('m-company').value = l.company_name;
    document.getElementById('m-owner').value = l.owner_name;
    document.getElementById('m-phone').value = l.phone;
    document.getElementById('m-email').value = l.login_email;
    document.getElementById('m-password').value = l.login_password;
    document.getElementById('m-plan').value = l.plan;
    document.getElementById('m-expiry').value = new Date(l.expires_at).toISOString().split('T')[0];
    document.getElementById('m-notes').value = l.notes || '';
    document.getElementById('m-employees').value = l.total_employees || 0;
    
    document.querySelector('#modal-license h3').textContent = "Editar Licença";
    document.getElementById('btn-save-license').textContent = "Atualizar Licença";
    modal.classList.remove('hidden');
};

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

window.deleteLicense = async (key, companyName) => {
    if (!confirm(`TEM CERTEZA? Esta ação irá eliminar permanentemente a licença da empresa "${companyName}".\n\nEsta ação não pode ser desfeita.`)) return;
    
    const { error } = await supabaseClient
        .from('licenses')
        .delete()
        .eq('license_key', key);

    if (error) {
        alert("Erro ao eliminar licença: " + error.message);
    } else {
        loadLicenses();
    }
};

document.getElementById('license-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('m-id').value;
    const company = document.getElementById('m-company').value;
    const owner = document.getElementById('m-owner').value;
    const phone = document.getElementById('m-phone').value;
    const login_email = document.getElementById('m-email').value;
    const login_password = document.getElementById('m-password').value;
    const plan = document.getElementById('m-plan').value;
    const expiry = document.getElementById('m-expiry').value;
    const notes = document.getElementById('m-notes').value;
    const employees = document.getElementById('m-employees').value;

    const payload = {
        company_name: company,
        owner_name: owner,
        phone: phone,
        login_email: login_email,
        login_password: login_password,
        plan: plan,
        expires_at: new Date(expiry).toISOString(),
        notes: notes,
        total_employees: parseInt(employees) || 0
    };

    if (id) {
        // UPDATE
        const { error } = await supabaseClient
            .from('licenses')
            .update(payload)
            .eq('id', id);

        if (error) alert("Erro ao atualizar: " + error.message);
        else {
            modal.classList.add('hidden');
            loadLicenses();
        }
    } else {
        // CREATE
        const key = generateKey();
        payload.license_key = key;
        payload.status = 'pending';

        const { error } = await supabaseClient.from('licenses').insert(payload);

        if (error) {
            alert("Erro ao criar licença: " + error.message);
        } else {
            alert("Licença e Acesso criados!\n\nChave: " + key);
            modal.classList.add('hidden');
            loadLicenses();
        }
    }
};

const modal = document.getElementById('modal-license');
document.getElementById('new-license-btn').onclick = () => {
    document.getElementById('m-id').value = "";
    document.getElementById('license-form').reset();
    document.querySelector('#modal-license h3').textContent = "Criar Nova Licença";
    document.getElementById('btn-save-license').textContent = "Gerar Licença e Acesso";
    modal.classList.remove('hidden');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    document.getElementById('m-expiry').value = d.toISOString().split('T')[0];
};

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => modal.classList.add('hidden');
});

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
