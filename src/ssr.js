/**
 * @file ssr
 * @desc Use vue ssr to render skeleton components. The result contains html and css.
 * @author panyuqi <panyuqi@baidu.com>
 */

/* eslint-disable no-console, fecs-no-require */

const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const createBundleRenderer = require('vue-server-renderer').createBundleRenderer;

/**
 *  内存文件系统是在内存中模拟一个磁盘操作系统，因为读取磁盘速度比读取内存慢得多，
 *  所以在需要频繁读写文件场景下，我们可以使用内存文件系统做为存储介质。例如在webpack中，
 *  开发环境下就是将打包出来的bundle写如内存中实现快速存取
 * 
 * 
 * */ 
const MFS = require('memory-fs');

module.exports = serverWebpackConfig => new Promise((resolve, reject) => {
    // get entry name from webpack.conf
    let outputPath = path.join(serverWebpackConfig.output.path, serverWebpackConfig.output.filename);
    let outputBasename = path.basename(outputPath, path.extname(outputPath));
    let outputCssBasename = `${outputBasename}.css`;
    let outputCssPath = path.join(serverWebpackConfig.output.path, outputCssBasename);

    console.log(`Generate skeleton for ${outputBasename}...`);

    // extract css into a single file
    // 拆解出**.vue模板文件的css命名为outputCssBasename
    serverWebpackConfig.plugins.push(new ExtractTextPlugin({
        filename: outputCssBasename
    }));

    // webpack start to work
    let serverCompiler = webpack(serverWebpackConfig);
    let mfs = new MFS();

    // output to mfs
    // 控制把webpack的输出(配置的output)文件输出到内存中
    serverCompiler.outputFileSystem = mfs;

    // 使用webpack的watch来进行热更新的功能呢
    serverCompiler.watch({}, (err, stats) => {

        if (err) {
            reject(err);
            return;
        }

        stats = stats.toJson();
        stats.errors.forEach(err => {
            console.error(err);
        });
        stats.warnings.forEach(err => {
            console.warn(err);
        });

        // 构建的骨架屏模板js代码包
        let bundle = mfs.readFileSync(outputPath, 'utf-8');

        // 构建的css文件
        let skeletonCss = mfs.readFileSync(outputCssPath, 'utf-8');
        // create renderer with bundle

        // 给vue-server-renderer插件传入bundle
        let renderer = createBundleRenderer(bundle);
        // use vue ssr to render skeleton
        // 使用vue的ssr进行解析转换拿到html静态标签代码
        renderer.renderToString({}, (err, skeletonHtml) => {
            if (err) {
                reject(err);
            }
            else {
                resolve({skeletonHtml, skeletonCss});
            }
        });
    });
});
