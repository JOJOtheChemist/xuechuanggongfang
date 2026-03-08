const authUtils = require('auth-utils')

const db = uniCloud.database()
const dbCmd = db.command

const COLLECTION_POSTS = 'forum_posts'
const COLLECTION_COMMENTS = 'forum_comments'
const COLLECTION_LIKES = 'forum_post_likes'
const COLLECTION_USERS = 'uni-id-users'
const COLLECTION_SCHOOLS = 'forum_schools'

const DEFAULT_SCHOOL = '神秘学校'
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 30

function toSafeText(value) {
  return String(value || '').trim()
}

function normalizeSchoolName(value) {
  const safe = toSafeText(value)
  if (!safe) return ''
  if (safe.toLowerCase() === 'campus' || safe === '其他') return DEFAULT_SCHOOL
  return safe
}

function normalizePage(value, fallback) {
  const num = Number(value)
  if (!Number.isInteger(num) || num <= 0) return fallback
  return num
}

function normalizePageSize(value) {
  const num = Number(value)
  if (!Number.isInteger(num) || num <= 0) return DEFAULT_PAGE_SIZE
  return Math.min(num, MAX_PAGE_SIZE)
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return []
  const list = []

  for (let i = 0; i < images.length; i += 1) {
    const item = toSafeText(images[i])
    if (!item) continue
    list.push(item)
    if (list.length >= 9) break
  }

  return list
}

function fallbackTitleFromContent(content) {
  const text = toSafeText(content).replace(/\s+/g, ' ')
  if (!text) return ''
  if (text.length <= 20) return text
  return `${text.slice(0, 20)}...`
}

function normalizeTitle(title, content) {
  const safeTitle = toSafeText(title).replace(/\s+/g, ' ')
  if (safeTitle) return safeTitle
  return fallbackTitleFromContent(content) || '未命名动态'
}

