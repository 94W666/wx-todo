// app.js - 小程序入口文件

App({
  onLaunch: function () {
    // 小程序启动时执行

    // 检查本地缓存中是否有训练计划，如果没有则默认使用五分化
    const plan = wx.getStorageSync('trainingPlan');
    if (!plan) {
      wx.setStorageSync('trainingPlan', 'fiveSplit'); // 默认五分化
    }

    // 检查是否有当前训练部位，如果没有则初始化
    const currentPart = wx.getStorageSync('currentPart');
    if (!currentPart) {
      wx.setStorageSync('currentPart', '胸'); // 默认从胸开始
    }

    // 检查是否有打卡记录，如果没有则初始化
    const punchRecords = wx.getStorageSync('punchRecords');
    if (!punchRecords) {
      wx.setStorageSync('punchRecords', {});
    }

    // 检查是否有睡眠记录，如果没有则初始化
    const sleepRecords = wx.getStorageSync('sleepRecords');
    if (!sleepRecords) {
      wx.setStorageSync('sleepRecords', []);
    }

    // 检查是否有用户统计数据，如果没有则初始化
    const userStats = wx.getStorageSync('userStats');
    if (!userStats) {
      wx.setStorageSync('userStats', {
        currentStreak: 0,
        longestStreak: 0,
        totalPunches: 0,
        lastRankUpdateDate: '',
        rankHistory: []
      });
    }

  },

  globalData: {
    userInfo: null
  }
});