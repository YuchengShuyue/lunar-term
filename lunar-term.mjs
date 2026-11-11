/**
 * ESM 入口 —— lunar-term.js 本身是 UMD，这里把它的具名导出转出来，
 * 好让 `import { termAt } from 'lunar-term'` 在纯 ESM 环境（Vite / `<script type="module">`）
 * 也能用，而不必退回 `import L from 'lunar-term'` 再解构。
 */
import LunarTerm from './lunar-term.js';

export default LunarTerm;

export const {
  TERMS, CN_MON, CN_DAY, LFEST,
  solar2lunar, lunarText, lunarFest, ganzhi, shengxiao,
  jdFromDate, dateFromJD,
  sunAppLon, deltaT, dtUnc,
  termJDE, termBJT, termMap, termAt,
  jdnInt, isGeng, sanfu, sanfuState, jiuday,
} = LunarTerm;
