const glob = require('glob');
const webpack = require('webpack');
const merge = require('lodash.merge');

const testFiles = glob.sync('./test/unit/**/*.js');
const allFiles = ['./test/setup/browser.js'].concat(testFiles);
const baseConfig = require('./base');

module.exports = merge({}, baseConfig, {
  devtool: 'inline-source-map',
  entry: allFiles,
  output: {
    path: './test/tmp',
    filename: '__spec-build.js',
  },
  plugins: [
    // By default, webpack does `n=>n` compilation with entry files. This concatenates
    // them into a single chunk.
    new webpack.optimize.LimitChunkCountPlugin({maxChunks: 1}),
  ],
});
