// Configuration
const CONFIG = {
  TARGET_URL: 'https://bmsutilities.com/Registrations2/ValidateLicense',
  ALLOWED_ORIGINS: ['*'], // In production, replace with your domain
  TIMEOUT: 15000,
  CACHE_TTL: 300 // 5 minutes cache
}

// CORS Headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
}

// Error Response Helper
function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  })
}

// Success Response Helper
function successResponse(data) {
  return new Response(data, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store'
    }
  })
}

// Request Handler
async function handleRequest(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Parse URL parameters
    const url = new URL(request.url)
    const license = url.searchParams.get('license')
    const product = url.searchParams.get('product')

    // Validate parameters
    if (!license || !product) {
      return errorResponse('Missing required parameters')
    }

    // Clean and validate input
    const cleanLicense = license.trim()
    const cleanProduct = product.trim()

    if (cleanLicense.length < 5) {
      return errorResponse('Invalid license format')
    }

    // Construct target URL
    const targetUrl = `${CONFIG.TARGET_URL}?License=${encodeURIComponent(cleanLicense)}&Product=${encodeURIComponent(cleanProduct)}`

    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT)

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Cloudflare Worker',
          'Accept': 'text/plain'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.text()
      return successResponse(result)

    } catch (error) {
      if (error.name === 'AbortError') {
        return errorResponse('Request timeout', 408)
      }
      throw error
    }

  } catch (error) {
    console.error('Worker error:', error)
    return errorResponse('Verification failed', 500)
  }
}

// Register event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})