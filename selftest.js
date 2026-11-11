/*!
 * selftest.js — lunar-term.js 的断言集
 *
 * 运行：node selftest.js
 * 退出码：0 = 全通过，1 = 有失败
 *
 * 每条断言的参照数据都注明出处。凡是「只和自己比」的自洽检验，会标出来。
 */

const L = require('./lunar-term.js');

let pass = 0, fail = 0;
const pad = n => String(n).padStart(2, '0');
function ok(msg) { pass++; console.log('  OK ' + msg); }
function bad(msg) { fail++; console.log('  x  ' + msg); }
function eq(got, want, msg) {
  if (String(got) === String(want)) ok(msg);
  else bad(msg + ' —— 算得「' + got + '」，期望「' + want + '」');
}

/* ========== 1. 节气日期：2026 年 24 个 ==========
 * 参照：紫金山天文台《2026 年节气表》（日期部分）
 */
console.log('\n=== 1. 2026 年 24 节气日期 ===');
const TRUE_TERMS_2026 = ['01-05', '01-20', '02-04', '02-18', '03-05', '03-20', '04-05', '04-20',
  '05-05', '05-21', '06-05', '06-21', '07-07', '07-23', '08-07', '08-23',
  '09-07', '09-23', '10-08', '10-23', '11-07', '11-22', '12-07', '12-22'];

let tbad = 0;
for (let n = 0; n < 24; n++) {
  const dt = L.termBJT(2026, n);
  const got = pad(dt.m) + '-' + pad(dt.d);
  if (got !== TRUE_TERMS_2026[n]) { tbad++; bad(L.TERMS[n] + ' 算出 ' + got + '，应为 ' + TRUE_TERMS_2026[n]); }
}
if (tbad === 0) ok('24 个节气日期全对');

/* ========== 2. 节气时刻：落在官方分钟值 ±35 秒内 ==========
 * 官方只给到分钟，本身有 ±30 秒取整噪声，所以容差必须大于 30。
 */
console.log('\n=== 2. 节气时刻 vs 官方分钟值（±35 秒）===');
const TRUE_HM_2026 = [[16, 23], [9, 45], [4, 2], [23, 52], [21, 59], [22, 46], [2, 40], [9, 39],
  [19, 49], [8, 37], [23, 48], [16, 25], [9, 57], [3, 13], [19, 43], [10, 19],
  [22, 41], [8, 5], [14, 29], [17, 38], [17, 52], [15, 23], [10, 53], [4, 50]];

let hbad = 0, worst = 0, worstName = '';
for (let n = 0; n < 24; n++) {
  const dt = L.termBJT(2026, n);
  const mine = dt.h * 3600 + dt.mi * 60 + dt.s;
  const ref = TRUE_HM_2026[n][0] * 3600 + TRUE_HM_2026[n][1] * 60;
  const diff = mine - ref;
  if (Math.abs(diff) > Math.abs(worst)) { worst = diff; worstName = L.TERMS[n]; }
  if (Math.abs(diff) > 35) { hbad++; bad(L.TERMS[n] + ' 差 ' + diff.toFixed(0) + ' 秒，超出 ±35'); }
}
if (hbad === 0) ok('24 个全部在 ±35 秒内（最大偏差 ' + worst.toFixed(1) + ' 秒，' + worstName + '）');

/* ========== 3. 秒级对账 ==========
 * 参照：紫金山天文台《2026 年 11 月天象预报》原文，给到秒
 *   「7日17时52分05秒立冬」「22日15时23分21秒小雪」
 */
console.log('\n=== 3. 秒级对账（紫金山原文，±5 秒）===');
for (const [n, name, rh, rm, rs] of [[20, '立冬', 17, 52, 5], [21, '小雪', 15, 23, 21]]) {
  const dt = L.termBJT(2026, n);
  const mine = dt.h * 3600 + dt.mi * 60 + dt.s;
  const ref = rh * 3600 + rm * 60 + rs;
  const d = mine - ref;
  const fmt = pad(dt.h) + ':' + pad(dt.mi) + ':' + pad(dt.s);
  if (Math.abs(d) <= 5) ok(name + ' 算得 ' + fmt + '，原文 ' + pad(rh) + ':' + pad(rm) + ':' + pad(rs) + '，差 ' + d.toFixed(1) + ' 秒');
  else bad(name + ' 算得 ' + fmt + '，与原文差 ' + d.toFixed(1) + ' 秒（>5）');
}

