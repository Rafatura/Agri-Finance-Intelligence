// Módulo de APIs para dados de mercado
class MarketDataAPI {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    // Verifica se os dados estão em cache e ainda válidos
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    // Armazena dados no cache
    setCachedData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // Busca cotação USD/BRL
    async getUSDToBRL() {
        const cacheKey = 'usd_brl';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            // Usando API gratuita do ExchangeRate-API
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();
            
            const rate = data.rates.BRL;
            const result = {
                rate: rate,
                timestamp: new Date().toISOString(),
                source: 'ExchangeRate-API'
            };
            
            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erro ao buscar câmbio USD/BRL:', error);
            // Retorna valor de fallback
            return {
                rate: 5.45,
                timestamp: new Date().toISOString(),
                source: 'Fallback',
                error: true
            };
        }
    }

    // Busca dados de commodities (simulado com dados realistas)
    async getCommodityPrices() {
        const cacheKey = 'commodity_prices';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            // Por enquanto, vamos simular dados realistas
            // Em produção, isso seria conectado a APIs como Alpha Vantage, Quandl, ou CME
            const result = {
                soybean: {
                    price: this.generateRealisticPrice(11.50, 0.05), // $11.50 base com variação
                    unit: 'USD/bushel',
                    change: this.generateChange(),
                    volume: Math.floor(Math.random() * 100000) + 50000,
                    lastUpdate: new Date().toISOString()
                },
                corn: {
                    price: this.generateRealisticPrice(4.25, 0.03),
                    unit: 'USD/bushel',
                    change: this.generateChange(),
                    volume: Math.floor(Math.random() * 80000) + 40000,
                    lastUpdate: new Date().toISOString()
                },
                wheat: {
                    price: this.generateRealisticPrice(5.80, 0.04),
                    unit: 'USD/bushel',
                    change: this.generateChange(),
                    volume: Math.floor(Math.random() * 60000) + 30000,
                    lastUpdate: new Date().toISOString()
                }
            };

            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erro ao buscar preços de commodities:', error);
            return null;
        }
    }

    // Busca prêmios de portos (simulado)
    async getPortPremiums() {
        const cacheKey = 'port_premiums';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const result = {
                paranagua: {
                    soybean: this.generateRealisticPrice(0.80, 0.10),
                    corn: this.generateRealisticPrice(0.65, 0.08),
                    lastUpdate: new Date().toISOString()
                },
                santos: {
                    soybean: this.generateRealisticPrice(0.75, 0.09),
                    corn: this.generateRealisticPrice(0.60, 0.07),
                    lastUpdate: new Date().toISOString()
                },
                rio_grande: {
                    soybean: this.generateRealisticPrice(0.85, 0.11),
                    corn: this.generateRealisticPrice(0.70, 0.09),
                    lastUpdate: new Date().toISOString()
                }
            };

            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erro ao buscar prêmios de portos:', error);
            return null;
        }
    }

    // Busca dados climáticos
    async getWeatherData(region = 'centro-oeste') {
        const cacheKey = `weather_${region}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            // Simulação de dados climáticos realistas
            const conditions = ['Ensolarado', 'Parcialmente nublado', 'Chuvas leves', 'Chuvas moderadas', 'Chuvas intensas'];
            const impacts = ['Muito positivo', 'Positivo', 'Neutro', 'Negativo', 'Muito negativo'];
            
            const result = {
                region: region,
                current: {
                    condition: conditions[Math.floor(Math.random() * conditions.length)],
                    temperature: Math.floor(Math.random() * 15) + 20, // 20-35°C
                    humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
                    precipitation: Math.floor(Math.random() * 50) // 0-50mm
                },
                forecast: {
                    next7days: conditions[Math.floor(Math.random() * conditions.length)],
                    next15days: conditions[Math.floor(Math.random() * conditions.length)],
                    cropImpact: impacts[Math.floor(Math.random() * impacts.length)]
                },
                lastUpdate: new Date().toISOString(),
                source: 'Weather Simulation'
            };

            this.setCachedData(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Erro ao buscar dados climáticos:', error);
            return null;
        }
    }

    // Calcula preço local da soja
    async calculateLocalSoybeanPrice() {
        try {
            const [commodities, premiums, exchange] = await Promise.all([
                this.getCommodityPrices(),
                this.getPortPremiums(),
                this.getUSDToBRL()
            ]);

            if (!commodities || !premiums || !exchange) {
                throw new Error('Dados insuficientes para cálculo');
            }

            const soybeanPrice = commodities.soybean.price; // USD/bushel
            const premium = premiums.paranagua.soybean; // USD/bushel
            const exchangeRate = exchange.rate; // BRL/USD
            
            // Conversão: bushel para saca (1 bushel ≈ 0.45 sacas)
            const bushelsPerSaca = 0.45;
            const pricePerSaca = (soybeanPrice + premium) / bushelsPerSaca * exchangeRate;

            return {
                localPrice: pricePerSaca,
                breakdown: {
                    cmePrice: soybeanPrice,
                    premium: premium,
                    exchangeRate: exchangeRate,
                    pricePerSaca: pricePerSaca
                },
                unit: 'BRL/saca',
                lastUpdate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erro ao calcular preço local:', error);
            return null;
        }
    }

    // Gera preço realista com variação
    generateRealisticPrice(basePrice, volatility) {
        const variation = (Math.random() - 0.5) * 2 * volatility;
        return Math.round((basePrice + variation) * 100) / 100;
    }

    // Gera mudança percentual realista
    generateChange() {
        const change = (Math.random() - 0.5) * 0.1; // -5% a +5%
        return Math.round(change * 10000) / 100; // 2 casas decimais
    }
}

// Instância global da API
window.marketAPI = new MarketDataAPI();

