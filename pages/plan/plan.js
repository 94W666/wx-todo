// pages/plan/plan.js - 训练计划选择页逻辑

const util = require('../../utils/util.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    selectedPlan: '', // 用户选择的计划
    currentPlan: '', // 当前计划
    currentPlanName: '', // 当前计划名称
    currentPart: '', // 当前训练部位
    nextPart: '', // 下一个训练部位
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadCurrentPlan();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadCurrentPlan();
  },

  /**
   * 加载当前计划信息
   */
  loadCurrentPlan: function () {
    const plan = wx.getStorageSync('trainingPlan') || 'fiveSplit';
    const punchRecords = wx.getStorageSync('punchRecords') || {};
    const currentPart = util.getCurrentPart(punchRecords, plan);
    const nextPart = util.getNextPart(currentPart, plan);

    const planName = util.getPlanName(plan);

    this.setData({
      currentPlan: plan,
      currentPlanName: planName,
      currentPart: currentPart,
      nextPart: nextPart,
      selectedPlan: plan, // 默认选中当前计划
    });
  },

  /**
   * 选择计划
   */
  selectPlan: function (e) {
    const plan = e.currentTarget.dataset.plan;
    this.setData({
      selectedPlan: plan,
    });
  },

  /**
   * 确认选择计划
   */
  confirmPlan: function () {
    const { selectedPlan, currentPlan } = this.data;

    if (!selectedPlan) {
      wx.showToast({
        title: '请先选择计划',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    if (selectedPlan === currentPlan) {
      wx.showToast({
        title: '当前已是该计划',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    // 直接切换计划
    this.switchTrainingPlan(selectedPlan);
  },

  /**
   * 切换训练计划
   */
  switchTrainingPlan: function (plan) {
    // 保存新计划
    wx.setStorageSync('trainingPlan', plan);

    // 重置训练部位（自定义计划不需要设置固定部位）
    let firstPart = '胸';
    if (plan === 'threeSplit') {
      firstPart = '推';
    } else if (plan === 'customPlan') {
      firstPart = ''; // 自主计划不设置默认部位
    }
    wx.setStorageSync('currentPart', firstPart);

    // 保留打卡记录，只切换计划

    // 显示成功提示
    wx.showToast({
      title: '计划切换成功',
      icon: 'success',
      duration: 2000,
    });

    // 立即更新页面数据
    this.loadCurrentPlan();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '健身打卡 - 训练计划',
      path: '/pages/plan/plan',
    };
  },
});