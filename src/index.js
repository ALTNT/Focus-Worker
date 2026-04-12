import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
// @ts-expect-error
import manifest from '__STATIC_CONTENT_MANIFEST'
import { sign, verify } from 'hono/jwt'

const app = new Hono()

// No hardcoded secrets here. Use c.env.JWT_SECRET and c.env.REG_CODE.

// Middleware: protect /api/data/* and /api/user/* routes via Bearer token
const authMiddleware = async (c, next) => {
  const auth = c.req.header('Authorization')
  console.log('Middleware Auth Header:', auth ? 'Found' : 'Missing')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = auth.slice(7)
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    console.log('Token Verified for:', payload.username)
    c.set('username', payload.username)
    await next()
  } catch (err) {
    console.error('JWT Verify Error:', err.message)
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

app.use('/api/data/*', authMiddleware)
app.use('/api/user/*', authMiddleware)
app.use('/api/leaderboard/*', authMiddleware)

// Salting helper (username-based salt)
async function hashPassword(password, username) {
  const msgUint8 = new TextEncoder().encode(password + username)
  return await _sha256(msgUint8)
}

// Legacy helper (for migration)
async function hashUnsalted(password) {
  const msgUint8 = new TextEncoder().encode(password)
  return await _sha256(msgUint8)
}

// Low-level SHA-256
async function _sha256(uint8) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', uint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// AWS v4 Helper Functions
async function hmac(key, data) {
  const encoder = new TextEncoder();
  const k = typeof key === 'string' ? encoder.encode(key) : key;
  const d = typeof data === 'string' ? encoder.encode(data) : data;
  const cryptoKey = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, d);
}

