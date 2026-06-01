/**
 * alLang 语法解析器 — 根据预解析.md规范
 * 文本 → token → AST
 */
import {TokenStream, token, token_type, Tree} from 'allang-compiler-base'
import {parseExpression, parseType, parseParamIdentifier, parseParamCall, parseLambdaExpr} from './parser/get'
import {
    annotation_tree, block_tree, class_tree, const_tree, enum_tree, file_tree,
    func_tree, import_tree, interface_tree, modifiers, module_tree, space_tree,
    try_tree, var_tree
} from './tree'
import {
    basic_type_tree, identifier_tree, type_tree
} from './tree'
import {
    break_tree, call_tree, command_tree, continue_tree, delete_tree,
    for_tree, foreach_tree, identifier_var_tree, if_tree, math_set_tree,
    return_tree, set_tree, switch_tree, throw_tree, vm_tree, while_tree
} from './tree'
import {get_node_tree, get_tree, lambda_get_tree, number_get_tree} from './tree'
import {param_call_tree, param_identifier_tree} from './tree'
import {basic_type, math_oper_type} from './model'

// 从 get_node_tree 中提取内部的真实节点
function unwrapNode(node: get_node_tree): get_tree {
    if (!node || !node.tree || !node.tree.chain) return node
    return node.tree.chain[0] || node
}

function unwrapLambda(node: get_node_tree): lambda_get_tree {
    const inner = unwrapNode(node)
    if (inner instanceof lambda_get_tree) return inner
    return null
}

// ========== 辅助 ==========

function expect(ts: TokenStream, name: string, err?: string): boolean {
    if (ts.now() && ts.now().name === name) {
        ts.next()
        return true
    }
    return false
}

function expectType(ts: TokenStream, type: token_type): token | null {
    const t = ts.now()
    if (t && t.type === type) {
        ts.next()
        return t
    }
    return null
}

// ========== 修饰符 ==========

function parseModifiers(ts: TokenStream): modifiers {
    const mod = new modifiers()
    let hasAccess = false, hasAsync = false, hasStatic = false

    while (true) {
        const t = ts.now()
        if (!t || t.type !== token_type.keyword) break

        switch (t.name) {
            case 'public':
                if (hasAccess) return mod  // 不允许重复
                hasAccess = true
                mod.public = true
                mod.private = false
                ts.next()
                break
            case 'private':
                if (hasAccess) return mod
                hasAccess = true
                mod.public = false
                mod.private = true
                ts.next()
                break
            case 'async':
                if (hasAsync) return mod
                hasAsync = true
                mod.async = true
                mod.sync = false
                ts.next()
                break
            case 'sync':
                if (hasAsync) return mod
                hasAsync = true
                mod.async = false
                mod.sync = true
                ts.next()
                break
            case 'static':
                if (hasStatic) return mod
                hasStatic = true
                mod.static = true
                mod.unstatic = false
                ts.next()
                break
            case 'unstatic':
                if (hasStatic) return mod
                hasStatic = true
                mod.static = false
                mod.unstatic = true
                ts.next()
                break
            case 'final':
                mod.final = true
                ts.next()
                break
            default:
                return mod
        }
    }
    return mod
}

// ========== 注解 ==========

function parseAnnotation(ts: TokenStream): annotation_tree {
    const pos = ts.save()
    if (!ts.now() || ts.now().name !== '@') {
        ts.restore(pos)
        return null
    }
    ts.next() // '@'
    const name = parseModulePath(ts)
    if (!name) {
        ts.restore(pos)
        return null
    }
    let value = new param_call_tree([])
    if (ts.now() && ts.now().name === '(') {
        value = parseParamCall(ts)
        if (!value) {
            ts.restore(pos)
            return null
        }
    }
    return new annotation_tree(name, value)
}

function parseAnnotations(ts: TokenStream): annotation_tree[] {
    const result: annotation_tree[] = []
    while (true) {
        const a = parseAnnotation(ts)
        if (!a) break
        result.push(a)
    }
    return result
}

// 模块路径: a.b.c
function parseModulePath(ts: TokenStream): string {
    const t = expectType(ts, token_type.identifier)
    if (!t) return null
    let path = t.name
    while (ts.now() && ts.now().name === '.') {
        ts.next()
        const next = expectType(ts, token_type.identifier)
        if (!next) break
        path += '.' + next.name
    }
    return path
}

