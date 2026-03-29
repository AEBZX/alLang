package cn.ae.ast.build.parser;

public class Set<K,V>{
    public K key;
    public V value;
    public Set(K key, V value) {
        this.key = key;
        this.value = value;
    }
    public static <K,V> Set<K,V> create(K key, V value) {
        return new Set<>(key,value);
    }
}
