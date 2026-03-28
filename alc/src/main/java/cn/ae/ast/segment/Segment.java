package cn.ae.ast.segment;

import cn.ae.ast.types.Word;

import java.util.*;

public class Segment {
    public int index=0;
    public int line=1;
    public char[] code;
    public int len;
    public List<Word<String>> ret;
    private boolean ctn=false;
    public List<String> tokens;
    public Segment(String code, List<String> tokens){
        this.code=code.replace(System.lineSeparator(),"\n").toCharArray();
        this.len=this.code.length;
        this.tokens=tokens;
        this.ret=new ArrayList<>();
    }
    public List<Word<String>> segment(){
        boolean ls=false;
        String a="";
        while(index<len){
            ctn=false;
            comment();
            str();
            number();
            if(index<len){
                if(code[index]==' '){
                    index++;
                    ls=true;
                    continue;
                }
                if(code[index]=='\n'){
                    line++;
                    index++;
                    ls=true;
                    continue;
                }
                for(String token:tokens){
                    word(token);
                    ls=true;
                    if(ctn)break;
                }
                if(!ls){
                    while(index<len && code[index]!=' '){
                        if(code[index]=='\n'){
                            line++;
                            index++;
                            break;
                        }
                        a+=code[index];
                        index++;
                    }
                    ret.add(Word.create(a,Word.token_type.OTHER,line));
                }
            }
        }
        return ret;
    }
    public boolean no_while(){
        for(String token:tokens)
            if(is_word(token))return true;
        return false;
    }
    public void number(){
        String a="";
        if(is(0)&&code[index]=='0'){
            index++;
            if(is(0)) {
                switch (code[index]) {
                    case 'b', 'B' -> {
                        a+="0b";
                        while ((code[index] >= '0' && code[index] <= '1')||code[index]=='.'||code[index]=='_') {
                            a += code[index];
                            index++;
                        }
                    }
                    case 'x', 'X' -> {
                        a+="0x";
                        while ((code[index] >= '0' && code[index] <= '9') ||
                                (code[index] >= 'a' && code[index] <= 'f') || (code[index] >= 'A' && code[index] <= 'F')
                                || code[index]=='.'||code[index]=='_') {
                            a += code[index];
                            index++;
                        }
                    }
                    case 'o', 'O' -> {
                        a+="0o";
                        while ((code[index] >= '0' && code[index] <= '7')||code[index]=='.'||code[index]=='_') {
                            a += code[index];
                            index++;
                        }
                    }
                }
            }
        }else if(is(0)&&code[index]>='0'&&code[index]<='9'){
            while(is(0)&code[index]>='0'&&code[index]<='9'){
                a+=code[index];
                index++;
            }
        }
        if(!a.equals(""))ret.add(Word.create(a,Word.token_type.NUMBER,line));
    }
    //是否是字符串
    public void str(){
        String a="";
        if(is(0)&&code[index]=='"'){
            index++;
            a+="\"";
            while(code[index]!='\n'&&code[index]!='"' &&is(-1)&& code[index-1]!='\\'){
                a+=code[index];
                index++;
            }
            a+="\"";
            index++;
        }
        if(is(0)&&code[index]=='`'){
            index++;
            a+="`";
            while(code[index]!='\n'&&code[index]!='`'&&is(-1)&& code[index-1]!='\\'){
                a+=code[index];
                index++;
            }
            a+="`";
            index++;
        }
        if(!a.equals(""))ret.add(Word.create(a,Word.token_type.STRING,line));
    }
    //是否是注释
    public void comment(){
        if(is_word("//")){
            while(is(0)&&code[index]!='\n'){
                index++;
            }
        }
        if(is_word("/*")){
            while(!is_word("*/")&&is(0)){
                index++;
            }
        }
    }
    public void word(String w){
        if(is_word(w)){
            ret.add(Word.create(w, Word.token_type.KEYWORD,line));
            index+=w.length();
            ctn=true;
        }
    }
    public boolean is_word(String w){
        boolean a=true;
        for(int i=index,j=0;j<w.length();i++,j++){
            if(is(j))a&=(code[i]==w.charAt(j));
            else return false;
        }
        if(index+w.length()-1>=len)return false;
        return a;
    }
    public boolean is(int offset){
        return index+offset<len&&index+offset>=0;
    }
}