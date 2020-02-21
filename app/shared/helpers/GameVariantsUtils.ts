import GameCommonUtils from './GameCommonUtils';
import { GameCreateOptions, GameVariantEnum } from '../../types';

interface VariantsInfo {
  is960: boolean;
  isAbsorption: boolean;
  isAliceChess: boolean;
  isAntichess: boolean;
  isAtomic: boolean;
  isCapablanca: boolean;
  isCrazyhouse: boolean;
  isCirce: boolean;
  isCircularChess: boolean;
  isCylinderChess: boolean;
  isDarkChess: boolean;
  isFrankfurt: boolean;
  isHexagonalChess: boolean;
  isHorde: boolean;
  isKingOfTheHill: boolean;
  isMadrasi: boolean;
  isPatrol: boolean;
  isThreeCheck: boolean;
  isTwoFamilies: boolean;
}

export default interface GameVariantsUtils extends VariantsInfo {

} // eslint-disable-line semi

export default class GameVariantsUtils extends GameCommonUtils {
  static getVariantsInfo(variants: readonly GameVariantEnum[]): VariantsInfo {
    return {
      is960: variants.includes(GameVariantEnum.CHESS_960),
      isAbsorption: variants.includes(GameVariantEnum.ABSORPTION),
      isAliceChess: variants.includes(GameVariantEnum.ALICE_CHESS),
      isAntichess: variants.includes(GameVariantEnum.ANTICHESS),
      isAtomic: variants.includes(GameVariantEnum.ATOMIC),
      isCapablanca: variants.includes(GameVariantEnum.CAPABLANCA),
      isCirce: variants.includes(GameVariantEnum.CIRCE),
      isCircularChess: variants.includes(GameVariantEnum.CIRCULAR_CHESS),
      isCrazyhouse: variants.includes(GameVariantEnum.CRAZYHOUSE),
      isCylinderChess: variants.includes(GameVariantEnum.CYLINDER_CHESS),
      isDarkChess: variants.includes(GameVariantEnum.DARK_CHESS),
      isFrankfurt: variants.includes(GameVariantEnum.FRANKFURT),
      isHexagonalChess: variants.includes(GameVariantEnum.HEXAGONAL_CHESS),
      isHorde: variants.includes(GameVariantEnum.HORDE),
      isKingOfTheHill: variants.includes(GameVariantEnum.KING_OF_THE_HILL),
      isMadrasi: variants.includes(GameVariantEnum.MADRASI),
      isPatrol: variants.includes(GameVariantEnum.PATROL),
      isThreeCheck: variants.includes(GameVariantEnum.THREE_CHECK),
      isTwoFamilies: variants.includes(GameVariantEnum.TWO_FAMILIES)
    };
  }

  static validateVariants(variants: readonly GameVariantEnum[]): boolean {
    const {
      is960,
      isAbsorption,
      isAliceChess,
      isAntichess,
      isAtomic,
      isCapablanca,
      isCrazyhouse,
      isCirce,
      isCircularChess,
      isCylinderChess,
      isDarkChess,
      isFrankfurt,
      isHexagonalChess,
      isHorde,
      isKingOfTheHill,
      isMadrasi,
      isPatrol,
      isThreeCheck,
      isTwoFamilies
    } = GameVariantsUtils.getVariantsInfo(variants);

    return ((
      !isKingOfTheHill
      || isAntichess
      || !isDarkChess
    ) && (
      !isCirce
      || !is960
    ) && (
      !isHorde
      || (
        !isKingOfTheHill
        && !isCirce
        && !isPatrol
        && !isMadrasi
        && !isAliceChess
        && !isAtomic
        && !isCrazyhouse
        && !isDarkChess
        && !isAntichess
        && !isAbsorption
        && !isFrankfurt
        && !isThreeCheck
        // TODO: add support for horde + hex
        && !isHexagonalChess
      )
    ) && (
      !isAtomic
      || (
        !isDarkChess
        // TODO: add support for hex + atomic
        && !isHexagonalChess
        && !isAliceChess
        && !isCrazyhouse
      )
    ) && (
      !isAntichess
      || (
        !isCrazyhouse
        && !isCirce
        && !isPatrol
        && !isMadrasi
        && !isThreeCheck
      )
    ) && (
      !isAbsorption
      || (
        !isCrazyhouse
        && !isAtomic
        && !isCirce
        && !isMadrasi
        && !isFrankfurt
      )
    ) && (
      !isFrankfurt
      || (
        // TODO: add support for frankfurt + crazyhouse
        !isCrazyhouse
        && !isAtomic
      )
    ) && (
      !isTwoFamilies
      || (
        !isCapablanca
      )
    ) && (
      !isThreeCheck
      || (
        !isDarkChess
        && !isAtomic
      )
    ) && (
      !isCircularChess
      || (
        !isCylinderChess
        // TODO: add support for circular + circe
        && !isCirce
        && !isKingOfTheHill
        && !isHexagonalChess
      )
    ) && (
      !isHexagonalChess
      || (
        // TODO: add support for hex + 960
        !is960
        && !isCylinderChess
        // TODO: add support for hex + two families
        && !isTwoFamilies
        // TODO: add support for hex + capablanca
        && !isCapablanca
        && !isCirce
      )
    ));
  }

  isLeftInCheckAllowed: boolean;
  isPocketUsed: boolean;

  variants: readonly GameVariantEnum[];

  constructor(options: GameCreateOptions) {
    super();

    this.variants = options.variants;

    Object.assign(this, GameVariantsUtils.getVariantsInfo(this.variants));

    this.isPocketUsed = GameVariantsUtils.getIsPocketUsed(this.variants);
    this.isLeftInCheckAllowed = (
      this.isAtomic
      || this.isDarkChess
      || this.isAntichess
    );
  }
}
