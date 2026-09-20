# PIXEL MEET

도트 공간을 돌아다니다 마음에 드는 사람 옆에 앉으면 대화가 열리는, Gather.town 방식의 채팅 소개팅 앱.
`cluade.md` 기획서를 그대로 구현한 MVP입니다.

## 실행

```bash
npm run install:all     # app + server 의존성 설치

npm run server          # (선택) 실시간 서버 :4000
npm run app             # Expo 시작 → Expo Go 로 QR 스캔
npm run app:web         # 브라우저에서 바로 확인 (두 창 띄우면 2인 테스트)
```

**서버를 안 켜도 앱은 돌아갑니다.** 1.5초 안에 소켓이 안 붙으면 로컬 목 서버로 자동 폴백하고,
NPC 7명이 맵을 돌아다니며 자리에 앉고 대화를 걸어옵니다. 상단에 `로컬 모드` / `실시간 서버`로 표시됩니다.

실기기에서 서버에 붙이려면, 그리고 Supabase 크레덴셜을 넣으려면 `app/.env.example`을 복사해서 `app/.env`로 만든다
(`.env`는 git에 커밋되지 않는다):

```
EXPO_PUBLIC_SERVER_URL=http://192.168.0.10:4000        # 실기기에서는 PC의 LAN IP로

EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co     # 없으면 프로필이 기기 로컬에만 저장된다
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Supabase도 없으면 로컬 전용으로 조용히 폴백합니다** (소켓 서버와 같은 철학). 있으면 앱 시작 시
익명 로그인(`supabase.auth.signInAnonymously`)으로 로그인 화면 없이 안정적인 계정을 만들고,
캐릭터를 `profiles` 테이블에 올려서 앱을 지워도(같은 인증 세션이 살아있는 한) 복원됩니다.

## 구조

```
app/src/
  game/            # 타일맵 엔진 (순수 로직, UI 의존 없음)
    constants.ts   #   TILE=32, 이동속도, 근접 반경(2타일), AFK 타이머
    tiles.ts       #   ASCII 한 글자 = 타일 1개 (충돌/좌석/장식 정의)
    collision.ts   #   축 분리 AABB — 벽에 비스듬히 부딪혀도 미끄러진다
    path.ts        #   BFS — NPC가 목표 좌석까지 벽을 돌아 실제로 도착
    proximity.ts   #   근접 판정 + 좌석 존 동석 판정
    maps/          #   도서관 / 지하철 타일맵
  net/             # 통신 계층 (RoomConnection 인터페이스 하나로 추상화)
    mock.ts        #   NPC AI가 들어있는 로컬 목 서버
    socket.ts      #   socket.io 구현
  components/      # 전부 View 조합으로 그린 픽셀 UI (이미지 에셋 0개)
  screens/         # 로비(캐릭터 생성) / 룸(게임 루프)
  data/storage.ts       # 캐릭터 로컬 영속화 (AsyncStorage) — Supabase 미설정 시 유일한 저장소
  data/supabase.ts      # Supabase 클라이언트 (크레덴셜 없으면 null — 호출부가 알아서 폴백)
  data/cloudProfile.ts  # 익명 로그인 + profiles 테이블 upsert/조회
server/
  index.js         # socket.io — 방, 세션, 대화 신청 중계 + 서버 측 이동/좌석 검증
  maps.js          # 서버용 충돌맵·좌석존 (app/src/game/maps/*.ts 와 값 동기화 필요)
supabase/
  migrations/0001_profiles.sql   # profiles 테이블 + RLS 정책 (SQL Editor에 그대로 붙여넣기 가능)
