/**
 * 验证规则 — 实现 check.md 中的所有检查规则
 */
import {Scope, ScopeBuilder, DeclEntry} from './scope'
import {
    func_tree, class_tree, interface_tree, module_tree,
    var_tree, const_tree, enum_tree, import_tree, space_tree, file_tree
} from '../tree'
import {
    command_tree, if_tree, while_tree, for_tree, switch_tree,
    foreach_tree, try_tree, return_tree, break_tree, continue_tree,
    throw_tree, identifier_var_tree, set_tree, math_set_tree,
    call_tree, delete_tree, vm_tree, block_tree
} from '../tree'
import {
    get_tree, get_node_tree, chain_get_tree, variable_get_tree,
    call_get_tree as call_get_expr, array_get_tree, map_get_tree,
    pointer_get_tree, math_oper_get_tree, bool_oper_get_tree,
    ternary_get_tree, lambda_get_tree, lambda_call_get_tree,
    new_get_tree, number_get_tree, string_get_tree,
    boolean_get_tree, null_get_tree
} from '../tree'
import {basic_type_tree, array_type_tree, class_type_tree, type_tree} from '../tree'
import {basic_type, pointer_type} from '../model'

export class CheckResult {
    errors: string[]
    warnings: string[]

    constructor() {
        this.errors = []
        this.warnings = []
    }

    error(msg: string) {
        this.errors.push(msg)
    }

    warn(msg: string) {
        this.warnings.push(msg)
    }

    hasErrors(): boolean {
        return this.errors.length > 0
    }

    report(): string {
        const lines: string[] = []
        for (const e of this.errors) lines.push(`ERROR: ${e}`)
        for (const w of this.warnings) lines.push(`WARN:  ${w}`)
        return lines.join('\n')
    }
}

export class Validator {
    root: Scope
    result: CheckResult
    // 跟踪当前作用域中被 delete 的变量名
    deletedVars: Map<number, Set<string>>

    constructor(root: Scope) {
        this.root = root
        this.result = new CheckResult()
        this.deletedVars = new Map()
    }

    validate(): CheckResult {
        for (const fileScope of this.root.children) {
            this.validateFileScope(fileScope)
        }
        return this.result
    }

    validateFileScope(fileScope: Scope) {
        this.checkImports(fileScope)
        this.validateScope(fileScope, fileScope)
    }

    // ========== 递归遍历作用域 ==========

    validateScope(scope: Scope, fileScope: Scope) {
        this.checkNameConflicts(scope)
        this.checkModifiers(scope)
        this.checkNesting(scope)
        this.checkClassImplements(scope)
        this.checkInterfaceOf(scope)
        this.checkConstructorVoid(scope)
        this.checkFileTopLevel(scope, fileScope)
        this.checkAccessModifiersInScope(scope)
        this.checkCommands(scope, fileScope)
        for (const child of scope.children) {
            this.validateScope(child, fileScope)
        }
    }

    // ========== 1. 修饰符检查 ==========
    // async/sync 仅对函数有效，非函数默认 sync
    // static/unstatic 仅对函数有效（modifiers 默认值使静态检查不可靠，跳过）

    checkModifiers(scope: Scope) {
        const node = scope.node
        if (!node || !(node instanceof space_tree)) return
        if (node instanceof module_tree) return

        const mod = node.modifiers
        if (!mod) return

        const isFunc = node instanceof func_tree

        // async/sync 仅对函数有效
        if (!isFunc) {
            if (mod.async === true) {
                this.result.warn(`${scope.kind} '${scope.name}' 不应使用 async 修饰符，仅函数支持 async/sync`)
            }
            if (mod.sync === false) {
                this.result.warn(`${scope.kind} '${scope.name}' 不应设置 sync=false，仅函数支持 async/sync`)
            }
        }
    }

    // ========== 2. 嵌套规则 ==========

    checkNesting(scope: Scope) {
        for (const child of scope.children) {
            if (child.kind === 'module') {
                if (scope.kind !== 'root' && scope.kind !== 'file' && scope.kind !== 'module') {
                    this.result.error(
                        `不能在 ${scope.kind} '${scope.name}' 中定义模块 '${child.name}'，` +
                        `仅模块可以包含模块`
                    )
                }
            }
        }
    }

    // ========== 3. 命名冲突 ==========

    checkNameConflicts(scope: Scope) {
        for (const [name, decls] of scope.declarations) {
            if (decls.length <= 1) continue

            const nonModules = decls.filter(d => d.kind !== 'module' && d.kind !== 'import')
            for (let i = 0; i < nonModules.length; i++) {
                for (let j = i + 1; j < nonModules.length; j++) {
                    const a = nonModules[i], b = nonModules[j]
                    if (a.kind === 'function' && b.kind === 'function') {
                        if (a.paramSig === b.paramSig) {
                            this.result.error(
                                `在 ${scope.kind} '${scope.name}' 中函数 '${name}' 重复声明 (相同参数 ${a.paramSig})`
                            )
                        }
                    } else {
                        this.result.error(
                            `在 ${scope.kind} '${scope.name}' 中 '${name}' 重复声明`
                        )
                    }
                }
            }
        }
    }

