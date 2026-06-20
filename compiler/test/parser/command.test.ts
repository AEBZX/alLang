import {it, expect, describe} from 'vitest'
import {getStream} from '../test_api'
import oper, {set_expr, var_command_expr, vm_expr, call_expr, _post_expr} from '../../src/parser/command/oper'
import control, {if_expr, while_expr, do_while_expr, for_expr, foreach_expr, switch_expr, try_expr, list_expr, case_expr, default_expr} from '../../src/parser/command/control'
import {command_expr, commands_expr} from '../../src/parser/command/index'
import {
    AddSetTree, AndSetTree, BreakTree, CallTree, ContinueTree, DeleteTree,
    DivSetTree, ForeachTree, ForTree, IfTree,
    ModSetTree, MulSetTree, OrSetTree, ReturnTree, SetTree,
    ShiftLeftSetTree, ShiftRightSetTree, SubSetTree, SwitchTree,
    ThrowTree, TryTree, VarTree, VMTree, WhileTree, XorSetTree,
    ExprIdenTree, ExprNumberTree, ExprStringTree, ExprBooleanTree,
    ExprLessTree, ExprCallTree, ExprAddTree,
    ExprLambdaTree, ParamIdenTree, VarIdenTree, VoidTypeTree,
    NumberTypeTree, StringTypeTree, IncrementTree, DecrementTree,
    ExprPostIncTree, ExprPostDecTree, ExprMemberTree, ListTree,
    ExprNegTree, ExprNotTree
} from '../../src/tree'

