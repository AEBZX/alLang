export class GrammarError{
    constructor(public message:string){
    }
}
export class Scope{
    constructor(public n:string[],public parent:Scope){
    }
}