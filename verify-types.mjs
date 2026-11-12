// 校验三处导出是否一致：lunar-term.d.ts 的声明 / lunar-term.js 的运行时导出 / lunar-term.mjs 的具名导出。
// 只检查「有没有漏、有没有多」，不校验签名是否吻合——那个交给 tsc。
// 零依赖，只用 node 内置模块；语法兼容 Node 12（不用 ?. / ?? / 顶层 await）。
// 用法：node verify-types.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const L = require(path.join(here, 'lunar-term.js'));
const dts = fs.readFileSync(path.join(here, 'lunar-term.d.ts'), 'utf8');

// 从 `declare const LunarTerm: { ... };` 这一块里抓键名
const afterHead = dts.split('declare const LunarTerm: {')[1];
if (!afterHead) {
  console.error('FAIL: lunar-term.d.ts 里找不到 declare const LunarTerm 块');
  process.exit(1);
}
const body = afterHead.split('};')[0];
const declared = [];
const re = /^[ \t]{2}([A-Za-z_$][\w$]*)\s*:/gm;
let m;
while ((m = re.exec(body)) !== null) declared.push(m[1]);
declared.sort();

const actual = Object.keys(L).sort();

const missing = declared.filter(function (k) { return actual.indexOf(k) === -1; }); // 声明了但运行时没有
const extra = actual.filter(function (k) { return declared.indexOf(k) === -1; });   // 运行时导出了但没声明

console.log('d.ts 声明 ' + declared.length + ' 项，运行时导出 ' + actual.length + ' 项');
if (missing.length) console.log('  声明了但没实现：' + missing.join(', '));
if (extra.length) console.log('  实现了但没声明：' + extra.join(', '));

if (missing.length || extra.length) {
  console.error('FAIL: 类型声明与运行时导出不一致');
  process.exit(1);
}
console.log('OK: 类型声明与运行时导出一致');

// ESM 入口（lunar-term.mjs）也必须把同样的具名导出转出来。
// 否则 `import { nextTerm } from 'lunar-term'` 在纯 ESM 环境里会拿到 undefined，
// 而 CJS 那边一切正常——这种漂移只看上面的检查是发现不了的。
// 用 .then 而不是顶层 await：本文件要能在 Node 12 跑（顶层 await 需 14.8+）。
import('./lunar-term.mjs').then(function (esm) {
  const esmNames = Object.keys(esm).filter(function (k) { return k !== 'default'; }).sort();

  const esmMissing = actual.filter(function (k) { return esmNames.indexOf(k) === -1; }); // CJS 有、ESM 没转
  const esmExtra = esmNames.filter(function (k) { return actual.indexOf(k) === -1; });   // ESM 多出没实现的

  if (esmMissing.length) console.log('  ESM 入口漏转：' + esmMissing.join(', '));
  if (esmExtra.length) console.log('  ESM 入口多出：' + esmExtra.join(', '));

  if (esmMissing.length || esmExtra.length) {
    console.error('FAIL: ESM 具名导出与 CJS 不一致');
    process.exit(1);
  }
  console.log('OK: ESM 具名导出 ' + esmNames.length + ' 项，与 CJS 一致（default 另计）');
}).catch(function (e) {
  console.error('FAIL: 无法加载 lunar-term.mjs —— ' + e.message);
  process.exit(1);
});
