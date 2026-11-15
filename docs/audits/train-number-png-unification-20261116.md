# 列车号段与 PNG 映射目录（2026-11-16）

## 建立的统一索引

data/audits/train-number-png-catalog-2611.json 是现有前端 JS + Supabase 日期快照的派生目录；它不是新的运行时真值表，也不能证明某日实体编组。

- SQL: 291 条规则，覆盖 24 条线路，所有规则必须要求精确车次表，不能依靠宽号段直接选择车辆。
- JS: 108 条规则、136 个线路关联、58 条线路，保留前端原有的末两位/完整车次、日历、方向、线路、特殊车次验证器等条件。
- 每条记录有 sql-xxxx 或 js-xxxx 编号；line_index 将线路映射到既有两类规则 ID。

## 现有未解决差异

- SQL 5 条号段规则引用的 4 个图片路径未登记于 vehicle_image_assets：富士急 6000、富士急 8000（2 条）、E127 100 番台、HB-E300 Resort View。文件存在不等于数据库审核通过。
- 14 条 SQL 号段车型标签与图片资产的大系列名称不完全一致，多属番台、涂装或专门服务车型。禁止简单覆盖成大系列；先核实实际身份。
- 同线路同后缀 6 对数字区间相交：3 对新干线是相同车型与图片的重复；3 对大糸线分别涉及 211、E127、E353，不可以按数字区间选第一个候选。

## 同步与 CI

node tools/build-train-number-png-catalog.cjs --write
node tools/build-train-number-png-catalog.cjs --check --strict
node tools/railway-metadata-audit.cjs --strict
node --test tests/train-number-png-runtime.test.cjs

GitHub Actions 的 railway-metadata-audit 在现有源文件变化时检查索引是否过时、文件是否真实存在以及新增的未登记资产、错误模型和不受保护重叠。
修复只改现有负责的 SQL/JS/图库来源，刷新日期快照再重建目录；禁止推算实体编组号、扩大无证据车次范围，或用这个派生目录直接覆盖生产规则。
