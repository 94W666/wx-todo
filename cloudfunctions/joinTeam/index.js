// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const teamsCollection = db.collection('teams')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { teamCode } = event

  if (!teamCode) {
    return {
      code: 400,
      message: '邀请码不能为空',
      data: null
    }
  }

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
        message: '您已经加入或创建了团队，无法加入新团队',
        data: null
      }
    }

    // 查找对应的团队
    const teamResult = await teamsCollection
      .where({
        teamCode: teamCode,
        status: 'waiting'
      })
      .get()

    if (teamResult.data.length === 0) {
      return {
        code: 404,
        message: '邀请码无效或团队已满',
        data: null
      }
    }

    const team = teamResult.data[0]

    // 检查不能加入自己创建的团队
    if (team.creatorOpenId === openid) {
      return {
        code: 400,
        message: '不能加入自己创建的团队',
        data: null
      }
    }

    // 更新团队信息
    await teamsCollection.doc(team._id).update({
      data: {
        partnerOpenId: openid,
        status: 'active',
        updatedAt: db.serverDate()
      }
    })

    return {
      code: 200,
      message: '加入团队成功',
      data: {
        teamId: team._id,
        teamCode: team.teamCode,
        creatorOpenId: team.creatorOpenId,
        status: 'active'
      }
    }
  } catch (error) {
    console.error('加入团队失败:', error)
    return {
      code: 500,
      message: '加入团队失败，请稍后重试',
      data: null
    }
  }
}