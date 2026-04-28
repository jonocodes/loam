import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { GardenIndexSchema } from '../src/lib/schema'

mkdirSync('schema', { recursive: true })

const example = JSON.parse(readFileSync('schema/example-index.json', 'utf-8'))

const schema = {
  ...GardenIndexSchema.toJSONSchema(),
  examples: [example],
}

writeFileSync('schema/index.json', JSON.stringify(schema, null, 2))
