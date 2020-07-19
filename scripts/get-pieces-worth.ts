// try to come up with an algorithm to calculate pieces worth automatically

import 'shared/plugins';

import {
  BoardPiece,
  CastlingTypeEnum,
  ColorEnum,
  GameVariantEnum,
  GetPossibleMovesMode,
  PieceLocationEnum,
  PieceTypeEnum,
  Square
} from '../app/shared/types';
import { Game } from 'shared/helpers';

const boardTypes = [
  'orthodox', 'orthodox-10x8',
  'circular', 'circular-10x8',
  'hexagonal'
];

const squareToString = (square: Square): string => `${square.board}-${square.y}-${square.x}`;

const squareFromString = (squareString: string): Square => {
  const [, boardString, yString, xString] = squareString.match(/^(\d+)-(\d+)-(\d+)$/)!;

  return {
    board: +boardString,
    y: +yString,
    x: +xString
  };
};

boardTypes.forEach((boardType) => {
  if (boardType !== 'orthodox') {
    // return;
  }

  console.log(boardType);
  console.time(boardType);

  const variants: GameVariantEnum[] = [
    ...(boardType.includes('circular') ? [GameVariantEnum.CIRCULAR_CHESS] : []),
    ...(boardType.includes('cylinder') ? [GameVariantEnum.CYLINDER_CHESS] : []),
    ...(boardType.includes('hexagonal') ? [GameVariantEnum.HEXAGONAL_CHESS] : []),
    ...(boardType.includes('10x8') ? [GameVariantEnum.CAPABLANCA] : [])
  ];

  Object.values(PieceTypeEnum).forEach((pieceType) => {
    if (pieceType === PieceTypeEnum.PAWN) {
      return;
    }

    if (pieceType !== PieceTypeEnum.AMAZON) {
      // return;
    }

    const game = new Game({
      id: '',
      startingData: {
        result: null,
        turn: ColorEnum.WHITE,
        startingMoveIndex: 0,
        pliesFor50MoveRule: 0,
        possibleCastling: {
          [ColorEnum.WHITE]: {
            [CastlingTypeEnum.KING_SIDE]: false,
            [CastlingTypeEnum.QUEEN_SIDE]: false
          },
          [ColorEnum.BLACK]: {
            [CastlingTypeEnum.KING_SIDE]: false,
            [CastlingTypeEnum.QUEEN_SIDE]: false
          }
        },
        possibleEnPassant: null,
        checksCount: {
          [ColorEnum.WHITE]: 0,
          [ColorEnum.BLACK]: 0
        },
        pieces: []
      },
      timeControl: null,
      variants
    });

    game.pieces = [{
      id: '',
      type: pieceType,
      color: ColorEnum.WHITE,
      location: null,
      moved: true,
      originalType: pieceType,
      abilities: null
    }];

    const piece = game.pieces[0] as BoardPiece;
    const squaresCount = game.isHexagonalChess
      ? 91
      : game.boardWidth * game.boardHeight;
    let sumPower = 0;
    let sumMobility = 0;
    let sumAccess = 0;

    for (let y = 0; y < game.boardHeight; y++) {
      for (let x = 0; x < game.boardWidth; x++) {
        const square: Square = { board: 0, x, y };

        if (
          !game.getCenterSquareParams(square)
          // || (game.isHexagonalChess && x === game.middleFileX && y === game.middleRankY)
        ) {
          continue;
        }

        const mobilityMap = new Map<string, number>([[squareToString(square), 0]]);
        let step = 0;
        let newSquares = true;

        while (newSquares) {
          newSquares = false;

          const stepSquares = [...mobilityMap]
            .filter(([_, steps]) => steps === step)
            .map(([square]) => squareFromString(square));

          stepSquares.forEach((square) => {
            game.changePieceLocation(piece, {
              type: PieceLocationEnum.BOARD,
              ...square
            });
            game.getPossibleMoves(piece, GetPossibleMovesMode.POSSIBLE).toArray().forEach((square) => {
              const squareString = squareToString(square);

              if (!mobilityMap.has(squareString)) {
                mobilityMap.set(squareString, step + 1);

                newSquares = true;
              }
            });
          });

          step++;
        }

        const possibleSquaresCount = mobilityMap.size - 1;

        sumPower += [...mobilityMap].filter(([_, steps]) => steps === 1).length;
        sumMobility += [...mobilityMap].reduce((sum, [_, steps]) => sum + steps, 0) / possibleSquaresCount;
        sumAccess += possibleSquaresCount / (squaresCount - 1);
      }
    }

    const centerSquaresCount = game.isHexagonalChess ? 7 : 4;

    sumPower /= centerSquaresCount;
    sumAccess /= centerSquaresCount;
    sumMobility /= centerSquaresCount;

    const pieceWorth = (
      0.5
      + 0.86
      * (sumPower * sumAccess) ** 0.8
      * sumMobility ** -0.7
    );

    console.log(`${pieceType}: ${pieceWorth}`);
  });

  console.timeEnd(boardType);
  console.log();
});
