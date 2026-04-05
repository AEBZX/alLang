enum token_type{
    identifier,
    keyword,
    space,
    number,
    string,
    unknow
}
enum match_type{
    number,
    string,
    identifier
}
class word{
    public name:string
    constructor(name:string) {
        this.name=name
    }
}
class token{
    public name:string
    public type:token_type
    public line:string
    constructor(name:string,type:token_type,line:string) {
        this.name=name
        this.type=type
        this.line=line
    }
}
export {token,token_type,word,match_type}