    // ========== 4. Class implements ==========

    checkClassImplements(scope: Scope) {
        const node = scope.node
        if (!(node instanceof class_tree)) return
        if (!node.implements || node.implements === 'Lang.ObjectInterface' || node.implements === 'ObjectInterface') return

        const ifaceChain = this.resolveInterfaceChain(node.implements, scope)
        if (ifaceChain.length === 0) {
            this.result.error(
                `类 '${scope.name}' 实现未找到的接口 '${node.implements}'`
            )
            return
        }

        for (const iface of ifaceChain) {
            for (const [fname, decls] of iface.declarations) {
                if (decls.length === 0) continue
                if (decls[0].kind !== 'function') continue
                const classFunc = scope.lookup(fname)
                const implemented = classFunc.some(d =>
                    d.kind === 'function' && d.paramSig === decls[0].paramSig
                )
                if (!implemented) {
                    this.result.error(
                        `类 '${scope.name}' 未实现接口 '${iface.name}' 中的函数 '${fname}'${decls[0].paramSig}`
                    )
                }
            }
        }
    }

    resolveInterfaceChain(name: string, scope: Scope): Scope[] {
        const result: Scope[] = []
        const visited = new Set<string>()
        let currentName = name

        while (currentName && currentName !== 'Lang.ObjectInterface' && !visited.has(currentName)) {
            visited.add(currentName)
            const ifaceScope = this.findInterfaceScope(currentName, scope)
            if (!ifaceScope) break
            result.push(ifaceScope)

            const ifaceNode = ifaceScope.node
            if (ifaceNode instanceof interface_tree && ifaceNode.of) {
                currentName = ifaceNode.of
                if (currentName === 'Lang.ObjectInterface') break
            } else {
                break
            }
        }
        return result
    }

    findInterfaceScope(name: string, scope: Scope): Scope | null {
        let s: Scope | null = scope
        while (s) {
            for (const child of s.children) {
                if (child.kind === 'interface' && child.name === name) {
                    return child
                }
                // 穿透 file scope 搜索跨文件声明的接口
                if (child.kind === 'file') {
                    const found = this.searchInFileScope(name, child)
                    if (found) return found
                }
            }
            s = s.parent
        }
        return null
    }

    searchInFileScope(name: string, fileScope: Scope): Scope | null {
        for (const child of fileScope.children) {
            if (child.kind === 'interface' && child.name === name) {
                return child
            }
            // 也搜索嵌套的模块
            if (child.kind === 'module') {
                const found = this.searchInModuleScope(name, child)
                if (found) return found
            }
        }
        return null
    }

    searchInModuleScope(name: string, modScope: Scope): Scope | null {
        for (const child of modScope.children) {
            if (child.kind === 'interface' && child.name === name) {
                return child
            }
            if (child.kind === 'module') {
                const found = this.searchInModuleScope(name, child)
                if (found) return found
            }
        }
        return null
    }

    // ========== 5. Interface of 链 ==========

    checkInterfaceOf(_scope: Scope) {
        for (const child of _scope.children) {
            if (child.kind !== 'interface') continue
            const node = child.node
            if (!(node instanceof interface_tree)) continue

            const funcs = new Map<string, DeclEntry[]>()
            for (const [name, decls] of child.declarations) {
                if (decls.length === 0) continue
                if (decls[0].kind === 'function') {
                    const existing = funcs.get(name)
                    if (existing) {
                        for (const d of decls) {
                            const conflict = existing.some(e => e.paramSig === d.paramSig)
                            if (conflict) {
                                this.result.error(
                                    `接口 '${child.name}' 中函数 '${name}'${d.paramSig} 重复声明`
                                )
                            }
                        }
                    } else {
                        funcs.set(name, [...decls])
                    }
                }
            }
        }
    }

    // ========== 6. 文件顶层必须是模块 ==========

    checkFileTopLevel(scope: Scope, _fileScope: Scope) {
        // 只对 file scope 的直接子节点检查
        if (scope.kind !== 'file') return
        for (const child of scope.children) {
            // 文件顶层只允许 module（以及 import 收集后产生的声明）
            if (child.kind !== 'module') {
                this.result.error(
                    `文件顶层只能是 module，不能直接定义 '${child.name}' (${child.kind})，` +
                    `非 module 块必须嵌套在 module 或其他块内部`
                )
            }
        }
    }

    // ========== 7. 构造函数必须为 void ==========

