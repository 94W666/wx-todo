// pages/sleep/sleep.js - 睡眠记录页逻辑

Page({
  /**
   * 页面的初始数据
   */
  data: {
    selectedDuration: null, // 选中的睡眠时长索引
    selectedFeeling: null, // 选中的体感索引
    isFormComplete: false, // 表单是否完整
    sleepRecords: [], // 睡眠记录列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadSleepRecords();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadSleepRecords();
  },

  /**
   * 加载睡眠记录
   */
  loadSleepRecords: function () {
    const records = wx.getStorageSync('sleepRecords') || [];

    // 只显示最近7天记录
    const recentRecords = records.slice(0, 7).map(record => {
      // 转换日期格式
      const date = new Date(record.date);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekday = this.getWeekday(date.getDay());

      // 获取时长文本
      const durationText = this.getDurationText(record.duration);

      // 获取体感文本和图标
      const feelingData = this.getFeelingData(record.feeling);

      return {
        ...record,
        date: `${month}月${day}日`,
        weekday: `周${weekday}`,
        durationText,
        feelingText: feelingData.text,
        feelingIcon: feelingData.icon,
      };
    }).reverse(); // 最新的在最上面

    this.setData({
      sleepRecords: recentRecords,
    });
  },

  /**
   * 获取星期几
   */
  getWeekday: function (day) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return weekdays[day];
  },

  /**
   * 获取睡眠时长文本
   */
  getDurationText: function (durationIndex) {
    const durations = ['5小时及以下', '6小时', '7小时', '8小时', '9小时及以上'];
    return durations[durationIndex] || '未知';
  },

  /**
   * 获取体感数据
   */
  getFeelingData: function (feelingIndex) {
    const feelings = [
      { text: '神清气爽', icon: '😊' },
      { text: '还算不错', icon: '🙂' },
      { text: '没睡够', icon: '😐' },
      { text: '噩梦连连', icon: '😨' },
    ];
    return feelings[feelingIndex] || { text: '未知', icon: '😶' };
  },

  /**
   * 选择睡眠时长
   */
  selectDuration: function (e) {
    const duration = parseInt(e.currentTarget.dataset.duration);
    this.setData({
      selectedDuration: duration,
    });
    this.checkFormComplete();
  },

  /**
   * 选择睡眠体感
   */
  selectFeeling: function (e) {
    const feeling = parseInt(e.currentTarget.dataset.feeling);
    this.setData({
      selectedFeeling: feeling,
    });
    this.checkFormComplete();
  },

  /**
   * 检查表单是否完整
   */
  checkFormComplete: function () {
    const { selectedDuration, selectedFeeling } = this.data;
    const isFormComplete = selectedDuration !== null && selectedFeeling !== null;
    this.setData({
      isFormComplete,
    });
  },

  /**
   * 保存睡眠记录
   */
  saveSleepRecord: function () {
    const { selectedDuration, selectedFeeling } = this.data;

    if (selectedDuration === null || selectedFeeling === null) {
      wx.showToast({
        title: '请选择时长和体感',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    // 创建记录对象
    const record = {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      duration: selectedDuration,
      feeling: selectedFeeling,
      timestamp: new Date().getTime(),
    };

    // 获取现有记录
    let records = wx.getStorageSync('sleepRecords') || [];

    // 检查今天是否已有记录
    const todayIndex = records.findIndex(r => r.date === record.date);
    if (todayIndex >= 0) {
      // 更新现有记录
      records[todayIndex] = record;
    } else {
      // 添加新记录
      records.push(record);
    }

    // 按日期排序（最新的在前）
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 保存到本地存储
    wx.setStorageSync('sleepRecords', records);

    // 显示成功提示
    wx.showToast({
      title: '记录成功',
      icon: 'success',
      duration: 2000,
    });

    // 重置表单
    setTimeout(() => {
      this.setData({
        selectedDuration: null,
        selectedFeeling: null,
        isFormComplete: false,
      });

      // 重新加载记录
      this.loadSleepRecords();
    }, 1500);
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '健身打卡 - 睡眠记录',
      path: '/pages/sleep/sleep',
    };
  },
});