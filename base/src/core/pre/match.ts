/**
 * 用于匹配string,identifier,number
 * 作者:白子煦
 * 最新修改:2026.4.4
 */
import {match_type} from './model'
//索引,进制,是否成功
//可以作为开头的
const identifier_start = new Set([
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '_'
])
//可以作为内容的
const identifier_content = new Set([
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '_','$'
])
//字符串起始
const str =new Set([
    '"', '\'', '`'])

function match_string(code:string[], start:number):{i:number,v:string,o:boolean}{
    let i=start
    let v=''
    let o=false
    let _s:string
    if(str.has(code[i])){
        _s=code[i]
        o=true
        while(i<code.length){
            if(code[i]=='\n') {
                i++
                continue
            }
            if(code[i]=='\\'){
                v+=code[i]
                i++
                if(i>=code.length)break
            }
            v+=code[i]
            if(code[i]==_s&&i!=start){
                break
            }
            i++
        }
        i++
    }
    return {i,v,o}
}
function match_identifier(code:string[], start:number):{i:number,v:string,o:boolean}{
    let i=start
    let v=''
    let o=false
    if(identifier_start.has(code[i])){
        o=true
        v+=code[i]
        i++
        while(i<code.length){
            if(code[i]=='\n')break
            if(code[i]==' ')
                break
            if(!identifier_content.has(code[i]))
                break
            v+=code[i]
            i++
        }
        i++
    }
    return {i,v,o}
}
function match_number(code:string[], start:number):{i:number,v:string,o:boolean}{
    let i=start
    let o=false
    let v=''
    if(code[i]=='0'){
        o=true
        v+='0'
        if(!code[i+1])
            v='0'
        else if(code[i+1]=='x'||code[i+1]=='X'){
            v+='x'
            i+=2
            let ls=i-1
            while(i<code.length){
                if(code[i]==' '){
                    break
                }
                if(!(code[i]>='0'&&code[i]<='9'||code[i]>='a'&&code[i]<='f'||code[i]>='A'&&code[i]<='F'))
                    break
                v+=code[i]
                i++
            }
            //负号检查
            if(ls-1>=0&&code[ls-1]=='-'){
                v='-'+v
            }
        }else if(code[i+1]=='b'||code[i+1]=='B'){
            v+='b'
            i+=2
            let ls=i-1
            while(i<code.length){
                if(code[i]==' '){
                    break
                }
                if(!(code[i]>='0'&&code[i]<='1'))
                    break
                v+=code[i]
                i++
            }
            if(ls-1>=0&&code[ls-1]=='-'){
                v='-'+v
            }
        }else if(code[i+1]=='o'||code[i+1]=='O'){
            v+='o'
            i+=2
            let ls=i-1
            while(i<code.length){
                if(code[i]==' '){
                    break
                }
                if(!(code[i]>='0'&&code[i]<='7'))
                    break
                v+=code[i]
                i++
            }
            if(ls-1>=0&&code[ls-1]=='-'){
                v='-'+v
            }
        }else{
            o=true
            i++
            v='0'
            let ls=i-1
            if(code[i]=='.'){
                v+='.'
                while(i<code.length){
                    if(code[i]==' ')
                        break
                    if(!(code[i]>='0'&&code[i]<='9'))
                        break
                    v+=code[i]
                    i++
                }
                i++
                if(code[i]>='0'&&code[i]<='9'){
                    while(i<code.length){
                        if(code[i]==' ')
                            break
                        if(!(code[i]>='0'&&code[i]<='9'))
                            break
                        v+=code[i]
                        i++
                    }
                }
                if(ls-1>=0&&code[ls-1]=='-'){
                    v='-'+v
                }
            }
        }
    }else if(code[i]>='1'&&code[i]<='9'){
        o=true
        let point=false
        let ls=i-1
        while(i<code.length){
            if(code[i]==' ')break
            if(!(code[i]>='0'&&code[i]<='9'||code[i]=='.')){
                if(v[v.length-1]=='.'){
                    v=v.substring(0,v.length-1)
                    i--
                }
                break
            }
            if(code[i]=='.'){
                if(point)break
                point=true
            }
            i++
        }
        if(ls-1>=0&&code[ls-1]=='-'){
            v='-'+v
        }
    }
    return {i,v,o}
}
export function match(code:string[], i:number, type:match_type):{i:number,v:string,o:boolean}{
    switch ( type){
        case match_type.string:
            return match_string(code, i)
        case match_type.identifier:
            return match_identifier(code, i)
        case match_type.number:
            return match_number(code, i)
    }
}