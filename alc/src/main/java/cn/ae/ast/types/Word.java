package cn.ae.ast.types;

public class Word<T> {
    public T value;
    token_type type;
    public int line;
    public static enum token_type{
        NUMBER,STRING,KEYWORD,OTHER
    }
    public Word(T value, token_type type,int line){
        this.value = value;
        this.type = type;
        this.line = line;
    }
    public static Word<String> create(String value, token_type type,int line){
        return new Word<>(value,type,line);
    }
}
