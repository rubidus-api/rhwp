/**
 * 표시 언어 바꾸기 — 선택을 저장하고 새로 실행해 적용한다.
 *
 * 언어는 모듈을 읽을 때 한 번 정해지고 실행 중에는 바뀌지 않는다("다음 실행부터 적용", #5852).
 * 메뉴에서 고른 뒤 아무 변화가 없으면 화면 언어를 읽지 못하는 사용자에게는 고장으로 보이므로,
 * 저장한 뒤 곧바로 새로 실행(새로고침)한다. 새로 실행하는 것이라 화면 일부만 옛 언어로 남는 일이 없다.
 *
 * DOM·브라우저에 직접 닿지 않도록 필요한 동작을 모두 주입받는다(단위 테스트 가능).
 */
import { isSupportedLocale, type Locale } from './core.ts';
import { LOCALE_QUERY_PARAM } from './resolve.ts';

export type LocaleSwitchResult = 'unchanged' | 'cancelled' | 'reloading';

export interface LocaleSwitchDeps {
  /** 지금 화면에 적용된 로케일 */
  currentLocale: Locale;
  /** 저장하지 않은 변경이 있으면 사용자에게 묻는다. 계속해도 되면 true(저장했거나 버리기로 함). */
  confirmUnsavedChanges: () => Promise<boolean>;
  /** 다음 실행에 쓸 로케일을 저장한다 */
  storePreference: (locale: Locale) => void;
  /** 버리기로 한 변경 때문에 브라우저 기본 이탈 확인창이 한 번 더 뜨지 않게 한다 */
  markClean: () => void;
  /** 지금 주소 */
  currentHref: string;
  /** 주소를 바꿔 새로 실행한다 */
  navigate: (href: string) => void;
}

/**
 * 새로 실행할 주소. `?lang=` 은 저장된 선택보다 앞서므로(링크로 특정 언어를 보여 주는 용도),
 * 주소에 있으면 고른 언어로 바꾼다. 없으면 주소를 그대로 둔다 — 저장된 선택으로 충분하다.
 */
export function localeSwitchHref(href: string, locale: Locale): string {
  const url = new URL(href);
  if (url.searchParams.has(LOCALE_QUERY_PARAM)) {
    url.searchParams.set(LOCALE_QUERY_PARAM, locale);
  }
  return url.toString();
}

export async function switchDisplayLocale(target: string, deps: LocaleSwitchDeps): Promise<LocaleSwitchResult> {
  if (!isSupportedLocale(target) || target === deps.currentLocale) return 'unchanged';
  // 묻기 전에 저장하면, 취소했는데도 다음 실행에서 언어가 바뀐다.
  if (!(await deps.confirmUnsavedChanges())) return 'cancelled';
  deps.storePreference(target);
  deps.markClean();
  deps.navigate(localeSwitchHref(deps.currentHref, target));
  return 'reloading';
}
