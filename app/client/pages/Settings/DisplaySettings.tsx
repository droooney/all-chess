import classNames from 'classnames';
import map from 'lodash/map';
import * as React from 'react';
import { connect } from 'react-redux';

import { SVG_SQUARE_SIZE } from 'client/constants';

import { SquareColorTheme } from 'client/types';

import { Game } from 'client/helpers';

import { changeSettings } from 'client/actions';
import { DispatchProps, ReduxState } from 'client/store';

import BoardSquare from 'client/components/Boards/BoardSquare';

type Props = DispatchProps & ReturnType<typeof mapStateToProps>;

const a = SVG_SQUARE_SIZE / 2 / Math.sqrt(3);

class DisplaySettings extends React.PureComponent<Props> {
  hexGame = Game.getGameFromPgn('[Variant "Hexagonal"]', '');
  standardGame = Game.getGameFromPgn('', '');

  onSquareColorThemeClick = (squareColorTheme: SquareColorTheme) => {
    const {
      dispatch,
      squareColorTheme: currentSquareColorTheme,
    } = this.props;

    if (squareColorTheme !== currentSquareColorTheme) {
      dispatch(changeSettings('squareColorTheme', squareColorTheme));
    }
  };

  render() {
    const {
      squareColorTheme,
    } = this.props;

    return (
      <div className="display-settings">
        <div className="square-style-settings">
          {map(SquareColorTheme, (theme) => (
            <div
              key={theme}
              className={classNames('example-boards', `theme-${theme}`, { selected: theme === squareColorTheme })}
              onClick={() => this.onSquareColorThemeClick(theme)}
            >
              <svg
                className="example-board"
                viewBox={`0 0 ${SVG_SQUARE_SIZE * 2} ${SVG_SQUARE_SIZE * 2}`}
              >
                {[[7, 0], [7, 1], [6, 0], [6, 1]].map(([y, x]) => (
                  <BoardSquare
                    key={`${y}-${x}`}
                    className={`square ${this.standardGame.getSquareColor({ board: 0, x, y })}`}
                    game={this.standardGame}
                    board={0}
                    fileX={x}
                    rankY={y}
                  />
                ))}
              </svg>

              <svg
                className="example-board"
                viewBox={`${15 * a} 0 ${7 * a} ${2 * SVG_SQUARE_SIZE}`}
              >
                {[[10, 5], [9, 5], [9, 6]].map(([y, x]) => (
                  <BoardSquare
                    key={`${y}-${x}`}
                    className={`square ${this.hexGame.getSquareColor({ board: 0, x, y })}`}
                    game={this.hexGame}
                    board={0}
                    fileX={x}
                    rankY={y}
                  />
                ))}
              </svg>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    squareColorTheme: state.gameSettings.squareColorTheme,
  };
}

export default connect(mapStateToProps)(DisplaySettings);
