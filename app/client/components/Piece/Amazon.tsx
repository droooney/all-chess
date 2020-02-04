import * as React from 'react';

import {
  ColorEnum
} from '../../../types';
import { Game } from '../../helpers';

interface OwnProps {
  color: ColorEnum;
}

type Props = OwnProps;

export default class Amazon extends React.PureComponent<Props> {
  render() {
    const {
      color
    } = this.props;

    if (Game.isLightColor(color)) {
      return (
        <React.Fragment>

          <g transform="scale(0.85, 0.85) translate(4, 8)">
            <path
              d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
              fill={color}
            />

            <path
              d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 L 15,10 L 22,10"
              fill={color}
            />

            <path
              d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"
              fill="#000"
            />

            <path
              d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
              transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
              fill="#000"
            />
          </g>

          <g transform="scale(0.6, 0.6) translate(14.5, 1.75)" strokeWidth={2.25}>
            <path
              d="M 9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z"
              fill={color}
              transform="translate(-1,-1)"
            />

            <path
              d="M 9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z"
              fill={color}
              transform="translate(15.5,-5.5)"
            />

            <path
              d="M 9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z"
              fill={color}
              transform="translate(32,-1)"
            />

            <path
              d="M 9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z"
              fill={color}
              transform="translate(7,-4.5)"
            />

            <path
              d="M 9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z"
              fill={color}
              transform="translate(24,-4)"
            />

            <path
              d="M 9.4,28 C 17.5,23 30,23 34.6,28 L 38,14 L 31,25 L 31,11 L 25.5,23 L 22.5,9.5 L 19.5,23 L 14,10.5 L 14,25 L 7,14 L 9.4,28 z "
              fill={color}
              strokeLinecap="butt"
            />
          </g>

        </React.Fragment>
      );
    }

    return (
      <React.Fragment>

        <g transform="scale(0.6, 0.6) translate(14.5, 1.75)">
          <g
            fill={color}
            stroke="none"
          >
            <circle cx="6" cy="12" r="2.75" />
            <circle cx="14" cy="9" r="2.75" />
            <circle cx="22.5" cy="8" r="2.75" />
            <circle cx="31" cy="9" r="2.75" />
            <circle cx="39" cy="12" r="2.75" />
          </g>

          <path
            d="M 10,31 C 17.5,23 30,23 35,31 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,23 L 22.5,10 L 19.5,23 L 14.3,10.9 L 14,25 L 6.5,13.5 L 10,31 z"
            fill={color}
            strokeLinecap="butt"
          />
        </g>

        <g transform="scale(0.85, 0.85) translate(4, 8)">

          <path
            d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
            fill={color}
          />

          <path
            d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 L 15,10 L 22,10"
            fill={color}
          />

          <path
            d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"
            fill="#fff"
            stroke="#fff"
          />

          <path
            d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
            transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
            fill="#fff"
            stroke="#fff"
          />

          <path
            d="M 24.55,10.4 L 24.1,11.85 L 24.6,12 C 27.75,13 30.25,14.49 32.5,18.75 C 34.75,23.01 35.75,29.06 35.25,39 L 35.2,39.5 L 37.45,39.5 L 37.5,39 C 38,28.94 36.62,22.15 34.25,17.66 C 31.88,13.17 28.46,11.02 25.06,10.5 L 24.55,10.4 z"
            fill="#fff"
            stroke="none"
          />

        </g>

      </React.Fragment>
    );
  }
}