// ========== 命令解析 ==========

// 命令块: { command; command; ... }
export function parseCommands(ts: TokenStream): command_tree[] {
    const pos = ts.save()
    if (!expect(ts, '{')) {
        ts.restore(pos)
        return null
    }
    const commands: command_tree[] = []
    while (ts.now() && ts.now().name !== '}') {
        const cmd = parseCommand(ts)
        if (!cmd) break
        commands.push(cmd)
    }
    if (!expect(ts, '}')) {
        // 允许不闭合的 fallback
    }
    return commands
}

// 单条命令
function parseCommand(ts: TokenStream): command_tree {
    const t = ts.now()
    if (!t) return null

    switch (t.name) {
        case 'var': return parseVarCmd(ts)
        case 'if': return parseIfCmd(ts)
        case 'switch': return parseSwitchCmd(ts)
        case 'for': return parseForCmd(ts)
        case 'foreach': return parseForEachCmd(ts)
        case 'while': return parseWhileCmd(ts)
        case 'do': return parseDoWhileCmd(ts)
        case 'try': return parseTryCmd(ts)
        case 'return': return parseReturnCmd(ts)
        case 'break': return parseBreakCmd(ts)
        case 'continue': return parseContinueCmd(ts)
        case 'throw': return parseThrowCmd(ts)
        case 'delete': return parseDeleteCmd(ts)
        case 'vm': return parseVmCmd(ts)
        case 'await': return parseCallCmd(ts)
        case '{': {
            const cmds = parseCommands(ts)
            return cmds ? new command_tree(cmds) : null
        }
        default:
            // 赋值或调用
            if (t.type === token_type.identifier) {
                return parseAssignOrCall(ts)
            }
            return null
    }
}

// var name:type; 或 var name:type = value;
function parseVarCmd(ts: TokenStream): identifier_var_tree {
    const pos = ts.save()
    if (!expect(ts, 'var')) {
        ts.restore(pos)
        return null
    }
    const name = expectType(ts, token_type.identifier)
    if (!name) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ':')) {
        ts.restore(pos)
        return null
    }
    let tp = parseType(ts)
    if (!tp) tp = new basic_type_tree(basic_type.any_)
    let value: get_node_tree = null
    if (ts.now() && ts.now().name === '=') {
        ts.next()
        value = parseExpression(ts)
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new identifier_var_tree(name.name, tp, value)
}

// 赋值或调用 (由标识符开始)
function parseAssignOrCall(ts: TokenStream): command_tree {
    const pos = ts.save()
    const name = expectType(ts, token_type.identifier)
    if (!name) {
        ts.restore(pos)
        return null
    }

    const t = ts.now()
    if (!t) {
        ts.restore(pos)
        return null
    }

    // 函数调用: name(params);
    if (t.name === '(') {
        const params = parseParamCall(ts)
        if (!params || !expect(ts, ';')) {
            ts.restore(pos)
            return null
        }
        return new call_tree(name.name, params, false)
    }

    // 复合赋值: name += value;
    const compound_ops: Record<string, math_oper_type> = {
        '+=': math_oper_type.add,
        '-=': math_oper_type.sub,
        '*=': math_oper_type.mul,
        '/=': math_oper_type.div,
        '%=': math_oper_type.mod,
        '<<=': math_oper_type.shift,
        '>>=': math_oper_type.right,
        '&=': math_oper_type.and,
        '|=': math_oper_type.or,
        '^=': math_oper_type.xor,
    }

    if (t.name in compound_ops) {
        ts.next()
        const value = parseExpression(ts)
        if (!value || !expect(ts, ';')) {
            ts.restore(pos)
            return null
        }
        return new math_set_tree(name.name, value, compound_ops[t.name])
    }

    // 普通赋值: name = value;
    if (t.name === '=') {
        ts.next()
        const value = parseExpression(ts)
        if (!value || !expect(ts, ';')) {
            ts.restore(pos)
            return null
        }
        return new set_tree(name.name, value)
    }

    // ++ / --
    if (t.name === '++' || t.name === '--') {
        ts.next()
        if (!expect(ts, ';')) {
            ts.restore(pos)
            return null
        }
        const oper = t.name === '++' ? math_oper_type.add : math_oper_type.sub
        return new math_set_tree(name.name,
            get_node_tree.create([new number_get_tree(1)]), oper)
    }

    ts.restore(pos)
    return null
}

