/**
 * 表达式解析器 — 递归下降法
 * 优先级从低到高: 三元 > 逻辑或 > 逻辑与 > 等值 > 比较 > 移位 > 加减 > 乘除 > 一元 > 后缀 > 基本
 */
import {TokenStream, token, token_type} from 'allang-compiler-base'
import {
    array_data_get_tree, array_get_tree, bool_oper_get_tree, boolean_get_tree,
    call_get_tree, chain_get_tree, get_node_tree, get_tree, lambda_get_tree,
    map_get_tree, math_oper_get_tree, new_get_tree, null_get_tree,
    number_get_tree, pointer_get_tree, string_get_tree, ternary_get_tree,
    variable_get_tree
} from '../tree'
import {basic_type, bool_oper_type, math_oper_type, pointer_type} from '../model'
import {
    param_call_tree, param_identifier_tree,
    identifier_tree, type_tree, basic_type_tree, array_type_tree,
    lambda_type_tree, map_type_tree, class_type_tree
} from '../tree'
import {command_tree} from '../tree'

// ========== 类型解析 ==========

function parseBasicType(ts: TokenStream): type_tree {
    const t = ts.now()
    if (!t) return null
    switch (t.name) {
        case 'number': ts.next(); return new basic_type_tree(basic_type.number)
        case 'string': ts.next(); return new basic_type_tree(basic_type.string)
        case 'boolean': ts.next(); return new basic_type_tree(basic_type.boolean)
        case 'void': ts.next(); return new basic_type_tree(basic_type.void_)
        case 'map': ts.next(); return new basic_type_tree(basic_type.map)
        case 'array': ts.next(); return new basic_type_tree(basic_type.array)
        case 'any': ts.next(); return new basic_type_tree(basic_type.any_)
        default:
            if (t.type === token_type.identifier) {
                ts.next()
                return new class_type_tree(t.name)
            }
    }
    return null
}

function parseLambdaType(ts: TokenStream): lambda_type_tree {
    const pos = ts.save()
    if (!ts.now() || ts.now().name !== '(') {
        ts.restore(pos)
        return null
    }
    ts.next() // '('
    const params: identifier_tree[] = []
    if (ts.now() && ts.now().name !== ')') {
        while (true) {
            const name = ts.now()
            if (!name || name.type !== token_type.identifier) {
                ts.restore(pos)
                return null
            }
            ts.next()
            if (!ts.now() || ts.now().name !== ':') {
                ts.restore(pos)
                return null
            }
            ts.next() // ':'
            const tp = parseType(ts)
            if (!tp) {
                ts.restore(pos)
                return null
            }
            params.push(new identifier_tree(name.name, tp))
            if (ts.now() && ts.now().name === ',') {
                ts.next()
                continue
            }
            break
        }
    }
    if (!ts.now() || ts.now().name !== ')') {
        ts.restore(pos)
        return null
    }
    ts.next() // ')'
    if (!ts.now() || ts.now().name !== '=>') {
        ts.restore(pos)
        return null
    }
    ts.next() // '=>'
    const return_type = parseType(ts)
    if (!return_type) {
        ts.restore(pos)
        return null
    }
    return new lambda_type_tree(params, return_type)
}

export function parseType(ts: TokenStream): type_tree {
    // 尝试 lambda 类型: (params)=>return
    const lambda = parseLambdaType(ts)
    if (lambda) {
        return wrapArrayType(ts, lambda)
    }
    // 基本类型或类名
    const basic = parseBasicType(ts)
    if (!basic) return null
    return wrapArrayType(ts, basic)
}

function wrapArrayType(ts: TokenStream, base: type_tree): type_tree {
    let dim = 0
    while (ts.now() && ts.now().name === '[') {
        ts.next() // '['
        if (!ts.now() || ts.now().name !== ']') break
        ts.next() // ']'
        dim++
    }
    if (dim === 0) return base
    let result: type_tree = base
    for (let i = 0; i < dim; i++) {
        result = new array_type_tree(result)
    }
    return result
}

