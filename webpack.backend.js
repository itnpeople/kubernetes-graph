const path = require("path");
//const CleanWebpackPlugin = require("clean-webpack-plugin");

/**
 * 참고
 * 		output: https://webpack.js.org/configuration/output/
 */
const isProduction = typeof NODE_ENV !== 'undefined' && NODE_ENV === 'production';
const mode = isProduction ? 'production' : 'development';
const devtool = isProduction ? false : 'inline-source-map';
module.exports = [
	{
		entry: './src/backend/server.ts',
		target: 'node',
		mode,
		devtool,
		module: {
			rules: [ {test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }]
		},
		resolve: {
			extensions: [ '.tsx', '.ts', '.js' ]
		},
		output: {
			filename: 'server.js',
			path: path.resolve(__dirname, 'dist/backend')
		},
		plugins: [
			//new CleanWebpackPlugin()
		],
		node: {
			__dirname: false,
			__filename: false,
		},
		externals: {
			electron: "electron"
		}
	}
];
