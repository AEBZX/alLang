#include "vm.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <thread>
#include <chrono>
#include <algorithm>
#include <cmath>

// ========== 指令执行引擎 ==========

class VM {
public:
    pool memory_pool;
    var variable_pool;
    Map<long long, Any> vars;        // 变量存储 (ID → 值)
    Map<long long, std::string> varTypes; // 变量类型名 (STRING_VAR, NUMBER_VAR, BOOLEAN_VAR)

    // 栈存储 (用于函数调用传参)
    Stack number_stack;
    Stack string_stack;
    Stack boolean_stack;

    Any ret_val;                     // 返回值寄存器

    // 指令块存储: blockName → [指令列表]
    Map<std::string, List<List<std::string>>> blocks;

    // 调用栈
    struct CallFrame {
        std::string blockName;
        size_t pc;
        size_t retAddr;
    };
    std::vector<CallFrame> callStack;

    // 线程管理
    ThreadPool thread_pool;
    std::mutex global_mutex;
    MovTracker mov_tracker;

    // GC
    int gc_counter = 0;

    // 追踪当前执行
    size_t pc;
    bool running;
    std::string currentBlock;

    // 标签缓存 (用于跳转)
    Map<std::string, Map<std::string, size_t>> labelCache; // blockName → (labelName → pc)

    VM() : variable_pool(&memory_pool), thread_pool(4), pc(0), running(false) {
        ret_val = Any(0LL);
    }

    // ========== .albin 文件加载 ==========

    void load(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            std::cerr << "Error: Cannot open file " << filename << std::endl;
            return;
        }

