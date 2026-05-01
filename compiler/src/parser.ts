import {
    annotation_tree, array_get_tree, array_type_tree,
    basic_type_tree, body, bool_oper_get_tree, boolean_get_tree, break_tree, call_get_tree, call_tree, class_tree,
    command_tree,
    continue_tree, delete_tree, enum_tree, for_tree, foreach_tree,
    func_tree, get_node_tree, get_tree, identifier_tree, identifier_var_tree, if_tree,
    import_tree, instanceof_get_tree, interface_tree, lambda_call_get_tree, lambda_get_tree,
    lambda_type_tree, map_get_tree, math_oper_get_tree,
    modifiers,
    module_tree, null_get_tree, number_get_tree,
    param_call_tree,
    param_identifier_tree, pointer_get_tree, return_tree,
    set_tree, string_get_tree, switch_tree, ternary_get_tree, throw_tree, type_tree, typeof_get_tree, var_tree,
    variable_get_tree, while_tree
} from './tree'
import {token, token_type, Tree} from 'allang-compiler-base'
import allang_tools from './allang_tools'
import allang_log from './allang_log'
import {basic_type, bool_oper_type, math_oper_type, pointer_type} from "./model";
import {class_type_tree, map_type_tree} from "./tree/identifier";
import {file_tree, space_tree, try_tree} from "./tree/block";
import {vm_tree} from "./tree/command";

function match_get(tool: allang_tools, log: allang_log): get_node_tree {
    return match_ternary(tool, log)
}

function match_get_basic(tool: allang_tools, log: allang_log): get_tree {
    if (!tool.now()) return null
    let basic: get_tree = null
    tool.backup()
    tool._match_type(token_type.number, () => {
        basic = new number_get_tree(parseFloat(tool.now().name))
    }, () => {
        tool._match_type(token_type.string, () => {
            basic = new string_get_tree(tool.now().name)
        }, () => {
            tool._match_word('true', () => {
                basic = new boolean_get_tree(true)
            }, () => {
                tool._match_word('false', () => {
                    basic = new boolean_get_tree(false)
                }, () => {
                    tool._match_word('null', () => {
                        basic = new null_get_tree()
                    }, () => {
                        tool.restore()
                        basic = null
                    })
                })
            })
        })
    })

    if (basic) {
        tool.kill()
        return basic
    }
    return null
}

function match_get_variable_or_new(tool: allang_tools, log: allang_log): get_tree {
    if (!tool.now()) return null
    let ret: get_tree = null
    tool.backup()

    let is_new = false
    tool._match_word('new', () => {
        is_new = true
    }, () => {
    })

    if (is_new) {
        let name = match_module_use(tool, log, true)
        if (!name) {
            log.error('new后缺少类名', tool.now()?.line || '')
            tool.restore()
            return null
        }
        let params = match_call_param(tool, log)
        if (!params) {
            log.error('new表达式缺少参数列表', tool.now()?.line || '')
            tool.restore()
            return null
        }
        ret = new call_get_tree(name, params)
        tool.kill()
        return ret
    }

    tool.restore()
    tool.backup()
    let name = match_module_use(tool, log, false)
    if (name) {
        ret = new variable_get_tree(name)
        tool.kill()
        return ret
    }

    tool.restore()
    return null
}

function match_get_map(tool: allang_tools, log: allang_log): map_get_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: map_get_tree = null
    tool._match_word('{', () => {
        tool.next()
        ret = new map_get_tree([])
        let split = true, bk = false
        while (true) {
            if (split) {
                tool._match_word(',', () => {
                    log.error('重复分隔符', tool.now().line)
                }, () => {
                    tool._match_word('}', () => {
                        bk = true
                    }, () => {
                        let key_token = tool.match_type(token_type.identifier, () => {
                            log.error('map键必须是标识符', tool.now().line)
                        })
                        if (!key_token) {
                            bk = true
                            return
                        }
                        tool.match_word(':', () => {
                            log.error('map缺少冒号', tool.now().line)
                        })
                        let value = match_get(tool, log)
                        if (!value) {
                            log.error('map值缺失', tool.now().line)
                        }
                        ret.map.push({key: key_token.name, get: value})
                        split = false
                    })
                })
            } else {
                tool._match_word('}', () => {
                    bk = true
                }, () => {
                    tool.match_word(',', () => {
                        log.error('缺少分隔符', tool.now().line)
                    })
                    split = true
                })
            }
            if (bk) break
        }
    }, () => {
    })

    if (ret) {
        tool.kill()
        return ret
    }
    tool.restore()
    return null
}

function match_get_lambda(tool: allang_tools, log: allang_log): lambda_get_tree {
    if (!tool.now() || tool.now().name !== '(') return null

    tool.backup()
    let param=match_param_identifier(tool, log)
    tool.match_word('=>', () => {
    })
    let body=match_commands(tool, log)
    tool.kill()
    return new lambda_get_tree(param, body)
}

