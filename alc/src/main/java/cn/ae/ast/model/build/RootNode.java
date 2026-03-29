package cn.ae.ast.model.build;

import cn.ae.ast.Node;

import java.util.ArrayList;
import java.util.List;

public class RootNode extends Node {
    public List<ModuleNode> modules;
    protected RootNode() {
        modules=new ArrayList<>();
    }
    public static RootNode create() {
        return new RootNode();
    }
}
