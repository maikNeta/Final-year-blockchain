import React from 'react';
import { CONTRACT_ADDRESS } from '../config';

export default function DeploymentStatus() {
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg shadow-lg">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Contract Deployed Successfully</span>
      </div>
      <div className="text-xs mt-1 opacity-75">
        Address: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
      </div>
    </div>
  );
}
