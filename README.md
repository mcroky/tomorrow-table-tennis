# 내일은 탁구왕
3D 탁구 경기와 40개 거점 육성 캠페인. GitHub Pages 정적 사이트 + Supabase Auth / PostgreSQL 계정 저장.

## 공개 게임
- 사이트: https://mcroky.github.io/tomorrow-table-tennis/
- 소스: https://github.com/mcroky/tomorrow-table-tennis
- 메인 페이지: index.html (camera-study.html과 같은 게임)
- 로그인: 이메일 입력 없이 아이디 + 비밀번호. 아이디는 영문으로 시작하는 3~20자의 영문/숫자/밑줄, 대소문자 구분 없음.

## 개발 실행
Node.js로 정적 서버를 실행하거나 로컬 HTML을 열어 개발합니다. Supabase 설정이 존재하면 로그인 후 시작합니다.
설정이 비어 있는 localhost / file 개발 환경에서만 기존 로컬 모드를 사용할 수 있습니다.
GitHub Pages 환경은 로그인 설정이 없으면 게임을 시작하지 않습니다.

## 계정 구성
club-config.js에는 프로젝트 URL과 **공개용 publishable 키만** 들어갑니다.
비밀번호는 Supabase Auth가 검증하며 게임 DB나 소스에 저장하지 않습니다.
아이디는 내부적으로 `아이디@players.ttk.invalid` 형태의 Auth 식별자로 매핑됩니다. 실제 이메일을 요구하거나 발송하지 않습니다.
**출시 후 usernameDomain은 변경하지 마세요.** 변경하면 기존 아이디가 다른 Auth 식별자가 됩니다.
Supabase Auth의 Email provider는 사용하고, Confirm email은 꺼야 합니다.
프로젝트의 Allow new users to sign up을 켜고, 비밀번호 최소 길이는 10자 이상을 권장합니다.
Auth의 기본 가입·로그인 요청 제한을 사용합니다. 공개 운영량이 늘면 Supabase CAPTCHA를 추가할 수 있습니다.
이메일이 없으므로 이메일 기반 비밀번호 자동 복구는 제공하지 않습니다. 비밀번호 분실 시 운영자 지원이 필요합니다.

## 저장 DB
`supabase/migrations/`의 SQL을 파일명 순서대로 적용합니다.
- ttk_game_saves: 본인 UUID의 저장 데이터만 SELECT 가능(RLS).
- 직접 INSERT/UPDATE 권한은 제공하지 않습니다.
- ttk_save_progress RPC가 auth.uid()로 소유자를 결정하고 revision을 비교해 저장합니다.
- 다른 기기가 먼저 저장했다면 HTTP 409 충돌을 반환하고 이어갈 기록 선택을 요청합니다.
- 네트워크 오류 시 계정별 기기 기록을 보관하고 재접속 때 다시 저장합니다.
- 장비·강화·경험치·상금·별·진행 중 경기·분석을 한 저장 데이터로 관리합니다.
인증된 사용자가 실행하는 SECURITY DEFINER RPC는 의도된 쓰기 경로입니다. 고정 search_path, auth.uid(), 직접 쓰기 권한 차단으로 범위를 제한합니다. Supabase Advisor의 [해당 RPC 경고](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)는 이 설계를 표시합니다.
현재는 클라이언트에서 경기·보상을 계산하므로 온라인 경쟁용 부정행위 방지 서버는 구현하지 않았습니다.

## 기존 로컬 선수 이전
기존 기록이 있는 원래 브라우저의 camera-study.html에서 로그인한 다음 '기존 선수 가져오기'를 선택합니다.
'클라우드 저장됨' 표시를 확인한 후 Pages 사이트에서 같은 아이디로 로그인하면 이어서 플레이할 수 있습니다.
계정별 기록을 분리하며, 기존 로컬 기록은 자동 삭제하지 않습니다.

