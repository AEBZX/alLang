import {it, expect, describe} from 'vitest'
import {getStream} from '../test_api'
import {
    parse_modifier, parse_block, block_expr, variable_expr, function_expr,
    class_expr, interface_expr, module_expr, import_expr, imports_expr,
    blocks_expr, BlockData, dot_match
} from '../../src/parser/block'
import block_default from '../../src/parser/block'
import {
    BlockTree, ClassTree, FileTree, FunctionTree, ImportTree,
    InterfaceTree, ModuleTree, VariableTree,
    ExprIdenTree, ExprNumberTree,
    NumberTypeTree, VoidTypeTree, ParamIdenTree, VarIdenTree,
    ReturnTree
} from '../../src/tree'
import {modifier} from '../../src/base/model'

describe('parse_modifier', () => {
    it('空修饰符', () => {
        const m = parse_modifier(getStream('name'))
        expect(m).toEqual(new modifier(true, false, false))
    })
    it('static修饰符', () => {
        const m = parse_modifier(getStream('static name'))
        expect(m).toEqual(new modifier(true, false, true))
    })
    it('unstatic修饰符', () => {
        const m = parse_modifier(getStream('unstatic name'))
        expect(m).toEqual(new modifier(true, false, false))
    })
    it('public修饰符', () => {
        const m = parse_modifier(getStream('public name'))
        expect(m).toEqual(new modifier(true, false, false))
    })
    it('private修饰符', () => {
        const m = parse_modifier(getStream('private name'))
        expect(m).toEqual(new modifier(false, false, false))
    })
    it('async修饰符', () => {
        const m = parse_modifier(getStream('async name'))
        expect(m).toEqual(new modifier(true, true, false))
    })
    it('sync修饰符', () => {
        const m = parse_modifier(getStream('sync name'))
        expect(m).toEqual(new modifier(true, false, false))
    })
    it('组合修饰符-public static async', () => {
        const m = parse_modifier(getStream('public static async name'))
        expect(m).toEqual(new modifier(true, true, true))
    })
    it('组合修饰符-private sync', () => {
        const m = parse_modifier(getStream('private sync name'))
        expect(m).toEqual(new modifier(false, false, false))
    })
    it('修饰符重复最后生效', () => {
        // public 后 private，最后 _public=false
        const m = parse_modifier(getStream('public private name'))
        expect(m).toEqual(new modifier(false, false, false))
    })
    it('空流返回null', () => {
        expect(parse_modifier(getStream(''))).toBeNull()
    })
})

describe('parse_block', () => {
    it('基础块定义', () => {
        const data = parse_block(getStream('public foo:'))
        expect(data).toEqual(new BlockData('foo', new modifier(true, false, false)))
    })
    it('private块定义', () => {
        const data = parse_block(getStream('private foo:'))
        expect(data).toEqual(new BlockData('foo', new modifier(false, false, false)))
    })
    it('缺少名称抛出异常', () => {
        expect(() => parse_block(getStream('public :'))).toThrow()
    })
    it('缺少冒号抛出异常', () => {
        expect(() => parse_block(getStream('public foo'))).toThrow()
    })
    it('无修饰符', () => {
        const data = parse_block(getStream('foo:'))
        expect(data).toEqual(new BlockData('foo', new modifier(true, false, false)))
    })
})

describe('import_expr', () => {
    it('基础导入(无分号)', () => {
        const node = import_expr(getStream('import Foo'))
        expect(node).toEqual(new ImportTree('Foo', 'Foo'))
    })
    it('带别名导入(有分号)', () => {
        const node = import_expr(getStream('import Foo as Bar;'))
        expect(node).toEqual(new ImportTree('Foo', 'Bar'))
    })
    it('不以import开头返回null', () => {
        expect(import_expr(getStream('var'))).toBeNull()
    })
    it('空流返回null', () => {
        expect(import_expr(getStream(''))).toBeNull()
    })
    it('import后无名称抛出异常', () => {
        expect(() => import_expr(getStream('import'))).toThrow()
    })
})

