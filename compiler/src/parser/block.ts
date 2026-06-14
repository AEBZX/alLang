import {token_type, TokenStream} from 'allang-compiler-base'
import {modifier} from '../base/model'
import allang_log from "../base/allang_log";

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
    if(tool.now().type!=token_type.identifier)allang_log.error('未定义名称',tool.now().line)
    return new BlockData(tool.next().name,m)
}