document.addEventListener('DOMContentLoaded', () => {
    const connectWalletBtn = document.getElementById('connectWalletBtn');

    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    // Solicita conexão com a carteira MetaMask
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const account = accounts[0];
                    console.log('Carteira conectada:', account);
                    connectWalletBtn.textContent = `Conectado: ${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
                    connectWalletBtn.disabled = true;
                    alert(`Carteira conectada com sucesso! Endereço: ${account}`);
                    // Aqui você pode chamar funções para carregar dados da blockchain
                } catch (error) {
                    console.error('Erro ao conectar a carteira:', error);
                    alert('Erro ao conectar a carteira. Por favor, tente novamente.');
                }
            } else {
                alert('MetaMask ou outra carteira Web3 não detectada. Por favor, instale uma extensão de carteira.');
                window.open('https://metamask.io/download/', '_blank');
            }
        });
    }
});

