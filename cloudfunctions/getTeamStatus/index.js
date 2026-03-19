// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const teamsCollection = db.collection('teams')
const teamPunchRecordsCollection = db.collection('teamPunchRecords')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查找用户所在的团队
    const teamResult = await teamsCollection
      .where({
        $or: [
          { creatorOpenId: openid },
          { partnerOpenId: openid }
        ]
      })
      .get()

    if (teamResult.data.length === 0) {
      return {
        code: 200,
        message: '未加入任何团队',
        data: {
          hasTeam: false,
          teamInfo: null,
          todayPunch: null,
          teamPunchRecords: [],
          currentUserOpenId: openid
        }
      }
    }

    const team = teamResult.data[0]
    const teamId = team._id

    // 获取今天的日期
    const today = new Date()
    const todayDate = today.toISOString().split('T')[0]

    // 获取团队今天的打卡记录
    const todayPunchResult = await teamPunchRecordsCollection
      .where({
        teamId: teamId,
        date: todayDate
      })
      .get()

    // 获取最近7天的团队打卡记录
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoDate = sevenDaysAgo.toISOString().split('T')[0]

    const recentPunchResult = await teamPunchRecordsCollection
      .where({
        teamId: teamId,
        date: db.command.gte(sevenDaysAgoDate)
      })
      .orderBy('date', 'desc')
      .get()

    // 组织返回数据
    const teamInfo = {
      teamId: team._id,
      teamCode: team.teamCode,
      creatorOpenId: team.creatorOpenId,
      partnerOpenId: team.partnerOpenId,
      status: team.status,
      createdAt: team.createdAt
    }

    const todayPunch = {}
    todayPunchResult.data.forEach(record => {
      if (record.userOpenId === openid) {
        todayPunch.self = {
          punched: true,
          punchTime: record.punchTime,
          part: record.part
        }
      } else {
        todayPunch.partner = {
          punched: true,
          punchTime: record.punchTime,
          part: record.part
        }
      }
    })

    // 如果没有自己的打卡记录
    if (!todayPunch.self) {
      todayPunch.self = { punched: false }
    }

    // 如果没有队友的打卡记录
    if (!todayPunch.partner) {
      const partnerOpenId = team.creatorOpenId === openid ? team.partnerOpenId : team.creatorOpenId
      todayPunch.partner = {
        punched: false,
        partnerOpenId: partnerOpenId
      }
    }

    // 格式化最近7天的打卡记录
    const teamPunchRecords = recentPunchResult.data.map(record => ({
      date: record.date,
      userOpenId: record.userOpenId,
      punchTime: record.punchTime,
      part: record.part,
      plan: record.plan
    }))

    return {
      code: 200,
      message: '获取团队状态成功',
      data: {
        hasTeam: true,
        teamInfo: teamInfo,
        todayPunch: todayPunch,
        teamPunchRecords: teamPunchRecords,
        currentUserOpenId: openid
      }
    }
  } catch (error) {
    console.error('获取团队状态失败:', error)
    return {
      code: 500,
      message: '获取团队状态失败，请稍后重试',
      data: null
    }
  }
}