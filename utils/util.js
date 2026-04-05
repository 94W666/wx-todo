// utils/util.js - 工具函数

/**
 * 根据训练计划获取下一个训练部位
 * @param {string} currentPart 当前训练部位
 * @param {string} plan 训练计划 'fiveSplit' | 'threeSplit'
 * @returns {string} 下一个训练部位
 */
function getNextPart(currentPart, plan) {
  if (plan === 'fiveSplit') {
    // 五分化训练：胸 → 背 → 肩 → 臂 → 腿 → 休息
    const fiveSplitParts = ['胸', '背', '肩', '臂', '腿', '休息'];
    const currentIndex = fiveSplitParts.indexOf(currentPart);
    if (currentIndex === -1) {
      return '胸'; // 默认从胸开始
    }
    const nextIndex = (currentIndex + 1) % fiveSplitParts.length;
    return fiveSplitParts[nextIndex];
  } else if (plan === 'threeSplit') {
    // 三分化训练：推 → 拉 → 腿 → 休息
    const threeSplitParts = ['推', '拉', '腿', '休息'];
    const currentIndex = threeSplitParts.indexOf(currentPart);
    if (currentIndex === -1) {
      return '推'; // 默认从推开始
    }
    const nextIndex = (currentIndex + 1) % threeSplitParts.length;
    return threeSplitParts[nextIndex];
  } else if (plan === 'customPlan') {
    // 自主计划：用户自己选择部位，不由系统决定下一个部位
    return '';
  } else {
    // 默认五分化
    return '胸';
  }
}


/**
 * 获取睡眠时长选项文本
 * @param {number} index 索引
 * @returns {string} 时长文本
 */
function getSleepDurationText(index) {
  const durations = ['5小时及以下', '6小时', '7小时', '8小时', '9小时及以上'];
  return durations[index] || '未知';
}

/**
 * 获取睡眠体感选项文本和图标
 * @param {number} index 索引
 * @returns {{text: string, icon: string}} 体感数据
 */
function getSleepFeelingData(index) {
  const feelings = [
    { text: '神清气爽', icon: '😊' },
    { text: '还算不错', icon: '🙂' },
    { text: '没睡够', icon: '😐' },
    { text: '噩梦连连', icon: '😨' },
  ];
  return feelings[index] || { text: '未知', icon: '😶' };
}

/**
 * 检查明天是否建议休息
 * @param {Object} punchRecords 打卡记录
 * @param {string} plan 训练计划
 * @param {boolean} isPunchedToday 今天是否已打卡
 * @param {number} currentStreak 可选：当前连续打卡天数，如果提供则避免重复计算
 * @returns {boolean} 明天是否建议休息
 */
function shouldRestTomorrow(punchRecords, plan, isPunchedToday, currentStreak = undefined) {
  if (!punchRecords || typeof punchRecords !== 'object') {
    return false;
  }

  // 获取连续打卡天数
  const streak = currentStreak !== undefined ? currentStreak : calculateStreakDays(punchRecords).currentStreak;

  // 如果今天已打卡，明天连续天数加1；否则保持当前连续天数（因为今天没打卡，连续已中断）
  const tomorrowStreak = isPunchedToday ? streak + 1 : streak;

  if (plan === 'fiveSplit') {
    // 五分化：训练5天后休息1天
    // 如果明天连续天数是6的倍数（第6、12、18...天），建议休息
    return tomorrowStreak >= 6 && (tomorrowStreak % 6 === 0);
  } else if (plan === 'threeSplit') {
    // 三分化：训练3天后休息1天
    // 如果明天连续天数是4的倍数（第4、8、12...天），建议休息
    return tomorrowStreak >= 4 && (tomorrowStreak % 4 === 0);
  } else if (plan === 'customPlan') {
    // 自主计划：不提供明天休息建议，用户自主决定
    return false;
  }

  return false;
}

/**
 * 根据打卡记录智能获取今日建议训练部位
 * @param {Object} punchRecords 打卡记录
 * @param {string} plan 训练计划
 * @returns {string} 今日建议训练部位
 */
