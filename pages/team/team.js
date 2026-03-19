// pages/team/team.js - 组队页面逻辑

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 团队状态
    hasTeam: false,
    teamInfo: null,
    todayPunch: null,
    teamPunchRecords: [],
    currentUserOpenId: '',

    // 表单状态
    teamCode: '',
    showJoinForm: false,
    isLoading: false,

    // 页面状态
    activeTab: 'status', // status: 状态, records: 记录
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 如果有分享带来的邀请码，自动填充
    if (options.teamCode) {
      this.setData({
        teamCode: options.teamCode,
        showJoinForm: true
      });
    }

    this.loadTeamStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadTeamStatus();
  },

  /**
   * 加载团队状态
   */
  loadTeamStatus: function () {
    this.setData({ isLoading: true });

    wx.cloud.callFunction({
      name: 'getTeamStatus',
      success: res => {
        const result = res.result;
        if (result.code === 200) {
          this.setData({
            hasTeam: result.data.hasTeam,
            teamInfo: result.data.teamInfo,
            todayPunch: result.data.todayPunch,
            teamPunchRecords: result.data.teamPunchRecords,
            currentUserOpenId: result.data.currentUserOpenId,
            isLoading: false
          });

          // 如果有团队，将团队信息保存到本地存储
          if (result.data.hasTeam) {
            wx.setStorageSync('currentTeam', result.data.teamInfo);
          } else {
            wx.removeStorageSync('currentTeam');
          }
        } else {
          wx.showToast({
            title: result.message || '获取团队状态失败',
            icon: 'none',
            duration: 2000
          });
          this.setData({ isLoading: false });
        }
      },
      fail: err => {
        console.error('调用云函数失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
        this.setData({ isLoading: false });
      }
    });
  },

  /**
   * 创建团队
   */
  createTeam: function () {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    wx.showLoading({
      title: '创建中...',
      mask: true
    });

    wx.cloud.callFunction({
      name: 'createTeam',
      success: res => {
        wx.hideLoading();
        const result = res.result;
        if (result.code === 200) {
          wx.showToast({
            title: '团队创建成功',
            icon: 'success',
            duration: 2000
          });

          // 重新加载团队状态
          setTimeout(() => {
            this.loadTeamStatus();
          }, 1500);
        } else {
          wx.showToast({
            title: result.message || '创建失败',
            icon: 'none',
            duration: 2000
          });
          this.setData({ isLoading: false });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('调用云函数失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
        this.setData({ isLoading: false });
      }
    });
  },

  /**
   * 显示加入表单
   */
  showJoinForm: function () {
    this.setData({
      showJoinForm: true
    });
  },

  /**
   * 隐藏加入表单
   */
  hideJoinForm: function () {
    this.setData({
      showJoinForm: false,
      teamCode: ''
    });
  },

  /**
   * 输入邀请码
   */
  onTeamCodeInput: function (e) {
    this.setData({
      teamCode: e.detail.value.toUpperCase()
    });
  },

  /**
   * 加入团队
   */
  joinTeam: function () {
    const teamCode = this.data.teamCode.trim();

    if (!teamCode) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (teamCode.length !== 6) {
      wx.showToast({
        title: '邀请码应为6位',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    wx.showLoading({
      title: '加入中...',
      mask: true
    });

    wx.cloud.callFunction({
      name: 'joinTeam',
      data: {
        teamCode: teamCode
      },
      success: res => {
        wx.hideLoading();
        const result = res.result;
        if (result.code === 200) {
          wx.showToast({
            title: '加入团队成功',
            icon: 'success',
            duration: 2000
          });

          // 重置表单并重新加载团队状态
          this.setData({
            showJoinForm: false,
            teamCode: ''
          });

          setTimeout(() => {
            this.loadTeamStatus();
          }, 1500);
        } else {
          wx.showToast({
            title: result.message || '加入失败',
            icon: 'none',
            duration: 2000
          });
          this.setData({ isLoading: false });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('调用云函数失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
        this.setData({ isLoading: false });
      }
    });
  },

  /**
   * 切换标签页
   */
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  /**
   * 复制邀请码
   */
  copyInviteCode: function () {
    if (!this.data.hasTeam || !this.data.teamInfo) return;

    const teamCode = this.data.teamInfo.teamCode;
    wx.setClipboardData({
      data: teamCode,
      success: () => {
        wx.showToast({
          title: '邀请码已复制',
          icon: 'success',
          duration: 2000
        });
      }
    });
  },

  /**
   * 分享团队
   */
  shareTeam: function () {
    if (!this.data.hasTeam || !this.data.teamInfo) return;

    const teamCode = this.data.teamInfo.teamCode;
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  /**
   * 退出团队
   */
  leaveTeam: function () {
    if (!this.data.hasTeam) return;

    wx.showModal({
      title: '退出团队确认',
      content: '退出后需要重新加入或创建团队才能使用组队功能',
      confirmColor: '#fa541c',
      success: res => {
        if (res.confirm) {
          // 这里应该调用云函数退出团队
          // 暂时先清除本地团队状态
          wx.removeStorageSync('currentTeam');
          this.setData({
            hasTeam: false,
            teamInfo: null,
            todayPunch: null,
            teamPunchRecords: []
          });

          wx.showToast({
            title: '已退出团队',
            icon: 'success',
            duration: 2000
          });
        }
      }
    });
  },

  /**
   * 获取星期几
   */
  getWeekday: function (dateStr) {
    const date = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `周${weekdays[date.getDay()]}`;
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    if (this.data.hasTeam && this.data.teamInfo) {
      return {
        title: '和我一起健身打卡吧！',
        path: `/pages/team/team?teamCode=${this.data.teamInfo.teamCode}`,
        imageUrl: '/images/share-team.jpg'
      };
    } else {
      return {
        title: '健身打卡 - 组队功能',
        path: '/pages/team/team'
      };
    }
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline: function () {
    if (this.data.hasTeam && this.data.teamInfo) {
      return {
        title: '和我一起健身打卡吧！',
        query: `teamCode=${this.data.teamInfo.teamCode}`,
        imageUrl: '/images/share-team.jpg'
      };
    } else {
      return {
        title: '健身打卡 - 组队功能'
      };
    }
  }
});