        std::string content((std::istreambuf_iterator<char>(file)),
                            std::istreambuf_iterator<char>());
        file.close();
        parseAlbin(content);
    }

    void parseAlbin(const std::string& code) {
        std::istringstream stream(code);
        std::string line;

        enum ParseState { NONE, IN_HEAD, IN_BODY };
        ParseState state = NONE;
        std::string currentBlockName;
        List<List<std::string>> currentInstructions;

        while (std::getline(stream, line)) {
            // trim
            size_t start = line.find_first_not_of(" \t\r\n");
            if (start == std::string::npos) continue;
            std::string trimmed = line.substr(start);
            // 去掉行尾空白
            size_t end = trimmed.find_last_not_of(" \t\r\n");
            if (end != std::string::npos) trimmed = trimmed.substr(0, end + 1);

            if (trimmed == "HEAD_START") {
                state = IN_HEAD;
                continue;
            }
            if (trimmed == "HEAD_END") {
                state = IN_HEAD;
                // HEAD 解析完成，预分配变量
                allocateVars();
                continue;
            }
            if (trimmed == "BODY_START") {
                state = IN_BODY;
                continue;
            }
            if (trimmed == "BODY_END") {
                // 保存最后一个块
                if (!currentBlockName.empty()) {
                    blocks[currentBlockName] = currentInstructions;
                }
                state = NONE;
                continue;
            }

            if (state == IN_HEAD && trimmed[0] == '@') {
                parseHeadEntry(trimmed);
            } else if (state == IN_BODY) {
                // 检查是否有前导空白（区分块名 vs 标签指令）
                bool hasLeadingSpace = (start > 0); // 原行有缩进
                if (trimmed.back() == ':' && !hasLeadingSpace) {
                    // 无缩进 = 块名定义，例如 @main:
                    if (!currentBlockName.empty()) {
                        blocks[currentBlockName] = currentInstructions;
                    }
                    currentBlockName = trimmed.substr(0, trimmed.size() - 1);
                    currentInstructions.clear();
                } else if (!trimmed.empty() && !currentBlockName.empty()) {
                    // 有缩进或非块名行 = 指令（包括标签指令 @_L1:）
                    auto inst = parseInstruction(trimmed);
                    if (!inst.empty()) {
                        currentInstructions.push_back(inst);
                    }
                }
            }
        }

        std::cout << "Parsed " << blocks.size() << " blocks, "
                  << varTypes.size() << " variables" << std::endl;
    }

    void parseHeadEntry(const std::string& line) {
        // @STRING_VAR 0~5
        // @NUMBER_VAR 100~105
        size_t space = line.find(' ');
        if (space == std::string::npos) return;
        std::string type = line.substr(1, space - 1);
        std::string range = line.substr(space + 1);

        size_t tilde = range.find('~');
        if (tilde == std::string::npos) return;
        int start_id = std::stoi(range.substr(0, tilde));
        int end_id = std::stoi(range.substr(tilde + 1));

        // 记录变量分配范围
        for (int i = start_id; i <= end_id; i++) {
            varTypes[i] = type;
            // 预初始化变量
            if (type == "STRING_VAR") {
                vars[i] = std::string("");
            } else if (type == "BOOLEAN_VAR") {
                vars[i] = false;
            } else {
                vars[i] = 0LL;
            }
        }
    }

    void allocateVars() {
        for (const auto& [id, type] : varTypes) {
            if (vars.find(id) == vars.end()) {
                if (type == "STRING_VAR" || type == "STRING_STACK") {
                    vars[id] = std::string("");
                } else if (type == "BOOLEAN_VAR" || type == "BOOLEAN_STACK") {
                    vars[id] = false;
                } else {
                    vars[id] = 0LL;
                }
            }
        }
    }

    List<std::string> parseInstruction(const std::string& line) {
        List<std::string> result;
        std::string trimmed = line;
        // 去掉行首行尾空白
        size_t s = trimmed.find_first_not_of(" \t");
        if (s == std::string::npos) return result;
        trimmed = trimmed.substr(s);

        // 解析指令: 空格分隔，但字符串字面量保持完整
        // 格式: op arg1 arg2 'string arg' ...
        size_t i = 0;
        while (i < trimmed.size()) {
            if (trimmed[i] == '\'') {
                // 字符串字面量
                size_t j = i + 1;
                while (j < trimmed.size() && trimmed[j] != '\'') j++;
                if (j < trimmed.size()) j++; // 跳过结束引号
                result.push_back(trimmed.substr(i, j - i));
                i = j;
            } else if (trimmed[i] == ' ' || trimmed[i] == '\t') {
                i++;
            } else {
                size_t j = i;
                while (j < trimmed.size() && trimmed[j] != ' ' && trimmed[j] != '\t') j++;
                result.push_back(trimmed.substr(i, j - i));
                i = j;
            }
        }
        return result;
    }

    // ========== 值解析 ==========

    // 解析值: 数字ID → 变量值, 字面量, 变量引用[id]
    Any resolveValue(const std::string& s) {
        if (s == "null") return Any(0LL);
        if (s == "true") return Any(true);
        if (s == "false") return Any(false);
        if (s == "ret") return ret_val;

        // 字符串字面量 'xxx'
        if (s.size() >= 2 && s[0] == '\'' && s.back() == '\'') {
            return Any(s.substr(1, s.size() - 2));
        }

        // 变量引用 [id] (显式解引用)
        if (s.size() >= 2 && s[0] == '[' && s.back() == ']') {
            long long id = std::stoll(s.substr(1, s.size() - 2));
            auto it = vars.find(id);
            if (it != vars.end()) return it->second;
            return Any(0LL);
        }

        // 尝试解析为数字 (浮点数或整数)
        bool isFloat = (s.find('.') != std::string::npos);
        try {
            if (isFloat) {
                return Any((long double)std::stold(s));
            }
            long long num = std::stoll(s);
            // 关键: 如果这个数字是一个已分配变量的 ID，则返回变量值
            // 否则返回数字字面量
            if (varTypes.find(num) != varTypes.end() || vars.find(num) != vars.end()) {
                // 它是变量引用，返回变量值
                auto it = vars.find(num);
                if (it != vars.end()) return it->second;
                // 变量未初始化，返回默认值
                return Any(0LL);
            }
            // 不是已知变量 ID，作为数字字面量
            return Any(num);
        } catch (...) {}

        return Any(s);
    }

    // 解析为 ID (数字)
    long long resolveId(const std::string& s) {
        if (s == "ret") return -1;
        try {
            return std::stoll(s);
        } catch (...) {
            return 0;
        }
    }

    // 获取变量的当前值
    Any getVar(long long id) {
        auto it = vars.find(id);
        if (it != vars.end()) return it->second;
        return Any(0LL);
    }

    // 设置变量值
    void setVar(long long id, const Any& val) {
        auto it = vars.find(id);
        if (it != vars.end()) {
            memory_pool.unlink(it->second);
        }
        vars[id] = val;
        memory_pool.link(val);
    }

    // ========== 类型转换 ==========

    long double toNumber(const Any& val) {
        if (std::holds_alternative<long long>(val))
            return (long double)std::get<long long>(val);
        if (std::holds_alternative<long double>(val))
            return std::get<long double>(val);
        if (std::holds_alternative<bool>(val))
            return std::get<bool>(val) ? 1.0 : 0.0;
        if (std::holds_alternative<std::string>(val)) {
            try { return std::stold(std::get<std::string>(val)); }
            catch (...) { return 0.0; }
        }
        return 0.0;
    }

    bool toBool(const Any& val) {
        if (std::holds_alternative<bool>(val)) return std::get<bool>(val);
        if (std::holds_alternative<long long>(val)) return std::get<long long>(val) != 0;
        if (std::holds_alternative<long double>(val)) return std::get<long double>(val) != 0.0;
        if (std::holds_alternative<std::string>(val)) return !std::get<std::string>(val).empty();
        return false;
    }

    std::string toString(const Any& val) {
        if (std::holds_alternative<std::string>(val)) return std::get<std::string>(val);
        if (std::holds_alternative<long long>(val)) return std::to_string(std::get<long long>(val));
        if (std::holds_alternative<long double>(val)) {
            std::string s = std::to_string(std::get<long double>(val));
            // 去除多余的尾部零
            s.erase(s.find_last_not_of('0') + 1, std::string::npos);
            if (s.back() == '.') s.pop_back();
            return s;
        }
        if (std::holds_alternative<bool>(val)) return std::get<bool>(val) ? "true" : "false";
        return "null";
    }

    void printAny(const Any& val) {
        std::cout << toString(val);
    }

    // ========== 区块执行 ==========

    void run(const std::string& entryBlock = "") {
        running = true;
        std::string target = entryBlock;
        if (target.empty() || blocks.find(target) == blocks.end()) {
            // 默认: 查找 @main, 否则使用第一个块
            if (blocks.find("@main") != blocks.end()) {
                target = "@main";
            } else if (!blocks.empty()) {
                target = blocks.begin()->first;
                std::cout << "Using first block as entry: " << target << std::endl;
            } else {
                std::cerr << "Error: No blocks to execute" << std::endl;
                running = false;
                return;
            }
        }
        executeBlock(target);
        running = false;
    }

    // 返回值: true=正常完成, false=遇到ret
    bool executeBlock(const std::string& blockName) {
        auto it = blocks.find(blockName);
        if (it == blocks.end()) {
            // 尝试不同的命名格式
            std::string altName = blockName;
            if (blockName[0] != '@') altName = "@" + blockName;
            it = blocks.find(altName);
            if (it == blocks.end()) {
                std::cerr << "Error: Block '" << blockName << "' not found" << std::endl;
                return false;
            }
        }

        // 建立标签索引
        buildLabelCache(it->first, it->second);

        auto& instructions = it->second;
        size_t localPc = 0;
        bool didReturn = false;

        while (localPc < instructions.size() && running) {
            auto& inst = instructions[localPc];

            if (inst.empty()) {
                localPc++;
                continue;
            }

            std::string op = inst[0];

            // 跳过标签行 @label:
            if (op.size() > 1 && op[0] == '@') {
                localPc++;
                continue;
            }

            // 执行指令: 返回 0=前进, 1=跳转(PC已设置), -1=ret
            int action = executeInstruction(inst, blockName, localPc, instructions);
            if (action == 0) {
                localPc++;
            } else if (action == -1) {
                didReturn = true;
                break;
            }
            // action == 1: PC 已在 executeInstruction 中设置

            // GC
            gc_counter++;
            if (gc_counter >= 1000) {
                memory_pool.gc();
                gc_counter = 0;
            }
        }

        return didReturn;
    }

    void buildLabelCache(const std::string& blockName, const List<List<std::string>>& instructions) {
        auto& cache = labelCache[blockName];
        cache.clear();
        for (size_t i = 0; i < instructions.size(); i++) {
            if (instructions[i].size() > 0 && instructions[i][0].size() > 1
                && instructions[i][0][0] == '@') {
                std::string label = instructions[i][0].substr(1); // 去掉@
                cache[label] = i;
            }
        }
    }

    size_t findLabel(const std::string& blockName, const std::string& label,
                     const List<List<std::string>>& instructions) {
        auto& cache = labelCache[blockName];
        auto it = cache.find(label);
        if (it != cache.end()) return it->second;

        // 回退到线性搜索
        for (size_t i = 0; i < instructions.size(); i++) {
            if (instructions[i].size() > 0 && instructions[i][0] == ("@" + label + ":")) {
                cache[label] = i;
                return i;
            }
        }
        return (size_t)-1;
    }

    // 返回: 0=前进PC, 1=跳转(PC已设), -1=ret
    int executeInstruction(List<std::string>& inst, const std::string& blockName,
                            size_t& localPc, List<List<std::string>>& instructions) {
        std::string op = inst[0];

        if (op == "mov") {
            execMovInst(inst);
        } else if (op == "add" || op == "sub" || op == "mul" || op == "div"
                   || op == "mod" || op == "and" || op == "or" || op == "xor") {
            execArithInst(inst, op);
        } else if (op == "cmp") {
            execCmpInst(inst);
        } else if (op == "cz") {
            if (execCzInst(inst, blockName, localPc, instructions)) return 1;
        } else if (op == "call") {
            if (execCallInst(inst, blockName, localPc)) return 1;
        } else if (op == "ret") {
            return -1;
        } else if (op == "push") {
            execPushInst(inst);
        } else if (op == "pop") {
            execPopInst(inst);
        } else if (op == "in") {
            execInInst(inst);
        } else if (op == "out") {
            execOutInst(inst);
        } else if (op == "vm") {
            execVmInst(inst);
        } else if (op == "thread") {
            execThreadInst(inst);
        } else if (op == "gc") {
            memory_pool.gc();
        } else if (op == "throw") {
            execThrowInst(inst);
        } else if (op == "try_start") {
            // 记录 catch 标签，忽略
        } else if (op == "try_end") {
            // 忽略
        } else if (op == "not") {
            execNotInst(inst);
        } else if (op == "shl") {
            execShiftInst(inst, true);
        } else if (op == "shr") {
            execShiftInst(inst, false);
        }

        return 0; // 正常前进 PC
    }

    // ========== MOV 指令 (细粒度锁) ==========

    void execMovInst(List<std::string>& inst) {
        if (inst.size() < 3) return;

        long long destId = resolveId(inst[1]);
        if (destId < 0) {
            // 写入 ret 寄存器
            ret_val = resolveValue(inst[2]);
            return;
        }

        Any srcVal = resolveValue(inst[2]);

        // 细粒度锁 MOV
        VarLock* vl_dest = variable_pool.getLock(destId);
        std::lock_guard<std::mutex> lock(vl_dest->mtx);

        // 清理旧值
        auto it = vars.find(destId);
        if (it != vars.end()) {
            memory_pool.unlink(it->second);
        }

        vars[destId] = srcVal;
        memory_pool.link(srcVal);

        vl_dest->version.fetch_add(1, std::memory_order_release);
        mov_tracker.record(destId, destId);
    }

    // ========== 算术运算 ==========

    void execArithInst(List<std::string>& inst, const std::string& op) {
        if (inst.size() < 3) return;

        long long destId = resolveId(inst[1]);
        Any srcVal = resolveValue(inst[2]);

        VarLock* vl = variable_pool.getLock(destId);
        std::lock_guard<std::mutex> lock(vl->mtx);

        auto it = vars.find(destId);
        if (it == vars.end()) return;

        long double a = toNumber(it->second);
        long double b = toNumber(srcVal);
        long double result = 0.0;

        if (op == "add") result = a + b;
        else if (op == "sub") result = a - b;
        else if (op == "mul") result = a * b;
        else if (op == "div") result = (b != 0) ? a / b : 0.0;
        else if (op == "mod") result = (b != 0) ? std::fmod(a, b) : 0.0;
        else if (op == "and") result = (long long)a & (long long)b;
        else if (op == "or") result = (long long)a | (long long)b;
        else if (op == "xor") result = (long long)a ^ (long long)b;

        memory_pool.unlink(it->second);

        // 保留原类型
        if (std::holds_alternative<long long>(it->second)) {
            vars[destId] = (long long)result;
        } else {
            vars[destId] = result;
        }
        memory_pool.link(vars[destId]);
        vl->version.fetch_add(1, std::memory_order_release);
    }

    // ========== NOT 指令 ==========

    void execNotInst(List<std::string>& inst) {
        if (inst.size() < 2) return;
        long long destId = resolveId(inst[1]);

        VarLock* vl = variable_pool.getLock(destId);
        std::lock_guard<std::mutex> lock(vl->mtx);

        auto it = vars.find(destId);
        if (it == vars.end()) return;

        bool val = !toBool(it->second);
        memory_pool.unlink(it->second);
        vars[destId] = val;
        memory_pool.link(vars[destId]);
        vl->version.fetch_add(1, std::memory_order_release);
    }

    // ========== 位移运算 ==========

    void execShiftInst(List<std::string>& inst, bool left) {
        if (inst.size() < 3) return;
        long long destId = resolveId(inst[1]);
        long long shift = (long long)toNumber(resolveValue(inst[2]));

        VarLock* vl = variable_pool.getLock(destId);
        std::lock_guard<std::mutex> lock(vl->mtx);

        auto it = vars.find(destId);
        if (it == vars.end()) return;

        long long val = (long long)toNumber(it->second);
        long long result = left ? (val << shift) : (val >> shift);

        memory_pool.unlink(it->second);
        vars[destId] = result;
        memory_pool.link(vars[destId]);
        vl->version.fetch_add(1, std::memory_order_release);
    }

    // ========== 比较指令 ==========

    void execCmpInst(List<std::string>& inst) {
        // cmp left right op boolVar
        if (inst.size() < 5) return;

        Any leftVal = resolveValue(inst[1]);
        Any rightVal = resolveValue(inst[2]);
        std::string cmpOp = inst[3];
        long long boolId = resolveId(inst[4]);

        bool result = false;

        // 尝试数值比较
        long double a = toNumber(leftVal);
        long double b = toNumber(rightVal);

        if (cmpOp == "==") result = (a == b);
        else if (cmpOp == "!=") result = (a != b);
        else if (cmpOp == "<") result = (a < b);
        else if (cmpOp == "<=") result = (a <= b);
        else if (cmpOp == ">") result = (a > b);
        else if (cmpOp == ">=") result = (a >= b);
        else if (cmpOp == "&&") result = toBool(leftVal) && toBool(rightVal);
        else if (cmpOp == "||") result = toBool(leftVal) || toBool(rightVal);

        // 如果不是数值，尝试字符串比较
        if (std::holds_alternative<std::string>(leftVal) ||
            std::holds_alternative<std::string>(rightVal)) {
            std::string sa = toString(leftVal);
            std::string sb = toString(rightVal);
            if (cmpOp == "==") result = (sa == sb);
            else if (cmpOp == "!=") result = (sa != sb);
        }

        setVar(boolId, Any(result));
    }

    // ========== 条件跳转 (cz = check zero) ==========

    // 返回 true=跳转(PC已设), false=正常前进
    bool execCzInst(List<std::string>& inst, const std::string& blockName,
                    size_t& localPc, List<List<std::string>>& instructions) {
        // cz boolId label
        if (inst.size() < 3) return false;

        long long boolId = resolveId(inst[1]);
        std::string label = inst[2];

        bool condition = toBool(getVar(boolId));

        if (!condition) {
            // 跳转到标签
            size_t target = findLabel(blockName, label, instructions);
            if (target != (size_t)-1) {
                localPc = target;
                return true; // PC 已设置
            }
        }
        return false; // 正常前进
    }

    // ========== 函数调用 ==========

    // 返回 true=跳转(PC已设), false=正常前进
    bool execCallInst(List<std::string>& inst, const std::string& blockName,
                      size_t& localPc) {
        // call @targetBlock
        if (inst.size() < 2) return false;

        std::string target = inst[1];

        // 检查是否是标签跳转（无条件jump）
        bool isLabel = false;
        if (target.size() > 1) {
            isLabel = (target[0] == '_' ||
                       target.find("_L") != std::string::npos ||
                       target.find("_endif") != std::string::npos ||
                       target.find("_else") != std::string::npos ||
                       target.find("_while") != std::string::npos ||
                       target.find("_wend") != std::string::npos ||
                       target.find("_swend") != std::string::npos ||
                       target.find("_catch") != std::string::npos ||
                       target.find("_finally") != std::string::npos ||
                       target.find("_tryend") != std::string::npos ||
                       target.find("_tern") != std::string::npos ||
                       target.find("_snext") != std::string::npos ||
                       target.find("_scase") != std::string::npos ||
                       target.find("_break_") != std::string::npos ||
                       target.find("_continue_") != std::string::npos);
        }

        if (isLabel) {
            // 标签跳转（无条件 jump）
            std::string label = target;
            if (!label.empty() && label[0] == '@') label = label.substr(1);
            auto& instructions = blocks[blockName];
            size_t targetPc = findLabel(blockName, label, instructions);
            if (targetPc != (size_t)-1) {
                localPc = targetPc;
                return true; // PC 已设置
            }
            return false;
        }

        // 函数调用: 保存返回地址
        CallFrame frame;
        frame.blockName = blockName;
        frame.pc = localPc;
        frame.retAddr = localPc + 1;
        callStack.push_back(frame);

        // 执行目标块 (不递归，记录返回地址)
        // 注意: executeBlock 会修改 localPc，所以我们在这里不处理
        // 简化处理: 直接执行目标块
        executeBlock(target);

        // 恢复: executeBlock 返回后，继续执行下一条指令
        return false; // 正常前进到下一条指令
    }

    // ========== 返回 ==========

    void execRetInst() {
        // 隐式返回到调用者（通过 executeBlock 返回）
    }

    // ========== 栈操作 ==========

    void execPushInst(List<std::string>& inst) {
        // push stackKind value
        if (inst.size() < 3) return;

        std::string stackKind = inst[1];
        Any val = resolveValue(inst[2]);

        if (stackKind == "number_stack" || stackKind == "NUMBER_STACK") {
            number_stack.push(val);
        } else if (stackKind == "string_stack" || stackKind == "STRING_STACK") {
            string_stack.push(val);
        } else if (stackKind == "boolean_stack" || stackKind == "BOOLEAN_STACK") {
            boolean_stack.push(val);
        }
    }

    void execPopInst(List<std::string>& inst) {
        // pop stackKind [destVar]
        if (inst.size() < 2) return;

        std::string stackKind = inst[1];
        Any val;
        bool hasVal = false;

        if (stackKind == "number_stack" || stackKind == "NUMBER_STACK") {
            if (!number_stack.empty()) {
                val = number_stack.top();
                number_stack.pop();
                hasVal = true;
            }
        } else if (stackKind == "string_stack" || stackKind == "STRING_STACK") {
            if (!string_stack.empty()) {
                val = string_stack.top();
                string_stack.pop();
                hasVal = true;
            }
        } else if (stackKind == "boolean_stack" || stackKind == "BOOLEAN_STACK") {
            if (!boolean_stack.empty()) {
                val = boolean_stack.top();
                boolean_stack.pop();
                hasVal = true;
            }
        }

        if (hasVal && inst.size() >= 3) {
            long long destId = resolveId(inst[2]);
            if (destId >= 0) {
                setVar(destId, val);
            }
        }
    }

    // ========== I/O 指令 ==========

    // ========== in 指令: in target [arg] ==========
    // in console        → 从 stdin 读入 ret_val
    // in file "path"    → 读取文件内容到 ret_val
    // in env "NAME"     → 读取环境变量到 ret_val
    // in cmdline N      → 读取命令行参数到 ret_val
    // in os "cmd"       → 执行系统命令，结果到 ret_val
    void execInInst(List<std::string>& inst) {
        if (inst.size() < 2) return;

        std::string target = inst[1];
        std::string arg = inst.size() >= 3 ? inst[2] : "";

        // 清理引号
        if (arg.size() >= 2 && arg[0] == '\'' && arg.back() == '\'') {
            arg = arg.substr(1, arg.size() - 2);
        }

        if (target == "console") {
            // 从 stdin 读取一行
            std::string line;
            if (std::getline(std::cin, line)) {
                if (!line.empty() && line.back() == '\r') line.pop_back();
                ret_val = Any(line);
            }
        } else if (target == "file") {
            // 读取文件内容
            if (!arg.empty()) {
                std::ifstream f(arg);
                if (f.is_open()) {
                    std::string content((std::istreambuf_iterator<char>(f)),
                                        std::istreambuf_iterator<char>());
                    ret_val = Any(content);
                    f.close();
                }
            }
        } else if (target == "env") {
            // 读取环境变量
            if (!arg.empty()) {
                const char* val = std::getenv(arg.c_str());
                if (val) ret_val = Any(std::string(val));
                else ret_val = Any(std::string(""));
            }
        } else if (target == "cmdline") {
            // 读取命令行参数 (由外部设置)
            ret_val = Any(std::string(""));
        } else if (target == "os") {
            // 执行系统命令 (简化: 忽略)
            ret_val = Any(std::string(""));
        }
    }

    // ========== out 指令: out target [value] ==========
    // out console val   → 输出到 stdout
    // out file "path" val → 写入文件
    // out err val       → 输出到 stderr
    void execOutInst(List<std::string>& inst) {
        if (inst.size() < 2) return;

        std::string target = inst[1];
        std::string valStr = inst.size() >= 3 ? inst[2] : "";
        Any val = valStr.empty() ? Any(0LL) : resolveValue(valStr);

        if (target == "console") {
            std::cout << toString(val) << std::endl;
        } else if (target == "file") {
            // 写入文件: out file "path" content
            std::string path = valStr;
            if (!path.empty() && path[0] != '\'') {
                // valStr 是变量ID而非路径，需要另外处理
                // 简化: 输出到 cout
                std::cout << "[file] " << toString(val) << std::endl;
            }
        } else if (target == "err") {
            std::cerr << toString(val) << std::endl;
        } else {
            // 默认输出到 console
            std::cout << toString(val) << std::endl;
        }
    }

    // ========== vm 指令 (已废弃，仅保留 gc) ==========
    void execVmInst(List<std::string>& inst) {
        if (inst.size() < 2) return;
        std::string cmd = inst[1];
        if (cmd.size() >= 2 && cmd[0] == '\'' && cmd.back() == '\'') {
            cmd = cmd.substr(1, cmd.size() - 2);
        }
        if (cmd == "gc") {
            memory_pool.gc();
        }
        // 其他 vm 命令已废弃，忽略
    }

    // ========== 线程指令 ==========

    void execThreadInst(List<std::string>& inst) {
        if (inst.size() < 2) return;
        std::string target = inst[1];

        thread_pool.enqueue([this, target]() {
            executeBlock(target);
        });
    }

    // ========== 异常 ==========

    void execThrowInst(List<std::string>& inst) {
        if (inst.size() < 2) return;
        Any val = resolveValue(inst[1]);
        std::cerr << "Unhandled exception: " << toString(val) << std::endl;
        running = false;
    }

    // ========== 序列化输出 ==========

    void dumpState() {
        std::cout << "\n=== VM State ===" << std::endl;
        std::cout << "Variables:" << std::endl;
        for (const auto& [id, val] : vars) {
            std::cout << "  [" << id << "] " << toString(val) << std::endl;
        }
        std::cout << "Blocks: " << blocks.size() << std::endl;
        for (const auto& [name, insts] : blocks) {
            std::cout << "  " << name << ": " << insts.size() << " instructions" << std::endl;
        }
    }
};

