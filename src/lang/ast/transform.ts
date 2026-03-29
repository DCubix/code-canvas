import { Tree, type SyntaxNode } from '@lezer/common'
import type { Program, Statement, Expr } from './types'

function text(source: string, node: SyntaxNode): string {
    return source.slice(node.from, node.to)
}

function children(node: SyntaxNode, name: string): SyntaxNode[] {
    const result: SyntaxNode[] = []
    let child = node.firstChild
    while (child) {
        if (child.name === name) {
            result.push(child)
        }
        child = child.nextSibling
    }
    return result
}

function allChildren(node: SyntaxNode): SyntaxNode[] {
    const result: SyntaxNode[] = []
    let child = node.firstChild
    while (child) {
        if (child.name !== 'LineComment') {
            result.push(child)
        }
        child = child.nextSibling
    }
    return result
}

export function transformProgram(tree: Tree, source: string): Program {
    const top = tree.topNode
    const body: Statement[] = []

    let child = top.firstChild
    while (child) {
        const stmt = transformStatement(child, source)
        if (stmt) {
            body.push(stmt)
        }
        child = child.nextSibling
    }

    return { type: 'program', body }
}

function transformStatement(node: SyntaxNode, source: string): Statement | null {
    switch (node.name) {
        case "LineComment":
            return null
        case "Let": {
            const ident = node.getChild("Ident")
            const expr = allChildren(node)
                .find(c =>
                    c.name !== "" &&
                    c.name !== "let" &&
                    c.name !== "Ident" &&
                    c.name !== "⚠" &&
                    c.from > (ident?.to ?? 0)
                )
            if (!ident || !expr) return null;
            return {
                type: 'let',
                name: text(source, ident),
                value: transformExpr(expr, source)
            }
        }
        case "OpDef": {
            const idents = children(node, "Ident")
            const name = idents[0]
            const paramNames = idents.slice(1).map(p => text(source, p))
            const childrenNodes = allChildren(node)
            const body = childrenNodes[childrenNodes.length - 1]
            if (!name || !body) return null;
            return {
                type: 'opdef',
                name: text(source, name),
                params: paramNames,
                body: transformExpr(body, source)
            }
        }
        case "Preload": {
            const strings = children(node, "String")
            const urlNode = strings[0]
            if (!urlNode) return null;
            const url = text(source, urlNode).slice(1, -1)
            const nameNode = strings[1]
            const name = nameNode ? text(source, nameNode).slice(1, -1) : url
            return { type: 'preload', url, name }
        }
        default: {
            return {
                type: 'expr',
                expr: transformExpr(node, source)
            }
        }
    }
}

function transformExpr(node: SyntaxNode, source: string): Expr {
    switch (node.name) {
        case "Number":
            return { type: 'number', value: Number(text(source, node)) }
        case "String": {
            const raw = text(source, node)
            return { type: 'string', value: raw.slice(1, -1) }
        }
        case "Ident":
            return { type: 'identifier', name: text(source, node) }
        case "App": {
            const children = allChildren(node)
            const name = text(source, children[0])
            const args = children.slice(1).map(c => transformExpr(c, source))
            return { type: 'call', name, args }
        }
        case "PipeExpr": {
            const children = allChildren(node).filter(c => c.name !== "|>") 
            const left = transformExpr(children[0], source)
            const right = transformExpr(children[1], source)
            return { type: 'pipe', left, right }
        }
        case "ParenArith": {
            const children = allChildren(node).filter(c => c.name !== "(" && c.name !== ")")
            const left = transformExpr(children[0], source)
            const op = text(source, children[1]) as '+' | '-' | '*' | '/'
            const right = transformExpr(children[2], source)
            return { type: 'arith', op, left, right }
        }
        case "List": {
            const items = allChildren(node)
                .filter(c => c.name !== "[" && c.name !== "]" && c.name !== ",")
                .map(c => transformExpr(c, source))
            return { type: 'list', items }
        }
        default: {
            const child = node.firstChild
            if (child) {
                return transformExpr(child, source)
            }
            return { type: 'identifier', name: text(source, node) }
        }
    }
}