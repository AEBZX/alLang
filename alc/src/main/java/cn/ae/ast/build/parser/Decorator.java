package cn.ae.ast.build.parser;

import cn.ae.ast.types.Word;

import java.util.List;

public class Decorator {
    public String name;
    public List<Word<String>> params;
    public Decorator(String name,List<Word<String>> params){
        this.name=name;
        this.params=params;
    }
    public static Decorator create(String name,List<Word<String>> params){
        return new Decorator(name,params);
    }
}
