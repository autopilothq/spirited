const path = require('path');
const webpack = require('webpack');

module.exports = {
  debug: true,
  cache: false,
  devtool: 'source-map',

  entry: {
    spirited: './src/index.js',
  },

  output: {
    path: path.dirname(__dirname) + '/dist',
    filename: '[name].bundle.js',
    library: 'spirited',
    libraryTarget: 'umd',
  },

  module: {
    loaders: [
      // This is what allows us to author in future JavaScript
      {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
      // This allows the test setup scripts to load `package.json`
      {test: /\.json$/, exclude: /node_modules/, loader: 'json-loader'},
    ],
  },

  plugins: [
    new webpack.optimize.DedupePlugin(),
  ],
};
