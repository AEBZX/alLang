import {token, token_type, TokenStream} from 'allang-compiler-base'
export function token_name_match(tool:TokenStream,name:string):()=>any[]{
    if(!tool.hasMore())return null
    return ()=>[tool.now()?.name == name ? tool.next() : null]
}
export function token_type_match(tool:TokenStream,type:token_type):()=>any[]{
    if(!tool.hasMore())return null
    return ()=>[tool.now()?.type == type ? tool.next() : null]
}
export function order_match(tool:TokenStream,...match:(()=>any[])[]):()=>any[]{
    let ret=[]
    let index=tool.save()
    for(let i=0;i<match.length;i++){
        const result=match[i]()
        if(result==null){
            tool.restore(index)
            return null
        }
        ret.push(result)
    }
    return ()=>ret
}
export function or_match(tool:TokenStream,...match:(()=>any[])[]):()=>any[]{
    for(let i=0;i<match.length;i++){
        const result=match[i]()
        if(result!=null)return ()=>result
    }
    return null
}
export function loop_match(tool:TokenStream,match:()=>any[]):()=>any[]{
    let ret=[]
    while(match!=null){
        const result=match()
        if(result==null)break
        ret.push(result)
    }
    return ()=>ret
}
export function while_match(tool:TokenStream,start:()=>any[],loop:()=>any[],
                            split:()=>any[],end:()=>any[]){
    return order_match(tool,start,loop,
        loop_match(tool,order_match(tool,split,loop))
        ,end)
}