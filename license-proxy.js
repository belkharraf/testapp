// Configuration
const CONFIG = {
  TARGET_URL: 'https://bmsutilities.com/Registrations2/ValidateLicense',
  ALLOWED_ORIGINS: ['*'], // For development. In production, specify your domain
  TIMEOUT: 15000
}

// CORS Headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

// Handle incoming requests
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: CORS_HEADERS
    })
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Parse URL and get parameters
    const url = new URL(request.url)
    const license = url.searchParams.get('license')
    const product = url.searchParams.get('product')

    // Validate parameters
    if (!license || !product) {
      return errorResponse('Missing required parameters')
    }

    // Construct target URL
    const targetUrl = `${CONFIG.TARGET_URL}?License=${encodeURIComponent(license)}&Product=${encodeURIComponent(product)}`

    // Fetch with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT)

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Cloudflare Worker',
          'Accept': 'text/plain'
        }
      })

      clearTimeout(timeout)

      // Handle non-200 responses
      if (!response.ok) {
        return errorResponse('License verification failed', response.status)
      }

      // Get the response text
      const result = await response.text()

      // Return the response
      return new Response(result, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })

    } catch (error) {
      if (error.name === 'AbortError') {
        return errorResponse('Request timeout', 408)
      }
      throw error
    }

  } catch (error) {
    // Log error for debugging
    console.error('Worker error:', error)
    
    return errorResponse('Internal server error', 500)
  }
}