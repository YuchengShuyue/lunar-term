// 校验 lunar-term.d.ts 的声明与 lunar-term.js 的实际导出是否一一对应。
// 只检查「有没有漏声明 / 有没有多声明」，不校验签名是否吻合——那个交给 tsc。
// 零依赖，只用 node 内置模块；语法兼容 Node 12（不用 ?. / ??）。
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
