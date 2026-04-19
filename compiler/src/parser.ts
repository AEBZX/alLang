import {
    annotation_tree, array_get_tree, array_type_tree,
    basic_type_tree, bool_oper_get_tree, boolean_get_tree, call_get_tree, call_tree, class_tree,
    func_tree, get_node_tree, get_tree, identifier_tree,
    import_tree, instanceof_get_tree, lambda_call_get_tree, lambda_get_tree,
    lambda_type_tree, map_get_tree, math_oper_get_tree,
    modifiers,
    module_tree, null_get_tree, number_get_tree,
    param_call_tree, pointer_get_tree, string_get_tree, ternary_get_tree, type_tree, typeof_get_tree, var_tree,
    variable_get_tree
} from './tree'
import {token, token_type, Tree} from 'allang-compiler-base'
import allang_tools from './allang_tools'
import allang_log from './allang_log'
import {basic_type, bool_oper_type, math_oper_type, pointer_type} from "./model";
import {map_type_tree} from "./tree/identifier";
function match_get(tool:allang_tools,log:allang_log):get_node_tree {
    return match_ternary(tool, log)
}
function match_get_basic(tool:allang_tools,log:allang_log):get_tree {
    if(!tool.now()) return null

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

    if(basic) {
        tool.kill()
        return basic
    }
    return null
}
function match_get_variable_or_new(tool:allang_tools,log:allang_log):get_tree {
    if(!tool.now()) return null

    let ret: get_tree = null

    tool.backup()

    let is_new = false
    tool._match_word('new', () => {
        is_new = true
    }, () => {})

    if(is_new) {
        let name = match_module_use(tool, log, true)
        if(!name) {
            log.error('new后缺少类名', tool.now()?.line || '')
            tool.restore()
            return null
        }
        let params = match_call_param(tool, log)
        if(!params) {
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
    if(name) {
        ret = new variable_get_tree(name)
        tool.kill()
        return ret
    }

    tool.restore()
    return null
}
function match_get_map(tool:allang_tools,log:allang_log):map_get_tree {
    if(!tool.now()) return null
    tool.backup()
    let ret:map_get_tree = null
    tool._match_word('{', () => {
        tool.next()
        ret = new map_get_tree([])
        let split = true, bk = false
        while(true) {
            if(split) {
                tool._match_word(',', () => {
                    log.error('重复分隔符', tool.now().line)
                }, () => {
                    tool._match_word('}', () => {
                        bk = true
                    }, () => {
                        let key_token = tool.match_type(token_type.identifier, () => {
                            log.error('map键必须是标识符', tool.now().line)
                        })
                        if(!key_token) {
                            bk = true
                            return
                        }
                        tool.match_word(':', () => {
                            log.error('map缺少冒号', tool.now().line)
                        })
                        let value = match_get(tool, log)
                        if(!value) {
                            log.error('map值缺失', tool.now().line)
                        }
                        ret.map.push({ key: key_token.name, get: value })
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
            if(bk) break
        }
    }, () => {})

    if(ret) {
        tool.kill()
        return ret
    }
    tool.restore()
    return null
}

function match_get_lambda(tool:allang_tools,log:allang_log):lambda_get_tree {
    if(!tool.now() || tool.now().name !== '(') return null

    tool.backup()

    let params_backup = tool.index
    let is_lambda = false

    tool.match_word('(', () => {
        let param_count = 0
        while(tool.now() && tool.now().name !== ')') {
            if(tool.now().name === ',') {
                tool.next()
                continue
            }
            if(tool.now().type === token_type.identifier) {
                param_count++
                tool.next()
            } else {
                break
            }
        }

        if(tool.now() && tool.now().name === ')') {
            tool.next()
            if(tool.now() && tool.now().name === '=>') {
                is_lambda = true
            }
        }
    })

    if(!is_lambda) {
        tool.index = params_backup
        tool.restore()
        return null
    }

    tool.match_word('=>', () => {})

    let body: any[] = []
    if(tool.now() && tool.now().name === '{') {
        // TODO: implement block parsing for lambda body
        tool.match_word('{', () => {})
        let brace_count = 1
        while(tool.now() && brace_count > 0) {
            if(tool.now().name === '{') brace_count++
            else if(tool.now().name === '}') brace_count--
            tool.next()
        }
    } else {
        let expr = match_get(tool, log)
        if(expr) body.push(expr)
    }

    tool.kill()
    return new lambda_get_tree(null, body)
}
function match_get_chain_element(tool:allang_tools,log:allang_log):get_tree {
    if(!tool.now()) return null

    let element: get_tree = null

    if(tool.now().name === '(') {
        let params = match_call_param(tool, log)
        if(params) {
            return new lambda_call_get_tree(params)
        }
    }

    if(tool.now().name === '[') {
        tool.backup()
        tool.match_word('[', () => {})
        let index = match_get(tool, log)
        if(!index) {
            log.error('数组索引表达式错误', tool.now().line)
        }
        tool.match_word(']', () => {
            log.error('数组索引缺少结束符', tool.now().line)
        })
        tool.kill()
        return new array_get_tree(get_node_tree.create([index]))
    }

    if(tool.now().name === '.') {
        tool.backup()
        tool.match_word('.', () => {})
        let name = tool.match_type(token_type.identifier, () => {
            log.error('成员访问缺少标识符', tool.now().line)
        })
        tool.kill()
        return new variable_get_tree(name.name)
    }

    element = match_get_basic(tool, log)
    if(element) return element

    element = match_get_map(tool, log)
    if(element) return element

    element = match_get_lambda(tool, log)
    if(element) return element

    element = match_get_variable_or_new(tool, log)
    if(element) return element

    return null
}
function match_get_chain(tool:allang_tools,log:allang_log):get_node_tree {
    if(!tool.now()) return null

    let first = match_get_chain_element(tool, log)
    if(!first) return null

    let chain: get_tree[] = [first]

    while(tool.now()) {
        let next = match_get_chain_element(tool, log)
        if(!next) break
        chain.push(next)
    }

    return get_node_tree.create(chain)
}
function match_get_unary(tool:allang_tools,log:allang_log):get_node_tree {
    if(!tool.now()) return null

    tool.backup()

    let oper: pointer_type | null = null
    if(tool.now().name === '*') {
        oper = pointer_type.value
        tool.next()
    } else if(tool.now().name === '&') {
        oper = pointer_type.address
        tool.next()
    }

    if(oper !== null) {
        let operand = match_get_unary(tool, log)
        if(!operand) {
            log.error('指针操作缺少操作数', tool.now().line)
        }
        tool.kill()
        return get_node_tree.create([new pointer_get_tree(oper), operand])
    }

    tool.restore()

    tool.backup()
    if(tool.now() && tool.now().name === 'typeof') {
        tool.next()
        let operand = match_get_unary(tool, log)
        if(!operand) {
            log.error('typeof缺少操作数', tool.now().line)
        }
        tool.kill()
        return get_node_tree.create([new typeof_get_tree(operand)])
    }

    tool.restore()

    return match_get_chain(tool, log)
}
function match_get_multiplicative(tool:allang_tools,log:allang_log):get_node_tree {
    let left = match_get_unary(tool, log)
    if(!left) return null

    while(tool.now()) {
        let oper: math_oper_type | null = null
        if(tool.now().name === '*') oper = math_oper_type.mul
        else if(tool.now().name === '/') oper = math_oper_type.div
        else if(tool.now().name === '%') oper = math_oper_type.mod
        else break

        tool.next()
        let right = match_get_unary(tool, log)
        if(!right) {
            log.error('运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }

    return left
}
function match_get_additive(tool:allang_tools,log:allang_log):get_node_tree {
    let left = match_get_multiplicative(tool, log)
    if(!left) return null

    while(tool.now()) {
        let oper: math_oper_type | null = null
        if(tool.now().name === '+') oper = math_oper_type.add
        else if(tool.now().name === '-') oper = math_oper_type.sub
        else break

        tool.next()
        let right = match_get_multiplicative(tool, log)
        if(!right) {
            log.error('运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new math_oper_get_tree(oper, left, right)])
    }

    return left
}
function match_get_comparison(tool:allang_tools,log:allang_log):get_node_tree {
    let left = match_get_additive(tool, log)
    if(!left) return null

    while(tool.now()) {
        let oper: bool_oper_type | null = null
        if(tool.now().name === '<=') oper = bool_oper_type.less_equal
        else if(tool.now().name === '>=') oper = bool_oper_type.greater_equal
        else if(tool.now().name === '<') oper = bool_oper_type.less
        else if(tool.now().name === '>') oper = bool_oper_type.greater
        else break

        tool.next()
        let right = match_get_additive(tool, log)
        if(!right) {
            log.error('比较运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(oper, left, right)])
    }

    return left
}
function match_call_param(tool:allang_tools,log:allang_log):param_call_tree{
    let ret=new param_call_tree([])
    if(!tool.now())return null
    tool.backup()
    tool.match_word('(',()=>{
        tool.restore()
        ret=null
    })
    if(!ret)return null
    ret=new param_call_tree([])
    tool.match_word(')',()=>{
        let split=true
        let bk=false
        while (true){
            //不是结束就是参数
            if(split){
                tool._match_word(',',()=>{
                    log.error('重复分隔符',tool.now().line)
                },()=>{
                    tool._match_word(')',()=>{
                        bk=true
                    },()=>{
                        ret.args.push(match_get(tool,log))
                    })
                    split=false
                })
            }
            if(bk)break
            if(!split){
                tool.match_word(',',()=>{
                    tool._match_word(')',()=>{
                        bk=true
                    },()=>{
                        log.error('缺少分隔符',tool.now().line)
                    })
                })
                split=true
            }
            if(bk)break
        }
    })
    tool.kill()
    return ret
}
function match_get_equality(tool:allang_tools,log:allang_log):get_node_tree {
    let left = match_get_comparison(tool, log)
    if(!left) return null

    while(tool.now()) {
        let oper: bool_oper_type | null = null
        if(tool.now().name === '==') oper = bool_oper_type.equal
        else if(tool.now().name === '!=') oper = bool_oper_type.not_equal
        else if(tool.now() && tool.now().name === 'instanceof') {
            tool.next()
            let right = match_get_comparison(tool, log)
            if(!right) {
                log.error('instanceof缺少右操作数', tool.now().line)
            }
            left = get_node_tree.create([new instanceof_get_tree(left, right)])
            continue
        }
        else break

        tool.next()
        let right = match_get_comparison(tool, log)
        if(!right) {
            log.error('相等运算符缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(oper, left, right)])
    }

    return left
}
function match_get_logic_and(tool:allang_tools,log:allang_log):get_node_tree {
    let left = match_get_equality(tool, log)
    if(!left) return null

    while(tool.now() && tool.now().name === '&&') {
        tool.next()
        let right = match_get_equality(tool, log)
        if(!right) {
            log.error('逻辑与缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(bool_oper_type.logic_and, left, right)])
    }

    return left
}
function match_get_logic_or(tool:allang_tools,log:allang_log):get_node_tree {
    let left = match_get_logic_and(tool, log)
    if(!left) return null

    while(tool.now() && tool.now().name === '||') {
        tool.next()
        let right = match_get_logic_and(tool, log)
        if(!right) {
            log.error('逻辑或缺少右操作数', tool.now().line)
        }
        left = get_node_tree.create([new bool_oper_get_tree(bool_oper_type.logic_or, left, right)])
    }

    return left
}
function match_ternary(tool:allang_tools,log:allang_log):get_node_tree {
    let condition = match_get_logic_or(tool, log)
    if(!condition) return null

    if(tool.now() && tool.now().name === '?') {
        tool.next()
        let true_value = match_get(tool, log)
        if(!true_value) {
            log.error('三元运算符真值分支缺失', tool.now().line)
        }
        tool.match_word(':', () => {
            log.error('三元运算符缺少冒号', tool.now().line)
        })
        let false_value = match_get(tool, log)
        if(!false_value) {
            log.error('三元运算符假值分支缺失', tool.now().line)
        }
        return get_node_tree.create([new ternary_get_tree(condition, true_value, false_value)])
    }

    return condition
}
//匹配a.b.c.d形式嵌套模块
function match_module_use(tool:allang_tools,log:allang_log,kill:boolean):string{
    let ret:string=''
    if(!tool.now())return null
    tool.backup()
    let ls=tool.match_type(token_type.identifier,()=>{
        if(kill)log.error('没模块名',tool.now().line)
        ret=null
    })
    if(!ls)return null
    ret+=ls.name
    let split=false
    let bk=false
    if(tool.now()&&tool.now().name=='.')
        while(true){
            tool.match_word('.',()=>{
                bk=true
            })
            if(bk)break
            split=true
            ret+='.'
            ret+=tool.match_type(token_type.identifier,()=>{
                if(split)log.error('没模块名或者分隔符重复',tool.now().line)
            }).name
            split=false
            if(!tool.now()||tool.now().name!='.')break
        }
    tool.kill()
    return ret
}
//import a as b或者import a
function match_import(tool:allang_tools,log:allang_log,tree:Tree[]):Tree[] {
    tool.backup()
    if(tool.now().name!='import'){
        tool.restore()
        return tree
    }
    //吃掉
    let line=tool.now().line
    tool.match_word('import',()=>tool.restore())
    //必须是标识符
    let name=match_module_use(tool,log,true)
    let t=new import_tree(name,name)
    //可能是as
    tree.push(t)
    let r=false
    tool.match_word('as',()=>{
        r=true
    })
    if(r){
        tool.kill()
        return tree
    }
    t.name=tool.match_type(token_type.identifier, () => {
        log.error('非法的import', line)
    }).name
    tree.pop()
    tree.push(t)
    //最后确保分号
    tool.match_word(';',()=>{
        log.error('缺少分号', line)
    })
    tool.kill()
    return tree
}
//匹配import集群
function match_imports(tool:allang_tools,log:allang_log,tree:Tree[]):Tree[] {
    tool.backup()
    let ret:Tree[]=[]
    let len:number
    while(tool.now()){
        len=ret.length
        ret=match_import(tool,log,ret)
        if(len==ret.length)break
    }
    return ret
}
//匹配修饰符
function match_modifiers(tool:allang_tools,log:allang_log):modifiers{
    let ret=new modifiers(false,false,false,false)
    tool.backup()
    console.log(tool)
    let _modifiers=['public','private','static','async','sync','final']
    let modifier:token[]=[]
    let bk=false
    while(true){
        tool._matches_word(_modifiers,(t:token)=>{
            modifier.push(t)
        }, ()=>bk=true)
        if(bk)break
    }
    let p=false,a=false,s=false,f=false
    for(let i of modifier){
        if(i)
            switch(i.name){
                case 'public':
                    if(p)log.error('冲突或重复的修饰符',i.line)
                    p=true
                    ret.private=false
                    break
                case 'private':
                    if(p)log.error('冲突或重复的修饰符',i.line)
                    p=true
                    ret.private=true
                    break
                case 'static':
                    if(s)log.error('冲突或重复的修饰符',i.line)
                    s=true
                    ret.static=true
                    break
                case 'async':
                    if(a)log.error('冲突或重复的修饰符',i.line)
                    a= true
                    ret.async=true
                    break
                case 'sync':
                    if(a)log.error('冲突或重复的修饰符',i.line)
                    a= true
                    ret.async=false
                    break
                case 'final':
                    if(f)log.error('冲突或重复的修饰符',i.line)
                    f=true
                    ret.final=true
                    break
            }
    }
    tool.kill()
    return ret
}
//匹配声明块
function match_var_block(tool:allang_tools,log:allang_log):var_tree {
    if(!tool.now())return null
    tool.backup()
    let annotations=match_annotations(tool,log)
    let mod=match_modifiers(tool,log)
    let ret=new var_tree(null,mod,annotations,null)
    ret.name=tool.match_type(token_type.identifier, () => {
        log.error('非法的变量名', tool.now().line)
    }).name
    //声明
    tool.match_word(':',()=>{
        log.error('没用类型声明', tool.now().line)
    })
    return ret
}
//匹配类型声明
function match_type(tool:allang_tools,log:allang_log):type_tree {
    if(!tool.now())return null
    tool.backup()
    let ret: type_tree=match_array_type(tool,log)
    tool.kill()
    return ret
}
function match_basic_type(tool:allang_tools,log:allang_log):basic_type_tree{
    let ret:basic_type_tree=null
    if(!tool.now())return null
    tool._match_word('number',()=>{
        ret=new basic_type_tree(basic_type.number)
    },()=>{
        tool._match_word('string',()=>{
            ret=new basic_type_tree(basic_type.string)
        },()=>{
            tool._match_word('boolean',()=>{
                ret=new basic_type_tree(basic_type.boolean)
            },()=>{
                tool._match_word('void',()=>{
                    ret=new basic_type_tree(basic_type.void)
                },()=>{})
            })
        })
    })
    return ret
}
function match_map_type(tool:allang_tools,log:allang_log):map_type_tree{
    if(!tool.now())return null
    tool.backup()
    let ret:map_type_tree=null
    if(!tool.now())return null
    //{a:b,c:d}形式
    //先吃掉{
    tool._match_word('{',()=>{
        ret=new map_type_tree([])
        let split=true,bk=false
        tool.next()
        while(true){
            if(split){
                tool._match_word(',',()=>{log.error('重复分隔符',tool.now().line)},()=>{
                    let key=tool.match_type(token_type.identifier,
                        () => {log.error('map不合法',tool.now().line)}).name
                    tool.match_word(':',()=>{
                        log.error('map不合法',tool.now().line)
                    })
                    let value=match_type(tool,log)
                    if(!value)log.error('缺少类型声明',tool.now().line)
                    ret.value.push(new identifier_tree(key,value))
                    split=false
                })
            }else {
                tool._match_word('}',()=>{
                    bk=true
                    tool.next()
                },()=>{
                    tool.match_word(',',()=>{log.error('缺少分隔符',tool.now().line)})
                    split=true
                })
            }
            if(bk)break
        }
    },()=>{})
    tool.kill()
    return ret
}
//(a:返回类型,b:返回类型)=>返回类型
function match_lambda_type(tool:allang_tools,log:allang_log):lambda_type_tree{
    if(!tool.now())return null
    tool.backup()
    let ret:lambda_type_tree=null
    tool._match_word('(',()=>{
        tool.next()
        ret=new lambda_type_tree([],null)
        //匹配参数
        tool.match_word(')',()=>{
            let bk= false,split=true
            while(true){
                if(split){
                    tool._match_word(',',()=>{
                        log.error('重复分隔符',tool.now().line)
                    },()=>{
                        //匹配参数
                        let name=tool.match_type(token_type.identifier,
                            () => {log.error('参数名不合法',tool.now().line)}).name
                        tool.match_word(':',()=>{
                            log.error('参数声明错误',tool.now().line)
                        })
                        let type=match_type(tool,log)
                        if(!type)log.error('缺少类型声明',tool.now().line)
                        ret.param.push(new identifier_tree(name,type))
                        split=false
                    })
                }else{
                    tool._match_word(')',()=>{
                        bk=true
                    },()=>{
                        tool.match_word(',',()=>{log.error('缺少分隔符',tool.now().line)})
                        split=true
                    })
                }
                if(bk)break
            }
        })
        tool.match_word('=>',()=>{log.error('缺少返回类型',tool.now().line)})
        ret.return_type=match_type(tool,log)
        if(!ret.return_type)log.error('缺少返回类型',tool.now().line)
    },()=>{})
    tool.kill()
    return ret
}
function match_array_type(tool:allang_tools,log:allang_log):type_tree{
    if(!tool.now())return null
    tool.backup()
    let ret:array_type_tree=null
    //先匹配非数组类型
    let type:type_tree=match_basic_type(tool,log)
    if(!type)type=match_map_type(tool,log)
    if(!type)type=match_lambda_type(tool,log)
    ret=new array_type_tree(type)
    //数组维度
    let num:number=0
    //循环匹配[]
    let bk=false
    while(true){
        tool.match_word('[',()=>{bk=true})
        if(bk)break
        tool.match_word(']',()=>{log.error('没有结束的数组标记',tool.now().line)})
        num++
    }
    for(let i=0;i<num;i++){
        ret=new array_type_tree(ret)
    }
    if(num==0){
        return type
    }
    tool.kill()
    return ret
}
/*
格式:
@${模块名.函数名}({直接量})
直接量包括true,false,null,数字,字符串,调用常量
 */
function match_annotation(tool:allang_tools,log:allang_log):annotation_tree {
    tool.backup()
    let tree:annotation_tree=null
    if(!tool.now())return null
    if(tool.now()&&tool.now().name!='@'){
        tool.restore()
        return tree
    }
    tool.match_word('@',()=>{})
    //匹配
    let name=match_module_use(tool,log,true)
    tree=new annotation_tree(name,
        new param_call_tree([]))
    //如果有左括号
    if(tool.now()&&tool.now().name!='(')return tree
    //吃掉
    tool.match_word('(',()=>{})
    let param_call=new param_call_tree([])
    let split=true
    let bk=false
    tool.match_word(')',()=>{
        while (tool.now()){
            //必然是直接量
            if(split){
                tool._match_word(',',()=>{
                    log.error('重复分隔',tool.now().line)
                },()=>{
                    param_call.args.push(match_get(tool,log))
                    split=false
                })
            }
            tool._match_word(',',()=>{
                split=true
            },()=>{
                //一定就是)了
                tool.match_word(')',()=>{
                    log.error('没有结束符',tool.now().line)
                })
                bk=true
            })
            if(bk)break
        }
        tree.value=param_call
    })
    tool.kill()
    return tree
}
function match_annotations(tool:allang_tools,log:allang_log):annotation_tree[]{
    let ret:annotation_tree[]=[]
    while (tool.now()){
        let a=match_annotation(tool,log)
        if(a)ret.push(a)
        else return ret
    }
    tool.kill()
    return ret
}
function match(tool:allang_tools,log:allang_log) :Tree[]{
    let ret:Tree[]=[]
    //匹配import
    ret=match_imports(tool,log,ret)
    return ret
}
export {match}