/* ========== 4. ΔT 锚点 ==========
 * 参照：USNO deltat.preds 年度预测值。2026 ≈ 69.05 秒。
 * ⚠️ Espenak-Meeus 2006 公式给 75.1 秒，偏 6 秒——2020 年后地球自转反常加快，故不用它。
 */
console.log('\n=== 4. ΔT 锚点（USNO）===');
const dtTests = [[2026, 69.05, 0.5], [2020, 69.36, 0.5], [2030, 69.97, 0.5], [2000, 63.83, 0.5]];
let dtBad = 0;
for (const [y, want, tol] of dtTests) {
  const got = L.deltaT(y);
  if (Math.abs(got - want) > tol) { dtBad++; bad(y + ' 年 ΔT = ' + got.toFixed(2) + '，USNO 为 ' + want); }
}
if (dtBad === 0) ok('ΔT 四个锚点全部吻合 USNO（2026 = ' + L.deltaT(2026).toFixed(2) + ' 秒）');

/* ========== 5. 远期不确定度 ==========
 * Huber 布朗运动模型：100 年后 1σ ≈ ±52 秒。这是「100 年后秒级做不到」的量化依据。
 */
console.log('\n=== 5. ΔT 远期不确定度 ===');
const u100 = L.dtUnc(2126);
if (u100 > 45 && u100 < 60) ok('2126 年（100 年后）1σ = ±' + u100.toFixed(1) + ' 秒，符合 Huber 模型约 ±52 的预期');
else bad('2126 年不确定度 ' + u100.toFixed(1) + ' 秒，偏离 Huber 模型（应约 52）');

/* ========== 6. 远期稳定性 ==========
 * VSOP87 有效到公元 6000 年，相邻节气间隔应稳定在 14.7~15.75 天。
 * 这条用来证明「往后 100 年算法本身不退化」——退化的只有 ΔT 的秒位。
 */
console.log('\n=== 6. 远期稳定性（相邻节气间隔）===');
let gapBad = 0;
for (const yr of [2026, 2050, 2075, 2100, 2126]) {
  let prev = null;
  for (let n = 0; n < 24; n++) {
    const dt = L.termBJT(yr, n);
    const jd = L.jdFromDate(dt.y, dt.m, dt.d, dt.h + dt.mi / 60 + dt.s / 3600);
    if (prev !== null) {
      const gap = jd - prev;
      if (!(gap > 14.7 && gap < 15.75)) { gapBad++; bad(yr + ' 年第 ' + (n + 1) + ' 个节气间隔 ' + gap.toFixed(3) + ' 天'); }
    }
    prev = jd;
  }
}
if (gapBad === 0) ok('2026 / 2050 / 2075 / 2100 / 2126 五年共 115 个间隔，全部落在 14.7~15.75 天');

/* ========== 7. certain 标记 ==========
 * 2050 年前是真秒级，之后是预测值，必须能被调用方识别。
 */
console.log('\n=== 7. certain 标记 ===');
const at2026 = L.termAt(2026);
const at2126 = L.termAt(2126);
if (at2026['11-7'] && at2026['11-7'].certain === true) ok('2026 立冬 certain = true');
else bad('2026 立冬 certain 不是 true');
if (at2126['11-7'] && at2126['11-7'].certain === false) ok('2126 立冬 certain = false（远期秒位是预测值）');
else bad('2126 立冬 certain 不是 false');

