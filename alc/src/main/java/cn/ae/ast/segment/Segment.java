package cn.ae.ast.segment;

import cn.ae.ast.types.Word;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        this.len=code.length();
        this.tokens=tokens;
        this.ret=new ArrayList<>();
    }
    public List<Word<String>> segment(){
        while(index<len){
            comment();
            str();
            number();
            if(code[index]==' '){
                index++;
                continue;
            }
            if(code[index]=='\n'){
                line++;
                index++;
                continue;
            }
            for(String token:tokens){
                word(token);
                if(ctn)break;
            }
            String a="";
            while(index<len&&code[index]!='\n'&&code[index]!=' '){
                a+=code[index];
                index++;
            }
            if(!a.equals(""))ret.add(Word.create(a,Word.token_type.OTHER,line));
        }
        return ret;
    }
    public void number(){
        String a="";
        //十进制匹配
        //k进制
        if(code[index]=='0'){
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
        if(code[index]=='"'){
            index++;
            a+="\"";
            while(code[index]!='\n'&&code[index]!='"' &&is(-1)&& code[index-1]!='\\'){
                a+=code[index];
                index++;
            }
            a+="\"";
            index++;
        }
        if(code[index]=='`'){
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
            while(code[index]!='\n'&&is(0)){
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
        for(int i=index;(i<w.length()&is(i));i++){
            a&=(code[i]==w.charAt(i));
        }
        a&=(index+w.length()-1<len);
        return a;
    }
    public boolean is(int offset){
        boolean r=true;
        for(int i=index;i<offset;i++){
            r=(i<len)&(i>=0);
        }
        return r;
    }
}
