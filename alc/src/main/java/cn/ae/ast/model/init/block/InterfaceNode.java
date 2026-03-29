package cn.ae.ast.model.init.block;

import cn.ae.ast.build.parser.Decorator;
import cn.ae.ast.model.init.var.ClassVarNode;
import cn.ae.ast.model.magic.DecoratorNode;

import java.util.List;

public class InterfaceNode extends ClassNode{
    protected InterfaceNode(List<FuncNode> func, List<ClassVarNode> var, List<Decorator> decorator, String name) {
        super(func, var, decorator, name);
    }
    public static InterfaceNode create(List<FuncNode> func, List<ClassVarNode> var, List<Decorator> decorator, String name) {
        return new InterfaceNode(func, var, decorator, name);
    }
}
