#ifndef ALLANG_VM_H
#define ALLANG_VM_H

#include <stack>
#include <string>
#include <vector>
#include <unordered_map>
#include <variant>
#include <unordered_set>
#include <mutex>
#include <shared_mutex>
#include <thread>
#include <atomic>
#include <condition_variable>
#include <functional>
#include <queue>
#include <memory>

// ========== 指令集 ID ==========
#define MOV 0
#define PUSH 1
#define POP 2
#define ADD 3
#define SUB 4
#define MUL 5
#define DIV 6
#define MOD 7
#define AND 8
#define OR 9
#define XOR 10
#define NOT 11
#define SHL 12
#define SHR 13
#define CALL 14
#define CZ 15
#define CMP 16
#define RET 17
#define LOOP 18
#define BLOCK_START 20
#define DELETE 21
#define HEAD_START 22
#define HEAD_END 23
#define HEAD_VAR_STRING_START 26
#define HEAD_VAR_STRING_END 27
#define HEAD_VAR_BOOLEAN_START 28
#define HEAD_VAR_BOOLEAN_END 29
#define HEAD_VAR_NUMBER_START 30
#define HEAD_VAR_NUMBER_END 31
#define HEAD_VAR_MAP_START 32
#define HEAD_VAR_MAP_END 33
#define HEAD_STACK_STRING_START 34
#define HEAD_STACK_STRING_END 35
#define HEAD_STACK_BOOLEAN_START 36
#define HEAD_STACK_BOOLEAN_END 37
#define HEAD_STACK_NUMBER_START 38
#define HEAD_STACK_NUMBER_END 39
#define HEAD_STACK_MAP_START 40
#define HEAD_STACK_MAP_END 41
#define BODY_START 42
#define BODY_END 43
#define GC 44
#define THREAD 45
#define IN 46
#define OUT 47

// ========== 容器别名 ==========
template<typename T>
using List = std::vector<T>;

template<typename K, typename V>
using Map = std::unordered_map<K, V>;

using Any = std::variant<long long, long double, std::string, bool>;
using Stack = std::stack<Any>;

// ========== KV 对 ==========
template<typename K, typename V>
class KV {
public:
    K key;
    V value;

    KV(K k, V v) : key(k), value(v) {}
    KV() : key(K()), value(V()) {}
    ~KV() = default;
};

// ========== 引用计数内存池 (线程安全) ==========
class pool {
public:
    Map<Any, KV<Any, int>> _pool;
    mutable std::shared_mutex _pool_mutex;  // 读写锁保护整个池

    // GC: 清除引用计数为0的条目
    void gc() {
        std::unique_lock<std::shared_mutex> lock(_pool_mutex);
        for (auto it = _pool.begin(); it != _pool.end(); ) {
            if (it->second.value <= 0) {
                it = _pool.erase(it);
            } else {
                ++it;
            }
        }
    }

    // 增加引用计数
    const KV<Any, int>* link(Any data) {
        std::unique_lock<std::shared_mutex> lock(_pool_mutex);
        auto it = _pool.find(data);
        if (it != _pool.end()) {
            it->second.value++;
            return &(it->second);
        }
        auto& kv = _pool[data];
        kv.key = data;
        kv.value = 1;
        return &kv;
    }

    // 减少引用计数
    void unlink(Any data) {
        std::unique_lock<std::shared_mutex> lock(_pool_mutex);
        auto it = _pool.find(data);
        if (it != _pool.end()) {
            it->second.value--;
            if (it->second.value <= 0) {
                _pool.erase(it);
            }
        }
    }

    // 线程安全查询
    int refCount(Any data) const {
        std::shared_lock<std::shared_mutex> lock(_pool_mutex);
        auto it = _pool.find(data);
        if (it != _pool.end()) return it->second.value;
        return 0;
    }
};

// ========== 变量锁 — 最细颗粒度: 每个变量一个独立的 mutex ==========
class VarLock {
public:
    std::mutex mtx;           // 保护这个变量的读写
    std::atomic<int> version{0}; // 版本号，用于乐观锁检测
    Any* data_ptr{nullptr};   // 指向实际数据

    VarLock() = default;
    ~VarLock() = default;

    // 禁止拷贝（mutex 不可拷贝）
    VarLock(const VarLock&) = delete;
    VarLock& operator=(const VarLock&) = delete;
};