describe('imports_expr', () => {
    it('多个导入', () => {
        const node = imports_expr(getStream('import A import B as C;'))
        expect(node).toEqual([new ImportTree('A', 'A'), new ImportTree('B', 'C')])
    })
    it('无导入返回空数组', () => {
        expect(imports_expr(getStream('var'))).toEqual([])
    })
})

describe('variable_expr', () => {
    it('基础变量定义', () => {
        const tool = getStream('public a:var of number')
        const data = parse_block(tool)
        const node = variable_expr(tool, data!)
        expect(node).toEqual(new VariableTree('a', new NumberTypeTree(), null, new modifier(true, false, false)))
    })
    it('带初始值变量定义', () => {
        const tool = getStream('public a:var of number=1')
        const data = parse_block(tool)
        const node = variable_expr(tool, data!)
        expect(node).toEqual(new VariableTree('a', new NumberTypeTree(), new ExprNumberTree(1), new modifier(true, false, false)))
    })
    it('不是var返回null', () => {
        const tool = getStream('public a:function void(){}')
        const data = parse_block(tool)
        expect(variable_expr(tool, data!)).toBeNull()
    })
    it('var string类型', () => {
        const tool = getStream('a:var of string')
        const data = parse_block(tool)
        // 这个parse_block后'a'作为name，但是type_expr会从'var'开始匹配
        // 实际上这里tool在parse_block后已经在':'之后，所以会看到'var'
        // 重新创建流更好...
        const tool2 = getStream('public s:var of string')
        const data2 = parse_block(tool2)
        const node = variable_expr(tool2, data2!)
        expect(node).not.toBeNull()
        expect(node).toBeInstanceOf(VariableTree)
    })
})

describe('function_expr', () => {
    it('函数声明(无body)', () => {
        const tool = getStream('public foo:function void();')
        const data = parse_block(tool)
        const node = function_expr(tool, data!)
        expect(node).toEqual(new FunctionTree('foo', new VoidTypeTree(), [],
            new modifier(true, false, false), new ParamIdenTree([])))
    })
    it('函数定义含参数和body', () => {
        const tool = getStream('public bar:function number(a:number){return 1;}')
        const data = parse_block(tool)
        const node = function_expr(tool, data!)
        expect(node).toEqual(new FunctionTree('bar', new NumberTypeTree(),
            [new ReturnTree(new ExprNumberTree(1))],
            new modifier(true, false, false),
            new ParamIdenTree([new VarIdenTree('a', new NumberTypeTree())])
        ))
    })
    it('不是function返回null', () => {
        const tool = getStream('public a:var of number')
        const data = parse_block(tool)
        expect(function_expr(tool, data!)).toBeNull()
    })
})

describe('class_expr', () => {
    it('基础类定义', () => {
        const tool = getStream('public Foo:class{}')
        const data = parse_block(tool)
        const node = class_expr(tool, data!)
        expect(node).toEqual(new ClassTree('Foo', [],
            // class_expr 强制修改 modifier
            new modifier(true, false, true), 'Lang.ObjectInterface'))
    })
    it('带接口实现类定义', () => {
        const tool = getStream('public Bar:class implements Baz{}')
        const data = parse_block(tool)
        const node = class_expr(tool, data!)
        expect(node).toEqual(new ClassTree('Bar', [],
            new modifier(true, false, true), 'Baz'))
    })
    it('不是class返回null', () => {
        const tool = getStream('public Foo:interface{}')
        const data = parse_block(tool)
        expect(class_expr(tool, data!)).toBeNull()
    })
})