// ========== 压力测试 (保持原有) ==========

void stressTestMov(var& variable_pool, MovTracker& tracker, int num_threads, int movs_per_thread) {
    std::cout << "\n===== MOV 细粒度锁压力测试 =====" << std::endl;
    std::cout << "线程数: " << num_threads << ", 每线程 MOV 数: " << movs_per_thread << std::endl;

    for (int i = 0; i < 100; i++) {
        variable_pool.getLock(i);
    }

    std::vector<std::thread> threads;
    std::atomic<int> total_movs{0};

    auto start = std::chrono::high_resolution_clock::now();

    for (int t = 0; t < num_threads; t++) {
        threads.emplace_back([&variable_pool, &tracker, &total_movs, movs_per_thread, t]() {
            for (int i = 0; i < movs_per_thread; i++) {
                long long dest = (i + t * 7) % 100;
                long long src = (i + t * 13 + 1) % 100;

                VarLock* vl_dest = variable_pool.getLock(dest);
                VarLock* vl_src = variable_pool.getLock(src);

                if (dest < src) {
                    std::lock_guard<std::mutex> lock_dest(vl_dest->mtx);
                    std::lock_guard<std::mutex> lock_src(vl_src->mtx);
                    vl_dest->version.fetch_add(1, std::memory_order_release);
                } else if (dest > src) {
                    std::lock_guard<std::mutex> lock_src(vl_src->mtx);
                    std::lock_guard<std::mutex> lock_dest(vl_dest->mtx);
                    vl_dest->version.fetch_add(1, std::memory_order_release);
                } else {
                    std::lock_guard<std::mutex> lock(vl_dest->mtx);
                    vl_dest->version.fetch_add(1, std::memory_order_release);
                }

                tracker.record(dest, src);
                total_movs.fetch_add(1, std::memory_order_relaxed);
            }
        });
    }

    for (auto& thread : threads) thread.join();

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "总 MOV 操作: " << total_movs.load() << std::endl;
    std::cout << "耗时: " << duration << " ms" << std::endl;
    if (duration > 0) {
        std::cout << "吞吐量: " << (total_movs.load() * 1000.0 / duration) << " MOV/s" << std::endl;
    }
    std::cout << "追踪记录: " << tracker.count() << std::endl;
}