    checkConstructorVoid(scope: Scope) {
        const node = scope.node
        if (!(node instanceof class_tree)) return
        for (const [name, decls] of scope.declarations) {
            if (name !== scope.name) continue
            for (const d of decls) {
                if (d.kind !== 'function') continue
                const funcNode = d.node as func_tree
                if (funcNode.return_type instanceof basic_type_tree &&
                    funcNode.return_type.type_name !== basic_type.void_) {
                    this.result.error(
                        `类 '${scope.name}' 的同名函数（构造函数）必须为 void 返回类型`
                    )
                }
            }
        }
    }

    // ========== 8. 函数返回值检查 ==========

    checkFunctionReturn(func: func_tree, funcScope: Scope) {
        if (func.return_type instanceof basic_type_tree &&
            func.return_type.type_name === basic_type.void_) return // void 函数无所谓

        if (!func.commands || func.commands.length === 0) {
            this.result.warn(`非 void 函数 '${func.name}' 没有返回值`)
            return
        }

        // 检查是否有 return 语句
        const hasReturn = this.hasReturnStatement(func.commands)
        if (!hasReturn) {
            this.result.warn(`非 void 函数 '${func.name}' 可能没有返回值`)
        }
    }

    hasReturnStatement(commands: command_tree[]): boolean {
        for (const cmd of commands) {
            if (cmd instanceof return_tree) return true
            if (cmd instanceof if_tree) {
                const inBody = cmd.commands ? this.hasReturnStatement(cmd.commands) : false
                const inElse = cmd.else ? this.hasReturnStatement(cmd.else) : false
                // 如果所有分支都有 return，这个 if 就有 return
                if (inBody && inElse) return true
                // 否则继续检查
                if (inBody || inElse) continue
            }
            if (cmd.commands && this.hasReturnStatement(cmd.commands)) return true
        }
        return false
    }

    // ========== 9. 变量存在性检查 ==========

    checkVariableExists(name: string, scope: Scope): boolean {
        if (name === 'up') return true // up 是关键字
        if (name === 'this' || name === 'self') return true
        const found = scope.lookupRecursive(name)
        if (found.length === 0) {
            this.result.error(`不能访问不存在的变量 '${name}'`)
            return false
        }
        return true
    }

    // ========== 10. up.xxx 作用域链验证 ==========

    checkUpChain(chain: chain_get_tree, scope: Scope) {
        let upCount = 0
        let currentScope = scope

        for (const elem of chain.chain) {
            if (elem instanceof variable_get_tree && elem.name === 'up') {
                upCount++
                if (currentScope.parent) {
                    currentScope = currentScope.parent
                } else {
                    this.result.error(`up 访问越界，没有足够的父作用域层级`)
                    return
                }
            } else if (elem instanceof variable_get_tree) {
                // 在 up 之后查找变量
                if (upCount > 0) {
                    const found = currentScope.lookup(elem.name)
                    if (found.length === 0) {
                        this.result.error(`在父作用域中找不到变量 '${elem.name}'`)
                    }
                }
            }
        }
    }

    // ========== 11. 命令规则 ==========

    checkCommands(scope: Scope, fileScope: Scope) {
        const node = scope.node
        if (!node) return

        if (node instanceof func_tree && node.commands) {
            this.checkFunctionReturn(node, scope)
            this.walkCommands(node.commands, scope, scope, fileScope, false)
        } else if (node instanceof func_tree) {
            this.checkFunctionReturn(node, scope)
        } else if (node instanceof block_tree && node.commands) {
            this.walkCommands(node.commands, scope, scope, fileScope, false)
        } else if (node instanceof if_tree && node.commands) {
            this.walkCommands(node.commands, scope, scope, fileScope, false)
        } else if (node instanceof while_tree && node.commands) {
            this.walkCommands(node.commands, scope, scope, fileScope, true)
        } else if (node instanceof for_tree && node.body) {
            this.walkCommands(node.body, scope, scope, fileScope, true)
        } else if (node instanceof foreach_tree && node.commands) {
            this.walkCommands(node.commands, scope, scope, fileScope, true)
        } else if (node instanceof try_tree && node.commands) {
            this.walkCommands(node.commands, scope, scope, fileScope, false)
        } else if (node instanceof switch_tree) {
            for (const c of node.cases) {
                if (c.call) this.walkCommands(c.call, scope, scope, fileScope, false)
            }
            if (node.default) this.walkCommands(node.default, scope, scope, fileScope, false)
        }
    }

    walkCommands(commands: command_tree[], scope: Scope, funcScope: Scope, fileScope: Scope, inLoop: boolean) {
        for (const cmd of commands) {
            this.walkCommand(cmd, scope, funcScope, fileScope, inLoop)
        }
    }

