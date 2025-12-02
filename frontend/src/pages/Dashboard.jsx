import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, Filter, Search, FileText, Users, CheckCircle, XCircle, Clock, Briefcase, Trash2, User, UserCircle, Calendar, CheckSquare, Square, Moon, Sun, X, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';
import ResumeCard from '../components/ResumeCard';
import DarkModeToggle from '../components/DarkModeToggle';
import Pagination from '../components/Pagination';
import LogViewer from '../components/LogViewer';

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
const [activeTab, setActiveTab] = useState('active'); // 'active', 'trash', or 'job-postings'
const [selectedResumes, setSelectedResumes] = useState(new Set()); // 선택된 이력서 ID들
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10;
const [darkMode, setDarkMode] = useState(() => {
  const saved = localStorage.getItem('darkMode');
  return saved ? JSON.parse(saved) : false;
});
const [showLogViewer, setShowLogViewer] = useState(false);

useEffect(() => {
  localStorage.setItem('darkMode', JSON.stringify(darkMode));
  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [darkMode]);

// 공고 목록 관련 상태
const [jobPostings, setJobPostings] = useState([]);
const [selectedJobPosting, setSelectedJobPosting] = useState(null);
const [jobPostingMarkdown, setJobPostingMarkdown] = useState('');
const [showJobPostingModal, setShowJobPostingModal] = useState(false);

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

const loadJobPostings = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await api.getJobPostings();
    if (result.success) {
      setJobPostings(result.data || []);
    } else {
      setError(result.error || '공고 목록을 불러올 수 없습니다.');
    }
  } catch (err) {
    setError(err.message || '공고 목록 로드 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
}, []);

const handleJobPostingClick = async (jobPosting) => {
  setLoading(true);
  setError(null);
  try {
    const result = await api.getJobPostingMarkdown(jobPosting.job_posting_id);
    if (result.success) {
      setSelectedJobPosting(jobPosting);
      setJobPostingMarkdown(result.markdown || '');
      setShowJobPostingModal(true);
    } else {
      setError(result.error || '공고 상세를 불러올 수 없습니다.');
    }
  } catch (err) {
    setError(err.message || '공고 상세 로드 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (activeTab === 'job-postings') {
    loadJobPostings();
  } else {
    loadResumes();
  }
}, [activeTab, loadResumes, loadJobPostings]);

