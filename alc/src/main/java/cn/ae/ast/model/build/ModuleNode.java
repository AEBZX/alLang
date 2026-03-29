package cn.ae.ast.model.build;

import cn.ae.ast.Node;
import cn.ae.ast.model.init.block.ClassNode;

import java.util.List;

public class ModuleNode extends Node {
    public String name;
    public List<ClassNode> class_list;
    protected ModuleNode(String name, List<ClassNode> class_list){
        this.class_list=class_list;
        this.name=name;
    }
    public static Node create(String name, List<ClassNode> class_list){
        return new ModuleNode(name,class_list);
    }
}
