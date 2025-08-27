# 🔧 Dual .env Configuration Setup

## 📁 **File Structure**

Your project has two `.env` files for different purposes:

```
Blockchain-Voting-System/
├── .env                    # Root directory (Backend/Smart Contract)
└── votingdapp/
    └── .env               # Frontend directory (React DApp)
```

## 🎯 **Purpose of Each .env File**

### **Root Directory .env** (Backend/Smart Contract)
- **Purpose**: Hardhat configuration, contract deployment, backend services
- **Variables**: 
  - `POLYGON_RPC_URL` - HTTP RPC endpoint for contract deployment
  - `AMOY_RPC_URL` - Testnet RPC endpoint for testing
  - `PRIVATE_KEY` - Deployer wallet private key
  - `POLYGONSCAN_API_KEY` - For contract verification

### **Votingdapp Directory .env** (Frontend)
- **Purpose**: React DApp configuration, frontend environment variables
- **Variables**:
  - `VITE_CONTRACT_ADDRESS` - Deployed contract address
  - `VITE_INFURA_RPC` - HTTP RPC endpoint for frontend
  - `VITE_INFURA_WSS_RPC` - WebSocket RPC for frontend

## 🔧 **Setup Instructions**

### **Step 1: Root Directory .env**
Create `.env` in the root directory:

```bash
# Backend/Smart Contract Configuration
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
AMOY_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_deployer_wallet_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

### **Step 2: Votingdapp Directory .env**
Create `.env` in the `votingdapp` directory:

```bash
# Frontend Configuration
VITE_CONTRACT_ADDRESS=0x993e9254713F7d6c1F51eA71BAB8D6742b28284f
VITE_INFURA_RPC=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
VITE_INFURA_WSS_RPC=wss://polygon-mainnet.infura.io/ws/v3/YOUR_PROJECT_ID
```

## 🔍 **How the System Works**

### **RPC Endpoint Priority:**
1. **`POLYGON_RPC_URL`** (root .env) - Highest Priority ⭐
2. **`VITE_INFURA_RPC`** (votingdapp .env) - Fallback
3. **Fallback endpoints** - Public Polygon RPCs if custom ones fail

### **Automatic Detection:**
The system automatically:
- Detects your custom Infura RPC endpoint
- Tests it for transaction support (`eth_sendTransaction`)
- Uses it as the primary endpoint
- Falls back to public endpoints if needed

## 🚀 **Benefits of This Setup**

### **Separation of Concerns:**
- **Root .env**: Backend configuration, deployment, private keys
- **Votingdapp .env**: Frontend configuration, public endpoints

### **Security:**
- Private keys stay in root directory (not accessible to frontend)
- Frontend only has public endpoints and contract addresses
- No sensitive data exposed to browser

### **Flexibility:**
- Different RPC endpoints for different purposes
- Easy to switch between environments
- Maintains deployment and frontend configurations separately

## 🔧 **Troubleshooting**

### **If RPC Endpoints Don't Work:**

1. **Check Environment Variables:**
   ```bash
   # In votingdapp directory
   echo $VITE_INFURA_RPC
   echo $VITE_INFURA_WSS_RPC
   ```

2. **Verify .env Files Exist:**
   ```bash
   # Root directory
   ls -la .env
   
   # Votingdapp directory
   ls -la votingdapp/.env
   ```

3. **Check Console Logs:**
   Look for:
   ```
   🔗 Custom RPC endpoint configured: https://polygon-mainnet.infura.io/v3/...
   🔗 WebSocket RPC endpoint configured: wss://polygon-mainnet.infura.io/ws/v3/...
   ```

### **Common Issues:**

- **Missing VITE_ prefix**: Frontend variables must start with `VITE_`
- **Wrong directory**: Make sure .env files are in the correct locations
- **File permissions**: Ensure .env files are readable
- **Restart required**: Frontend needs restart after .env changes

## 📋 **Complete Example**

### **Root .env:**
```bash
# Smart Contract Deployment
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/abc123def456ghi789
AMOY_RPC_URL=https://polygon-amoy.infura.io/v3/abc123def456ghi789
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
POLYGONSCAN_API_KEY=ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZA567BCD890
```

### **Votingdapp .env:**
```bash
# Frontend Configuration
VITE_CONTRACT_ADDRESS=0x993e9254713F7d6c1F51eA71BAB8D6742b28284f
VITE_INFURA_RPC=https://polygon-mainnet.infura.io/v3/abc123def456ghi789
VITE_INFURA_WSS_RPC=wss://polygon-mainnet.infura.io/ws/v3/abc123def456ghi789
```

## 🎯 **Next Steps**

1. **Create both .env files** with your Infura project ID
2. **Restart the frontend** (`npm run dev`)
3. **Check the console** for RPC configuration logs
4. **Try creating an election** - should work with your Infura endpoint
5. **Use Error Monitor** to verify endpoint status

---

**This setup ensures your Infura RPC endpoint is used first, eliminating the `eth_sendTransaction` error!** 🎯
