import { parser } from './grammar/parser'
import { transformProgram } from './ast/transform'
import { evaluate } from './interpreter/evaluator'
import { Environment } from './interpreter/environment'
import { registerBuiltins } from './interpreter/builtins'
import type { PixelFn, Color } from './interpreter/types'

function test(name: string, code: string) {
    try {
        const tree = parser.parse(code)
        const ast = transformProgram(tree, code)
        const env = new Environment()
        registerBuiltins(env)
        const result = evaluate(ast, env)

        if (typeof result === 'function') {
            const fn = result as PixelFn
            const c: Color = fn(0.5, 0.5, 0)
            console.log(`OK ${name} -> color(0.5,0.5): r=${c.r.toFixed(2)} g=${c.g.toFixed(2)} b=${c.b.toFixed(2)} a=${c.a.toFixed(2)}`)
        } else {
            console.log(`OK ${name} -> value: ${JSON.stringify(result)}`)
        }
    } catch (e: unknown) {
        console.log(`FAIL ${name} -> ${(e as Error).message}`)
    }
}

test("solid red",       "solid 'red';")
test("noise",           "noise 4;")
test("pipe threshold",  "noise 4 |> threshold 0.5;")
test("pipe colorize",   "noise 4 |> colorize 'red' 'blue';")
test("checker",         "checker 8;")
test("gradient",        "gradient 'red' 'blue';")
test("invert",          "solid 'white' |> invert;")
test("let binding",     "let a = noise 4; a |> threshold 0.5;")
test("color op",        "color '#ff0000';")
