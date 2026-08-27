/**
 * ko 카탈로그.
 *
 * 값 대응 표에서 만들어진 파일이지만, 여기서 값을 고쳐도 된다 — 키는 그대로 두고
 * 값만 바꾸면 화면에 그대로 반영된다. 키를 더하거나 지우는 일은 마크업의
 * data-i18n 표시·소스의 t() 호출과 함께 바꿔야 한다. 자세한 규칙은 ../README.md.
 */

const catalog = {
  "menu.file.label.x46b91c": "(최근 문서 없음)",
  "ui.sbMode.label": "삽입",
  "ui.sbMode.label.overwrite": "수정",
  "ui.sbSection.text": "구역: {p1} / {p2}",
  "ui.tbHfLabel.footer": "꼬리말",
  "ui.tbHfLabel.header": "머리말",
} as const;

export default catalog;
