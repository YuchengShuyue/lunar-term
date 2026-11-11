/*!
 * lunar-term.js — 农历 + 天文法二十四节气（秒级）+ 三伏 / 数九
 *
 * 零依赖，纯 JavaScript，浏览器与 Node.js 通用。
 *
 * 节气用 VSOP87D 地球黄经截断级数（L0~L5 全表 129 项）
 *   + IAU1980 章动 Δψ（前 20 项）
 *   + 光行差 −20.4898/R
 *   + FK5 修正 −0.09033″
 * 再解牛顿迭代求太阳视黄经 = 15° 整数倍的瞬间。
 *
 * 精度实测（对紫金山天文台《2026 年 11 月天象预报》秒级原文）：
 *   立冬  17:52:05 → 本库 17:52:02   差 −3 秒
 *   小雪  15:23:21 → 本库 15:23:20   差 −1 秒
 *   2026 年 24 个节气日期全对，时刻全部落在官方分钟值 ±35 秒内（实测最差 31 秒，夏至）。
 *
 * 已知边界，请务必阅读：
 *   1. 农历数据表覆盖 1900–2100，越界返回 null（不会崩，也不会给错值）。
 *   2. 节气时刻在 2050 年前是物理意义上的秒级；之后仍给秒，但那是预测值。
 *      ΔT = TT − UT 不可预测，Huber 布朗运动模型给出 100 年后 1σ ≈ ±52 秒。
 *      每个节气带 certain 标记，远期请自行标注不确定度。
 *
 * 算法出处：Meeus《Astronomical Algorithms》(2nd ed.) 第 25、47 章；
 *           ΔT 取 USNO 实测/预测表；三伏规则见《陰陽書·曆法》。
 *
 * MIT License
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LunarTerm = factory();
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const LFEST = {'1-1':'春节','1-15':'元宵','2-2':'龙抬头','3-3':'上巳','5-5':'端午','7-7':'七夕','7-15':'中元','8-15':'中秋','9-9':'重阳','12-8':'腊八','12-23':'小年'};
const CN_MON = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const CN_DAY = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
const GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥', SX = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
const TERMS = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];

// 农历数据表 1900-2100（每年一个 20 位十六进制：闰月大小、12 个月大小、闰月月份）
const LUNAR = [
0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
0x0d520];

function lLeapMonth(y){ return LUNAR[y-1900] & 0xf; }
function lLeapDays(y){ return lLeapMonth(y) ? ((LUNAR[y-1900] & 0x10000) ? 30 : 29) : 0; }
function lYearDays(y){ let s=348, i=0x8000; while(i>0x8){ if(LUNAR[y-1900]&i) s++; i>>=1; } return s + lLeapDays(y); }
function lMonthDays(y,m){ return (LUNAR[y-1900] & (0x10000>>m)) ? 30 : 29; }
function solar2lunar(y,m,d){
  // ⚠️ 数据表只覆盖 1900–2100（2026+100 会越界），超出范围返回 null，
  // 由调用处显示“数据范围外”。节气不受影响——节气走天文算法，可算到几千年后。
  if(y < 1900 || y > 2100) return null;
  let offset = Math.round((Date.UTC(y,m-1,d) - Date.UTC(1900,0,31)) / 86400000);
  let temp = 0, i = 1900;
  while(i < 2101 && offset > 0){ temp = lYearDays(i); offset -= temp; i++; }
  if(offset < 0){ offset += temp; i--; }
  const year = i, leap = lLeapMonth(year);
  let isLeap = false; i = 1;
  while(i < 13 && offset > 0){
    if(leap > 0 && i === leap+1 && !isLeap){ i--; isLeap = true; temp = lLeapDays(year); }
    else { temp = lMonthDays(year, i); }
    if(isLeap && i === leap+1) isLeap = false;
    offset -= temp; i++;
  }
  if(offset === 0 && leap > 0 && i === leap+1){ if(isLeap){ isLeap = false; } else { isLeap = true; i--; } }
  if(offset < 0){ offset += temp; i--; }
  return { y:year, m:i, d:offset+1, leap:isLeap };
}
// 传 null / undefined 返回空串：solar2lunar 越界会返回 null，调用方直接串联时不该崩。
function lunarText(l){ if(!l) return ''; return (l.leap?'闰':'') + CN_MON[l.m-1] + '月' + CN_DAY[l.d-1]; }
function ganzhi(y){ return GAN[(y-4)%10] + ZHI[(y-4)%12]; }
function shengxiao(y){ return SX[(y-4)%12]; }
function lunarFest(y,m,d,l){
  if(!l.leap && LFEST[l.m+'-'+l.d]) return LFEST[l.m+'-'+l.d];
  if(!l.leap && l.m === 12){
    const nx = new Date(Date.UTC(y, m-1, d+1));
    const nl = solar2lunar(nx.getUTCFullYear(), nx.getUTCMonth()+1, nx.getUTCDate());
    if(nl && nl.m === 1 && nl.d === 1) return '除夕';
  }
  return '';
}

// ---------- 节气：解太阳视黄经 ----------
// 2026-11 升级：Meeus 低精度式（误差约 15 分钟）→ VSOP87D 截断级数 + IAU1980 章动（误差约 3 秒）。
// 实测对账（紫金山天文台《2026 年 11 月天象预报》）：立冬 17:52:05 → 本式 17:52:02（差 −3s），
// 小雪 15:23:21 → 本式 15:23:20（差 −1s）；2026 年 24 个节气日期全对，
// 时刻全落在官方分钟值 ±35 秒内（实测最差 31s，夏至；官方只公布到分，本身带 ±30s 取整噪声）。
// ⚠️ VSOP87 的时间变量是儒略【千年】tau，不是世纪；只有章动那套基本角用世纪 T。
//    写错单位会让时间跑快 10 倍、牛顿迭代直接发散——踩过。
function norm360(x){ x = x % 360; return x < 0 ? x + 360 : x; }
function jdFromDate(y,m,d,h){
  if(m <= 2){ y -= 1; m += 12; }
  const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + B - 1524.5 + (h||0)/24;
}
function dateFromJD(jd){
  jd += 0.5;
  const Z = Math.floor(jd), F = jd - Z;
  let A = Z;
  if(Z >= 2299161){ const a = Math.floor((Z - 1867216.25)/36524.25); A = Z + 1 + a - Math.floor(a/4); }
  const B = A + 1524, C = Math.floor((B - 122.1)/365.25), D = Math.floor(365.25*C), E = Math.floor((B - D)/30.6001);
  const day = B - D - Math.floor(30.6001*E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  let di = Math.floor(day);
  // 先四舍五入到整秒再拆分，保证 时/分/秒 三个数自洽（否则会出现 17:52:60）
  let tot = Math.round((day - di) * 86400);
  if(tot >= 86400){ tot -= 86400; di += 1; }
  return { y:year, m:month, d:di, h:Math.floor(tot/3600), mi:Math.floor((tot%3600)/60), s:tot%60 };
}

// VSOP87D 地球黄经 L0~L5（Meeus 附录 III 全表），每 3 个数一项：A, B, C
const VSL0=[175347046,0,0,3341656,4.6692568,6283.07585,34894,4.6261,12566.1517,3497,2.7441,5753.3849,3418,2.8289,3.5231,3136,3.6277,77713.7715,2676,4.4181,7860.4194,2343,6.1352,3930.2097,1324,0.7425,11506.7698,1273,2.0371,529.691,1199,1.1096,1577.3435,990,5.233,5884.927,902,2.045,26.298,857,3.508,398.149,780,1.179,5223.694,753,2.533,5507.553,505,4.583,18849.228,492,4.205,775.523,357,2.92,0.067,317,5.849,11790.629,284,1.899,796.298,271,0.315,10977.079,243,0.345,5486.778,206,4.806,2544.314,205,1.869,5573.143,202,2.458,6069.777,156,0.833,213.299,132,3.411,2942.463,126,1.083,20.775,115,0.645,0.98,103,0.636,4694.003,102,0.976,15720.839,102,4.267,7.114,99,6.21,2146.17,98,0.68,155.42,86,5.98,161000.69,85,1.3,6275.96,85,3.67,71430.7,80,1.81,17260.15,79,3.04,12036.46,75,1.76,5088.63,74,3.5,3154.69,74,4.68,801.82,70,0.83,9437.76,62,3.98,8827.39,61,1.82,7084.9,57,2.78,6286.6,56,4.39,14143.5,56,3.47,6279.55,52,0.19,12139.55,52,1.33,1748.02,51,0.28,5856.48,49,0.49,1194.45,41,5.37,8429.24,41,2.4,19651.05,39,6.17,10447.39,37,6.04,10213.29,37,2.57,1059.38,36,1.71,2352.87,36,1.78,6812.77,33,0.59,17789.85,30,0.44,83996.85,30,2.74,1349.87,25,3.16,4690.48];
const VSL1=[628331966747,0,0,206059,2.678235,6283.07585,4303,2.6351,12566.1517,425,1.59,3.523,119,5.796,26.298,109,2.966,1577.344,93,2.59,18849.23,72,1.14,529.69,68,1.87,398.15,67,4.41,5507.55,59,2.89,5223.69,56,2.17,155.42,45,0.4,796.3,36,0.47,775.52,29,2.65,7.11,21,5.34,0.98,19,1.85,5486.78,19,4.97,213.3,17,2.99,6275.96,16,0.03,2544.31,16,1.43,2146.17,15,1.21,10977.08,12,2.83,1748.02,12,3.26,5088.63,12,5.27,1194.45,12,2.08,4694.0,11,0.77,553.57,10,1.3,6286.6,10,4.24,1349.87,9,2.7,242.73,9,5.64,951.72,8,5.3,2352.87,6,2.65,9437.76,6,4.67,4690.48];
const VSL2=[52919,0,0,8720,1.0721,6283.0758,309,0.867,12566.152,27,0.05,3.52,16,5.19,26.3,16,3.68,155.42,10,0.76,18849.23,9,2.06,77713.77,7,0.83,775.52,5,4.66,1577.34,4,1.03,7.11,4,3.44,5573.14,3,5.14,796.3,3,6.05,5507.55,3,1.19,242.73,3,6.12,529.69,3,0.31,398.15,3,2.28,553.57,2,4.38,5223.69,2,3.75,0.98];
const VSL3=[289,5.844,6283.076,35,0,0,17,5.49,12566.15,3,5.2,155.42,1,4.72,3.52,1,5.3,18849.23,1,5.97,242.73];
const VSL4=[114,3.142,0,8,4.13,6283.08,1,3.84,12566.15];
const VSL5=[1,3.14,0];
// 日地距离 R（只喂光行差，截断即可）
const VSR0=[100013989,0,0,1670700,3.0984635,6283.07585,13956,3.05525,12566.1517,3084,5.1985,77713.7715,1628,1.1739,5753.3849,1576,2.8469,7860.4194,925,5.453,11506.77,542,4.564,3930.21,472,3.661,5884.927,346,0.964,5507.553];
const VSR1=[103019,1.10749,6283.07585,1721,1.0644,12566.1517,702,3.142,0,32,1.02,18849.23,31,2.84,5507.55,25,1.32,5223.69];
const VSR2=[4359,5.7846,6283.0758,124,5.579,12566.152,12,3.14,0];
const VSR3=[145,4.273,6283.076];
// IAU1980 章动 Δψ 前 20 项，每 7 个数一项：D,M,M',F,Ω,sin 系数,sin 的 T 系数（单位 0.0001″）
const NUT=[0,0,0,0,1,-171996,-174.2,-2,0,0,2,2,-13187,-1.6,0,0,0,2,2,-2274,-0.2,0,0,0,0,2,2062,0.2,0,1,0,0,0,1426,-3.4,0,0,1,0,0,712,0.1,-2,1,0,2,2,-517,1.2,0,0,0,2,1,-386,-0.4,0,0,1,2,2,-301,0,-2,-1,0,2,2,217,-0.5,-2,0,1,0,0,-158,0,-2,0,0,2,1,129,0.1,0,0,-1,2,2,123,0,2,0,0,0,0,63,0,0,0,1,0,1,63,0.1,2,0,-1,2,2,-59,0,0,0,-1,0,1,-58,-0.1,0,0,1,2,1,-51,0,-2,0,2,0,0,48,0,0,0,-2,2,1,46,0];
const RAD = Math.PI/180;

function vsum(a, t){
  let s = 0;
  for(let i = 0; i < a.length; i += 3) s += a[i] * Math.cos(a[i+1] + a[i+2]*t);
  return s;
}
function nutDpsi(T){
  const D  = (297.85036 + 445267.111480*T - 0.0019142*T*T + T*T*T/189474)*RAD;
  const M  = (357.52772 + 35999.050340*T - 0.0001603*T*T - T*T*T/300000)*RAD;
  const Mp = (134.96298 + 477198.867398*T + 0.0086972*T*T + T*T*T/56250)*RAD;
  const F  = (93.27191 + 483202.017538*T - 0.0036825*T*T + T*T*T/327270)*RAD;
  const Om = (125.04452 - 1934.136261*T + 0.0020708*T*T + T*T*T/450000)*RAD;
  let s = 0;
  for(let i = 0; i < NUT.length; i += 7){
    const arg = NUT[i]*D + NUT[i+1]*M + NUT[i+2]*Mp + NUT[i+3]*F + NUT[i+4]*Om;
    s += (NUT[i+5] + NUT[i+6]*T) * Math.sin(arg);
  }
  return s / 10000;
}
// 太阳视黄经（度）：几何黄经 + 章动 Δψ + 光行差 + FK5 修正。入参是【力学时】儒略日。
function sunAppLon(jde){
  const tau = (jde - 2451545)/365250, T = tau*10;
  const L = (vsum(VSL0,tau) + vsum(VSL1,tau)*tau + vsum(VSL2,tau)*tau*tau
           + vsum(VSL3,tau)*tau*tau*tau + vsum(VSL4,tau)*Math.pow(tau,4)
           + vsum(VSL5,tau)*Math.pow(tau,5)) / 1e8;
  const R = (vsum(VSR0,tau) + vsum(VSR1,tau)*tau + vsum(VSR2,tau)*tau*tau
           + vsum(VSR3,tau)*tau*tau*tau) / 1e8;
  const th = norm360(L/RAD + 180);
  return norm360(th + (nutDpsi(T) - 20.4898/R - 0.09033)/3600);
}

// ---------- ΔT = TT - UT（秒） ----------
// 1970 后取 USNO 实测/预测（2026 年约 69.05s）。⚠️ 别用 Espenak-Meeus 2006 公式算近年：
// 它给 2026 年 75.1s，实际 69.0s，偏 6 秒——2020 年后地球自转反常加快，教科书趋势失效了。
// 2030 后才接长段公式（扣 7.6s 偏移保持连续）。远期本身【不可预测】：
// Huber 布朗运动模型给出的 100 年不确定度约 ±52 秒，所以远期那几位“秒”只有显示意义。
// ⚠️ 2050 处两段公式的【年增长率】不连续：2005–2050 段约 0.88 秒/年，2050–2150 段约 2.04 秒/年。
//    这是 Espenak-Meeus 远期段的固有特性（实测 deltaT(2050)=85.401、deltaT(2051)=87.438），
//    不是笔误。结果是 2051 年节气时刻整体后移约 2 秒——那段本来就 certain=false，不该当真值看。
const DT_T = [1900,-2.8, 1910,10.4, 1920,21.1, 1930,24.0, 1940,24.3, 1950,29.1,
              1960,33.1, 1970,40.18, 1975,45.48, 1980,50.54, 1985,54.34, 1990,56.86,
              1995,60.78, 2000,63.83, 2005,64.69, 2010,66.07, 2015,67.64, 2020,69.36,
              2024,69.11, 2025,69.04, 2026,69.05, 2027,69.14, 2028,69.34, 2030,69.97];
function deltaT(y){
  const n = DT_T.length;
  if(y <= DT_T[0]) return DT_T[1];
  for(let i = 0; i < n-2; i += 2){
    if(y >= DT_T[i] && y <= DT_T[i+2]){
      return DT_T[i+1] + (DT_T[i+3]-DT_T[i+1])*(y-DT_T[i])/(DT_T[i+2]-DT_T[i]);
    }
  }
  const t = y - 2000, u = (y - 1820)/100;
  const long = y <= 2050
    ? 62.92 + 0.32217*t + 0.005589*t*t      // Espenak-Meeus 2005-2050 段
    : -20 + 32*u*u - 0.5628*(2150 - y);     // 2050-2150 段（2150 后继续外推）
  return long - 7.6;
}
// ΔT 预测不确定度（Huber 布朗运动模型，NASA/Espenak 口径）：N 年后的 1σ，单位秒。
// 100 年 ≈ 52 秒 —— 这就是“100 年后秒级”在物理上做不到的原因，不是算法不够好。
function dtUnc(year){
  const N = Math.max(0, year - 2026);
  return 365.25*N*Math.sqrt((N*0.058/3)*(1 + N/2500))/1000;
}

function termJDE(year, n){
  const target = norm360(285 + 15*n);
  let jd = jdFromDate(year,1,5,12) + n*15.2184;
  for(let k = 0; k < 64; k++){
    let dd = sunAppLon(jd) - target;
    while(dd > 180) dd -= 360;
    while(dd < -180) dd += 360;
    if(Math.abs(dd) < 1e-9) break;
    jd -= dd/0.9856473;
  }
  return jd;
}
// 力学时 → 北京时。ΔT 按年中取值，误差 < 0.5 秒（近期 dΔT/dy < 0.05 秒/年）。
function termBJT(year, n){
  const jde = termJDE(year, n);
  const jdUT = jde - deltaT(year + 0.5)/86400;
  return dateFromJD(jdUT + 8/24);
}
const _termCache = {};
function termMap(year){
  // 直接从 termAt 摊平，避免同一年的 24 个节气算两遍（VSOP87 一轮 5 次迭代 × 169 项）
  if(_termCache[year]) return _termCache[year];
  const at = termAt(year), map = {};
  for(const k in at) map[k] = at[k].name;
  _termCache[year] = map;
  return map;
}

// ---------- 节气精确时刻 + 三伏 / 数九 ----------
// termMap 只给名字（日历格子和 title 都按字符串用），这里另开一份带时刻的，不动原返回结构。
// 秒级只在 2050 年前有物理意义（ΔT 预测不确定度随年数增长）；2050 年后仍给秒，但标注为预测值。
const _termAt = {};
function termAt(year){
  if(_termAt[year]) return _termAt[year];
  const map = {};
  for(let n=0;n<24;n++){
    const dt = termBJT(year, n);
    map[dt.m + '-' + dt.d] = {
      name: TERMS[n], hh: dt.h, mi: dt.mi, ss: dt.s,
      certain: year <= 2050
    };
  }
  _termAt[year] = map;
  return map;
}

// 日干支：(儒略日数 + 49) % 60，0 = 甲子；天干 = 序号 % 10，庚 = 6。
// 锚点校验：2024/2025/2026 三年的初伏、中伏、末伏共 9 个日期（公开年历）全部对上。
function jdnInt(y,m,d){
  if(m <= 2){ y -= 1; m += 12; }
  const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + B - 1524;
}
function isGeng(y,m,d){ return ((jdnInt(y,m,d) + 49) % 60) % 10 === 6; }
function nthGeng(y,m,d,n){
  const t0 = Date.UTC(y, m-1, d);
  let cnt = 0;
  for(let i=0;i<80;i++){
    const x = new Date(t0 + i*86400000);
    if(isGeng(x.getUTCFullYear(), x.getUTCMonth()+1, x.getUTCDate()) && ++cnt === n) return x;
  }
  return null;
}
function termDateOf(year, name){
  const at = termAt(year);
  for(const k in at){
    if(at[k].name === name){ const p = k.split('-'); return new Date(Date.UTC(year, +p[0]-1, +p[1])); }
  }
  return null;
}
// 三伏（《陰陽書·曆法》：夏至後第三庚為初伏，第四庚為中伏，立秋後初庚為末伏；
// 「夏至日得庚，便為初庚」——起始日当天也算第一个庚日）
const _sfCache = {};
function sanfu(year){
  if(_sfCache[year] !== undefined) return _sfCache[year];
  const xz = termDateOf(year, '夏至'), lq = termDateOf(year, '立秋');
  if(!xz || !lq){ _sfCache[year] = null; return null; }
  const f1 = nthGeng(xz.getUTCFullYear(), xz.getUTCMonth()+1, xz.getUTCDate(), 3);
  const f2 = nthGeng(xz.getUTCFullYear(), xz.getUTCMonth()+1, xz.getUTCDate(), 4);
  const f3 = nthGeng(lq.getUTCFullYear(), lq.getUTCMonth()+1, lq.getUTCDate(), 1);
  if(!f1 || !f2 || !f3){ _sfCache[year] = null; return null; }
  _sfCache[year] = {chu:f1.getTime(), zhong:f2.getTime(), mo:f3.getTime()};
  return _sfCache[year];
}
function sanfuState(y,m,d){
  const s = sanfu(y); if(!s) return '';
  const t = Date.UTC(y, m-1, d), D = 86400000;
  if(t < s.chu || t >= s.mo + 10*D) return '';
  if(t === s.chu) return '今日入伏';
  if(t >= s.mo) return '末伏第 ' + (Math.floor((t - s.mo)/D) + 1) + ' 天';
  if(t >= s.zhong) return '中伏第 ' + (Math.floor((t - s.zhong)/D) + 1) + ' 天';
  return '初伏第 ' + (Math.floor((t - s.chu)/D) + 1) + ' 天';
}
// 数九：冬至当天起，每九天一「九」。1 月的九属上一年冬至。
function jiuday(y,m,d){
  const t = Date.UTC(y, m-1, d), D = 86400000;
  let base = termDateOf(y, '冬至');
  if(!base) return '';
  if(t < base.getTime()){
    base = termDateOf(y-1, '冬至');
    if(!base || t < base.getTime()) return '';
  }
  const off = Math.floor((t - base.getTime())/D);
  if(off < 0 || off >= 81) return '';
  const nm = ['一九','二九','三九','四九','五九','六九','七九','八九','九九'];
  return nm[Math.floor(off/9)] + '第 ' + (off % 9 + 1) + ' 天';
}

// ---------- 下一个 / 上一个节气 ----------
// termAt(year) 给的是「某一年 24 个节气」的字典，要回答「离下个节气还有几天」，
// 调用方得自己遍历 12 个月、拼出日期、还得处理 12 月冬至之后跨到次年小寒这件事。
// 这段代码几乎每个使用者都要写一遍，所以收进库里。
//
// 时刻统一用 UTC 毫秒时间戳表示。termBJT 给的是北京时（0–23 时），
// 换算成时间戳要减 8 小时；Date.UTC 对负数小时会自动往前推一天，不必特判。
const _termMsCache = {};
function _termMs(year, n){
  const k = year + '#' + n;
  if(_termMsCache[k] !== undefined) return _termMsCache[k];
  const dt = termBJT(year, n);
  const ms = Date.UTC(dt.y, dt.m - 1, dt.d, dt.h - 8, dt.mi, dt.s);
  _termMsCache[k] = ms;
  return ms;
}
function _toMs(v){
  if(v === undefined || v === null) return Date.now();
  if(v && typeof v.getTime === 'function'){ const t = v.getTime(); return isFinite(t) ? t : null; }
  if(typeof v === 'number' && isFinite(v)) return v;
  return null;
}
// 北京时的年份：时间戳 + 8h 再取 UTC 年
function _bjtYear(t){ return new Date(t + 28800000).getUTCFullYear(); }
function _termPack(name, ms, t, year){
  const d = ms - t, a = Math.abs(d);
  return {
    name: name,
    at: new Date(ms),
    ms: d,
    days: Math.floor(a / 86400000),
    hours: Math.floor(a / 3600000) % 24,
    minutes: Math.floor(a / 60000) % 60,
    certain: year <= 2050
  };
}
// 严格晚于 from 的第一个节气。from 缺省为此刻；传非法值返回 null。
function nextTerm(from){
  const t = _toMs(from);
  if(t === null) return null;
  const y0 = _bjtYear(t);
  // 12 月末时下一个节气落在次年 1 月，所以查两年足够
  for(let y = y0; y <= y0 + 1; y++){
    for(let n = 0; n < 24; n++){
      const ms = _termMs(y, n);
      if(ms > t) return _termPack(TERMS[n], ms, t, y);
    }
  }
  return null;
}
// 严格早于 from 的最后一个节气；ms / days / hours / minutes 为已过去的时间（正数）。
function prevTerm(from){
  const t = _toMs(from);
  if(t === null) return null;
  const y0 = _bjtYear(t);
  for(let y = y0; y >= y0 - 1; y--){
    for(let n = 23; n >= 0; n--){
      const ms = _termMs(y, n);
      if(ms < t) return _termPack(TERMS[n], ms, t, y);
    }
  }
  return null;
}

// ---------------- 导出 ----------------
return {
  // 常量
  TERMS: TERMS, CN_MON: CN_MON, CN_DAY: CN_DAY, LFEST: LFEST,
  // 农历
  solar2lunar: solar2lunar, lunarText: lunarText, lunarFest: lunarFest,
  ganzhi: ganzhi, shengxiao: shengxiao,
  // 儒略日
  jdFromDate: jdFromDate, dateFromJD: dateFromJD,
  // 天文
  sunAppLon: sunAppLon, deltaT: deltaT, dtUnc: dtUnc,
  // 节气
  termJDE: termJDE, termBJT: termBJT, termMap: termMap, termAt: termAt,
  termDateOf: termDateOf, nextTerm: nextTerm, prevTerm: prevTerm,
  // 干支与节令
  jdnInt: jdnInt, isGeng: isGeng, sanfu: sanfu,
  sanfuState: sanfuState, jiuday: jiuday
};
}));