```

## 기획서 스펙 대응

| 기획 | 구현 |
|---|---|
| 도서관: 1:1 독서실 책상, 정적 구역 | `maps/library.ts` — 책상 1개 + 마주보는 좌석 2개가 한 존. 8개 열람석 |
| 지하철: 칸마다 주제, 같이 앉으면 채팅방 | `maps/subway.ts` — '퇴근길 소주 한 잔' 등 12개 테마 벤치 |
| 상태 표시 (🟢 대화 가능 / 💬 대화 중) | `StatusBadge.tsx` — 머리 위 픽셀 말풍선 |
| 부재중 모션 (📖 사주 / 🎧 음악) | 45초 무입력 시 자동 AFK 전환 |
| 좌측 하단 가상 조이스틱 | `Joystick.tsx` — PanResponder, 데드존 18% |
| 의자 앉기 애니메이션 | 의자 타일 진입 시 타일 중앙 스냅 + Sit 포즈 |
| 타일맵 Collision | `collision.ts` — 히트박스가 타일보다 작아 문틈을 자연스럽게 통과 |
| 프로필 팝업 (대화 신청/궁합/선물) | `ProfileSheet.tsx` |
| 대화 상태 머신 IDLE/WALK/BUSY/AFK | `RoomScreen` 게임 루프 + 서버가 BUSY를 강제 |
| 대화 방해 방지 | BUSY인 상대는 서버가 신청을 차단하고 '현재 대화 중입니다' 안내 |
| 실시간 좌표 동기화 | 100ms 스로틀 브로드캐스트 |

## 기획서와 다르게 간 부분

- **Pixi.js 대신 React Native View 렌더링.** RN에서 Pixi를 쓰려면 WebView나 네이티브 브릿지가 필요해
  Expo Go에서 바로 안 돌아갑니다. 타일을 가로로 런랭스 병합해서 그리므로(432개 → 약 60개 View)
  같은 32px 타일맵 결과를 에셋 0개로 얻습니다. 파티클이나 대규모 스프라이트가 필요해지면
  그때 `react-native-skia`로 이 레이어만 교체하면 됩니다 (`MapCanvas` / `Avatar` 두 파일).
- **근접 2타일은 자동 대화를 열지 않습니다.** 기획서의 '2타일 접근 시 세션 생성'과 '터치 → 신청 → 수락'이
  충돌해서, 후자를 택했습니다. 2타일 안에 들어오면 하단 힌트 바에 상대가 뜨고 신청 버튼이 나옵니다.
  자동으로 열리는 건 **같은 좌석 존에 나란히 앉았을 때**뿐입니다.
- 캐릭터는 Aseprite 스프라이트 대신 색 파츠 조합입니다. 기획서의 '파츠 돌려막기'와 같은 방향이고,
  나중에 실제 도트 에셋이 생기면 `Avatar.tsx` 하나만 갈아끼우면 됩니다.

## 보안 / 신뢰 (서버가 클라이언트를 믿지 않는 부분)

클라이언트 좌표·요청을 그대로 반영하지 않고 서버가 재검증합니다. `server/maps.js` 에 대응하는 스모크 테스트로 확인함:

- **이동 속도 클램프**: `move` 이벤트마다 서버 시계로 dt를 재서 `WALK_SPEED * dt * 여유치`를 넘는 이동은 그 방향으로 잘라낸다. dt는 클라이언트가 아니라 서버가 재므로 dt 값 자체를 속일 수 없다. (`(5000,5000)` 순간이동 시도 → 실제로는 프레임당 최대 이동거리만큼만 반영됨을 확인)
- **벽 통과 방지**: 클램프된 결과 좌표가 벽 타일이면 그 이동 자체를 버린다.
- **좌석 도용 방지**: `sit` 요청 시 그 좌석 타일과 1.5타일 이상 떨어져 있으면 거부한다. 좌석 동석이 대화 세션을 여는 유일한 자동 트리거라 여기가 뚫리면 "실제로 옆에 없는 사람과도 대화방이 열리는" 문제가 생긴다 — 검증으로 확인 완료.
- **BUSY 상태는 서버가 강제**: 클라이언트가 뭐라고 주장하든 세션 중이면 `state: 'BUSY'`로 덮어쓴다.

## Supabase 연동 (프로필 영속화)

- **인증 방식**: 이메일/비밀번호 로그인 화면 없이 `signInAnonymously()`로 기기마다 안정적인 계정을 만든다.
  세션은 AsyncStorage에 저장돼 앱을 지우지 않는 한 유지된다. 나중에 실제 로그인이 필요해지면
  이 익명 계정에 이메일/소셜을 링크(`linkIdentity`)하는 식으로 자연스럽게 업그레이드할 수 있다.
- **스키마**: `profiles` 테이블 하나. RLS로 "본인 행만 읽고 쓴다"만 허용한다(`auth.uid() = id`).
  실시간 좌표·상태(x, y, BUSY 등)는 여기 안 넣는다 — 그건 휘발성이라 소켓 서버 인메모리가 맞고,
  여기는 "다시 켰을 때도 남아있어야 하는 것"만 담당한다.
- **검증한 것** (스모크 테스트, 브라우저 E2E 둘 다): 익명 로그인 → 프로필 upsert/조회, 새로고침해도
  같은 계정으로 복원, **다른 익명 계정이 남의 프로필을 읽거나 수정하려는 시도는 RLS가 0건으로 차단**.
- 마이그레이션은 `supabase/migrations/0001_profiles.sql` — 다른 프로젝트에 옮길 땐 SQL Editor에
  그대로 붙여넣으면 된다 (멱등하게 짜서 여러 번 실행해도 안전).

## 폰에서 실행하기 (Expo Go, EAS Update)

개발 중엔 `npm run app`으로 로컬 Metro에 붙어서 테스트하지만, **집 Wi-Fi를 벗어나도 열리게** 하려면
EAS Update로 배포해서 인터넷 아무 데서나 여는 링크를 쓴다. iOS인데 Apple Developer Program($99/년)
없이 홈 화면에 진짜 앱 아이콘을 박는 건 불가능하다(무료 대안인 Xcode+USB 사이드로드는 7일마다
재설치해야 해서 "밖에서도"라는 조건과 안 맞음). 대신 이미 설치돼 있는 **Expo Go 앱**으로 여는 방법:

```bash
cd app
EXPO_TOKEN=<expo.dev 액세스 토큰> npx eas-cli update --branch production --environment production
```

Expo Go로 열리는 링크(채널 기준이라 재배포해도 QR/링크가 안 바뀐다):

```
exp://u.expo.dev/c7dd5b07-f171-4422-8ccb-7abe05842937?channel-name=production
```

- **주의**: `app.json`의 `runtimeVersion`이 반드시 `"exposdk:<설치된 Expo SDK 버전>"` 형식이어야
  Expo Go가 연다. `eas update`가 처음 자동으로 잡아주는 `{"policy":"appVersion"}`은 Expo Go에서
  안 열려서(런타임 버전이 안 맞음) `"exposdk:57.0.0"`으로 고쳤다 — SDK를 올리면 이 값도 같이 올려야 한다.
- 이 링크는 **JS 번들만** 배포한다. 실시간 채팅 서버는 별도로 배포돼 있다 (아래 참고).
- 코드를 고칠 때마다 `eas update`를 다시 돌려야 폰에 반영된다 (자동 배포 아님).

## 실시간 서버 배포 (Render)

`server/`를 [Render](https://render.com)에 무료 Web Service로 올려서 아무나 접속할 수 있는 공개 서버로
만들었다: **https://pixel-meet-server.onrender.com** — `app/.env`의 `EXPO_PUBLIC_SERVER_URL`이 이걸
가리키고 있고, 위 EAS Update 링크로 열면 이 서버에 자동으로 붙는다.

- **코드**: GitHub 공개 저장소 [`dongjoonyang/pixel-meet`](https://github.com/dongjoonyang/pixel-meet)를
  Render가 보고 있다 (`autoDeploy: yes`, rootDir `server/`) — `main`에 푸시하면 자동 재배포된다.
- **왜 Render인가**: Fly.io는 신규 가입에 카드 등록이 필수로 바뀌었고, Koyeb은 무료 티어 신규 가입이
  막힌 상태라(2026년 기준) 카드 없이 되는 선택지가 Render뿐이었다.
- **무료 티어의 트레이드오프**: 15분 동안 아무 요청이 없으면 서버가 잠들고, 다음 요청이 오면
  20~30초 뒤에 깨어난다. 그래서:
  - 클라이언트의 최초 연결 타임아웃을 25초로 늘려뒀다(`tryConnect`) — 짧게 잡으면 서버가 깨어나기도
    전에 로컬 모드로 폴백해버린다.
  - 연결이 끊기면 소켓이 자동 재연결을 시도하고, 재연결될 때마다 다시 `join`을 보내 방에 복귀한다.
  - 대화 중간에 서버가 잠들 일은 없다(활성 연결이 있으면 "무활동"이 아님) — 잠드는 건 정말 아무도
    안 쓸 때뿐.
- **검증한 것**: 배포 직후 실제 공개 URL로 두 클라이언트를 붙여서 좌석 동석 → 세션 생성 → 양방향
  채팅까지 실제로 확인함 (로컬 스모크 테스트와 동일한 시나리오, `프로덕션 URL` 기준).

Render 서비스를 새로 만들려면(다른 계정으로 옮기는 경우):
```bash
# Render 대시보드에서 New > Web Service > 이 GitHub 저장소 선택
# Root Directory: server
# Build Command: npm install
# Start Command: npm start
# Plan: Free
```

## 아직 없는 것

- **소셜/이메일 로그인**: 지금은 기기당 익명 계정 하나뿐이라 "같은 사람이 다른 기기로 로그인"은 안 된다.
  위에 적은 대로 나중에 링크만 추가하면 되는 구조로 짜뒀다.
- **채팅 내역 서버 저장**: 대화 메시지는 여전히 소켓 세션이 끝나면 사라진다. 필요해지면 `messages`
  테이블을 추가해서 세션 종료 시점에 socket.io 서버가 Supabase로 적재하는 식으로 붙이면 된다.
- 신고/차단, 이미지 전송
- 서버가 맵을 두 벌(app TS / server JS) 유지하는 구조 — 맵을 바꾸면 두 곳 다 고쳐야 함 (모노레포 공유 패키지로
  분리하면 해결되지만 MVP 범위를 넘어서 미룸)
- **진짜 사람 둘이 실기기 두 대로 붙어보는 필드 테스트**: 실기기 1대(iOS, Expo Go) + 공개 서버는
  확인했지만, 검증은 여전히 스크립트로 만든 소켓 클라이언트 두 개로 했다 — 사람 두 명이 동시에
  들어가서 서로 발견하고 대화하는 것까지는 아직 실사용으로 안 해봤다.
