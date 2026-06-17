# 웹 오픈 준비 패스 설계

## 목표

`poop-dodge-3d`를 기능 추가 중심에서 웹 오픈 가능 상태로 끌어올린다. 이번 패스의 목표는 공개 배포가 아니라, 배포 직전까지 필요한 브라우저 QA, 모바일 레이아웃 안정화, 성능 경고 대응, 최소 사용자 설정, 실행 문서 정리를 끝내는 것이다.

## 선택한 방향

**Web Open Readiness Pass**로 진행한다.

현재 게임에는 싱글 플레이, 멀티플레이 방, 카운트다운, 위험 웨이브, 피버, 사운드, 결과 화면이 들어가 있다. 다음 작업은 새로운 재미 기능을 더 붙이는 것보다, 이미 들어간 기능들이 데스크톱과 모바일 브라우저에서 깨지지 않고 전달되는지 확인하고 고치는 쪽이 우선이다.

## 범위

이번 패스에 포함한다:

- 데스크톱, 모바일 세로, 모바일 가로 뷰포트 QA
- 싱글 플레이 기본 루프 확인: 시작, 20초 전후 생존, 위험 웨이브, 피버, 게임오버, 재시작
- 멀티플레이 기본 루프 확인: 방 생성, 카운트다운, 플레이 중 생존자 리스트, 결과 화면
- HUD 겹침 수정: scorebar, status chip, wave banner, doodle callout, survivor list
- 게임오버 카드 겹침 수정: final score, recap, run highlight, retry button
- 사운드 최소 설정 추가: sound on/off
- reduced motion 환경에서 반복 애니메이션과 큰 pop 효과를 줄이는 보정
- 현재 Vite build large chunk warning 원인 기록 및 `GameScene` lazy loading 적용 여부 결정
- README 실행 문서 정리
- `docs/handoff.md`와 회고 문서 갱신

이번 패스에서 제외한다:

- 실제 배포
- 도메인 연결
- 앱스토어 패키징
- 로그인
- DB 저장
- 글로벌 랭킹
- 공개 매칭
- 새 캐릭터 모델 제작
- 새 게임 모드 추가
- 대규모 Three.js 구조 리라이트

## 성공 기준

아래 조건을 만족하면 이번 패스를 완료로 본다:

- `npm run lint` 통과
- `npm run test` 통과
- `npm run build` 통과
- `npm run server:check` 통과
- `1280x720`에서 싱글 ready/play/game-over/retry 흐름이 깨지지 않는다
- `390x844`에서 HUD, wave banner, game-over 카드, retry 버튼이 화면 밖으로 밀리지 않는다
- `667x375`에서 status strip, survivor list, multiplayer results가 주요 버튼을 가리지 않는다
- 사운드 토글이 localStorage에 저장되고, off 상태에서 게임 효과음이 나가지 않는다
- build large chunk warning은 `GameScene` lazy loading으로 해결한다. 적용 중 라우팅/초기 로딩 문제가 생기면 적용하지 않고 원인과 다음 조치를 문서에 남긴다

## 제품 흐름

### 싱글 플레이 QA

ready 화면에서 `Single`을 누르면 즉시 게임이 시작된다. 10초 이후 위험 웨이브 배너가 보이고, close call 콤보가 커지면 `FEVER` 칩이 보인다. 게임오버 화면에서는 final score, recap, run summary, run highlight, retry button이 모두 확인 가능해야 한다.

### 멀티플레이 QA

`Multiplayer`에서 닉네임 입력 후 방을 만들 수 있어야 한다. 방장은 start를 누르고, 모든 활성 플레이어는 카운트다운 이후 같은 라운드에 들어간다. 모바일에서는 생존자 리스트가 접히거나 축소된 상태로 주요 UI를 가리지 않아야 한다. 결과 화면에서는 winner, result badges, next round/leave 버튼이 화면 안에 들어와야 한다.

### 사운드 설정

사운드는 기본 on으로 둔다. sound toggle은 HUD 하단 controls 영역의 오른쪽 끝에 둔다. 버튼 문구는 on 상태에서 `Sound on`, off 상태에서 `Sound off`로 표시한다. 사용자가 off로 바꾸면 `localStorage`에 저장하고, 이후 `playGameSound()` 호출은 실제 오디오를 내지 않는다. 토글은 모바일 가로모드에서도 retry button과 survivor list를 가리지 않아야 한다.

## 아키텍처

새 기능은 작은 단위로 분리한다.

- `src/game/audio.ts`: 현재 효과음 재생 지점에 sound enabled 상태를 반영한다.
- `src/game/storage/`: 사운드 설정 저장소를 추가한다. 기존 high score storage 패턴을 따른다.
- `src/ui/GameOverlay.tsx`: 사운드 토글을 표시한다.
- `src/styles.css`: 모바일/가로모드 레이아웃 보정과 토글 스타일을 추가한다.
- `src/app/App.tsx`: 사운드 설정 상태를 읽고 overlay와 audio layer에 연결한다.
- `docs/`: README, handoff, retrospective를 갱신한다.

성능 작업은 `GameScene` lazy loading을 1차 후보로 둔다. `App.tsx`에서 `React.lazy`와 `Suspense`로 scene import를 분리하고, ready 화면이 늦게 뜨지 않는지 브라우저에서 확인한다. lazy loading이 안정적으로 동작하면 적용한다. 적용 과정에서 초기 화면이 깜빡이거나 테스트 복잡도가 과하게 커지면 이번 패스에서는 적용하지 않고, build warning 원인과 다음 조치를 `docs/handoff.md`에 기록한다.

## 테스트 전략

테스트는 TDD로 추가한다.

- sound setting storage 테스트
- sound off 상태에서 `playGameSound()`가 오디오 컨텍스트를 만들지 않는 테스트
- `GameOverlay`가 sound toggle을 표시하는 렌더 테스트
- toggle 상태에 따라 label이 바뀌는 테스트
- 모바일 레이아웃 변경은 CSS와 렌더 테스트로 확인 가능한 부분을 먼저 검증하고, 실제 브라우저 확인 결과를 `docs/handoff.md`에 기록한다

수동 브라우저 확인은 다음 뷰포트를 기준으로 한다:

- Desktop: `1280x720`
- Mobile portrait: `390x844`
- Mobile landscape: `667x375`

## 에러 처리

`localStorage`를 사용할 수 없는 브라우저에서는 사운드 설정 저장 실패를 무시하고 기본 on 상태로 게임을 계속 진행한다. Web Audio API가 없는 브라우저에서는 기존처럼 소리 없이 게임을 계속한다. 멀티플레이 서버가 꺼져 있어도 싱글 플레이는 정상 동작해야 한다.

## 구현 순서

1. 현재 화면을 브라우저에서 재현하고 QA 체크리스트를 만든다.
2. 사운드 설정 저장소와 audio gate 테스트를 먼저 작성한다.
3. sound toggle UI를 추가한다.
4. 모바일/가로모드 레이아웃 문제를 확인하고 보정한다.
5. `GameScene` lazy loading을 적용하고 build warning 변화를 확인한다. 안정성이 떨어지면 되돌리고 문서화한다.
6. README, handoff, retrospective를 갱신한다.
7. 전체 검증과 브라우저 QA 결과를 보고한다.

## 승인 필요 사항

이번 스펙은 “웹 오픈 준비”에만 집중한다. 실제 배포, 도메인 연결, 앱스토어 패키징은 사용자가 별도로 승인하기 전까지 진행하지 않는다.