function getCurrentPart(punchRecords, plan) {
  // 自主计划：不显示固定部位，由用户选择
  if (plan === 'customPlan') {
    return '';
  }

  const defaultPart = plan === 'fiveSplit' ? '胸' : '推';

  if (!punchRecords || typeof punchRecords !== 'object') {
    return wx.getStorageSync('currentPart') || defaultPart;
  }

  // 获取今天和昨天的日期键
  const today = new Date();
  const todayKey = getDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  const todayPunch = punchRecords[todayKey];
  const yesterdayPunch = punchRecords[yesterdayKey];

  let suggestedPart;

  if (todayPunch) {
    // 今天已打卡，返回今天打卡的部位
    suggestedPart = todayPunch.part;
  } else if (yesterdayPunch) {
    // 昨天有打卡，今天应训练下一个部位（循环推进）
    suggestedPart = getNextPart(yesterdayPunch.part, yesterdayPunch.plan || plan);
    wx.setStorageSync('currentPart', suggestedPart);
  } else {
    // 昨天也没打卡，返回存储的部位或默认部位
    suggestedPart = wx.getStorageSync('currentPart') || defaultPart;
  }

  return suggestedPart;
}

/**
 * 获取指定日期的字符串键（YYYY-MM-DD）
 * @param {Date} date 日期对象，默认为当前日期
 * @returns {string} 日期键
 */
function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 计算连续打卡天数
 * @param {Object} punchRecords 打卡记录
 * @returns {Object} 包含当前连续天数和历史最长连续天数
 */
