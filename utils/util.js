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
};
