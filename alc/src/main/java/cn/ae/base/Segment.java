package cn.ae.base;

import cn.ae.type.CodeToken;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Stack;

public class Segment {
    static int line=1;
    static int i=0;
    static char[] chars;
    static List<KV<String,String>> ret;
    static Stack<CodeToken.segment_type> type=new Stack<>();
    static String sugar="@@@";
    public static List<KV<String,String>> segment(String code){
        code=code.replace("\r\n","\n");
        chars=code.toCharArray();
        ret=new ArrayList<>();
        while(i!=chars.length){
            one();
        }
        return ret;
    }
    public static void one(){
        switch (chars[i]){
            case '\n'->{
                line++;
                i++;
            }
            case ' '-> i++;
            case '/'->{
                if(is(1)&&chars[i+1]=='/'){
                    i+=2;
                    comment_line();
                }else if(is(1)&&chars[i+1]=='*'){
                    i+=2;
                    comment_block();
                }else if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.div_for));
                }else{
                    ret.add(new KV<>(CodeToken.Token.Math.div));
                }
            }
            case '"'-> str("\"");
            case '`'-> str("`");
            case '*'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.mul_for));
                }else {
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.mul));
                }
            }
            case '+'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.add_for));
                }else if(is(1)&&chars[i+1]=='+'){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.inc));
                }else {
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.add));
                }
            }
            case '-'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.sub_for));
                }else if(is(1)&&chars[i+1]=='-'){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.dec));
                }else {
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.sub));
                }
            }
            case '%'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.mod_for));
                }else {
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.mod));
                }
            }
            case '&'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.and_for));
                }else {
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.and));
                }
            }
            case '|'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.or_for));
                }else {
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.or));
                }
            }
            case '^'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Math.xor_for));
                }else {
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.xor));
                }
            }
            case '!'->{
                i++;
                ret.add(new KV<>(CodeToken.Token.Math.not));
            }
        }
    }
    public static void comment_line(){
        while(i!=chars.length){
            if(chars[i]=='\n'){
                i++;
                line++;
                break;
            }
        }
    }
    public static void str(String a){
        String data="";
        if(a.equals("\"")){
            while(i!=chars.length){
                if(chars[i]=='"' && chars[i-1]!='\\'){
                    i++;
                    ret.add(new KV<>(CodeToken.Token.string.start,data));
                    ret.add(new KV<>(CodeToken.Token.string.end));
                    break;
                }
                data+=chars[i];
            }
        }
        if(a.equals("`")){
            while(i!=chars.length){
                if(chars[i]=='`'){
                    i++;
                    ret.add(new KV<>(CodeToken.Token.string.start,data));
                    ret.add(new KV<>(CodeToken.Token.string.end,sugar));
                    break;
                }
                data+=chars[i];
            }
        }
    }
    public static void comment_block(){
        while(i!=chars.length){
            if(chars[i]=='*'&&is(1)&&chars[i+1]=='/'){
                i+=2;
                break;
            }
        }
    }
    public static boolean is(int offset){
        return !(i+offset==chars.length);
    }
}