function calculateStreakDays(punchRecords) {
  if (!punchRecords || typeof punchRecords !== 'object') {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // 获取所有打卡日期并排序
  const dates = Object.keys(punchRecords).sort();
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;

  // 使用Set快速查找打卡日期
  const dateSet = new Set(dates);

  // 计算当前连续打卡天数（从今天往前算）
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 标准化时间
  let checkDate = new Date(today);
  let maxIterations = 400; // 最多检查400天，防止无限循环（覆盖一年以上）

  // 首先检查今天是否已打卡，如果没打卡则连续天数为0
  const todayKey = getDateKey(today);
  if (!dateSet.has(todayKey)) {
    // 今天没打卡，连续天数从0开始（中断了）
    currentStreak = 0;
  } else {
    // 今天已打卡，从今天开始往前计算连续天数
    while (maxIterations-- > 0) {
      const dateKey = getDateKey(checkDate);
      if (dateSet.has(dateKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // 计算历史最长连续打卡天数
  if (dates.length === 1) {
    // 只有一天打卡记录
    longestStreak = 1;
  } else {
    // 预解析所有日期为时间戳（毫秒数），提高性能
    const timestamps = [];
    for (let i = 0; i < dates.length; i++) {
      const parsed = parseDateString(dates[i]);
      if (parsed) {
        timestamps.push(parsed.getTime());
      }
    }

    if (timestamps.length < 2) {
      longestStreak = timestamps.length;
    } else {
      let tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < timestamps.length; i++) {
        // 计算两个日期之间的天数差
        const timeDiff = timestamps[i] - timestamps[i - 1];
        const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
          // 连续两天
          tempStreak++;
        } else if (dayDiff > 1) {
          // 中断了
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }

      // 检查最后一个连续序列
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }
  }

  // 如果当前连续天数大于历史最长，则更新
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { currentStreak, longestStreak };
}

/**
 * 解析YYYY-MM-DD格式的日期字符串
 * @param {string} dateStr 日期字符串
 * @returns {Date|null} Date对象或null
 */
function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JavaScript月份是0-11
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const date = new Date(year, month, day);
  // 检查日期是否有效
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

/**
 * 根据连续打卡天数计算段位
 * @param {number} streakDays 连续打卡天数
 * @returns {Object} 段位信息 {rank: 段位名称, level: 段位等级, nextRankDays: 升级所需天数}
 */
function calculateRank(streakDays) {
  const rankConfigs = [
    { minDays: 0, maxDays: 7, rank: '青铜战士', level: 1, color: '#cd7f32' },
    { minDays: 8, maxDays: 14, rank: '白银勇士', level: 2, color: '#c0c0c0' },
    { minDays: 15, maxDays: 30, rank: '黄金骑士', level: 3, color: '#ffd700' },
    { minDays: 31, maxDays: 60, rank: '白金领主', level: 4, color: '#e5e4e2' },
    { minDays: 61, maxDays: 90, rank: '钻石王者', level: 5, color: '#b9f2ff' },
    { minDays: 91, maxDays: 180, rank: '大师宗师', level: 6, color: '#9370db' },
    { minDays: 181, maxDays: 365, rank: '传奇至尊', level: 7, color: '#ff4500' },
    { minDays: 366, maxDays: Infinity, rank: '不朽神话', level: 8, color: '#ff0000' }
  ];

  const currentRank = rankConfigs.find(config =>
    streakDays >= config.minDays && streakDays <= config.maxDays
  ) || rankConfigs[0];

  const nextRank = rankConfigs.find(config => config.level === currentRank.level + 1);
  const nextRankDays = nextRank ? nextRank.minDays - streakDays : 0;

  return {
    rank: currentRank.rank,
    level: currentRank.level,
    color: currentRank.color,
    nextRankDays: nextRankDays > 0 ? nextRankDays : 0,
    nextRankName: nextRank ? nextRank.rank : ''
  };
}

/**
 * 获取指定月份的打卡数据
 * @param {Object} punchRecords 打卡记录
 * @param {number} year 年份
 * @param {number} month 月份（1-12）
 * @returns {Array} 该月每天的打卡状态数组
 */
function getMonthPunchData(punchRecords, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasPunch = !!punchRecords[dateKey];
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay(); // 0=周日, 6=周六
    result.push({
      date: dateKey,
      day: day,
      weekday: weekday,
      hasPunch: hasPunch,
      punchInfo: hasPunch ? punchRecords[dateKey] : null
    });
  }

  return result;
}

/**
 * 生成热力图数据
 * @param {Object} punchRecords 打卡记录
 * @param {number} year 年份
 * @param {number} month 月份
 * @returns {Array} 热力图数据，包含日期和强度值
 */
function generateHeatmapData(punchRecords, year, month) {
  const monthData = getMonthPunchData(punchRecords, year, month);
  const today = new Date();
  const todayKey = getDateKey(today);

  // 获取该月第一天是星期几（0-6，0是周日）
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  // 为了在日历中正确显示，需要添加前面的空白格
  const result = [];

  // 添加前面的空白格
  for (let i = 0; i < firstDayOfMonth; i++) {
    result.push({
      date: null,
      day: '',
      weekday: i,
      hasPunch: false,
      isToday: false,
      isCurrentMonth: false,
      color: '#ebedf0'
    });
  }

  // 计算每个打卡日往前连续打卡的天数，用于确定颜色深度
  const dateSet = punchRecords ? new Set(Object.keys(punchRecords)) : new Set();

  // 添加当月的数据
  monthData.forEach(item => {
    const isToday = item.date === todayKey;
    let color = '#ebedf0'; // 默认未打卡颜色

    if (item.hasPunch) {
      // 计算该天往前连续打卡的天数
      let streakLength = 0;
      let checkDate = parseDateString(item.date);

      while (checkDate && dateSet.has(getDateKey(checkDate))) {
        streakLength++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // 根据连续打卡天数确定颜色深度
      if (streakLength >= 7) {
        color = '#40c057'; // 连续7天及以上 - 深绿色
      } else if (streakLength >= 3) {
        color = '#69db7c'; // 连续3-6天 - 中绿色
      } else {
        color = '#9be9a8'; // 连续1-2天 - 浅绿色
      }
    }

    result.push({
      date: item.date,
      day: item.day,
      weekday: item.weekday,
      hasPunch: item.hasPunch,
      isToday: isToday,
      isCurrentMonth: true,
      color: color,
      punchInfo: item.punchInfo
    });
  });

  return result;
}

/**
 * 计算各部位训练次数
 * @param {Object} punchRecords 打卡记录
 * @returns {Object} 各部位训练次数统计
 */
function calculatePartStats(punchRecords) {
  const stats = {};
  if (!punchRecords || typeof punchRecords !== 'object') {
    return stats;
  }

  Object.values(punchRecords).forEach(record => {
    if (record && record.part) {
      const part = record.part;
      stats[part] = (stats[part] || 0) + 1;
    }
  });

  return stats;
}

/**
 * 计算月度统计
 * @param {Object} punchRecords 打卡记录
 * @param {number} year 年份
 * @param {number} month 月份（1-12）
 * @returns {Object} 月度统计数据
 */
function calculateMonthlyStats(punchRecords, year, month) {
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  let punchDays = 0;
  const partStats = {};

  if (!punchRecords || typeof punchRecords !== 'object') {
    return {
      punchDays: 0,
      partStats: {},
      month: `${year}年${month}月`
    };
  }

  Object.entries(punchRecords).forEach(([date, record]) => {
    if (date.startsWith(prefix) && record && record.part) {
      punchDays++;
      const part = record.part;
      partStats[part] = (partStats[part] || 0) + 1;
    }
  });

  return {
    punchDays,
    partStats,
    month: `${year}年${month}月`
  };
}

/**
 * 计算训练频率统计
 * @param {Object} punchRecords 打卡记录
 * @returns {Object} 训练频率统计
 */
function calculateFrequencyStats(punchRecords) {
  if (!punchRecords || typeof punchRecords !== 'object') {
    return {
      averageDaysBetween: '0.0',
      mostFrequentDay: '',
      consistencyScore: 0
    };
  }

  const dates = Object.keys(punchRecords).sort();
  if (dates.length < 2) {
    return {
      averageDaysBetween: '0.0',
      mostFrequentDay: '',
      consistencyScore: 0
    };
  }

  // 预解析所有日期为时间戳，提高性能
  const timestamps = [];
  const weekdays = []; // 存储星期几
  for (let i = 0; i < dates.length; i++) {
    const parsed = parseDateString(dates[i]);
    if (parsed) {
      timestamps.push(parsed.getTime());
      weekdays.push(parsed.getDay()); // 0=周日, 1=周一, ...
    }
  }

  if (timestamps.length < 2) {
    return {
      averageDaysBetween: '0.0',
      mostFrequentDay: '',
      consistencyScore: 0
    };
  }

  // 计算平均间隔天数
  let totalDays = 0;
  for (let i = 1; i < timestamps.length; i++) {
    const diff = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24);
    totalDays += diff;
  }
  const averageDaysBetween = (totalDays / (timestamps.length - 1)).toFixed(1);

  // 计算最频繁的训练日（星期几）
  const dayCount = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
  weekdays.forEach(day => {
    dayCount[day]++;
  });

  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  let maxDay = 0;
  let maxCount = 0;
  for (let i = 0; i < 7; i++) {
    if (dayCount[i] > maxCount) {
      maxCount = dayCount[i];
      maxDay = i;
    }
  }

  // 计算一致性分数（0-100）
  const avgDays = parseFloat(averageDaysBetween);
  let consistencyScore = 0;
  if (avgDays > 0) {
    consistencyScore = Math.min(100, Math.round((1 / avgDays) * 100));
  }

  return {
    averageDaysBetween: averageDaysBetween,
    mostFrequentDay: maxCount > 0 ? weekdayNames[maxDay] : '',
    consistencyScore: consistencyScore
  };
}

/**
 * 计算训练计划执行统计
 * @param {Object} punchRecords 打卡记录
 * @returns {Object} 计划执行统计
 */
function calculatePlanExecutionStats(punchRecords) {
  const planStats = {
    fiveSplit: { count: 0, parts: {} },
    threeSplit: { count: 0, parts: {} },
    customPlan: { count: 0, parts: {} }
  };

  if (!punchRecords || typeof punchRecords !== 'object') {
    return planStats;
  }

  Object.values(punchRecords).forEach(record => {
    if (!record) return;

    const plan = record.plan || 'fiveSplit';
    const part = record.part;

    if (!part) return;

    if (plan === 'fiveSplit') {
      planStats.fiveSplit.count++;
      planStats.fiveSplit.parts[part] = (planStats.fiveSplit.parts[part] || 0) + 1;
    } else if (plan === 'threeSplit') {
      planStats.threeSplit.count++;
      planStats.threeSplit.parts[part] = (planStats.threeSplit.parts[part] || 0) + 1;
    } else if (plan === 'customPlan') {
      planStats.customPlan.count++;
      planStats.customPlan.parts[part] = (planStats.customPlan.parts[part] || 0) + 1;
    }
  });

  return planStats;
}

/**
 * 获取计划名称
 * @param {string} plan 计划代码
 * @returns {string} 计划名称
 */
function getPlanName(plan) {
  const planMap = {
    'fiveSplit': '五分化训练',
    'threeSplit': '三分化训练',
    'customPlan': '自主计划'
  };
  return planMap[plan] || plan;
}

/**
 * 导出工具函数
 */
module.exports = {
  getNextPart,
  getDateKey,
  getSleepDurationText,
  getSleepFeelingData,
  getCurrentPart,
  calculateStreakDays,
  calculateRank,
  getMonthPunchData,
  generateHeatmapData,
  parseDateString,
  calculatePartStats,
  calculateMonthlyStats,
  calculateFrequencyStats,
  calculatePlanExecutionStats,
  getPlanName,
  shouldRestTomorrow,
};
