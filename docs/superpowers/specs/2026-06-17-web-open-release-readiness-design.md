# 웹 오픈 릴리즈 준비 설계

## 배경

`poop-dodge-3d`는 웹 MVP, Pure Doodle 리디자인, 게임 재미 개선, 멀티플레이 룸 MVP, 웹 오픈 안정화 QA 패스가 `main`까지 병합된 상태다. 이제 다음 목표는 새 기능을 더 붙이는 것이 아니라, 1차 웹 오픈을 안전하게 진행할 수 있도록 릴리즈 상태를 정리하고 QA 기준과 배포 준비 기준을 명확히 만드는 것이다.

## 목표

1. 현재 저장소 상태를 `main` 통합 완료 기준으로 정리한다.
2. `docs/handoff.md`의 오래된 feature 대기 문구를 현재 릴리즈 후보 상태로 갱신한다.
3. 웹 오픈 전 QA 결과를 반복 가능한 문서로 남길 수 있게 한다.
4. 프론트엔드와 멀티플레이 서버 배포 전 필요한 환경변수, CORS, Socket.IO 연결 기준을 문서화한다.
5. 실제 공개 배포는 별도 승인 전까지 진행하지 않는다.

## 비목표

- 공개 URL에 실제 배포하지 않는다.
- 로그인, 랭킹, DB 저장, 매치메이킹, 앱스토어 제출 기능을 만들지 않는다.
- 게임 룰이나 캐릭터 비주얼을 새로 변경하지 않는다.
- 멀티플레이 서버를 영속 저장 구조로 바꾸지 않는다.
- 외부 모니터링/로그 수집 SaaS를 붙이지 않는다.

## 추천 접근

**A. 오픈 우선 릴리즈 준비 패스**

- 문서 상태를 먼저 현재화한다.
- 기존 `docs/web-open-checklist.md`를 기준으로 QA 실행 증거를 남긴다.
- 배포 플랫폼을 바로 확정하기보다, 프론트/서버 각각의 요구사항과 후보를 정리한다.
- 발견된 문제만 작은 패치로 처리한다.

이 접근을 선택한다. 지금 단계에서는 “재미를 더 올리는 작업”보다 “웹에 올려도 되는지 판단하는 작업”이 우선이다.

## 작업 범위

### 1. 릴리즈 상태 정리

`docs/handoff.md`를 갱신한다.

- 현재 브랜치 설명을 `main` 통합 완료 상태에 맞춘다.
- 프로젝트 상태를 `web open candidate`로 정리한다.
- 이전 “feature 브랜치에 구현되어 있고 통합 대기” 문구를 제거한다.
- 다음 작업을 “오픈 QA, 배포 준비, staging 배포” 순서로 갱신한다.

### 2. 웹 오픈 QA 실행 기록

새 문서 `docs/web-open-qa-results.md`를 추가한다.

이 문서는 체크리스트 자체가 아니라, 특정 실행 시점의 결과 기록이다.

포함 항목:

- 실행 날짜
- 검증 커밋
- 실행 명령
- 데스크탑 브라우저 결과
- 모바일 뷰포트 결과
- 멀티플레이 결과
- 서버 미실행 상태 결과
- 콘솔 에러 여부
- 남은 릴리즈 리스크
- 공개 전 결론: `go`, `go with notes`, `no-go`

### 3. 배포 준비 문서

새 문서 `docs/deployment-readiness.md`를 추가한다.

포함 항목:

- 프론트 배포 후보: Vercel, Netlify
- 멀티플레이 서버 배포 후보: Render, Fly.io, Railway
- 필수 환경변수:
  - `VITE_MULTIPLAYER_SERVER_URL`
  - `PORT`
  - `CLIENT_ORIGIN`
- CORS 기준:
  - 서버 `CLIENT_ORIGIN`은 실제 프론트 URL과 일치해야 한다.
  - staging과 production은 다른 origin을 가질 수 있으므로 환경별로 분리한다.
- Socket.IO 확인 기준:
  - create room
  - join room
  - synchronized countdown
  - disconnect handling
  - server unavailable fallback
- 실제 배포는 사용자 승인 후 별도 작업으로 진행한다.

### 4. QA 중 발견 이슈 처리 기준

QA 중 발견된 문제는 아래 기준으로 처리한다.

- 오픈 차단 이슈: 같은 feature 브랜치에서 작은 패치로 수정하고 테스트한다.
- 오픈 비차단 이슈: `docs/web-open-qa-results.md`의 deferred risks에 남긴다.
- 새 기능 요청: 이번 패스에서 제외하고 후속 스펙으로 분리한다.

## 검증 계획

자동 검증:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run server:check`

브라우저 검증:

- Chrome desktop
- Safari desktop 수동 확인. 실행하지 못하면 `docs/web-open-qa-results.md`에 `not run`으로 기록하고 공개 전 결론을 `go with notes` 또는 `no-go`로만 남긴다.
- 모바일 세로 `390x844`
- 모바일 가로 `667x375`
- 멀티 서버 실행 상태
- 멀티 서버 미실행 상태

멀티플레이 검증:

- 방 생성
- 방 입장
- 10명 제한
- 카운트다운 동기화
- 방 나가기
- 서버 연결 실패 문구

## 완료 기준

- `docs/handoff.md`가 현재 main 통합 상태를 반영한다.
- `docs/web-open-qa-results.md`에 검증 결과가 기록되어 있다.
- `docs/deployment-readiness.md`에 배포 전 환경 기준이 정리되어 있다.
- 자동 검증 명령이 통과한다.
- QA 결과가 `go`, `go with notes`, `no-go` 중 하나로 명확히 남아 있다.
- 실제 배포 여부는 사용자에게 별도로 승인받는다.

## 리스크

- 실제 모바일 기기 확인은 자동화하기 어렵다.
- 멀티플레이 서버가 in-memory 구조라 서버 재시작 시 방이 사라진다.
- 로그인과 영속 identity가 없어서 공개 후 사용자 추적은 제한적이다.
- Socket.IO 서버 배포 플랫폼에 따라 sleep, cold start, WebSocket 지원 제한이 있을 수 있다.

## 결정

이번 패스는 **1차 웹 오픈 전 릴리즈 준비**로 제한한다. 배포 자체는 아직 실행하지 않고, 오픈 가능 여부를 판단할 수 있는 문서와 QA 증거를 먼저 만든다.
