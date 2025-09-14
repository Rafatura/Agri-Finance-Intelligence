// Sistema Avançado de Conversão de Métricas Agrícolas
class AgricultureMetrics {
    constructor() {
        // Fatores de conversão base (em kg)
        this.conversionFactors = {
            // Soja
            soja: {
                saca: 60,
                tonelada: 1000,
                bushel: 27.216, // 1 bushel de soja = 27.216 kg
                arroba: 15,
                kg: 1
            },
            // Milho
            milho: {
                saca: 60,
                tonelada: 1000,
                bushel: 25.401, // 1 bushel de milho = 25.401 kg
                arroba: 15,
                kg: 1
            },
            // Trigo
            trigo: {
                saca: 60,
                tonelada: 1000,
                bushel: 27.216,
                arroba: 15,
                kg: 1
            },
            // Café
            cafe: {
                saca: 60,
                tonelada: 1000,
                arroba: 15,
                kg: 1
            },
            // Açúcar
            acucar: {
                saca: 50, // Saca de açúcar é tradicionalmente 50kg
                tonelada: 1000,
                arroba: 15,
                kg: 1
            }
        };

        // Preços base para cálculos financeiros (serão atualizados via API)
        this.basePrices = {
            soja: { value: 182.50, unit: 'BRL/saca' },
            milho: { value: 95.30, unit: 'BRL/saca' },
            trigo: { value: 145.80, unit: 'BRL/saca' },
            cafe: { value: 890.00, unit: 'BRL/saca' },
            acucar: { value: 78.50, unit: 'BRL/saca' }
        };

        // Produtividade média por hectare (sacas/ha)
        this.productivity = {
            soja: { min: 45, avg: 55, max: 70 },
            milho: { min: 120, avg: 150, max: 200 },
            trigo: { min: 35, avg: 45, max: 60 },
            cafe: { min: 20, avg: 30, max: 50 },
            acucar: { min: 80, avg: 100, max: 130 }
        };

        // Insumos comuns e seus preços (R$/unidade)
        this.inputs = {
            fertilizante_npk: { price: 2800, unit: 'R$/tonelada' },
            semente_soja: { price: 180, unit: 'R$/saca' },
            semente_milho: { price: 450, unit: 'R$/saca' },
            defensivo_herbicida: { price: 85, unit: 'R$/litro' },
            defensivo_fungicida: { price: 120, unit: 'R$/litro' },
            combustivel_diesel: { price: 5.80, unit: 'R$/litro' }
        };
    }

    // Converte entre unidades da mesma commodity
    convert(value, fromUnit, toUnit, commodity = 'soja') {
        if (!this.conversionFactors[commodity]) {
            throw new Error(`Commodity ${commodity} não suportada`);
        }

        const factors = this.conversionFactors[commodity];
        
        if (!factors[fromUnit] || !factors[toUnit]) {
            throw new Error(`Unidade não suportada para ${commodity}`);
        }

        // Converte para kg primeiro, depois para a unidade desejada
        const valueInKg = value * factors[fromUnit];
        const convertedValue = valueInKg / factors[toUnit];

        return {
            value: Math.round(convertedValue * 100) / 100,
            fromUnit,
            toUnit,
            commodity,
            calculation: `${value} ${fromUnit} = ${valueInKg}kg = ${convertedValue.toFixed(2)} ${toUnit}`
        };
    }

    // Calcula valor financeiro
    calculateValue(quantity, unit, commodity = 'soja') {
        const basePrice = this.basePrices[commodity];
        if (!basePrice) {
            throw new Error(`Preço não disponível para ${commodity}`);
        }

        // Converte para sacas (unidade padrão de preço)
        const inSacas = this.convert(quantity, unit, 'saca', commodity);
        const totalValue = inSacas.value * basePrice.value;

        return {
            quantity: inSacas.value,
            unit: 'sacas',
            pricePerSaca: basePrice.value,
            totalValue: Math.round(totalValue * 100) / 100,
            currency: 'BRL',
            commodity
        };
    }

