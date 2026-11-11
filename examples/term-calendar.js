/**
 * 打印某一年的 24 个节气，带农历日期。
 *
 * 运行：node examples/term-calendar.js 2026
 * 不传年份则用当前年。
 */
const L = require('../lunar-term.js');

const year = Number(process.argv[2]) || new Date().getFullYear();
if (!Number.isInteger(year) || year < 1900 || year > 2100) {
  console.error('年份需在 1900–2100 之间（农历数据表只覆盖这段，节气本身不受限）');
  process.exit(1);
}

const p = n => String(n).padStart(2, '0');
// 时间戳 → 北京时间
function bjt(ms) {
  const d = new Date(ms + 8 * 3600000);
  return {
    date: d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()),
    time: p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()),
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate()
  };
}

// 从当年 1 月 1 日 0 时（北京时）往后一个个取，取满 24 个
let from = Date.UTC(year, 0, 1) - 8 * 3600000;
const rows = [];
for (let i = 0; i < 24; i++) {
  const t = L.nextTerm(from);
  if (!t) break;
  const b = bjt(t.at.getTime());
  const l = L.solar2lunar(b.y, b.m, b.d);        // 农历只覆盖 1900–2100
  rows.push([b.date, b.time, t.name, L.lunarText(l), t.certain]);
  from = t.at;                                    // 严格大于，下一次自然取到下一个节气
}

console.log(year + ' 年二十四节气（北京时间）\n');
console.log('日期         时刻       节气   农历');
console.log('─'.repeat(34));
for (const r of rows) {
  console.log(r[0] + '   ' + r[1] + '   ' + r[2] + '   ' + r[3] + (r[4] ? '' : '  *'));
}
if (rows.some(r => !r[4])) {
  console.log('\n* 表示 2050 年之后的节气，秒为 ΔT 预测值');
}
console.log('\n共 ' + rows.length + ' 个。校验：' + (rows.length === 24 ? '通过' : '异常，应为 24 个'));