describe('interface_expr', () => {
    it('基础接口定义', () => {
        const tool = getStream('public IFoo:interface{}')
        const data = parse_block(tool)
        const node = interface_expr(tool, data!)
        expect(node).toEqual(new InterfaceTree('IFoo', [],
            new modifier(true, false, true), 'Lang.ObjectInterface'))
    })
    it('带继承接口定义', () => {
        const tool = getStream('public IBar:interface of IBaz{}')
        const data = parse_block(tool)
        const node = interface_expr(tool, data!)
        expect(node).toEqual(new InterfaceTree('IBar', [],
            new modifier(true, false, true), 'IBaz'))
    })
    it('ObjectInterface自身继承为空', () => {
        const tool = getStream('public ObjectInterface:interface{}')
        const data = parse_block(tool)
        const node = interface_expr(tool, data!)
        expect(node).toEqual(new InterfaceTree('ObjectInterface', [],
            new modifier(true, false, true), ''))
    })
    it('不是interface返回null', () => {
        const tool = getStream('public Foo:class{}')
        const data = parse_block(tool)
        expect(interface_expr(tool, data!)).toBeNull()
    })
})

describe('module_expr', () => {
    it('基础模块定义', () => {
        const tool = getStream('public MyMod:module{}')
        const data = parse_block(tool)
        const node = module_expr(tool, data!)
        expect(node).toEqual(new ModuleTree('MyMod', [],
            new modifier(true, false, true)))
    })
    it('不是module返回null', () => {
        const tool = getStream('public Foo:class{}')
        const data = parse_block(tool)
        expect(module_expr(tool, data!)).toBeNull()
    })
})

describe('block_expr调度', () => {
    it('解析变量块', () => {
        const node = block_expr(getStream('public a:var of number'))
        expect(node).toEqual(new VariableTree('a', new NumberTypeTree(), null,
            new modifier(true, false, false)))
    })
    it('解析函数块', () => {
        const node = block_expr(getStream('public foo:function void();'))
        expect(node).toEqual(new FunctionTree('foo', new VoidTypeTree(), [],
            new modifier(true, false, false), new ParamIdenTree([])))
    })
    it('解析类块', () => {
        const node = block_expr(getStream('public Foo:class{}'))
        expect(node).toBeInstanceOf(ClassTree)
    })
    it('解析接口块', () => {
        const node = block_expr(getStream('public IFoo:interface{}'))
        expect(node).toBeInstanceOf(InterfaceTree)
    })
    it('解析模块块', () => {
        const node = block_expr(getStream('public M:module{}'))
        expect(node).toBeInstanceOf(ModuleTree)
    })
    it('空流返回null', () => {
        expect(block_expr(getStream(''))).toBeNull()
    })
    it('遇到}返回null', () => {
        const tool = getStream('}')
        expect(block_expr(tool)).toBeNull()
    })
})

describe('blocks_expr', () => {
    it('多个块', () => {
        const node = blocks_expr(getStream('public a:var of number public foo:function void();'))
        expect(node).toEqual([
            new VariableTree('a', new NumberTypeTree(), null, new modifier(true, false, false)),
            new FunctionTree('foo', new VoidTypeTree(), [], new modifier(true, false, false), new ParamIdenTree([]))
        ])
    })
    it('无块返回空数组', () => {
        expect(blocks_expr(getStream(''))).toEqual([])
    })
})

describe('block默认(FileTree)', () => {
    it('空文件', () => {
        expect(block_default(getStream(''))).toEqual(new FileTree([], []))
    })
    it('带导入的文件', () => {
        const node = block_default(getStream('import Foo'))
        expect(node).toEqual(new FileTree([new ImportTree('Foo', 'Foo')], []))
    })
    it('带导入和块的文件', () => {
        const node = block_default(getStream('import Foo public Bar:class{}'))
        expect(node.imports).toEqual([new ImportTree('Foo', 'Foo')])
        expect(node.block).toHaveLength(1)
        expect(node.block[0]).toBeInstanceOf(ClassTree)
    })
    it('文件含多个块', () => {
        const node = block_default(getStream('public A:var of number public B:function void();'))
        expect(node.block).toHaveLength(2)
    })
})

