export interface DrawRect { x: number; y: number; width: number; height: number; }

function centeredRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, mode: 'contain' | 'cover'): DrawRect {
  const scale = mode === 'contain'
    ? Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

export function getFitGeometry(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const contain = centeredRect(sourceWidth, sourceHeight, targetWidth, targetHeight, 'contain');
  const cover = centeredRect(sourceWidth, sourceHeight, targetWidth, targetHeight, 'cover');
  return {
    x: Math.round(contain.x),
    y: Math.round(contain.y),
    width: Math.round(contain.width),
    height: Math.round(contain.height),
    cover: {
      x: Math.round(cover.x),
      y: Math.round(cover.y),
      width: Math.round(cover.width),
      height: Math.round(cover.height),
    },
  };
}