/* ========== 8. 三伏 ==========
 * 参照：维基百科「三伏」近年表 + rili.com.cn 2020-2030 三伏表（两处独立来源一致）
 * 规则：《陰陽書·曆法》夏至後第三庚為初伏、第四庚為中伏、立秋後初庚為末伏
 */
console.log('\n=== 8. 三伏 ===');
const SF = [
  [2024, '2024-7-15', '2024-7-25', '2024-8-14', '2024-8-23'],
  [2025, '2025-7-20', '2025-7-30', '2025-8-9', '2025-8-18'],
  [2026, '2026-7-15', '2026-7-25', '2026-8-14', '2026-8-23'],
];
let sfBad = 0;
for (const [, chu, zhong, mo, last] of SF) {
  const p = s => s.split('-').map(Number);
  for (const [[y, m, d], want, tag] of [
    [p(chu), '今日入伏', '初伏首日'],
    [p(zhong), '中伏第 1 天', '中伏首日'],
    [p(mo), '末伏第 1 天', '末伏首日'],
    [p(last), '末伏第 10 天', '末伏末日'],
  ]) {
    const got = L.sanfuState(y, m, d);
    if (got !== want) { sfBad++; bad(y + '-' + m + '-' + d + '（' + tag + '）算成「' + got + '」，期望「' + want + '」'); }
  }
}
for (const ds of ['2026-7-14', '2026-8-24', '2026-10-1']) {
  const [y, m, d] = ds.split('-').map(Number);
  const got = L.sanfuState(y, m, d);
  if (got !== '') { sfBad++; bad(ds + ' 应为空，算成「' + got + '」'); }
}
if (sfBad === 0) ok('三年 9 个日期 + 3 个边界全对');

/* ========== 9. 数九 ==========
 * 规则：冬至当天起每 9 天一「九」，共 81 天；1 月的九属上一年冬至
 */
console.log('\n=== 9. 数九 ===');
const JJ = [['2026-12-22', '一九第 1 天'], ['2026-12-30', '一九第 9 天'], ['2026-12-31', '二九第 1 天'],
  ['2027-1-15', '三九第 7 天'], ['2027-3-1', '八九第 7 天'], ['2027-3-13', '']];
let jjBad = 0;
for (const [ds, want] of JJ) {
  const [y, m, d] = ds.split('-').map(Number);
  const got = L.jiuday(y, m, d);
  if (got !== want) { jjBad++; bad(ds + ' 算成「' + got + '」，期望「' + want + '」'); }
}
if (jjBad === 0) ok('冬至起算、跨年归属、出九边界都对（含 6 个锚点）');

/* ========== 10. 日干支 ==========
 * 三个初伏首日必然是庚日，这是三伏定义的前提。
 */
console.log('\n=== 10. 日干支 ===');
let gBad = 0;
for (const ds of ['2024-7-15', '2025-7-20', '2026-7-15']) {
  const [y, m, d] = ds.split('-').map(Number);
  if (!L.isGeng(y, m, d)) { gBad++; bad(ds + ' 不是庚日'); }
}
if (gBad === 0) ok('三个初伏首日都是庚日（(儒略日+49)%60 后取 %10 == 6）');

/* ========== 11. 农历：外部锚点 + 自洽 ==========
 * 外部锚点（春节日期）：维基百科「正月初一」生肖年表 + 新华社《2026年为啥"晚春节"》+ 佛山+ 未来十年表，三处一致。
 * 内部锚点：本数据表以 1900-01-31 为农历 1900 年正月初一（表首值 0x04bd8 即 1900 年）。
 */
console.log('\n=== 11. 农历外部锚点 ===');
const SPRING = [[2024, '2024-02-10'], [2025, '2025-01-29'], [2026, '2026-02-17'],
                [2027, '2027-02-06'], [2033, '2033-01-31']];