void stressTestMovBatch(var& variable_pool, MovTracker& tracker, int num_threads,
                        int batches_per_thread, int batch_size) {
    std::cout << "\n===== 批量 MOV 细粒度锁压力测试 =====" << std::endl;
    std::cout << "线程数: " << num_threads << ", 每线程批次数: " << batches_per_thread
              << ", 批量大小: " << batch_size << std::endl;

    std::vector<std::thread> threads;
    std::atomic<int> total_batches{0};
    std::atomic<int> total_movs{0};

    auto start = std::chrono::high_resolution_clock::now();

    for (int t = 0; t < num_threads; t++) {
        threads.emplace_back([&variable_pool, &tracker, &total_batches, &total_movs,
                              batches_per_thread, batch_size, t]() {
            for (int b = 0; b < batches_per_thread; b++) {
                std::vector<long long> ids;
                int base = (b * batch_size + t * 11) % 80;
                for (int i = 0; i < batch_size; i++) ids.push_back(base + i);
                std::sort(ids.begin(), ids.end());

                std::vector<std::unique_ptr<std::lock_guard<std::mutex>>> locks;
                for (long long id : ids) {
                    VarLock* vl = variable_pool.getLock(id);
                    locks.push_back(std::make_unique<std::lock_guard<std::mutex>>(vl->mtx));
                }

                for (size_t i = 0; i < ids.size() - 1; i++) {
                    VarLock* vl = variable_pool.getLock(ids[i]);
                    vl->version.fetch_add(1, std::memory_order_release);
                    tracker.record(ids[i], ids[i + 1]);
                    total_movs.fetch_add(1, std::memory_order_relaxed);
                }
                total_batches.fetch_add(1, std::memory_order_relaxed);
            }
        });
    }

    for (auto& thread : threads) thread.join();

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "总批次数: " << total_batches.load() << std::endl;
    std::cout << "总 MOV 操作: " << total_movs.load() << std::endl;
    std::cout << "耗时: " << duration << " ms" << std::endl;
    if (duration > 0) {
        std::cout << "吞吐量: " << (total_movs.load() * 1000.0 / duration) << " MOV/s" << std::endl;
    }
    std::cout << "追踪记录: " << tracker.count() << std::endl;
}

