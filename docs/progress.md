# progress.md — writer / reviewer 서브에이전트 체인 실습 기록

- 작성일: 2026-08-04
- 브랜치: `feature/debounce`
- 목표: writer 에이전트로 `utils.ts`에 `debounce`를 추가하고, reviewer 에이전트 검토를 거쳐 `npm test`로 동작을 확인한다.

---

## 최종 테스트 결과

`npm test` (= `node --test`, Node v24.11.1) — **7/7 통과, 실패 0**

```
✔ wait 시간이 지나기 전에는 원본 함수를 호출하지 않는다
✔ wait 시간이 지나면 원본 함수를 정확히 한 번 호출한다
✔ 연속 호출하면 타이머가 리셋되어 마지막 호출 기준으로 한 번만 실행된다
✔ 실행 이후 다시 호출하면 새로운 debounce 주기가 시작된다
✔ cancel()은 대기 중인 호출을 취소한다
✔ cancel() 이후에도 다시 호출하면 정상적으로 동작한다
✔ 대기 중인 호출이 없을 때 cancel()을 불러도 예외가 발생하지 않는다

tests 7 · pass 7 · fail 0 · duration_ms 120.09
```

---

## 진행 흐름

| 단계 | 담당 | 결과 |
|---|---|---|
| 1. 사전 정리 | 오케스트레이터 | 브랜치 생성, `package.json` + `src/utils.test.ts` 스캐폴딩 |
| 2. 구현 | writer | `src/utils.ts` 생성, 테스트 5/5 통과 |
| 3. 커밋 | 오케스트레이터 | `288d9ac` — reviewer가 워크트리에서 읽을 수 있도록 |
| 4. 1차 검토 | reviewer | **REQUEST CHANGES** (블로커 2건 + 지적 6건) |
| 5. 재작업 | writer | 6건 반영, 1건 범위 밖으로 제외 |
| 6. 커밋 | 오케스트레이터 | `08c46f4` |
| 7. 2차 검토 | reviewer | **LGTM** |
| 8. 검증 | 오케스트레이터 | `npm test` 7/7 통과 |

---

## 시작 전에 막혔던 두 가지

요청받은 흐름을 그대로 실행할 수 없어 먼저 결정이 필요했다.

**1. 대상이 없었다.** 저장소에 `README.md`와 `.claude/`뿐이었다. `utils.ts`도, `package.json`도, 테스트 러너도 없어서 `npm test`가 실행될 대상 자체가 없는 상태였다.
→ 의존성 설치 없이 Node 24 내장 test runner + type stripping으로 최소 구성. `node:test`의 `mock.timers`를 쓰면 debounce의 지연 동작을 실시간 대기 없이 검증할 수 있다.

**2. reviewer가 변경을 볼 수 없었다.** `.claude/agents/reviewer.md`에 `isolation: worktree`가 걸려 있다. 워크트리는 HEAD 기준으로 만들어지므로 **커밋되지 않은 변경은 보이지 않는다.**
→ writer 작업을 먼저 커밋하고 리뷰. 실제 PR 리뷰 흐름과 동일하고, 에이전트 정의 파일을 건드리지 않아도 된다.

> 실습 관점에서 이번 회차의 핵심 교훈. `isolation: worktree`는 격리만 주는 게 아니라 **에이전트가 볼 수 있는 시점을 HEAD로 고정**한다. 리뷰어 계열 에이전트에 이 옵션을 걸면 커밋이 리뷰의 선행 조건이 된다.

---

## reviewer 1차 검토 (REQUEST CHANGES)

블로커 2건:

- **`never[]` 제네릭 제약이 인라인 콜백을 망가뜨림.** `T extends (...args: never[]) => unknown`으로 두면 `debounce((event) => {...}, 100)`에서 `event`가 제약으로부터 contextual typing되어 `never`가 되고, `Parameters<T>`가 `[event: never]`가 되어 **호출부가 타입 에러**가 난다. 관용적으로 쓰이는 표기지만 유틸 함수에서는 사용성 결함.
- **`cancel()` 이후 재사용이 테스트로 고정되지 않음.** 당시 테스트는 "대기 중 호출이 폐기된다"만 검증해서, `cancelled = true` 플래그로 함수를 **영구히 무력화**하는 잘못된 구현도 전부 통과했다.

그 외: 대기 타이머 없을 때의 `cancel()` 미검증, `this` 미전달 한계 미문서화, `engines` 필드 부재, "새 주기" 테스트의 조기 실행 미확인.

## 반영 내용 (writer 재작업)

1. 제네릭을 위치 기반 튜플 추론으로 교체 — `debounce<A extends unknown[]>(fn: (...args: A) => unknown, wait: number): DebouncedFunction<A>`. `Parameters<T>` 의존이 사라졌다.
2. `cancel()` 이후 재사용 테스트 추가
3. 대기 타이머 없을 때 `cancel()` no-op 테스트 추가 (미호출 상태 / 실행 완료 상태 둘 다)
4. "새 주기" 테스트에 `tick(99)` 시점 중간 단언 추가
5. `this` 미전달 한계를 JSDoc에 명시 (동작은 유지)
6. `package.json`에 `"engines": { "node": ">=24" }` 추가

writer가 스크래치 사본에 `cancelled = true` 뮤턴트를 심어 새 테스트가 실제로 잡아내는지 확인했다(뮤턴트 kill 확인).

---

## 범위 밖으로 뺀 것

- **`wait` 인자 검증 (NaN / 음수).** 합의된 계약에 없어서 오케스트레이터 판단으로 제외했다. `setTimeout`이 NaN·음수를 0으로 취급하므로 trailing-edge 의도가 조용히 무너질 수 있다는 점은 인지하고 있다.
- **`this` 바인딩 전달.** lodash와 동작이 다른 지점이지만 계약 밖이라 문서화만 했다.
- **타이머 `unref()` 노출.** 대기 중인 타이머가 Node 이벤트 루프를 붙잡아 프로세스 종료를 지연시킨다. 장기 실행 프로세스에서 쓸 때 고려할 사항.

---

## 남은 리스크

**이 프로젝트에는 타입 체커가 없다.** `node --test`는 타입을 검사 없이 **제거만** 하므로, 타입 에러가 있어도 여기서는 영원히 드러나지 않고 이 모듈을 import하는 체크된 프로젝트에서만 터진다. 지금은 reviewer의 판단이 타입 건전성에 대한 유일한 검증이다.

reviewer는 수정 후 시그니처에 대해 "`args: A`를 `(...args: A)`에 스프레드하는 구조적 동일 타입 매칭이라 지연 conditional type이 개입할 여지가 없다"고 판단했다. 다만 이는 컴파일러 검증이 아니다.

→ 후속 작업 후보: `typescript`를 devDependency로 추가하고 `tsc --noEmit` 게이트를 두는 것. 무의존성 제약을 깨는 결정이라 별도 판단이 필요하다.

---

## 커밋

- `288d9ac` ✨ feat: add debounce utility with node:test harness
- `08c46f4` ♻️ refactor: infer debounce arg tuple positionally and close test gaps
