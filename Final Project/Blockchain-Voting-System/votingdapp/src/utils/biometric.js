// Simulate reading biometric data (e.g., from a fingerprint or face scan)
export function readBiometricData() {
  // In a real app, integrate with a biometric API/device
  // Here, we simulate with a random string
  return 'biometric-sample-' + Math.random().toString(36).substring(2, 15);
}

// Hash biometric data using SHA-256 (browser crypto API)
export async function hashBiometricData(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
} 