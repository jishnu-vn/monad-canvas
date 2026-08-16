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
const CONTRACT_ADDRESS = '0xa9B4f9B4E2646A8e0D1767d4bC0928A763eF1D00';
const CONTRACT_ABI = [
    "function mutatePixel(uint8 x, uint8 y, bytes3 color, string prompt)",
    "function mutatePixelBatch(uint8[] xs, uint8[] ys, bytes3[] colors, string[] prompts)",
    "function getCanvasState() view returns (bytes3[4096] colors, address[4096] owners)",
    "event PixelMutated(uint8 indexed x, uint8 indexed y, bytes3 color, address indexed mutator, string prompt, uint256 timestamp)",
    "event BatchPixelMutated(uint256 count, address indexed mutator, uint256 timestamp)"
];

const Blockchain = {
    connected: false,
    address: null,
    balance: null,
    chainOk: false,

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
                this.disconnect();
                if (window.App) window.App.updateWalletUI();
            } else {
                this.address = accounts[0];
                this.updateBalance().then(() => {
                    if (window.App) window.App.updateWalletUI();
                });
            }
        });

        window.ethereum.on('chainChanged', (chainId) => {
            this.chainOk = chainId === MonadChain.chainId;
            this.updateBalance().then(() => {
                if (window.App) window.App.updateWalletUI();
            });
        });
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

    /** Build explorer link */
    explorerLink(txHash) {
        return EXPLORER_TX_URL + txHash;
    },

    /* ── Smart Contract Interactions ── */

    /**
     * Fetch the full canvas state from the deployed smart contract.
     */
    async getCanvasState() {
        if (!window.ethers) {
            console.error('ethers.js not loaded!');
            throw new Error('ethers.js not loaded');
        }
        
        try {
            // Using a public provider since this is a read-only call
            const provider = new ethers.JsonRpcProvider(MonadChain.rpcUrls[0]);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            
            console.log('Fetching on-chain canvas state...');
            const result = await contract.getCanvasState();
            return result; // [colors, owners]
        } catch (err) {
            console.error('Failed to get canvas state:', err);
            throw err;
    },

    /**
     * Fetch past mutation events from the smart contract
     */
    async getPastActivity() {
        if (!window.ethers) return [];
        try {
            const provider = new ethers.JsonRpcProvider(MonadChain.rpcUrls[0]);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            
            console.log('Fetching on-chain activity history...');
            const pixelFilter = contract.filters.PixelMutated();
            const batchFilter = contract.filters.BatchPixelMutated();
            
            // Query the last ~50,000 blocks to avoid RPC limits
            const [pixelEvents, batchEvents] = await Promise.all([
                contract.queryFilter(pixelFilter, -50000, "latest").catch(() => []),
                contract.queryFilter(batchFilter, -50000, "latest").catch(() => [])
            ]);
            
            // Sort by block number ascending
            const events = [...pixelEvents, ...batchEvents].sort((a, b) => a.blockNumber - b.blockNumber);
            
            return events.map(e => {
                if (e.fragment.name === 'PixelMutated') {
                    const { x, y, color, mutator } = e.args;
                    const hexColor = (color.length === 8) ? '#' + color.slice(2) : color.replace('0x', '#');
                    return `<b>${this.shortAddress(mutator)}</b> painted (${x}, ${y}) → <span style="display:inline-block;width:12px;height:12px;background:${hexColor};border-radius:2px;vertical-align:middle;border:1px solid #ddd"></span>`;
                } else {
                    const { count, mutator } = e.args;
                    return `<b>${this.shortAddress(mutator)}</b> mutated a region (${count} pixels)`;
                }
            });
        } catch (err) {
            console.warn('Failed to fetch past activity:', err);
            return [];
        }
    },

    /**
     * Mutate a single pixel on the real smart contract using Ethers.js
     */
    async mutatePixelOnChain(x, y, colorHex, promptText) {
        if (!window.ethereum || !window.ethers) {
            console.warn('No wallet or ethers detected for transaction');
            return null;
        }

        if (!this.connected || !this.address) {
            const result = await this.connect();
            if (!result.ok) return null;
        }

        try {
            await this.switchToMonad();
        } catch (e) {
            console.warn('switchToMonad threw:', e);
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            const colorBytes3 = colorHex.replace('#', '0x');
            
            console.log(`Dispatching mutatePixel tx: x=${x}, y=${y}, color=${colorBytes3}`);
            
            const tx = await contract.mutatePixel(x, y, colorBytes3, promptText, {
                gasLimit: 200000 // Monad best practice
            });
            
            console.log('Monad Art TX sent:', tx.hash, this.explorerLink(tx.hash));
            await tx.wait(); // Wait for it to be mined
            
            setTimeout(() => this.updateBalance(), 3000);
            return { txHash: tx.hash, explorerUrl: this.explorerLink(tx.hash) };
        } catch (err) {
            if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
                console.log('User explicitly rejected transaction in MetaMask');
                return null;
            }
            console.warn('mutatePixel failed:', err);
            return null;
        }
    },

    /**
     * Batch Mutate an array of pixels (Semantic Area Mutation)
     */
    async mutatePixelBatchOnChain(xs, ys, colors, prompts) {
        if (!window.ethereum || !window.ethers) {
            console.warn('No wallet or ethers detected for transaction');
            return null;
        }

        if (!this.connected || !this.address) {
            const result = await this.connect();
            if (!result.ok) return null;
        }

        try {
            await this.switchToMonad();
        } catch (e) {
            console.warn('switchToMonad threw:', e);
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            // Convert Hex Colors to Bytes3
            const bytesColors = colors.map(c => c.replace('#', '0x'));
            
            console.log(`Dispatching mutatePixelBatch tx for ${xs.length} pixels...`);
            
            const tx = await contract.mutatePixelBatch(xs, ys, bytesColors, prompts);
            
            console.log('Monad Batch TX sent:', tx.hash, this.explorerLink(tx.hash));
            await tx.wait(); // Wait for it to be mined
            
            setTimeout(() => this.updateBalance(), 3000);
            return { txHash: tx.hash, explorerUrl: this.explorerLink(tx.hash) };
        } catch (err) {
            if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
                console.log('User explicitly rejected batch transaction in MetaMask');
                return null;
            }
            console.warn('mutatePixelBatch failed:', err);
            throw err;
        }
    }
};

window.Blockchain = Blockchain;
