import test from 'node:test';
import assert from 'node:assert/strict';

import { LOCALE_NATIVE_NAMES, SUPPORTED_LOCALES, type Locale } from '../src/i18n/index.ts';
import { localeSwitchHref, switchDisplayLocale, type LocaleSwitchDeps } from '../src/i18n/locale-switch.ts';

// 표시 언어 메뉴의 계약 (#5852): 고르면 저장하고 새로 실행해 적용한다.
// 저장하지 않은 변경은 기존 보호 흐름을 먼저 거치고, 취소하면 아무것도 바뀌지 않는다.

function harness(overrides: Partial<LocaleSwitchDeps> = {}) {
  const calls: string[] = [];
  const deps: LocaleSwitchDeps = {
    currentLocale: 'ko',
    confirmUnsavedChanges: async () => { calls.push('confirm'); return true; },
    storePreference: (locale: Locale) => { calls.push(`store:${locale}`); },
    markClean: () => { calls.push('clean'); },
    currentHref: 'https://example.test/rhwp/',
    navigate: (href: string) => { calls.push(`navigate:${href}`); },
    ...overrides,
  };
  return { deps, calls };
}

test('다른 언어를 고르면 확인 → 저장 → 이탈 확인 해제 → 새로 실행 순서로 진행한다', async () => {
  const { deps, calls } = harness();
  assert.equal(await switchDisplayLocale('en', deps), 'reloading');
  assert.deepEqual(calls, ['confirm', 'store:en', 'clean', 'navigate:https://example.test/rhwp/']);
});

test('저장 확인에서 취소하면 선택을 저장하지도, 새로 실행하지도 않는다', async () => {
  const { deps, calls } = harness({ confirmUnsavedChanges: async () => false });
  assert.equal(await switchDisplayLocale('en', deps), 'cancelled');
  assert.deepEqual(calls, []);
});

test('지금 언어나 지원하지 않는 값을 고르면 아무 일도 하지 않는다', async () => {
  const { deps, calls } = harness();
  assert.equal(await switchDisplayLocale('ko', deps), 'unchanged');
  assert.equal(await switchDisplayLocale('xx', deps), 'unchanged');
  assert.deepEqual(calls, []);
});

test('주소에 ?lang= 이 있으면 고른 언어로 바꾼다 — 링크의 언어가 저장된 선택보다 앞서기 때문', () => {
  assert.equal(
    localeSwitchHref('https://example.test/?lang=en&file=a.hwp#page=2', 'ko'),
    'https://example.test/?lang=ko&file=a.hwp#page=2',
  );
});

test('주소에 ?lang= 이 없으면 주소를 바꾸지 않는다', () => {
  assert.equal(localeSwitchHref('https://example.test/?file=a.hwp', 'en'), 'https://example.test/?file=a.hwp');
});

test('메뉴에 보일 언어마다 그 언어 자신의 이름이 있다', () => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(LOCALE_NATIVE_NAMES[locale]?.trim(), `${locale} 이름이 없다`);
  }
  assert.equal(LOCALE_NATIVE_NAMES.ko, '한국어');
  assert.equal(LOCALE_NATIVE_NAMES.en, 'English');
});
