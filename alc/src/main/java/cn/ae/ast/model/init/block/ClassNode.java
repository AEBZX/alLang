package cn.ae.ast.model.init.block;

import cn.ae.ast.build.parser.Decorator;
import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.build.ModuleNode;
import cn.ae.ast.model.init.var.ClassVarNode;
import cn.ae.ast.model.magic.DecoratorNode;

import java.util.ArrayList;
import java.util.List;

public class ClassNode extends ListNode {
    public List<FuncNode> func;
    public List<ClassNode> cla;
    public List<ClassVarNode> var;
    public String name;
    public List<DecoratorNode> decorator;
    public List<Decorator> _decorator;
    public String __extends;
    public ClassNode _extends;
    public ClassNode _implements;
    public boolean _public=false;
    public boolean _static=false;
    public boolean _final=false;
    public List<ModuleNode> import_modules;
    protected ClassNode(List<FuncNode> func, List<ClassVarNode> var,List<Decorator> decorator, String name) {
        super(null);
        this.func = func;
        this.var = var;
        this.name = name;
        this._decorator=decorator;
        import_modules=new ArrayList<>();
        cla=new ArrayList<>();
        decorator=new ArrayList<>();
    }

    public static ClassNode create(List<FuncNode> func, List<ClassVarNode> var,List<Decorator> decorator, String name) {
        return new ClassNode(func, var,decorator, name);
    }
}
