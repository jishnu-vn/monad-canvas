/* ==========================================================================
   MONAD CANVAS — Semantic AI Engine & Region Mapper
   ========================================================================== */

const AIEngine = {
    // ── Semantic Color Palette Mapping ──
    COLOR_KEYWORDS: {
        'monad': { h: 250, s: 90, l: 65, name: 'Monad Purple' },
        'purple': { h: 270, s: 85, l: 60, name: 'Cyber Purple' },
        'neon': { h: 180, s: 100, l: 60, name: 'Neon Glow' },
        'cyber': { h: 260, s: 90, l: 65, name: 'Cyber Indigo' },
        'matrix': { h: 135, s: 100, l: 50, name: 'Matrix Green' },
        'fire': { h: 15, s: 95, l: 55, name: 'Inferno Orange' },
        'lava': { h: 10, s: 95, l: 50, name: 'Molten Lava' },
        'water': { h: 205, s: 90, l: 55, name: 'Ocean Blue' },
        'ice': { h: 195, s: 85, l: 80, name: 'Glacial Ice' },
        'grass': { h: 110, s: 70, l: 45, name: 'Meadow Green' },
        'earth': { h: 30, s: 50, l: 35, name: 'Earthy Brown' },
        'stone': { h: 210, s: 10, l: 50, name: 'Slate Gray' },
        'sky': { h: 200, s: 85, l: 70, name: 'Sky Blue' },
        'sun': { h: 48, s: 100, l: 60, name: 'Solar Yellow' },
        'gold': { h: 45, s: 95, l: 55, name: 'Radiant Gold' },
        'silver': { h: 210, s: 15, l: 78, name: 'Polished Silver' },
        'ruby': { h: 350, s: 90, l: 50, name: 'Blood Ruby' },
        'emerald': { h: 145, s: 85, l: 45, name: 'Imperial Emerald' },
        'sapphire': { h: 225, s: 90, l: 50, name: 'Royal Sapphire' },
        'red': { h: 0, s: 85, l: 55, name: 'Crimson Red' },
        'pink': { h: 325, s: 85, l: 70, name: 'Vibrant Pink' },
        'yellow': { h: 50, s: 95, l: 55, name: 'Bright Yellow' },
        'green': { h: 125, s: 75, l: 48, name: 'Vivid Green' },
        'cyan': { h: 185, s: 95, l: 55, name: 'Electric Cyan' },
        'blue': { h: 215, s: 85, l: 55, name: 'Cobalt Blue' },
        'black': { h: 0, s: 0, l: 8, name: 'Pitch Black' },
        'dark': { h: 240, s: 20, l: 15, name: 'Shadow Dark' },
        'void': { h: 260, s: 90, l: 10, name: 'Abyssal Void' },
        'white': { h: 0, s: 0, l: 96, name: 'Pure White' },
        'gray': { h: 0, s: 0, l: 55, name: 'Neutral Gray' },
        'brown': { h: 25, s: 55, l: 35, name: 'Warm Brown' }
    },

    MODIFIERS: {
        'neon': { sMult: 1.4, lShift: 10 },
        'glowing': { sMult: 1.3, lShift: 15 },
        'bright': { lShift: 15, sMult: 1.1 },
        'dark': { lShift: -25, sMult: 0.9 },
        'deep': { lShift: -20, sMult: 1.1 },
        'electric': { sMult: 1.4, lShift: 10 },
        'toxic': { sMult: 1.3, hShift: -15 },
        'radioactive': { sMult: 1.4, lShift: 10, hOverride: 100 },
        'laser': { sMult: 1.4, lShift: 15 },
        'ghost': { sMult: 0.5, lShift: 30, hOverride: 180 },
        'futuristic': { sMult: 1.4, hShift: 20 }
    },

    hslToHex(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        const toHex = (n) => {
            const hex = Math.round((n + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },

    /** Interpret a text prompt into an AI color and descriptor */
    interpretPromptToColor(prompt, fallbackHex = '#836EF9') {
        if (!prompt || prompt.trim() === '') return { hex: fallbackHex, name: 'Default Monad', description: 'Original selection' };
        
        const clean = prompt.toLowerCase();
        let matched = null;
        for (const [key, val] of Object.entries(this.COLOR_KEYWORDS)) {
            if (clean.includes(key)) {
                matched = { ...val };
                break;
            }
        }
        
        if (!matched) {
            let hash = 0;
            for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash);
            matched = { h: Math.abs(hash) % 360, s: 80, l: 55, name: `AI Neural (${prompt.slice(0, 10)}...)` };
        }
        
        for (const [mod, eff] of Object.entries(this.MODIFIERS)) {
            if (clean.includes(mod)) {
                if (eff.sMult) matched.s *= eff.sMult;
                if (eff.lShift) matched.l += eff.lShift;
                if (eff.hShift) matched.h += eff.hShift;
                if (eff.hOverride !== undefined) matched.h = eff.hOverride;
                matched.name = `${mod.charAt(0).toUpperCase() + mod.slice(1)} ${matched.name}`;
            }
        }
        
        return {
            hex: this.hslToHex(matched.h, matched.s, matched.l),
            name: matched.name,
            description: `Interpreted from "${prompt}"`
        };
    },

    /**
     * GENERATE BASE SCENERY: Sun, House, Road, People (64x64)
     */
    generateBaseScenery(size = 64) {
        const pixels = new Array(size * size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = y * size + x;
                let color = '#87CEEB'; // Sky blue default
                let prompt = 'Genesis Sky';

                // 1. SKY (y: 0-24)
                if (y <= 24) {
                    color = this.hslToHex(195, 75, 65 + (y * 1.5));
                    prompt = 'Genesis Sky';
                }
                
                // 2. SUN (x: 8..16, y: 4..12)
                if (Math.hypot(x - 12, y - 8) <= 5) {
                    color = '#FFD700';
                    prompt = 'Genesis Sun';
                }

                // 3. GRASS / BACKGROUND (y: 25-63)
                if (y > 24) {
                    color = (y % 2 === 0 && x % 2 === 0) ? '#2ecc71' : '#27ae60';
                    prompt = 'Genesis Grass';
                }

                // 4. HOUSE (x: 24..40, y: 28..40)
                if (x >= 24 && x <= 40 && y >= 28 && y <= 40) {
                    color = '#E5C29F'; // Wall
                    prompt = 'Genesis House';
                    if (x === 24 || x === 40) color = '#C49B74';
                    
                    // Door
                    if (x >= 30 && x <= 34 && y >= 34 && y <= 40) {
                        color = '#8B4513';
                        if (x === 34 && y === 38) color = '#F1C40F'; // Knob
                    }
                    // Window
                    if (x >= 26 && x <= 28 && y >= 30 && y <= 32) {
                        color = '#AED6F1';
                    }
                    if (x >= 36 && x <= 38 && y >= 30 && y <= 32) {
                        color = '#AED6F1';
                    }
                }
                // Roof
                if (y >= 20 && y <= 27) {
                    const width = (y - 20) * 1.5 + 2;
                    if (Math.abs(x - 32) <= width) {
                        color = '#C0392B';
                        prompt = 'Genesis House';
                    }
                }

                // 5. ROAD (Perspective road coming from the house)
                if (y > 40) {
                    const roadWidth = (y - 40) * 0.8 + 4; // Widens as it goes down
                    if (Math.abs(x - 32) <= roadWidth) {
                        color = '#7F8C8D';
                        prompt = 'Genesis Road';
                        // Center lines
                        if (x >= 31 && x <= 33 && y % 4 === 0) color = '#F1C40F';
                    }
                }

                // 6. PEOPLE (x: 16..18, y: 44..48 and x: 48..50, y: 42..46)
                if ((x >= 16 && x <= 18 && y >= 44 && y <= 48) || (x >= 48 && x <= 50 && y >= 42 && y <= 46)) {
                    color = '#2C3E50'; // Body
                    prompt = 'Genesis Person';
                    if (y === 44 || y === 42) color = '#F5B041'; // Head
                }

                pixels[idx] = { color, owner: 'Genesis AI', prompt };
            }
        }
        return pixels;
    },

    /**
     * SEMANTIC REGION MAPPER (64x64)
     * Returns an array of {x, y} coordinates for the detected region in the prompt
     */
    getRegionPixels(prompt, size = 64) {
        const p = prompt.toLowerCase();
        let regionCoords = [];

        // Identify which region is mentioned
        const isRoad = p.includes('road') || p.includes('path') || p.includes('street');
        const isSky = p.includes('sky') || p.includes('cloud') || p.includes('space') || p.includes('void');
        const isSun = p.includes('sun') || p.includes('moon') || p.includes('star');
        const isHouse = p.includes('house') || p.includes('building') || p.includes('cabin') || p.includes('roof');
        const isPerson = p.includes('people') || p.includes('person') || p.includes('ghost') || p.includes('character');
        const isGrass = p.includes('grass') || p.includes('ground') || p.includes('earth') || p.includes('nature');
        const isAll = p.includes('everything') || p.includes('all') || p.includes('world');

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let match = false;
                
                if (isAll) { match = true; }
                else if (isSky && y <= 24 && Math.hypot(x - 12, y - 8) > 5) { match = true; } // Sky (excluding sun)
                else if (isSun && Math.hypot(x - 12, y - 8) <= 5) { match = true; } // Sun
                else if (isHouse && ((x >= 24 && x <= 40 && y >= 28 && y <= 40) || (y >= 20 && y <= 27 && Math.abs(x - 32) <= (y - 20) * 1.5 + 2))) { match = true; } // House
                else if (isRoad && y > 40 && Math.abs(x - 32) <= (y - 40) * 0.8 + 4) { match = true; } // Road
                else if (isPerson && ((x >= 16 && x <= 18 && y >= 44 && y <= 48) || (x >= 48 && x <= 50 && y >= 42 && y <= 46))) { match = true; } // People
                else if (isGrass && y > 24 && !(y > 40 && Math.abs(x - 32) <= (y - 40) * 0.8 + 4) && !((x >= 16 && x <= 18 && y >= 44 && y <= 48) || (x >= 48 && x <= 50 && y >= 42 && y <= 46)) && !(x >= 24 && x <= 40 && y >= 28 && y <= 40)) { match = true; } // Grass

                if (match) regionCoords.push({x, y});
            }
        }
        
        return regionCoords;
    },

    /**
     * Generate mutations for a specific region based on prompt
     */
    generateRegionBatch(prompt) {
        const coords = this.getRegionPixels(prompt);
        if (coords.length === 0) return null; // No semantic region found

        const aiColor = this.interpretPromptToColor(prompt).hex;
        
        const xs = [];
        const ys = [];
        const colors = [];
        const prompts = [];

        // Apply a slight variation to the color based on coords to retain pixel art texture
        const baseHsl = this.hexToHsl(aiColor);

        for (const pt of coords) {
            xs.push(pt.x);
            ys.push(pt.y);
            
            // Texture variation based on position
            let lOffset = ((pt.x + pt.y) % 3 === 0) ? 5 : (((pt.x * pt.y) % 2 === 0) ? -5 : 0);
            let finalColor = this.hslToHex(baseHsl.h, baseHsl.s, baseHsl.l + lOffset);
            
            colors.push(finalColor);
            // Optimization: Only push the full prompt for the first pixel to drastically save calldata size and gas.
            // Subsequent pixels in the batch get an empty string. The UI handles batch visualization via the first prompt.
            prompts.push(pt === coords[0] ? prompt : "");
        }

        return { xs, ys, colors, prompts, regionSize: coords.length };
    },

    /** Utility for texture generation */
    hexToHsl(hex) {
        hex = hex.replace(/^#/, '');
        let r = parseInt(hex.substring(0, 2), 16) / 255;
        let g = parseInt(hex.substring(2, 4), 16) / 255;
        let b = parseInt(hex.substring(4, 6), 16) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) { h = s = 0; }
        else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
};

window.AIEngine = AIEngine;