function match_get_chain_element(tool: allang_tools, log: allang_log): get_tree {
    if (!tool.now()) return null
    let element: get_tree = null
    tool.backup()
    let name: string, next: boolean = true
    //尝试吃掉一个名字
    let ls=tool.index
    name = tool.match_type(token_type.identifier, () => {
        tool.restore()
        next = false
    })?.name
    if (next) {
        if (tool.now().name === '(') {
            let params = match_call_param(tool, log)
            if (params) {
                return new call_get_tree(name,params)
            }
        }
        if (tool.now().name === '[') {
            tool.backup()
            tool.match_word('[', () => {
            })
            let index = match_get(tool, log)
            if (!index) {
                log.error('数组索引表达式错误', tool.now().line)
            }
            tool.match_word(']', () => {
                log.error('数组索引缺少结束符', tool.now().line)
            })
            tool.kill()
            return new array_get_tree(name, get_node_tree.create([index]))
        }

        if (tool.now().name === '.') {
            tool.backup()
            tool.match_word('.', () => {
            })
            let name = tool.match_type(token_type.identifier, () => {
                log.error('成员访问缺少标识符', tool.now().line)
            })
            tool.kill()
            return new variable_get_tree(name.name)
        }
    }
    tool.index=ls
    element = match_get_basic(tool, log)
    if (element) return element

    element = match_get_map(tool, log)
    if (element) return element

    element = match_get_lambda(tool, log)
    if (element) return element

    element = match_get_variable_or_new(tool, log)
    if (element) return element
    return null
}

function match_get_chain(tool: allang_tools, log: allang_log): get_node_tree {
    if (!tool.now()) return null

    let first = match_get_chain_element(tool, log)
    if (!first) return null

    let chain: get_tree[] = [first]

    while (tool.now()) {
        let next = match_get_chain_element(tool, log)
        if (!next) break
        chain.push(next)
    }
    return get_node_tree.create(chain)
}

function match_get_unary(tool: allang_tools, log: allang_log): get_node_tree {
    if (!tool.now()) return null

    tool.backup()

    let oper: pointer_type | null = null
    if (tool.now().name === '*') {
        oper = pointer_type.value
        tool.next()
    } else if (tool.now().name === '&') {
        oper = pointer_type.address
        tool.next()
    }

    if (oper !== null) {
        let operand = match_get_unary(tool, log)
        if (!operand) {
            log.error('指针操作缺少操作数', tool.now().line)
        }
        tool.kill()
        return get_node_tree.create([new pointer_get_tree(oper), operand])
    }

    tool.restore()

    tool.backup()
    if (tool.now() && tool.now().name === 'typeof') {
        tool.next()
        let operand = match_get_unary(tool, log)
        if (!operand) {
            log.error('typeof缺少操作数', tool.now().line)
        }
        tool.kill()
        return get_node_tree.create([new typeof_get_tree(operand)])
    }

    tool.restore()

    return match_get_chain(tool, log)
}

