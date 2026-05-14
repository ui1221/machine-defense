const http = require('http')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', 'dist')
const port = Number(process.env.PORT || 5173)
const host = process.env.HOST || '127.0.0.1'
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
}

http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`)
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/machine-defense/'
  if (pathname.startsWith('/machine-defense/')) pathname = pathname.slice('/machine-defense'.length)
  let file = path.join(root, pathname)
  if (!file.startsWith(root)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  if (!path.extname(file)) file = path.join(root, 'index.html')
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, 'index.html'), (fallbackErr, fallback) => {
        if (fallbackErr) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': mime['.html'] })
        res.end(fallback)
      })
      return
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
    res.end(data)
  })
}).listen(port, host, () => {
  console.log(`Preview server: http://${host}:${port}/machine-defense/`)
})