    // Simulador de barter (troca)
    calculateBarter(giveQuantity, giveUnit, giveCommodity, receiveCommodity) {
        // Calcula valor do que está sendo dado
        const giveValue = this.calculateValue(giveQuantity, giveUnit, giveCommodity);
        
        // Calcula quantas sacas da commodity desejada pode receber
        const receivePrice = this.basePrices[receiveCommodity];
        if (!receivePrice) {
            throw new Error(`Preço não disponível para ${receiveCommodity}`);
        }

        const receiveSacas = giveValue.totalValue / receivePrice.value;

        return {
            give: {
                quantity: giveQuantity,
                unit: giveUnit,
                commodity: giveCommodity,
                value: giveValue.totalValue
            },
            receive: {
                quantity: Math.round(receiveSacas * 100) / 100,
                unit: 'sacas',
                commodity: receiveCommodity,
                value: giveValue.totalValue
            },
            exchangeRate: `1 saca de ${giveCommodity} = ${(receivePrice.value / giveValue.pricePerSaca).toFixed(3)} sacas de ${receiveCommodity}`
        };
    }

    // Calculadora de produtividade
    calculateProductivity(area, production, unit, commodity = 'soja') {
        const productionInSacas = this.convert(production, unit, 'saca', commodity);
        const productivity = productionInSacas.value / area;
        const avgProductivity = this.productivity[commodity];

        let performance = 'média';
        if (productivity >= avgProductivity.max) performance = 'excelente';
        else if (productivity >= avgProductivity.avg) performance = 'boa';
        else if (productivity < avgProductivity.min) performance = 'baixa';

        return {
            area,
            production: productionInSacas.value,
            productivity: Math.round(productivity * 100) / 100,
            unit: 'sacas/ha',
            performance,
            benchmark: avgProductivity,
            commodity
        };
    }

    // Calculadora de custo de insumos
    calculateInputCost(inputType, quantity, unit = 'tonelada') {
        const input = this.inputs[inputType];
        if (!input) {
            throw new Error(`Insumo ${inputType} não encontrado`);
        }

        // Conversão simples para toneladas se necessário
        let adjustedQuantity = quantity;
        if (unit === 'kg' && input.unit.includes('tonelada')) {
            adjustedQuantity = quantity / 1000;
        } else if (unit === 'litro' && input.unit.includes('litro')) {
            adjustedQuantity = quantity;
        }

        const totalCost = adjustedQuantity * input.price;

        return {
            inputType,
            quantity: adjustedQuantity,
            unit: input.unit.split('/')[1],
            pricePerUnit: input.price,
            totalCost: Math.round(totalCost * 100) / 100,
            currency: 'BRL'
        };
    }

    // Simulador de rentabilidade
    calculateProfitability(area, commodity, productivity, inputCosts = []) {
        const productionSacas = area * productivity;
        const revenue = productionSacas * this.basePrices[commodity].value;
        
        const totalInputCost = inputCosts.reduce((sum, cost) => sum + cost.totalCost, 0);
        const profit = revenue - totalInputCost;
        const profitMargin = (profit / revenue) * 100;

        return {
            area,
            commodity,
            productivity,
            production: productionSacas,
            revenue: Math.round(revenue * 100) / 100,
            inputCosts: totalInputCost,
            profit: Math.round(profit * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            revenuePerHa: Math.round((revenue / area) * 100) / 100,
            profitPerHa: Math.round((profit / area) * 100) / 100
        };
    }

    // Atualiza preços com dados da API
    updatePrices(apiData) {
        if (apiData.localPrice) {
            this.basePrices.soja.value = apiData.localPrice.localPrice;
        }
        // Aqui podemos adicionar mais atualizações conforme APIs disponíveis
    }

    // Lista todas as commodities disponíveis
    getAvailableCommodities() {
        return Object.keys(this.conversionFactors);
    }

    // Lista todas as unidades para uma commodity
    getAvailableUnits(commodity) {
        return Object.keys(this.conversionFactors[commodity] || {});
    }

    // Lista todos os insumos disponíveis
    getAvailableInputs() {
        return Object.keys(this.inputs);
    }
}

// Instância global
window.agriMetrics = new AgricultureMetrics();

