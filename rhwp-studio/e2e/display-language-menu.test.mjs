/**
 * E2E 테스트 — 표시 언어 메뉴 (#5852)
 *
 * 검증 항목:
 * 1. 메뉴 막대 오른쪽 끝(기본 도구 상자 접기 단추 앞)에 지구본 + 현재 언어 코드 단추가 있다
 * 2. 목록은 각 언어를 그 언어 자신의 표기로 보여 주고 현재 언어를 체크한다. 키보드로 열고 닫는다
 * 3. 다른 언어를 고르면 저장하고 새로 실행해 그 언어로 뜬다
 * 4. 주소에 ?lang= 이 있으면 고른 언어로 바뀌어 새로 실행된다(링크 언어가 저장값보다 앞선다)
 * 5. 저장하지 않은 변경이 있으면 저장 확인을 먼저 거친다 — 취소하면 아무것도 바뀌지 않고,
 *    버리기로 하면 브라우저 이탈 확인창 없이 새로 실행된다
 * 6. 여러 화면 폭·두 언어에서 단추가 메뉴 막대 안에 있고 메뉴 제목과 겹치지 않는다
 * 7. embed 프로파일에는 단추가 없다
 */

import { runTest, loadApp, assert, createPage } from './helpers.mjs';

process.env.VITE_URL = process.env.VITE_URL || 'http://localhost:7700';

const waitReady = (page) => page.waitForFunction(() => !!window.__wasm && !!window.__canvasView, { timeout: 60000 });

const readMenu = () => {
  const toggle = document.getElementById('locale-menu-toggle');
  const list = document.getElementById('locale-menu-list');
  return {
    exists: !!toggle,
    code: toggle?.querySelector('.menu-locale-code')?.textContent,
    label: toggle?.getAttribute('aria-label'),
    expanded: toggle?.getAttribute('aria-expanded'),
    listHidden: list?.hidden,
    items: [...(list?.querySelectorAll('[role="menuitemradio"]') ?? [])].map((item) => ({
      locale: item.dataset.locale,
      text: item.textContent,
      checked: item.getAttribute('aria-checked'),
      lang: item.lang,
    })),
    nextIsToolboxToggle: toggle?.parentElement?.nextElementSibling?.id === 'toolbox-basic-toggle',
    htmlLang: document.documentElement.lang,
    fileTitle: document.querySelector('[data-menu="file"] .menu-title')?.textContent?.trim(),
    stored: localStorage.getItem('rhwp-locale'),
    focusedLocale: document.activeElement?.dataset?.locale ?? null,
    focusedId: document.activeElement?.id ?? null,
  };
};

// 닫힌 대화상자도 DOM 에 남을 수 있으므로 보이는 저장 확인의 단추만 고른다.
const visibleFooterButtons = () => {
  const footer = [...document.querySelectorAll('.dialog-footer')].filter((el) => el.offsetParent !== null).pop();
  return footer ? [...footer.querySelectorAll('.dialog-btn:not(.dialog-btn-primary)')] : [];
};
const waitUnsavedDialog = (page) => page.waitForFunction(
  () => [...document.querySelectorAll('.dialog-footer')].some((el) => el.offsetParent !== null),
  { timeout: 5000 },
);

async function chooseLocale(page, locale) {
  await page.click('#locale-menu-toggle');
  await page.click(`#locale-menu-list [data-locale="${locale}"]`);
}

