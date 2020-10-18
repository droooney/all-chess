import {
  BoardDimensions,
  GameCreateOptions,
  GameVariantEnum,
  GameVariantType,
} from 'shared/types';

import GameCommonUtils from './GameCommonUtils';

interface VariantsInfo {
  is960: boolean;
  isAbsorption: boolean;
  isAliceChess: boolean;
  isAntichess: boolean;
  isAtomic: boolean;
  isBenedictChess: boolean;
  isCapablanca: boolean;
  isCirce: boolean;
  isCircularChess: boolean;
  isCompensationChess: boolean;
  isCrazyhouse: boolean;
  isCylinderChess: boolean;
  isDarkChess: boolean;
  isFrankfurt: boolean;
  isHexagonalChess: boolean;
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

  static getVariantType(variants: readonly GameVariantEnum[]): GameVariantType {
    return variants.length === 0
      ? 'standard'
      : variants.length === 1
        ? variants[0]
        : 'mixed';
  }

  static getVariantsInfo(variants: readonly GameVariantEnum[]): VariantsInfo {
    return {
      is960: variants.includes(GameVariantEnum.CHESS_960),
      isAbsorption: variants.includes(GameVariantEnum.ABSORPTION),
      isAliceChess: variants.includes(GameVariantEnum.ALICE_CHESS),
      isAntichess: variants.includes(GameVariantEnum.ANTICHESS),
      isAtomic: variants.includes(GameVariantEnum.ATOMIC),
      isBenedictChess: variants.includes(GameVariantEnum.BENEDICT_CHESS),
      isCapablanca: variants.includes(GameVariantEnum.CAPABLANCA),
      isCirce: variants.includes(GameVariantEnum.CIRCE),
      isCircularChess: variants.includes(GameVariantEnum.CIRCULAR_CHESS),
      isCompensationChess: variants.includes(GameVariantEnum.COMPENSATION_CHESS),
      isCrazyhouse: variants.includes(GameVariantEnum.CRAZYHOUSE),
      isCylinderChess: variants.includes(GameVariantEnum.CYLINDER_CHESS),
      isDarkChess: variants.includes(GameVariantEnum.DARK_CHESS),
      isFrankfurt: variants.includes(GameVariantEnum.FRANKFURT),
      isHexagonalChess: variants.includes(GameVariantEnum.HEXAGONAL_CHESS),
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
      isBenedictChess,
      isCapablanca,
      isCirce,
      isCircularChess,
      isCompensationChess,
      isCrazyhouse,
      isCylinderChess,
      isDarkChess,
      isFrankfurt,
      isHexagonalChess,
      isKingOfTheHill,
      isMadrasi,
      isPatrol,
      isThreeCheck,
      isTwoFamilies,
    } = GameVariantsUtils.getVariantsInfo(variants);

    return ((
      !isHexagonalChess
      || !is960
      || (
        !isTwoFamilies
        && !isCapablanca
        && !isKingOfTheHill
      )
    ) && (
      !isCirce
      || (
        !is960
        && !isBenedictChess
      )
    ) && (
      !isAtomic
      || (
        !isDarkChess
        && !isAliceChess
        && !isCrazyhouse
        && !isBenedictChess
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
        && !isBenedictChess
        && !isKingOfTheHill
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
        && !isBenedictChess
      )
    ) && (
      !isFrankfurt
      || (
        // TODO: add support for frankfurt + crazyhouse
        !isCrazyhouse
        && !isAtomic
        && !isCirce
        && !isBenedictChess
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
        && !isBenedictChess
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
        && !isBenedictChess
      )
    ) && (
      !isCompensationChess
      || (
        !isCrazyhouse
        && !isDarkChess
        && !isBenedictChess
      )
    ) && (
      !isBenedictChess
      || (
        !isCrazyhouse
        && !isKingOfTheHill
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
      || this.isBenedictChess
    );
    this.is50MoveRuleUsed = !this.isCrazyhouse;
  }

  getVariantType(): GameVariantType {
    return GameVariantsUtils.getVariantType(this.variants);
  }
}
