/**
 * debounce로 감싼 함수의 타입.
 * 원본 함수의 인자 튜플 A를 그대로 받으며, 대기 중인 호출을 취소하는 cancel()을 추가로 제공한다.
 */
export interface DebouncedFunction<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
}

/**
 * 마지막 호출로부터 wait(ms)가 지난 뒤에 fn을 한 번만 실행한다(trailing edge).
 *
 * 제약: 래퍼가 화살표 함수라서 호출 시점의 `this`는 fn으로 전달되지 않는다.
 * lodash의 debounce와 달리 메서드를 감싸 `obj.method()` 형태로 호출하면
 * fn 내부의 `this`는 obj가 아니다. 계약 범위 밖이므로 의도적으로 이렇게 둔다.
 *
 * @param fn 지연 실행할 원본 함수
 * @param wait 대기 시간(밀리초)
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
): DebouncedFunction<A> {
  // 대기 중인 타이머 핸들. 없으면 undefined.
  // 브라우저/Node 어느 쪽이든 동작하도록 setTimeout의 반환 타입을 그대로 사용한다.
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: A): void => {
    // 이전 예약이 남아 있으면 취소하고 타이머를 다시 시작한다.
    // 덕분에 연속 호출 시 마지막 인자로 단 한 번만 실행된다.
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      // 실행 직전에 핸들을 비워, 이후 호출이 새로운 debounce 주기를 시작하도록 한다.
      timer = undefined;
      fn(...args);
    }, wait);
  };

  // 아직 실행되지 않은 예약을 폐기한다. 호출 후에는 fn이 실행되지 않는다.
  debounced.cancel = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return debounced;
}