## GitHub Pages 배포
`node scripts/build-pages.cjs`로 dist/를 생성합니다.
배포 파일은 명시적 허용 목록으로 복사합니다. .artifacts, SQL, 예전 프로토타입, 개발 기록은 배포하지 않습니다.
GitHub 저장소 Settings → Pages에서 Source를 GitHub Actions로 설정합니다.
main 브랜치에 push하면 .github/workflows/pages.yml이 dist/만 배포합니다.
Supabase SDK 2.118.0은 vendor/에 고정해 외부 CDN 없이 로드합니다(MIT 라이선스 동봉).
공개 설정 키로 service_role / sb_secret_ 키를 사용하면 안 됩니다.

## 조작
WASD/방향키 이동, SPACE 스윙/내 서브 시작, Shift+SPACE 스매시.
J/K/L 코스, Z 드라이브/X 커트, C 짧은 서브/V 깊은 서브, 1~4 시점 전환.

## 현재 범위
1인 캠페인, AI 라이벌 재대결, 훈련 보상, 3성 도전, 상점·착장·장비 강화, 캐릭터 설정, 경기 분석.
온라인 PvP는 미구현입니다.

## 유저 랭킹
월드맵의 랭킹 버튼에서 상위 50명과 내 순위를 확인합니다.
클리어 거점 → 별 → 레벨 → 승리 수 순서이며 동일한 기록은 공동 순위입니다.
공개되는 정보는 선수 이름, 진행도, 별, 레벨과 승패 요약입니다. 이메일·로그인 아이디·장비·전체 저장 데이터는 랭킹 API에 포함하지 않습니다.
저장 트리거가 ttk_leaderboard 요약을 갱신하며, 클라이언트의 직접 랭킹 쓰기는 차단합니다.
기존 개발 확인 계정은 별도 제외 표시로 숨겼으며 실제 사용자 기록은 유지합니다.
현재 캠페인 기록은 클라이언트에서 계산하므로 이 랭킹은 캐주얼 진행도 비교용입니다. 공정한 경쟁용 보상/온라인 PvP에는 서버 경기 판정이 추가로 필요합니다.
DB 접근 정책은 [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), 자동 갱신은 [트리거](https://supabase.com/docs/guides/database/postgres/triggers)를 사용합니다.
운영 권고: Advisor의 [유출 비밀번호 차단](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)은 현재 비활성 상태입니다.

## 전설 장비와 등급별 외형
일반 → 고급 → 희귀 → 영웅 → 전설 순으로 배색 패널, 금속 테두리, 문장과 보석 장식이 늘어납니다.
전설 라인은 유니폼 12,500원, 밴드 8,500원, 신발 14,500원, 라켓 18,500원, 공 6,500원입니다.
전설 오라는 약 4.2초 주기로 부드럽게 맥동하며 경기와 구매 전 착장 미리보기에도 표시됩니다.
오라는 별도 소규모 렌더 패스로 표시하고, 미리보기의 고정 모델은 GPU 버퍼를 재사용합니다. 동작 줄이기 설정에서는 맥동을 멈춥니다.

## 터치 조작
스마트폰/태블릿에서는 왼쪽 가상 조이스틱으로 앞뒤·좌우·대각선 이동, 오른쪽 큰 버튼으로 스윙·스매시를 조작합니다. 내 서브도 스윙 버튼으로 시작합니다.
코스·구질·서브 길이·시점과 경기 시작/재개는 화면 버튼으로 선택합니다. 손가락을 떼거나 입력이 취소되면 이동을 해제합니다.
휴대폰 세로는 코트가 남은 세로 공간을 사용하고, 가로는 코스 설정과 터치 조작을 오른쪽에 배치합니다.
Chrome 터치 에뮬레이션에서 360×640, 390×844, 840×360, 844×390, 태블릿 768×1024, 1024×768 레이아웃과 동시 터치 입력을 확인했습니다. 실제 iOS/Android 기기 점검은 별도입니다.
