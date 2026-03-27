package cn.ae.ast.model.init.block;

import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.init.var.ClassVarNode;
import cn.ae.ast.model.magic.DecoratorNode;

import java.util.List;

public class ClassNode extends ListNode {
    public List<FuncNode> func;
    public List<ClassVarNode> var;
    public String name;
    public List<DecoratorNode> decorator;
    protected ClassNode(List<FuncNode> func, List<ClassVarNode> var,List<DecoratorNode> decorator, String name) {
        super(null);
        this.func = func;
        this.var = var;
        this.name = name;
        this.decorator=decorator;
    }

    public static ClassNode create(List<FuncNode> func, List<ClassVarNode> var,List<DecoratorNode> decorator, String name) {
        return new ClassNode(func, var,decorator, name);
    }
}
