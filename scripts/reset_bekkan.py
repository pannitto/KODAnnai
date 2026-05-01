#!/usr/bin/env python3
"""
fill_bekkan.py で挿入した企画別館のナビ文言を全てリセット（空に戻す）するスクリプト。

使い方:
  python3 scripts/reset_bekkan.py

bekkan_backup.json に記録されたトリプレットの prev_name, curr_name, next_name を
すべて空文字列 "" に戻します。
"""

import re
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
ROUTE_FINDER = os.path.join(PROJECT_DIR, "lib", "route-finder.ts")
BACKUP_FILE = os.path.join(SCRIPT_DIR, "bekkan_backup.json")


def main():
    if not os.path.exists(BACKUP_FILE):
        print("❌ バックアップファイルが見つかりません:", BACKUP_FILE)
        print("   fill_bekkan.py を先に実行してください。")
        return

    with open(BACKUP_FILE, "r", encoding="utf-8") as f:
        entries = json.load(f)

    with open(ROUTE_FINDER, "r", encoding="utf-8") as f:
        content = f.read()

    # Build set of (prev, curr, next) tuples to reset
    targets = {(e["prev"], e["curr"], e["next"]) for e in entries}

    # Match filled triplet blocks and reset if in target set
    pattern = (
        r'(    previous: (\d+),\n'
        r'    current: (\d+),\n'
        r'    next: (\d+),\n)'
        r'    prev_name: "([^"]*)",\n'
        r'    curr_name: "([^"]*)",\n'
        r'    next_name: "([^"]*)",\n'
        r'(    image: "[^"]+",)'
    )

    reset_count = 0
    def replacer(m):
        nonlocal reset_count
        prev = int(m.group(2))
        curr = int(m.group(3))
        nxt  = int(m.group(4))

        if (prev, curr, nxt) not in targets:
            return m.group(0)

        reset_count += 1
        return (
            f'{m.group(1)}'
            f'    prev_name: "",\n'
            f'    curr_name: "",\n'
            f'    next_name: "",\n'
            f'{m.group(8)}'
        )

    new_content = re.sub(pattern, replacer, content)

    with open(ROUTE_FINDER, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"✅ {reset_count} 件のトリプレットをリセットしました（空文字に戻しました）")
    print(f"   対象: 企画別館 ノード305-326 関連")


if __name__ == "__main__":
    main()
