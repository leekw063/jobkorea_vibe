# 잡코리아 이력서 관리 시스템 - 셀렉터 및 요소 정보

이 문서는 잡코리아 웹사이트 크롤링에 사용되는 모든 CSS 셀렉터, XPath, 요소 정보를 정리한 것입니다.

## 📋 목차

1. [로그인 관련 셀렉터](#로그인-관련-셀렉터)
2. [채용공고 목록 셀렉터](#채용공고-목록-셀렉터)
3. [이력서 목록 셀렉터](#이력서-목록-셀렉터)
4. [이력서 상세 정보 셀렉터](#이력서-상세-정보-셀렉터)
5. [URL 패턴](#url-패턴)

---

## 로그인 관련 셀렉터

### 로그인 페이지
- **URL**: `https://www.jobkorea.co.kr/Corp/GIMng/List`
- **대기 조건**: `networkidle` (네트워크 유휴 상태까지 대기)

### 회사 탭
- **용도**: 기업회원 로그인 탭 선택
- **셀렉터**: `#devMemTab > li:nth-child(2) > a`
- **타입**: CSS Selector
- **설명**: 로그인 페이지의 회사 탭 버튼
- **대기 시간**: 10초

### 로그인 입력 필드

#### 아이디 입력 필드
- **셀렉터**: `#M_ID`
- **타입**: CSS Selector (ID)
- **설명**: 회사 아이디 입력 필드
- **대기 시간**: 10초
- **사용 함수**: `page.fill()`

#### 비밀번호 입력 필드
- **셀렉터**: `#M_PWD`
- **타입**: CSS Selector (ID)
- **설명**: 비밀번호 입력 필드
- **사용 함수**: `page.fill()`

### 로그인 버튼
- **셀렉터**: `#login-form > fieldset > section.login-input > button`
- **타입**: CSS Selector
- **설명**: 로그인 제출 버튼
- **사용 함수**: `page.click()`

### 로그인 후 확인
- **URL 패턴**: `**/Corp/GIMng/**`
- **대기 시간**: 15초
- **설명**: 로그인 성공 후 리다이렉트된 URL 확인

---

## 채용공고 목록 셀렉터

### 채용공고 링크
- **셀렉터**: `a.tit.devLinkExpire`
- **타입**: CSS Selector (클래스)
- **설명**: 채용공고 제목 링크 요소
- **대기 시간**: 10초
- **추출 정보**: `href` 속성에서 `GI_No=(\d+)` 패턴으로 공고 ID 추출
- **최대 개수**: 10개

### 공고 ID 추출 정규식
```javascript
/GI_No=(\d+)/
```
- **설명**: URL에서 채용공고 ID를 추출하는 정규식
- **예시**: `https://...?GI_No=12345` → `12345`

---

## 이력서 목록 셀렉터

### 이력서 목록 페이지
- **URL 패턴**: `https://www.jobkorea.co.kr/Corp/Applicant/list?GI_No={jobId}&PageCode=YN`
- **파라미터**:
  - `GI_No`: 채용공고 ID
  - `PageCode`: YN (미열람 이력서)
- **대기 조건**: `networkidle`
- **타임아웃**: 30초

### 이력서 행 셀렉터
- **셀렉터 패턴**: `#container > div.applicant-list-section > div > div > table > tbody > tr:nth-child({index}) > td:nth-child(3) > a`
- **타입**: CSS Selector
- **설명**: 이력서 목록 테이블의 각 행에서 이력서 링크
- **인덱스 범위**: 2 ~ 11 (최대 10개 이력서)
- **대기 시간**: 3초 (요소가 없으면 다음으로 진행)
- **사용 함수**: `page.waitForSelector()`, `page.click()`

#### 예시
```javascript
// 2번째 이력서
#container > div.applicant-list-section > div > div > table > tbody > tr:nth-child(2) > td:nth-child(3) > a

// 3번째 이력서
#container > div.applicant-list-section > div > div > table > tbody > tr:nth-child(3) > td:nth-child(3) > a

// ... (최대 11번째까지)
```

### 새 페이지 대기
- **이벤트**: `page` (새 페이지 열림)
- **타임아웃**: 10초
- **설명**: 이력서 링크 클릭 시 새 탭/창이 열리는 것을 대기

---

## 이력서 상세 정보 셀렉터

### 기본 정보 (프로필)

#### 지원자 이름
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.profile.image > div.container > div.info-container > div.info-general > div.item.name`
- **타입**: CSS Selector
- **설명**: 지원자 이름 요소
- **사용 함수**: `page.textContent()`
- **기본값**: `'이름 없음'` (추출 실패 시)

#### 전화번호
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.profile.image > div.container > div.info-container > div.info-detail > div:nth-child(1) > div.value`
- **타입**: CSS Selector
- **설명**: 지원자 전화번호
- **사용 함수**: `page.textContent()`
- **기본값**: `''` (추출 실패 시)

#### 이메일
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.profile.image > div.container > div.info-container > div.info-detail > div:nth-child(2) > div.value > a`
- **타입**: CSS Selector
- **설명**: 지원자 이메일 주소 (링크 요소)
- **사용 함수**: `page.textContent()`
- **기본값**: `''` (추출 실패 시)

### 학력 정보

#### 학교명
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.content > div.content-header > div.name`
- **타입**: CSS Selector
- **설명**: 최종 학력 학교명
- **사용 함수**: `page.textContent()`
- **기본값**: `''` (추출 실패 시)

#### 전공
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.content > div.content-header > div.line`
- **타입**: CSS Selector
- **설명**: 전공/학과명
- **사용 함수**: `page.textContent()`
- **기본값**: `''` (추출 실패 시)

#### 학력 상태
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.education > div > div:nth-child(1) > div.date > div.state`
- **타입**: CSS Selector
- **설명**: 졸업/재학/휴학 상태
- **사용 함수**: `page.textContent()`
- **기본값**: `''` (추출 실패 시)

### 경력 정보

#### 회사명
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.career > div.list.list-career > div:nth-child(1) > div.content > div.content-header > a > div`
- **타입**: CSS Selector
- **설명**: 최근 경력 회사명
- **사용 함수**: `page.textContent()`
- **기본값**: `''` (추출 실패 시)

#### 직책/포지션
- **셀렉터**: `body > div.resume-view-page > div.resume-view-container > div.base.career > div.list.list-career > div:nth-child(1) > div.content > div.content-header > div.position`
- **타입**: CSS Selector
- **설명**: 직책 또는 포지션명
- **사용 함수**: `page.textContent()`
- **기본값**: `''` (추출 실패 시)

---

## URL 패턴

### 로그인 페이지
```
https://www.jobkorea.co.kr/Corp/GIMng/List
```

### 이력서 목록 페이지
```
https://www.jobkorea.co.kr/Corp/Applicant/list?GI_No={jobId}&PageCode=YN
```
- `{jobId}`: 채용공고 ID (숫자)
- `PageCode=YN`: 미열람 이력서 페이지

### 로그인 후 리다이렉트 URL 패턴
```
**/Corp/GIMng/**
```
- 와일드카드 패턴으로 로그인 성공 확인

---

## 타임아웃 설정

| 작업 | 타임아웃 | 설명 |
|------|---------|------|
| 페이지 로드 | 30초 | `networkidle` 상태까지 대기 |
| 로그인 후 리다이렉트 | 15초 | 로그인 성공 후 페이지 이동 대기 |
| 셀렉터 대기 (일반) | 10초 | 주요 요소 로드 대기 |
| 셀렉터 대기 (이력서 행) | 3초 | 이력서 행 요소 확인 (없으면 다음으로) |
| 새 페이지 열림 | 10초 | 이력서 링크 클릭 후 새 탭/창 대기 |
| 새 페이지 로드 | 15초 | 새 페이지의 `networkidle` 상태 대기 |

---

## 딜레이 설정

| 작업 | 딜레이 | 설명 |
|------|--------|------|
| 이력서 처리 간 | 500ms | 각 이력서 처리 사이 대기 시간 |

---

## 주의사항

### 셀렉터 업데이트 필요 시
잡코리아 웹사이트의 구조가 변경되면 다음 파일들을 업데이트해야 합니다:

1. **`backend-new/src/utils/selectors.js`**
   - 로그인 관련 셀렉터
   - 네비게이션 셀렉터

2. **`backend-new/src/services/playwrightService.js`**
   - 채용공고 링크 셀렉터 (`a.tit.devLinkExpire`)
   - 이력서 행 셀렉터 (동적 생성)
   - 이력서 상세 정보 셀렉터 (하드코딩된 부분)

### 셀렉터 안정성
- **ID 기반 셀렉터**: 가장 안정적 (예: `#M_ID`, `#M_PWD`)
- **클래스 기반 셀렉터**: 중간 안정성 (예: `a.tit.devLinkExpire`)
- **경로 기반 셀렉터**: 가장 불안정 (예: `body > div.resume-view-page > ...`)

### 오류 처리
모든 셀렉터는 `.catch(() => '')` 또는 `.catch(() => null)`로 오류를 처리하여, 요소를 찾지 못해도 크롤링이 중단되지 않도록 합니다.

---

## 셀렉터 변경 이력

| 날짜 | 변경 내용 | 영향 범위 |
|------|----------|----------|
| 2025-11-17 | 초기 문서 작성 | 전체 |

---

## 참고 자료

- [Playwright Selectors 문서](https://playwright.dev/docs/selectors)
- [CSS Selectors 참조](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- 잡코리아 웹사이트: https://www.jobkorea.co.kr

