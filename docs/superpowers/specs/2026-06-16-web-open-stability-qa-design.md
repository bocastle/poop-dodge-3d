# 웹 오픈 안정화 QA 패스 설계

## 배경

현재 `poop-dodge-3d`는 1차 웹 MVP 기능이 구현되어 있고, `feature/pure-doodle-redesign` 브랜치에 최신 웹 오픈 준비 커밋이 올라가 있다. 이번 패스의 목표는 배포를 시작하는 것이 아니라, 사용자가 웹에서 처음 열었을 때 빈 화면, 서버 연결 실패, 모바일 레이아웃 깨짐, 운영 체크 누락을 줄이는 것이다.

## 목표

1. 3D 게임 씬 lazy loading 중에도 화면이 비어 보이지 않게 한다.
2. 멀티플레이 서버 미설정/접속 실패/연결 끊김 상황을 사용자가 이해할 수 있게 한다.
3. 싱글 플레이는 멀티 서버 상태와 무관하게 계속 시작할 수 있게 한다.
4. 웹 오픈 전 QA 체크리스트를 문서화해서 다음 개발자가 같은 검증을 반복할 수 있게 한다.
5. 코드 변경은 테스트 가능한 작은 단위로만 진행한다.

## 비목표

- 실제 배포 작업은 하지 않는다.
- 로그인, 랭킹, DB 저장, 매치메이킹, 앱스토어 제출 기능은 만들지 않는다.
- 멀티플레이 협동 모드나 새 게임 규칙은 추가하지 않는다.
- 대규모 UI 리디자인은 하지 않는다.

## 추천 접근

**A. 오픈 전 안정화 최소 패스**

- 로딩 fallback, 연결 실패 UX, QA 문서를 작게 추가한다.
- 기존 게임 재미와 멀티 룸 구조는 건드리지 않는다.
- 1차 웹 오픈 전에 가장 필요한 안정성만 올린다.

이 접근을 선택한다. B안인 운영 기능 확장이나 C안인 게임 재미 개선은 지금 범위를 넘긴다.

## 사용자 경험

### 로딩

게임이 처음 열리고 `GameScene` 청크가 로딩되는 동안 중앙에 짧은 종이 스타일 로딩 패널을 보여준다.

- 문구: `Loading doodle arena`
- 보조 문구: `Sketching the first round...`
- 기존 Pure Doodle 스타일과 같은 테두리/그림자 계열을 사용한다.
- 로딩 패널은 게임이 준비되면 사라진다.

### 멀티플레이 연결 실패

멀티플레이 패널은 기존 `RoomError`를 유지하되, 사용자가 다음 행동을 이해할 수 있도록 더 구체적인 문구를 제공한다.

- 서버 URL이 없을 때: `Multiplayer server is not configured. Single player is ready.`
- 서버 접속 실패: `Could not reach the multiplayer server. Single player still works.`
- 연결 끊김: `Connection lost. Start a single run or try multiplayer again.`

싱글 플레이 버튼은 어떤 멀티 오류 상황에서도 계속 사용 가능해야 한다.

### QA 체크리스트

`docs/web-open-checklist.md`를 추가한다.

체크리스트는 다음 항목을 포함한다.

- 로컬 실행 명령
- 멀티플레이 서버 실행 명령
- 필수 환경변수
- 데스크탑 브라우저 확인
- 모바일 세로/가로 확인
- 싱글 플레이 확인
- 멀티 방 생성/입장 확인
- 서버 미실행 상태 확인
- 사운드 토글 확인
- 빌드/테스트 명령
- 웹 오픈 전 보류 리스크

## 기술 설계

### App

`src/app/App.tsx`는 `GameScene` lazy loading 구조를 유지하되, DOM fallback을 `<Canvas>` 내부 `Suspense`에 넣지 않는다. React Three Fiber는 Canvas 내부에서 DOM 태그를 Three 객체로 해석하므로, Canvas 내부 `Suspense` fallback은 `null`로 유지하고 DOM 로딩 패널은 Canvas 바깥 overlay로 렌더링한다.

### Loading 컴포넌트

새 파일 `src/ui/LoadingFallback.tsx`를 만든다.

책임:

- 로딩 문구만 렌더링한다.
- 앱 상태나 게임 상태를 받지 않는다.
- 서버/게임 로직에 의존하지 않는다.

테스트:

- 정적 마크업에 `Loading doodle arena`와 `Sketching the first round...`가 들어가는지 검증한다.

### Multiplayer Error Copy

`src/multiplayer/useMultiplayerRoom.ts`의 연결 오류 메시지를 갱신한다.

테스트:

- 서버 URL이 비어 있으면 설정 오류 문구를 반환한다.
- `connect_error`가 발생하면 서버 접속 실패 문구를 반환한다.
- 활성 방이 있는 상태에서 `disconnect`가 발생하면 연결 끊김 문구를 반환한다.

### CSS

`src/styles.css`에 `.loading-fallback` 스타일을 추가한다.

조건:

- 중앙 패널처럼 보인다.
- `.scene-loading-layer`는 Canvas 위에 absolute overlay로 배치한다.
- 모바일 폭에서도 `calc(100vw - 24px)` 안에 들어간다.
- reduced motion에서 애니메이션을 쓰지 않는다.

## 검증 계획

자동 검증:

- `npm run test -- src/ui/LoadingFallback.test.tsx src/multiplayer/useMultiplayerRoom.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run server:check`

브라우저 검증:

- `npm run preview`로 ready 화면 확인
- 데스크탑에서 로딩 fallback이 잠깐이라도 안전하게 렌더링 가능한 구조인지 DOM 기준 확인
- 모바일 `390x844`에서 overflow 없는지 확인
- 멀티 서버 없이도 싱글 버튼이 남아 있는지 확인

## 완료 기준

- 로딩 fallback 컴포넌트와 테스트가 있다.
- 멀티플레이 연결 실패 문구가 “싱글 플레이는 가능하다”는 사실을 알려준다.
- 웹 오픈 체크리스트 문서가 있다.
- 전체 검증 명령이 통과한다.
- 커밋/푸시는 사용자가 현재 대화에서 명시적으로 요청할 때만 진행한다.
