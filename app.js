/* =============================================
   MONAD CANVAS — Application Logic
   ============================================= */

const CANVAS_SIZE = 32;

const App = {
    canvas: null,
    ctx: null,
    pixels: [],
    selectedPixel: null, // {x, y, index}
    
    async init() {
        this.canvas = document.getElementById('pixel-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.showToast('Generating AI Genesis Art... (takes a few seconds)', 'info');
        await this.generateAIGenesis('retro 8bit pixel art of a cozy little house with green grass and blue sky');
        
        this.bindEvents();
        
        Blockchain.checkAutoConnect().then(() => {
            this.updateWalletUI();
        });
    },

    // ── Generate the initial 32x32 art via AI ──
    async generateAIGenesis(prompt) {
        try {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=64&height=64&nologo=true&seed=42`;
            console.log('Fetching AI Genesis from:', url);
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const blob = await response.blob();
            const imgUrl = URL.createObjectURL(blob);
            
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const offscreen = document.createElement('canvas');
                    offscreen.width = CANVAS_SIZE;
                    offscreen.height = CANVAS_SIZE;
                    const offCtx = offscreen.getContext('2d');
                    offCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    
                    const imageData = offCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
                    
                    this.pixels = new Array(CANVAS_SIZE * CANVAS_SIZE);
                    for (let i = 0; i < this.pixels.length; i++) {
                        const r = imageData[i * 4];
                        const g = imageData[i * 4 + 1];
                        const b = imageData[i * 4 + 2];
                        const hex = "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
                        
                        this.pixels[i] = {
                            color: hex,
                            owner: 'Genesis AI',
                            prompt: 'Base: ' + prompt
                        };
                    }
                    
                    this.renderCanvas();
                    this.showToast('AI Genesis Art Loaded!', 'success');
                    URL.revokeObjectURL(imgUrl);
                    resolve();
                };
                img.onerror = (e) => {
                    console.error("Image decode failed:", e);
                    throw new Error("Failed to decode AI image");
                };
                img.src = imgUrl;
            });
        } catch (error) {
            console.error("AI Generation failed:", error);
            this.showToast('AI generation failed. Loading fallback.', 'error');
            this.initFallbackState();
            this.renderCanvas();
        }
    },

    initFallbackState() {
        this.pixels = new Array(CANVAS_SIZE * CANVAS_SIZE);
        for (let i = 0; i < this.pixels.length; i++) {
            const x = i % CANVAS_SIZE;
            const y = Math.floor(i / CANVAS_SIZE);
            let color = '#87CEEB'; // Sky blue
            
            // Grass
            if (y > 22) color = '#228B22';
            
            // House base (x: 10 to 22, y: 14 to 22)
            if (x >= 10 && x <= 22 && y >= 14 && y <= 22) color = '#D2B48C';
            
            // Roof (triangle)
            if (y >= 8 && y < 14) {
                const width = (y - 8) * 1.5;
                if (Math.abs(x - 16) <= width) color = '#B22222';
            }
            
            // Door
            if (x >= 14 && x <= 17 && y >= 18 && y <= 22) color = '#8B4513';
            
            // Window
            if (x >= 19 && x <= 21 && y >= 15 && y <= 17) color = '#ADD8E6';
            
            // Sun
            if (x >= 4 && x <= 7 && y >= 3 && y <= 6) color = '#FFD700';

            this.pixels[i] = {
                color: color,
                owner: 'Genesis',
                prompt: 'Initial generation'
            };
        }
    },

    // ── Render the 32x32 array to the canvas ──
    renderCanvas() {
        for (let i = 0; i < this.pixels.length; i++) {
            const x = i % CANVAS_SIZE;
            const y = Math.floor(i / CANVAS_SIZE);
            this.ctx.fillStyle = this.pixels[i].color;
            this.ctx.fillRect(x, y, 1, 1);
        }
    },

    // ── Interactions ──
    bindEvents() {
        // Wallet connect
        document.getElementById('btn-connect').addEventListener('click', async () => {
            const btn = document.getElementById('btn-connect');
            btn.textContent = 'Connecting...';
            await Blockchain.connect(true);
            this.updateWalletUI();
        });

        // Canvas interactions
        const container = document.querySelector('.canvas-container');
        const hoverHighlight = document.getElementById('hover-highlight');
        const selectionHighlight = document.getElementById('selection-highlight');

        container.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Scale mouse position to 32x32 grid
            const scaleX = CANVAS_SIZE / rect.width;
            const scaleY = CANVAS_SIZE / rect.height;
            
            let x = Math.floor((e.clientX - rect.left) * scaleX);
            let y = Math.floor((e.clientY - rect.top) * scaleY);
            
            // Clamp
            x = Math.max(0, Math.min(CANVAS_SIZE - 1, x));
            y = Math.max(0, Math.min(CANVAS_SIZE - 1, y));

            // Move hover highlight box
            const boxSize = rect.width / CANVAS_SIZE;
            hoverHighlight.style.display = 'block';
            hoverHighlight.style.width = `${boxSize}px`;
            hoverHighlight.style.height = `${boxSize}px`;
            hoverHighlight.style.left = `${x * boxSize}px`;
            hoverHighlight.style.top = `${y * boxSize}px`;
        });

        container.addEventListener('mouseleave', () => {
            hoverHighlight.style.display = 'none';
        });

        container.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = CANVAS_SIZE / rect.width;
            const scaleY = CANVAS_SIZE / rect.height;
            
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);
            
            this.selectPixel(x, y);
        });

        // Mutate button
        document.getElementById('btn-mutate').addEventListener('click', () => this.mutatePixel());
    },

    selectPixel(x, y) {
        // Keep highlight fixed
        const rect = this.canvas.getBoundingClientRect();
        const boxSize = rect.width / CANVAS_SIZE;
        const selectionHighlight = document.getElementById('selection-highlight');
        selectionHighlight.style.display = 'block';
        selectionHighlight.style.width = `${boxSize}px`;
        selectionHighlight.style.height = `${boxSize}px`;
        selectionHighlight.style.left = `${x * boxSize}px`;
        selectionHighlight.style.top = `${y * boxSize}px`;

        const index = y * CANVAS_SIZE + x;
        this.selectedPixel = { x, y, index };
        
        const pixel = this.pixels[index];

        document.getElementById('inspector-empty').style.display = 'none';
        document.getElementById('inspector-content').style.display = 'block';
        
        document.getElementById('sel-x').textContent = x;
        document.getElementById('sel-y').textContent = y;
        document.getElementById('selected-color-box').style.backgroundColor = pixel.color;
        document.getElementById('sel-owner').textContent = pixel.owner === 'Genesis' ? 'Genesis' : Blockchain.shortAddress(pixel.owner);
        document.getElementById('sel-prompt').textContent = `"${pixel.prompt}"`;
        
        // Reset inputs
        document.getElementById('mutation-prompt').value = '';
        document.getElementById('mutation-color').value = pixel.color;
    },

    async mutatePixel() {
        if (!this.selectedPixel) return;
        
        if (!Blockchain.connected) {
            this.showToast('Please connect wallet first', 'error');
            await Blockchain.connect(true);
            this.updateWalletUI();
            if (!Blockchain.connected) return;
        }

        const promptInput = document.getElementById('mutation-prompt').value.trim();
        const colorInput = document.getElementById('mutation-color').value;
        const promptText = promptInput || 'Manual color override';

        const { x, y, index } = this.selectedPixel;
        const btn = document.getElementById('btn-mutate');
        
        btn.disabled = true;
        btn.textContent = 'Approve in MetaMask...';

        // Fake AI translation of prompt to color (if prompt is provided and color isn't changed manually, we'd normally do this on backend)
        // Here we just accept the color input from the UI.
        
        const dataString = `MonadCanvas | Mutate X:${x} Y:${y} | Color: ${colorInput} | Prompt: ${promptText}`;
        
        const result = await Blockchain.sendArtTransaction(dataString);
        
        if (result) {
            // Success! Update local state
            this.pixels[index] = {
                color: colorInput,
                owner: Blockchain.address,
                prompt: promptText
            };
            
            // Re-render single pixel
            this.ctx.fillStyle = colorInput;
            this.ctx.fillRect(x, y, 1, 1);
            
            // Update UI
            this.selectPixel(x, y);
            this.showToast('Pixel mutated successfully!', 'success');
            this.addFeedEvent(`Pixel [${x},${y}] mutated by ${Blockchain.shortAddress(Blockchain.address)}`, result.explorerUrl);
        } else {
            this.showToast('Transaction failed or cancelled. Ensure you have testnet MON for gas.', 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Sign & Mutate (0 MON)';
    },

    updateWalletUI() {
        const info = document.getElementById('wallet-status');
        const btn = document.getElementById('btn-connect');
        
        if (Blockchain.connected) {
            info.textContent = Blockchain.shortAddress(Blockchain.address);
            info.classList.add('connected');
            btn.style.display = 'none';
        } else {
            info.textContent = 'Not connected';
            info.classList.remove('connected');
            btn.style.display = 'block';
            btn.textContent = 'Connect Wallet';
        }
    },

    addFeedEvent(text, url) {
        const feed = document.getElementById('event-feed');
        const li = document.createElement('li');
        li.className = 'feed-event';
        
        const time = new Date().toLocaleTimeString();
        
        if (url) {
            li.innerHTML = `<span class="feed-time">${time}</span><a href="${url}" target="_blank">${text}</a>`;
        } else {
            li.innerHTML = `<span class="feed-time">${time}</span>${text}`;
        }
        
        feed.prepend(li);
        
        // Keep max 20 events
        if (feed.children.length > 20) {
            feed.removeChild(feed.lastChild);
        }
    },

    showToast(msg, type = '') {
        const area = document.getElementById('toast-area');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        area.appendChild(t);
        setTimeout(() => {
            if (t.parentNode) t.remove();
        }, 3500);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
