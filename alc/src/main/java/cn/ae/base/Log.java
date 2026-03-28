package cn.ae.base;

import cn.ae.base.IO;

import java.io.File;
import java.text.SimpleDateFormat;

public class Log {
    private boolean to_log;
    private String path;
    public Log(){
        this.to_log=false;
    }
    public Log(String path){
        if(new File(path).isAbsolute()){
            this.path=path;
        }else{
            this.path=System.getProperty("user.dir")+File.separator+path;
        }
        this.to_log=true;
    }
    public void info(String msg){
        System.out.println("\033[32mINFO\033[0m:"+msg);
        if(to_log){
            IO.append("[INFO]"+
                    new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date())+":"+msg,path);
        }
    }
    public void warn(String msg){
        System.out.println("\033[33mWARN\033[0m:"+msg);
        if(to_log){
            IO.append("[WARN]"+
                    new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date())+":"+msg,path);
        }
    }
    public void error(String msg){
        System.out.println("\033[31mERROR\033[0m:"+msg);
        if(to_log){
            IO.append("[ERROR]"+
                    new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date())+":"+msg,path);
        }
    }
    public void info(String msg,int line){
        System.out.println("\033[32mINFO\033[0m:"+msg+" at line:"+line);
        if(to_log){
            IO.append("[INFO]"+
                    new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date())+":"+msg+"at line:"+line
                    ,path);
        }
    }
    public void warn(String msg,int line){
        System.out.println("\033[33mWARN\033[0m:"+msg+" at line:"+line);
        if(to_log){
            IO.append("[WARN]"+
                    new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date())+":"+msg+"at line:"+line
                    ,path);
        }
    }
    public void error(String msg,int line){
        System.out.println("\033[31mERROR\033[0m:"+msg+" at line:"+line);
        if(to_log){
            IO.append("[ERROR]"+
                    new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date())+":"+msg+"at line:"+line
                    ,path);
        }
    }
}