// 参数声明: (name:type, name:type, ...)
export function parseParamIdentifier(ts: TokenStream): param_identifier_tree {
    const pos = ts.save()
    if (!ts.now() || ts.now().name !== '(') {
        ts.restore(pos)
        return null
    }
    ts.next() // '('
    const params: identifier_tree[] = []
    if (ts.now() && ts.now().name !== ')') {
        while (true) {
            const name = ts.now()
            if (!name || name.type !== token_type.identifier) {
                ts.restore(pos)
                return null
            }
            ts.next()
            if (ts.now() && ts.now().name === ':') {
                ts.next()
                const tp = parseType(ts)
                if (!tp) {
                    ts.restore(pos)
                    return null
                }
                params.push(new identifier_tree(name.name, tp))
            } else {
                // 无类型标注，默认 any
                params.push(new identifier_tree(name.name, new basic_type_tree(basic_type.any_)))
            }
            if (ts.now() && ts.now().name === ',') {
                ts.next()
                continue
            }
            break
        }
    }
    if (!ts.now() || ts.now().name !== ')') {
        ts.restore(pos)
        return null
    }
    ts.next() // ')'
    return new param_identifier_tree(params, null)
}

// 参数调用: (expr, expr, ...)
export function parseParamCall(ts: TokenStream): param_call_tree {
    const pos = ts.save()
    if (!ts.now() || ts.now().name !== '(') {
        ts.restore(pos)
        return null
    }
    ts.next() // '('
    const args: get_node_tree[] = []
    if (ts.now() && ts.now().name !== ')') {
        while (true) {
            const expr = parseExpression(ts)
            if (!expr) {
                ts.restore(pos)
                return null
            }
            args.push(expr)
            if (ts.now() && ts.now().name === ',') {
                ts.next()
                continue
            }
            break
        }
    }
    if (!ts.now() || ts.now().name !== ')') {
        ts.restore(pos)
        return null
    }
    ts.next() // ')'
    return new param_call_tree(args)
}

// ========== 表达式解析 ==========

// 入口
export function parseExpression(ts: TokenStream): get_node_tree {
    return parseTernary(ts)
}

// 三元: cond ? true_val : false_val
function parseTernary(ts: TokenStream): get_node_tree {
    let left = parseLogicOr(ts)
    if (!left) return null
    if (ts.now() && ts.now().name === '?') {
        ts.next()
        const true_val = parseExpression(ts)
        if (!true_val) return null
        if (!ts.now() || ts.now().name !== ':') return null
        ts.next()
        const false_val = parseExpression(ts)
        if (!false_val) return null
        return get_node_tree.create([new ternary_get_tree(left, true_val, false_val)])
    }
    return left
}

// 逻辑或: ||
function parseLogicOr(ts: TokenStream): get_node_tree {
    let left = parseLogicAnd(ts)
    if (!left) return null
    while (ts.now() && ts.now().name === '||') {
        ts.next()
        const right = parseLogicAnd(ts)
        if (!right) return null
        left = get_node_tree.create([new bool_oper_get_tree(bool_oper_type.logic_or, left, right)])
    }
    return left
}

// 逻辑与: &&
function parseLogicAnd(ts: TokenStream): get_node_tree {
    let left = parseEquality(ts)
    if (!left) return null
    while (ts.now() && ts.now().name === '&&') {
        ts.next()
        const right = parseEquality(ts)
        if (!right) return null
        left = get_node_tree.create([new bool_oper_get_tree(bool_oper_type.logic_and, left, right)])
    }
    return left
}

// 等值: == !=
function parseEquality(ts: TokenStream): get_node_tree {
    let left = parseComparison(ts)
    if (!left) return null
    while (ts.now() && (ts.now().name === '==' || ts.now().name === '!=')) {
        const op = ts.now().name
        ts.next()
        const right = parseComparison(ts)
        if (!right) return null
        const oper = op === '==' ? bool_oper_type.equal : bool_oper_type.not_equal
        left = get_node_tree.create([new bool_oper_get_tree(oper, left, right)])
    }
    return left
}