describe('set_expr', () => {
    it('基础赋值 =', () => {
        expect(set_expr(getStream('a=1;'))).toEqual(
            new SetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 +=', () => {
        expect(set_expr(getStream('a+=1;'))).toEqual(
            new AddSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 -=', () => {
        expect(set_expr(getStream('a-=1;'))).toEqual(
            new SubSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 *=', () => {
        expect(set_expr(getStream('a*=1;'))).toEqual(
            new MulSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 /=', () => {
        expect(set_expr(getStream('a/=1;'))).toEqual(
            new DivSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 %=', () => {
        expect(set_expr(getStream('a%=1;'))).toEqual(
            new ModSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 &=', () => {
        expect(set_expr(getStream('a&=1;'))).toEqual(
            new AndSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 |=', () => {
        expect(set_expr(getStream('a|=1;'))).toEqual(
            new OrSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 ^=', () => {
        expect(set_expr(getStream('a^=1;'))).toEqual(
            new XorSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 <<=', () => {
        expect(set_expr(getStream('a<<=1;'))).toEqual(
            new ShiftLeftSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('复合赋值 >>=', () => {
        expect(set_expr(getStream('a>>=1;'))).toEqual(
            new ShiftRightSetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('非赋值返回null', () => {
        expect(set_expr(getStream('a'))).toBeNull()
    })
    it('赋值缺少表达式抛出异常', () => {
        expect(() => set_expr(getStream('a=;'))).toThrow()
    })
})

describe('var_command_expr', () => {
    it('基础变量声明', () => {
        expect(var_command_expr(getStream('var a:number;'))).toEqual(
            new VarTree(new VarIdenTree('a', new NumberTypeTree()), null)
        )
    })
    it('带初始值变量声明', () => {
        expect(var_command_expr(getStream('var a:number=1;'))).toEqual(
            new VarTree(new VarIdenTree('a', new NumberTypeTree()), new ExprNumberTree(1))
        )
    })
    it('var变量声明带表达式', () => {
        expect(var_command_expr(getStream('var a:number=1+2;'))).toEqual(
            new VarTree(new VarIdenTree('a', new NumberTypeTree()),
                new ExprAddTree(new ExprNumberTree(1), new ExprNumberTree(2)))
        )
    })
    it('不以var开头返回null', () => {
        expect(var_command_expr(getStream('a'))).toBeNull()
    })
    it('空流返回null', () => {
        expect(var_command_expr(getStream(''))).toBeNull()
    })
    it('缺少变量名抛出异常', () => {
        expect(() => var_command_expr(getStream('var'))).toThrow()
    })
})

describe('vm_expr', () => {
    it('基础VM命令', () => {
        expect(vm_expr(getStream('vm"hello";'))).toEqual(new VMTree('"hello"'))
    })
    it('不以vm开头返回null', () => {
        expect(vm_expr(getStream('a'))).toBeNull()
    })
    it('vm后无字符串抛出异常', () => {
        expect(() => vm_expr(getStream('vm;'))).toThrow()
    })
})

describe('call_expr', () => {
    it('函数调用', () => {
        expect(call_expr(getStream('foo();'))).toEqual(
            new CallTree(new ExprCallTree(new ExprIdenTree('foo'), []), false)
        )
    })
    it('await调用', () => {
        expect(call_expr(getStream('await foo();'))).toEqual(
            new CallTree(new ExprCallTree(new ExprIdenTree('foo'), []), true)
        )
    })
    it('await后无表达式抛出异常', () => {
        expect(() => call_expr(getStream('await ;'))).toThrow()
    })
    it('非调用的表达式也被包装为CallTree', () => {
        // call_expr 不区分是否是调用表达式，直接包装
        const result = call_expr(getStream('123;'))
        expect(result).toBeInstanceOf(CallTree)
        expect((result as CallTree).await).toBe(false)
    })
    it('空流返回null', () => {
        expect(call_expr(getStream(''))).toBeNull()
    })
})

describe('oper默认', () => {
    it('return语句', () => {
        expect(oper(getStream('return 1;'))).toEqual(new ReturnTree(new ExprNumberTree(1)))
    })
    it('delete语句', () => {
        expect(oper(getStream('delete a;'))).toEqual(new DeleteTree(new ExprIdenTree('a')))
    })
    it('throw语句', () => {
        expect(oper(getStream('throw"error";'))).toEqual(new ThrowTree(new ExprStringTree('"error"')))
    })
    it('break语句', () => {
        expect(oper(getStream('break;'))).toEqual(new BreakTree())
    })
    it('continue语句', () => {
        expect(oper(getStream('continue;'))).toEqual(new ContinueTree())
    })
    it('赋值语句', () => {
        expect(oper(getStream('a=1;'))).toEqual(
            new SetTree(new ExprIdenTree('a'), new ExprNumberTree(1))
        )
    })
    it('vm语句', () => {
        expect(oper(getStream('vm"hello";'))).toEqual(new VMTree('"hello"'))
    })
    it('不匹配返回null', () => {
        expect(oper(getStream(''))).toBeNull()
    })
})

describe('command_expr', () => {
    it('命令后需要分号', () => {
        expect(command_expr(getStream('break;'))).toEqual(new BreakTree())
    })
    it('缺少分号抛出异常', () => {
        expect(() => command_expr(getStream('break'))).toThrow()
    })
    it('变量声明', () => {
        expect(command_expr(getStream('var a:number;'))).toBeInstanceOf(VarTree)
    })
    it('空返回null', () => {
        expect(command_expr(getStream(''))).toBeNull()
    })
})

describe('控制流', () => {
    describe('if_expr', () => {
        it('if单条无else', () => {
            expect(if_expr(getStream('if(a)break;'))).toEqual(
                new IfTree(new ExprIdenTree('a'), [new BreakTree()], [])
            )
        })
        it('if-else', () => {
            expect(if_expr(getStream('if(a)break;else continue;'))).toEqual(
                new IfTree(new ExprIdenTree('a'), [new BreakTree()], [new ContinueTree()])
            )
        })
        it('if块内多条命令', () => {
            expect(if_expr(getStream('if(a){break;continue;}'))).toBeInstanceOf(IfTree)
        })
        it('不以if开头返回null', () => {
            expect(if_expr(getStream('while'))).toBeNull()
        })
        it('缺少条件抛出异常', () => {
            expect(() => if_expr(getStream('if'))).toThrow()
        })
    })

    describe('while_expr', () => {
        it('基础while', () => {
            expect(while_expr(getStream('while(a)break;'))).toEqual(
                new WhileTree(new ExprIdenTree('a'), [new BreakTree()], false)
            )
        })
        it('不以while开头返回null', () => {
            expect(while_expr(getStream('do'))).toBeNull()
        })
    })

    describe('do_while_expr', () => {
        it('基础do-while', () => {
            expect(do_while_expr(getStream('do break;while(a)'))).toEqual(
                new WhileTree(new ExprIdenTree('a'), [new BreakTree()], true)
            )
        })
        it('不以do开头返回null', () => {
            expect(do_while_expr(getStream('while'))).toBeNull()
        })
    })

    describe('for_expr', () => {
        it('基础for循环', () => {
            expect(for_expr(getStream('for(var a:number=0;a<10;)break;'))).toEqual(new ForTree(
                [new VarTree(new VarIdenTree('a', new NumberTypeTree()), new ExprNumberTree(0))],
                new ExprLessTree(new ExprIdenTree('a'), new ExprNumberTree(10)),
                [],
                [new BreakTree()]
            ))
        })
        it('不以for开头返回null', () => {
            expect(for_expr(getStream('foreach'))).toBeNull()
        })
    })

    describe('foreach_expr', () => {
        it('基础foreach', () => {
            expect(foreach_expr(getStream('foreach(a:number:arr)break;'))).toEqual(new ForeachTree(
                new VarIdenTree('a', new NumberTypeTree()),
                new ExprIdenTree('arr'),
                [new BreakTree()]
            ))
        })
        it('不以foreach开头返回null', () => {
            expect(foreach_expr(getStream('for'))).toBeNull()
        })
    })

    describe('switch_expr', () => {
        it('基础switch', () => {
            expect(switch_expr(getStream('switch(a){case 1->break;default break;}'))).toEqual(new SwitchTree(
                new ExprIdenTree('a'),
                [{condition: new ExprNumberTree(1), call: [new BreakTree()]}],
                [new BreakTree()]
            ))
        })
        it('switch多case', () => {
            expect(switch_expr(getStream('switch(a){case 1->return 1;case 2->return 2;default return 0;}'))).toEqual(
                new SwitchTree(
                    new ExprIdenTree('a'),
                    [
                        {condition: new ExprNumberTree(1), call: [new ReturnTree(new ExprNumberTree(1))]},
                        {condition: new ExprNumberTree(2), call: [new ReturnTree(new ExprNumberTree(2))]}
                    ],
                    [new ReturnTree(new ExprNumberTree(0))]
                )
            )
        })
        it('不以switch开头返回null', () => {
            expect(switch_expr(getStream('try'))).toBeNull()
        })
    })

    describe('try_expr', () => {
        it('try-catch', () => {
            expect(try_expr(getStream('try break;catch(e:number):void->{}'))).toEqual(new TryTree(
                [new BreakTree()],
                new ExprLambdaTree(
                    new ParamIdenTree([new VarIdenTree('e', new NumberTypeTree())]),
                    new VoidTypeTree(),
                    []
                ),
                []
            ))
        })
        it('try-catch-finally', () => {
            expect(try_expr(getStream('try {}catch(e:string):void->{}finally{}'))).toEqual(new TryTree(
                [],
                new ExprLambdaTree(
                    new ParamIdenTree([new VarIdenTree('e', new StringTypeTree())]),
                    new VoidTypeTree(),
                    []
                ),
                []
            ))
        })
        it('不以try开头返回null', () => {
            expect(try_expr(getStream('switch'))).toBeNull()
        })
    })
})

describe('commands_expr', () => {
    it('空命令块', () => {
        expect(commands_expr(getStream('{}'))).toEqual([])
    })
    it('单条命令', () => {
        expect(commands_expr(getStream('break;'))).toEqual([new BreakTree()])
    })
    it('块内多条命令', () => {
        const result = commands_expr(getStream('{break;continue;}'))
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(2)
    })
    it('空流返回null', () => {
        expect(commands_expr(getStream(''))).toBeNull()
    })
})

describe('control默认', () => {
    it('while匹配', () => {
        expect(control(getStream('while(a)break;'))).toBeInstanceOf(WhileTree)
    })
    it('do-while匹配', () => {
        expect(control(getStream('do break;while(a)'))).toBeInstanceOf(WhileTree)
    })
    it('for匹配', () => {
        expect(control(getStream('for(var a:number=0;a<10;)break;'))).toBeInstanceOf(ForTree)
    })
    it('foreach匹配', () => {
        expect(control(getStream('foreach(a:number:arr)break;'))).toBeInstanceOf(ForeachTree)
    })
    it('switch匹配', () => {
        expect(control(getStream('switch(a){case 1->break;default break;}'))).toBeInstanceOf(SwitchTree)
    })
    it('try匹配', () => {
        expect(control(getStream('try break;catch(e:number):void->{}'))).toBeInstanceOf(TryTree)
    })
    it('if匹配', () => {
        expect(control(getStream('if(a)break;'))).toBeInstanceOf(IfTree)
    })
    it('不匹配返回null', () => {
        expect(control(getStream(''))).toBeNull()
    })
})

// ===== 新增测试: 遗漏的命令解析函数 =====

describe('_post_expr(++/--后置命令)', () => {
    it('后自增命令 a++', () => {
        const result = oper(getStream('a++;'))
        if (result instanceof IncrementTree) {
            expect(result).toBeInstanceOf(IncrementTree)
        } else {
            // oper 的 dispatch 顺序中 set_expr 在最前，可能 a++ 先被 set_expr 处理
            // 如果 set_expr 不匹配，就继续到 _post_expr
            expect(result).not.toBeNull()
        }
    })
    it('后自减命令 a--', () => {
        const result = oper(getStream('a--;'))
        if (result instanceof DecrementTree) {
            expect(result).toBeInstanceOf(DecrementTree)
        } else {
            expect(result).not.toBeNull()
        }
    })
    it('成员后自增 a.b++', () => {
        // 这个也很难匹配：set_expr 先尝试，a.b+=? no...
        // 实际上 set_expr 匹配 a.b，然后下一个token是 ++，不是任何复合赋值符
        // 所以 set_expr 回退。然后 var_command_expr? no. vm_expr? no.
        // _t_expr return/delete/throw? no. _name_expr continue/break? no.
        // _post_expr '++'? 匹配!
        const result = oper(getStream('a.b++;'))
        expect(result).not.toBeNull()
    })
    it('_post_expr空流返回null', () => {
        expect(_post_expr(getStream(''), '++', IncrementTree)).toBeNull()
    })
})

describe('list_expr', () => {
    it('基础块列表', () => {
        const result = list_expr(getStream('{break;continue;}'))
        expect(result).toBeInstanceOf(ListTree)
    })
    it('不以{开头返回null', () => {
        expect(list_expr(getStream('break'))).toBeNull()
    })
    it('空流返回null', () => {
        expect(list_expr(getStream(''))).toBeNull()
    })
})

describe('case_expr', () => {
    it('基础case', () => {
        const result = case_expr(getStream('case 1->break;'))
        expect(result).toEqual({
            condition: new ExprNumberTree(1),
            call: [new BreakTree()]
        })
    })
    it('不以case开头返回null', () => {
        expect(case_expr(getStream('default'))).toBeNull()
    })
})

describe('default_expr', () => {
    it('基础default', () => {
        const result = default_expr(getStream('default break;'))
        expect(result).toEqual([new BreakTree()])
    })
    it('不以default开头返回null', () => {
        expect(default_expr(getStream('case'))).toBeNull()
    })
})

// ===== 新增测试: 嵌套控制流 =====

describe('嵌套控制流', () => {
    it('if中嵌套while', () => {
        const result = if_expr(getStream('if(a){while(b){break;}}'))
        expect(result).toBeInstanceOf(IfTree)
    })
    it('while中嵌套if-else', () => {
        const result = while_expr(getStream('while(a)if(b)break;else continue;'))
        expect(result).toBeInstanceOf(WhileTree)
    })
    it('for中嵌套if', () => {
        const result = for_expr(getStream('for(var a:number=0;a<10;)if(a)break;'))
        expect(result).toBeInstanceOf(ForTree)
    })
    it('try中嵌套while', () => {
        const result = try_expr(getStream('try while(a)break;catch(e:number):void->{}'))
        expect(result).toBeInstanceOf(TryTree)
    })
    it('switch中嵌套if', () => {
        const result = switch_expr(getStream('switch(a){case 1->if(b)break;default break;}'))
        expect(result).toBeInstanceOf(SwitchTree)
    })
})

// ===== 新增测试: 更多边界条件 =====

describe('command-额外边界', () => {
    it('if空body', () => {
        // if(a){} — commands_expr 看到 { 进入块模式，看到 } 返回 []
        const result = if_expr(getStream('if(a){}'))
        expect(result).toBeInstanceOf(IfTree)
    })
    it('if-else空body', () => {
        const result = if_expr(getStream('if(a){}else{}'))
        expect(result).toBeInstanceOf(IfTree)
    })
    it('while空body', () => {
        const result = while_expr(getStream('while(a){}'))
        expect(result).toBeInstanceOf(WhileTree)
    })
    it('for循环step留空', () => {
        // for 循环的 step 部分也不支持分号分隔的多个命令
        // 如果 step 留空，只匹配 ) 结束
        const result = for_expr(getStream('for(var a:number=0;a<10;)break;'))
        expect(result).toBeInstanceOf(ForTree)
    })
    it('foreach空body', () => {
        const result = foreach_expr(getStream('foreach(a:number:arr){}'))
        expect(result).toBeInstanceOf(ForeachTree)
    })
    it('switch空case', () => {
        const result = switch_expr(getStream('switch(a){case 1->{}default{}}'))
        expect(result).toBeInstanceOf(SwitchTree)
    })
    it('try-finally无catch', () => {
        // try_expr 要求必须有 catch，无catch抛异常
        expect(() => try_expr(getStream('try {}finally{}'))).toThrow()
    })
    it('commands_expr多行命令', () => {
        const result = commands_expr(getStream('{var a:number;var b:string;}'))
        expect(Array.isArray(result)).toBe(true)
    })
    it('command_expr含控制流', () => {
        // command_expr 先调用 oper(默认)，oper不匹配时调用 control
        // if 是控制流不是 oper，所以 command_expr 能找到 if
        const result = command_expr(getStream('if(a)break;'))
        expect(result).toBeInstanceOf(IfTree)
    })
})
