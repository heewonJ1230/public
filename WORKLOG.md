# 작업 워크로그 (Work Log)

배포·운영 변경 사항을 간단히 정리합니다. PR/커밋 기록과 별도로 유지합니다.

---

### 2025-10-13 - Storage 버킷 우선순위 조정 & App Check 모니터링 전환
- 변경 요약:
  - `script.js`: Firebase 초기화 시 기본 버킷을 `hwsghouse.appspot.com`으로 먼저 지정하고 `.firebasestorage.app`을 보조 후보로 추가해 `listAll()` 호출이 안정적으로 작동하도록 수정.
  - `script.js`: 갤러리 로더는 기존대로 `hagack/` 업로드 경로(하객 업로드)만 읽도록 유지.
- 운영 메모:
  - App Check를 Storage·Realtime Database에서 **Monitoring** 모드로 전환(토큰 문제 해결 전까지 임시 완화).
  - 브라우저 서비스 워커/캐시 초기화 후 수동 새로고침으로 동작 확인.

---

### 2025-10-12 - Firebase Storage 경로 복원 및 다중 버킷 대응
- 변경 요약:
  - `script.js`: Storage 버킷 후보(`.firebasestorage.app`, `.appspot.com`)를 모두 추적하고 `getStorageDownloadUrl`에서 절대·상대 경로를 순차 fallback.
  - `script.js`: Firebase 초기화 시 사용 가능한 버킷을 등록하고, 실제 연결된 버킷을 감지해 fallback 세트에 추가.
  - `script.js`: 게스트 업로드 초기화 로직에 DOM 점검·모바일 판별·이미지 압축 헬퍼를 복구해 `btn` ReferenceError 방지.
  - `index.html`: 층 안내 버튼 `data-gs` 값을 기본 버킷(`gs://hwsghouse.firebasestorage.app/...`)으로 복원.
- 테스트/검증:
  - `firebase serve --only hosting` 환경에서 DevTools Network 탭으로 이미지·BGM 요청이 200인지 확인.
  - DevTools Console에서 `Storage asset load failed` 오류가 사라졌는지 수동 확인.

---

### 2025-10-11 오후 - 스크래치 카드 전체 영역 복사 UX 개선
- 변경 요약:
  - `script.js`: 스크래치 진행 상태(`data-scratch-active`) 추적, 터치 `cancel` 시 카드 전체 복사 및 클립보드 실패 처리 보강.
  - `index.html`: 복사 버튼 제거 후 카드 정보 안내 텍스트 추가.
  - `styles.css`: `scratch-copy-hint` 배치를 재정렬해 버튼 제거 이후 레이아웃 유지.
- 테스트/검증:
  - 모바일: 긁는 제스처 미발생 시 카드 전체 탭 → 복사 성공.
  - 데스크톱: 버튼 제거 후에도 카드 정렬·스크래치 애니메이션 정상 동작.

---

### 2025-10-11 - Storage 규칙 개편 (모바일 업로드 App Check 적용)
- 변경 요약:
  - `firebase.storage.rules`: `hagack/**` 경로에 모바일 업로드 전용 규칙 도입(익명 허용, 이미지 & 5MB 이하, App Check 필수).
  - 기타 경로는 `read: true`, `write: false` 유지.
- 테스트/검증:
  - 이미지/비이미지, 용량 초과, App Check 미적용 등 케이스별로 허용/차단 동작 확인.
- 운영 메모:
  - Storage Rules만으로는 레이트 리밋이 어려워 추후 Cloud Functions 기반 방어 필요.


# 작업 히스토리 (Work Log)

이 파일은 변경 내역을 간단히 축약해 기록하는 용도입니다. PR/커밋 메시지와 별개로, 배포/운영 관점에서 필요한 핵심 포인트를 빠르게 파악할 수 있도록 유지합니다.


### 2025-10-12 - Firebase Storage 호스트 복구

