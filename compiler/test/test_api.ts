import {segment, TokenStream} from 'allang-compiler-base'
import Tokens from '../src/base/tokens'
export function getStream(code:string):TokenStream{
    return new TokenStream(new segment(code,Tokens).segment())
}
export function test(id:string,code:string,func:(tool:TokenStream)=>any,flag:(a:any)=>boolean){
    if(flag(func(getStream(code))))console.log(id+':测试成功')
    else console.log(id+'测试失败')
}