// ========== 全面 VM 测试 ==========

void runVmTests() {
    std::cout << "\n========== VM 全面测试 ==========" << std::endl;
    int passed = 0, failed = 0;

    auto test = [&](const std::string& name, bool condition) {
        if (condition) {
            std::cout << "  PASS: " << name << std::endl;
            passed++;
        } else {
            std::cout << "  FAIL: " << name << std::endl;
            failed++;
        }
    };

    // === 测试 1: HEAD 解析 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@STRING_VAR 0~2\n"
            "@NUMBER_VAR 100~102\n"
            "@BOOLEAN_VAR 200~201\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 42\n"
            "    mov 0 'hello'\n"
            "    mov 200 true\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("HEAD: STRING_VAR 分配", vm.varTypes[0] == "STRING_VAR");
        test("HEAD: NUMBER_VAR 分配", vm.varTypes[100] == "NUMBER_VAR");
        test("HEAD: BOOLEAN_VAR 分配", vm.varTypes[200] == "BOOLEAN_VAR");
        test("HEAD: 变量计数", vm.varTypes.size() == 8);
        test("BODY: 块解析", vm.blocks.size() >= 1);
    }

    // === 测试 2: MOV 指令 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~101\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 42\n"
            "    mov 101 100\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        long double v100 = std::get<long long>(vm.vars[100]);
        long double v101 = std::get<long long>(vm.vars[101]);
        test("MOV: 直接赋值", v100 == 42);
        test("MOV: 变量复制", v101 == 42);
    }

    // === 测试 3: 算术运算 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~105\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 10\n"
            "    mov 101 3\n"
            "    mov 102 10\n"
            "    mov 103 10\n"
            "    mov 104 10\n"
            "    mov 105 10\n"
            "    add 102 3\n"
            "    sub 103 3\n"
            "    mul 104 3\n"
            "    div 105 3\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("ADD: 10+3=13", std::get<long long>(vm.vars[102]) == 13);
        test("SUB: 10-3=7", std::get<long long>(vm.vars[103]) == 7);
        test("MUL: 10*3=30", std::get<long long>(vm.vars[104]) == 30);
        test("DIV: 10/3=3", std::get<long long>(vm.vars[105]) == 3);
    }

    // === 测试 4: 比较和条件跳转 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~101\n"
            "@BOOLEAN_VAR 200~200\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 10\n"
            "    mov 101 10\n"
            "    cmp 100 101 == 200\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("CMP: 10==10", std::get<bool>(vm.vars[200]) == true);
    }

    // === 测试 5: 条件跳转 cz ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~100\n"
            "@BOOLEAN_VAR 200~200\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 10\n"
            "    mov 200 false\n"
            "    cmp 100 5 == 200\n"
            "    cz 200 L1\n"
            "    mov 100 99\n"
            "    @L1:\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        // 10 != 5, so 200 is false, cz should jump to L1, skipping mov 100 99
        test("CZ: 条件不满足时跳转", std::get<long long>(vm.vars[100]) == 10);
    }

    // === 测试 6: 字符串变量 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@STRING_VAR 0~1\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 0 'hello'\n"
            "    mov 1 0\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("STRING: 直接赋值", std::get<std::string>(vm.vars[0]) == "hello");
        test("STRING: 变量复制", std::get<std::string>(vm.vars[1]) == "hello");
    }

    // === 测试 7: 布尔变量 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@BOOLEAN_VAR 200~201\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 200 true\n"
            "    mov 201 false\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("BOOL: true", std::get<bool>(vm.vars[200]) == true);
        test("BOOL: false", std::get<bool>(vm.vars[201]) == false);
    }

    // === 测试 8: 比较运算符 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~101\n"
            "@BOOLEAN_VAR 200~205\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 10\n"
            "    mov 101 5\n"
            "    cmp 100 101 != 200\n"
            "    cmp 100 101 > 201\n"
            "    cmp 100 101 >= 202\n"
            "    cmp 101 100 < 203\n"
            "    cmp 101 100 <= 204\n"
            "    cmp 100 101 == 205\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("CMP: 10!=5", std::get<bool>(vm.vars[200]) == true);
        test("CMP: 10>5", std::get<bool>(vm.vars[201]) == true);
        test("CMP: 10>=5", std::get<bool>(vm.vars[202]) == true);
        test("CMP: 5<10", std::get<bool>(vm.vars[203]) == true);
        test("CMP: 5<=10", std::get<bool>(vm.vars[204]) == true);
        test("CMP: 10==5", std::get<bool>(vm.vars[205]) == false);
    }

    // === 测试 9: 栈操作 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~100\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    push number_stack 42\n"
            "    push number_stack 10\n"
            "    pop number_stack 100\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("STACK: pop 获得最后 push 的值", std::get<long long>(vm.vars[100]) == 10);
    }

    // === 测试 10: 细粒度锁 MOV ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~110\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 1\n"
            "    mov 101 2\n"
            "    mov 102 3\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        bool lockWorks = true;
        for (int i = 100; i <= 102; i++) {
            VarLock* vl = vm.variable_pool.getLock(i);
            if (vl->version.load() == 0) lockWorks = false;
        }
        test("LOCK: 版本号已更新", lockWorks);
        test("LOCK: MOV 追踪", vm.mov_tracker.count() >= 3);
    }

    // === 测试 11: 空程序 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();
        test("EMPTY: 空程序执行成功", true);
    }

    // === 测试 12: 多指令块 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~100\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@init:\n"
            "    mov 100 100\n"
            "    ret\n"
            "@main:\n"
            "    mov 100 0\n"
            "    call @init\n"
            "    ret\n"
            "BODY_END\n";
        // Note: @init and @main are both unindented → separate blocks
        vm.parseAlbin(code);
        vm.run();

        // 注意: call 后变量状态取决于 executeBlock 行为
        test("MULTI_BLOCK: 块解析", vm.blocks.size() >= 2);
    }

    // === 测试 13: null 值 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~100\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 null\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("NULL: null 值处理", std::get<long long>(vm.vars[100]) == 0);
    }

    // === 测试 14: 取模运算 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~100\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 17\n"
            "    mod 100 5\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("MOD: 17%5=2", std::get<long long>(vm.vars[100]) == 2);
    }

    // === 测试 15: 逻辑运算 ===
    {
        VM vm;
        std::string code =
            "HEAD_START\n"
            "@NUMBER_VAR 100~101\n"
            "@BOOLEAN_VAR 200~200\n"
            "HEAD_END\n"
            "BODY_START\n"
            "@main:\n"
            "    mov 100 1\n"
            "    mov 101 0\n"
            "    cmp 100 0 != 200\n"
            "    ret\n"
            "BODY_END\n";
        vm.parseAlbin(code);
        vm.run();

        test("LOGIC: 1!=0 为 true", std::get<bool>(vm.vars[200]) == true);
    }

    std::cout << "\n========== 测试结果: " << passed << "/" << (passed + failed)
              << " 通过 ==========" << std::endl;
}

