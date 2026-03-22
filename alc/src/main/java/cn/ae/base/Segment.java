package cn.ae.base;

import cn.ae.type.CodeToken;

import java.util.ArrayList;
import java.util.List;

public class Segment {
    static int line=1;
    static int i=0;
    static char[] chars;
    static List<KV<String,String>> ret;
    static String sugar="@@@";
    static String unknown="###";
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
            case '"'-> str("\"");
            case '`'-> str("`");
            case '\''->{
                if(is(1)){
                    ret.add(new KV<>(CodeToken.Token._char.start,""+chars[i+1]));
                }else ret.add(new KV<>(CodeToken.Token._char.start));
                if(is(2)&&chars[i+2]=='\'')ret.add(new KV<>(CodeToken.Token._char.end));
            }
            case '.'->{
                ret.add(new KV<>(CodeToken.Token.operation.get));
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
            case ';'->{
                i++;
                ret.add(new KV<>(CodeToken.Token.operation.split));
            }
            case ','->{
                i++;
                ret.add(new KV<>(CodeToken.Token.Array.split));
            }
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
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Compare.not_equal));
                }else{
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Math.not));
                }
            }
            case '<'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Compare.less_equal));
                }else if(is(1)&&chars[i+1]=='<'){
                    if(is(2)&&chars[i+2]=='='){
                        i+=3;
                        ret.add(new KV<>(CodeToken.Token.Math.shift_left_for));
                    }else{
                        i+=2;
                        ret.add(new KV<>(CodeToken.Token.Math.shift_left));
                    }
                }else{
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Compare.less));
                }
            }
            case '>'->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Compare.greater_equal));
                }else if(is(1)&&chars[i+1]=='>'){
                    if(is(2)&&chars[i+2]=='='){
                        i+=3;
                        ret.add(new KV<>(CodeToken.Token.Math.shift_right_for));
                    }else{
                        i+=2;
                        ret.add(new KV<>(CodeToken.Token.Math.shift_right));
                    }
                }else{
                    i++;
                    ret.add(new KV<>(CodeToken.Token.Compare.greater));
                }
            }
            case '='->{
                if(is(1)&&chars[i+1]=='='){
                    i+=2;
                    ret.add(new KV<>(CodeToken.Token.Compare.equal));
                }else{
                    i++;
                    ret.add(new KV<>(CodeToken.Token.operation.set));
                }
            }
            case '('->{
                i++;
                ret.add(new KV<>(CodeToken.Token.operation.call_start));
            }
            case ')'->{
                i++;
                ret.add(new KV<>(CodeToken.Token.operation.call_end));
            }
            case '{'->{
                i++;
                ret.add(new KV<>(CodeToken.Token.block.block_start));
            }
            case '}'->{
                i++;
                ret.add(new KV<>(CodeToken.Token.block.block_end));
            }
            case '@'->{
                i++;
                ret.add(new KV<>(CodeToken.Token.Decorator.use_start));
            }
            //await或async
            case 'a'-> start_a();
            //bool或break
            case 'b'-> start_b();
            //char,class,case,continue
            case 'c'-> start_c();
            //double,do,default,delete
            case 'd'->start_d();
            //else,else if
            case 'e'->start_e();
            //float,for,false
            case 'f'->start_f();
            //import,int,if
            case 'i'-> start_i();
            //long
            case 'l'-> start_l();
            //package,public,private
            case 'p'-> start_p();
            //return
            case 'r'-> start_r();
            //switch,string,short,static
            case 's'-> start_s();
            //void
            case 'v'-> start_v();
            //true
            case 't'-> start_t();
            //while
            case 'w'-> start_w();
            default -> unknown();
        }
    }
    public static void unknown(){
        String a="";
        while(i!= chars.length && chars[i]!=' '){
            if(chars[i]!='\n'){
                a+=chars[i];
                i++;
            }else{
                line++;
                break;
            }
        }
        ret.add(new KV<>(unknown,a));
    }
    public static boolean is_word(String word){
        boolean a=true;
        for(int i=0;i<word.length();i++){
            a&=is(i);
        }
        if(a){
            for(int i=0;i<word.length();i++){
                a&=chars[Segment.i+i]==word.charAt(i);
            }
        }
        return a;
    }
    public static void start_w(){
        if(is_word("while")){
            ret.add(new KV<>(CodeToken.Token.block._while));
            i+=CodeToken.Num.block._while;
        }else unknown();
    }
    public static void start_t(){
        if(is_word("true")){
            ret.add(new KV<>(CodeToken.Token.Type._true));
            i+=4;
        }else unknown();
    }
    public static void start_v(){
        if(is_word("void")){
            ret.add(new KV<>(CodeToken.Token.Type._void));
            i+=CodeToken.Num.Type._void;
        }else unknown();
    }
    public static void start_s(){
        if(is_word("switch")){
            ret.add(new KV<>(CodeToken.Token.block._switch));
            i+=CodeToken.Num.block._switch;
        }else if(is_word("string")){
            ret.add(new KV<>(CodeToken.Token.Type._string));
            i+=CodeToken.Num.Type._string;
        }else if(is_word("short")){
            ret.add(new KV<>(CodeToken.Token.Type._short));
            i+=CodeToken.Num.Type._short;
        }else if(is_word("static")){
            ret.add(new KV<>(CodeToken.Token.modifier._static));
            i+=CodeToken.Num.modifier._static;
        }else unknown();
    }
    public static void start_r(){
        if(is_word("return")){
            ret.add(new KV<>(CodeToken.Token.command._return));
            i+=CodeToken.Num.command._return;
        }else unknown();
    }
    public static void start_p(){
        if(is_word("package")){
            ret.add(new KV<>(CodeToken.Token.magic._package));
            i+=CodeToken.Num.magic._package;
        }else if(is_word("public")){
            ret.add(new KV<>(CodeToken.Token.modifier._public));
            i+=CodeToken.Num.modifier._public;
        }else if(is_word("private")){
            ret.add(new KV<>(CodeToken.Token.modifier._private));
            i+=CodeToken.Num.modifier._private;
        }else unknown();
    }
    public static void start_l(){
        if(is_word("long")){
            ret.add(new KV<>(CodeToken.Token.Type._long));
            i+=CodeToken.Num.Type._long;
        }else unknown();
    }
    public static void start_i(){
        if(is_word("import")){
            ret.add(new KV<>(CodeToken.Token.magic._import));
            i+=CodeToken.Num.magic._import;
        }else if(is_word("int")){
            ret.add(new KV<>(CodeToken.Token.Type._int));
            i+=CodeToken.Num.Type._int;
        }else if(is_word("if")){
            ret.add(new KV<>(CodeToken.Token.block._if));
            i+=CodeToken.Num.block._if;
        }else unknown();
    }
    public static void start_f(){
        if(is_word("float")){
            ret.add(new KV<>(CodeToken.Token.Type._float));
            i+=CodeToken.Num.Type._float;
        }else if(is_word("for")){
            ret.add(new KV<>(CodeToken.Token.block._for));
            i+=CodeToken.Num.block._for;
        }else if(is_word("false")){
            ret.add(new KV<>(CodeToken.Token.Type._false));
            i+=5;
        }else unknown();
    }
    public static void start_e(){
        if(is_word("else if")){
            ret.add(new KV<>(CodeToken.Token.block.else_if));
            i+=CodeToken.Num.block.else_if;
        }else if(is_word("else")){
            ret.add(new KV<>(CodeToken.Token.block._else));
            i+=CodeToken.Num.block._else;
        }else unknown();
    }
    public static void start_d(){
        if(is_word("double")){
            ret.add(new KV<>(CodeToken.Token.Type._double));
            i+=CodeToken.Num.Type._double;
        }else if(is_word("do")){
            ret.add(new KV<>(CodeToken.Token.block._do));
            i+=CodeToken.Num.block._do;
        }else if(is_word("default")){
            ret.add(new KV<>(CodeToken.Token.block._default));
            i+=CodeToken.Num.block._default;
        }else if(is_word("delete")){
            ret.add(new KV<>(CodeToken.Token.command._delete));
            i+=CodeToken.Num.command._delete;
        }else unknown();
    }
    public static void start_c(){
        if(is_word("char")){
            ret.add(new KV<>(CodeToken.Token.Type._char));
            i+=CodeToken.Num.Type._char;
        }else if(is_word("class")){
            ret.add(new KV<>(CodeToken.Token.Type._class));
            i+=CodeToken.Num.Type._class;
        }else if(is_word("case")){
            ret.add(new KV<>(CodeToken.Token.block._case));
            i+=CodeToken.Num.block._case;
        }else if(is_word("continue")){
            ret.add(new KV<>(CodeToken.Token.command._continue));
            i+=CodeToken.Num.command._continue;
        }else unknown();
    }
    public static void start_b(){
        if(is_word("break")){
            ret.add(new KV<>(CodeToken.Token.command._break));
            i+=CodeToken.Num.command._break;
        }else if(is_word("bool")){
            ret.add(new KV<>(CodeToken.Token.Type._bool));
            i+=CodeToken.Num.Type._bool;
        }else unknown();
    }
    public static void start_a(){
        if(is_word("async")){
            ret.add(new KV<>(CodeToken.Token.modifier._async));
            i+=CodeToken.Num.modifier._async;
        }else if(is_word("await")){
            ret.add(new KV<>(CodeToken.Token.operation.await));
            i+=CodeToken.Num.operation.await;
        }else unknown();
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
            i++;
            while(i!=chars.length){
                if(chars[i]=='"' &&is(-1)&& chars[i-1]!='\\'){
                    i++;
                    ret.add(new KV<>(CodeToken.Token.string.start,data));
                    ret.add(new KV<>(CodeToken.Token.string.end));
                    break;
                }
                data+=chars[i];
                i++;
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
        return !(i+offset==chars.length)&&i+offset>=0;
    }
}
