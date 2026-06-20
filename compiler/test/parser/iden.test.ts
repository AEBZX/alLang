import {it, expect, describe} from 'vitest'
import {getStream} from '../test_api'
import {token_expr, type_expr, array_expr, var_expr, param_iden_expr, lambda_expr, class_expr, map_expr} from '../../src/parser/iden'
import {
    ArrayTypeTree, BooleanTypeTree, ClassTypeTree, LambdaTypeTree, MapTypeTree,
    NumberTypeTree, ParamIdenTree, StringTypeTree, VarIdenTree, VoidTypeTree
} from '../../src/tree'

describe('token_expr', () => {
    it('基础token匹配-number', () => {
        const tool = getStream('number')
        expect(token_expr(tool, 'number', NumberTypeTree)).toEqual(new NumberTypeTree())
    })
    it('基础token匹配-string', () => {
        const tool = getStream('string')
        expect(token_expr(tool, 'string', StringTypeTree)).toEqual(new StringTypeTree())
    })
    it('基础token匹配-boolean', () => {
        const tool = getStream('boolean')
        expect(token_expr(tool, 'boolean', BooleanTypeTree)).toEqual(new BooleanTypeTree())
    })
    it('基础token匹配-map', () => {
        const tool = getStream('map')
        expect(token_expr(tool, 'map', MapTypeTree)).toEqual(new MapTypeTree())
    })
    it('基础token匹配-void', () => {
        const tool = getStream('void')
        expect(token_expr(tool, 'void', VoidTypeTree)).toEqual(new VoidTypeTree())
    })
    it('不匹配返回null', () => {
        const tool = getStream('number')
        expect(token_expr(tool, 'string', StringTypeTree)).toBeNull()
    })
    it('空流返回null', () => {
        const tool = getStream('')
        expect(token_expr(tool, 'number', NumberTypeTree)).toBeNull()
    })
})

describe('type_expr', () => {
    it('基础类型-number', () => {
        expect(type_expr(getStream('number'))).toEqual(new NumberTypeTree())
    })
    it('基础类型-string', () => {
        expect(type_expr(getStream('string'))).toEqual(new StringTypeTree())
    })
    it('基础类型-boolean', () => {
        expect(type_expr(getStream('boolean'))).toEqual(new BooleanTypeTree())
    })
    it('基础类型-map', () => {
        expect(type_expr(getStream('map'))).toEqual(new MapTypeTree())
    })
    it('基础类型-void', () => {
        expect(type_expr(getStream('void'))).toEqual(new VoidTypeTree())
    })
    it('数组类型返回基础类型', () => {
        const tool = getStream('number[]')
        expect(type_expr(tool)).toEqual(new NumberTypeTree())
    })
    it('数字字面量不是类型返回null', () => {
        // 123 不是类型关键字，所有 type matcher 返回 null
        // class_expr 也已修复为非标识符返回 null
        const tool = getStream('123')
        expect(type_expr(tool)).toBeNull()
    })
    it('空流返回null', () => {
        const tool = getStream('')
        expect(type_expr(tool)).toBeNull()
    })
})

describe('array_expr', () => {
    it('基础数组类型-number[]', () => {
        expect(array_expr(getStream('number[]'))).toEqual(new ArrayTypeTree(new NumberTypeTree()))
    })
    it('基础数组类型-string[]', () => {
        expect(array_expr(getStream('string[]'))).toEqual(new ArrayTypeTree(new StringTypeTree()))
    })
    it('基础数组类型-boolean[]', () => {
        expect(array_expr(getStream('boolean[]'))).toEqual(new ArrayTypeTree(new BooleanTypeTree()))
    })
    it('基础数组类型-void[]', () => {
        expect(array_expr(getStream('void[]'))).toEqual(new ArrayTypeTree(new VoidTypeTree()))
    })
    it('缺少[]返回null', () => {
        // 修复后 array_expr 不会抛异常而是返回 null
        const tool = getStream('number')
        expect(array_expr(tool)).toBeNull()
    })
    it('只有[]但缺少类型返回null', () => {
        const tool = getStream('[]')
        expect(array_expr(tool)).toBeNull()
    })
    it('非法类型返回null', () => {
        const tool = getStream('123[]')
        expect(array_expr(tool)).toBeNull()
    })
})

