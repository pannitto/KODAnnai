// 画面上のタップ位置（clientX / clientY）を、地図SVGの座標（viewBox の単位）に直す。
// getScreenCTM() はブラウザ（特に Safari）や拡大・CSS の transform によってズレることがあるため、
// 実際に表示されている四角（getBoundingClientRect）から計算する。
// preserveAspectRatio は既定の "xMidYMid meet"（余白が出たら中央寄せ）を前提にしている。

export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
  const offsetX = (rect.width - vb.width * scale) / 2;
  const offsetY = (rect.height - vb.height * scale) / 2;
  return {
    x: vb.x + (clientX - rect.left - offsetX) / scale,
    y: vb.y + (clientY - rect.top - offsetY) / scale,
  };
}
