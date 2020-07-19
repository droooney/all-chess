import { BoardDimensions, GameCreateOptions, GameVariantEnum } from 'shared/types';

import GameCommonUtils from './GameCommonUtils';

interface VariantsInfo {
  is960: boolean;
  isAbsorption: boolean;
  isAliceChess: boolean;
  isAntichess: boolean;
  isAtomic: boolean;
  isCapablanca: boolean;
  isCirce: boolean;
  isCircularChess: boolean;
  isCompensationChess: boolean;
  isCrazyhouse: boolean;
  isCylinderChess: boolean;
  isDarkChess: boolean;
  isFrankfurt: boolean;
  isHexagonalChess: boolean;
  isHorde: boolean;
  isKingOfTheHill: boolean;
  isMadrasi: boolean;
  isPatrol: boolean;
  isRetreatChess: boolean;
  isThreeCheck: boolean;
  isTwoFamilies: boolean;
}

export default interface GameVariantsUtils extends VariantsInfo {

} // eslint-disable-line semi

export default class GameVariantsUtils extends GameCommonUtils {
  static getBoardDimensions(variants: readonly GameVariantEnum[]): BoardDimensions {
    const {
      isAliceChess,
      isCapablanca,
      isCircularChess,
      isHexagonalChess,
      isTwoFamilies,
    } = GameVariantsUtils.getVariantsInfo(variants);
    const dimensions: BoardDimensions = {
      boardCount: isAliceChess ? 2 : 1,
      boardWidth: isHexagonalChess
        ? 11
        : isTwoFamilies || isCapablanca
          ? 10
          : 8,
      boardHeight: isHexagonalChess
        ? 11
        : 8,
    };

    if (!isCircularChess) {
      return dimensions;
    }

    return {
      ...dimensions,
      boardWidth: dimensions.boardWidth / 2,
      boardHeight: dimensions.boardHeight * 2,
    };
  }

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
      isCompensationChess: variants.includes(GameVariantEnum.COMPENSATION_CHESS),
      isCrazyhouse: variants.includes(GameVariantEnum.CRAZYHOUSE),
      isCylinderChess: variants.includes(GameVariantEnum.CYLINDER_CHESS),
      isDarkChess: variants.includes(GameVariantEnum.DARK_CHESS),
      isFrankfurt: variants.includes(GameVariantEnum.FRANKFURT),
      isHexagonalChess: variants.includes(GameVariantEnum.HEXAGONAL_CHESS),
      isHorde: variants.includes(GameVariantEnum.HORDE),
      isKingOfTheHill: variants.includes(GameVariantEnum.KING_OF_THE_HILL),
      isMadrasi: variants.includes(GameVariantEnum.MADRASI),
      isPatrol: variants.includes(GameVariantEnum.PATROL),
      isRetreatChess: variants.includes(GameVariantEnum.RETREAT_CHESS),
      isThreeCheck: variants.includes(GameVariantEnum.THREE_CHECK),
      isTwoFamilies: variants.includes(GameVariantEnum.TWO_FAMILIES),
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
      isCirce,
      isCircularChess,
      isCompensationChess,
      isCrazyhouse,
      isCylinderChess,
      isDarkChess,
      isFrankfurt,
      isHexagonalChess,
      isHorde,
      isKingOfTheHill,
      isMadrasi,
      isPatrol,
      isThreeCheck,
      isTwoFamilies,
    } = GameVariantsUtils.getVariantsInfo(variants);

    return ((
      !isKingOfTheHill
      || isAntichess
      || !isDarkChess
    ) && (
      !isHexagonalChess
      || !is960
      || (
        !isTwoFamilies
        && !isCapablanca
        && !isKingOfTheHill
      )
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
        // TODO: add support for horde + compensation
        && !isCompensationChess
      )
    ) && (
      !isAtomic
      || (
        !isDarkChess
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
        && !isCompensationChess
        && !isAbsorption
      )
    ) && (
      !isAbsorption
      || (
        !isCrazyhouse
        && !isAtomic
        && !isCirce
        && !isMadrasi
        && !isFrankfurt
        && !isCompensationChess
      )
    ) && (
      !isFrankfurt
      || (
        // TODO: add support for frankfurt + crazyhouse
        !isCrazyhouse
        && !isAtomic
        && !isCirce
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
        && !isKingOfTheHill
        && !isHexagonalChess
      )
    ) && (
      !isHexagonalChess
      || (
        !isCylinderChess
        && !isCirce
      )
    ) && (
      !isCompensationChess
      || (
        !isCrazyhouse
        && !isDarkChess
      )
    ));
  }

  isLeftInCheckAllowed: boolean;
  isPocketUsed: boolean;
  is50MoveRuleUsed: boolean;

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
    this.is50MoveRuleUsed = !this.isCrazyhouse;
  }
}