    walkCommand(cmd: command_tree, scope: Scope, funcScope: Scope, fileScope: Scope, inLoop: boolean) {
        if (!cmd) return

        // 检查 break/continue — 使用传入的 inLoop 标志
        if (cmd instanceof break_tree || cmd instanceof continue_tree) {
            const name = cmd instanceof break_tree ? 'break' : 'continue'
            if (!inLoop) {
                this.result.error(`${name} 只能在 for/while/foreach/do-while 循环中使用`)
            }
        }

        // 检查 return
        if (cmd instanceof return_tree) {
            if (funcScope.return_type instanceof basic_type_tree &&
                funcScope.return_type.type_name === basic_type.void_ &&
                cmd.value) {
                this.result.warn(`void 函数 '${funcScope.name}' 不应返回值，应使用 'return;'`)
            }
            // 检查非 void 函数的返回值类型匹配
            if (funcScope.return_type instanceof basic_type_tree &&
                funcScope.return_type.type_name !== basic_type.void_ &&
                cmd.value) {
                this.checkReturnTypeMatch(cmd, funcScope, scope)
            }
            // 非 void 函数无返回值
            if (funcScope.return_type instanceof basic_type_tree &&
                funcScope.return_type.type_name !== basic_type.void_ &&
                !cmd.value) {
                this.result.warn(`非 void 函数 '${funcScope.name}' 的 return 语句没有返回值`)
            }
        }

        // 检查 var 的 any 类型
        if (cmd instanceof identifier_var_tree) {
            const tp = cmd.identifier.value
            if (tp instanceof basic_type_tree && tp.type_name === basic_type.any_) {
                this.result.error(`变量 '${cmd.identifier.key}' 不能使用 any 类型`)
            }
        }

        // 检查 foreach — 仅可用于 map/array
        if (cmd instanceof foreach_tree) {
            this.checkForeachTarget(cmd, scope)
        }

        // 检查 for — condition lambda 必须返回 boolean
        if (cmd instanceof for_tree) {
            this.checkForCondition(cmd, scope)
        }

        // 检查函数调用参数
        if (cmd instanceof call_tree) {
            this.checkFunctionCallArgs(cmd, scope)
        }

        // 检查 delete — 标记被删除的变量
        if (cmd instanceof delete_tree) {
            this.trackDeletedVar(cmd, scope)
        }

        // 检查作用域访问（含指针操作、delete 后访问）
        this.checkScopeAccess(cmd, scope)

        // === 递归遍历子命令，传递正确的 inLoop 标志 ===
        // 注意：以下类型有专门的子命令处理，跳过通用的 cmd.commands 遍历
        const isSpecial = cmd instanceof if_tree || cmd instanceof while_tree ||
            cmd instanceof for_tree || cmd instanceof foreach_tree ||
            cmd instanceof switch_tree || cmd instanceof try_tree

        if (!isSpecial) {
            if (cmd.commands && cmd.commands.length > 0) {
                this.walkCommands(cmd.commands, scope, funcScope, fileScope, inLoop)
            }
        }

        // if — body 保持当前状态
        if (cmd instanceof if_tree) {
            if (cmd.commands) this.walkCommands(cmd.commands, scope, funcScope, fileScope, inLoop)
            if (cmd.else) this.walkCommands(cmd.else, scope, funcScope, fileScope, inLoop)
            for (const ei of cmd.else_if) {
                if (ei.commands) this.walkCommands(ei.commands, scope, funcScope, fileScope, inLoop)
            }
        }

        // while — body 是循环内
        if (cmd instanceof while_tree && cmd.commands) {
            this.walkCommands(cmd.commands, scope, funcScope, fileScope, true)
        }

        // for — body 是循环内
        if (cmd instanceof for_tree && cmd.body) {
            this.walkCommands(cmd.body, scope, funcScope, fileScope, true)
            // 遍历 init/condition/step lambdas
            if (cmd.init) this.walkLambdaBody(cmd.init, scope, funcScope, fileScope, false)
            if (cmd.condition) this.walkLambdaBody(cmd.condition, scope, funcScope, fileScope, false)
            if (cmd.step) this.walkLambdaBody(cmd.step, scope, funcScope, fileScope, false)
        }

        // foreach — body 是循环内
        if (cmd instanceof foreach_tree && cmd.commands) {
            this.walkCommands(cmd.commands, scope, funcScope, fileScope, true)
        }

        // switch — cases 保持当前状态
        if (cmd instanceof switch_tree) {
            for (const c of cmd.cases) {
                if (c.call) this.walkCommands(c.call, scope, funcScope, fileScope, inLoop)
            }
            if (cmd.default) this.walkCommands(cmd.default, scope, funcScope, fileScope, inLoop)
        }

        // try — body/finally 保持当前状态
        if (cmd instanceof try_tree) {
            if (cmd.commands) this.walkCommands(cmd.commands, scope, funcScope, fileScope, inLoop)
            if (cmd.catch) this.walkLambdaBody(cmd.catch, scope, funcScope, fileScope, inLoop)
            if (cmd.finally) this.walkCommands(cmd.finally, scope, funcScope, fileScope, inLoop)
        }
    }

