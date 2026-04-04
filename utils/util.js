// utils/util.js - 工具函数

/**
 * 根据训练计划获取下一个训练部位
 * @param {string} currentPart 当前训练部位
 * @param {string} plan 训练计划 'fiveSplit' | 'threeSplit'
 * @returns {string} 下一个训练部位
 */
function getNextPart(currentPart, plan) {
  if (plan === 'fiveSplit') {
    // 五分化训练：胸 → 背 → 肩 → 臂 → 腿
    const fiveSplitParts = ['胸', '背', '肩', '臂', '腿'];
    const currentIndex = fiveSplitParts.indexOf(currentPart);
    if (currentIndex === -1) {
      return '胸'; // 默认从胸开始
    }
    const nextIndex = (currentIndex + 1) % fiveSplitParts.length;
    return fiveSplitParts[nextIndex];
  } else if (plan === 'threeSplit') {
    // 三分化训练：推 → 拉 → 腿
    const threeSplitParts = ['推', '拉', '腿'];
    const currentIndex = threeSplitParts.indexOf(currentPart);
    if (currentIndex === -1) {
      return '推'; // 默认从推开始
    }
    const nextIndex = (currentIndex + 1) % threeSplitParts.length;
    return threeSplitParts[nextIndex];
  } else {
    // 默认五分化
    return '胸';
  }
}


/**
 * 格式化日期时间
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的字符串
 */
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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
 * 计算训练进度百分比
 * @param {Object} punchRecords 打卡记录
 * @param {string} plan 训练计划
 * @returns {number} 进度百分比
 */
function calculateProgress(punchRecords, plan) {
  if (!punchRecords || typeof punchRecords !== 'object') {
    return 0;
  }

  // 计算已打卡天数
  const punchDays = Object.keys(punchRecords).length;

  // 简单逻辑：根据计划设定目标天数
  const targetDays = plan === 'fiveSplit' ? 30 : 21; // 示例目标

  const progress = Math.min(Math.round((punchDays / targetDays) * 100), 100);
  return progress;
}

/**
 * 根据打卡记录和日期智能获取当前训练部位
 * @param {Object} punchRecords 打卡记录
 * @param {string} plan 训练计划
 * @returns {string} 当前训练部位
 */
