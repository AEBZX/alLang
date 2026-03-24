package cn.ae.base
import java.util.ArrayList;
import java.util.List;
public class TokenSegment{
    public static class Type{
        public static final int string=0;
        public static final int num=1;
        public static final int token=2;
        public static final int name=3;
    }
    public char[] code;
    public List<String> token;
    public List<Map<Integer,String>> ret;
    public int index=0;
    public int line=1;
    public TokenSegment(List<String> words){
        this.token=words;
    }
    public List<Map<Integer,String>> segment(String str){
        code=str.replace("\r\n","\n").split("");
        while(index<=code.length){
            if(co)
        }
    }
    public void str(){
    }
}