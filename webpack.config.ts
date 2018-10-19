import * as path from 'path';
import { Configuration, Plugin } from 'webpack';
import autoprefixer = require('autoprefixer');
import MiniCssExtractPlugin = require('mini-css-extract-plugin');

export default (isProduction: boolean): Configuration => {
  const plugins: Plugin[] = [];

  if (isProduction) {
    plugins.push(
      new MiniCssExtractPlugin({
        filename: 'all.[hash].css'
      })
    );
  }

  return {
    entry: './app/client/index.tsx',
    output: {
      publicPath: '/public/',
      path: path.resolve(__dirname, 'public'),
      filename: isProduction
        ? 'all.[hash].js'
        : 'all.js'
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    plugins,
    module: {
      rules: [
        { parser: { amd: false } },
        {
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'url-loader?limit=10000&mimetype=application/font-woff'
        },
        {
          test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'file-loader'
        },
        {
          test: /\.less$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourseMap: true
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: [
                  autoprefixer({
                    browsers: ['ie >= 8', 'last 4 versions']
                  })
                ],
                sourceMap: true
              }
            },
            {
              loader: 'less-loader',
              options: {
                sourceMap: true
              }
            }
          ]
        },
        {
          test: /\.tsx?$/,
          use: isProduction
            ? ['babel-loader', 'ts-loader']
            : ['babel-loader', 'ts-loader', 'eslint-loader'],
          exclude: [/node_modules/]
        }
      ]
    },
    mode: isProduction
      ? 'production'
      : 'development',
    devtool: isProduction
      ? 'source-map'
      : 'eval-source-map'
  };
};
