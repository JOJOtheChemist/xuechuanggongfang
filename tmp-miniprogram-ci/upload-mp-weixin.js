const ci = require('miniprogram-ci');

async function main() {
  const project = new ci.Project({
    appid: 'wxd7918f6ffc6e4234',
    type: 'miniProgram',
    projectPath: '/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/云创工坊前端/unpackage/dist/build/mp-weixin',
    privateKeyPath: '/Users/yeya/Documents/HBuilderProjects/云创工坊/云创工坊前台/private.wxd7918f6ffc6e4234.key',
    ignores: ['node_modules/**/*']
  });

  const result = await ci.upload({
    project,
    version: '1.0.20',
    desc: '志愿查分页加载与下拉修复',
    robot: 1,
    setting: {
      es6: true,
      minifyJS: true,
      minifyWXML: true,
      minifyWXSS: true,
      minify: true,
      codeProtect: false,
      autoPrefixWXSS: true
    },
    onProgressUpdate: console.log
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
