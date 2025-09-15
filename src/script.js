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
    if (currentAccount) {
        navigator.clipboard.writeText(currentAccount).then(() => {
            showNotification('Endereço copiado!', 'success');
        });
    }
}

// Reseta o dashboard para o estado inicial
fun        <section id="dashboard" class="dashboard-grid container">
            <!-- Cards do painel serão injetados aqui -->
            <div class="card main-card">
                <h2>Bem-vindo à Agri Finance Intelligence</h2>
                <p>Conecte sua carteira para acessar insights exclusivos do agronegócio.</p>
                <p><small>Experimente o conversor de métricas abaixo mesmo sem conectar a carteira!</small></p>
            </div>
            
            <!-- Conversor sempre disponível -->
            <div class="card converter-card">
                <h2>📊 Sistema de Conversão de Métricas</h2>
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
        </section> showNotification(message, type = 'info') {
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

