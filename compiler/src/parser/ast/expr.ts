import {token_type,token as t} from 'allang-compiler-base'
import {ExprBooleanTree, ExprIdenTree, ExprNullTree, ExprNumberTree, ExprStringTree, ExprTree} from '../../tree'
export function primary_parser(token:any[]):ExprTree{
    if(token.length==1){
        switch (token[0].type){
            case token_type.number:
                return new ExprNumberTree(parseFloat(token[0].value))
            case token_type.string:
                return new ExprStringTree(token[0].value)
            case token_type.identifier:
                return new ExprIdenTree(token[0].value)
            case token_type.keyword:
                return (<t[]>token)[0].name=='null'?new ExprNullTree():
                    new ExprBooleanTree((<t[]>token)[0].name=='true')
        }
    }
}