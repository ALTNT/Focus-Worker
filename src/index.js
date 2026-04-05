import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
// @ts-expect-error
import manifest from '__STATIC_CONTENT_MANIFEST'
import { sign, verify } from 'hono/jwt'

const app = new Hono()

const JWT_SECRET = 'phd-tracker-secret-key-2024'

// Middleware: protect /api/data/* routes via Bearer token
app.use('/api/data/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  console.log('Middleware Auth Header:', auth ? 'Found' : 'Missing')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  try {
    const payload = await verify(token, JWT_SECRET, 'HS256')
    console.log('Token Verified for:', payload.username)
    c.set('username', payload.username)
    await next()
  } catch (err) {
    console.error('JWT Verify Error:', err.message)
    return c.json({ error: 'Unauthorized' }, 401)
  }
})

// Hashing helper
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function checkRateLimit(c, key, limit = 5) {
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  const fullKey = `rate:${key}:${ip}`
  const count = await c.env.DB.get(fullKey)
  const currentCount = count ? parseInt(count) : 0
  if (currentCount >= limit) return true
  // Minimum expirationTtl is 60 seconds
  await c.env.DB.put(fullKey, (currentCount + 1).toString(), { expirationTtl: 60 })
  return false
}

const REG_CODE = 'ST-2026'

app.post('/api/register', async (c) => {
  const { username: rawUsername, password, role, regCode } = await c.req.json()
  const username = rawUsername?.toLowerCase().trim()
  const validRoles = ['master', 'phd']

  // Rate Limit check
  if (await checkRateLimit(c, 'register', 3)) return c.json({ error: '请求太频繁，请1分钟后再试' }, 429)

  if (!username || !password) return c.json({ error: '请填写用户名和密码' }, 400)
  if (username.length < 3) return c.json({ error: '用户名至少3个字符' }, 400)
  if (password.length < 8) return c.json({ error: '密码至少8位' }, 400)
  if (!validRoles.includes(role)) return c.json({ error: '请选择有效的身份' }, 400)
  if (regCode !== REG_CODE) return c.json({ error: '邀请码错误' }, 400)

  const db = c.env.DB
  const existingUser = await db.get(`user:${username}`)
  if (existingUser) return c.json({ error: '该用户名已存在' }, 400)

  const hashedPassword = await hashPassword(password)
  await db.put(`user:${username}`, JSON.stringify({ password: hashedPassword, role }))

  const token = await sign(
    { username, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    JWT_SECRET,
    'HS256'
  )
  return c.json({ success: true, username, role, token })
})

app.post('/api/login', async (c) => {
  const { username: rawUsername, password } = await c.req.json()
  const username = rawUsername?.toLowerCase().trim()
  if (!username || !password) return c.json({ error: '请填写用户名和密码' }, 400)

  // Rate Limit check (5 login attempts per min)
  if (await checkRateLimit(c, 'login', 5)) return c.json({ error: '登录请求太频繁，请稍后重试' }, 429)

  const db = c.env.DB
  const userDataStr = await db.get(`user:${username}`)
  if (!userDataStr) return c.json({ error: '用户不存在' }, 400)

  const userData = JSON.parse(userDataStr)
  const hashedPassword = await hashPassword(password)

  if (userData.password !== hashedPassword) {
    return c.json({ error: '密码错误' }, 400)
  }

  const role = userData.role || 'phd' // Default for legacy users

  const token = await sign(
    { username, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    JWT_SECRET,
    'HS256'
  )
  return c.json({ success: true, username, role, token })
})

// Verify token (used on page reload)
app.post('/api/verify', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ authenticated: false })
  }
  try {
    const payload = await verify(auth.slice(7), JWT_SECRET, 'HS256')
    return c.json({ authenticated: true, username: payload.username, role: payload.role || 'phd' })
  } catch {
    return c.json({ authenticated: false })
  }
})

// Data API
app.get('/api/data/:key', async (c) => {
  const username = c.get('username')
  const key = c.req.param('key')
  const data = await c.env.DB.get(`data:${username}:${key}`)
  return c.json(data ? JSON.parse(data) : null)
})

app.post('/api/data/:key', async (c) => {
  const username = c.get('username')
  const key = c.req.param('key')
  const data = await c.req.json()
  await c.env.DB.put(`data:${username}:${key}`, JSON.stringify(data))
  return c.json({ success: true })
})

// Serve index.html for root "/"
app.get('/', serveStatic({ path: './index.html', manifest }))

// Serve all other static assets
app.get('/*', serveStatic({ root: './', manifest }))

export default app
