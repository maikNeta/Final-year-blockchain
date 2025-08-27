import { rpcManager } from './rpcManager.js';

export function mapTxError(err, fallback = "❌ Transaction failed.") {
  try {
    const raw = err?.data?.message || err?.error?.message || err?.message || '';
    const msg = raw.toLowerCase();
    
    // RPC-specific errors
    if (rpcManager.isRPCError(err)) {
      return '🌐 Network error. Please check your connection and try again.';
    }
    
    // Contract-specific errors
    if (msg.includes('only admin')) return '❌ Only admin can perform this action.';
    if (msg.includes('deadline')) return '❌ Deadline restriction prevents this action.';
    if (msg.includes('registration')) return '❌ Registration deadline has passed.';
    if (msg.includes('already')) return '❌ Action already performed.';
    if (msg.includes('insufficient funds')) return '❌ Insufficient funds for gas.';
    if (msg.includes('nonce')) return '❌ Nonce mismatch. Try again or reset account in MetaMask.';
    if (msg.includes('replacement fee too low')) return '❌ Replacement transaction fee too low.';
    if (msg.includes('user rejected')) return '❌ Transaction was rejected by user.';
    if (msg.includes('user denied')) return '❌ Transaction was denied by user.';
    if (msg.includes('gas required exceeds allowance')) return '❌ Gas limit too low. Please try again.';
    if (msg.includes('execution reverted')) return '❌ Transaction reverted. Check contract state.';
    
    // Network errors
    if (msg.includes('network') || msg.includes('connection')) {
      return '🌐 Network connection issue. Please try again.';
    }
    
    // Timeout errors
    if (msg.includes('timeout') || msg.includes('deadline')) {
      return '⏰ Transaction timed out. Please try again.';
    }
    
    // Generic fallback
    return `❌ ${raw || fallback}`;
  } catch (_) {
    return fallback;
  }
}

export function classifyError(error) {
  if (rpcManager.isRPCError(error)) {
    return {
      type: 'RPC_ERROR',
      severity: 'HIGH',
      retryable: true,
      message: 'Network or RPC connection issue'
    };
  }
  
  if (error.message?.includes('user rejected') || error.message?.includes('user denied')) {
    return {
      type: 'USER_REJECTION',
      severity: 'LOW',
      retryable: false,
      message: 'User rejected the transaction'
    };
  }
  
  if (error.message?.includes('insufficient funds')) {
    return {
      type: 'INSUFFICIENT_FUNDS',
      severity: 'MEDIUM',
      retryable: false,
      message: 'Insufficient funds for gas'
    };
  }
  
  if (error.message?.includes('nonce')) {
    return {
      type: 'NONCE_ERROR',
      severity: 'MEDIUM',
      retryable: true,
      message: 'Nonce mismatch, try again'
    };
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    severity: 'MEDIUM',
    retryable: true,
    message: error.message || 'Unknown error occurred'
  };
}

export function shouldRetry(error, attemptCount = 0) {
  const maxRetries = 3;
  if (attemptCount >= maxRetries) return false;
  
  const errorInfo = classifyError(error);
  return errorInfo.retryable;
}

export function getRetryDelay(attemptCount) {
  return Math.min(1000 * Math.pow(2, attemptCount), 10000); // Exponential backoff, max 10s
}
