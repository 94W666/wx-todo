// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const teamsCollection = db.collection('teams')

// 生成随机邀请码（6位数字字母组合）
function generateInviteCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 检查用户是否已经加入或创建了团队
    const existingTeam = await teamsCollection
      .where({
        $or: [
          { creatorOpenId: openid },
          { partnerOpenId: openid }
        ]
      })
      .get()

    if (existingTeam.data.length > 0) {
      return {
        code: 400,
        message: '您已经加入或创建了团队，无法创建新团队',
        data: null
      }
    }

    // 生成唯一的邀请码
    let inviteCode
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      inviteCode = generateInviteCode()
      const existing = await teamsCollection
        .where({ teamCode: inviteCode })
        .get()

      if (existing.data.length === 0) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return {
        code: 500,
        message: '生成邀请码失败，请重试',
        data: null
      }
    }

    // 创建团队
    const teamData = {
      creatorOpenId: openid,
      partnerOpenId: null,
      teamCode: inviteCode,
      status: 'waiting', // waiting: 等待加入, active: 已激活
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }

    const result = await teamsCollection.add({
      data: teamData
    })

    return {
      code: 200,
      message: '团队创建成功',
      data: {
        teamId: result._id,
        teamCode: inviteCode,
        status: 'waiting'
      }
    }
  } catch (error) {
    console.error('创建团队失败:', error)
    return {
      code: 500,
      message: '创建团队失败，请稍后重试',
      data: null
    }
  }
}