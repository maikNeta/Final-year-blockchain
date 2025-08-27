# 🔧 Troubleshooting Guide

## 🚨 Common Errors and Solutions

### 0. **Environment Setup (Important!)**

**For Dual .env Configuration:**
You can have RPC endpoints in both root and votingdapp directories:

#### **Root Directory .env:**
```bash
# Backend/Smart Contract Configuration
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
AMOY_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_deployer_wallet_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

#### **Votingdapp Directory .env:**
```bash
# Frontend Configuration
VITE_CONTRACT_ADDRESS=0x993e9254713F7d6c1F51eA71BAB8D6742b28284f
VITE_INFURA_RPC=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
VITE_INFURA_WSS_RPC=wss://polygon-mainnet.infura.io/ws/v3/YOUR_PROJECT_ID
```

**Environment Variable Priority:**
1. **`POLYGON_RPC_URL`** (root .env) - Highest Priority ⭐
2. **`VITE_INFURA_RPC`** (votingdapp .env) - Fallback
3. **Fallback endpoints** - Public Polygon RPCs if custom ones fail

**Benefits of Custom RPC:**
- Higher rate limits
- Better reliability
- Faster response times
- Full transaction support
- Priority over public endpoints
- WebSocket support for real-time updates

### 1. **"eth_sendTransaction method is currently not implemented"**

**Error**: `❌ Returned error: the method is currently not implemented: eth_sendTransaction`

**Cause**: The RPC endpoint you're connected to doesn't support transaction sending (write operations). Some public RPC endpoints only support read operations.

**Solutions**:

#### **Option A: Automatic Fix (Recommended)**
The system will automatically detect and switch to a working RPC endpoint:
1. Refresh the page
2. Check the console for RPC endpoint testing logs
3. The system will automatically find an endpoint that supports transactions

#### **Option B: Manual RPC Switch**
1. Click the floating 🔍 button (Error Monitor)
2. Click "Switch RPC Endpoint"
3. Try creating the election again

#### **Option C: Force Refresh**
1. Disconnect your wallet
2. Refresh the page
3. Reconnect your wallet
4. The system will test all RPC endpoints and find a working one

### 2. **"No working RPC endpoints found"**

**Cause**: All RPC endpoints are either down or don't support transactions.

**Solutions**:
1. Check your internet connection
2. Wait a few minutes and try again
3. Some RPC endpoints may be temporarily overloaded

### 3. **"User rejected transaction"**

**Cause**: You clicked "Reject" in MetaMask or the transaction was cancelled.

**Solution**: Try again and make sure to approve the transaction in MetaMask.

### 4. **"Insufficient funds for gas"**

**Cause**: Your wallet doesn't have enough MATIC to pay for gas fees.

**Solution**: 
1. Add MATIC to your wallet (minimum 0.1 MATIC recommended)
2. Polygon gas fees are typically very low (0.001-0.01 MATIC)

## 🔍 **Debugging Steps**

### **Step 1: Check Console Logs**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for RPC endpoint testing logs
4. Check for any error messages

### **Step 2: Use Error Monitor**
1. Click the floating 🔍 button
2. Check RPC endpoint status
3. View endpoint latency
4. Manually switch endpoints if needed

### **Step 3: Verify Network**
1. Ensure you're on Polygon Mainnet (Chain ID: 137)
2. Check if MetaMask shows the correct network
3. Try switching networks and back to Polygon

## 🌐 **RPC Endpoint Status**

The system automatically tests these endpoints for transaction support:

1. **Custom RPC** (from your .env file) - Highest Priority ⭐
2. **https://polygon-rpc.com** - Official Polygon RPC ✅
3. **https://polygon-mainnet.public.blastapi.io** - Blast API ✅
4. **https://polygon.drpc.org** - DRPC ✅
5. **https://rpc.ankr.com/polygon** - Ankr RPC ✅
6. **https://polygon.llamarpc.com** - LlamaRPC ✅

**Note**: If you have a custom RPC endpoint in your `.env` file (like Infura), it will be tested first and used as the primary endpoint.

## 🚀 **Quick Fix Commands**

### **If you're still having issues:**

```bash
# 1. Clear browser cache and cookies
# 2. Restart the frontend
cd votingdapp
npm run dev

# 3. Check the console for RPC testing logs
# 4. Use the Error Monitor to check endpoint status
```

## 📞 **Still Need Help?**

If you continue to experience issues:

1. **Check the console** for detailed error logs
2. **Use the Error Monitor** to see RPC status
3. **Try different browsers** (Chrome, Firefox, Edge)
4. **Check MetaMask** network settings
5. **Verify your wallet** has sufficient MATIC

## 🎯 **Prevention Tips**

1. **Always use the Error Monitor** to check RPC health
2. **Keep some MATIC** in your wallet for gas fees
3. **Use reliable networks** (avoid public WiFi for transactions)
4. **Check endpoint status** before major operations

---

**Most issues are automatically resolved by the RPC management system. If problems persist, the Error Monitor will show you exactly what's happening.** 🔍
