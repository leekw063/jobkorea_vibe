import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, Filter, Search, FileText, Users, CheckCircle, XCircle, Clock, Briefcase, Trash2, User, Calendar, CheckSquare, Square } from 'lucide-react';
import { api } from '../services/api';
import ResumeCard from '../components/ResumeCard';

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    job_posting_title: '',
    job_posting_id: ''
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'trash'
  const [selectedResumes, setSelectedResumes] = useState(new Set()); // 선택된 이력서 ID들

  // 통계 계산
  const stats = useMemo(() => {
    const total = resumes.length;
    const 접수 = resumes.filter(r => r.status === '접수').length;
    const 면접 = resumes.filter(r => r.status === '면접').length;
    const 불합격 = resumes.filter(r => r.status === '불합격').length;
    const 합격 = resumes.filter(r => r.status === '합격').length;
    
    return { total, 접수, 면접, 불합격, 합격 };
  }, [resumes]);

  const loadResumes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = { ...filters };
      if (activeTab === 'trash') {
        queryParams.deleted_only = true;
      } else {
        // active 탭에서는 deleted_only를 명시적으로 false로 설정하지 않음 (기본값이 삭제되지 않은 항목만 조회)
        // 백엔드에서 기본적으로 deleted_at이 null인 항목만 조회하므로 명시적으로 설정할 필요 없음
      }
      const result = await api.getResumes(queryParams);
      if (result.success) {
        setResumes(result.data || []);
        setError(null);
        // 탭 전환 시 선택 해제
        setSelectedResumes(new Set());
      } else {
        setError(result.error || '이력서를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError(err.message || '이력서 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

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
        setSuccessMessage(`공고 ${result.jobPostingCount || 0}개, 이력서 ${result.count || 0}개를 수집했습니다.`);
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', job_posting_title: '', job_posting_id: '' });
  };

  const handleDelete = async (id) => {
    try {
      const result = await api.deleteResume(id);
      if (result.success) {
        setSuccessMessage(result.message || '이력서가 휴지통으로 이동되었습니다.');
        setTimeout(() => setSuccessMessage(null), 3000);
        loadResumes();
      } else {
        setError(result.error || '이력서 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message || '이력서 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleRestore = async (id) => {
    try {
      const result = await api.restoreResume(id);
      if (result.success) {
        setSuccessMessage(result.message || '이력서가 복원되었습니다.');
        setTimeout(() => setSuccessMessage(null), 3000);
        loadResumes();
      } else {
        setError(result.error || '이력서 복원에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message || '이력서 복원 중 오류가 발생했습니다.');
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      const result = await api.permanentDeleteResume(id);
      if (result.success) {
        setSuccessMessage(result.message || '이력서가 영구적으로 삭제되었습니다.');
        setTimeout(() => setSuccessMessage(null), 3000);
        loadResumes();
      } else {
        setError(result.error || '이력서 영구 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message || '이력서 영구 삭제 중 오류가 발생했습니다.');
    }
  };

  // 체크박스 선택/해제
  const handleSelectResume = (id) => {
    setSelectedResumes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedResumes.size === resumes.length) {
      setSelectedResumes(new Set());
    } else {
      setSelectedResumes(new Set(resumes.map(r => r.id)));
    }
  };

  // 선택된 항목 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedResumes.size === 0) return;
    
    if (!confirm(`선택한 ${selectedResumes.size}개의 이력서를 휴지통으로 이동하시겠습니까?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedResumes).map(id => api.deleteResume(id));
      const results = await Promise.all(deletePromises);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        setSuccessMessage(`${successCount}개의 이력서가 휴지통으로 이동되었습니다.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        setSelectedResumes(new Set());
        loadResumes();
      } else {
        setError(`${successCount}개 성공, ${failCount}개 실패했습니다.`);
      }
    } catch (err) {
      setError(err.message || '일괄 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 tracking-tight">
                잡코리아 이력서 관리 시스템
              </h1>
              <p className="text-gray-600 text-lg">진행중인 공고의 접수된 이력서를 수집하고 관리하세요</p>
            </div>
          </div>
          
          {/* Success Alert */}
          {successMessage && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg flex items-center justify-between animate-fade-in space-x-3 shadow-md backdrop-blur-sm">
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-green-800 font-semibold">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800 font-bold text-xl hover:bg-green-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
              >
                ×
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-lg flex items-center justify-between animate-fade-in space-x-3 shadow-md backdrop-blur-sm">
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 font-bold text-xl hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
              >
                ×
              </button>
            </div>
          )}

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">전체</p>
                  <p className="text-3xl font-extrabold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-200/50 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">접수</p>
                  <p className="text-3xl font-extrabold text-blue-600">{stats.접수}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-yellow-200/50 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">면접</p>
                  <p className="text-3xl font-extrabold text-yellow-600">{stats.면접}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="w-7 h-7 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-200/50 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">불합격</p>
                  <p className="text-3xl font-extrabold text-red-600">{stats.불합격}</p>
                </div>
                <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="w-7 h-7 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-green-200/50 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">합격</p>
                  <p className="text-3xl font-extrabold text-green-600">{stats.합격}</p>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-4 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-6 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200/50">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCollect}
                  disabled={collecting || loading}
                  className="group flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 font-semibold text-base"
                >
                  <Download className={`w-5 h-5 ${collecting ? 'animate-spin' : 'group-hover:animate-bounce'}`} />
                  <span>{collecting ? '수집 중...' : '이력서 수집'}</span>
                </button>
                
                <button
                  onClick={loadResumes}
                  disabled={loading || collecting}
                  className="flex items-center space-x-3 px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg font-semibold text-base"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>
            </div>

            {/* 필터 영역 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100/50 px-5 py-3 rounded-xl flex-1 min-w-0 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg text-gray-700 cursor-pointer flex-shrink-0 font-semibold text-sm"
                >
                  <option value="">전체 상태</option>
                  <option value="접수">접수</option>
                  <option value="면접">면접</option>
                  <option value="불합격">불합격</option>
                  <option value="합격">합격</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100/50 px-5 py-3 rounded-xl flex-1 min-w-0 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="공고명 검색..."
                  value={filters.job_posting_title}
                  onChange={(e) => handleFilterChange('job_posting_title', e.target.value)}
                  className="px-3 py-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg text-gray-700 flex-1 min-w-0 placeholder-gray-400 font-medium text-sm"
                />
              </div>

              <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100/50 px-5 py-3 rounded-xl flex-1 min-w-0 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="공고번호 검색..."
                  value={filters.job_posting_id}
                  onChange={(e) => handleFilterChange('job_posting_id', e.target.value)}
                  className="px-3 py-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg text-gray-700 flex-1 min-w-0 placeholder-gray-400 font-medium text-sm"
                />
              </div>

              {(filters.status || filters.job_posting_title || filters.job_posting_id) && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-200 text-sm font-semibold whitespace-nowrap shadow-md hover:shadow-lg"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 탭 전환 및 일괄 작업 바 */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-lg border border-gray-200/50 inline-flex">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'active' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                이력서 목록
              </button>
              <button
                onClick={() => setActiveTab('trash')}
                className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  activeTab === 'trash' 
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg scale-105' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>휴지통</span>
              </button>
            </div>

            {/* 일괄 작업 바 (선택된 항목이 있을 때만 표시) */}
            {selectedResumes.size > 0 && activeTab === 'active' && (
              <div className="flex items-center space-x-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl px-6 py-4 shadow-lg animate-fade-in backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-bold text-blue-900">
                    {selectedResumes.size}개 선택됨
                  </span>
                </div>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-sm hover:from-red-700 hover:to-rose-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>선택 삭제</span>
                </button>
                <button
                  onClick={() => setSelectedResumes(new Set())}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-all duration-200 font-semibold"
                >
                  선택 해제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-24 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-700 text-lg font-semibold">로딩 중...</p>
          </div>
        ) : resumes.length > 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b-2 border-gray-200/50 px-8 py-5">
              <div className="grid grid-cols-12 gap-4 text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                <div className="col-span-1 flex items-center">
                  {activeTab === 'active' && (
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title={selectedResumes.size === resumes.length ? '전체 해제' : '전체 선택'}
                    >
                      {selectedResumes.size === resumes.length ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                <div className="col-span-2 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  지원자명
                </div>
                <div className="col-span-4 flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-gray-500" />
                  공고명 / 공고번호
                </div>
                <div className="col-span-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  지원일
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-1 text-gray-500" />
                  상태
                </div>
                <div className="col-span-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                  작업
                </div>
              </div>
            </div>
            
            {/* 리스트 아이템들 */}
            <div className="divide-y divide-gray-100/50">
              {resumes.map((resume, index) => (
                <div
                  key={resume.id}
                  className={`animate-fade-in-up hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-300 border-l-4 ${
                    selectedResumes.has(resume.id) 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-500 shadow-sm' 
                      : 'border-transparent hover:border-blue-400'
                  }`}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <ResumeCard
                    resume={resume}
                    onStatusChange={handleStatusChange}
                    viewMode="table"
                    onDelete={activeTab === 'active' ? handleDelete : undefined}
                    onRestore={activeTab === 'trash' ? handleRestore : undefined}
                    onPermanentDelete={activeTab === 'trash' ? handlePermanentDelete : undefined}
                    isDeleted={activeTab === 'trash'}
                    isSelected={selectedResumes.has(resume.id)}
                    onSelect={activeTab === 'active' ? handleSelectResume : undefined}
                    onReviewComplete={(id, score) => {
                      setResumes(prev => 
                        prev.map(r => r.id === id ? { ...r, review_score: score } : r)
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-24 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
            <div className="text-7xl mb-6 animate-bounce">{activeTab === 'trash' ? '🗑️' : '📄'}</div>
            <p className="text-gray-700 text-xl font-bold mb-2">
              {activeTab === 'trash' ? '휴지통이 비어있습니다' : '수집된 이력서가 없습니다'}
            </p>
            <p className="text-gray-500 text-base">
              {activeTab === 'trash' 
                ? '삭제된 이력서가 없습니다' 
                : '이력서 수집 버튼을 클릭하여 시작하세요'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
