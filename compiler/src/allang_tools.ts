import {token, token_type, tools, Tree} from 'allang-compiler-base'

export default class allang_tools implements tools {
    tokens: token[]
    index: number
    back: allang_tools[]
    constructor(tokens: token[]) {
        this.tokens = tokens
        this.index = 0
        this.back = []
    }

    add(tree: Tree): void {
        throw new Error("Method not implemented.")
    }
    remove(): void {
        throw new Error("Method not implemented.")
    }
    get(): Tree[] {
        throw new Error("Method not implemented.")
    }
    match_word(name:string,un:()=>void):void{
        //如果是就吃掉,不是就执行un
        if(this.tokens[this.index]&&this.tokens[this.index].name==name){
            this.next()
        }else un()
    }
    match_type(type:token_type,un:()=>void):token{
        if(this.tokens[this.index]&&this.tokens[this.index].type== type){
            return this.tokens[this.index++]
        }else un()
    }
    peek(): token {
        return this.tokens[this.index+1]?this.tokens[this.index+1]:null
    }
    now(): token {
        return this.tokens[this.index]?this.tokens[this.index]:null
    }
    pop():token{
        return this.tokens[this.index]?this.tokens[this.index++]:null
    }
    next(): token {
        this.index++
        return this.tokens[this.index]?this.tokens[this.index]:null
    }
    backup(): void {
        this.back.push(this)
    }
    kill():void{
        this.back.pop()
    }
    restore(): void {
        let back=this.back.pop()
        this.index=back.index
        this.tokens=back.tokens
    }
    flush(): void {
    }
}