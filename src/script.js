// Estado global da aplicação
let currentAccount = null;
let provider = null;

document.addEventListener('DOMContentLoaded', () => {
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    
    // Verifica se já está conectado ao carregar a página
    checkConnection();
    
    // Escuta mudanças de conta
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }

    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
});

// Verifica se já existe uma conexão ativa
async function checkConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                updateWalletUI(currentAccount);
                loadDashboardData();
            }
        } catch (error) {
            console.error('Erro ao verificar conexão:', error);
        }
    }
}

// Conecta a carteira
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            currentAccount = accounts[0];
            
            // Inicializa o provider
            provider = new ethers.providers.Web3Provider(window.ethereum);
            
            updateWalletUI(currentAccount);
            loadDashboardData();
            
            console.log('Carteira conectada:', currentAccount);
        } catch (error) {
            console.error('Erro ao conectar a carteira:', error);
            showNotification('Erro ao conectar a carteira. Por favor, tente novamente.', 'error');
        }
    } else {
        showNotification('MetaMask ou outra carteira Web3 não detectada.', 'warning');
        setTimeout(() => {
            window.open('https://metamask.io/download/', '_blank');
        }, 2000);
    }
}

// Atualiza a interface do usuário após conexão
function updateWalletUI(account) {
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn) {
        connectWalletBtn.textContent = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        connectWalletBtn.classList.add('connected');
        connectWalletBtn.onclick = disconnectWallet;
    }
}

// Desconecta a carteira
function disconnectWallet() {
    currentAccount = null;
    provider = null;
    
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn) {
        connectWalletBtn.textContent = 'Conectar Carteira';
        connectWalletBtn.classList.remove('connected');
        connectWalletBtn.onclick = connectWallet;
    }
    
    // Volta ao estado inicial do dashboard
    resetDashboard();
    showNotification('Carteira desconectada', 'info');
}

// Manipula mudanças de conta
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (accounts[0] !== currentAccount) {
        currentAccount = accounts[0];
        updateWalletUI(currentAccount);
        loadDashboardData();
    }
}

// Manipula mudanças de rede
function handleChainChanged(chainId) {
    // Recarrega a página quando a rede muda
    window.location.reload();
}

// Carrega dados do dashboard após conexão
function loadDashboardData() {
    const dashboard = document.getElementById('dashboard');
    
    // Remove o card de boas-vindas
    const mainCard = dashboard.querySelector('.main-card');
    if (mainCard) {
        mainCard.remove();
    }
    
    // Adiciona cards funcionais
    addDashboardCards();
    showNotification('Carteira conectada com sucesso!', 'success');
}

// Adiciona cards funcionais ao dashboard
function addDashboardCards() {
    const dashboard = document.getElementById('dashboard');
    
    const cardsHTML = `
        <div class="card">
            <h2>💰 Preços de Commodities</h2>
            <p>Soja (CME): <span class="price">$11.50/bushel</span></p>
            <p>Prêmio Paranaguá: <span class="price">+$0.80</span></p>
            <p>USD/BRL: <span class="price">R$ 5,45</span></p>
            <div class="price-result">
                <strong>Preço Local: R$ 182,50/saca</strong>
            </div>
        </div>
        
        <div class="card">
            <h2>🌤️ Previsão Climática</h2>
            <p>Região: Centro-Oeste</p>
            <p>Próximos 7 dias: <span class="weather">Chuvas moderadas</span></p>
            <p>Impacto na safra: <span class="impact positive">Positivo</span></p>
        </div>
        
        <div class="card">
            <h2>📊 Conversão de Métricas</h2>
            <div class="converter">
                <input type="number" id="inputValue" placeholder="Quantidade" />
                <select id="fromUnit">
                    <option value="saca">Sacas</option>
                    <option value="tonelada">Toneladas</option>
                    <option value="bushel">Bushels</option>
                </select>
                <span>→</span>
                <select id="toUnit">
                    <option value="tonelada">Toneladas</option>
                    <option value="saca">Sacas</option>
                    <option value="bushel">Bushels</option>
                </select>
                <div id="conversionResult"></div>
            </div>
        </div>
        
        <div class="card">
            <h2>🔗 Sua Carteira</h2>
            <p>Endereço: <span class="wallet-address">${currentAccount}</span></p>
            <p>Rede: Ethereum Mainnet</p>
            <button class="btn-secondary" onclick="copyAddress()">Copiar Endereço</button>
        </div>
    `;
    
    dashboard.innerHTML = cardsHTML;
    
    // Adiciona funcionalidade ao conversor
    setupConverter();
}

// Configura o conversor de métricas
function setupConverter() {
    const inputValue = document.getElementById('inputValue');
    const fromUnit = document.getElementById('fromUnit');
    const toUnit = document.getElementById('toUnit');
    const result = document.getElementById('conversionResult');
    
    function convert() {
        const value = parseFloat(inputValue.value);
        if (isNaN(value) || value <= 0) {
            result.textContent = '';
            return;
        }
        
        const from = fromUnit.value;
        const to = toUnit.value;
        
        // Conversões básicas (valores aproximados)
        const conversions = {
            'saca_to_tonelada': 0.06,
            'tonelada_to_saca': 16.67,
            'saca_to_bushel': 2.20,
            'bushel_to_saca': 0.45,
            'tonelada_to_bushel': 36.74,
            'bushel_to_tonelada': 0.027
        };
        
        let convertedValue;
        const conversionKey = `${from}_to_${to}`;
        
        if (from === to) {
            convertedValue = value;
        } else if (conversions[conversionKey]) {
            convertedValue = value * conversions[conversionKey];
        } else {
            result.textContent = 'Conversão não disponível';
            return;
        }
        
        result.textContent = `= ${convertedValue.toFixed(2)} ${to}`;
    }
    
    inputValue.addEventListener('input', convert);
    fromUnit.addEventListener('change', convert);
    toUnit.addEventListener('change', convert);
}

// Copia o endereço da carteira
function copyAddress() {
    if (currentAccount) {
        navigator.clipboard.writeText(currentAccount).then(() => {
            showNotification('Endereço copiado!', 'success');
        });
    }
}

// Reseta o dashboard para o estado inicial
function resetDashboard() {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = `
        <div class="card main-card">
            <h2>Bem-vindo à Agri Finance Intelligence</h2>
            <p>Conecte sua carteira para acessar insights exclusivos do agronegócio.</p>
        </div>
    `;
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    // Remove notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

