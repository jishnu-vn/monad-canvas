/* =============================================
   MONAD EVOLVING ART — Blockchain Integration
   ============================================= */

const MonadChain = {
    chainId: '0x279f', // 10143 decimal — Monad Testnet
    chainName: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: ['https://testnet-rpc.monad.xyz/'],
    blockExplorerUrls: ['https://testnet.monadscan.com/']
};

const EXPLORER_TX_URL = 'https://testnet.monadscan.com/tx/';

const Blockchain = {
    connected: false,
    address: null,
    balance: null,
    chainOk: false,
    latestBlock: null,
    blockListeners: [],

    /** Auto check if wallet is already connected */
    async checkAutoConnect() {
        if (!window.ethereum) return;
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                this.address = accounts[0];
                this.connected = true;
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                this.chainOk = chainId === MonadChain.chainId;
                await this.updateBalance();
                this.setupListeners();
                this.updateWalletUI();
            }
        } catch (e) {
            console.warn('Auto-connect check failed:', e);
        }
    },

    /** Disconnect wallet session */
    disconnect() {
        this.connected = false;
        this.address = null;
        this.balance = null;
        this.chainOk = false;
        this.updateWalletUI();
    },

    /** Attempt to connect wallet via window.ethereum (MetaMask etc.) */
    async connect(forcePrompt = true) {
        if (!window.ethereum) {
            return { ok: false, error: 'No wallet detected. Install MetaMask to use on-chain features.' };
        }

        try {
            if (forcePrompt) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_requestPermissions',
                        params: [{ eth_accounts: {} }]
                    });
                } catch (pErr) {
                    console.warn('wallet_requestPermissions skipped or rejected:', pErr);
                }
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                return { ok: false, error: 'No accounts found. Please unlock MetaMask.' };
            }

            this.address = accounts[0];
            this.connected = true;

            await this.switchToMonad();

            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.chainOk = chainId && chainId.toLowerCase() === MonadChain.chainId.toLowerCase();

            await this.updateBalance();
            this.setupListeners();
            this.updateWalletUI();

            return { ok: true, address: this.address, chainOk: this.chainOk };
        } catch (err) {
            if (err.code === 4001) {
                return { ok: false, error: 'Connection rejected. Please approve in MetaMask.' };
            }
            return { ok: false, error: err.message || 'Wallet connection failed.' };
        }
    },

    /** Listen for MetaMask account/chain changes */
    setupListeners() {
        if (!window.ethereum) return;

        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                this.connected = false;
                this.address = null;
                this.balance = null;
                this.updateWalletUI();
            } else {
                this.address = accounts[0];
                this.updateBalance();
                this.updateWalletUI();
            }
        });

        window.ethereum.on('chainChanged', (chainId) => {
            this.chainOk = chainId === MonadChain.chainId;
            this.updateBalance();
            this.updateWalletUI();
        });
    },

    /** Update displayed wallet info */
    updateWalletUI() {
        const statusEl = document.getElementById('wallet-status');
        const connectBtn = document.getElementById('btn-connect-wallet');
        if (!statusEl) return;

        if (this.connected) {
            let text = this.shortAddress(this.address);
            if (this.balance !== null) {
                text += ' · ' + this.balance + ' MON';
            }
            if (!this.chainOk) {
                text += ' (Wrong network)';
            }
            statusEl.textContent = text;
            statusEl.classList.add('connected');
            if (connectBtn) {
                connectBtn.innerHTML = '<span class="wallet-dot"></span>' + text;
                connectBtn.classList.add('connected');
            }
        } else {
            statusEl.textContent = 'Connect wallet to evolve your art on-chain';
            statusEl.classList.remove('connected');
            if (connectBtn) {
                connectBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5"/></svg> Connect Wallet';
                connectBtn.classList.remove('connected');
            }
        }
    },

    /** Fetch and store MON balance */
    async updateBalance() {
        if (!this.connected || !window.ethereum) return;
        try {
            const rawBalance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [this.address, 'latest']
            });
            const balanceWei = parseInt(rawBalance, 16);
            this.balance = (balanceWei / 1e18).toFixed(4);
        } catch (err) {
            console.warn('Could not fetch balance:', err);
            this.balance = null;
        }
    },

    /** Switch network to Monad testnet */
    async switchToMonad() {
        if (!window.ethereum) return;
        try {
            const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChain && currentChain.toLowerCase() === MonadChain.chainId.toLowerCase()) {
                this.chainOk = true;
                return;
            }
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: MonadChain.chainId }]
            });
            this.chainOk = true;
        } catch (switchError) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [MonadChain]
                });
                this.chainOk = true;
            } catch (addError) {
                console.warn('Could not add Monad network:', addError);
            }
        }
    },

    /** Format address for display */
    shortAddress(addr) {
        if (!addr) return '';
        return addr.slice(0, 6) + '\u2026' + addr.slice(-4);
    },

    /** Convert a string to 0x-prefixed hex */
    stringToHex(str) {
        let hex = '0x';
        for (let i = 0; i < str.length; i++) {
            hex += str.charCodeAt(i).toString(16).padStart(2, '0');
        }
        return hex;
    },

    /** Build explorer link */
    explorerLink(txHash) {
        return EXPLORER_TX_URL + txHash;
    },

    /**
     * Send a 0-value self-transaction to record art evolution data on Monad.
     */
    async sendArtTransaction(dataString) {
        if (!window.ethereum) {
            console.warn('No wallet detected for transaction');
            return null;
        }

        if (!this.address) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    this.address = accounts[0];
                    this.connected = true;
                }
            } catch (e) {
                console.warn('eth_accounts failed:', e);
            }
        }

        if (!this.connected || !this.address) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts && accounts.length > 0) {
                    this.address = accounts[0];
                    this.connected = true;
                } else {
                    return null;
                }
            } catch (err) {
                console.warn('Wallet connect prompt rejected:', err);
                return null;
            }
        }

        try {
            await this.switchToMonad();
        } catch (e) {
            console.warn('switchToMonad threw:', e);
        }

        const hexData = this.stringToHex(dataString);
        console.log('Dispatching Art TX to MetaMask...', { from: this.address, data: hexData });

        try {
            const txParams = {
                to: this.address,
                value: '0x0',
                data: hexData,
                gas: '0x7530' // 30,000 gas limit. CRITICAL FOR MONAD: Prevents overcharging/failure since Monad charges on gas limit, not gas used.
            };
            if (this.address) txParams.from = this.address;

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [txParams]
            });

            console.log('Monad Art TX sent:', txHash, this.explorerLink(txHash));
            setTimeout(() => this.updateBalance(), 3000);

            return { txHash, explorerUrl: this.explorerLink(txHash) };
        } catch (err) {
            if (err.code === 4001) {
                console.log('User explicitly rejected transaction in MetaMask');
                return null;
            }

            console.warn('eth_sendTransaction failed:', err);
            return null;
        }
    },

    /* ── Art-Specific Transaction Records ── */

    /** Record a mutation event */
    async recordMutation(artId, mutationType, traitsBefore, traitsAfter) {
        const data = 'MonadArt Mutation | Art: ' + artId +
            ' | Type: ' + mutationType +
            ' | Before: ' + JSON.stringify(traitsBefore) +
            ' | After: ' + JSON.stringify(traitsAfter) +
            ' | Wallet: ' + (this.address || 'anon') +
            ' | Time: ' + new Date().toISOString();
        return this.sendArtTransaction(data);
    },

    /** Record a community vote */
    async recordVote(artId, voteOption, totalVotes) {
        const data = 'MonadArt Vote | Art: ' + artId +
            ' | Choice: ' + voteOption +
            ' | Total Votes: ' + totalVotes +
            ' | Voter: ' + (this.address || 'anon') +
            ' | Time: ' + new Date().toISOString();
        return this.sendArtTransaction(data);
    },

    /** Record art minting */
    async recordMint(artId, traits) {
        const data = 'MonadArt Mint | Art: ' + artId +
            ' | Traits: ' + JSON.stringify(traits) +
            ' | Minter: ' + (this.address || 'anon') +
            ' | Time: ' + new Date().toISOString();
        return this.sendArtTransaction(data);
    },

    /** Record oracle-triggered evolution */
    async recordOracleEvolution(artId, oracleType, oracleValue, mutation) {
        const data = 'MonadArt Oracle | Art: ' + artId +
            ' | Oracle: ' + oracleType +
            ' | Value: ' + oracleValue +
            ' | Mutation: ' + mutation +
            ' | Time: ' + new Date().toISOString();
        return this.sendArtTransaction(data);
    },

    /** Record holder action on art */
    async recordHolderAction(artId, actionType, details) {
        const data = 'MonadArt Action | Art: ' + artId +
            ' | Action: ' + actionType +
            ' | Details: ' + details +
            ' | Holder: ' + (this.address || 'anon') +
            ' | Time: ' + new Date().toISOString();
        return this.sendArtTransaction(data);
    },

    /**
     * Fetch latest Monad block number (used to drive art evolution).
     */
    async getLatestBlock() {
        try {
            const response = await fetch(MonadChain.rpcUrls[0], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                })
            });
            const data = await response.json();
            if (data.result) {
                this.latestBlock = parseInt(data.result, 16);
                return this.latestBlock;
            }
        } catch (err) {
            // Silently fail
        }
        return null;
    },

    /**
     * Poll blocks to drive art evolution.
     * Calls registered listeners when new block arrives.
     */
    startBlockPolling(intervalMs = 5000) {
        this._blockPollInterval = setInterval(async () => {
            const block = await this.getLatestBlock();
            if (block !== null) {
                this.blockListeners.forEach(fn => fn(block));
            }
        }, intervalMs);
    },

    stopBlockPolling() {
        if (this._blockPollInterval) {
            clearInterval(this._blockPollInterval);
            this._blockPollInterval = null;
        }
    },

    onNewBlock(callback) {
        this.blockListeners.push(callback);
    }
};
