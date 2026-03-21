package cn.ae.ast.block;

import cn.ae.ast.basic.ListNode;
import cn.ae.ast.init.ClassVarNode;

import java.util.List;

public class ClassNode extends ListNode {
    public List<FuncNode> func;
    public List<ClassVarNode> var;
    public String name;

    protected ClassNode(List<FuncNode> func, List<ClassVarNode> var, String name) {
        super(null);
        this.func = func;
        this.var = var;
        this.name = name;
    }

    public static ClassNode create(List<FuncNode> func, List<ClassVarNode> var, String name) {
        return new ClassNode(func, var, name);
    }
}