let spBad = 0;
for (const [y, want] of SPRING) {
  let got = '';
  for (let t = Date.UTC(y, 0, 1); t <= Date.UTC(y, 2, 1); t += 86400000) {
    const g = new Date(t);
    const l = L.solar2lunar(g.getUTCFullYear(), g.getUTCMonth() + 1, g.getUTCDate());
    if (l && l.m === 1 && l.d === 1 && !l.leap) { got = g.toISOString().slice(0, 10); break; }
  }
  if (got !== want) { spBad++; bad(y + ' 春节算出 ' + got + '，公开年表为 ' + want); }
}
if (spBad === 0) ok('2024/2025/2026/2027/2033 五个春节日期与公开年表一致');

const base = L.solar2lunar(1900, 1, 31);
if (base && base.y === 1900 && base.m === 1 && base.d === 1 && !base.leap) ok('1900-01-31 → 农历 1900 年正月初一（数据表基准日）');
else bad('1900-01-31 应为农历 1900 正月初一，实得 ' + JSON.stringify(base));

// 自洽（逐日连续性）：相邻两天的农历日期必须连续——
//   同月则 d 恰好 +1；跨月则新的一天必须是 d === 1。
// 这项比"数初一数量"更严：表只要错一位，连续 300 天里必然断链。
// 覆盖 2026（平年）、2033（闰十一月）、2099（近表尾）三个年份各一整年。
let lunarBad = 0;
for (const y of [2026, 2033, 2099]) {
  let prev = null, monthLens = {}, curKey = null;
  for (let t = Date.UTC(y, 0, 1); t <= Date.UTC(y, 11, 31); t += 86400000) {
    const g = new Date(t);
    const l = L.solar2lunar(g.getUTCFullYear(), g.getUTCMonth() + 1, g.getUTCDate());
    if (!l) { lunarBad++; bad(y + ' 年内出现 null'); break; }
    if (prev) {
      const same = (l.y === prev.y && l.m === prev.m && l.leap === prev.leap);
      if (same) {
        if (l.d !== prev.d + 1) { lunarBad++; bad(y + '-' + (g.getUTCMonth() + 1) + '-' + g.getUTCDate() + ' 同月但 d 从 ' + prev.d + ' 跳到 ' + l.d); }
      } else if (l.d !== 1) {
        lunarBad++; bad(y + '-' + (g.getUTCMonth() + 1) + '-' + g.getUTCDate() + ' 跨月却不是初一（d=' + l.d + '）');
      }
      // 记录每月实际长度
      if (same) curKey = l.y + '/' + l.m + (l.leap ? 'L' : '') + '/' + l.d;
      else if (curKey) { monthLens[curKey.split('/')[0] + '/' + curKey.split('/')[1] + curKey.split('/')[2]] = prev.d; }
    }
    prev = l;
  }
  // 月长只能是 29 或 30
  for (const k in monthLens) {
    if (monthLens[k] !== 29 && monthLens[k] !== 30) { lunarBad++; bad(y + ' 年 ' + k + ' 月长 ' + monthLens[k] + ' 天，只能是 29 或 30'); }
  }
}
if (lunarBad === 0) ok('2026 / 2033 / 2099 三年逐日连续（约 1095 天），跨月必为初一，月长只出现 29/30');

// 闰月检验：2033 年确有闰十一月，算法要能识别
let foundLeap = false;
for (let t = Date.UTC(2033, 0, 1); t <= Date.UTC(2034, 0, 31); t += 86400000) {
  const g = new Date(t);
  const l = L.solar2lunar(g.getUTCFullYear(), g.getUTCMonth() + 1, g.getUTCDate());
  if (l && l.y === 2033 && l.leap && l.m === 11) { foundLeap = true; break; }
}
if (foundLeap) ok('2033 年闰十一月被正确识别');
else bad('2033 年闰十一月未识别（闰月处理有误）');

/* ========== 11b. 除夕 ==========
 * 这条以前没测过，但 lunarFest 里有一段专门处理「腊月只有 29 天」——那时腊月廿九就是除夕。
 * ⚠️ 参照口径：用上面第 11 节已核过的春节日期往前推一天，不是独立的外部来源。
 *    它能证明「跨年判断没错」，但不能独立证明春节日期对——那件事由第 11 节负责。
 */
