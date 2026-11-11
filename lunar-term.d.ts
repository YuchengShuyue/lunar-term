/**
 * lunar-term.js 的类型声明
 * 与 lunar-term.js 的导出逐项对应；改实现时这份也要跟着改。
 */

export interface LunarDate {
  /** 农历年 */
  y: number;
  /** 农历月 1–12 */
  m: number;
  /** 农历日 1–30 */
  d: number;
  /** 是否闰月 */
  leap: boolean;
}

export interface TermTime {
  y: number;
  /** 月 1–12 */
  m: number;
  /** 日 */
  d: number;
  /** 时 0–23（北京时） */
  h: number;
  mi: number;
  s: number;
}

export interface TermInfo {
  /** 节气名，如「立冬」 */
  name: string;
  hh: number;
  mi: number;
  ss: number;
  /** 2050 年及以前为 true（真秒级）；之后为 false（ΔT 预测值） */
  certain: boolean;
}

export interface SanfuRange {
  /** 初伏首日 00:00 UTC 的毫秒时间戳 */
  chu: number;
  /** 中伏首日 */
  zhong: number;
  /** 末伏首日 */
  mo: number;
}

/** 二十四节气名，从小寒起按黄经每 15° 一个 */
export const TERMS: readonly string[];
/** 农历月名：正 二 三 四 五 六 七 八 九 十 冬 腊 */
export const CN_MON: readonly string[];
/** 农历日名：初一 … 三十 */
export const CN_DAY: readonly string[];
/** 农历节日表，key 为「月-日」 */
export const LFEST: Readonly<Record<string, string>>;

/**
 * 公历转农历。只覆盖 1900–2100，越界返回 null（不抛错、不给错值）。
 */
export function solar2lunar(y: number, m: number, d: number): LunarDate | null;

/**
 * 农历日期转中文，如「九月廿九」「闰六月初一」。
 * 传 null / undefined 返回空串——可以直接接 solar2lunar 的返回值而不用先判空。
 */
export function lunarText(l: LunarDate | null | undefined): string;

/**
 * 农历节日名，无则空串。含除夕（腊月只有 29 天时，廿九即除夕）。
 */
export function lunarFest(y: number, m: number, d: number, l: LunarDate): string;

/** 年干支，如「丙午」 */
export function ganzhi(y: number): string;
/** 生肖，如「马」 */
export function shengxiao(y: number): string;

/** 公历转儒略日；h 为小时的小数部分，省略则为 0 时 */
export function jdFromDate(y: number, m: number, d: number, h?: number): number;
/** 儒略日转公历（含时分秒）；已处理 17:52:60 这类进位问题 */
export function dateFromJD(jd: number): TermTime;

/** 太阳视黄经（度）。入参是【力学时】儒略日，不是 UT */
export function sunAppLon(jde: number): number;
/** ΔT = TT − UT，单位秒 */
export function deltaT(y: number): number;
/** ΔT 的 1σ 预测不确定度，单位秒（2026 为 0，100 年后约 52） */
export function dtUnc(year: number): number;

/** 第 n 个节气（0 = 小寒 … 23 = 冬至）的力学时儒略日 */
export function termJDE(year: number, n: number): number;
/** 第 n 个节气的北京时时刻 */
export function termBJT(year: number, n: number): TermTime;
/** 该年 24 个节气名，key 为「月-日」不带前导零，如 `{'11-7': '立冬'}` */
export function termMap(year: number): Record<string, string>;
/** 该年 24 个节气的名字 + 时刻 + 确定性标记，key 同上 */
export function termAt(year: number): Record<string, TermInfo>;

/** 整数儒略日数（当天 0 时），用于干支推算 */
export function jdnInt(y: number, m: number, d: number): number;
/** 该日是否为庚日 */
export function isGeng(y: number, m: number, d: number): boolean;
/** 该年三伏的三个起点；算不出返回 null */
export function sanfu(year: number): SanfuRange | null;
/** 入伏 / 中伏 / 末伏状态，不在三伏内返回空串 */
export function sanfuState(y: number, m: number, d: number): string;
/** 数九状态（如「三九第 7 天」），不在数九内返回空串 */
export function jiuday(y: number, m: number, d: number): string;

declare const LunarTerm: {
  TERMS: typeof TERMS;
  CN_MON: typeof CN_MON;
  CN_DAY: typeof CN_DAY;
  LFEST: typeof LFEST;
  solar2lunar: typeof solar2lunar;
  lunarText: typeof lunarText;
  lunarFest: typeof lunarFest;
  ganzhi: typeof ganzhi;
  shengxiao: typeof shengxiao;
  jdFromDate: typeof jdFromDate;
  dateFromJD: typeof dateFromJD;
  sunAppLon: typeof sunAppLon;
  deltaT: typeof deltaT;
  dtUnc: typeof dtUnc;
  termJDE: typeof termJDE;
  termBJT: typeof termBJT;
  termMap: typeof termMap;
  termAt: typeof termAt;
  jdnInt: typeof jdnInt;
  isGeng: typeof isGeng;
  sanfu: typeof sanfu;
  sanfuState: typeof sanfuState;
  jiuday: typeof jiuday;
};

export default LunarTerm;