// 比较: < > <= >=
function parseComparison(ts: TokenStream): get_node_tree {
    let left = parseBitwise(ts)
    if (!left) return null
    while (ts.now() && /^(<=?|>=?)$/.test(ts.now().name)) {
        const op = ts.now().name
        ts.next()
        const right = parseBitwise(ts)
        if (!right) return null
        let oper: bool_oper_type
        switch (op) {
            case '<': oper = bool_oper_type.less; break
            case '>': oper = bool_oper_type.greater; break
            case '<=': oper = bool_oper_type.less_equal; break
            case '>=': oper = bool_oper_type.greater_equal; break
        }
        left = get_node_tree.create([new bool_oper_get_tree(oper, left, right)])
    }
    return left
}

// 位运算: & | ^
function parseBitwise(ts: TokenStream): get_node_tree {
    let left = parseShift(ts)
    if (!left) return null
    while (ts.now() && /^[&|^]$/.test(ts.now().name)) {
        const op = ts.now().name
        ts.next()
        const right = parseShift(ts)
        if (!right) return null
        let oper: math_oper_type
        switch (op) {
            case '&': oper = math_oper_type.and; break
            case '|': oper = math_oper_type.or; break
            case '^': oper = math_oper_type.xor; break
        }
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }
    return left
}

// 移位: << >>
function parseShift(ts: TokenStream): get_node_tree {
    let left = parseTerm(ts)
    if (!left) return null
    while (ts.now() && (ts.now().name === '<<' || ts.now().name === '>>')) {
        const op = ts.now().name
        ts.next()
        const right = parseTerm(ts)
        if (!right) return null
        const oper = op === '<<' ? math_oper_type.shift : math_oper_type.right
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }
    return left
}

// 加减: + -
function parseTerm(ts: TokenStream): get_node_tree {
    let left = parseFactor(ts)
    if (!left) return null
    while (ts.now() && (ts.now().name === '+' || ts.now().name === '-')) {
        const op = ts.now().name
        ts.next()
        const right = parseFactor(ts)
        if (!right) return null
        const oper = op === '+' ? math_oper_type.add : math_oper_type.sub
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }
    return left
}

// 乘除模: * / %
function parseFactor(ts: TokenStream): get_node_tree {
    let left = parseUnary(ts)
    if (!left) return null
    while (ts.now() && /^[*\/%]$/.test(ts.now().name)) {
        const op = ts.now().name
        ts.next()
        const right = parseUnary(ts)
        if (!right) return null
        let oper: math_oper_type
        switch (op) {
            case '*': oper = math_oper_type.mul; break
            case '/': oper = math_oper_type.div; break
            case '%': oper = math_oper_type.mod; break
        }
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }
    return left
}

// 一元: & * - ! ~ typeof
function parseUnary(ts: TokenStream): get_node_tree {
    const t = ts.now()
    if (!t) return null

    // 指针取地址 &
    if (t.name === '&') {
        ts.next()
        const operand = parseUnary(ts)
        if (!operand) return null
        return get_node_tree.create([new pointer_get_tree(pointer_type.address, operand)])
    }
    // 指针取值 *
    if (t.name === '*') {
        ts.next()
        const operand = parseUnary(ts)
        if (!operand) return null
        return get_node_tree.create([new pointer_get_tree(pointer_type.value, operand)])
    }
    // 负数 -
    if (t.name === '-') {
        ts.next()
        const operand = parseUnary(ts)
        if (!operand) return null
        return get_node_tree.create([new math_oper_get_tree(math_oper_type.sub, new number_get_tree(0), operand)])
    }
    // 逻辑非 !
    if (t.name === '!') {
        ts.next()
        const operand = parseUnary(ts)
        if (!operand) return null
        return get_node_tree.create([new math_oper_get_tree(math_oper_type.not, operand, null)])
    }
    // 位取反 ~
    if (t.name === '~') {
        ts.next()
        const operand = parseUnary(ts)
        if (!operand) return null
        return get_node_tree.create([new math_oper_get_tree(math_oper_type.xor, operand, null)])
    }
    // typeof
    if (t.name === 'typeof') {
        ts.next()
        const operand = parseUnary(ts)
        if (!operand) return null
        return get_node_tree.create([operand]) // typeof 用 next 的 get 树表示
    }

    return parsePostfix(ts)
}

