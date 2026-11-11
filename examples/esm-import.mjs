/**
 * ESM 用法：具名导入，不用先拿默认导出再解构。
 *
 * 运行：node examples/esm-import.mjs
 * 前端里同样写法，把路径换成 'lunar-term' 即可（配合 Vite / webpack / <script type="module">）。
 */
import LunarTerm, { termAt, nextTerm, solar2lunar, lunarText, sanfuState, jiuday } from '../lunar-term.mjs';

// 具名导入：直接调
const at = termAt(2026);
console.log('2026 立冬：' + at['11-7'].hh + ':' + at['11-7'].mi + ':' + at['11-7'].ss + '（北京时）');

const n = nextTerm();
console.log('下一个节气：' + n.name + '，还有 ' + n.days + ' 天');

// 默认导入：整个命名空间
console.log('2026 是' + LunarTerm.ganzhi(2026) + '年，属' + LunarTerm.shengxiao(2026));

// 农历转换：solar2lunar 越界返回 null，lunarText 能直接吃 null，不用先判空
const l = solar2lunar(2026, 11, 11);
console.log('2026-11-11 是农历 ' + lunarText(l));

// 三伏 / 数九：不在区间内返回空串，可以直接 if 判断
const sf = sanfuState(2026, 7, 16);
const jj = jiuday(2026, 12, 22);
console.log('2026-07-16 ' + (sf || '不在三伏内'));
console.log('2026-12-22 ' + (jj || '不在数九内'));
