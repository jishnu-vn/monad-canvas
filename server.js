const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files locally
app.use(express.static(__dirname));

// Models to try in order (fallback chain)
const MODEL_CHAIN = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
];

async function callGeminiWithRetry(genAI, promptText, maxRetries = 3) {
    for (const modelName of MODEL_CHAIN) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Trying model: ${modelName} (attempt ${attempt}/${maxRetries})`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(promptText);
                const text = result.response.text();
                console.log(`Success with ${modelName}!`);
                return text;
            } catch (err) {
                const status = err.status || 0;
                console.warn(`Model ${modelName} attempt ${attempt} failed: ${status} ${err.statusText || err.message}`);
                
                // If 503/429 (rate limit/overload), wait and retry same model
                if ((status === 503 || status === 429) && attempt < maxRetries) {
                    const waitMs = 1000 * attempt; // exponential-ish backoff
                    console.log(`Waiting ${waitMs}ms before retry...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }
                // If 404 (model not found) or exhausted retries, try next model
                break;
            }
        }
    }
    throw new Error('All Gemini models failed after retries.');
}

app.post('/api/mutate', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const systemPrompt = `You are a Semantic Pixel Engine for a 64x64 pixel canvas.
The user wants to mutate a specific region of the canvas based on a text prompt.
Output one or more geometric bounding shapes (rectangles or circles) and the target color for each shape.

Canvas layout (64x64, origin top-left):
- Sky: rect x1=0 y1=0 x2=63 y2=24
- Sun: circle cx=12 cy=8 r=5
- Grass/Ground: rect x1=0 y1=25 x2=63 y2=63 (excludes house/road/people)
- House walls: rect x1=24 y1=28 x2=40 y2=40
- Roof: triangle above house, roughly rect x1=22 y1=20 x2=42 y2=27
- Road: rect x1=22 y1=41 x2=42 y2=63 (widens toward bottom)
- Person 1: rect x1=16 y1=42 x2=18 y2=48
- Person 2: rect x1=48 y1=40 x2=50 y2=46

User Prompt: "${prompt}"

IMPORTANT: Return ONLY raw JSON, no markdown code fences. Use this exact schema:
{"shapes":[{"type":"rect","x1":0,"y1":0,"x2":63,"y2":24,"color":"#1a1a2e"},{"type":"circle","cx":12,"cy":8,"r":5,"color":"#FFD700"}]}

Rules:
- "type" must be "rect" or "circle"
- For rect: include x1,y1,x2,y2
- For circle: include cx,cy,r
- Always include "color" as a 7-char hex string
- You may return multiple shapes to create interesting effects
- Choose colors that match the user's description creatively`;

        const textResponse = await callGeminiWithRetry(genAI, systemPrompt);
        
        // Strip any accidental markdown fences
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').replace(/\/\/.*/g, '').trim();
        console.log('Gemini raw response:', cleanJson);
        
        let parsed;
        try {
            parsed = JSON.parse(cleanJson);
        } catch (parseErr) {
            console.error('JSON parse failed on:', cleanJson);
            return res.status(500).json({ error: 'AI returned invalid JSON. Try again.' });
        }
        
        const xs = [];
        const ys = [];
        const colors = [];
        
        const size = 64;
        
        if (parsed.shapes && Array.isArray(parsed.shapes)) {
            for (const shape of parsed.shapes) {
                if (shape.type === 'rect') {
                    const x1 = Math.max(0, Math.min(63, shape.x1 || 0));
                    const y1 = Math.max(0, Math.min(63, shape.y1 || 0));
                    const x2 = Math.max(0, Math.min(63, shape.x2 || 0));
                    const y2 = Math.max(0, Math.min(63, shape.y2 || 0));
                    for (let y = y1; y <= y2; y++) {
                        for (let x = x1; x <= x2; x++) {
                            xs.push(x);
                            ys.push(y);
                            colors.push(shape.color);
                        }
                    }
                } else if (shape.type === 'circle') {
                    const cx = shape.cx || 0;
                    const cy = shape.cy || 0;
                    const r = shape.r || 1;
                    for (let y = 0; y < size; y++) {
                        for (let x = 0; x < size; x++) {
                            if (Math.hypot(x - cx, y - cy) <= r) {
                                xs.push(x);
                                ys.push(y);
                                colors.push(shape.color);
                            }
                        }
                    }
                }
            }
        }
        
        if (xs.length === 0) {
            return res.status(400).json({ error: 'AI did not identify any pixels to mutate.' });
        }

        // Only attach prompt string to first pixel to save gas
        const prompts = Array(xs.length).fill("");
        prompts[0] = prompt;

        console.log(`Returning ${xs.length} pixels to mutate.`);
        res.json({ xs, ys, colors, regionSize: xs.length, prompts });

    } catch (err) {
        console.error('Gemini API Error:', err.message || err);
        res.status(500).json({ error: err.message || 'Failed to process AI mutation.' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Gemini Semantic Engine running on http://localhost:${PORT}`);
});
