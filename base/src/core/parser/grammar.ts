
import {token,token_type} from "../pre";
export class Tree{
    constructor() {
    }
}
export class Match{
    tk:token[]
    constructor(tokens:token[]) {
        this.tk=tokens
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        return null
    }
}
//基本匹配内容
export class tokenNameMatch extends Match{
    name:string
    constructor(tokens:token[], name:string) {
        super(tokens)
        this.name=name
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        let mth=this.tk[0]?.name==this.name
        let tokens=null
        if(mth){
            tokens=this.tk[0]
            this.tk.shift()
        }
        return {mth,tokens}
    }
}
export class tokenTypeMatch extends Match{
    type:token_type
    constructor(tokens:token[], type:token_type) {
        super(tokens)
        this.type=type
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        let mth=this.tk[0]?.type==this.type
        let tokens=null
        if(mth){
            tokens=this.tk[0]
            this.tk.shift()
        }
        return {mth,tokens}
    }
}
//可选匹配
export class chooseMatch extends Match{
    _match:Match
    constructor(match:Match) {
        super(null)
        this._match=match
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        let mth=true
        let tokens=this._match.match().tokens
        return {mth,tokens}
    }
}
//或匹配
export class orMatch extends Match{
    _match:Match[]
    constructor(...match:Match[]) {
        super(null)
        this._match=match
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        let mth=false
        let tokens=null
        for(let i=0;i<this._match.length;i++){
            let m=this._match[i].match()
            if(m.mth){
                mth=true
                tokens=m.tokens
                break
            }
        }
        return {mth,tokens}
    }
}
//顺序匹配
export class sequenceMatch extends Match{
    _match:Match[]
    _to: (t:(token|Tree)[])=>(token|Tree)
    constructor(to:(t:(token|Tree)[])=>(token|Tree),...match:Match[]) {
        super(null)
        this._match=match
        this._to=to
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        let mth=true
        let tokens=[]
        for(let i=0;i<this._match.length;i++){
            let m=this._match[i].match()
            if(!m.mth){
                mth=false
                break
            }
            tokens.push(m.tokens)
        }
        return {mth,tokens:mth?this._to(tokens):null}
    }
}
//循环匹配
export class loopMatch extends Match{
    _match:Match
    _to: (t:(token|Tree)[])=>(token|Tree)
    constructor(to:(t:(token|Tree)[])=>(token|Tree),match:Match) {
        super(null)
        this._match=match
        this._to=to
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        let mth=true
        let tokens=[]
        while(mth){
            let m=this._match.match()
            if(!m.mth)
                break
            tokens.push(m.tokens)
        }
        return {mth,tokens:this._to(tokens)}
    }
}
//带间隔
export class whileMatch extends Match{
    _match:Match
    _to: (t:(token|Tree)[])=>(token|Tree)
    _space:Match
    constructor(to:(t:(token|Tree)[])=>(token|Tree),match:Match,space:Match) {
        super(null)
        this._match=match
        this._to=to
        this._space=space
    }
    match():{mth:boolean,tokens:(token|Tree)}{
        let mth=true
        let tokens=[]
        while(true){
            let m=this._match.match()
            if(!m.mth){
                throw new Error('分隔符后没有匹配物')
            }
            tokens.push(m.tokens)
            let s=this._space.match()
            //结束
            if(!s.mth)
                break
        }
        return {mth,tokens:this._to(tokens)}
    }
}