// await? name(params);
function parseCallCmd(ts: TokenStream): call_tree {
    const pos = ts.save()
    let _await = false
    if (ts.now() && ts.now().name === 'await') {
        _await = true
        ts.next()
    }
    const name = expectType(ts, token_type.identifier)
    if (!name) {
        ts.restore(pos)
        return null
    }
    const params = parseParamCall(ts)
    if (!params) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new call_tree(name.name, params, _await)
}

// if condition { commands } else if condition { commands } else { commands }
function parseIfCmd(ts: TokenStream): if_tree {
    const pos = ts.save()
    if (!expect(ts, 'if')) {
        ts.restore(pos)
        return null
    }
    const condition = parseCondition(ts)
    if (!condition) {
        ts.restore(pos)
        return null
    }
    const body = parseCommands(ts)
    if (!body) {
        ts.restore(pos)
        return null
    }
    const else_if: if_tree[] = []
    let else_body: command_tree[] = null

    while (ts.now() && ts.now().name === 'else') {
        ts.next()
        if (ts.now() && ts.now().name === 'if') {
            ts.next()
            const cond = parseCondition(ts)
            if (!cond) break
            const cmds = parseCommands(ts)
            if (!cmds) break
            else_if.push(new if_tree(cond, cmds, [], null))
        } else {
            else_body = parseCommands(ts)
            if (!else_body) break
            break
        }
    }
    return new if_tree(condition, body, else_if, else_body)
}

function parseCondition(ts: TokenStream): get_node_tree {
    const pos = ts.save()
    if (!expect(ts, '(')) {
        ts.restore(pos)
        return null
    }
    const expr = parseExpression(ts)
    if (!expr) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ')')) {
        ts.restore(pos)
        return null
    }
    return expr
}

// switch (command) { case value -> { } default -> { } }
function parseSwitchCmd(ts: TokenStream): switch_tree {
    const pos = ts.save()
    if (!expect(ts, 'switch')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, '(')) {
        ts.restore(pos)
        return null
    }
    const condition = parseExpression(ts)
    if (!condition) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ')')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, '{')) {
        ts.restore(pos)
        return null
    }
    const cases: { value: get_tree, call: command_tree[] }[] = []
    let default_block: command_tree[] = null

    while (ts.now() && ts.now().name !== '}') {
        if (ts.now().name === 'case') {
            ts.next()
            const caseValue = parseExpression(ts)
            if (!caseValue) break
            if (!expect(ts, '->')) break
            const cmds = parseCommands(ts)
            if (!cmds) break
            cases.push({value: caseValue, call: cmds})
        } else if (ts.now().name === 'default') {
            ts.next()
            if (!expect(ts, '->')) break
            default_block = parseCommands(ts)
            if (!default_block) break
            break  // default 是最后一个
        } else {
            break
        }
    }
    if (!expect(ts, '}')) {
        // 容错
    }
    return new switch_tree(condition, cases, default_block)
}

// for (init_lambda, condition_lambda, step_lambda) { commands }
function parseForCmd(ts: TokenStream): for_tree {
    const pos = ts.save()
    if (!expect(ts, 'for')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, '(')) {
        ts.restore(pos)
        return null
    }
    const init = unwrapLambda(parseLambdaExpr(ts))
    if (!init) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ',')) {
        ts.restore(pos)
        return null
    }
    const condition = unwrapLambda(parseLambdaExpr(ts))
    if (!condition) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ',')) {
        ts.restore(pos)
        return null
    }
    const step = unwrapLambda(parseLambdaExpr(ts))
    if (!step) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ')')) {
        ts.restore(pos)
        return null
    }
    const body = parseCommands(ts)
    if (!body) {
        ts.restore(pos)
        return null
    }
    return new for_tree(init, condition, step, body)
}