    walkLambdaBody(lambda: lambda_get_tree, scope: Scope, funcScope: Scope, fileScope: Scope, inLoop: boolean) {
        if (lambda.body) {
            this.walkCommands(lambda.body, scope, funcScope, fileScope, inLoop)
        }
    }

    // ========== 12. 作用域访问检查 ==========

    checkScopeAccess(cmd: command_tree, scope: Scope) {
        this.walkCmdExpressions(cmd, (get) => {
            if (get instanceof variable_get_tree) {
                const name = get.name
                if (name === 'up' || name === 'this' || name === 'self') return
                // 检查 delete 后访问
                this.checkDeletedAccess(name, scope)
            } else if (get instanceof chain_get_tree) {
                this.checkChainAccess(get, scope)
            } else if (get instanceof pointer_get_tree) {
                this.checkPointerOperType(get, scope)
            }
        })
    }

    checkChainAccess(chain: chain_get_tree, scope: Scope) {
        let currentScope = scope
        for (let i = 0; i < chain.chain.length; i++) {
            const elem = chain.chain[i]
            if (elem instanceof variable_get_tree) {
                if (elem.name === 'up') {
                    if (currentScope.parent) {
                        currentScope = currentScope.parent
                    } else {
                        this.result.error(`'up' 访问越界，当前作用域没有父作用域`)
                        return
                    }
                    continue
                }
                // 检查变量是否存在
                this.checkVariableExists(elem.name, currentScope)
                // 检查 delete 后访问
                this.checkDeletedAccess(elem.name, currentScope)
                // 检查访问权限
                this.checkAccessModifier(elem.name, currentScope, scope)
                const found = currentScope.lookup(elem.name)
                if (found.length > 0) {
                    if (found[0].kind === 'module' || found[0].kind === 'class') {
                        for (const child of currentScope.children) {
                            if (child.name === elem.name &&
                                (child.kind === 'module' || child.kind === 'class')) {
                                currentScope = child
                                break
                            }
                        }
                    }
                }
            } else if (elem instanceof pointer_get_tree) {
                this.checkPointerOperType(elem, scope)
            } else if (elem instanceof array_get_tree) {
                if (elem.name) this.walkExprNode(elem.name, (g) => {})
                if (elem.index) this.walkExprNode(elem.index, (g) => {})
            } else {
                break
            }
        }
    }

    // ========== 13. foreach 目标类型检查 ==========

    checkForeachTarget(cmd: foreach_tree, scope: Scope) {
        if (!cmd.array || !cmd.array.tree) return
        // 尝试从表达式推断目标类型
        const targetName = this.getRootVarName(cmd.array.tree)
        if (!targetName) return
        const decls = scope.lookupRecursive(targetName)
        if (decls.length === 0) return
        const decl = decls[0]
        // 检查变量类型
        if (decl.kind === 'var') {
            const varNode = decl.node as any
            if (varNode.identifier && varNode.identifier.value) {
                const tp = varNode.identifier.value
                const typeOK = tp instanceof array_type_tree ||
                    (tp instanceof basic_type_tree &&
                        (tp.type_name === basic_type.map || tp.type_name === basic_type.string))
                if (!typeOK) {
                    this.result.error(
                        `foreach 只能用于 map/array/string 类型，变量 '${targetName}' 类型不匹配`
                    )
                }
            }
        }
    }

    getRootVarName(chain: chain_get_tree): string | null {
        if (!chain || !chain.chain || chain.chain.length === 0) return null
        const first = chain.chain[0]
        if (first instanceof variable_get_tree) return first.name
        if (first instanceof chain_get_tree) return this.getRootVarName(first)
        return null
    }

    // ========== 14. 指针类型检查 ==========

    checkPointerOperType(expr: pointer_get_tree, scope: Scope) {
        if (expr.oper_type === pointer_type.address) {
            // &a 可以对任何类型，无需额外检查
            return
        }
        if (expr.oper_type === pointer_type.value) {
            // *a 只能对 number（指针值）
            if (expr.data instanceof variable_get_tree) {
                const name = expr.data.name
                const decls = scope.lookupRecursive(name)
                if (decls.length > 0 && decls[0].kind === 'var') {
                    const varNode = decls[0].node as any
                    if (varNode.identifier && varNode.identifier.value) {
                        const tp = varNode.identifier.value
                        if (tp instanceof basic_type_tree && tp.type_name !== basic_type.number) {
                            this.result.error(`寻址操作 * 只能对 number 类型，变量 '${name}' 类型不匹配`)
                        }
                    }
                }
            }
        }
    }

