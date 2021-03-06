const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
// const CleanWebpackPlugin = require("clean-webpack-plugin");

/**
* 참고
* 		output: https://webpack.js.org/configuration/output/
*/
module.exports = [
{
	entry: {
		topology: path.join(__dirname, "/src/graph/graph.topology.ts"),
		hierarchy: path.join(__dirname, "/src/graph/graph.hierarchy.ts"),
	},
	resolve: {
		extensions: [".ts", ".js", ".scss"],
		alias: {
			"@/components/graph": path.join(__dirname, "/src/graph")	// tsconfig.json > compilerOptions.paths
		},
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		library: ["kore3lab", "graph"],
		libraryTarget: "umd",
		filename: "kubernetes-graph.[name].js",
		globalObject: "this",
	},
	module: {
		rules: [
			{ test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
			{ test: /\.css$/, use: ["style-loader", "css-loader"] },
		],
	},
	plugins: [
		// new CleanWebpackPlugin(),
		new HtmlWebpackPlugin({
			chunks: ["topology"],
			template: "./examples/topology.html",
			filename: "topology.html",
		}),
		new HtmlWebpackPlugin({
			chunks: ["hierarchy"],
			template: "./examples/hierarchy.html",
			filename: "hierarchy.html",
		}),
		new HtmlWebpackPlugin({
			chunks: ["hierarchy"],
			template: "./examples/hierarchy.vertical.html",
			filename: "hierarchy.vertical.html",
		}),
		new HtmlWebpackPlugin({
			chunks: ["hierarchy"],
			template: "./examples/hierarchy.network.html",
			filename: "hierarchy.network.html",
		}),
	],
	devtool: "source-map",
	devServer: {
		static: {
			directory: path.join(__dirname, "examples"),
		},
		proxy: {
			"/api/clusters" : "http://localhost:4000"
		},
		historyApiFallback: true,
		compress: true,
		host: "0.0.0.0",
		port: 3002
	},
	node: {
	//  fs: "empty",
	//  net: "empty",
	//  tls: "empty",
	//  child_process: "empty",
	},
}];