function match_get_multiplicative(tool: allang_tools, log: allang_log): get_node_tree {
    let left = match_get_unary(tool, log)
    if (!left) return null

    while (tool.now()) {
        let oper: math_oper_type | null = null
        if (tool.now().name === '*') oper = math_oper_type.mul
        else if (tool.now().name === '/') oper = math_oper_type.div
        else if (tool.now().name === '%') oper = math_oper_type.mod
        else break

        tool.next()
        let right = match_get_unary(tool, log)
        if (!right) {
            log.error('运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }

    return left
}

function match_get_additive(tool: allang_tools, log: allang_log): get_node_tree {
    let left = match_get_multiplicative(tool, log)
    if (!left) return null

    while (tool.now()) {
        let oper: math_oper_type | null = null
        if (tool.now().name === '+') oper = math_oper_type.add
        else if (tool.now().name === '-') oper = math_oper_type.sub
        else break

        tool.next()
        let right = match_get_multiplicative(tool, log)
        if (!right) {
            log.error('运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }

    return left
}

function match_get_comparison(tool: allang_tools, log: allang_log): get_node_tree {
    let left = match_get_additive(tool, log)
    if (!left) return null

    while (tool.now()) {
        let oper: bool_oper_type | null = null
        if (tool.now().name === '<=') oper = bool_oper_type.less_equal
        else if (tool.now().name === '>=') oper = bool_oper_type.greater_equal
        else if (tool.now().name === '<') oper = bool_oper_type.less
        else if (tool.now().name === '>') oper = bool_oper_type.greater
        else break

        tool.next()
        let right = match_get_additive(tool, log)
        if (!right) {
            log.error('比较运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(oper, left, right)])
    }

    return left
}

function match_call_param(tool: allang_tools, log: allang_log): param_call_tree {
    let ret = new param_call_tree([])
    if (!tool.now()) return null
    tool.backup()
    tool.match_word('(', () => {
        tool.restore()
        ret = null
    })
    if (!ret) return null
    ret = new param_call_tree([])
    tool.match_word(')', () => {
        let split = true
        let bk = false
        while (true) {
            //不是结束就是参数
            if (split) {
                tool._match_word(',', () => {
                    log.error('重复分隔符', tool.now().line)
                }, () => {
                    tool._match_word(')', () => {
                        bk = true
                    }, () => {
                        ret.args.push(match_get(tool, log))
                    })
                    split = false
                })
            }
            if (bk) break
            if (!split) {
                tool.match_word(',', () => {
                    tool._match_word(')', () => {
                        bk = true
                    }, () => {
                        log.error('缺少分隔符', tool.now().line)
                    })
                })
                split = true
            }
            if (bk) break
        }
    })
    tool.kill()
    return ret
}

function match_get_equality(tool: allang_tools, log: allang_log): get_node_tree {
    let left = match_get_comparison(tool, log)
    if (!left) return null

    while (tool.now()) {
        let oper: bool_oper_type | null = null
        if (tool.now().name === '==') oper = bool_oper_type.equal
        else if (tool.now().name === '!=') oper = bool_oper_type.not_equal
        else if (tool.now() && tool.now().name === 'instanceof') {
            tool.next()
            let right = match_get_comparison(tool, log)
            if (!right) {
                log.error('instanceof缺少右操作数', tool.now().line)
            }
            left = get_node_tree.create([new instanceof_get_tree(left, right)])
            continue
        } else break

        tool.next()
        let right = match_get_comparison(tool, log)
        if (!right) {
            log.error('相等运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(oper, left, right)])
    }

    return left
}

function match_get_logic_and(tool: allang_tools, log: allang_log): get_node_tree {
    let left = match_get_equality(tool, log)
    if (!left) return null

    while (tool.now() && tool.now().name === '&&') {
        tool.next()
        let right = match_get_equality(tool, log)
        if (!right) {
            log.error('逻辑与缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(bool_oper_type.logic_and, left, right)])
    }

    return left
}

function match_get_logic_or(tool: allang_tools, log: allang_log): get_node_tree {
    let left = match_get_logic_and(tool, log)
    if (!left) return null

    while (tool.now() && tool.now().name === '||') {
        tool.next()
        let right = match_get_logic_and(tool, log)
        if (!right) {
            log.error('逻辑或缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(bool_oper_type.logic_or, left, right)])
    }

    return left
}

function match_ternary(tool: allang_tools, log: allang_log): get_node_tree {
    let condition = match_get_logic_or(tool, log)
    if (!condition) return null

    if (tool.now() && tool.now().name === '?') {
        tool.next()
        let true_value = match_get(tool, log)
        if (!true_value) {
            log.error('三元运算符真值分支缺失', tool.now().line)
        }
        tool.match_word(':', () => {
            log.error('三元运算符缺少冒号', tool.now().line)
        })
        let false_value = match_get(tool, log)
        if (!false_value) {
            log.error('三元运算符假值分支缺失', tool.now().line)
        }
        return get_node_tree.create([new ternary_get_tree(condition, true_value, false_value)])
    }
    tool.kill()
    return condition
}

//匹配a.b.c.d形式嵌套模块
function match_module_use(tool: allang_tools, log: allang_log, kill: boolean): string {
    let ret: string = ''
    if (!tool.now()) return null
    tool.backup()
    let ls = tool.match_type(token_type.identifier, () => {
        if (kill) log.error('没模块名', tool.now().line)
        ret = null
    })
    if (!ls) return null
    ret += ls.name
    let split = false
    let bk = false
    if (tool.now() && tool.now().name == '.')
        while (true) {
            tool.match_word('.', () => {
                bk = true
            })
            if (bk) break
            split = true
            ret += '.'
            ret += tool.match_type(token_type.identifier, () => {
                if (split) log.error('没模块名或者分隔符重复', tool.now().line)
            }).name
            split = false
            if (!tool.now() || tool.now().name != '.') break
        }
    tool.kill()
    return ret
}

//import a as b或者import a
function match_import(tool: allang_tools, log: allang_log, tree: import_tree[]): import_tree[] {
    tool.backup()
    if (tool.now().name != 'import') {
        tool.restore()
        return tree
    }
    //吃掉
    let line = tool.now().line
    tool.match_word('import', () => tool.restore())
    //必须是标识符
    let name = match_module_use(tool, log, true)
    let t = new import_tree(name, name)
    //可能是as
    tree.push(t)
    let r = false
    tool.match_word('as', () => {
        r = true
    })
    if (r) {
        tool.kill()
        return tree
    }
    t.name = tool.match_type(token_type.identifier, () => {
        log.error('非法的import', line)
    }).name
    tree.pop()
    tree.push(t)
    //最后确保分号
    tool.match_word(';', () => {
        log.error('缺少分号', line)
    })
    tool.kill()
    return tree
}

//匹配import集群
function match_imports(tool: allang_tools, log: allang_log, tree: import_tree[]): import_tree[] {
    tool.backup()
    let ret: import_tree[] = []
    let len: number
    while (tool.now()) {
        len = ret.length
        ret = match_import(tool, log, ret)
        if (len == ret.length) break
    }
    return ret
}

//匹配修饰符
function match_modifiers(tool: allang_tools, log: allang_log): modifiers {
    let ret = new modifiers(false, false, false, false)
    tool.backup()
    let _modifiers = ['public', 'private', 'static', 'async', 'sync', 'final']
    let modifier: token[] = []
    let bk = false
    while (true) {
        tool._matches_word(_modifiers, (t: token) => {
            modifier.push(t)
        }, () => bk = true)
        if (bk) break
    }
    let p = false, a = false, s = false, f = false
    for (let i of modifier) {
        if (i)
            switch (i.name) {
                case 'public':
                    if (p) log.error('冲突或重复的修饰符', i.line)
                    p = true
                    ret.private = false
                    break
                case 'private':
                    if (p) log.error('冲突或重复的修饰符', i.line)
                    p = true
                    ret.private = true
                    break
                case 'static':
                    if (s) log.error('冲突或重复的修饰符', i.line)
                    s = true
                    ret.static = true
                    break
                case 'async':
                    if (a) log.error('冲突或重复的修饰符', i.line)
                    a = true
                    ret.async = true
                    break
                case 'sync':
                    if (a) log.error('冲突或重复的修饰符', i.line)
                    a = true
                    ret.async = false
                    break
                case 'final':
                    if (f) log.error('冲突或重复的修饰符', i.line)
                    f = true
                    ret.final = true
                    break
            }
    }
    tool.kill()
    return ret
}

//匹配类型声明
function match_type(tool: allang_tools, log: allang_log): type_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: type_tree = match_array_type(tool, log)
    tool.kill()
    return ret
}

function match_basic_type(tool: allang_tools, log: allang_log): type_tree {
    let ret: type_tree = null
    if (!tool.now()) return null
    tool._match_word('number', () => {
        ret = new basic_type_tree(basic_type.number)
    }, () => {
        tool._match_word('string', () => {
            ret = new basic_type_tree(basic_type.string)
        }, () => {
            tool._match_word('boolean', () => {
                ret = new basic_type_tree(basic_type.boolean)
            }, () => {
                tool._match_word('void', () => {
                    ret = new basic_type_tree(basic_type.void)
                }, () => {
                    let name=match_module_use(tool, log, false)
                    if(!name) log.error('非法的类名', tool.now().line)
                    ret=new class_type_tree( name)
                })
            })
        })
    })
    return ret
}

//(a:返回类型,b:返回类型)=>返回类型
function match_lambda_type(tool: allang_tools, log: allang_log): lambda_type_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: lambda_type_tree = null
    tool._match_word('(', () => {
        tool.next()
        ret = new lambda_type_tree([], null)
        //匹配参数
        tool.match_word(')', () => {
            let bk = false, split = true
            while (true) {
                if (split) {
                    tool._match_word(',', () => {
                        log.error('重复分隔符', tool.now().line)
                    }, () => {
                        //匹配参数
                        let name = tool.match_type(token_type.identifier,
                            () => {
                                log.error('参数名不合法', tool.now().line)
                            }).name
                        tool.match_word(':', () => {
                            log.error('参数声明错误', tool.now().line)
                        })
                        let type = match_type(tool, log)
                        if (!type) log.error('缺少类型声明', tool.now().line)
                        ret.param.push(new identifier_tree(name, type))
                        split = false
                    })
                } else {
                    tool._match_word(')', () => {
                        bk = true
                    }, () => {
                        tool.match_word(',', () => {
                            log.error('缺少分隔符', tool.now().line)
                        })
                        split = true
                    })
                }
                if (bk) break
            }
        })
        tool.match_word('=>', () => {
            log.error('缺少返回类型', tool.now().line)
        })
        ret.return_type = match_type(tool, log)
        if (!ret.return_type) log.error('缺少返回类型', tool.now().line)
    }, () => {
    })
    tool.kill()
    return ret
}

function match_array_type(tool: allang_tools, log: allang_log): type_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: array_type_tree
    //先匹配非数组类型
    let type: type_tree = match_basic_type(tool, log)
    if (!type) type = match_lambda_type(tool, log)
    ret = new array_type_tree(type)
    //数组维度
    let num: number = 0
    //循环匹配[]
    let bk = false
    while (true) {
        tool.match_word('[', () => {
            bk = true
        })
        if (bk) break
        tool.match_word(']', () => {
            log.error('没有结束的数组标记', tool.now().line)
        })
        num++
    }
    for (let i = 0; i < num; i++) {
        ret = new array_type_tree(ret)
    }
    if (num == 0) {
        return type
    }
    tool.kill()
    return ret
}

function match_param_identifier(tool: allang_tools, log: allang_log): param_identifier_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret = new param_identifier_tree([], null)
    let param: param_identifier_tree = new param_identifier_tree([], null)
    tool.match_word('(', () => {
        tool.restore()
        ret = null
    })
    if (!ret) return null
    tool.match_word(')', () => {
        //匹配参数
        let bk = false, split = true
        while (true) {
            if (split) {
                tool._match_word(',', () => {
                    log.error('重复分隔符', tool.now().line)
                }, () => {
                    let name = tool.match_type(token_type.identifier,
                        () => {
                            log.error('参数名不合法', tool.now().line)
                        }).name
                    tool.match_word(':', () => {
                    })
                    let type = match_type(tool, log)
                    if (!type) log.error('缺少类型声明', tool.now().line)
                    param.param.push(new identifier_tree(name, type))
                    split = false
                })
                tool._match_word(')', () => {
                    bk = true
                }, () => {
                    tool.match_word(',', () => {
                        log.error('缺少分隔符', tool.now().line)
                    })
                    split = true
                })
                if (bk) break
            }
        }
    })
    return ret
}
/*
函数:类型(){巴拉巴拉}
模块:{}
接口/枚举:interface/enum{}
类:class (implements xxx可选){}
 */
function match_block_body(tool: allang_tools, log: allang_log): space_tree {
    if(!tool.now())return null
    let a = match_annotations(tool, log)
    let b = match_modifiers(tool, log)
    let ret: Tree=new Tree()
    let n = tool.match_type(token_type.identifier,
        () => {
            ret=null
        })?.name
    if(!ret)return null
    tool.match_word(':', () => {
        log.error('缺少冒号', tool.now().line)
    })
    if (tool.now() && tool.now().name === 'module') {
        ret = match_module_body(tool, log)
        if (ret && ret instanceof module_tree) {
            ret.annotations = a
            ret.modifiers = b
            ret.name = n
            return ret
        }
    }

    ret = match_interface_body(tool, log)
    if (ret && ret instanceof interface_tree) {
        ret.annotations = a
        ret.modifiers = b
        ret.name = n
        return ret
    }
    ret = match_enum_body(tool, log)
    if (ret && ret instanceof enum_tree) {
        ret.annotations = a
        ret.modifiers = b
        ret.name = n
        return ret
    }
    ret = match_class_body(tool, log)
    if (ret && ret instanceof class_tree) {
        ret.annotations = a
        ret.modifiers = b
        ret.name = n
        return ret
    }
    ret = match_var_body(tool, log)
    if (ret && ret instanceof var_tree) {
        ret.annotations = a
        ret.modifiers = b
        ret.name = n
        return ret
    }
    ret = match_func_body(tool, log)
    if (ret && ret instanceof func_tree) {
        ret.annotations = a
        ret.modifiers = b
        ret.name = n
        return ret
    }
}

function match_block_bodies(tool: allang_tools, log: allang_log): space_tree[] {
    let ret: space_tree[] = []
    while (true) {
        let a = match_block_body(tool, log)
        if (!a) break
        ret.push(a)
    }
    return ret
}

function match_func_body(tool: allang_tools, log: allang_log): func_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: func_tree=new func_tree('', null, null, null, null, null)
    let type = match_type(tool, log)
    if (!type) {
        tool.restore()
        return null
    }
    tool.match_word('(', () => {
        tool.restore()
        return null
    })
    tool.index--
    //匹配函数参数
    ret.params = match_param_identifier(tool, log)
    if(!ret.params){
        tool.restore()
        return null
    }
    ret.return_type = type
    ret.commands=match_commands(tool, log)
    tool.kill()
    return ret
}

function match_module_body(tool: allang_tools, log: allang_log): module_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: module_tree = new module_tree('', null, null)
    tool.match_word('module', () => {
        tool.restore()
        ret = null
    })
    if (!ret) return null
    tool.match_word('{', () => {
        log.error('缺少开始标记', tool.now().line)
    })
    ret.children=match_block_bodies(tool, log)
    tool.match_word('}', () => {
        ret.children = match_block_bodies(tool, log) as space_tree[]
        tool.match_word('}', ()=>{log.error('缺少结束标记', tool.now().line)})
    })
    tool.kill()
    return ret
}

function match_var_body(tool: allang_tools, log: allang_log): var_tree {
    if (!tool.now()) return null
    tool.backup()
    let i=tool.index
    let ret: var_tree = new var_tree('', null, null, null, null)
    ret.var_type = match_type(tool, log)
    //可赋值可不赋值
    tool._match_word('=', () => {
        tool.next()
        ret.value = match_get(tool, log)
        tool.index-=1
    }, () => {
    })//吃掉分
    let kill=false
    tool.match_word(';', () => {
        tool._match_word('(',()=>{
            kill=true
        },()=>{
            log.error('缺少分号', tool.now().line)
        })
    })
    if(kill){
        tool.index=i
        return null
    }
    tool.kill()
    return ret
}

function match_class_body(tool: allang_tools, log: allang_log): class_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: class_tree = new class_tree('', null, null, null, null)
    tool.match_word('class', () => {
        ret = null
        tool.restore()
    })
    if (!ret) return null
    //是否有实现
    tool._match_word('implements', () => {
        tool.next()
        ret.implements = tool.match_type(token_type.identifier,
            () => {
                log.error('实现名错误', tool.now().line)
            })?.name
        tool.index--
    }, () => {
    })
    //吃掉{
    tool.match_word('{', () => {
        log.error('缺少左括号', tool.now()?.line)
    })
    ret.children=match_block_bodies(tool, log)
    tool.match_word('}', () => {
        ret.children = match_block_bodies(tool, log)
        tool.match_word('}', () => {
            log.error('缺少结束', tool.now()?.line)
        })
    })
    tool.kill()
    return ret
}

function match_interface_body(tool: allang_tools, log: allang_log): interface_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: interface_tree = new interface_tree('', [], null, null)
    tool.match_word('interface', () => {
        ret = null
        tool.restore()
    })
    if (!ret) return null
    //吃掉{
    tool.match_word('{', () => {
        log.error('缺少左括号', tool.now().line)
    })
    tool.match_word('}', () => {
        let bk=false
        //循环匹配函数声明
        while (true) {
            let annotation: annotation_tree[] = match_annotations(tool, log)
            let mod: modifiers = match_modifiers(tool, log)
            let func: func_tree =
                new func_tree('', null, null, null, null, null)
            func.name = tool.match_type(token_type.identifier,
                () => {bk=true})?.name
            if(bk)break
            tool.match_word(':', () => {log.error('缺少冒号', tool.now().line)})
            func.return_type=match_type(tool, log)
            func.params = match_param_identifier(tool, log)
            func.modifiers = mod
            func.annotations = annotation
            ret.func.push(func)
            tool.match_word(';',()=>{log.error('缺少分号', tool.now().line)})
        }
        tool.match_word('}', () => {
            log.error('缺少右括号', tool.now().line)
        })
    })
    tool.kill()
    return ret
}

function match_enum_body(tool: allang_tools, log: allang_log): enum_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: enum_tree = new enum_tree('', null, null, [])
    tool.match_word('enum', () => {
        ret = null
        tool.restore()
    })
    if (!ret) return null
    //吃掉{
    tool.match_word('{', () => {
        log.error('缺少左括号', tool.now().line)
    })
    tool.match_word('}', () => {
        let bk = false,split=true
        while (true) {
            if (!split) {
                tool._match_word('}', () => {
                    bk=true
                },()=>{
                    tool.match_word(',', () => {
                        log.error('缺少逗号', tool.now().line)
                    })
                    split=true
                })
            }else {
                let name = tool.match_type(token_type.identifier,
                    () => {
                        bk = true
                    })?.name
                ret.values.push(name)
                split=false
            }
            if (bk) break
        }
    })
    tool.kill()
    return ret
}
/*
格式:
@${模块名.函数名}({直接量})
直接量包括true,false,null,数字,字符串,调用常量
 */
function match_annotation(tool: allang_tools, log: allang_log): annotation_tree {
    tool.backup()
    let tree: annotation_tree = null
    if (!tool.now()) return null
    if (tool.now() && tool.now().name != '@') {
        tool.restore()
        return tree
    }
    tool.match_word('@', () => {
    })
    //匹配
    let name = match_module_use(tool, log, true)
    tree = new annotation_tree(name,
        new param_call_tree([]))
    //如果有左括号
    if (tool.now() && tool.now().name != '(') return tree
    //吃掉
    tool.match_word('(', () => {
    })
    let param_call = new param_call_tree([])
    let split = true
    let bk = false
    tool.match_word(')', () => {
        while (tool.now()) {
            //必然是直接量
            if (split) {
                tool._match_word(',', () => {
                    log.error('重复分隔', tool.now().line)
                }, () => {
                    param_call.args.push(match_get(tool, log))
                    split = false
                })
            }
            tool._match_word(',', () => {
                split = true
            }, () => {
                //一定就是)了
                tool.match_word(')', () => {
                    log.error('没有结束符', tool.now().line)
                })
                bk = true
            })
            if (bk) break
        }
        tree.value = param_call
    })
    tool.kill()
    return tree
}

function match_annotations(tool: allang_tools, log: allang_log): annotation_tree[] {
    let ret: annotation_tree[] = []
    while (tool.now()) {
        let a = match_annotation(tool, log)
        if (a) ret.push(a)
        else return ret
    }
    tool.kill()
    return ret
}
function match_continue(tool: allang_tools, log: allang_log):continue_tree{
    if(!tool.now())return null
    tool.backup()
    if(tool.now().name!='continue'){
        tool.restore()
        return null
    }
    tool.next()
    tool.match_word(';',()=>{log.error('缺少分号', tool.now().line)})
    tool.kill()
    return new continue_tree()
}
function match_break(tool: allang_tools, log: allang_log):break_tree{
    if(!tool.now())return null
    tool.backup()
    if(tool.now().name!='break'){
        tool.restore()
        return null
    }
    tool.next()
    tool.match_word(';',()=>{log.error('缺少分号', tool.now().line)})
    tool.kill()
    return new break_tree()
}
function match_return(tool: allang_tools, log: allang_log):return_tree{
    if(!tool.now())return null
    tool.backup()
    if(tool.now().name!='return'){
        tool.restore()
        return null
    }
    tool.next()
    let ret=new return_tree(null)
    tool.match_word(';',()=>{
        let value = match_get(tool, log)
        if(value){
            ret.value=value
            tool.match_word(';',()=>{log.error('缺少分号', tool.now().line)})
        }else log.error('缺少返回值',tool.now().line)
    })
    tool.kill()
    return ret
}
//匹配一般指令
//var a:类型(可选)=xxx;
function match_var_init(tool: allang_tools, log: allang_log):identifier_var_tree{
    if(!tool.now())return null
    tool.backup()
    let ret:identifier_var_tree=new identifier_var_tree('',null,null)
    tool.match_word('var',()=>{
        tool.restore()
        ret=null
    })
    if(!ret)return null
    ret.identifier=new identifier_tree(tool.match_type(token_type.identifier,()=>{
        log.error('缺少变量名',tool.now().line)
    })?.name,null)
    tool.match_word(':',()=>{log.error('缺少冒号',tool.now().line)})
    ret.identifier.value=match_type(tool,log)
    tool._match_word('=',()=>{
        tool.next()
        ret.value = match_get(tool, log)
        tool.match_word(';',()=>{log.error('缺少分号',tool.now().line)})
        tool.index--
    },()=>{})
    tool.kill()
    return ret
}
//delete
function match_delete(tool: allang_tools, log: allang_log): delete_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret=new delete_tree('')
    tool.match_word('delete', () => {ret=null})
    if(!ret)return null
    ret.name = tool.match_type(token_type.identifier, () => {
        log.error('缺少变量名', tool.now().line)
    })?.name
    tool.match_word(';',()=>{log.error('缺少分号', tool.now().line)})
    tool.kill()
    return ret
}
//vm string:强制编译为系统命令
function match_vm_string(tool: allang_tools, log: allang_log): vm_tree {
    if (!tool.now()) return null
    tool.backup()
    let ret: vm_tree = new vm_tree('', null)
    tool.match_word('vm', () => {
        ret = null
        tool.restore()
    })
    if (!ret) return null
    tool._match_type(token_type.string,()=>{
        ret.value=tool.now().name
        ret.variable=false
        tool.index--
    }, () => {
        ret.value=
            tool.match_type(token_type.identifier, () => {log.error('错误的vm指令',tool.now().line)})?.name
        ret.variable=true
    })
    tool.match_word(';',()=>{log.error('缺少分号',tool.now().line)})
    tool.kill()
    return ret
}
function match_throw(tool: allang_tools, log: allang_log):throw_tree{
    if(!tool.now())return null
    let ret=new throw_tree( null)
    tool.match_word('throw',()=>{ret=null})
    if(!ret)return null
    ret.value = match_get(tool, log)
    tool.match_word(';',()=>{log.error('缺少分号',tool.now().line)})
    return ret
}
function match_call(tool: allang_tools, log: allang_log):call_tree{
    if(!tool.now())return null
    tool.backup()
    let ret=new call_tree(null,null,true)
    tool.match_word('await',()=>{
        ret._await=false
    })
    let name=tool.match_type(token_type.identifier,()=>{
        if(ret._await)log.error('await后无调用',tool.now().line)
        ret=null
        tool.restore()
    })?.name
    if(!ret)return null
    ret.name=name
    ret.param=match_call_param(tool, log)
    tool.match_word(';',()=>{log.error('缺少分号',tool.now().line)})
    tool.kill()
    return ret
}
function match_command(tool: allang_tools, log: allang_log):command_tree{
    let a=match_continue(tool, log)
    if(a)return a
    a=match_delete(tool, log)
    if(a)return a
    a=match_set(tool, log)
    if(a)return a
    a=match_call(tool, log)
    if(a)return a
    a=match_break(tool, log)
    if(a)return a
    a=match_return(tool, log)
    if(a)return a
    a=match_vm_string(tool, log)
    if(a)return a
    a=match_var_init(tool, log)
    if(a)return a
    a=match_throw(tool, log)
    if(a)return a
    a=match_if(tool, log)
    if(a)return a
    a=match_foreach(tool, log)
    if(a)return a
    a=match_while(tool, log)
    if(a)return a
    a=match_switch(tool, log)
    if(a)return a
    a=match_try(tool, log)
    if(a)return a
    a=match_for(tool, log)
    if(a)return a
    if(tool.now().name=='{')return new command_tree(match_commands(tool, log))
}
function match_commands(tool: allang_tools, log: allang_log):command_tree[]{
    let ret:command_tree[]= []
    tool.match_word('{',()=>{log.error('缺少左括号',tool.now()?.line)})
    tool.match_word('}',()=>{
        while(true){
            let a=match_command(tool, log)
            if(!a)break
            ret.push(a)
        }
        tool.match_word('}',()=>{log.error('缺少右括号',tool.now().line)})
    })
    return ret
}
function match_condition(tool: allang_tools, log: allang_log):get_node_tree{
    tool.match_word('(',()=>{log.error('缺少左括号',tool.now().line)})
    let condition=match_get(tool, log)
    tool.match_word(')',()=>{log.error('缺少右括号',tool.now().line)})
    return condition
}
//if-else
function match_if(tool: allang_tools, log: allang_log):if_tree{
    if(!tool.now())return null
    tool.backup()
    let ret=new if_tree(null,null,[],null)
    tool.match_word('if',()=>{
        tool.restore()
        ret=null
    })
    if(!ret)return null
    ret.condition=match_condition(tool,log)
    ret.commands=match_commands(tool, log)
    //else if
    tool._match_word('else',()=>{
        tool.next()
        ret.else=match_commands(tool,log)
        tool.index--
    },()=>{
        //循环匹配else if
        let bk=false
        while(true){
            tool.match_word('elif',()=>{
                bk=true
                tool._match_word('else',()=>{
                    tool.next()
                    ret.else=match_commands(tool,log)
                    tool.index--
                },()=>{})
            })
            if(bk)break
            let ls:if_tree=new if_tree(null,null,null,null)
            ls.condition=match_condition(tool,log)
            ls.commands=match_commands(tool, log)
            ret.else_if.push(ls)
        }
    })
    tool.kill()
    return ret
}
//switch
function match_switch(tool: allang_tools, log: allang_log):switch_tree{
    if(!tool.now())return null
    tool.backup()
    let ret=new switch_tree(null,[],null)
    tool.match_word('switch',()=>{
        ret=null
        tool.restore()
    })
    if(!ret)return null
    ret.condition=match_condition(tool,log)
    tool.match_word('{',()=>{log.error('缺少左括号',tool.now().line)})
    //匹配case和default
    while(true){
        let bk=false
        tool._match_word('case',()=>{
            tool.next()
            let c=match_get(tool, log)
            tool.match_word('=>',()=>{log.error('缺少指向',tool.now().line)})
            ret.cases.push({value:c,call:match_commands(tool, log)})
            tool.index--
        },()=>{
            tool._match_word('default',()=>{
                tool.next()
                ret.default=match_commands(tool, log)
                bk=true
                tool.index--
            },()=>{
                tool._match_word('}',()=>{bk=true},()=>{log.error('缺少右括号',tool.now()?.line)})}
            )
        })
        if(bk)break
    }
    tool.kill()
    return ret
}
//while
function match_while(tool: allang_tools, log: allang_log):while_tree{
    if(!tool.now())return null
    tool.backup()
    let ret=new while_tree(null,null,false)
    tool._match_word('do',()=>{
        tool.next()
        ret.do=true
        ret.commands=match_commands(tool, log)
        tool.match_word('while',()=>{log.error('缺少while',tool.now().line)})
        ret.condition=match_condition(tool,log)
        tool.index--
    },()=>{
        tool.match_word('while',()=> {ret=null})
        if(ret){
            ret.condition=match_condition(tool,log)
            ret.commands=match_commands(tool, log)
        }
    })
    tool.kill()
    return ret
}
//for
function match_for(tool: allang_tools, log: allang_log):for_tree{
    if(!tool.now())return null
    tool.backup()
    let ret=new for_tree(null,null,null,null)
    tool.match_word('for',()=>{ret=null})
    if(!ret)return null
    tool.match_word('(',()=>{log.error('缺少左括号',tool.now().line)})
    ret.init=match_commands(tool, log)
    ret.condition=match_condition(tool,log)
    ret.step=match_commands(tool, log)
    tool.match_word(')',()=>{log.error('缺少右括号',tool.now().line)})
    ret.body=match_commands(tool, log)
    tool.kill()
    return ret
}
//foreach
function match_foreach(tool: allang_tools, log: allang_log):foreach_tree{
    if(!tool.now())return null
    tool.backup()
    let ret=new foreach_tree(null,null,null)
    tool.match_word('foreach',()=>{ret=null})
    if(!ret)return null
    tool.match_word('(',()=>{log.error('缺少左括号',tool.now().line)})
    let name=tool.match_type(token_type.identifier,()=>{ret=null})
    if(!name)return null
    tool.match_word(':',()=>{log.error('缺少冒号',tool.now().line)})
    let type=match_type(tool, log)
    if(!type)log.error('缺少类型声明',tool.now().line)
    tool.match_word('as',()=>{log.error('缺少as',tool.now().line)})
    ret.array=match_get(tool, log)
    tool.match_word(')',()=>{log.error('缺少右括号',tool.now().line)})
    ret.commands=match_commands(tool, log)
    ret.identifier=new identifier_var_tree(name.name,type,null)
    tool.kill()
    return ret
}
//try-catch-finally
function match_try(tool: allang_tools, log: allang_log): try_tree{
    if(!tool.now())return null
    tool.backup()
    let ret=new try_tree(null,null,null)
    tool.match_word('try',()=>{ret=null})
    if(!ret)return null
    ret.commands=match_commands(tool, log)
    tool.match_word('catch',()=>{ret=null})
    if(!ret)return null
    ret.catch=match_get_lambda(tool,log)
    tool._match_word('finally',()=>{
        tool.next()
        ret.finally=match_commands(tool, log)
        tool.index--
    },()=>{})
    tool.kill()
    return ret
}
/*
匹配设值
a=/+=/-=/...get
a++/--
 */
//此物在最后匹配
function match_set(tool: allang_tools, log: allang_log): set_tree {
    let set=['+=','-=', '*=', '/=','%=', '=','>>=','<<=', '&=', '|=', '^=']
    let self=['++','--']
    let ret=new set_tree('',null)
    let name=tool.match_type(token_type.identifier,()=>{ret=null})
    if(!name)return null
    ret.name=name.name
    tool._matches_word(set,(t:token)=>{
        switch (t.name){
            case '+=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.add,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '-=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.sub,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '*=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.mul,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '/=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.div,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '%=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.mod,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '>>=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.right,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '<<=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.shift,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '&=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.and,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '|=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.or,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                 break
            case '^=':
                ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.xor,
                    new variable_get_tree(ret.name),match_get(tool, log))])
                break
            case '=':
                ret.value=match_get(tool, log)
                break
        }
    },()=>{
        tool._matches_word(self,(t:token)=>{
            switch (t.name){
                case '++':
                    ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.add,
                        new variable_get_tree(ret.name),new number_get_tree(1))])
                    break
                case '--':
                    ret.value=get_node_tree.create([new math_oper_get_tree(math_oper_type.sub,
                        new variable_get_tree(ret.name),new number_get_tree(1))])
            }
        },()=>{log.error('错误的赋值',tool.now().line)})
    })
    tool.match_word(';',()=>{log.error('缺少分号',tool.now().line)})
    return ret
}
function match(tool: allang_tools, log: allang_log): file_tree {
    let ret: file_tree=new file_tree(null,null)
    //匹配import
    ret.imports=match_imports(tool, log,[])
    ret.spaces=match_block_bodies(tool, log)
    return ret
}
export {match}