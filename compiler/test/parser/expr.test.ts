import {it,expect,describe} from 'vitest'
import {getStream} from '../test_api'
import primary from '../../src/parser/expr/primary'
import expr from '../../src/parser/expr/index'
import {
    ExprAddTree,
    ExprArrayTree,
    ExprBooleanTree,
    ExprCallTree,
    ExprComputedTree,
    ExprEqualTree,
    ExprGreaterEqualTree,
    ExprGreaterTree,
    ExprIdenTree,
    ExprLessEqualTree,
    ExprLessTree,
    ExprLogicAndTree,
    ExprLogicOrTree,
    ExprMapTree,
    ExprMemberTree,
    ExprMulTree,
    ExprNegTree,
    ExprNotEqualTree,
    ExprNotTree,
    ExprNullTree,
    ExprNumberTree,
    ExprPostDecTree,
    ExprPostIncTree,
    ExprPreDecTree,
    ExprPreIncTree,
    ExprStringTree,
    ExprSubTree,
    ExprTernaryTree,
    MapTypeTree,
    NumberTypeTree,
    StringTypeTree,
    VarIdenTree
} from '../../src/tree'
describe('primary测试',()=>{
    it('number',()=>{
        let tool=getStream('123')
        let node=primary(tool)
        expect(node).toEqual(new ExprNumberTree(123))
        tool=getStream('0')
        node=primary(tool)
        expect(node).toEqual(new ExprNumberTree(0))
    })
    it('string',()=>{
        let tool=getStream('"123"')
        let node=primary(tool)
        expect(node).toEqual(new ExprStringTree('"123"'))
        tool=getStream('""')
        node=primary(tool)
        expect(node).toEqual(new ExprStringTree('""'))
    })
    it('boolean',()=>{
        let tool=getStream('true')
        let node=primary(tool)
        expect(node).toEqual(new ExprBooleanTree(true))
        tool=getStream('false')
        node=primary(tool)
        expect(node).toEqual(new ExprBooleanTree(false))
    })
    it('null',()=>{
        let tool=getStream('null')
        let node=primary(tool)
        expect(node).toEqual(new ExprNullTree())
    })
    it('iden',()=>{
        let tool=getStream('foo')
        let node=primary(tool)
        expect(node).toEqual(new ExprIdenTree('foo'))
        tool=getStream('_bar')
        node=primary(tool)
        expect(node).toEqual(new ExprIdenTree('_bar'))
    })
    it('array',()=>{
        let tool=getStream('[1,2,3]')
        let node=primary(tool)
        expect(node).toEqual(new ExprArrayTree([new ExprNumberTree(1),new ExprNumberTree(2),
            new ExprNumberTree(3)]))
    })
    it('array边界',()=>{
        let tool=getStream('[]')
        let node=primary(tool)
        expect(node).toEqual(new ExprArrayTree([]))
        tool=getStream('[1]')
        node=primary(tool)
        expect(node).toEqual(new ExprArrayTree([new ExprNumberTree(1)]))
        tool=getStream('[[1,2],[3,4]]')
        node=primary(tool)
        expect(node).toEqual(new ExprArrayTree([
            new ExprArrayTree([new ExprNumberTree(1),new ExprNumberTree(2)]),
            new ExprArrayTree([new ExprNumberTree(3),new ExprNumberTree(4)])
        ]))
        tool=getStream('[[[1]]]')
        node=primary(tool)
        expect(node).toEqual(new ExprArrayTree([
            new ExprArrayTree([new ExprArrayTree([new ExprNumberTree(1)])])
        ]))
        //非法尾随逗号抛出异常
        tool=getStream('[1,2,3,]')
        expect(()=>primary(tool)).toThrow()
    })
    it('map',()=>{
        let tool=getStream('{a:number=1}')
        let node=primary(tool)
        expect(node).toEqual(new ExprMapTree([{name:new VarIdenTree('a',
                new NumberTypeTree()),value:new ExprNumberTree(1)}]))
    })
    it('map边界',()=>{
        let tool=getStream('{}')
        let node=primary(tool)
        expect(node).toEqual(new ExprMapTree([]))
        tool=getStream('{a:number=1,b:string="2"}')
        node=primary(tool)
        expect(node).toEqual(new ExprMapTree([{name:new VarIdenTree('a',new NumberTypeTree()),
        value:new ExprNumberTree(1)},{name:new VarIdenTree('b',
                new StringTypeTree()),value:new ExprStringTree('"2"')}]))
        //嵌套map
        tool=getStream('{a:number=1,b:map={c:string="2",d:boolean=true}}')
        node=primary(tool)
        expect(node).toEqual(new ExprMapTree([{name:new VarIdenTree('a',
                new NumberTypeTree()),value:new ExprNumberTree(1)},{name:new VarIdenTree('b',
                new MapTypeTree()),value:
                new ExprMapTree([{name:new VarIdenTree('c',
                        new StringTypeTree()),value:new ExprStringTree('"2"')},
                    {name:new VarIdenTree('d',
                        new NumberTypeTree()),value:new ExprBooleanTree(true)}])}]))
    })
    it('theses',()=>{
        let tool=getStream('(1)')
        let node=primary(tool)
        expect(node).toEqual(new ExprNumberTree(1))
        tool=getStream('(1+2)')
        node=primary(tool)
        expect(node).toEqual(new ExprAddTree(new ExprNumberTree(1),new ExprNumberTree(2)))
    })
})
describe('expr测试',()=>{
    it('binary',()=>{
        let tool=getStream('1+2')
        let node=expr(tool)
        expect(node).toEqual(new ExprAddTree(new ExprNumberTree(1),new ExprNumberTree(2)))
        tool=getStream('3-1')
        node=expr(tool)
        expect(node).toEqual(new ExprSubTree(new ExprNumberTree(3),new ExprNumberTree(1)))
        tool=getStream('2*3')
        node=expr(tool)
        expect(node).toEqual(new ExprMulTree(new ExprNumberTree(2),new ExprNumberTree(3)))
        tool=getStream('1<2')
        node=expr(tool)
        expect(node).toEqual(new ExprLessTree(new ExprNumberTree(1),new ExprNumberTree(2)))
        tool=getStream('2>1')
        node=expr(tool)
        expect(node).toEqual(new ExprGreaterTree(new ExprNumberTree(2),new ExprNumberTree(1)))
        tool=getStream('1<=2')
        node=expr(tool)
        expect(node).toEqual(new ExprLessEqualTree(new ExprNumberTree(1),new ExprNumberTree(2)))
        tool=getStream('2>=1')
        node=expr(tool)
        expect(node).toEqual(new ExprGreaterEqualTree(new ExprNumberTree(2),new ExprNumberTree(1)))
        tool=getStream('1==1')
        node=expr(tool)
        expect(node).toEqual(new ExprEqualTree(new ExprNumberTree(1),new ExprNumberTree(1)))
        tool=getStream('1!=2')
        node=expr(tool)
        expect(node).toEqual(new ExprNotEqualTree(new ExprNumberTree(1),new ExprNumberTree(2)))
        tool=getStream('true&&false')
        node=expr(tool)
        expect(node).toEqual(new ExprLogicAndTree(new ExprBooleanTree(true),new ExprBooleanTree(false)))
        tool=getStream('true||false')
        node=expr(tool)
        expect(node).toEqual(new ExprLogicOrTree(new ExprBooleanTree(true),new ExprBooleanTree(false)))
    })
    it('prefix',()=>{
        let tool=getStream('-1')
        let node=expr(tool)
        expect(node).toEqual(new ExprNegTree(new ExprNumberTree(1)))
        tool=getStream('!true')
        node=expr(tool)
        expect(node).toEqual(new ExprNotTree(new ExprBooleanTree(true)))
        tool=getStream('++a')
        node=expr(tool)
        expect(node).toEqual(new ExprPreIncTree(new ExprIdenTree('a')))
        tool=getStream('--a')
        node=expr(tool)
        expect(node).toEqual(new ExprPreDecTree(new ExprIdenTree('a')))
    })
    it('postfix',()=>{
        let tool=getStream('a.b')
        let node=expr(tool)
        expect(node).toEqual(new ExprMemberTree(new ExprIdenTree('a'),'b'))
        tool=getStream('a[0]')
        node=expr(tool)
        expect(node).toEqual(new ExprComputedTree(new ExprIdenTree('a'),new ExprNumberTree(0)))
        tool=getStream('a++')
        node=expr(tool)
        expect(node).toEqual(new ExprPostIncTree(new ExprIdenTree('a')))
        tool=getStream('a--')
        node=expr(tool)
        expect(node).toEqual(new ExprPostDecTree(new ExprIdenTree('a')))
    })
    it('ternary',()=>{
        let tool=getStream('a?1:2')
        let node=expr(tool)
        expect(node).toEqual(new ExprTernaryTree(
            new ExprIdenTree('a'),new ExprNumberTree(1),new ExprNumberTree(2)
        ))
        //嵌套三元
        tool=getStream('a?b?1:2:3')
        node=expr(tool)
        expect(node).toEqual(new ExprTernaryTree(
            new ExprIdenTree('a'),
            new ExprTernaryTree(new ExprIdenTree('b'),new ExprNumberTree(1),new ExprNumberTree(2)),
            new ExprNumberTree(3)
        ))
    })
    it('组合表达式',()=>{
        let tool=getStream('-a.b')
        let node=expr(tool)
        expect(node).toEqual(new ExprNegTree(new ExprMemberTree(new ExprIdenTree('a'),'b')))
        tool=getStream('1+2*3')
        node=expr(tool)
        expect(node).toEqual(new ExprAddTree(new ExprNumberTree(1),
            new ExprMulTree(new ExprNumberTree(2),new ExprNumberTree(3))))
        tool=getStream('a?b+c:d')
        node=expr(tool)
        expect(node).toEqual(new ExprTernaryTree(
            new ExprIdenTree('a'),
            new ExprAddTree(new ExprIdenTree('b'),new ExprIdenTree('c')),
            new ExprIdenTree('d')
        ))
    })
})