function getCurrentPart(punchRecords, plan) {
  const defaultPart = plan === 'fiveSplit' ? '胸' : '推';
  let currentPart = wx.getStorageSync('currentPart') || defaultPart;

  if (!punchRecords || typeof punchRecords !== 'object') {
    return currentPart;
  }

  // 获取今天和昨天的日期键
  const today = new Date();
  const todayKey = getDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  const todayPunch = punchRecords[todayKey];
  const yesterdayPunch = punchRecords[yesterdayKey];

  if (todayPunch) {
    // 如果今天已打卡，当前部位就是今天打卡的部位
    currentPart = todayPunch.part;
  } else if (yesterdayPunch) {
    // 如果昨天有打卡，今天应该训练昨天部位的下一个部位
    currentPart = getNextPart(yesterdayPunch.part, yesterdayPunch.plan || plan);
    // 更新存储，方便其他页面使用
    wx.setStorageSync('currentPart', currentPart);
  }
  // 其他情况（无打卡记录或打卡记录更早）则返回存储的currentPart

  return currentPart;
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

  // 计算当前连续打卡天数（从今天往前算）
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 标准化时间
  let checkDate = new Date(today);
  let maxIterations = 365 * 2; // 最多检查两年，防止无限循环

  // 向前查找连续打卡天数
  while (maxIterations-- > 0) {
    const dateKey = getDateKey(checkDate);
    if (punchRecords[dateKey]) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 计算历史最长连续打卡天数
  if (dates.length === 1) {
    // 只有一天打卡记录
    longestStreak = 1;
  } else {
    let tempStreak = 1;
    longestStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      // 解析日期字符串为Date对象
      const prevDate = parseDateString(dates[i - 1]);
      const currDate = parseDateString(dates[i]);

      if (!prevDate || !currDate) continue;

      // 计算两个日期之间的天数差
      const timeDiff = currDate.getTime() - prevDate.getTime();
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
    result.push({
      date: dateKey,
      day: day,
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
      hasPunch: false,
      isToday: false,
      isCurrentMonth: false,
      color: '#ebedf0'
    });
  }

  // 添加当月的数据
  monthData.forEach(item => {
    const isToday = item.date === todayKey;
    let color = '#ebedf0'; // 默认未打卡颜色

    if (item.hasPunch) {
      // 根据连续打卡天数确定颜色深度
      // 这里简化处理：已打卡统一用绿色
      color = '#9be9a8';

      // 可以在这里添加更复杂的颜色逻辑，比如：
      // 根据该天在连续打卡序列中的位置决定颜色深度
    }

    result.push({
      date: item.date,
      day: item.day,
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
 * 计算总打卡天数
 * @param {Object} punchRecords 打卡记录
 * @returns {number} 总打卡天数
 */
function calculateTotalPunchDays(punchRecords) {
  if (!punchRecords || typeof punchRecords !== 'object') {
    return 0;
  }
  return Object.keys(punchRecords).length;
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

  // 计算平均间隔天数
  let totalDays = 0;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseDateString(dates[i-1]);
    const curr = parseDateString(dates[i]);
    if (prev && curr) {
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      totalDays += diff;
    }
  }
  const averageDaysBetween = (totalDays / (dates.length - 1)).toFixed(1);

  // 计算最频繁的训练日（星期几）
  const dayCount = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
  dates.forEach(dateStr => {
    const date = parseDateString(dateStr);
    if (date) {
      const day = date.getDay(); // 0=周日, 1=周一, ...
      dayCount[day]++;
    }
  });

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
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
    mostFrequentDay: maxCount > 0 ? weekdays[maxDay] : '',
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
    threeSplit: { count: 0, parts: {} }
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
    }
  });

  return planStats;
}

/**
 * 成就系统配置
 */
const ACHIEVEMENT_CONFIG = [
  {
    id: 'first_punch',
    name: '初次打卡',
    description: '完成第一次健身打卡',
    icon: '🥇',
    condition: (stats, punchRecords) => stats.totalPunchDays >= 1,
    unlocked: false
  },
  {
    id: 'streak_3',
    name: '三日坚持',
    description: '连续打卡3天',
    icon: '🔥',
    condition: (stats, punchRecords) => stats.currentStreak >= 3,
    unlocked: false
  },
  {
    id: 'streak_7',
    name: '一周战士',
    description: '连续打卡7天',
    icon: '🛡️',
    condition: (stats, punchRecords) => stats.currentStreak >= 7,
    unlocked: false
  },
  {
    id: 'streak_30',
    name: '月度精英',
    description: '连续打卡30天',
    icon: '👑',
    condition: (stats, punchRecords) => stats.currentStreak >= 30,
    unlocked: false
  },
  {
    id: 'total_10',
    name: '十全十美',
    description: '总打卡10天',
    icon: '🔟',
    condition: (stats, punchRecords) => stats.totalPunchDays >= 10,
    unlocked: false
  },
  {
    id: 'total_30',
    name: '月练达人',
    description: '总打卡30天',
    icon: '📅',
    condition: (stats, punchRecords) => stats.totalPunchDays >= 30,
    unlocked: false
  },
  {
    id: 'all_parts',
    name: '全面发展',
    description: '所有训练部位都至少打卡一次',
    icon: '⭐',
    condition: (stats, punchRecords) => {
      const partStats = calculatePartStats(punchRecords);
      const allParts = ['胸', '背', '肩', '臂', '腿', '推', '拉'];
      return allParts.every(part => partStats[part] > 0);
    },
    unlocked: false
  },
  {
    id: 'month_full',
    name: '全勤之星',
    description: '当月每天都打卡',
    icon: '🌕',
    condition: (stats, punchRecords) => {
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthlyStats = calculateMonthlyStats(punchRecords, year, month);
      const daysInMonth = new Date(year, month, 0).getDate();
      return monthlyStats.punchDays >= daysInMonth;
    },
    unlocked: false
  },
  {
    id: 'plan_master',
    name: '计划大师',
    description: '两种训练计划都使用过',
    icon: '📋',
    condition: (stats, punchRecords) => {
      const planStats = calculatePlanExecutionStats(punchRecords);
      return planStats.fiveSplit.count > 0 && planStats.threeSplit.count > 0;
    },
    unlocked: false
  }
];

/**
 * 检查并更新成就解锁状态
 * @param {Object} punchRecords 打卡记录
 * @param {Object} stats 统计数据（包含currentStreak, totalPunchDays等）
 * @returns {Array} 更新后的成就列表（包含解锁状态）
 */
function checkAndUpdateAchievements(punchRecords, stats) {
  // 从存储中获取已解锁的成就
  const unlockedAchievements = wx.getStorageSync('achievements') || {};

  const updatedAchievements = ACHIEVEMENT_CONFIG.map(achievement => {
    const isUnlocked = unlockedAchievements[achievement.id] || false;

    // 如果已经解锁，保持解锁状态
    if (isUnlocked) {
      // 返回简化对象（不含condition函数）
      const { condition, ...achievementData } = achievement;
      return { ...achievementData, unlocked: true };
    }

    // 检查是否满足解锁条件
    const shouldUnlock = achievement.condition(stats, punchRecords);

    // 如果新解锁，保存到存储并显示通知
    if (shouldUnlock) {
      unlockedAchievements[achievement.id] = true;
      wx.setStorageSync('achievements', unlockedAchievements);

      // 显示成就解锁提示
      wx.showToast({
        title: `成就解锁：${achievement.name}`,
        icon: 'success',
        duration: 3000,
      });

      // 返回简化对象（不含condition函数）
      const { condition, ...achievementData } = achievement;
      return { ...achievementData, unlocked: true };
    }

    // 返回简化对象（不含condition函数）
    const { condition, ...achievementData } = achievement;
    return { ...achievementData, unlocked: false };
  });

  return updatedAchievements;
}

/**
 * 获取用户成就列表（包含解锁状态）
 * @param {Object} punchRecords 打卡记录
 * @param {Object} stats 统计数据
 * @returns {Array} 成就列表
 */
function getUserAchievements(punchRecords, stats) {
  return checkAndUpdateAchievements(punchRecords, stats);
}

/**
 * 获取已解锁成就数量
 * @returns {number} 已解锁成就数量
 */
function getUnlockedAchievementCount() {
  const unlockedAchievements = wx.getStorageSync('achievements') || {};
  return Object.keys(unlockedAchievements).length;
}

/**
 * 获取成就进度信息
 * @param {Object} punchRecords 打卡记录
 * @param {Object} stats 统计数据
 * @returns {Object} 成就进度信息
 */
function getAchievementProgress(punchRecords, stats) {
  const achievements = checkAndUpdateAchievements(punchRecords, stats);
  const total = achievements.length;
  const unlocked = achievements.filter(a => a.unlocked).length;

  return {
    total,
    unlocked,
    progress: total > 0 ? Math.round((unlocked / total) * 100) : 0,
    achievements
  };
}



/**
 * 导出工具函数
 */
module.exports = {
  getNextPart,
  getDateKey,
  formatDateTime,
  getSleepDurationText,
  getSleepFeelingData,
  calculateProgress,
  getCurrentPart,
  calculateStreakDays,
  calculateRank,
  getMonthPunchData,
  generateHeatmapData,
  parseDateString,
  calculateTotalPunchDays,
  calculatePartStats,
  calculateMonthlyStats,
  calculateFrequencyStats,
  calculatePlanExecutionStats,
  checkAndUpdateAchievements,
  getUserAchievements,
  getUnlockedAchievementCount,
  getAchievementProgress,
};
