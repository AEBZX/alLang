import {
    ExprAddressTree, ExprAddTree, ExprAndTree,
    ExprArrayTree, ExprBinaryTree,
    ExprBooleanTree, ExprCallTree, ExprComputedTree, ExprContraryTree, ExprDivTree, ExprEqualTree,
    ExprGreaterEqualTree, ExprGreaterTree,
    ExprIdenTree, ExprLambdaTree,
    ExprLessEqualTree, ExprLessTree,
    ExprLogicAndTree, ExprLogicOrTree, ExprMapTree, ExprMemberTree, ExprModTree, ExprMulTree, ExprNegTree, ExprNewTree,
    ExprNotEqualTree, ExprNotTree,
    ExprNullTree,
    ExprNumberTree, ExprOrTree, ExprPostDecTree, ExprPostfixTree, ExprPostIncTree, ExprPreDecTree,
    ExprPrefixTree, ExprPreIncTree,
    ExprPrimaryTree, ExprReferenceTree, ExprShiftLeftTree, ExprShiftRightTree,
    ExprStringTree, ExprSubTree, ExprTernaryTree, ExprTree, ExprXorTree
} from '../../tree'
import {token, token_type} from 'allang-compiler-base'
import $ from './lib'
import {param, type} from './iden'
import commands from './command'
export function primary (){
    return $.o(
        //string,number,boolean,null
        $.r(data=>new ExprStringTree((data[0] as token).name),token_type.string),
        $.r(data=>new ExprNumberTree(parseFloat((data[0] as token).name)),token_type.number),
        $.o(
            $.r(data=>new ExprBooleanTree(true),'true'),
            $.r(data=>new ExprBooleanTree(false),'false')
        ),
        $.r(data=>new ExprNullTree(),'null'),
        //标识符
        $.r(data => new ExprIdenTree((data[0] as token).name),token_type.identifier),
        //括号
        $.r(data=>data[1],'(',$.z(()=>expr()),')'),
        //数组
        $.w(data => new ExprArrayTree(data),$.t('['),$.z(()=>expr()),$.t(','),$.t(']')),
        $.r(data => new ExprLambdaTree(data[0],null,data[2]),param(),'=>',
            $.o($.z(()=>commands()),$.z(()=>expr()))),
        $.w(data=>new ExprMapTree(data),$.t('{'),
            $.r(data => {return {name:data[0],value:data[2]}},token_type.identifier,':',$.z(()=>expr())),
            $.t(','),$.t('}'))
    )
}
export function postfix(){
    //data[0]:primary data[1]:一堆后缀
    return $.r(data=>{
        let exp:ExprTree=<ExprPrimaryTree>data[0]
        for(let i of data[1]){
            (<ExprPostfixTree>i).object=exp
            exp=i
        }
        return exp
    },primary(),$.l(
        $.o(
            $.r(data=>new ExprPostIncTree(null),'++'),
            $.r(data=>new ExprPostDecTree(null),'--'),
            $.r(data=>new ExprMemberTree(null,data[1]),'.',token_type.identifier),
            $.r(data=>new ExprComputedTree(null,data[1]),'[',$.z(()=>expr()),']'),
            $.r(data=>new ExprCallTree(null,data),
                $.w(data=>data,$.t('('),$.z(()=>expr()),$.t(','),$.t(')')))
        )
    ))
}
export function prefix(){
    return $.r(data=>{
        let exp:ExprTree=<ExprPrimaryTree>data[1]
        for(let i of data[0]){
            (<ExprPrefixTree>i).object=exp
            exp=i
        }
        return exp
    },$.l(
        $.o(
            $.r(data=>new ExprNegTree(null),'-'),
            $.r(data=>new ExprNotTree(null),'!'),
            $.r(data=>new ExprContraryTree(null),'~'),
            $.r(data=>new ExprNewTree(null),'new'),
            $.r(data=>new ExprPreIncTree(null),'++'),
            $.r(data=>new ExprPreDecTree(null),'--'),
            $.r(data=>new ExprAddressTree(null),'&'),
            $.r(data=>new ExprReferenceTree(null),'*')
        )
    ),postfix())
}
//data (oper data)*
export function binary(){
    return $.r(data=>{
            let t:ExprTree=<ExprPrefixTree>data[0]
            for(let i of data[1]){
                (<ExprBinaryTree>i).left=t
                t=i
            }
            return t
        },
        prefix(),
        $.l($.r(data => {
            switch (data[0].name){
                case '+':
                    return new ExprAddTree(null,data[1])
                case '-':
                    return new ExprSubTree(null,data[1])
                case '*':
                    return new ExprMulTree(null,data[1])
                case '/':
                    return new ExprDivTree(null,data[1])
                case '%':
                    return new ExprModTree(null,data[1])
                case '<<':
                    return new ExprShiftLeftTree(null,data[1])
                case '>>':
                    return new ExprShiftRightTree(null,data[1])
                case '<':
                    return new ExprLessTree(null,data[1])
                case '>':
                    return new ExprGreaterTree(null,data[1])
                case '<=':
                    return new ExprLessEqualTree(null,data[1])
                case '>=':
                    return new ExprGreaterEqualTree(null,data[1])
                case '==':
                    return new ExprEqualTree(null,data[1])
                case '!=':
                    return new ExprNotEqualTree(null,data[1])
                case '&':
                    return new ExprAndTree(null,data[1])
                case '^':
                    return new ExprXorTree(null,data[1])
                case '|':
                    return new ExprOrTree(null,data[1])
                case '&&':
                    return new ExprLogicAndTree(null,data[1])
                case '||':
                    return new ExprLogicOrTree(null,data[1])
            }
        },$.o(
            $.t('+'),
            $.t('-'),
            $.t('*'),
            $.t('/'),
            $.t('%'),
            $.t('<<'),
            $.t('>>'),
            $.t('<'),
            $.t('>'),
            $.t('<='),
            $.t('>='),
            $.t('=='),
            $.t('!='),
            $.t('&'),
            $.t('^'),
            $.t('|'),
            $.t('&&'),
            $.t('||')
        ),$.z(()=>binary()))))
}
export function ternary(){
    return $.z(()=>$.r(data => {
        return new ExprTernaryTree(data[0],data[2],data[4])
    },binary(),$.t('?'),expr(),$.t(':'),expr()))
}
export default function expr(){
    return $.o(ternary(),binary())
}