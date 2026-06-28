import {token_type,token} from 'allang-compiler-base'
export class CstStream{
    index:number
    constructor(public t:any[]){
        this.index=0
    }
    now(){
        return this.t[this.index]
    }
    next(){
        return this.t[this.index++]
    }
    save(){
        return this.index
    }
    restore(index:number){
        this.index=index
    }
}
class Rule{
    rule:(string|token_type|Rule)[]
    match():boolean{
        let index=this.stream.save()
        for(let i of this.rule)
            if(i instanceof Rule)
                i.stream=this.stream
        for(let i of this.rule){
            if(i instanceof Rule) {
                if(!i.match()){
                    this.stream.restore(index)
                    return false
                }
                // 子Rule匹配成功，已消耗token
            }else if(typeof i=='string'){
                if(this.stream.now()?.name!=i){
                    this.stream.restore(index)
                    return false
                }
                this.stream.next()
            }else{
                if(this.stream.now()?.type!=i){
                    this.stream.restore(index)
                    return false
                }
                this.stream.next()
            }
        }
        // 全部匹配成功，不恢复(已消耗token)
        return true
    }
    exec():any{
        let t=[]
        for(let i of this.rule){
            if(i instanceof Rule) {
                i.stream=this.stream
                t.push(i.exec())
            }else{
                t.push(this.stream.now())
                this.stream.next()
            }
        }
        return this._t?this._t(t):t
    }
    constructor(public stream:CstStream,public _t:(data:any[])=>any,...rule:(string|token_type|Rule)[]) {
        this.rule = rule
    }
}
class OrRule extends Rule{
    match():boolean{
        for(let i of this.rule){
            if(i instanceof Rule)i.stream=this.stream
            let idx=this.stream.save()
            if(!(i instanceof Rule) || i.match())
                return true
            this.stream.restore(idx)
        }
        return false
    }
    exec():any{
        for(let i of this.rule){
            if(i instanceof Rule)i.stream=this.stream
            let idx=this.stream.save()
            if(!(i instanceof Rule) || i.match()){
                this.stream.restore(idx)  // match消耗了token，恢复到起点
                return i instanceof Rule ? i?.exec() :null
            }
            // match已恢复，无需额外处理
        }
        return null
    }
    constructor(stream:CstStream,_t:(data:any[])=>any,...rules:Rule[]){
        super(stream,_t,...rules)
    }
}
class LoopRule extends Rule{
    match():boolean{
        while(true){
            let idx=this.stream.save()
            if(super.match()){
                // 匹配成功，token已消耗，继续循环
            }else{
                break
            }
        }
        return true
    }
    exec():any{
        let t=[]
        let inner=this.rule[0] as Rule
        while(true){
            let idx=this.stream.save()
            if(super.match()){
                this.stream.restore(idx)
                inner.stream=this.stream
                t.push(inner.exec())
            }else{
                break
            }
        }
        return this._t?this._t(t):t
    }
    constructor(stream:CstStream,_t:(data:any[])=>any,rule:Rule){
        super(stream,_t,rule)
    }
}
class WhileRule extends Rule{
    start:Rule; loop:Rule; split:Rule; end:Rule
    match():boolean{
        this.start.stream=this.stream; this.loop.stream=this.stream
        this.split.stream=this.stream; this.end.stream=this.stream
        let index=this.stream.save()
        if(!this.start.match())return false
        // 检查空匹配: start + end
        let idx2=this.stream.save()
        if(this.end.match()){
            this.stream.restore(index)
            return true
        }
        this.stream.restore(idx2)
        // 至少一个loop+end
        while(true){
            if(this.loop.match()){
                let idx3=this.stream.save()
                if(this.end.match()){
                    this.stream.restore(index)
                    return true
                }
                this.stream.restore(idx3)
                if(!this.split.match()){
                    this.stream.restore(index)
                    return false
                }
            }else{
                this.stream.restore(index)
                return false
            }
        }
    }
    exec():any{
        this.start.stream=this.stream; this.loop.stream=this.stream
        this.split.stream=this.stream; this.end.stream=this.stream
        this.start.exec()
        // 空匹配
        let idx=this.stream.save()
        if(this.end.match()){
            this.stream.restore(idx)
            this.end.exec()
            return this._t?this._t([]):[]
        }
        this.stream.restore(idx)
        // 至少一个loop
        let t=[]
        while(true){
            t.push(this.loop.exec())
            let idx2=this.stream.save()
            if(this.end.match()){
                this.stream.restore(idx2)
                this.end.exec()
                return this._t?this._t(t):t
            }
            this.stream.restore(idx2)
            this.split.exec()
        }
    }
    constructor(stream:CstStream,_t:(data:any[])=>any,
                start:Rule,loop:Rule,split:Rule,end:Rule){
        super(stream,_t)
        this.start=start; this.loop=loop; this.split=split; this.end=end
    }
}
class ChooseRule extends Rule{
    match():boolean{
        return true
    }
    exec():any{
        if(super.match())return super.exec()
        return null
    }
    constructor(stream:CstStream,_t:(data:any[])=>any,...rule:(string|token_type|Rule)[]) {
        super(stream,_t,...rule)
    }
}
class LazyRule extends Rule{
    match():boolean{
        let r=this.fn()
        r.stream=this.stream
        return r.match()
    }
    exec():any{
        let r=this.fn()
        r.stream=this.stream
        return r.exec()
    }
    constructor(public fn:()=>Rule){
        super(null,null)
    }
}
export default {
    l:(rule:Rule)=>
        new LoopRule(null,null,rule),
    r:(_t:(data:any[])=>any,...rule:(string|token_type|Rule)[])=>
        new Rule(null,_t,...rule),
    o:(...rules:Rule[])=>
        new OrRule(null,null,...rules),
    w:(_t:(data:any[])=>any,start:Rule,loop:Rule,split:Rule,end:Rule)=>
        new WhileRule(null,_t,start,loop,split,end),
    t:(a:string|token_type)=>new Rule(null,data=>data[0],a),
    c:(...rules:Rule[])=>
        new ChooseRule(null,null,...rules),
    z:(fn:()=>Rule)=>new LazyRule(fn)
}