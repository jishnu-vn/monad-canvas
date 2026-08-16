# Monad Canvas Smart Contracts

This directory contains the **Monad Canvas** onchain smart contract codebase, architected specifically for **Monad Testnet** with parallel EVM optimization and compact storage packing.

---

## 🛠️ Prerequisites & Monad Foundry Setup

Monad Foundry is a custom fork of Foundry with Monad-native EVM execution, staking precompile support, and human-readable trace decoding.

### 1. Install Monad Foundry (via WSL on Windows / Linux / macOS)

```bash
# 1. Install the installer
curl -L https://foundry.category.xyz | bash

# 2. Install Monad-specific binaries
foundryup --network monad
```

> **Note for Windows:** Foundry requires **WSL (Windows Subsystem for Linux)**. If WSL is not yet installed, run `wsl --install` in PowerShell as Administrator.

---

## 🏗️ Project Structure

```
contracts/
├── foundry.toml                # Monad Testnet config (Chain ID: 10143, RPC: testnet-rpc.monad.xyz)
├── src/
│   └── MonadCanvas.sol         # Main 32x32 packed canvas contract
├── test/
│   └── MonadCanvas.t.sol       # Foundry unit tests & gas benchmarks
├── script/
│   └── DeployMonadCanvas.s.sol # Broadcast script for deployment
└── README.md
```

---

## ⚙️ Compilation & Testing

```bash
cd contracts

# Compile contracts
forge compile

# Run full test suite with gas report
forge test -vvv --gas-report
```

---

## 🚀 Deployment to Monad Testnet

### 1. Create an Encrypted Keystore (Recommended)

```bash
cast wallet import monad-deployer --private-key $(cast wallet new | grep 'Private key:' | awk '{print $3}')
```

Check your deployer address:
```bash
cast wallet address --account monad-deployer
```

### 2. Fund Deployer Wallet
Request testnet MON from the official faucet:
- [https://testnet.monad.xyz/](https://testnet.monad.xyz/)

### 3. Deploy Contract

```bash
forge create src/MonadCanvas.sol:MonadCanvas \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer \
  --broadcast
```

Alternatively, deploy using the Foundry script:
```bash
forge script script/DeployMonadCanvas.s.sol:DeployMonadCanvas \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer \
  --broadcast
```

---

## 🔍 Contract Verification (Monad Multi-Explorer)

### Monad Developer API Verification (MonadVision, Socialscan, Monadscan)

```bash
# 1. Generate standard JSON input
forge verify-contract <DEPLOYED_ADDRESS> src/MonadCanvas.sol:MonadCanvas \
  --chain 10143 \
  --show-standard-json-input > /tmp/standard-input.json

# 2. Extract foundry metadata
cat out/MonadCanvas.sol/MonadCanvas.json | jq '.metadata' > /tmp/metadata.json

# 3. Post to Monad verification endpoint
curl -X POST https://agents.devnads.com/v1/verify \
  -H "Content-Type: application/json" \
  -d "{
    \"chainId\": 10143,
    \"contractAddress\": \"<DEPLOYED_ADDRESS>\",
    \"contractName\": \"src/MonadCanvas.sol:MonadCanvas\",
    \"compilerVersion\": \"v0.8.24+commit.e11b9ed9\",
    \"standardJsonInput\": $(cat /tmp/standard-input.json),
    \"foundryMetadata\": $(cat /tmp/metadata.json)
  }"
```
