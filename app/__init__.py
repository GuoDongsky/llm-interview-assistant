"""HRMate 面试助手。"""

import sys

# 本项目用了 3.10+ 的类型标注语法（如 app/main.py 里的 `int | None`）。在更低版本上，
# 失败发生在 FastAPI 解析路由签名时，报错指向 pydantic 内部，完全看不出是版本问题。
# macOS 自带的 python3 正好是 3.9，这是新用户最容易踩的坑，所以提前拦一道。
if sys.version_info < (3, 10):
    _current = ".".join(str(part) for part in sys.version_info[:3])
    raise RuntimeError(
        f"HRMate 需要 Python 3.10 或更高版本，当前为 {_current}。\n"
        "请用较新的 Python 重建虚拟环境，例如：python3.12 -m venv .venv"
    )
