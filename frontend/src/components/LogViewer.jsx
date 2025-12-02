import { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Download, Pause, Play, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

const LogViewer = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const logContainerRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isPaused) {
      connectToLogStream();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isOpen, isPaused]);

  useEffect(() => {
    // 자동 스크롤
    if (logContainerRef.current && !isPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const connectToLogStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiUrl = API_BASE.replace('/api', '');
    const eventSource = new EventSource(`${apiUrl}/api/logs/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        if (log.type !== 'connected') {
          setLogs(prev => [...prev.slice(-500), log]);
        }
      } catch (e) {
        console.error('Failed to parse log:', e);
      }
    };

    eventSource.onerror = () => {
      console.error('Log stream connection error');
      eventSource.close();
      // 5초 후 재연결 시도
      setTimeout(() => {
        if (isOpen && !isPaused) {
          connectToLogStream();
        }
      }, 5000);
    };
  };

  const handleClearLogs = async () => {
    try {
      const apiUrl = API_BASE.replace('/api', '');
      await fetch(`${apiUrl}/api/logs`, { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'debug': return 'text-purple-400';
      default: return 'text-blue-400';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Server Logs</h2>
            <span className="text-sm text-gray-400">({filteredLogs.length} logs)</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
            </select>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 text-gray-300 text-sm rounded px-3 py-1 border border-gray-600 w-40"
            />
            
            {/* Actions */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`p-2 rounded ${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
            </button>
            
            <button
              onClick={handleDownloadLogs}
              className="p-2 rounded bg-blue-600 hover:bg-blue-700"
              title="Download logs"
            >
              <Download className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={handleClearLogs}
              className="p-2 rounded bg-red-600 hover:bg-red-700"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded bg-gray-700 hover:bg-gray-600"
              title="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        
        {/* Log Content */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-950"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              {isPaused ? 'Log stream paused' : 'Waiting for logs...'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={log.id || index}
                className="py-1 hover:bg-gray-800 px-2 rounded"
              >
                <span className="text-gray-500">[{log.timestamp?.slice(11, 19) || ''}]</span>
                <span className={`ml-2 ${getLogColor(log.level)}`}>[{log.level?.toUpperCase()}]</span>
                <span className="text-gray-300 ml-2">{log.message}</span>
                {log.data && (
                  <span className="text-gray-500 ml-2">
                    {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 flex items-center justify-between text-sm text-gray-400">
          <span>
            {isPaused ? (
              <span className="text-yellow-400">● Paused</span>
            ) : (
              <span className="text-green-400">● Connected</span>
            )}
          </span>
          <span>Press Escape to close</span>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;