- 변경 요약:
  - `script.js`: `storageBucket` 설정을 `hwsghouse.appspot.com`으로 되돌려 Storage SDK가 올바른 버킷을 바라보도록 수정.
  - `index.html`: `data-gs` 경로를 기존 버킷(`gs://hwsghouse.appspot.com/...`)으로 정정해 썸네일·층별 안내 이미지를 정상 로드.
  - `script.js`: `hagack` 업로드 경로 주석에 실제 버킷 정보를 명시해 혼동 방지.

- 테스트/검증:
  - `firebase serve --only hosting`로 로컬 호스팅 후 크롬 DevTools Network 탭에서 이미지·오디오 요청이 200으로 응답하는지 확인.
  - DevTools Console 탭에서 `Storage asset load failed` 오류가 더 이상 발생하지 않는지 수동 확인.

### 2025-10-11 오후 - 스크래치 카드 전체 영역 복사 UX 개선

- 변경 요약:
  - `script.js`: 스크래치 진행 상태(`data-scratch-active`) 추적, 터치 `cancel` 대응, 카드 전체 탭 복사와 클립보드 실패 토스트 보강.
  - `index.html`: 복사 버튼 제거 후 카드 정보만 남기고 안내 텍스트 추가.
  - `styles.css`: `scratch-copy-hint` 배지 스타일링으로 버튼 제거 후 레이아웃 유지.

- 테스트/검증:
  - Chrome DevTools 모바일 환경: 긁는 중 탭 시 복사 미발생, 긁은 뒤 카드 임의 탭 시 토스트와 함께 복사 성공.
  - 데스크톱: 버튼 제거 후 카드 정렬 및 스크래치 레이어 정상 노출.


### 2025-10-11 - Storage 규칙 개편 (모바일 업로드 App Check 적용)

- **변경 요약:**
  - `hagack/**` 경로에 대해 **누구나 업로드 가능(익명 허용)**으로 완화.
  - 단, 업로드는 **App Check Enforce 적용을 전제**로 하고, **이미지 타입 + 5MB 미만**만 허용하도록 단순화.
  - 기존 `request.headers` 기반 App Check 검증 제거 (Storage Rules에서 헤더 접근 불가 문제 해결).
  - 기타 모든 경로는 `read: true`, `write: false` 유지.

- **수정 파일:**
  - `firebase.storage.rules`  
    - `hagack/**` 매치 추가 및 `isImage()`, `isSmall()` 함수 정의.  
    - `allow write` 조건 단순화(`isImage() && isSmall()`).

- **테스트/검증:**
  - 케이스 1: `image/png`, 3MB 파일 업로드 → ✅ 정상 업로드.
  - 케이스 2: 비이미지(`application/pdf`) 업로드 → ❌ 거절됨.
  - 케이스 3: 5MB 초과 이미지 → ❌ 거절됨.
  - 케이스 4: App Check 미적용 클라이언트(토큰 없음) → ❌ Storage 접근 거부됨 (App Check Enforce에 의해).
  - 케이스 5: `users/**` 또는 기타 경로에 쓰기 시도 → ❌ 거절됨.

- **보안/운영 메모:**
  - App Check Enforce가 **Storage 접근의 1차 방어선** 역할 수행.
  - Storage Rules는 파일 타입·용량만 검사하므로 **레이트리밋(DDoS 방어)은 별도 레이어에서 처리 필요**.
  - 콘솔 App Check → API(Storage) 탭에서 “등록된 앱만 허용됨” 상태 유지 필수.
  - 차후 Cloud Function 경유 업로드로 업로드 빈도 제어/로그 수집 예정.


## 2025-09-11 - 전역 중앙 토스트 도입 및 복사 알림 통합

- 변경 요약:
  - 전역 `showMessage(text, { duration })` 추가로 모든 메시지를 화면 정중앙에서 표시.
  - 스노우(청소) 시스템 내부 메시지 → 전역 토스트로 위임.
  - 스크래치 카드(계좌 복사) 관련 클릭을 캡처 단계에서 가로채 중앙 토스트 사용(성공/실패 통일).
  - 남용(DDos/매크로) 방어 현재 상태 점검 및 권고사항 문서화.

