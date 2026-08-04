import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { debounce } from './utils.ts';

beforeEach(() => {
  // 실제 시간을 기다리지 않고 타이머를 수동으로 진행시키기 위해 가짜 타이머를 켠다
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  mock.timers.reset();
});

test('wait 시간이 지나기 전에는 원본 함수를 호출하지 않는다', () => {
  let calls = 0;
  const debounced = debounce(() => { calls += 1; }, 100);

  debounced();
  mock.timers.tick(99);

  assert.equal(calls, 0);
});

test('wait 시간이 지나면 원본 함수를 정확히 한 번 호출한다', () => {
  let calls = 0;
  const debounced = debounce(() => { calls += 1; }, 100);

  debounced();
  mock.timers.tick(100);

  assert.equal(calls, 1);
});

test('연속 호출하면 타이머가 리셋되어 마지막 호출 기준으로 한 번만 실행된다', () => {
  const received: number[] = [];
  const debounced = debounce((n: number) => { received.push(n); }, 100);

  debounced(1);
  mock.timers.tick(50);
  debounced(2);
  mock.timers.tick(50);
  debounced(3);
  mock.timers.tick(100);

  assert.deepEqual(received, [3]);
});

test('실행 이후 다시 호출하면 새로운 debounce 주기가 시작된다', () => {
  let calls = 0;
  const debounced = debounce(() => { calls += 1; }, 100);

  debounced();
  mock.timers.tick(100);
  debounced();
  // 두 번째 주기가 wait 이전에 먼저 터지지 않는지 확인한다
  mock.timers.tick(99);
  assert.equal(calls, 1);
  mock.timers.tick(1);

  assert.equal(calls, 2);
});

test('cancel()은 대기 중인 호출을 취소한다', () => {
  let calls = 0;
  const debounced = debounce(() => { calls += 1; }, 100);

  debounced();
  mock.timers.tick(50);
  debounced.cancel();
  mock.timers.tick(1000);

  assert.equal(calls, 0);
});

test('cancel() 이후에도 다시 호출하면 정상적으로 동작한다', () => {
  let calls = 0;
  const debounced = debounce(() => { calls += 1; }, 100);

  debounced();
  debounced.cancel();
  debounced();
  mock.timers.tick(100);

  // cancel()은 대기 중인 호출만 취소할 뿐, 함수를 영구히 비활성화하지 않는다
  assert.equal(calls, 1);
});

test('대기 중인 호출이 없을 때 cancel()을 불러도 예외가 발생하지 않는다', () => {
  let calls = 0;
  const debounced = debounce(() => { calls += 1; }, 100);

  // 한 번도 호출하지 않은 상태
  assert.doesNotThrow(() => { debounced.cancel(); });

  // 이미 실행이 끝난 뒤에도 마찬가지
  debounced();
  mock.timers.tick(100);
  assert.doesNotThrow(() => { debounced.cancel(); });

  assert.equal(calls, 1);
});