// ========== 变量存储 (线程安全、细粒度锁) ==========
class var {
public:
    Map<long long, std::unique_ptr<VarLock>> locks;  // 每个变量独立锁
    Map<long long, Any*> data;
    pool* address;

    // 全局变量映射锁（保护 locks 和 data map 本身的结构变更）
    mutable std::shared_mutex _map_mutex;

    var(pool* p) : address(p) {}

    // 获取或创建变量的锁对象
    VarLock* getLock(long long id) {
        {
            std::shared_lock<std::shared_mutex> read_lock(_map_mutex);
            auto it = locks.find(id);
            if (it != locks.end()) {
                return it->second.get();
            }
        }
        // 需要创建新的锁
        std::unique_lock<std::shared_mutex> write_lock(_map_mutex);
        auto it = locks.find(id);
        if (it != locks.end()) {
            return it->second.get();
        }
        auto vl = std::make_unique<VarLock>();
        VarLock* ptr = vl.get();
        locks[id] = std::move(vl);
        return ptr;
    }

    // 删除变量
    void del(long long id) {
        std::unique_lock<std::shared_mutex> map_lock(_map_mutex);
        auto it = data.find(id);
        if (it != data.end()) {
            if (it->second != nullptr) {
                // 在删除前锁定该变量
                auto lockIt = locks.find(id);
                if (lockIt != locks.end()) {
                    std::lock_guard<std::mutex> var_lock(lockIt->second->mtx);
                    address->unlink(*it->second);
                } else {
                    address->unlink(*it->second);
                }
            }
            data.erase(it);
        }
        // 保留锁对象以便后续使用（变量 ID 可能被复用）
    }

    // 设置变量值 — 细粒度锁定
    void set(long long id, Any* value) {
        VarLock* vl = getLock(id);

        // 仅锁定这一个变量的 mutex
        std::lock_guard<std::mutex> var_lock(vl->mtx);

        // 先删除旧值
        {
            std::shared_lock<std::shared_mutex> map_read(_map_mutex);
            auto it = data.find(id);
            if (it != data.end() && it->second != nullptr) {
                address->unlink(*it->second);
            }
        }

        // 设置新值
        {
            std::unique_lock<std::shared_mutex> map_write(_map_mutex);
            data[id] = value;
        }

        // 增加新值的引用计数
        address->link(*value);

        // 更新版本号
        vl->version.fetch_add(1, std::memory_order_release);
    }

    // 获取变量值 — 带锁读取
    Any* get(long long id) {
        VarLock* vl = getLock(id);
        std::lock_guard<std::mutex> var_lock(vl->mtx);
        std::shared_lock<std::shared_mutex> map_read(_map_mutex);
        auto it = data.find(id);
        if (it != data.end()) {
            return it->second;
        }
        return nullptr;
    }

    // MOV 操作的特殊处理: 原子地从 src 读取并写入 dest
    // 使用锁排序避免死锁: 总是先锁较小的 ID
    void mov(long long dest_id, long long src_id) {
        VarLock* vl_dest = getLock(dest_id);
        VarLock* vl_src = getLock(src_id);

        // 死锁避免: 按 ID 顺序加锁
        if (dest_id < src_id) {
            std::lock_guard<std::mutex> lock_dest(vl_dest->mtx);
            std::lock_guard<std::mutex> lock_src(vl_src->mtx);
            _mov_internal(dest_id, src_id);
        } else if (dest_id > src_id) {
            std::lock_guard<std::mutex> lock_src(vl_src->mtx);
            std::lock_guard<std::mutex> lock_dest(vl_dest->mtx);
            _mov_internal(dest_id, src_id);
        } else {
            // 同一个变量，只需要一个锁
            std::lock_guard<std::mutex> lock_dest(vl_dest->mtx);
            _mov_internal(dest_id, src_id);
        }

        // 更新版本号
        vl_dest->version.fetch_add(1, std::memory_order_release);
    }

