import { ColorEnum } from '../../types';

export function isLightColor(color: ColorEnum): boolean {
  return color === ColorEnum.WHITE;
}
