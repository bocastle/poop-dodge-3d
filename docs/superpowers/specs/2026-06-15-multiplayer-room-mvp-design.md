# 멀티플레이 방 MVP 설계

## 목표

`poop-dodge-3d`의 1차 웹 오픈에 가벼운 실시간 멀티플레이 모드를 추가한다. 사용자는 로그인 없이 방을 만들고, 짧은 방 코드를 친구에게 공유하고, 같은 회차에서 함께 피하면서 경쟁할 수 있어야 한다.

이 멀티플레이 기능의 목적은 첫 공개 웹 버전을 더 공유하기 쉬운 게임으로 만드는 것이다. 핵심 경험은 "링크 열기, 방 만들기, 친구에게 코드 알려주기, 같은 혼란 속에서 마지막까지 살아남기"다.

## 선택한 방향

**Lightweight Socket Room** 방식으로 간다.

- 방 최대 인원: 10명
- 방 코드: 숫자 4자리
- 모드: 경쟁 서바이벌
- 승리 조건: 마지막 생존자 승리
- 보조 결과: 점수, 생존 시간, close call, shield save
- 시작 방식: 방장이 `Start`를 누르면 모든 유저에게 동기화된 `3 -> 2 -> 1 -> START` 표시
- 진행 중 입장: 현재 판에는 참여하지 않고 다음 판 대기
- 방장 위임: 방장이 나가면 남은 사람 중 가장 먼저 들어온 사람이 방장
- 게임 중 접속 끊김: 즉시 탈락
- 협동 모드: 1차 멀티 릴리즈에서는 제외

## 범위

이번 기능에 포함한다:

- 첫 화면의 `Single / Multiplayer` 선택
- 임시 닉네임 입력
- 방 만들기
- 숫자 4자리 코드로 방 입장
- 최대 10명 로비
- 방장 전용 시작 버튼
- 모든 접속자에게 보이는 동기화 카운트다운
- 모든 활성 플레이어에게 동일한 장애물 seed와 match start time 제공
- 다른 플레이어를 작은 컬러 doodle 캐릭터로 표시
- 플레이어별 alive, eliminated, waitingNextRound 상태
- 게임 중 compact 생존자 리스트
- 모바일에서는 생존자 리스트 축소 또는 접기
- 승자와 보조 지표가 있는 결과 화면
- 방장이 다음 판 재시작
- 방과 플레이어 상태를 관리하는 in-memory Socket.IO 서버
- 프론트엔드에서 멀티 서버 URL을 받는 환경 변수
- 데스크톱/모바일 브라우저 검증과 문서화

이번 기능에서 제외한다:

- 로그인
- 계정
- 영구 DB 저장
- 공개 매칭
- 글로벌 랭킹
- 채팅
- 친구 목록
- 코스메틱 또는 프로필 꾸미기
- 기본적인 방 상태 검증 이상의 anti-cheat
- 재접속 유예
- 협동 모드
- 앱스토어 패키징

## 제품 흐름

### 진입 화면

ready 화면에서 두 선택지를 명확히 보여준다:

- `Single`
- `Multiplayer`

멀티플레이는 1차 웹 오픈의 핵심 hook이므로 첫 화면에서 바로 보여야 한다. 화면은 현재 paper/doodle 스타일을 유지하고, 마케팅 랜딩페이지처럼 보이지 않아야 한다.

방을 만들거나 입장하기 전에 짧은 닉네임을 입력한다. 닉네임은 방 안에서만 쓰는 임시 값이며 세션 종료 후 저장하지 않는다.

### 방 만들기 / 입장

멀티플레이 진입은 두 가지를 지원한다:

- 방 만들기
- 숫자 4자리 코드로 방 입장

방을 만들면 `4821` 같은 숫자 4자리 코드가 생성된다. 서버는 현재 활성 방과 코드가 충돌하지 않게 해야 한다. 제한된 횟수 안에 코드를 만들 수 없으면 사용자가 이해할 수 있는 "다시 시도해 주세요" 오류를 반환한다.

### 로비

로비에 표시할 것:

- 방 코드
- 최대 10명의 플레이어 목록
- 방장 표시
- 방장에게만 보이는 `Start` 버튼
- 각 플레이어의 참여 상태

1차 멀티 릴리즈에는 ready toggle을 넣지 않는다. 방장이 시작을 제어한다. 이렇게 해야 친구에게 빠르게 코드 공유하고 바로 시작하는 흐름이 가볍다.

### 카운트다운

방장이 시작하면 서버는 방 상태를 `countdown`으로 바꾸고 다음 값을 보낸다:

- match seed
- countdown start server time
- match start server time

모든 클라이언트는 다음을 표시한다:

```text
3
2
1
START
```

