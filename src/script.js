// Script principal da Agri Finance Intelligence
// Sistema híbrido Web2 + Web3

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Inicializa a aplicação
function initializeApp() {
    updateNavigation();
    setupAuthModal();
    
    // Verifica se usuário já está logado
    if (window.authSystem.getIsLoggedIn()) {
        showDashboard();
    } else {
        showWelcomeScreen();
    }
}

// Atualiza a navegação baseada no estado de login
function updateNavigation() {
    const nav = document.getElementById('mainNav');
    
    if (window.authSystem.getIsLoggedIn()) {
        const user = window.authSystem.getCurrentUser();
        const web3Status = window.authSystem.getWeb3Status();
        
        nav.innerHTML = `
            <div class="nav-user">
                <div class="user-info">
                    <span class="user-name">${user.name}</span>
                    ${web3Status.connected ? 
                        `<small>Web3: ${web3Status.address.substring(0, 6)}...${web3Status.address.substring(38)}</small>` : 
                        '<small>Web2 Mode</small>'
                    }
                </div>
                <div class="nav-buttons">
                    ${!web3Status.connected ? 
                        '<button class="btn-secondary" onclick="connectWeb3()">Conectar Web3</button>' : 
                        '<button class="btn-secondary" onclick="disconnectWeb3()">Desconectar Web3</button>'
                    }
                    <button class="btn-primary" onclick="logout()">Sair</button>
                </div>
            </div>
        `;
    } else {
        nav.innerHTML = `
            <div class="nav-buttons">
                <button class="btn-secondary" onclick="openAuthModal('login')">Login</button>
                <button class="btn-primary" onclick="openAuthModal('register')">Cadastro</button>
            </div>
        `;
    }
}

// Configura o modal de autenticação
function setupAuthModal() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close');
    
    // Fecha modal ao clicar no X
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    // Fecha modal ao clicar fora dele
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// Abre modal de autenticação
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    modal.style.display = 'block';
    switchAuthTab(tab);
}

