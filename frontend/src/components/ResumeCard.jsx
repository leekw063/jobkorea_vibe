import { Calendar, User, Briefcase, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusColors = {
  unread: 'bg-blue-100 text-blue-800 border-blue-200',
  reviewing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200'
};

const statusLabels = {
  unread: '미열람',
  reviewing: '검토중',
  accepted: '합격',
  rejected: '불합격'
};

export default function ResumeCard({ resume, onStatusChange }) {
  const handleStatusChange = (newStatus) => {
    onStatusChange(resume.id, newStatus);
  };

  // pdf_url 정규화: file:// 프로토콜 제거 및 HTTP URL로 변환
  const getPdfUrl = () => {
    if (!resume.pdf_url) return null;
    
    // file:// 프로토콜 제거
    if (resume.pdf_url.startsWith('file://')) {
      const filename = resume.pdf_url.split('/').pop() || resume.pdf_url.split('\\').pop();
      return `http://localhost:4001/api/resumes/pdf/${filename}`;
    }
    
    // 이미 HTTP URL인 경우 그대로 반환
    if (resume.pdf_url.startsWith('http://') || resume.pdf_url.startsWith('https://')) {
      return resume.pdf_url;
    }
    
    // 상대 경로인 경우 HTTP URL로 변환
    const filename = resume.pdf_url.split('/').pop() || resume.pdf_url.split('\\').pop();
    return `http://localhost:4001/api/resumes/pdf/${filename}`;
  };

  const pdfUrl = getPdfUrl();

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* 지원자명 */}
        <div className="col-span-2 flex items-center space-x-2">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">
            {resume.applicant_name || '이름 없음'}
          </span>
        </div>

        {/* 공고명 */}
        <div className="col-span-3 flex items-center space-x-2">
          <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-700 truncate" title={resume.job_posting_title || '공고명 없음'}>
            {resume.job_posting_title || '공고명 없음'}
          </span>
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
        <div className="col-span-2">
          <select
            value={resume.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`w-full px-3 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              resume.status === 'unread' ? 'border-blue-200 bg-blue-50' :
              resume.status === 'reviewing' ? 'border-yellow-200 bg-yellow-50' :
              resume.status === 'accepted' ? 'border-green-200 bg-green-50' :
              'border-red-200 bg-red-50'
            }`}
          >
            <option value="unread">미열람</option>
            <option value="reviewing">검토중</option>
            <option value="accepted">합격</option>
            <option value="rejected">불합격</option>
          </select>
        </div>

        {/* 작업 버튼 */}
        <div className="col-span-3 flex items-center space-x-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              <FileText className="w-4 h-4" />
              <span>PDF 보기</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
