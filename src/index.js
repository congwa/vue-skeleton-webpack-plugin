/**
 * @file generate skeleton
 * @author panyuqi <panyuqi@baidu.com>
 */

/* eslint-disable no-console, fecs-no-require */

// webpackplugin中间的apihttps://webpack.docschina.org/api/compilation-hooks/
// webpack2手册

const ssr = require('./ssr');
const {insertAt, isObject} = require('./util');

const DEFAULT_PLUGIN_OPTIONS = {
    webpackConfig: {},
    insertAfter: '<div id="app">'
};

const DEFAULT_ENTRY_NAME = 'main';

class SkeletonPlugin {

    constructor(options = {}) {
        this.options = Object.assign({}, DEFAULT_PLUGIN_OPTIONS, options);
    }

    apply(compiler) { // Compiler代表了是整个webpack从启动到关闭的生命周期
        let {webpackConfig, insertAfter} = this.options;
        let entry = webpackConfig.entry;
        // cache entries
        let skeletonEntries;

        if (isObject(entry)) {
            skeletonEntries = Object.assign({}, entry);
        }
        else {
            let entryName = DEFAULT_ENTRY_NAME;
            let parentEntry = compiler.options.entry;

            if (isObject(parentEntry)) {
                entryName = Object.keys(parentEntry)[0];
            }
            skeletonEntries = {
                [entryName]: entry
            };
        }
        
        /**
         * 
         * 编译实例继承于编译器。
         * 例如，compiler.compilation 是对所有 require 图表中对象的字面上的编译。
         * 这个对象可以访问所有的模块和它们的依赖（大部分是循环依赖）。
         * 在编译阶段，模块被加载，封闭，优化，分块，哈希和重建等等。这将是编译中任何操作主要的生命周期。
         * 
         * Compilation 对象只代表了一次新的编译
         * 
         * 其常见钩子
         *  after-plugins     设置完一组初始化插件之后    compiler          sync
            after-resolvers   设置完 resolvers 之后     compiler          sync
            run               在读取记录之前             compiler          async
            compile           在创建新 compilation之前  compilationParams  sync
            compilation       compilation 创建完成      compilation        sync
            emit              在生成资源并输出到目录之前  compilation        async
            after-emit        在生成资源并输出到目录之后  compilation        async
            done              完成编译                  stats              sync


            watch-run 获取发生变换的文件列表
         * 
         */
        compiler.plugin('compilation', compilation => {
            // compilation创建完成
            // add listener for html-webpack-plugin
            // 监听html-webpack-plugin的html-webpack-plugin-before-html-processing生命周期

            /**
             * webpack的事件流
             * 
             * 我们可以把webpack理解为一条生产线，需要经过一系列处理流程后才能将源文件转换成输出结果。
             * 这条生产线上的每个处理流程的职责都是单一的，多个流程之间会存在依赖关系，只有完成当前处理后才能交给下一个流程去处理。
             * webpack在运行的过程中会广播事件，插件只需要关心监听它的事件，就能加入到这条生产线中。然后会执行相关的操作。
             * webpack的事件流机制它能保证了插件的有序性，使整个系统的扩展性好。事件流机制使用了观察者模式来实现的
             * 
             * 在html-webpack-plugin插件中通过compilation.applyPluginsAsyncWaterfall('html-webpack-plugin-before-html-processing', htmlPluginData); 进行广播 
             */
            // html-webpack-plugin处理html前触发
            compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {
                // 拿到所有的文件数组

                // 这里引发一个思考，如果不在htmlPluginData中拿chunk，还能怎么拿？ 
                // compilation中的assets也是可以的
                let usedChunks = Object.keys(htmlPluginData.assets.chunks);
                let entryKey;

                // find current processing entry
                if (Array.isArray(usedChunks)) {
                    // 找到我们的骨架屏模板文件地址
                    entryKey = Object.keys(skeletonEntries).find(v => usedChunks.indexOf(v) > -1);
                }
                else {
                    entryKey = DEFAULT_ENTRY_NAME;
                }

                // set current entry & output in webpack config
                // 设置webpack的入口
                webpackConfig.entry = skeletonEntries[entryKey];
                // 设置webpack出口地址
                webpackConfig.output.filename = `skeleton-${entryKey}.js`;

                // 走ssr流程，拿到ssr转换后的 html静态文件字符串和css字符串  之后就是插入了
                /**
                 * 这里仔细想一下如何进行插入。 我们的目的是把我们骨架屏的css和逻辑源码插入到html中，刚好html-webpack-plugin是往html插入文件的
                 * 我们可以再html-webpack-plugin的关键地方插入我们的骨架屏css和js代码
                 * 
                 */
                ssr(webpackConfig).then(({skeletonHtml, skeletonCss}) => {
                    // insert inlined styles into html

                    //在html-webpack-plugin的上下文中找出 <head> 标签位置
                    let headTagEndPos = htmlPluginData.html.lastIndexOf('</head>');

                    // 在head标签中插入 style代码
                    htmlPluginData.html = insertAt(htmlPluginData.html, `<style>${skeletonCss}</style>`, headTagEndPos);

                    // 根据insertAfter关键字找出位置，插入script标签
                    let appPos = htmlPluginData.html.lastIndexOf(insertAfter) + insertAfter.length;
                    htmlPluginData.html = insertAt(htmlPluginData.html, skeletonHtml, appPos);
                    callback(null, htmlPluginData);
                });
            });
        });
    }

    static loader(ruleOptions = {}) {
        return Object.assign(ruleOptions, {
            loader: require.resolve('./loader'),
            options: Object.assign({}, ruleOptions.options)
        });
    }
}

module.exports = SkeletonPlugin;
