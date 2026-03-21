package cn.ae.ast.basic;

import cn.ae.ast.Node;

public class GetNode extends Node {
    protected GetNode() {
    }

    public static GetNode create() {
        return new GetNode();
    }
}
