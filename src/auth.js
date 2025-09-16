// Sistema de Autenticação Web2 + Web3 Híbrido
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.web3Connected = false;
        this.web3Address = null;
        
        // Simula um banco de dados local (em produção seria um backend real)
        this.users = JSON.parse(localStorage.getItem('agri_users') || '[]');
        
        // Verifica se há sessão ativa
        this.checkSession();
    }

    // Verifica sessão ativa
    checkSession() {
        const session = localStorage.getItem('agri_session');
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                if (sessionData.expires > Date.now()) {
                    this.currentUser = sessionData.user;
                    this.isLoggedIn = true;
                    return true;
                }
            } catch (error) {
                console.error('Erro ao verificar sessão:', error);
            }
        }
        this.logout();
        return false;
    }

    // Cadastro de novo usuário
    register(email, password, name) {
        // Validações básicas
        if (!email || !password || !name) {
            throw new Error('Todos os campos são obrigatórios');
        }

        if (password.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('E-mail inválido');
        }

        // Verifica se usuário já existe
        if (this.users.find(user => user.email === email)) {
            throw new Error('E-mail já cadastrado');
        }

        // Cria novo usuário
        const newUser = {
            id: Date.now().toString(),
            email: email,
            name: name,
            password: this.hashPassword(password), // Em produção usar bcrypt
            createdAt: new Date().toISOString(),
            plan: 'free', // free, premium, enterprise
            web3Address: null
        };

        this.users.push(newUser);
        localStorage.setItem('agri_users', JSON.stringify(this.users));

        // Faz login automático
        this.login(email, password);
        
        return { success: true, user: this.sanitizeUser(newUser) };
    }

    // Login do usuário
    login(email, password) {
        const user = this.users.find(u => u.email === email);
        
        if (!user) {
            throw new Error('E-mail não encontrado');
        }

        if (user.password !== this.hashPassword(password)) {
            throw new Error('Senha incorreta');
        }

        // Cria sessão
        this.currentUser = user;
        this.isLoggedIn = true;
        
        const sessionData = {
            user: this.sanitizeUser(user),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
        };
        
        localStorage.setItem('agri_session', JSON.stringify(sessionData));
        
        return { success: true, user: this.sanitizeUser(user) };
    }

    // Logout
    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.web3Connected = false;
        this.web3Address = null;
        localStorage.removeItem('agri_session');
    }

    // Conecta carteira Web3 (opcional)
    async connectWeb3() {
        if (!this.isLoggedIn) {
            throw new Error('Faça login primeiro');
        }

        try {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                
                if (accounts.length > 0) {
                    this.web3Address = accounts[0];
                    this.web3Connected = true;
                    
                    // Atualiza usuário com endereço Web3
                    if (this.currentUser) {
                        this.currentUser.web3Address = accounts[0];
                        this.updateUserInStorage();
                    }
                    
                    return { success: true, address: accounts[0] };
                }
            } else {
                // Redireciona para instalação do MetaMask
                window.open('https://metamask.io/download/', '_blank');
                throw new Error('MetaMask não detectado');
            }
        } catch (error) {
            console.error('Erro ao conectar Web3:', error);
            throw error;
        }
    }

    // Desconecta Web3
    disconnectWeb3() {
        this.web3Connected = false;
        this.web3Address = null;
        
        if (this.currentUser) {
            this.currentUser.web3Address = null;
            this.updateUserInStorage();
        }
    }

    // Atualiza usuário no localStorage
    updateUserInStorage() {
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            localStorage.setItem('agri_users', JSON.stringify(this.users));
        }
    }

    // Remove dados sensíveis do usuário
    sanitizeUser(user) {
        const { password, ...sanitized } = user;
        return sanitized;
    }

    // Hash simples da senha (em produção usar bcrypt)
    hashPassword(password) {
        // Implementação simples para demo - em produção usar bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converte para 32bit
        }
        return hash.toString();
    }

    // Valida e-mail
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Getters
    getCurrentUser() {
        return this.currentUser ? this.sanitizeUser(this.currentUser) : null;
    }

    getIsLoggedIn() {
        return this.isLoggedIn;
    }

    getWeb3Status() {
        return {
            connected: this.web3Connected,
            address: this.web3Address
        };
    }

    // Demo: cria usuários de exemplo
    createDemoUsers() {
        if (this.users.length === 0) {
            const demoUsers = [
                {
                    id: '1',
                    email: 'demo@agrifinance.com',
                    name: 'Usuário Demo',
                    password: this.hashPassword('123456'),
                    createdAt: new Date().toISOString(),
                    plan: 'premium',
                    web3Address: null
                },
                {
                    id: '2',
                    email: 'produtor@fazenda.com',
                    name: 'João Produtor',
                    password: this.hashPassword('fazenda123'),
                    createdAt: new Date().toISOString(),
                    plan: 'free',
                    web3Address: null
                }
            ];
            
            this.users = demoUsers;
            localStorage.setItem('agri_users', JSON.stringify(this.users));
        }
    }
}

// Instância global
window.authSystem = new AuthSystem();

// Cria usuários demo se não existirem
window.authSystem.createDemoUsers();

