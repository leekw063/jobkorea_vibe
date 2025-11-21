import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, Filter, Search, FileText, Users, CheckCircle, XCircle, Clock, Briefcase, Trash2, User, UserCircle, Calendar, CheckSquare, Square, Moon, Sun } from 'lucide-react';
import { api } from '../services/api';
import ResumeCard from '../components/ResumeCard';
import DarkModeToggle from '../components/DarkModeToggle';
import Pagination from '../components/Pagination';

export default function Dashboard() {
const [resumes, setResumes] = useState([]);
const [loading, setLoading] = useState(false);
const [collecting, setCollecting] = useState(false);
const [filters, setFilters] = useState({
  status: '',
  job_posting_title: '',
  job_posting_id: '',
  applicant_name: ''
});
const [error, setError] = useState(null);
const [successMessage, setSuccessMessage] = useState(null);
const [activeTab, setActiveTab] = useState('active'); // 'active' or 'trash'
const [selectedResumes, setSelectedResumes] = useState(new Set()); // 선택된 이력서 ID들
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10;

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
    }
    const result = await api.getResumes(queryParams);
    if (result.success) {
      setResumes(result.data || []);
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
  setFilters({ status: '', job_posting_title: '', job_posting_id: '', applicant_name: '' });
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
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Nanum Square Neo', sans-serif" }}>
              Jobkorea Resume Manager
            </h1>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-4 bg-white border border-green-200 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center flex-1">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-gray-400 hover:text-gray-600 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-white border border-red-200 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center flex-1">
              <XCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-gray-400 hover:text-gray-600 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 통합 대시보드 및 필터 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
          {/* 첫 번째 줄: 통계 */}
          <div className="grid grid-cols-5 gap-4 mb-4 pb-4 border-b border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">전체</p>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">접수</p>
              <p className="text-xl font-semibold text-blue-600">{stats.접수}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">면접</p>
              <p className="text-xl font-semibold text-yellow-600">{stats.면접}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">불합격</p>
              <p className="text-xl font-semibold text-red-600">{stats.불합격}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">합격</p>
              <p className="text-xl font-semibold text-green-600">{stats.합격}</p>
            </div>
          </div>

          {/* 두 번째 줄: 액션 버튼 및 필터 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCollect}
              disabled={collecting || loading}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {collecting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{collecting ? '수집 중...' : '이력서 수집'}</span>
            </button>

            <button
              onClick={loadResumes}
              disabled={loading || collecting}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>

            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex-1 min-w-0">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="bg-transparent border-none focus:outline-none text-gray-700 cursor-pointer flex-1 text-sm"
              >
                <option value="">전체 상태</option>
                <option value="접수">접수</option>
                <option value="면접">면접</option>
                <option value="불합격">불합격</option>
                <option value="합격">합격</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="공고 검색..."
                value={filters.job_posting_title}
                onChange={(e) => handleFilterChange('job_posting_title', e.target.value)}
                className="bg-transparent border-none focus:outline-none text-gray-700 flex-1 min-w-0 placeholder-gray-400 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="이름 검색..."
                value={filters.applicant_name}
                onChange={(e) => handleFilterChange('applicant_name', e.target.value)}
                className="bg-transparent border-none focus:outline-none text-gray-700 flex-1 min-w-0 placeholder-gray-400 text-sm"
              />
            </div>

            {(filters.status || filters.job_posting_title || filters.job_posting_id || filters.applicant_name) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 탭 전환 및 일괄 작업 바 */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              이력서 목록
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                activeTab === 'trash'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>휴지통</span>
            </button>
          </div>

          {/* 일괄 작업 바 (선택된 항목이 있을 때만 표시) */}
          {selectedResumes.size > 0 && activeTab === 'active' && (
            <div className="flex items-center space-x-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {selectedResumes.size}개 선택됨
                </span>
              </div>
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>선택 삭제</span>
              </button>
              <button
                onClick={() => setSelectedResumes(new Set())}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors font-medium"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-24 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">로딩 중...</p>
        </div>
      ) : resumes.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <UserCircle className="w-4 h-4 mr-2 text-gray-500" />
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
          <div className="divide-y divide-gray-100">
            {resumes.map((resume, index) => (
              <div
                key={resume.id}
                className={`hover:bg-gray-50 transition-colors border-l-4 ${
                  selectedResumes.has(resume.id)
                    ? 'bg-blue-50 border-blue-500'
                    : 'border-transparent hover:border-gray-300'
                }`}
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
        <div className="text-center py-24 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="text-6xl mb-4">{activeTab === 'trash' ? '🗑️' : '📄'}</div>
          <p className="text-gray-900 text-lg font-semibold mb-1">
            {activeTab === 'trash' ? '휴지통이 비어있습니다' : '수집된 이력서가 없습니다'}
          </p>
          <p className="text-gray-500 text-sm">
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