// Alterna entre abas de login/cadastro
function switchAuthTab(tab) {
    // Remove active de todas as abas
    document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    // Ativa a aba selecionada
    document.querySelector(`[onclick="switchAuthTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

// Manipula login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const result = window.authSystem.login(email, password);
        
        if (result.success) {
            showNotification(`Bem-vindo, ${result.user.name}!`, 'success');
            document.getElementById('authModal').style.display = 'none';
            updateNavigation();
            showDashboard();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Manipula cadastro
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const result = window.authSystem.register(email, password, name);
        
        if (result.success) {
            showNotification(`Conta criada com sucesso! Bem-vindo, ${result.user.name}!`, 'success');
            document.getElementById('authModal').style.display = 'none';
            updateNavigation();
            showDashboard();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Conecta Web3 (opcional)
async function connectWeb3() {
    try {
        const result = await window.authSystem.connectWeb3();
        
        if (result.success) {
            showNotification(`Web3 conectado: ${result.address.substring(0, 6)}...${result.address.substring(38)}`, 'success');
            updateNavigation();
            // Recarrega dashboard com recursos Web3
            showDashboard();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Desconecta Web3
function disconnectWeb3() {
    window.authSystem.disconnectWeb3();
    showNotification('Web3 desconectado', 'info');
    updateNavigation();
    showDashboard(); // Recarrega dashboard sem recursos Web3
}

// Logout
function logout() {
    window.authSystem.logout();
    showNotification('Logout realizado com sucesso', 'info');
    updateNavigation();
    showWelcomeScreen();
}

// Mostra tela de boas-vindas
function showWelcomeScreen() {
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

// Mostra dashboard
async function showDashboard() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'grid';
    
    // Carrega dados do dashboard
    await loadDashboardData();
}

// Carrega dados do dashboard
async function loadDashboardData() {
    const dashboard = document.getElementById('dashboard');
    const user = window.authSystem.getCurrentUser();
    const web3Status = window.authSystem.getWeb3Status();
    
    // Limpa dashboard
    dashboard.innerHTML = '';
    
    try {
        // Card de boas-vindas
        dashboard.innerHTML += `
            <div class="card main-card">
                <h2>Olá, ${user.name}! 👋</h2>
                <p>Bem-vindo ao seu painel de inteligência do agronegócio.</p>
                <p><small>Plano: <strong>${user.plan.toUpperCase()}</strong> | 
                   Modo: <strong>${web3Status.connected ? 'Web3' : 'Web2'}</strong></small></p>
            </div>
        `;
        
        // Busca dados das APIs
        showNotification('Carregando dados de mercado...', 'info');
        
        const [commodities, exchange, weather, localPrice] = await Promise.all([
            window.marketAPI.getCommodityPrices(),
            window.marketAPI.getUSDToBRL(),
            window.marketAPI.getWeatherData(),
            window.marketAPI.calculateLocalSoybeanPrice()
        ]);
        
        // Card de preços de commodities
        if (commodities && exchange && localPrice) {
            dashboard.innerHTML += `
                <div class="card">
                    <h2>💰 Preços de Commodities</h2>
                    <div class="price-grid">
                        <div class="price-item">
                            <strong>Soja CME:</strong> $${commodities.soybean.price}/bushel
                            <span class="change ${commodities.soybean.change >= 0 ? 'positive' : 'negative'}">
                                ${commodities.soybean.change >= 0 ? '+' : ''}${commodities.soybean.change}%
                            </span>
                        </div>
                        <div class="price-item">
                            <strong>Câmbio:</strong> R$ ${exchange.rate.toFixed(2)}/USD
                        </div>
                        <div class="price-item">
                            <strong>Soja Local:</strong> R$ ${localPrice.localPrice.toFixed(2)}/saca
                        </div>
                        <div class="price-item">
                            <strong>Volume:</strong> <span class="volume">${commodities.soybean.volume.toLocaleString()}</span> contratos
                        </div>
                    </div>
                    <div class="market-summary">
                        <strong>Análise:</strong> Mercado ${commodities.soybean.change >= 0 ? 'em alta' : 'em baixa'} 
                        com volume ${commodities.soybean.volume > 70000 ? 'elevado' : 'moderado'}.
                    </div>
                    <small>Atualizado: ${new Date(commodities.soybean.lastUpdate).toLocaleTimeString('pt-BR')}</small>
                </div>
            `;
        }
        
        // Card de previsão climática
        if (weather) {
            dashboard.innerHTML += `
                <div class="card">
                    <h2>🌤️ Inteligência Climática</h2>
                    <div class="weather-info">
                        <p><strong>Região:</strong> <span class="region">${weather.region}</span></p>
                        <p><strong>Condição atual:</strong> ${weather.current.condition}</p>
                        <p><strong>Temperatura:</strong> <span class="temp">${weather.current.temperature}°C</span></p>
                        <p><strong>Umidade:</strong> ${weather.current.humidity}%</p>
                        <p><strong>Precipitação:</strong> ${weather.current.precipitation}mm</p>
                        <p><strong>Previsão 7 dias:</strong> <span class="forecast">${weather.forecast.next7days}</span></p>
                        <p><strong>Impacto na safra:</strong> <span class="forecast">${weather.forecast.cropImpact}</span></p>
                    </div>
                    <small>Atualizado: ${new Date(weather.lastUpdate).toLocaleTimeString('pt-BR')}</small>
                </div>
            `;
        }
        
        // Sistema de conversão de métricas (sempre disponível)
        dashboard.innerHTML += `
            <div class="card converter-card">
                <h2>📊 Sistema de Conversão Avançado</h2>
                <div class="converter-tabs">
                    <button class="tab-btn active" onclick="switchTab('basic')">Conversão Básica</button>
                    <button class="tab-btn" onclick="switchTab('barter')">Simulador Barter</button>
                    <button class="tab-btn" onclick="switchTab('productivity')">Produtividade</button>
                </div>
                
                <!-- Conversão Básica -->
                <div id="basic-tab" class="tab-content active">
                    <div class="converter">
                        <select id="commodity">
                            <option value="soja">Soja</option>
                            <option value="milho">Milho</option>
                            <option value="trigo">Trigo</option>
                            <option value="cafe">Café</option>
                            <option value="acucar">Açúcar</option>
                        </select>
                        <input type="number" id="inputValue" placeholder="Quantidade" />
                        <select id="fromUnit">
                            <option value="saca">Sacas</option>
                            <option value="tonelada">Toneladas</option>
                            <option value="bushel">Bushels</option>
                            <option value="arroba">Arrobas</option>
                            <option value="kg">Quilos</option>
                        </select>
                        <span>→</span>
                        <select id="toUnit">
                            <option value="tonelada">Toneladas</option>
                            <option value="saca">Sacas</option>
                            <option value="bushel">Bushels</option>
                            <option value="arroba">Arrobas</option>
                            <option value="kg">Quilos</option>
                        </select>
                        <div id="conversionResult"></div>
                        <div id="valueResult"></div>
                    </div>
                </div>
                
                <!-- Simulador Barter -->
                <div id="barter-tab" class="tab-content">
                    <div class="barter-simulator">
                        <div class="barter-section">
                            <h4>Dar:</h4>
                            <input type="number" id="barterGiveQty" placeholder="Quantidade" />
                            <select id="barterGiveUnit">
                                <option value="saca">Sacas</option>
                                <option value="tonelada">Toneladas</option>
                            </select>
                            <select id="barterGiveCommodity">
                                <option value="soja">Soja</option>
                                <option value="milho">Milho</option>
                                <option value="trigo">Trigo</option>
                            </select>
                        </div>
                        <div class="barter-arrow">⇄</div>
                        <div class="barter-section">
                            <h4>Receber:</h4>
                            <select id="barterReceiveCommodity">
                                <option value="milho">Milho</option>
                                <option value="soja">Soja</option>
                                <option value="trigo">Trigo</option>
                            </select>
                        </div>
                        <div id="barterResult"></div>
                    </div>
                </div>
                
                <!-- Calculadora de Produtividade -->
                <div id="productivity-tab" class="tab-content">
                    <div class="productivity-calculator">
                        <input type="number" id="prodArea" placeholder="Área (hectares)" />
                        <input type="number" id="prodQuantity" placeholder="Produção" />
                        <select id="prodUnit">
                            <option value="saca">Sacas</option>
                            <option value="tonelada">Toneladas</option>
                        </select>
                        <select id="prodCommodity">
                            <option value="soja">Soja</option>
                            <option value="milho">Milho</option>
                            <option value="trigo">Trigo</option>
                        </select>
                        <div id="productivityResult"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Card da carteira (se Web3 conectado)
        if (web3Status.connected) {
            dashboard.innerHTML += `
                <div class="card">
                    <h2>🔗 Carteira Web3</h2>
                    <p><strong>Endereço:</strong> ${web3Status.address}</p>
                    <p><strong>Rede:</strong> <span class="network">Ethereum Mainnet</span></p>
                    <button class="btn-secondary" onclick="copyAddress()">Copiar Endereço</button>
                    <button class="btn-secondary" onclick="disconnectWeb3()">Desconectar</button>
                </div>
            `;
        }
        
        // Configura os conversores
        setupConverter();
        
        showNotification('Dashboard carregado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification('Erro ao carregar alguns dados do mercado', 'error');
    }
}

// Configura o sistema avançado de conversão
function setupConverter() {
    // Atualiza preços no sistema de métricas
    if (window.agriMetrics && window.marketAPI) {
        window.marketAPI.calculateLocalSoybeanPrice().then(localPrice => {
            if (localPrice) {
                window.agriMetrics.updatePrices({ localPrice });
            }
        });
    }

    // Conversão básica
    const inputValue = document.getElementById('inputValue');
    const commodity = document.getElementById('commodity');
    const fromUnit = document.getElementById('fromUnit');
    const toUnit = document.getElementById('toUnit');
    const conversionResult = document.getElementById('conversionResult');
    const valueResult = document.getElementById('valueResult');

    function performBasicConversion() {
        const value = parseFloat(inputValue.value);
        if (isNaN(value) || value <= 0) {
            conversionResult.textContent = '';
            valueResult.textContent = '';
            return;
        }

        try {
            const conversion = window.agriMetrics.convert(
                value, 
                fromUnit.value, 
                toUnit.value, 
                commodity.value
            );
            
            conversionResult.textContent = `= ${conversion.value} ${conversion.toUnit}`;
            
            // Calcula valor financeiro
            const financialValue = window.agriMetrics.calculateValue(
                value, 
                fromUnit.value, 
                commodity.value
            );
            
            valueResult.innerHTML = `
                <div class="financial-result">
                    <strong>Valor: R$ ${financialValue.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                    <small>(${financialValue.quantity.toFixed(2)} sacas × R$ ${financialValue.pricePerSaca})</small>
                </div>
            `;
        } catch (error) {
            conversionResult.textContent = 'Erro na conversão';
            valueResult.textContent = '';
        }
    }

    if (inputValue) inputValue.addEventListener('input', performBasicConversion);
    if (commodity) commodity.addEventListener('change', performBasicConversion);
    if (fromUnit) fromUnit.addEventListener('change', performBasicConversion);
    if (toUnit) toUnit.addEventListener('change', performBasicConversion);

    // Simulador Barter
    const barterGiveQty = document.getElementById('barterGiveQty');
    const barterGiveUnit = document.getElementById('barterGiveUnit');
    const barterGiveCommodity = document.getElementById('barterGiveCommodity');
    const barterReceiveCommodity = document.getElementById('barterReceiveCommodity');
    const barterResult = document.getElementById('barterResult');

    function performBarterCalculation() {
        const qty = parseFloat(barterGiveQty.value);
        if (isNaN(qty) || qty <= 0) {
            barterResult.textContent = '';
            return;
        }

        try {
            const barter = window.agriMetrics.calculateBarter(
                qty,
                barterGiveUnit.value,
                barterGiveCommodity.value,
                barterReceiveCommodity.value
            );

            barterResult.innerHTML = `
                <div class="barter-result">
                    <p><strong>Você receberia:</strong></p>
                    <p class="barter-receive">${barter.receive.quantity} sacas de ${barter.receive.commodity}</p>
                    <p><strong>Taxa de câmbio:</strong></p>
                    <small>${barter.exchangeRate}</small>
                    <p><strong>Valor da operação:</strong> R$ ${barter.give.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
            `;
        } catch (error) {
            barterResult.textContent = 'Erro no cálculo de barter';
        }
    }

    if (barterGiveQty) barterGiveQty.addEventListener('input', performBarterCalculation);
    if (barterGiveUnit) barterGiveUnit.addEventListener('change', performBarterCalculation);
    if (barterGiveCommodity) barterGiveCommodity.addEventListener('change', performBarterCalculation);
    if (barterReceiveCommodity) barterReceiveCommodity.addEventListener('change', performBarterCalculation);

    // Calculadora de Produtividade
    const prodArea = document.getElementById('prodArea');
    const prodQuantity = document.getElementById('prodQuantity');
    const prodUnit = document.getElementById('prodUnit');
    const prodCommodity = document.getElementById('prodCommodity');
    const productivityResult = document.getElementById('productivityResult');

    function performProductivityCalculation() {
        const area = parseFloat(prodArea.value);
        const quantity = parseFloat(prodQuantity.value);
        
        if (isNaN(area) || isNaN(quantity) || area <= 0 || quantity <= 0) {
            productivityResult.textContent = '';
            return;
        }

        try {
            const productivity = window.agriMetrics.calculateProductivity(
                area,
                quantity,
                prodUnit.value,
                prodCommodity.value
            );

            const performanceColor = {
                'excelente': '#00ff80',
                'boa': '#4fc3f7',
                'média': '#ff9800',
                'baixa': '#ff6b6b'
            };

            productivityResult.innerHTML = `
                <div class="productivity-result">
                    <p><strong>Produtividade:</strong> <span style="color: ${performanceColor[productivity.performance]}">${productivity.productivity} sacas/ha</span></p>
                    <p><strong>Performance:</strong> <span style="color: ${performanceColor[productivity.performance]}">${productivity.performance.toUpperCase()}</span></p>
                    <div class="benchmark">
                        <small>
                            <strong>Benchmark ${productivity.commodity}:</strong><br>
                            Mínimo: ${productivity.benchmark.min} | Média: ${productivity.benchmark.avg} | Máximo: ${productivity.benchmark.max} sacas/ha
                        </small>
                    </div>
                </div>
            `;
        } catch (error) {
            productivityResult.textContent = 'Erro no cálculo de produtividade';
        }
    }

    if (prodArea) prodArea.addEventListener('input', performProductivityCalculation);
    if (prodQuantity) prodQuantity.addEventListener('input', performProductivityCalculation);
    if (prodUnit) prodUnit.addEventListener('change', performProductivityCalculation);
    if (prodCommodity) prodCommodity.addEventListener('change', performProductivityCalculation);
}

// Função para alternar entre abas
function switchTab(tabName) {
    // Remove active de todas as abas
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Ativa a aba selecionada
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Copia o endereço da carteira
function copyAddress() {
    const web3Status = window.authSystem.getWeb3Status();
    if (web3Status.connected) {
        navigator.clipboard.writeText(web3Status.address).then(() => {
            showNotification('Endereço copiado!', 'success');
        });
    }
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    // Remove notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Estilos da notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;

    // Cores baseadas no tipo
    const colors = {
        success: '#00ff80',
        error: '#ff6b6b',
        warning: '#ff9800',
        info: '#4fc3f7'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Remove após 4 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Adiciona estilos de animação para notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

