import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { rpcManager } from '../utils/rpcManager';

export default function ErrorMonitor() {
  const { rpcStatus: web3RpcStatus, checkRPCHealth } = useWeb3();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [endpointLatency, setEndpointLatency] = useState({});
  const [rpcStatus, setRpcStatus] = useState({});
  const [configInfo, setConfigInfo] = useState(null);

  const checkEndpointLatency = async (endpoint) => {
    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const latency = Date.now() - start;
        return latency;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const checkAllEndpoints = async () => {
    const endpoints = rpcManager.getAllEndpoints();
    const latencyResults = {};
    
    for (const endpoint of endpoints) {
      const latency = await checkEndpointLatency(endpoint);
      latencyResults[endpoint] = latency;
    }
    
    setEndpointLatency(latencyResults);
    setLastChecked(new Date());
  };

  useEffect(() => {
    const checkRPCHealth = async () => {
      try {
        const status = await rpcManager.getEndpointStatus();
        setRpcStatus(status);
        
        // Get configuration info
        const info = rpcManager.getConfigurationInfo();
        setConfigInfo(info);
      } catch (error) {
        console.error('Failed to check RPC health:', error);
      }
    };

    checkRPCHealth();
    const interval = setInterval(checkRPCHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  const getLatencyColor = (latency) => {
    if (!latency) return 'text-red-600';
    if (latency < 1000) return 'text-green-600';
    if (latency < 3000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLatencyText = (latency) => {
    if (!latency) return 'Failed';
    return `${latency}ms`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Error Monitor"
      >
        {isExpanded ? '×' : '🔍'}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Network Monitor</h3>
            <button
              onClick={checkRPCHealth}
              className="text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
            >
              Refresh
            </button>
          </div>

          {/* RPC Endpoint Status */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">RPC Endpoints</h4>
            <div className="space-y-2">
              {Object.entries(rpcStatus).map(([endpoint, status]) => (
                <div key={endpoint} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate flex-1 mr-2">
                    {endpoint.replace('https://', '')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className={`${getStatusColor(status)}`}>
                      {status ? '●' : '○'}
                    </span>
                    <span className={`${getLatencyColor(endpointLatency[endpoint])} text-xs`}>
                      {getLatencyText(endpointLatency[endpoint])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Info */}
          {configInfo && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Configuration</h4>
              <div className="space-y-1 text-sm">
                {configInfo.customRpc && (
                  <div className="text-gray-600">
                    <strong>Custom RPC:</strong> {configInfo.customRpc.replace('https://', '')}
                  </div>
                )}
                {configInfo.wssEndpoint && (
                  <div className="text-gray-600">
                    <strong>WebSocket RPC:</strong> {configInfo.wssEndpoint.replace('wss://', '')}
                  </div>
                )}
                <div className="text-gray-600">
                  <strong>Fallback Endpoints:</strong> {configInfo.fallbackEndpoints.length}
                </div>
                <div className="text-gray-600">
                  <strong>Total Endpoints:</strong> {configInfo.totalEndpoints}
                </div>
              </div>
            </div>
          )}

          {/* Current Status */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Current Status</h4>
            <div className="text-sm text-gray-600">
              <p>Active Endpoint: {rpcManager.getCurrentEndpoint().replace('https://', '')}</p>
              <p>Last Checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => rpcManager.switchToNextEndpoint()}
                className="w-full text-sm bg-yellow-100 text-yellow-700 px-3 py-2 rounded hover:bg-yellow-200"
              >
                Switch RPC Endpoint
              </button>
              <button
                onClick={checkAllEndpoints}
                className="w-full text-sm bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200"
              >
                Test All Endpoints
              </button>
            </div>
          </div>

          {/* Error Log */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Recent Errors</h4>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p>No recent errors logged</p>
              <p className="mt-1">Errors will appear here when they occur</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
