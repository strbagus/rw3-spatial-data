export default defineEventHandler((event) => {
  if ((event as any)._path && !(event as any)._path.startsWith('/')) {
    ;(event as any)._path = '/' + (event as any)._path
  }
  if (event.node.req.url && !event.node.req.url.startsWith('/')) {
    event.node.req.url = '/' + event.node.req.url
  }
})