// foreach (name:type as array) { commands }
function parseForEachCmd(ts: TokenStream): foreach_tree {
    const pos = ts.save()
    if (!expect(ts, 'foreach')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, '(')) {
        ts.restore(pos)
        return null
    }
    const name = expectType(ts, token_type.identifier)
    if (!name) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ':')) {
        ts.restore(pos)
        return null
    }
    let tp = parseType(ts)
    if (!tp) tp = new basic_type_tree(basic_type.any_)
    if (!expect(ts, 'as')) {
        ts.restore(pos)
        return null
    }
    const array = parseExpression(ts)
    if (!array) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ')')) {
        ts.restore(pos)
        return null
    }
    const body = parseCommands(ts)
    if (!body) {
        ts.restore(pos)
        return null
    }
    return new foreach_tree(
        new identifier_var_tree(name.name, tp, null),
        array, body
    )
}

// while condition { commands }
function parseWhileCmd(ts: TokenStream): while_tree {
    const pos = ts.save()
    if (!expect(ts, 'while')) {
        ts.restore(pos)
        return null
    }
    const condition = parseCondition(ts)
    if (!condition) {
        ts.restore(pos)
        return null
    }
    const body = parseCommands(ts)
    if (!body) {
        ts.restore(pos)
        return null
    }
    return new while_tree(condition, body, false)
}

// do { commands } while condition
function parseDoWhileCmd(ts: TokenStream): while_tree {
    const pos = ts.save()
    if (!expect(ts, 'do')) {
        ts.restore(pos)
        return null
    }
    const body = parseCommands(ts)
    if (!body) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, 'while')) {
        ts.restore(pos)
        return null
    }
    const condition = parseCondition(ts)
    if (!condition) {
        ts.restore(pos)
        return null
    }
    return new while_tree(condition, body, true)
}

// try { commands } catch lambda finally { commands }
function parseTryCmd(ts: TokenStream): try_tree {
    const pos = ts.save()
    if (!expect(ts, 'try')) {
        ts.restore(pos)
        return null
    }
    const body = parseCommands(ts)
    if (!body) {
        ts.restore(pos)
        return null
    }
    let catch_block: lambda_get_tree = null
    let finally_block: command_tree[] = null

    if (ts.now() && ts.now().name === 'catch') {
        ts.next()
        const lambda = unwrapLambda(parseLambdaExpr(ts))
        if (lambda) {
            catch_block = lambda
        }
    }
    if (ts.now() && ts.now().name === 'finally') {
        ts.next()
        finally_block = parseCommands(ts)
    }
    return new try_tree(body, catch_block, finally_block)
}