// ===== 新增测试: 遗漏的解析函数和更多边界条件 =====

describe('dot_match', () => {
    it('单级名称', () => {
        const result = dot_match(getStream('Foo'))
        expect(result).toBe('Foo')
    })
    it('两级名称(点分隔)', () => {
        const result = dot_match(getStream('Foo.Bar'))
        expect(result).toBe('Foo.Bar')
    })
    it('多级名称', () => {
        const result = dot_match(getStream('A.B.C'))
        expect(result).toBe('A.B.C')
    })
    it('点后非标识符抛出异常', () => {
        // 'Foo.123' 点后是数字不是标识符
        expect(() => dot_match(getStream('Foo.123'))).toThrow()
    })
})

describe('block-嵌套结构', () => {
    it('模块中嵌套模块', () => {
        const node = block_expr(getStream('public M:module{public N:module{}}'))
        expect(node).toBeInstanceOf(ModuleTree)
    })
    it('模块中嵌套类', () => {
        const node = block_expr(getStream('public M:module{public Foo:class{}}'))
        expect(node).toBeInstanceOf(ModuleTree)
    })
    it('类中嵌套函数', () => {
        const node = block_expr(getStream('public Foo:class{public bar:function void();}'))
        expect(node).toBeInstanceOf(ClassTree)
    })
    it('类中嵌套变量', () => {
        const node = block_expr(getStream('public Foo:class{public x:var of number}'))
        expect(node).toBeInstanceOf(ClassTree)
    })
    it('接口中嵌套函数声明', () => {
        const node = block_expr(getStream('public IFoo:interface{public bar:function void();}'))
        expect(node).toBeInstanceOf(InterfaceTree)
    })
    it('类实现多级接口名', () => {
        const node = block_expr(getStream('public Foo:class implements A.B.C{}'))
        expect(node).toBeInstanceOf(ClassTree)
    })
    it('接口继承多级名称', () => {
        const node = block_expr(getStream('public IBar:interface of A.B{}'))
        expect(node).toBeInstanceOf(InterfaceTree)
    })
})

describe('block-额外边界条件', () => {
    it('parse_block空流返回null', () => {
        expect(parse_block(getStream(''))).toBeNull()
    })
    it('block_expr遇}返回null', () => {
        expect(block_expr(getStream('}'))).toBeNull()
    })
    it('blocks_expr空文件返回空数组', () => {
        expect(blocks_expr(getStream(''))).toEqual([])
    })
    it('import_expr有分号场景', () => {
        // 导入无as时不需要分号，有as时需要分号
        const node = import_expr(getStream('import Foo as Bar;'))
        expect(node).toEqual(new ImportTree('Foo', 'Bar'))
    })
    it('import_expr缺少别名抛出异常', () => {
        expect(() => import_expr(getStream('import Foo as ;'))).toThrow()
    })
    it('import_expr缺少分号抛出异常', () => {
        expect(() => import_expr(getStream('import Foo as Bar'))).toThrow()
    })
    it('variable_expr缺少of抛出异常', () => {
        const tool = getStream('public a:var number')
        const data = parse_block(tool)
        expect(() => variable_expr(tool, data!)).toThrow()
    })
    it('function_expr缺少参数抛出异常', () => {
        const tool = getStream('public foo:function void')
        const data = parse_block(tool)
        expect(() => function_expr(tool, data!)).toThrow()
    })
    it('class_expr缺少{抛出异常', () => {
        const tool = getStream('public Foo:class')
        const data = parse_block(tool)
        expect(() => class_expr(tool, data!)).toThrow()
    })
    it('interface_expr缺少{抛出异常', () => {
        const tool = getStream('public IFoo:interface')
        const data = parse_block(tool)
        expect(() => interface_expr(tool, data!)).toThrow()
    })
    it('module_expr缺少{抛出异常', () => {
        const tool = getStream('public M:module')
        const data = parse_block(tool)
        expect(() => module_expr(tool, data!)).toThrow()
    })
})
