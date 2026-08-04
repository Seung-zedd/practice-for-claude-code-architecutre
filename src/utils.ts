/**
 * debounce로 감싼 함수의 타입.
 * 원본 함수의 인자를 그대로 받으며, 대기 중인 호출을 취소하는 cancel()을 추가로 제공한다.
 */
export interface DebouncedFunction<T extends (...args: never[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

/**
 * 마지막 호출로부터 wait(ms)가 지난 뒤에 fn을 한 번만 실행한다(trailing edge).
 *
 * @param fn 지연 실행할 원본 함수
 * @param wait 대기 시간(밀리초)
 */
export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  wait: number,
): DebouncedFunction<T> {
  // 대기 중인 타이머 핸들. 없으면 undefined.
  // 브라우저/Node 어느 쪽이든 동작하도록 setTimeout의 반환 타입을 그대로 사용한다.
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Parameters<T>): void => {
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