// return value; 或 return;
function parseReturnCmd(ts: TokenStream): return_tree {
    const pos = ts.save()
    if (!expect(ts, 'return')) {
        ts.restore(pos)
        return null
    }
    let value: get_node_tree = null
    if (ts.now() && ts.now().name !== ';') {
        value = parseExpression(ts)
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new return_tree(value)
}

function parseBreakCmd(ts: TokenStream): break_tree {
    const pos = ts.save()
    if (!expect(ts, 'break')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new break_tree()
}

function parseContinueCmd(ts: TokenStream): continue_tree {
    const pos = ts.save()
    if (!expect(ts, 'continue')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new continue_tree()
}

function parseThrowCmd(ts: TokenStream): throw_tree {
    const pos = ts.save()
    if (!expect(ts, 'throw')) {
        ts.restore(pos)
        return null
    }
    const value = parseExpression(ts)
    if (!value) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new throw_tree(value)
}

function parseDeleteCmd(ts: TokenStream): delete_tree {
    const pos = ts.save()
    if (!expect(ts, 'delete')) {
        ts.restore(pos)
        return null
    }
    const name = expectType(ts, token_type.identifier)
    if (!name) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new delete_tree(name.name)
}

// vm 'string'; 或 vm identifier;
function parseVmCmd(ts: TokenStream): vm_tree {
    const pos = ts.save()
    if (!expect(ts, 'vm')) {
        ts.restore(pos)
        return null
    }
    const t = ts.now()
    if (!t) {
        ts.restore(pos)
        return null
    }
    if (t.type === token_type.string) {
        ts.next()
        if (!expect(ts, ';')) {
            ts.restore(pos)
            return null
        }
        return new vm_tree(t.name, false)
    }
    if (t.type === token_type.identifier) {
        ts.next()
        if (!expect(ts, ';')) {
            ts.restore(pos)
            return null
        }
        return new vm_tree(t.name, true)
    }
    ts.restore(pos)
    return null
}

// ========== 块定义解析 ==========

// 解析块定义: function / class / interface / module / enum / var / const
function parseBlockDef(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): space_tree {
    const t = ts.now()
    if (!t) return null

    switch (t.name) {
        case 'function': return parseFuncBody(ts, name, mod, annotations)
        case 'class': return parseClassBody(ts, name, mod, annotations)
        case 'interface': return parseInterfaceBody(ts, name, mod, annotations)
        case 'module': return parseModuleBody(ts, name, mod, annotations)
        case 'enum': return parseEnumBody(ts, name, mod, annotations)
        case 'var': return parseVarBody(ts, name, mod, annotations)
        case 'const': return parseConstBody(ts, name, mod, annotations)
        default: return null
    }
}

// function returnType params { commands }
function parseFuncBody(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): func_tree {
    const pos = ts.save()
    if (!expect(ts, 'function')) {
        ts.restore(pos)
        return null
    }
    const return_type = parseType(ts)
    if (!return_type) {
        ts.restore(pos)
        return null
    }
    const params = parseParamIdentifier(ts)
    if (!params) {
        ts.restore(pos)
        return null
    }
    // 仅声明（接口中的函数声明）
    if (ts.now() && ts.now().name === ';') {
        ts.next()
        const f = new func_tree(name, null, mod, annotations, params, return_type)
        f.is_definition_only = true
        return f
    }
    const commands = parseCommands(ts)
    if (!commands) {
        ts.restore(pos)
        return null
    }
    // 默认填充修饰符
    if (mod.sync === mod.async) mod.sync = true  // 默认 sync
    if (mod.static === mod.unstatic) mod.unstatic = true  // 默认 unstatic
    return new func_tree(name, commands, mod, annotations, params, return_type)
}

// class implements interfaceName { blocks }
function parseClassBody(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): class_tree {
    const pos = ts.save()
    if (!expect(ts, 'class')) {
        ts.restore(pos)
        return null
    }
    let implements_name: string = null
    if (ts.now() && ts.now().name === 'implements') {
        ts.next()
        implements_name = parseModulePath(ts)
        if (!implements_name) implements_name = 'ObjectInterface'
    } else {
        implements_name = 'ObjectInterface'
    }
    if (!expect(ts, '{')) {
        ts.restore(pos)
        return null
    }
    const cls = new class_tree(name, implements_name, mod, annotations)
    cls.children = parseBlocks(ts)
    if (!expect(ts, '}')) {
        // 容错
    }
    // 默认填充修饰符
    cls.modifiers.async = false
    cls.modifiers.sync = true
    cls.modifiers.static = true
    cls.modifiers.unstatic = false
    return cls
}

// interface of interfaceName { func_decls }
function parseInterfaceBody(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): interface_tree {
    const pos = ts.save()
    if (!expect(ts, 'interface')) {
        ts.restore(pos)
        return null
    }
    let of_name: string = null
    if (ts.now() && ts.now().name === 'of') {
        ts.next()
        of_name = parseModulePath(ts)
        if (!of_name) of_name = 'ObjectInterface'
    } else {
        of_name = 'ObjectInterface'
    }
    if (!expect(ts, '{')) {
        ts.restore(pos)
        return null
    }
    const funcs: func_tree[] = []
    while (ts.now() && ts.now().name !== '}') {
        const ann = parseAnnotations(ts)
        const m = parseModifiers(ts)
        const fn = parseFuncDecl(ts, m, ann)
        if (!fn) break
        funcs.push(fn)
    }
    if (!expect(ts, '}')) {
        // 容错
    }
    return new interface_tree(name, of_name, funcs, mod, annotations)
}

// 接口中的函数声明: name:function returnType params;
function parseFuncDecl(ts: TokenStream, mod: modifiers, ann: annotation_tree[]): func_tree {
    const pos = ts.save()
    const nameToken = expectType(ts, token_type.identifier)
    if (!nameToken) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ':')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, 'function')) {
        ts.restore(pos)
        return null
    }
    const return_type = parseType(ts)
    if (!return_type) {
        ts.restore(pos)
        return null
    }
    const params = parseParamIdentifier(ts)
    if (!params) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new func_tree(nameToken.name, null, mod, ann, params, return_type)
}

