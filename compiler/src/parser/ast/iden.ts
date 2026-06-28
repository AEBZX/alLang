import {
    ArrayTypeTree,
    BooleanTypeTree, ClassTree, ClassTypeTree, LambdaTypeTree,
    MapTypeTree,
    NumberTypeTree, ParamIdenTree,
    PointerTypeTree,
    StringTypeTree, TypeTree, VarIdenTree,
    VoidTypeTree
} from '../../tree'
import {token, token_type} from 'allang-compiler-base'
import $ from './lib'
import expr from './expr'
export function basic_type(){
    return $.o(
        $.r(data=>new NumberTypeTree(),'number'),
        $.r(data=>new StringTypeTree(),'string'),
        $.r(data=>new BooleanTypeTree(),'boolean'),
        $.r(data=>new VoidTypeTree(),'void'),
        $.w(data=>new ClassTypeTree(data.map((x:any)=>x.name).join('.')),
        $.t('('),$.t(token_type.identifier),$.t('.'),$.t(')'))
    )
}
export function pack_type(){
    return $.r(data=>{
            let type:TypeTree=data[0]
            for(let i of data[1]){
                (<ArrayTypeTree|MapTypeTree|PointerTypeTree>i).type=type
                type=i
            }
            return type
        },
        basic_type(),$.l($.o(
            $.r(data=>new ArrayTypeTree(null),'[]'),
            $.r(data=>new MapTypeTree(null),'{','}'),
            $.r(data=>new PointerTypeTree(null),'*')
        )))
}
export function type(){
    return $.o(
        $.z(()=>$.r(data=>data[1],'(',type(),')')),
        pack_type(),
        $.z(()=>lambda_type())
    )
}
export function param(){
    return $.w(data => new ParamIdenTree( data),
        $.t('('),
        $.r(data => new VarIdenTree((data[0] as token).name,data[2]),token_type.identifier,':',type()),
        $.t(','),$.t(')'))
}
export function lambda_type(){
    return $.r(
        data=>new LambdaTypeTree(data[0],data[2]),
        param(),
        ('=>'),
        type()
    )
}