const handleCollect = async () => {
  setCollecting(true);
  setError(null);
  setSuccessMessage(null);
  try {
    const result = await api.collectResumes();
    if (result.success) {
      // 페이지 새로고침
      await loadResumes();
      
      // 완료 메시지 표시
      setSuccessMessage(`✅ 이력서 수집 완료! 공고 ${result.jobPostingCount || 0}개, 이력서 ${result.count || 0}개를 수집했습니다.`);
      setTimeout(() => setSuccessMessage(null), 5000);
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
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            이력서 관리 시스템
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogViewer(true)}
              className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="서버 로그 보기"
            >
              <Terminal className="w-5 h-5 text-green-600 dark:text-green-400" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center flex-1">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-3 flex-shrink-0" />
              <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center flex-1">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mr-3 flex-shrink-0" />
              <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 통합 대시보드 및 필터 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
          {/* 첫 번째 줄: 통계 */}
          <div className="grid grid-cols-5 gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">전체</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">접수</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.접수}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">면접</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.면접}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">불합격</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.불합격}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">합격</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.합격}</p>
            </div>
          </div>

          {/* 두 번째 줄: 액션 버튼 및 필터 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCollect}
              disabled={collecting || loading}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm"
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
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>

            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 flex-1 min-w-0">
              <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200 cursor-pointer flex-1 text-sm"
              >
                <option value="">전체 상태</option>
                <option value="접수">접수</option>
                <option value="면접">면접</option>
                <option value="불합격">불합격</option>
                <option value="합격">합격</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="공고 검색..."
                value={filters.job_posting_title}
                onChange={(e) => handleFilterChange('job_posting_title', e.target.value)}
                className="bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200 flex-1 min-w-0 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="이름 검색..."
                value={filters.applicant_name}
                onChange={(e) => handleFilterChange('applicant_name', e.target.value)}
                className="bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200 flex-1 min-w-0 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
              />
            </div>

            {(filters.status || filters.job_posting_title || filters.job_posting_id || filters.applicant_name) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm font-medium whitespace-nowrap"
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
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('job-postings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'job-postings'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>공고 목록</span>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              이력서 목록
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'trash'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>휴지통</span>
            </button>
          </div>

          {/* 일괄 작업 바 (선택된 항목이 있을 때만 표시) */}
          {selectedResumes.size > 0 && activeTab === 'active' && (
            <div className="flex items-center space-x-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  {selectedResumes.size}개 선택됨
                </span>
              </div>
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 px-3 py-1.5 bg-rose-600 dark:bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-700 dark:hover:bg-rose-600 transition-all font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>선택 삭제</span>
              </button>
              <button
                onClick={() => setSelectedResumes(new Set())}
                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all font-medium"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">로딩 중...</p>
        </div>
      ) : activeTab === 'job-postings' ? (
        jobPostings.length > 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <div className="col-span-5 flex items-center">
                  <Briefcase className="w-4 h-4 mr-2" />
                  공고명
                </div>
                <div className="col-span-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  공고 번호
                </div>
                <div className="col-span-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  생성일
                </div>
                <div className="col-span-2 flex items-center">
                  작업
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {jobPostings.map((jobPosting) => (
                <div key={jobPosting.job_posting_id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{jobPosting.job_posting_title || '제목 없음'}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{jobPosting.job_posting_id}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {jobPosting.created_at ? new Date(jobPosting.created_at).toLocaleDateString('ko-KR') : '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <button
                        onClick={() => handleJobPostingClick(jobPosting)}
                        className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all"
                      >
                        상세보기
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-slate-900 dark:text-slate-100 text-lg font-semibold mb-2">공고가 없습니다</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">이력서 수집을 통해 공고를 추가하세요</p>
          </div>
        )
      ) : resumes.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="col-span-1 flex items-center">
                {activeTab === 'active' && (
                  <button
                    onClick={handleSelectAll}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
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
                <UserCircle className="w-4 h-4 mr-2" />
                지원자명
              </div>
              <div className="col-span-4 flex items-center">
                <Briefcase className="w-4 h-4 mr-2" />
                공고명 / 공고번호
              </div>
              <div className="col-span-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                지원일
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <Clock className="w-4 h-4 mr-1" />
                상태
              </div>
              <div className="col-span-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                작업
              </div>
            </div>
          </div>

          {/* 리스트 아이템들 */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {resumes.map((resume, index) => (
              <div
                key={resume.id}
                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all border-l-4 ${
                  selectedResumes.has(resume.id)
                    ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 dark:border-blue-400'
                    : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
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
        <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-6xl mb-4">{activeTab === 'trash' ? '🗑️' : '📄'}</div>
          <p className="text-slate-900 dark:text-slate-100 text-lg font-semibold mb-2">
            {activeTab === 'trash' ? '휴지통이 비어있습니다' : '수집된 이력서가 없습니다'}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {activeTab === 'trash'
              ? '삭제된 이력서가 없습니다'
              : '이력서 수집 버튼을 클릭하여 시작하세요'}
          </p>
        </div>
      )}

      {/* 공고 상세보기 모달 */}
      {showJobPostingModal && selectedJobPosting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedJobPosting.job_posting_title || '공고 상세'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">공고 번호: {selectedJobPosting.job_posting_id}</p>
              </div>
              <button
                onClick={() => {
                  setShowJobPostingModal(false);
                  setSelectedJobPosting(null);
                  setJobPostingMarkdown('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {jobPostingMarkdown ? (
                <div className="prose dark:prose-invert max-w-none prose-slate prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-p:text-slate-700 dark:prose-p:text-slate-300">
                  <ReactMarkdown>{jobPostingMarkdown}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">공고 내용을 불러올 수 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Viewer */}
      <LogViewer isOpen={showLogViewer} onClose={() => setShowLogViewer(false)} />

    </div>
  </div>
);
}