// 后缀: .member () [] ++ --
function parsePostfix(ts: TokenStream): get_node_tree {
    let left = parsePrimary(ts)
    if (!left) return null

    while (true) {
        const t = ts.now()
        if (!t) break

        if (t.name === '.') {
            ts.next()
            const member = ts.now()
            if (!member || member.type !== token_type.identifier) return left  // 允许没有后续
            ts.next()
            left = get_node_tree.create([
                new variable_get_tree(member.name)
            ])
            // 链式: 把之前的 left 和新的 member 包装
        } else if (t.name === '(') {
            const params = parseParamCall(ts)
            if (!params) break
            left = get_node_tree.create([new call_get_tree(left, params)])
        } else if (t.name === '[') {
            ts.next()
            const index = parseExpression(ts)
            if (!index) break
            if (!ts.now() || ts.now().name !== ']') break
            ts.next()
            left = get_node_tree.create([new array_get_tree(left, index)])
        } else if (t.name === '++') {
            ts.next()
            left = get_node_tree.create([new math_oper_get_tree(math_oper_type.add, left, new number_get_tree(1))])
        } else if (t.name === '--') {
            ts.next()
            left = get_node_tree.create([new math_oper_get_tree(math_oper_type.sub, left, new number_get_tree(1))])
        } else {
            break
        }
    }
    return left
}

// 基本值
function parsePrimary(ts: TokenStream): get_node_tree {
    const t = ts.now()
    if (!t) return null

    // 字面量
    if (t.type === token_type.number) {
        ts.next()
        return get_node_tree.create([new number_get_tree(parseFloat(t.name))])
    }
    if (t.type === token_type.string) {
        ts.next()
        return get_node_tree.create([new string_get_tree(t.name)])
    }
    if (t.name === 'true') {
        ts.next()
        return get_node_tree.create([new boolean_get_tree(true)])
    }
    if (t.name === 'false') {
        ts.next()
        return get_node_tree.create([new boolean_get_tree(false)])
    }
    if (t.name === 'null') {
        ts.next()
        return get_node_tree.create([new null_get_tree()])
    }

    // new 表达式
    if (t.name === 'new') {
        ts.next()
        const name = ts.now()
        if (!name || name.type !== token_type.identifier) return null
        ts.next()
        const params = parseParamCall(ts)
        if (!params) return null
        return get_node_tree.create([new new_get_tree(
            get_node_tree.create([new variable_get_tree(name.name)]), params
        )])
    }

    // lambda: (params):type -> { commands }
    // 或者 (params):type => { commands }
    if (t.name === '(') {
        const pos = ts.save()
        ts.next()
        // 检查是否是 lambda: 需要在 ) 后有 : 或 =>
        // 先找匹配的 )
        let depth = 1
        let lambda_pos = -1
        for (let i = ts.index; i < ts.tk.length; i++) {
            if (ts.tk[i].name === '(') depth++
            else if (ts.tk[i].name === ')') {
                depth--
                if (depth === 0) {
                    lambda_pos = i
                    break
                }
            }
        }
        if (lambda_pos >= 0 && lambda_pos + 1 < ts.tk.length) {
            const after = ts.tk[lambda_pos + 1]
            if (after.name === ':' || after.name === '=>' || after.name === '->') {
                // 这是 lambda
                ts.restore(pos)
                return parseLambdaExpr(ts)
            }
        }
        // 普通括号表达式
        ts.restore(pos)
        ts.next() // '('
        const expr = parseExpression(ts)
        if (!expr) return null
        if (!ts.now() || ts.now().name !== ')') return null
        ts.next() // ')'
        return get_node_tree.create([expr])
    }

    // Map 字面量: {key: value, ...}
    if (t.name === '{') {
        const map = parseMapLiteral(ts)
        if (map) return get_node_tree.create([map])
        return null
    }

    // 数组字面量: [elem, elem, ...]
    if (t.name === '[') {
        const arr = parseArrayLiteral(ts)
        if (arr) return get_node_tree.create([arr])
        return null
    }

    // 标识符 (变量引用)
    if (t.type === token_type.identifier) {
        ts.next()
        return get_node_tree.create([new variable_get_tree(t.name)])
    }

    return null
}

