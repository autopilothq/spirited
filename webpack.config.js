
module.exports = {
    entry: {
        spirited: './src/index.js',
    },
    output: {
        path: "./dist",
        filename: "[name].bundle.js",
        library: 'spirited',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"},
            {test: /\.json$/, exclude: /node_modules/, loader: 'json-loader'}
        ]
    },
};