    // MOV 批量操作: 一次锁定多个源和目标
    void mov_batch(const List<std::pair<long long, long long>>& moves) {
        // 收集所有涉及的变量 ID 并排序
        std::vector<long long> all_ids;
        for (const auto& [dest, src] : moves) {
            all_ids.push_back(dest);
            all_ids.push_back(src);
        }
        std::sort(all_ids.begin(), all_ids.end());
        all_ids.erase(std::unique(all_ids.begin(), all_ids.end()), all_ids.end());

        // 按 ID 顺序获取所有锁
        std::vector<std::unique_ptr<std::lock_guard<std::mutex>>> held_locks;
        for (long long id : all_ids) {
            VarLock* vl = getLock(id);
            held_locks.push_back(std::make_unique<std::lock_guard<std::mutex>>(vl->mtx));
        }

        // 执行所有 MOV
        for (const auto& [dest, src] : moves) {
            _mov_internal(dest, src);
            VarLock* vl_dest = getLock(dest);
            vl_dest->version.fetch_add(1, std::memory_order_release);
        }
    }

private:
    void _mov_internal(long long dest_id, long long src_id) {
        // 调用者已持有锁
        Any* src_val = nullptr;
        {
            auto it = data.find(src_id);
            if (it != data.end()) {
                src_val = it->second;
            }
        }

        if (src_val != nullptr) {
            // 增加新值的引用计数
            address->link(*src_val);

            // 删除旧值
            auto it_dest = data.find(dest_id);
            if (it_dest != data.end() && it_dest->second != nullptr) {
                if (it_dest->second != src_val) {
                    address->unlink(*it_dest->second);
                }
            }

            // 设置新值
            data[dest_id] = src_val;
        }
    }
};

// ========== 线程安全栈 ==========
template<typename T>
class ThreadSafeStack {
public:
    void push(const T& val) {
        std::lock_guard<std::mutex> lock(_mtx);
        _stack.push(val);
    }

    bool pop(T& out) {
        std::lock_guard<std::mutex> lock(_mtx);
        if (_stack.empty()) return false;
        out = _stack.top();
        _stack.pop();
        return true;
    }

    bool empty() const {
        std::lock_guard<std::mutex> lock(_mtx);
        return _stack.empty();
    }

    size_t size() const {
        std::lock_guard<std::mutex> lock(_mtx);
        return _stack.size();
    }

private:
    std::stack<T> _stack;
    mutable std::mutex _mtx;
};

// ========== 线程池 ==========
class ThreadPool {
public:
    ThreadPool(size_t numThreads = 4) : _stop(false) {
        for (size_t i = 0; i < numThreads; ++i) {
            _workers.emplace_back([this] {
                while (true) {
                    std::function<void()> task;
                    {
                        std::unique_lock<std::mutex> lock(_queue_mutex);
                        _condition.wait(lock, [this] {
                            return _stop || !_tasks.empty();
                        });
                        if (_stop && _tasks.empty()) return;
                        task = std::move(_tasks.front());
                        _tasks.pop();
                    }
                    task();
                }
            });
        }
    }

    ~ThreadPool() {
        {
            std::unique_lock<std::mutex> lock(_queue_mutex);
            _stop = true;
        }
        _condition.notify_all();
        for (std::thread& worker : _workers) {
            if (worker.joinable()) worker.join();
        }
    }

    template<typename F>
    void enqueue(F&& f) {
        {
            std::unique_lock<std::mutex> lock(_queue_mutex);
            _tasks.emplace(std::forward<F>(f));
        }
        _condition.notify_one();
    }

    size_t workerCount() const { return _workers.size(); }

private:
    std::vector<std::thread> _workers;
    std::queue<std::function<void()>> _tasks;
    std::mutex _queue_mutex;
    std::condition_variable _condition;
    bool _stop;
};

// ========== MOV 操作追踪器 (用于调试和性能分析) ==========
class MovTracker {
public:
    struct MovRecord {
        long long dest;
        long long src;
        std::chrono::high_resolution_clock::time_point timestamp;
        std::thread::id thread_id;
    };

    void record(long long dest, long long src) {
        std::lock_guard<std::mutex> lock(_mtx);
        _records.push_back({dest, src,
            std::chrono::high_resolution_clock::now(),
            std::this_thread::get_id()});
        if (_records.size() > 10000) {
            _records.erase(_records.begin(), _records.begin() + 5000);
        }
    }

    size_t count() const {
        std::lock_guard<std::mutex> lock(_mtx);
        return _records.size();
    }

    void clear() {
        std::lock_guard<std::mutex> lock(_mtx);
        _records.clear();
    }

private:
    mutable std::mutex _mtx;
    std::vector<MovRecord> _records;
};

#endif
