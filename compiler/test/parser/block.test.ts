import {it,expect,describe} from 'vitest'
import {getStream} from '../test_api'
import {
    parse_modifier, parse_block, block_expr, variable_expr, function_expr,
    class_expr, interface_expr, module_expr, import_expr, imports_expr,
    blocks_expr, BlockData
} from '../../src/parser/block'
import block_default from '../../src/parser/block'
import {
    BlockTree, ClassTree, FileTree, FunctionTree, ImportTree,
    InterfaceTree, ModuleTree, VariableTree,
    ExprIdenTree, ExprNumberTree,
    NumberTypeTree, VoidTypeTree, ParamIdenTree, VarIdenTree,
    ReturnTree, BreakTree
} from '../../src/tree'
import {modifier} from '../../src/base/model'
describe('parse_modifier测试',()=>{
    it('空修饰符',()=>{
        let tool=getStream('name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(true,false,false))
    })
    it('static修饰符',()=>{
        let tool=getStream('static name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(true,false,true))
    })
    it('unstatic修饰符',()=>{
        let tool=getStream('unstatic name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(true,false,false))
    })
    it('public修饰符',()=>{
        let tool=getStream('public name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(true,false,false))
    })
    it('private修饰符',()=>{
        let tool=getStream('private name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(false,false,false))
    })
    it('async修饰符',()=>{
        let tool=getStream('async name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(true,true,false))
    })
    it('sync修饰符',()=>{
        let tool=getStream('sync name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(true,false,false))
    })
    it('组合修饰符',()=>{
        let tool=getStream('public static async name')
        let m=parse_modifier(tool)
        expect(m).toEqual(new modifier(true,true,true))
        tool=getStream('private sync name')
        m=parse_modifier(tool)
        expect(m).toEqual(new modifier(false,false,false))
    })
})
describe('parse_block测试',()=>{
    it('基础块定义',()=>{
        let tool=getStream('public foo:')
        let data=parse_block(tool)
        expect(data).toEqual(new BlockData('foo',new modifier(true,false,false)))
    })
    it('缺少名称抛出异常',()=>{
        let tool=getStream('public :')
        expect(()=>parse_block(tool)).toThrow()
    })
})
describe('import_expr测试',()=>{
    it('基础导入',()=>{
        let tool=getStream('import Foo')
        let node=import_expr(tool)
        expect(node).toEqual(new ImportTree('Foo','Foo'))
    })
    it('带别名导入',()=>{
        let tool=getStream('import Foo as Bar;')
        let node=import_expr(tool)
        expect(node).toEqual(new ImportTree('Foo','Bar'))
    })
    it('不以import开头返回null',()=>{
        let tool=getStream('var')
        let node=import_expr(tool)
        expect(node).toBeNull()
    })
})
describe('imports_expr测试',()=>{
    it('多个导入',()=>{
        let tool=getStream('import A import B as C;')
        let node=imports_expr(tool)
        expect(node).toEqual([new ImportTree('A','A'),new ImportTree('B','C')])
    })
    it('无导入返回空数组',()=>{
        let tool=getStream('var')
        let node=imports_expr(tool)
        expect(node).toEqual([])
    })
})
describe('variable_expr测试',()=>{
    it('基础变量定义',()=>{
        let tool=getStream('public a:var of number')
        let data=parse_block(tool)
        let node=variable_expr(tool,data!)
        expect(node).toEqual(new VariableTree('a',null,new modifier(true,false,false)))
    })
    it('带初始值变量定义',()=>{
        let tool=getStream('public a:var of number=1')
        let data=parse_block(tool)
        let node=variable_expr(tool,data!)
        expect(node).toEqual(new VariableTree('a',new ExprNumberTree(1),new modifier(true,false,false)))
    })
    it('不是var返回null',()=>{
        let tool=getStream('public a:function void(){}')
        let data=parse_block(tool)
        let node=variable_expr(tool,data!)
        expect(node).toBeNull()
    })
})
describe('function_expr测试',()=>{
    it('函数声明',()=>{
        let tool=getStream('public foo:function void();')
        let data=parse_block(tool)
        let node=function_expr(tool,data!)
        expect(node).toEqual(new FunctionTree('foo',[],new modifier(true,false,false),
            new ParamIdenTree([])))
    })
    it('函数定义含参数',()=>{
        let tool=getStream('public bar:function number(a:number){return 1;}')
        let data=parse_block(tool)
        let node=function_expr(tool,data!)
        expect(node).toEqual(new FunctionTree('bar',
            [new ReturnTree(new ExprNumberTree(1))],
            new modifier(true,false,false),
            new ParamIdenTree([new VarIdenTree('a',new NumberTypeTree())])
        ))
    })
})
describe('class_expr测试',()=>{
    it('基础类定义',()=>{
        let tool=getStream('public Foo:class{}')
        let data=parse_block(tool)
        let node=class_expr(tool,data!)
        expect(node).toEqual(new ClassTree('Foo',[],new modifier(true,false,false),'Lang.ObjectInterface'))
    })
    it('带接口实现类定义',()=>{
        let tool=getStream('public Bar:class implements Baz{}')
        let data=parse_block(tool)
        let node=class_expr(tool,data!)
        expect(node).toEqual(new ClassTree('Bar',[],new modifier(true,false,false),'Baz'))
    })
})
describe('interface_expr测试',()=>{
    it('基础接口定义',()=>{
        let tool=getStream('public IFoo:interface{}')
        let data=parse_block(tool)
        let node=interface_expr(tool,data!)
        expect(node).toEqual(new InterfaceTree('IFoo',[],new modifier(true,false,false),'Lang.ObjectInterface'))
    })
    it('带继承接口定义',()=>{
        let tool=getStream('public IBar:interface of IBaz{}')
        let data=parse_block(tool)
        let node=interface_expr(tool,data!)
        expect(node).toEqual(new InterfaceTree('IBar',[],new modifier(true,false,false),'IBaz'))
    })
})
describe('module_expr测试',()=>{
    it('基础模块定义',()=>{
        let tool=getStream('public MyMod:module{}')
        let data=parse_block(tool)
        let node=module_expr(tool,data!)
        expect(node).toEqual(new ModuleTree('MyMod',[],new modifier(true,false,false)))
    })
})
describe('block_expr测试',()=>{
    it('解析变量块',()=>{
        let tool=getStream('public a:var of number')
        let node=block_expr(tool)
        expect(node).toEqual(new VariableTree('a',null,new modifier(true,false,false)))
    })
    it('解析函数块',()=>{
        let tool=getStream('public foo:function void();')
        let node=block_expr(tool)
        expect(node).toEqual(new FunctionTree('foo',[],new modifier(true,false,false),
            new ParamIdenTree([])))
    })
})
describe('blocks_expr测试',()=>{
    it('多个块',()=>{
        let tool=getStream('public a:var of number public foo:function void();')
        let node=blocks_expr(tool)
        expect(node).toEqual([
            new VariableTree('a',null,new modifier(true,false,false)),
            new FunctionTree('foo',[],new modifier(true,false,false),new ParamIdenTree([]))
        ])
    })
})
describe('block默认(FileTree)测试',()=>{
    it('空文件',()=>{
        let tool=getStream('')
        let node=block_default(tool)
        expect(node).toEqual(new FileTree([],[]))
    })
    it('带导入的文件',()=>{
        let tool=getStream('import Foo')
        let node=block_default(tool)
        expect(node).toEqual(new FileTree([new ImportTree('Foo','Foo')],[]))
    })
})
