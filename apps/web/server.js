const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const port = parseInt(process.env.PORT || '3000', 10)
const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  }).listen(port, '127.0.0.1', () => {
    console.log(`> Oseelc-connekt ready on port ${port}`)
  })
})
