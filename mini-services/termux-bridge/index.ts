/**
 * ZCode Termux Bridge — WebSocket server
 *
 * Acts as a relay between the browser and Termux.
 * Browser connects as "client", Termux connects as "runner".
 * Commands from browser → forwarded to Termux → output sent back.
 *
 * Port: 8080 (accessed via Caddy gateway with ?XTransformPort=8080)
 */

import { WebSocketServer, WebSocket } from 'ws'

const PORT = 8080
const wss = new WebSocketServer({ port: PORT })

let termuxClient: WebSocket | null = null
const browserClients = new Set<WebSocket>()

console.log(`🔌 ZCode Termux Bridge running on port ${PORT}`)
console.log(`   Waiting for Termux + browser connections...`)

wss.on('connection', (ws, req) => {
  const url = req.url || ''

  // Termux connects with ?role=runner
  if (url.includes('role=runner')) {
    termuxClient = ws
    console.log('✅ Termux connected!')
    browserClients.forEach(c => c.send(JSON.stringify({ type: 'status', connected: true })))

    ws.on('message', (data) => {
      // Forward Termux output to all browser clients
      browserClients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(data.toString())
        }
      })
    })

    ws.on('close', () => {
      console.log('❌ Termux disconnected')
      termuxClient = null
      browserClients.forEach(c => c.send(JSON.stringify({ type: 'status', connected: false })))
    })
  } else {
    // Browser client
    browserClients.add(ws)
    console.log(`🌐 Browser client connected (${browserClients.size} total)`)

    // Send current Termux status
    ws.send(JSON.stringify({ type: 'status', connected: !!termuxClient }))

    ws.on('message', (data) => {
      // Forward command to Termux
      if (termuxClient && termuxClient.readyState === WebSocket.OPEN) {
        termuxClient.send(data.toString())
      } else {
        ws.send('Error: Termux not connected. Jalankan bridge command di Termux dulu.')
      }
    })

    ws.on('close', () => {
      browserClients.delete(ws)
      console.log(`🌐 Browser client disconnected (${browserClients.size} remaining)`)
    })
  }
})
