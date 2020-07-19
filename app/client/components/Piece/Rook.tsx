import * as React from 'react';

import {
  ColorEnum,
} from 'shared/types';

import { Game } from 'client/helpers';

interface OwnProps {
  color: ColorEnum;
}

type Props = OwnProps;

export default class Rook extends React.PureComponent<Props> {
  render() {
    const {
      color,
    } = this.props;

    if (Game.isLightColor(color)) {
      return (
        <React.Fragment>

          <path
            d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z"
            fill={color}
            strokeLinecap="butt"
          />

          <path
            d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z"
            fill={color}
            strokeLinecap="butt"
          />

          <path
            d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14"
            fill={color}
            strokeLinecap="butt"
          />

          <path
            d="M 34,14 L 31,17 L 14,17 L 11,14"
            fill={color}
          />

          <path
            d="M 31,17 L 31,29.5 L 14,29.5 L 14,17"
            fill={color}
            strokeLinecap="butt"
            strokeLinejoin="miter"
          />

          <path
            d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5"
            fill={color}
          />

          <path
            d="M 11,14 L 34,14"
            fill="none"
            strokeLinejoin="miter"
          />

        </React.Fragment>
      );
    }

    return (
      <React.Fragment>

        <path
          d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z"
          fill={color}
          strokeLinecap="butt"
        />

        <path
          d="M 12.5,32 L 14,29.5 L 31,29.5 L 32.5,32 L 12.5,32 z"
          fill={color}
          strokeLinecap="butt"
        />

        <path
          d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z"
          fill={color}
          strokeLinecap="butt"
        />

        <path
          d="M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z"
          fill={color}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />

        <path
          d="M 14,16.5 L 11,14 L 34,14 L 31,16.5 L 14,16.5 z"
          fill={color}
          strokeLinecap="butt"
        />

        <path
          d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 z"
          fill={color}
          strokeLinecap="butt"
        />

        <path
          d="M 12,35.5 L 33,35.5 L 33,35.5"
          stroke="#fff"
          strokeWidth="1"
          strokeLinejoin="miter"
        />

        <path
          d="M 13,31.5 L 32,31.5"
          stroke="#fff"
          strokeWidth="1"
          strokeLinejoin="miter"
        />

        <path
          d="M 14,29.5 L 31,29.5"
          stroke="#fff"
          strokeWidth="1"
          strokeLinejoin="miter"
        />

        <path
          d="M 14,16.5 L 31,16.5"
          stroke="#fff"
          strokeWidth="1"
          strokeLinejoin="miter"
        />

        <path
          d="M 11,14 L 34,14"
          stroke="#fff"
          strokeWidth="1"
          strokeLinejoin="miter"
        />

      </React.Fragment>
    );
  }
}