runTest('표시 언어 메뉴', async ({ page, browser }) => {
  const nativeDialogs = [];
  page.on('dialog', async (dialog) => {
    nativeDialogs.push(dialog.type());
    await dialog.dismiss();
  });

  // ── TC1·2: 기본(한국어) 상태의 단추와 목록 ─────────────────
  await page.evaluate(() => localStorage.removeItem('rhwp-locale'));
  await loadApp(page);
  const ko = await page.evaluate(readMenu);
  assert(ko.exists && ko.code === 'KO', `TC1: 지구본 단추가 현재 언어 코드 KO 를 보인다 (${ko.code})`);
  assert(ko.nextIsToolboxToggle, 'TC1: 단추는 기본 도구 상자 접기 단추 바로 앞에 있다');
  assert(ko.label === '표시 언어 / Display language', `TC1: 접근성 이름은 두 언어로 적는다 (${ko.label})`);
  assert(ko.listHidden === true && ko.expanded === 'false', 'TC2: 목록은 처음에 닫혀 있다');

  await page.focus('#locale-menu-toggle');
  await page.keyboard.press('ArrowDown');
  const opened = await page.evaluate(readMenu);
  assert(opened.listHidden === false && opened.expanded === 'true', 'TC2: ArrowDown 으로 목록이 열린다');
  assert(JSON.stringify(opened.items) === JSON.stringify([
    { locale: 'ko', text: '한국어', checked: 'true', lang: 'ko' },
    { locale: 'en', text: 'English', checked: 'false', lang: 'en' },
  ]), `TC2: 언어마다 자신의 표기로 보이고 현재 언어가 체크된다 (${JSON.stringify(opened.items)})`);
  assert(opened.focusedLocale === 'ko', `TC2: 열면 현재 언어에 초점이 간다 (${opened.focusedLocale})`);
  await page.keyboard.press('ArrowDown');
  assert((await page.evaluate(readMenu)).focusedLocale === 'en', 'TC2: ArrowDown 으로 다음 언어로 이동');
  await page.keyboard.press('Escape');
  const escaped = await page.evaluate(readMenu);
  assert(escaped.listHidden === true && escaped.focusedId === 'locale-menu-toggle',
    `TC2: Escape 로 닫히고 단추로 초점이 돌아온다 (${escaped.focusedId})`);

  // 다른 메뉴가 열려 있으면 언어 목록을 열 때 닫힌다
  await page.click('[data-menu="file"] .menu-title');
  await page.click('#locale-menu-toggle');
  const exclusive = await page.evaluate(() => ({
    fileOpen: document.querySelector('[data-menu="file"]').classList.contains('open'),
    listOpen: !document.getElementById('locale-menu-list').hidden,
  }));
  assert(!exclusive.fileOpen && exclusive.listOpen, `TC2: 언어 목록을 열면 열린 메뉴가 닫힌다 (${JSON.stringify(exclusive)})`);
  await page.mouse.click(640, 600);
  assert((await page.evaluate(readMenu)).listHidden === true, 'TC2: 바깥을 누르면 목록이 닫힌다');

  // ── TC3: 영어를 고르면 저장하고 새로 실행한다 ────────────────
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), chooseLocale(page, 'en')]);
  await waitReady(page);
  const en = await page.evaluate(readMenu);
  assert(en.htmlLang === 'en' && en.stored === 'en' && en.code === 'EN',
    `TC3: 새로 실행된 화면이 영어다 (lang=${en.htmlLang}, 저장=${en.stored}, 코드=${en.code})`);
  assert(en.fileTitle === 'File', `TC3: 메뉴가 영어로 보인다 (${en.fileTitle})`);
  assert(en.items.find((item) => item.locale === 'en')?.checked === 'true', 'TC3: 목록에서 English 가 체크된다');

  // ── TC4: ?lang= 링크에서 고르면 주소의 언어도 바뀐다 ─────────
  await loadApp(page, '/?lang=ko');
  const linked = await page.evaluate(readMenu);
  assert(linked.htmlLang === 'ko' && linked.stored === 'en', `TC4: 링크의 ?lang=ko 가 저장값(en)보다 앞선다 (${linked.htmlLang})`);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), chooseLocale(page, 'en')]);
  await waitReady(page);
  const relinked = await page.evaluate(() => ({ search: location.search, lang: document.documentElement.lang }));
  assert(relinked.search === '?lang=en' && relinked.lang === 'en', `TC4: 주소가 ?lang=en 으로 바뀌어 영어로 뜬다 (${relinked.search})`);

  // ── TC5: 저장하지 않은 변경이 있으면 먼저 묻는다 ─────────────
  await page.evaluate(() => localStorage.setItem('rhwp-locale', 'ko'));
  await loadApp(page);
  await page.evaluate(() => window.__eventBus?.emit('create-new-document'));
  await page.waitForFunction(() => (window.__wasm?.pageCount ?? 0) > 0, { timeout: 30000 });
  // 새 문서 준비가 끝나며 상태를 한 번 깨끗하게 되돌리므로, 그 뒤에 변경 표시를 하고 고르기 직전에 확인한다.
  const markDirty = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await page.evaluate(() => window.__documentState.markDirty('e2e-display-locale'));
    assert(await page.evaluate(() => window.__documentState.isDirty()), 'TC5: 저장하지 않은 변경이 있는 상태');
  };
  await markDirty();
  const hrefBefore = page.url();
  await chooseLocale(page, 'en');
  await waitUnsavedDialog(page);
  const buttons = await page.evaluate(`(${visibleFooterButtons})().length`);
  assert(buttons === 2, `TC5: 저장 확인이 뜬다 (저장 안 함·취소 단추 ${buttons}개)`);
  // 취소 — 선택도 저장하지 않고 새로 실행하지도 않는다
  await page.evaluate(`(${visibleFooterButtons})().pop().click()`);
  await new Promise((resolve) => setTimeout(resolve, 800));
  const cancelled = await page.evaluate(readMenu);
  assert(page.url() === hrefBefore && cancelled.htmlLang === 'ko' && cancelled.stored === 'ko',
    `TC5: 취소하면 언어·저장값·주소가 그대로다 (lang=${cancelled.htmlLang}, 저장=${cancelled.stored})`);
  // 저장 안 함 — 이탈 확인창 없이 새로 실행된다
  await markDirty();
  await chooseLocale(page, 'en');
  await waitUnsavedDialog(page);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.evaluate(`(${visibleFooterButtons})()[0].click()`),
  ]);
  await waitReady(page);
  const discarded = await page.evaluate(readMenu);
  assert(discarded.htmlLang === 'en' && discarded.stored === 'en', `TC5: 저장 안 함을 고르면 영어로 새로 실행된다 (${discarded.htmlLang})`);
  assert(nativeDialogs.length === 0, `TC5: 브라우저 이탈 확인창이 뜨지 않는다 (${nativeDialogs.join(',') || '없음'})`);

  // ── TC6: 화면 폭·언어별 배치 ────────────────────────────────
  for (const locale of ['ko', 'en']) {
    for (const width of [375, 479, 480, 517, 540, 559, 560, 599, 600, 808, 828, 1024, 1280]) {
      const narrow = await createPage(browser, width, 800);
      try {
        await loadApp(narrow, `/?lang=${locale}`);
        const layout = await narrow.evaluate(() => {
          const bar = document.getElementById('menu-bar').getBoundingClientRect();
          const button = document.getElementById('locale-menu-toggle').getBoundingClientRect();
          const toggle = document.getElementById('toolbox-basic-toggle').getBoundingClientRect();
          const titles = [...document.querySelectorAll('#menu-bar .menu-title')].map((t) => t.getBoundingClientRect())
            .filter((r) => r.right > bar.left && r.left < bar.right);
          const overlapsTitle = titles.some((r) => r.right > button.left + 0.5 && r.left < button.right - 0.5
            && document.elementFromPoint(button.left + button.width / 2, button.top + button.height / 2)?.closest('#locale-menu-toggle') === null);
          return {
            inside: button.left >= bar.left - 0.5 && button.right <= bar.right + 0.5 && button.width > 0,
            toggleInside: toggle.left >= bar.left - 0.5 && toggle.right <= bar.right + 0.5,
            toggleHit: !!document.elementFromPoint(toggle.left + toggle.width / 2, toggle.top + toggle.height / 2)?.closest('#toolbox-basic-toggle'),
            codeShown: getComputedStyle(document.querySelector('.menu-locale-code')).display !== 'none',
            beforeToggle: button.right <= toggle.left + 0.5,
            hit: !!document.elementFromPoint(button.left + button.width / 2, button.top + button.height / 2)?.closest('#locale-menu-toggle'),
            overlapsTitle,
          };
        });
        assert(layout.inside && layout.beforeToggle && layout.hit && !layout.overlapsTitle,
          `TC6: ${locale} ${width}px — 단추가 메뉴 막대 안, 접기 단추 앞에 있고 눌린다 (${JSON.stringify(layout)})`);
        assert(layout.toggleInside && layout.toggleHit,
          `TC6: ${locale} ${width}px — 기본 도구 상자 접기 단추도 메뉴 막대 안에서 눌린다`);
        assert(layout.codeShown === (width >= 600),
          `TC6: ${locale} ${width}px — 언어 코드는 600px 이상에서만 보인다 (${layout.codeShown})`);
        if (width === 375) {
          await narrow.click('#locale-menu-toggle');
          const listRect = await narrow.evaluate(() => {
            const r = document.getElementById('locale-menu-list').getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, innerWidth };
          });
          assert(listRect.width > 0 && listRect.left >= 0 && listRect.right <= listRect.innerWidth,
            `TC6: ${locale} 375px — 열린 목록이 화면 안에 있다 (${JSON.stringify(listRect)})`);
        }
      } finally {
        await narrow.close();
      }
    }
  }

  // ── TC7: embed 프로파일에는 없다 ───────────────────────────
  const embed = await createPage(browser, 1024, 700);
  try {
    await loadApp(embed, '/?chrome=embed');
    const hasButton = await embed.evaluate(() => !!document.getElementById('locale-menu-toggle'));
    assert(!hasButton, 'TC7: embed 프로파일에는 표시 언어 단추가 없다');
  } finally {
    await embed.close();
  }

  await page.evaluate(() => localStorage.removeItem('rhwp-locale'));
});
