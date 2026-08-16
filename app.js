/* =============================================
   MONAD CANVAS — Application Logic
   ============================================= */

const CANVAS_SIZE = 64;

const App = {
    canvas: null,
    ctx: null,
    pixels: [],
    selectedPixel: null,
    
    async init() {
        // Landing page transition
        document.getElementById('btn-launch').addEventListener('click', () => {
            document.getElementById('landing').style.display = 'none';
            document.getElementById('app-section').style.display = 'flex';
            this.startCanvas();
        });

        // Theme toggles (both landing and app)
        this.bindThemeToggle('theme-toggle', 'moon-icon', 'sun-icon');
        this.bindThemeToggle('theme-toggle-app', 'moon-icon-app', 'sun-icon-app');
    },

    async startCanvas() {
        this.canvas = document.getElementById('pixel-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.generateBaseScenery();
        await this.syncOnChainState();
        this.bindAppEvents();
        Blockchain.checkAutoConnect().then(() => this.updateWalletUI());
    },

    bindThemeToggle(toggleId, moonId, sunId) {
        const toggle = document.getElementById(toggleId);
        if (!toggle) return;
        toggle.addEventListener('click', () => {
            const html = document.documentElement;
            const isDark = html.getAttribute('data-theme') === 'dark';
            html.setAttribute('data-theme', isDark ? 'light' : 'dark');
            
            // Sync all icon pairs
            ['moon-icon', 'moon-icon-app'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = isDark ? 'block' : 'none';
            });
            ['sun-icon', 'sun-icon-app'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = isDark ? 'none' : 'block';
            });
        });
    },

    generateBaseScenery() {
        try {
            this.pixels = AIEngine.generateBaseScenery(CANVAS_SIZE);
            this.renderCanvas();
        } catch (err) {
            console.error('AI Genesis synthesis failed:', err);
        }
    },

    async syncOnChainState() {
        try {
            const [colors, owners] = await Blockchain.getCanvasState();
            for (let i = 0; i < this.pixels.length; i++) {
                const rawColor = colors[i];
                if (rawColor && rawColor !== '0x000000' && rawColor !== '0x' && rawColor !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    const colorHex = rawColor.length === 8 ? '#' + rawColor.slice(2) : rawColor.replace('0x', '#');
                    this.pixels[i] = {
                        color: colorHex,
                        owner: owners[i],
                        prompt: 'Mutated on Monad'
                    };
                }
            }
            this.renderCanvas();
        } catch (e) {
            console.warn('Could not sync on-chain state:', e);
        }
    },

    renderCanvas() {
        if (!this.ctx) return;
        for (let i = 0; i < this.pixels.length; i++) {
            const x = i % CANVAS_SIZE;
            const y = Math.floor(i / CANVAS_SIZE);
            this.ctx.fillStyle = this.pixels[i].color || '#000000';
            this.ctx.fillRect(x, y, 1, 1);
        }
    },

    bindAppEvents() {
        // Activity Drawer
        const drawer = document.getElementById('activity-drawer');
        const btnActivity = document.getElementById('btn-activity');
        const btnCloseDrawer = document.getElementById('btn-close-drawer');
        if (btnActivity) btnActivity.addEventListener('click', () => drawer.classList.add('open'));
        if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', () => drawer.classList.remove('open'));

        // Wallet
        document.getElementById('btn-connect').addEventListener('click', async () => {
            document.getElementById('btn-connect').textContent = '...';
            await Blockchain.connect(true);
            this.updateWalletUI();
        });

        // AI Region Mutation
        const aiPromptInput = document.getElementById('ai-canvas-prompt');
        const aiGenerateBtn = document.getElementById('btn-generate-ai');
        const triggerAI = () => {
            const val = aiPromptInput.value.trim();
            if (val) this.mutateRegion(val);
        };
        if (aiGenerateBtn) aiGenerateBtn.addEventListener('click', triggerAI);
        if (aiPromptInput) aiPromptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') triggerAI(); });

        // Canvas interactions
        const container = document.querySelector('.canvas-container');
        const hoverHL = document.getElementById('hover-highlight');

        container.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            let x = Math.floor((e.clientX - rect.left) * (CANVAS_SIZE / rect.width));
            let y = Math.floor((e.clientY - rect.top) * (CANVAS_SIZE / rect.height));
            x = Math.max(0, Math.min(CANVAS_SIZE - 1, x));
            y = Math.max(0, Math.min(CANVAS_SIZE - 1, y));
            const boxSize = rect.width / CANVAS_SIZE;
            hoverHL.style.display = 'block';
            hoverHL.style.width = `${boxSize}px`;
            hoverHL.style.height = `${boxSize}px`;
            hoverHL.style.left = `${x * boxSize}px`;
            hoverHL.style.top = `${y * boxSize}px`;
        });
        container.addEventListener('mouseleave', () => hoverHL.style.display = 'none');
        container.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) * (CANVAS_SIZE / rect.width));
            const y = Math.floor((e.clientY - rect.top) * (CANVAS_SIZE / rect.height));
            this.selectPixel(x, y);
        });

        // Paint single pixel
        document.getElementById('btn-mutate').addEventListener('click', () => this.paintSinglePixel());
        
        // Also paint when color picker changes (instant feedback)
        document.getElementById('mutation-color').addEventListener('input', (e) => {
            if (this.selectedPixel) {
                document.getElementById('sel-color-box').style.backgroundColor = e.target.value;
            }
        });
    },

    async mutateRegion(promptText) {
        if (!Blockchain.connected) {
            this.showToast('Please connect wallet', 'error');
            await Blockchain.connect(true);
            this.updateWalletUI();
            if (!Blockchain.connected) return;
        }

        const btn = document.getElementById('btn-generate-ai');
        btn.disabled = true;
        btn.textContent = 'Thinking...';

        let batchData;
        try {
            const response = await fetch('http://localhost:3001/api/mutate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });
            if (!response.ok) {
                const errJson = await response.json();
                throw new Error(errJson.error || 'Server error');
            }
            batchData = await response.json();
        } catch (err) {
            console.error(err);
            this.showToast('AI Error: ' + err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Mutate';
            return;
        }

        if (!batchData || batchData.regionSize === 0) {
            this.showToast('AI could not identify a valid region', 'error');
            btn.disabled = false;
            btn.textContent = 'Mutate';
            return;
        }

        btn.textContent = 'Signing...';

        try {
            const result = await Blockchain.mutatePixelBatchOnChain(batchData.xs, batchData.ys, batchData.colors, batchData.prompts);
            if (result) {
                for (let i = 0; i < batchData.regionSize; i++) {
                    const px = batchData.xs[i];
                    const py = batchData.ys[i];
                    this.pixels[py * CANVAS_SIZE + px] = {
                        color: batchData.colors[i],
                        owner: Blockchain.address,
                        prompt: promptText
                    };
                }
                this.renderCanvas();
                this.showToast(`Mutated ${batchData.regionSize} pixels`);
                this.addFeedEvent(`<b>${Blockchain.shortAddress(Blockchain.address)}</b> mutated region: "${promptText}"`);
                document.getElementById('ai-canvas-prompt').value = '';
            }
        } catch (err) {
            this.showToast('Transaction failed', 'error');
        }
        btn.disabled = false;
        btn.textContent = 'Mutate';
    },

    selectPixel(x, y) {
        const index = y * CANVAS_SIZE + x;
        this.selectedPixel = { x, y, index };
        const pixel = this.pixels[index] || { color: '#000000' };

        const inspector = document.getElementById('color-inspector');
        inspector.style.opacity = '1';
        
        document.getElementById('sel-color-box').style.backgroundColor = pixel.color;
        document.getElementById('inspector-coord-label').textContent = `(${x}, ${y})`;
        document.getElementById('mutation-color').value = pixel.color;
    },

    async paintSinglePixel() {
        if (!this.selectedPixel) return;
        if (!Blockchain.connected) {
            this.showToast('Please connect wallet', 'error');
            await Blockchain.connect(true);
            this.updateWalletUI();
            if (!Blockchain.connected) return;
        }

        const colorVal = document.getElementById('mutation-color').value;
        const { x, y, index } = this.selectedPixel;
        const btn = document.getElementById('btn-mutate');
        
        btn.disabled = true;
        btn.textContent = '...';

        try {
            const result = await Blockchain.mutatePixelOnChain(x, y, colorVal, 'Color paint');
            if (result) {
                this.pixels[index] = { color: colorVal, owner: Blockchain.address, prompt: 'Color paint' };
                this.ctx.fillStyle = colorVal;
                this.ctx.fillRect(x, y, 1, 1);
                this.selectPixel(x, y);
                this.showToast('Pixel painted');
                this.addFeedEvent(`<b>${Blockchain.shortAddress(Blockchain.address)}</b> painted (${x}, ${y}) → ${colorVal}`);
            }
        } catch (err) {
            this.showToast('Paint failed', 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Paint';
    },

    updateWalletUI() {
        const info = document.getElementById('wallet-status');
        const btn = document.getElementById('btn-connect');
        if (Blockchain.connected) {
            info.textContent = Blockchain.shortAddress(Blockchain.address) + (Blockchain.balance ? ` · ${Blockchain.balance} MON` : '');
            info.classList.add('connected');
            btn.style.display = 'none';
        } else {
            info.textContent = 'Not connected';
            info.classList.remove('connected');
            btn.style.display = 'block';
            btn.textContent = 'Connect';
        }
    },

    showToast(msg, type = '') {
        const area = document.getElementById('toast-area');
        if (!area) return;
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        area.appendChild(t);
        setTimeout(() => t.remove(), 3600);
    },

    addFeedEvent(htmlContent) {
        const feed = document.getElementById('event-feed');
        if (!feed) return;
        const li = document.createElement('li');
        li.className = 'feed-event';
        li.innerHTML = htmlContent;
        feed.prepend(li);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
