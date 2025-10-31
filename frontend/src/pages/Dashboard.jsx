import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Filter } from 'lucide-react';
import { api } from '../services/api';
import ResumeCard from '../components/ResumeCard';

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadResumes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getResumes(statusFilter);
      if (result.success) {
        setResumes(result.data || []);
        setError(null);
      } else {
        setError(result.error || '이력서를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError(err.message || '이력서 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleCollect = async () => {
    setCollecting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await api.collectResumes();
      if (result.success) {
        setSuccessMessage(`${result.count || 0}개의 이력서를 수집했습니다.`);
        setTimeout(() => setSuccessMessage(null), 5000);
        loadResumes();
      } else {
        setError(result.error || '이력서 수집에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message || '수집 중 오류가 발생했습니다.');
    } finally {
      setCollecting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const result = await api.updateResumeStatus(id, status);
      if (result.success) {
        setResumes(prev => 
          prev.map(resume => 
            resume.id === id ? { ...resume, status } : resume
          )
        );
        setError(null);
      } else {
        setError(result.error || '상태 업데이트에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message || '상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                잡코리아 이력서 관리 시스템
              </h1>
              <p className="text-gray-600">이력서를 수집하고 관리하세요</p>
            </div>
          </div>
          
          {/* Success Alert */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between animate-fade-in space-x-3">
              <div className="flex items-center flex-1">
                <div className="text-green-600 mr-3 text-xl">✅</div>
                <p className="text-green-800">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800 font-bold text-lg"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between animate-fade-in space-x-3">
              <div className="flex items-center flex-1">
                <div className="text-red-600 mr-3 text-xl">⚠️</div>
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 font-bold text-lg"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCollect}
                disabled={collecting || loading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Download className={`w-4 h-4 ${collecting ? 'animate-spin' : ''}`} />
                <span>{collecting ? '수집 중...' : '이력서 수집'}</span>
              </button>
              
              <button
                onClick={loadResumes}
                disabled={loading || collecting}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 cursor-pointer"
              >
                <option value="">전체 상태</option>
                <option value="unread">미열람</option>
                <option value="reviewing">검토중</option>
                <option value="accepted">합격</option>
                <option value="rejected">불합격</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600 text-lg">로딩 중...</p>
          </div>
        ) : resumes.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div className="col-span-2">지원자명</div>
                <div className="col-span-3">공고명</div>
                <div className="col-span-2">지원일</div>
                <div className="col-span-2">상태</div>
                <div className="col-span-3">작업</div>
              </div>
            </div>
            
            {/* 리스트 아이템들 */}
            <div className="divide-y divide-gray-200">
              {resumes.map((resume, index) => (
                <div
                  key={resume.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <ResumeCard
                    resume={resume}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-600 text-lg font-medium">수집된 이력서가 없습니다</p>
            <p className="text-gray-400 mt-2">이력서 수집 버튼을 클릭하여 시작하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
