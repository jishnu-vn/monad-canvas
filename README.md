# Monad Canvas

**Live Application:** [monad-canvas-orcin.vercel.app](https://monad-canvas-orcin.vercel.app/)

A decentralized 64x64 collaborative pixel canvas on the Monad Testnet. It features an AI-driven semantic engine (powered by Google Gemini) that translates natural language text prompts into precise geometric pixel mutations, which are then permanently recorded on-chain.

## Smart Contract (Monad Testnet)
- **Contract Address:** [`0x31730e1c229f77054de4381ed6c18dc6afe3ed57`](https://testnet.monadscan.com/address/0x31730e1c229f77054de4381ed6c18dc6afe3ed57)
- **Deployment Transaction:** [`0x186e50baa73387a27046b14d92df48339e6aeb827687765a2acb396224985860`](https://testnet.monadscan.com/tx/0x186e50baa73387a27046b14d92df48339e6aeb827687765a2acb396224985860)

## Architecture & Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS, optimized for a single-screen responsive viewport.
- **Web3 Integration:** `ethers.js` (v6) for wallet connection, read states, and executing transaction mutations.
- **Backend (Semantic Engine):** Node.js Express server. Receives text instructions, interfaces with the Gemini API to compute coordinate-mapped shapes (circles/rectangles), and returns an optimized array of pixels to mutate.
- **Infrastructure:** Configured for Vercel Serverless Functions via `vercel.json` (`@vercel/node` for the API, `@vercel/static` for the frontend).

## Setup & Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

3. **Run Locally:**
   ```bash
   # Starts the backend on port 3001
   node server.js
   
   # Serve the frontend statically
   npx serve -l 3000
   ```
   *Note: In production on Vercel, requests to `/api/*` are natively routed to `server.js`.*

## Core Contract Methods
- `getCanvasState()`: Returns two 4096-length arrays (`bytes3[] colors`, `address[] owners`).
- `mutatePixel(uint8 x, uint8 y, bytes3 color, string prompt)`: Overwrites a single pixel index.
- `mutatePixelBatch(uint8[] xs, uint8[] ys, bytes3[] colors, string[] prompts)`: Optimally updates regions computed by the semantic engine in a single transaction.