async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmac('AWS4' + key, dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  const kSigning = await hmac(kService, 'aws4_request');
  return kSigning;
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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

// Invitation code logic now uses c.env.REG_CODE

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
  if (!c.env.REG_CODE || regCode !== c.env.REG_CODE) return c.json({ error: '邀请码错误或注册通道未开启' }, 400)

  const db = c.env.DB
  const existingUser = await db.get(`user:${username}`)
  if (existingUser) return c.json({ error: '该用户名已存在' }, 400)

  const hashedPassword = await hashPassword(password, username)
  await db.put(`user:${username}`, JSON.stringify({ password: hashedPassword, role }))
  
  const token = await sign(
    { username, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    c.env.JWT_SECRET,
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
  // New salted hash
  const saltedPassword = await hashPassword(password, username)
  // Legacy unsalted hash (for migration)
  const unsaltedPassword = await hashUnsalted(password)

  if (userData.password === saltedPassword) {
    // Normal login, salted password matches
  } else if (userData.password === unsaltedPassword) {
    // User found with OLD hash, UPGRADE to salted hash automatically
    console.log('Upgrading User to Salted Hash:', username)
    userData.password = saltedPassword
    await db.put(`user:${username}`, JSON.stringify(userData))
  } else {
    // Both failed
    return c.json({ error: '密码错误' }, 400)
  }

  const role = userData.role || 'phd' // Default for legacy users

  const token = await sign(
    { username, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    c.env.JWT_SECRET,
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
    const payload = await verify(auth.slice(7), c.env.JWT_SECRET, 'HS256')
    return c.json({ authenticated: true, username: payload.username, role: payload.role || 'phd' })
  } catch {
    return c.json({ authenticated: false })
  }
})

// User Management: Change Password
app.post('/api/user/change-password', async (c) => {
  const username = c.get('username')
  const { oldPassword, newPassword } = await c.req.json()

  if (!oldPassword || !newPassword) return c.json({ error: '请填写完整信息' }, 400)
  if (newPassword.length < 8) return c.json({ error: '新密码至少8位' }, 400)

  // Rate Limit check
  if (await checkRateLimit(c, 'change-password', 5)) return c.json({ error: '请求太频繁，请稍后再试' }, 429)

  const db = c.env.DB
  const userDataStr = await db.get(`user:${username}`)
  if (!userDataStr) return c.json({ error: '用户不存在' }, 401)

  const userData = JSON.parse(userDataStr)
  const oldHashed = await hashPassword(oldPassword, username)

  if (userData.password !== oldHashed) {
    return c.json({ error: '旧密码错误' }, 400)
  }

  const newHashed = await hashPassword(newPassword, username)
  userData.password = newHashed
  await db.put(`user:${username}`, JSON.stringify(userData))

  return c.json({ success: true, message: '密码修改成功' })
})

// S3 Upload API (Proxy to hi168.com)
app.post('/api/user/upload', async (c) => {
  const username = c.get('username')
  const formData = await c.req.formData()
  const file = formData.get('file')
  
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  const accessKey = c.env.S3_ACCESS_KEY
  const secretKey = c.env.S3_SECRET_KEY

  if (!accessKey || !secretKey) {
    console.error('Missing S3 credentials in environment variables.')
    return c.json({ error: 'Server configuration error: Missing S3 credentials.' }, 500)
  }

  const bucket = 'hi168-28696-9140n2xv'
  const endpoint = 's3.hi168.com'
  const region = 'us-east-1' // standard for many S3 clones
  const service = 's3'
  
  // 规范化文件名：替换空格和特殊字符
  const safeFileName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9.\-_]/g, '');
  const fileName = `${username}/${Date.now()}-${safeFileName}`
  const fileBuffer = await file.arrayBuffer()
  const amzDate = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  
  // 1. Calculate payload hash
  const payloadHash = await _sha256(new Uint8Array(fileBuffer))
  
  // 2. Canonical URI (bucket + file path)
  // S3 path-style: /bucket/key
  const canonicalUri = `/${bucket}/${fileName.split('/').map(encodeURIComponent).join('/')}`
  
  // 3. Canonical Headers (Must be alphabetically sorted!)
  // host < x-amz-content-sha256 < x-amz-date
  const canonicalHeaders = `host:${endpoint}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  
  const canonicalQuerystring = ''
  // CanonicalRequest: Method + URI + Query + Headers + SignedHeaders + Hash
  const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const hashedCanonicalRequest = await _sha256(new TextEncoder().encode(canonicalRequest))
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedCanonicalRequest}`
  
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service)
  const signature = hex(await hmac(signingKey, stringToSign))
  const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  const url = `https://${endpoint}${canonicalUri}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': authorizationHeader,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: fileBuffer
  })

  if (response.ok) {
    return c.json({ success: true, url })
  } else {
    const errorText = await response.text()
    console.error('S3 Upload Error:', errorText)
    return c.json({ error: 'Upload failed', detail: errorText }, 500)
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

// Leaderboard API
app.post('/api/leaderboard/update', async (c) => {
  const username = c.get('username')
  const payload = await c.req.json()
  const { date, duration, optOut, nickname, avatar } = payload
  if (!date || duration === undefined) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  
  if (optOut) {
    await c.env.DB.delete(`leaderboard:${date}:${username}`)
  } else {
    // Save live duration and update time
    await c.env.DB.put(`leaderboard:${date}:${username}`, JSON.stringify({ 
      duration: parseInt(duration), 
      nickname: nickname || null,
      avatar: avatar || null,
      updatedAt: Date.now() 
    }), { expirationTtl: 60 * 60 * 24 * 7 }) // Data expires after 7 days to save space
  }
  return c.json({ success: true })
})

app.get('/api/leaderboard/:date', async (c) => {
  const date = c.req.param('date')
  const currentUsername = c.get('username')
  const prefix = `leaderboard:${date}:`
  
  const list = await c.env.DB.list({ prefix })
  const results = []
  
  for (const key of list.keys) {
    const rawUsername = key.name.substring(prefix.length)
    const val = await c.env.DB.get(key.name)
    if (val) {
      const data = JSON.parse(val)
      let displayUsername = rawUsername
      const isMe = (rawUsername === currentUsername)
      
      // Handle Display Name Rules
      if (data.nickname) {
        displayUsername = data.nickname
      } else if (!isMe) {
        // Mask raw username if no nickname
        if (rawUsername.length <= 2) {
          displayUsername = rawUsername[0] + '***'
        } else {
          displayUsername = rawUsername[0] + '***' + rawUsername[rawUsername.length - 1]
        }
      }
      
      results.push({
        username: displayUsername,
        isMe: isMe,
        duration: data.duration,
        avatar: data.avatar || null,
        updatedAt: data.updatedAt
      })
    }
  }
  
  // Sort descending by duration
  results.sort((a, b) => b.duration - a.duration)
  return c.json({ success: true, leaderboard: results })
})

// Serve index.html for root "/"
app.get('/', serveStatic({ path: './index.html', manifest }))

// Serve all other static assets
app.get('/*', serveStatic({ root: './', manifest }))

export default app
