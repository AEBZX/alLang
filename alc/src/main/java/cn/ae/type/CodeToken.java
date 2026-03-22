package cn.ae.type;

public class CodeToken {
    public static class Token {
        //注释
        public static class Comment{
            public static final String line="//";
            public static final String start="/*";
            public static final String end="*/";
        }
        //数组,本质是指针语法糖
        public static class Array{
            public static final String init_start="[";
            public static final String init_end="]";
            public static final String split=",";
            public static final String set_start="{";
            public static final String set_end="}";
        }
        //指针操作
        public static class Pointer{
            public static final String address="*";
            public static final String value="&";
        }
        //数学/逻辑运算符
        public static class Math{
            public static final String inc="++";
            public static final String dec="--";
            public static final String add_for="+=";
            public static final String sub_for="-=";
            public static final String mul_for="*=";
            public static final String div_for="/=";
            public static final String mod_for="%=";
            public static final String and_for="&=";
            public static final String or_for="|=";
            public static final String xor_for="^=";
            public static final String shift_left_for="<<=";
            public static final String shift_right_for=">>=";
            public static final String add="+";
            public static final String sub="-";
            public static final String mul="*";
            public static final String div="/";
            public static final String mod="%";
            public static final String and="&";
            public static final String or="|";
            public static final String xor="^";
            public static final String not="!";
            public static final String shift_left="<<";
            public static final String shift_right=">>";
            public static final String block_start="(";
            public static final String block_end=")";
        }
        //比较运算符
        public static class Compare{
            public static final String equal="==";
            public static final String not_equal="!=";
            public static final String less="<";
            public static final String less_equal="<=";
            public static final String greater=">";
            public static final String greater_equal=">=";
        }
        //函数
        public static class Function{
            public static final String param_start="(";
            public static final String param_end=")";
            public static final String block_start="{";
            public static final String block_end="}";
        }
        public static class Decorator{
            public static final String use_start="@";
        }
        public static class Type{
            public static final String _int="int";
            public static final String _float="float";
            public static final String _double="double";
            //char[]的语法糖
            public static final String _string="string";
            public static final String _bool="bool";
            public static final String _void="void";
            public static final String _char="char";
            public static final String _long="long";
            public static final String _short="short";
            public static final String _class="class";
            public static final String _true="true";
            public static final String _false="false";
        }
        //操作
        public static class operation{
            public static final String set="=";
            public static final String get=".";
            public static final String await="await";
            public static final String split=";";
            public static final String call_start="(";
            public static final String call_end=")";
            public static final String call_split=",";
        }
        //魔法指令
        public static class magic{
            public static final String _import="import";
            public static final String _package="package";
        }
        //修饰符
        public static class modifier{
            public static final String _static="static";
            public static final String _const="const";
            public static final String _async="async";
            public static final String _public="public";
            public static final String _private="private";
        }
        //选择/循环
        public static class block{
            public static final String _if="if";
            public static final String else_if="else if";
            public static final String _else="else";
            public static final String _for="for";
            public static final String _while="while";
            public static final String _do="do";
            public static final String _switch="switch";
            public static final String _case="case";
            public static final String _default="default";
            public static final String bool_start="(";
            public static final String bool_end=")";
            public static final String block_start="{";
            public static final String block_end="}";
        }
        public static class command{
            public static final String _return="return";
            public static final String _break="break";
            public static final String _continue="continue";
            public static final String _delete="delete";
        }
        public static class string{
            public static final String start="\"";
            public static final String end="\"";
        }
        public static class _char{
            public static final String start="'";
            public static final String end="'";
        }
        //转义字符
        public static class escape{
            public static final String backslash="\\\\";
            public static final String newline="\\n";
            public static final String tab="\\t";
            public static final String backspace="\\b";
            public static final String carriage_return="\\r";
            public static final String quote="\\\"";
            public static final String single_quote="\\'";
        }
    }
    public static class Num{
        //注释
        public static class Comment{
            public static final int line=2;
            public static final int start=2;
            public static final int end=2;
        }
        //数组,本质是指针语法糖
        public static class Array{
            public static final int init_start=1;
            public static final int init_end=1;
            public static final int split=1;
            public static final int set_start=1;
            public static final int set_end=1;
        }
        //指针操作
        public static class Pointer{
            public static final int address=1;
            public static final int value=1;
        }
        //数学/逻辑运算符
        public static class Math{
            public static final int inc=2;
            public static final int dec=2;
            public static final int add_for=2;
            public static final int sub_for=2;
            public static final int mul_for=2;
            public static final int div_for=2;
            public static final int mod_for=2;
            public static final int and_for=2;
            public static final int or_for=2;
            public static final int xor_for=2;
            public static final int shift_left_for=3;
            public static final int shift_right_for=3;
            public static final int add=1;
            public static final int sub=1;
            public static final int mul=1;
            public static final int div=1;
            public static final int mod=1;
            public static final int and=1;
            public static final int or=1;
            public static final int xor=1;
            public static final int not=1;
            public static final int shift_left=2;
            public static final int shift_right=2;
            public static final int block_start=1;
            public static final int block_end=1;
        }
        //比较运算符
        public static class Compare{
            public static final int equal=2;
            public static final int not_equal=2;
            public static final int less=1;
            public static final int less_equal=2;
            public static final int greater=1;
            public static final int greater_equal=2;
        }
        //函数
        public static class Function{
            public static final int param_start=1;
            public static final int param_end=1;
            public static final int block_start=1;
            public static final int block_end=1;
        }
        public static class Decorator{
            public static final int use_start=1;
        }
        public static class Type{
            public static final int _int=3;
            public static final int _float=5;
            public static final int _double=6;
            //char[]的语法糖
            public static final int _string=6;
            public static final int _bool=4;
            public static final int _void=4;
            public static final int _char=4;
            public static final int _pointer=7;
            public static final int _long=4;
            public static final int _short=5;
            public static final int _class=5;
        }
        //操作
        public static class operation{
            public static final int set=1;
            public static final int get=1;
            public static final int await=5;
            public static final int split=1;
            public static final int call_start=1;
            public static final int call_end=1;
            public static final int call_split=1;
        }
        //魔法指令
        public static class magic{
            public static final int _import=6;
            public static final int _package=7;
        }
        //修饰符
        public static class modifier{
            public static final int _static=6;
            public static final int _const=5;
            public static final int _async=5;
            public static final int _public=6;
            public static final int _private=7;
        }
        //选择/循环
        public static class block{
            public static final int _if=2;
            public static final int else_if=4;
            public static final int _else=4;
            public static final int _for=3;
            public static final int _while=5;
            public static final int _do=2;
            public static final int _switch=6;
            public static final int _case=4;
            public static final int _default=7;
            public static final int bool_start=1;
            public static final int bool_end=1;
            public static final int block_start=1;
            public static final int block_end=1;
        }
        public static class command{
            public static final int _return=6;
            public static final int _break=5;
            public static final int _continue=8;
            public static final int _delete=6;
        }
        public static class string{
            public static final int start=1;
            public static final int end=1;
        }
        public static class _char{
            public static final int start=1;
            public static final int end=1;
        }
        //转义字符
        public static class escape{
            public static final int backslash=2;
            public static final int newline=2;
            public static final int tab=2;
            public static final int backspace=2;
            public static final int carriage_return=2;
            public static final int quote=2;
            public static final int single_quote=2;
        }
    }
    public static enum segment_type{
        param,_class,block,bool,string,_char,math,comment_line,comment_block
    }
}