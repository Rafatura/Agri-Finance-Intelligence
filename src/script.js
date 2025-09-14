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
async function addDashboardCards() {
    const dashboard = document.getElementById('dashboard');
    
    // Mostra loading
    dashboard.innerHTML = `
        <div class="card main-card">
            <h2>🔄 Carregando dados do mercado...</h2>
            <p>Buscando cotações em tempo real...</p>
        </div>
    `;
    
    try {
        // Busca dados das APIs
        const [localPrice, commodities, weather, exchange] = await Promise.all([
            window.marketAPI.calculateLocalSoybeanPrice(),
            window.marketAPI.getCommodityPrices(),
            window.marketAPI.getWeatherData(),
            window.marketAPI.getUSDToBRL()
        ]);

        const cardsHTML = `
            <div class="card">
                <h2>💰 Preços de Commodities</h2>
                ${commodities ? `
                    <p>Soja (CME): <span class="price">$${commodities.soybean.price}/bushel</span> 
                       <span class="change ${commodities.soybean.change >= 0 ? 'positive' : 'negative'}">
                           ${commodities.soybean.change >= 0 ? '+' : ''}${commodities.soybean.change}%
                       </span>
                    </p>
                    <p>Milho (CME): <span class="price">$${commodities.corn.price}/bushel</span>
                       <span class="change ${commodities.corn.change >= 0 ? 'positive' : 'negative'}">
                           ${commodities.corn.change >= 0 ? '+' : ''}${commodities.corn.change}%
                       </span>
                    </p>
                ` : '<p>Erro ao carregar dados de commodities</p>'}
                <p>USD/BRL: <span class="price">R$ ${exchange ? exchange.rate.toFixed(2) : '5.45'}</span></p>
                ${localPrice ? `
                    <div class="price-result">
                        <strong>Preço Local Soja: R$ ${localPrice.localPrice.toFixed(2)}/saca</strong>
                        <small>Atualizado: ${new Date(localPrice.lastUpdate).toLocaleTimeString('pt-BR')}</small>
                    </div>
                ` : '<div class="price-result"><strong>Erro no cálculo do preço local</strong></div>'}
            </div>
            
            <div class="card">
                <h2>🌤️ Inteligência Climática</h2>
                ${weather ? `
                    <p>Região: <span class="region">${weather.region.charAt(0).toUpperCase() + weather.region.slice(1)}</span></p>
                    <p>Condição atual: <span class="weather">${weather.current.condition}</span></p>
                    <p>Temperatura: <span class="temp">${weather.current.temperature}°C</span></p>
                    <p>Próximos 7 dias: <span class="forecast">${weather.forecast.next7days}</span></p>
                    <p>Impacto na safra: <span class="impact ${weather.forecast.cropImpact.includes('positivo') ? 'positive' : weather.forecast.cropImpact.includes('negativo') ? 'negative' : 'neutral'}">${weather.forecast.cropImpact}</span></p>
                    <small>Atualizado: ${new Date(weather.lastUpdate).toLocaleTimeString('pt-BR')}</small>
                ` : '<p>Erro ao carregar dados climáticos</p>'}
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
                <div class="conversion-rates">
                    <small>
                        <strong>Taxas de conversão:</strong><br>
                        1 saca = 60kg | 1 tonelada = 16.67 sacas | 1 bushel = 27.2kg
                    </small>
                </div>
            </div>
            
            <div class="card">
                <h2>🔗 Sua Carteira Web3</h2>
                <p>Endereço: <span class="wallet-address">${currentAccount}</span></p>
                <p>Rede: <span class="network">Ethereum Mainnet</span></p>
                <button class="btn-secondary" onclick="copyAddress()">📋 Copiar Endereço</button>
                <button class="btn-secondary" onclick="refreshData()" style="margin-left: 10px;">🔄 Atualizar Dados</button>
            </div>
            
            <div class="card">
                <h2>📈 Análise de Mercado</h2>
                ${commodities ? `
                    <p>Volume Soja: <span class="volume">${commodities.soybean.volume.toLocaleString()} contratos</span></p>
                    <p>Volume Milho: <span class="volume">${commodities.corn.volume.toLocaleString()} contratos</span></p>
                    <div class="market-summary">
                        <strong>Resumo:</strong> 
                        ${commodities.soybean.change >= 0 ? 
                            'Mercado em alta, condições favoráveis para vendas.' : 
                            'Mercado em baixa, considere aguardar melhores preços.'
                        }
                    </div>
                ` : '<p>Dados de análise indisponíveis</p>'}
            </div>
        `;
        
        dashboard.innerHTML = cardsHTML;
        
        // Adiciona funcionalidade ao conversor
        setupConverter();
        
        showNotification('Dados atualizados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        dashboard.innerHTML = `
            <div class="card main-card">
                <h2>❌ Erro ao carregar dados</h2>
                <p>Não foi possível conectar com as APIs de mercado. Tente novamente em alguns instantes.</p>
                <button class="btn-primary" onclick="loadDashboardData()">🔄 Tentar Novamente</button>
            </div>
        `;
        showNotification('Erro ao carregar dados do mercado', 'error');
    }
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


// Função para atualizar dados manualmente
async function refreshData() {
    showNotification('Atualizando dados...', 'info');
    
    // Limpa o cache para forçar nova busca
    if (window.marketAPI) {
        window.marketAPI.cache.clear();
    }
    
    // Recarrega os dados do dashboard
    await addDashboardCards();
}