// module { blocks }
function parseModuleBody(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): module_tree {
    const pos = ts.save()
    if (!expect(ts, 'module')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, '{')) {
        ts.restore(pos)
        return null
    }
    const m = new module_tree(name, mod, annotations)
    m.children = parseBlocks(ts)
    if (!expect(ts, '}')) {
        // 容错
    }
    return m
}

// enum { name, name, ... }
function parseEnumBody(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): enum_tree {
    const pos = ts.save()
    if (!expect(ts, 'enum')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, '{')) {
        ts.restore(pos)
        return null
    }
    const values: string[] = []
    while (ts.now() && ts.now().name !== '}') {
        const v = expectType(ts, token_type.identifier)
        if (!v) break
        values.push(v.name)
        if (ts.now() && ts.now().name === ',') {
            ts.next()
            continue
        }
        break
    }
    if (!expect(ts, '}')) {
        // 容错
    }
    return new enum_tree(name, mod, annotations, values)
}

// var of type = value;
function parseVarBody(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): var_tree {
    const pos = ts.save()
    if (!expect(ts, 'var')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, 'of')) {
        ts.restore(pos)
        return null
    }
    const tp = parseType(ts)
    if (!tp) {
        ts.restore(pos)
        return null
    }
    let value: get_tree = null
    if (ts.now() && ts.now().name === '=') {
        ts.next()
        value = parseExpression(ts)
    } else {
        value = null  // 默认 null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    mod.async = false
    mod.sync = true
    mod.static = true
    mod.unstatic = false
    return new var_tree(name, tp, mod, annotations, value)
}

// const of type = value;
function parseConstBody(
    ts: TokenStream, name: string, mod: modifiers, annotations: annotation_tree[]
): const_tree {
    const pos = ts.save()
    if (!expect(ts, 'const')) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, 'of')) {
        ts.restore(pos)
        return null
    }
    const tp = parseType(ts)
    if (!tp) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, '=')) {
        ts.restore(pos)
        return null
    }
    const value = parseExpression(ts)
    if (!value) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ';')) {
        ts.restore(pos)
        return null
    }
    return new const_tree(name, tp, mod, annotations, value)
}

// ========== 块列表解析 ==========

// 解析一个块: 修饰符 名字:块定义
function parseBlock(ts: TokenStream): space_tree {
    const pos = ts.save()
    const annotations = parseAnnotations(ts)
    const mod = parseModifiers(ts)
    const nameToken = expectType(ts, token_type.identifier)
    if (!nameToken) {
        ts.restore(pos)
        return null
    }
    if (!expect(ts, ':')) {
        ts.restore(pos)
        return null
    }
    const block = parseBlockDef(ts, nameToken.name, mod, annotations)
    if (!block) {
        ts.restore(pos)
        return null
    }
    return block
}

// 解析块列表
function parseBlocks(ts: TokenStream): space_tree[] {
    const result: space_tree[] = []
    while (ts.now() && ts.now().name !== '}') {
        const block = parseBlock(ts)
        if (!block) break
        result.push(block)
    }
    return result
}

// ========== Import 解析 ==========

function parseImport(ts: TokenStream): import_tree {
    if (!ts.now() || ts.now().name !== 'import') return null
    const pos = ts.save()
    ts.next() // consume 'import'
    const module = parseModulePath(ts)
    if (!module) {
        ts.restore(pos)
        return null
    }
    let alias = module
    if (ts.now() && ts.now().name === 'as') {
        ts.next()
        const a = expectType(ts, token_type.identifier)
        if (a) alias = a.name
    }
    // 分号可选
    if (ts.now() && ts.now().name === ';') ts.next()
    return new import_tree(alias, module)
}

// ========== 文件解析入口 ==========

export function parse(ts: TokenStream): file_tree {
    const imports: import_tree[] = []
    const spaces: space_tree[] = []

    // 解析 import 语句
    while (ts.now()) {
        const imp = parseImport(ts)
        if (!imp) break
        imports.push(imp)
    }

    // 解析块
    while (ts.now()) {
        const block = parseBlock(ts)
        if (!block) break
        // 文件顶层自动填充 public 修饰符
        block.modifiers.public = true
        block.modifiers.private = false
        spaces.push(block)
    }

    return new file_tree(imports, spaces)
}