match start time 전에는 이동과 충돌 판정을 비활성화한다. 완전한 authoritative server 없이도 시작 타이밍을 충분히 공정하게 맞추기 위한 장치다.

### 경기

경기 중 동작:

- 모든 활성 플레이어는 같은 seed와 start time으로 같은 로컬 게임 루프를 실행한다.
- 각 클라이언트는 자기 플레이어 위치를 제한된 주기로 서버에 보낸다.
- 각 클라이언트는 shield 보호 없이 충돌이 발생했을 때 자기 탈락 이벤트를 서버에 보낸다.
- 서버는 alive/eliminated 상태를 추적한다.
- 서버는 생존자가 한 명 남으면 승자를 발표한다. 모두 탈락하면 승자 없음 또는 결과만 표시한다.

1차 릴리즈에서 서버는 모든 장애물과 충돌을 직접 시뮬레이션하지 않는다. 목표는 복잡한 anti-cheat가 아니라 낮은 복잡도의 실시간 방 경험이다.

### 진행 중 입장

방 상태가 `countdown` 또는 `playing`일 때 들어온 플레이어는 `waitingNextRound` 상태가 된다.

대기 플레이어:

- 방 목록에 표시된다.
- 현재 진행 중인 판에는 spawn되지 않는다.
- 현재 판 상태를 가볍게 볼 수 있다.
- 방장이 다음 판을 시작하면 참여한다.

### 결과와 재시작

경기가 끝나면 모든 플레이어에게 결과 화면을 보여준다:

- 승자
- 플레이어별 순위 또는 생존 상태
- 점수
- 생존 시간
- close calls
- shield saves

현재 방장만 다시 시작 버튼을 볼 수 있다. 다음 판이 시작되면 waitingNextRound 플레이어도 active 상태가 된다.

## 시각 설계

선택한 흐름은 A 와이어프레임이다:

1. Entry: Single / Multiplayer 선택
2. Room: 숫자 4자리 방 코드와 10명 로비
3. Countdown: 큰 동기화 카운트다운
4. Match: 작은 remote player와 compact 생존 상태

### 다른 플레이어 표시

로컬 플레이어가 가장 중요하게 보여야 한다. 다른 플레이어는 더 작고 단순하게 표시한다:

- 컬러가 다른 작은 doodle body
- 짧은 닉네임 라벨, 몇 글자만 보이도록 제한
- 탈락 시 opacity 감소
- arena 안에 큰 UI 카드 배치 금지

다른 플레이어가 낙하 장애물이나 로컬 플레이어를 가리면 안 된다.

### 생존자 리스트

데스크톱:

- alive/eliminated 상태를 compact side list 또는 corner list로 표시한다.
- score HUD보다 작게 유지한다.

모바일 세로/가로:

- 생존자 리스트를 작은 chip 또는 펼칠 수 있는 panel로 축소한다.
- 기본 모바일 상태에서는 arena, 로컬 플레이어, 장애물, 핵심 HUD를 우선한다.
- 10명 이름이 arena를 압박할 수 있으므로 모바일에서 항상 펼쳐진 오른쪽 패널은 피한다.

## 기술 아키텍처

### 프론트엔드

프론트엔드는 Vite, React, TypeScript, Three.js, React Three Fiber를 유지한다.

새 프론트엔드 모듈은 역할을 분리한다:

- 멀티플레이 연결 client
- room state reducer/types
- 멀티플레이 UI overlay
- remote player rendering
- seeded multiplayer match adapter

기존 싱글플레이는 멀티 서버 없이도 계속 동작해야 한다. `VITE_MULTIPLAYER_SERVER_URL`이 없거나 연결에 실패해도 싱글플레이는 사용할 수 있어야 한다.

### 서버

작은 Node.js Socket.IO 서버를 사용한다. Render 또는 Fly.io에 배포 가능해야 한다.

서버 책임:

- 방 생성
- 숫자 4자리 방 코드 할당
- 플레이어 추적
- 방장 추적
- disconnect 시 방장 위임
- 카운트다운 시작
- match seed와 start time broadcast
- 플레이어 위치 업데이트 수신
- 탈락 이벤트 수신
- 승자/종료 상태 추적
- 진행 중 입장자를 다음 판 대기 상태로 전환
- 빈 방 또는 idle 방 정리

1차 릴리즈에서 서버 저장소는 in-memory만 사용한다.

### 배포 구조

1차 웹 오픈 추천 배포:

- Frontend: Vercel 또는 Netlify
- Socket server: Render 또는 Fly.io Node server
- Frontend env var: `VITE_MULTIPLAYER_SERVER_URL`

1차 멀티 릴리즈에는 DB가 필요 없다.

## 방 상태 모델

방 상태:

- `lobby`
- `countdown`
- `playing`
- `results`

플레이어 상태:

