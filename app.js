// app.js - 小程序入口文件

App({
  onLaunch: function () {
    // 小程序启动时执行
    console.log('小程序启动');

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

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // 注意：需要在小程序后台创建云环境，并将env替换为实际环境ID
      wx.cloud.init({
        env: 'cloudbase-7gauy2cq0b783d66', // 你的云环境ID
        traceUser: true,
      });
    }
  },

  globalData: {
    userInfo: null
  }
});