/**
 * 进行预分词
 * 之后会被进一步加工成可用token
 */
import {match_type, token, token_type, word} from './model'
import {match} from './match'

class segment{
    public code:string[]
    public words:word[]
    public index:number
    public line:number
    public ret:token[]
    private readonly line_code:string[]
    constructor(code:string,words:word[]) {
        code=code.replace(/\r\n/g,'\n')
        //将words降序排序
        words.sort((a,b)=>{
            return b.name.length-a.name.length
        })
        this.code=[...code]
        this.words=words
        this.line=1
        this.line_code=code.replace(/\r\n/g,'\n').split('\n')
    }
    lines():string{
        return this.line_code[this.line-1]+': line '+(this.line-1)
    }
    segment():token[]{
        this.ret=[]
        this.index=0
        this.line=1
        while(this.is(this.index)){
            if(this.code[this.index]=='\n'){
                this.index++
                this.line++
                continue
            }
            if(this.code[this.index]==' ' || this.code[this.index]=='\t'){
                this.ret.push(new token(' ',token_type.space,this.lines()))
                while(this.is(this.index)){
                    if(this.code[this.index]=='\n'){
                        this.index++
                        this.line++
                        continue
                    }
                    if(!((this.code[this.index]==' '||this.code[this.index]=='\t')))
                         break
                    this.index++
                }
                continue
            }
            //注释
            if(this.match_comment()) continue
            //数字字符串
            if(this.match_other()) continue
            let word_match = false;
            for(let i=0;i<this.words.length;i++){
                if(!this.match(this.words[i]))continue
                let a=match(this.code,this.index,match_type.identifier)
                if(a.o&&a.v!=this.words[i].name){
                    this.index=a.i
                    this.ret.push(new token(a.v,token_type.identifier,this.lines()))
                    break
                }
                this.ret.push(new token(this.words[i].name,token_type.keyword,this.lines()))
                this.index+=this.words[i].name.length
                word_match=true
                break
            }
            //标识符
            if(!word_match){
                if(match(this.code,this.index,match_type.identifier).o){
                    let a=match(this.code,this.index,match_type.identifier)
                    this.index=a.i-1
                    this.ret.push(new token(a.v,token_type.identifier,this.lines()))
                }else{
                    this.ret.push(new token(this.code[this.index],token_type.unknow,this.lines()))
                    this.index++
                }
            }
        }
        return this.ret.filter((v)=>v.type!=token_type.space)
    }
    is(i:number){
        return i>=0&&i<this.code.length
    }
    match_comment():boolean{
        if(this.code[this.index]=='/'){
            if(this.code[this.index+1]=='/'){
                this.index+=2
                while(this.is(this.index)){
                    if(this.code[this.index]=='\n'){
                        this.index++
                        this.line++
                        break
                    }
                    this.index++
                }
                return true
            }else if(this.code[this.index+1]=='*'){
                this.index+=2
                while(this.is(this.index)){
                    if(this.code[this.index]=='*'&&this.is(this.index+1)&&this.code[this.index+1]=='/'){
                        this.index+=2
                        break
                    }
                    this.index++
                }
                return true
            }
        }
        return false
    }
    match_other():boolean{
        let a = match(this.code, this.index, match_type.string);
        if(match(this.code,this.index,match_type.string).o){
            this.ret.push(new token(a.v,token_type.string,this.lines()))
            this.index=a.i
            return true
        }else if(match(this.code,this.index,match_type.number).o){
            a=match(this.code,this.index,match_type.number)
            if(a.v.startsWith('-')){
                this.ret.pop()
            }
            this.ret.push(new token(a.v,token_type.number,this.lines()))
            this.index=a.i
            return true
        }
        return false
    }
    match(w:word):boolean{
        if(this.is(this.index+w.name.length-1)){
            for(let i=0;i<w.name.length;i++){
                if(this.code[this.index+i]!=w.name[i]) return false
            }
            return true
        }
        return false
    }
}
export default segment