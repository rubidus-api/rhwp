/**
 * 정적 마크업 적용 — `data-i18n*` 속성이 붙은 요소를 현재 로케일로 갱신한다.
 *
 * 원문 텍스트는 마크업에 그대로 남겨 둔다. 스크립트가 로드되기 전 첫 페인트에도
 * 한국어가 정상으로 보여야 하기 때문이다(무회귀의 일부).
 */

import { getEffectiveLocale, t } from './core.ts';

/** 텍스트 내용을 바꾸는 속성. */
const TEXT_ATTR = 'data-i18n';

/** `<br>` 로 나뉜 여러 줄 라벨을 바꾸는 속성. 값의 줄바꿈이 `<br>` 이 된다. */
const LINES_ATTR = 'data-i18n-lines';

/** 속성값을 바꾸는 속성 목록: `data-i18n-title` → `title`. */
const ATTR_TARGETS = ['title', 'placeholder', 'aria-label', 'value'] as const;

const SELECTOR = [TEXT_ATTR, LINES_ATTR, ...ATTR_TARGETS.map((name) => `${TEXT_ATTR}-${name}`)]
  .map((name) => `[${name}]`)
  .join(',');

/**
 * 주어진 뿌리 아래의 표시 문자열을 현재 로케일로 갱신한다.
 * 로케일이 바뀔 때마다 다시 부를 수 있다(멱등).
 */
export function applyI18nToDom(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>(SELECTOR)) {
    applyI18nToElement(el);
  }
  syncDocumentLang();
}

/** 요소 하나를 갱신한다. 동적으로 만든 요소에 쓴다. */
export function applyI18nToElement(el: HTMLElement): void {
  const textKey = el.getAttribute(TEXT_ATTR);
  if (textKey) setOwnText(el, t(textKey));

  const linesKey = el.getAttribute(LINES_ATTR);
  if (linesKey) setLines(el, t(linesKey));

  for (const name of ATTR_TARGETS) {
    const key = el.getAttribute(`${TEXT_ATTR}-${name}`);
    if (key) el.setAttribute(name, t(key));
  }
}

/**
 * 요소가 **직접** 가진 텍스트만 바꾼다.
 *
 * `textContent` 로 덮으면 아이콘 span 이나 단축키 표시 같은 자식 요소가 사라진다.
 * 자식이 있으면 첫 번째 의미 있는 텍스트 노드만 갈아 끼우고 나머지 직계 텍스트는 비운다.
 */
function setOwnText(el: HTMLElement, value: string): void {
  const TEXT_NODE = 3;
  const texts: Text[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === TEXT_NODE) texts.push(node as Text);
  }
  const meaningful = texts.filter((node) => (node.nodeValue ?? '').trim() !== '');
  if (meaningful.length === 0) {
    el.textContent = value;
    return;
  }
  meaningful[0].nodeValue = value;
  for (const extra of meaningful.slice(1)) extra.nodeValue = '';
}

/** 줄바꿈이 든 값을 텍스트 노드와 `<br>` 로 재구성한다. innerHTML 을 쓰지 않는다. */
function setLines(el: HTMLElement, value: string): void {
  const lines = value.split('\n');
  el.textContent = '';
  lines.forEach((line, index) => {
    if (index > 0) el.appendChild(el.ownerDocument.createElement('br'));
    el.appendChild(el.ownerDocument.createTextNode(line));
  });
}

/**
 * `<html lang>` 을 화면에 실제로 나타나는 언어에 맞춘다.
 * 접근성 도구와 글꼴 선택이 이 값을 믿으므로, 번역이 없는 로케일을 적지 않는다.
 */
export function syncDocumentLang(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = getEffectiveLocale();
}