    // ========== 15. for 循环 condition lambda 返回类型检查 ==========

    checkForCondition(cmd: for_tree, _scope: Scope) {
        if (!cmd.condition) {
            this.result.error(`for 循环必须有 condition lambda`)
            return
        }
        // condition 是 lambda_get_tree，检查其返回类型
        if (cmd.condition instanceof lambda_get_tree) {
            // lambda 的返回类型存储在 param.return 或类似字段
            // 检查返回类型是否为 boolean
            const lambdaNode = cmd.condition as any
            if (lambdaNode.return_type) {
                const rt = lambdaNode.return_type
                if (rt instanceof basic_type_tree && rt.type_name !== basic_type.boolean) {
                    this.result.error(
                        `for 循环的 condition lambda 必须返回 boolean，当前返回 ${basic_type[rt.type_name]}`
                    )
                }
            }
        }
    }

    // ========== 16. 函数调用参数检查 ==========

    checkFunctionCallArgs(cmd: call_tree, scope: Scope) {
        const name = cmd.name
        if (!name) return
        // 查找函数声明
        const decls = scope.lookupRecursive(name)
        if (decls.length === 0) return
        // 过滤出函数声明
        const funcDecls = decls.filter(d => d.kind === 'function')
        if (funcDecls.length === 0) return

        const callArgCount = cmd.param && cmd.param.args ? cmd.param.args.length : 0

        let bestMatch: DeclEntry | null = null
        for (const d of funcDecls) {
            const funcNode = d.node as func_tree
            const declParamCount = funcNode.params && funcNode.params.param
                ? funcNode.params.param.length : 0
            if (declParamCount === callArgCount) {
                bestMatch = d
                break
            }
            if (bestMatch === null) {
                bestMatch = d // fallback
            }
        }

        if (bestMatch) {
            const funcNode = bestMatch.node as func_tree
            const declParamCount = funcNode.params && funcNode.params.param
                ? funcNode.params.param.length : 0
            if (declParamCount !== callArgCount) {
                this.result.error(
                    `函数 '${name}' 需要 ${declParamCount} 个参数，但调用时传入了 ${callArgCount} 个`
                )
            }
        }
    }

    // ========== 17. 返回值类型匹配检查 ==========

    checkReturnTypeMatch(cmd: return_tree, funcScope: Scope, scope: Scope) {
        if (!cmd.value || !cmd.value.tree) return
        const returnType = funcScope.return_type
        if (!returnType || !(returnType instanceof basic_type_tree)) return

        const expected = returnType.type_name

        // 尝试推断返回值类型
        const actual = this.inferExpressionType(cmd.value.tree, scope)
        if (actual === null || actual === undefined) return

        if (actual !== expected) {
            // null 可以返回给任何类型
            if (actual === -1) {
                return
            }
            this.result.error(
                `函数 '${funcScope.name}' 返回类型应为 ${basic_type[expected]}，` +
                `但实际返回 ${basic_type[actual] || actual}`
            )
        }
    }

    inferExpressionType(chain: chain_get_tree, scope: Scope): number | null {
        if (!chain || !chain.chain || chain.chain.length === 0) return null
        const last = chain.chain[chain.chain.length - 1]

        // 直接量类型
        if (last instanceof number_get_tree) return basic_type.number
        if (last instanceof string_get_tree) return basic_type.string
        if (last instanceof boolean_get_tree) return basic_type.boolean
        if (last instanceof null_get_tree) return -1 // null 类型用 -1 表示

        // 变量类型
        if (last instanceof variable_get_tree) {
            const decls = scope.lookupRecursive(last.name)
            if (decls.length > 0) {
                const d = decls[0]
                if (d.kind === 'var') {
                    const varNode = d.node as any
                    if (varNode.identifier && varNode.identifier.value) {
                        const tp = varNode.identifier.value
                        if (tp instanceof basic_type_tree) return tp.type_name
                    }
                }
                if (d.kind === 'const') {
                    const constNode = d.node as any
                    if (constNode.const_type && constNode.const_type instanceof basic_type_tree)
                        return constNode.const_type.type_name
                }
            }
        }

        // 运算结果推断 — + 可能是数字或字符串，保守返回 null
        if (last instanceof math_oper_get_tree) return null
        if (last instanceof bool_oper_get_tree) return basic_type.boolean
        if (last instanceof pointer_get_tree) {
            if (last.oper_type === pointer_type.value) return basic_type.number
        }

        // new 表达式返回 map
        if (last instanceof new_get_tree) return basic_type.map

        // 函数调用结果
        if (last instanceof call_get_expr) {
            const callName = this.getRootVarNameFromExpr(last.name?.tree)
            if (callName) {
                const decls = scope.lookupRecursive(callName)
                for (const d of decls) {
                    if (d.kind === 'function') {
                        const fn = d.node as func_tree
                        if (fn.return_type instanceof basic_type_tree)
                            return fn.return_type.type_name
                    }
                }
            }
        }

        // 三元表达式
        if (last instanceof ternary_get_tree) {
            const t = this.inferExpressionType(last.true_value?.tree, scope)
            const f = this.inferExpressionType(last.false_value?.tree, scope)
            return t || f || null
        }

        return null
    }

