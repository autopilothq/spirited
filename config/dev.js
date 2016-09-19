const webpack = require('webpack');
const baseConfig = require('./base');
const merge = require('lodash.merge');

module.exports = merge({}, baseConfig, {
  cache: true,
  devtool: 'eval-source-map',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
  ],
});
