/**
 * 표시 언어 메뉴 — 메뉴 막대 오른쪽 끝의 작은 지구본 단추.
 *
 * 이 설정이 가장 필요한 사람은 지금 화면 언어를 읽지 못하는 사용자다(#5852). 그래서
 *  - 단추는 글자 대신 지구본과 현재 언어 코드(`KO`)만 보이고,
 *  - 목록은 각 언어를 그 언어 자신의 표기(`한국어`, `English`)로 보여 주며,
 *  - 툴팁·접근성 이름은 두 언어를 함께 적는다(번역하지 않는다).
 * 고른 뒤의 처리(저장 확인·새로 실행)는 onSelect 가 한다 — 이 모듈은 화면만 맡는다.
 */
import { LOCALE_NATIVE_NAMES, SUPPORTED_LOCALES, type Locale } from '@/i18n/index.ts';

/** 화면 언어와 상관없이 같은 이름 — 어느 쪽 사용자도 읽을 수 있게 두 언어로 적는다. */
export const LANGUAGE_MENU_LABEL = '표시 언어 / Display language';

export interface LanguageMenuOptions {
  currentLocale: Locale;
  onSelect: (locale: Locale) => void;
  /** 목록을 열기 직전에 부른다(열려 있는 다른 메뉴 닫기 등) */
  onOpen?: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function globeIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('menu-locale-icon');
  const shapes: Array<[string, Record<string, string>]> = [
    ['circle', { cx: '8', cy: '8', r: '6.25' }],
    ['ellipse', { cx: '8', cy: '8', rx: '2.75', ry: '6.25' }],
    ['path', { d: 'M1.75 8h12.5M2.6 4.75h10.8M2.6 11.25h10.8' }],
  ];
  for (const [tag, attrs] of shapes) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    svg.appendChild(el);
  }
  return svg;
}

export function createLanguageMenu(options: LanguageMenuOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = 'menu-locale';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'locale-menu-toggle';
  toggle.className = 'menu-locale-toggle';
  toggle.title = LANGUAGE_MENU_LABEL;
  toggle.setAttribute('aria-label', LANGUAGE_MENU_LABEL);
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'locale-menu-list');
  const code = document.createElement('span');
  code.className = 'menu-locale-code';
  code.textContent = options.currentLocale.toUpperCase();
  toggle.append(globeIcon(), code);

  const list = document.createElement('div');
  list.id = 'locale-menu-list';
  list.className = 'menu-locale-list';
  list.setAttribute('role', 'menu');
  list.setAttribute('aria-label', LANGUAGE_MENU_LABEL);
  list.hidden = true;

  const items = SUPPORTED_LOCALES.map((locale) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'menu-locale-item';
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute('aria-checked', String(locale === options.currentLocale));
    item.dataset.locale = locale;
    item.lang = locale;
    item.tabIndex = -1;
    item.textContent = LOCALE_NATIVE_NAMES[locale];
    item.addEventListener('click', () => {
      close(false);
      options.onSelect(locale);
    });
    list.appendChild(item);
    return item;
  });

  const isOpen = () => !list.hidden;

  function open(): void {
    options.onOpen?.();
    list.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    root.classList.add('open');
    (items.find((item) => item.getAttribute('aria-checked') === 'true') ?? items[0])?.focus();
  }

  function close(returnFocus: boolean): void {
    if (!isOpen()) return;
    list.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    root.classList.remove('open');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => (isOpen() ? close(true) : open()));
  toggle.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !isOpen()) {
      e.preventDefault();
      open();
    }
  });

  list.addEventListener('keydown', (e) => {
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (next: number) => {
      e.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(items.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab') close(false);
  });

  document.addEventListener('mousedown', (e) => {
    if (isOpen() && !root.contains(e.target as Node)) close(false);
  });

  root.append(toggle, list);
  return root;
}