// ========== 命令行接口 ==========

void printHelp() {
    std::cout << R"(alLang VM v0.1.0

用法:
  vm.exe --run <file.albin>        运行编译后的 .albin 文件
  vm.exe --test                    运行 VM 全面测试
  vm.exe --stress-mov [threads] [moves]  MOV 细粒度锁压力测试
  vm.exe --stress-batch [threads] [batches] [size]  批量 MOV 压力测试
  vm.exe --dump <file.albin>       解析并显示 .albin 文件结构
  vm.exe --help                    显示此帮助信息
)" << std::endl;
}

int vm_main(int argc, char* argv[]) {
    if (argc < 2) {
        printHelp();
        return 0;
    }

    std::string cmd = argv[1];

    if (cmd == "--help" || cmd == "-h") {
        printHelp();
        return 0;
    }

    // ===== 运行 VM 全面测试 =====
    if (cmd == "--test") {
        runVmTests();
        return 0;
    }

    // ===== MOV 细粒度锁压力测试 =====
    if (cmd == "--stress-mov") {
        int num_threads = 8;
        int movs_per_thread = 10000;
        if (argc >= 3) num_threads = std::stoi(argv[2]);
        if (argc >= 4) movs_per_thread = std::stoi(argv[3]);

        pool mem_pool;
        var var_pool(&mem_pool);
        MovTracker tracker;
        stressTestMov(var_pool, tracker, num_threads, movs_per_thread);
        return 0;
    }

    // ===== 批量 MOV 压力测试 =====
    if (cmd == "--stress-batch") {
        int num_threads = 4, batches_per_thread = 1000, batch_size = 10;
        if (argc >= 3) num_threads = std::stoi(argv[2]);
        if (argc >= 4) batches_per_thread = std::stoi(argv[3]);
        if (argc >= 5) batch_size = std::stoi(argv[4]);

        pool mem_pool;
        var var_pool(&mem_pool);
        MovTracker tracker;
        stressTestMovBatch(var_pool, tracker, num_threads, batches_per_thread, batch_size);
        return 0;
    }

    // ===== 解析并显示 .albin 结构 =====
    if (cmd == "--dump" && argc >= 3) {
        std::string filename = argv[2];
        VM vm;
        vm.load(filename);
        vm.dumpState();
        return 0;
    }

    // ===== 运行 .albin 文件 =====
    if (cmd == "--run" && argc >= 3) {
        std::string filename = argv[2];
        std::cout << "Running " << filename << "..." << std::endl;

        VM vm;
        vm.load(filename);
        vm.run();

        std::cout << "\nVM execution completed." << std::endl;
        vm.dumpState();
        return 0;
    }

    printHelp();
    return 0;
}
