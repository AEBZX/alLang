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
import {basic_type} from '../model'

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

    constructor(root: Scope) {
        this.root = root
        this.result = new CheckResult()
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
        this.checkCommands(scope, fileScope)
        for (const child of scope.children) {
            this.validateScope(child, fileScope)
        }
    }

    // ========== 1. 修饰符检查 ==========

    checkModifiers(scope: Scope) {
        const node = scope.node
        if (!node || !(node instanceof space_tree)) return
        if (node instanceof module_tree) return
        if (node instanceof func_tree) return

        const mod = node.modifiers
        if (!mod) return

        if (mod.async === true && mod.sync === false) {
            this.result.warn(`${scope.kind} '${scope.name}' 不应使用 async 修饰符`)
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
            }
            s = s.parent
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

    // ========== 6. 命令规则 ==========

    checkCommands(scope: Scope, fileScope: Scope) {
        const node = scope.node
        if (!node) return

        if (node instanceof func_tree && node.commands) {
            this.walkCommands(node.commands, scope, scope, fileScope, false)
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
        }

        // 检查 var 的 any 类型
        if (cmd instanceof identifier_var_tree) {
            const tp = cmd.identifier.value
            if (tp instanceof basic_type_tree && tp.type_name === basic_type.any_) {
                this.result.error(`变量 '${cmd.identifier.key}' 不能使用 any 类型`)
            }
        }

        // 检查作用域访问
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

        // do-while — body 是循环内
        if (cmd.commands && cmd instanceof while_tree) {
            // 上面的条件已经处理了
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

    // ========== 7. 作用域访问检查 ==========

    checkScopeAccess(cmd: command_tree, scope: Scope) {
        this.walkCmdExpressions(cmd, (get) => {
            if (get instanceof variable_get_tree) {
                const name = get.name
                if (name === 'up') return
                // 查找变量声明
                const found = scope.lookupRecursive(name)
                // 如果找不到，可能是全局/跨模块引用，暂不报错
            } else if (get instanceof chain_get_tree) {
                this.checkChainAccess(get, scope)
            }
        })
    }

    checkChainAccess(chain: chain_get_tree, scope: Scope) {
        let currentScope = scope
        for (const elem of chain.chain) {
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
            } else {
                break
            }
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