- 수정 파일:
  - `index.html`: `global-overlay.js`를 `script.js`보다 먼저 로드하도록 스크립트 추가.
  - `global-overlay.js`(신규): 전역 토스트 + 스크래치 복사 클릭 가로채기 + 메시지 정규화.
  - `script.js`: 스노우 시스템의 `showMessage`가 전역 `window.showMessage`를 호출하도록 위임.

- 테스트/검증:
  - 스노우 모드 토글 시: "🧹 청소 모드! 눈더미를 클릭하세요!" 중앙 표시 확인.
  - 눈 제거 완료 시: "✨ 모든 눈을 치웠어요!" 중앙 표시 확인.
  - 계좌 복사(버튼/숫자영역, 가려짐/공개 모두):
    - 성공 시: "🔗 계좌번호 복사됨!"
    - 실패 시: "😢 복사 실패"
  - 중앙 토스트는 기본 1.6초 후 페이드아웃, 클릭 차단 없음(pointer-events:none).

- 보안/운영 메모:
  - 현재 RTDB/Storage에 App Check 강제/보안 규칙 미확인(레포 내). 콘솔에서 활성화 필요.
  - 권고: App Check 강제, Storage/RTDB 보안 규칙(용량/타입/인증/경로 제한), Callable Functions 경유/레이트 리밋.

- 타임스탬프: 2025-09-11T14:41:01.4673852+09:00

---

## 2025-09-11 - 전역 중앙 토스트 도입 및 복사 알림 통합

- 변경 요약:
  - 전역 `showMessage(text, { duration })` 추가로 모든 메시지를 화면 정중앙에서 표시.
  - 스노우(청소) 시스템 내부 메시지 → 전역 토스트로 위임.
  - 스크래치 카드(계좌 복사) 관련 클릭을 캡처 단계에서 가로채 중앙 토스트 사용(성공/실패 통일).
  - 남용(DDos/매크로) 방어 현재 상태 점검 및 권고사항 문서화.

- 수정 파일:
  - `index.html`: `global-overlay.js`를 `script.js`보다 먼저 로드하도록 스크립트 추가.
  - `global-overlay.js`(신규): 전역 토스트 + 스크래치 복사 클릭 가로채기 + 메시지 정규화.
  - `script.js`: 스노우 시스템의 `showMessage`가 전역 `window.showMessage`를 호출하도록 위임.

- 테스트/검증:
  - 스노우 모드 토글 시: "🧹 청소 모드! 눈더미를 클릭하세요!" 중앙 표시 확인.
  - 눈 제거 완료 시: "✨ 모든 눈을 치웠어요!" 중앙 표시 확인.
  - 계좌 복사(버튼/숫자영역, 가려짐/공개 모두):
    - 성공 시: "🔗 계좌번호 복사됨!"
    - 실패 시: "😢 복사 실패"
  - 중앙 토스트는 기본 1.6초 후 페이드아웃, 클릭 차단 없음(pointer-events:none).

- 보안/운영 메모:
  - 현재 RTDB/Storage에 App Check 강제/보안 규칙 미확인(레포 내). 콘솔에서 활성화 필요.
  - 권고: App Check 강제, Storage/RTDB 보안 규칙(용량/타입/인증/경로 제한), Callable Functions 경유/레이트 리밋.

- 타임스탬프: 2025-09-11T14:41:01.4673852+09:00

---

## 템플릿 (복사하여 사용)

### YYYY-MM-DD - 변경 제목

- 변경 요약:
  - 항목 1
  - 항목 2

- 수정 파일:
  - `파일/경로`: 변경 내용 한 줄 요약

- 테스트/검증:
  - 케이스 1
  - 케이스 2

- 보안/운영 메모:
  - 메모 1 (선택)