    getRootVarNameFromExpr(chain: chain_get_tree | null): string | null {
        if (!chain || !chain.chain || chain.chain.length === 0) return null
        const first = chain.chain[0]
        if (first instanceof variable_get_tree) return first.name
        return null
    }

    // ========== 18. delete 变量跟踪 ==========

    trackDeletedVar(cmd: delete_tree, scope: Scope) {
        const name = cmd.name
        if (!name) return
        // 使用 scope 的某种标识作为 key (简化：用 scope 层级+名称)
        const key = this.getScopeKey(scope)
        if (!this.deletedVars.has(key)) {
            this.deletedVars.set(key, new Set())
        }
        this.deletedVars.get(key)!.add(name)
    }

    checkDeletedAccess(name: string, scope: Scope) {
        // 检查当前作用域及所有祖先作用域中被 delete 的变量
        let s: Scope | null = scope
        while (s) {
            const key = this.getScopeKey(s)
            const deleted = this.deletedVars.get(key)
            if (deleted && deleted.has(name)) {
                this.result.error(
                    `变量 '${name}' 已被 delete，不可再访问`
                )
                return
            }
            s = s.parent
        }
    }

    getScopeKey(scope: Scope): number {
        // 用 scope 节点身份作为 key
        let key = 0
        let s: Scope | null = scope
        while (s) {
            // 简单哈希：用层级深度 + 名字/kind
            key = key * 31 + (s.name ? s.name.length : 0) + (s.kind ? s.kind.length : 0)
            s = s.parent
        }
        return key
    }

    // ========== 19. 访问权限检查 ==========

    checkAccessModifiersInScope(scope: Scope) {
        // 对每个 class 作用域，检查私有成员的访问
        if (scope.kind !== 'class') return
        // 收集所有 private 声明
        const privates = new Set<string>()
        for (const [name, decls] of scope.declarations) {
            for (const d of decls) {
                const node = d.node
                if (node instanceof space_tree && node.modifiers && node.modifiers.private) {
                    privates.add(name)
                }
            }
        }
        // 将私有成员信息附加到 scope（供后续检查使用）
        ;(scope as any).__privates = privates
    }

    checkAccessModifier(name: string, currentScope: Scope, accessScope: Scope) {
        // 如果访问的变量在 class 作用域中声明为 private，检查是否在同类内部访问
        let s: Scope | null = accessScope
        while (s) {
            if (s.kind === 'class' || s.kind === 'module') {
                const decls = s.lookup(name)
                if (decls.length > 0) {
                    for (const d of decls) {
                        const node = d.node
                        if (node instanceof space_tree && node.modifiers && node.modifiers.private) {
                            // 检查当前访问是否在同一个 class 内
                            let cs: Scope | null = currentScope
                            let sameClass = false
                            while (cs) {
                                if (cs === s) { sameClass = true; break }
                                cs = cs.parent
                            }
                            if (!sameClass) {
                                this.result.error(
                                    `不能从外部访问 private 成员 '${name}'（声明在 ${s.kind} '${s.name}' 中）`
                                )
                            }
                        }
                    }
                }
                break
            }
            s = s.parent
        }
    }

    // ========== 8. Import 规则 ==========

    checkImports(fileScope: Scope) {
        // 收集所有 import
        const allImports: import_tree[] = []
        for (const [_, decls] of fileScope.declarations) {
            for (const d of decls) {
                if (d.kind === 'import') {
                    allImports.push(d.node as import_tree)
                }
            }
        }

        // 检查别名冲突
        const aliasMap = new Map<string, string[]>()  // alias → modules
        for (const imp of allImports) {
            const existing = aliasMap.get(imp.name)
            if (existing) {
                existing.push(imp.module)
            } else {
                aliasMap.set(imp.name, [imp.module])
            }
        }

        for (const [alias, modules] of aliasMap) {
            if (modules.length <= 1) continue
            // 检查是否来自不同模块
            const uniqueModules = new Set(modules)
            if (uniqueModules.size > 1) {
                this.result.error(`不能将不同模块 import 为相同别名 '${alias}'`)
            }
        }

        // 检查同一个模块多次 import（无 as 的情况）
        const moduleCount = new Map<string, number>()
        for (const imp of allImports) {
            // 如果别名 != 模块名，说明使用了 as，不计入
            if (imp.name === imp.module) {
                const count = moduleCount.get(imp.module) || 0
                moduleCount.set(imp.module, count + 1)
            }
        }

        for (const [module, count] of moduleCount) {
            if (count > 1) {
                this.result.error(`不能多次 import 模块 '${module}'（无 as 别名时）`)
            }
        }
    }

