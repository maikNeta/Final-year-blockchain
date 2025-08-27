import { rpcManager } from './rpcManager.js';
import { classifyError, shouldRetry, getRetryDelay } from './errors.js';

export async function sendSafeTx(web3, method, from, options = {}) {
  const maxRetries = options.maxRetries || 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 1) Simulate to catch reverts early
      await rpcManager.executeWithRetry(() => method.call({ from }));

      // 2) Estimate gas with retry logic
      const estimated = await rpcManager.executeWithRetry(() => 
        method.estimateGas({ from })
      );
      const gas = Math.floor(Number(estimated) * (options.gasMultiplier || 1.2)); // configurable safety margin

      // 3) Get gas price with retry logic
      const gasPrice = await rpcManager.executeWithRetry(() => 
        web3.eth.getGasPrice()
      );

      // 4) Send transaction with retry logic
      const result = await rpcManager.executeWithRetry(() => 
        method.send({ 
          from, 
          gas, 
          gasPrice,
          ...options.extraParams 
        })
      );

      return result;
    } catch (error) {
      lastError = error;
      
      // Log attempt details
      console.warn(`Transaction attempt ${attempt} failed:`, {
        error: error.message,
        attempt,
        maxRetries,
        errorType: classifyError(error).type
      });

      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error, attempt)) {
        const delay = getRetryDelay(attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If we shouldn't retry or have exhausted retries, throw the error
      break;
    }
  }

  // If we get here, all retries failed
  throw lastError;
}

export async function sendTransactionWithRetry(web3, method, from, options = {}) {
  return sendSafeTx(web3, method, from, options);
}

export async function estimateGasWithRetry(web3, method, from) {
  return rpcManager.executeWithRetry(() => method.estimateGas({ from }));
}

export async function getGasPriceWithRetry(web3) {
  return rpcManager.executeWithRetry(() => web3.eth.getGasPrice());
}

export async function getNonceWithRetry(web3, address) {
  return rpcManager.executeWithRetry(() => web3.eth.getTransactionCount(address, 'pending'));
}

export async function waitForTransaction(web3, txHash, options = {}) {
  const maxAttempts = options.maxAttempts || 50;
  const interval = options.interval || 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const receipt = await rpcManager.executeWithRetry(() => 
        web3.eth.getTransactionReceipt(txHash)
      );
      
      if (receipt) {
        return receipt;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.warn(`Transaction receipt check attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxAttempts) {
        throw new Error(`Failed to get transaction receipt after ${maxAttempts} attempts`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error('Transaction receipt not found within timeout period');
}
