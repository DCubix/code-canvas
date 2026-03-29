export type Expr =
    | NumberLiteral
    | StringLiteral
    | Identifier
    | FunctionCall
    | PipeExpression
    | ArithExpression
    | ListExpression

export type Statement =
    | Let
    | OpDef
    | Preload
    | ExprStatement

export interface NumberLiteral {
    type: 'number'
    value: number
}

export interface StringLiteral {
    type: 'string'
    value: string
}

export interface Identifier {
    type: 'identifier'
    name: string
}

export interface FunctionCall {
    type: 'call'
    name: string
    args: Expr[]
}

export interface PipeExpression {
    type: 'pipe'
    left: Expr
    right: Expr
}

export interface ArithExpression {
    type: 'arith'
    op: '+' | '-' | '*' | '/'
    left: Expr
    right: Expr
}

export interface ListExpression {
    type: 'list'
    items: Expr[]
}

export interface Let {
    type: 'let'
    name: string
    value: Expr
}

export interface OpDef {
    type: 'opdef'
    name: string
    params: string[]
    body: Expr
}

export interface Preload {
    type: 'preload'
    url: string
    name: string
}

export interface ExprStatement {
    type: 'expr'
    expr: Expr
}

export interface Program {
    type: 'program'
    body: Statement[]
}