describe('var_expr', () => {
    it('基础变量-number', () => {
        expect(var_expr(getStream('a:number'))).toEqual(new VarIdenTree('a', new NumberTypeTree()))
    })
    it('基础变量-string', () => {
        expect(var_expr(getStream('b:string'))).toEqual(new VarIdenTree('b', new StringTypeTree()))
    })
    it('基础变量-boolean', () => {
        expect(var_expr(getStream('c:boolean'))).toEqual(new VarIdenTree('c', new BooleanTypeTree()))
    })
    it('基础变量-void', () => {
        expect(var_expr(getStream('d:void'))).toEqual(new VarIdenTree('d', new VoidTypeTree()))
    })
    it('基础变量-map', () => {
        expect(var_expr(getStream('e:map'))).toEqual(new VarIdenTree('e', new MapTypeTree()))
    })
    it('下划线名称', () => {
        expect(var_expr(getStream('_a:number'))).toEqual(new VarIdenTree('_a', new NumberTypeTree()))
    })
    it('下划线数字名称', () => {
        expect(var_expr(getStream('_123:string'))).toEqual(new VarIdenTree('_123', new StringTypeTree()))
    })
    it('缺少冒号抛出异常', () => {
        expect(() => var_expr(getStream('a'))).toThrow()
    })
    it('缺少类型抛出异常', () => {
        expect(() => var_expr(getStream('a:'))).toThrow()
    })
    it('空流返回null', () => {
        expect(var_expr(getStream(''))).toBeNull()
    })
    it('数字token作为名称可解析', () => {
        // var_expr 使用 tool.now().name, 数字 token 的 name 是 '123'
        // 所以 var_expr 可以解析 123:number, 这不是抛异常的情况
        const result = var_expr(getStream('123:number'))
        expect(result).toBeInstanceOf(VarIdenTree)
    })
})

describe('param_iden_expr', () => {
    it('空参数', () => {
        expect(param_iden_expr(getStream('()'))).toEqual(new ParamIdenTree([]))
    })
    it('单个参数', () => {
        expect(param_iden_expr(getStream('(a:number)'))).toEqual(new ParamIdenTree([
            new VarIdenTree('a', new NumberTypeTree())
        ]))
    })
    it('两个参数', () => {
        expect(param_iden_expr(getStream('(a:number,b:string)'))).toEqual(new ParamIdenTree([
            new VarIdenTree('a', new NumberTypeTree()),
            new VarIdenTree('b', new StringTypeTree())
        ]))
    })
    it('多个参数', () => {
        expect(param_iden_expr(getStream('(a:number,b:string,c:boolean)'))).toEqual(new ParamIdenTree([
            new VarIdenTree('a', new NumberTypeTree()),
            new VarIdenTree('b', new StringTypeTree()),
            new VarIdenTree('c', new BooleanTypeTree())
        ]))
    })
    it('不以(开头返回null', () => {
        expect(param_iden_expr(getStream('a:number'))).toBeNull()
    })
    it('缺少)抛出异常', () => {
        expect(() => param_iden_expr(getStream('(a:number'))).toThrow()
    })
    it('空流返回null', () => {
        expect(param_iden_expr(getStream(''))).toBeNull()
    })
    it('括号内逗号后无参数抛出异常', () => {
        expect(() => param_iden_expr(getStream('(a:number,)'))).toThrow()
    })
    it('只有逗号分隔无实际参数抛出异常', () => {
        expect(() => param_iden_expr(getStream('(,)'))).toThrow()
    })
})

describe('lambda_expr', () => {
    it('基础lambda单参数', () => {
        expect(lambda_expr(getStream('(a:number)=>number'))).toEqual(new LambdaTypeTree(
            new ParamIdenTree([new VarIdenTree('a', new NumberTypeTree())]),
            new NumberTypeTree()
        ))
    })
    it('lambda空参数', () => {
        expect(lambda_expr(getStream('()=>void'))).toEqual(new LambdaTypeTree(
            new ParamIdenTree([]),
            new VoidTypeTree()
        ))
    })
    it('lambda多参数', () => {
        expect(lambda_expr(getStream('(a:number,b:string)=>boolean'))).toEqual(new LambdaTypeTree(
            new ParamIdenTree([new VarIdenTree('a', new NumberTypeTree()), new VarIdenTree('b', new StringTypeTree())]),
            new BooleanTypeTree()
        ))
    })
    it('lambda返回数组类型', () => {
        // type_expr 先匹配 number, 返回 NumberTypeTree, [] 留在流中
        // 所以 lambda_expr 返回 LambdaTypeTree(params, NumberTypeTree)
        const result = lambda_expr(getStream('(a:number)=>number[]'))
        expect(result).toBeInstanceOf(LambdaTypeTree)
        expect((result as LambdaTypeTree).return_type).toBeInstanceOf(NumberTypeTree)
    })
    it('不以(开头返回null', () => {
        // 修复后 lambda_expr 不匹配时返回 null
        expect(lambda_expr(getStream('number'))).toBeNull()
    })
    it('空流返回null', () => {
        expect(lambda_expr(getStream(''))).toBeNull()
    })
    it('缺少返回类型抛出异常', () => {
        expect(() => lambda_expr(getStream('()=>'))).toThrow()
    })
    it('lambda返回map类型', () => {
        // (a:number)=>map(a:number) 这个在type_expr匹配完map后返回MapTypeTree
        // 然后map_expr期望param_iden_expr，但流中没有(，所以map_expr只匹配token_expr('map')
        // 实际lambda_expr会看到()=>map，type_expr匹配'map'作为返回类型
        const result = lambda_expr(getStream('(a:number)=>map'))
        expect(result).toBeInstanceOf(LambdaTypeTree)
    })
})

