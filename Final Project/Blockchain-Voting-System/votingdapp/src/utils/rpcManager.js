import dotenv from 'dotenv';
dotenv.config();


export class RPCManager {
  constructor() {
    // Get custom RPC endpoints from environment variables
    // Check both root and votingdapp .env files
    const RPC_URL = process.env.POLYGON_RPC_URL;

    
    this.rpcEndpoints = [
      // Custom RPC endpoints first (highest priority)
      ...(customRpc ? [customRpc] : []),
      
      // Reliable public endpoints as fallbacks
      "https://polygon-rpc.com",
      "https://polygon-mainnet.public.blastapi.io",
      "https://polygon.drpc.org",
      "https://rpc.ankr.com/polygon",
      "https://polygon.llamarpc.com"
    ];
    
    // Store WebSocket endpoint for potential future use
    this.wssEndpoint = customWssRpc;
    
    this.currentEndpointIndex = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    
    // Log configuration for debugging
    if (customRpc) {
      const RPC_URL = process.env.POLYGON_RPC_URL;

    }
    if (customWssRpc) {
      console.log(`🔗 WebSocket RPC endpoint configured: ${customWssRpc}`);
    }
  }

  // Get current RPC endpoint
  getCurrentEndpoint() {
    return this.rpcEndpoints[this.currentEndpointIndex];
  }

  // Switch to next RPC endpoint
  switchToNextEndpoint() {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    console.log(`🔄 Switched to RPC endpoint: ${this.getCurrentEndpoint()}`);
    return this.getCurrentEndpoint();
  }

  // Test RPC endpoint health with transaction support
  async testEndpoint(url) {
    try {
      // Test basic connectivity
      const basicResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!basicResponse.ok) return false;
      
      const basicData = await basicResponse.json();
      if (!basicData.result || isNaN(parseInt(basicData.result, 16))) {
        return false;
      }

      // Test transaction support (eth_sendTransaction)
      const txResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_sendTransaction',
          params: [{
            from: '0x0000000000000000000000000000000000000000',
            to: '0x0000000000000000000000000000000000000000',
            value: '0x0'
          }],
          id: 2
        }),
        signal: AbortSignal.timeout(5000)
      });
      
      if (!txResponse.ok) return false;
      
      const txData = await txResponse.json();
      // Even if it returns an error, it means the method is supported
      // We just need to check it's not "method not found" or "not implemented"
      const errorMessage = txData.error?.message?.toLowerCase() || '';
      const isMethodSupported = !errorMessage.includes('not implemented') && 
                               !errorMessage.includes('method not found') &&
                               !errorMessage.includes('not supported');
      
      return isMethodSupported;
    } catch (error) {
      console.warn(`RPC endpoint test failed for ${url}:`, error.message);
      return false;
    }
  }

  // Find working RPC endpoint
  async findWorkingEndpoint() {
    for (let i = 0; i < this.rpcEndpoints.length; i++) {
      const endpoint = this.rpcEndpoints[i];
      console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
      if (await this.testEndpoint(endpoint)) {
        this.currentEndpointIndex = i;
        console.log(`✅ Found working RPC endpoint: ${endpoint}`);
        return endpoint;
      }
      console.log(`❌ RPC endpoint failed: ${endpoint}`);
    }
    throw new Error("No working RPC endpoints found. All endpoints either failed or don't support transactions.");
  }

  // Execute RPC call with retry logic
  async executeWithRetry(operation, maxRetries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if it's an RPC error that warrants endpoint switching
        if (this.isRPCError(error) && attempt < maxRetries) {
          console.warn(`RPC error on attempt ${attempt}, switching endpoint...`);
          this.switchToNextEndpoint();
          await this.delay(this.retryDelay * attempt); // Exponential backoff
          continue;
        }
        
        // If it's not an RPC error or we've exhausted retries, throw
        if (!this.isRPCError(error) || attempt === maxRetries) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  // Check if error is RPC-related
  isRPCError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;
    
    return (
      errorMessage.includes('rpc') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('not implemented') ||
      errorMessage.includes('method not found') ||
      errorMessage.includes('not supported') ||
      errorCode === -32603 || // Internal JSON-RPC error
      errorCode === -32000 || // Invalid request
      errorCode === -32001 || // Method not found
      errorCode === -32002 || // Invalid params
      errorCode === -32003 || // Internal error
      errorCode === -32004 || // Invalid input
      errorCode === -32005 || // Resource not found
      errorCode === -32006 || // Resource unavailable
      errorCode === -32007 || // Transaction rejected
      errorCode === -32008 || // Method not supported
      errorCode === -32009 || // Limit exceeded
      errorCode === -32010 || // JSON-RPC version not supported
      errorCode === -32700 || // Parse error
      errorCode === -32600 || // Invalid request
      errorCode === -32601 || // Method not found
      errorCode === -32602    // Invalid params
    );
  }

  // Delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get all endpoints for debugging
  getAllEndpoints() {
    return this.rpcEndpoints;
  }

  // Get endpoint status
  async getEndpointStatus() {
    const status = {};
    for (const endpoint of this.rpcEndpoints) {
      status[endpoint] = await this.testEndpoint(endpoint);
    }
    return status;
  }

  // Get WebSocket endpoint
  getWssEndpoint() {
    return this.wssEndpoint;
  }

  // Get all configured endpoints info
  getConfigurationInfo() {
    return {
      customRpc: this.rpcEndpoints[0] || null,
      wssEndpoint: this.wssEndpoint,
      fallbackEndpoints: this.rpcEndpoints.slice(1),
      totalEndpoints: this.rpcEndpoints.length
    };
  }
}

// Singleton instance
export const rpcManager = new RPCManager();
