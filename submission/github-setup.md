# GitHub 공개 저장소 준비

팀: 현재 / 팀원 2명. 제출 앱: MatchProof. 사용자가 지정한 GitHub 계정: [pegeaether](https://github.com/pegeaether). 팀원은 [mjlee5929](https://github.com/mjlee5929)다. 요청한 구성은 조직 표시 이름 **현재**, URL 식별자 **hyunjae**, 공개 저장소 이름 **MatchProof**다.

## 현재 상태

2026-09-26 `gh api user`로 이 기기의 GitHub CLI가 **pegeaether**로 인증된 것을 확인했다. `mjlee5929` 공개 계정도 확인했다. 계정 전환은 완료됐으며, 현재 계정에서 조회되는 조직은 없다. 요청한 `hyunjae`는 `gh api users/hyunjae`에서 기존 개인 계정 [Hyunjae](https://github.com/Hyunjae)로 조회됐다. 따라서 해당 주소로 새 조직을 만들 수 없어 대체 식별자를 확인 중이다. `team-hyunjae`와 `hyunjae-team`은 공개 계정 조회에서 404를 반환했다. 이는 최종 사용 가능 여부를 보장하지 않으므로 선택 후 GitHub 생성 화면에서 확인한다. 원격 저장소·조직 생성과 push는 아직 수행하지 않았다.

로컬 저장소는 `~/devel/ai/MatchProof`, 기본 브랜치는 `main`이다. 두 계정은 README와 제출 설명의 팀원 목록에 반영했다. 팀원 초대와 권한 부여는 아직 수행하지 않았다. Git 작성자는 이 저장소에만 `pegeaether <248258133+pegeaether@users.noreply.github.com>`으로 설정했다. 전역 설정은 유지했고 다른 사람 명의의 커밋은 만들지 않는다.

## 계정 연결과 조직

```sh
gh auth login --hostname github.com --web
gh api user --jq .login
```

계정 변경이 다시 필요한 경우에만 위 명령으로 로그인하고 출력이 `pegeaether`인지 확인한다. 현재 전환은 완료됐다. 기존 계정의 자격 증명을 채팅에 붙여 넣지 않는다. 사용자가 다른 계정의 실제 조직 소유 권한으로 진행하려면 그 사실을 먼저 확인한다.

[GitHub 공식 조직 생성 안내](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/creating-a-new-organization-from-scratch)에 따라 개인 계정의 Settings → Organizations → New organization에서 조직을 만든다. 표시 이름 현재와 URL 식별자를 구분하고, 무료 플랜을 기준으로 준비한다. 개인 계정을 조직으로 변환하지 않는다. 조직 약관·청구 정보가 필요한 단계는 사용자가 확인한다.

## 공개 직전 점검

- `.gitignore`가 `node_modules`, `dist`, `.tools`, `artifacts`, 비공개 상태, 증명 키와 로컬 주소 파일을 제외하는지 확인.
- `infra/standalone.env.example`은 공개 개발용 예시이므로 포함.
- `submission/evidence/`에는 공개 거래·검증 메타데이터만 포함.
- README와 제출 폼의 팀명·팀원·네트워크·테스트 지갑 설명 일치.
- 팀원 계정 확인 완료: `pegeaether`, `mjlee5929`. 허락 없이 다른 사람 이름으로 커밋하지 않음.
- 공개 저장소의 라이선스 표기를 확인하고 외부 코드의 기존 라이선스·출처를 유지.
- Git 작성자는 로컬 저장소 범위에서 설정하고 전역 설정은 바꾸지 않음.

계정 확인은 완료됐다. 사용 가능한 조직 식별자 확정 후 표시 이름을 `현재`로 설정하고 `MatchProof` 공개 저장소를 만들어 remote를 연결한다. 아직 존재하지 않는 저장소 URL을 제출 자료에 완료 링크로 기재하지 않는다.