- `lobby`
- `countdown`
- `alive`
- `eliminated`
- `waitingNextRound`
- `disconnected`

핵심 room fields:

- `roomCode`
- `hostId`
- `players`
- `status`
- `seed`
- `countdownStartedAt`
- `matchStartedAt`
- `roundId`
- `winnerId`
- `createdAt`
- `updatedAt`

핵심 player fields:

- `id`
- `nickname`
- `color`
- `joinedAt`
- `state`
- `position`
- `score`
- `elapsedSeconds`
- `closeCalls`
- `shieldSaves`

## 네트워크 이벤트

Client to server:

- `room:create`
- `room:join`
- `room:leave`
- `room:start`
- `player:position`
- `player:eliminated`
- `player:stats`

Server to client:

- `room:created`
- `room:joined`
- `room:error`
- `room:state`
- `match:countdown`
- `match:start`
- `match:end`
- `player:joined`
- `player:left`
- `player:hostChanged`
- `player:position`
- `player:eliminated`

가능하면 client와 server가 공유하는 typed payload를 사용한다.

## 오류 처리

UI가 처리해야 할 상황:

- 잘못된 방 코드
- 방이 가득 참
- 방을 찾을 수 없음
- 방장 이탈
- 서버 사용 불가
- 경기 전 socket disconnect
- 경기 중 socket disconnect

1차 릴리즈 동작:

- 서버 사용 불가: 멀티플레이 사용 불가 메시지를 보여주고 싱글플레이는 계속 사용 가능하게 한다.
- 방이 가득 참: 친절한 메시지를 보여주고 join form으로 돌아간다.
- 잘못된 코드: code input focus를 유지하고 오류를 표시한다.
- 방장 이탈: 남은 플레이어 중 가장 먼저 들어온 사람에게 방장을 위임한다.
- 경기 중 disconnect: 해당 플레이어를 탈락 처리한다.
- 빈 방: 서버가 삭제한다.
- idle 방: timeout 이후 서버가 삭제한다.

## 테스트

자동화 테스트가 커버해야 할 것:

- 방 코드 생성과 collision retry
- 방 생성
- 방 입장
- 최대 10명 제한
- disconnect 시 방장 위임
- 진행 중 입장자는 `waitingNextRound`
- 경기 중 disconnect는 탈락
- 카운트다운 상태 전환
- 한 명만 남았을 때 승자 선택
- 멀티플레이 사용 불가 시 싱글플레이 fallback

브라우저/수동 검증이 커버해야 할 것:

- 데스크톱 방 생성/입장 흐름
- 로컬에서 두 개 브라우저 탭이 같은 방에 입장
- 방장 시작과 동기화 카운트다운
- remote player 위치 표시
- 탈락 상태 표시
- 진행 중 입장자가 다음 판 대기
- 방장 disconnect 이후 방장 위임
- 모바일 세로 로비와 경기 레이아웃
- 모바일 가로 로비와 경기 레이아웃
- 모바일에서 생존자 리스트 축소/접기
- socket server 없이도 싱글플레이 동작

## 인수 기준

- 사용자는 첫 화면에서 Multiplayer를 선택할 수 있다.
- 사용자는 방을 만들고 숫자 4자리 코드를 받을 수 있다.
- 다른 사용자는 코드로 방에 들어올 수 있다.
- 방은 최대 10명을 지원한다.
- 방장만 판을 시작할 수 있다.
- 시작하면 모든 플레이어에게 동기화된 `3 -> 2 -> 1 -> START`가 표시된다.
- 경기 중 들어온 플레이어는 다음 판까지 대기한다.
- 방장이 disconnect되면 남은 사람 중 가장 먼저 들어온 사람에게 방장이 넘어간다.
- 플레이어가 경기 중 disconnect되면 탈락 처리된다.
- 서버는 한 명만 남았을 때 승자를 발표한다.
- 데스크톱과 모바일 레이아웃이 플레이 가능해야 한다.
- 모바일 생존자 리스트는 기본적으로 축소 또는 최소화된다.
- 멀티플레이를 사용할 수 없어도 싱글플레이는 동작한다.
- `npm run lint`, `npm run test`, `npm run build`가 통과한다.

## 열린 리스크

- 1차 릴리즈에서는 충돌 판정이 client-side라 실시간 sync가 완벽하게 느껴지지 않을 수 있다.
- 모바일 네트워크에서는 위치 jitter가 생길 수 있다.
- 10명 방은 remote player나 label이 너무 크면 arena가 복잡해질 수 있다.
- in-memory 방은 서버 재시작 시 사라진다.
- 로그인과 rate limit이 없으면 공개 abuse 가능성이 있으므로, 구현 시간이 허락하면 방 생성에 기본적인 server-side throttling을 넣는다.
