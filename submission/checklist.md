# 제출 체크리스트

자료 갱신: 2026-09-27. 공식 요건 확인: 2026-09-26. 제출 앱은 MatchProof. 팀 현재, 팀원 2명: pegeaether, mjlee5929.

## 공식 요건

[공식 허브](https://www.hackathon.midnightkorea.org/)의 화면에서 직접 확인했다. Luma의 ‘9월 27일’ 안내와 함께, 허브의 정확한 마감은 **2026-09-28 00:00 KST**이다. Local Devnet / Preview / Preprod가 허용되며 이 앱은 Local Devnet을 사용한다.

- [x] Luma 참가 등록 완료 (사용자 확인). 등록한 참가자만 제출 가능.
- [x] 팀원 GitHub 확인 및 표기: pegeaether, mjlee5929.
- [x] GitHub CLI가 pegeaether 계정으로 인증된 것을 확인.
- [x] 프로젝트명: MatchProof.
- [x] 한 줄 설명 초안: project-description.md.
- [x] GitHub 조직 생성 및 표시 이름 설정: [현재 / team-hyunjae](https://github.com/team-hyunjae).
- [x] 공개 GitHub 저장소 생성: [team-hyunjae/MatchProof](https://github.com/team-hyunjae/MatchProof).
- [x] main 브랜치 코드·README 업로드, 공개 API 및 인증 없는 clone 성공 확인.
- [x] 텍스트 실행 절차·데모 가이드 작성.
- [x] Midnight 활용 방식·신뢰 경계 설명 작성.
- [ ] 데모 영상 URL. 사용자 공유 제출 폼에서 YouTube·Loom 등과 3분 이내 권장 안내 확인. 최종 필수 여부는 폼 표시를 따름.
- [ ] 선택 사항: 보유한 Midnight Academy 수료증 가산점 자료. 수료 여부를 임의로 기재하지 않음.
- [ ] 제출 폼 최종 필드, 팀 연락처, 접수 확인.

심사 절차: 저장소 clone 및 컴파일 → 제출 설명과 README 일치 확인 → Midnight 활용 명료성 평가 → 데모 접근·검증. 공개 웹 호스팅이 필수라고 명시된 것은 확인하지 못했으므로, 우선 clone 가능한 개발 시연과 영상/실행 설명을 제공한다. localhost 링크만 외부 심사위원에게 보내서는 접속되지 않는다.

## 개발·검증

- [x] 역할별 화면·자격 발급·요청·ZK 증명·독립 조회 구현.
- [x] 기존 개발 체인 및 브라우저 성공 기록 보존: docs/matchproof-verification.md (9/21 실행).
- [x] 일반 브라우저에 테스트 지갑을 제공하는 명시적 `npm run demo` 실행 경로 추가.
- [x] 새 작업공간에서 npm ci, 자동 검사 38/38, Compact 전체 컴파일·증명 키 생성, 빌드 통과.
- [x] 새 작업공간의 demo 지갑 동기화·수수료 준비·Connector 4.0.1 응답·실제 MatchClient 연결 확인. 브라우저에 테스트 지갑 준비 표시 확인.
- [x] 새 계약의 CLI 통합 검사: 발급·심사 요청·증명 확정·독립 조회와 소득 미달·재사용·타인 파일 거절. 9/26 공개 거래 증거 보존.
- [x] 9/26 사용자 브라우저 시연 동작 확인. 같은 요청의 신청자 확정 메시지와 업체 조건 충족 표시 확인.
- [x] 9/26 새 배포의 브라우저 리허설: 발급·요청·증명 확정·지갑 없는 별도 브라우저 조회 확인. 촬영 계약 `7c8bf9a8…`, 성공 요청 `f2f55ca6…`.
- [x] 촬영에서 동의 전 버튼 비활성화, 소득 미달의 실제 제출 전 거절, 업체 승인 증가 없음, 만료 후 과거 승인 기록 보존 확인.
- [x] 재사용 거절은 앞선 CLI 통합 검사에서 확인. 이번 영상에는 재사용 시도가 포함되지 않음.
- [x] 공개 후보 파일만 복사한 빈 환경에서 설치·컴파일러 다운로드·전체 컴파일·38개 테스트·빌드 재현.
- [x] 공개 저장소의 새 clone에서 설치·컴파일러 다운로드·계약 컴파일·38개 테스트·빌드·doctor 재현. 근거: evidence/2026-09-26-public-clone.json.
- [ ] 다른 기기에서 개발 체인 기동과 시연 확인.
- [x] 테스트 지갑 자동 서명과 독립 물리 기기 검증 미완료를 한영 설명에 구분하여 표시.

## 언어와 발표 자료

앱은 한국어로 유지한다. 확인한 공개 [공식 안내](https://www.hackathon.midnightkorea.org/kor)와 [규정](https://docs.google.com/document/d/1sq-kMpWvKwbfZi8_T8z4TGK48XvVhaIAloZG46CZO6M/edit)에서는 영어 제출 의무를 찾지 못했다. 아래 번역은 심사 접근성을 위한 선택이며, 최종 제출 폼의 별도 조건은 아직 확인하지 않았다.

- [x] 영문 기본 README와 한국어 README의 언어 링크.
- [x] 한영 제출 설명과 한국어 버튼 이름을 병기한 영어 시연 가이드.
- [x] 13장면 한국어 녹음 대본과 실제 발화에 맞춘 영어 SRT 61개.
- [x] 한영 핵심 문장을 담은 11장 발표 자료와 발표자 노트 (전체 흐름 1장·단계별 그림 4장 포함).
- [x] Mac 화면 기록 방법·촬영 순서·재촬영 기준과 영상 편집용 그림 PNG 준비. [촬영 가이드](recording-guide.md).
- [x] 실제 개발 체인 시연 녹화와 4분 30초, 1920×1080 무음 편집본 제작·화면 검수. 영상은 로컬에서 보관.
- [x] 한국어 음성과 영어 자막을 결합한 4분 52초 상세 영상 보관.
- [x] 제출 폼의 3분 이내 권장에 맞춘 2분 57초 영상·영어 자막 41개 제작·검수. 목소리 1.08배, 대기 구간 편집 표시. [영상 파일 안내](video-delivery.md).
- [x] 사용자가 공유한 폼 항목 확인: Project Overview, Midnight Implementation, Google Slides Deck, Demo Video Link.
- [x] 발표 자료를 [Google Slides 11장](https://docs.google.com/presentation/d/1VJEq6m6tI9KfbuZDTHvcM2DCBi2k7dvJ2QQAED4eHsY/edit?usp=drivesdk)으로 변환하고 문구·배치 확인.
- [x] [제출 폼용 한국어 답변](form-answers.ko.md) 작성.
- [ ] Google Slides 심사위원 열람 권한 확인: 링크가 있는 모든 사용자 · 뷰어. 현재 브라우저 로그인 대기.
- [ ] 최종 영상 업로드·로그인 없는 재생 확인 및 제출 설명에 URL 반영.
- [ ] 최종 제출 폼에서 언어·분량·연락처 등 필수 항목 확인.

## 제출 순서

1. 기술 리허설과 남은 실패를 해결하고 범위를 동결한다.
2. 공개 저장소·README·실행 방법을 준비하고 팀원이 그대로 재현해 본다.
3. 제출 설명과 발표 대본에 실제 결과만 반영한다.
4. 선택 영상과 Academy 자료를 준비한다.
5. 제출 폼을 완성하고 접수 확인 화면/번호를 기록한다.

GitHub 연결 상태와 절차는 [GitHub 준비](github-setup.md)에 있다.

공개 조직·저장소 생성, 코드 업로드와 공개 clone 재현을 완료했다. 최종 제출은 아직 수행하지 않았으며 제출 완료로 표시하려면 접수 확인이 필요하다.