    // ========== 表达式遍历 ==========

    walkCmdExpressions(cmd: command_tree, visitor: (get: get_tree) => void) {
        if (cmd instanceof set_tree && cmd.value) {
            this.walkExprNode(cmd.value, visitor)
        }
        if (cmd instanceof math_set_tree && cmd.value) {
            this.walkExprNode(cmd.value, visitor)
        }
        if (cmd instanceof return_tree && cmd.value) {
            this.walkExprNode(cmd.value, visitor)
        }
        if (cmd instanceof throw_tree && cmd.value) {
            this.walkExprNode(cmd.value, visitor)
        }
        if (cmd instanceof call_tree) {
            if (cmd.param && cmd.param.args) {
                for (const arg of cmd.param.args) {
                    this.walkExprNode(arg, visitor)
                }
            }
        }
        if (cmd instanceof if_tree && cmd.condition) {
            this.walkExprNode(cmd.condition, visitor)
        }
        if (cmd instanceof while_tree && cmd.condition) {
            this.walkExprNode(cmd.condition, visitor)
        }
        if (cmd instanceof foreach_tree && cmd.array) {
            this.walkExprNode(cmd.array, visitor)
        }
        if (cmd instanceof switch_tree && cmd.condition) {
            this.walkExprNode(cmd.condition, visitor)
        }
        if (cmd instanceof identifier_var_tree && cmd.value) {
            this.walkExprNode(cmd.value, visitor)
        }
        if (cmd instanceof for_tree) {
            if (cmd.init) this.walkLambdaExpr(cmd.init, visitor)
            if (cmd.condition) this.walkLambdaExpr(cmd.condition, visitor)
            if (cmd.step) this.walkLambdaExpr(cmd.step, visitor)
        }
        if (cmd instanceof try_tree && cmd.catch) {
            this.walkLambdaExpr(cmd.catch, visitor)
        }
    }

    walkLambdaExpr(lambda: lambda_get_tree, visitor: (get: get_tree) => void) {
        if (lambda.body) {
            for (const c of lambda.body) {
                this.walkCmdExpressions(c, visitor)
                if (c.commands) {
                    for (const sub of c.commands) {
                        this.walkCmdExpressions(sub, visitor)
                    }
                }
            }
        }
    }

    walkExprNode(node: get_node_tree, visitor: (get: get_tree) => void) {
        if (!node || !node.tree || !node.tree.chain) return
        for (const elem of node.tree.chain) {
            this.walkExpression(elem, visitor)
        }
    }

    walkExpression(expr: get_tree, visitor: (get: get_tree) => void) {
        if (!expr) return
        visitor(expr)

        if (expr instanceof chain_get_tree) {
            for (const e of expr.chain) {
                this.walkExpression(e, visitor)
            }
        } else if (expr instanceof call_get_expr) {
            if (expr.name) this.walkExprNode(expr.name, visitor)
            if (expr.params && expr.params.args) {
                for (const a of expr.params.args) {
                    this.walkExprNode(a, visitor)
                }
            }
        } else if (expr instanceof new_get_tree) {
            if (expr.name) this.walkExprNode(expr.name, visitor)
            if (expr.params && expr.params.args) {
                for (const a of expr.params.args) {
                    this.walkExprNode(a, visitor)
                }
            }
        } else if (expr instanceof array_get_tree) {
            if (expr.name) this.walkExprNode(expr.name, visitor)
            if (expr.index) this.walkExprNode(expr.index, visitor)
        } else if (expr instanceof map_get_tree) {
            for (const entry of expr.map) {
                if (entry.get) this.walkExpression(entry.get, visitor)
            }
        } else if (expr instanceof pointer_get_tree) {
            if (expr.data) this.walkExpression(expr.data, visitor)
        } else if (expr instanceof math_oper_get_tree) {
            if (expr.left) this.walkExpression(expr.left, visitor)
            if (expr.right) this.walkExpression(expr.right, visitor)
        } else if (expr instanceof bool_oper_get_tree) {
            if (expr.left) this.walkExprNode(expr.left, visitor)
            if (expr.right) this.walkExprNode(expr.right, visitor)
        } else if (expr instanceof ternary_get_tree) {
            if (expr.condition) this.walkExprNode(expr.condition, visitor)
            if (expr.true_value) this.walkExprNode(expr.true_value, visitor)
            if (expr.false_value) this.walkExprNode(expr.false_value, visitor)
        } else if (expr instanceof lambda_get_tree) {
            this.walkLambdaExpr(expr, visitor)
        }
    }
}