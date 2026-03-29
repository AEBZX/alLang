package cn.ae.ast.build.parser;

import cn.ae.ast.Node;
import cn.ae.ast.build.Segment;
import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.model.init.block.ClassNode;
import cn.ae.ast.model.init.block.EnumNode;
import cn.ae.ast.model.init.block.FuncNode;
import cn.ae.ast.model.init.block.InterfaceNode;
import cn.ae.ast.model.magic.DecoratorNode;
import cn.ae.ast.types.Type;
import cn.ae.ast.types.Word;
import cn.ae.base.Log;

import java.util.*;

import static cn.ae.ast.build.parser.Lists.*;

public class Parser {
    public Segment segment;
    public Node ast;
    public List<Word<String>> words;
    public Parser(){
        ast=null;
    }
    private int index=-1;
    private int len;
    private Stack<ClassNode> class_stack=new Stack<>();
    private static final int ENUM=0,INTERFACE=1,CLASS=2;
    private int _use;
    private FuncNode _now_func=null;
    private boolean use_func=false;
    private boolean use_class=false;
    public String _package;
    public boolean have(int index){
        return index<len&&index>=0;
    }
    //必须有space空行
    public Word<String> peek(){
        if(have(index+1)){
            if(words.get(index+1).value.equals(" "))
                return have(index+2)?words.get(index+2):null;
        }
        return null;
    }
    public Word<String> next(){
        if(have(index)){
            return words.get(index++);
        }
        return null;
    }
    List<Word<String>> decorator_words;
    List<Decorator> decorators;
    public Node parser(String code){
        segment=new Segment(precompiler);
        //词法分析器
        words=segment.segment(code);
        decorator_words=new ArrayList<>();
        decorators=new ArrayList<>();
        //小写
        for(int i=0;i<words.size();i++){
            if(words.get(i).type==Word.token_type.KEYWORD)
                words.set(i,Word.create(words.get(i).value.toLowerCase(Locale.ROOT),Word.token_type.KEYWORD,words.get(i).line));
        }
        len=words.size();
        while(index<len){
            //处理装饰器
            Match_DecoratorFunc();
            //处理"集合"结构
            Word<String> token=peek();
            if(isDecoratorWord(token)){
                decorator_words=Match_DecoratorWord();
                //检查会不会有奇葩标识符
                test_decorator_word();
                //希望是func,各种class或者var
                Word<String> type=match(block,"修饰符后面跟了不是class/func/var的关键词或其他:${token} at "+peek().line);
                //拿到名字
                String name=match_identifier("这个块是个无名氏 at "+peek().line).value;
                //处理是类/函数/变量
                switch (type.value){
                    case "class"->_class(name,CLASS);
                    case "interface"->_class(name,INTERFACE);
                    case "enum"->_class(name,ENUM);
                    case "func"->{}
                    case "var"->{}
                }
                decorator_words=new ArrayList<>();
            }
        }
        return ast;
    }
    /**
     * @apiNote 处理一堆语法
     */
    //各种类
    public void _class(String name,int type){
        if(use_func)Out.Error("不可以在函数里套类 at "+peek().line);
        //有父类
        if(use_class){
            //如果可以套娃
            if(class_stack.peek().getClass()!= EnumNode.class){
                name=class_stack.peek().name+"."+name;
            }else{
                //不能就报错
                Out.Error("枚举类不能有父类 at "+peek().line);
            }
        }
        switch (type){
            case CLASS->{
                class_stack.push(ClassNode.create(new ArrayList<>(), new ArrayList<>(),decorators, name));
                boolean is_extends=false;
                //检查是否有继承
                if(peek().value.equals(Tokens.EXTENDS)) {
                    next();
                    ClassNode ls=class_stack.pop();
                    if(!peek().type.equals(Word.token_type.OTHER))
                        Out.Error("继承的写法有点问题 at "+peek().line);
                    ls.__extends=next().value;
                    is_extends=true;
                }
                //继承和实现互斥
                if(peek().value.equals(Tokens.IMPLEMENTS)) {
                    if(is_extends)Out.Error("继承和实现不可共存 at "+peek().line);
                    next();
                    ClassNode ls=class_stack.pop();
                    if(!peek().type.equals(Word.token_type.OTHER))Out.Error("实现的写法有点问题 at "+peek().line);
                    ls.__implements=next().value;
                }
            }
            //不可以继承
            case INTERFACE->{
                class_stack.push(InterfaceNode.create(new ArrayList<>(), new ArrayList<>(),decorators, name));
                if(peek().value.equals(Tokens.EXTENDS))Out.Error("接口不能有继承 at "+peek().line);
                if(peek().value.equals(Tokens.IMPLEMENTS))Out.Error("接口不能有实现 at "+peek().line);
            }
            case ENUM->{
                class_stack.push(EnumNode.create(new ArrayList<>(),decorators, name));
                if(peek().value.equals(Tokens.EXTENDS))Out.Error("枚举不能有继承 at "+peek().line);
                if(peek().value.equals(Tokens.IMPLEMENTS))Out.Error("枚举不能有实现 at "+peek().line);
            }
        }
        use_class=true;
        decorators=new ArrayList<>();
    }
    //变量
    public void _var(String name){
        if(!use_class||use_func)Out.Error("带修饰符的变量必须定义在类中 at "+peek().line);
    }
    //函数,暂不实现
    public void _func(String name){
        use_func=true;
    }
    /**
     * @apiNote 检查一堆东西是否合法,不合法就报错
     */
    public void test_decorator_word(){
        //public与private互斥
        boolean have_public=false;
        boolean have_private=false;
        for(Word<String> decorator:decorator_words){
            if(decorator.value.equals("public"))
                have_public=true;
            if(decorator.value.equals("private"))
                have_private=true;
        }
        if(have_public|have_private){
            if(have_private&&have_public)Out.Error("修饰符public与private不可共存 at "+decorator_words.get(0).line);
        }
        //async和sync互斥
        boolean have_async=false;
        boolean have_sync=false;
        for(Word<String> decorator:decorator_words){
            if(decorator.value.equals("async"))
                have_async=true;
            if(decorator.value.equals("sync"))
                have_sync=true;
        }
        if(have_async|have_sync){
            if(have_async&&have_sync)Out.Error("修饰符async与sync不可共存 at "+decorator_words.get(0).line);
        }
    }
    /**
     * @apiNote 匹配各种东西,如修饰符,装饰器
     * @return 返回匹配到的集合
     */
    public List<Word<String>> Match_DecoratorWord(){
        List<Word<String>> ret=new ArrayList<>();
        while(isDecoratorWord(peek())){
            ret.add(next());
        }
        return ret;
    }
    public boolean isDecoratorWord(Word<String> token){
        for(String decorator:decorator_word_list){
            if(token.value.equals(decorator))
                return true;
        }
        return false;
    }
    public void Match_DecoratorFunc(){
        while(true){
            if(!DecoratorFunc())break;
        }
    }
    //如果是装饰器顺手操作一下
    public boolean DecoratorFunc(){
        if(peek().value.equals(Tokens.DECORATOR)){
            //检查接下来是否合法
            //格式:@名字(参数,参数,参数)
            next();
            if(!peek().type.equals(Word.token_type.OTHER))
                Out.Error("装饰器是个无名氏 at " + peek().line);
            decorators.add(Decorator.create(next().value,match_get()));
        }
        return false;
    }
    /**
     * @apiNote match plus pro max ++版,检查格式是否合法
     */
    //返回参数列表(声明)
    public List<Set<String,Type>> match_set(){
        if(peek().value.equals("(")){
            next();
            List<Set<String,Type>> ret=new ArrayList<>();
            //格式:类型 a,类型 b,(如果是class):class a:类名
            if(peek().value.equals(")")){
                next();
                return ret;
            }
            boolean split=false;
            boolean type=false;
            Set<String,Type> ls=new Set<>(null,null);
            while(true){
                if(peek().value.equals(")")){
                    if(!split&&!type)return ret;
                    else Out.Error("参数列表的格式有误 at "+peek().line);
                }else if(peek().value.equals(",")){
                    if(split||type)Out.Error("参数列表的格式有误 at "+peek().line);
                    split=true;
                    next();
                }else if(peek().type.equals(Word.token_type.KEYWORD)){
                    if(!type||split){
                        type=true;
                        ls.value=typeOf(next());
                        //class param:类名
                        if(peek().value.equals("class")){
                            next();
                            if(!peek().type.equals(Word.token_type.OTHER))Out.Error("你这参数是啥子玩意 at "+peek().line);
                            String name=next().value;
                            if(!peek().value.equals(":"))Out.Error("你这类对象好像忘声明了 at "+peek().line);
                            next();
                            if(!peek().type.equals(Word.token_type.OTHER))Out.Error("你类名被吃掉了 at "+peek().line);
                            String _class=next().value;
                            ls.key=name+":"+_class;
                            ls.value=Type.CLASS;
                            ret.add(ls);
                            ls=new Set<>(null,null);
                            split=false;
                            type=false;
                        }else{
                            ls.value=typeOf(next());
                            ret.add(ls);
                            ls=new Set<>(null,null);
                        }
                    }
                }
            }
        }
        Out.Error("参数列表的格式有问题 at "+peek().line);
        return null;
    }
    public Type typeOf(Word<String> type){
        switch (type.value){
            case "int"->{
                return Type.INT;
            }
            case "char"->{
                return Type.CHAR;
            }
            case "byte"->{
                return Type.BYTE;
            }
            case "void"->{
                return Type.VOID;
            }
            case "bool"->{
                return Type.BOOL;
            }
            case "long"->{
                return Type.LONG;
            }
            case "short"->{
                return Type.SHORT;
            }
            case "float"->{
                return Type.FLOAT;
            }
            case "double"->{
                return Type.DOUBLE;
            }
            case "class"->{
                return Type.CLASS;
            }
            default -> {
                Out.Error("你这是哪门子类型:${token} at line"+type.line);
            }
        }
        return null;
    }
    //返回参数列表(调用)
    public List<Word<String>> match_get(){
        if(peek().value.equals("(")){
            next();
            List<Word<String>> ret=new ArrayList<>();
            //格式:GetNode,GetNode,...
            //允许:Others(变量),String(字符串),Number(数字)
            if(peek().value.equals(")")){
                next();
                return ret;
            }
            boolean split=false;
            while(true){
                if(peek().value.equals(")")){
                    if(!split)return ret;
                    else Out.Error("参数列表的格式有误 at "+peek().line);
                }else if(peek().value.equals(",")){
                    if(split)Out.Error("参数列表的格式有误 at "+peek().line);
                    split=true;
                    next();
                }else if(is_get(peek())){
                    if(!split)Out.Error("参数列表的格式有误 at "+peek().line);
                    ret.add(next());
                    split=false;
                }
            }
        }
        Out.Error("您这玩意的参数列表捏 at line:"+peek().line);
        return null;
    }
    public boolean is_get(Word<String> a){
        return a.type.equals(Word.token_type.OTHER)||a.type.equals(Word.token_type.STRING)||a.type.equals(Word.token_type.NUMBER);
    }
    /**
     * @apiNote 这是一坨match,匹配标识符,数字,字符串,关键字(或串)<br/>
     * 用途:如果匹配成功就吃掉/返回,不成功就报错
     * @param error_msg 错误信息,${token}表示下一个token
     * @return 可能会返回匹配到的token
     */
    public Word<String> match_identifier(String error_msg){
        if(peek()!=null){
            if(!(peek().type==Word.token_type.OTHER))
                Out.Error(error_msg.replace("${token}", peek().value));
            else return next();
        }else Out.Error(error_msg.replace("${token}", "EOF"));
        return null;
    }
    public Word<String> match_number(String error_msg){
        if(peek()!=null){
            if(!(peek().type==Word.token_type.NUMBER))
                Out.Error(error_msg.replace("${token}", peek().value));
            else return next();
        }else Out.Error(error_msg.replace("${token}", "EOF"));
        return null;
    }
    public Word<String> match_string(String error_msg){
        if(peek()!=null){
            if(!(peek().type==Word.token_type.STRING))
                Out.Error(error_msg.replace("${token}", peek().value));
            else return next();
        }else Out.Error(error_msg.replace("${token}", "EOF"));
        return null;
    }
    public void match(String token,String error_msg){
        if(peek()!=null){
            //如果存在就吃掉,不存在报错
            if(!(peek().value.equals(token)&&peek().type==Word.token_type.KEYWORD))
                Out.Error(error_msg.replace("${token}", peek().value));
            else next();
        }else Out.Error(error_msg.replace("${token}", "EOF"));
    }
    public Word<String> match(List<String> token,String error_msg){
        if(peek()!=null){
            for(String t:token){
                //存在就吃掉并返回
                if(peek().value.equals(t)&&peek().type==Word.token_type.KEYWORD)
                    return next();
            }
            //不存在就报错
            Out.Error(error_msg.replace("${token}", peek().value));
        }else Out.Error(error_msg.replace("${token}", "EOF"));
        return null;
    }
    public static void main(String[] args) {
        Segment segment=new Segment(precompiler);
        for(Word<String> token:segment.segment("""
                public int a=0;12345abc
                """)){
            System.out.println(token.value+","+token.type);
        }
    }
}
