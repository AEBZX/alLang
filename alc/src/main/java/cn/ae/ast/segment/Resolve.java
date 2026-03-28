package cn.ae.ast.segment;

import cn.ae.ast.Node;
import cn.ae.ast.model.init.block.FuncNode;
import cn.ae.ast.types.Word;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Resolve {
    public static class Tokens{
        public static final String SET="=";
        public static final String COLON=":";
        public static final String LEFT_PAREN="(";
        public static final String RIGHT_PAREN=")";
        public static final String LEFT_BRACKET="[";
        public static final String RIGHT_BRACKET="]";
        public static final String LEFT_CURLY="{";
        public static final String RIGHT_CURLY="}";
        public static final String POINT=".";
        public static final String POINTER="*";
        public static final String AND="&";
        public static final String OR="|";
        public static final String XOR="^";
        public static final String NO="~";
        public static final String LOGIC_EQUAL="==";
        public static final String LOGIC_NOT_EQUAL="!=";
        public static final String LOGIC_AND="&&";
        public static final String LOGIC_OR="||";
        public static final String LOGIC_NOT="!";
        public static final String ADD="+";
        public static final String SUB="-";
        public static final String MUL="*";
        public static final String DIV="/";
        public static final String MOD="%";
        public static final String DECORATOR="@";
        public static final String ADD_EQUAL="+=";
        public static final String SUB_EQUAL="-=";
        public static final String MUL_EQUAL="*=";
        public static final String DIV_EQUAL="/=";
        public static final String MOD_EQUAL="%=";
        public static final String AND_EQUAL="&=";
        public static final String OR_EQUAL="|=";
        public static final String XOR_EQUAL="^=";
        public static final String NO_EQUAL="~=";
        public static final String SPLIT=",";
        public static final String END=";";
        //关键字
        public static final String PUBLIC="public";
        public static final String PRIVATE="private";
        public static final String PROTECTED="protected";
        public static final String STATIC="static";
        public static final String FINAL="final";
        public static final String VAR="var";
        public static final String FUNC="func";
        public static final String CLASS="class";
        public static final String INT="int";
        public static final String STRING="string";
        public static final String FLOAT="float";
        public static final String BOOL="bool";
        public static final String CHAR="char";
        public static final String VOID="void";
        public static final String BYTE="byte";
        public static final String IF="if";
        public static final String DO="do";
        public static final String ELSE_IF="else if";
        public static final String ELSE="else";
        public static final String WHILE="while";
        public static final String FOR="for";
        public static final String RETURN="return";
        public static final String BREAK="break";
        public static final String CONTINUE="continue";
        public static final String NEW="new";
        public static final String DELETE="delete";
        public static final String NULL="null";
        public static final String TRUE="true";
        public static final String FALSE="false";
        public static final String THIS="this";
        public static final String SUPER="super";
        public static final String ENUM="enum";
        public static final String INTERFACE="interface";
        public static final String SWITCH="switch";
        public static final String CASE="case";
        public static final String DEFAULT="default";
        public static final String TRY="try";
        public static final String CATCH="catch";
        public static final String THROW="throw";
        public static final String FINALLY="finally";
        public static final String IMPORT="import";
        public static final String PACKAGE="package";
        public static final String EXTENDS="extends";
        public static final String IMPLEMENTS="implements";
    }
    public Segment segment;
    public Node ast;
    public List<Word<String>> words;
    private static final List<String> precompiler=List.of(
            Tokens.ADD_EQUAL,
            Tokens.SUB_EQUAL,
            Tokens.MUL_EQUAL,
            Tokens.DIV_EQUAL,
            Tokens.MOD_EQUAL,
            Tokens.AND_EQUAL,
            Tokens.OR_EQUAL,
            Tokens.XOR_EQUAL,
            Tokens.NO_EQUAL,
            Tokens.LOGIC_EQUAL,
            Tokens.LOGIC_NOT_EQUAL,
            Tokens.LOGIC_AND,
            Tokens.LOGIC_OR,
            Tokens.LOGIC_NOT,
            Tokens.ADD,
            Tokens.SUB,
            Tokens.MUL,
            Tokens.DIV,
            Tokens.MOD,
            Tokens.AND,
            Tokens.OR,
            Tokens.XOR,
            Tokens.NO,
            Tokens.POINT,
            Tokens.POINTER,
            Tokens.LEFT_PAREN,
            Tokens.RIGHT_PAREN,
            Tokens.LEFT_BRACKET,
            Tokens.RIGHT_BRACKET,
            Tokens.LEFT_CURLY,
            Tokens.RIGHT_CURLY,
            Tokens.COLON,
            Tokens.SET,
            Tokens.SPLIT,
            Tokens.END,
            Tokens.DECORATOR,
            Tokens.VAR,
            Tokens.FUNC,
            Tokens.CLASS,
            Tokens.INT,
            Tokens.STRING,
            Tokens.FLOAT,
            Tokens.BOOL,
            Tokens.CHAR,
            Tokens.VOID,
            Tokens.BYTE,
            Tokens.ELSE_IF,
            Tokens.DO,
            Tokens.IF,
            Tokens.ELSE,
            Tokens.WHILE,
            Tokens.FOR,
            Tokens.RETURN,
            Tokens.BREAK,
            Tokens.CONTINUE,
            Tokens.NEW,
            Tokens.DELETE,
            Tokens.NULL,
            Tokens.TRUE,
            Tokens.FALSE,
            Tokens.THIS,
            Tokens.SUPER,
            Tokens.ENUM,
            Tokens.INTERFACE,
            Tokens.SWITCH,
            Tokens.CASE,
            Tokens.DEFAULT,
            Tokens.TRY,
            Tokens.CATCH,
            Tokens.THROW,
            Tokens.FINALLY,
            Tokens.IMPORT,
            Tokens.PACKAGE,
            Tokens.EXTENDS,
            Tokens.IMPLEMENTS,
            Tokens.STATIC,
            Tokens.FINAL,
            Tokens.PUBLIC,
            Tokens.PRIVATE,
            Tokens.PROTECTED
    );
    public Resolve(){
        ast=Node.create();
    }
    private boolean is(int i){
        return i<len&&i>=0;
    }
    public String get(int index){
        return words.get(this.index+index).value;
    }
    private int index=0;
    private int len;
    //临时节点
    private Node ls;
    //修饰符列表
    private List<Word<String>> decorator_word;
    //注解列表
    private List<Word<String>> decorator_func;
    private List<String> decorator_word_list=List.of(Tokens.PUBLIC,Tokens.PRIVATE,Tokens.PROTECTED,Tokens.STATIC,Tokens.FINAL);
    public boolean is_decorator_word(){
        boolean a=false;
        for(String i:decorator_word_list){
            if(i.equals(get(index))){
                a=true;
                break;
            }
        }
        return a;
    }
    public void match_decorator_word(){
        while(is_decorator_word()){
            decorator_word.add(Word.create(get(index), Word.token_type.KEYWORD, words.get(index).line));
            index++;
        }
    }
    public Node parser(String code){
        segment=new Segment(code,precompiler);
        //词法分析器
        words=segment.segment();
        len=words.size();
        decorator_word=new ArrayList<>();
        decorator_func=new ArrayList<>();
        while(index<words.size()){
        }
        return ast;
    }
    //块分析器
    public void Block(){
    }
    //语句分析器
    public void Stmt(){
    }

    public static void main(String[] args) {
        Resolve resolve=new Resolve();
        resolve.segment=new Segment("int a = a",precompiler);
        for(Word<String> i:resolve.segment.segment())
            System.out.println(i.value);
    }
}
