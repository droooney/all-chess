export function isMobileDevice(): boolean {
  return window.innerWidth <= 500;
}

export function getScrollSize(): number {
  const div = document.createElement('div');

  div.style.cssText = `
    width: 50px;
    height: 50px;
    overflow-y: scroll;
    visibility: hidden;
  `;

  document.body.appendChild(div);

  const scrollWidth = div.offsetWidth - div.clientWidth;

  div.remove();

  return scrollWidth;
}
