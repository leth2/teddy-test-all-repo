import React from 'react';
import { PermissionRequestData } from '../../types/events';
import { AgentAPI } from '../../services/AgentAPI';

interface PermissionDialogProps {
  request: PermissionRequestData;
  onResolved: () => void;
}

export function PermissionDialog({ request, onResolved }: PermissionDialogProps) {
  const handleRespond = async (approved: boolean) => {
    await AgentAPI.respondPermission(request.requestId, approved);
    onResolved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-600 p-6 max-w-md w-full shadow-2xl">
        <div className="text-yellow-400 text-sm font-semibold mb-1 uppercase tracking-wide">
          권한 요청
        </div>
        <div className="text-white text-base font-medium mb-2">{request.description}</div>
        <div className="text-gray-400 text-xs mb-1">타입: {request.type}</div>
        {request.details && (
          <pre className="text-gray-300 text-xs bg-black/40 rounded p-2 mb-4 overflow-auto max-h-32">
            {JSON.stringify(request.details, null, 2)}
          </pre>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleRespond(false)}
            className="px-4 py-2 rounded-lg bg-red-900 hover:bg-red-700 text-red-100 text-sm font-medium transition-colors"
          >
            거부
          </button>
          <button
            onClick={() => handleRespond(true)}
            className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors"
          >
            승인
          </button>
        </div>
      </div>
    </div>
  );
}
