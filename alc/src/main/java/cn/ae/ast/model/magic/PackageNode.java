package cn.ae.ast.model.magic;

import cn.ae.ast.Node;

public class PackageNode extends Node {
    public String package_name;
    public PackageNode(String package_name) {
        this.package_name = package_name;
    }
    public static PackageNode create(String package_name) {
        return new PackageNode(package_name);
    }
}
