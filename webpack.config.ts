import * as path from 'path';
import { Configuration } from 'webpack';

const config: Configuration = {
  entry: './app/client/index.tsx',
  output: {
    publicPath: '/public/',
    path: path.resolve(__dirname, 'public'),
    filename: 'all.js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
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
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.tsx?$/,
        use: ['babel-loader', 'ts-loader', 'eslint-loader'],
        exclude: [/node_modules/]
      }
    ]
  },
  mode: 'development',
  devtool: 'eval-source-map'
};

export default config;
