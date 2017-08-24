var path = require('path');

var FlowCheckWebpackPlugin = require('flow-check-webpack-plugin').default;

module.exports = {
  target: 'node',
  entry: './rightPad.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'rightPad.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'identity-loader'
        }
      }
    ]
  },
  plugins: [
    new FlowCheckWebpackPlugin(),
  ]
};
