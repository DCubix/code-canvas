import type { Expr, Program, Statement } from "../ast/types"
import type { Environment } from "./environment"
import { colorShade, type PixelFn, type Value } from "./types"

export function evaluate(program: Program, env: Environment): Value {
    let lastValue: Value = 0
    for (const stmt of program.body) {
        lastValue = evalStatement(stmt, env)
    }
    return lastValue
}

function evalStatement(stmt: Statement, env: Environment): Value {
    switch (stmt.type) {
        case 'let': {
            const val = evalExpr(stmt.value, env)
            env.setVar(stmt.name, val)
            return val
        }
        case 'opdef': {
            env.registerOp({
                name: stmt.name,
                params: stmt.params.map(p => ({ name: p, type: 'value' as const })),
                fn: (...args: Value[]) => {
                    const childEnv = env.child()
                    stmt.params.forEach((p, i) => childEnv.setVar(p, args[i]))
                    return evalExpr(stmt.body, childEnv)
                }
            })
            return 0
        }
        case 'preload':
            // Preloads are handled externally before evaluation
            return 0
        case 'expr':
            return evalExpr(stmt.expr, env)
    }
}

function evalExpr(expr: Expr, env: Environment): Value {
    switch (expr.type) {
        case 'number': return expr.value;
        case 'string': return expr.value;
        case 'identifier': {
            if (expr.name === 'x') {
                return ((x: number) => colorShade(x)) as PixelFn
            } else if (expr.name === 'y') {
                return ((_x: number, y: number) => colorShade(y)) as PixelFn
            } else if (expr.name === 't') {
                return env.getVar('t') ?? 0;
            }

            const v = env.getVar(expr.name)
            if (v !== undefined) return v;

            // mayb it's an op?
            const op = env.getOp(expr.name)
            if (op) return op.fn()

            throw new Error(`Undefined identifier: ${expr.name}`)
        }
        case 'call': {
            const op = env.getOp(expr.name)
            if (!op) throw new Error(`Undefined operator: ${expr.name}`)
            const args = expr.args.map(arg => evalExpr(arg, env))
            return op.fn(...args)
        }
        case 'pipe': {
            const leftVal = evalExpr(expr.left, env)
            // Desugar: left |> right  →  right(... , left)
            // Right side is either an Application (call) or bare Identifier
            if (expr.right.type === 'call') {
                const op = env.getOp(expr.right.name)
                if (!op) throw new Error(`Undefined operator: ${expr.right.name}`)
                const args = expr.right.args.map(a => evalExpr(a, env))
                args.push(leftVal)
                return op.fn(...args)
            } else if (expr.right.type === 'identifier') {
                const op = env.getOp(expr.right.name)
                if (!op) throw new Error(`Undefined operator: ${expr.right.name}`)
                return op.fn(leftVal)
            }
            throw new Error(`Invalid right-hand side of pipe: ${JSON.stringify(expr.right)}`)
        }
        case 'arith': {
            const l = evalExpr(expr.left, env)
            const r = evalExpr(expr.right, env)
            if (typeof l === 'number' && typeof r === 'number') {
                switch (expr.op) {
                    case '+': return l + r
                    case '-': return l - r
                    case '*': return l * r
                    case '/': return l / r
                }
            }
            throw new Error(`Invalid operands for arithmetic: ${l} ${expr.op} ${r}`)
        }
        case 'list': return expr.items.map(item => evalExpr(item, env)) as Value[]
    }
}