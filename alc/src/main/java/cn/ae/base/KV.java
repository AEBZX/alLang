package cn.ae.base;

public class KV<K,V> {
    public K key;
    public V value;
    public int line;
    public KV(K key,V value){
        this.key=key;
        this.value=value;
    }
    public KV(K key){
        this.key=key;
        this.value=null;
        this.line=Segment.line;
    }
}