console.log('\n=== 11b. 除夕（腊月廿九 / 三十两种情形）===');
const CHUXI = [[2025, 1, 28, '腊月廿九：该年无三十'],
               [2026, 2, 16, '腊月廿九：该年无三十'],
               [2027, 2, 5,  '腊月廿九：该年无三十'],
               [2033, 1, 30, '腊月三十：正常大小月']];
let cxBad = 0;
for (const [y, m, d, tag] of CHUXI) {
  const l = L.solar2lunar(y, m, d);
  const got = L.lunarFest(y, m, d, l);
  if (got !== '除夕') { cxBad++; bad(y + '-' + m + '-' + d + '（' + tag + '）算成「' + got + '」，期望「除夕」'); }
}
// 春节当天不能算成除夕
for (const [y, m, d] of [[2025, 1, 29], [2026, 2, 17], [2027, 2, 6], [2033, 1, 31]]) {
  const l = L.solar2lunar(y, m, d);
  if (L.lunarFest(y, m, d, l) === '除夕') { cxBad++; bad(y + '-' + m + '-' + d + ' 是春节，却算成除夕'); }
}
// 腊月廿八不能提前一天算成除夕
{
  const l = L.solar2lunar(2026, 2, 15);
  if (L.lunarFest(2026, 2, 15, l) === '除夕') { cxBad++; bad('2026-2-15（腊月廿八）被算成除夕'); }
}
if (cxBad === 0) ok('4 个除夕 + 4 个春节当天 + 1 个腊月廿八，全部正确');

/* ========== 12. 越界保护 ==========
 * 农数据表只覆盖 1900–2100。越界必须返回 null，绝不能算出 NaN 年月日。
 */
console.log('\n=== 12. 越界保护 ===');
if (L.solar2lunar(1899, 12, 31) === null) ok('1899 返回 null');
else bad('1899 未返回 null');
if (L.solar2lunar(2101, 1, 1) === null) ok('2101 返回 null');
else bad('2101 未返回 null');
if (L.solar2lunar(2126, 11, 7) === null) ok('2126 返回 null（节气仍可算，农历不可）');
else bad('2126 未返回 null');

// 返回 null 之后，调用方最常见的写法是把结果直接喂给 lunarText——不能崩
if (L.lunarText(null) === '') ok('lunarText(null) 返回空串（不抛 TypeError）');
else bad('lunarText(null) 应返回空串，实得 ' + JSON.stringify(L.lunarText(null)));

// 节气不受农历表边界影响，2126 年必须照常算出
if (at2126['11-7'] && at2126['11-7'].name === '立冬') ok('2126 立冬照常算出（节气走天文算法，不受农历表限制）');
else bad('2126 立冬缺失');

/* ========== 13. API 形状 ==========
 * 调用方依赖的返回结构不能被改坏。
 */
console.log('\n=== 13. API 形状 ===');
const tm = L.termMap(2026);
const tmKeys = Object.keys(tm);
if (tmKeys.length === 24) ok('termMap 返回 24 项');
else bad('termMap 返回 ' + tmKeys.length + ' 项，应为 24');
if (typeof tm['11-7'] === 'string' && tm['11-7'] === '立冬') ok('termMap 的 key 为「月-日」不带前导零，值为节气名');
else bad('termMap 结构异常：' + JSON.stringify(tm['11-7']));

const a = at2026['11-7'];
if (a && typeof a.hh === 'number' && typeof a.mi === 'number' && typeof a.ss === 'number' && typeof a.certain === 'boolean') {
  ok('termAt 每项含 name / hh / mi / ss / certain');
} else bad('termAt 结构异常：' + JSON.stringify(a));

const l1 = L.solar2lunar(2026, 11, 1);
if (l1 && typeof l1.y === 'number' && typeof l1.m === 'number' && typeof l1.d === 'number' && typeof l1.leap === 'boolean') {
  ok('solar2lunar 返回 { y, m, d, leap }');
} else bad('solar2lunar 结构异常');

