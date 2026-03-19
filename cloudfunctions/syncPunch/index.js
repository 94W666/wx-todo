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
  const { date, punchTime, part, plan } = event

  if (!date || !punchTime || !part || !plan) {
    return {
      code: 400,
      message: '打卡数据不完整',
      data: null
    }
  }

  try {
    // 查找用户所在的团队
    const teamResult = await teamsCollection
      .where({
        $or: [
          { creatorOpenId: openid },
          { partnerOpenId: openid }
        ],
        status: 'active'
      })
      .get()

    if (teamResult.data.length === 0) {
      return {
        code: 404,
        message: '您还没有加入任何团队',
        data: null
      }
    }

    const team = teamResult.data[0]
    const teamId = team._id

    // 检查今天是否已经有打卡记录
    const existingRecord = await teamPunchRecordsCollection
      .where({
        teamId: teamId,
        date: date,
        userOpenId: openid
      })
      .get()

    let result
    if (existingRecord.data.length > 0) {
      // 更新现有记录
      const recordId = existingRecord.data[0]._id
      result = await teamPunchRecordsCollection.doc(recordId).update({
        data: {
          punchTime: punchTime,
          part: part,
          plan: plan,
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 创建新记录
      result = await teamPunchRecordsCollection.add({
        data: {
          teamId: teamId,
          date: date,
          userOpenId: openid,
          punchTime: punchTime,
          part: part,
          plan: plan,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    }

    return {
      code: 200,
      message: '打卡同步成功',
      data: {
        teamId: teamId,
        date: date,
        punchTime: punchTime
      }
    }
  } catch (error) {
    console.error('同步打卡失败:', error)
    return {
      code: 500,
      message: '同步打卡失败，请稍后重试',
      data: null
    }
  }
}