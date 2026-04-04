// pages/index/index.js - 首页逻辑

const util = require('../../utils/util.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentDate: '', // 当前日期
    planName: '', // 计划名称
    todayPart: '', // 今日训练部位
    tomorrowPart: '', // 明日训练部位
    isPunchedToday: false, // 今日是否已打卡
    punchTime: '', // 打卡时间
    planDescription: '', // 计划描述
    progressPercent: 0, // 训练进度百分比
    switchingPage: false, // 页面切换状态，防止重复点击
    loading: true, // 页面加载状态，防止超时
    isUpdating: false, // 数据更新状态，防止重复更新

    // 段位系统和热力图相关字段
    currentStreak: 0, // 当前连续打卡天数
    longestStreak: 0, // 历史最长连续打卡天数
    userRank: {
      rank: '青铜战士', // 段位名称
      level: 1, // 段位等级
      color: '#cd7f32', // 段位颜色
      nextRankDays: 0, // 升级所需天数
      nextRankName: '', // 下一段位名称
    },

    // 热力图相关字段
    heatmapYear: new Date().getFullYear(), // 当前显示年份
    heatmapMonth: new Date().getMonth() + 1, // 当前显示月份
    heatmapData: [], // 热力图数据
    weekdays: ['日', '一', '二', '三', '四', '五', '六'], // 星期标题
    heatmapMonthText: '', // 月份显示文本（如"2026年4月"）

    // 用户数据统计面板字段
    statsPanel: {
      totalPunchDays: 0,           // 总打卡天数
      partStats: {},               // 各部位训练次数
      monthlyStats: {},            // 当前月统计
      frequencyStats: {},          // 训练频率统计
      planExecutionStats: {}       // 计划执行统计
    },

    // 成就系统字段
    achievementProgress: {
      unlocked: 0,
      total: 0,
      progress: 0
    },
    recentAchievements: [],        // 最近解锁的成就（最近3个）
    sleepRecordsCount: 0,           // 睡眠记录数量
    showAchievementModal: false,    // 成就浮窗显示状态
    allAchievements: [],            // 所有成就列表

    // 自主计划相关字段
    showPartSelector: false,        // 是否显示部位选择器
    selectedPart: '',               // 用户选择的部位
    customPlanParts: [],            // 自定义计划可选的部位列表
    lastPunchPart: ''               // 上次打卡部位（用于快速重复）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.updatePageData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.updatePageData();
  },

  /**
   * 更新页面数据（所有数据一次性计算并更新）
   */
  updatePageData: function () {
    const date = new Date();
    const currentDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

    // 获取训练计划和打卡记录
    const plan = wx.getStorageSync('trainingPlan') || 'fiveSplit';
    const planName = util.getPlanName(plan);
    const punchRecords = wx.getStorageSync('punchRecords') || {};
    const todayKey = util.getDateKey();
    const isPunchedToday = !!punchRecords[todayKey];
    const punchTime = isPunchedToday ? punchRecords[todayKey].time : '';

    // 智能获取当前训练部位
    const currentPart = util.getCurrentPart(punchRecords, plan);

    // 计算今日和明日部位
    let todayPart = currentPart;
    let tomorrowPart = util.getNextPart(currentPart, plan);

    if (isPunchedToday) {
      todayPart = punchRecords[todayKey].part;
      tomorrowPart = util.getNextPart(todayPart, plan);
    }

    // 计算连续打卡天数和段位
    const { currentStreak, longestStreak } = util.calculateStreakDays(punchRecords);

    // 检查明天是否建议休息
    const shouldRest = util.shouldRestTomorrow(punchRecords, plan, isPunchedToday, currentStreak);
    if (shouldRest) {
      tomorrowPart = '建议休息';
    }

    // 计划描述
    const planDescription = plan === 'fiveSplit'
      ? '胸 → 背 → 肩 → 臂 → 腿，每天一个部位循环'
      : plan === 'threeSplit'
      ? '推（胸+肩+三头） → 拉（背+二头） → 腿，每天一个组合部位循环'
      : '完全自主选择训练部位，灵活安排训练计划';

    const userRank = util.calculateRank(currentStreak);

    // 计算统计数据
    const partStats = util.calculatePartStats(punchRecords);
    const totalPunchDays = Object.keys(punchRecords).length;
    const monthlyStats = util.calculateMonthlyStats(punchRecords, date.getFullYear(), date.getMonth() + 1);
    const frequencyStats = util.calculateFrequencyStats(punchRecords);
    const planExecutionStats = util.calculatePlanExecutionStats(punchRecords);

    // 计算部位统计的显示宽度
    const partStatsWithWidth = {};
    if (totalPunchDays > 0) {
      Object.keys(partStats).forEach(part => {
        const count = partStats[part];
        const width = Math.min((count / totalPunchDays) * 200, 200);
        partStatsWithWidth[part] = {
          count: count,
          width: Math.round(width)
        };
      });
    }

    // 获取睡眠记录数量
    const sleepRecords = wx.getStorageSync('sleepRecords') || [];
    const sleepRecordsCount = sleepRecords.length;

    // 计算进度
    const progressPercent = util.calculateProgress(punchRecords, plan, currentStreak, partStats);

    // 热力图数据
    const heatmapYear = date.getFullYear();
    const heatmapMonth = date.getMonth() + 1;
    const heatmapMonthText = `${heatmapYear}年${heatmapMonth}月`;
    const heatmapData = util.generateHeatmapData(punchRecords, heatmapYear, heatmapMonth);

    // 成就数据
    const achievementStats = {
      currentStreak,
      totalPunchDays,
      partStats: partStats,
      monthlyStats,
      planExecutionStats
    };
    const achievementResult = util.getAchievementProgress(punchRecords, achievementStats);
    const achievementProgress = {
      unlocked: achievementResult.unlocked,
      total: achievementResult.total,
      progress: achievementResult.progress
    };
    const recentAchievements = achievementResult.newlyUnlocked || [];
    const allAchievements = achievementResult.achievements || [];

    // 一次性更新所有数据
    this.setData({
      currentDate,
      planName,
      todayPart,
      tomorrowPart,
      isPunchedToday,
      punchTime,
      planDescription,
      progressPercent,
      currentStreak,
      longestStreak,
      userRank,
      heatmapYear,
      heatmapMonth,
      heatmapData,
      heatmapMonthText,
      statsPanel: {
        totalPunchDays,
        partStats: partStatsWithWidth,
        monthlyStats,
        frequencyStats,
        planExecutionStats
      },
      sleepRecordsCount,
      achievementProgress,
      recentAchievements,
      allAchievements,
      loading: false
    });
  },

  /**
   * 重复上次打卡部位
   */
  repeatLastPart: function () {
    if (!this.data.lastPunchPart) {
      wx.showToast({
        title: '暂无历史打卡记录',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      selectedPart: this.data.lastPunchPart
    });
  },

  /**
   * 打卡按钮点击事件
   */
  onPunch: function () {
    if (this.data.isPunchedToday) {
      return;
    }

    const plan = wx.getStorageSync('trainingPlan') || 'fiveSplit';

    // 自定义计划需要选择部位
    if (plan === 'customPlan') {
      this.setData({
        showPartSelector: true,
        selectedPart: ''  // 重置选择
      });
      return;
    }

    // 原有计划直接打卡
    this.performPunch(this.data.todayPart);
  },

  /**
   * 执行打卡
   * @param {string} part 训练部位
   */
  performPunch: function (part) {
    // 记录打卡时间
    const now = new Date();
    const punchTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 获取打卡记录
    const punchRecords = wx.getStorageSync('punchRecords') || {};
    const todayKey = util.getDateKey();

    // 检查今日是否已打卡，防止重复覆盖
    if (punchRecords[todayKey]) {
      wx.showToast({
        title: '今日已打卡',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    // 更新打卡记录
    punchRecords[todayKey] = {
      time: punchTime,
      part: part,
      plan: wx.getStorageSync('trainingPlan'),
    };
    wx.setStorageSync('punchRecords', punchRecords);

    // 注意：不再在打卡时更新currentPart，而是在updatePageData中根据日期智能更新

    // 显示打卡成功提示
    wx.showToast({
      title: '打卡成功！',
      icon: 'success',
      duration: 1500,
    });

    // 延迟更新页面数据，让用户看到动画效果
    setTimeout(() => {
      this.updatePageData();
    }, 1500);
  },

  /**
   * 显示部位选择器
   */
  showPartSelector: function () {
    this.setData({
      showPartSelector: true,
      selectedPart: ''
    });
  },

  /**
   * 选择训练部位
   */
  selectPart: function (e) {
    const part = e.currentTarget.dataset.part;
    this.setData({
      selectedPart: part
    });
  },

  /**
   * 确认自定义计划打卡
   */
  confirmCustomPunch: function () {
    if (!this.data.selectedPart) {
      wx.showToast({
        title: '请先选择训练部位',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      showPartSelector: false
    });

    // 执行打卡
    this.performPunch(this.data.selectedPart);
  },

  /**
   * 取消部位选择
   */
  cancelPartSelection: function () {
    this.setData({
      showPartSelector: false,
      selectedPart: ''
    });
  },

  /**
   * 切换到计划页面
   */
  switchToPlanPage: function () {
    // 防止快速重复点击
    if (this.data.switchingPage) {
      return;
    }

    // 设置切换状态，防止重复点击
    this.setData({
      switchingPage: true
    });

    // 立即跳转到计划页面
    wx.switchTab({
      url: '/pages/plan/plan',
      success: () => {
        // 跳转成功后重置状态
        setTimeout(() => {
          this.setData({
            switchingPage: false
          });
        }, 500);
      },
      fail: () => {
        // 跳转失败时也重置状态
        this.setData({
          switchingPage: false
        });
      }
    });
  },

  /**
   * 切换到睡眠记录页面
   */
  switchToSleepPage: function () {
    // 防止快速重复点击
    if (this.data.switchingPage) {
      return;
    }

    // 设置切换状态，防止重复点击
    this.setData({
      switchingPage: true
    });

    // 立即跳转到睡眠记录页面
    wx.switchTab({
      url: '/pages/sleep/sleep',
      success: () => {
        // 跳转成功后重置状态
        setTimeout(() => {
          this.setData({
            switchingPage: false
          });
        }, 500);
      },
      fail: () => {
        // 跳转失败时也重置状态
        this.setData({
          switchingPage: false
        });
      }
    });
  },

  /**
   * 切换到上一个月
   */
  prevMonth: function () {
    let { heatmapYear, heatmapMonth } = this.data;

    heatmapMonth--;
    if (heatmapMonth < 1) {
      heatmapMonth = 12;
      heatmapYear--;
    }

    this.setData({
      heatmapYear,
      heatmapMonth,
    }, () => {
      // 更新热力图数据
      this.updateHeatmapData();
    });
  },

  /**
   * 切换到下一个月
   */
  nextMonth: function () {
    let { heatmapYear, heatmapMonth } = this.data;

    heatmapMonth++;
    if (heatmapMonth > 12) {
      heatmapMonth = 1;
      heatmapYear++;
    }

    this.setData({
      heatmapYear,
      heatmapMonth,
    }, () => {
      // 更新热力图数据
      this.updateHeatmapData();
    });
  },

  /**
   * 更新热力图数据（不更新其他数据）
   */
  updateHeatmapData: function () {
    const punchRecords = wx.getStorageSync('punchRecords') || {};
    const { heatmapYear, heatmapMonth } = this.data;

    const heatmapData = util.generateHeatmapData(punchRecords, heatmapYear, heatmapMonth);
    const heatmapMonthText = `${heatmapYear}年${heatmapMonth}月`;

    this.setData({
      heatmapData,
      heatmapMonthText,
    });
  },

  /**
   * 点击热力图日期
   */
  onDayTap: function (e) {
    const date = e.currentTarget.dataset.date;
    if (!date) {
      return; // 空白格没有点击效果
    }

    const punchRecords = wx.getStorageSync('punchRecords') || {};
    const punchInfo = punchRecords[date];

    if (punchInfo) {
      wx.showModal({
        title: `${date}打卡详情`,
        content: `时间：${punchInfo.time}\n部位：${punchInfo.part}\n计划：${punchInfo.plan === 'fiveSplit' ? '五分化' : punchInfo.plan === 'threeSplit' ? '三分化' : '自主计划'}`,
        showCancel: false,
        confirmText: '知道了',
      });
    } else {
      wx.showToast({
        title: '这天没有打卡',
        icon: 'none',
        duration: 1500,
      });
    }
  },

  /**
   * 显示成就系统浮窗
   */
  showAchievementModal: function () {
    this.setData({
      showAchievementModal: true
    });
  },

  /**
   * 显示新解锁的成就提示
   * @param {Array} newlyUnlocked 新解锁的成就列表
   */
  showNewAchievements: function (newlyUnlocked) {
    if (!newlyUnlocked || newlyUnlocked.length === 0) {
      return;
    }

    // 逐个显示成就解锁提示，每次间隔800ms
    newlyUnlocked.forEach((achievement, index) => {
      setTimeout(() => {
        wx.showToast({
          title: `成就解锁：${achievement.name}`,
          icon: 'success',
          duration: 2000,
        });
      }, index * 800);
    });
  },

  /**
   * 隐藏成就系统浮窗
   */
  hideAchievementModal: function () {
    this.setData({
      showAchievementModal: false
    });
  },

  /**
   * 阻止事件冒泡（用于浮窗内部点击不关闭浮窗）
   */
  stopPropagation: function (e) {
    // 阻止事件冒泡，防止点击浮窗内容时关闭浮窗
    // 微信小程序中不需要显式调用stopPropagation，catchtap会自动阻止冒泡
    // 这个函数可以保持为空或用于其他目的
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '健身打卡小程序',
      path: '/pages/index/index',
    };
  },

});