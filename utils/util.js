const formatNumber = n => {
  n = n.toString();
  return n[1] ? n : '0' + n;
};

export function formatChatTime(timestamp) {
  const now = new Date();
  const target = new Date(timestamp);
  
  if (isNaN(target.getTime())) return '未知时间';

  // 时间差（毫秒）
  const diffMs = now.getTime() - target.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  // 1. 刚刚（1 分钟内）
  if (diffMin < 1) {
    return '刚刚';
  }

  // 获取年月日时分
  const year = target.getFullYear();
  const month = target.getMonth() + 1;
  const day = target.getDate();
  const hour = target.getHours();
  const minute = target.getMinutes();

  const timePart = `${formatNumber(hour)}:${formatNumber(minute)}`;

  // 2. 今天
  const isToday = 
    year === now.getFullYear() &&
    month === now.getMonth() + 1 &&
    day === now.getDate();

  if (isToday) {
    return timePart; // 如 "14:30"
  }

  // 3. 昨天
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    year === yesterday.getFullYear() &&
    month === yesterday.getMonth() + 1 &&
    day === yesterday.getDate();

  if (isYesterday) {
    return `昨天 ${timePart}`;
  }

  // 4. 今年（但非今天、昨天）→ 不显示年份
  if (year === now.getFullYear()) {
    return `${formatNumber(month)}-${formatNumber(day)} ${timePart}`;
  }

  // 5. 非今年 → 显示完整日期
  return `${year}/${formatNumber(month)}/${formatNumber(day)} ${timePart}`;
};
