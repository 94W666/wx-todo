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
   * 更新页面数据
   */
  updatePageData: function () {
    // 获取当前日期
    const date = new Date();
    const currentDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

    // 获取训练计划和打卡记录
    const plan = wx.getStorageSync('trainingPlan') || 'fiveSplit';
    const planName = plan === 'fiveSplit' ? '五分化训练' : '三分化训练';
    const punchRecords = wx.getStorageSync('punchRecords') || {};
    const todayKey = util.getDateKey();
    const isPunchedToday = !!punchRecords[todayKey];
    const punchTime = isPunchedToday ? punchRecords[todayKey].time : '';

    // 智能获取当前训练部位
    const currentPart = util.getCurrentPart(punchRecords, plan);

    // 计算今日和明日部位
    let todayPart = currentPart;
    let tomorrowPart = util.getNextPart(currentPart, plan);

    // 如果今天已打卡，今日部位使用打卡记录中的部位（与currentPart一致），明日部位是今日部位的下一个部位
    if (isPunchedToday) {
      todayPart = punchRecords[todayKey].part;
      tomorrowPart = util.getNextPart(todayPart, plan);
    }

    // 计划描述
    const planDescription = plan === 'fiveSplit'
      ? '胸 → 背 → 肩 → 臂 → 腿，每天一个部位循环'
      : '推（胸+肩+三头） → 拉（背+二头） → 腿，每天一个组合部位循环';

    // 计算训练进度
    const progressPercent = util.calculateProgress(punchRecords, plan);

    this.setData({
      currentDate,
      planName,
      todayPart,
      tomorrowPart,
      isPunchedToday,
      punchTime,
      planDescription,
      progressPercent,
    });
  },


  /**
   * 打卡按钮点击事件
   */
  onPunch: function () {
    if (this.data.isPunchedToday) {
      return;
    }

    // 记录打卡时间
    const now = new Date();
    const punchTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 获取打卡记录
    const punchRecords = wx.getStorageSync('punchRecords') || {};
    const todayKey = util.getDateKey();

    // 更新打卡记录
    punchRecords[todayKey] = {
      time: punchTime,
      part: this.data.todayPart,
      plan: wx.getStorageSync('trainingPlan'),
    };
    wx.setStorageSync('punchRecords', punchRecords);

    // 注意：不再在打卡时更新currentPart，而是在updatePageData中根据日期智能更新

    // 同步到云端（如果用户有团队）
    this.syncPunchToCloud(todayKey, punchTime);

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
   * 同步打卡记录到云端
   */
  syncPunchToCloud: function (dateKey, punchTime) {
    // 检查是否有团队
    const currentTeam = wx.getStorageSync('currentTeam');
    if (!currentTeam) {
      return; // 没有团队，不需要同步
    }

    // 调用云函数同步打卡
    wx.cloud.callFunction({
      name: 'syncPunch',
      data: {
        date: dateKey,
        punchTime: punchTime,
        part: this.data.todayPart,
        plan: wx.getStorageSync('trainingPlan')
      },
      success: res => {
        console.log('打卡同步成功:', res);
      },
      fail: err => {
        console.error('打卡同步失败:', err);
        // 失败不影响本地打卡，只记录错误
      }
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
   * 切换到组队页面
   */
  switchToTeamPage: function () {
    // 防止快速重复点击
    if (this.data.switchingPage) {
      return;
    }

    // 设置切换状态，防止重复点击
    this.setData({
      switchingPage: true
    });

    // 跳转到组队页面（非tabBar页面，使用navigateTo）
    wx.navigateTo({
      url: '/pages/team/team',
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
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '健身打卡小程序',
      path: '/pages/index/index',
    };
  },
});