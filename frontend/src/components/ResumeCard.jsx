import { Calendar, User, Briefcase, FileText, Mail, Phone, Trash2, RotateCcw, CheckSquare, Square, Star, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';

const statusColors = {
  '접수': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  '면접': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
  '불합격': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
  '합격': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800' }
};

export default function ResumeCard({ resume, onStatusChange, viewMode = 'table', onDelete, onRestore, onPermanentDelete, isDeleted = false, isSelected = false, onSelect, onReviewComplete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewScore, setReviewScore] = useState(resume.review_score || null);
  const [reviewText, setReviewText] = useState(resume.review_text || '');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleStatusChange = (newStatus) => {
    onStatusChange(resume.id, newStatus);
  };

  const handleReview = async () => {
    if (!resume.id) return;
    
    setIsReviewing(true);
    try {
      const result = await api.reviewResume(resume.id);
      if (result.success && result.score !== undefined) {
        setReviewScore(result.score);
        setReviewText(result.review || '');
        // 부모 컴포넌트에 검토 완료 알림
        if (onReviewComplete) {
          onReviewComplete(resume.id, result.score);
        }
        // 검토 완료 후 자동으로 모달 표시
        setShowReviewModal(true);
      }
    } catch (error) {
      console.error('검토 오류:', error);
      alert('검토 중 오류가 발생했습니다.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleShowReview = () => {
    // DB에 저장된 review_text가 없으면 경고 표시
    if (!reviewText && resume.review_text) {
      setReviewText(resume.review_text);
    }
    setShowReviewModal(true);
  };

  // pdf_url 정규화
  const getPdfUrl = () => {
    if (!resume.pdf_url) return null;
    
    if (resume.pdf_url.startsWith('file://')) {
      const filename = resume.pdf_url.split('/').pop() || resume.pdf_url.split('\\').pop();
      return `http://localhost:4001/api/resumes/pdf/${filename}`;
    }
    
    if (resume.pdf_url.startsWith('http://') || resume.pdf_url.startsWith('https://')) {
      return resume.pdf_url;
    }
    
    const filename = resume.pdf_url.split('/').pop() || resume.pdf_url.split('\\').pop();
    return `http://localhost:4001/api/resumes/pdf/${filename}`;
  };

  // md_url 정규화
  const getMdUrl = () => {
    if (!resume.md_url) return null;
    
    if (resume.md_url.startsWith('file://')) {
      const filename = resume.md_url.split('/').pop() || resume.md_url.split('\\').pop();
      return `http://localhost:4001/api/resumes/markdown/${filename}`;
    }
    
    if (resume.md_url.startsWith('http://') || resume.md_url.startsWith('https://')) {
      return resume.md_url;
    }
    
    const filename = resume.md_url.split('/').pop() || resume.md_url.split('\\').pop();
    return `http://localhost:4001/api/resumes/markdown/${filename}`;
  };

  const pdfUrl = getPdfUrl();
  const mdUrl = getMdUrl();
  const statusColor = statusColors[resume.status || '접수'] || statusColors['접수'];

  if (viewMode === 'card') {
    return (
      <>
        <div className={`bg-white rounded-xl shadow-sm border-2 ${statusColor.border} hover:shadow-lg transition-all duration-200 overflow-hidden group`}>
          <div className="p-6">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                  {resume.applicant_name || '이름 없음'}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {resume.application_date 
                      ? format(new Date(resume.application_date), 'yyyy-MM-dd', { locale: ko })
                      : '날짜 없음'
                    }
                  </span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor.badge} whitespace-nowrap`}>
                {resume.status || '접수'}
              </span>
            </div>

            {/* 공고 정보 */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-start space-x-2">
                <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" title={resume.job_posting_title || '공고명 없음'}>
                    {resume.job_posting_title || '공고명 없음'}
                  </p>
                  {resume.job_posting_id && (
                    <p className="text-xs text-gray-500 mt-1">공고번호: {resume.job_posting_id}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 연락처 정보 */}
            {(resume.applicant_email || resume.applicant_phone) && (
              <div className="mb-4 space-y-2">
                {resume.applicant_email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{resume.applicant_email}</span>
                  </div>
                )}
                {resume.applicant_phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{resume.applicant_phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* 상태 변경 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">상태 변경</label>
              <select
                value={resume.status || '접수'}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border-2 ${statusColor.border} ${statusColor.bg} ${statusColor.text} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium`}
              >
                <option value="접수">접수</option>
                <option value="면접">면접</option>
                <option value="불합격">불합격</option>
                <option value="합격">합격</option>
              </select>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2">
              {!isDeleted ? (
                <>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF</span>
                    </a>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>삭제</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {onRestore && (
                    <button
                      onClick={() => onRestore(resume.id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>복원</span>
                    </button>
                  )}
                  {onPermanentDelete && (
                    <button
                      onClick={() => {
                        if (confirm('정말 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                          onPermanentDelete(resume.id);
                        }
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>영구 삭제</span>
                    </button>
                  )}
                </>
              )}
            </div>
            
            {/* 삭제 확인 모달 - Portal 사용 */}
            {showDeleteConfirm && createPortal(
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm"
                style={{ zIndex: 9999 }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                <div 
                  className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4">이력서 삭제</h3>
                  <p className="text-gray-600 mb-6">
                    이 이력서를 휴지통으로 이동하시겠습니까?<br />
                    나중에 복원할 수 있습니다.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        if (onDelete) {
                          onDelete(resume.id);
                        }
                        setShowDeleteConfirm(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

      </>
    );
  }

  // 테이블 뷰
  return (
    <>
      <div className="px-6 py-4 transition-colors duration-150">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* 체크박스 (active 탭에서만 표시) */}
          {onSelect && (
            <div className="col-span-1 flex items-center">
              <button
                onClick={() => onSelect(resume.id)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title={isSelected ? '선택 해제' : '선택'}
              >
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
          
          {/* 지원자명 */}
          <div className={`flex items-center space-x-2 ${onSelect ? 'col-span-2' : 'col-span-2'}`}>
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">
              {resume.applicant_name || '이름 없음'}
            </span>
          </div>

          {/* 공고명 */}
          <div className="col-span-4 flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-700 truncate" title={resume.job_posting_title || '공고명 없음'}>
                {resume.job_posting_title || '공고명 없음'}
              </span>
              {resume.job_posting_id && (
                <span className="text-xs text-gray-500 truncate">공고번호: {resume.job_posting_id}</span>
              )}
            </div>
          </div>

          {/* 지원일 */}
          <div className="col-span-2 flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              {resume.application_date 
                ? format(new Date(resume.application_date), 'yyyy-MM-dd', { locale: ko })
                : '날짜 없음'
              }
            </span>
          </div>

          {/* 상태 */}
          <div className="col-span-1 flex items-center justify-center">
            <select
              value={resume.status || '접수'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`w-full px-2 py-1.5 text-xs rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold ${statusColor.border} ${statusColor.bg} ${statusColor.text}`}
            >
              <option value="접수">접수</option>
              <option value="면접">면접</option>
              <option value="불합격">불합격</option>
              <option value="합격">합격</option>
            </select>
          </div>

          {/* 작업 버튼 */}
          <div className="col-span-2 flex items-center space-x-2">
            {/* 검토 버튼 또는 점수 */}
            {reviewScore !== null ? (
              <button
                onClick={handleShowReview}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-yellow-100 text-yellow-800 rounded-md text-xs font-semibold hover:bg-yellow-200 transition-colors cursor-pointer"
                title="평가 결과 보기"
              >
                <Star className="w-3.5 h-3.5 fill-yellow-500" />
                <span>{reviewScore}점</span>
              </button>
            ) : (
              <button
                onClick={handleReview}
                disabled={isReviewing}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                title="검토하기"
              >
                <Star className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isReviewing ? '검토 중...' : '검토'}</span>
              </button>
            )}
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                title="PDF 보기"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </a>
            )}
            {/* 작은 삭제 버튼 (active 탭에서만 표시) */}
            {onDelete && !isDeleted && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {/* 휴지통 탭의 복원/영구 삭제 버튼 */}
            {isDeleted && (
              <>
                {onRestore && (
                  <button
                    onClick={() => onRestore(resume.id)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
                    title="복원"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">복원</span>
                  </button>
                )}
                {onPermanentDelete && (
                  <button
                    onClick={() => {
                      if (confirm('정말 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                        onPermanentDelete(resume.id);
                      }
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-red-700 text-white rounded-md text-xs hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                    title="영구 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">영구 삭제</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 (테이블 뷰용) - Portal 사용 */}
      {showDeleteConfirm && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">이력서 삭제</h3>
            <p className="text-gray-600 mb-6">
              이 이력서를 휴지통으로 이동하시겠습니까?<br />
              나중에 복원할 수 있습니다.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (onDelete) {
                    onDelete(resume.id);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 평가 결과 모달 - Portal을 사용하여 body에 직접 렌더링 */}
      {showReviewModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
          onClick={() => setShowReviewModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col animate-fade-in"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 - 고정 */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">이력서 평가 결과</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors"
                  title="닫기"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-4 flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                  <Star className="w-5 h-5 fill-yellow-500" />
                  <span className="text-lg font-bold">{reviewScore}점</span>
                </div>
                <div className="text-sm text-gray-600">
                  <div><strong>{resume.applicant_name || '이름 없음'}</strong></div>
                  <div className="text-xs">{resume.job_posting_title || '공고명 없음'}</div>
                </div>
              </div>
            </div>

            {/* 본문 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto p-6">
              {reviewText ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown>{reviewText}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  평가 결과가 없습니다.
                </div>
              )}
            </div>

            {/* 푸터 - 고정 */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
