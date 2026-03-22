package cn.ae.ast.magic;

import cn.ae.ast.Node;

public class ImportNode extends Node {
    public String name;
    public ImportNode(String name) {
        this.name = name;
    }
    public static ImportNode create(String name) {
        return new ImportNode(name);
    }
}
