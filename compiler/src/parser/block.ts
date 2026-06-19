import {token_type, TokenStream} from 'allang-compiler-base'
import {modifier} from '../base/model'
import allang_log from '../base/allang_log'
import {param_iden_expr, type_expr} from './iden'
import expr from './expr'
import {
    BlockTree,
    ClassTree,
    CommandTree,
    FunctionTree,
    ImportTree,
    InterfaceTree,
    ModuleTree,
    VariableTree
} from '../tree'
import {commands_expr} from './command'
import {FileTree} from "../tree/block";

export class BlockData{
    constructor(public name:string,public modifier:modifier){
    }
}
export function parse_modifier(tool:TokenStream){
    if(!tool.hasMore())return null
    let _modifier=new modifier(true,false,false)
    let bk=false
    while(true){
        switch (tool.now().name){
            case 'unstatic':
                _modifier._static=false
                break
            case 'static':
                _modifier._static=true
                break
            case 'public':
                _modifier._public=true
                break
            case 'private':
                _modifier._public=false
                break
            case 'async':
                _modifier._async=true
                break
            case 'sync':
                _modifier._async=false
                break
            default:
                bk=true
                break
        }
        if(bk)break
        tool.next()
    }
    return _modifier
}
export function parse_block(tool:TokenStream){
    let m=parse_modifier(tool)
    if(m==null)return null
    if(tool.now().type!=token_type.identifier)allang_log.error('未定义名称',tool.now().line)
    let name=tool.next().name
    if(tool.now().name!=':')allang_log.error('缺少块定义',tool.now().line)
    tool.next()
    return new BlockData(name,m)
}
export function block_expr(tool:TokenStream){
    if(!tool.hasMore()||tool.now().name=='}')return null
    let data=parse_block(tool)
    if(data==null)return null
    return variable_expr(tool,data)
        ||function_expr(tool,data)
        ||class_expr(tool,data)
        ||interface_expr(tool,data)
        ||module_expr(tool,data)
        ||null
}
export function variable_expr(tool:TokenStream,data:BlockData){
    if(tool.now().name!='var')return null
    tool.next()
    if(tool.now().name!='of')allang_log.error('缺少变量类型定义',tool.now().line)
    tool.next()
    let type=type_expr(tool)
    if(type==null)allang_log.error('缺少变量类型定义',tool.now().line)
    let value=null
    if(tool.hasMore()&&tool.now().name=='='){
        tool.next()
        value=expr(tool)
        if(value==null)allang_log.error('缺少变量值定义',tool.now().line)
    }
    return new VariableTree(data.name,value,data.modifier)
}
export function function_expr(tool:TokenStream,data:BlockData){
    if(tool.now().name!='function')return null
    tool.next()
    let type=type_expr(tool)
    if(type==null)allang_log.error('缺少函数返回类型',tool.now().line)
    let params=param_iden_expr(tool)
    if(params==null)allang_log.error('缺少函数参数',tool.now().line)
    if(tool.now().name==';'){
        tool.next()
        return new FunctionTree(data.name,[],data.modifier,params)
    }
    let command=commands_expr(tool)
    if(command==null)allang_log.error('缺少函数命令体',tool.now().line)
    return new FunctionTree(data.name,command,data.modifier,params)
}
export function class_expr(tool:TokenStream,data:BlockData){
    data.modifier._static=true
    data.modifier._async=false
    data.modifier._public=true
    if(tool.now().name!='class')return null
    tool.next()
    let _implements='Lang.ObjectInterface'
    if(tool.now().name=='implements'){
        tool.next()
        if(tool.now().type!=token_type.identifier)allang_log.error('缺少接口名称',tool.now().line)
        _implements=tool.next().name
    }
    if(tool.now().name!='{')allang_log.error('缺少块开始',tool.now().line)
    tool.next()
    let body=blocks_expr(tool)
    if(tool.now().name!='}')allang_log.error('缺少块结束',tool.now().line)
    tool.next()
    return new ClassTree(data.name,<BlockTree[]>body,data.modifier,_implements)
}
export function interface_expr(tool:TokenStream,data:BlockData){
    data.modifier._static=true
    data.modifier._async=false
    data.modifier._public=true
    if(tool.now().name!='interface')return null
    tool.next()
    let _of='Lang.ObjectInterface'
    if(data.name=='ObjectInterface')_of=''
    if(tool.now().name=='of'){
        tool.next()
        if(tool.now().type!=token_type.identifier)allang_log.error('缺少接口名称',tool.now().line)
        _of=tool.next().name
    }
    if(tool.now().name!='{')allang_log.error('缺少块开始',tool.now().line)
    tool.next()
    let body=blocks_expr(tool)
    if(tool.now().name!='}')allang_log.error('缺少块结束',tool.now().line)
    tool.next()
    return new InterfaceTree(data.name,<BlockTree[]>body,data.modifier,_of)
}
export function module_expr(tool:TokenStream,data:BlockData){
    data.modifier._static=true
    data.modifier._async=false
    data.modifier._public=true
    if(tool.now().name!='module')return null
    tool.next()
    if(tool.now().name!='{')allang_log.error('缺少块开始',tool.now().line)
    tool.next()
    let body=blocks_expr(tool)
    if(tool.now().name!='}')allang_log.error('缺少块结束',tool.now().line)
    tool.next()
    return new ModuleTree(data.name,<BlockTree[]>body,data.modifier)
}
export function import_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='import')return null
    tool.next()
    let name=''
    if(tool.now().type!=token_type.identifier)allang_log.error('缺少模块名称',tool.now().line)
    name=tool.next().name
    if(!tool.hasMore()||tool.now().name!='as')return new ImportTree(name,name)
    tool.next()
    let as=''
    if(tool.now().type!=token_type.identifier)allang_log.error('缺少模块别名',tool.now().line)
    as=tool.next().name
    if(tool.now().name!=';')allang_log.error('缺少导入结束符',tool.now().line)
    return new ImportTree(name,as)
}
export function imports_expr(tool:TokenStream){
    let list=[]
    while(true){
        let imp=import_expr(tool)
        if(imp==null)break
        list.push(imp)
    }
    return list
}
export function blocks_expr(tool:TokenStream){
    let list=[]
    while(true){
        let block=block_expr(tool)
        if(block==null)break
        list.push(block)
    }
    return list
}
export default function(tool:TokenStream){
    let imports=imports_expr(tool)
    let blocks=blocks_expr(tool)
    return new FileTree(imports,blocks)
}