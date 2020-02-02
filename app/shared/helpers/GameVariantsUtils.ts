import GameCommonUtils from './GameCommonUtils';
import { GameCreateOptions, GameVariantEnum } from '../../types';

interface VariantsInfo {
  is960: boolean;
  isAbsorption: boolean;
  isAliceChess: boolean;
  isAmazons: boolean;
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
  isMonsterChess: boolean;
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
      isAmazons: variants.includes(GameVariantEnum.AMAZONS),
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
      isMonsterChess: variants.includes(GameVariantEnum.MONSTER_CHESS),
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
      isAmazons,
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
      isMonsterChess,
      isPatrol,
      isThreeCheck,
      isTwoFamilies
    } = GameVariantsUtils.getVariantsInfo(variants);

    return ((
      !isKingOfTheHill
      || isAntichess
      || !isDarkChess
    ) && (
      !isAtomic
      || !isAliceChess
      || isCircularChess
    ) && (
      !isMonsterChess
      || (
        !isCrazyhouse
        && !isKingOfTheHill
        && !isAtomic
        && !isCirce
        && !isPatrol
        && !isMadrasi
        && !isAliceChess
        && !isHorde
        && !isDarkChess
        && !isAntichess
        && !isAbsorption
        && !isFrankfurt
        && !isCapablanca
        && !isAmazons
        && !isThreeCheck
        && !isCircularChess
        && !isHexagonalChess
      )
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
        && !isAmazons
        && !isThreeCheck
        // TODO: add support for horde + hex
        && !isHexagonalChess
      )
    ) && (
      !isAtomic
      || (
        !isDarkChess
        && !isAmazons
        // TODO: add support for hex + atomic
        && !isHexagonalChess
      )
    ) && (
      !isAntichess
      || (
        !isCrazyhouse
        && !isCirce
        && !isPatrol
        && !isMadrasi
        && !isAmazons
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
        && !isAmazons
      )
    ) && (
      !isFrankfurt
      || (
        // TODO: add support for frankfurt + crazyhouse
        !isCrazyhouse
        && !isAtomic
        && !isAmazons
      )
    ) && (
      !isTwoFamilies
      || (
        !isCapablanca
        && !isAmazons
      )
    ) && (
      !isAmazons
      || (
        !isCapablanca
        && !isKingOfTheHill
        && !isThreeCheck
        && !isCirce
        && !isCrazyhouse
        && !isPatrol
        && !isMadrasi
        && !isAliceChess
        && !isHexagonalChess
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
        // TODO: add support for hex + crazyhouse (pawns)
        && !isCrazyhouse
        && !isCylinderChess
        // TODO: add support for hex + koth
        && !isKingOfTheHill
        // TODO: add support for hex + two families
        && !isTwoFamilies
        // TODO: add support for hex + capablanca
        && !isCapablanca
        && !isCirce
        // TODO: add support for hex + frankfurt (promotion when capturing pawn)
        && !isFrankfurt
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
      || this.isMonsterChess
      || this.isDarkChess
      || this.isAntichess
    );
  }
}
