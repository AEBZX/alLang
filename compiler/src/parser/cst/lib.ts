import {token_type, TokenStream} from 'allang-compiler-base'

class Match{
    match():any[]{
        return []
    }
    constructor(public tool:TokenStream) {
    }
}
class ValueMatch extends Match{
    match(): any[] {
        return this.tool.now()?.name==this.value?[this.tool.next().name]:null
    }
    constructor(tool:TokenStream, public value:string) {
        super(tool)
    }
}
class TypeMatch extends Match{
    match(): any[] {
        return this.tool.now()?.type==this.type?[this.tool.next().type]:null
    }
    constructor(tool:TokenStream, public type:token_type) {
        super(tool)
    }
}
class SeqMatch extends Match{
    match(): any[] {
        for(let i of this.matches)
            i.tool=this.tool
        let result:any[]=[]
        let index=this.tool.save()
        for(let i=0;i<this.matches.length;i++){
            let match=this.matches[i].match()
            if(match==null){
                this.tool.restore(index)
                return null
            }
            result.push(match)
        }
        return result
    }
    constructor(tool:TokenStream, public matches:Match[]) {
        super(tool)
    }
}
class OrMatch extends Match{
    match(): any[] {
        for(let i of this.matches)
            i.tool=this.tool
        for(let i=0;i<this.matches.length;i++){
            let match=this.matches[i].match()
            if(match!=null) return match
        }
        return null
    }
    constructor(tool:TokenStream, public matches:Match[]) {
        super(tool)
    }
}
class ChooseMatch extends Match{
    match(): any[] {
        this.matches.tool=this.tool
        return this.matches.match()||[]
    }
    constructor(tool:TokenStream, public matches:Match) {
        super(tool)
    }
}
class LoopMatch extends Match{
    match(): any[] {
        this.matches.tool=this.tool
        let result:any[]=[]
        let index=this.tool.save()
        while(true){
            let match=this.matches.match()
            if(match==null){
                this.tool.restore(index)
                return result
            }
            result.push(match)
            index=this.tool.save()
        }
    }
    constructor(tool:TokenStream, public matches:Match) {
        super(tool)
    }
}
class LazyMatch extends Match{
    match(): any[] {
        let m=this.fn()
        m.tool=this.tool
        return m.match()
    }
    constructor(public fn:()=>Match) {
        super(null)
    }
}
class WhileMatch extends Match{
    match(): any[] {
        this.start.tool=this.tool
        this.loop.tool=this.tool
        this.split.tool=this.tool
        this.end.tool=this.tool
        let ret:any[]=[]
        let index=this.tool.save()
        let start=this.start.match()
        if(start==null) return null
        ret.push(start)
        while(true){
            let loopIndex=this.tool.save()
            let loop=this.loop.match()
            if(loop==null){
                this.tool.restore(loopIndex)
                break
            }
            ret.push(loop)
            let split=this.split.match()
            if(split==null) break
            ret.push(split)
        }
        let end=this.end.match()
        if(end==null){
            this.tool.restore(index)
            return null
        }
        ret.push(end)
        return ret
    }
    constructor(tool:TokenStream, public start:Match,public loop:Match,public split:Match,public end:Match) {
        super(tool)
    }
}
export default {
    value:(tool:TokenStream,value:string)=>new ValueMatch(tool,value),
    type:(tool:TokenStream,type:token_type)=>new TypeMatch(tool,type),
    seq:(tool:TokenStream,...matches:Match[])=>new SeqMatch(tool,matches),
    or:(tool:TokenStream,...matches:Match[])=>new OrMatch(tool,matches),
    choose:(tool:TokenStream,matches:Match)=>new ChooseMatch(tool,matches),
    loop:(tool:TokenStream,matches:Match)=>new LoopMatch(tool,matches),
    while:(tool:TokenStream,start:Match,loop:Match,split:Match,end:Match)=>new WhileMatch(tool,start,loop,split,end),
    v:(value:string)=>new ValueMatch(null,value),
    t:(type:token_type)=>new TypeMatch(null,type),
    o:(...matches:Match[])=>new OrMatch(null,matches),
    s:(...matches:Match[])=>new SeqMatch(null,matches),
    c:(matches:Match)=>new ChooseMatch(null,matches),
    l:(matches:Match)=>new LoopMatch(null,matches),
    w:(start:Match,loop:Match,split:Match,end:Match)=>new WhileMatch(null,start,loop,split,end),
    z:(fn:()=>Match)=>new LazyMatch(fn)
}