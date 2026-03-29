package cn.ae.ast.build.parser;

import cn.ae.Main;

public class Out {
    public static void Error(String msg,int line){
        Main.log.error(msg,line);
        System.exit(0);
    }
    public static void Error(String msg){
        Main.log.error(msg);
        System.exit(0);
    }
    public static void Warn(String msg){
        Main.log.warn(msg);
    }
    public static void Warn(String msg,int line){
        Main.log.warn(msg,line);
    }
    public static void Info(String msg){
        Main.log.info(msg);
    }
    public static void Info(String msg,int line){
        Main.log.info(msg,line);
    }
}
