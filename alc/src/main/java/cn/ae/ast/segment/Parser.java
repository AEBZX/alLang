package cn.ae.ast.segment;

import cn.ae.ast.Node;

import java.util.ArrayList;

public class Parser {
    public Segment segment;
    public Node ast;
    public static class Tokens{
        public static final String Colon=":";
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
        public static final String LOGIC_EQUAL="=";
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
        public static final String SPLIT=";";
        //关键字
        public static final String VAR="var";
        public static final String INT="int";
    }
    public Parser(){
        segment=new Segment("a",new ArrayList<>());
    }
}
