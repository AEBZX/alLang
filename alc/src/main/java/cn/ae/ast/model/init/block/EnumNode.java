package cn.ae.ast.model.init.block;

import cn.ae.ast.build.parser.Decorator;
import cn.ae.ast.model.init.var.ClassVarNode;
import cn.ae.ast.model.magic.DecoratorNode;

import java.util.ArrayList;
import java.util.List;

public class EnumNode extends ClassNode{
    protected EnumNode(List<FuncNode> func, List<ClassVarNode> var, List<Decorator> decorator, String name) {
        super(func, var, decorator, name);
    }

    public static ClassNode create(List<ClassVarNode> var, List<Decorator> decorator, String name) {
        return new ClassNode(new ArrayList<>(), var,decorator, name);
    }
}
