import { parser } from './grammar/parser'
import { transformProgram } from './ast/transform'

const code = `
noise 4 |> threshold 0.5;
`

const tree = parser.parse(code)

// Print CST for debugging
let cursor = tree.cursor()
do {
  console.log('  '.repeat(1) + cursor.name + ` "${code.slice(cursor.from, cursor.to).replace(/\n/g, '\\n')}"`)
} while (cursor.next())

// Transform to AST
const ast = transformProgram(tree, code)
console.log(JSON.stringify(ast, null, 2))