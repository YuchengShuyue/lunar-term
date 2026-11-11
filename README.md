# lunar-term.js

[![test](https://github.com/YuchengShuyue/lunar-term/actions/workflows/test.yml/badge.svg)](https://github.com/YuchengShuyue/lunar-term/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

农历 + 二十四节气（**精确到秒**）+ 三伏 / 数九。单文件，零依赖，浏览器与 Node.js 通用。

![截图](screenshot.png)

## 为什么又写一个

现有的库大多做「传统历法」：彭祖百忌、冲煞、纳音、八字、吉神方位。这些不是我要的。
我要的只有一件事：**某个节气到底在几点几分几秒**，而且要经得起对账。

所以这里只做五件事，每件都对着权威数据验过：

| 能力 | 做法 |
|---|---|
| 二十四节气时刻 | 解太阳视黄经 = 15° 整数倍，**精确到秒** |
| 下一个 / 上一个节气 | 给定任意时刻，返回最近的节气与相差多久；**跨年由库内部处理** |
| 农历 / 干支 / 生肖 | 1900–2100 数据表，含闰月与农历节日 |
| 三伏 | 夏至後第三庚為初伏，立秋後初庚為末伏 |
| 数九 | 冬至当天起每九天一「九」 |

## 精度

太阳视黄经用 **VSOP87D 地球黄经截断级数**（L0–L5 全表 129 项）
\+ **IAU1980 章动 Δψ**（前 20 项）+ **光行差** −20.4898/R + **FK5 修正** −0.09033″，
再牛顿迭代求解。

对账基准是紫金山天文台《2026 年 11 月天象预报》原文，那里给到了秒：

| | 官方原文 | 本库 | 差 |
|---|---|---|---|
| 立冬（2026-11-07） | 17:52:**05** | 17:52:**02** | −3 秒 |
| 小雪（2026-11-22） | 15:23:**21** | 15:23:**20** | −1 秒 |

2026 年完整的 24 个节气，日期全部正确，时刻全部落在官方分钟值的 ±35 秒内
（官方只公布到分，本身就带 ±30 秒的取整噪声）。

`node selftest.js` 可复现以上全部结论。

## 怎么用

**就一个文件，拷进你的项目就能用**，不装依赖、不联网：

```bash
curl -O https://raw.githubusercontent.com/YuchengShuyue/lunar-term/main/lunar-term.js
```

想先验一遍再信，clone 下来跑测试（42 项断言，应全部通过）：

```bash
git clone https://github.com/YuchengShuyue/lunar-term.git
cd lunar-term
node selftest.js
```

`demo.html` 双击就能打开，不装任何东西也能看到效果。

### 最常用的一个调用

```js
const L = require('./lunar-term.js');

const n = L.nextTerm();
n.name;      // '小雪'
n.at;        // Date，2026-11-22T07:23:20.000Z（北京时间 15:23:20）
n.days;      // 10     —— 还有 10 天
n.hours;     // 16
n.certain;   // true   —— 2050 年之后为 false，秒变成 ΔT 预测值
```

`nextTerm()` / `prevTerm()` 不传参就以此刻为起点，也可以传 `Date` 或毫秒时间戳。
**跨年由库内部处理**——12 月冬至之后的下一个节气是次年小寒，不用自己遍历 12 个月。

### 更多可运行的例子

三个都能直接 `node` 跑，不需要装任何东西：

| 例子 | 演示什么 |
|---|---|
| [`examples/next-term.js`](examples/next-term.js) | 离下一个节气还有几天 / 上一个已过几天 |
| [`examples/term-calendar.js`](examples/term-calendar.js) | 打印某年 24 个节气的时刻表 + 对应农历日期 |
| [`examples/esm-import.mjs`](examples/esm-import.mjs) | ESM 具名导入、农历转换、三伏数九 |

### 浏览器

```html
<script src="lunar-term.js"></script>
<script>
  const at = LunarTerm.termAt(2026)['11-7'];
  console.log(at.name, at.hh, at.mi, at.ss);   // 立冬 17 52 2
</script>
```

### Node.js

```js
const L = require('./lunar-term.js');

L.nextTerm(new Date('2026-11-08T12:00:00+08:00'));
// { name:'小雪', at:2026-11-22T07:23:20.000Z, days:14, hours:3, ... }

L.termBJT(2026, 20);        // { y:2026, m:11, d:7, h:17, mi:52, s:2 }
L.termMap(2026)['11-7'];    // '立冬'
L.termAt(2026)['11-7'];     // { name:'立冬', hh:17, mi:52, ss:2, certain:true }

L.solar2lunar(2026, 11, 7); // { y:2026, m:9, d:29, leap:false }
L.lunarText({m:9,d:29});    // '九月廿九'
L.ganzhi(2026);             // '丙午'
L.shengxiao(2026);          // '马'

L.sanfuState(2026, 7, 16);  // '初伏第 2 天'
L.jiuday(2026, 12, 22);     // '一九第 1 天'

// 越界不会崩：solar2lunar 返回 null，lunarText 直接吃 null 返回空串
L.lunarText(L.solar2lunar(2126, 11, 7));   // ''
```

### ESM

```js
import L, { termAt, solar2lunar } from './lunar-term.mjs';

termAt(2026)['11-7'].name;   // '立冬'
```

### TypeScript

自带 `lunar-term.d.ts`，无需 `@types`。`TermInfo`、`LunarDate`、`TermTime` 等类型都已导出。

## API

| 函数 | 说明 |
|---|---|
| `termBJT(year, n)` | 第 n 个节气的北京时（n = 0 小寒 … 23 冬至），返回 `{y,m,d,h,mi,s}` |
| `termMap(year)` | `{ '11-7': '立冬', ... }`，key 为「月-日」**不带前导零** |
| `termAt(year)` | `{ '11-7': { name, hh, mi, ss, certain } }` |
| **`nextTerm([from])`** | **下一个节气** `{ name, at, ms, days, hours, minutes, certain }`；自动跨年 |
| **`prevTerm([from])`** | **上一个节气**，结构同上；`ms` 为负表示已过去多久 |
| `termDateOf(year, name)` | 某年某节气所在的日期（UTC 0 时，**只有日期、不含当天时刻**） |
| `termJDE(year, n)` | 同上但返回力学时儒略日（不含 ΔT 与时区） |
| `solar2lunar(y, m, d)` | 公历转农历，返回 `{y,m,d,leap}`；**越界返回 `null`** |
| `lunarText(l)` | `'九月廿九'` / `'闰六月初一'`；**传 `null` 返回 `''`**（可直接接 `solar2lunar` 的结果） |
| `lunarFest(y, m, d, l)` | 农历节日名，无则空串（含除夕，跨年处理好了） |
| `ganzhi(y)` / `shengxiao(y)` | `'丙午'` / `'马'` |
| `sanfuState(y, m, d)` | `'今日入伏'` / `'中伏第 1 天'` / 不在三伏内返回 `''` |
| `jiuday(y, m, d)` | `'一九第 1 天'` / 不在数九内返回 `''` |
| `deltaT(y)` | ΔT（TT − UT），单位秒 |
| `dtUnc(y)` | ΔT 的 1σ 预测不确定度，单位秒 |
| `sunAppLon(jde)` | 太阳视黄经（度），入参为力学时儒略日 |
| `jdFromDate` / `dateFromJD` | 儒略日互转 |
| `jdnInt` / `isGeng` | 儒略日数 / 是否庚日 |

## 已知边界（重要）

**1. 农历只覆盖 1900–2100。** 越界时 `solar2lunar()` 返回 `null`，不会给出错误值。
节气不受影响——它走天文算法，可以一直算下去。

**2. 2050 年后的「秒」只是预测值。**

节气是「太阳视黄经到达 15° 整数倍的瞬间」，这个瞬间在**力学时**里是精确的；
但我们在用的钟跟着**地球自转**走，两者之差就是 ΔT。ΔT 由潮汐摩擦、大气、地核共同决定，
**逐年变化且不可预测**。

- 2026 年实测 ΔT ≈ 69.05 秒（USNO）。
- Huber 布朗运动模型给出 100 年后的 1σ ≈ **±52 秒**。

也就是说，2126 年的立冬算出 `23:52:47`，那个「47」该是几十还是零几，**物理上没有答案**。
这不是算法不够好，是天文学界公认的极限。

所以每个节气都带 `certain` 标记：2050 年前为 `true`（真秒级），之后为 `false`（预测值）。
调用方应当自行标注不确定度，`dtUnc(year)` 给出了数值。

**3. ΔT 用的是 USNO 实测表，不是 Espenak-Meeus 2006 公式。**
后者给 2026 年 75.1 秒，实测 69.05 秒，**偏了 6 秒**——地球自转在 2020 年后反常加快，
那套公式的趋势已经失效。表覆盖 1970–2030，2030 年之后才接长段公式。

**4. 三伏的边界口径。** 采用《陰陽書·曆法》「夏至日得庚便為初庚」，
即起始日当天若是庚日，就算第一个庚日。若你的用途采用「次日起算」的另一种口径，结果会差一天。

**5. ΔT 在 2050 年处的年增长率会跳一挡。**
2005–2050 段约 0.88 秒/年，2050–2150 段约 2.04 秒/年（Espenak-Meeus 远期段的固有特性，不是笔误）。
实测 `deltaT(2050) = 85.401`、`deltaT(2051) = 87.438`，所以 2051 年的节气时刻会比按前一段斜率外推的结果
晚约 2 秒。那一段 `certain` 本来就是 `false`，不该当真值看。

## 算法出处

- 太阳黄经级数、章动、光行差：Meeus, *Astronomical Algorithms*, 2nd ed., 第 25、47 章。
- ΔT 实测值：USNO, *deltat.preds*。
- 远期不确定度：Huber 布朗运动模型（NASA/Espenak 口径）。
- 三伏规则：《陰陽書·曆法》。
- 农历数据表：1900–2100 通用表，基准日 1900-01-31 为农历 1900 年正月初一。

自检里的外部锚点：2024/2025/2026/2027/2033 五个春节日期
（维基百科「正月初一」年表、新华社《2026 年为啥「晚春节」》、佛山+ 未来十年春节表，三处一致）；
2024/2025/2026 三年共 9 个初伏·中伏·末伏日期。

## 一个踩过的坑，值得记下来

VSOP87 的时间变量是**儒略千年** `τ = (JDE − 2451545) / 365250`，不是世纪。
写成世纪会让时间跑快 10 倍，牛顿迭代直接发散——节气会跳到三年后，偏差上亿秒。
只有章动那套基本角（D / M / M' / F / Ω）才用世纪 T。移植这套级数的人多半会踩。

## License

MIT

---

## Works Cited

"2026 年 11 月天象预报（一）." 紫金山天文台资料整理, 2026.

"2026 年为啥「晚春节」?" 新华社, 2026 年 2 月 16 日, my-h5news.app.xinhuanet.com/h5/article.html?articleId=ebb6d7efdcedb0d3454b21e70bd6fc89.

"正月初一." *维基百科*, zh.wikipedia.org/wiki/正月初一.

Huber, P. J. "Modeling the Length of Day and Extrapolating the Rotation of the Earth." *Proceedings of the Journées Systèmes de Référence Spatio-temporels*, 2006.

Meeus, Jean. *Astronomical Algorithms*. 2nd ed., Willmann-Bell, 1998.

"deltat.preds: Long-term Predictions of ΔT." *United States Naval Observatory*, maia.usno.navy.mil.

"未来十年春节（大年初一）日期表." 佛山+, content.foshanplus.com/simpleNewsDetails.html?newsId=1002912.
