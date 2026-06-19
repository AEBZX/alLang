import {it,expect,describe} from 'vitest'
import {getStream} from '../test_api'
import {token_expr, type_expr, array_expr, var_expr, param_iden_expr, lambda_expr} from '../../src/parser/iden'
import {
    ArrayTypeTree,
    BooleanTypeTree,
    ExprBooleanTree,
    ExprMapTree,
    ExprNumberTree,
    ExprStringTree,
    LambdaTypeTree,
    MapTypeTree,
    NumberTypeTree,
    ParamIdenTree,
    StringTypeTree,
    VarIdenTree,
    VoidTypeTree
} from '../../src/tree'
describe('token_expr测试',()=>{
    it('基础token匹配',()=>{
        let tool=getStream('number')
        let node=token_expr(tool,'number',NumberTypeTree)
        expect(node).toEqual(new NumberTypeTree())
        tool=getStream('string')
        node=token_expr(tool,'string',ExprStringTree)
        expect(node).toEqual(new StringTypeTree())
        tool=getStream('boolean')
        node=token_expr(tool,'boolean',BooleanTypeTree)
        expect(node).toEqual(new BooleanTypeTree())
        tool=getStream('map')
        node=token_expr(tool,'map',MapTypeTree)
        expect(node).toEqual(new MapTypeTree())
        tool=getStream('void')
        node=token_expr(tool,'void',VoidTypeTree)
        expect(node).toEqual(new VoidTypeTree())
    })
    it('不匹配返回null',()=>{
        let tool=getStream('number')
        let node=token_expr(tool,'string',StringTypeTree)
        expect(node).toBeNull()
    })
    it('空流返回null',()=>{
        let tool=getStream('')
        let node=token_expr(tool,'number',NumberTypeTree)
        expect(node).toBeNull()
    })
})
describe('type_expr测试',()=>{
    it('基础类型',()=>{
        let tool=getStream('number')
        expect(type_expr(tool)).toEqual(new NumberTypeTree())
        tool=getStream('string')
        expect(type_expr(tool)).toEqual(new StringTypeTree())
        tool=getStream('boolean')
        expect(type_expr(tool)).toEqual(new BooleanTypeTree())
        tool=getStream('map')
        expect(type_expr(tool)).toEqual(new MapTypeTree())
        tool=getStream('void')
        expect(type_expr(tool)).toEqual(new VoidTypeTree())
    })
    it('数组类型',()=>{
        let tool=getStream('number[]')
        // type_expr 中 number 先匹配, 返回 NumberTypeTree, [] 留在流中
        let node=type_expr(tool)
        expect(node).toEqual(new NumberTypeTree())
    })
})
describe('array_expr测试',()=>{
    it('基础数组类型',()=>{
        let tool=getStream('number[]')
        let node=array_expr(tool)
        expect(node).toEqual(new ArrayTypeTree(new NumberTypeTree()))
        tool=getStream('string[]')
        node=array_expr(tool)
        expect(node).toEqual(new ArrayTypeTree(new StringTypeTree()))
        tool=getStream('boolean[]')
        node=array_expr(tool)
        expect(node).toEqual(new ArrayTypeTree(new BooleanTypeTree()))
    })
    it('缺少[]抛出异常',()=>{
        let tool=getStream('number')
        expect(()=>array_expr(tool)).toThrow()
    })
})
describe('var_expr测试',()=>{
    it('基础变量定义',()=>{
        let tool=getStream('a:number')
        let node=var_expr(tool)
        expect(node).toEqual(new VarIdenTree('a',new NumberTypeTree()))
        tool=getStream('b:string')
        node=var_expr(tool)
        expect(node).toEqual(new VarIdenTree('b',new StringTypeTree()))
        tool=getStream('c:boolean')
        node=var_expr(tool)
        expect(node).toEqual(new VarIdenTree('c',new BooleanTypeTree()))
        tool=getStream('d:void')
        node=var_expr(tool)
        expect(node).toEqual(new VarIdenTree('d',new VoidTypeTree()))
    })
    it('下划线名称',()=>{
        let tool=getStream('_a:number')
        let node=var_expr(tool)
        expect(node).toEqual(new VarIdenTree('_a',new NumberTypeTree()))
        tool=getStream('_123:string')
        node=var_expr(tool)
        expect(node).toEqual(new VarIdenTree('_123',new StringTypeTree()))
    })
    it('缺少冒号抛出异常',()=>{
        let tool=getStream('a')
        expect(()=>var_expr(tool)).toThrow()
    })
    it('缺少类型抛出异常',()=>{
        let tool=getStream('a:')
        expect(()=>var_expr(tool)).toThrow()
    })
})
describe('param_iden_expr测试',()=>{
    it('空参数',()=>{
        let tool=getStream('()')
        let node=param_iden_expr(tool)
        expect(node).toEqual(new ParamIdenTree([]))
    })
    it('单个参数',()=>{
        let tool=getStream('(a:number)')
        let node=param_iden_expr(tool)
        expect(node).toEqual(new ParamIdenTree([
            new VarIdenTree('a',new NumberTypeTree())
        ]))
    })
    it('多个参数',()=>{
        let tool=getStream('(a:number,b:string,c:boolean)')
        let node=param_iden_expr(tool)
        expect(node).toEqual(new ParamIdenTree([
            new VarIdenTree('a',new NumberTypeTree()),
            new VarIdenTree('b',new StringTypeTree()),
            new VarIdenTree('c',new BooleanTypeTree())
        ]))
    })
    it('不以(开头返回null',()=>{
        let tool=getStream('a:number')
        let node=param_iden_expr(tool)
        expect(node).toBeNull()
    })
    it('缺少)抛出异常',()=>{
        let tool=getStream('(a:number')
        expect(()=>param_iden_expr(tool)).toThrow()
    })
})
describe('lambda_expr测试',()=>{
    it('基础lambda类型',()=>{
        let tool=getStream('(a:number)=>number')
        let node=lambda_expr(tool)
        expect(node).toEqual(new LambdaTypeTree(
            new ParamIdenTree([new VarIdenTree('a',new NumberTypeTree())]),
            new NumberTypeTree()
        ))
    })
    it('空参数lambda',()=>{
        let tool=getStream('()=>void')
        let node=lambda_expr(tool)
        expect(node).toEqual(new LambdaTypeTree(
            new ParamIdenTree([]),
            new VoidTypeTree()
        ))
    })
})