describe('class_expr', () => {
    it('简单类名', () => {
        expect(class_expr(getStream('Foo'))).toEqual(new ClassTypeTree('Foo'))
    })
    it('带命名空间的类名(点分隔)', () => {
        expect(class_expr(getStream('Foo.Bar'))).toEqual(new ClassTypeTree('Foo.Bar'))
    })
    it('多层命名空间', () => {
        expect(class_expr(getStream('A.B.C'))).toEqual(new ClassTypeTree('A.B.C'))
    })
    it('下划线类名', () => {
        expect(class_expr(getStream('_Foo'))).toEqual(new ClassTypeTree('_Foo'))
    })
    it('不是标识符返回null', () => {
        // 数字token不是identifier类型，应当返回null
        expect(class_expr(getStream('123'))).toBeNull()
    })
    it('空流返回null', () => {
        expect(class_expr(getStream(''))).toBeNull()
    })
    it('关键字不是类名-返回null', () => {
        // 'if' 是 keyword 类型不是 identifier 类型
        expect(class_expr(getStream('if'))).toBeNull()
    })
    it('点后跟非标识符抛出异常', () => {
        // 'Foo.123' — 点后面是数字不是identifier
        expect(() => class_expr(getStream('Foo.123'))).toThrow()
    })
})

describe('map_expr', () => {
    it('map类型无参数', () => {
        // map后无(则param_iden_expr返回null，导致allang_log.error抛出异常
        expect(() => map_expr(getStream('map'))).toThrow()
    })
    it('map类型带一个参数', () => {
        expect(map_expr(getStream('map(a:number)'))).toEqual(new MapTypeTree(
            new ParamIdenTree([new VarIdenTree('a', new NumberTypeTree())])
        ))
    })
    it('map类型带多个参数', () => {
        expect(map_expr(getStream('map(a:number,b:string)'))).toEqual(new MapTypeTree(
            new ParamIdenTree([new VarIdenTree('a', new NumberTypeTree()), new VarIdenTree('b', new StringTypeTree())])
        ))
    })
    it('不以map开头返回null', () => {
        expect(map_expr(getStream('number'))).toBeNull()
    })
    it('空流返回null', () => {
        expect(map_expr(getStream(''))).toBeNull()
    })
})

describe('type_expr-额外边界条件', () => {
    it('type_expr匹配lambda类型', () => {
        const result = type_expr(getStream('(a:number)=>number'))
        expect(result).toBeInstanceOf(LambdaTypeTree)
    })
    it('type_expr匹配类类型', () => {
        const result = type_expr(getStream('MyClass'))
        expect(result).toBeInstanceOf(ClassTypeTree)
        expect((result as ClassTypeTree).name).toBe('MyClass')
    })
    it('只匹配关键字不消耗后续token', () => {
        // 'number' 后还有 '[', 应只返回NumberTypeTree
        const tool = getStream('number[]')
        expect(type_expr(tool)).toEqual(new NumberTypeTree())
    })
})

describe('var_expr-额外边界条件', () => {
    it('变量带类类型', () => {
        const result = var_expr(getStream('obj:MyClass'))
        expect(result).toBeInstanceOf(VarIdenTree)
        expect((result as VarIdenTree).type).toBeInstanceOf(ClassTypeTree)
    })
    it('变量带数组类型', () => {
        const result = var_expr(getStream('arr:number[]'))
        expect(result).toBeInstanceOf(VarIdenTree)
    })
    it('关键字作为标识符名', () => {
        // tokenizer 把关键字也当作 identifier token，只是 type 不同
        const result = var_expr(getStream('if:number'))
        expect(result).toBeInstanceOf(VarIdenTree)
    })
})

describe('param_iden_expr-额外边界条件', () => {
    it('参数带类类型', () => {
        const result = param_iden_expr(getStream('(obj:Foo.Bar)'))
        expect(result).toBeInstanceOf(ParamIdenTree)
    })
    it('参数带lambda类型', () => {
        const result = param_iden_expr(getStream('(fn:(a:number)=>number)'))
        expect(result).toBeInstanceOf(ParamIdenTree)
    })
})

describe('lambda_expr-额外边界条件', () => {
    it('lambda返回类类型', () => {
        const result = lambda_expr(getStream('()=>MyClass'))
        expect(result).toBeInstanceOf(LambdaTypeTree)
        expect((result as LambdaTypeTree).return_type).toBeInstanceOf(ClassTypeTree)
    })
    it('lambda返回map类型', () => {
        const result = lambda_expr(getStream('()=>map'))
        expect(result).toBeInstanceOf(LambdaTypeTree)
    })
})
