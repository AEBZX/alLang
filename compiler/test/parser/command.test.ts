import {it,expect,describe} from 'vitest'
import {getStream} from '../test_api'
import oper,{set_expr, var_command_expr, vm_expr, call_expr} from '../../src/parser/command/oper'
import control,{if_expr, while_expr, do_while_expr, for_expr, foreach_expr, switch_expr, try_expr} from '../../src/parser/command/control'
import {command_expr, commands_expr} from '../../src/parser/command/index'
import {
    AddSetTree, AndSetTree, BreakTree, CallTree, ContinueTree, DeleteTree,
    DivSetTree, ForeachTree, ForTree, IfTree,
    ModSetTree, MulSetTree, OrSetTree, ReturnTree, SetTree,
    ShiftLeftSetTree, ShiftRightSetTree, SubSetTree, SwitchTree,
    ThrowTree, TryTree, VarTree, VMTree, WhileTree, XorSetTree,
    ExprIdenTree, ExprNumberTree, ExprStringTree, ExprBooleanTree,
    ExprLessTree, ExprCallTree,
    ExprLambdaTree, ParamIdenTree, VarIdenTree, VoidTypeTree,
    NumberTypeTree
} from '../../src/tree'
import {IncrementTree, DecrementTree} from '../../src/tree/command'
describe('操作命令测试',()=>{
    describe('set_expr',()=>{
        it('基础赋值',()=>{
            let tool=getStream('a=1;')
            let node=set_expr(tool)
            expect(node).toEqual(new SetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
        })
        it('复合赋值',()=>{
            let tool=getStream('a+=1;')
            expect(set_expr(tool)).toEqual(new AddSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a-=1;')
            expect(set_expr(tool)).toEqual(new SubSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a*=1;')
            expect(set_expr(tool)).toEqual(new MulSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a/=1;')
            expect(set_expr(tool)).toEqual(new DivSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a%=1;')
            expect(set_expr(tool)).toEqual(new ModSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a&=1;')
            expect(set_expr(tool)).toEqual(new AndSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a|=1;')
            expect(set_expr(tool)).toEqual(new OrSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a^=1;')
            expect(set_expr(tool)).toEqual(new XorSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a<<=1;')
            expect(set_expr(tool)).toEqual(new ShiftLeftSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
            tool=getStream('a>>=1;')
            expect(set_expr(tool)).toEqual(new ShiftRightSetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
        })
        it('非赋值返回null',()=>{
            let tool=getStream('a')
            let node=set_expr(tool)
            expect(node).toBeNull()
        })
        it('缺少分号抛出异常',()=>{
            let tool=getStream('a=1')
            expect(()=>set_expr(tool)).toThrow()
        })
    })
    describe('var_command_expr',()=>{
        it('基础变量声明',()=>{
            let tool=getStream('var a:number;')
            let node=var_command_expr(tool)
            expect(node).toEqual(new VarTree(new VarIdenTree('a',new NumberTypeTree()),null))
        })
        it('带初始值变量声明',()=>{
            let tool=getStream('var a:number=1;')
            let node=var_command_expr(tool)
            expect(node).toEqual(new VarTree(new VarIdenTree('a',new NumberTypeTree()),new ExprNumberTree(1)))
        })
        it('不以var开头返回null',()=>{
            let tool=getStream('a')
            let node=var_command_expr(tool)
            expect(node).toBeNull()
        })
    })
    describe('vm_expr',()=>{
        it('基础VM命令',()=>{
            let tool=getStream('vm"hello";')
            let node=vm_expr(tool)
            expect(node).toEqual(new VMTree('"hello"'))
        })
    })
    describe('call_expr',()=>{
        it('函数调用',()=>{
            let tool=getStream('foo()')
            let node=call_expr(tool)
            expect(node).toEqual(new CallTree(new ExprCallTree(new ExprIdenTree('foo'),[]),false))
        })
        it('await调用',()=>{
            let tool=getStream('await foo()')
            let node=call_expr(tool)
            expect(node).toEqual(new CallTree(new ExprCallTree(new ExprIdenTree('foo'),[]),true))
        })
    })
    describe('oper默认',()=>{
        it('return语句',()=>{
            let tool=getStream('return 1;')
            let node=oper(tool)
            expect(node).toEqual(new ReturnTree(new ExprNumberTree(1)))
        })
        it('delete语句',()=>{
            let tool=getStream('delete a;')
            let node=oper(tool)
            expect(node).toEqual(new DeleteTree(new ExprIdenTree('a')))
        })
        it('throw语句',()=>{
            let tool=getStream('throw"error";')
            let node=oper(tool)
            expect(node).toEqual(new ThrowTree(new ExprStringTree('"error"')))
        })
        it('break语句',()=>{
            let tool=getStream('break')
            let node=oper(tool)
            expect(node).toEqual(new BreakTree())
        })
        it('continue语句',()=>{
            let tool=getStream('continue')
            let node=oper(tool)
            expect(node).toEqual(new ContinueTree())
        })
        it('赋值语句',()=>{
            let tool=getStream('a=1;')
            let node=oper(tool)
            expect(node).toEqual(new SetTree(new ExprIdenTree('a'),new ExprNumberTree(1)))
        })
        it('函数调用语句',()=>{
            let tool=getStream('foo()')
            let node=oper(tool)
            expect(node).toEqual(new CallTree(new ExprCallTree(new ExprIdenTree('foo'),[]),false))
        })
    })
})
describe('控制流测试',()=>{
    describe('if_expr',()=>{
        it('if单条无else',()=>{
            let tool=getStream('if(a)break')
            let node=if_expr(tool)
            expect(node).toEqual(new IfTree(new ExprIdenTree('a'),[new BreakTree()],[]))
        })
        it('if-else',()=>{
            let tool=getStream('if(a)break else continue')
            let node=if_expr(tool)
            expect(node).toEqual(new IfTree(new ExprIdenTree('a'),[new BreakTree()],[new ContinueTree()]))
        })
        it('if-else带分号',()=>{
            let tool=getStream('if(a)return 1;else return 2;')
            let node=if_expr(tool)
            expect(node).toEqual(new IfTree(new ExprIdenTree('a'),
                [new ReturnTree(new ExprNumberTree(1))],
                [new ReturnTree(new ExprNumberTree(2))]
            ))
        })
    })
    describe('while_expr',()=>{
        it('while循环',()=>{
            let tool=getStream('while(a)break')
            let node=while_expr(tool)
            expect(node).toEqual(new WhileTree(new ExprIdenTree('a'),[new BreakTree()],false))
        })
    })
    describe('do_while_expr',()=>{
        it('do-while循环',()=>{
            let tool=getStream('do break while(a)')
            let node=do_while_expr(tool)
            expect(node).toEqual(new WhileTree(new ExprIdenTree('a'),[new BreakTree()],true))
        })
    })
    describe('for_expr',()=>{
        it('for循环',()=>{
            let tool=getStream('for(var a:number=0;a<10;)break')
            let node=for_expr(tool)
            expect(node).toEqual(new ForTree(
                [new VarTree(new VarIdenTree('a',new NumberTypeTree()),new ExprNumberTree(0))],
                new ExprLessTree(new ExprIdenTree('a'),new ExprNumberTree(10)),
                [],
                [new BreakTree()]
            ))
        })
    })
    describe('foreach_expr',()=>{
        it('foreach循环',()=>{
            let tool=getStream('foreach(a:number:arr)break')
            let node=foreach_expr(tool)
            expect(node).toEqual(new ForeachTree(
                new VarIdenTree('a',new NumberTypeTree()),
                new ExprIdenTree('arr'),
                [new BreakTree()]
            ))
        })
    })
    describe('switch_expr',()=>{
        it('switch语句',()=>{
            let tool=getStream('switch(a){case 1->break default break}')
            let node=switch_expr(tool)
            expect(node).toEqual(new SwitchTree(
                new ExprIdenTree('a'),
                [{condition:new ExprNumberTree(1),call:[new BreakTree()]}],
                [new BreakTree()]
            ))
        })
    })
    describe('try_expr',()=>{
        it('try-catch',()=>{
            let tool=getStream('try break catch(e:number):void->{}')
            let node=try_expr(tool)
            expect(node).toEqual(new TryTree(
                [new BreakTree()],
                new ExprLambdaTree(
                    new ParamIdenTree([new VarIdenTree('e',new NumberTypeTree())]),
                    new VoidTypeTree(),
                    []
                ),
                []
            ))
        })
    })
})
describe('commands_expr测试',()=>{
    it('空命令块',()=>{
        let tool=getStream('{}')
        let node=commands_expr(tool)
        expect(node).toEqual([])
    })
    it('单条命令块',()=>{
        let tool=getStream('{break;}')
        let node=commands_expr(tool)
        expect(node).toEqual([new BreakTree()])
    })
})