// Lambda 表达式: (params):type -> {commands}
export function parseLambdaExpr(ts: TokenStream): get_node_tree {
    const pos = ts.save()
    const params = parseParamIdentifier(ts)
    if (!params) {
        ts.restore(pos)
        return null
    }
    // 可选的返回类型
    let return_type: type_tree = null
    if (ts.now() && ts.now().name === ':') {
        ts.next()
        return_type = parseType(ts)
    }
    // -> 或 =>
    if (!ts.now() || (ts.now().name !== '->' && ts.now().name !== '=>')) {
        ts.restore(pos)
        return null
    }
    ts.next()
    // 函数体 { commands }
    const body = parseCommands(ts)
    if (!body) {
        ts.restore(pos)
        return null
    }
    return get_node_tree.create([new lambda_get_tree(params, body)])
}

// Map 字面量: {key: value, key: value, ...}
function parseMapLiteral(ts: TokenStream): map_get_tree {
    const pos = ts.save()
    if (!ts.now() || ts.now().name !== '{') {
        ts.restore(pos)
        return null
    }
    ts.next() // '{'
    const entries: { key: string, get: get_tree }[] = []
    if (ts.now() && ts.now().name !== '}') {
        while (true) {
            const key = ts.now()
            if (!key || key.type !== token_type.identifier) {
                ts.restore(pos)
                return null
            }
            ts.next()
            if (!ts.now() || ts.now().name !== ':') {
                ts.restore(pos)
                return null
            }
            ts.next() // ':'
            const value = parseExpression(ts)
            if (!value) {
                ts.restore(pos)
                return null
            }
            entries.push({key: key.name, get: value})
            if (ts.now() && ts.now().name === ',') {
                ts.next()
                if (ts.now() && ts.now().name === '}') break  // trailing comma
                continue
            }
            break
        }
    }
    if (!ts.now() || ts.now().name !== '}') {
        ts.restore(pos)
        return null
    }
    ts.next() // '}'
    return new map_get_tree(entries)
}

// 数组字面量: [elem, elem, ...]
function parseArrayLiteral(ts: TokenStream): array_data_get_tree {
    const pos = ts.save()
    if (!ts.now() || ts.now().name !== '[') {
        ts.restore(pos)
        return null
    }
    ts.next() // '['
    const elems: get_node_tree[] = []
    if (ts.now() && ts.now().name !== ']') {
        while (true) {
            const elem = parseExpression(ts)
            if (!elem) {
                ts.restore(pos)
                return null
            }
            elems.push(elem)
            if (ts.now() && ts.now().name === ',') {
                ts.next()
                if (ts.now() && ts.now().name === ']') break
                continue
            }
            break
        }
    }
    if (!ts.now() || ts.now().name !== ']') {
        ts.restore(pos)
        return null
    }
    ts.next() // ']'
    return new array_data_get_tree(elems)
}

// 命令块解析 (前向声明，实际实现在 parser.ts)
// 这里只解析 lambda 体中的命令块
import {parseCommands} from '../parser'
