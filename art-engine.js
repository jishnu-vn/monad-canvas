/* =============================================
   MONAD EVOLVING ART — Generative Art Engine
   Canvas-based generative art that mutates.
   ============================================= */

const ArtEngine = {
    canvas: null,
    ctx: null,
    traits: null,
    animationId: null,
    particles: [],
    time: 0,
    mutationHistory: [],
    artId: null,
    isAnimating: false,

    // ── Trait Definitions ──
    TRAIT_RANGES: {
        // Core shape
        coreShape: ['circle', 'hexagon', 'diamond', 'star', 'nebula', 'spiral'],
        coreSize: { min: 60, max: 200 },
        // Color palette
        hue1: { min: 0, max: 360 },
        hue2: { min: 0, max: 360 },
        hue3: { min: 0, max: 360 },
        saturation: { min: 40, max: 100 },
        lightness: { min: 30, max: 70 },
        // Particle system
        particleCount: { min: 20, max: 150 },
        particleSpeed: { min: 0.2, max: 2.0 },
        particleSize: { min: 1, max: 6 },
        particleTrail: { min: 0.01, max: 0.15 },
        // Behaviour
        rotationSpeed: { min: -0.03, max: 0.03 },
        pulseRate: { min: 0.005, max: 0.05 },
        pulseAmplitude: { min: 5, max: 40 },
        // Orbital rings
        ringCount: { min: 0, max: 5 },
        ringSpacing: { min: 20, max: 60 },
        // Background
        bgDarkness: { min: 5, max: 25 },
        noiseScale: { min: 0.001, max: 0.01 },
        // Glow
        glowIntensity: { min: 10, max: 60 },
        glowLayers: { min: 1, max: 5 },
        // Symmetry
        symmetry: { min: 1, max: 12 },
    },

    /** Generate a random art ID */
    generateArtId() {
        return 'MONAD-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    },

    /** Initialize the engine with a canvas */
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    },

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight, 700);
        this.canvas.width = size;
        this.canvas.height = size;
    },

    /** Generate random traits for a new piece */
    generateTraits(seed) {
        const rng = this.seededRandom(seed || Date.now());
        const TR = this.TRAIT_RANGES;

        const traits = {
            coreShape: TR.coreShape[Math.floor(rng() * TR.coreShape.length)],
            coreSize: this.randRange(rng, TR.coreSize),
            hue1: this.randRange(rng, TR.hue1),
            hue2: this.randRange(rng, TR.hue2),
            hue3: this.randRange(rng, TR.hue3),
            saturation: this.randRange(rng, TR.saturation),
            lightness: this.randRange(rng, TR.lightness),
            particleCount: Math.floor(this.randRange(rng, TR.particleCount)),
            particleSpeed: this.randRange(rng, TR.particleSpeed),
            particleSize: this.randRange(rng, TR.particleSize),
            particleTrail: this.randRange(rng, TR.particleTrail),
            rotationSpeed: this.randRange(rng, TR.rotationSpeed),
            pulseRate: this.randRange(rng, TR.pulseRate),
            pulseAmplitude: this.randRange(rng, TR.pulseAmplitude),
            ringCount: Math.floor(this.randRange(rng, TR.ringCount)),
            ringSpacing: this.randRange(rng, TR.ringSpacing),
            bgDarkness: this.randRange(rng, TR.bgDarkness),
            noiseScale: this.randRange(rng, TR.noiseScale),
            glowIntensity: this.randRange(rng, TR.glowIntensity),
            glowLayers: Math.floor(this.randRange(rng, TR.glowLayers)),
            symmetry: Math.floor(this.randRange(rng, TR.symmetry)),
            generation: 0,
            mutations: 0
        };

        return traits;
    },

    /** Create the piece and start animating */
    create(traits) {
        this.traits = traits;
        this.artId = this.artId || this.generateArtId();
        this.time = 0;
        this.initParticles();
        this.startAnimation();
    },

    /** Initialize particles based on traits */
    initParticles() {
        this.particles = [];
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        for (let i = 0; i < this.traits.particleCount; i++) {
            const angle = (Math.PI * 2 * i) / this.traits.particleCount;
            const dist = 30 + Math.random() * (this.traits.coreSize + 80);
            this.particles.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * this.traits.particleSpeed,
                vy: (Math.random() - 0.5) * this.traits.particleSpeed,
                size: 1 + Math.random() * this.traits.particleSize,
                hue: this.traits.hue1 + Math.random() * 60 - 30,
                orbit: dist,
                angle: angle,
                orbitSpeed: (Math.random() - 0.5) * 0.02
            });
        }
    },

    /** Start the render loop */
    startAnimation() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        const loop = () => {
            if (!this.isAnimating) return;
            this.render();
            this.time += 1;
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    },

    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },

    /** Main render function */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const t = this.traits;

        // Background with trail effect
        ctx.fillStyle = `hsla(${t.hue1 + 180}, 10%, ${t.bgDarkness}%, ${1 - t.particleTrail})`;
        ctx.fillRect(0, 0, w, h);

        // Draw orbital rings
        this.drawRings(ctx, cx, cy, t);

        // Draw core shape
        this.drawCore(ctx, cx, cy, t);

        // Update & draw particles
        this.updateParticles(ctx, cx, cy, t);

        // Draw glow overlay
        this.drawGlow(ctx, cx, cy, t);

        // Draw symmetry reflections
        if (t.symmetry > 1) {
            this.drawSymmetry(ctx, cx, cy, t);
        }
    },

    /** Draw the center core shape */
    drawCore(ctx, cx, cy, t) {
        const pulse = Math.sin(this.time * t.pulseRate) * t.pulseAmplitude;
        const size = t.coreSize + pulse;
        const rotation = this.time * t.rotationSpeed;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);

        // Glow behind core
        for (let g = t.glowLayers; g >= 0; g--) {
            const gSize = size + g * t.glowIntensity / t.glowLayers;
            const alpha = 0.08 - g * 0.015;
            ctx.fillStyle = `hsla(${t.hue1}, ${t.saturation}%, ${t.lightness}%, ${Math.max(alpha, 0.01)})`;
            this.drawShape(ctx, 0, 0, gSize, t.coreShape);
        }

        // Core shape fill
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, `hsla(${t.hue1}, ${t.saturation}%, ${t.lightness + 20}%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${t.hue2}, ${t.saturation}%, ${t.lightness}%, 0.7)`);
        gradient.addColorStop(1, `hsla(${t.hue3}, ${t.saturation}%, ${t.lightness - 10}%, 0.3)`);
        ctx.fillStyle = gradient;
        this.drawShape(ctx, 0, 0, size, t.coreShape);

        // Inner highlight
        ctx.fillStyle = `hsla(${t.hue1}, ${t.saturation}%, ${t.lightness + 30}%, 0.15)`;
        this.drawShape(ctx, 0, -size * 0.15, size * 0.5, t.coreShape);

        ctx.restore();
    },

    /** Draw a specific shape */
    drawShape(ctx, x, y, size, shape) {
        ctx.beginPath();
        switch (shape) {
            case 'circle':
                ctx.arc(x, y, size, 0, Math.PI * 2);
                break;
            case 'hexagon':
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const px = x + Math.cos(angle) * size;
                    const py = y + Math.sin(angle) * size;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
            case 'diamond':
                ctx.moveTo(x, y - size);
                ctx.lineTo(x + size * 0.7, y);
                ctx.lineTo(x, y + size);
                ctx.lineTo(x - size * 0.7, y);
                ctx.closePath();
                break;
            case 'star':
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI / 5) * i - Math.PI / 2;
                    const r = i % 2 === 0 ? size : size * 0.4;
                    const px = x + Math.cos(angle) * r;
                    const py = y + Math.sin(angle) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
            case 'nebula':
                for (let i = 0; i < 60; i++) {
                    const angle = (Math.PI * 2 * i) / 60;
                    const wobble = Math.sin(angle * 3 + this.time * 0.02) * size * 0.2;
                    const r = size + wobble;
                    const px = x + Math.cos(angle) * r;
                    const py = y + Math.sin(angle) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
            case 'spiral':
                for (let i = 0; i < 200; i++) {
                    const angle = (i / 200) * Math.PI * 6;
                    const r = (i / 200) * size;
                    const px = x + Math.cos(angle) * r;
                    const py = y + Math.sin(angle) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                break;
        }
        ctx.fill();
    },

    /** Draw orbital rings */
    drawRings(ctx, cx, cy, t) {
        for (let i = 0; i < t.ringCount; i++) {
            const radius = t.coreSize + 30 + i * t.ringSpacing;
            const wobble = Math.sin(this.time * 0.01 + i) * 5;
            const alpha = 0.15 - i * 0.02;

            ctx.beginPath();
            ctx.arc(cx, cy, radius + wobble, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${t.hue2 + i * 30}, ${t.saturation}%, ${t.lightness}%, ${Math.max(alpha, 0.03)})`;
            ctx.lineWidth = 1 + Math.sin(this.time * 0.02 + i * 0.5) * 0.5;
            ctx.stroke();

            // Ring particles
            const ringParticleCount = 3 + i * 2;
            for (let j = 0; j < ringParticleCount; j++) {
                const a = (Math.PI * 2 * j) / ringParticleCount + this.time * 0.005 * (i % 2 === 0 ? 1 : -1);
                const px = cx + Math.cos(a) * (radius + wobble);
                const py = cy + Math.sin(a) * (radius + wobble);
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${t.hue3 + i * 40}, ${t.saturation}%, ${t.lightness + 20}%, 0.6)`;
                ctx.fill();
            }
        }
    },

    /** Update and render particles */
    updateParticles(ctx, cx, cy, t) {
        this.particles.forEach(p => {
            p.angle += p.orbitSpeed + t.rotationSpeed * 0.5;
            p.orbit += Math.sin(this.time * 0.01 + p.angle) * 0.3;

            p.x = cx + Math.cos(p.angle) * p.orbit;
            p.y = cy + Math.sin(p.angle) * p.orbit;

            // Draw particle
            const alpha = 0.3 + Math.sin(this.time * 0.05 + p.angle) * 0.3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${t.saturation}%, ${t.lightness + 10}%, ${alpha})`;
            ctx.fill();

            // Small glow
            if (p.size > 2) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, ${t.saturation}%, ${t.lightness}%, 0.05)`;
                ctx.fill();
            }
        });
    },

    /** Draw center glow */
    drawGlow(ctx, cx, cy, t) {
        const pulse = Math.sin(this.time * t.pulseRate) * 0.3 + 0.5;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, t.coreSize * 2);
        gradient.addColorStop(0, `hsla(${t.hue1}, ${t.saturation}%, ${t.lightness + 20}%, ${0.08 * pulse})`);
        gradient.addColorStop(0.5, `hsla(${t.hue2}, ${t.saturation}%, ${t.lightness}%, ${0.03 * pulse})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    /** Draw symmetry reflections */
    drawSymmetry(ctx, cx, cy, t) {
        const sym = t.symmetry;
        for (let s = 1; s < sym; s++) {
            const angle = (Math.PI * 2 * s) / sym;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.translate(-cx, -cy);
            ctx.globalAlpha = 0.05;

            this.particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue + s * 30}, ${t.saturation}%, ${t.lightness}%, 0.3)`;
                ctx.fill();
            });

            ctx.restore();
        }
    },

    /* ═══════════════════════════════
       MUTATION SYSTEM
       ═══════════════════════════════ */

    /** Mutate a specific trait */
    mutate(traitName, newValue, animate = true) {
        if (!this.traits) return;

        const oldValue = this.traits[traitName];
        if (animate) {
            this.animateMutation(traitName, oldValue, newValue);
        } else {
            this.traits[traitName] = newValue;
        }

        this.traits.mutations++;
        this.mutationHistory.push({
            trait: traitName,
            from: oldValue,
            to: newValue,
            timestamp: Date.now(),
            generation: this.traits.generation
        });
    },

    /** Animate a trait mutation smoothly */
    animateMutation(traitName, fromValue, toValue) {
        const startTime = performance.now();
        const duration = 1500; // 1.5s transition

        if (typeof fromValue === 'number' && typeof toValue === 'number') {
            const animate = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                const eased = this.easeInOut(progress);
                this.traits[traitName] = fromValue + (toValue - fromValue) * eased;

                if (traitName === 'particleCount') {
                    this.traits[traitName] = Math.floor(this.traits[traitName]);
                    while (this.particles.length < this.traits[traitName]) {
                        this.addParticle();
                    }
                    while (this.particles.length > this.traits[traitName]) {
                        this.particles.pop();
                    }
                }

                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        } else {
            // Non-numeric (e.g. shape) — flash and swap
            this.flashMutation(() => {
                this.traits[traitName] = toValue;
                if (traitName === 'coreShape') {
                    // Re-initialize particles for shape change
                    this.initParticles();
                }
            });
        }
    },

    /** Flash effect during mutation */
    flashMutation(callback) {
        const canvas = this.canvas;
        const ctx = this.ctx;
        const w = canvas.width, h = canvas.height;

        // White flash
        let flash = 1;
        const flashAnimate = () => {
            flash -= 0.03;
            if (flash > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.5})`;
                ctx.fillRect(0, 0, w, h);
                requestAnimationFrame(flashAnimate);
            }
        };

        callback();
        requestAnimationFrame(flashAnimate);
    },

    /** Add a single particle */
    addParticle() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * (this.traits.coreSize + 80);
        this.particles.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * this.traits.particleSpeed,
            vy: (Math.random() - 0.5) * this.traits.particleSpeed,
            size: 1 + Math.random() * this.traits.particleSize,
            hue: this.traits.hue1 + Math.random() * 60 - 30,
            orbit: dist,
            angle: angle,
            orbitSpeed: (Math.random() - 0.5) * 0.02
        });
    },

    /* ═══════════════════════════════
       PREDEFINED MUTATIONS
       (Triggered by events / votes / oracle)
       ═══════════════════════════════ */

    /** Block-driven evolution: modify based on block data */
    evolveFromBlock(blockNumber) {
        const mutations = [];
        const digit = blockNumber % 10;

        // Hue shift based on block
        const hueShift = (blockNumber % 360);
        this.mutate('hue1', hueShift);
        mutations.push({ trait: 'hue1', value: hueShift });

        // Occasionally change shape
        if (blockNumber % 50 === 0) {
            const shapes = this.TRAIT_RANGES.coreShape;
            const newShape = shapes[blockNumber % shapes.length];
            this.mutate('coreShape', newShape);
            mutations.push({ trait: 'coreShape', value: newShape });
        }

        // Pulse based on digit
        const newPulse = 0.005 + (digit / 10) * 0.045;
        this.mutate('pulseRate', newPulse);

        return mutations;
    },

    /** Vote-driven mutation */
    applyVoteMutation(voteType) {
        const old = this.getTraitSnapshot();

        switch (voteType) {
            case 'color_shift':
                this.mutate('hue1', (this.traits.hue1 + 60) % 360);
                this.mutate('hue2', (this.traits.hue2 + 60) % 360);
                this.mutate('hue3', (this.traits.hue3 + 60) % 360);
                break;
            case 'grow':
                this.mutate('coreSize', Math.min(this.traits.coreSize + 20, 200));
                this.mutate('particleCount', Math.min(this.traits.particleCount + 20, 150));
                break;
            case 'shrink':
                this.mutate('coreSize', Math.max(this.traits.coreSize - 20, 60));
                this.mutate('particleCount', Math.max(this.traits.particleCount - 20, 20));
                break;
            case 'energize':
                this.mutate('particleSpeed', Math.min(this.traits.particleSpeed + 0.3, 2.0));
                this.mutate('rotationSpeed', this.traits.rotationSpeed + 0.005);
                this.mutate('glowIntensity', Math.min(this.traits.glowIntensity + 10, 60));
                break;
            case 'calm':
                this.mutate('particleSpeed', Math.max(this.traits.particleSpeed - 0.3, 0.2));
                this.mutate('rotationSpeed', this.traits.rotationSpeed * 0.5);
                this.mutate('glowIntensity', Math.max(this.traits.glowIntensity - 10, 10));
                break;
            case 'evolve_shape':
                const shapes = this.TRAIT_RANGES.coreShape;
                const currentIdx = shapes.indexOf(this.traits.coreShape);
                const nextShape = shapes[(currentIdx + 1) % shapes.length];
                this.mutate('coreShape', nextShape);
                break;
            case 'add_rings':
                this.mutate('ringCount', Math.min(this.traits.ringCount + 1, 5));
                break;
            case 'add_symmetry':
                this.mutate('symmetry', Math.min(this.traits.symmetry + 2, 12));
                break;
        }

        this.traits.generation++;
        return { before: old, after: this.getTraitSnapshot() };
    },

    /** Oracle-driven evolution (e.g. weather, crypto price) */
    evolveFromOracle(oracleType, value) {
        const old = this.getTraitSnapshot();

        switch (oracleType) {
            case 'temperature':
                // Map temperature to hue (cold=blue, hot=red)
                const tempHue = this.mapRange(value, -10, 40, 240, 0);
                this.mutate('hue1', tempHue);
                this.mutate('saturation', this.mapRange(Math.abs(value - 20), 0, 30, 60, 100));
                break;
            case 'price':
                // Map crypto price movement to energy
                if (value > 0) {
                    this.mutate('particleSpeed', Math.min(this.traits.particleSpeed + 0.1 * value, 2.0));
                    this.mutate('glowIntensity', Math.min(this.traits.glowIntensity + 2, 60));
                    this.mutate('hue1', 120); // Green for up
                } else {
                    this.mutate('particleSpeed', Math.max(this.traits.particleSpeed + 0.05 * value, 0.2));
                    this.mutate('hue1', 0); // Red for down
                }
                break;
            case 'wind':
                this.mutate('rotationSpeed', this.mapRange(value, 0, 100, 0.001, 0.03));
                break;
            case 'time_of_day':
                const hour = value;
                if (hour >= 6 && hour < 12) {
                    this.mutate('lightness', 60);
                    this.mutate('saturation', 80);
                } else if (hour >= 12 && hour < 18) {
                    this.mutate('lightness', 55);
                    this.mutate('saturation', 90);
                } else if (hour >= 18 && hour < 22) {
                    this.mutate('lightness', 40);
                    this.mutate('saturation', 70);
                } else {
                    this.mutate('lightness', 30);
                    this.mutate('saturation', 50);
                }
                break;
        }

        this.traits.generation++;
        return { before: old, after: this.getTraitSnapshot(), oracleType, value };
    },

    /* ═══════════════════════════════
       UTILITY
       ═══════════════════════════════ */

    getTraitSnapshot() {
        return JSON.parse(JSON.stringify(this.traits));
    },

    seededRandom(seed) {
        let s = seed;
        return function () {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    },

    randRange(rng, range) {
        return range.min + rng() * (range.max - range.min);
    },

    mapRange(value, inMin, inMax, outMin, outMax) {
        return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
    },

    easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    /** Export current state for serialization */
    exportState() {
        return {
            artId: this.artId,
            traits: this.getTraitSnapshot(),
            mutationHistory: this.mutationHistory,
            timestamp: Date.now()
        };
    }
};
