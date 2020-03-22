const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path')

module.exports = {
	context: __dirname + '/src',
	entry: './index.js',
  output: {
    filename: 'site.js',
		path: path.resolve(__dirname, 'dist'),
		library: 'ecorys',
		libraryTarget: 'var'
	},
	devServer: {
			stats: {
					children: false, // Hide children information
					maxModules: 0 // Set the maximum number of modules to be shown
			},
			publicPath: '/dist/',
			port: 3000
	},
  module: {
    rules: [
		{ test: /\.(png|jpg|jpeg|gif|svg|woff2)$/, use: 'url-loader?limit=25000' },
		{ 
			test: /\.js?$/, 
			exclude: /(node_modules)/, 
			include: /src/, 
			use: { 
				loader: "babel-loader",
				options: {
					presets: [
						[
							'@babel/preset-env'
						]
					]
				}
			} 
		},
		{
			test: /\.s[ac]ss$/i,
			use: [
			  MiniCssExtractPlugin.loader,
			  // Translates CSS into CommonJS
			  'css-loader',
			  'postcss-loader',
			  // Compiles Sass to CSS
			  'sass-loader',
		],
       }
    ]
  },
    plugins: [
        new MiniCssExtractPlugin({
          filename: "[name].css"
        })
    ]
}
