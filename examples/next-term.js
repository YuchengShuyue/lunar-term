/**
 * 最常用的一件事：离下一个节气还有多久。
 *
 * 运行：node examples/next-term.js
 * 这个例子不需要任何参数，也不需要联网。
 */
const L = require('../lunar-term.js');

// 把时间戳格式化成北京时间，避免依赖运行环境的时区设置
function bjt(ms) {
  const d = new Date(ms + 8 * 3600000);
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) +
    ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
}

const next = L.nextTerm();          // 不传参数 = 以此刻为起点
const prev = L.prevTerm();

if (!next) {
  console.log('算不出来：入参不是合法日期');
} else {
  console.log('下一个节气：' + next.name + '　' + bjt(next.at.getTime()) + '（北京时间）');
  console.log('还有 ' + next.days + ' 天 ' + next.hours + ' 小时 ' + next.minutes + ' 分');

  // 2050 年之后 ΔT 变成预测值，秒不再有物理意义，这里如实提示
  if (!next.certain) {
    console.log('注意：该节气在 2050 年之后，秒是预测值，不确定度约 ±52 秒');
  }
}

if (prev) {
  console.log('上一个节气：' + prev.name + '，已过 ' + prev.days + ' 天');
}

// 也可以指定起点：问「2027 年元旦那天，离下个节气还有多久」
const fromNewYear = L.nextTerm(new Date('2027-01-01T00:00:00+08:00'));
console.log('从 2027-01-01 算：' + fromNewYear.name + '，还有 ' + fromNewYear.days + ' 天');
