# OpenAPI — спецификация HTTP API (MVP)

```yaml
openapi: 3.0.3
info:
  title: Casemove Web API
  version: 0.1.0
paths:
  /inventory:
    get:
      summary: Get inventory
      responses:
        '200':
          description: OK
  /storage:
    get:
      summary: List storage units
  /storage/{id}:
    get:
      summary: Get items from storage
  /bulk-move:
    post:
      summary: Create bulk move task
  /bulk-move/{taskId}:
    get:
      summary: Get task status
```