function buildDefaultAvatar(seed) {
  const safeSeed = encodeURIComponent(seed || 'campus-user')
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${safeSeed}`
}

function mapPost(doc, likedSet) {
  const liked = likedSet ? likedSet.has(doc._id) : false

  return {
    id: doc._id,
    user_id: doc.user_id || '',
    user_name: doc.user_name || 'Campus User',
    user_avatar: doc.user_avatar || buildDefaultAvatar(doc.user_id || doc._id),
    school: normalizeSchoolName(doc.school),
    title: normalizeTitle(doc.title, doc.content),
    content: doc.content || '',
    images: Array.isArray(doc.images) ? doc.images : [],
    like_count: Number(doc.like_count || 0),
    comment_count: Number(doc.comment_count || 0),
    view_count: Number(doc.view_count || 0),
    create_date: Number(doc.create_date || 0),
    update_date: Number(doc.update_date || 0),
    is_liked: liked
  }
}

function mapComment(doc) {
  return {
    id: doc._id,
    post_id: doc.post_id || '',
    user_id: doc.user_id || '',
    user_name: doc.user_name || 'Campus User',
    user_avatar: doc.user_avatar || buildDefaultAvatar(doc.user_id || doc._id),
    content: doc.content || '',
    create_date: Number(doc.create_date || 0)
  }
}

function requireLogin(currentUser) {
  if (!currentUser || !currentUser.uid) {
    throw new Error('please login first')
  }
  return currentUser
}

async function getUserSchool(uid) {
  if (!uid) return ''

  const userRes = await db.collection(COLLECTION_USERS)
    .doc(uid)
    .field({ profile: true })
    .get()

  const user = (userRes && userRes.data && userRes.data[0]) || {}
  const profile = user.profile || {}
  return normalizeSchoolName(profile.school)
}

async function getUserSnapshot(uid) {
  if (!uid) {
    return {
      user_name: 'Campus User',
      user_avatar: buildDefaultAvatar('campus-user'),
      school: ''
    }
  }

  const userRes = await db.collection(COLLECTION_USERS)
    .doc(uid)
    .field({ nickname: true, avatar: true, profile: true })
    .get()

  const user = (userRes && userRes.data && userRes.data[0]) || {}
  const profile = user.profile || {}

  return {
    user_name: toSafeText(user.nickname) || `User-${String(uid).slice(-6)}`,
    user_avatar: toSafeText(user.avatar) || buildDefaultAvatar(uid),
    school: normalizeSchoolName(profile.school)
  }
}

async function getSchoolOptions(limit = 200) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 200
  const [manualSchoolRes, postSchoolRes] = await Promise.all([
    db.collection(COLLECTION_SCHOOLS)
      .where({ status: 1 })
      .field({ name: true })
      .orderBy('create_date', 'desc')
      .limit(safeLimit)
      .get()
      .catch((error) => {
        console.warn('[forum-service][getSchoolOptions] load manual schools failed:', error)
        return { data: [] }
      }),
    db.collection(COLLECTION_POSTS)
      .where({ status: 1 })
      .field({ school: true })
      .orderBy('create_date', 'desc')
      .limit(safeLimit)
      .get()
  ])

  const dedup = []
  const set = new Set()
  const pushUniqueName = (value) => {
    const name = normalizeSchoolName(value)
    if (!name || set.has(name)) return
    set.add(name)
    dedup.push(name)
  }

  ;(manualSchoolRes.data || []).forEach(item => {
    pushUniqueName(item && item.name)
  })

  ;(postSchoolRes.data || []).forEach(item => {
    pushUniqueName(item && item.school)
  })

  pushUniqueName(DEFAULT_SCHOOL)

  return dedup
}

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token

    if (token) {
      const tokenData = authUtils.parseToken(token)
      if (tokenData && tokenData.uid) {
        this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
      }
      delete params._token
    }
  },

  async getSchoolList() {
    try {
      const schools = await getSchoolOptions()
      let currentSchool = ''

      if (this.currentUser && this.currentUser.uid) {
        currentSchool = await getUserSchool(this.currentUser.uid)
      }
      if (!currentSchool) {
        currentSchool = DEFAULT_SCHOOL
      }

      return {
        code: 0,
        message: 'ok',
        data: {
          current_school: currentSchool,
          school_options: schools
        }
      }
    } catch (error) {
      console.error('[forum-service][getSchoolList] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: {
          current_school: DEFAULT_SCHOOL,
          school_options: []
        }
      }
    }
  },

  async addSchool({ school = '' } = {}) {
    try {
      const safeSchool = normalizeSchoolName(school)
      if (!safeSchool) {
        throw new Error('school is required')
      }
      if (safeSchool.length > 50) {
        throw new Error('school is too long')
      }

      const existsRes = await db.collection(COLLECTION_SCHOOLS)
        .where({ name: safeSchool, status: 1 })
        .limit(1)
        .get()
        .catch((error) => {
          console.warn('[forum-service][addSchool] check school exists failed:', error)
          return { data: [] }
        })

      const exists = Array.isArray(existsRes.data) && existsRes.data.length > 0
      if (!exists) {
        const now = Date.now()
        await db.collection(COLLECTION_SCHOOLS).add({
          name: safeSchool,
          status: 1,
          create_date: now,
          update_date: now
        })
      }

      const schools = await getSchoolOptions()
      return {
        code: 0,
        message: exists ? 'school already exists' : 'created',
        data: {
          school: safeSchool,
          school_options: schools
        }
      }
    } catch (error) {
      console.error('[forum-service][addSchool] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: null
      }
    }
  },

  async deleteSchool({ school = '' } = {}) {
    try {
      const safeSchool = normalizeSchoolName(school)
      if (!safeSchool) {
        throw new Error('school is required')
      }
      if (safeSchool === DEFAULT_SCHOOL) {
        throw new Error('默认分类“神秘学校”不可删除')
      }

      const now = Date.now()

      await Promise.all([
        db.collection(COLLECTION_POSTS)
          .where({
            school: safeSchool === DEFAULT_SCHOOL ? dbCmd.in([DEFAULT_SCHOOL, 'Campus', '其他']) : safeSchool
          })
          .update({
            school: DEFAULT_SCHOOL,
            update_date: now
          }),
        db.collection(COLLECTION_SCHOOLS)
          .where({ name: safeSchool })
          .update({
            status: 0,
            update_date: now
          })
          .catch((error) => {
            console.warn('[forum-service][deleteSchool] update manual school failed:', error)
            return null
          })
      ])

      const schools = await getSchoolOptions()
      return {
        code: 0,
        message: 'deleted',
        data: {
          school: safeSchool,
          school_options: schools
        }
      }
    } catch (error) {
      console.error('[forum-service][deleteSchool] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: null
      }
    }
  },

  async getPostList({ tab = 'local', school = '', page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
    try {
      const safePage = normalizePage(page, 1)
      const safePageSize = normalizePageSize(pageSize)
      const safeTab = tab === 'hot' ? 'hot' : 'local'
      let targetSchool = normalizeSchoolName(school)

      if (!targetSchool && safeTab === 'local' && this.currentUser && this.currentUser.uid) {
        targetSchool = await getUserSchool(this.currentUser.uid)
      }
      if (!targetSchool && safeTab === 'local') {
        targetSchool = DEFAULT_SCHOOL
      }

      const where = {
        status: 1
      }

      if (safeTab === 'local' && targetSchool) {
        if (targetSchool === DEFAULT_SCHOOL) {
          where.school = dbCmd.in([DEFAULT_SCHOOL, 'Campus', '其他'])
        } else {
          where.school = targetSchool
        }
      }

      const postsColl = db.collection(COLLECTION_POSTS)
      const countRes = await postsColl.where(where).count()
      const total = Number((countRes && countRes.total) || 0)

      let query = postsColl.where(where)
      if (safeTab === 'hot') {
        query = query.orderBy('like_count', 'desc').orderBy('comment_count', 'desc').orderBy('create_date', 'desc')
      } else {
        query = query.orderBy('create_date', 'desc')
      }

      const postRes = await query
        .skip((safePage - 1) * safePageSize)
        .limit(safePageSize)
        .get()

      const list = Array.isArray(postRes.data) ? postRes.data : []
      const postIds = list.map(item => item._id)

      const likedSet = new Set()
      if (postIds.length > 0 && this.currentUser && this.currentUser.uid) {
        const likeRes = await db.collection(COLLECTION_LIKES)
          .where({
            user_id: this.currentUser.uid,
            post_id: dbCmd.in(postIds)
          })
          .field({ post_id: true })
          .get()

        ;(likeRes.data || []).forEach(item => {
          if (item && item.post_id) likedSet.add(item.post_id)
        })
      }

      const mappedList = list.map(item => mapPost(item, likedSet))
      const schools = await getSchoolOptions()

      return {
        code: 0,
        message: 'ok',
        data: {
          list: mappedList,
          total,
          page: safePage,
          pageSize: safePageSize,
          has_more: safePage * safePageSize < total,
          current_school: targetSchool,
          school_options: schools
        }
      }
    } catch (error) {
      console.error('[forum-service][getPostList] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: {
          list: [],
          total: 0,
          page: 1,
          pageSize: normalizePageSize(pageSize),
          has_more: false,
          current_school: DEFAULT_SCHOOL,
          school_options: []
        }
      }
    }
  },

  async getPostDetail({ postId } = {}) {
    try {
      const safePostId = toSafeText(postId)
      if (!safePostId) {
        throw new Error('postId is required')
      }

      const postRes = await db.collection(COLLECTION_POSTS).doc(safePostId).get()
      const post = postRes && postRes.data && postRes.data[0]

      if (!post || Number(post.status || 0) !== 1) {
        throw new Error('post not found')
      }

      let likedSet = null
      if (this.currentUser && this.currentUser.uid) {
        likedSet = new Set()
        const likeRes = await db.collection(COLLECTION_LIKES)
          .where({ post_id: safePostId, user_id: this.currentUser.uid })
          .limit(1)
          .get()

        if ((likeRes.data || []).length > 0) {
          likedSet.add(safePostId)
        }
      }

      // Ignore view increment failure so detail can still be returned.
      db.collection(COLLECTION_POSTS)
        .doc(safePostId)
        .update({
          view_count: dbCmd.inc(1),
          update_date: Date.now()
        })
        .catch((err) => {
          console.warn('[forum-service][getPostDetail] view increment failed:', err)
        })

      return {
        code: 0,
        message: 'ok',
        data: mapPost(post, likedSet)
      }
    } catch (error) {
      console.error('[forum-service][getPostDetail] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: null
      }
    }
  },

  async createPost({ title = '', content = '', images = [], school = '' } = {}) {
    try {
      const user = requireLogin(this.currentUser)
      const rawTitle = toSafeText(title).replace(/\s+/g, ' ')
      const safeContent = toSafeText(content)
      const safeImages = normalizeImages(images)
      const safeTitle = normalizeTitle(rawTitle, safeContent)

      if (!safeContent && safeImages.length === 0) {
        throw new Error('content or image is required')
      }
      if (rawTitle.length > 50) {
        throw new Error('title is too long')
      }
      if (safeContent.length > 1000) {
        throw new Error('content is too long')
      }

      const userProfile = await getUserSnapshot(user.uid)
      const targetSchool = normalizeSchoolName(school) || userProfile.school || DEFAULT_SCHOOL
      const now = Date.now()

      const addRes = await db.collection(COLLECTION_POSTS).add({
        user_id: user.uid,
        user_name: userProfile.user_name,
        user_avatar: userProfile.user_avatar,
        school: targetSchool,
        title: safeTitle,
        content: safeContent,
        images: safeImages,
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        status: 1,
        create_date: now,
        update_date: now
      })

      return {
        code: 0,
        message: 'created',
        data: {
          id: addRes.id,
          school: targetSchool
        }
      }
    } catch (error) {
      console.error('[forum-service][createPost] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: null
      }
    }
  },

  async toggleLike({ postId } = {}) {
    try {
      const user = requireLogin(this.currentUser)
      const safePostId = toSafeText(postId)
      if (!safePostId) throw new Error('postId is required')

      const postRes = await db.collection(COLLECTION_POSTS).doc(safePostId).get()
      const post = postRes && postRes.data && postRes.data[0]
      if (!post || Number(post.status || 0) !== 1) throw new Error('post not found')

      const likesColl = db.collection(COLLECTION_LIKES)
      const existingRes = await likesColl
        .where({ post_id: safePostId, user_id: user.uid })
        .limit(1)
        .get()

      const existing = (existingRes.data || [])[0]
      let liked = false

      if (existing && existing._id) {
        await likesColl.doc(existing._id).remove()
        await db.collection(COLLECTION_POSTS).doc(safePostId).update({
          like_count: dbCmd.inc(-1),
          update_date: Date.now()
        })
        liked = false
      } else {
        await likesColl.add({
          post_id: safePostId,
          user_id: user.uid,
          create_date: Date.now()
        })
        await db.collection(COLLECTION_POSTS).doc(safePostId).update({
          like_count: dbCmd.inc(1),
          update_date: Date.now()
        })
        liked = true
      }

      const latestRes = await db.collection(COLLECTION_POSTS)
        .doc(safePostId)
        .field({ like_count: true })
        .get()

      let likeCount = Number(((latestRes.data || [])[0] || {}).like_count || 0)
      if (likeCount < 0) {
        likeCount = 0
        await db.collection(COLLECTION_POSTS).doc(safePostId).update({ like_count: 0 })
      }

      return {
        code: 0,
        message: 'ok',
        data: {
          liked,
          like_count: likeCount
        }
      }
    } catch (error) {
      console.error('[forum-service][toggleLike] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: null
      }
    }
  },

  async getCommentList({ postId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
    try {
      const safePostId = toSafeText(postId)
      if (!safePostId) throw new Error('postId is required')

      const safePage = normalizePage(page, 1)
      const safePageSize = normalizePageSize(pageSize)

      const where = { post_id: safePostId }
      const commentsColl = db.collection(COLLECTION_COMMENTS)

      const countRes = await commentsColl.where(where).count()
      const total = Number((countRes && countRes.total) || 0)

      const commentRes = await commentsColl
        .where(where)
        .orderBy('create_date', 'desc')
        .skip((safePage - 1) * safePageSize)
        .limit(safePageSize)
        .get()

      const list = (commentRes.data || []).map(item => mapComment(item))

      return {
        code: 0,
        message: 'ok',
        data: {
          list,
          total,
          page: safePage,
          pageSize: safePageSize,
          has_more: safePage * safePageSize < total
        }
      }
    } catch (error) {
      console.error('[forum-service][getCommentList] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: {
          list: [],
          total: 0,
          page: 1,
          pageSize: normalizePageSize(pageSize),
          has_more: false
        }
      }
    }
  },

  async createComment({ postId, content = '' } = {}) {
    try {
      const user = requireLogin(this.currentUser)
      const safePostId = toSafeText(postId)
      if (!safePostId) throw new Error('postId is required')

      const safeContent = toSafeText(content)
      if (!safeContent) throw new Error('comment cannot be empty')
      if (safeContent.length > 300) throw new Error('comment is too long')

      const postRes = await db.collection(COLLECTION_POSTS).doc(safePostId).get()
      const post = postRes && postRes.data && postRes.data[0]
      if (!post || Number(post.status || 0) !== 1) throw new Error('post not found')

      const userProfile = await getUserSnapshot(user.uid)
      const now = Date.now()

      const addRes = await db.collection(COLLECTION_COMMENTS).add({
        post_id: safePostId,
        user_id: user.uid,
        user_name: userProfile.user_name,
        user_avatar: userProfile.user_avatar,
        content: safeContent,
        create_date: now
      })

      await db.collection(COLLECTION_POSTS).doc(safePostId).update({
        comment_count: dbCmd.inc(1),
        update_date: now
      })

      return {
        code: 0,
        message: 'created',
        data: {
          id: addRes.id,
          post_id: safePostId,
          user_id: user.uid,
          user_name: userProfile.user_name,
          user_avatar: userProfile.user_avatar,
          content: safeContent,
          create_date: now
        }
      }
    } catch (error) {
      console.error('[forum-service][createComment] failed:', error)
      return {
        code: -1,
        message: error.message || 'failed',
        data: null
      }
    }
  }
}