/* ========== 14. 下一个 / 上一个节气 ==========
 * 参照来自本库自身的 termBJT（第 1、2 段已用紫金山天文台数据验过秒级精度）。
 * 所以这一段属于【自洽检验】：验的是 nextTerm 的挑选顺序、跨年与边界处理，
 * 不是天文算法本身的精度。
 */
console.log('\n=== 14. 下一个 / 上一个节气 ===');

// 从立冬之后一天出发，下一个必须是小雪，且时刻与 termBJT 完全一致
{
  const from = Date.UTC(2026, 10, 8, 4, 0, 0);   // 2026-11-08 12:00 北京时
  const n = L.nextTerm(from);
  eq(n && n.name, '小雪', 'nextTerm(11-08) → 小雪');
  const want = Date.UTC(2026, 10, 22, 15 - 8, 23, 20);   // 北京时 11-22 15:23:20
  eq(n && n.at && n.at.getTime(), want, 'nextTerm 的时刻与 termBJT 一致（小雪 15:23:20 北京时）');
  eq(n && n.certain, true, '2026 年的节气 certain 为 true');
  // days / hours / minutes 三者向下取整会有余数，允许差不到 1 分钟
  const back = ((n.days * 24 + n.hours) * 60 + n.minutes) * 60000;
  if (Math.abs(n.ms - back) < 60000) ok('days / hours / minutes 与 ms 自洽（舍入余数 < 1 分钟）');
  else bad('days/hours/minutes 与 ms 不自洽：ms=' + n.ms + '，还原=' + back);
}

// 跨年：12 月 25 日之后是次年小寒
{
  const n = L.nextTerm(Date.UTC(2026, 11, 25, 4, 0, 0));
  eq(n && n.name, '小寒', 'nextTerm(12-25) 跨年 → 次年小寒');
  eq(n && n.at.getUTCFullYear(), 2027, '跨年结果的年份为 2027');
}

// 跨年：1 月 1 日之前是上一年冬至
{
  const p = L.prevTerm(Date.UTC(2026, 0, 1, 4, 0, 0));
  eq(p && p.name, '冬至', 'prevTerm(01-01) 跨年 → 上年冬至');
  eq(p && p.at.getUTCFullYear(), 2025, '跨年结果的年份为 2025');
  if (p && p.ms < 0) ok('prevTerm 的 ms 为负（表示已过去）');
  else bad('prevTerm 的 ms 应为负，实得 ' + (p && p.ms));
}

// 边界：正好卡在节气时刻上——next 严格大于，prev 严格小于
{
  const at = Date.UTC(2026, 10, 22, 7, 23, 20);   // 小雪那一刻（北京时 15:23:20）
  eq(L.nextTerm(at).name, '大雪', 'nextTerm 在节气当刻取下一个（严格大于）');
  eq(L.prevTerm(at).name, '立冬', 'prevTerm 在节气当刻取上一个（严格小于）');
}

// 非法入参不抛错，返回 null；缺省用当前时刻
{
  eq(L.nextTerm(new Date(NaN)), null, 'nextTerm(Invalid Date) 返回 null');
  eq(L.prevTerm('abc'), null, 'prevTerm(非日期字符串) 返回 null');
  if (L.nextTerm() !== null) ok('nextTerm() 缺省用当前时刻');
  else bad('nextTerm() 无参时不应返回 null');
}

// termDateOf：只要日期，不含当天时刻
{
  const d = L.termDateOf(2026, '冬至');
  eq(d && d.toISOString(), '2026-12-22T00:00:00.000Z', 'termDateOf(2026, 冬至) → 12-22');
  eq(L.termDateOf(2026, '不存在'), null, 'termDateOf 未知节气名返回 null');
}

/* ========== 汇总 ========== */
console.log('\n' + '─'.repeat(52));
console.log(fail === 0
  ? '全部通过：' + pass + ' 项'
  : '有失败：' + fail + ' 项失败 / ' + pass + ' 项通过');
process.exit(fail === 0 ? 0 : 1);
